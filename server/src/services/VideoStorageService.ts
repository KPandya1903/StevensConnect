import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';

function getCloudinary() {
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    throw new AppError(503, 'Video uploads are not configured', 'VIDEO_NOT_CONFIGURED');
  }

  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });

  return cloudinary;
}

function publicIdFromUrl(url: string): string | null {
  // Extract public_id from a Cloudinary URL
  // e.g. https://res.cloudinary.com/<cloud>/video/upload/v123/<folder>/<public_id>.mp4
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.\w+)?$/);
  return match ? match[1] : null;
}

export const VideoStorageService = {
  async uploadVideo(buffer: Buffer, filename: string, _mimeType: string): Promise<string> {
    const client = getCloudinary();

    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      const uploadStream = client.uploader.upload_stream(
        {
          resource_type: 'video',
          folder: 'stevensconnect/videos',
          public_id: `${Date.now()}-${filename.replace(/\.[^.]+$/, '')}`,
          overwrite: false,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result as { secure_url: string });
        },
      );
      uploadStream.end(buffer);
    });

    return result.secure_url;
  },

  async deleteVideo(url: string): Promise<void> {
    try {
      const publicId = publicIdFromUrl(url);
      if (!publicId) return;
      const client = getCloudinary();
      await client.uploader.destroy(publicId, { resource_type: 'video' });
    } catch {
      // Swallow — file may already be deleted
    }
  },
};
