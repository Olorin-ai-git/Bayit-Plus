"""
Auto-Fixer Service
Safe automated issue resolution with rollback capability
"""
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from dataclasses import dataclass

from beanie import PydanticObjectId
from app.models.content import Content, Category
from app.models.librarian import LibrarianAction
from app.services.tmdb_service import tmdb_service

logger = logging.getLogger(__name__)


@dataclass
class FixResult:
    """Result of a fix operation"""
    success: bool
    action_id: Optional[str] = None
    error_message: Optional[str] = None
    fields_updated: Optional[List[str]] = None


async def fix_content_issues(
    missing_metadata: List[Dict[str, Any]],
    misclassifications: List[Dict[str, Any]],
    audit_id: str
) -> Dict[str, Any]:
    """
    Fix content issues safely with rollback capability.

    Args:
        missing_metadata: List of items with missing metadata
        misclassifications: List of misclassified items
        audit_id: Parent audit report ID

    Returns:
        Dictionary with fix results
    """
    logger.info("🔧 Auto-fixing issues...")

    results = {
        "metadata_fixes": 0,
        "reclassifications": 0,
        "failed_fixes": 0,
    }

    # Fix missing metadata
    for item in missing_metadata:
        try:
            fix_result = await fix_missing_metadata(
                item["content_id"],
                item["issues"],
                audit_id
            )
            if fix_result.success:
                results["metadata_fixes"] += 1
            else:
                results["failed_fixes"] += 1
        except Exception as e:
            logger.error(f"❌ Failed to fix metadata for {item['content_id']}: {e}")
            results["failed_fixes"] += 1

    # Fix misclassifications (only high confidence)
    for item in misclassifications:
        confidence = item.get("confidence", 0)

        # Only auto-fix if confidence > 90%
        if confidence > 0.9:
            try:
                fix_result = await fix_misclassification(
                    item["content_id"],
                    item["suggested_category"],
                    confidence,
                    audit_id
                )
                if fix_result.success:
                    results["reclassifications"] += 1
                else:
                    results["failed_fixes"] += 1
            except Exception as e:
                logger.error(f"❌ Failed to reclassify {item['content_id']}: {e}")
                results["failed_fixes"] += 1
        else:
            logger.info(f"   Skipping reclassification (confidence {confidence:.0%} < 90%)")

    logger.info(f"   ✅ Fixed {results['metadata_fixes']} metadata issues")
    logger.info(f"   ✅ Reclassified {results['reclassifications']} items")
    logger.info(f"   ❌ Failed to fix {results['failed_fixes']} issues")

    return results


async def fix_missing_metadata(
    content_id: str,
    issues: List[str],
    audit_id: str
) -> FixResult:
    """
    Fix missing metadata using TMDB service.

    Auto-approved fixes:
    - Add missing poster/backdrop
    - Update IMDB ratings
    - Fix broken TMDB image URLs
    """
    try:
        content = await Content.get(PydanticObjectId(content_id))
        if not content:
            return FixResult(success=False, error_message="Content not found")

        # Store before state for rollback
        before_state = {
            "thumbnail": content.thumbnail,
            "backdrop": content.backdrop,
            "tmdb_id": content.tmdb_id,
            "imdb_id": content.imdb_id,
            "imdb_rating": content.imdb_rating,
            "imdb_votes": content.imdb_votes,
            "description": content.description,
            "genre": content.genre,
            "genres": getattr(content, 'genres', None),  # May not exist in old documents
            "cast": content.cast,
            "director": content.director,
        }

        changes_made = []
        after_state = before_state.copy()
        enriched = None

        # Enrich from TMDB if we have the title
        if "missing_tmdb_id" in issues or "missing_imdb_id" in issues or \
           "missing_thumbnail" in issues or "missing_backdrop" in issues:

            logger.info(f"   🔍 Fetching TMDB data for '{content.title}' ({content.year})")
            if content.is_series:
                enriched = await tmdb_service.enrich_series_content(content.title, content.year)
            else:
                enriched = await tmdb_service.enrich_movie_content(content.title, content.year)

            # Log what we got back from TMDB
            if not enriched.get("tmdb_id"):
                logger.warning(f"   ⚠️ TMDB search found no results for '{content.title}'")
            else:
                logger.info(f"   ✓ TMDB found ID {enriched.get('tmdb_id')}, has_poster={bool(enriched.get('poster'))}, has_backdrop={bool(enriched.get('backdrop'))}, has_metadata={bool(enriched.get('overview'))}")

            # Apply enriched data
            if enriched.get("tmdb_id") and not content.tmdb_id:
                content.tmdb_id = enriched["tmdb_id"]
                after_state["tmdb_id"] = enriched["tmdb_id"]
                changes_made.append("added_tmdb_id")

            if enriched.get("imdb_id") and not content.imdb_id:
                content.imdb_id = enriched["imdb_id"]
                after_state["imdb_id"] = enriched["imdb_id"]
                changes_made.append("added_imdb_id")

            # Add poster (thumbnail/cover photo)
            if enriched.get("poster") and not content.thumbnail:
                content.thumbnail = enriched["poster"]
                after_state["thumbnail"] = enriched["poster"]
                changes_made.append("added_thumbnail")

            # Add backdrop (wide background image)
            if enriched.get("backdrop") and not content.backdrop:
                content.backdrop = enriched["backdrop"]
                after_state["backdrop"] = enriched["backdrop"]
                changes_made.append("added_backdrop")

            if enriched.get("overview") and not content.description:
                content.description = enriched["overview"]
                after_state["description"] = enriched["overview"]
                changes_made.append("added_description")

            if enriched.get("genres"):
                # Store full genres list
                if not content.genres:
                    content.genres = enriched["genres"]
                    after_state["genres"] = content.genres
                    changes_made.append("added_genres")

                # Also update legacy genre field (for backward compatibility)
                if not content.genre:
                    content.genre = ", ".join(enriched["genres"][:2])  # First 2 genres
                    after_state["genre"] = content.genre
                    changes_made.append("added_genre")

            if enriched.get("cast") and not content.cast:
                content.cast = enriched["cast"]
                after_state["cast"] = enriched["cast"]
                changes_made.append("added_cast")

            if enriched.get("director") and not content.director:
                content.director = enriched["director"]
                after_state["director"] = enriched["director"]
                changes_made.append("added_director")

        # Update timestamp
        content.updated_at = datetime.utcnow()

        # Save changes
        if changes_made:
            await content.save()

            # Log action
            action = LibrarianAction(
                audit_id=audit_id,
                action_type="update_metadata",
                content_id=content_id,
                content_type="content",
                issue_type="missing_metadata",
                before_state=before_state,
                after_state=after_state,
                auto_approved=True,
                rollback_available=True,
                description=f"Fixed missing metadata: {', '.join(changes_made)}",
            )
            await action.insert()

            logger.info(f"   ✓ Fixed metadata for '{content.title}': {', '.join(changes_made)}")
            return FixResult(success=True, action_id=str(action.id), fields_updated=changes_made)
        else:
            # Provide more specific error message
            if not enriched or not enriched.get("tmdb_id"):
                error_msg = f"No TMDB search results found for '{content.title}'"
            elif not enriched.get("poster") and not enriched.get("backdrop"):
                error_msg = f"TMDB found but no images available for '{content.title}'"
            else:
                error_msg = f"No applicable fixes for '{content.title}' (fields already populated)"

            logger.info(f"   - {error_msg}")
            return FixResult(success=False, error_message=error_msg)

    except Exception as e:
        logger.error(f"Failed to fix metadata: {e}")
        return FixResult(success=False, error_message=str(e))


async def fix_misclassification(
    content_id: str,
    suggested_category: str,
    confidence: float,
    audit_id: str
) -> FixResult:
    """
    Fix misclassification by re-categorizing content.

    Only applied if confidence > 90%.
    """
    try:
        content = await Content.get(PydanticObjectId(content_id))
        if not content:
            return FixResult(success=False, error_message="Content not found")

        # Find the suggested category
        new_category = await Category.find_one({
            "$or": [
                {"name": suggested_category},
                {"name_en": suggested_category},
                {"slug": suggested_category.lower().replace(" ", "-")}
            ]
        })

        if not new_category:
            logger.warning(f"   Suggested category '{suggested_category}' not found")
            return FixResult(success=False, error_message="Category not found")

        # Store before state
        old_category = await Category.get(PydanticObjectId(content.category_id))
        before_state = {
            "category_id": content.category_id,
            "category_name": old_category.name if old_category else None,
        }

        # Apply change
        content.category_id = str(new_category.id)
        content.category_name = new_category.name
        content.updated_at = datetime.utcnow()

        await content.save()

        after_state = {
            "category_id": str(new_category.id),
            "category_name": new_category.name,
        }

        # Log action
        action = LibrarianAction(
            audit_id=audit_id,
            action_type="recategorize",
            content_id=content_id,
            content_type="content",
            issue_type="misclassification",
            before_state=before_state,
            after_state=after_state,
            confidence_score=confidence,
            auto_approved=True,
            rollback_available=True,
            description=f"Reclassified from '{before_state['category_name']}' to '{new_category.name}' (confidence: {confidence:.0%})",
        )
        await action.insert()

        logger.info(f"   ✓ Reclassified '{content.title}' to '{new_category.name}' ({confidence:.0%})")
        return FixResult(success=True, action_id=str(action.id))

    except Exception as e:
        logger.error(f"Failed to fix misclassification: {e}")
        return FixResult(success=False, error_message=str(e))


async def rollback_action(action_id: str) -> FixResult:
    """
    Rollback a librarian action to its previous state.

    Args:
        action_id: The action ID to rollback

    Returns:
        FixResult indicating success or failure
    """
    try:
        action = await LibrarianAction.get(PydanticObjectId(action_id))
        if not action:
            return FixResult(success=False, error_message="Action not found")

        if not action.rollback_available:
            return FixResult(success=False, error_message="Rollback not available for this action")

        if action.rolled_back:
            return FixResult(success=False, error_message="Action already rolled back")

        # Get the content
        content = await Content.get(PydanticObjectId(action.content_id))
        if not content:
            return FixResult(success=False, error_message="Content not found")

        # Restore previous state
        before_state = action.before_state

        if action.action_type == "update_metadata":
            # Restore metadata fields
            for field, value in before_state.items():
                setattr(content, field, value)

        elif action.action_type == "recategorize":
            # Restore category
            content.category_id = before_state["category_id"]
            content.category_name = before_state.get("category_name")

        content.updated_at = datetime.utcnow()
        await content.save()

        # Mark action as rolled back
        action.rolled_back = True
        action.rollback_timestamp = datetime.utcnow()
        await action.save()

        logger.info(f"   ✓ Rolled back action {action_id}")
        return FixResult(success=True)

    except Exception as e:
        logger.error(f"Failed to rollback action: {e}")
        return FixResult(success=False, error_message=str(e))
