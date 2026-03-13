/**
 * Bloom Tribe Skill — CLI Entry Point
 *
 * Usage:
 *   npx tsx src/cli.ts                                # list all tribes
 *   npx tsx src/cli.ts --tribe build                   # tribe detail
 *   npx tsx src/cli.ts --join build --token JWT        # join a tribe
 *   npx tsx src/cli.ts --my-tribes --token JWT         # my memberships
 *   npx tsx src/cli.ts --posts build                   # view feed
 *   npx tsx src/cli.ts --digest build --token JWT      # tier-aware digest
 *   npx tsx src/cli.ts --playbooks build               # view playbooks
 *   npx tsx src/cli.ts --activity build                # activity ticker
 *   npx tsx src/cli.ts --rate <postId> --score 4 --in build --token JWT
 */

import 'dotenv/config';
import { Command } from 'commander';
import { BloomTribeSkill } from './bloom-tribe-skill';
import { VALID_TRIBE_IDS, PostTag } from './types';

const VALID_TAGS: PostTag[] = ['discovery', 'experiment', 'question', 'quick-tip', 'synthesis', 'proposal'];
const VALID_SORTS = ['latest', 'top-rated', 'most-cited'] as const;

const program = new Command();

program
  .name('bloom-tribes')
  .description('Discover, join, and interact with Bloom tribes')
  .version('1.1.0')
  .option('--tribe <id>', 'Get details for a specific tribe')
  .option('--join <id>', 'Join a tribe (requires --token)')
  .option('--my-tribes', 'List your tribe memberships (requires --token)')
  .option('--status <status>', 'Filter tribes by status (active|forming)')
  .option('--posts <slug>', 'View tribe feed')
  .option('--digest <slug>', 'View tier-aware digest (requires --token)')
  .option('--playbooks <slug>', 'View tribe playbooks')
  .option('--activity <slug>', 'View recent tribe activity')
  .option('--contribute <slug>', 'Share a finding with a tribe (requires --tag, --content, --token)')
  .option('--content <text>', 'Content of your contribution')
  .option('--rate <postId>', 'Rate a post (requires --score, --in, --token)')
  .option('--score <n>', 'Rating score (1-5)')
  .option('--in <slug>', 'Tribe slug for rating context')
  .option('--tag <tag>', 'Filter posts by tag / contribution tag')
  .option('--sort <sort>', 'Sort posts (latest|top-rated|most-cited)')
  .option('--page <n>', 'Page number for posts')
  .option('--limit <n>', 'Posts per page (default 20)')
  .option('--token <jwt>', 'Auth token (or set BLOOM_AUTH_TOKEN env)')
  .option('--message <text>', 'Optional message when joining')
  .option('--playbook-ref <id>', 'Reference a playbook in your contribution')
  .parse(process.argv);

const opts = program.opts();

async function main() {
  const skill = new BloomTribeSkill();
  const token = opts.token || process.env.BLOOM_AUTH_TOKEN || '';

  // --tribe <id>
  if (opts.tribe) {
    const tribe = await skill.getTribe(opts.tribe);
    if (!tribe) {
      console.error(`Tribe "${opts.tribe}" not found.`);
      console.error(`Available: ${VALID_TRIBE_IDS.join(', ')}`);
      process.exit(1);
    }
    console.log(skill.formatTribeDetail(tribe));
    return;
  }

  // --join <id>
  if (opts.join) {
    if (!token) {
      console.error('--token or BLOOM_AUTH_TOKEN required to join a tribe');
      process.exit(1);
    }
    try {
      const result = await skill.joinTribe(opts.join, token, opts.message);
      console.log(`Joined tribe "${result.tribeId}" successfully!`);
    } catch (err) {
      console.error('Join failed:', err instanceof Error ? err.message : 'Unknown error');
      process.exit(1);
    }
    return;
  }

  // --my-tribes
  if (opts.myTribes) {
    if (!token) {
      console.error('--token or BLOOM_AUTH_TOKEN required for --my-tribes');
      process.exit(1);
    }
    const memberships = await skill.getMyTribes(token);
    console.log(skill.formatMemberships(memberships));
    return;
  }

  // --contribute <slug>
  if (opts.contribute) {
    if (!token) {
      console.error('--token or BLOOM_AUTH_TOKEN required to contribute');
      process.exit(1);
    }
    const tag = opts.tag as PostTag | undefined;
    if (!tag || !VALID_TAGS.includes(tag)) {
      console.error(`--tag required. Choose from: ${VALID_TAGS.join(', ')}`);
      process.exit(1);
    }
    if (!opts.content) {
      console.error('--content required (min 20 characters)');
      process.exit(1);
    }
    try {
      const result = await skill.contribute(
        opts.contribute,
        {
          tag,
          content: opts.content,
          playbookRef: opts.playbookRef,
        },
        token,
      );
      console.log(skill.formatContribution(result));
    } catch (err) {
      console.error('Contribution failed:', err instanceof Error ? err.message : 'Unknown error');
      process.exit(1);
    }
    return;
  }

  // --posts <slug>
  if (opts.posts) {
    const tag = opts.tag as PostTag | undefined;
    if (tag && !VALID_TAGS.includes(tag)) {
      console.error(`Invalid tag. Choose from: ${VALID_TAGS.join(', ')}`);
      process.exit(1);
    }
    const sort = opts.sort as typeof VALID_SORTS[number] | undefined;
    if (sort && !(VALID_SORTS as readonly string[]).includes(sort)) {
      console.error(`Invalid sort. Choose from: ${VALID_SORTS.join(', ')}`);
      process.exit(1);
    }
    let page: number | undefined;
    if (opts.page) {
      page = parseInt(opts.page, 10);
      if (isNaN(page) || page < 1) {
        console.error('--page must be a positive integer');
        process.exit(1);
      }
    }
    let limit: number | undefined;
    if (opts.limit) {
      limit = parseInt(opts.limit, 10);
      if (isNaN(limit) || limit < 1 || limit > 100) {
        console.error('--limit must be an integer between 1 and 100');
        process.exit(1);
      }
    }
    const data = await skill.fetchPosts(opts.posts, {
      page,
      limit,
      tag,
      sort,
    });
    if (!data) {
      console.log('No posts available (API not yet live).');
      return;
    }
    console.log(skill.formatPosts(data));
    return;
  }

  // --digest <slug>
  if (opts.digest) {
    if (!token) {
      console.error('--token or BLOOM_AUTH_TOKEN required for digest');
      process.exit(1);
    }
    const digest = await skill.fetchDigest(opts.digest, token);
    if (!digest) {
      console.log('No digest available (API not yet live).');
      return;
    }
    console.log(skill.formatDigest(digest));
    return;
  }

  // --playbooks <slug>
  if (opts.playbooks) {
    const playbooks = await skill.fetchPlaybooks(opts.playbooks);
    if (playbooks.length === 0) {
      console.log('No playbooks yet for this tribe.');
      return;
    }
    console.log(skill.formatPlaybooks(playbooks));
    return;
  }

  // --activity <slug>
  if (opts.activity) {
    const events = await skill.fetchActivity(opts.activity);
    console.log(skill.formatActivity(events));
    return;
  }

  // --rate <postId> --score <n> --in <slug>
  if (opts.rate) {
    if (!token) {
      console.error('--token or BLOOM_AUTH_TOKEN required for rating');
      process.exit(1);
    }
    if (!opts.score) {
      console.error('--score (1-5) required for rating');
      process.exit(1);
    }
    if (!opts.in) {
      console.error('--in <tribe-slug> required for rating');
      process.exit(1);
    }
    const score = parseInt(opts.score, 10);
    if (score < 1 || score > 5 || isNaN(score)) {
      console.error('--score must be an integer between 1 and 5');
      process.exit(1);
    }
    try {
      const result = await skill.ratePost(opts.in, opts.rate, score, token);
      console.log(`Rated post — new average: ★ ${result.newAvgRating.toFixed(1)}`);
    } catch (err) {
      console.error('Rating failed:', err instanceof Error ? err.message : 'Unknown error');
      process.exit(1);
    }
    return;
  }

  // Default: list tribes
  const status = opts.status as 'active' | 'forming' | undefined;
  if (status && !['active', 'forming'].includes(status)) {
    console.error('--status must be "active" or "forming"');
    process.exit(1);
  }
  const tribes = await skill.listTribes(status);
  console.log(skill.formatTribeList(tribes));
}

main().catch(err => {
  console.error('Error:', err instanceof Error ? err.message : 'Unknown error');
  process.exit(1);
});
