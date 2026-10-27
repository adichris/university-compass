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
# Skip the build's TypeScript step: it is the most memory-hungry part and gets the build killed on small
# plans. GitHub runs the type check on every push (.github/workflows/ci.yml). NEXT_SKIP_TYPECHECK=0 restores it.
export NEXT_SKIP_TYPECHECK="${NEXT_SKIP_TYPECHECK:-1}"
# Optional heap cap in MB (e.g. BUILD_MAX_HEAP_MB=512) makes Node free memory sooner instead of growing until
# the host kills it. Unset = Node's default.
if [ -n "${BUILD_MAX_HEAP_MB:-}" ]; then export NODE_OPTIONS="--max-old-space-size=${BUILD_MAX_HEAP_MB} ${NODE_OPTIONS:-}"; fi
# Dashboard jobs inherit the running site's environment: NODE_ENV=production (the build needs dev
# dependencies) and __NEXT_* variables holding the live server's config (which would make `next build`
# ignore next.config.ts and wipe the live .next folder). Clear them.
unset NODE_ENV
for v in $(env | grep -o '^__NEXT[A-Za-z0-9_]*' || true); do unset "$v"; done

# A build killed for memory (SIGKILL) exits silently; say clearly what happened and what is still live.
trap 'status=$?; echo; echo "== Build FAILED (exit $status). Nothing was swapped: the site is still running the previous build."; { [ "$status" = 137 ] || [ "$status" = 143 ]; } && echo "   The process was killed - usually the server ran out of memory. Try again, or deploy with the site stopped."' ERR

echo "== Node $(node -v), build workers: $NEXT_BUILD_CPUS, type check: $([ "$NEXT_SKIP_TYPECHECK" = 1 ] && echo skipped || echo on), heap cap: ${BUILD_MAX_HEAP_MB:-default}"
# A build or install left running by an earlier deploy or dashboard job holds files in node_modules and uses
# the memory this build needs, so this one gets killed too. Stop with a clear message instead.
others=$(pgrep -u "$(id -u)" -f 'npm (ci|install|prune)|next build|jest-worker/processChild' || true)
if [ -n "$others" ]; then
  echo "== Another build is still running and using memory:"
  ps -o pid=,rss=,etime=,args= -p "$(echo $others | tr ' ' ',')" | awk '{printf "   pid %s, %d MB, running %s: ", $1, $2/1024, $3; for (i=4;i<=NF;i++) printf "%s ", $i; print ""}'
  echo "   Stop it with: kill $(echo $others)   (then run this again)"
  exit 1
fi

echo "== Installing dependencies"
# Reinstall only when package-lock.json changed: npm ci is a memory peak of its own on small plans.
lock_hash=$(sha256sum package-lock.json | cut -d' ' -f1)
if [ "$(cat node_modules/.release-lock-hash 2>/dev/null)" = "$lock_hash" ]; then
  echo "   unchanged since the last deploy, skipping"
else
  # npm ci deletes node_modules itself and fails with ENOTEMPTY when a folder can't be removed. Renaming
  # always works, so move it aside and delete it here.
  if [ -d node_modules ]; then mv node_modules ".node_modules-old-$$"; fi
  rm -rf .node_modules-old-* 2>/dev/null || echo "   (some files in .node_modules-old-* are still in use; a later deploy removes them)"
  npm ci --include=dev --prefer-offline --no-audit --no-fund
  echo "$lock_hash" > node_modules/.release-lock-hash
fi
node scripts/prepare-data.mjs
echo "== Building"
# Reuse Turbopack's compile cache (cache/ in the build folder) from the last build: compiling only what changed
# needs well under half the memory of a full compile. A failed build keeps its cache in .next-build; after a
# successful one it moved to .next with the rest of the build (the live server doesn't use it).
mkdir -p .next-build
find .next-build -mindepth 1 -maxdepth 1 ! -name cache -exec rm -rf {} +
if [ ! -d .next-build/cache ] && [ -d .next/cache ]; then mv .next/cache .next-build/cache; fi
echo "   compile cache: $([ -d .next-build/cache ] && echo "reused ($(du -sh .next-build/cache | cut -f1))" || echo "none, full compile")"
# Two processes instead of one: a single `next build` still holds the compiler's memory when it starts
# generating pages, which is where small plans kill it. Compiling first and generating pages in a fresh
# process lowers the peak by about a quarter.
npx next build --experimental-build-mode compile
echo "== Generating pages"
npx next build --experimental-build-mode generate
node scripts/standalone-assets.mjs

echo "== Swapping in the new build"
rm -rf .next-old
[ -d .next ] && mv .next .next-old
mv .next-build .next
rm -rf .next-old

# Dev dependencies are kept (no npm prune) so the next deploy can skip the install; the running server only
# uses .next/standalone, which has its own node_modules.
date -u +%Y-%m-%dT%H:%M:%SZ > data/local/last-build.txt

# The start script records the server's PID; stopping it makes alwaysdata start the new build.
if [ -f data/local/server.pid ] && kill "$(cat data/local/server.pid)" 2>/dev/null; then
  echo "== Restarted the site"
else
  echo "== Build complete. Restart the site in the alwaysdata admin to load it."
fi
