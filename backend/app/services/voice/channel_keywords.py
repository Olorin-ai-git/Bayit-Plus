"""
Channel Voice Keywords
Detects bare channel references like "Channel 13" or "channel thirteen"
and normalizes number words to digits for LiveChannel lookup.
Supports 3 input languages (he, en, es).
"""

import re

# English-only number words. Hebrew/Spanish STT engines (Google, Whisper)
# output digits directly for channel numbers, so word maps are not needed.
_NUMBER_WORDS_EN = {
    "one": "1", "two": "2", "three": "3", "four": "4", "five": "5",
    "six": "6", "seven": "7", "eight": "8", "nine": "9", "ten": "10",
    "eleven": "11", "twelve": "12", "thirteen": "13", "fourteen": "14",
    "fifteen": "15", "sixteen": "16", "seventeen": "17", "eighteen": "18",
    "nineteen": "19", "twenty": "20",
}

# Regex matching bare channel references in 3 languages:
# en: "channel 13", "switch to channel thirteen"
# he: "ערוץ 13", "עבור לערוץ 13"
# es: "canal 13", "cambiar a canal 13"
# \b before channel/canal prevents matching substrings like "rechannel".
_CHANNEL_REQUEST_RE = re.compile(
    r"(?:switch\s+to\s+|go\s+to\s+|tune\s+to\s+|put\s+on\s+|עבור\s+ל|cambiar?\s+a\s+)?"
    r"\b(?:channel|ערוץ|canal)\s+"
    r"(\d+|" + "|".join(_NUMBER_WORDS_EN.keys()) + r")",
    re.IGNORECASE,
)


def normalize_number_words(text: str) -> str:
    """Replace English number words with digit equivalents."""
    result = text
    for word, digit in sorted(_NUMBER_WORDS_EN.items(), key=lambda x: len(x[0]), reverse=True):
        result = re.sub(rf"\b{word}\b", digit, result, flags=re.IGNORECASE)
    return result


def is_channel_request(transcript: str) -> bool:
    """Return True when the transcript is a bare channel reference."""
    return _CHANNEL_REQUEST_RE.search(transcript) is not None
