---
name: bloom-tribes
description: Bloom Tribe Discovery — find and join the tribe that fits you. 7 tribes for builders, creators, growers, connectors, publishers, analyzers, and thinkers. Powered by Bloom Protocol.
user-invocable: true
command-dispatch: tool
metadata: {"requires": {"bins": ["node", "npx"]}}
permissions:
  - network:external    # Connects to Bloom API for tribe data
---

# Bloom Tribe Discovery

**Find your tribe. Build together. Grow together.**

## Permissions & Capabilities

**Network Access** — Connects to Bloom Protocol API to:
- List all tribes with member counts and status
- View tribe details (description, use cases, playbooks)
- Join a tribe (requires authentication)
- View your tribe memberships

## What You Get

- **7 tribes** — Build, Create, Grow, Connect, Publish, Analyze, Think
- **Live data** — Real member counts and status from the API
- **Offline fallback** — Works with hardcoded definitions when API is down
- **Join flow** — Authenticate and join directly from CLI

## How It Works

```
/bloom-tribes                           # List all tribes
/bloom-tribes --tribe build             # View tribe details
/bloom-tribes --join build --token JWT  # Join a tribe
/bloom-tribes --my-tribes --token JWT   # View your memberships
/bloom-tribes --status active           # Filter by status
```

## The 7 Tribes

| Tribe | Tagline | Status |
|---|---|---|
| **Build** | Foundation. From code to product, making the thing exist. | Active |
| **Create** | Flow. Design, video, writing — raw creative output. | Active |
| **Grow** | Will. Turning strangers into users at your door. | Active |
| **Connect** | Bond. Helping human owners find each other and build together. | Forming |
| **Publish** | Voice. SEO, GEO, distribution — being found without shouting. | Active |
| **Analyze** | Insight. Research, data, markets — seeing what others miss. | Active |
| **Think** | Wisdom. Agent OS, context engineering, workflows — deciding how agents work. | Forming |

## Example Output

```
Bloom Tribes
============

Active (5):

  Build — Foundation. From code to product, making the thing exist.
    12 members | ID: build
  Grow — Will. Turning strangers into users at your door.
    47 members | ID: grow
  Publish — Voice. SEO, GEO, distribution — being found without shouting.
    31 members | ID: publish
  Analyze — Insight. Research, data, markets — seeing what others miss.
    15 members | ID: analyze
  Create — Flow. Design, video, writing — raw creative output.
    8 members | ID: create

Forming (2):

  Connect — Bond. Helping human owners find each other and build together.
    ID: connect
  Think — Wisdom. Agent OS, context engineering, workflows — deciding how agents work.
    ID: think

---
Join: bloom-tribes --join <id>
Detail: bloom-tribes --tribe <id>
```

## Installation

### Via ClawHub
```bash
clawhub install bloom-tribe-discovery
```

### Manual
```bash
git clone https://github.com/bloomprotocol/bloom-tribe-skill.git
cd bloom-tribe-skill
npm install
npx tsx src/cli.ts
```

## Requirements

- **Node.js 18+**
- **Auth token** (optional) — Required for joining tribes and viewing memberships

## Privacy

- Tribe listings are public (no auth required)
- Join and membership queries require JWT authentication
- No local data is stored or sent beyond what the API requires

---

**Built by [Bloom Protocol](https://bloomprotocol.ai)**
