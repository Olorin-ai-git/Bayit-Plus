"""
Classification Verifier - AI-powered classification verification using Claude API.
"""
import json
import logging
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import anthropic
from app.models.content import Content
from app.models.content_taxonomy import ContentSection
from app.models.librarian import ClassificationVerificationCache
from app.services.content_auditor.constants import (
    ClassificationAuditConfig,
    get_anthropic_api_key,
    get_classification_audit_config,
    get_claude_model,
)

logger = logging.getLogger(__name__)


@dataclass
class ClassificationVerification:
    """Result of a classification verification."""

    content_id: str
    fit_score: int  # 1-10
    is_correct: bool
    suggested_category: Optional[str] = None
    reasoning: Optional[str] = None


async def get_cached_verifications(
    contents: List[Content],
    category_id: str,
    config: ClassificationAuditConfig,
) -> tuple[List[Dict[str, Any]], List[Content]]:
    """Check cache for existing verification results."""
    cached_misclass: List[Dict[str, Any]] = []
    uncached: List[Content] = []
    cache_threshold = datetime.utcnow() - timedelta(days=config.cache_ttl_days)

    for content in contents:
        cached = await ClassificationVerificationCache.find_one(
            {
                "content_id": str(content.id),
                "category_id": category_id,
                "last_verified": {"$gte": cache_threshold},
            }
        )
        if cached:
            if (
                not cached.is_correct
                and cached.fit_score < config.misclassification_threshold
            ):
                cached_misclass.append(
                    {
                        "content_id": str(content.id),
                        "current_category": cached.category_name,
                        "suggested_category": cached.suggested_category_name,
                        "fit_score": cached.fit_score,
                        "reasoning": cached.reasoning,
                        "confidence": (10 - cached.fit_score) / 10.0,
                    }
                )
        else:
            uncached.append(content)
    return cached_misclass, uncached


def build_verification_prompt(
    items_data: List[Dict[str, Any]],
    category: ContentSection,
) -> str:
    """Build the verification prompt for Claude."""
    return f"""You are an AI librarian for the Bayit+ system, an Israeli streaming platform.
Check if the following {len(items_data)} content items are correctly classified in their category.

**Current Category:**
Name: {category.name_key}
Description: {category.description_key or "Not available"}

**Content Items to Check:**
{json.dumps(items_data, ensure_ascii=False, indent=2)}

**Instructions:**
For each item, evaluate:
1. **Fit Score** (1-10): How well the item fits the category
   - 1-3: Does not fit at all, requires category change
   - 4-6: Partially fits, there may be a better category
   - 7-8: Fits well
   - 9-10: Perfect fit
2. **Is classification correct?** true/false
3. **Suggested category**: If score is below 7, suggest a better category
4. **Brief explanation**: Justify the decision

**Return JSON in the following format:**
{{
    "verifications": [
        {{
            "content_id": "...",
            "fit_score": 8,
            "is_correct": true,
            "suggested_category": null,
            "reasoning": "Israeli drama film, fits the movies category"
        }}
    ]
}}

Note: The response must be **only** JSON, no additional text."""


def parse_claude_response(response_text: str) -> List[Dict[str, Any]]:
    """Parse Claude's JSON response."""
    text = response_text.strip()
    if text.startswith("```json"):
        text = text[7:]
    if text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    data = json.loads(text.strip())
    return data.get("verifications", [])


async def verify_classification_batch(
    items: List[Content],
    category: ContentSection,
) -> List[ClassificationVerification]:
    """Batch verify if content items belong in their category using Claude AI."""
    if not items:
        return []

    items_data = [
        {
            "content_id": str(item.id),
            "title": item.title,
            "description": item.description[:200] if item.description else "",
            "genre": item.genre,
            "year": item.year,
            "is_series": item.is_series,
        }
        for item in items
    ]
    prompt = build_verification_prompt(items_data, category)

    try:
        client = anthropic.Anthropic(api_key=get_anthropic_api_key())
        response = client.messages.create(
            model=get_claude_model(),
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}],
        )
        response_text = response.content[0].text.strip()
        verifications_data = parse_claude_response(response_text)
        return [
            ClassificationVerification(
                content_id=v.get("content_id", ""),
                fit_score=v.get("fit_score", 5),
                is_correct=v.get("is_correct", True),
                suggested_category=v.get("suggested_category"),
                reasoning=v.get("reasoning", ""),
            )
            for v in verifications_data
        ]
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Claude response: {e}")
        return []
    except Exception as e:
        logger.error(f"Error calling Claude API: {e}")
        return []


async def cache_verification(
    verification: ClassificationVerification,
    category_id: str,
    config: ClassificationAuditConfig,
) -> None:
    """Cache a verification result."""
    try:
        from beanie import PydanticObjectId

        content = await Content.get(PydanticObjectId(verification.content_id))
        if not content:
            return

        category = await ContentSection.get(PydanticObjectId(category_id))
        cache_entry = ClassificationVerificationCache(
            content_id=verification.content_id,
            category_id=category_id,
            fit_score=verification.fit_score,
            is_correct=verification.is_correct,
            suggested_category_id=None,
            suggested_category_name=verification.suggested_category,
            reasoning=verification.reasoning,
            content_title=content.title,
            content_genre=content.genre,
            category_name=category.name_key if category else None,
            last_verified=datetime.utcnow(),
            expires_at=datetime.utcnow() + timedelta(days=config.cache_ttl_days),
        )
        await cache_entry.insert()
    except Exception as e:
        logger.warning(f"Failed to cache verification: {e}")
