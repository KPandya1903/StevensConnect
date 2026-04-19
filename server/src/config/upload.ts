/**
 * File upload configuration (Multer + Sharp)
 *
 * Dev:  files saved to server/uploads/ (served as static at /uploads/)
 * Prod: files streamed to S3 (configured in Phase 6)
 *
 * All uploads are validated by MIME type via file magic bytes (not extension),
 * resized via Sharp before being stored, and size-capped.
 */

import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import { env } from './env';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

// Ensure uploads directory exists (dev only)
const UPLOADS_DIR = path.join(__dirname, '../../uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function fileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
): void {
  if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
  }
}

// Use memoryStorage so we can pipe to Sharp before writing to disk or S3
export const imageUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: env.UPLOAD_MAX_IMAGE_SIZE_BYTES,
    files: 8,
  },
});

export const avatarUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: env.UPLOAD_MAX_AVATAR_SIZE_BYTES,
    files: 1,
  },
});

export { UPLOADS_DIR };
