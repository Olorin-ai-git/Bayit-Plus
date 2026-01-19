"""
Kids Content Auditor Service

AI-powered kids content validation using Claude API.
Verifies content is appropriate for kids and correctly categorized.

Tasks:
- Verify age ratings match content
- Verify educational tags are accurate
- Check for inappropriate themes/language
- Suggest category improvements
"""

import asyncio
import json
import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

import anthropic

from app.core.config import settings
from app.models.content import Content, Category
from app.models.librarian import LibrarianAction

logger = logging.getLogger(__name__)


@dataclass
class KidsClassificationResult:
    """Result of a kids content classification verification."""
    content_id: str
    is_appropriate: bool
    suggested_age_rating: int  # 3, 5, 7, 10, 12
    current_age_rating: Optional[int]
    issues: List[str] = field(default_factory=list)
    suggested_tags: List[str] = field(default_factory=list)
    reasoning: Optional[str] = None
    confidence: float = 0.0


@dataclass
class KidsAuditResult:
    """Complete result of kids content audit."""
    total_items: int = 0
    healthy_items: int = 0
    age_rating_issues: List[Dict[str, Any]] = field(default_factory=list)
    category_issues: List[Dict[str, Any]] = field(default_factory=list)
    inappropriate_flags: List[Dict[str, Any]] = field(default_factory=list)
    missing_educational_tags: List[Dict[str, Any]] = field(default_factory=list)


async def audit_kids_content(
    audit_id: str,
    dry_run: bool = False,
    content_ids: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Audit all kids content for appropriateness and correct classification.

    Args:
        audit_id: Parent audit report ID
        dry_run: If true, only report issues without fixing
        content_ids: Optional specific content IDs to audit

    Returns:
        Dictionary with audit results.
    """
    logger.info("🧒 Starting kids content audit...")

    # Get kids content to audit
    query = {"is_kids_content": True, "is_published": True}
    if content_ids:
        query["_id"] = {"$in": content_ids}

    kids_content = await Content.find(query).to_list()
    logger.info(f"   Found {len(kids_content)} kids content items")

    result = KidsAuditResult(total_items=len(kids_content))

    if not kids_content:
        return {
            "status": "completed",
            "message": "No kids content to audit",
            "kids_audit_results": {
                "total_kids_items": 0,
            },
        }

    # Verify each item
    for content in kids_content:
        verification = await verify_kids_classification(content, audit_id, dry_run)

        if not verification.is_appropriate:
            result.inappropriate_flags.append({
                "content_id": str(content.id),
                "title": content.title[:50],
                "issues": verification.issues,
                "reasoning": verification.reasoning,
            })
        elif verification.suggested_age_rating != verification.current_age_rating:
            result.age_rating_issues.append({
                "content_id": str(content.id),
                "title": content.title[:50],
                "current_age_rating": verification.current_age_rating,
                "suggested_age_rating": verification.suggested_age_rating,
                "reasoning": verification.reasoning,
            })
        elif verification.suggested_tags and set(verification.suggested_tags) != set(content.educational_tags):
            result.missing_educational_tags.append({
                "content_id": str(content.id),
                "title": content.title[:50],
                "current_tags": content.educational_tags,
                "suggested_tags": verification.suggested_tags,
            })
        else:
            result.healthy_items += 1

        # Rate limiting
        await asyncio.sleep(0.2)

    logger.info(f"   ✅ Kids audit complete: {result.healthy_items}/{result.total_items} healthy")

    return {
        "status": "completed",
        "message": "Kids content audit completed",
        "kids_audit_results": {
            "total_kids_items": result.total_items,
            "healthy_items": result.healthy_items,
            "age_rating_issues": result.age_rating_issues,
            "category_issues": result.category_issues,
            "inappropriate_flags": result.inappropriate_flags,
            "missing_educational_tags": result.missing_educational_tags,
        },
    }


async def verify_kids_classification(
    content: Content,
    audit_id: str,
    dry_run: bool = False,
) -> KidsClassificationResult:
    """
    Use Claude AI to verify content is appropriate for kids and correctly categorized.

    Args:
        content: Content item to verify
        audit_id: Parent audit ID
        dry_run: If true, don't apply fixes

    Returns:
        KidsClassificationResult with verification details.
    """
    # Default result
    result = KidsClassificationResult(
        content_id=str(content.id),
        is_appropriate=True,
        suggested_age_rating=content.age_rating or 7,
        current_age_rating=content.age_rating,
    )

    try:
        # Prepare content data for Claude
        content_data = {
            "title": content.title,
            "title_en": content.title_en,
            "description": content.description[:500] if content.description else "",
            "category": content.category_name,
            "genre": content.genre,
            "current_age_rating": content.age_rating,
            "current_educational_tags": content.educational_tags,
            "content_rating": content.content_rating,
        }

        prompt = f"""You are a child safety expert reviewing content for the Bayit+ kids streaming platform.

**Content to Review:**
{json.dumps(content_data, ensure_ascii=False, indent=2)}

**Instructions:**
1. Determine if this content is appropriate for children (3-12 years)
2. Suggest the correct minimum age rating (3, 5, 7, 10, or 12)
3. Identify any inappropriate themes, language, or content
4. Suggest relevant educational tags

**Age Rating Guidelines:**
- Age 3: Simple, colorful, no conflict, gentle music/stories
- Age 5: Basic stories, mild cartoon action, learning content
- Age 7: More complex stories, cartoon action, educational content
- Age 10: Pre-teen content, mild drama, advanced learning
- Age 12: Tween content, complex themes (nothing inappropriate)

**Return JSON format:**
{{
    "is_appropriate": true/false,
    "suggested_age_rating": 7,
    "issues": ["issue1", "issue2"],
    "suggested_tags": ["hebrew", "music", "learning"],
    "reasoning": "Brief explanation"
}}

Return ONLY JSON, no additional text."""

        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}]
        )

        response_text = response.content[0].text.strip()

        # Clean up response
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]

        data = json.loads(response_text.strip())

        result.is_appropriate = data.get("is_appropriate", True)
        result.suggested_age_rating = data.get("suggested_age_rating", 7)
        result.issues = data.get("issues", [])
        result.suggested_tags = data.get("suggested_tags", [])
        result.reasoning = data.get("reasoning", "")
        result.confidence = 0.9 if result.is_appropriate else 0.8

        # Auto-fix if not dry run and issues found
        if not dry_run:
            changes_made = []

            # Update age rating if significantly different
            if result.suggested_age_rating != content.age_rating:
                content.age_rating = result.suggested_age_rating
                changes_made.append(f"age_rating: {content.age_rating} -> {result.suggested_age_rating}")

            # Add missing educational tags
            if result.suggested_tags:
                new_tags = list(set(content.educational_tags) | set(result.suggested_tags))
                if new_tags != content.educational_tags:
                    content.educational_tags = new_tags
                    changes_made.append(f"added_tags: {result.suggested_tags}")

            # Mark inappropriate content for manual review
            if not result.is_appropriate:
                content.kids_moderation_status = "pending"
                changes_made.append("moderation_status: pending")

            if changes_made:
                content.updated_at = datetime.utcnow()
                await content.save()

                # Log action
                action = LibrarianAction(
                    audit_id=audit_id,
                    action_type="kids_classification_fix",
                    content_id=str(content.id),
                    content_type="content",
                    issue_type="kids_classification",
                    before_state={
                        "age_rating": result.current_age_rating,
                        "educational_tags": content.educational_tags,
                    },
                    after_state={
                        "age_rating": result.suggested_age_rating,
                        "educational_tags": result.suggested_tags,
                    },
                    auto_approved=result.is_appropriate,
                    confidence_score=result.confidence,
                    description=f"Kids classification for '{content.title}': {', '.join(changes_made)}",
                )
                await action.insert()

    except json.JSONDecodeError as e:
        logger.warning(f"Failed to parse Claude response for {content.id}: {e}")
    except Exception as e:
        logger.error(f"Error verifying kids content {content.id}: {e}")

    return result


async def verify_age_ratings() -> Dict[str, Any]:
    """
    Verify all kids content has appropriate age ratings.

    Returns:
        Summary of age rating verification.
    """
    kids_content = await Content.find({
        "is_kids_content": True,
        "is_published": True,
    }).to_list()

    issues = []
    for content in kids_content:
        if content.age_rating is None:
            issues.append({
                "content_id": str(content.id),
                "title": content.title[:50],
                "issue": "missing_age_rating",
            })
        elif content.age_rating not in [3, 5, 7, 10, 12]:
            issues.append({
                "content_id": str(content.id),
                "title": content.title[:50],
                "issue": "invalid_age_rating",
                "current_rating": content.age_rating,
            })

    return {
        "total_checked": len(kids_content),
        "issues_found": len(issues),
        "issues": issues,
    }


async def validate_educational_tags() -> Dict[str, Any]:
    """
    Validate educational tags are properly assigned.

    Returns:
        Summary of tag validation.
    """
    kids_content = await Content.find({
        "is_kids_content": True,
        "is_published": True,
    }).to_list()

    missing_tags = []
    for content in kids_content:
        if not content.educational_tags:
            missing_tags.append({
                "content_id": str(content.id),
                "title": content.title[:50],
                "category": content.category_name,
            })

    return {
        "total_checked": len(kids_content),
        "missing_tags_count": len(missing_tags),
        "items_missing_tags": missing_tags[:50],
    }


async def check_kids_categories() -> Dict[str, Any]:
    """
    Verify content is in correct kids category.

    Returns:
        Summary of category verification.
    """
    VALID_KIDS_CATEGORIES = {
        "cartoons", "educational", "music", "hebrew", "stories", "jewish"
    }

    kids_content = await Content.find({
        "is_kids_content": True,
        "is_published": True,
    }).to_list()

    category_issues = []
    category_distribution = {}

    for content in kids_content:
        cat_name = content.category_name or "unknown"

        # Track distribution
        category_distribution[cat_name] = category_distribution.get(cat_name, 0) + 1

        # Check if in valid kids category
        if cat_name not in VALID_KIDS_CATEGORIES:
            category_issues.append({
                "content_id": str(content.id),
                "title": content.title[:50],
                "current_category": cat_name,
                "issue": "not_in_kids_category",
            })

    return {
        "total_checked": len(kids_content),
        "category_issues": len(category_issues),
        "distribution": category_distribution,
        "issues": category_issues[:50],
    }


async def detect_inappropriate_content() -> Dict[str, Any]:
    """
    AI-powered screening for non-kid-friendly content.

    Returns:
        List of flagged content items.
    """
    kids_content = await Content.find({
        "is_kids_content": True,
        "is_published": True,
        "$or": [
            {"kids_moderation_status": None},
            {"kids_moderation_status": "pending"},
        ],
    }).limit(100).to_list()

    flagged = []

    for content in kids_content:
        verification = await verify_kids_classification(content, "detection_audit", dry_run=True)

        if not verification.is_appropriate:
            flagged.append({
                "content_id": str(content.id),
                "title": content.title[:50],
                "issues": verification.issues,
                "reasoning": verification.reasoning,
            })

        # Rate limiting
        await asyncio.sleep(0.3)

    return {
        "scanned": len(kids_content),
        "flagged_count": len(flagged),
        "flagged_items": flagged,
    }


async def sync_kids_categories() -> Dict[str, Any]:
    """
    Ensure all 7 kids categories exist and are active.

    Returns:
        Summary of category sync.
    """
    from app.services.kids_content_seeder import KIDS_CATEGORIES

    created = 0
    updated = 0

    for category_key, category_data in KIDS_CATEGORIES.items():
        slug = f"kids-{category_key}"
        existing = await Category.find_one({"slug": slug})

        if existing:
            if not existing.is_active:
                existing.is_active = True
                await existing.save()
                updated += 1
        else:
            category = Category(
                name=category_data["name"],
                name_en=category_data["name_en"],
                name_es=category_data["name_es"],
                slug=slug,
                description=f"Kids content: {category_data['name_en']}",
                icon=category_data["icon"],
                is_active=True,
            )
            await category.insert()
            created += 1

    return {
        "total_categories": len(KIDS_CATEGORIES),
        "created": created,
        "updated": updated,
    }


async def get_kids_audit_summary() -> Dict[str, Any]:
    """
    Get a comprehensive summary of kids content health.

    Returns:
        Summary statistics for admin dashboard.
    """
    total = await Content.find({"is_kids_content": True}).count()
    published = await Content.find({"is_kids_content": True, "is_published": True}).count()

    # By age rating
    age_distribution = {}
    for age in [3, 5, 7, 10, 12]:
        count = await Content.find({
            "is_kids_content": True,
            "age_rating": age,
        }).count()
        age_distribution[f"age_{age}"] = count

    # By category
    category_distribution = {}
    for cat in ["cartoons", "educational", "music", "hebrew", "stories", "jewish"]:
        count = await Content.find({
            "is_kids_content": True,
            "category_name": cat,
        }).count()
        category_distribution[cat] = count

    # Moderation status
    pending = await Content.find({
        "is_kids_content": True,
        "kids_moderation_status": "pending",
    }).count()

    approved = await Content.find({
        "is_kids_content": True,
        "kids_moderation_status": "approved",
    }).count()

    return {
        "total_kids_content": total,
        "published": published,
        "age_distribution": age_distribution,
        "category_distribution": category_distribution,
        "moderation": {
            "pending": pending,
            "approved": approved,
        },
    }
