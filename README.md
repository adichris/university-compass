# UniChecker.gh

A free admission guide for Ghanaian students. Enter WASSCE, NOVDEC or SSSCE grades and see every university
programme you qualify for, sorted into **Safe / Competitive / Reach**. It also covers masters/PhD matching,
scholarships, WASSCE result checking and an application tracker.

Every feature works **without an account**: data is saved in the browser. An optional account syncs it across devices.

## Features

| Area | What it does |
| --- | --- |
| Admission checker (`/check`) | Programme-specific aggregates (core rule + required electives + minimum grades), cut-off comparison, multiple sittings combined where the university allows it, filters, shortlist, share card |
| WASSCE results (`/results`) | Guided check on the official WAEC portal (copy-ready details, PIN never stored), import grades by **pasting the results text** or **scanning the slip** (on-device OCR), release tracker, email alerts |
| Masters & PhD (`/postgraduate`) | Matches degree class / CGPA, field, work experience, proposal and IELTS against programmes in Ghana and abroad, plus matching funding |
| Scholarships (`/scholarships`) | Profile-based match score, filters, save, add to plan, `.ics` deadline reminders |
| Universities (`/universities`) | Profiles, programmes and cut-offs, fees ranges, sitting rules, official links |
| My plan (`/plan`) | Application tracker (status, deadline, notes, CSV export), saved items, side-by-side compare |
| Career quiz (`/career`) | Interest quiz that links into the checker filtered by field |
| Outcomes (`/contribute`) | Anonymous "admitted with aggregate X" reports, shown as real-world ranges on results |
| PWA | Installable, works offline for previously visited pages |

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # grading engine + parser tests
```

The local database is a SQLite file (`unichecker.db`) that is created automatically.

## Deploy for free

1. Create a free [Turso](https://turso.tech) database and copy its URL and token.
2. Import the repo on [Vercel](https://vercel.com) (Hobby plan) and set:
   - `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`
   - `NEXT_PUBLIC_SITE_URL` (e.g. `https://unichecker.gh`)
3. The weekly data refresh runs on GitHub Actions (free for public repos).

## Data

All data is in `data/*.json`, which the app loads at build time:

- `universities.json`: institutions and sitting rules
- `programme-templates.json`: entry requirements per programme type
- `offerings.json`: which university offers what, with the latest cut-off
- `postgrad.json`, `scholarships.json`, `updates.json`

> ⚠️ The seeded cut-off points are **estimates** (`verified: false`). Replace them with official figures before
> launch, either by hand or through the scraper below. The UI labels unverified figures as estimates.

### Scraper (keeps data current)

```bash
cd scraper
python -m venv .venv && .venv/Scripts/pip install -r requirements.txt   # macOS/Linux: .venv/bin/pip
python -m uc_scraper crawl      # fetch changed pages/PDFs listed in sources.yaml -> data/pending/
python -m uc_scraper review     # approve / edit / reject each proposal
python -m pytest tests
```

The scraper respects `robots.txt`, rate-limits requests per host, caches pages and only parses pages whose content
changed. It never writes straight to live data: proposals go through `review`, or in CI through a pull request
(`.github/workflows/scrape.yml`). Source URLs change each admission cycle, so update `scraper/sources.yaml` every year.

## WASSCE results: what is and isn't automated

WAEC has no public results API, and its portal uses a security check. The app does **not** log into WAEC on the
student's behalf. Instead it prepares their details for copying, opens the official portal, and reads their grades
back in. If you later become a WAEC partner with API access, add it as a server route that calls that API.

## Privacy

Guests: everything stays in `localStorage`. Accounts: scrypt-hashed passwords, hashed session tokens, httpOnly
cookies. Outcome reports are anonymous. Register with Ghana's Data Protection Commission (Act 843) before launch.
