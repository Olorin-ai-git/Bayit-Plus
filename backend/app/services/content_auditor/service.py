"""
Content Auditor Service - Main coordinator for content auditing operations.
"""
import asyncio
import logging
from typing import Any, Dict, List

from app.models.content import Content
from app.models.content_taxonomy import ContentSection
from app.services.content_auditor.classification_verifier import (
    cache_verification,
    get_cached_verifications,
    verify_classification_batch,
)
from app.services.content_auditor.constants import get_classification_audit_config
from app.services.content_auditor.metadata_auditor import check_metadata_completeness

logger = logging.getLogger(__name__)


async def verify_classifications(
    contents: List[Content], audit_id: str
) -> List[Dict[str, Any]]:
    """Verify content classifications using Claude AI with batch processing and caching."""
    misclassifications: List[Dict[str, Any]] = []
    config = get_classification_audit_config()

    # Group content by category for efficient batch processing
    category_groups: Dict[str, List[Content]] = {}
    for content in contents:
        if content.category_id not in category_groups:
            category_groups[content.category_id] = []
        category_groups[content.category_id].append(content)

    # Fetch all categories
    categories_dict: Dict[str, ContentSection] = {}
    all_categories = await ContentSection.find({}).to_list(length=None)
    for cat in all_categories:
        categories_dict[str(cat.id)] = cat

    # Verify each category group
    for category_id, group_contents in category_groups.items():
        category = categories_dict.get(category_id)
        if not category:
            logger.warning(f"Category {category_id} not found")
            continue

        logger.info(f"      Verifying {len(group_contents)} items in category: {category.name_key}")
        cached_results, uncached_contents = await get_cached_verifications(
            group_contents, category_id, config
        )
        misclassifications.extend(cached_results)

        if not uncached_contents:
            continue

        batch_size = config.verification_batch_size
        for i in range(0, len(uncached_contents), batch_size):
            batch = uncached_contents[i : i + batch_size]
            try:
                verifications = await verify_classification_batch(batch, category)
                for verification in verifications:
                    await cache_verification(verification, category_id, config)
                    if (
                        not verification.is_correct
                        and verification.fit_score < config.misclassification_threshold
                    ):
                        misclassifications.append({
                            "content_id": verification.content_id,
                            "current_category": category.name_key,
                            "suggested_category": verification.suggested_category,
                            "fit_score": verification.fit_score,
                            "reasoning": verification.reasoning,
                            "confidence": (10 - verification.fit_score) / 10.0,
                        })
            except Exception as e:
                logger.error(f"Failed to verify batch: {e}")
            await asyncio.sleep(config.rate_limit_delay)

    logger.info(f"      Found {len(misclassifications)} potential misclassifications")
    return misclassifications


async def audit_content_items(
    content_ids: List[str], audit_id: str, dry_run: bool = False
) -> Dict[str, Any]:
    """Audit content items for classification, metadata completeness, and quality."""
    logger.info(f"Auditing {len(content_ids)} content items...")
    results: Dict[str, Any] = {
        "status": "completed",
        "items_checked": len(content_ids),
        "missing_metadata": [],
        "misclassifications": [],
        "issues_found": 0,
    }
    if not content_ids:
        return results

    contents = await Content.find({"_id": {"$in": content_ids}}).to_list(length=None)
    logger.info(f"   Found {len(contents)} content items in database")

    logger.info("   Checking metadata completeness...")
    missing_metadata = await check_metadata_completeness(contents)
    results["missing_metadata"] = missing_metadata

    logger.info("   Verifying classifications with Claude AI...")
    misclassifications = await verify_classifications(contents, audit_id)
    results["misclassifications"] = misclassifications

    if not dry_run and (missing_metadata or misclassifications):
        logger.info("   Auto-fixing issues...")
        from app.services.auto_fixer import fix_content_issues
        await fix_content_issues(missing_metadata, dry_run)

    results["issues_found"] = len(missing_metadata) + len(misclassifications)
    logger.info(f"   Content audit complete: {results['issues_found']} issues found")
    return results


class ContentAuditorService:
    """Content Auditor Service class providing class-based interface to content auditing."""

    async def audit_items(
        self, content_ids: List[str], audit_id: str, dry_run: bool = False
    ) -> Dict[str, Any]:
        """Audit content items."""
        return await audit_content_items(content_ids, audit_id, dry_run)

    async def check_metadata(self, contents: List[Content]) -> List[Dict[str, Any]]:
        """Check metadata completeness for content items."""
        return await check_metadata_completeness(contents)

    async def verify_content_classifications(
        self, contents: List[Content], audit_id: str
    ) -> List[Dict[str, Any]]:
        """Verify content classifications using AI."""
        return await verify_classifications(contents, audit_id)
