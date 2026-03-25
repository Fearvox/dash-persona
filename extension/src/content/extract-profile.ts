import type { ProfileInfo } from '../shared/types';
import { PROFILE_REGEX, DOUYIN_ID_REGEX, SELECTORS } from '../shared/selectors';
import { parseNumber } from '../shared/parse-date';

export function extractProfile(): ProfileInfo | null {
  // Profile data is in a concatenated text node on the homepage
  const profileCard = document.querySelector(SELECTORS.profileCard);
  const textSource = profileCard?.textContent ?? document.body.textContent ?? '';

  const profileMatch = textSource.match(PROFILE_REGEX);
  if (!profileMatch) return null;

  const idMatch = textSource.match(DOUYIN_ID_REGEX);
  // Extract nickname: text before "抖音号"
  const nickMatch = textSource.match(/^([^\s]+)\s*抖音号/);

  const followers = parseNumber(profileMatch[2]);
  const likesTotal = parseNumber(profileMatch[3]);

  return {
    nickname: nickMatch?.[1] ?? 'Unknown',
    uniqueId: idMatch?.[1] ?? '',
    followers,
    likesTotal,
    videosCount: 0, // Inferred from post count later
  };
}
