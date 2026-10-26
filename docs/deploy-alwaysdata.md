# Deploying to alwaysdata (Node.js + PostgreSQL)

alwaysdata runs the app as a normal, always-on Node.js process. The app stores accounts, saved lists, outcome reports
and alert sign-ups in alwaysdata's managed **PostgreSQL** (a SQLite file also works; see the end of this guide).
It is built in "standalone" mode, a self-contained server of about 40 MB.

## 1. Create the PostgreSQL database

In the admin, go to **Databases > PostgreSQL** and create a database (e.g. `<account>_campuscompass`) and a user with
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
```

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

## Backups

alwaysdata's own backups cover your databases (check the retention on your plan). For an extra copy over SSH:

```bash
pg_dump -h postgresql-<account>.alwaysdata.net -U <db_user> <database> > ~/university-compass-$(date +%F).sql
```

## If the build runs out of memory

The deploy script builds with a single page-generation worker (`NEXT_BUILD_CPUS=1`), because the default of one
worker per CPU gets killed (`SIGKILL`) on shared hosting. If it is still killed, build on a Linux machine
instead (for example a GitHub Actions `ubuntu-latest` job running `npm ci && npm run build:standalone`), then
copy the project folder, including `.next/standalone`, to `~/university-compass` with `rsync` over SSH.

## Using a SQLite file instead

To skip PostgreSQL, point `DATABASE_URL` at a file outside the code folder (so deploys never touch it):

```
DATABASE_URL=file:/home/<account>/data/campuscompass.db
```

Create the folder first with `mkdir -p ~/data`. The same tables are created automatically.
