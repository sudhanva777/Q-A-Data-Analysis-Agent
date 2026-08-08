"""File-based cache for dataset profiling, validation, quality, and insights."""

import json
import os
from typing import Any, Optional

CACHE_DIR = os.path.join("logs", "cache")


def make_dataset_cache_key(path: str) -> str:
    """Build a cache key from dataset path, mtime, and size."""
    stat = os.stat(path)
    base = os.path.basename(path)
    return f"{base}_{stat.st_mtime_ns}_{stat.st_size}"


def _cache_path(key: str) -> str:
    safe = "".join(c if c.isalnum() or c in "._-" else "_" for c in key)
    return os.path.join(CACHE_DIR, f"{safe}.json")


def get_cached(key: str) -> Optional[dict[str, Any]]:
    """Return cached JSON payload or None if missing/invalid."""
    path = _cache_path(key)
    if not os.path.exists(path):
        return None
    try:
        with open(path, "r", encoding="utf-8") as handle:
            return json.load(handle)
    except (json.JSONDecodeError, OSError):
        return None


def set_cached(key: str, data: dict[str, Any]) -> None:
    """Persist JSON payload to cache."""
    os.makedirs(CACHE_DIR, exist_ok=True)
    path = _cache_path(key)
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(data, handle, default=str)


def invalidate_dataset(path: str) -> None:
    """Remove cache entries for a dataset basename (best-effort)."""
    if not os.path.isdir(CACHE_DIR):
        return
    base = os.path.basename(path)
    prefix = base.replace(".", "_")
    for filename in os.listdir(CACHE_DIR):
        if filename.startswith(base) or filename.startswith(prefix):
            try:
                os.remove(os.path.join(CACHE_DIR, filename))
            except OSError:
                pass
