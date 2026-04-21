import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import type { DropzoneOptions } from 'react-dropzone';

const MAX_FILES = 8;
const MAX_SIZE_MB = 20;
const ACCEPTED_TYPES: DropzoneOptions['accept'] = {
  'image/jpeg': [],
  'image/png': [],
  'image/webp': [],
};

interface ImageUploaderProps {
  /** Already-persisted image URLs (from the server) */
  existingUrls?: string[];
  onAdd: (files: File[]) => Promise<void>;
  onRemoveExisting?: (url: string) => Promise<void>;
  isUploading?: boolean;
}

export function ImageUploader({
  existingUrls = [],
  onAdd,
  onRemoveExisting,
  isUploading = false,
}: ImageUploaderProps) {
  const [localPreviews, setLocalPreviews] = useState<{ file: File; preview: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  const remaining = MAX_FILES - existingUrls.length - localPreviews.length;

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setError(null);

      if (acceptedFiles.length === 0) return;
      if (acceptedFiles.length > remaining) {
        setError(`You can only upload ${remaining} more image(s).`);
        return;
      }

      const previews = acceptedFiles.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }));
      setLocalPreviews((prev) => [...prev, ...previews]);

      try {
        await onAdd(acceptedFiles);
        // Clean up after upload
        previews.forEach((p) => URL.revokeObjectURL(p.preview));
        setLocalPreviews([]);
      } catch {
        previews.forEach((p) => URL.revokeObjectURL(p.preview));
        setLocalPreviews([]);
        setError('Failed to upload images. Please try again.');
      }
    },
    [onAdd, remaining],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_SIZE_MB * 1024 * 1024,
    maxFiles: remaining,
    disabled: remaining <= 0 || isUploading,
    onDropRejected: (rejections) => {
      const reasons = rejections.flatMap((r) => r.errors.map((e) => e.message));
      setError(reasons[0] ?? 'File rejected.');
    },
  });

  return (
    <div className="space-y-3">
      {/* Existing + preview thumbnails */}
      {(existingUrls.length > 0 || localPreviews.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {existingUrls.map((url) => (
            <div key={url} className="group relative h-20 w-20 overflow-hidden rounded-lg border border-gray-200">
              <img src={url} alt="Uploaded" className="h-full w-full object-cover" />
              {onRemoveExisting && (
                <button
                  type="button"
                  onClick={() => onRemoveExisting(url)}
                  className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/50"
                  aria-label="Remove image"
                >
                  <svg className="h-5 w-5 text-white opacity-0 transition group-hover:opacity-100" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                  </svg>
                </button>
              )}
            </div>
          ))}

          {localPreviews.map((p) => (
            <div key={p.preview} className="relative h-20 w-20 overflow-hidden rounded-lg border border-gray-200 opacity-60">
              <img src={p.preview} alt="Uploading…" className="h-full w-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone — hidden once limit reached */}
      {remaining > 0 && (
        <div
          {...getRootProps()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition
            ${isDragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-gray-100'
            }
            ${isUploading ? 'cursor-not-allowed opacity-50' : ''}
          `}
        >
          <input {...getInputProps()} />
          <svg className="mb-2 h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
          </svg>
          <p className="text-sm text-gray-600">
            {isDragActive ? 'Drop images here' : 'Drag & drop images here, or click to browse'}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            JPEG, PNG, or WebP · Up to {MAX_SIZE_MB}MB each · {remaining} remaining
          </p>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
