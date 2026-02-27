import express from 'express';
import { sendMessageToClaude, getSession } from '../services/claude.js';

const router = express.Router();

const MAX_MESSAGE_LENGTH = 10000;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Send a message to Claude
router.post('/message', async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    // Validate message
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message must be a non-empty string' });
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({ error: `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters` });
    }

    // Validate sessionId format if provided
    if (sessionId && !UUID_REGEX.test(sessionId)) {
      return res.status(400).json({ error: 'Invalid session ID format' });
    }

    const response = await sendMessageToClaude(message, sessionId);
    res.json({ response, sessionId: response.sessionId });
  } catch (error) {
    console.error('Error processing message:', error);
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

    const session = getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ messages: session.messages });
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

export default router;
