#!/usr/bin/env bash

# Bloom Tribe Discovery — OpenClaw entry script
#
# Usage:
#   ./scripts/tribes.sh
#   ./scripts/tribes.sh --tribe build
#   ./scripts/tribes.sh --join build --token <jwt>
#   ./scripts/tribes.sh --my-tribes --token <jwt>

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Auto-install dependencies if needed
if [ ! -d "$SKILL_DIR/node_modules" ]; then
  echo "Installing dependencies..."
  cd "$SKILL_DIR" && npm install --silent 2>/dev/null
fi

# Build args
ARGS=()

while [[ $# -gt 0 ]]; do
  case $1 in
    --tribe)
      ARGS+=("--tribe" "$2")
      shift 2
      ;;
    --join)
      ARGS+=("--join" "$2")
      shift 2
      ;;
    --my-tribes)
      ARGS+=("--my-tribes")
      shift
      ;;
    --status)
      ARGS+=("--status" "$2")
      shift 2
      ;;
    --token)
      ARGS+=("--token" "$2")
      shift 2
      ;;
    --message)
      ARGS+=("--message" "$2")
      shift 2
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

# Use env token if not passed via CLI
if [ -n "${BLOOM_AUTH_TOKEN:-}" ] && [[ ! " ${ARGS[*]} " =~ " --token " ]]; then
  ARGS+=("--token" "$BLOOM_AUTH_TOKEN")
fi

cd "$SKILL_DIR"
exec npx tsx src/cli.ts "${ARGS[@]}"
