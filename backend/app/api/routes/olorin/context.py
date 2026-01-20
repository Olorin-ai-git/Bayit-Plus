"""
Olorin.ai Cultural Context API

Endpoints for detecting and explaining Israeli/Jewish cultural references.
"""

import logging
from typing import List, Optional

from app.api.routes.olorin.dependencies import get_current_partner, verify_capability
from app.api.routes.olorin.errors import OlorinErrors, get_error_message
from app.models.cultural_reference import (
    ContextDetectionRequest,
    DetectedReference,
    ReferenceExplanation,
)
from app.models.integration_partner import IntegrationPartner
from app.services.olorin.cultural_context_service import cultural_context_service
from app.services.olorin.metering_service import metering_service
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter()


# ============================================
# Request/Response Models
# ============================================


class DetectRequest(BaseModel):
    """Request to detect cultural references."""

    text: str = Field(..., min_length=1, max_length=10000)
    language: str = Field(default="he", description="Input text language")
    target_language: str = Field(default="en", description="Language for explanations")
    min_confidence: float = Field(default=0.7, ge=0.0, le=1.0)
    include_detailed: bool = Field(default=False)


class DetectedReferenceItem(BaseModel):
    """A detected cultural reference."""

    reference_id: str
    canonical_name: str
    canonical_name_en: Optional[str] = None
    category: str
    subcategory: Optional[str] = None
    matched_text: str
    start_position: int
    end_position: int
    confidence: float
    short_explanation: str
    short_explanation_en: Optional[str] = None


class DetectionResponse(BaseModel):
    """Response with detected references."""

    original_text: str
    references: List[DetectedReferenceItem]
    total_found: int
    tokens_used: int


class ExplanationResponse(BaseModel):
    """Full explanation for a cultural reference."""

    reference_id: str
    canonical_name: str
    canonical_name_en: Optional[str] = None
    category: str
    subcategory: Optional[str] = None
    short_explanation: str
    detailed_explanation: Optional[str] = None
    wikipedia_url: Optional[str] = None
    image_url: Optional[str] = None
    related_references: List[str] = []


class EnrichRequest(BaseModel):
    """Request to enrich text with annotations."""

    text: str = Field(..., min_length=1, max_length=10000)
    language: str = Field(default="he")
    target_language: str = Field(default="en")


class EnrichResponse(BaseModel):
    """Enriched text with inline annotations."""

    original_text: str
    enriched_text: str
    annotations: List[dict]
    total_annotations: int


class CategoryReferencesResponse(BaseModel):
    """References in a category."""

    category: str
    references: List[ExplanationResponse]
    total: int


# ============================================
# Endpoints
# ============================================


@router.post(
    "/cultural/detect",
    response_model=DetectionResponse,
    summary="Detect cultural references",
    description="Detect Israeli/Jewish cultural references in text that may need "
    "explanation for non-Israeli viewers.",
)
async def detect_cultural_references(
    request: DetectRequest,
    partner: IntegrationPartner = Depends(get_current_partner),
):
    """Detect cultural references in text."""
    # Verify capability
    await verify_capability(partner, "cultural_context")

    try:
        # Create detection request
        detection_request = ContextDetectionRequest(
            text=request.text,
            language=request.language,
            target_language=request.target_language,
            min_confidence=request.min_confidence,
            include_detailed=request.include_detailed,
        )

        # Detect references
        result = await cultural_context_service.detect_references(detection_request)

        # Convert to response format
        items = [
            DetectedReferenceItem(
                reference_id=ref.reference_id,
                canonical_name=ref.canonical_name,
                canonical_name_en=ref.canonical_name_en,
                category=ref.category,
                subcategory=ref.subcategory,
                matched_text=ref.matched_text,
                start_position=ref.start_position,
                end_position=ref.end_position,
                confidence=ref.confidence,
                short_explanation=ref.short_explanation,
                short_explanation_en=ref.short_explanation_en,
            )
            for ref in result.references
        ]

        # Record usage
        await metering_service.record_context_usage(
            partner_id=partner.partner_id,
            tokens_used=result.tokens_used,
            references_found=len(items),
        )

        return DetectionResponse(
            original_text=result.original_text,
            references=items,
            total_found=len(items),
            tokens_used=result.tokens_used,
        )

    except Exception as e:
        logger.error(f"Cultural detection failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=get_error_message(OlorinErrors.DETECTION_FAILED),
        )


@router.get(
    "/cultural/explain/{reference_id}",
    response_model=ExplanationResponse,
    summary="Get reference explanation",
    description="Get full explanation for a specific cultural reference.",
)
async def get_reference_explanation(
    reference_id: str,
    language: str = "en",
    partner: IntegrationPartner = Depends(get_current_partner),
):
    """Get explanation for a cultural reference."""
    # Verify capability
    await verify_capability(partner, "cultural_context")

    try:
        explanation = await cultural_context_service.explain_reference(
            reference_id=reference_id,
            language=language,
        )

        if not explanation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=get_error_message(
                    OlorinErrors.REFERENCE_NOT_FOUND, reference_id=reference_id
                ),
            )

        # Record minimal usage
        await metering_service.record_context_usage(
            partner_id=partner.partner_id,
            tokens_used=10,  # Minimal for lookup
            references_found=1,
        )

        return ExplanationResponse(
            reference_id=explanation.reference_id,
            canonical_name=explanation.canonical_name,
            canonical_name_en=explanation.canonical_name_en,
            category=explanation.category,
            subcategory=explanation.subcategory,
            short_explanation=explanation.short_explanation,
            detailed_explanation=explanation.detailed_explanation,
            wikipedia_url=explanation.wikipedia_url,
            image_url=explanation.image_url,
            related_references=explanation.related_references,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get explanation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=get_error_message(OlorinErrors.EXPLANATION_FAILED),
        )


@router.post(
    "/cultural/enrich",
    response_model=EnrichResponse,
    summary="Enrich text with annotations",
    description="Enrich text with inline cultural reference annotations for "
    "display in subtitles or transcripts.",
)
async def enrich_text(
    request: EnrichRequest,
    partner: IntegrationPartner = Depends(get_current_partner),
):
    """Enrich text with cultural annotations."""
    # Verify capability
    await verify_capability(partner, "cultural_context")

    try:
        result = await cultural_context_service.enrich_text(
            text=request.text,
            language=request.language,
            target_language=request.target_language,
        )

        # Record usage
        await metering_service.record_context_usage(
            partner_id=partner.partner_id,
            tokens_used=len(request.text.split()) * 2,
            references_found=len(result.annotations),
        )

        return EnrichResponse(
            original_text=result.original_text,
            enriched_text=result.enriched_text,
            annotations=result.annotations,
            total_annotations=len(result.annotations),
        )

    except Exception as e:
        logger.error(f"Text enrichment failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=get_error_message(OlorinErrors.ENRICHMENT_FAILED),
        )


@router.get(
    "/cultural/categories/{category}",
    response_model=CategoryReferencesResponse,
    summary="Get references by category",
    description="Get all cultural references in a specific category.",
)
async def get_category_references(
    category: str,
    limit: int = 50,
    partner: IntegrationPartner = Depends(get_current_partner),
):
    """Get references by category."""
    # Verify capability
    await verify_capability(partner, "cultural_context")

    try:
        references = await cultural_context_service.get_references_by_category(
            category=category,
            limit=limit,
        )

        items = [
            ExplanationResponse(
                reference_id=ref.reference_id,
                canonical_name=ref.canonical_name,
                canonical_name_en=ref.canonical_name_en,
                category=ref.category,
                subcategory=ref.subcategory,
                short_explanation=ref.short_explanation,
                detailed_explanation=ref.detailed_explanation,
                wikipedia_url=ref.wikipedia_url,
                image_url=ref.image_url,
                related_references=ref.related_references,
            )
            for ref in references
        ]

        return CategoryReferencesResponse(
            category=category,
            references=items,
            total=len(items),
        )

    except Exception as e:
        logger.error(f"Get category references failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=get_error_message(OlorinErrors.GET_REFERENCES_FAILED),
        )


@router.get(
    "/cultural/popular",
    response_model=CategoryReferencesResponse,
    summary="Get popular references",
    description="Get most frequently accessed cultural references.",
)
async def get_popular_references(
    limit: int = 50,
    partner: IntegrationPartner = Depends(get_current_partner),
):
    """Get most popular references."""
    # Verify capability
    await verify_capability(partner, "cultural_context")

    try:
        references = await cultural_context_service.get_popular_references(limit=limit)

        items = [
            ExplanationResponse(
                reference_id=ref.reference_id,
                canonical_name=ref.canonical_name,
                canonical_name_en=ref.canonical_name_en,
                category=ref.category,
                subcategory=ref.subcategory,
                short_explanation=ref.short_explanation,
                detailed_explanation=ref.detailed_explanation,
                wikipedia_url=ref.wikipedia_url,
                image_url=ref.image_url,
                related_references=ref.related_references,
            )
            for ref in references
        ]

        return CategoryReferencesResponse(
            category="popular",
            references=items,
            total=len(items),
        )

    except Exception as e:
        logger.error(f"Get popular references failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=get_error_message(OlorinErrors.GET_REFERENCES_FAILED),
        )
