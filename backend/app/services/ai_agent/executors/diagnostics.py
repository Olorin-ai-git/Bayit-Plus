"""
AI Agent Executors - Diagnostics

Functions for checking API configuration, finding duplicates, and quality variants.
"""

import logging
from typing import Dict, Any, List, Optional

from app.models.content import Content

logger = logging.getLogger(__name__)


async def execute_check_api_configuration() -> Dict[str, Any]:
    """Check which external APIs are configured and ready to use."""
    from app.core.config import settings

    try:
        api_status = {
            "tmdb": {
                "configured": bool(settings.TMDB_API_KEY),
                "description": "The Movie Database - metadata, posters, ratings"
            },
            "opensubtitles": {
                "configured": bool(settings.OPENSUBTITLES_API_KEY),
                "description": "OpenSubtitles - subtitle downloads"
            },
            "anthropic": {
                "configured": bool(settings.ANTHROPIC_API_KEY),
                "description": "Claude AI - content analysis"
            },
            "sendgrid": {
                "configured": bool(settings.SENDGRID_API_KEY),
                "description": "Email notifications"
            }
        }

        configured_count = sum(1 for api in api_status.values() if api["configured"])
        total_count = len(api_status)

        recommendations = []
        if not api_status["tmdb"]["configured"]:
            recommendations.append(
                "TMDB_API_KEY is not configured. Without it, metadata enrichment and poster "
                "retrieval will not work. Get a free API key at https://www.themoviedb.org/settings/api"
            )
        if not api_status["opensubtitles"]["configured"]:
            recommendations.append(
                "OPENSUBTITLES_API_KEY is not configured. Without it, automatic subtitle "
                "downloads will not work. Register at https://www.opensubtitles.com/consumers"
            )

        return {
            "success": True,
            "configured_apis": configured_count,
            "total_apis": total_count,
            "apis": api_status,
            "recommendations": recommendations,
            "message": f"{configured_count}/{total_count} APIs configured"
        }
    except Exception as e:
        logger.error(f"Error checking API configuration: {str(e)}")
        return {"success": False, "error": str(e)}


async def execute_find_duplicates(detection_type: str = "all") -> Dict[str, Any]:
    """Find duplicate content items in the library."""
    from app.services.duplicate_detection_service import get_duplicate_detection_service

    try:
        service = get_duplicate_detection_service()

        if detection_type == "all":
            result = await service.find_all_duplicates()
            return {
                "success": True,
                **result
            }
        elif detection_type == "hash":
            duplicates = await service.find_hash_duplicates()
            return {
                "success": True,
                "detection_type": "hash",
                "duplicate_groups": len(duplicates),
                "duplicates": duplicates[:20]
            }
        elif detection_type == "tmdb":
            duplicates = await service.find_tmdb_duplicates()
            return {
                "success": True,
                "detection_type": "tmdb",
                "duplicate_groups": len(duplicates),
                "duplicates": duplicates[:20]
            }
        elif detection_type == "imdb":
            duplicates = await service.find_imdb_duplicates()
            return {
                "success": True,
                "detection_type": "imdb",
                "duplicate_groups": len(duplicates),
                "duplicates": duplicates[:20]
            }
        elif detection_type == "exact_name":
            duplicates = await service.find_exact_name_duplicates()
            return {
                "success": True,
                "detection_type": "exact_name",
                "duplicate_groups": len(duplicates),
                "duplicates": duplicates[:20]
            }
        elif detection_type == "title":
            duplicates = await service.find_title_duplicates()
            return {
                "success": True,
                "detection_type": "title",
                "duplicate_groups": len(duplicates),
                "duplicates": duplicates[:20]
            }
        else:
            return {
                "success": False,
                "error": f"Unknown detection type: {detection_type}"
            }

    except Exception as e:
        logger.error(f"Error finding duplicates: {str(e)}")
        return {"success": False, "error": str(e)}


async def execute_resolve_duplicates(
    content_ids: List[str],
    keep_id: str,
    action: str = "unpublish",
    audit_id: str = None
) -> Dict[str, Any]:
    """Resolve a group of duplicate content items."""
    from app.services.duplicate_detection_service import get_duplicate_detection_service

    try:
        service = get_duplicate_detection_service()
        result = await service.resolve_duplicate_group(
            content_ids=content_ids,
            keep_id=keep_id,
            action=action
        )
        return {
            "success": result["success"],
            **result
        }
    except Exception as e:
        logger.error(f"Error resolving duplicates: {str(e)}")
        return {"success": False, "error": str(e)}


async def execute_find_quality_variants(
    limit: int = 50,
    unlinked_only: bool = True
) -> Dict[str, Any]:
    """Find content items that are quality variants of each other."""
    from app.services.duplicate_detection_service import get_duplicate_detection_service

    try:
        service = get_duplicate_detection_service()
        variants = await service.find_quality_variants(
            limit=limit,
            unlinked_only=unlinked_only
        )

        return {
            "success": True,
            "variant_groups": len(variants),
            "groups": variants[:20],
            "message": f"Found {len(variants)} groups of content with multiple quality versions"
        }
    except Exception as e:
        logger.error(f"Error finding quality variants: {str(e)}")
        return {"success": False, "error": str(e)}


async def execute_link_quality_variants(
    content_ids: List[str],
    primary_id: Optional[str] = None,
    audit_id: str = None
) -> Dict[str, Any]:
    """Link multiple content items as quality variants."""
    from app.services.duplicate_detection_service import get_duplicate_detection_service

    try:
        service = get_duplicate_detection_service()
        result = await service.link_quality_variants(
            content_ids=content_ids,
            primary_id=primary_id
        )
        return result
    except Exception as e:
        logger.error(f"Error linking quality variants: {str(e)}")
        return {"success": False, "error": str(e)}


async def execute_find_missing_metadata(
    limit: int = 100,
    missing_fields: List[str] = None
) -> Dict[str, Any]:
    """Find content items missing important metadata."""
    if missing_fields is None:
        missing_fields = ["description", "poster_url", "thumbnail"]

    try:
        or_conditions = []
        for field in missing_fields:
            or_conditions.append({field: {"$in": [None, ""]}})
            or_conditions.append({field: {"$exists": False}})

        items = await Content.find(
            {"$or": or_conditions, "is_published": True}
        ).sort([("created_at", -1)]).limit(limit).to_list()

        results = []
        for item in items:
            missing = []
            if "description" in missing_fields and not item.description:
                missing.append("description")
            if "poster_url" in missing_fields and not item.poster_url:
                missing.append("poster_url")
            if "thumbnail" in missing_fields and not item.thumbnail:
                missing.append("thumbnail")
            if "tmdb_id" in missing_fields and not item.tmdb_id:
                missing.append("tmdb_id")
            if "imdb_id" in missing_fields and not item.imdb_id:
                missing.append("imdb_id")
            if "year" in missing_fields and not item.year:
                missing.append("year")
            if "genre" in missing_fields and not item.genre:
                missing.append("genre")

            if missing:
                results.append({
                    "id": str(item.id),
                    "title": item.title,
                    "title_en": item.title_en,
                    "missing_fields": missing,
                    "created_at": item.created_at.isoformat() if item.created_at else None
                })

        field_counts = {field: 0 for field in missing_fields}
        for r in results:
            for field in r["missing_fields"]:
                if field in field_counts:
                    field_counts[field] += 1

        return {
            "success": True,
            "total_found": len(results),
            "items": results,
            "missing_field_counts": field_counts,
            "message": f"Found {len(results)} items with missing metadata"
        }

    except Exception as e:
        logger.error(f"Error finding missing metadata: {str(e)}")
        return {"success": False, "error": str(e)}
