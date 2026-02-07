"""
Podcast, Radio & Audiobook Voice Keywords
Detects bare references like "podcast Kan", "radio Galatz", "audiobook Harry Potter"
and routes them to PLAYBACK intent instead of NAVIGATION or CHAT.
Supports 3 input languages (he, en, es).
"""

import re

# ^-anchored with optional prefixes to prevent false positives on
# conversational sentences like "I like this podcast a lot".
# Unlike _CHANNEL_REQUEST_RE (which is safe unanchored because its capture
# group only matches digits/number-words), the .{3,} capture here is
# permissive, so anchoring is required.
_PODCAST_RE = re.compile(
    r"^(?:listen\s+to\s+|put\s+on\s+|"
    r"tune\s+(?:in\s+)?to\s+|"
    r"\u05ea\u05e9\u05de\u05e2\s+|\u05d4\u05e7\u05e9\u05d1\s+\u05dc|"
    r"escuchar?\s+)?"
    r"\b(?:podcast|\u05e4\u05d5\u05d3\u05e7\u05d0\u05e1\u05d8)\s+"
    r"(.{3,})",
    re.IGNORECASE,
)

_RADIO_RE = re.compile(
    r"^(?:listen\s+to\s+|put\s+on\s+|"
    r"tune\s+(?:in\s+)?to\s+|"
    r"\u05ea\u05e9\u05de\u05e2\s+|\u05d4\u05e7\u05e9\u05d1\s+\u05dc|"
    r"escuchar?\s+)?"
    r"\b(?:radio|\u05e8\u05d3\u05d9\u05d5)\s+"
    r"(.{3,})",
    re.IGNORECASE,
)

_AUDIOBOOK_RE = re.compile(
    r"^(?:listen\s+to\s+|put\s+on\s+|read\s+(?:me\s+)?"
    r"|tune\s+(?:in\s+)?to\s+|"
    r"\u05ea\u05e9\u05de\u05e2\s+|\u05d4\u05e7\u05e9\u05d1\s+\u05dc|"
    r"\u05ea\u05e7\u05e8\u05d0\s+\u05dc\u05d9\s+|"
    r"escuchar?\s+|leer?\s+)?"
    r"\b(?:audiobook|audio\s+book"
    r"|\u05e1\u05e4\u05e8\s+\u05e9\u05de\u05e2"
    r"|audiolibro)\s+"
    r"(.{3,})",
    re.IGNORECASE,
)


def is_podcast_request(transcript: str) -> bool:
    """Return True when the transcript is a bare podcast reference with a name."""
    return _PODCAST_RE.search(transcript) is not None


def is_radio_request(transcript: str) -> bool:
    """Return True when the transcript is a bare radio reference with a name."""
    return _RADIO_RE.search(transcript) is not None


def is_audiobook_request(transcript: str) -> bool:
    """Return True when the transcript is a bare audiobook reference with a name."""
    return _AUDIOBOOK_RE.search(transcript) is not None
