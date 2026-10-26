"""Command line entry point.

    python -m uc_scraper crawl            fetch changed sources -> data/pending/<date>.json
    python -m uc_scraper review           approve/reject pending proposals interactively
    python -m uc_scraper apply --min 0.9  apply high-confidence proposals without prompts (CI opens a PR for review)
    python -m uc_scraper gtec             snapshot GTEC's register of accredited institutions + programmes
    python -m uc_scraper build            turn the GTEC snapshot into app data (data/generated/)
"""

from __future__ import annotations

import argparse
import json
from datetime import date
from pathlib import Path

import yaml

from .fetch import Fetcher
from .parsers import linked_pdfs, page_text, parse_cutoffs, parse_deadlines

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data"
PENDING = DATA / "pending"
# Server-side, git-ignored data written by admin dashboard jobs.
LOCAL = DATA / "local"
STATE = Path(__file__).resolve().parent.parent / "state.json"
SOURCES = Path(__file__).resolve().parent.parent / "sources.yaml"


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def save_json(path: Path, value) -> None:
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def known_programmes(university: str) -> dict[str, str]:
    templates = load_json(DATA / "programme-templates.json")
    offerings = load_json(DATA / "offerings.json").get(university, {})
    out = {}
    for key, value in offerings.items():
        name = value.get("name") if isinstance(value, dict) else None
        out[f"{university}-{key}"] = name or templates[key]["name"]
    return out


def crawl(args) -> None:
    config = yaml.safe_load(SOURCES.read_text(encoding="utf-8"))
    state = load_json(STATE) if STATE.exists() else {}
    fetcher = Fetcher(config["user_agent"], config.get("delay_seconds", 5))
    proposals, changed = [], []

    for src in config["sources"]:
        if args.only and src["id"] not in args.only:
            continue
        print(f"[{src['id']}] {src['url']}")
        page = fetcher.get(src["url"])
        if not page:
            continue
        pages = [page]
        if src.get("follow_pdfs"):
            pages += [p for p in (fetcher.get(u) for u in linked_pdfs(page)) if p]

        for pg in pages:
            if state.get(pg.url) == pg.fingerprint and not args.force:
                print(f"  unchanged: {pg.url}")
                continue
            state[pg.url] = pg.fingerprint
            changed.append({"source": src["id"], "url": pg.url})
            if src["kind"] == "watch":
                continue
            text = page_text(pg)
            if src["kind"] == "cutoffs":
                for p in parse_cutoffs(text, known_programmes(src["university"])):
                    proposals.append({"type": "cutoff", "source": pg.url, **p})
            elif src["kind"] == "scholarship":
                for d in parse_deadlines(text)[:1]:
                    proposals.append({"type": "deadline", "scholarship_id": src["scholarship"], "source": pg.url, "confidence": 0.8, **d})

    save_json(STATE, state)
    PENDING.mkdir(exist_ok=True)
    out = PENDING / f"{date.today().isoformat()}.json"
    existing = load_json(out) if out.exists() else {"proposals": [], "changed": []}
    existing["proposals"] += proposals
    existing["changed"] += changed
    save_json(out, existing)
    print(f"\n{len(changed)} changed page(s), {len(proposals)} proposal(s) -> {out.relative_to(ROOT)}")


def _apply_cutoff(offerings: dict, p: dict) -> str:
    uni, _, key = p["programme_id"].partition("-")
    current = offerings[uni][key]
    entry = current if isinstance(current, dict) else {"cutoff": current}
    old = entry.get("cutoff")
    if old is not None and old != p["cutoff"]:
        entry.setdefault("history", {})[str(date.today().year - 1)] = old
    entry.update(cutoff=p["cutoff"], source=p["source"], verified=True, lastChecked=date.today().isoformat())
    offerings[uni][key] = entry
    return f"{p['programme_id']}: {old} -> {p['cutoff']}"


def _apply_deadline(scholarships: list, p: dict) -> str:
    s = next(x for x in scholarships if x["id"] == p["scholarship_id"])
    d = date.fromisoformat(p["date"])
    s["deadlineMonth"] = d.month
    s["deadlineWindow"] = f"{d.strftime('%d %B %Y').lstrip('0')} (from official page, checked {date.today().isoformat()})"
    return f"{s['id']}: deadline {p['date']}"


def _pending_files():
    return sorted(PENDING.glob("*.json")) if PENDING.exists() else []


def apply_proposals(decide) -> None:
    offerings = load_json(DATA / "offerings.json")
    scholarships = load_json(DATA / "scholarships.json")
    applied = 0
    for f in _pending_files():
        batch = load_json(f)
        remaining = []
        for p in batch["proposals"]:
            verdict = decide(p, offerings, scholarships)
            if verdict == "apply":
                msg = _apply_cutoff(offerings, p) if p["type"] == "cutoff" else _apply_deadline(scholarships, p)
                print(f"  applied {msg}")
                applied += 1
            elif verdict == "keep":
                remaining.append(p)
        if remaining:
            batch["proposals"] = remaining
            save_json(f, batch)
        else:
            f.unlink()
    save_json(DATA / "offerings.json", offerings)
    save_json(DATA / "scholarships.json", scholarships)
    print(f"{applied} change(s) applied. Run `npm test` before committing.")


def review(_args) -> None:
    def decide(p, offerings, scholarships):
        if p["type"] == "cutoff":
            uni, _, key = p["programme_id"].partition("-")
            cur = offerings[uni][key]
            cur = cur.get("cutoff") if isinstance(cur, dict) else cur
            print(f"\n{p['programme_id']}  current={cur}  proposed={p['cutoff']}  confidence={p['confidence']}")
        else:
            print(f"\n{p['scholarship_id']}  proposed deadline={p['date']}")
        print(f"  evidence: {p['evidence']}\n  source:   {p['source']}")
        while True:
            ans = input("  [a]pply / [r]eject / [s]kip / [e]dit value? ").strip().lower()
            if ans in ("a", "r", "s"):
                return {"a": "apply", "r": "reject", "s": "keep"}[ans]
            if ans == "e":
                val = input("  new value: ").strip()
                if p["type"] == "cutoff" and val.isdigit():
                    p["cutoff"] = int(val)
                elif p["type"] == "deadline":
                    p["date"] = val
                return "apply"

    apply_proposals(decide)


def apply_cmd(args) -> None:
    apply_proposals(lambda p, *_: "apply" if p.get("confidence", 0) >= args.min else "keep")


def gtec_cmd(args) -> None:
    from .gtec import crawl as crawl_gtec

    config = yaml.safe_load(SOURCES.read_text(encoding="utf-8"))
    only = {int(x) for x in args.only} if args.only else None
    out = crawl_gtec(
        config["user_agent"], delay=args.delay, with_programmes=not args.no_programmes,
        only_ids=only, missing_only=args.missing,
        **({"out": LOCAL / "gtec" / "register.json"} if args.local else {}),
    )
    print(f"Snapshot written to {out.relative_to(ROOT)}")


def build_cmd(args) -> None:
    from .build import build

    if args.local:
        local_register = LOCAL / "gtec" / "register.json"
        build(local_register if local_register.exists() else DATA / "gtec" / "register.json", LOCAL / "generated")
    else:
        build()


def main() -> None:
    parser = argparse.ArgumentParser(prog="uc_scraper")
    sub = parser.add_subparsers(dest="cmd", required=True)
    c = sub.add_parser("crawl", help="fetch sources and write proposals")
    c.add_argument("--only", nargs="*", help="source ids to fetch")
    c.add_argument("--force", action="store_true", help="parse even if a page is unchanged")
    c.set_defaults(func=crawl)
    r = sub.add_parser("review", help="interactively approve proposals")
    r.set_defaults(func=review)
    a = sub.add_parser("apply", help="apply proposals above a confidence threshold")
    a.add_argument("--min", type=float, default=0.9)
    a.set_defaults(func=apply_cmd)
    g = sub.add_parser("gtec", help="snapshot the GTEC accredited institutions register")
    g.add_argument("--no-programmes", action="store_true", help="only refresh the institution list")
    g.add_argument("--only", nargs="*", help="GTEC institution ids whose programmes to refresh")
    g.add_argument("--delay", type=float, default=1.5, help="seconds between requests")
    g.add_argument("--missing", action="store_true", help="only fetch institutions whose programme list is incomplete")
    g.add_argument("--local", action="store_true", help="write to data/local/gtec/ (server-side, git-ignored)")
    g.set_defaults(func=gtec_cmd)
    b = sub.add_parser("build", help="generate app data from the GTEC snapshot")
    b.add_argument("--local", action="store_true", help="read data/local/gtec/ and write data/local/generated/")
    b.set_defaults(func=build_cmd)
    args = parser.parse_args()
    args.func(args)
