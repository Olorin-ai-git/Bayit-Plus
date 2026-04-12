"""Fetch YouTube native chapters from the public watch page HTML.

Cookie-free, no API key. The watch page embeds two JSON blobs:
``ytInitialData`` (the rendered UI tree, including
``macroMarkersListItemRenderer`` chapter entries and a
``macroMarkersListEntity`` heatmap) and ``ytInitialPlayerResponse`` (the
player config, normally containing ``videoDetails.lengthSeconds``).
Parsing these is equivalent to what yt-dlp does internally, minus
yt-dlp's bot-flagged request fingerprint that triggers the "Sign in to
confirm you're not a bot" wall on VPS IPs.

Duration extraction is two-tier because YouTube's bot-guard response
(issued to VPS-range IPs even for HTTP 200 watch page requests) ships a
degraded ``ytInitialPlayerResponse`` with ``playabilityStatus =
LOGIN_REQUIRED`` and no ``videoDetails``. The ``ytInitialData`` blob is
left intact, including chapter markers and the 100-bucket heatmap entity
whose last marker's ``startMillis + durationMillis`` equals the full
video length. We probe ``videoDetails.lengthSeconds`` first and fall
back to the heatmap when it is absent.
"""
import json
import logging
import re
from typing import Any, Optional

import httpx

from app.services.youtube_validator.url_parser import (
    extract_video_id,
    is_youtube_url,
)

logger = logging.getLogger(__name__)

_WATCH_URL_TEMPLATE = "https://www.youtube.com/watch?v={video_id}"
_BROWSER_USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/131.0.0.0 Safari/537.36"
)
_REQUEST_TIMEOUT_SECONDS = 10.0

_TIMESTAMP_RE = re.compile(r"^\s*(?:(\d+):)?(\d{1,2}):(\d{2})\s*$")

_DATA_MARKER = "var ytInitialData"
_PLAYER_MARKER = "var ytInitialPlayerResponse"

_MIN_CHAPTER_COUNT = 3
_MIN_CHAPTER_DURATION_SECONDS = 10.0


def _parse_timestamp(text: str) -> Optional[float]:
    if not text:
        return None
    match = _TIMESTAMP_RE.match(text)
    if not match:
        return None
    hours = int(match.group(1) or 0)
    minutes = int(match.group(2))
    seconds = int(match.group(3))
    return float(hours * 3600 + minutes * 60 + seconds)


def _parse_blob(html: str, marker: str) -> Optional[dict]:
    """Extract a JSON object that follows ``marker =`` using brace matching.

    Handles strings with escaped quotes and embedded braces correctly,
    which a non-greedy regex cannot do reliably against real YouTube HTML.
    """
    idx = html.find(marker)
    if idx == -1:
        return None
    brace_start = html.find("{", idx)
    if brace_start == -1:
        return None
    depth = 0
    in_string = False
    escape = False
    for i in range(brace_start, len(html)):
        ch = html[i]
        if in_string:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == '"':
                in_string = False
            continue
        if ch == '"':
            in_string = True
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                try:
                    return json.loads(html[brace_start : i + 1])
                except json.JSONDecodeError:
                    return None
    return None


def _walk_for_markers(obj: Any, acc: list[dict]) -> list[dict]:
    """Collect every ``macroMarkersListItemRenderer`` node in the tree."""
    if isinstance(obj, dict):
        node = obj.get("macroMarkersListItemRenderer")
        if isinstance(node, dict):
            acc.append(node)
        for value in obj.values():
            _walk_for_markers(value, acc)
    elif isinstance(obj, list):
        for item in obj:
            _walk_for_markers(item, acc)
    return acc


def _extract_title(node: dict) -> Optional[str]:
    title = node.get("title")
    if not isinstance(title, dict):
        return None
    simple = title.get("simpleText")
    if isinstance(simple, str):
        return simple
    runs = title.get("runs")
    if isinstance(runs, list):
        return "".join(r.get("text", "") for r in runs if isinstance(r, dict))
    return None


def _extract_time_text(node: dict) -> Optional[str]:
    time_desc = node.get("timeDescription")
    if not isinstance(time_desc, dict):
        return None
    simple = time_desc.get("simpleText")
    if isinstance(simple, str):
        return simple
    runs = time_desc.get("runs")
    if isinstance(runs, list):
        return "".join(r.get("text", "") for r in runs if isinstance(r, dict))
    return None


def _extract_duration_seconds(blob: Any) -> float:
    """Walk a parsed blob for ``videoDetails.lengthSeconds``."""
    def walk(obj: Any) -> Optional[float]:
        if isinstance(obj, dict):
            details = obj.get("videoDetails")
            if isinstance(details, dict):
                length = details.get("lengthSeconds")
                if length is not None:
                    try:
                        return float(length)
                    except (TypeError, ValueError):
                        return None
            for value in obj.values():
                found = walk(value)
                if found is not None:
                    return found
        elif isinstance(obj, list):
            for item in obj:
                found = walk(item)
                if found is not None:
                    return found
        return None

    return walk(blob) or 0.0


def _extract_duration_from_heatmap(blob: Any) -> float:
    """Fallback: derive duration from the heatmap marker list.

    YouTube's heatmap (``markerType`` ``MARKER_TYPE_HEATMAP``) covers the
    whole video in fixed-width buckets. The last marker's
    ``startMillis + durationMillis`` equals the full video length in
    milliseconds. Used when ``videoDetails.lengthSeconds`` is absent
    because YouTube served a bot-guarded player response.
    """
    def walk(obj: Any) -> Optional[float]:
        if isinstance(obj, dict):
            entity = obj.get("macroMarkersListEntity")
            if isinstance(entity, dict):
                markers_list = entity.get("markersList") or {}
                if (
                    isinstance(markers_list, dict)
                    and markers_list.get("markerType") == "MARKER_TYPE_HEATMAP"
                ):
                    markers = markers_list.get("markers") or []
                    if isinstance(markers, list) and markers:
                        last = markers[-1]
                        if isinstance(last, dict):
                            try:
                                start = int(last.get("startMillis", 0))
                                dur = int(last.get("durationMillis", 0))
                            except (TypeError, ValueError):
                                return None
                            total_ms = start + dur
                            if total_ms > 0:
                                return total_ms / 1000.0
            for value in obj.values():
                found = walk(value)
                if found is not None:
                    return found
        elif isinstance(obj, list):
            for item in obj:
                found = walk(item)
                if found is not None:
                    return found
        return None

    return walk(blob) or 0.0


def _build_chapter_entries(
    markers: list[dict], duration_seconds: float
) -> list[dict]:
    """Convert raw marker nodes to validated chapter entries.

    Returns [] when the chapter list fails any YouTube-shape rule: too
    few chapters, first not at 0, non-monotonic order, or any chapter
    shorter than ``_MIN_CHAPTER_DURATION_SECONDS``.
    """
    seen: set[tuple[float, str]] = set()
    entries: list[dict] = []
    for node in markers:
        title = _extract_title(node)
        time_text = _extract_time_text(node)
        if title is None or time_text is None:
            continue
        start = _parse_timestamp(time_text)
        if start is None:
            continue
        clean_title = title.strip()
        key = (start, clean_title)
        if key in seen:
            continue
        seen.add(key)
        entries.append({"start_time": start, "title": clean_title})

    entries.sort(key=lambda e: e["start_time"])

    if len(entries) < _MIN_CHAPTER_COUNT:
        return []
    if entries[0]["start_time"] != 0.0:
        return []
    for current, following in zip(entries, entries[1:]):
        if following["start_time"] <= current["start_time"]:
            return []

    for index, entry in enumerate(entries):
        entry["end_time"] = (
            duration_seconds
            if index == len(entries) - 1
            else entries[index + 1]["start_time"]
        )

    for entry in entries:
        if entry["end_time"] - entry["start_time"] < _MIN_CHAPTER_DURATION_SECONDS:
            return []
    return entries


async def fetch_native_chapters_via_html(
    video_url: str,
) -> tuple[list[dict], float]:
    """Fetch chapters + duration from the public YouTube watch page.

    Returns ``(chapters, duration_seconds)`` matching
    ``fetch_native_chapters_via_ytdlp`` so the caller can treat both as
    drop-in replacements. Returns ``([], 0.0)`` when the URL is not a
    YouTube URL, when the page has no parseable blobs, when the chapter
    list fails YouTube's shape rules, or when fewer than
    ``_MIN_CHAPTER_COUNT`` chapters are present.

    Raises on transport-level failure (``httpx`` errors, 5xx) so callers
    can fall through to the yt-dlp path.
    """
    if not is_youtube_url(video_url):
        return [], 0.0
    video_id = extract_video_id(video_url)
    if not video_id:
        return [], 0.0

    headers = {
        "User-Agent": _BROWSER_USER_AGENT,
        "Accept-Language": "en-US,en;q=0.9",
    }
    async with httpx.AsyncClient(
        timeout=_REQUEST_TIMEOUT_SECONDS,
        headers=headers,
        follow_redirects=True,
    ) as client:
        response = await client.get(
            _WATCH_URL_TEMPLATE.format(video_id=video_id)
        )
    response.raise_for_status()
    html = response.text

    data_blob = _parse_blob(html, _DATA_MARKER)
    player_blob = _parse_blob(html, _PLAYER_MARKER)
    if data_blob is None and player_blob is None:
        return [], 0.0

    duration_seconds = 0.0
    for blob in (player_blob, data_blob):
        if blob is None:
            continue
        found = _extract_duration_seconds(blob)
        if found > 0:
            duration_seconds = found
            break

    if duration_seconds == 0.0:
        for blob in (data_blob, player_blob):
            if blob is None:
                continue
            found = _extract_duration_from_heatmap(blob)
            if found > 0:
                duration_seconds = found
                break

    markers: list[dict] = []
    if data_blob is not None:
        _walk_for_markers(data_blob, markers)
    if not markers and player_blob is not None:
        _walk_for_markers(player_blob, markers)

    entries = _build_chapter_entries(markers, duration_seconds)
    return entries, duration_seconds
