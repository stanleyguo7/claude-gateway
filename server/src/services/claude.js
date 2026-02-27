import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';

const sessions = new Map();

export async function sendMessageToClaude(message, sessionId = null) {
  const id = sessionId || uuidv4();

  return new Promise((resolve, reject) => {
    // TODO: Implement actual Claude CLI communication
    // This is a placeholder implementation

    // For now, return a mock response
    setTimeout(() => {
      resolve({
        sessionId: id,
        message: `Echo: ${message}`,
        timestamp: new Date().toISOString()
      });
    }, 1000);

    // Actual implementation would use:
    // const claudeProcess = spawn('claude', ['code', 'chat']);
    // Handle stdin/stdout communication with the process
  });
}

export function getSession(sessionId) {
  return sessions.get(sessionId);
}

export function createSession() {
  const sessionId = uuidv4();
  sessions.set(sessionId, {
    id: sessionId,
    messages: [],
    createdAt: new Date()
  });
  return sessionId;
}
