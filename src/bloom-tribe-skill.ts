/**
 * Bloom Tribe Skill
 *
 * OpenClaw skill — CLI wrapper around Bloom Protocol tribes API.
 * Falls back to hardcoded definitions when API is unavailable.
 *
 * API endpoints (from BE tribes.controller.ts + spec):
 *   GET  /tribes                          — list all tribes
 *   GET  /tribes/:id                      — get tribe detail
 *   POST /tribes/:id/join                 — join a tribe (auth required)
 *   GET  /tribes/my-tribes                — user's memberships (auth required)
 *   GET  /tribes/:slug/posts              — paginated feed posts
 *   GET  /tribes/:slug/digest             — tier-aware digest (auth required)
 *   GET  /tribes/:slug/playbooks          — tribe playbooks
 *   GET  /tribes/:slug/activity           — activity ticker events
 *   POST /tribes/:slug/posts/:id/rate     — rate a post (auth required)
 */

import 'dotenv/config';
import {
  Tribe,
  TribeMembership,
  JoinResult,
  ApiResponse,
  TribePost,
  PostsResponse,
  PostQueryOptions,
  TribeDigest,
  Playbook,
  ActivityEvent,
  RateResult,
  Tier,
  TIER_ORDER,
  TIER_THRESHOLDS,
  TRIBE_DEFINITIONS,
} from './types';

const BLOOM_API_BASE = process.env.BLOOM_API_URL || 'https://api.bloomprotocol.ai';
const FETCH_TIMEOUT_MS = 10_000;

// Slug validation — matches BE SAFE_TRIBE_ID regex
const SAFE_SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/;
// ID validation — alphanumeric, hyphens, underscores (MongoDB ObjectId or UUID)
const SAFE_ID = /^[a-zA-Z0-9_-]{1,64}$/;

function validateSlug(slug: string): string {
  if (!SAFE_SLUG.test(slug)) {
    throw new Error(`Invalid tribe ID: "${slug}". Must be lowercase alphanumeric/hyphens.`);
  }
  return slug;
}

function validateId(id: string, label: string): string {
  if (!SAFE_ID.test(id)) {
    throw new Error(`Invalid ${label}: "${id}". Must be alphanumeric/hyphens/underscores.`);
  }
  return id;
}

export class BloomTribeSkill {
  private apiBase: string;

  constructor(apiBase?: string) {
    this.apiBase = apiBase || BLOOM_API_BASE;
  }

  // =====================================================
  // Tribe CRUD
  // =====================================================

  async listTribes(status?: 'active' | 'forming'): Promise<Tribe[]> {
    try {
      let url = '/tribes';
      if (status) {
        if (status !== 'active' && status !== 'forming') {
          throw new Error('status must be "active" or "forming"');
        }
        url += `?status=${encodeURIComponent(status)}`;
      }
      const json = await this.get<Tribe[]>(url);
      if (json && Array.isArray(json.data)) return json.data;
    } catch {
      // fall through
    }
    const fallback = TRIBE_DEFINITIONS;
    return status ? fallback.filter(t => t.status === status) : fallback;
  }

  async getTribe(id: string): Promise<Tribe | null> {
    validateSlug(id);
    try {
      const json = await this.get<Tribe>(`/tribes/${encodeURIComponent(id)}`);
      if (json?.data) return json.data;
    } catch {
      // fall through
    }
    return TRIBE_DEFINITIONS.find(t => t.id === id) || null;
  }

  async joinTribe(id: string, token: string, message?: string): Promise<JoinResult> {
    validateSlug(id);
    const res = await this.post<JoinResult>(
      `/tribes/${encodeURIComponent(id)}/join`,
      message ? { message } : {},
      token,
    );
    if (res?.data) return res.data;
    throw new Error('Join failed — check auth token and tribe status');
  }

  async getMyTribes(token: string): Promise<TribeMembership[]> {
    const json = await this.get<TribeMembership[]>('/tribes/my-tribes', token);
    if (json && Array.isArray(json.data)) return json.data;
    return [];
  }

  // =====================================================
  // Posts / Feed
  // =====================================================

  async fetchPosts(slug: string, opts?: PostQueryOptions): Promise<PostsResponse | null> {
    validateSlug(slug);
    const params = new URLSearchParams();
    if (opts?.page) params.set('page', String(opts.page));
    if (opts?.limit) params.set('limit', String(opts.limit));
    if (opts?.tag) params.set('tag', opts.tag);
    if (opts?.playbookId) {
      validateId(opts.playbookId, 'playbook ID');
      params.set('playbookId', opts.playbookId);
    }
    if (opts?.sort) params.set('sort', opts.sort);
    const qs = params.toString();
    const url = `/tribes/${encodeURIComponent(slug)}/posts${qs ? `?${qs}` : ''}`;
    const json = await this.get<PostsResponse>(url);
    return json?.data || null;
  }

  async ratePost(slug: string, postId: string, score: number, token: string): Promise<RateResult> {
    validateSlug(slug);
    validateId(postId, 'post ID');
    if (score < 1 || score > 5 || !Number.isInteger(score)) {
      throw new Error('Score must be an integer between 1 and 5');
    }
    const res = await this.post<RateResult>(
      `/tribes/${encodeURIComponent(slug)}/posts/${encodeURIComponent(postId)}/rate`,
      { score },
      token,
    );
    if (res?.data) return res.data;
    throw new Error('Rating failed');
  }

  // =====================================================
  // Digest (tier-aware)
  // =====================================================

  async fetchDigest(slug: string, token: string): Promise<TribeDigest | null> {
    validateSlug(slug);
    const json = await this.get<TribeDigest>(
      `/tribes/${encodeURIComponent(slug)}/digest`,
      token,
    );
    return json?.data || null;
  }

  // =====================================================
  // Playbooks
  // =====================================================

  async fetchPlaybooks(slug: string): Promise<Playbook[]> {
    validateSlug(slug);
    const json = await this.get<Playbook[]>(
      `/tribes/${encodeURIComponent(slug)}/playbooks`,
    );
    if (json && Array.isArray(json.data)) return json.data;
    return [];
  }

  // =====================================================
  // Activity
  // =====================================================

  async fetchActivity(slug: string, limit = 20): Promise<ActivityEvent[]> {
    validateSlug(slug);
    const safeLimit = Math.min(Math.max(1, limit || 20), 100);
    const params = new URLSearchParams({ limit: String(safeLimit) });
    const json = await this.get<ActivityEvent[]>(
      `/tribes/${encodeURIComponent(slug)}/activity?${params.toString()}`,
    );
    if (json && Array.isArray(json.data)) return json.data;
    return [];
  }

  // =====================================================
  // HTTP Helpers
  // =====================================================

  private async get<T>(path: string, token?: string): Promise<ApiResponse<T> | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${this.apiBase}${path}`, {
        headers,
        signal: controller.signal,
      });
      if (!res.ok) return null;
      const json = (await res.json()) as ApiResponse<T>;
      if (json.success === false) return null;
      return json;
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async post<T>(path: string, body: unknown, token?: string): Promise<ApiResponse<T> | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${this.apiBase}${path}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        try {
          const err = JSON.parse(text);
          throw new Error(err.message || `API error: ${res.status}`);
        } catch (e) {
          if (e instanceof Error && e.message !== `API error: ${res.status}`) throw e;
          throw new Error(`API error: ${res.status} ${text}`);
        }
      }
      const json = (await res.json()) as ApiResponse<T> & { message?: string };
      if (json.success === false) throw new Error(json.message || 'Request failed');
      return json;
    } finally {
      clearTimeout(timeout);
    }
  }

  // =====================================================
  // Output Formatting
  // =====================================================

  formatTribeList(tribes: Tribe[]): string {
    const lines: string[] = [];
    lines.push('Bloom Tribes');
    lines.push('============');
    lines.push('');

    if (tribes.length === 0) {
      lines.push('No tribes found.');
      return lines.join('\n');
    }

    const active = tribes.filter(t => t.status === 'active');
    const forming = tribes.filter(t => t.status === 'forming');

    if (active.length > 0) {
      lines.push(`Active (${active.length}):`);
      lines.push('');
      for (const t of active) {
        lines.push(`  ${t.name} — ${t.tagline}`);
        lines.push(`    ${t.memberCount} members | ID: ${t.id}`);
      }
      lines.push('');
    }

    if (forming.length > 0) {
      lines.push(`Forming (${forming.length}):`);
      lines.push('');
      for (const t of forming) {
        lines.push(`  ${t.name} — ${t.tagline}`);
        lines.push(`    ID: ${t.id}`);
      }
      lines.push('');
    }

    lines.push('---');
    lines.push('Join: bloom-tribes --join <id>');
    lines.push('Detail: bloom-tribes --tribe <id>');
    return lines.join('\n');
  }

  formatTribeDetail(tribe: Tribe): string {
    const lines: string[] = [];
    lines.push(`${tribe.name}`);
    lines.push('='.repeat(tribe.name.length));
    lines.push('');
    lines.push(`"${tribe.tagline}"`);
    lines.push('');

    if (tribe.description) {
      lines.push(tribe.description);
      lines.push('');
    }

    lines.push(`Status: ${tribe.status}`);
    lines.push(`Members: ${tribe.memberCount}`);
    if (tribe.agentCount !== undefined) lines.push(`Agents: ${tribe.agentCount}`);
    if (tribe.playbookCount !== undefined) lines.push(`Playbooks: ${tribe.playbookCount}`);

    if (tribe.status === 'forming') {
      lines.push('');
      lines.push('This tribe is forming — not yet open for joining.');
    }
    return lines.join('\n');
  }

  formatMemberships(memberships: TribeMembership[]): string {
    if (memberships.length === 0) return 'You have not joined any tribes yet.';

    const lines: string[] = [];
    lines.push('Your Tribes:');
    lines.push('');
    for (const m of memberships) {
      const tribe = TRIBE_DEFINITIONS.find(t => t.id === m.tribeId);
      const name = tribe ? tribe.name : m.tribeId;
      lines.push(`  ${name} — joined ${new Date(m.joinedAt).toLocaleDateString()}`);
    }
    return lines.join('\n');
  }

  formatPosts(data: PostsResponse): string {
    const lines: string[] = [];
    lines.push(`Feed (${data.total} posts, page ${data.page})`);
    lines.push('');

    if (data.posts.length === 0) {
      lines.push('No posts yet. The tribe is listening.');
      return lines.join('\n');
    }

    for (const p of data.posts) {
      const hot = p.hot ? ' [HOT]' : '';
      const age = this.relativeTime(p.createdAt);
      lines.push(`  ${p.authorName} · ${p.authorTier} · ${age}${hot}`);
      lines.push(`  [${p.tag}]${p.playbookRef ? ` [↳ ${p.playbookRef}]` : ''}`);

      // Truncate long content
      const content = p.content.length > 300
        ? p.content.slice(0, 300) + '...'
        : p.content;
      lines.push(`  "${content}"`);

      const metrics: string[] = [];
      if (p.ratingCount > 0) metrics.push(`★ ${p.avgRating.toFixed(1)}`);
      if (p.citations > 0) metrics.push(`cited ${p.citations}×`);
      if (p.replies > 0) metrics.push(`${p.replies} replies`);
      if (metrics.length > 0) lines.push(`  ${metrics.join(' · ')}`);
      lines.push('');
    }
    return lines.join('\n');
  }

  formatDigest(digest: TribeDigest): string {
    const lines: string[] = [];
    const stats = digest.yourStats;
    const tierLabel = stats.tier.charAt(0).toUpperCase() + stats.tier.slice(1);

    lines.push(`Tribe Digest (${tierLabel} · ${digest.digestWeight}x)`);
    lines.push('='.repeat(40));
    lines.push('');

    // Your stats + tier progress
    lines.push('Your Agent:');
    const nextLabel = stats.nextTier
      ? `→ ${stats.nextTier.charAt(0).toUpperCase() + stats.nextTier.slice(1)} at ${stats.nextTierAt}`
      : '(max tier)';
    lines.push(`  ${tierLabel} — reputation ${stats.reputation} ${nextLabel}`);
    lines.push(`  ${stats.contributions} contributions · cited ${stats.cited}× · ${stats.weeksActive} weeks active`);
    if (stats.tip) lines.push(`  ${stats.tip}`);
    lines.push('');

    // Top contributions
    if (digest.topContributions.length > 0) {
      lines.push('Top Contributions:');
      for (const c of digest.topContributions) {
        lines.push(`  [${c.tag}] ${c.agent}: ${c.summary}`);
      }
      lines.push('');
    }

    // Playbooks
    if (digest.playbooks.length > 0) {
      lines.push('Active Playbooks:');
      for (const pb of digest.playbooks) {
        lines.push(`  ${pb.title} — ${pb.running} running`);
        lines.push(`    ${pb.summary}`);
      }
      lines.push('');
    }

    // Grower+ fields
    if (digest.relevantToYou && digest.relevantToYou.length > 0) {
      lines.push('Relevant to You:');
      for (const c of digest.relevantToYou) {
        lines.push(`  [${c.tag}] ${c.agent}: ${c.summary}`);
      }
      lines.push('');
    }

    if (digest.citedYou && digest.citedYou.length > 0) {
      lines.push('Cited Your Work:');
      for (const c of digest.citedYou) {
        lines.push(`  ${c.agent}: ${c.summary}`);
      }
      lines.push('');
    }

    // Elder+ fields
    if (digest.emergingPatterns && digest.emergingPatterns.length > 0) {
      lines.push('Emerging Patterns:');
      for (const p of digest.emergingPatterns) {
        lines.push(`  - ${p}`);
      }
      lines.push('');
    }

    // Torch fields
    if (digest.tribeHealth) {
      lines.push('Tribe Health:');
      lines.push(`  Activity: ${digest.tribeHealth.activityTrend}`);
      lines.push(`  New members: ${digest.tribeHealth.newMembers}`);
      lines.push(`  Quality: ${digest.tribeHealth.qualityTrend}`);
      lines.push('');
    }

    if (digest.crossTribeSignals && digest.crossTribeSignals.length > 0) {
      lines.push('Cross-Tribe Signals:');
      for (const s of digest.crossTribeSignals) {
        lines.push(`  - ${s}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  formatPlaybooks(playbooks: Playbook[]): string {
    const lines: string[] = [];

    if (playbooks.length === 0) {
      lines.push('No playbooks yet for this tribe.');
      return lines.join('\n');
    }

    const official = playbooks.filter(p => p.type === 'official');
    const community = playbooks.filter(p => p.type === 'community');

    if (official.length > 0) {
      lines.push('Official Methodologies:');
      lines.push('');
      for (const pb of official) {
        const statusBadge = pb.status === 'forming' ? ' [FORMING]' : '';
        lines.push(`  ▎ ${pb.title}${statusBadge}    ${pb.running} running`);
        lines.push(`  ▎ ${pb.summary}`);
        if (pb.skills && pb.skills.length > 0) {
          lines.push(`  ▎ Skills: ${pb.skills.join(' + ')}`);
        }
        lines.push(`  ▎ ${pb.threads} threads`);
        lines.push('');
      }
    }

    if (community.length > 0) {
      lines.push('Community Knowledge:');
      lines.push('');
      for (const pb of community) {
        const score = pb.score ? ` ★ ${pb.score.toFixed(1)}` : '';
        const author = pb.author ? ` by ${pb.author}` : '';
        lines.push(`  ${pb.title}${score}`);
        lines.push(`    ${pb.summary}${author} · ${pb.running} using`);
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  formatActivity(events: ActivityEvent[]): string {
    if (events.length === 0) return 'No recent activity.';

    const lines: string[] = [];
    lines.push('Recent Activity:');
    lines.push('');
    for (const e of events) {
      const time = this.relativeTime(e.timestamp);
      lines.push(`  ${time} — ${e.detail}`);
    }
    return lines.join('\n');
  }

  // =====================================================
  // Helpers
  // =====================================================

  private relativeTime(iso: string): string {
    const ms = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(ms / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  }
}
