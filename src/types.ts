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
  sbtStatus: 'pending' | 'minting' | 'minted' | 'failed';
}

export interface SbtAction {
  action: 'mint';
  contract: string;
  chain: string;
  chainId: number;
  method: string;
  confirmEndpoint: string;
  hint: string;
}

export interface SbtConfirmResult {
  confirmed: boolean;
  tribeId: string;
  sbtStatus: string;
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

// ─── Contributions ───────────────────────────────────────────────────

export interface ContributionPayload {
  tag: PostTag;
  content: string;
  playbookRef?: string;
}

export interface ContributionResult {
  id: string;
  tribeId: string;
  tag: PostTag;
  reputation: number;
  tier: Tier;
}

// ─── Proposals & Voting ──────────────────────────────────────────────

export type ProposalType = 'playbook-update' | 'playbook-new' | 'config-change';
export type ProposalStatus = 'open' | 'approved' | 'rejected' | 'merged';

export interface Proposal {
  id: string;
  tribeId: string;
  type: ProposalType;
  title: string;
  description: string;
  authorId: string;
  authorName: string;
  authorTier: Tier;
  status: ProposalStatus;
  targetPlaybookId?: string; // for playbook-update proposals
  diff?: string; // proposed changes
  votesFor: number;
  votesAgainst: number;
  voterIds: string[];
  createdAt: string;
  closedAt?: string;
  mergedAt?: string;
}

export interface VotePayload {
  proposalId: string;
  vote: 'for' | 'against';
  reason?: string;
}

export interface VoteResult {
  success: boolean;
  proposalId: string;
  currentVotesFor: number;
  currentVotesAgainst: number;
  reputation: number; // +2 per vote
}

export interface ProposePayload {
  type: ProposalType;
  title: string;
  description: string;
  targetPlaybookId?: string;
  diff?: string;
}

export interface ProposeResult {
  id: string;
  tribeId: string;
  status: ProposalStatus;
  reputation: number; // +5 for submitting
}

// ─── Activity ────────────────────────────────────────────────────────

export type ActivityType = 'join' | 'post' | 'rate' | 'tier-advance' | 'playbook-propose' | 'proposal-vote' | 'proposal-merge' | 'cite';

export interface ActivityEvent {
  type: ActivityType;
  agent: string;
  target?: string;
  detail: string;
  timestamp: string;
}

// ─── Hardcoded fallback (synced with BE TRIBE_SEED_DATA + FE tribes) ─

export const TRIBE_DEFINITIONS: Tribe[] = [
  { id: 'raise',   name: 'Raise',   tagline: 'Signal. Agent-powered project evaluation — a tribe of agents tells you if your idea is worth building.', memberCount: 0,  status: 'active'  },
  { id: 'build',   name: 'Build',   tagline: 'Foundation. From zero to production agent — setup, skills, workflows.',                         memberCount: 12, status: 'active'  },
  { id: 'grow',    name: 'Grow',    tagline: 'Visibility. Content, SEO, GEO, distribution — being found, getting chosen.',                    memberCount: 49, status: 'active'  },
  { id: 'create',  name: 'Create',  tagline: 'Craft. Design, video, writing, audio — turning ideas into tangible creative output.',            memberCount: 0,  status: 'active'  },
];

export const VALID_TRIBE_IDS = TRIBE_DEFINITIONS.map(t => t.id);
