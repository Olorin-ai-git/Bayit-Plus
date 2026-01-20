"""
Cultural Context Service for Olorin.ai Platform

Detects and explains Israeli/Jewish cultural references in text.
"""

import logging
import re
from datetime import datetime, timezone
from typing import Optional, List

from app.core.config import settings
from app.models.cultural_reference import (
    CulturalReference,
    DetectedReference,
    ContextDetectionRequest,
    ContextDetectionResponse,
    EnrichedText,
    ReferenceExplanation,
)

logger = logging.getLogger(__name__)

# Try to import Claude for AI-powered detection
try:
    from anthropic import AsyncAnthropic
    CLAUDE_AVAILABLE = True
except ImportError:
    CLAUDE_AVAILABLE = False
    logger.warning("Anthropic Claude not available for cultural context")


class CulturalContextService:
    """
    Service for detecting and explaining cultural references.

    Features:
    - Pattern-based detection using knowledge base
    - AI-powered detection for complex references
    - Multilingual explanations (Hebrew, English, Spanish)
    - Context enrichment for transcripts
    """

    def __init__(self):
        """Initialize cultural context service."""
        self._claude_client: Optional[AsyncAnthropic] = None
        self._alias_cache: dict[str, str] = {}  # alias -> reference_id
        self._cache_loaded = False

    async def _ensure_cache_loaded(self) -> None:
        """Load alias cache from database."""
        if self._cache_loaded:
            return

        try:
            # Load all references and build alias index
            references = await CulturalReference.find_all().to_list()
            for ref in references:
                # Add canonical names
                self._alias_cache[ref.canonical_name.lower()] = ref.reference_id
                if ref.canonical_name_en:
                    self._alias_cache[ref.canonical_name_en.lower()] = ref.reference_id

                # Add aliases
                for alias in ref.aliases:
                    self._alias_cache[alias.lower()] = ref.reference_id
                for alias in ref.aliases_en:
                    self._alias_cache[alias.lower()] = ref.reference_id

            self._cache_loaded = True
            logger.info(f"Loaded {len(self._alias_cache)} cultural reference aliases")

        except Exception as e:
            logger.error(f"Failed to load alias cache: {e}")

    async def _get_claude_client(self) -> Optional[AsyncAnthropic]:
        """Get or create Claude client."""
        if not self._claude_client and CLAUDE_AVAILABLE and settings.ANTHROPIC_API_KEY:
            self._claude_client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        return self._claude_client

    async def detect_references(
        self,
        request: ContextDetectionRequest,
    ) -> ContextDetectionResponse:
        """
        Detect cultural references in text.

        Args:
            request: Detection request with text and options

        Returns:
            Response with detected references
        """
        await self._ensure_cache_loaded()

        detected: List[DetectedReference] = []
        tokens_used = 0

        # Phase 1: Pattern-based detection using knowledge base
        pattern_detected = await self._pattern_based_detection(
            text=request.text,
            min_confidence=request.min_confidence,
        )
        detected.extend(pattern_detected)

        # Phase 2: AI-powered detection for complex references
        claude = await self._get_claude_client()
        if claude and len(request.text) > 20:
            ai_detected, ai_tokens = await self._ai_detection(
                text=request.text,
                language=request.language,
                min_confidence=request.min_confidence,
            )
            # Add AI detections that weren't found by pattern matching
            detected_ids = {d.reference_id for d in detected}
            for ref in ai_detected:
                if ref.reference_id not in detected_ids:
                    detected.append(ref)
            tokens_used = ai_tokens

        # Get explanations in target language
        for ref in detected:
            explanation = await self._get_explanation(
                ref.reference_id,
                request.target_language,
                include_detailed=request.include_detailed,
            )
            if explanation:
                if request.target_language == "en":
                    ref.short_explanation_en = explanation.short_explanation
                elif request.target_language == "es":
                    pass  # Would set Spanish if available

        return ContextDetectionResponse(
            original_text=request.text,
            references=detected,
            total_found=len(detected),
            tokens_used=tokens_used,
        )

    async def explain_reference(
        self,
        reference_id: str,
        language: str = "en",
    ) -> Optional[ReferenceExplanation]:
        """
        Get explanation for a specific reference.

        Args:
            reference_id: Reference identifier
            language: Language for explanation

        Returns:
            Reference explanation or None if not found
        """
        ref = await CulturalReference.find_one(
            CulturalReference.reference_id == reference_id
        )
        if not ref:
            return None

        # Increment lookup count
        ref.lookup_count += 1
        ref.last_accessed_at = datetime.now(timezone.utc)
        await ref.save()

        # Get explanation in requested language
        if language == "en":
            short_exp = ref.short_explanation_en or ref.short_explanation
            detailed_exp = ref.detailed_explanation_en or ref.detailed_explanation
        elif language == "es":
            short_exp = ref.short_explanation_es or ref.short_explanation_en or ref.short_explanation
            detailed_exp = ref.detailed_explanation_es or ref.detailed_explanation_en or ref.detailed_explanation
        else:
            short_exp = ref.short_explanation
            detailed_exp = ref.detailed_explanation

        return ReferenceExplanation(
            reference_id=ref.reference_id,
            canonical_name=ref.canonical_name,
            canonical_name_en=ref.canonical_name_en,
            category=ref.category,
            subcategory=ref.subcategory,
            short_explanation=short_exp,
            detailed_explanation=detailed_exp,
            wikipedia_url=ref.wikipedia_url,
            image_url=ref.image_url,
            related_references=ref.related_references,
        )

    async def enrich_text(
        self,
        text: str,
        language: str = "he",
        target_language: str = "en",
    ) -> EnrichedText:
        """
        Enrich text with cultural reference annotations.

        Args:
            text: Original text
            language: Text language
            target_language: Language for annotations

        Returns:
            Enriched text with annotations
        """
        # Detect references
        request = ContextDetectionRequest(
            text=text,
            language=language,
            target_language=target_language,
            min_confidence=settings.CULTURAL_DETECTION_MIN_CONFIDENCE,
        )
        detection = await self.detect_references(request)

        if not detection.references:
            return EnrichedText(
                original_text=text,
                enriched_text=text,
                annotations=[],
            )

        # Sort by position (descending) to insert markers without offset issues
        sorted_refs = sorted(
            detection.references,
            key=lambda r: r.start_position,
            reverse=True,
        )

        enriched = text
        annotations = []

        for ref in sorted_refs:
            # Create annotation marker
            marker = f"[{ref.reference_id}]"

            # Insert marker after the matched text
            enriched = (
                enriched[: ref.end_position]
                + marker
                + enriched[ref.end_position:]
            )

            annotations.append({
                "reference_id": ref.reference_id,
                "matched_text": ref.matched_text,
                "canonical_name": ref.canonical_name,
                "canonical_name_en": ref.canonical_name_en,
                "category": ref.category,
                "explanation": ref.short_explanation_en or ref.short_explanation,
            })

        return EnrichedText(
            original_text=text,
            enriched_text=enriched,
            annotations=list(reversed(annotations)),  # Restore original order
        )

    async def _pattern_based_detection(
        self,
        text: str,
        min_confidence: float,
    ) -> List[DetectedReference]:
        """Pattern-based detection using knowledge base."""
        detected = []
        text_lower = text.lower()

        # Check each alias in cache
        for alias, ref_id in self._alias_cache.items():
            if len(alias) < 3:  # Skip very short aliases
                continue

            # Find all occurrences
            pattern = re.compile(r'\b' + re.escape(alias) + r'\b', re.IGNORECASE)
            for match in pattern.finditer(text):
                # Get reference details
                ref = await CulturalReference.find_one(
                    CulturalReference.reference_id == ref_id
                )
                if not ref:
                    continue

                # Calculate confidence based on match quality
                confidence = 0.9 if match.group().lower() == ref.canonical_name.lower() else 0.8

                if confidence >= min_confidence:
                    detected.append(
                        DetectedReference(
                            reference_id=ref.reference_id,
                            canonical_name=ref.canonical_name,
                            canonical_name_en=ref.canonical_name_en,
                            category=ref.category,
                            subcategory=ref.subcategory,
                            matched_text=match.group(),
                            start_position=match.start(),
                            end_position=match.end(),
                            confidence=confidence,
                            short_explanation=ref.short_explanation,
                            short_explanation_en=ref.short_explanation_en,
                        )
                    )

        # Remove duplicates (keep highest confidence)
        unique = {}
        for d in detected:
            key = (d.reference_id, d.start_position)
            if key not in unique or d.confidence > unique[key].confidence:
                unique[key] = d

        return list(unique.values())

    async def _ai_detection(
        self,
        text: str,
        language: str,
        min_confidence: float,
    ) -> tuple[List[DetectedReference], int]:
        """AI-powered detection using Claude."""
        detected = []
        tokens_used = 0

        claude = await self._get_claude_client()
        if not claude:
            return detected, 0

        try:
            prompt = f"""Analyze the following {language.upper()} text and identify any Israeli or Jewish cultural references that a non-Israeli viewer might not understand.

For each reference found, provide:
1. The exact text that contains the reference
2. A brief identifier (lowercase, hyphenated)
3. Category (person, place, event, term, organization, holiday, food, slang, law, military, media, sport, religion)
4. A one-sentence explanation in English

Text to analyze:
{text}

Respond in JSON format:
{{
  "references": [
    {{
      "matched_text": "exact text from input",
      "reference_id": "identifier-like-this",
      "category": "category",
      "explanation_en": "Brief explanation"
    }}
  ]
}}

Only include references that require cultural context. Do not include common names or well-known international references."""

            response = await claude.messages.create(
                model=settings.CLAUDE_MODEL,
                max_tokens=1000,
                messages=[{"role": "user", "content": prompt}],
            )

            tokens_used = response.usage.input_tokens + response.usage.output_tokens

            # Parse response
            import json
            try:
                content = response.content[0].text
                # Extract JSON from response
                json_match = re.search(r'\{[\s\S]*\}', content)
                if json_match:
                    data = json.loads(json_match.group())
                    for ref_data in data.get("references", []):
                        matched_text = ref_data.get("matched_text", "")
                        # Find position in original text
                        pos = text.find(matched_text)
                        if pos == -1:
                            # Try case-insensitive search
                            pos = text.lower().find(matched_text.lower())

                        if pos >= 0:
                            detected.append(
                                DetectedReference(
                                    reference_id=ref_data.get("reference_id", "unknown"),
                                    canonical_name=matched_text,
                                    canonical_name_en=matched_text,
                                    category=ref_data.get("category", "term"),
                                    matched_text=matched_text,
                                    start_position=pos,
                                    end_position=pos + len(matched_text),
                                    confidence=0.75,  # AI detection has lower confidence
                                    short_explanation=ref_data.get("explanation_en", ""),
                                    short_explanation_en=ref_data.get("explanation_en", ""),
                                )
                            )
            except json.JSONDecodeError:
                logger.warning("Failed to parse AI detection response")

        except Exception as e:
            logger.error(f"AI detection failed: {e}")

        return detected, tokens_used

    async def _get_explanation(
        self,
        reference_id: str,
        language: str,
        include_detailed: bool = False,
    ) -> Optional[ReferenceExplanation]:
        """Get explanation for a reference in target language."""
        return await self.explain_reference(reference_id, language)

    async def add_reference(
        self,
        reference_id: str,
        canonical_name: str,
        category: str,
        short_explanation: str,
        **kwargs,
    ) -> CulturalReference:
        """
        Add a new cultural reference to the knowledge base.

        Args:
            reference_id: Unique identifier
            canonical_name: Hebrew canonical name
            category: Reference category
            short_explanation: Brief Hebrew explanation
            **kwargs: Additional fields

        Returns:
            Created reference document
        """
        # Check if exists
        existing = await CulturalReference.find_one(
            CulturalReference.reference_id == reference_id
        )
        if existing:
            raise ValueError(f"Reference '{reference_id}' already exists")

        ref = CulturalReference(
            reference_id=reference_id,
            canonical_name=canonical_name,
            category=category,
            short_explanation=short_explanation,
            **kwargs,
        )

        await ref.insert()

        # Update cache
        self._alias_cache[canonical_name.lower()] = reference_id

        logger.info(f"Added cultural reference: {reference_id}")
        return ref

    async def update_reference(
        self,
        reference_id: str,
        **updates,
    ) -> Optional[CulturalReference]:
        """Update a cultural reference."""
        ref = await CulturalReference.find_one(
            CulturalReference.reference_id == reference_id
        )
        if not ref:
            return None

        for key, value in updates.items():
            if hasattr(ref, key):
                setattr(ref, key, value)

        ref.updated_at = datetime.now(timezone.utc)
        await ref.save()

        # Refresh cache
        self._cache_loaded = False

        return ref

    async def get_references_by_category(
        self,
        category: str,
        limit: int = 100,
    ) -> List[CulturalReference]:
        """Get references by category."""
        return await CulturalReference.find(
            CulturalReference.category == category
        ).sort(-CulturalReference.lookup_count).limit(limit).to_list()

    async def get_popular_references(
        self,
        limit: int = 50,
    ) -> List[CulturalReference]:
        """Get most frequently accessed references."""
        return await CulturalReference.find_all().sort(
            -CulturalReference.lookup_count
        ).limit(limit).to_list()


# Singleton instance
cultural_context_service = CulturalContextService()
