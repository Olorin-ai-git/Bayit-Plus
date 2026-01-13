"""
AI Agent Service - True Autonomous AI Agent using Claude's Tool Use

This service implements a fully autonomous AI agent that uses Claude's tool use
capabilities to audit the media library, make intelligent decisions about what
to check, discover issues, and autonomously fix them.

Unlike the rule-based librarian_service.py, this agent:
- Decides which content to inspect based on reasoning
- Adapts its strategy based on what it finds
- Uses tools dynamically rather than following a script
- Can discover new types of issues we didn't anticipate
"""

import json
import asyncio
import logging
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from beanie import PydanticObjectId
from anthropic import Anthropic
from anthropic.types import Message, ToolUseBlock, TextBlock

from app.core.config import settings
from app.models.content import (
    Content,
    Category,
    LiveChannel,
    Podcast,
    PodcastEpisode,
    RadioStation
)
from app.models.librarian import AuditReport, LibrarianAction
from app.services.stream_validator import validate_stream_url
from app.services.auto_fixer import fix_missing_metadata as auto_fix_metadata, fix_misclassification

# Initialize logger
logger = logging.getLogger(__name__)

# Initialize Anthropic client
client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)


# ============================================================================
# DATABASE LOGGER HELPER
# ============================================================================

async def log_to_database(audit_report: AuditReport, level: str, message: str, source: str = "AI Agent"):
    """
    Append a log entry to the audit report's execution_logs array.
    This enables real-time log streaming to the UI.

    Args:
        audit_report: The AuditReport document to update
        level: Log level ("info", "warn", "error", "success", "debug", "trace")
        message: Log message
        source: Source of the log (default "AI Agent")
    """
    try:
        log_entry = {
            "id": str(uuid.uuid4())[:8],  # Short ID for React keys
            "timestamp": datetime.utcnow().isoformat(),
            "level": level,
            "message": message,
            "source": source
        }

        # Append to execution_logs array
        audit_report.execution_logs.append(log_entry)

        # Save to database (using update to avoid race conditions)
        await audit_report.save()

        # Also log to console for debugging
        logger.info(f"[{level.upper()}] {source}: {message}")

    except Exception as e:
        # Don't let logging failures break the audit
        logger.error(f"Failed to write log to database: {e}")


# ============================================================================
# TOOL DEFINITIONS
# ============================================================================

TOOLS = [
    {
        "name": "list_content_items",
        "description": "Get a list of content items to audit. You can filter by category, limit results, or get a random sample. Use this to decide what to inspect.",
        "input_schema": {
            "type": "object",
            "properties": {
                "category_id": {
                    "type": "string",
                    "description": "Optional: Filter by category ID"
                },
                "limit": {
                    "type": "integer",
                    "description": "Maximum number of items to return (default 20, max 100)",
                    "default": 20
                },
                "random_sample": {
                    "type": "boolean",
                    "description": "If true, return random sample instead of newest items",
                    "default": False
                }
            },
            "required": []
        }
    },
    {
        "name": "get_content_details",
        "description": "Get detailed information about a specific content item including metadata, streaming URL, poster, IMDB data, etc.",
        "input_schema": {
            "type": "object",
            "properties": {
                "content_id": {
                    "type": "string",
                    "description": "The ID of the content item to inspect"
                }
            },
            "required": ["content_id"]
        }
    },
    {
        "name": "get_categories",
        "description": "Get all available categories in the system. Use this to understand category structure and verify correct categorization.",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": []
        }
    },
    {
        "name": "check_stream_url",
        "description": "Validate that a streaming URL is accessible and working. Returns status, response time, and any errors.",
        "input_schema": {
            "type": "object",
            "properties": {
                "url": {
                    "type": "string",
                    "description": "The streaming URL to validate"
                },
                "stream_type": {
                    "type": "string",
                    "description": "Type of stream: 'hls', 'dash', or 'audio'",
                    "enum": ["hls", "dash", "audio"],
                    "default": "hls"
                }
            },
            "required": ["url"]
        }
    },
    {
        "name": "search_tmdb",
        "description": "Search TMDB for a movie or series to get metadata, poster, and IMDB rating. Use this when you find missing or suspicious metadata.",
        "input_schema": {
            "type": "object",
            "properties": {
                "title": {
                    "type": "string",
                    "description": "Title to search for"
                },
                "year": {
                    "type": "integer",
                    "description": "Optional: Release year to improve search accuracy"
                },
                "content_type": {
                    "type": "string",
                    "description": "Type of content: 'movie' or 'series'",
                    "enum": ["movie", "series"],
                    "default": "movie"
                }
            },
            "required": ["title"]
        }
    },
    {
        "name": "fix_missing_poster",
        "description": "Add a missing poster to a content item by fetching it from TMDB. Only use this when you've confirmed the poster is missing and you have TMDB data.",
        "input_schema": {
            "type": "object",
            "properties": {
                "content_id": {
                    "type": "string",
                    "description": "The ID of the content item"
                },
                "reason": {
                    "type": "string",
                    "description": "Brief explanation of why you're fixing this"
                }
            },
            "required": ["content_id", "reason"]
        }
    },
    {
        "name": "fix_missing_metadata",
        "description": "Update missing or incomplete metadata (description, genres, year, IMDB rating, etc.) by fetching from TMDB.",
        "input_schema": {
            "type": "object",
            "properties": {
                "content_id": {
                    "type": "string",
                    "description": "The ID of the content item"
                },
                "reason": {
                    "type": "string",
                    "description": "Brief explanation of what metadata is missing and why you're fixing it"
                }
            },
            "required": ["content_id", "reason"]
        }
    },
    {
        "name": "recategorize_content",
        "description": "Move a content item to a different category. Only use this when you're confident (>90%) that it's miscategorized.",
        "input_schema": {
            "type": "object",
            "properties": {
                "content_id": {
                    "type": "string",
                    "description": "The ID of the content item"
                },
                "new_category_id": {
                    "type": "string",
                    "description": "The ID of the category to move it to"
                },
                "reason": {
                    "type": "string",
                    "description": "Detailed explanation of why this recategorization is correct"
                },
                "confidence": {
                    "type": "number",
                    "description": "Your confidence level (0-100) that this is the correct category"
                }
            },
            "required": ["content_id", "new_category_id", "reason", "confidence"]
        }
    },
    {
        "name": "flag_for_manual_review",
        "description": "Flag a content item for manual human review. Use this when you find an issue but aren't confident about the fix, or when the issue requires human judgment.",
        "input_schema": {
            "type": "object",
            "properties": {
                "content_id": {
                    "type": "string",
                    "description": "The ID of the content item"
                },
                "issue_type": {
                    "type": "string",
                    "description": "Type of issue",
                    "enum": ["broken_stream", "missing_metadata", "misclassification", "duplicate", "quality_issue", "other"]
                },
                "reason": {
                    "type": "string",
                    "description": "Detailed explanation of the issue and why it needs manual review"
                },
                "priority": {
                    "type": "string",
                    "description": "Priority level",
                    "enum": ["low", "medium", "high", "critical"],
                    "default": "medium"
                }
            },
            "required": ["content_id", "issue_type", "reason"]
        }
    },
    {
        "name": "send_email_notification",
        "description": "Send an email notification to administrators about major issues found during the audit. Only use this when you discover significant problems that require immediate attention (broken streams, critical misclassifications, widespread metadata issues, etc.). Do NOT use for routine audits with minor or no issues.",
        "input_schema": {
            "type": "object",
            "properties": {
                "severity": {
                    "type": "string",
                    "description": "Severity level of the issues",
                    "enum": ["high", "critical"],
                },
                "subject": {
                    "type": "string",
                    "description": "Email subject line (should be concise and attention-grabbing)"
                },
                "summary": {
                    "type": "string",
                    "description": "Brief summary of what was found (2-3 sentences)"
                },
                "critical_issues": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "title": {"type": "string"},
                            "description": {"type": "string"},
                            "affected_items": {"type": "integer"},
                            "priority": {"type": "string", "enum": ["high", "critical"]}
                        }
                    },
                    "description": "List of critical issues found (3-5 most important)"
                },
                "items_checked": {
                    "type": "integer",
                    "description": "Total items checked"
                },
                "issues_found": {
                    "type": "integer",
                    "description": "Total issues found"
                },
                "issues_fixed": {
                    "type": "integer",
                    "description": "Issues fixed automatically"
                },
                "manual_action_needed": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Specific actions administrators should take"
                }
            },
            "required": ["severity", "subject", "summary", "critical_issues", "items_checked", "issues_found"]
        }
    },
    {
        "name": "check_storage_usage",
        "description": "Check Google Cloud Storage bucket usage statistics including total size, file count, and breakdown by file type. Use this to monitor storage consumption.",
        "input_schema": {
            "type": "object",
            "properties": {
                "bucket_name": {
                    "type": "string",
                    "description": "GCS bucket name to check (default: bayit-plus-media-new)",
                    "default": "bayit-plus-media-new"
                }
            },
            "required": []
        }
    },
    {
        "name": "list_large_files",
        "description": "Find files larger than a specified size threshold in the storage bucket. Use this to identify large files that may be costly or problematic.",
        "input_schema": {
            "type": "object",
            "properties": {
                "bucket_name": {
                    "type": "string",
                    "description": "GCS bucket name to check (default: bayit-plus-media-new)",
                    "default": "bayit-plus-media-new"
                },
                "size_threshold_gb": {
                    "type": "number",
                    "description": "Size threshold in GB (default: 5.0)",
                    "default": 5.0
                },
                "limit": {
                    "type": "integer",
                    "description": "Maximum number of large files to return (default: 20)",
                    "default": 20
                }
            },
            "required": []
        }
    },
    {
        "name": "calculate_storage_costs",
        "description": "Calculate estimated monthly storage costs based on current bucket usage and GCS pricing. Use this to warn about high costs.",
        "input_schema": {
            "type": "object",
            "properties": {
                "bucket_name": {
                    "type": "string",
                    "description": "GCS bucket name to analyze (default: bayit-plus-media-new)",
                    "default": "bayit-plus-media-new"
                },
                "storage_class": {
                    "type": "string",
                    "description": "GCS storage class for pricing",
                    "enum": ["STANDARD", "NEARLINE", "COLDLINE", "ARCHIVE"],
                    "default": "STANDARD"
                }
            },
            "required": []
        }
    },
    {
        "name": "clean_title",
        "description": "Clean up a content item's title by removing file extensions, quality markers, release group names, and other junk. Use this when you detect titles with garbage text (e.g., '.mp4', '.mkv', '1080p', 'WEBRip', '[GroupName]', extra characters, 'p', 'BluRay', 'x264', '[YTS.MX]', 'BOKUT', 'BoK'). Clean both Hebrew (title) and English (title_en) if both exist. Keep the original language, just remove the junk.",
        "input_schema": {
            "type": "object",
            "properties": {
                "content_id": {
                    "type": "string",
                    "description": "The ID of the content item with messy title"
                },
                "audit_id": {
                    "type": "string",
                    "description": "The current audit ID for tracking"
                },
                "cleaned_title": {
                    "type": "string",
                    "description": "The cleaned version of the title - just the actual movie/show name without any file junk"
                },
                "cleaned_title_en": {
                    "type": "string",
                    "description": "The cleaned English title (optional, only if title_en exists and needs cleaning)"
                },
                "reason": {
                    "type": "string",
                    "description": "Brief explanation of what you cleaned (e.g., 'Removed 1080p, BluRay, and [YTS.MX] from both Hebrew and English titles')"
                }
            },
            "required": ["content_id", "audit_id", "cleaned_title", "reason"]
        }
    },
    {
        "name": "scan_video_subtitles",
        "description": "Analyze a video file (MKV/MP4) to detect embedded subtitle tracks. Returns list of available subtitle languages and metadata. Use this to verify subtitle availability before extracting.",
        "input_schema": {
            "type": "object",
            "properties": {
                "content_id": {
                    "type": "string",
                    "description": "The ID of the content item to scan"
                }
            },
            "required": ["content_id"]
        }
    },
    {
        "name": "extract_video_subtitles",
        "description": "Extract ALL embedded subtitle tracks from a video file and save them to the database. Creates SubtitleTrackDoc for each found language. Use this after scan_video_subtitles confirms subtitles exist.",
        "input_schema": {
            "type": "object",
            "properties": {
                "content_id": {
                    "type": "string",
                    "description": "The ID of the content item"
                },
                "audit_id": {
                    "type": "string",
                    "description": "Current audit ID for tracking"
                },
                "languages": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Optional: Specific languages to extract (e.g., ['en', 'he']). If not provided, extracts all."
                }
            },
            "required": ["content_id", "audit_id"]
        }
    },
    {
        "name": "verify_required_subtitles",
        "description": "Verify that a content item has subtitles in the required languages (English, Hebrew, Spanish). Returns which languages are missing. Use this as the first step in subtitle verification workflow.",
        "input_schema": {
            "type": "object",
            "properties": {
                "content_id": {
                    "type": "string",
                    "description": "The ID of the content item to verify"
                },
                "required_languages": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Required language codes (default: ['en', 'he', 'es'])",
                    "default": ["en", "he", "es"]
                }
            },
            "required": ["content_id"]
        }
    },
    {
        "name": "search_external_subtitles",
        "description": "Search for subtitles on external sources (OpenSubtitles, TMDB) for a content item without downloading them. This checks if subtitles are available and from which sources. Use this to discover available subtitles before downloading.",
        "input_schema": {
            "type": "object",
            "properties": {
                "content_id": {
                    "type": "string",
                    "description": "Content item ID"
                },
                "language": {
                    "type": "string",
                    "description": "Language code (he, en, es, ar, ru, fr)"
                },
                "sources": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Sources to search (opensubtitles, tmdb)",
                    "default": ["opensubtitles", "tmdb"]
                }
            },
            "required": ["content_id", "language"]
        }
    },
    {
        "name": "download_external_subtitle",
        "description": "Download and save a subtitle from external sources (OpenSubtitles or TMDB). Use this after searching to actually fetch and store the subtitle. Respects daily download quotas. Automatically parses and saves to database.",
        "input_schema": {
            "type": "object",
            "properties": {
                "content_id": {
                    "type": "string",
                    "description": "Content item ID"
                },
                "language": {
                    "type": "string",
                    "description": "Language code (he, en, es, ar, ru, fr)"
                },
                "audit_id": {
                    "type": "string",
                    "description": "Audit report ID for tracking"
                }
            },
            "required": ["content_id", "language", "audit_id"]
        }
    },
    {
        "name": "batch_download_subtitles",
        "description": "Download subtitles for multiple content items in one batch operation. Automatically manages daily quotas (20 downloads/day) and prioritizes content by recency and missing languages. Use this for large-scale subtitle acquisition.",
        "input_schema": {
            "type": "object",
            "properties": {
                "content_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of content IDs to process"
                },
                "languages": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Languages to fetch (default: ['he', 'en', 'es'])",
                    "default": ["he", "en", "es"]
                },
                "max_downloads": {
                    "type": "integer",
                    "description": "Maximum downloads to perform (respects daily quota)",
                    "default": 20
                },
                "audit_id": {
                    "type": "string",
                    "description": "Audit report ID for tracking"
                }
            },
            "required": ["content_ids", "audit_id"]
        }
    },
    {
        "name": "check_subtitle_quota",
        "description": "Check remaining OpenSubtitles download quota for today. Use this before batch operations to know how many subtitles you can download. Free tier limit is 20 downloads per day.",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": []
        }
    },
    {
        "name": "complete_audit",
        "description": "Call this when you've finished the audit and are ready to provide a final summary. This will end the audit session.",
        "input_schema": {
            "type": "object",
            "properties": {
                "summary": {
                    "type": "string",
                    "description": "Overall summary of the audit: what you checked, what you found, what you fixed"
                },
                "items_checked": {
                    "type": "integer",
                    "description": "Total number of items you inspected"
                },
                "issues_found": {
                    "type": "integer",
                    "description": "Total number of issues discovered"
                },
                "issues_fixed": {
                    "type": "integer",
                    "description": "Total number of issues you fixed autonomously"
                },
                "flagged_for_review": {
                    "type": "integer",
                    "description": "Number of items flagged for manual review"
                },
                "recommendations": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "3-5 strategic recommendations for improving the library"
                }
            },
            "required": ["summary", "items_checked", "issues_found", "issues_fixed"]
        }
    }
]


# ============================================================================
# TOOL EXECUTION FUNCTIONS
# ============================================================================

async def execute_list_content_items(
    category_id: Optional[str] = None,
    limit: int = 20,
    random_sample: bool = False
) -> Dict[str, Any]:
    """Get a list of content items to audit."""
    try:
        limit = min(limit, 100)  # Cap at 100

        query = {"is_published": True}
        if category_id:
            query["category_id"] = category_id

        if random_sample:
            # Use simple approach: get all items then sample in Python
            # This avoids the AsyncIOMotorLatentCommandCursor issue with MongoDB aggregation
            all_items = await Content.find(query).to_list()
            if len(all_items) > limit:
                import random
                items = random.sample(all_items, limit)
            else:
                items = all_items
        else:
            # Get newest items
            items = await Content.find(query).sort([("created_at", -1)]).limit(limit).to_list()

        # Return simplified data for Claude
        return {
            "success": True,
            "count": len(items),
            "items": [
                {
                    "id": str(item.id),
                    "title": item.title,
                    "title_en": item.title_en,
                    "category_id": str(item.category_id) if item.category_id else None,
                    "content_type": item.content_type,
                    "has_poster": bool(item.poster_url),
                    "has_description": bool(item.description),
                    "has_stream": bool(item.stream_url),
                    "imdb_rating": item.imdb_rating,
                    "created_at": item.created_at.isoformat() if item.created_at else None
                }
                for item in items
            ]
        }
    except Exception as e:
        logger.error(f"Error in list_content_items: {str(e)}")
        return {"success": False, "error": str(e)}


async def execute_get_content_details(content_id: str) -> Dict[str, Any]:
    """Get detailed information about a content item."""
    try:
        content = await Content.get(content_id)
        if not content:
            return {"success": False, "error": "Content not found"}

        return {
            "success": True,
            "content": {
                "id": str(content.id),
                "title": content.title,
                "title_en": content.title_en,
                "description": content.description,
                "category_id": str(content.category_id) if content.category_id else None,
                "content_type": content.content_type,
                "thumbnail": content.thumbnail,  # Primary poster/cover image
                "poster_url": content.poster_url,  # TMDB poster URL (secondary)
                "backdrop": content.backdrop,  # Wide background image
                "stream_url": content.stream_url,
                "trailer_url": content.trailer_url,
                "imdb_id": content.imdb_id,
                "imdb_rating": content.imdb_rating,
                "tmdb_id": content.tmdb_id,
                "release_year": content.year,
                "duration": content.duration,
                "genre": content.genre,
                "genres": getattr(content, 'genres', None),  # May not exist in old documents
                "director": content.director,
                "cast": content.cast,
                "is_published": content.is_published,
                "created_at": content.created_at.isoformat() if content.created_at else None,
                "updated_at": content.updated_at.isoformat() if content.updated_at else None
            }
        }
    except Exception as e:
        logger.error(f"Error in get_content_details: {str(e)}")
        return {"success": False, "error": str(e)}


async def execute_get_categories() -> Dict[str, Any]:
    """Get all categories in the system."""
    try:
        categories = await Category.find().to_list()

        return {
            "success": True,
            "count": len(categories),
            "categories": [
                {
                    "id": str(cat.id),
                    "name": cat.name,
                    "name_en": cat.name_en,
                    "description": cat.description,
                    "icon": cat.icon,
                    "order": cat.order,
                    "is_active": cat.is_active
                }
                for cat in categories
            ]
        }
    except Exception as e:
        logger.error(f"Error in get_categories: {str(e)}")
        return {"success": False, "error": str(e)}


async def execute_check_stream_url(url: str, stream_type: str = "hls") -> Dict[str, Any]:
    """Validate a streaming URL."""
    try:
        result = await validate_stream_url(url, stream_type)

        return {
            "success": True,
            "validation": {
                "url": url,
                "is_valid": result.is_valid,
                "status_code": result.status_code,
                "response_time_ms": result.response_time_ms,
                "error_message": result.error_message
            }
        }
    except Exception as e:
        logger.error(f"Error in check_stream_url: {str(e)}")
        return {"success": False, "error": str(e)}


async def execute_search_tmdb(
    title: str,
    year: Optional[int] = None,
    content_type: str = "movie"
) -> Dict[str, Any]:
    """Search TMDB for content metadata."""
    try:
        # Import and instantiate TMDB service
        from app.services.tmdb_service import TMDBService
        from app.core.config import settings

        # Check if API key is configured
        if not settings.TMDB_API_KEY:
            return {
                "success": False,
                "error": "TMDB API key not configured. Set TMDB_API_KEY environment variable."
            }

        tmdb_service = TMDBService()

        # Search for the content
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

        # Get details
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

        return {
            "success": True,
            "found": True,
            "tmdb_data": {
                "tmdb_id": details.get("id"),
                "title": details.get("title") or details.get("name"),
                "description": details.get("overview"),
                "poster_path": details.get("poster_path"),
                "backdrop_path": details.get("backdrop_path"),
                "release_year": (details.get("release_date") or details.get("first_air_date", ""))[:4] if details.get("release_date") or details.get("first_air_date") else None,
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
        logger.info(f"   📥 Fetching content {content_id} to fix poster...")

        if dry_run:
            logger.info(f"   🔒 DRY RUN mode - would fix poster for {content_id}")
            return {
                "success": True,
                "dry_run": True,
                "message": f"[DRY RUN] Would fix missing poster for content {content_id}. Reason: {reason}"
            }

        # Use auto_fixer service (which uses TMDB internally)
        # Note: auto_fixer expects "missing_thumbnail" not "missing_poster"
        logger.info(f"   🔍 Calling auto_fixer to retrieve poster from TMDB...")
        result = await auto_fix_metadata(content_id, ["missing_thumbnail"], audit_id)

        if result.success:
            logger.info(f"   ✅ Poster fixed successfully! Fields updated: {result.fields_updated}")
            return {
                "success": True,
                "fixed": True,
                "message": f"Added poster from TMDB (updated: {', '.join(result.fields_updated or [])})",
                "fields_updated": result.fields_updated or []
            }
        else:
            logger.warning(f"   ⚠️ Failed to fix poster: {result.error_message}")
            return {
                "success": False,
                "error": result.error_message or "Could not find poster on TMDB"
            }

    except Exception as e:
        logger.error(f"   ❌ Exception in fix_missing_poster: {str(e)}")
        return {"success": False, "error": str(e)}


async def execute_fix_missing_metadata(
    content_id: str,
    audit_id: str,
    reason: str,
    dry_run: bool = False
) -> Dict[str, Any]:
    """Fix missing metadata for a content item."""
    try:
        logger.info(f"   📥 Fetching content {content_id} to fix metadata...")

        if dry_run:
            logger.info(f"   🔒 DRY RUN mode - would fix metadata for {content_id}")
            return {
                "success": True,
                "dry_run": True,
                "message": f"[DRY RUN] Would fix missing metadata for content {content_id}. Reason: {reason}"
            }

        # Use auto_fixer service
        # Note: auto_fixer checks for these specific issue names
        logger.info(f"   🔍 Calling auto_fixer to retrieve metadata from TMDB...")
        result = await auto_fix_metadata(content_id, ["missing_tmdb_id", "missing_imdb_id", "missing_thumbnail", "missing_backdrop"], audit_id)

        if result.success:
            logger.info(f"   ✅ Metadata fixed successfully! Fields updated: {result.fields_updated}")
            return {
                "success": True,
                "fixed": True,
                "message": f"Updated metadata from TMDB (updated: {', '.join(result.fields_updated or [])})",
                "fields_updated": result.fields_updated or []
            }
        else:
            logger.warning(f"   ⚠️ Failed to fix metadata: {result.error_message}")
            return {
                "success": False,
                "error": result.error_message or "Failed to update metadata"
            }

    except Exception as e:
        logger.error(f"   ❌ Exception in fix_missing_metadata: {str(e)}")
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
        logger.info(f"   📋 Checking confidence level: {confidence}%")

        # Require high confidence
        if confidence < 90:
            logger.warning(f"   ⚠️ Confidence too low: {confidence}% < 90%")
            return {
                "success": False,
                "error": f"Confidence too low ({confidence}%). Requires 90%+ for auto-recategorization. Use flag_for_manual_review instead."
            }

        if dry_run:
            logger.info(f"   🔒 DRY RUN mode - would recategorize {content_id} to {new_category_id}")
            return {
                "success": True,
                "dry_run": True,
                "message": f"[DRY RUN] Would recategorize content {content_id} to category {new_category_id} (confidence: {confidence}%). Reason: {reason}"
            }

        # Get content and verify category exists
        logger.info(f"   📥 Fetching content {content_id}...")
        try:
            content = await Content.get(PydanticObjectId(content_id))
            logger.info(f"   ✓ Content found: '{content.title}'")
        except Exception as e:
            logger.error(f"   ❌ Content not found: {str(e)}")
            return {"success": False, "error": f"Content not found: {str(e)}"}

        logger.info(f"   📥 Fetching category {new_category_id}...")
        try:
            new_category = await Category.get(PydanticObjectId(new_category_id))
            logger.info(f"   ✓ Category found: '{new_category.name}'")
        except Exception as e:
            logger.error(f"   ❌ Category not found: {str(e)}")
            return {"success": False, "error": f"Category not found: {str(e)}"}

        if not content:
            return {"success": False, "error": "Content not found"}
        if not new_category:
            return {"success": False, "error": f"Category not found (ID: {new_category_id})"}

        # Store before state
        logger.info(f"   📊 Getting old category info...")
        old_category_id = str(content.category_id) if content.category_id else None
        old_category = await Category.get(PydanticObjectId(content.category_id)) if content.category_id else None
        old_category_name = old_category.name if old_category else "None"
        logger.info(f"   📍 Current category: '{old_category_name}' ({old_category_id})")

        before_state = {
            "category_id": old_category_id,
            "category_name": old_category_name,
        }

        # Apply change
        logger.info(f"   🔄 Recategorizing '{content.title}' from '{old_category_name}' → '{new_category.name}'...")
        content.category_id = str(new_category.id)
        content.category_name = new_category.name
        content.updated_at = datetime.utcnow()
        await content.save()
        logger.info(f"   💾 Content saved to database")

        after_state = {
            "category_id": str(new_category.id),
            "category_name": new_category.name,
        }

        # Log action
        logger.info(f"   📝 Creating LibrarianAction record...")
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
            description=f"Reclassified from '{old_category_name}' to '{new_category.name}' (confidence: {confidence}%). Reason: {reason}",
        )
        await action.insert()
        logger.info(f"   ✅ LibrarianAction saved (ID: {action.id})")

        logger.info(f"   ✅ Successfully recategorized '{content.title}' to '{new_category.name}' ({confidence}%)")
        return {
            "success": True,
            "recategorized": True,
            "message": f"Moved from '{old_category_name}' to '{new_category.name}'",
            "old_category": old_category_id,
            "new_category": str(new_category.id),
            "action_id": str(action.id)
        }
    except Exception as e:
        logger.error(f"Error in recategorize_content: {str(e)}")
        return {"success": False, "error": str(e)}


async def execute_flag_for_manual_review(
    content_id: str,
    issue_type: str,
    reason: str,
    priority: str = "medium"
) -> Dict[str, Any]:
    """Flag a content item for manual review."""
    try:
        # This would integrate with a manual review queue system
        # For now, we'll just log it
        logger.warning(
            f"🚩 Manual Review Flagged: {content_id}",
            extra={
                "content_id": content_id,
                "issue_type": issue_type,
                "reason": reason,
                "priority": priority
            }
        )

        return {
            "success": True,
            "flagged": True,
            "message": f"Flagged for manual review: {issue_type}",
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
    cleaned_title_en: str = None,
    dry_run: bool = False
) -> Dict[str, Any]:
    """Clean up a content item's title by removing junk (file extensions, quality markers, release groups, etc.)."""
    try:
        if dry_run:
            return {
                "success": True,
                "dry_run": True,
                "message": f"[DRY RUN] Would clean title for content {content_id}. New title: '{cleaned_title}'. Reason: {reason}"
            }

        # Get content item
        content = await Content.get(content_id)
        if not content:
            return {"success": False, "error": "Content not found"}

        # Store original titles for rollback
        original_title = content.title
        original_title_en = content.title_en if hasattr(content, 'title_en') else None

        # Create librarian action record for rollback capability
        from app.models.librarian import LibrarianAction
        action = LibrarianAction(
            audit_id=audit_id,
            action_type="clean_title",
            content_id=str(content.id),
            content_type="content",
            issue_type="messy_title",
            before_state={
                "title": original_title,
                "title_en": original_title_en
            },
            after_state={
                "title": cleaned_title,
                "title_en": cleaned_title_en if cleaned_title_en else original_title_en
            },
            auto_approved=True,
            rollback_available=True
        )
        await action.insert()

        # Update the content titles
        content.title = cleaned_title
        if cleaned_title_en:
            content.title_en = cleaned_title_en
        await content.save()

        logger.info(
            f"🧹 Cleaned title for content {content_id}",
            extra={
                "content_id": content_id,
                "original_title": original_title,
                "cleaned_title": cleaned_title,
                "reason": reason,
                "action_id": str(action.id)
            }
        )

        return {
            "success": True,
            "cleaned": True,
            "message": f"Title cleaned: '{original_title}' → '{cleaned_title}'",
            "original_title": original_title,
            "cleaned_title": cleaned_title,
            "action_id": str(action.id)
        }

    except Exception as e:
        logger.error(f"Error in clean_title: {str(e)}")
        return {"success": False, "error": str(e)}


async def execute_check_storage_usage(
    bucket_name: Optional[str] = None
) -> Dict[str, Any]:
    """Check GCS bucket storage usage statistics."""
    try:
        from google.cloud import storage
        from google.auth.exceptions import DefaultCredentialsError
        from app.core.config import settings

        # Use provided bucket name or fall back to config
        bucket_name = bucket_name or settings.GCS_BUCKET_NAME
        if not bucket_name:
            return {"success": False, "error": "GCS bucket name not configured. Set GCS_BUCKET_NAME environment variable or provide bucket_name parameter."}

        try:
            client = storage.Client()
        except DefaultCredentialsError:
            logger.warning("⚠️  GCS credentials not configured. Skipping storage check (normal when running locally)")
            return {
                "success": False, 
                "error": "GCS credentials not available. This tool only works in Cloud Run environment or with Application Default Credentials configured.",
                "skippable": True  # Indicates this is a non-critical error
            }
        
        bucket = client.bucket(bucket_name)

        if not bucket.exists():
            return {"success": False, "error": f"Bucket {bucket_name} does not exist"}

        # Get all blobs and calculate statistics
        blobs = list(bucket.list_blobs())

        total_size_bytes = sum(blob.size for blob in blobs if blob.size)
        total_size_gb = total_size_bytes / (1024 ** 3)
        total_files = len(blobs)

        # Breakdown by file type
        file_types = {}
        for blob in blobs:
            if blob.name:
                ext = blob.name.split('.')[-1].lower() if '.' in blob.name else 'no_extension'
                if ext not in file_types:
                    file_types[ext] = {"count": 0, "size_bytes": 0}
                file_types[ext]["count"] += 1
                file_types[ext]["size_bytes"] += blob.size or 0

        # Convert sizes to GB for readability
        file_types_summary = {
            ext: {
                "count": data["count"],
                "size_gb": round(data["size_bytes"] / (1024 ** 3), 2)
            }
            for ext, data in sorted(file_types.items(), key=lambda x: x[1]["size_bytes"], reverse=True)[:10]
        }

        logger.info(f"📊 Storage usage for {bucket_name}: {total_size_gb:.2f} GB ({total_files} files)")

        return {
            "success": True,
            "bucket_name": bucket_name,
            "total_size_gb": round(total_size_gb, 2),
            "total_size_tb": round(total_size_gb / 1024, 3),
            "total_files": total_files,
            "avg_file_size_mb": round((total_size_bytes / total_files) / (1024 ** 2), 2) if total_files > 0 else 0,
            "file_types": file_types_summary
        }

    except Exception as e:
        logger.error(f"Error checking storage usage: {str(e)}")
        return {"success": False, "error": str(e)}


async def execute_list_large_files(
    bucket_name: str = "bayit-plus-media-new",
    size_threshold_gb: float = 5.0,
    limit: int = 20
) -> Dict[str, Any]:
    """List files larger than the specified threshold."""
    try:
        from google.cloud import storage

        client = storage.Client()
        bucket = client.bucket(bucket_name)

        if not bucket.exists():
            return {"success": False, "error": f"Bucket {bucket_name} does not exist"}

        threshold_bytes = size_threshold_gb * (1024 ** 3)

        # Find large files
        large_files = []
        for blob in bucket.list_blobs():
            if blob.size and blob.size > threshold_bytes:
                large_files.append({
                    "name": blob.name,
                    "size_gb": round(blob.size / (1024 ** 3), 2),
                    "size_mb": round(blob.size / (1024 ** 2), 2),
                    "created": blob.time_created.isoformat() if blob.time_created else None,
                    "storage_class": blob.storage_class,
                    "content_type": blob.content_type
                })

        # Sort by size descending
        large_files.sort(key=lambda x: x["size_gb"], reverse=True)
        large_files = large_files[:limit]

        total_size_gb = sum(f["size_gb"] for f in large_files)

        logger.info(f"🔍 Found {len(large_files)} files > {size_threshold_gb}GB (total: {total_size_gb:.2f}GB)")

        return {
            "success": True,
            "bucket_name": bucket_name,
            "threshold_gb": size_threshold_gb,
            "files_found": len(large_files),
            "total_size_gb": round(total_size_gb, 2),
            "large_files": large_files
        }

    except Exception as e:
        logger.error(f"Error listing large files: {str(e)}")
        return {"success": False, "error": str(e)}


async def execute_calculate_storage_costs(
    bucket_name: str = "bayit-plus-media-new",
    storage_class: str = "STANDARD"
) -> Dict[str, Any]:
    """Calculate estimated monthly storage costs."""
    try:
        from google.cloud import storage

        # GCS pricing (US multi-region, as of 2024)
        pricing = {
            "STANDARD": 0.020,      # $0.020 per GB/month
            "NEARLINE": 0.010,      # $0.010 per GB/month
            "COLDLINE": 0.004,      # $0.004 per GB/month
            "ARCHIVE": 0.0012       # $0.0012 per GB/month
        }

        client = storage.Client()
        bucket = client.bucket(bucket_name)

        if not bucket.exists():
            return {"success": False, "error": f"Bucket {bucket_name} does not exist"}

        # Get total size
        blobs = list(bucket.list_blobs())
        total_size_bytes = sum(blob.size for blob in blobs if blob.size)
        total_size_gb = total_size_bytes / (1024 ** 3)

        # Calculate costs
        price_per_gb = pricing.get(storage_class, pricing["STANDARD"])
        monthly_storage_cost = total_size_gb * price_per_gb
        yearly_storage_cost = monthly_storage_cost * 12

        # Egress estimation (assume 10% of data downloaded monthly)
        egress_gb = total_size_gb * 0.1
        egress_cost = egress_gb * 0.12  # $0.12 per GB for first 10TB

        total_monthly_cost = monthly_storage_cost + egress_cost

        logger.info(f"💰 Estimated monthly cost for {bucket_name}: ${total_monthly_cost:.2f}")

        return {
            "success": True,
            "bucket_name": bucket_name,
            "storage_class": storage_class,
            "total_size_gb": round(total_size_gb, 2),
            "total_size_tb": round(total_size_gb / 1024, 3),
            "pricing": {
                "storage_per_gb_month": price_per_gb,
                "monthly_storage_cost": round(monthly_storage_cost, 2),
                "yearly_storage_cost": round(yearly_storage_cost, 2),
                "estimated_egress_cost": round(egress_cost, 2),
                "total_monthly_cost": round(total_monthly_cost, 2),
                "total_yearly_cost": round(total_monthly_cost * 12, 2)
            },
            "warnings": [
                f"Current storage: {round(total_size_gb, 2)} GB" if total_size_gb < 100 else f"⚠️ High storage usage: {round(total_size_gb, 2)} GB",
                f"Monthly cost: ${round(total_monthly_cost, 2)}" if total_monthly_cost < 50 else f"⚠️ High monthly cost: ${round(total_monthly_cost, 2)}"
            ]
        }

    except Exception as e:
        logger.error(f"Error calculating storage costs: {str(e)}")
        return {"success": False, "error": str(e)}


async def execute_send_email_notification(
    severity: str,
    subject: str,
    summary: str,
    critical_issues: List[Dict[str, Any]],
    items_checked: int,
    issues_found: int,
    issues_fixed: int = 0,
    manual_action_needed: Optional[List[str]] = None
) -> Dict[str, Any]:
    """Send detailed HTML email notification about major issues."""
    try:
        # Check if email is configured
        if not settings.ADMIN_EMAIL_ADDRESSES:
            logger.info("📧 Email notification requested but no admin emails configured")
            return {
                "success": False,
                "message": "No admin email addresses configured. Email not sent."
            }

        admin_emails = [email.strip() for email in settings.ADMIN_EMAIL_ADDRESSES.split(",")]

        # Generate detailed HTML email
        severity_color = "#dc2626" if severity == "critical" else "#ea580c"  # red-600 or orange-600
        severity_emoji = "🚨" if severity == "critical" else "⚠️"

        # Build critical issues HTML
        issues_html = ""
        for issue in critical_issues:
            priority_color = "#dc2626" if issue.get("priority") == "critical" else "#ea580c"
            issues_html += f"""
            <div style="background: #f9fafb; border-left: 4px solid {priority_color}; padding: 16px; margin: 12px 0; border-radius: 4px;">
                <div style="font-weight: 600; color: #111827; margin-bottom: 8px;">
                    {issue.get('title', 'Unknown Issue')}
                </div>
                <div style="color: #6b7280; margin-bottom: 8px;">
                    {issue.get('description', '')}
                </div>
                <div style="color: #9ca3af; font-size: 14px;">
                    פריטים מושפעים: <strong>{issue.get('affected_items', 0)}</strong> |
                    עדיפות: <strong style="color: {priority_color};">{issue.get('priority', 'high').upper()}</strong>
                </div>
            </div>
            """

        # Build manual actions HTML
        actions_html = ""
        if manual_action_needed:
            actions_html = "<div style='margin-top: 24px;'><h3 style='color: #111827; margin-bottom: 12px;'>📋 פעולות נדרשות</h3><ul style='color: #374151; line-height: 1.8;'>"
            for action in manual_action_needed:
                actions_html += f"<li>{action}</li>"
            actions_html += "</ul></div>"

        # Complete HTML email
        html_content = f"""
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: #f3f4f6; margin: 0; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">

        <!-- Header -->
        <div style="background: {severity_color}; color: white; padding: 24px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">
                {severity_emoji} ביקורת ספרן AI - התראה חשובה
            </h1>
            <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 14px;">
                Bayit+ Media Library Audit
            </p>
        </div>

        <!-- Summary -->
        <div style="padding: 24px; border-bottom: 1px solid #e5e7eb;">
            <div style="background: #fef3c7; border-right: 4px solid #f59e0b; padding: 16px; border-radius: 4px; margin-bottom: 16px;">
                <strong style="color: #92400e;">סיכום:</strong>
                <p style="color: #78350f; margin: 8px 0 0 0;">{summary}</p>
            </div>
        </div>

        <!-- Stats -->
        <div style="padding: 24px; background: #f9fafb; display: flex; justify-content: space-around; text-align: center;">
            <div>
                <div style="font-size: 32px; font-weight: bold; color: #111827;">{items_checked}</div>
                <div style="color: #6b7280; font-size: 14px;">נבדקו</div>
            </div>
            <div>
                <div style="font-size: 32px; font-weight: bold; color: {severity_color};">{issues_found}</div>
                <div style="color: #6b7280; font-size: 14px;">בעיות נמצאו</div>
            </div>
            <div>
                <div style="font-size: 32px; font-weight: bold; color: #059669;">{issues_fixed}</div>
                <div style="color: #6b7280; font-size: 14px;">תוקנו</div>
            </div>
        </div>

        <!-- Critical Issues -->
        <div style="padding: 24px;">
            <h2 style="color: #111827; margin-top: 0; margin-bottom: 16px;">
                🔍 בעיות קריטיות שנמצאו
            </h2>
            {issues_html}
        </div>

        <!-- Manual Actions -->
        {actions_html if actions_html else ""}

        <!-- Footer -->
        <div style="padding: 24px; background: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px;">
            <p style="margin: 0 0 8px 0;">
                התראה זו נוצרה אוטומטית על ידי ספרן AI
            </p>
            <p style="margin: 0;">
                {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}
            </p>
        </div>

    </div>
</body>
</html>
        """

        # Import email service
        from app.services.email_service import send_via_sendgrid

        # Send email to all admins
        await send_via_sendgrid(
            to_emails=admin_emails,
            subject=f"{severity_emoji} {subject}",
            html_content=html_content
        )

        logger.info(
            f"📧 Email notification sent to {len(admin_emails)} administrators",
            extra={
                "severity": severity,
                "issues_found": issues_found,
                "recipients": len(admin_emails)
            }
        )

        return {
            "success": True,
            "sent": True,
            "message": f"Email notification sent to {len(admin_emails)} administrators",
            "recipients": len(admin_emails)
        }

    except Exception as e:
        logger.error(f"Error sending email notification: {str(e)}")
        return {"success": False, "error": str(e)}


async def execute_scan_video_subtitles(content_id: str) -> Dict[str, Any]:
    """Scan video file for embedded subtitles."""
    from app.services.ffmpeg_service import ffmpeg_service

    try:
        content = await Content.get(PydanticObjectId(content_id))
        if not content:
            return {"success": False, "error": "Content not found"}

        if not content.stream_url:
            return {"success": False, "error": "No video URL available"}

        # Analyze video with FFmpeg
        metadata = await ffmpeg_service.analyze_video(content.stream_url)

        # Update content with video metadata
        content.video_metadata = metadata
        content.embedded_subtitle_count = len(metadata['subtitle_tracks'])
        content.subtitle_last_checked = datetime.utcnow()
        await content.save()

        return {
            "success": True,
            "subtitle_count": len(metadata['subtitle_tracks']),
            "subtitles": metadata['subtitle_tracks'],
            "video_duration": metadata['duration'],
            "video_resolution": f"{metadata['width']}x{metadata['height']}"
        }

    except Exception as e:
        logger.error(f"Error scanning video subtitles: {str(e)}")
        return {"success": False, "error": str(e)}


async def execute_extract_video_subtitles(
    content_id: str,
    audit_id: str,
    languages: Optional[List[str]] = None
) -> Dict[str, Any]:
    """Extract subtitle tracks from video and save to database."""
    from app.services.ffmpeg_service import ffmpeg_service
    from app.services.subtitle_service import parse_subtitles
    from app.models.subtitles import SubtitleTrackDoc, SubtitleCueModel

    try:
        content = await Content.get(PydanticObjectId(content_id))
        if not content:
            return {"success": False, "error": "Content not found"}

        # Extract subtitles
        extracted_subs = await ffmpeg_service.extract_all_subtitles(content.stream_url)

        # Filter by requested languages if specified
        if languages:
            extracted_subs = [s for s in extracted_subs if s['language'] in languages]

        # Parse and save each subtitle track
        saved_count = 0
        saved_languages = []

        for sub in extracted_subs:
            try:
                # Parse subtitle content using the parse_subtitles function
                track = parse_subtitles(sub['content'], sub['format'])

                # Convert to database model
                cues = [
                    SubtitleCueModel(
                        index=cue.index,
                        start_time=cue.start_time,
                        end_time=cue.end_time,
                        text=cue.text,
                        text_nikud=cue.text_nikud
                    )
                    for cue in track.cues
                ]

                # Create SubtitleTrackDoc
                subtitle_doc = SubtitleTrackDoc(
                    content_id=content_id,
                    content_type="vod",
                    language=sub['language'],
                    language_name=get_language_name(sub['language']),
                    format="srt",
                    cues=cues,
                    is_auto_generated=False
                )
                await subtitle_doc.insert()
                saved_count += 1
                saved_languages.append(sub['language'])
            except Exception as e:
                logger.error(f"Failed to parse {sub['language']} subtitles: {str(e)}")

        # Update content
        content.has_subtitles = saved_count > 0
        content.available_subtitle_languages = saved_languages
        content.subtitle_extraction_status = "completed"
        await content.save()

        # Create LibrarianAction
        action = LibrarianAction(
            audit_id=audit_id,
            action_type="extract_subtitles",
            content_id=content_id,
            content_type="content",
            issue_type="missing_subtitles",
            description=f"Extracted {saved_count} subtitle tracks from video: {', '.join(saved_languages)}",
            auto_approved=True
        )
        await action.insert()

        return {
            "success": True,
            "extracted_count": saved_count,
            "languages": saved_languages
        }

    except Exception as e:
        logger.error(f"Error extracting video subtitles: {str(e)}")
        return {"success": False, "error": str(e)}


async def execute_verify_required_subtitles(
    content_id: str,
    required_languages: List[str] = ["en", "he", "es"]
) -> Dict[str, Any]:
    """Verify content has required subtitle languages."""
    from app.models.subtitles import SubtitleTrackDoc

    try:
        content = await Content.get(PydanticObjectId(content_id))
        if not content:
            return {"success": False, "error": "Content not found"}

        # Check existing subtitle tracks in database
        existing_tracks = await SubtitleTrackDoc.find(
            {"content_id": content_id}
        ).to_list()

        existing_languages = [track.language for track in existing_tracks]
        missing_languages = [lang for lang in required_languages if lang not in existing_languages]

        return {
            "success": True,
            "has_all_required": len(missing_languages) == 0,
            "existing_languages": existing_languages,
            "missing_languages": missing_languages,
            "required_languages": required_languages
        }

    except Exception as e:
        logger.error(f"Error verifying subtitles: {str(e)}")
        return {"success": False, "error": str(e)}


async def execute_search_external_subtitles(
    content_id: str,
    language: str,
    sources: List[str] = ["opensubtitles", "tmdb"]
) -> Dict[str, Any]:
    """Search for subtitles on external sources without downloading."""
    from app.services.external_subtitle_service import ExternalSubtitleService

    try:
        service = ExternalSubtitleService()
        results = await service.search_subtitle_sources(
            content_id=content_id,
            language=language,
            sources=sources
        )
        return {
            "success": True,
            "found": results["found"],
            "source": results["source"],
            "available_sources": results["sources"],
            "cached": results["cached"]
        }
    except Exception as e:
        logger.error(f"Error searching external subtitles: {str(e)}")
        return {"success": False, "error": str(e)}


async def execute_download_external_subtitle(
    content_id: str,
    language: str,
    audit_id: str
) -> Dict[str, Any]:
    """Download and save subtitle from external source."""
    from app.services.external_subtitle_service import ExternalSubtitleService
    from app.models.librarian import LibrarianAction

    try:
        service = ExternalSubtitleService()
        track = await service.fetch_subtitle_for_content(
            content_id=content_id,
            language=language
        )

        if track:
            # Create LibrarianAction
            action = LibrarianAction(
                audit_id=audit_id,
                action_type="download_external_subtitle",
                content_id=content_id,
                content_type="content",
                issue_type="missing_subtitles",
                description=f"Downloaded {language} subtitle from {track.source} ({len(track.cues)} cues)",
                auto_approved=True
            )
            await action.insert()

            return {
                "success": True,
                "language": language,
                "source": track.source,
                "cue_count": len(track.cues),
                "external_id": track.external_id
            }
        else:
            return {
                "success": False,
                "error": "No subtitles found from any source"
            }

    except Exception as e:
        logger.error(f"Error downloading external subtitle: {str(e)}")
        return {"success": False, "error": str(e)}


async def execute_batch_download_subtitles(
    content_ids: List[str],
    languages: List[str] = ["he", "en", "es"],
    max_downloads: int = 20,
    audit_id: str = None
) -> Dict[str, Any]:
    """Batch download subtitles for multiple content items."""
    from app.services.external_subtitle_service import ExternalSubtitleService
    from app.models.librarian import LibrarianAction

    try:
        service = ExternalSubtitleService()
        results = await service.batch_fetch_subtitles(
            content_ids=content_ids,
            languages=languages,
            max_downloads=max_downloads
        )

        # Create summary action
        if audit_id:
            action = LibrarianAction(
                audit_id=audit_id,
                action_type="batch_subtitle_download",
                content_id="batch_operation",  # Use a placeholder for batch operations
                content_type="batch",
                issue_type="missing_subtitles",
                description=f"Batch downloaded subtitles: {results['success']}/{results['processed']} successful, {results['quota_remaining']} quota remaining",
                auto_approved=True
            )
            await action.insert()

        return {
            "success": True,
            "processed": results["processed"],
            "success_count": results["success"],
            "failed_count": results["failed"],
            "quota_remaining": results["quota_remaining"],
            "quota_used": results["quota_used"],
            "details": results["details"]
        }

    except Exception as e:
        logger.error(f"Error in batch subtitle download: {str(e)}")
        return {"success": False, "error": str(e)}


async def execute_check_subtitle_quota() -> Dict[str, Any]:
    """Check remaining subtitle download quota."""
    from app.services.opensubtitles_service import get_opensubtitles_service

    try:
        service = get_opensubtitles_service()
        quota = await service.check_quota_available()
        return {
            "success": True,
            "quota_available": quota["available"],
            "remaining": quota["remaining"],
            "used": quota["used"],
            "daily_limit": quota["daily_limit"],
            "resets_at": quota["resets_at"].isoformat()
        }
    except Exception as e:
        logger.error(f"Error checking subtitle quota: {str(e)}")
        return {"success": False, "error": str(e)}


def get_language_name(code: str) -> str:
    """Helper function to get language name from code."""
    lang_names = {
        "en": "English",
        "he": "עברית",
        "es": "Español",
        "ar": "العربية",
        "ru": "Русский",
        "fr": "Français"
    }
    return lang_names.get(code, code.upper())


# ============================================================================
# TOOL DISPATCHER
# ============================================================================

async def execute_tool(
    tool_name: str,
    tool_input: Dict[str, Any],
    audit_id: str,
    dry_run: bool = False
) -> Dict[str, Any]:
    """Execute a tool based on its name."""

    logger.info(f"🔧 Executing tool: {tool_name}", extra={"input": tool_input})

    try:
        if tool_name == "list_content_items":
            return await execute_list_content_items(**tool_input)

        elif tool_name == "get_content_details":
            return await execute_get_content_details(**tool_input)

        elif tool_name == "get_categories":
            return await execute_get_categories()

        elif tool_name == "check_stream_url":
            return await execute_check_stream_url(**tool_input)

        elif tool_name == "search_tmdb":
            return await execute_search_tmdb(**tool_input)

        elif tool_name == "fix_missing_poster":
            return await execute_fix_missing_poster(**tool_input, audit_id=audit_id, dry_run=dry_run)

        elif tool_name == "fix_missing_metadata":
            return await execute_fix_missing_metadata(**tool_input, audit_id=audit_id, dry_run=dry_run)

        elif tool_name == "recategorize_content":
            return await execute_recategorize_content(**tool_input, audit_id=audit_id, dry_run=dry_run)

        elif tool_name == "flag_for_manual_review":
            return await execute_flag_for_manual_review(**tool_input)

        elif tool_name == "clean_title":
            return await execute_clean_title(**tool_input)

        elif tool_name == "check_storage_usage":
            return await execute_check_storage_usage(**tool_input)

        elif tool_name == "list_large_files":
            return await execute_list_large_files(**tool_input)

        elif tool_name == "calculate_storage_costs":
            return await execute_calculate_storage_costs(**tool_input)

        elif tool_name == "send_email_notification":
            return await execute_send_email_notification(**tool_input)

        elif tool_name == "scan_video_subtitles":
            return await execute_scan_video_subtitles(**tool_input)

        elif tool_name == "extract_video_subtitles":
            return await execute_extract_video_subtitles(**tool_input)

        elif tool_name == "verify_required_subtitles":
            return await execute_verify_required_subtitles(**tool_input)

        elif tool_name == "search_external_subtitles":
            return await execute_search_external_subtitles(**tool_input)

        elif tool_name == "download_external_subtitle":
            return await execute_download_external_subtitle(**tool_input)

        elif tool_name == "batch_download_subtitles":
            return await execute_batch_download_subtitles(**tool_input)

        elif tool_name == "check_subtitle_quota":
            return await execute_check_subtitle_quota()

        elif tool_name == "complete_audit":
            # This is handled specially in the agent loop
            return {"success": True, "completed": True, **tool_input}

        else:
            return {"success": False, "error": f"Unknown tool: {tool_name}"}

    except Exception as e:
        logger.error(f"Error executing tool {tool_name}: {str(e)}")
        return {"success": False, "error": str(e)}


# ============================================================================
# AI AGENT LOOP
# ============================================================================

async def run_ai_agent_audit(
    audit_type: str = "ai_agent",
    dry_run: bool = True,
    max_iterations: int = 50,
    budget_limit_usd: float = 1.0,
    language: str = "en"
) -> AuditReport:
    """
    Run a fully autonomous AI agent audit using Claude's tool use.

    This agent will:
    1. Decide what content to inspect
    2. Discover issues using its reasoning
    3. Choose which fixes to apply
    4. Adapt its strategy based on findings
    5. Provide a comprehensive summary

    Safety limits:
    - max_iterations: Maximum tool uses (default 50)
    - budget_limit_usd: Maximum Claude API cost (default $1)
    - dry_run: If True, agent can't modify data
    - language: Language code for insights (en, es, he)
    """

    start_time = datetime.utcnow()
    audit_id = f"ai-agent-{int(start_time.timestamp())}"

    # Create audit report early so we can write logs to it
    audit_report = AuditReport(
        audit_id=audit_id,
        audit_date=start_time,
        audit_type=audit_type,
        status="in_progress",
        execution_logs=[]
    )
    await audit_report.insert()

    # Log startup
    await log_to_database(audit_report, "info", f"Audit started: {audit_type}", "Librarian")
    await log_to_database(audit_report, "info", f"Mode: {'DRY RUN' if dry_run else 'LIVE'}", "Librarian")
    await log_to_database(audit_report, "info", f"Max iterations: {max_iterations}, Budget: ${budget_limit_usd}", "Librarian")

    # Check TMDB configuration
    from app.core.config import settings
    if not settings.TMDB_API_KEY:
        await log_to_database(
            audit_report,
            "warn",
            "⚠️ TMDB API key not configured - metadata fixes will fail. Set TMDB_API_KEY environment variable.",
            "System"
        )
        logger.warning("⚠️ TMDB API key not configured - metadata fixes will not work")
    else:
        await log_to_database(audit_report, "info", "✓ TMDB API configured", "System")

    logger.info("=" * 80)
    logger.info("🤖 Starting AI Agent Audit")
    logger.info(f"   Audit ID: {audit_id}")
    logger.info(f"   Mode: {'DRY RUN' if dry_run else 'LIVE'}")
    logger.info(f"   Max iterations: {max_iterations}")
    logger.info(f"   Budget limit: ${budget_limit_usd}")
    logger.info("=" * 80)

    # Initialize tracking
    tool_uses = []
    total_cost = 0.0
    conversation_history = []

    # Language mapping for Claude's responses
    language_instruction = {
        "en": "Communicate in English.",
        "es": "Comunícate en español.",
        "he": "תקשר בעברית."
    }.get(language, "Communicate in English.")

    # Audit type-specific instructions
    audit_instructions = {
        "weekly_comprehensive": """
**AUDIT TYPE: Weekly Comprehensive Library Scan**

Your mission: Conduct a THOROUGH audit of the entire library focusing on:
1. **Metadata completeness** - IMDB ratings, TMDB data, posters, descriptions
2. **Content quality** - Title cleanliness, categorization accuracy
3. **Streaming health** - URL validation, availability checks
4. **Subtitle coverage** - Check for EN/HE/ES subtitles, extract embedded tracks
5. **Strategic planning** - Identify systematic issues requiring batch fixes

**Strategy:**
- Scan 150-200 items across all categories
- Fix all missing posters and metadata
- Extract all embedded subtitles (unlimited, free!)
- Use OpenSubtitles quota strategically (20 downloads max)
- Provide comprehensive recommendations for next week

**Budget:** You have 200 iterations and $15 budget - use it wisely!
""",
        "daily_maintenance": """
**AUDIT TYPE: Daily Subtitle Maintenance Scan**

Your mission: Focus EXCLUSIVELY on subtitle acquisition and maintenance:
1. **Priority:** Find content missing required subtitles (EN/HE/ES)
2. **Extract embedded subtitles** from video files (unlimited, free!)
3. **Download external subtitles** from OpenSubtitles (20/day quota)
4. **Prioritize** most recent content and high-view items
5. **Track progress** toward 100% subtitle coverage

**Strategy:**
- Check 50-100 items for missing subtitles
- Extract ALL embedded subtitles found
- Download 20 subtitles from OpenSubtitles (daily quota)
- Use batch_download_subtitles for efficiency
- Report progress toward subtitle completion goal

**Budget:** You have 100 iterations and $5 budget - focus on subtitles!
""",
        "ai_agent": """
**AUDIT TYPE: Manual AI Agent Audit**

Your mission: Conduct a comprehensive audit based on current library needs.
Balance between metadata fixes, subtitle acquisition, and quality checks.
""",
    }
    
    audit_specific_instruction = audit_instructions.get(audit_type, audit_instructions["ai_agent"])
    
    # Initial prompt for Claude (in English as instructions, Claude responds in requested language)
    initial_prompt = f"""You are an autonomous AI Librarian for Bayit+, an Israeli streaming platform.

{language_instruction}

{audit_specific_instruction}

**Your Mission:** Conduct a comprehensive audit of the content library and fix issues autonomously.

**🎯 TOP PRIORITY - Images & Metadata:**
**MOST IMPORTANT:** Your #1 job is retrieving and saving poster images and metadata for content items. This is the most valuable fix you can make!

**Workflow for Each Item:**
1. **FIRST:** If title is dirty (has .mp4, 1080p, [MX], XviD, etc) → Use clean_title FIRST
2. **SECOND:** Search TMDB to verify the cleaned title works → Use search_tmdb
3. **THIRD:** Retrieve and save poster image → Use fix_missing_poster
4. **FOURTH:** Retrieve and save full metadata → Use fix_missing_metadata
5. **FIFTH:** Verify required subtitles (EN, HE, ES) → Use verify_required_subtitles
6. **SIXTH:** If missing subtitles, scan video for embedded tracks → Use scan_video_subtitles
7. **SEVENTH:** If embedded subtitles found, extract them → Use extract_video_subtitles
8. **EIGHTH:** If still missing subtitles, check external quota → Use check_subtitle_quota
9. **NINTH:** If quota available, search external sources → Use search_external_subtitles
10. **TENTH:** If found, download external subtitles → Use download_external_subtitle
11. **ELEVENTH:** For batch operations, use batch_download_subtitles (respects 20/day limit)
12. **TWELFTH:** Check for other issues (categorization, broken URLs)

**What You Must Do:**
1. Choose which content items to inspect (use judgment - no need to check everything)
2. **MANDATORY - Check each item for (IN THIS ORDER):**
   - 🔥 **HIGHEST PRIORITY:** Missing thumbnail/poster image
   - 🔥 **HIGHEST PRIORITY:** Missing metadata (description, genre, imdb_id, tmdb_id, cast, director)
   - 🔥 **HIGHEST PRIORITY:** Missing required subtitles (English, Hebrew, Spanish)
   - ✅ Dirty titles (must clean BEFORE fixing poster/metadata!)
   - ✅ Missing backdrop (wide background image)
   - ✅ Embedded subtitles not extracted from MKV files
   - ✅ Incorrect categorization
   - ✅ Broken streaming URLs
3. **IMPORTANT - Logging:** Always document what you're checking and what you found
4. **CRITICAL:** Always clean titles BEFORE trying to fix posters/metadata (TMDB needs clean titles to search!)
5. Fix issues you're confident about (>90% confidence for recategorization, 100% for poster/metadata)
6. Flag items for manual review when uncertain
7. **IMPORTANT:** If you find severe or critical issues - send email alert to admins
8. Adapt your strategy based on what you discover
9. At the end, call complete_audit with a comprehensive summary

**⚠️ CRITICAL WORKFLOW:**
- Dirty title "Avatar p - MX]" → clean_title FIRST → then search_tmdb → then fix_missing_poster
- Never try to fix poster/metadata without cleaning the title first!

**📋 CRITICAL DISTINCTION - 2 Types of Issues:**

**Type A - Content-Level Issues (YOU CAN FIX!):**
- Missing thumbnail → Use fix_missing_poster
- Missing backdrop → Use fix_missing_poster
- Missing metadata → Use fix_missing_metadata
- Dirty title → Use clean_title
- Broken URL → Check and suggest solution
- Wrong categorization → Use recategorize_content
These will appear in summary as "fixes_applied" and have follow-up actions!

**Type B - System-Level Recommendations (YOU CANNOT FIX!):**
- Database schema changes
- API connectivity issues (TMDB, GCS)
- Email configuration
- Cloud authentication settings
- Backup procedures
These will ONLY appear in AI Insights in complete_audit, NOT as fixes_applied!

**Available Tools - Content Management:**
- list_content_items - Get list of items to audit
- get_content_details - Check details about specific item
- get_categories - See all categories
- check_stream_url - Check if URL works
- search_tmdb - Search metadata on TMDB
- fix_missing_poster - Add missing poster
- fix_missing_metadata - Update metadata
- recategorize_content - Move item to another category (only if >90% confident)
- clean_title - 🧹 Clean title from junk (.mp4, 1080p, [MX], XviD, MDMA, BoK, etc.)
- verify_required_subtitles - 📝 Check if content has EN/HE/ES subtitles
- scan_video_subtitles - 🔍 Scan video file for embedded subtitle tracks
- extract_video_subtitles - 📥 Extract embedded subtitles and save to database
- check_subtitle_quota - 📊 Check OpenSubtitles download quota (20/day limit)
- search_external_subtitles - 🔎 Search OpenSubtitles/TMDB without downloading
- download_external_subtitle - ⬇️ Download subtitle from OpenSubtitles/TMDB
- batch_download_subtitles - 📦 Batch download subtitles for multiple items
- flag_for_manual_review - Flag for manual review

**Available Tools - Storage Monitoring (NEW!):**
- check_storage_usage - 📊 Check storage usage (total size, file count, breakdown by type)
- list_large_files - 🔍 Find files larger than 5GB
- calculate_storage_costs - 💰 Calculate monthly storage costs

**Available Tools - Notifications:**
- send_email_notification - 📧 Send email alert to admins (only for severe issues!)
- complete_audit - Finish the audit

**When to Send Email?**
Send email alert ONLY if you found one of these:
- 🚨 Broken streaming URLs (>5 items)
- 🚨 Widespread incorrect categorization (>10 items)
- 🚨 Missing or incorrect metadata at scale (>20 items)
- 🚨 Dirty titles at scale (>15 items cleaned)
- 🚨 Very large files (>5GB) or high storage usage (>500GB)
- 🚨 High storage costs (>$100/month)
- 🚨 Critical quality issues affecting user experience
- 🚨 Any other issue requiring immediate attention

DO NOT send email for:
- ✅ Small issues you fixed
- ✅ Routine audits without significant issues
- ✅ Individual issues flagged for manual review

**Mode:** {'DRY RUN - You cannot actually change data, only report what you would do' if dry_run else 'LIVE - You can make real changes'}

**Limits:**
- Maximum {max_iterations} tool uses
- API Budget: ${budget_limit_usd}

Start the audit!"""

    # Add initial message to conversation
    conversation_history.append({
        "role": "user",
        "content": initial_prompt
    })

    # Agent loop
    iteration = 0
    audit_complete = False
    completion_summary = None

    while iteration < max_iterations and not audit_complete:
        iteration += 1

        logger.info(f"\n🔄 Iteration {iteration}/{max_iterations}")

        try:
            # Call Claude with tools
            response: Message = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=4096,
                tools=TOOLS,
                messages=conversation_history
            )

            # Estimate cost (rough approximation)
            input_tokens = response.usage.input_tokens
            output_tokens = response.usage.output_tokens
            cost = (input_tokens * 0.000003) + (output_tokens * 0.000015)  # Sonnet 4.5 pricing
            total_cost += cost

            logger.info(f"   Tokens: {input_tokens} in, {output_tokens} out (cost: ${cost:.4f}, total: ${total_cost:.4f})")

            # Check budget
            if total_cost > budget_limit_usd:
                logger.warning(f"⚠️  Budget limit reached: ${total_cost:.4f} > ${budget_limit_usd}")
                break

            # Process response
            assistant_message = {"role": "assistant", "content": response.content}
            conversation_history.append(assistant_message)

            # Check if Claude wants to use tools
            tool_results = []

            for block in response.content:
                if isinstance(block, TextBlock):
                    # Log Claude's thinking to database
                    await log_to_database(audit_report, "info", block.text[:300], "AI Agent")
                    logger.info(f"💭 Claude: {block.text[:200]}...")

                elif isinstance(block, ToolUseBlock):
                    tool_name = block.name
                    tool_input = block.input

                    # Log tool use START to database with full parameters
                    params_str = json.dumps(tool_input, ensure_ascii=False, indent=2)
                    await log_to_database(
                        audit_report,
                        "info",
                        f"🔧 TOOL START: {tool_name}\nParameters: {params_str}",
                        "AI Agent"
                    )

                    logger.info(f"🔧 Claude wants to use: {tool_name}")
                    logger.info(f"   Input: {json.dumps(tool_input, ensure_ascii=False)[:200]}")

                    # Check for completion
                    if tool_name == "complete_audit":
                        audit_complete = True
                        completion_summary = tool_input
                        await log_to_database(audit_report, "success", "✅ TOOL COMPLETE: complete_audit - Audit finished successfully", "AI Agent")
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": json.dumps({"success": True, "message": "Audit completed successfully!"})
                        })
                        break

                    # Execute tool
                    result = await execute_tool(tool_name, tool_input, audit_id, dry_run)

                    # Log FULL tool result to database
                    result_str = json.dumps(result, ensure_ascii=False, indent=2)

                    if result.get("success") is False:
                        error_msg = result.get("error", "Unknown error")
                        await log_to_database(
                            audit_report,
                            "error",
                            f"❌ TOOL FAILED: {tool_name}\nError: {error_msg}\nFull result: {result_str}",
                            "AI Agent"
                        )
                        logger.error(f"   ❌ Tool failed: {error_msg}")
                    elif result.get("success") is True:
                        # Log ALL successful tool executions with full details
                        success_msg = result.get("message", "Success")
                        await log_to_database(
                            audit_report,
                            "success",
                            f"✅ TOOL SUCCESS: {tool_name}\nMessage: {success_msg}\nFull result: {result_str}",
                            "AI Agent"
                        )
                        logger.info(f"   ✅ Tool succeeded: {success_msg}")
                    else:
                        # Tool returned data without explicit success/failure flag
                        await log_to_database(
                            audit_report,
                            "info",
                            f"📊 TOOL RESULT: {tool_name}\nFull result: {result_str}",
                            "AI Agent"
                        )
                        logger.info(f"   📊 Tool returned data")

                    # Track tool use
                    tool_uses.append({
                        "iteration": iteration,
                        "tool": tool_name,
                        "input": tool_input,
                        "result": result,
                        "timestamp": datetime.utcnow()
                    })

                    # Add result to conversation
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": json.dumps(result, ensure_ascii=False)
                    })

                    logger.info(f"   ✅ Result: {json.dumps(result, ensure_ascii=False)[:200]}")

            # If we have tool results, continue conversation
            if tool_results and not audit_complete:
                conversation_history.append({
                    "role": "user",
                    "content": tool_results
                })

            # If Claude didn't use any tools and didn't complete, something's wrong
            elif not tool_results and not audit_complete:
                logger.warning("⚠️  Claude didn't use any tools or complete the audit")
                break

        except Exception as e:
            logger.error(f"❌ Error in agent loop iteration {iteration}: {str(e)}")
            break

    # Finalize audit report
    end_time = datetime.utcnow()
    execution_time = (end_time - start_time).total_seconds()

    # Extract summary from completion if available
    if completion_summary:
        total_items = completion_summary.get("items_checked", 0)
        issues_found = completion_summary.get("issues_found", 0)
        summary = {
            "total_items": total_items,
            "healthy_items": max(0, total_items - issues_found),
            "issues_found": issues_found,
            "issues_fixed": completion_summary.get("issues_fixed", 0),
            "manual_review_needed": completion_summary.get("flagged_for_review", 0),
            "agent_summary": completion_summary.get("summary", ""),
            "recommendations": completion_summary.get("recommendations", [])
        }
    else:
        summary = {
            "total_items": 0,
            "healthy_items": 0,
            "issues_found": 0,
            "issues_fixed": 0,
            "manual_review_needed": 0,
            "agent_summary": "Audit incomplete - reached iteration or budget limit"
        }

    # Update the existing audit report
    audit_report.execution_time_seconds = execution_time
    audit_report.status = "completed" if audit_complete else "partial"
    audit_report.summary = summary
    audit_report.content_results = {
        "agent_mode": True,
        "iterations": iteration,
        "tool_uses": len(tool_uses),
        "total_cost_usd": round(total_cost, 4)
    }
    audit_report.ai_insights = completion_summary.get("recommendations", []) if completion_summary else []
    audit_report.completed_at = end_time

    await audit_report.save()

    # Final log
    await log_to_database(audit_report, "success", f"Audit completed in {execution_time:.1f}s", "Librarian")

    logger.info("=" * 80)
    logger.info("✅ AI Agent Audit Complete")
    logger.info(f"   Iterations: {iteration}")
    logger.info(f"   Tool uses: {len(tool_uses)}")
    logger.info(f"   Total cost: ${total_cost:.4f}")
    logger.info(f"   Execution time: {execution_time:.2f}s")
    logger.info(f"   Status: {audit_report.status}")
    logger.info("=" * 80)

    return audit_report
