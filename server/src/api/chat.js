import express from 'express';
import logger from '../services/logger.js';
import { config } from '../config.js';
import { sendMessageToClaude, getSession } from '../services/claude.js';
import {
  getMessagesBySession,
  getAllSessions,
  createSession,
  deleteSession,
  updateSessionTitle,
  getSessionById
} from '../services/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Send a message to Claude
router.post('/message', async (req, res) => {
  try {
    const { message, sessionId, model, systemPrompt } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message must be a non-empty string' });
    }

    if (message.length > config.maxMessageLength) {
      return res.status(400).json({ error: `Message exceeds maximum length of ${config.maxMessageLength} characters` });
    }

    if (sessionId && !UUID_REGEX.test(sessionId)) {
      return res.status(400).json({ error: 'Invalid session ID format' });
    }

    const options = {};
    if (model) options.model = model;
    if (systemPrompt) options.systemPrompt = systemPrompt;

    const response = await sendMessageToClaude(message, sessionId, options);
    res.json({ response, sessionId: response.sessionId });
  } catch (error) {
    logger.error({ err: error }, 'Error processing message');
    res.status(500).json({ error: 'Failed to process message' });
  }
});

// Get session history
router.get('/history/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!UUID_REGEX.test(sessionId)) {
      return res.status(400).json({ error: 'Invalid session ID format' });
    }

    const messages = getMessagesBySession(sessionId);
    res.json({ messages });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching history');
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// Get all sessions
router.get('/sessions', (req, res) => {
  try {
    const sessions = getAllSessions();
    res.json({ sessions });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching sessions');
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// Create a new session
router.post('/sessions', (req, res) => {
  try {
    const { title } = req.body;
    const id = uuidv4();
    const session = createSession(id, title);
    res.status(201).json({ session });
  } catch (error) {
    logger.error({ err: error }, 'Error creating session');
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Delete a session
router.delete('/sessions/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!UUID_REGEX.test(sessionId)) {
      return res.status(400).json({ error: 'Invalid session ID format' });
    }

    const session = getSessionById(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    deleteSession(sessionId);
    res.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, 'Error deleting session');
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

// Rename a session
router.patch('/sessions/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const { title } = req.body;

    if (!UUID_REGEX.test(sessionId)) {
      return res.status(400).json({ error: 'Invalid session ID format' });
    }

    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'Title must be a non-empty string' });
    }

    const session = getSessionById(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    updateSessionTitle(sessionId, title.trim());
    res.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, 'Error updating session');
    res.status(500).json({ error: 'Failed to update session' });
  }
});

// Export chat history
router.get('/export/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const format = req.query.format || 'json';

    if (!UUID_REGEX.test(sessionId)) {
      return res.status(400).json({ error: 'Invalid session ID format' });
    }

    const session = getSessionById(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const messages = getMessagesBySession(sessionId);

    if (format === 'md') {
      let md = `# ${session.title}\n\n`;
      md += `*Exported: ${new Date().toISOString()}*\n\n---\n\n`;

      for (const msg of messages) {
        const role = msg.role === 'user' ? 'You' : 'Claude';
        const time = new Date(msg.timestamp).toLocaleString();
        md += `### ${role} (${time})\n\n${msg.content}\n\n---\n\n`;
      }

      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="chat-${sessionId.slice(0, 8)}.md"`);
      res.send(md);
    } else {
      const exportData = {
        session: {
          id: session.id,
          title: session.title,
          created_at: session.created_at
        },
        messages,
        exported_at: new Date().toISOString()
      };

      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="chat-${sessionId.slice(0, 8)}.json"`);
      res.json(exportData);
    }
  } catch (error) {
    logger.error({ err: error }, 'Error exporting chat');
    res.status(500).json({ error: 'Failed to export chat' });
  }
});

export default router;
