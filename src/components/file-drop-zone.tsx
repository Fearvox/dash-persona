'use client';

import { useCallback, useRef, useState } from 'react';
import { t } from '@/lib/i18n';

const ACCEPTED_EXTENSIONS = ['.json', '.csv', '.xlsx', '.xls'];
const ACCEPT_STRING = ACCEPTED_EXTENSIONS.join(',');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export interface FileParseResult {
  fileName: string;
  status: 'success' | 'error';
  profileCount?: number;
  error?: string;
}

interface FileDropZoneProps {
  onFilesSelected: (files: File[]) => void;
  results: FileParseResult[];
  isProcessing: boolean;
}

export default function FileDropZone({ onFilesSelected, results, isProcessing }: FileDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;

      const validFiles: File[] = [];
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
        if (!ACCEPTED_EXTENSIONS.includes(ext)) continue;
        if (file.size > MAX_FILE_SIZE) continue;
        validFiles.push(file);
      }

      if (validFiles.length > 0) {
        onFilesSelected(validFiles);
      }
    },
    [onFilesSelected],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Drop zone */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        disabled={isProcessing}
        className={`flex min-h-[160px] flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-6 transition-colors ${
          isDragOver
            ? 'border-[var(--accent-green)] bg-[rgba(126,210,154,0.04)]'
            : 'border-[var(--border-medium)] bg-transparent'
        } ${isProcessing ? 'cursor-wait' : 'cursor-pointer'}`}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-all duration-300 ${isDragOver ? 'scale-110 -translate-y-1 text-[var(--accent-green)]' : 'text-[var(--text-subtle)]'}`}
          aria-hidden="true"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <div className="text-center">
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {isDragOver ? t('ui.components.dropFilesHere') : t('ui.components.dragOrBrowse')}
          </p>
          <p className="mt-1 text-xs text-[var(--text-subtle)]">
            {t('ui.components.fileFormats')}
          </p>
        </div>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_STRING}
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Results list */}
      {results.length > 0 && (
        <div className="flex flex-col gap-2">
          {results.map((r, i) => (
            <div
              key={`${r.fileName}-${i}`}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs animate-stagger ${
                r.status === 'success'
                  ? 'bg-[rgba(126,210,154,0.08)] text-[var(--accent-green)]'
                  : 'bg-[rgba(200,126,126,0.08)] text-[var(--accent-red)]'
              }`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <span className="font-mono">{r.fileName}</span>
              <span className="ml-auto">
                {r.status === 'success'
                  ? `${r.profileCount} ${r.error ?? 'item'}${(r.profileCount ?? 0) > 1 ? 's' : ''}`
                  : r.error}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
