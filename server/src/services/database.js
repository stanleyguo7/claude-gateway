import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../../data/gateway.db');

let db;

export function initDatabase() {
  db = new Database(DB_PATH);

  // Enable WAL mode for better concurrent read performance
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      title TEXT DEFAULT 'New Chat',
      created_at TEXT NOT NULL,
      last_activity TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_last_activity ON sessions(last_activity);
  `);

  console.log('Database initialized at', DB_PATH);
  return db;
}

export function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

// Session operations
export function createSession(id, title) {
  const now = new Date().toISOString();
  const stmt = getDb().prepare(
    'INSERT INTO sessions (id, title, created_at, last_activity) VALUES (?, ?, ?, ?)'
  );
  stmt.run(id, title || 'New Chat', now, now);
  return { id, title: title || 'New Chat', created_at: now, last_activity: now };
}

export function getSessionById(id) {
  return getDb().prepare('SELECT * FROM sessions WHERE id = ?').get(id);
}

export function updateSessionActivity(id) {
  const now = new Date().toISOString();
  getDb().prepare('UPDATE sessions SET last_activity = ? WHERE id = ?').run(now, id);
}

export function updateSessionTitle(id, title) {
  getDb().prepare('UPDATE sessions SET title = ? WHERE id = ?').run(title, id);
}

export function deleteSession(id) {
  getDb().prepare('DELETE FROM messages WHERE session_id = ?').run(id);
  getDb().prepare('DELETE FROM sessions WHERE id = ?').run(id);
}

export function getAllSessions() {
  return getDb().prepare(
    'SELECT * FROM sessions ORDER BY last_activity DESC'
  ).all();
}

// Message operations
export function addMessage(sessionId, role, content) {
  const timestamp = new Date().toISOString();
  const stmt = getDb().prepare(
    'INSERT INTO messages (session_id, role, content, timestamp) VALUES (?, ?, ?, ?)'
  );
  stmt.run(sessionId, role, content, timestamp);
  updateSessionActivity(sessionId);
  return { session_id: sessionId, role, content, timestamp };
}

export function getMessagesBySession(sessionId) {
  return getDb().prepare(
    'SELECT role, content, timestamp FROM messages WHERE session_id = ? ORDER BY id ASC'
  ).all(sessionId);
}

export function closeDatabase() {
  if (db) {
    db.close();
    console.log('Database closed.');
  }
}
