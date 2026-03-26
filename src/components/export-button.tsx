'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { exportToPNG, exportToPDF, exportToCSV, buildPostsCSV, buildPersonaScoreCSV, combineSections } from '@/lib/export';
import { t } from '@/lib/i18n';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ExportFormat = 'png' | 'pdf' | 'csv';

interface ExportButtonProps {
  /** CSS selector or ref-id for the dashboard content area to capture. */
  contentSelector?: string;
  /** Callback to get CSV content — called when user selects CSV export. */
  onCSVExport?: () => string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ExportButton({
  contentSelector = '#dashboard-content',
  onCSVExport,
}: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      setIsOpen(false);
      setIsExporting(true);

      try {
        if (format === 'png') {
          const el = document.querySelector(contentSelector) as HTMLElement | null;
          if (!el) {
            console.error('Export target not found:', contentSelector);
            return;
          }
          await exportToPNG(el);
        } else if (format === 'pdf') {
          exportToPDF();
        } else if (format === 'csv') {
          const csvContent = onCSVExport?.() ?? '';
          if (csvContent) {
            exportToCSV(csvContent);
          } else {
            console.error('No CSV content available');
          }
        }
      } catch (err) {
        console.error('Export failed:', err);
      } finally {
        setIsExporting(false);
      }
    },
    [contentSelector, onCSVExport],
  );

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        disabled={isExporting}
        className="nav-pill flex items-center gap-1.5"
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="Export report"
      >
        {isExporting ? (
          <>
            <span
              className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"
            />
            <span>{t('ui.components.exporting')}</span>
          </>
        ) : (
          <>
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M8 2v8M5 7l3 3 3-3M3 12h10"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>{t('ui.components.export')}</span>
          </>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full z-50 mt-1.5 w-40 overflow-hidden rounded-lg bg-[var(--bg-card)] border border-[var(--border-medium)] shadow-[0_4px_16px_rgba(0,0,0,0.4)]"
          role="menu"
        >
          <button
            type="button"
            onClick={() => handleExport('png')}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-secondary)]"
            role="menuitem"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <rect
                x="2"
                y="2"
                width="12"
                height="12"
                rx="1.5"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <circle cx="5.5" cy="5.5" r="1" fill="currentColor" />
              <path
                d="M2 11l3.5-3.5 2.5 2 3-4L14 11"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
            {t('ui.components.exportPng')}
          </button>
          <button
            type="button"
            onClick={() => handleExport('pdf')}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-[var(--text-primary)] border-t border-t-[var(--border-subtle)] transition-colors hover:bg-[var(--bg-secondary)]"
            role="menuitem"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M4 1.5h5.5L13 5v9.5a1 1 0 01-1 1H4a1 1 0 01-1-1v-13a1 1 0 011-1z"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path d="M9 1.5V5h3.5" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M5.5 9h5M5.5 11.5h3.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            {t('ui.components.exportPdf')}
          </button>
          <button
            type="button"
            onClick={() => handleExport('csv')}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-[var(--text-primary)] border-t border-t-[var(--border-subtle)] transition-colors hover:bg-[var(--bg-secondary)]"
            role="menuitem"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M3 2.5h10a.5.5 0 01.5.5v10a.5.5 0 01-.5.5H3a.5.5 0 01-.5-.5V3a.5.5 0 01.5-.5z"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M2.5 6h11M2.5 10h11M6 2.5v11M10 2.5v11"
                stroke="currentColor"
                strokeWidth="1"
                strokeOpacity="0.4"
              />
            </svg>
            {t('ui.components.exportCsv')}
          </button>
        </div>
      )}
    </div>
  );
}
