"""
Stage 1 - Query Analyzer: language detection, normalization, intent
classification, and fuzzy distance calculation.

Produces a QueryAnalysis consumed by subsequent pipeline stages.
"""

import unicodedata
from typing import List

from app.core.config import settings
from app.core.logging_config import get_logger
from app.services.search.constants import (
    ENGLISH_STOP_WORDS,
    HEBREW_RANGE_END,
    HEBREW_RANGE_START,
    HEBREW_STOP_WORDS,
    NIKUD_RANGE_END,
    NIKUD_RANGE_START,
)
from app.services.search.models import (
    DetectedLanguage,
    QueryAnalysis,
    SearchIntent,
)

logger = get_logger(__name__)

_PERSON_INDICATORS_HE = frozenset({
    "\u05e9\u05d7\u05e7\u05df",   # actor (sachkan)
    "\u05e9\u05d7\u05e7\u05e0\u05d9\u05ea",  # actress (sachkanit)
    "\u05d1\u05de\u05d0\u05d9",   # director (bamai)
    "\u05d1\u05d9\u05de\u05d5\u05d9",  # director (bimui)
})


class QueryAnalyzer:
    """Analyzes raw search queries for the search pipeline."""

    def __init__(self) -> None:
        self._config = settings.olorin.search_ranking

    def analyze(self, query: str) -> QueryAnalysis:
        """Produce a QueryAnalysis from a raw user query."""
        stripped = query.strip()
        if not stripped:
            return QueryAnalysis(
                original_query=query,
                normalized_query="",
                language=DetectedLanguage.ENGLISH,
                intent=SearchIntent.BROWSE,
                fuzzy_distance=0,
                meaningful_terms=[],
                is_empty=True,
            )

        normalized = self._normalize(stripped)
        language = self._detect_language(normalized)
        meaningful = self._extract_meaningful_terms(normalized, language)
        intent = self._classify_intent(stripped, meaningful, language)
        fuzzy = self._compute_fuzzy_distance(normalized)

        logger.debug(
            "Query analyzed",
            extra={
                "original": query,
                "normalized": normalized,
                "language": language.value,
                "intent": intent.value,
                "fuzzy_distance": fuzzy,
                "term_count": len(meaningful),
            },
        )

        return QueryAnalysis(
            original_query=query,
            normalized_query=normalized,
            language=language,
            intent=intent,
            fuzzy_distance=fuzzy,
            meaningful_terms=meaningful,
            is_empty=False,
        )

    # ------------------------------------------------------------------
    # Normalization
    # ------------------------------------------------------------------

    def _normalize(self, text: str) -> str:
        """Strip nikud, NFC-normalize, and lowercase."""
        without_nikud = "".join(
            ch for ch in text
            if not (NIKUD_RANGE_START <= ord(ch) <= NIKUD_RANGE_END)
        )
        nfc = unicodedata.normalize("NFC", without_nikud)
        return nfc.lower().strip()

    # ------------------------------------------------------------------
    # Language detection
    # ------------------------------------------------------------------

    def _detect_language(self, text: str) -> DetectedLanguage:
        """Detect language via Unicode range heuristic."""
        has_hebrew = False
        has_latin = False

        for ch in text:
            cp = ord(ch)
            if HEBREW_RANGE_START <= cp <= HEBREW_RANGE_END:
                has_hebrew = True
            elif ch.isalpha():
                has_latin = True

            if has_hebrew and has_latin:
                return DetectedLanguage.MIXED

        if has_hebrew:
            return DetectedLanguage.HEBREW
        if has_latin:
            return DetectedLanguage.ENGLISH
        return DetectedLanguage.ENGLISH

    # ------------------------------------------------------------------
    # Meaningful terms
    # ------------------------------------------------------------------

    def _extract_meaningful_terms(
        self, text: str, language: DetectedLanguage,
    ) -> List[str]:
        """Filter stop words to identify search-driving terms."""
        words = text.split()
        combined_stops = ENGLISH_STOP_WORDS | HEBREW_STOP_WORDS
        return [w for w in words if w not in combined_stops and len(w) > 1]

    # ------------------------------------------------------------------
    # Intent classification
    # ------------------------------------------------------------------

    def _classify_intent(
        self,
        original: str,
        meaningful: List[str],
        language: DetectedLanguage,
    ) -> SearchIntent:
        """Classify query intent for field boosting strategy.

        Args:
            original: The stripped (but not lowered) original query,
                      used for capitalization heuristics.
            meaningful: Lowered meaningful terms (stop words removed).
            language: Detected language of the query.
        """
        if not meaningful:
            return SearchIntent.BROWSE

        word_count = len(meaningful)

        if self._is_person_query(original, meaningful, language):
            return SearchIntent.PERSON_SEARCH

        if word_count >= 4:
            return SearchIntent.CONCEPT_SEARCH

        return SearchIntent.TITLE_LOOKUP

    def _is_person_query(
        self, original: str, terms: List[str], language: DetectedLanguage,
    ) -> bool:
        """Detect person/cast/director search patterns.

        Hebrew: presence of person-indicator words (actor, director).
        English: exactly 2 alphabetic words, both capitalized.
        """
        if any(t in _PERSON_INDICATORS_HE for t in terms):
            return True

        if language in (DetectedLanguage.ENGLISH, DetectedLanguage.MIXED):
            original_words = [w for w in original.split() if w.isalpha()]
            if len(original_words) == 2 and all(
                w[0].isupper() for w in original_words
            ):
                return True

        return False

    # ------------------------------------------------------------------
    # Fuzzy distance
    # ------------------------------------------------------------------

    def _compute_fuzzy_distance(self, text: str) -> int:
        """Calculate max edit distance from config thresholds."""
        length = len(text.replace(" ", ""))
        if length <= 3:
            return self._config.fuzzy_edits_short
        if length <= 6:
            return self._config.fuzzy_edits_medium
        return self._config.fuzzy_edits_long
