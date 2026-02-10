from __future__ import annotations

import os
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class PostSummary:
    id: str
    title: str
    date_path: str  # e.g. 2026/February/10


@dataclass(frozen=True)
class PostDetail:
    id: str
    title: str
    date_path: str
    markdown: str


def _safe_rel_id(content_root: Path, entry_dir: Path) -> str:
    rel = entry_dir.resolve().relative_to(content_root.resolve())
    return rel.as_posix()


def _find_markdown_file(entry_dir: Path) -> Path | None:
    # one .md file per entry directory
    md_files = sorted([p for p in entry_dir.iterdir() if p.is_file() and p.suffix.lower() == ".md"])
    if len(md_files) != 1:
        return None
    return md_files[0]


def _extract_title(md_text: str, fallback: str) -> str:
    for line in md_text.splitlines():
        stripped = line.strip()
        if stripped.startswith("# "):
            return stripped[2:].strip() or fallback
        if stripped:
            break
    return fallback


def build_index(content_root: Path) -> dict[str, Any]:
    content_root = content_root.resolve()
    if not content_root.exists():
        return {"posts": []}

    posts: list[PostSummary] = []

    # Expect pattern like: <root>/2026/February/10/<entry-folder>/(single .md)
    for year_dir in sorted([p for p in content_root.iterdir() if p.is_dir()]):
        if not year_dir.name.isdigit():
            continue
        for month_dir in sorted([p for p in year_dir.iterdir() if p.is_dir()]):
            for day_dir in sorted([p for p in month_dir.iterdir() if p.is_dir()]):
                date_path = f"{year_dir.name}/{month_dir.name}/{day_dir.name}"
                for entry_dir in sorted([p for p in day_dir.iterdir() if p.is_dir()]):
                    md_path = _find_markdown_file(entry_dir)
                    if md_path is None:
                        continue
                    try:
                        md_text = md_path.read_text(encoding="utf-8")
                    except OSError:
                        continue
                    post_id = _safe_rel_id(content_root, entry_dir)
                    title = _extract_title(md_text, fallback=entry_dir.name)
                    posts.append(PostSummary(id=post_id, title=title, date_path=date_path))

    # Newest first by date_path then title (lexicographic works with zero-padded day if desired)
    posts.sort(key=lambda p: (p.date_path, p.title), reverse=True)

    return {"posts": [p.__dict__ for p in posts]}


def load_post(content_root: Path, post_id: str) -> PostDetail | None:
    content_root = content_root.resolve()
    # prevent path traversal
    candidate = (content_root / post_id).resolve()
    try:
        candidate.relative_to(content_root)
    except ValueError:
        return None

    if not candidate.exists() or not candidate.is_dir():
        return None

    md_path = _find_markdown_file(candidate)
    if md_path is None:
        return None

    try:
        md_text = md_path.read_text(encoding="utf-8")
    except OSError:
        return None

    # derive date_path from parent folders: year/month/day
    parts = candidate.relative_to(content_root).parts
    date_path = "/".join(parts[:3]) if len(parts) >= 3 else ""
    title = _extract_title(md_text, fallback=candidate.name)

    return PostDetail(id=post_id, title=title, date_path=date_path, markdown=md_text)


class TTLCache:
    def __init__(self, ttl_seconds: int):
        self.ttl_seconds = ttl_seconds
        self._expires_at: float = 0.0
        self._value: Any | None = None

    def get(self) -> Any | None:
        now = time.time()
        if self._value is not None and now < self._expires_at:
            return self._value
        return None

    def set(self, value: Any) -> None:
        self._value = value
        self._expires_at = time.time() + self.ttl_seconds

    def clear(self) -> None:
        self._value = None
        self._expires_at = 0.0
