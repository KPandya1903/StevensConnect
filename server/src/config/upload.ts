import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import { Request } from 'express';
import { env } from './env';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

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
