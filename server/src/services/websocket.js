import { sendMessageToClaudeStream } from './claude.js';

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001'
];

export function setupWebSocket(wss) {
  wss.on('connection', (ws, req) => {
    // Origin validation
    const origin = req.headers.origin;
    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      console.warn(`WebSocket connection rejected from origin: ${origin}`);
      ws.close(1008, 'Origin not allowed');
      return;
    }

    console.log('Client connected via WebSocket');

    ws.on('message', async (data) => {
      try {
        const parsed = JSON.parse(data.toString());
        const { type, message, sessionId } = parsed;

        if (type === 'chat') {
          if (!message || typeof message !== 'string') {
            ws.send(JSON.stringify({ type: 'error', error: 'Message must be a non-empty string' }));
            return;
          }

          // Send start indicator
          ws.send(JSON.stringify({ type: 'stream_start', sessionId }));

          try {
            const response = await sendMessageToClaudeStream(
              message,
              sessionId,
              (chunk) => {
                // Stream each chunk to the client
                if (ws.readyState === ws.OPEN) {
                  ws.send(JSON.stringify({ type: 'stream_chunk', chunk }));
                }
              }
            );

            // Send complete response
            if (ws.readyState === ws.OPEN) {
              ws.send(JSON.stringify({
                type: 'stream_end',
                sessionId: response.sessionId,
                message: response.message,
                timestamp: response.timestamp
              }));
            }
          } catch (error) {
            console.error('Claude CLI error:', error.message);
            if (ws.readyState === ws.OPEN) {
              ws.send(JSON.stringify({
                type: 'error',
                error: error.message
              }));
            }
          }
        } else if (type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
        } else {
          ws.send(JSON.stringify({ type: 'error', error: `Unknown message type: ${type}` }));
        }
      } catch (error) {
        console.error('WebSocket message parse error:', error.message);
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({ type: 'error', error: 'Invalid message format' }));
        }
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error.message);
    });

    ws.on('close', (code, reason) => {
      console.log(`Client disconnected. Code: ${code}, Reason: ${reason || 'none'}`);
    });

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connected',
      message: 'Connected to Claude Gateway'
    }));
  });
}
