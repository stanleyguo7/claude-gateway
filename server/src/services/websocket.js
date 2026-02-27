export function setupWebSocket(wss) {
  wss.on('connection', (ws) => {
    console.log('Client connected');

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        console.log('Received:', message);

        // Echo back for now
        ws.send(JSON.stringify({
          type: 'response',
          data: message
        }));
      } catch (error) {
        console.error('WebSocket error:', error);
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected');
    });

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connected',
      message: 'Connected to Claude Gateway'
    }));
  });
}
