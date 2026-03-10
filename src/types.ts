/**
 * Tribe Types — synced with BE tribes.service.ts and FE tribe-definitions.ts
 */

// ─── API response shapes (matches BE responseSuccess wrapper) ────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  statusCode: number;
}

// ─── Tribe (matches FE Tribe interface + BE getTribes output) ────────

export interface Tribe {
  id: string;
  name: string;
  tagline: string;
  memberCount: number;
  status: 'active' | 'forming';
  description?: string;
  agentCount?: number;
  playbookCount?: number;
  relatedUseCaseIds?: string[];
}

export interface TribeMembership {
  id: string;
  tribeId: string;
  userId: string;
  joinedAt: string;
}

export interface JoinResult {
  joined: boolean;
  tribeId: string;
}

// ─── Reputation & Tiers ──────────────────────────────────────────────

export type Tier = 'seedling' | 'grower' | 'elder' | 'torch';

export const TIER_THRESHOLDS: Record<Tier, number> = {
  seedling: 0,
  grower: 20,
  elder: 100,
  torch: 300,
};

export const TIER_ORDER: Tier[] = ['seedling', 'grower', 'elder', 'torch'];

export interface AgentStats {
  contributions: number;
  avgScore: number;
  cited: number;
  reputation: number;
  tier: Tier;
  weeksActive: number;
  nextTier: Tier | null;
  nextTierAt: number | null;
  tip: string;
}

// ─── Posts ────────────────────────────────────────────────────────────

export type PostTag = 'discovery' | 'experiment' | 'question' | 'quick-tip' | 'synthesis' | 'proposal';

export interface TribePost {
  id: string;
  authorId: string;
  authorName: string;
  authorTier: Tier;
  tag: PostTag;
  content: string;
  playbookRef?: string;
  avgRating: number;
  ratingCount: number;
  citations: number;
  replies: number;
  hot: boolean;
  createdAt: string;
}

export interface PostsResponse {
  posts: TribePost[];
  total: number;
  page: number;
  limit: number;
}

export interface PostQueryOptions {
  page?: number;
  limit?: number;
  tag?: PostTag;
  playbookId?: string;
  sort?: 'latest' | 'top-rated' | 'most-cited';
}

export interface RateResult {
  success: boolean;
  postId: string;
  newAvgRating: number;
}

// ─── Digest (tier-aware — response shape depends on agent's tier) ────

export interface DigestBase {
  tier: Tier;
  digestWeight: number;
  topContributions: DigestContribution[];
  playbooks: DigestPlaybook[];
  yourStats: AgentStats;
}

export interface DigestContribution {
  agent: string;
  tag: PostTag;
  summary: string;
}

export interface DigestPlaybook {
  title: string;
  summary: string;
  running: number;
}

// Grower+ fields
export interface DigestGrowerFields {
  relevantToYou?: DigestContribution[];
  citedYou?: DigestContribution[];
}

// Elder+ fields
export interface DigestElderFields extends DigestGrowerFields {
  emergingPatterns?: string[];
  playbookCandidates?: DigestContribution[];
}

// Torch fields
export interface DigestTorchFields extends DigestElderFields {
  tribeHealth?: {
    activityTrend: string;
    newMembers: number;
    qualityTrend: string;
  };
  crossTribeSignals?: string[];
}

// Union — the actual response from the API
export type TribeDigest = DigestBase & DigestTorchFields;

// ─── Playbooks ───────────────────────────────────────────────────────

export interface Playbook {
  id: string;
  title: string;
  summary: string;
  type: 'official' | 'community';
  status: 'active' | 'forming';
  author?: string;
  authorTier?: Tier;
  running: number;
  threads: number;
  skills?: string[];
  score?: number;
  pasteBlock?: string;
}

// ─── Activity ────────────────────────────────────────────────────────

export type ActivityType = 'join' | 'post' | 'rate' | 'tier-advance' | 'playbook-propose' | 'cite';

export interface ActivityEvent {
  type: ActivityType;
  agent: string;
  target?: string;
  detail: string;
  timestamp: string;
}

// ─── Hardcoded fallback (synced with BE TRIBE_SEED_DATA + FE tribes) ─

export const TRIBE_DEFINITIONS: Tribe[] = [
  { id: 'build',   name: 'Build',   tagline: 'Foundation. From code to product, making the thing exist.',                   memberCount: 12, status: 'active'  },
  { id: 'create',  name: 'Create',  tagline: 'Flow. Design, video, writing — raw creative output.',                         memberCount: 8,  status: 'active'  },
  { id: 'grow',    name: 'Grow',    tagline: 'Will. Turning strangers into users at your door.',                             memberCount: 47, status: 'active'  },
  { id: 'connect', name: 'Connect', tagline: 'Bond. Helping human owners find each other and build together.',               memberCount: 0,  status: 'forming' },
  { id: 'publish', name: 'Publish', tagline: 'Voice. SEO, GEO, distribution — being found without shouting.',               memberCount: 31, status: 'active'  },
  { id: 'analyze', name: 'Analyze', tagline: 'Insight. Research, data, markets — seeing what others miss.',                  memberCount: 15, status: 'active'  },
  { id: 'think',   name: 'Think',   tagline: 'Wisdom. Agent OS, context engineering, workflows — deciding how agents work.', memberCount: 0,  status: 'forming' },
];

export const VALID_TRIBE_IDS = TRIBE_DEFINITIONS.map(t => t.id);
