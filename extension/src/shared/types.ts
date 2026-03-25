// Mirrors DashPersona's CreatorProfile schema
export interface Post {
  postId: string;
  desc: string;
  publishedAt?: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  /** 5s completion rate (0-1) — Douyin's primary ranking signal */
  completionRate?: number;
  /** 2s bounce rate (0-1) — inverse quality signal */
  bounceRate?: number;
  /** Average watch duration in seconds */
  avgWatchDuration?: number;
  tags?: string[];
  contentType?: string;
}

export interface ProfileInfo {
  nickname: string;
  uniqueId: string;
  avatarUrl?: string;
  followers: number;
  likesTotal: number;
  videosCount: number;
  bio?: string;
}

export interface CreatorProfile {
  platform: string;
  profileUrl: string;
  fetchedAt: string;
  source: 'extension';
  profile: ProfileInfo;
  posts: Post[];
  history?: Array<{
    fetchedAt: string;
    profile: { followers: number; likesTotal: number; videosCount: number };
  }>;
  fanPortrait?: FanPortrait;
}

// Fan portrait data (not in core schema — extension-specific enrichment)
export interface FanPortrait {
  gender: { male: number; female: number };
  ageGroups: Array<{ range: string; percentage: number }>;
  topProvinces: Array<{ province: string; percentage: number }>;
  devices: Array<{ device: string; percentage: number }>;
  interests: Array<{ interest: string; percentage: number }>;
  activityLevels: Array<{ level: string; percentage: number }>;
}

// Account diagnostics (账号诊断 — percentile data)
export interface AccountDiagnostics {
  postActivity: { value: number; percentile: number };
  videoPlays: { value: number; percentile: number };
  completionRate: { value: number; percentile: number };
  interactionIndex: { value: number; percentile: number };
  followerGrowth: { value: number; percentile: number };
}

// Collection state machine
export type CollectionStep =
  | 'idle'
  | 'collecting_profile'
  | 'collecting_overview'
  | 'collecting_posts'
  | 'collecting_post_list'
  | 'collecting_fans'
  | 'merging'
  | 'sending'
  | 'done'
  | 'error';

export interface CollectionState {
  step: CollectionStep;
  currentStepIndex: number;
  totalSteps: number;
  stepLabel: string;
  profile: Partial<CreatorProfile> | null;
  fanPortrait: FanPortrait | null;
  diagnostics: AccountDiagnostics | null;
  error: string | null;
  lastCollectedAt: string | null;
}

// Message types between content script ↔ service worker ↔ popup
export type ExtMessage =
  | { type: 'GET_STATE' }
  | { type: 'STATE_UPDATE'; state: CollectionState }
  | { type: 'START_COLLECTION' }
  | { type: 'DISMISS_POPUPS' }
  | { type: 'EXTRACT_PROFILE'; tabId: number }
  | { type: 'EXTRACT_POSTS'; tabId: number }
  | { type: 'EXTRACT_OVERVIEW'; tabId: number }
  | { type: 'EXTRACT_POST_LIST'; tabId: number }
  | { type: 'EXTRACT_FANS'; tabId: number }
  | { type: 'EXTRACTION_RESULT'; step: string; data: unknown; error?: string }
  | { type: 'CLICK_EXPORT'; tabId: number }
  | { type: 'IMPORT_FILE_DATA'; posts: Post[]; fileName: string }
  | { type: 'TRANSFER_TO_DASHPERSONA'; profile: CreatorProfile };
