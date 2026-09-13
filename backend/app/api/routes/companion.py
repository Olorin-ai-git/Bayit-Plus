"""
AI Companion Endpoints - Structured context and quiz generation for VOD content.

Provides content-aware AI companion features during video playback:
- Context: educational topics, related links, and summary for the content
- Quiz: comprehension questions generated from content metadata
"""

import json
import uuid
from typing import Optional

import anthropic
from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.ai_clients import get_sync_anthropic_client

from app.core.config import settings
from app.core.logging_config import get_logger
from app.core.security import get_current_active_user
from app.api.dependencies.training_context import deduct_training_credits_if_applicable
from app.models.content import Content
from app.models.user import User

logger = get_logger(__name__)
router = APIRouter()

_client: Optional[anthropic.Anthropic] = None


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = get_sync_anthropic_client(api_key=settings.ANTHROPIC_API_KEY)
    return _client


class CompanionRequest(BaseModel):
    content_id: str
    language: str = "en"


class CompanionTopic(BaseModel):
    id: str
    title: str
    description: Optional[str] = None


class CompanionLink(BaseModel):
    id: str
    title: str
    url: str


class CompanionContextResponse(BaseModel):
    context: Optional[str] = None
    topics: list[CompanionTopic] = []
    related_links: list[CompanionLink] = []


class QuizQuestion(BaseModel):
    id: str
    question: str
    options: list[str]
    correct_index: int
    explanation: Optional[str] = None
    category: Optional[str] = None
    difficulty: Optional[str] = None


class CompanionQuizResponse(BaseModel):
    questions: list[QuizQuestion] = []


class VocabularyItem(BaseModel):
    id: str
    term: str
    definition: str
    usage_example: Optional[str] = None
    category: Optional[str] = None


class CompanionVocabularyResponse(BaseModel):
    terms: list[VocabularyItem] = []


class CulturalReference(BaseModel):
    id: str
    term: str
    explanation: str
    category: Optional[str] = None
    origin: Optional[str] = None


class CompanionCulturalResponse(BaseModel):
    references: list[CulturalReference] = []


async def _fetch_content(content_id: str) -> Content:
    try:
        content = await Content.get(PydanticObjectId(content_id))
    except Exception:
        content = None
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    return content


def _build_content_summary(content: Content) -> str:
    parts = [f"Title: {content.title}"]
    if content.title_en:
        parts.append(f"English Title: {content.title_en}")
    if content.description:
        parts.append(f"Description: {content.description}")
    if content.description_en:
        parts.append(f"English Description: {content.description_en}")
    if content.genre:
        parts.append(f"Genre: {content.genre}")
    if content.cast:
        parts.append(f"Cast: {', '.join(content.cast[:5])}")
    if content.director:
        parts.append(f"Director: {content.director}")
    if content.year:
        parts.append(f"Year: {content.year}")
    if content.topic_tags:
        parts.append(f"Topics: {', '.join(content.topic_tags)}")
    return "\n".join(parts)


@router.post("/context", response_model=CompanionContextResponse)
async def get_companion_context(
    request: CompanionRequest,
    current_user: User = Depends(get_current_active_user),
) -> CompanionContextResponse:
    # Training portal credit deduction (no-op for B2C users)
    await deduct_training_credits_if_applicable(current_user, "companion")

    content = await _fetch_content(request.content_id)
    summary = _build_content_summary(content)

    prompt = (
        f"Based on this content:\n{summary}\n\n"
        "Generate educational context for a viewer. "
        "Return valid JSON with this exact structure:\n"
        '{"context": "A 2-3 sentence summary of what makes this content interesting",'
        ' "topics": [{"id": "unique-id", "title": "Topic Name",'
        ' "description": "Brief explanation"}],'
        ' "related_links": [{"id": "unique-id", "title": "Link Title",'
        ' "url": "https://..."}]}\n'
        "Include 2-4 topics about themes, cultural references, or historical context. "
        "Include 1-2 related links to Wikipedia or educational resources. "
        f"Respond in {request.language}. Return ONLY the JSON, no markdown."
    )

    try:
        client = _get_client()
        resp = client.messages.create(
            model=settings.CLAUDE_MODEL,
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = next((b.text for b in resp.content if b.type == "text"), "{}")
        data = json.loads(raw)
        return CompanionContextResponse(
            context=data.get("context"),
            topics=[CompanionTopic(**t) for t in data.get("topics", [])],
            related_links=[CompanionLink(**l) for l in data.get("related_links", [])],
        )
    except json.JSONDecodeError:
        logger.warning("Companion context: invalid JSON from AI", extra={
            "content_id": request.content_id,
        })
        return CompanionContextResponse(context=raw if raw else None)
    except anthropic.APIError as e:
        logger.error("Companion context AI error", extra={"error": str(e)})
        raise HTTPException(status_code=502, detail="AI service unavailable")


@router.post("/quiz", response_model=CompanionQuizResponse)
async def get_companion_quiz(
    request: CompanionRequest,
    current_user: User = Depends(get_current_active_user),
) -> CompanionQuizResponse:
    # Training portal credit deduction (no-op for B2C users)
    await deduct_training_credits_if_applicable(current_user, "companion")

    content = await _fetch_content(request.content_id)
    summary = _build_content_summary(content)

    prompt = (
        f"Based on this content:\n{summary}\n\n"
        "Generate 4 multiple-choice comprehension questions for a viewer. "
        "Return valid JSON with this exact structure:\n"
        '{"questions": [{"id": "q1", "question": "Question text?",'
        ' "options": ["A", "B", "C", "D"], "correct_index": 0,'
        ' "explanation": "Why this is correct",'
        ' "category": "comprehension", "difficulty": "medium"}]}\n'
        "Mix question types: plot, characters, themes, cultural context. "
        f"Respond in {request.language}. Return ONLY the JSON, no markdown."
    )

    try:
        client = _get_client()
        resp = client.messages.create(
            model=settings.CLAUDE_MODEL,
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = next((b.text for b in resp.content if b.type == "text"), "{}")
        data = json.loads(raw)
        questions = []
        for q in data.get("questions", []):
            if not q.get("id"):
                q["id"] = str(uuid.uuid4())[:8]
            questions.append(QuizQuestion(**q))
        return CompanionQuizResponse(questions=questions)
    except json.JSONDecodeError:
        logger.warning("Companion quiz: invalid JSON from AI", extra={
            "content_id": request.content_id,
        })
        return CompanionQuizResponse()
    except anthropic.APIError as e:
        logger.error("Companion quiz AI error", extra={"error": str(e)})
        raise HTTPException(status_code=502, detail="AI service unavailable")


@router.post("/vocabulary", response_model=CompanionVocabularyResponse)
async def get_companion_vocabulary(
    request: CompanionRequest,
    current_user: User = Depends(get_current_active_user),
) -> CompanionVocabularyResponse:
    # Training portal credit deduction (no-op for B2C users)
    await deduct_training_credits_if_applicable(current_user, "companion")

    content = await _fetch_content(request.content_id)
    summary = _build_content_summary(content)

    prompt = (
        f"Based on this content:\n{summary}\n\n"
        "Generate 5-8 key vocabulary terms a viewer should know. "
        "Return valid JSON with this exact structure:\n"
        '{"terms": [{"id": "unique-id", "term": "Term",'
        ' "definition": "Clear definition",'
        ' "usage_example": "Example sentence using the term",'
        ' "category": "cultural|historical|linguistic|technical"}]}\n'
        "Focus on culturally significant words, proper nouns, "
        "historical references, and domain-specific terminology. "
        f"Respond in {request.language}. Return ONLY the JSON, no markdown."
    )

    try:
        client = _get_client()
        resp = client.messages.create(
            model=settings.CLAUDE_MODEL,
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = next((b.text for b in resp.content if b.type == "text"), "{}")
        data = json.loads(raw)
        terms = []
        for t in data.get("terms", []):
            if not t.get("id"):
                t["id"] = str(uuid.uuid4())[:8]
            terms.append(VocabularyItem(**t))
        return CompanionVocabularyResponse(terms=terms)
    except json.JSONDecodeError:
        logger.warning("Companion vocabulary: invalid JSON from AI", extra={
            "content_id": request.content_id,
        })
        return CompanionVocabularyResponse()
    except anthropic.APIError as e:
        logger.error("Companion vocabulary AI error", extra={"error": str(e)})
        raise HTTPException(status_code=502, detail="AI service unavailable")


@router.post("/cultural", response_model=CompanionCulturalResponse)
async def get_cultural_context(
    request: CompanionRequest,
    current_user: User = Depends(get_current_active_user),
) -> CompanionCulturalResponse:
    # Training portal credit deduction (no-op for B2C users)
    await deduct_training_credits_if_applicable(current_user, "cultural")

    content = await _fetch_content(request.content_id)
    summary = _build_content_summary(content)

    prompt = (
        f"Based on this content:\n{summary}\n\n"
        "Identify 3-6 cultural references, traditions, or customs "
        "that appear in this content. "
        "Return valid JSON with this exact structure:\n"
        '{"references": [{"id": "unique-id", "term": "Cultural Term",'
        ' "explanation": "What this means and why it matters",'
        ' "category": "religious|historical|linguistic|social|culinary|musical",'
        ' "origin": "Brief origin or background"}]}\n'
        "Focus on Jewish, Israeli, and Middle Eastern cultural elements. "
        f"Respond in {request.language}. Return ONLY the JSON, no markdown."
    )

    try:
        client = _get_client()
        resp = client.messages.create(
            model=settings.CLAUDE_MODEL,
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = next((b.text for b in resp.content if b.type == "text"), "{}")
        data = json.loads(raw)
        refs = []
        for r in data.get("references", []):
            if not r.get("id"):
                r["id"] = str(uuid.uuid4())[:8]
            refs.append(CulturalReference(**r))
        return CompanionCulturalResponse(references=refs)
    except json.JSONDecodeError:
        logger.warning("Companion cultural: invalid JSON from AI",
                       extra={"content_id": request.content_id})
        return CompanionCulturalResponse()
    except anthropic.APIError as e:
        logger.error("Companion cultural AI error", extra={"error": str(e)})
        raise HTTPException(status_code=502, detail="AI service unavailable")
