"""Polite HTTP fetching: robots.txt, per-host rate limiting, on-disk cache and content fingerprints."""

from __future__ import annotations

import hashlib
import time
from dataclasses import dataclass
from pathlib import Path
from urllib import robotparser
from urllib.parse import urlparse

import requests

CACHE_DIR = Path(__file__).resolve().parent.parent / ".cache"


@dataclass
class Page:
    url: str
    content: bytes
    content_type: str
    fingerprint: str

    @property
    def is_pdf(self) -> bool:
        return "pdf" in self.content_type or self.url.lower().endswith(".pdf")

    @property
    def text(self) -> str:
        return self.content.decode("utf-8", errors="replace")


class Fetcher:
    def __init__(self, user_agent: str, delay_seconds: float = 5.0, timeout: float = 30.0):
        self.user_agent = user_agent
        self.delay = delay_seconds
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers["User-Agent"] = user_agent
        self._robots: dict[str, robotparser.RobotFileParser | None] = {}
        self._last_hit: dict[str, float] = {}
        CACHE_DIR.mkdir(exist_ok=True)

    def allowed(self, url: str) -> bool:
        host = urlparse(url)
        base = f"{host.scheme}://{host.netloc}"
        if base not in self._robots:
            rp = robotparser.RobotFileParser()
            try:
                resp = self.session.get(f"{base}/robots.txt", timeout=self.timeout)
                rp.parse(resp.text.splitlines() if resp.ok else [])
                self._robots[base] = rp
            except requests.RequestException:
                self._robots[base] = None  # unreachable robots.txt: treat as allowed, like most crawlers
        rp = self._robots[base]
        return True if rp is None else rp.can_fetch(self.user_agent, url)

    def _throttle(self, url: str) -> None:
        host = urlparse(url).netloc
        wait = self._last_hit.get(host, 0) + self.delay - time.monotonic()
        if wait > 0:
            time.sleep(wait)
        self._last_hit[host] = time.monotonic()

    def get(self, url: str) -> Page | None:
        if not self.allowed(url):
            print(f"  robots.txt disallows {url} - skipping")
            return None
        self._throttle(url)
        try:
            resp = self.session.get(url, timeout=self.timeout)
            resp.raise_for_status()
        except requests.RequestException as exc:
            print(f"  fetch failed for {url}: {exc}")
            return None
        content = resp.content
        fp = hashlib.sha256(content).hexdigest()
        (CACHE_DIR / f"{hashlib.sha1(url.encode()).hexdigest()}.bin").write_bytes(content)
        return Page(url=resp.url, content=content, content_type=resp.headers.get("Content-Type", ""), fingerprint=fp)
