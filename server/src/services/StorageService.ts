/**
 * StorageService
 *
 * Abstracts file storage behind a single interface.
 * Dev (UPLOAD_STORAGE=local):  saves resized images to disk, returns a relative URL.
 * Prod (UPLOAD_STORAGE=s3):    uploads to S3, returns the public object URL.
 *
 * Sharp resizes to a max width of 1200px (listings) or 400px (avatars),
 * preserving aspect ratio. Output is always WebP for consistency and size.
 */

import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { randomUUID } from 'crypto';
import { env } from '../config/env';
import { UPLOADS_DIR } from '../config/upload';

export type UploadPurpose = 'listing' | 'avatar';

const MAX_WIDTH: Record<UploadPurpose, number> = {
  listing: 1200,
  avatar: 400,
};

function s3Key(purpose: UploadPurpose, ownerId: string, filename: string): string {
  return `${purpose}s/${ownerId}/${filename}`;
}

function s3PublicUrl(key: string): string {
  return `https://${env.AWS_S3_BUCKET!}.s3.${env.AWS_REGION!}.amazonaws.com/${key}`;
}

export const StorageService = {
  async saveImage(
    buffer: Buffer,
    purpose: UploadPurpose,
    ownerId: string,
  ): Promise<string> {
    const filename = `${randomUUID()}.webp`;

    const resized = await sharp(buffer)
      .resize({ width: MAX_WIDTH[purpose], withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();

    if (env.UPLOAD_STORAGE === 'local') {
      const subDir = path.join(UPLOADS_DIR, purpose);
      await fs.mkdir(subDir, { recursive: true });
      await fs.writeFile(path.join(subDir, filename), resized);
      return `/uploads/${purpose}/${filename}`;
    }

    // S3 upload
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
    const client = new S3Client({ region: env.AWS_REGION! });
    const key = s3Key(purpose, ownerId, filename);

    await client.send(
      new PutObjectCommand({
        Bucket: env.AWS_S3_BUCKET!,
        Key: key,
        Body: resized,
        ContentType: 'image/webp',
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );

    return s3PublicUrl(key);
  },

  async deleteImage(url: string): Promise<void> {
    if (env.UPLOAD_STORAGE === 'local') {
      const filePath = path.join(UPLOADS_DIR, '..', url);
      await fs.unlink(filePath).catch(() => {});
      return;
    }

    // S3 delete — extract key from URL
    // URL shape: https://<bucket>.s3.<region>.amazonaws.com/<key>
    try {
      const { S3Client, DeleteObjectCommand } = await import('@aws-sdk/client-s3');
      const client = new S3Client({ region: env.AWS_REGION! });
      const urlObj = new URL(url);
      const key = urlObj.pathname.slice(1); // strip leading /
      await client.send(
        new DeleteObjectCommand({ Bucket: env.AWS_S3_BUCKET!, Key: key }),
      );
    } catch {
      // Don't fail the request if cleanup fails
    }
  },
};
