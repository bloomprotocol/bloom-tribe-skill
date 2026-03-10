/**
 * Bloom Tribe Skill — CLI Entry Point
 *
 * Usage:
 *   npx tsx src/cli.ts                        # list all tribes
 *   npx tsx src/cli.ts --tribe build           # tribe detail
 *   npx tsx src/cli.ts --join build            # join a tribe (needs --token)
 *   npx tsx src/cli.ts --my-tribes             # my memberships (needs --token)
 *   npx tsx src/cli.ts --status active         # filter by status
 */

import 'dotenv/config';
import { Command } from 'commander';
import { BloomTribeSkill } from './bloom-tribe-skill';
import { VALID_TRIBE_IDS } from './types';

const program = new Command();

program
  .name('bloom-tribes')
  .description('Discover and join Bloom tribes')
  .version('1.0.0')
  .option('--tribe <id>', 'Get details for a specific tribe')
  .option('--join <id>', 'Join a tribe (requires --token)')
  .option('--my-tribes', 'List your tribe memberships (requires --token)')
  .option('--status <status>', 'Filter tribes by status (active|forming)')
  .option('--token <jwt>', 'Auth token (or set BLOOM_AUTH_TOKEN env)')
  .option('--message <text>', 'Optional message when joining')
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
