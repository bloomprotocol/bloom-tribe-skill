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
