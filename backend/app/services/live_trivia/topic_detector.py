"""
Topic Detection Service

Detects topics/entities from live stream transcripts.
- English: spaCy NER + optional Claude validation
- Hebrew/other: Claude-based extraction (no spaCy model available)
"""

import hashlib
import json
import logging
from typing import Dict, List, Optional, Tuple

from anthropic import AsyncAnthropic

from app.core.ai_clients import get_anthropic_client

from app.core.config import settings
from app.services.live_trivia.input_sanitizer import sanitize_input
from app.services.live_trivia.topic_validator import TopicValidator

logger = logging.getLogger(__name__)


class TopicDetectionService:
    """Service for detecting and validating topics from transcripts."""

    # Entity type mapping (spaCy label -> our types)
    ENTITY_TYPE_MAP = {
        "PERSON": "person",
        "GPE": "place",
        "ORG": "organization",
        "EVENT": "event",
        "LOC": "place",
        "FAC": "place",
        "NORP": "organization",
    }

    def __init__(self, anthropic_client: Optional[AsyncAnthropic] = None):
        """Initialize topic detector with optional injected Anthropic client."""
        self._anthropic = anthropic_client or get_anthropic_client(
            api_key=settings.ANTHROPIC_API_KEY
        )
        self._spacy_models: Dict = {}
        self._load_spacy_models()
        self._config = settings.olorin.live_trivia
        self.spacy_confidence_baseline = self._config.spacy_confidence_baseline
        self.validator = TopicValidator(
            anthropic_client=self._anthropic,
            claude_model=self._config.claude_model,
            max_tokens=self._config.claude_max_tokens_short,
            temperature=self._config.claude_temperature_validation,
        )

    def _load_spacy_models(self) -> None:
        """Load available spaCy models."""
        import spacy

        for lang, model_name in [("en", "en_core_web_sm"), ("he", "he_core_web_sm")]:
            try:
                self._spacy_models[lang] = spacy.load(model_name)
                logger.info("Loaded spaCy %s model", lang)
            except OSError:
                logger.warning(
                    "spaCy model %s not available, will use Claude NER for %s",
                    model_name,
                    lang,
                )

    def detect_entities(
        self, transcript: str, language: str = "en"
    ) -> List[Tuple[str, str, float]]:
        """Extract entities using spaCy NER (English only typically)."""
        nlp = self._spacy_models.get(language, self._spacy_models.get("en"))
        if not nlp:
            return []

        doc = nlp(transcript)
        entities = []
        for ent in doc.ents:
            entity_type = self.ENTITY_TYPE_MAP.get(ent.label_)
            if entity_type:
                entities.append(
                    (ent.text.strip(), entity_type, self.spacy_confidence_baseline)
                )
        return entities

    def generate_topic_hash(self, topic_text: str, entity_type: str) -> str:
        """Generate SHA256 hash for topic deduplication."""
        normalized = f"{entity_type}:{topic_text.lower().strip()}"
        return hashlib.sha256(normalized.encode("utf-8")).hexdigest()

    async def _extract_entities_with_claude(
        self, transcript: str, language: str
    ) -> List[Dict]:
        """
        Use Claude to extract notable named entities from transcript.
        Combined NER + validation in a single call (no separate validation needed).
        """
        safe_text = sanitize_input(transcript, max_length=500)
        if not safe_text.strip():
            return []

        prompt = f"""Extract notable named entities from this {language} transcript.
Return ONLY entities that are well-known (famous people, countries, organizations,
major events) and suitable for generating educational trivia facts.

Transcript: {safe_text}

Return a JSON array. Each element: {{"name": "entity name", "type": "person|place|organization|event", "confidence": 0.0-1.0}}
Return empty array [] if no notable entities found. JSON only, no markdown."""

        try:
            message = await self._anthropic.messages.create(
                model=self._config.claude_model,
                max_tokens=self._config.claude_max_tokens_short,
                temperature=0.0,
                messages=[{"role": "user", "content": prompt}],
            )

            response_text = message.content[0].text.strip()

            # Strip markdown code blocks if present
            if response_text.startswith("```"):
                lines = response_text.split("\n")
                lines = [l for l in lines if not l.strip().startswith("```")]
                response_text = "\n".join(lines).strip()

            entities = json.loads(response_text)
            if not isinstance(entities, list):
                return []

            topics = []
            for ent in entities:
                name = ent.get("name", "").strip()
                ent_type = ent.get("type", "person")
                confidence = float(ent.get("confidence", 0.7))

                if not name or confidence < 0.5:
                    continue

                topic_hash = self.generate_topic_hash(name, ent_type)
                topics.append(
                    {
                        "topic_text": name,
                        "entity_type": ent_type,
                        "confidence_score": confidence,
                        "topic_hash": topic_hash,
                        "is_validated": True,
                    }
                )

                logger.info(
                    "Claude NER: %s (%s) confidence=%.2f", name, ent_type, confidence
                )

            return topics

        except Exception as e:
            logger.error("Claude entity extraction failed: %s", e)
            return []

    async def detect_topics(
        self,
        transcript: str,
        language: str = "en",
        validate_with_ai: bool = True,
    ) -> List[Dict]:
        """
        Detect topics from transcript.

        For languages without a spaCy model (Hebrew), uses Claude directly
        for entity extraction + validation in a single call.

        For English (with spaCy), uses spaCy NER + optional Claude validation.
        """
        # If no spaCy model for this language, use Claude for full NER
        if language not in self._spacy_models:
            return await self._extract_entities_with_claude(transcript, language)

        # spaCy NER path (English)
        entities = self.detect_entities(transcript, language)
        if not entities:
            return []

        topics = []
        for entity_text, entity_type, base_confidence in entities:
            topic_hash = self.generate_topic_hash(entity_text, entity_type)

            if validate_with_ai:
                is_relevant, ai_confidence = await self.validator.validate_topic(
                    entity_text, entity_type, transcript
                )
                if not is_relevant:
                    continue
                final_confidence = (base_confidence + ai_confidence) / 2.0
            else:
                final_confidence = base_confidence

            topics.append(
                {
                    "topic_text": entity_text,
                    "entity_type": entity_type,
                    "confidence_score": final_confidence,
                    "topic_hash": topic_hash,
                    "is_validated": validate_with_ai,
                }
            )

        return topics
