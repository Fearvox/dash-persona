import type { Post } from '../shared/types';
import { SELECTORS, METRIC_MAP } from '../shared/selectors';
import { parseDouyinDate, parseNumber } from '../shared/parse-date';

export function extractPosts(): Post[] {
  const cards = document.querySelectorAll(SELECTORS.videoCard);
  const posts: Post[] = [];

  for (const card of cards) {
    const desc = card.querySelector(SELECTORS.description)?.textContent?.trim() ?? '';
    const dateText = card.querySelector(SELECTORS.publishDate)?.textContent?.trim() ?? '';
    const publishedAt = parseDouyinDate(dateText);
    const status = card.querySelector(SELECTORS.status)?.textContent?.trim();

    // Only include published posts
    if (status && !status.includes('发布') && !status.includes('通过')) continue;

    // Extract metrics
    const metrics: Record<string, number> = { views: 0, likes: 0, comments: 0, shares: 0, saves: 0 };
    const metricItems = card.querySelectorAll(SELECTORS.metricItem);
    for (const item of metricItems) {
      const label = item.querySelector(SELECTORS.metricLabel)?.textContent?.trim() ?? '';
      const value = item.querySelector(SELECTORS.metricValue)?.textContent?.trim() ?? '0';
      const field = METRIC_MAP[label];
      if (field && field in metrics) {
        metrics[field] = parseNumber(value);
      }
    }

    // Extract tags
    const tagEls = card.querySelectorAll(SELECTORS.tagText);
    const tags = [...tagEls].map(t => t.textContent?.trim()).filter((t): t is string => Boolean(t));

    const postId = `dy-${Date.now()}-${posts.length}`;

    posts.push({
      postId,
      desc,
      publishedAt,
      views: metrics.views,
      likes: metrics.likes,
      comments: metrics.comments,
      shares: metrics.shares,
      saves: metrics.saves,
      tags: tags.length > 0 ? tags : undefined,
    });
  }

  return posts;
}
