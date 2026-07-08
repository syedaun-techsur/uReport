'use client';
import { useRef, useState } from 'react';
import { FileIcon, UploadCloudIcon, Loader2Icon } from 'lucide-react';
import type { MediaRecord } from '@/types/domain';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface MediaGalleryProps {
  media: MediaRecord[];
  ticketId: string;
  onUploadSuccess?: () => void;
}

export function MediaGallery({ media, ticketId, onUploadSuccess }: MediaGalleryProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadError(null);

    const formData = new FormData();
    for (const file of Array.from(files)) {
      formData.append('files', file);
    }

    try {
      const res = await fetch(`/api/staff/tickets/${ticketId}/media`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message = (data as { error?: { message?: string; code?: string } })?.error?.message;
        const code = (data as { error?: { code?: string } })?.error?.code;

        if (code === 'MEDIA_TOO_LARGE') {
          setUploadError('One or more files exceed the 10MB limit.');
        } else if (code === 'MEDIA_TYPE_INVALID') {
          setUploadError('Only images and PDF files are accepted.');
        } else if (code === 'MEDIA_TOO_MANY') {
          setUploadError('Maximum 5 files per upload.');
        } else {
          setUploadError(message ?? 'Upload failed. Please try again.');
        }
        return;
      }

      // Reset input and trigger parent refetch
      if (fileInputRef.current) fileInputRef.current.value = '';
      onUploadSuccess?.();
    } catch {
      setUploadError('Network error. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      {/* Media grid */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {media.map((m) => {
          const url = `/api/media/${m.id}`;
          const isImage = m.mime_type.startsWith('image/');

          if (isImage) {
            return (
              <a
                key={m.id}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative block overflow-hidden rounded border border-gray-200 hover:border-blue-400"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={m.filename}
                  className="h-24 w-24 object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="truncate text-[10px] text-white">{m.filename}</p>
                  <p className="text-[10px] text-white/70">{formatFileSize(m.size_bytes)}</p>
                </div>
              </a>
            );
          }

          return (
            <a
              key={m.id}
              href={url}
              download={m.filename}
              className="flex flex-col items-center gap-1 rounded border border-gray-200 p-2 text-center hover:border-blue-400 hover:bg-blue-50"
            >
              <FileIcon className="h-8 w-8 text-gray-400" />
              <span className="line-clamp-2 text-[10px] text-gray-600">{m.filename}</span>
              <span className="text-[10px] text-gray-400">{formatFileSize(m.size_bytes)}</span>
            </a>
          );
        })}

        {media.length === 0 && (
          <p className="col-span-full text-sm text-gray-500 py-2">No media attachments.</p>
        )}
      </div>

      {/* Upload area */}
      <div className="mt-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          multiple
          data-testid="media-upload-input"
          className="sr-only"
          id={`media-upload-${ticketId}`}
          onChange={handleFileChange}
          disabled={uploading}
        />
        <label
          htmlFor={`media-upload-${ticketId}`}
          className={`flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500 transition-colors hover:border-blue-400 hover:text-blue-600 ${
            uploading ? 'cursor-not-allowed opacity-50' : ''
          }`}
        >
          {uploading ? (
            <>
              <Loader2Icon className="h-4 w-4 animate-spin" />
              <span>Uploading…</span>
            </>
          ) : (
            <>
              <UploadCloudIcon className="h-4 w-4" />
              <span>Add media (images or PDF, max 10MB each, up to 5 files)</span>
            </>
          )}
        </label>

        {/* Upload error */}
        {uploadError && (
          <p
            data-testid="upload-error"
            className="mt-1 text-xs text-red-600"
            role="alert"
          >
            {uploadError}
          </p>
        )}
      </div>
    </div>
  );
}
