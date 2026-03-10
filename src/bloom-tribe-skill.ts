/**
 * Bloom Tribe Skill
 *
 * OpenClaw skill — CLI wrapper around Bloom Protocol tribes API.
 * Falls back to hardcoded definitions when API is unavailable.
 *
 * API endpoints (from BE tribes.controller.ts):
 *   GET  /tribes           — list all tribes
 *   GET  /tribes/:id       — get tribe detail
 *   POST /tribes/:id/join  — join a tribe (auth required)
 *   GET  /tribes/my-tribes — user's memberships (auth required)
 */

import 'dotenv/config';
import {
  Tribe,
  TribeMembership,
  JoinResult,
  ApiResponse,
  TRIBE_DEFINITIONS,
  VALID_TRIBE_IDS,
} from './types';

const BLOOM_API_BASE = process.env.BLOOM_API_URL || 'https://api.bloomprotocol.ai';
const FETCH_TIMEOUT_MS = 10_000;

// Slug validation — matches BE SAFE_TRIBE_ID regex
const SAFE_SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/;

function validateSlug(slug: string): string {
  if (!SAFE_SLUG.test(slug)) {
    throw new Error(`Invalid tribe ID: "${slug}". Must be lowercase alphanumeric/hyphens.`);
  }
  return slug;
}

export class BloomTribeSkill {
  private apiBase: string;

  constructor(apiBase?: string) {
    this.apiBase = apiBase || BLOOM_API_BASE;
  }

  // =====================================================
  // API Methods
  // =====================================================

  /**
   * List all tribes. Falls back to hardcoded definitions on failure.
   */
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
    // Fallback
    const fallback = TRIBE_DEFINITIONS;
    return status ? fallback.filter(t => t.status === status) : fallback;
  }

  /**
   * Get a single tribe by ID. Falls back to hardcoded definition.
   */
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

  /**
   * Join a tribe. Requires auth token.
   */
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

  /**
   * Get user's tribe memberships. Requires auth token.
   */
  async getMyTribes(token: string): Promise<TribeMembership[]> {
    const json = await this.get<TribeMembership[]>('/tribes/my-tribes', token);
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
        // Parse known error shapes from BE
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
}
