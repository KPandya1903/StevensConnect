import { useRef } from 'react';

interface VideoUploaderProps {
  existingUrl?: string | null;
  onAdd: (file: File) => Promise<void>;
  onRemove: () => Promise<void>;
  isUploading?: boolean;
}

export function VideoUploader({ existingUrl, onAdd, onRemove, isUploading = false }: VideoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await onAdd(file);
    // Reset so the same file can be re-selected
    e.target.value = '';
  }

  if (existingUrl) {
    return (
      <div className="space-y-3">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-black">
          <video src={existingUrl} controls className="w-full" style={{ maxHeight: '320px' }} />
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-sm text-red-600 hover:text-red-800"
        >
          Remove video
        </button>
      </div>
    );
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm"
        className="hidden"
        onChange={handleChange}
      />
      <button
        type="button"
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 px-6 py-8 text-sm text-gray-500 transition hover:border-blue-400 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isUploading ? (
          <>
            <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Uploading…
          </>
        ) : (
          <>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M15.75 10.5 20.47 6m-4.72 4.5-4.72-4.5M12 6v9m-9 3h18M3 6l9-9 9 9" />
            </svg>
            Upload walkthrough video (MP4, MOV, WebM — max 200 MB)
          </>
        )}
      </button>
    </div>
  );
}
