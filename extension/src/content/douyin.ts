import type { ExtMessage } from '../shared/types';
import { extractProfile } from './extract-profile';
import { extractPosts } from './extract-posts';
import { extractAccountOverview } from './extract-overview';
import { extractFanPortrait } from './extract-fans';
import { clickExportButtons, switchToPostListTab, switchToPostsTab, extractPostAnalysisSummary } from './extract-analysis';

/**
 * Dismiss any Douyin modal popups (e.g., "新增共创中心" notice).
 * Looks for buttons with "我知道了" or "关闭" text inside dialogs.
 */
function dismissPopups(): void {
  const buttons = [...document.querySelectorAll('button')];
  for (const btn of buttons) {
    const text = btn.textContent?.trim() ?? '';
    if (text === '我知道了' || text === '关闭' || text === '知道了') {
      btn.click();
    }
  }
  // Also try closing via dialog role
  const dialogs = document.querySelectorAll('[role="dialog"]');
  for (const dialog of dialogs) {
    const closeBtn = dialog.querySelector('button');
    if (closeBtn) closeBtn.click();
  }
}

chrome.runtime.onMessage.addListener(
  (message: ExtMessage, _sender, sendResponse) => {
    switch (message.type) {
      case 'DISMISS_POPUPS': {
        dismissPopups();
        sendResponse({ type: 'EXTRACTION_RESULT', step: 'dismiss', data: { ok: true } });
        break;
      }
      case 'EXTRACT_PROFILE': {
        const profile = extractProfile();
        const posts = extractPosts();
        sendResponse({ type: 'EXTRACTION_RESULT', step: 'profile', data: { profile, posts } });
        break;
      }
      case 'EXTRACT_OVERVIEW': {
        dismissPopups();
        const diagnostics = extractAccountOverview();
        // Trigger CSV export in background (auto-confirms dialog)
        clickExportButtons();
        sendResponse({ type: 'EXTRACTION_RESULT', step: 'overview', data: diagnostics });
        break;
      }
      case 'EXTRACT_POST_LIST': {
        dismissPopups();
        // Step 1: Ensure we're on "投稿作品" tab (not "直播场次")
        switchToPostsTab();
        // Step 2: Wait for tab content to render
        setTimeout(() => {
          dismissPopups();
          // Step 3: Extract summary metrics from DOM (primary data source)
          const summary = extractPostAnalysisSummary();
          // Step 4: Trigger CSV export in background (auto-confirms dialog)
          clickExportButtons();
          // Step 5: Switch to 投稿列表 sub-view
          setTimeout(() => {
            switchToPostListTab();
            // Step 6: Wait for sub-view, trigger its export too
            setTimeout(() => {
              clickExportButtons();
              sendResponse({
                type: 'EXTRACTION_RESULT',
                step: 'post_list',
                data: { summary, exported: true },
              });
            }, 4000);
          }, 3000);
        }, 4000);
        break;
      }
      case 'EXTRACT_FANS': {
        dismissPopups();
        const fans = extractFanPortrait();
        sendResponse({ type: 'EXTRACTION_RESULT', step: 'fans', data: fans });
        break;
      }
    }
    return true; // async response
  },
);
