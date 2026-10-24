# Deploying to alwaysdata (Node.js + SQLite)

alwaysdata runs the app as a normal, always-on Node.js process on a persistent disk, so the built-in SQLite
database works with no extra service. The app is built in "standalone" mode, a self-contained server of about 40 MB.

## 1. Create the database folder and get the code (SSH)

Enable SSH for your account in the alwaysdata admin (**Remote access > SSH**), then:

```bash
ssh <account>@ssh-<account>.alwaysdata.net
mkdir -p ~/data                       # SQLite lives here, outside the code folder, so deploys never touch it
git clone https://github.com/adichris/university-compass.git ~/campuscompass
cd ~/campuscompass
bash scripts/deploy-alwaysdata.sh     # npm ci + build (run it again for every update)
```

Pick Node.js 20 or newer under **Environment > Node.js** first (Next.js 16 needs >= 20.9).

> Build on the server, not on Windows: the SQLite driver includes a native binary for the machine that built it.

## 2. Create the site

**Web > Sites > Add a site**

| Field | Value |
| --- | --- |
| Address | `<account>.alwaysdata.net` (or your own domain) |
| Type | Node.js |
| Command | `node /home/<account>/campuscompass/scripts/start-alwaysdata.mjs` |
| Working directory | `/home/<account>/campuscompass` |
| Environment | see below |

Environment variables (one per line):

```
DATABASE_URL=file:/home/<account>/data/campuscompass.db
NEXT_PUBLIC_SITE_URL=https://<account>.alwaysdata.net
```

alwaysdata gives the app its address in `IP`/`HOST` and its port in `PORT`. `start-alwaysdata.mjs` passes these on
to the Next.js server. The database tables are created automatically on the first request.

## 3. Updating

```bash
ssh <account>@ssh-<account>.alwaysdata.net
cd ~/campuscompass && bash scripts/deploy-alwaysdata.sh
```

Then restart the site in the admin. University and scholarship data is compiled in at build time, so merging a
weekly data-refresh PR on GitHub needs a deploy to go live.

## Backups

alwaysdata keeps daily backups of your files, and that includes `~/data`. For an extra copy while the app is running:

```bash
sqlite3 ~/data/campuscompass.db ".backup '/home/<account>/data/backup-$(date +%F).db'"
```

## If the build runs out of memory

`next build` can need more memory than the smallest plans allow. If the build is killed, build on a Linux machine
instead (for example a GitHub Actions `ubuntu-latest` job running `npm ci && npm run build:standalone`), then
copy the project folder, including `.next/standalone`, to `~/campuscompass` with `rsync` over SSH.

## Using PostgreSQL instead

alwaysdata also offers managed PostgreSQL, but this app's data layer uses SQLite/libSQL. Switching would mean a
`pg` driver and small SQL changes (placeholders, `AUTOINCREMENT`, `ON CONFLICT` upserts). For this app's traffic
(accounts, saved lists, anonymous reports), SQLite on alwaysdata's disk is enough.
