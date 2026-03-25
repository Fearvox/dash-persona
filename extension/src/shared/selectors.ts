// Semantic prefix selectors — resist CSS module hash changes
// Source: docs/douyin-dom-selectors.md (researched 2026-03-24)

export const SELECTORS = {
  // Content management page
  videoCard: '[class*="video-card-"][class*="video-card-new"]',
  description: '[class*="info-title-text"]',
  publishDate: '[class*="info-time"]',
  status: '[class*="info-status"]',
  tagContainer: '[class*="tag-container"]',
  tagText: '[class*="semi-tag-content"]',
  metricItem: '[class*="metric-item-u"]',
  metricLabel: '[class*="metric-label"]',
  metricValue: '[class*="metric-value"]',

  // Export buttons (data center pages)
  exportButton: 'button',
  exportButtonText: '导出数据',

  // Profile page
  profileCard: '[class*="card-head"]',
} as const;

// Regex for profile text parsing
export const PROFILE_REGEX = /关注\s*([\d,]+)\s*粉丝\s*([\d,]+)\s*获赞\s*([\d,]+)/;
export const DOUYIN_ID_REGEX = /抖音号[：:]\s*(\S+)/;

// Douyin data center URLs
export const DATA_CENTER_URLS = {
  home: 'https://creator.douyin.com/creator-micro/home',
  contentManage: 'https://creator.douyin.com/creator-micro/content/manage',
  accountOverview: 'https://creator.douyin.com/creator-micro/data-center/operation',
  contentAnalysis: 'https://creator.douyin.com/creator-micro/data-center/content',
  fanPortrait: 'https://creator.douyin.com/creator-micro/data/stats/follower/portrait',
} as const;

// Metric label → Post field mapping
export const METRIC_MAP: Record<string, 'views' | 'likes' | 'comments' | 'shares' | 'saves'> = {
  '播放': 'views',
  '点赞': 'likes',
  '评论': 'comments',
  '分享': 'shares',
  '收藏': 'saves',
};

/**
 * Fallback selector: find element by text content when CSS selectors fail.
 */
export function findByText(root: Element | Document, text: string): Element | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    if (walker.currentNode.textContent?.includes(text)) {
      return walker.currentNode.parentElement;
    }
  }
  return null;
}
