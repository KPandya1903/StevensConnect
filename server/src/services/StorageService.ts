import sharp from 'sharp';
import { randomUUID } from 'crypto';
import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env';

export type UploadPurpose = 'listing' | 'avatar';

const MAX_WIDTH: Record<UploadPurpose, number> = {
  listing: 1200,
  avatar: 400,
};

function getCloudinary() {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });
  return cloudinary;
}

function publicIdFromUrl(url: string): string | null {
  // e.g. https://res.cloudinary.com/<cloud>/image/upload/v123/<folder>/<id>.webp
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.\w+)?$/);
  return match ? match[1] : null;
}

export const StorageService = {
  async saveImage(
    buffer: Buffer,
    purpose: UploadPurpose,
    _ownerId: string,
  ): Promise<string> {
    const resized = await sharp(buffer)
      .resize({ width: MAX_WIDTH[purpose], withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();

    const client = getCloudinary();
    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      client.uploader.upload_stream(
        {
          resource_type: 'image',
          folder: `stevensconnect/${purpose}s`,
          public_id: randomUUID(),
          overwrite: false,
          format: 'webp',
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result as { secure_url: string });
        },
      ).end(resized);
    });

    return result.secure_url;
  },

  async deleteImage(url: string): Promise<void> {
    try {
      const publicId = publicIdFromUrl(url);
      if (!publicId) return;
      const client = getCloudinary();
      await client.uploader.destroy(publicId, { resource_type: 'image' });
    } catch {
      // Don't fail the request if cleanup fails
    }
  },
};
