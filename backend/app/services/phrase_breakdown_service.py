"""
Phrase Breakdown Service.

Claude-powered TikTok-style Hebrew phrase explanations.
Generates breakdowns with origin, usage, examples, and fun facts.
Results cached in MongoDB for fast subsequent lookups.
"""

import json
import logging
import re
from typing import List, Optional

from app.core.ai_clients import get_anthropic_client
from app.core.config import settings
from app.models.phrase_breakdown import (
    PhraseBreakdown,
    PhraseBreakdownResponse,
    UsageExample,
)
from app.services.security_utils import sanitize_for_prompt

logger = logging.getLogger(__name__)

BREAKDOWN_PROMPT = """You are a Hebrew language expert and cultural educator. Break down the following Hebrew phrase/expression in a fun, TikTok-style format that helps diaspora families learn Hebrew naturally.

**Phrase:** {phrase}

Return ONLY valid JSON with this exact structure:
{{
  "transliteration": "Latin-script pronunciation",
  "literal_translation": "Word-by-word literal meaning",
  "meaning": "What it actually means in English",
  "meaning_he": "Simple Hebrew explanation for kids",
  "origin": "Cultural/linguistic origin (1-2 sentences, English)",
  "origin_he": "Origin in Hebrew",
  "usage_level": "everyday|casual|slang|formal|literary|archaic",
  "examples": [
    {{
      "hebrew": "Example sentence in Hebrew",
      "transliteration": "Transliteration",
      "english": "English translation",
      "context": "casual"
    }}
  ],
  "fun_fact": "One interesting trivia fact (English)",
  "fun_fact_he": "Same fact in Hebrew",
  "tags": ["slang", "military", "food", etc.]
}}

Keep it engaging, accurate, and family-friendly. Max 2 examples."""


class PhraseBreakdownService:
    """Generates and caches Hebrew phrase breakdowns."""

    def _normalize_phrase(self, phrase: str) -> str:
        """Normalize phrase for dedup matching."""
        normalized = phrase.strip()
        normalized = re.sub(r"\s+", " ", normalized)
        return normalized.lower()

    async def get_breakdown(
        self,
        phrase: str,
        source_content_id: Optional[str] = None,
    ) -> PhraseBreakdownResponse:
        """
        Get or generate a phrase breakdown.

        Checks MongoDB cache first, generates via Claude if not found.
        """
        normalized = self._normalize_phrase(phrase)

        cached = await PhraseBreakdown.find_one(
            {"phrase_normalized": normalized}
        )
        if cached:
            await self._increment_lookup(cached)
            return self._to_response(cached)

        breakdown = await self._generate_breakdown(phrase, normalized)
        if source_content_id:
            breakdown.source_content_id = source_content_id
        await breakdown.insert()

        logger.info(
            "Phrase breakdown generated",
            extra={"phrase": phrase[:50], "tags": breakdown.tags},
        )
        return self._to_response(breakdown)

    async def search_breakdowns(
        self,
        query: str,
        tags: Optional[List[str]] = None,
        limit: int = 20,
        skip: int = 0,
    ) -> List[PhraseBreakdownResponse]:
        """Search existing phrase breakdowns."""
        filters = {}
        if tags:
            filters["tags"] = {"$in": tags}

        if query:
            query = re.escape(query)
            filters["$or"] = [
                {"phrase": {"$regex": query, "$options": "i"}},
                {"meaning": {"$regex": query, "$options": "i"}},
                {"transliteration": {"$regex": query, "$options": "i"}},
            ]

        results = await (
            PhraseBreakdown.find(filters)
            .sort([("lookup_count", -1)])
            .skip(skip)
            .limit(limit)
            .to_list()
        )
        return [self._to_response(r) for r in results]

    async def get_popular(
        self, limit: int = 20
    ) -> List[PhraseBreakdownResponse]:
        """Get most popular phrase breakdowns."""
        results = await (
            PhraseBreakdown.find()
            .sort([("lookup_count", -1)])
            .limit(limit)
            .to_list()
        )
        return [self._to_response(r) for r in results]

    async def _generate_breakdown(
        self, phrase: str, normalized: str
    ) -> PhraseBreakdown:
        """Generate breakdown via Claude AI."""
        sanitized = sanitize_for_prompt(phrase, max_len=200)
        prompt = BREAKDOWN_PROMPT.format(phrase=sanitized)

        client = get_anthropic_client()
        response = await client.messages.create(
            model=settings.SUBTITLE_AI_MODEL,
            max_tokens=settings.SUBTITLE_AI_MAX_TOKENS,
            messages=[{"role": "user", "content": prompt}],
        )

        raw = response.content[0].text.strip()
        data = self._parse_json_response(raw)

        examples = [
            UsageExample(**ex) for ex in data.get("examples", [])
        ]

        return PhraseBreakdown(
            phrase=phrase.strip(),
            phrase_normalized=normalized,
            transliteration=data.get("transliteration", ""),
            literal_translation=data.get("literal_translation", ""),
            meaning=data.get("meaning", ""),
            meaning_he=data.get("meaning_he", ""),
            origin=data.get("origin", ""),
            origin_he=data.get("origin_he", ""),
            usage_level=data.get("usage_level", "casual"),
            examples=examples,
            fun_fact=data.get("fun_fact"),
            fun_fact_he=data.get("fun_fact_he"),
            tags=data.get("tags", []),
        )

    def _parse_json_response(self, raw: str) -> dict:
        """Parse JSON from Claude response, handling markdown fences."""
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
            cleaned = re.sub(r"\s*```$", "", cleaned)
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            logger.error(
                "Failed to parse breakdown JSON",
                extra={"raw_length": len(raw)},
            )
            return {}

    async def _increment_lookup(self, breakdown: PhraseBreakdown) -> None:
        """Increment lookup counter."""
        breakdown.lookup_count += 1
        await breakdown.save()

    def _to_response(
        self, breakdown: PhraseBreakdown
    ) -> PhraseBreakdownResponse:
        """Convert document to API response."""
        return PhraseBreakdownResponse(
            phrase=breakdown.phrase,
            transliteration=breakdown.transliteration,
            literal_translation=breakdown.literal_translation,
            meaning=breakdown.meaning,
            meaning_he=breakdown.meaning_he,
            origin=breakdown.origin,
            origin_he=breakdown.origin_he,
            usage_level=breakdown.usage_level,
            examples=breakdown.examples,
            fun_fact=breakdown.fun_fact,
            fun_fact_he=breakdown.fun_fact_he,
            related_phrases=breakdown.related_phrases,
            tags=breakdown.tags,
        )


phrase_breakdown_service = PhraseBreakdownService()
