import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
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

// Send message to Claude CLI and get response
export async function sendMessageToClaude(message, sessionId = null) {
  const session = getOrCreateSession(sessionId);
  const messages = getMessagesBySession(session.id);

  // Store user message
  addMessage(session.id, 'user', message);

  const claudePath = process.env.CLAUDE_CLI_PATH || 'claude';
  const hasPriorMessages = messages.length > 0;
  const response = await executeClaude(claudePath, message, hasPriorMessages);

  // Store assistant message
  addMessage(session.id, 'assistant', response);

  return {
    sessionId: session.id,
    message: response,
    timestamp: new Date().toISOString()
  };
}

// Send message to Claude CLI with streaming callback
export async function sendMessageToClaudeStream(message, sessionId, onChunk) {
  const session = getOrCreateSession(sessionId);
  const messages = getMessagesBySession(session.id);

  addMessage(session.id, 'user', message);

  const claudePath = process.env.CLAUDE_CLI_PATH || 'claude';
  const hasPriorMessages = messages.length > 0;
  const response = await executeClaudeStream(claudePath, message, hasPriorMessages, onChunk);

  addMessage(session.id, 'assistant', response);

  return {
    sessionId: session.id,
    message: response,
    timestamp: new Date().toISOString()
  };
}

// Execute Claude CLI and collect full response
function executeClaude(claudePath, message, hasPriorMessages) {
  return new Promise((resolve, reject) => {
    const args = ['--print', '--output-format', 'text'];

    if (hasPriorMessages) {
      args.push('--continue');
    }

    args.push(message);

    const claudeProcess = spawn(claudePath, args, {
      env: { ...process.env },
      timeout: 120000
    });

    let stdout = '';
    let stderr = '';

    claudeProcess.stdout.on('data', (data) => {
      stdout += data.toString();
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
      if (code === 0) {
        resolve(stdout.trim() || 'No response from Claude.');
      } else {
        console.error(`Claude CLI exited with code ${code}. stderr: ${stderr}`);
        reject(new Error(`Claude CLI error (code ${code}): ${stderr.trim() || 'Unknown error'}`));
      }
    });
  });
}

// Execute Claude CLI with streaming output
function executeClaudeStream(claudePath, message, hasPriorMessages, onChunk) {
  return new Promise((resolve, reject) => {
    const args = ['--print', '--output-format', 'text'];

    if (hasPriorMessages) {
      args.push('--continue');
    }

    args.push(message);

    const claudeProcess = spawn(claudePath, args, {
      env: { ...process.env },
      timeout: 120000
    });

    let fullResponse = '';
    let stderr = '';

    claudeProcess.stdout.on('data', (data) => {
      const chunk = data.toString();
      fullResponse += chunk;
      if (onChunk) {
        onChunk(chunk);
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
      if (code === 0) {
        resolve(fullResponse.trim() || 'No response from Claude.');
      } else {
        reject(new Error(`Claude CLI error (code ${code}): ${stderr.trim() || 'Unknown error'}`));
      }
    });
  });
}
