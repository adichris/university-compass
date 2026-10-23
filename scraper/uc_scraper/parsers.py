"""Turn fetched pages into structured proposals.

Ghanaian admission data mostly lives in PDFs (brochures, cut-off lists) with irregular tables,
so parsing is deliberately forgiving: we look for lines containing a programme name we already
know plus a plausible aggregate (6-54), and let a human confirm every match during review.
"""

from __future__ import annotations

import io
import re
from datetime import date
from difflib import SequenceMatcher
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from .fetch import Page

AGGREGATE = re.compile(r"(?<!\d)([6-9]|[1-4]\d|5[0-4])(?!\d)")
MONTHS = {m: i for i, m in enumerate(
    ["january", "february", "march", "april", "may", "june", "july", "august",
     "september", "october", "november", "december"], start=1)}
DATE_PATTERNS = [
    re.compile(r"(\d{1,2})(?:st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December),?\s+(20\d\d)", re.I),
    re.compile(r"(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(20\d\d)", re.I),
]
DEADLINE_HINT = re.compile(r"deadline|closing date|closes|apply by|applications? (?:open|close)", re.I)


def page_text(page: Page) -> str:
    if page.is_pdf:
        import pdfplumber  # imported lazily: only needed for PDFs

        with pdfplumber.open(io.BytesIO(page.content)) as pdf:
            parts = []
            for p in pdf.pages:
                for table in p.extract_tables() or []:
                    parts.extend("  ".join(c or "" for c in row) for row in table)
                parts.append(p.extract_text() or "")
            return "\n".join(parts)
    soup = BeautifulSoup(page.content, "html.parser")
    for tag in soup(["script", "style", "nav", "footer"]):
        tag.decompose()
    return soup.get_text("\n")


def linked_pdfs(page: Page, keywords=("cut", "requirement", "brochure", "admission")) -> list[str]:
    if page.is_pdf:
        return []
    soup = BeautifulSoup(page.content, "html.parser")
    out = []
    for a in soup.find_all("a", href=True):
        href = a["href"]
        label = (a.get_text() + " " + href).lower()
        if href.lower().endswith(".pdf") and any(k in label for k in keywords):
            out.append(urljoin(page.url, href))
    return list(dict.fromkeys(out))[:10]


def _norm(s: str) -> str:
    s = s.lower()
    s = re.sub(r"\b(bsc|ba|b\.sc|b\.a|bed|b\.ed|llb|mbchb|bds|pharmd|hnd|doctor of|bachelor of|in|of|and|&)\b", " ", s)
    return " ".join(re.sub(r"[^a-z ]", " ", s).split())


def similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, _norm(a), _norm(b)).ratio()


def parse_cutoffs(text: str, known: dict[str, str], threshold: float = 0.72) -> list[dict]:
    """known: programme id -> programme name for one university. Returns proposals."""
    proposals: dict[str, dict] = {}
    for line in text.splitlines():
        line = " ".join(line.split())
        if len(line) < 6:
            continue
        numbers = [int(n) for n in AGGREGATE.findall(line)]
        if not numbers:
            continue
        label = AGGREGATE.sub("", line).strip(" -:|")
        best_id, best_score = None, 0.0
        for pid, name in known.items():
            score = similarity(label, name)
            if score > best_score:
                best_id, best_score = pid, score
        if best_id and best_score >= threshold:
            cutoff = min(numbers)  # regular-stream cut-off is usually the lowest figure on the line
            prev = proposals.get(best_id)
            if not prev or best_score > prev["confidence"]:
                proposals[best_id] = {"programme_id": best_id, "cutoff": cutoff, "evidence": line[:200], "confidence": round(best_score, 2)}
    return list(proposals.values())


def parse_deadlines(text: str, today: date | None = None) -> list[dict]:
    today = today or date.today()
    found = []
    lines = text.splitlines()
    for i, line in enumerate(lines):
        window = " ".join(lines[max(0, i - 1): i + 2])
        if not DEADLINE_HINT.search(window):
            continue
        for pat in DATE_PATTERNS:
            for m in pat.finditer(line):
                g = m.groups()
                day, month, year = (g[0], g[1], g[2]) if g[0].isdigit() else (g[1], g[0], g[2])
                try:
                    d = date(int(year), MONTHS[month.lower()], int(day))
                except ValueError:
                    continue
                if d >= today:
                    found.append({"date": d.isoformat(), "evidence": " ".join(window.split())[:200]})
    uniq = {f["date"]: f for f in found}
    return sorted(uniq.values(), key=lambda f: f["date"])
