#!/usr/bin/env bash
# Run on the alwaysdata server over SSH, from the project folder:
#   cd ~/campuscompass && bash scripts/deploy-alwaysdata.sh
# Pulls the latest code, installs dependencies and builds the standalone server.
# Restart the site afterwards (alwaysdata admin > Web > Sites > restart).
set -euo pipefail

cd "$(dirname "$0")/.."
git pull --ff-only
npm ci --no-audit --no-fund
npm run build:standalone
# Keep only what the running server needs to free disk space; the next deploy reinstalls.
npm prune --omit=dev --no-audit --no-fund
echo "Build complete. Restart the site in the alwaysdata admin to load it."
