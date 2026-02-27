import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';

const sessions = new Map();
const SESSION_TTL = 30 * 60 * 1000; // 30 minutes

// Get or create a session
function getOrCreateSession(sessionId) {
  if (sessionId && sessions.has(sessionId)) {
    const session = sessions.get(sessionId);
    session.lastActivity = Date.now();
    return session;
  }

  const id = sessionId || uuidv4();
  const session = {
    id,
    messages: [],
    createdAt: Date.now(),
    lastActivity: Date.now()
  };
  sessions.set(id, session);
  return session;
}

export function getSession(sessionId) {
  const session = sessions.get(sessionId);
  if (session) {
    session.lastActivity = Date.now();
  }
  return session || null;
}

// Cleanup expired sessions
export function cleanupSessions() {
  const now = Date.now();
  let cleaned = 0;
  for (const [id, session] of sessions) {
    if (now - session.lastActivity > SESSION_TTL) {
      sessions.delete(id);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    console.log(`Cleaned up ${cleaned} expired sessions. Active: ${sessions.size}`);
  }
}

// Send message to Claude CLI and get response
export async function sendMessageToClaude(message, sessionId = null) {
  const session = getOrCreateSession(sessionId);

  // Store user message
  session.messages.push({
    role: 'user',
    content: message,
    timestamp: new Date().toISOString()
  });

  const claudePath = process.env.CLAUDE_CLI_PATH || 'claude';
  const response = await executeClaude(claudePath, message, session);

  // Store assistant message
  session.messages.push({
    role: 'assistant',
    content: response,
    timestamp: new Date().toISOString()
  });

  return {
    sessionId: session.id,
    message: response,
    timestamp: new Date().toISOString()
  };
}

// Send message to Claude CLI with streaming callback
export async function sendMessageToClaudeStream(message, sessionId, onChunk) {
  const session = getOrCreateSession(sessionId);

  session.messages.push({
    role: 'user',
    content: message,
    timestamp: new Date().toISOString()
  });

  const claudePath = process.env.CLAUDE_CLI_PATH || 'claude';
  const response = await executeClaudeStream(claudePath, message, session, onChunk);

  session.messages.push({
    role: 'assistant',
    content: response,
    timestamp: new Date().toISOString()
  });

  return {
    sessionId: session.id,
    message: response,
    timestamp: new Date().toISOString()
  };
}

// Execute Claude CLI and collect full response
function executeClaude(claudePath, message, session) {
  return new Promise((resolve, reject) => {
    const args = ['--print', '--output-format', 'text'];

    // Add conversation history as context via prompt
    if (session.messages.length > 1) {
      args.push('--continue');
    }

    args.push(message);

    const claudeProcess = spawn(claudePath, args, {
      env: { ...process.env },
      timeout: 120000 // 2 minute timeout
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
function executeClaudeStream(claudePath, message, session, onChunk) {
  return new Promise((resolve, reject) => {
    const args = ['--print', '--output-format', 'text'];

    if (session.messages.length > 1) {
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
