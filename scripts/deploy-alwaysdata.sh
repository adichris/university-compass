#!/usr/bin/env bash
# Run on the alwaysdata server over SSH, from the project folder:
#   cd ~/university-compass && bash scripts/deploy-alwaysdata.sh
# Pulls the latest code, installs dependencies and builds the standalone server.
# Restart the site afterwards (alwaysdata admin > Web > Sites > restart).
set -euo pipefail

# SSH sessions use the account's default Node.js, which can be older than the site's; Next.js 16 needs >= 20.9.
export NODEJS_VERSION="${NODEJS_VERSION:-24}"
# One page-generation worker keeps the build within shared-hosting memory limits (it is killed otherwise).
export NEXT_BUILD_CPUS="${NEXT_BUILD_CPUS:-1}"

cd "$(dirname "$0")/.."
echo "Node $(node -v), build workers: $NEXT_BUILD_CPUS"
git pull --ff-only
npm ci --no-audit --no-fund
npm run build:standalone
# Keep only what the running server needs to free disk space; the next deploy reinstalls.
npm prune --omit=dev --no-audit --no-fund
echo "Build complete. Restart the site in the alwaysdata admin to load it."
