"""
AI Agent Executors - Metadata Management

Functions for TMDB metadata, poster fixes, recategorization, and title cleaning.
"""

import logging
from datetime import datetime
from typing import Dict, Any, Optional

from beanie import PydanticObjectId

from app.models.content import Content, Category
from app.models.librarian import LibrarianAction
from app.services.auto_fixer import fix_missing_metadata as auto_fix_metadata

logger = logging.getLogger(__name__)


async def execute_search_tmdb(
    title: str,
    year: Optional[int] = None,
    content_type: str = "movie"
) -> Dict[str, Any]:
    """Search TMDB for content metadata."""
    try:
        from app.services.tmdb_service import TMDBService
        from app.core.config import settings

        if not settings.TMDB_API_KEY:
            return {
                "success": False,
                "error": "TMDB API key not configured. Set TMDB_API_KEY environment variable."
            }

        tmdb_service = TMDBService()

        if content_type == "movie" or content_type == "film":
            search_result = await tmdb_service.search_movie(title, year)
        else:
            search_result = await tmdb_service.search_tv_series(title, year)

        if not search_result:
            return {
                "success": True,
                "found": False,
                "message": f"No results found for '{title}'"
            }

        tmdb_id = search_result.get("id")
        if content_type == "movie" or content_type == "film":
            details = await tmdb_service.get_movie_details(tmdb_id)
        else:
            details = await tmdb_service.get_tv_series_details(tmdb_id)

        if not details:
            return {
                "success": True,
                "found": False,
                "message": f"Could not fetch details for TMDB ID {tmdb_id}"
            }

        release_date = details.get("release_date") or details.get("first_air_date", "")
        release_year = release_date[:4] if release_date else None

        return {
            "success": True,
            "found": True,
            "tmdb_data": {
                "tmdb_id": details.get("id"),
                "title": details.get("title") or details.get("name"),
                "description": details.get("overview"),
                "poster_path": details.get("poster_path"),
                "backdrop_path": details.get("backdrop_path"),
                "release_year": release_year,
                "imdb_rating": details.get("vote_average"),
                "genres": [g.get("name") for g in details.get("genres", [])],
            }
        }
    except Exception as e:
        logger.error(f"Error in search_tmdb: {str(e)}")
        return {"success": False, "error": str(e)}


async def execute_fix_missing_poster(
    content_id: str,
    audit_id: str,
    reason: str,
    dry_run: bool = False
) -> Dict[str, Any]:
    """Fix missing poster for a content item."""
    try:
        logger.info(f"   Fetching content {content_id} to fix poster...")

        if dry_run:
            return {
                "success": True,
                "dry_run": True,
                "message": f"[DRY RUN] Would fix missing poster for content {content_id}. Reason: {reason}"
            }

        logger.info("   Calling auto_fixer to retrieve poster from TMDB...")
        result = await auto_fix_metadata(content_id, ["missing_thumbnail"], audit_id)

        if result.success:
            logger.info(f"   Poster fixed successfully! Fields updated: {result.fields_updated}")
            return {
                "success": True,
                "fixed": True,
                "message": f"Added poster from TMDB (updated: {', '.join(result.fields_updated or [])})",
                "fields_updated": result.fields_updated or []
            }
        else:
            logger.warning(f"   Failed to fix poster: {result.error_message}")
            return {
                "success": False,
                "error": result.error_message or "Could not find poster on TMDB"
            }

    except Exception as e:
        logger.error(f"   Exception in fix_missing_poster: {str(e)}")
        return {"success": False, "error": str(e)}


async def execute_fix_missing_metadata(
    content_id: str,
    audit_id: str,
    reason: str,
    dry_run: bool = False
) -> Dict[str, Any]:
    """Fix missing metadata for a content item."""
    try:
        logger.info(f"   Fetching content {content_id} to fix metadata...")

        if dry_run:
            return {
                "success": True,
                "dry_run": True,
                "message": f"[DRY RUN] Would fix missing metadata for content {content_id}. Reason: {reason}"
            }

        logger.info("   Calling auto_fixer to retrieve metadata from TMDB...")
        issues = ["missing_tmdb_id", "missing_imdb_id", "missing_thumbnail", "missing_backdrop"]
        result = await auto_fix_metadata(content_id, issues, audit_id)

        if result.success:
            logger.info(f"   Metadata fixed successfully! Fields updated: {result.fields_updated}")
            return {
                "success": True,
                "fixed": True,
                "message": f"Updated metadata from TMDB (updated: {', '.join(result.fields_updated or [])})",
                "fields_updated": result.fields_updated or []
            }
        else:
            logger.warning(f"   Failed to fix metadata: {result.error_message}")
            return {
                "success": False,
                "error": result.error_message or "Failed to update metadata"
            }

    except Exception as e:
        logger.error(f"   Exception in fix_missing_metadata: {str(e)}")
        return {"success": False, "error": str(e)}


async def execute_recategorize_content(
    content_id: str,
    new_category_id: str,
    audit_id: str,
    reason: str,
    confidence: float,
    dry_run: bool = False
) -> Dict[str, Any]:
    """Recategorize a content item."""
    try:
        if confidence < 90:
            return {
                "success": False,
                "error": f"Confidence too low ({confidence}%). Requires 90%+ for auto-recategorization."
            }

        if dry_run:
            return {
                "success": True,
                "dry_run": True,
                "message": f"[DRY RUN] Would recategorize content {content_id} to {new_category_id}"
            }

        try:
            content = await Content.get(PydanticObjectId(content_id))
        except Exception as e:
            return {"success": False, "error": f"Content not found: {str(e)}"}

        try:
            new_category = await Category.get(PydanticObjectId(new_category_id))
        except Exception as e:
            return {"success": False, "error": f"Category not found: {str(e)}"}

        if not content:
            return {"success": False, "error": "Content not found"}
        if not new_category:
            return {"success": False, "error": f"Category not found (ID: {new_category_id})"}

        old_category_id = str(content.category_id) if content.category_id else None
        old_category = await Category.get(PydanticObjectId(content.category_id)) if content.category_id else None
        old_category_name = old_category.name if old_category else "None"

        before_state = {"category_id": old_category_id, "category_name": old_category_name}

        content.category_id = str(new_category.id)
        content.category_name = new_category.name
        content.updated_at = datetime.utcnow()
        await content.save()

        after_state = {"category_id": str(new_category.id), "category_name": new_category.name}

        action = LibrarianAction(
            audit_id=audit_id,
            action_type="recategorize",
            content_id=content_id,
            content_type="content",
            issue_type="misclassification",
            before_state=before_state,
            after_state=after_state,
            confidence_score=confidence / 100.0,
            auto_approved=True,
            rollback_available=True,
            description=f"Reclassified from '{old_category_name}' to '{new_category.name}' ({confidence}%). Reason: {reason}",
        )
        await action.insert()

        return {
            "success": True,
            "recategorized": True,
            "message": f"Recategorized from '{old_category_name}' to '{new_category.name}'",
            "old_category": old_category_name,
            "new_category": new_category.name,
            "title": content.title,
        }

    except Exception as e:
        logger.error(f"Error in recategorize_content: {str(e)}")
        return {"success": False, "error": str(e)}


async def execute_reclassify_as_series(
    content_id: str,
    audit_id: str,
    reason: str,
    dry_run: bool = False
) -> Dict[str, Any]:
    """Reclassify a content item as a TV series."""
    try:
        if dry_run:
            return {
                "success": True,
                "dry_run": True,
                "message": f"[DRY RUN] Would reclassify {content_id} as series. Reason: {reason}"
            }

        content = await Content.get(PydanticObjectId(content_id))
        if not content:
            return {"success": False, "error": "Content not found"}

        before_state = {
            "is_series": content.is_series,
            "content_type": content.content_type,
            "category_id": str(content.category_id) if content.category_id else None
        }

        series_category = await Category.find_one(
            {"$or": [{"slug": "series"}, {"name_en": "Series"}, {"name": "סדרות"}]}
        )
        new_category_id = str(series_category.id) if series_category else content.category_id

        content.is_series = True
        content.content_type = "series"
        if series_category:
            content.category_id = str(series_category.id)
            content.category_name = series_category.name
        content.updated_at = datetime.utcnow()
        await content.save()

        after_state = {
            "is_series": True,
            "content_type": "series",
            "category_id": new_category_id
        }

        action = LibrarianAction(
            audit_id=audit_id,
            action_type="reclassify",
            content_id=content_id,
            content_type="content",
            issue_type="misclassification",
            before_state=before_state,
            after_state=after_state,
            confidence_score=0.95,
            auto_approved=True,
            rollback_available=True,
            description=f"Reclassified as TV series. Reason: {reason}",
        )
        await action.insert()

        return {
            "success": True,
            "reclassified": True,
            "message": f"Reclassified '{content.title}' as TV series",
            "title": content.title,
            "new_type": "series"
        }

    except Exception as e:
        logger.error(f"Error in reclassify_as_series: {str(e)}")
        return {"success": False, "error": str(e)}


async def execute_reclassify_as_movie(
    content_id: str,
    audit_id: str,
    reason: str,
    dry_run: bool = False
) -> Dict[str, Any]:
    """Reclassify a content item as a movie."""
    try:
        if dry_run:
            return {
                "success": True,
                "dry_run": True,
                "message": f"[DRY RUN] Would reclassify {content_id} as movie. Reason: {reason}"
            }

        content = await Content.get(PydanticObjectId(content_id))
        if not content:
            return {"success": False, "error": "Content not found"}

        before_state = {
            "is_series": content.is_series,
            "content_type": content.content_type,
            "category_id": str(content.category_id) if content.category_id else None
        }

        movies_category = await Category.find_one(
            {"$or": [{"slug": "movies"}, {"name_en": "Movies"}, {"name": "סרטים"}]}
        )
        new_category_id = str(movies_category.id) if movies_category else content.category_id

        content.is_series = False
        content.content_type = "movie"
        if movies_category:
            content.category_id = str(movies_category.id)
            content.category_name = movies_category.name
        content.updated_at = datetime.utcnow()
        await content.save()

        after_state = {
            "is_series": False,
            "content_type": "movie",
            "category_id": new_category_id
        }

        action = LibrarianAction(
            audit_id=audit_id,
            action_type="reclassify",
            content_id=content_id,
            content_type="content",
            issue_type="misclassification",
            before_state=before_state,
            after_state=after_state,
            confidence_score=0.95,
            auto_approved=True,
            rollback_available=True,
            description=f"Reclassified as movie. Reason: {reason}",
        )
        await action.insert()

        return {
            "success": True,
            "reclassified": True,
            "message": f"Reclassified '{content.title}' as movie",
            "title": content.title,
            "new_type": "movie"
        }

    except Exception as e:
        logger.error(f"Error in reclassify_as_movie: {str(e)}")
        return {"success": False, "error": str(e)}


async def execute_flag_for_manual_review(
    content_id: str,
    issue_type: str,
    reason: str,
    priority: str = "medium"
) -> Dict[str, Any]:
    """Flag a content item for manual review."""
    try:
        content = await Content.get(PydanticObjectId(content_id))
        if not content:
            return {"success": False, "error": "Content not found"}

        content.needs_review = True
        content.review_reason = reason
        content.review_priority = priority
        content.review_issue_type = issue_type
        content.updated_at = datetime.utcnow()
        await content.save()

        return {
            "success": True,
            "flagged": True,
            "message": f"Flagged '{content.title}' for manual review ({priority} priority)",
            "title": content.title,
            "issue_type": issue_type,
            "priority": priority
        }

    except Exception as e:
        logger.error(f"Error in flag_for_manual_review: {str(e)}")
        return {"success": False, "error": str(e)}


async def execute_clean_title(
    content_id: str,
    audit_id: str,
    cleaned_title: str,
    reason: str,
    cleaned_title_en: Optional[str] = None,
    dry_run: bool = False
) -> Dict[str, Any]:
    """Clean up a content item's title."""
    try:
        if dry_run:
            return {
                "success": True,
                "dry_run": True,
                "message": f"[DRY RUN] Would clean title for {content_id}. Reason: {reason}"
            }

        content = await Content.get(PydanticObjectId(content_id))
        if not content:
            return {"success": False, "error": "Content not found"}

        before_state = {
            "title": content.title,
            "title_en": content.title_en
        }

        content.title = cleaned_title
        if cleaned_title_en:
            content.title_en = cleaned_title_en
        content.updated_at = datetime.utcnow()
        await content.save()

        after_state = {
            "title": cleaned_title,
            "title_en": cleaned_title_en or content.title_en
        }

        action = LibrarianAction(
            audit_id=audit_id,
            action_type="clean_title",
            content_id=content_id,
            content_type="content",
            issue_type="dirty_title",
            before_state=before_state,
            after_state=after_state,
            confidence_score=1.0,
            auto_approved=True,
            rollback_available=True,
            description=f"Cleaned title. Reason: {reason}",
        )
        await action.insert()

        return {
            "success": True,
            "cleaned": True,
            "message": f"Cleaned title from '{before_state['title']}' to '{cleaned_title}'",
            "old_title": before_state["title"],
            "new_title": cleaned_title,
        }

    except Exception as e:
        logger.error(f"Error in clean_title: {str(e)}")
        return {"success": False, "error": str(e)}
