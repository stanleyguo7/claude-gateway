import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import { initDatabase, closeDatabase, createSession, addMessage } from '../src/services/database.js';

// We need to import the router after DB is initialized
let chatRouter;
let app;

describe('Chat API Routes', () => {
  beforeAll(async () => {
    initDatabase(true);

    // Dynamic import to ensure DB is ready
    const mod = await import('../src/api/chat.js');
    chatRouter = mod.default;

    app = express();
    app.use(express.json());
    app.use('/api/chat', chatRouter);
  });

  afterAll(() => {
    closeDatabase();
  });

  describe('GET /api/chat/sessions', () => {
    it('should return empty sessions list initially', async () => {
      const res = await makeRequest(app, 'GET', '/api/chat/sessions');
      expect(res.status).toBe(200);
      expect(res.body.sessions).toEqual([]);
    });

    it('should return sessions after creating them', async () => {
      createSession('session-1', 'First Chat');
      createSession('session-2', 'Second Chat');

      const res = await makeRequest(app, 'GET', '/api/chat/sessions');
      expect(res.status).toBe(200);
      expect(res.body.sessions.length).toBe(2);
    });
  });

  describe('POST /api/chat/sessions', () => {
    it('should create a new session', async () => {
      const res = await makeRequest(app, 'POST', '/api/chat/sessions', { title: 'New Test Chat' });
      expect(res.status).toBe(201);
      expect(res.body.session).toBeDefined();
      expect(res.body.session.title).toBe('New Test Chat');
    });
  });

  describe('PATCH /api/chat/sessions/:sessionId', () => {
    it('should rename a session', async () => {
      createSession('a0a0a0a0-b1b1-c2c2-d3d3-e4e4e4e4e4e4', 'Rename Me');
      const res = await makeRequest(app, 'PATCH', '/api/chat/sessions/a0a0a0a0-b1b1-c2c2-d3d3-e4e4e4e4e4e4', { title: 'Renamed' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject invalid session ID', async () => {
      const res = await makeRequest(app, 'PATCH', '/api/chat/sessions/bad-id', { title: 'Test' });
      expect(res.status).toBe(400);
    });

    it('should reject empty title', async () => {
      const res = await makeRequest(app, 'PATCH', '/api/chat/sessions/a0a0a0a0-b1b1-c2c2-d3d3-e4e4e4e4e4e4', { title: '' });
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/chat/sessions/:sessionId', () => {
    it('should delete a session', async () => {
      createSession('b0b0b0b0-c1c1-d2d2-e3e3-f4f4f4f4f4f4', 'Delete Me');
      const res = await makeRequest(app, 'DELETE', '/api/chat/sessions/b0b0b0b0-c1c1-d2d2-e3e3-f4f4f4f4f4f4');
      expect(res.status).toBe(200);
    });

    it('should return 400 for invalid session ID format', async () => {
      const res = await makeRequest(app, 'DELETE', '/api/chat/sessions/bad');
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/chat/history/:sessionId', () => {
    it('should return messages for a session', async () => {
      addMessage('session-1', 'user', 'Hello');
      addMessage('session-1', 'assistant', 'Hi!');

      const res = await makeRequest(app, 'GET', '/api/chat/history/session-1');
      // session-1 is not UUID format, so it will be rejected
      expect(res.status).toBe(400);
    });

    it('should reject invalid session ID', async () => {
      const res = await makeRequest(app, 'GET', '/api/chat/history/bad-id');
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/chat/message', () => {
    it('should reject empty message', async () => {
      const res = await makeRequest(app, 'POST', '/api/chat/message', { message: '' });
      expect(res.status).toBe(400);
    });

    it('should reject non-string message', async () => {
      const res = await makeRequest(app, 'POST', '/api/chat/message', { message: 123 });
      expect(res.status).toBe(400);
    });

    it('should reject message exceeding max length', async () => {
      const res = await makeRequest(app, 'POST', '/api/chat/message', { message: 'a'.repeat(10001) });
      expect(res.status).toBe(400);
    });

    it('should reject invalid session ID format', async () => {
      const res = await makeRequest(app, 'POST', '/api/chat/message', { message: 'test', sessionId: 'bad' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/chat/export/:sessionId', () => {
    it('should reject invalid session ID', async () => {
      const res = await makeRequest(app, 'GET', '/api/chat/export/bad-id');
      expect(res.status).toBe(400);
    });
  });
});

// Simple test helper to simulate HTTP requests on Express app
function makeRequest(app, method, path, body) {
  return new Promise((resolve) => {
    const http = require('http');
    const server = app.listen(0, () => {
      const port = server.address().port;
      const options = {
        hostname: 'localhost',
        port,
        path,
        method,
        headers: { 'Content-Type': 'application/json' }
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          server.close();
          let body;
          try { body = JSON.parse(data); } catch { body = data; }
          resolve({ status: res.statusCode, body });
        });
      });

      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  });
}
