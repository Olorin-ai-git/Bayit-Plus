"""
BYOC AI Classifier

Uses Claude to classify unknown channel names into category, language,
country, and content type. High-confidence results auto-create new
entries in the channel index (AI-grown index).
"""

import json
from datetime import datetime
from typing import Dict, List

from app.core.ai_clients import get_anthropic_client

from app.core.logging_config import get_logger
from app.models.byoc_channel_index import ChannelIndexEntry

logger = get_logger(__name__)

AI_CONFIDENCE_THRESHOLD = 0.8
BATCH_SIZE = 50

CLASSIFICATION_PROMPT = """You are a TV channel classifier. Given a list of channel names with optional metadata, classify each one.

For each channel, return a JSON object with:
- "name": the original channel name
- "canonical_name": cleaned/normalized name (e.g., "USA| CNN HD [EN]" -> "CNN")
- "category": one of: news, sports, entertainment, movies, kids, music, documentary, religious, lifestyle, education, adult, general
- "language": ISO 639-1 code (e.g., "en", "es", "ar", "he", "fr", "de", "ru", "tr", "pt", "hi")
- "country": ISO 3166-1 alpha-2 code (e.g., "US", "GB", "IL", "ES")
- "confidence": 0.0 to 1.0 how confident you are in this classification

Return a JSON array of objects. Only valid JSON, no commentary."""


class BYOCAIClassifier:
    """Classifies unknown channel names using LLM inference."""

    async def classify_batch(
        self, entries: List[Dict[str, str]],
    ) -> List[Dict]:
        """Classify a batch of channel entries using Claude.

        Args:
            entries: List of {"name": str, "group": str | None}

        Returns:
            List of classification dicts with confidence scores.
        """
        from app.core.config import settings

        if not settings.ANTHROPIC_API_KEY:
            logger.warning("ANTHROPIC_API_KEY not configured, skipping AI classification")
            return []


        client = get_anthropic_client(api_key=settings.ANTHROPIC_API_KEY)
        all_results: List[Dict] = []

        for i in range(0, len(entries), BATCH_SIZE):
            batch = entries[i : i + BATCH_SIZE]
            prompt_data = json.dumps(batch, ensure_ascii=False)

            try:
                response = await client.messages.create(
                    model=settings.CLAUDE_MODEL,
                    max_tokens=4096,
                    messages=[
                        {
                            "role": "user",
                            "content": f"{CLASSIFICATION_PROMPT}\n\nChannels:\n{prompt_data}",
                        }
                    ],
                )
                text = response.content[0].text.strip()
                if text.startswith("```"):
                    text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
                parsed = json.loads(text)
                all_results.extend(parsed)
                logger.info(
                    "AI classified batch offset=%d count=%d", i, len(parsed)
                )
            except Exception:
                logger.exception("AI classification failed for batch offset=%d", i)

        return all_results

    async def create_index_entries(
        self, classifications: List[Dict],
    ) -> int:
        """Create new channel index entries from high-confidence AI results.

        Returns count of entries created.
        """
        created = 0
        for cls in classifications:
            confidence = cls.get("confidence", 0.0)
            if confidence < AI_CONFIDENCE_THRESHOLD:
                continue

            canonical = cls.get("canonical_name", "").strip()
            if not canonical:
                continue

            existing = await ChannelIndexEntry.find_one(
                ChannelIndexEntry.canonical_name == canonical,
            )
            if existing:
                if cls.get("name") and cls["name"] not in existing.aliases:
                    existing.aliases.append(cls["name"])
                    existing.updated_at = datetime.utcnow()
                    await existing.save()
                continue

            entry = ChannelIndexEntry(
                canonical_name=canonical,
                aliases=[cls.get("name", "")] if cls.get("name") != canonical else [],
                category=cls.get("category", "general"),
                language=cls.get("language", "en"),
                country=cls.get("country", "US"),
                is_ai_generated=True,
                confidence=confidence,
            )
            await entry.insert()
            created += 1

        logger.info("AI created channel_index entries=%d", created)
        return created
