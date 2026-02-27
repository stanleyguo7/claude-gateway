import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  initDatabase,
  closeDatabase,
  createSession,
  getSessionById,
  getAllSessions,
  updateSessionTitle,
  updateSessionActivity,
  deleteSession,
  addMessage,
  getMessagesBySession
} from '../src/services/database.js';

describe('Database Service', () => {
  beforeAll(() => {
    initDatabase(true); // in-memory for tests
  });

  afterAll(() => {
    closeDatabase();
  });

  describe('Session operations', () => {
    it('should create a session', () => {
      const session = createSession('test-id-1', 'Test Chat');
      expect(session).toBeDefined();
      expect(session.id).toBe('test-id-1');
      expect(session.title).toBe('Test Chat');
    });

    it('should create a session with default title', () => {
      const session = createSession('test-id-2');
      expect(session.title).toBe('New Chat');
    });

    it('should get a session by ID', () => {
      const session = getSessionById('test-id-1');
      expect(session).toBeDefined();
      expect(session.id).toBe('test-id-1');
      expect(session.title).toBe('Test Chat');
    });

    it('should return undefined for non-existent session', () => {
      const session = getSessionById('non-existent');
      expect(session).toBeUndefined();
    });

    it('should get all sessions', () => {
      const sessions = getAllSessions();
      expect(sessions.length).toBeGreaterThanOrEqual(2);
    });

    it('should update session title', () => {
      updateSessionTitle('test-id-1', 'Updated Title');
      const session = getSessionById('test-id-1');
      expect(session.title).toBe('Updated Title');
    });

    it('should update session activity', () => {
      const before = getSessionById('test-id-1');
      // Small delay to ensure timestamp differs
      updateSessionActivity('test-id-1');
      const after = getSessionById('test-id-1');
      expect(after.last_activity).toBeDefined();
    });

    it('should delete a session', () => {
      createSession('test-id-delete', 'To Delete');
      deleteSession('test-id-delete');
      const session = getSessionById('test-id-delete');
      expect(session).toBeUndefined();
    });
  });

  describe('Message operations', () => {
    it('should add a message', () => {
      const msg = addMessage('test-id-1', 'user', 'Hello');
      expect(msg.role).toBe('user');
      expect(msg.content).toBe('Hello');
      expect(msg.timestamp).toBeDefined();
    });

    it('should add multiple messages', () => {
      addMessage('test-id-1', 'assistant', 'Hi there!');
      addMessage('test-id-1', 'user', 'How are you?');
    });

    it('should get messages by session', () => {
      const messages = getMessagesBySession('test-id-1');
      expect(messages.length).toBe(3);
      expect(messages[0].role).toBe('user');
      expect(messages[0].content).toBe('Hello');
      expect(messages[1].role).toBe('assistant');
      expect(messages[2].role).toBe('user');
    });

    it('should return empty array for session with no messages', () => {
      const messages = getMessagesBySession('test-id-2');
      expect(messages).toEqual([]);
    });

    it('should delete messages when session is deleted', () => {
      createSession('test-msg-delete', 'Msg Delete Test');
      addMessage('test-msg-delete', 'user', 'Test');
      addMessage('test-msg-delete', 'assistant', 'Response');
      deleteSession('test-msg-delete');
      const messages = getMessagesBySession('test-msg-delete');
      expect(messages).toEqual([]);
    });
  });
});
