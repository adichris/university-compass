#!/usr/bin/env bash
# Build a release into .next-build and swap it in only if the build succeeds, so the running site
# keeps serving the previous version during the build (and if the build fails). Then restart.
# Used by deploy-alwaysdata.sh and by dashboard jobs (scripts/admin-job.sh).
set -euo pipefail

cd "$(dirname "$0")/.."
# SSH sessions use the account's default Node.js, which can be older than the site's; Next.js 16 needs >= 20.9.
export NODEJS_VERSION="${NODEJS_VERSION:-24}"
# One page-generation worker keeps the build within shared-hosting memory limits (it is killed otherwise).
export NEXT_BUILD_CPUS="${NEXT_BUILD_CPUS:-1}"
export NEXT_DIST_DIR=.next-build
# Dashboard jobs inherit the running site's environment: NODE_ENV=production (the build needs dev
# dependencies) and __NEXT_* variables holding the live server's config (which would make `next build`
# ignore next.config.ts and wipe the live .next folder). Clear them.
unset NODE_ENV
for v in $(env | grep -o '^__NEXT[A-Za-z0-9_]*' || true); do unset "$v"; done

echo "== Node $(node -v), build workers: $NEXT_BUILD_CPUS"
echo "== Installing dependencies"
npm ci --include=dev --no-audit --no-fund
node scripts/prepare-data.mjs
echo "== Building"
rm -rf .next-build
npx next build
node scripts/standalone-assets.mjs

echo "== Swapping in the new build"
rm -rf .next-old
[ -d .next ] && mv .next .next-old
mv .next-build .next
rm -rf .next-old

# Keep only what the running server needs to free disk space; the next build reinstalls.
npm prune --omit=dev --no-audit --no-fund
date -u +%Y-%m-%dT%H:%M:%SZ > data/local/last-build.txt

# The start script records the server's PID; stopping it makes alwaysdata start the new build.
if [ -f data/local/server.pid ] && kill "$(cat data/local/server.pid)" 2>/dev/null; then
  echo "== Restarted the site"
else
  echo "== Build complete. Restart the site in the alwaysdata admin to load it."
fi
