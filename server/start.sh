#!/usr/bin/env bash
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

# Load environment variables
if [ -f .env ]; then
  set -a
  source .env
  set +a
else
  echo "[WARN] No .env file found. Copy .env.example to .env and fill in values."
fi

# Use Node 22
NODE="/opt/homebrew/opt/node@22/bin/node"
if [ ! -x "$NODE" ]; then
  NODE="$(which node)"
fi

echo "[$(date -Iseconds)] Starting Bear Witness Dashboard server..."
exec "$NODE" src/index.js
