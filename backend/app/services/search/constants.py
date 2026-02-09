"""
Search constants: stop words, language markers, and Unicode ranges.

Shared across pipeline stages for query analysis and normalization.
"""

# MongoDB English text index stop words.
# Used by query analyzer to identify meaningful terms.
ENGLISH_STOP_WORDS = frozenset({
    "a", "an", "and", "are", "as", "at", "be", "but", "by", "for",
    "if", "in", "into", "is", "it", "no", "not", "of", "on", "or",
    "such", "that", "the", "their", "then", "there", "these", "they",
    "this", "to", "was", "will", "with",
})

# Common Hebrew stop words (function words, particles, prepositions).
HEBREW_STOP_WORDS = frozenset({
    "\u05e9\u05dc",   # of (shel)
    "\u05d4\u05d5\u05d0",  # he (hu)
    "\u05d4\u05d9\u05d0",  # she (hi)
    "\u05d6\u05d4",   # this (ze)
    "\u05d6\u05d0\u05ea",  # this-f (zot)
    "\u05d0\u05ea",   # (et) direct object marker
    "\u05e2\u05dc",   # on (al)
    "\u05d0\u05dc",   # to (el)
    "\u05de\u05df",   # from (min)
    "\u05e2\u05dd",   # with (im)
    "\u05db\u05dc",   # all (kol)
    "\u05d0\u05d9\u05df",  # there-is-no (ein)
    "\u05d9\u05e9",   # there-is (yesh)
    "\u05d2\u05dd",   # also (gam)
    "\u05d0\u05d5",   # or (o)
    "\u05d0\u05d1\u05dc",  # but (aval)
    "\u05d0\u05dd",   # if (im)
    "\u05dc\u05d0",   # no (lo)
    "\u05db\u05d9",   # because (ki)
    "\u05d0\u05e0\u05d9",  # I (ani)
})

# Unicode ranges for language detection
HEBREW_RANGE_START = 0x0590
HEBREW_RANGE_END = 0x05FF

# Hebrew nikud (vowel points) range for stripping
NIKUD_RANGE_START = 0x05B0
NIKUD_RANGE_END = 0x05C5
