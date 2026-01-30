"""
Topic Detection Service

Detects topics/entities from live stream transcripts using spaCy NER
and validates relevance using Claude AI.

Hybrid approach:
1. spaCy for fast entity extraction (PERSON, GPE, ORG, EVENT)
2. Claude for relevance validation and confidence scoring
"""

import hashlib
import logging
from typing import Dict, List, Optional, Tuple

from anthropic import AsyncAnthropic

from app.core.config import settings
from app.services.live_trivia.topic_validator import TopicValidator

logger = logging.getLogger(__name__)


class TopicDetectionService:
    """Service for detecting and validating topics from transcripts."""

    # Entity type mapping (spaCy → our types)
    ENTITY_TYPE_MAP = {
        "PERSON": "person",
        "GPE": "place",  # Geopolitical entity
        "ORG": "organization",
        "EVENT": "event",
        "LOC": "place",  # Location
        "FAC": "place",  # Facility
        "NORP": "organization",  # Nationalities or religious/political groups
    }

    def __init__(self, anthropic_client: Optional[AsyncAnthropic] = None):
        """Initialize topic detector with optional injected Anthropic client."""
        anthropic_client = anthropic_client or AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        self._spacy_models = {}
        self._load_spacy_models()
        self.spacy_confidence_baseline = settings.olorin.live_trivia.spacy_confidence_baseline
        self.validator = TopicValidator(
            anthropic_client=anthropic_client,
            claude_model=settings.olorin.live_trivia.claude_model,
            max_tokens=settings.olorin.live_trivia.claude_max_tokens_short,
            temperature=settings.olorin.live_trivia.claude_temperature_validation
        )

    def _load_spacy_models(self) -> None:
        """Load spaCy models for supported languages (lazy loading)."""
        import spacy

        try:
            # English model (primary)
            self._spacy_models["en"] = spacy.load("en_core_web_sm")
            logger.info("Loaded spaCy English model")
        except OSError:
            logger.warning("English spaCy model not found. Run: python -m spacy download en_core_web_sm")

        try:
            # Hebrew model
            self._spacy_models["he"] = spacy.load("he_core_web_sm")
            logger.info("Loaded spaCy Hebrew model")
        except OSError:
            logger.warning("Hebrew spaCy model not found. Run: python -m spacy download he_core_web_sm")

    def _get_spacy_model(self, language: str):
        """Get spaCy model for language, default to English."""
        return self._spacy_models.get(language, self._spacy_models.get("en"))

    def detect_entities(
        self,
        transcript: str,
        language: str = "en"
    ) -> List[Tuple[str, str, float]]:
        """
        Extract entities from transcript using spaCy NER.

        Args:
            transcript: Text to analyze
            language: Language code (en, he)

        Returns:
            List of (entity_text, entity_type, confidence) tuples
        """
        nlp = self._get_spacy_model(language)
        if not nlp:
            logger.warning(f"No spaCy model available for language: {language}")
            return []

        doc = nlp(transcript)
        entities = []

        for ent in doc.ents:
            # Map spaCy entity type to our types
            entity_type = self.ENTITY_TYPE_MAP.get(ent.label_, None)
            if entity_type:
                # spaCy doesn't provide confidence directly, use configured baseline
                entities.append((
                    ent.text.strip(),
                    entity_type,
                    self.spacy_confidence_baseline
                ))

        return entities

    def generate_topic_hash(self, topic_text: str, entity_type: str) -> str:
        """Generate SHA256 hash for topic deduplication."""
        normalized = f"{entity_type}:{topic_text.lower().strip()}"
        return hashlib.sha256(normalized.encode("utf-8")).hexdigest()

    async def detect_topics(
        self,
        transcript: str,
        language: str = "en",
        validate_with_ai: bool = True
    ) -> List[Dict]:
        """
        Detect topics from transcript with optional AI validation.

        Args:
            transcript: Transcript text to analyze
            language: Language code (en, he)
            validate_with_ai: Use Claude for validation (default: True)

        Returns:
            List of topic dicts with keys:
            - topic_text: str
            - entity_type: str
            - confidence_score: float
            - topic_hash: str
            - is_validated: bool
        """
        # Step 1: Extract entities with spaCy
        entities = self.detect_entities(transcript, language)

        if not entities:
            return []

        topics = []

        # Step 2: Validate with AI (if enabled)
        for entity_text, entity_type, base_confidence in entities:
            topic_hash = self.generate_topic_hash(entity_text, entity_type)

            if validate_with_ai:
                # AI validation
                is_relevant, ai_confidence = await self.validator.validate_topic(
                    entity_text,
                    entity_type,
                    transcript
                )

                if not is_relevant:
                    continue

                # Combine spaCy and AI confidence
                final_confidence = (base_confidence + ai_confidence) / 2.0
            else:
                final_confidence = base_confidence
                is_relevant = True

            topics.append({
                "topic_text": entity_text,
                "entity_type": entity_type,
                "confidence_score": final_confidence,
                "topic_hash": topic_hash,
                "is_validated": validate_with_ai,
            })

        return topics
