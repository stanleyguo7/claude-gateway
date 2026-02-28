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

// Build common CLI args
function buildCliArgs(message, hasPriorMessages, options = {}) {
  const args = ['--print', '--verbose'];

  // Model selection
  const model = options.model || config.defaultModel;
  if (model) {
    args.push('--model', model);
  }

  // System prompt
  const systemPrompt = options.systemPrompt || config.defaultSystemPrompt;
  if (systemPrompt) {
    args.push('--system-prompt', systemPrompt);
  }

  // Continue conversation if there are prior messages
  if (hasPriorMessages) {
    args.push('--continue');
  }

  // Session ID for Claude CLI native session management
  if (options.sessionId) {
    args.push('--session-id', options.sessionId);
  }

  return args;
}

// Send message to Claude CLI and get response
export async function sendMessageToClaude(message, sessionId = null, options = {}) {
  const session = getOrCreateSession(sessionId);
  const messages = getMessagesBySession(session.id);

  // Store user message
  addMessage(session.id, 'user', message);

  const hasPriorMessages = messages.length > 0;
  const response = await executeClaude(config.claudeCliPath, message, hasPriorMessages, {
    ...options,
    sessionId: session.id
  });

  // Store assistant message
  addMessage(session.id, 'assistant', response);

  return {
    sessionId: session.id,
    message: response,
    timestamp: new Date().toISOString()
  };
}

// Send message to Claude CLI with streaming callback
export async function sendMessageToClaudeStream(message, sessionId, onChunk, options = {}) {
  const session = getOrCreateSession(sessionId);
  const messages = getMessagesBySession(session.id);

  addMessage(session.id, 'user', message);

  const hasPriorMessages = messages.length > 0;
  const response = await executeClaudeStream(config.claudeCliPath, message, hasPriorMessages, onChunk, {
    ...options,
    sessionId: session.id
  });

  addMessage(session.id, 'assistant', response);

  return {
    sessionId: session.id,
    message: response,
    timestamp: new Date().toISOString()
  };
}

// Execute Claude CLI with stream-json output, collect full response
function executeClaude(claudePath, message, hasPriorMessages, options = {}) {
  return new Promise((resolve, reject) => {
    const args = buildCliArgs(message, hasPriorMessages, options);
    args.push('--output-format', 'stream-json');
    args.push(message);

    const claudeProcess = spawn(claudePath, args, {
      env: getCleanEnv()
    });

    let fullText = '';
    let stderr = '';
    let buffer = '';

    // Manual timeout - kill process if it exceeds configured timeout
    const timeoutId = setTimeout(() => {
      claudeProcess.kill('SIGTERM');
    }, config.claudeTimeout);

    claudeProcess.stdout.on('data', (data) => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep incomplete line in buffer

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const event = JSON.parse(line);
          if (event.type === 'assistant' && event.message?.content) {
            for (const block of event.message.content) {
              if (block.type === 'text') {
                fullText += block.text;
              }
            }
          } else if (event.type === 'content_block_delta' && event.delta?.text) {
            fullText += event.delta.text;
          }
        } catch {
          // Non-JSON line, ignore
        }
      }
    });

    claudeProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    claudeProcess.on('error', (err) => {
      if (err.code === 'ENOENT') {
        reject(new Error(`Claude CLI not found at '${claudePath}'. Please install Claude CLI or set CLAUDE_CLI_PATH in .env`));
      } else {
        reject(new Error(`Failed to start Claude CLI: ${err.message}`));
      }
    });

    claudeProcess.on('close', (code) => {
      clearTimeout(timeoutId);

      // Process remaining buffer
      if (buffer.trim()) {
        try {
          const event = JSON.parse(buffer);
          if (event.type === 'assistant' && event.message?.content) {
            for (const block of event.message.content) {
              if (block.type === 'text') {
                fullText += block.text;
              }
            }
          } else if (event.type === 'content_block_delta' && event.delta?.text) {
            fullText += event.delta.text;
          }
        } catch {
          // ignore
        }
      }

      if (code === 0) {
        resolve(fullText.trim() || 'No response from Claude.');
      } else {
        logger.error({ code, stderr }, 'Claude CLI exited with error');
        reject(new Error(`Claude CLI error (code ${code}): ${stderr.trim() || 'Unknown error'}`));
      }
    });
  });
}

// Execute Claude CLI with streaming output (stream-json format)
function executeClaudeStream(claudePath, message, hasPriorMessages, onChunk, options = {}) {
  return new Promise((resolve, reject) => {
    const args = buildCliArgs(message, hasPriorMessages, options);
    args.push('--output-format', 'stream-json');
    args.push(message);

    const claudeProcess = spawn(claudePath, args, {
      env: getCleanEnv()
    });

    let fullText = '';
    let stderr = '';
    let buffer = '';

    // Manual timeout - kill process if it exceeds configured timeout
    const timeoutId = setTimeout(() => {
      claudeProcess.kill('SIGTERM');
    }, config.claudeTimeout);

    claudeProcess.stdout.on('data', (data) => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const event = JSON.parse(line);

          if (event.type === 'assistant' && event.message?.content) {
            for (const block of event.message.content) {
              if (block.type === 'text') {
                fullText += block.text;
                if (onChunk) onChunk(block.text, event);
              }
            }
          } else if (event.type === 'content_block_delta' && event.delta?.text) {
            fullText += event.delta.text;
            if (onChunk) onChunk(event.delta.text, event);
          }

          // Pass through raw events for tool_use visualization (Phase 3)
          if (onChunk && (event.type === 'content_block_start' || event.type === 'content_block_stop')) {
            onChunk(null, event);
          }
        } catch {
          // Non-JSON line, treat as raw text
          fullText += line;
          if (onChunk) onChunk(line, null);
        }
      }
    });

    claudeProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    claudeProcess.on('error', (err) => {
      if (err.code === 'ENOENT') {
        reject(new Error(`Claude CLI not found at '${claudePath}'.`));
      } else {
        reject(new Error(`Failed to start Claude CLI: ${err.message}`));
      }
    });

    claudeProcess.on('close', (code) => {
      clearTimeout(timeoutId);

      // Process remaining buffer
      if (buffer.trim()) {
        try {
          const event = JSON.parse(buffer);
          if (event.type === 'content_block_delta' && event.delta?.text) {
            fullText += event.delta.text;
            if (onChunk) onChunk(event.delta.text, event);
          }
        } catch {
          // ignore
        }
      }

      if (code === 0) {
        resolve(fullText.trim() || 'No response from Claude.');
      } else {
        reject(new Error(`Claude CLI error (code ${code}): ${stderr.trim() || 'Unknown error'}`));
      }
    });
  });
}
