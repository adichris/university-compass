#!/usr/bin/env bash
# Run on the alwaysdata server over SSH, from the project folder:
#   cd ~/university-compass && bash scripts/deploy-alwaysdata.sh
# Pulls the latest code and builds a release (see build-release.sh). The admin dashboard's
# "Deploy latest code" job runs the same steps.
set -euo pipefail

cd "$(dirname "$0")/.."
git pull --ff-only
bash scripts/build-release.sh
