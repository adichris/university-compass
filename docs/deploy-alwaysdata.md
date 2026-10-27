# Deploying to alwaysdata (Node.js + PostgreSQL)

alwaysdata runs the app as a normal, always-on Node.js process. The app stores accounts, saved lists, outcome reports
and alert sign-ups in alwaysdata's managed **PostgreSQL** (a SQLite file also works; see the end of this guide).
It is built in "standalone" mode, a self-contained server of about 40 MB.

## 1. Create the PostgreSQL database

In the admin, go to **Databases > PostgreSQL** and create a database (e.g. `<account>_university_compass`) and a user with
**all privileges** on it. Note the user's password. The connection details are:

| | |
| --- | --- |
| Host | `postgresql-<account>.alwaysdata.net` |
| Port | `5432` |
| Database / user | the names you just created |

The app creates its tables automatically on the first request, so no SQL needs to be run by hand.

## 2. Get the code and build it (SSH)

Enable SSH for your account in the alwaysdata admin (**Remote access > SSH**), then:

```bash
ssh <account>@ssh-<account>.alwaysdata.net
git clone https://github.com/adichris/university-compass.git ~/university-compass
cd ~/university-compass
bash scripts/deploy-alwaysdata.sh     # npm ci + build (run it again for every update)
```

Next.js 16 needs Node.js 20.9 or newer. The Node version chosen on the site's settings page only applies to the
running site; SSH sessions use the account default (**Environment > Node.js**), which may be older. The deploy script
sets `NODEJS_VERSION=24` for the build, so either way the build uses Node 24.

Variables starting with `NEXT_PUBLIC_` are built into the site, so put the site address in a file the build reads
(it is git-ignored and stays on the server):

```bash
echo "NEXT_PUBLIC_SITE_URL=https://<your-domain>" > ~/university-compass/.env.production
```

> Build on the server, not on Windows: the bundle includes native binaries (for the optional SQLite driver) built for
> the machine that ran the build.

## 3. Create the site

**Web > Sites > Add a site**

| Field | Value |
| --- | --- |
| Address | `<account>.alwaysdata.net` (or your own domain) |
| Type | Node.js |
| Command | `node /home/<account>/university-compass/scripts/start-alwaysdata.mjs` |
| Working directory | `/home/<account>/university-compass` |
| Environment | see below |

Environment variables (one per line):

```
DATABASE_URL=postgresql://<db_user>:<password>@postgresql-<account>.alwaysdata.net:5432/<database>
NEXT_PUBLIC_SITE_URL=https://<account>.alwaysdata.net
STATS_SALT=<any random text>
CRG_KEY=<CheckResultGH key ID, crg_test_… or crg_live_…>
CRG_SECRET=<CheckResultGH secret, crs_…>
```

`CRG_KEY` and `CRG_SECRET` connect the admin dashboard's **Checkers** tab to your CheckResultGH Partners
wallet. Start with a test key; switch to the live key once a test purchase works. They are only read on the
server and are never sent to visitors.

The admin dashboard password is set over SSH, not here - see "Admin dashboard" below.

If the password contains characters such as `@`, `:`, `/` or `#`, percent-encode them in the URL (e.g. `@` becomes
`%40`). Keep `DATABASE_URL` only in the site's environment settings, never in the repository.

alwaysdata gives the app its address in `IP`/`HOST` and its port in `PORT`. `start-alwaysdata.mjs` passes these on
to the Next.js server. The app keeps up to 5 database connections open (`DATABASE_POOL_SIZE` changes this);
alwaysdata allows 50 per user.

## 4. Updating

```bash
ssh <account>@ssh-<account>.alwaysdata.net
cd ~/university-compass && bash scripts/deploy-alwaysdata.sh
```

Then restart the site in the admin. University and scholarship data is compiled in at build time, so merging a
weekly data-refresh PR on GitHub needs a deploy to go live.

## Admin dashboard

Turn it on by generating a password over SSH:

```bash
cd ~/university-compass && node scripts/admin-password.mjs
```

It prints a new random password once - copy it into your password manager. Only a hash is stored (in
`data/local/admin.json`, ignored by git). Run the same command any time to change it; that also signs out every
open dashboard session. `--choose` lets you type your own password instead, and `--disable` turns the dashboard off.

Then sign in at `/admin` to:

- **Statistics**: anonymous page views, daily visitors, admission checks, donation and support clicks.
- **Institutions**: edit any institution's name, website, admissions link, fees and description; set verified
  cut-offs; hide an institution or programme. Edits are saved on the server in `data/local/overrides.json`
  (ignored by git, so `git pull` never touches them).
- **Checkers**: sell WASSCE/BECE checkers from your CheckResultGH wallet (e.g. after a customer pays you by
  MoMo), look up any past order and its PINs by reference, and copy a ready-made message for the customer. Live
  orders ask for confirmation. PINs are not stored on the site. Customers can also buy on their own with the
  short code shown on the results page (`CHECKERS` in `src/lib/site.ts`).
- **Jobs**: run on the server in the background, with a live log:
  - *Apply changes* rebuilds the site with your edits.
  - *Refresh GTEC data* re-crawls GTEC's register into `data/local/` (30-40 minutes), then rebuilds.
  - *Deploy latest code* does the same as `deploy-alwaysdata.sh`.

Every rebuild is made in `.next-build` and only swapped in if it succeeds, so the site keeps running during the
build and a failed build changes nothing. Afterwards the job stops the running server (its PID is in
`data/local/server.pid`) and alwaysdata starts the new build on the next request. If the site doesn't come back
within a minute, restart it in the alwaysdata admin.

The first *Refresh GTEC data* run sets up the scraper's Python environment in `scraper/.venv` automatically.
Building while the site runs uses more memory; if a job's log ends with `Killed`, run it again at a quiet time or
deploy over SSH with the site stopped.

## Backups

alwaysdata's own backups cover your databases (check the retention on your plan). For an extra copy over SSH:

```bash
pg_dump -h postgresql-<account>.alwaysdata.net -U <db_user> <database> > ~/university-compass-$(date +%F).sql
```

## If the build runs out of memory

The deploy script builds with a single page-generation worker (`NEXT_BUILD_CPUS=1`), because the default of one
worker per CPU gets killed (`SIGKILL`) on shared hosting. It compiles and generates pages in two separate
processes, which lowers the peak, and institution pages are rendered on their first visit and then cached.
It also reuses the compile cache from the previous build, so a deploy compiles only what changed (the first
build after a fresh clone, or after deleting `.next`, is a full compile and needs the most memory).

If the log still ends with `Killed` (exit 137), try these in order:

1. Stop the site in the alwaysdata dashboard (**Web > Sites > Stop**) while it builds, because the running site
   counts against the same memory limit. Start it again after the build.
2. Cap the build's heap: `BUILD_MAX_HEAP_MB=512 bash scripts/deploy-alwaysdata.sh`.
3. Build on a Linux machine instead (for example a GitHub Actions `ubuntu-latest` job running
   `npm ci && npm run build:standalone`), then copy the project folder, including `.next/standalone`, to
   `~/university-compass` with `rsync` over SSH.

## Using a SQLite file instead

To skip PostgreSQL, point `DATABASE_URL` at a file outside the code folder (so deploys never touch it):

```
DATABASE_URL=file:/home/<account>/data/university-compass.db
```

Create the folder first with `mkdir -p ~/data`. The same tables are created automatically.
