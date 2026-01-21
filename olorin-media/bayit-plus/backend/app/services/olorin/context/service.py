"""
Cultural Context Service

Main service class that coordinates cultural reference operations.
"""

import logging
from typing import List, Optional

from app.core.config import settings
from app.models.cultural_reference import (ContextDetectionRequest,
                                           ContextDetectionResponse,
                                           CulturalReference,
                                           DetectedReference, EnrichedText,
                                           ReferenceExplanation)
from app.services.olorin.context import crud
from app.services.olorin.context.cache import AliasCache
from app.services.olorin.context.detection import (ai_detection,
                                                   pattern_based_detection)
from app.services.olorin.context.explanation import get_explanation

logger = logging.getLogger(__name__)


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
        self._alias_cache = AliasCache()

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
        await self._alias_cache.load()

        detected: List[DetectedReference] = []
        tokens_used = 0

        # Phase 1: Pattern-based detection
        pattern_detected = await pattern_based_detection(
            text=request.text,
            min_confidence=request.min_confidence,
            alias_cache=self._alias_cache,
        )
        detected.extend(pattern_detected)

        # Phase 2: AI-powered detection
        if len(request.text) > 20:
            ai_detected, ai_tokens = await ai_detection(
                text=request.text,
                language=request.language,
                min_confidence=request.min_confidence,
            )
            detected_ids = {d.reference_id for d in detected}
            for ref in ai_detected:
                if ref.reference_id not in detected_ids:
                    detected.append(ref)
            tokens_used = ai_tokens

        # Get explanations in target language
        for ref in detected:
            explanation = await get_explanation(
                ref.reference_id, request.target_language
            )
            if explanation:
                if request.target_language == "en":
                    ref.short_explanation_en = explanation.short_explanation
                elif request.target_language == "es":
                    ref.short_explanation_es = explanation.short_explanation

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
        """Get explanation for a specific reference."""
        return await get_explanation(reference_id, language)

    async def enrich_text(
        self,
        text: str,
        language: str = "he",
        target_language: str = "en",
    ) -> EnrichedText:
        """Enrich text with cultural reference annotations."""
        request = ContextDetectionRequest(
            text=text,
            language=language,
            target_language=target_language,
            min_confidence=settings.olorin.cultural.detection_min_confidence,
        )
        detection = await self.detect_references(request)

        if not detection.references:
            return EnrichedText(
                original_text=text,
                enriched_text=text,
                annotations=[],
            )

        sorted_refs = sorted(
            detection.references,
            key=lambda r: r.start_position,
            reverse=True,
        )

        enriched = text
        annotations = []

        for ref in sorted_refs:
            marker = f"[{ref.reference_id}]"
            enriched = (
                enriched[: ref.end_position] + marker + enriched[ref.end_position :]
            )

            annotations.append(
                {
                    "reference_id": ref.reference_id,
                    "matched_text": ref.matched_text,
                    "canonical_name": ref.canonical_name,
                    "canonical_name_en": ref.canonical_name_en,
                    "category": ref.category,
                    "explanation": ref.short_explanation_en or ref.short_explanation,
                }
            )

        return EnrichedText(
            original_text=text,
            enriched_text=enriched,
            annotations=list(reversed(annotations)),
        )

    async def add_reference(
        self,
        reference_id: str,
        canonical_name: str,
        category: str,
        short_explanation: str,
        **kwargs,
    ) -> CulturalReference:
        """Add a new cultural reference."""
        return await crud.add_reference(
            reference_id=reference_id,
            canonical_name=canonical_name,
            category=category,
            short_explanation=short_explanation,
            alias_cache=self._alias_cache,
            **kwargs,
        )

    async def update_reference(
        self,
        reference_id: str,
        **updates,
    ) -> Optional[CulturalReference]:
        """Update a cultural reference."""
        return await crud.update_reference(
            reference_id=reference_id,
            alias_cache=self._alias_cache,
            **updates,
        )

    async def get_references_by_category(
        self,
        category: str,
        limit: int = 100,
    ) -> List[CulturalReference]:
        """Get references by category."""
        return await crud.get_references_by_category(category, limit)

    async def get_popular_references(
        self,
        limit: int = 50,
    ) -> List[CulturalReference]:
        """Get most frequently accessed references."""
        return await crud.get_popular_references(limit)


# Singleton instance
cultural_context_service = CulturalContextService()
