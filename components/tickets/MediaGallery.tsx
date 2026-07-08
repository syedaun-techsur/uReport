'use client';
import { FileIcon } from 'lucide-react';
import type { MediaRecord } from '@/types/domain';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface MediaGalleryProps {
  media: MediaRecord[];
  ticketId: string;
}

export function MediaGallery({ media, ticketId: _ticketId }: MediaGalleryProps) {
  return (
    <div>
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

      {/* Placeholder button for plan 05-04 (upload functionality) */}
      <button
        data-testid="add-media-btn"
        type="button"
        className="mt-3 hidden rounded border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-400 hover:border-blue-400 hover:text-blue-500"
        disabled
        aria-hidden="true"
      >
        + Add media
      </button>
    </div>
  );
}
