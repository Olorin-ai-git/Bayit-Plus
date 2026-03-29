"""
Olorin.ai Trivia B2B API

B2B endpoints for generating trivia from content and embedding quizzes.
"""

import logging
from typing import Dict, List, Optional

from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.api.routes.olorin.dependencies import (
    get_current_partner,
    verify_capability,
)
from app.api.routes.olorin.errors import OlorinErrors, get_error_message
from app.core.config import settings
from app.models.content import Content
from app.models.integration_partner import IntegrationPartner
from app.models.trivia import ContentTrivia
from app.services.olorin.metering_service import metering_service
from app.services.trivia.trivia_generator import TriviaGenerationService

logger = logging.getLogger(__name__)

router = APIRouter()

_trivia_service = TriviaGenerationService()


class TriviaGenerateRequest(BaseModel):
    """Request to generate trivia for content."""

    content_id: str = Field(..., description="Content ID")
    language: str = Field(default="en", description="Response language (en, he, es)")
    enrich: bool = Field(default=True, description="Include enriched trivia")


class TriviaFact(BaseModel):
    """A single trivia fact."""

    fact_id: str
    text: str
    source_language: str = "en"
    translations: Dict[str, str] = Field(default_factory=dict)


class TriviaGenerateResponse(BaseModel):
    """Response with generated trivia."""

    content_id: str
    facts: List[TriviaFact]
    total_facts: int
    sources_used: List[str] = Field(default_factory=list)
    is_enriched: bool = False


class TriviaEmbedResponse(BaseModel):
    """Response with embeddable quiz info."""

    quiz_id: str
    content_id: str
    embed_url: str
    iframe_html: str
    question_count: int


@router.post(
    "/generate",
    response_model=TriviaGenerateResponse,
    summary="Generate trivia for content",
)
async def generate_trivia(
    request: TriviaGenerateRequest,
    partner: IntegrationPartner = Depends(get_current_partner),
) -> TriviaGenerateResponse:
    """Generate AI-powered trivia questions for content."""
    await verify_capability(partner, "trivia")

    content = await Content.get(PydanticObjectId(request.content_id))
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=get_error_message(OlorinErrors.CONTENT_NOT_FOUND),
        )

    try:
        trivia = await _trivia_service.generate_trivia(
            content=content, enrich=request.enrich,
        )
    except Exception as exc:
        logger.exception(
            "Trivia generation failed",
            extra={
                "content_id": request.content_id,
                "partner": partner.partner_id,
            },
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=get_error_message(OlorinErrors.TRIVIA_GENERATION_FAILED),
        ) from exc

    facts = [
        TriviaFact(
            fact_id=f.fact_id,
            text=f.translations.get(request.language, f.text),
            source_language=f.source_language,
            translations=f.translations,
        )
        for f in trivia.facts
    ]

    await metering_service.record_usage(
        partner_id=partner.partner_id,
        capability="trivia",
        metadata={
            "content_id": request.content_id,
            "facts_generated": len(facts),
        },
    )

    return TriviaGenerateResponse(
        content_id=request.content_id,
        facts=facts,
        total_facts=len(facts),
        sources_used=trivia.sources_used,
        is_enriched=trivia.is_enriched,
    )


@router.get(
    "/{content_id}/embed",
    response_model=TriviaEmbedResponse,
    summary="Get embeddable trivia quiz",
)
async def get_trivia_embed(
    content_id: str,
    language: str = "en",
    partner: IntegrationPartner = Depends(get_current_partner),
) -> TriviaEmbedResponse:
    """Get an embeddable quiz widget URL for content trivia."""
    await verify_capability(partner, "trivia")

    trivia = await ContentTrivia.find_one(
        ContentTrivia.content_id == content_id
    )
    if not trivia:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=get_error_message(OlorinErrors.TRIVIA_NOT_FOUND),
        )

    quiz_id = str(trivia.id)
    base_url = settings.olorin.api_base_url
    embed_url = (
        f"{base_url}/v1/trivia/{quiz_id}/widget"
        f"?lang={language}&partner={partner.partner_id}"
    )
    iframe_html = (
        f'<iframe src="{embed_url}" '
        f'width="100%" height="400" '
        f'frameborder="0" allow="clipboard-write"></iframe>'
    )

    return TriviaEmbedResponse(
        quiz_id=quiz_id,
        content_id=content_id,
        embed_url=embed_url,
        iframe_html=iframe_html,
        question_count=len(trivia.facts),
    )
