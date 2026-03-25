import { SELECTORS } from '../shared/selectors';

/**
 * Click the "投稿作品" tab on the content analysis page.
 * The page may default to "直播场次" — we must ensure we're on the right tab.
 */
export function switchToPostsTab(): boolean {
  // Find tab elements — Douyin uses [role="tab"] or styled spans
  const tabs = document.querySelectorAll('[role="tab"]');
  for (const tab of tabs) {
    if (tab.textContent?.includes('投稿作品')) {
      (tab as HTMLElement).click();
      return true;
    }
  }
  // Fallback: find any clickable element with "投稿作品"
  const allEls = document.querySelectorAll('span, div, a, button');
  for (const el of allEls) {
    if (el.textContent?.trim() === '投稿作品' && el.clientHeight > 0) {
      (el as HTMLElement).click();
      return true;
    }
  }
  return false;
}

/** Find and click all "导出数据" buttons on the page. Returns count clicked. */
export function clickExportButtons(): number {
  const buttons = [...document.querySelectorAll('button')]
    .filter(b => b.textContent?.includes(SELECTORS.exportButtonText));
  let clicked = 0;
  for (const btn of buttons) {
    if (!btn.disabled) {
      btn.click();
      clicked++;
    }
  }
  // After clicking, look for confirmation dialog and auto-confirm
  setTimeout(() => {
    confirmExportDialog();
  }, 1500);
  return clicked;
}

/**
 * Auto-confirm the export dialog that appears after clicking "导出数据".
 * Douyin shows a date range picker + "确认" / "导出" button.
 */
function confirmExportDialog(): void {
  // Look for modal/dialog with confirm button
  const dialogs = document.querySelectorAll('[role="dialog"], [class*="modal"], [class*="dialog"]');
  for (const dialog of dialogs) {
    const confirmBtns = dialog.querySelectorAll('button');
    for (const btn of confirmBtns) {
      const text = btn.textContent?.trim() ?? '';
      if (text === '确认' || text === '导出' || text === '确定' || text === '确认导出') {
        btn.click();
        return;
      }
    }
  }
  // Fallback: find any visible confirm-style button
  const allButtons = [...document.querySelectorAll('button')];
  for (const btn of allButtons) {
    const text = btn.textContent?.trim() ?? '';
    if ((text === '确认' || text === '确定') && btn.offsetHeight > 0) {
      btn.click();
      return;
    }
  }
}

/**
 * Extract 投稿概览 summary metrics directly from DOM text.
 * These are the aggregate stats visible on the 投稿分析 page.
 */
export function extractPostAnalysisSummary(): Record<string, string> {
  const metrics: Record<string, string> = {};
  const body = document.body.textContent ?? '';

  const patterns: Array<[string, RegExp]> = [
    ['投稿量', /周期内投稿量[^\d]*([\d,]+)/],
    ['条均点击率', /条均点击率[^\d]*([\d.]+%)/],
    ['条均5s完播率', /条均5s完播率[^\d]*([\d.]+%)/],
    ['条均2s跳出率', /条均2s跳出率[^\d]*([\d.]+%)/],
    ['条均播放时长', /条均播放时长[^\d]*([\d.]+秒)/],
    ['播放量中位数', /播放量中位数[^\d]*([\d,.]+)/],
    ['条均点赞数', /条均点赞数[^\d]*([\d,]+)/],
    ['条均评论量', /条均评论量[^\d]*([\d,]+)/],
    ['条均分享量', /条均分享量[^\d]*([\d,]+)/],
  ];

  for (const [key, regex] of patterns) {
    const match = body.match(regex);
    if (match) metrics[key] = match[1];
  }

  return metrics;
}

/**
 * Switch from "投稿分析" to "投稿列表" on the content analysis page.
 *
 * The page uses radio buttons: "投稿分析" (checked by default) and "投稿列表".
 * We need to click the "投稿列表" radio to reveal the post table + its export button.
 */
export function switchToPostListTab(): boolean {
  // Strategy 1: Find radio input with "投稿列表" label
  const radios = document.querySelectorAll('input[type="radio"]');
  for (const radio of radios) {
    const parent = radio.closest('label') ?? radio.parentElement;
    if (parent?.textContent?.includes('投稿列表')) {
      (radio as HTMLInputElement).click();
      return true;
    }
  }

  // Strategy 2: Find by aria role
  const radioButtons = document.querySelectorAll('[role="radio"]');
  for (const rb of radioButtons) {
    if (rb.textContent?.includes('投稿列表')) {
      (rb as HTMLElement).click();
      return true;
    }
  }

  // Strategy 3: Text-based fallback — find any clickable element with "投稿列表"
  const allElements = document.querySelectorAll('span, div, label, button');
  for (const el of allElements) {
    if (el.textContent?.trim() === '投稿列表' && el.clientHeight > 0) {
      (el as HTMLElement).click();
      return true;
    }
  }

  return false;
}
