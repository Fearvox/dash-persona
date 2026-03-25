import type { AccountDiagnostics } from '../shared/types';
import { parseNumber } from '../shared/parse-date';

export function extractAccountOverview(): AccountDiagnostics | null {
  const body = document.body.textContent ?? '';

  const extract = (keyword: string): { value: number; percentile: number } => {
    // Pattern: "投稿数为4，高于76.29%的同类创作者"
    const regex = new RegExp(`${keyword}[为是]([\\d,.]+)[^]*?([\\d.]+)%的同类创作者`);
    const match = body.match(regex);
    if (!match) return { value: 0, percentile: 0 };
    return { value: parseNumber(match[1]), percentile: parseFloat(match[2]) };
  };

  const postActivity = extract('投稿数');
  const videoPlays = extract('视频播放量');
  const completionRate = extract('完播率');
  const interactionIndex = extract('互动指数');
  const followerGrowth = extract('新增粉丝数');

  // If nothing matched, page probably didn't load or session expired
  if (postActivity.percentile === 0 && videoPlays.percentile === 0) return null;

  return { postActivity, videoPlays, completionRate, interactionIndex, followerGrowth };
}
