import express from 'express';
import { sendMessageToClaude } from '../services/claude.js';

const router = express.Router();

// Send a message to Claude
router.post('/message', async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
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
    // TODO: Implement session history retrieval
    res.json({ messages: [] });
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

export default router;
