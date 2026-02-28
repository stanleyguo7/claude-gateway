import express from 'express';
import logger from '../services/logger.js';
import { config } from '../config.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '../../uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: config.maxFileSize },
  fileFilter: (req, file, cb) => {
    // Allow text-based files and common document types
    const allowedMimes = [
      'text/plain',
      'text/markdown',
      'text/csv',
      'text/html',
      'text/css',
      'text/javascript',
      'application/json',
      'application/xml',
      'application/pdf',
      'application/javascript',
      'image/png',
      'image/jpeg',
      'image/gif',
      'image/webp'
    ];

    // Also allow by extension for files with generic mime types
    const allowedExts = [
      '.txt', '.md', '.csv', '.json', '.xml', '.html', '.css', '.js', '.ts',
      '.jsx', '.tsx', '.py', '.rb', '.go', '.rs', '.java', '.c', '.cpp', '.h',
      '.sh', '.yml', '.yaml', '.toml', '.ini', '.cfg', '.env', '.log',
      '.sql', '.graphql', '.proto', '.dockerfile',
      '.pdf', '.png', '.jpg', '.jpeg', '.gif', '.webp'
    ];

    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${file.mimetype} (${ext})`));
    }
  }
});

const router = express.Router();

// Upload files
router.post('/', upload.array('files', config.maxFileCount), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const files = req.files.map(f => ({
      id: path.basename(f.filename, path.extname(f.filename)),
      originalName: f.originalname,
      filename: f.filename,
      size: f.size,
      mimetype: f.mimetype,
      path: f.path
    }));

    res.json({ files });
  } catch (error) {
    logger.error({ err: error }, 'Upload error');
    res.status(500).json({ error: 'Failed to upload files' });
  }
});

// Read file content for injecting into Claude prompt
export function readUploadedFile(filename) {
  const filePath = path.join(UPLOAD_DIR, filename);
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const ext = path.extname(filename).toLowerCase();
  const binaryExts = ['.pdf', '.png', '.jpg', '.jpeg', '.gif', '.webp'];

  if (binaryExts.includes(ext)) {
    // Return base64 for binary files
    const data = fs.readFileSync(filePath);
    return { type: 'binary', data: data.toString('base64'), ext };
  }

  // Return text content for text files
  const content = fs.readFileSync(filePath, 'utf-8');
  return { type: 'text', content, ext };
}

// Clean up old uploads
export function cleanupUploads() {
  const now = Date.now();

  try {
    const files = fs.readdirSync(UPLOAD_DIR);
    for (const file of files) {
      if (file === '.gitkeep') continue;
      const filePath = path.join(UPLOAD_DIR, file);
      const stat = fs.statSync(filePath);
      if (now - stat.mtimeMs > config.uploadCleanupAge) {
        fs.unlinkSync(filePath);
      }
    }
  } catch (error) {
    logger.error({ err: error }, 'Upload cleanup error');
  }
}

// Error handling for multer
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: `File too large. Maximum size is ${Math.round(config.maxFileSize / (1024 * 1024))}MB.` });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: `Too many files. Maximum is ${config.maxFileCount} files.` });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
});

export default router;
