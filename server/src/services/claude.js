import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config.js';
import logger from './logger.js';
import {
  createSession,
  getSessionById,
  updateSessionActivity,
  addMessage,
  getMessagesBySession
} from './database.js';

// Get or create a session (now backed by SQLite)
function getOrCreateSession(sessionId) {
  if (sessionId) {
    const existing = getSessionById(sessionId);
    if (existing) {
      updateSessionActivity(sessionId);
      return { id: existing.id, isNew: false };
    }
  }

  const id = sessionId || uuidv4();
  createSession(id);
  return { id, isNew: true };
}

export function getSession(sessionId) {
  const session = getSessionById(sessionId);
  if (!session) return null;

  updateSessionActivity(sessionId);
  const messages = getMessagesBySession(sessionId);
  return { ...session, messages };
}

// Build a clean env without Claude Code session vars
function getCleanEnv() {
  const env = { ...process.env };
  Object.keys(env).forEach(key => {
    if (key === 'CLAUDECODE' || key.startsWith('CLAUDE_CODE_')) {
      delete env[key];
    }
  });
  return env;
}

// ─── ProcessManager: long-lived Claude CLI process management ───

class ProcessManager {
  constructor() {
    /** @type {Map<string, ManagedProcess>} */
    this.processes = new Map();
  }

  /**
   * Get an existing process or spawn a new one for this session.
   */
  getOrSpawn(sessionId, options = {}) {
    const existing = this.processes.get(sessionId);
    if (existing && existing.process && !existing.process.killed) {
      this._resetIdleTimer(existing);
      return existing;
    }

    // Clean up stale entry if any
    if (existing) {
      this.processes.delete(sessionId);
    }

    const args = ['--print', '--verbose',
      '--input-format', 'stream-json',
      '--output-format', 'stream-json'
    ];

    const model = options.model || config.defaultModel;
    if (model) {
      args.push('--model', model);
    }

    const systemPrompt = options.systemPrompt || config.defaultSystemPrompt;
    if (systemPrompt) {
      args.push('--system-prompt', systemPrompt);
    }

    logger.info({ sessionId, model: model || '(default)' }, 'Spawned long-lived Claude process');

    const proc = spawn(config.claudeCliPath, args, {
      env: getCleanEnv(),
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const managed = {
      process: proc,
      sessionId,
      busy: false,
      idleTimer: null,
      pendingTurn: null,
      stderr: '',
      options: { model, systemPrompt }
    };

    // Collect stderr
    proc.stderr.on('data', (data) => {
      managed.stderr += data.toString();
    });

    // Handle unexpected exit
    proc.on('close', (code) => {
      logger.info({ sessionId, code }, 'Claude process exited');

      // If there's a pending turn, reject it
      if (managed.pendingTurn) {
        const pending = managed.pendingTurn;
        managed.pendingTurn = null;
        if (pending.turnTimeout) clearTimeout(pending.turnTimeout);
        pending.reject(new Error(
          `Claude process exited unexpectedly (code ${code}): ${managed.stderr.trim() || 'Unknown error'}`
        ));
      }

      if (managed.idleTimer) clearTimeout(managed.idleTimer);
      this.processes.delete(sessionId);
    });

    proc.on('error', (err) => {
      if (managed.pendingTurn) {
        const pending = managed.pendingTurn;
        managed.pendingTurn = null;
        if (pending.turnTimeout) clearTimeout(pending.turnTimeout);

        if (err.code === 'ENOENT') {
          pending.reject(new Error(
            `Claude CLI not found at '${config.claudeCliPath}'. Please install Claude CLI or set CLAUDE_CLI_PATH in .env`
          ));
        } else {
          pending.reject(new Error(`Failed to start Claude CLI: ${err.message}`));
        }
      }

      if (managed.idleTimer) clearTimeout(managed.idleTimer);
      this.processes.delete(sessionId);
    });

    // Wire up stdout NDJSON parsing
    this._setupStdoutParser(managed);

    this.processes.set(sessionId, managed);
    this._resetIdleTimer(managed);

    return managed;
  }

  /**
   * Set up NDJSON line parser on stdout for a managed process.
   */
  _setupStdoutParser(managed) {
    let buffer = '';

    managed.process.stdout.on('data', (data) => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep incomplete line

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const event = JSON.parse(line);
          this._routeEvent(managed, event);
        } catch {
          // Non-JSON line, ignore
        }
      }
    });
  }

  /**
   * Route a parsed NDJSON event to the appropriate handler.
   */
  _routeEvent(managed, event) {
    const pending = managed.pendingTurn;
    if (!pending) return; // No active turn, discard

    if (event.type === 'system') {
      // Init/system event — log it
      logger.debug({ sessionId: managed.sessionId, event }, 'Claude system event');
      return;
    }

    if (event.type === 'stream_event') {
      // Unwrap the inner event
      const inner = event.event;
      if (!inner) return;

      if (inner.type === 'content_block_delta' && inner.delta?.text) {
        pending.fullText += inner.delta.text;
        if (pending.onChunk) pending.onChunk(inner.delta.text, inner);
      } else if (inner.type === 'content_block_start' || inner.type === 'content_block_stop') {
        if (pending.onChunk) pending.onChunk(null, inner);
      }
      return;
    }

    // Direct content_block_delta (some CLI versions emit these at top level)
    if (event.type === 'content_block_delta' && event.delta?.text) {
      pending.fullText += event.delta.text;
      if (pending.onChunk) pending.onChunk(event.delta.text, event);
      return;
    }

    // Direct content_block_start/stop
    if (event.type === 'content_block_start' || event.type === 'content_block_stop') {
      if (pending.onChunk) pending.onChunk(null, event);
      return;
    }

    if (event.type === 'assistant' && event.message?.content) {
      // Full assistant message — in streaming mode we already accumulated via deltas,
      // but for non-streaming we extract text here as fallback
      if (!pending.fullText) {
        for (const block of event.message.content) {
          if (block.type === 'text') {
            pending.fullText += block.text;
          }
        }
      }
      return;
    }

    if (event.type === 'result') {
      // Turn complete — resolve the promise
      const text = pending.fullText.trim() || 'No response from Claude.';
      if (pending.turnTimeout) clearTimeout(pending.turnTimeout);
      managed.pendingTurn = null;
      managed.busy = false;
      this._resetIdleTimer(managed);
      pending.resolve(text);
      return;
    }
  }

  /**
   * Send a message (non-streaming). Returns the full response text.
   */
  sendMessage(sessionId, message, options = {}) {
    return this._send(sessionId, message, null, options);
  }

  /**
   * Send a message (streaming). Calls onChunk for each delta. Returns full response text.
   */
  sendMessageStream(sessionId, message, onChunk, options = {}) {
    return this._send(sessionId, message, onChunk, options);
  }

  /**
   * Internal: send a user turn to the managed process.
   */
  _send(sessionId, message, onChunk, options = {}) {
    const managed = this.getOrSpawn(sessionId, options);

    if (managed.busy) {
      return Promise.reject(new Error('Session is busy processing another message. Please wait.'));
    }

    managed.busy = true;
    managed.stderr = '';

    // Clear idle timer while processing
    if (managed.idleTimer) {
      clearTimeout(managed.idleTimer);
      managed.idleTimer = null;
    }

    return new Promise((resolve, reject) => {
      const turnTimeout = setTimeout(() => {
        logger.error({ sessionId }, 'Claude turn timed out, killing process');
        managed.pendingTurn = null;
        managed.busy = false;
        this.killProcess(sessionId);
        reject(new Error(`Claude CLI timeout after ${config.claudeTimeout}ms`));
      }, config.claudeTimeout);

      managed.pendingTurn = {
        resolve,
        reject,
        fullText: '',
        onChunk,
        turnTimeout
      };

      // Write user message to stdin
      const stdinMsg = JSON.stringify({
        type: 'user',
        message: { role: 'user', content: message }
      }) + '\n';

      try {
        managed.process.stdin.write(stdinMsg);
      } catch (err) {
        clearTimeout(turnTimeout);
        managed.pendingTurn = null;
        managed.busy = false;
        this.processes.delete(sessionId);
        reject(new Error(`Failed to write to Claude process stdin: ${err.message}`));
      }
    });
  }

  /**
   * Reset the idle timer for a managed process.
   */
  _resetIdleTimer(managed) {
    if (managed.idleTimer) {
      clearTimeout(managed.idleTimer);
    }

    managed.idleTimer = setTimeout(() => {
      if (!managed.busy) {
        logger.info({ sessionId: managed.sessionId }, 'Idle timeout reached, closing Claude process');
        this.killProcess(managed.sessionId);
      }
    }, config.processIdleTimeout);
  }

  /**
   * Kill a specific process by session ID.
   */
  killProcess(sessionId) {
    const managed = this.processes.get(sessionId);
    if (!managed) return;

    if (managed.idleTimer) clearTimeout(managed.idleTimer);
    if (managed.pendingTurn?.turnTimeout) clearTimeout(managed.pendingTurn.turnTimeout);

    try {
      managed.process.stdin.end();
    } catch {
      // stdin may already be closed
    }

    // Give it a moment to exit gracefully, then force kill
    setTimeout(() => {
      try {
        if (!managed.process.killed) {
          managed.process.kill('SIGTERM');
        }
      } catch {
        // already dead
      }
    }, 1000);

    this.processes.delete(sessionId);
  }

  /**
   * Shutdown all managed processes (for server shutdown).
   */
  shutdownAll() {
    logger.info({ count: this.processes.size }, 'Shutting down all Claude processes');
    for (const sessionId of this.processes.keys()) {
      this.killProcess(sessionId);
    }
  }
}

// Singleton instance
const processManager = new ProcessManager();

// ─── Public API (signatures unchanged) ───

export async function sendMessageToClaude(message, sessionId = null, options = {}) {
  const session = getOrCreateSession(sessionId);

  // Store user message
  addMessage(session.id, 'user', message);

  const response = await processManager.sendMessage(session.id, message, options);

  // Store assistant message
  addMessage(session.id, 'assistant', response);

  return {
    sessionId: session.id,
    message: response,
    timestamp: new Date().toISOString()
  };
}

export async function sendMessageToClaudeStream(message, sessionId, onChunk, options = {}) {
  const session = getOrCreateSession(sessionId);

  addMessage(session.id, 'user', message);

  const response = await processManager.sendMessageStream(session.id, message, onChunk, options);

  addMessage(session.id, 'assistant', response);

  return {
    sessionId: session.id,
    message: response,
    timestamp: new Date().toISOString()
  };
}

export function shutdownAllProcesses() {
  processManager.shutdownAll();
}
