/**
 * Error code -> i18n key mapping for data-layer errors.
 * Keys are i18n message keys resolved with t() at render time.
 * NEVER call t() in this file -- it's a constant map.
 * @module utils/error-remediation
 */

export interface ErrorRemediation {
  messageKey: string;
  remediationKey: string;
}

export const ERROR_REMEDIATIONS: Record<string, ErrorRemediation> = {
  READ_PERMISSION_DENIED: {
    messageKey: 'ui.data.error.readPermissionDenied',
    remediationKey: 'ui.data.error.readPermissionDeniedFix',
  },
  READ_DIR_ERROR: {
    messageKey: 'ui.data.error.readDirError',
    remediationKey: 'ui.data.error.readDirErrorFix',
  },
  PARSE_ERROR: {
    messageKey: 'ui.data.error.parseError',
    remediationKey: 'ui.data.error.parseErrorFix',
  },
  COLLECTOR_UNREACHABLE: {
    messageKey: 'ui.data.error.collectorUnreachable',
    remediationKey: 'ui.data.error.collectorUnreachableFix',
  },
  FETCH_ERROR: {
    messageKey: 'ui.data.error.fetchError',
    remediationKey: 'ui.data.error.fetchErrorFix',
  },
};
