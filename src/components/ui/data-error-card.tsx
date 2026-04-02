'use client';

import { t } from '@/lib/i18n';
import { ERROR_REMEDIATIONS } from '@/lib/utils/error-remediation';

interface DataErrorCardProps {
  code?: string;
  reason?: string;
}

export function DataErrorCard({ code, reason }: DataErrorCardProps) {
  const remediation = code ? ERROR_REMEDIATIONS[code] : undefined;

  return (
    <div
      className="rounded-lg border border-[var(--accent-red)]/30 bg-[var(--bg-card)] px-5 py-4 flex flex-col gap-2"
      role="alert"
    >
      <div className="flex items-center gap-2">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            stroke="var(--accent-red)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="text-sm font-medium text-[var(--text-primary)]">
          {remediation ? t(remediation.messageKey) : (reason ?? t('ui.error.title'))}
        </span>
      </div>
      {code && (
        <p className="font-mono text-[0.6875rem] text-[var(--text-subtle)]">
          {t('ui.data.error.errorCode', { code })}
        </p>
      )}
      {remediation && (
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          {t(remediation.remediationKey)}
        </p>
      )}
      {!remediation && reason && (
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          {reason}
        </p>
      )}
    </div>
  );
}
