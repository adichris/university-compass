"""Crawl the Ghana Tertiary Education Commission's public register of accredited institutions.

GTEC publishes, per category, a table of institutions (name, location, status) and, per institution,
a table of accredited programmes (award, programme, status, accreditation dates). Both are plain
server-rendered HTML, paginated 10 rows at a time with `pg=N`.

Output: data/gtec/register.json - a raw, dated snapshot. `build.py` turns it into app data.
"""

from __future__ import annotations

import html
import json
import re
from datetime import date
from pathlib import Path
from urllib.parse import quote_plus

from .fetch import Fetcher

BASE = "https://gtec.edu.gh"
OUT = Path(__file__).resolve().parents[2] / "data" / "gtec" / "register.json"

# Categories relevant to students choosing where to study after SHS (or for postgraduate study).
# Tutorial colleges and registered foreign institutions are skipped.
CATEGORIES = [
    "Traditional University",
    "Public Technical University",
    "Public Degree Awarding and Professional Institution",
    "Chartered Private Tertiary Institution",
    "Private University",
    "Private Tertiary Institutions Offering HND/Degree Programmes",
    "Private Polytechnic",
    "Public College of Education",
    "Private College of Education",
    "Public Nurses/Health Training College",
    "Private Nurses/Health Training College",
    "College of Agriculture",
    "Regionally-Owned (West Africa) Tertiary Institution",
    "Distance Learning Institution",
]

INST_ROW = re.compile(
    r'<tr>\s*<td>\s*<a href="https://gtec\.edu\.gh/programmes/\?institutionId=(\d+)">\s*(.*?)\s*</a>\s*</td>'
    r"\s*<td>(.*?)</td>\s*<td>(.*?)</td>",
    re.S,
)
PROG_ROW = re.compile(
    r"<tr>\s*<td>\d+</td>\s*<td>(.*?)</td>\s*<td>(.*?)</td>\s*<td>(.*?)</td>\s*<td>(.*?)</td>"
    r"\s*<td>(.*?)</td>\s*<td>(.*?)</td>\s*</tr>",
    re.S,
)
LAST_PAGE = re.compile(r"pg=(\d+)")


def _clean(s: str) -> str:
    return " ".join(html.unescape(re.sub(r"<[^>]+>", " ", s)).split())


class FetchFailed(Exception):
    """A page of a GTEC table could not be fetched, so the table would be incomplete."""


def _pages(fetcher: Fetcher, first_url: str, row_re: re.Pattern) -> list:
    """All regex matches across every page of a paginated GTEC table. Raises if any page fails."""
    page = fetcher.get(first_url)
    if not page:
        raise FetchFailed(first_url)
    text = page.text
    last = max([int(n) for n in LAST_PAGE.findall(text)] or [1])
    rows = row_re.findall(text)
    for n in range(2, last + 1):
        p = fetcher.get(f"{first_url}&pg={n}")
        if not p:
            raise FetchFailed(f"{first_url}&pg={n}")
        rows += row_re.findall(p.text)
    return rows


def crawl_institutions(fetcher: Fetcher) -> list[dict]:
    seen: dict[str, dict] = {}
    for cat in CATEGORIES:
        url = f"{BASE}/institutions/?category={quote_plus(cat)}"
        count = 0
        for gid, name, location, status in _pages(fetcher, url, INST_ROW):
            seen.setdefault(gid, {
                "gtecId": int(gid),
                "name": _clean(name),
                "location": _clean(location),
                "status": _clean(status),
                "category": cat,
            })
            count += 1
        print(f"  {cat}: {count}")
    return list(seen.values())


def crawl_programmes(fetcher: Fetcher, gtec_id: int) -> list[dict]:
    url = f"{BASE}/programmes/?institutionId={gtec_id}"
    out = []
    for award, name, _duration, status, start, end in _pages(fetcher, url, PROG_ROW):
        # The "Duration" column is the accreditation period, not the course length, so it is not kept.
        out.append({
            "award": _clean(award),
            "name": _clean(name),
            "status": _clean(status),
            "accreditedFrom": _clean(start),
            "accreditedTo": _clean(end),
        })
    return out


def _save(institutions: list[dict]) -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    snapshot = {
        "source": f"{BASE}/institutional-categories/",
        "fetched": date.today().isoformat(),
        "institutions": sorted(institutions, key=lambda x: (x["category"], x["name"])),
    }
    OUT.write_text(json.dumps(snapshot, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")


def crawl(
    user_agent: str,
    delay: float = 2.0,
    with_programmes: bool = True,
    only_ids: set[int] | None = None,
    missing_only: bool = False,
) -> Path:
    """Snapshot the register. Progress is saved after every institution, so an interrupted run loses
    nothing; `missing_only` then fetches just the institutions whose programme list is incomplete."""
    fetcher = Fetcher(user_agent, delay)
    previous = json.loads(OUT.read_text(encoding="utf-8")) if OUT.exists() else {"institutions": []}
    old = {i["gtecId"]: i for i in previous["institutions"]}

    print("Institutions:")
    try:
        institutions = crawl_institutions(fetcher)
    except FetchFailed as exc:
        if not old:
            raise
        print(f"  could not refresh the institution list ({exc}); reusing the previous one")
        institutions = [{k: v for k, v in i.items() if k not in ("programmes", "programmesComplete")} for i in old.values()]

    for inst in institutions:
        prev = old.get(inst["gtecId"], {})
        inst["programmes"] = prev.get("programmes") or []
        inst["programmesComplete"] = prev.get("programmesComplete", False)

    if with_programmes:
        todo = [
            inst for inst in institutions
            if (not only_ids or inst["gtecId"] in only_ids) and not (missing_only and inst["programmesComplete"])
        ]
        print(f"Programmes for {len(todo)} of {len(institutions)} institutions:")
        failed = 0
        for i, inst in enumerate(todo, 1):
            try:
                inst["programmes"] = crawl_programmes(fetcher, inst["gtecId"])
                inst["programmesComplete"] = True
                print(f"  [{i}/{len(todo)}] {inst['name']}: {len(inst['programmes'])}")
            except FetchFailed as exc:
                failed += 1
                # Keep what we had before rather than replacing it with a partial list.
                print(f"  [{i}/{len(todo)}] {inst['name']}: FAILED ({exc}) - kept previous data")
            _save(institutions)
        if failed:
            print(f"{failed} institution(s) incomplete - rerun with --missing to fetch only those.")
    _save(institutions)
    return OUT
