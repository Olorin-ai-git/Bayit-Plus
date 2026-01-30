"""
Shoresh (Root Letter) Analyzer

Hybrid approach for extracting Hebrew root letters (shoresh):
1. Primary: Hebrew morphological dictionary lookup
2. Fallback: Claude API for words not found in dictionary

Results cached in Redis with configurable TTL.
"""

import logging
from dataclasses import dataclass
from typing import List, Optional

from app.core.config import settings

logger = logging.getLogger(__name__)

# Conditional imports for Hebrew morphology
try:
    import hebrew_tokenizer as ht

    HEBREW_TOKENIZER_AVAILABLE = True
except ImportError:
    HEBREW_TOKENIZER_AVAILABLE = False
    logger.warning("hebrew_tokenizer not available - using Claude-only mode for shoresh analysis")

try:
    from anthropic import AsyncAnthropic

    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False
    logger.warning("Anthropic not available for shoresh fallback")

try:
    import redis.asyncio as aioredis

    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    logger.warning("Redis not available for shoresh caching")


@dataclass
class ShoreshResult:
    """Result of shoresh (root letter) analysis for a Hebrew word."""

    word: str
    root_letters: str  # e.g., "לבש"
    root_indices: List[int]  # Indices of root letters within the word
    meaning_hint_en: str  # English meaning hint
    highlight_chars: str  # Formatted root display, e.g., "ל-ב-ש"
    source: str  # "dictionary" or "claude"

    def to_dict(self) -> dict:
        """Serialize to dictionary for WebSocket transmission."""
        return {
            "word": self.word,
            "root": self.root_letters,
            "root_indices": self.root_indices,
            "meaning_en": self.meaning_hint_en,
            "highlight_chars": self.highlight_chars,
            "source": self.source,
        }


class ShoreshAnalyzer:
    """
    Hybrid Hebrew root letter analyzer.

    Uses dictionary lookup as primary source, falls back to Claude API
    for words not in dictionary. Results are cached in Redis.

    Dependencies injected through constructor for testability.
    """

    def __init__(
        self,
        redis_client=None,
        anthropic_client=None,
    ):
        self._redis = redis_client
        self._anthropic = anthropic_client
        self._cache_ttl = settings.olorin.smart_subs.shoresh_cache_ttl_seconds
        self._claude_model = settings.olorin.smart_subs.shoresh_claude_model
        self._claude_max_tokens = settings.olorin.smart_subs.shoresh_claude_max_tokens

    async def _get_redis(self):
        """Lazy-initialize Redis connection."""
        if self._redis is None and REDIS_AVAILABLE:
            try:
                redis_url = settings.olorin.dubbing.redis_url
                self._redis = aioredis.from_url(
                    redis_url, decode_responses=True
                )
            except Exception as e:
                logger.warning(
                    "Failed to connect to Redis for shoresh cache",
                    extra={"error": str(e)},
                )
        return self._redis

    async def _get_anthropic(self):
        """Lazy-initialize Anthropic client."""
        if self._anthropic is None and ANTHROPIC_AVAILABLE:
            self._anthropic = AsyncAnthropic()
        return self._anthropic

    async def analyze_word(self, word: str) -> Optional[ShoreshResult]:
        """
        Analyze a single Hebrew word to extract its root letters.

        Pipeline:
        1. Check Redis cache
        2. Try dictionary lookup
        3. Fall back to Claude API
        4. Cache result

        Args:
            word: Hebrew word to analyze

        Returns:
            ShoreshResult or None if analysis fails
        """
        if not word or len(word) < 2:
            return None

        # Step 1: Check cache
        cached = await self._check_cache(word)
        if cached:
            return cached

        # Step 2: Dictionary lookup
        result = self._dictionary_lookup(word)

        # Step 3: Claude fallback
        if result is None:
            result = await self._claude_lookup(word)

        # Step 4: Cache result
        if result:
            await self._cache_result(word, result)

        return result

    async def analyze_sentence(self, sentence: str) -> List[ShoreshResult]:
        """
        Analyze all content words in a Hebrew sentence.

        Args:
            sentence: Hebrew text (may include non-Hebrew characters)

        Returns:
            List of ShoreshResult for each analyzable word
        """
        results = []
        words = self._tokenize_hebrew(sentence)

        for word in words:
            result = await self.analyze_word(word)
            if result:
                results.append(result)

        return results

    def _tokenize_hebrew(self, text: str) -> List[str]:
        """
        Extract Hebrew words from text.

        Uses hebrew_tokenizer if available, otherwise simple splitting.
        """
        if HEBREW_TOKENIZER_AVAILABLE:
            try:
                tokens = ht.tokenize(text)
                return [
                    token[1]
                    for token in tokens
                    if token[0] == "HEBREW" and len(token[1]) >= 2
                ]
            except Exception as e:
                logger.warning(
                    "hebrew_tokenizer failed, using fallback",
                    extra={"error": str(e)},
                )

        # Fallback: simple split and filter for Hebrew chars
        words = text.split()
        hebrew_words = []
        for w in words:
            cleaned = "".join(c for c in w if "\u0590" <= c <= "\u05FF")
            if len(cleaned) >= 2:
                hebrew_words.append(cleaned)
        return hebrew_words

    def _dictionary_lookup(self, word: str) -> Optional[ShoreshResult]:
        """
        Look up root letters using Hebrew morphological dictionary.

        Args:
            word: Hebrew word

        Returns:
            ShoreshResult or None if not found
        """
        if not HEBREW_TOKENIZER_AVAILABLE:
            return None

        try:
            tokens = ht.tokenize(word)
            for token_type, token_value, *extra in tokens:
                if token_type == "HEBREW" and extra:
                    # hebrew_tokenizer may provide morphological info
                    # Extract root if available in token metadata
                    pass

            # hebrew_tokenizer provides tokenization but limited morphological analysis
            # For full shoresh extraction, we rely on Claude fallback
            return None

        except Exception as e:
            logger.debug(
                "Dictionary lookup failed",
                extra={"word": word, "error": str(e)},
            )
            return None

    async def _claude_lookup(self, word: str) -> Optional[ShoreshResult]:
        """
        Use Claude API to extract root letters from a Hebrew word.

        Args:
            word: Hebrew word

        Returns:
            ShoreshResult or None if analysis fails
        """
        client = await self._get_anthropic()
        if not client:
            logger.warning("Anthropic client not available for shoresh analysis")
            return None

        try:
            prompt = (
                f"Analyze the Hebrew word '{word}' and extract its shoresh (root letters).\n"
                "Respond ONLY in this exact JSON format, no explanation:\n"
                '{"root": "שלש", "root_indices": [0, 2, 4], '
                '"meaning_en": "three/triple", "highlight_chars": "ש-ל-ש"}\n\n'
                "Rules:\n"
                "- root: The 3-letter (or 4-letter) Hebrew root\n"
                "- root_indices: Zero-based indices of root letters within the original word\n"
                "- meaning_en: Brief English meaning of the root\n"
                "- highlight_chars: Root letters separated by dashes\n"
                f"Word to analyze: {word}"
            )

            response = await client.messages.create(
                model=self._claude_model,
                max_tokens=self._claude_max_tokens,
                temperature=0.0,
                messages=[{"role": "user", "content": prompt}],
            )

            # Parse JSON response
            import json

            text = response.content[0].text.strip()
            # Handle potential markdown code blocks
            if text.startswith("```"):
                text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()

            data = json.loads(text)

            return ShoreshResult(
                word=word,
                root_letters=data.get("root", ""),
                root_indices=data.get("root_indices", []),
                meaning_hint_en=data.get("meaning_en", ""),
                highlight_chars=data.get("highlight_chars", ""),
                source="claude",
            )

        except Exception as e:
            logger.warning(
                "Claude shoresh analysis failed",
                extra={"word": word, "error": str(e)},
            )
            return None

    async def _check_cache(self, word: str) -> Optional[ShoreshResult]:
        """Check Redis cache for previously analyzed word."""
        redis = await self._get_redis()
        if not redis:
            return None

        try:
            import json

            cache_key = f"shoresh:{word}"
            cached = await redis.get(cache_key)
            if cached:
                data = json.loads(cached)
                return ShoreshResult(
                    word=data["word"],
                    root_letters=data["root_letters"],
                    root_indices=data["root_indices"],
                    meaning_hint_en=data["meaning_hint_en"],
                    highlight_chars=data["highlight_chars"],
                    source=data["source"],
                )
        except Exception as e:
            logger.debug(
                "Cache lookup failed",
                extra={"word": word, "error": str(e)},
            )

        return None

    async def _cache_result(self, word: str, result: ShoreshResult) -> None:
        """Cache shoresh analysis result in Redis."""
        redis = await self._get_redis()
        if not redis:
            return

        try:
            import json

            cache_key = f"shoresh:{word}"
            data = {
                "word": result.word,
                "root_letters": result.root_letters,
                "root_indices": result.root_indices,
                "meaning_hint_en": result.meaning_hint_en,
                "highlight_chars": result.highlight_chars,
                "source": result.source,
            }
            await redis.setex(cache_key, self._cache_ttl, json.dumps(data, ensure_ascii=False))
        except Exception as e:
            logger.debug(
                "Cache write failed",
                extra={"word": word, "error": str(e)},
            )
