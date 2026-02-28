import { sendMessageToClaudeStream } from './claude.js';
import { readUploadedFile } from '../api/upload.js';
import { config } from '../config.js';
import logger from './logger.js';

export function setupWebSocket(wss) {
  wss.on('connection', (ws, req) => {
    // Origin validation
    const origin = req.headers.origin;
    if (origin && !config.allowedOrigins.includes(origin)) {
      logger.warn({ origin }, 'WebSocket connection rejected');
      ws.close(1008, 'Origin not allowed');
      return;
    }

    logger.info('Client connected via WebSocket');

    ws.on('message', async (data) => {
      try {
        const parsed = JSON.parse(data.toString());
        const { type, message, sessionId, model, systemPrompt, files } = parsed;

        if (type === 'chat') {
          if (!message || typeof message !== 'string') {
            ws.send(JSON.stringify({ type: 'error', error: 'Message must be a non-empty string' }));
            return;
          }

          // Build full message with file content
          let fullMessage = message;
          if (files && Array.isArray(files) && files.length > 0) {
            const fileParts = [];
            for (const filename of files) {
              const fileData = readUploadedFile(filename);
              if (fileData && fileData.type === 'text') {
                fileParts.push(`\n\n--- File: ${filename} ---\n${fileData.content}\n--- End of file ---`);
              }
            }
            if (fileParts.length > 0) {
              fullMessage = message + fileParts.join('');
            }
          }

          // Send start indicator
          ws.send(JSON.stringify({ type: 'stream_start', sessionId }));

          const options = {};
          if (model) options.model = model;
          if (systemPrompt) options.systemPrompt = systemPrompt;

          try {
            const response = await sendMessageToClaudeStream(
              fullMessage,
              sessionId,
              (chunk, rawEvent) => {
                if (ws.readyState !== ws.OPEN) return;

                // Forward tool use events
                if (rawEvent && rawEvent.type === 'content_block_start' && rawEvent.content_block?.type === 'tool_use') {
                  ws.send(JSON.stringify({
                    type: 'tool_use_start',
                    name: rawEvent.content_block.name,
                    id: rawEvent.content_block.id,
                    input: rawEvent.content_block.input
                  }));
                } else if (rawEvent && rawEvent.type === 'content_block_stop') {
                  ws.send(JSON.stringify({ type: 'tool_use_end' }));
                }

                // Stream text chunks
                if (chunk) {
                  ws.send(JSON.stringify({ type: 'stream_chunk', chunk }));
                }
              },
              options
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
            logger.error({ err: error }, 'Claude CLI error');
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
        logger.error({ err: error }, 'WebSocket message parse error');
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({ type: 'error', error: 'Invalid message format' }));
        }
      }
    });

    ws.on('error', (error) => {
      logger.error({ err: error }, 'WebSocket error');
    });

    ws.on('close', (code, reason) => {
      logger.info({ code, reason: reason || 'none' }, 'Client disconnected');
    });

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connected',
      message: 'Connected to Claude Gateway'
    }));
  });
}
