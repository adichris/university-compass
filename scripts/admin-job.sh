#!/usr/bin/env bash
# Background jobs started from the admin dashboard (see src/app/api/admin/jobs).
#   gtec    refresh GTEC's register into data/local/, then build a release
#   apply   build a release with the current data and admin edits
#   deploy  pull the latest code from GitHub, then build a release
# Output goes to the job's log file; the dashboard shows it live.
set -euo pipefail
cd "$(dirname "$0")/.."

setup_python() {
  if [ ! -x scraper/.venv/bin/python ]; then
    echo "== Setting up the scraper's Python environment (first run only)"
    python3 -m venv scraper/.venv
    scraper/.venv/bin/pip install -q -r scraper/requirements.txt
  fi
}

case "${1:-}" in
  gtec)
    setup_python
    echo "== Crawling GTEC's register (this takes about 30-40 minutes)"
    (cd scraper && .venv/bin/python -u -m uc_scraper gtec --local --delay 1.5)
    echo "== Generating app data"
    (cd scraper && .venv/bin/python -u -m uc_scraper build --local)
    bash scripts/build-release.sh
    ;;
  apply)
    bash scripts/build-release.sh
    ;;
  deploy)
    echo "== Pulling the latest code"
    git pull --ff-only
    bash scripts/build-release.sh
    ;;
  *)
    echo "Unknown job: ${1:-}" >&2
    exit 2
    ;;
esac
