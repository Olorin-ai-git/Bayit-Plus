"""Parse YouTube chapter timestamps from a video description.

Implements YouTube's own chapter rules so we produce the same chapter bar
trainees see on YouTube itself:

1. Minimum 3 timestamps
2. First timestamp must be 0:00
3. Timestamps must be strictly ascending
4. Each chapter must be >= 10 seconds long
5. Timestamp must be at the start of a line (inline timestamps are ignored)

Pure function -- no I/O, no network, no mutation. Used by the Data API and
yt-dlp chapter paths to normalize a description string into the same
chapter list structure the extraction service persists.
"""
import re
from typing import Optional

# Matches H:MM:SS or M:SS at the start of a line, followed by whitespace
# and a title (captured as group 4). Anchored with re.MULTILINE.
_CHAPTER_LINE_RE = re.compile(
    r"^\s*(?:(\d+):)?(\d{1,2}):(\d{2})\s+(.+?)\s*$",
    re.MULTILINE,
)

_MIN_CHAPTER_COUNT = 3
_MIN_CHAPTER_DURATION_SECONDS = 10.0


def _parse_timestamp(hours: Optional[str], minutes: str, seconds: str) -> float:
    h = int(hours) if hours else 0
    m = int(minutes)
    s = int(seconds)
    return float(h * 3600 + m * 60 + s)


def parse_chapters_from_description(
    description: Optional[str],
    duration_seconds: float,
) -> list[dict]:
    """Parse chapter list from a YouTube video description.

    Returns a list of ``{"start_time": float, "end_time": float, "title": str}``
    entries matching the contract of ``fetch_native_chapters_via_ytdlp``. Returns
    an empty list if the description does not satisfy YouTube's chapter rules.
    """
    if not description:
        return []

    matches = list(_CHAPTER_LINE_RE.finditer(description))
    if len(matches) < _MIN_CHAPTER_COUNT:
        return []

    entries: list[dict] = []
    for match in matches:
        start = _parse_timestamp(match.group(1), match.group(2), match.group(3))
        title = match.group(4).strip()
        entries.append({"start_time": start, "title": title})

    # Rule 2: first timestamp must be exactly 0:00
    if entries[0]["start_time"] != 0.0:
        return []

    # Rule 3: strictly ascending
    for a, b in zip(entries, entries[1:]):
        if b["start_time"] <= a["start_time"]:
            return []

    # Attach end_time: next chapter's start, or duration for the last one
    for i, entry in enumerate(entries):
        if i == len(entries) - 1:
            entry["end_time"] = duration_seconds
        else:
            entry["end_time"] = entries[i + 1]["start_time"]

    # Rule 4: every chapter must be at least 10 seconds
    for entry in entries:
        if entry["end_time"] - entry["start_time"] < _MIN_CHAPTER_DURATION_SECONDS:
            return []

    return entries
