import { Readable } from 'stream';
import { google } from 'googleapis';
import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';

function getDriveClient() {
  if (!env.GOOGLE_SERVICE_ACCOUNT_JSON || !env.GOOGLE_DRIVE_FOLDER_ID) {
    throw new AppError(503, 'Video uploads are not configured', 'VIDEO_NOT_CONFIGURED');
  }

  const credentials = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON) as {
    client_email: string;
    private_key: string;
  };

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });

  return { drive: google.drive({ version: 'v3', auth }), folderId: env.GOOGLE_DRIVE_FOLDER_ID };
}

function bufferToStream(buffer: Buffer): Readable {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
}

function fileIdFromEmbedUrl(embedUrl: string): string | null {
  const match = embedUrl.match(/\/file\/d\/([^/]+)\//);
  return match ? match[1] : null;
}

export const VideoStorageService = {
  async uploadVideo(buffer: Buffer, filename: string, mimeType: string): Promise<string> {
    const { drive, folderId } = getDriveClient();

    const res = await drive.files.create({
      requestBody: {
        name: filename,
        parents: [folderId],
        mimeType,
      },
      media: {
        mimeType,
        body: bufferToStream(buffer),
      },
      fields: 'id',
    });

    const fileId = res.data.id!;

    // Make file publicly viewable (required for embedding)
    await drive.permissions.create({
      fileId,
      requestBody: { role: 'reader', type: 'anyone' },
    });

    return `https://drive.google.com/file/d/${fileId}/preview`;
  },

  async deleteVideo(embedUrl: string): Promise<void> {
    try {
      const fileId = fileIdFromEmbedUrl(embedUrl);
      if (!fileId) return;
      const { drive } = getDriveClient();
      await drive.files.delete({ fileId });
    } catch {
      // Swallow — file may already be deleted
    }
  },
};
