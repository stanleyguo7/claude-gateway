import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { WebSocketServer } from 'ws';
import http from 'http';
import chatRouter from './api/chat.js';
import uploadRouter, { cleanupUploads } from './api/upload.js';
import { setupWebSocket } from './services/websocket.js';
import { initDatabase, closeDatabase } from './services/database.js';
import logger from './services/logger.js';

dotenv.config();

// Initialize database
initDatabase();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS - restrict to known origins
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001'
];

app.use(cors({
  origin(origin, callback) {
    // Allow requests with no origin (curl, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  }
}));

// Body size limit
app.use(express.json({ limit: '16kb' }));

// Simple rate limiting (per IP)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 30; // max requests per window

function rateLimit(req, res, next) {
  const ip = req.ip;
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now - record.start > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(ip, { start: now, count: 1 });
    return next();
  }

  record.count++;
  if (record.count > RATE_LIMIT_MAX) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }
  next();
}

app.use('/api', rateLimit);

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info({
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: Date.now() - start
    }, `${req.method} ${req.originalUrl} ${res.statusCode}`);
  });
  next();
});

// Clean up stale rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap) {
    if (now - record.start > RATE_LIMIT_WINDOW) {
      rateLimitMap.delete(ip);
    }
  }
}, RATE_LIMIT_WINDOW);

// Routes
app.use('/api/chat', chatRouter);
app.use('/api/upload', uploadRouter);

// Upload cleanup interval (every 30 minutes)
setInterval(() => cleanupUploads(), 30 * 60 * 1000);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS: origin not allowed' });
  }
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
});

// Create HTTP server
const server = http.createServer(app);

// Setup WebSocket
const wss = new WebSocketServer({ server });
setupWebSocket(wss);

server.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
  logger.info(`WebSocket server running on ws://localhost:${PORT}`);
});

// Graceful shutdown
function shutdown(signal) {
  logger.info(`${signal} received. Shutting down gracefully...`);

  // Close database
  closeDatabase();

  // Close WebSocket connections
  wss.clients.forEach((client) => {
    client.close(1001, 'Server shutting down');
  });

  server.close(() => {
    logger.info('Server closed.');
    process.exit(0);
  });

  // Force shutdown after 5 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 5000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
