import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  port: Number(process.env.PORT) || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',

  // CORS
  allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001').split(','),

  // Rate limiting
  rateLimitWindow: Number(process.env.RATE_LIMIT_WINDOW) || 60000,
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX) || 30,

  // Body size
  bodyLimit: process.env.BODY_LIMIT || '16kb',

  // Claude CLI
  claudeCliPath: process.env.CLAUDE_CLI_PATH || 'claude',
  claudeTimeout: Number(process.env.CLAUDE_TIMEOUT) || 120000,
  defaultModel: process.env.DEFAULT_MODEL || '',
  defaultSystemPrompt: process.env.DEFAULT_SYSTEM_PROMPT || '',

  // Messages
  maxMessageLength: Number(process.env.MAX_MESSAGE_LENGTH) || 10000,

  // File upload
  maxFileSize: Number(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024,
  maxFileCount: Number(process.env.MAX_FILE_COUNT) || 5,
  uploadCleanupAge: Number(process.env.UPLOAD_CLEANUP_AGE) || 3600000,
  uploadCleanupInterval: Number(process.env.UPLOAD_CLEANUP_INTERVAL) || 1800000,

  // Logging
  logLevel: process.env.LOG_LEVEL || '',

  // Shutdown
  shutdownTimeout: Number(process.env.SHUTDOWN_TIMEOUT) || 5000,
};
