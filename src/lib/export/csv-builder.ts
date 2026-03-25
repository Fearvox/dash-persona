/**
 * CSV builder utilities for DashPersona data export.
 *
 * Generates CSV content compatible with Google Sheets and Excel,
 * including UTF-8 BOM for Chinese character support.
 *
 * @module export/csv-builder
 */

import type { Post } from '../schema/creator-data';
import type { PersonaScore } from '../engine/persona';
import type { CrossPlatformComparison } from '../engine/comparator';
import type { HistorySnapshot } from '../schema/creator-data';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Escape a CSV field: wrap in quotes if it contains comma, quote, or newline. */
function escapeField(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Join fields into a CSV row. */
function row(...fields: (string | number | undefined | null)[]): string {
  return fields.map(escapeField).join(',');
}

/** UTF-8 BOM for Excel compatibility with Chinese characters. */
export const UTF8_BOM = '\uFEFF';

// ---------------------------------------------------------------------------
// Persona Score CSV
// ---------------------------------------------------------------------------

/**
 * Build CSV rows for a PersonaScore breakdown.
 */
export function buildPersonaScoreCSV(score: PersonaScore): string {
  const lines: string[] = [];

  lines.push('--- Persona Score ---');
  lines.push(row('Metric', 'Value'));
  lines.push(row('Status', score.status));
  lines.push(row('Posts Analysed', score.postsAnalysed));
  lines.push(row('Engagement Rate', (score.engagement.overallRate * 100).toFixed(2) + '%'));
  lines.push(row('Median Engagement Rate', (score.engagement.medianRate * 100).toFixed(2) + '%'));
  lines.push(row('Best Category', score.engagement.bestCategory ?? 'N/A'));
  lines.push(row('Posts Per Week', score.rhythm.postsPerWeek.toFixed(1)));
  lines.push(row('Consistency Score', score.consistency.score.toFixed(2)));
  lines.push(row('Dominant Category', score.consistency.dominantCategory ?? 'N/A'));
  lines.push(row('Growth Momentum', score.growthHealth.momentum));

  // Content distribution
  lines.push('');
  lines.push('--- Content Distribution ---');
  lines.push(row('Category', 'Percentage'));
  for (const [cat, pct] of Object.entries(score.contentDistribution)) {
    lines.push(row(cat, pct.toFixed(1) + '%'));
  }

  // Tags
  if (score.tags.length > 0) {
    lines.push('');
    lines.push('--- Persona Tags ---');
    lines.push(row('Tag', 'Slug'));
    for (const tag of score.tags) {
      lines.push(row(tag.label, tag.slug));
    }
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Posts CSV
// ---------------------------------------------------------------------------

/**
 * Build CSV table for a list of posts.
 */
export function buildPostsCSV(posts: Post[]): string {
  const lines: string[] = [];

  lines.push('--- Posts ---');
  lines.push(row('Post ID', 'Description', 'Views', 'Likes', 'Comments', 'Shares', 'Saves', 'Published At', 'Content Type'));

  for (const post of posts) {
    lines.push(row(
      post.postId,
      post.desc,
      post.views,
      post.likes,
      post.comments,
      post.shares,
      post.saves,
      post.publishedAt ?? '',
      post.contentType ?? '',
    ));
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Comparison CSV
// ---------------------------------------------------------------------------

/**
 * Build CSV table for cross-platform comparison.
 */
export function buildComparisonCSV(comparison: CrossPlatformComparison): string {
  const lines: string[] = [];

  lines.push('--- Cross-Platform Comparison ---');
  lines.push(row('Platform', 'Followers', 'Total Views', 'Total Engagement', 'Engagement Rate', 'Post Count'));

  for (const s of comparison.summaries) {
    lines.push(row(
      s.platform,
      s.followers,
      s.totalViews,
      s.totalEngagement,
      (s.overallEngagementRate * 100).toFixed(2) + '%',
      s.postCount,
    ));
  }

  if (comparison.insights.length > 0) {
    lines.push('');
    lines.push('--- Insights ---');
    lines.push(row('Type', 'Insight'));
    for (const insight of comparison.insights) {
      lines.push(row(insight.type, insight.text));
    }
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Growth CSV
// ---------------------------------------------------------------------------

/**
 * Build CSV time-series for growth history snapshots.
 */
export function buildGrowthCSV(snapshots: HistorySnapshot[]): string {
  const lines: string[] = [];

  lines.push('--- Growth History ---');
  lines.push(row('Date', 'Followers', 'Likes Total', 'Videos Count'));

  const sorted = [...snapshots].sort(
    (a, b) => new Date(a.fetchedAt).getTime() - new Date(b.fetchedAt).getTime(),
  );

  for (const s of sorted) {
    lines.push(row(
      s.fetchedAt,
      s.profile.followers,
      s.profile.likesTotal,
      s.profile.videosCount,
    ));
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Combined CSV
// ---------------------------------------------------------------------------

/**
 * Combine multiple CSV sections into a single file content string.
 * Each section is separated by two blank lines.
 */
export function combineSections(...sections: string[]): string {
  return UTF8_BOM + sections.filter(Boolean).join('\n\n\n');
}
