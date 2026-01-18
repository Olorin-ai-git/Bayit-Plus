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
from app.services.audit_task_manager import audit_task_manager
from app.services.ai_agent.logger import log_to_database, clear_title_cache

# Initialize logger
logger = logging.getLogger(__name__)

# Initialize Anthropic client
client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)


# ============================================================================
# TOOL DEFINITIONS
# ============================================================================

TOOLS = [
    {
        "name": "list_content_items",
        "description": "Get a list of content items to audit. Returns items in batches with pagination support. Response includes 'total', 'has_more' to help you process all items in batches of 100. Use skip parameter to get next batch.",
        "input_schema": {
            "type": "object",
            "properties": {
                "category_id": {
                    "type": "string",
                    "description": "Optional: Filter by category ID"
                },
                "limit": {
                    "type": "integer",
                    "description": "Maximum number of items to return (default 100, max 1000)",
                    "default": 100
                },
                "random_sample": {
                    "type": "boolean",
                    "description": "If true, return random sample instead of newest items",
                    "default": False
                },
                "skip": {
                    "type": "integer",
                    "description": "Number of items to skip for pagination (default 0). Increment by limit to get next batch.",
                    "default": 0
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
        "name": "reclassify_as_series",
        "description": "Reclassify a content item as a TV SERIES (sets is_series=true and content_type='series'). Use when you find content with S01E01, S02E03 patterns, or that TMDB identifies as a TV show. Moves item to Series category automatically.",
        "input_schema": {
            "type": "object",
            "properties": {
                "content_id": {
                    "type": "string",
                    "description": "The ID of the content item to reclassify"
                },
                "reason": {
                    "type": "string",
                    "description": "Explanation of why this should be classified as a series (e.g., 'Title contains S01E01 pattern', 'TMDB identifies this as TV series')"
                }
            },
            "required": ["content_id", "reason"]
        }
    },
    {
        "name": "reclassify_as_movie",
        "description": "Reclassify a content item as a MOVIE (sets is_series=false and content_type='movie'). Use when you find series marked as movies incorrectly, or when TMDB identifies it as a movie. Moves item to Movies category automatically.",
        "input_schema": {
            "type": "object",
            "properties": {
                "content_id": {
                    "type": "string",
                    "description": "The ID of the content item to reclassify"
                },
                "reason": {
                    "type": "string",
                    "description": "Explanation of why this should be classified as a movie (e.g., 'TMDB identifies this as a movie', 'No season/episode pattern found')"
                }
            },
            "required": ["content_id", "reason"]
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
        "name": "check_api_configuration",
        "description": "Check the configuration status of external APIs (TMDB, OpenSubtitles). Returns which APIs are configured and ready to use. Use this at the start of an audit to know what capabilities are available.",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": []
        }
    },
    {
        "name": "find_duplicates",
        "description": "Scan the content library for duplicate entries. Detects duplicates based on: file hash (exact duplicates), TMDB ID, IMDB ID, exact name matches (e.g. multiple 'Bugranim s01e01'), and title similarity. Returns groups of duplicate items that can be cleaned up.",
        "input_schema": {
            "type": "object",
            "properties": {
                "detection_type": {
                    "type": "string",
                    "description": "Type of duplicate detection to run. Use 'exact_name' to find stale duplicates with identical titles.",
                    "enum": ["all", "hash", "tmdb", "imdb", "exact_name", "title"],
                    "default": "all"
                }
            },
            "required": []
        }
    },
    {
        "name": "resolve_duplicates",
        "description": "Resolve a group of duplicate content items by keeping one and handling the rest. Use after find_duplicates to clean up detected duplicates.",
        "input_schema": {
            "type": "object",
            "properties": {
                "content_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of all content IDs in the duplicate group"
                },
                "keep_id": {
                    "type": "string",
                    "description": "ID of the content item to keep (usually the oldest or most complete)"
                },
                "action": {
                    "type": "string",
                    "description": "Action to take on duplicates: 'unpublish' (hide but keep), 'delete' (permanent), or 'flag' (mark for review)",
                    "enum": ["unpublish", "delete", "flag"],
                    "default": "unpublish"
                }
            },
            "required": ["content_ids", "keep_id"]
        }
    },
    {
        "name": "find_missing_metadata",
        "description": "Find content items that are missing important metadata (description, poster, TMDB/IMDB IDs, etc.). Returns a list of items that need enrichment.",
        "input_schema": {
            "type": "object",
            "properties": {
                "limit": {
                    "type": "integer",
                    "description": "Maximum number of items to return (default 100)",
                    "default": 100
                },
                "missing_fields": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Specific fields to check for: description, poster_url, thumbnail, tmdb_id, imdb_id, year, genre",
                    "default": ["description", "poster_url", "thumbnail"]
                }
            },
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
    },
    {
        "name": "find_quality_variants",
        "description": "Find content items that are quality variants of each other (same content at different resolutions). Groups content by TMDB ID and finds items with multiple different video resolutions. Use this to identify duplicate uploads at different qualities (4K, 1080p, 720p, 480p) that can be linked together.",
        "input_schema": {
            "type": "object",
            "properties": {
                "limit": {
                    "type": "integer",
                    "description": "Maximum number of variant groups to return (default 50)",
                    "default": 50
                },
                "unlinked_only": {
                    "type": "boolean",
                    "description": "If true, only return groups that haven't been linked yet (default true)",
                    "default": True
                }
            },
            "required": []
        }
    },
    {
        "name": "link_quality_variants",
        "description": "Link multiple content items as quality variants of the same content. The highest quality version becomes the primary, and others become variants. Use this after find_quality_variants to organize multiple resolution versions of the same content.",
        "input_schema": {
            "type": "object",
            "properties": {
                "content_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of content IDs to link as quality variants"
                },
                "primary_id": {
                    "type": "string",
                    "description": "Optional: ID of the content item to be the primary (highest quality). If not specified, the highest resolution item will be chosen automatically."
                }
            },
            "required": ["content_ids"]
        }
    }
]


# ============================================================================
# TOOL EXECUTION FUNCTIONS
# ============================================================================

async def execute_list_content_items(
    category_id: Optional[str] = None,
    limit: int = 100,
    random_sample: bool = False,
    skip: int = 0
) -> Dict[str, Any]:
    """Get a list of content items to audit."""
    try:
        limit = min(limit, 1000)  # Cap at 1000

        query = {"is_published": True}
        if category_id:
            query["category_id"] = category_id

        # Get total count for pagination
        total_count = await Content.find(query).count()

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
            # Get items with skip/limit for pagination
            items = await Content.find(query).sort([("created_at", -1)]).skip(skip).limit(limit).to_list()

        has_more = (skip + len(items)) < total_count

        # Return simplified data for Claude
        return {
            "success": True,
            "count": len(items),
            "total": total_count,
            "skip": skip,
            "has_more": has_more,
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


async def execute_reclassify_as_series(
    content_id: str,
    audit_id: str,
    reason: str = "",
    dry_run: bool = False
) -> Dict[str, Any]:
    """
    Reclassify a content item as a series (is_series=True).
    Also moves it to the Series category if it exists.
    """
    try:
        logger.info(f"   📺 Reclassifying content {content_id} as SERIES...")

        if dry_run:
            logger.info(f"   🔒 DRY RUN mode - would reclassify {content_id} as series")
            return {
                "success": True,
                "dry_run": True,
                "message": f"[DRY RUN] Would reclassify content {content_id} as series. Reason: {reason}"
            }

        # Get content
        try:
            content = await Content.get(PydanticObjectId(content_id))
            if not content:
                return {"success": False, "error": "Content not found"}
            logger.info(f"   ✓ Content found: '{content.title}'")
        except Exception as e:
            logger.error(f"   ❌ Content not found: {str(e)}")
            return {"success": False, "error": f"Content not found: {str(e)}"}

        # Store before state
        before_state = {
            "is_series": content.is_series,
            "content_type": content.content_type,
            "category_id": content.category_id,
            "category_name": content.category_name,
        }

        # Get or create Series category
        series_category = await Category.find_one(Category.name == "Series")
        if not series_category:
            series_category = Category(
                name="Series",
                name_he="סדרות",
                name_en="Series",
                name_es="Series",
                slug="series",
                icon="tv",
                is_active=True,
                order=2,
            )
            await series_category.insert()
            logger.info(f"   📁 Created new 'Series' category")

        # Apply changes
        content.is_series = True
        content.content_type = "series"
        content.category_id = str(series_category.id)
        content.category_name = series_category.name
        content.updated_at = datetime.utcnow()
        await content.save()

        after_state = {
            "is_series": True,
            "content_type": "series",
            "category_id": str(series_category.id),
            "category_name": series_category.name,
        }

        # Log action
        action = LibrarianAction(
            audit_id=audit_id,
            action_type="reclassify_series",
            content_id=content_id,
            content_type="content",
            issue_type="content_type_misclassification",
            before_state=before_state,
            after_state=after_state,
            confidence_score=1.0,
            auto_approved=True,
            rollback_available=True,
            description=f"Reclassified '{content.title}' as SERIES. {reason}",
        )
        await action.insert()

        logger.info(f"   ✅ Successfully reclassified '{content.title}' as SERIES")
        return {
            "success": True,
            "reclassified": True,
            "new_type": "series",
            "message": f"Reclassified '{content.title}' as series",
            "action_id": str(action.id)
        }
    except Exception as e:
        logger.error(f"Error in reclassify_as_series: {str(e)}")
        return {"success": False, "error": str(e)}


async def execute_reclassify_as_movie(
    content_id: str,
    audit_id: str,
    reason: str = "",
    dry_run: bool = False
) -> Dict[str, Any]:
    """
    Reclassify a content item as a movie (is_series=False).
    Also moves it to the Movies category if it exists.
    """
    try:
        logger.info(f"   🎬 Reclassifying content {content_id} as MOVIE...")

        if dry_run:
            logger.info(f"   🔒 DRY RUN mode - would reclassify {content_id} as movie")
            return {
                "success": True,
                "dry_run": True,
                "message": f"[DRY RUN] Would reclassify content {content_id} as movie. Reason: {reason}"
            }

        # Get content
        try:
            content = await Content.get(PydanticObjectId(content_id))
            if not content:
                return {"success": False, "error": "Content not found"}
            logger.info(f"   ✓ Content found: '{content.title}'")
        except Exception as e:
            logger.error(f"   ❌ Content not found: {str(e)}")
            return {"success": False, "error": f"Content not found: {str(e)}"}

        # Store before state
        before_state = {
            "is_series": content.is_series,
            "content_type": content.content_type,
            "category_id": content.category_id,
            "category_name": content.category_name,
        }

        # Get or create Movies category
        movies_category = await Category.find_one(Category.name == "Movies")
        if not movies_category:
            movies_category = Category(
                name="Movies",
                name_he="סרטים",
                name_en="Movies",
                name_es="Películas",
                slug="movies",
                icon="film",
                is_active=True,
                order=1,
            )
            await movies_category.insert()
            logger.info(f"   📁 Created new 'Movies' category")

        # Apply changes
        content.is_series = False
        content.content_type = "movie"
        content.category_id = str(movies_category.id)
        content.category_name = movies_category.name
        content.updated_at = datetime.utcnow()
        await content.save()

        after_state = {
            "is_series": False,
            "content_type": "movie",
            "category_id": str(movies_category.id),
            "category_name": movies_category.name,
        }

        # Log action
        action = LibrarianAction(
            audit_id=audit_id,
            action_type="reclassify_movie",
            content_id=content_id,
            content_type="content",
            issue_type="content_type_misclassification",
            before_state=before_state,
            after_state=after_state,
            confidence_score=1.0,
            auto_approved=True,
            rollback_available=True,
            description=f"Reclassified '{content.title}' as MOVIE. {reason}",
        )
        await action.insert()

        logger.info(f"   ✅ Successfully reclassified '{content.title}' as MOVIE")
        return {
            "success": True,
            "reclassified": True,
            "new_type": "movie",
            "message": f"Reclassified '{content.title}' as movie",
            "action_id": str(action.id)
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


async def _extract_subtitles_background(content_id: str, stream_url: str):
    """
    Background task to extract and save subtitle tracks.
    This runs independently and doesn't block the calling function.
    """
    from app.services.ffmpeg_service import ffmpeg_service
    from app.services.subtitle_service import parse_subtitles
    from app.models.subtitles import SubtitleTrackDoc, SubtitleCueModel
    
    try:
        logger.info(f"🔄 [Background] Starting subtitle extraction for content {content_id}")
        
        content = await Content.get(PydanticObjectId(content_id))
        if not content:
            logger.error(f"❌ [Background] Content {content_id} not found")
            return
        
        # Update status to extracting
        content.subtitle_extraction_status = "extracting"
        await content.save()
        
        # Extract subtitles (only required languages)
        # Limit to 10 subtitles max, prioritizing he, en, es
        extracted_subs = await ffmpeg_service.extract_all_subtitles(
            stream_url,
            languages=['en', 'he', 'es'],
            max_parallel=3,
            max_subtitles=10  # Max 10 subtitles per movie
        )
        
        saved_count = 0
        saved_languages = []
        
        for sub in extracted_subs:
            try:
                # Check if subtitle already exists
                existing = await SubtitleTrackDoc.find_one({
                    "content_id": content_id,
                    "language": sub['language']
                })
                
                if existing:
                    logger.info(f"⏭️  [Background] Skipping {sub['language']} - already exists")
                    continue
                
                # Parse subtitle content
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
                    source="embedded",
                    cues=cues,
                    is_auto_generated=False
                )
                await subtitle_doc.insert()
                saved_count += 1
                saved_languages.append(sub['language'])
                logger.info(f"✅ [Background] Saved {sub['language']} subtitles ({len(cues)} cues)")
                
            except Exception as e:
                logger.error(f"❌ [Background] Failed to save {sub['language']} subtitles: {str(e)}")
        
        # Update content with results
        content.has_subtitles = saved_count > 0
        content.available_subtitle_languages = saved_languages
        content.subtitle_extraction_status = "completed" if saved_count > 0 else "failed"
        await content.save()
        
        logger.info(f"✅ [Background] Extraction complete for {content_id}: {saved_count} tracks saved ({', '.join(saved_languages)})")
        
    except Exception as e:
        logger.error(f"❌ [Background] Subtitle extraction failed for {content_id}: {str(e)}")
        try:
            content = await Content.get(PydanticObjectId(content_id))
            if content:
                content.subtitle_extraction_status = "failed"
                await content.save()
        except:
            pass


async def execute_scan_video_subtitles(content_id: str, auto_extract: bool = True) -> Dict[str, Any]:
    """
    Scan video file for embedded subtitles.
    If auto_extract=True (default), starts extraction in background and returns immediately.
    """
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

        # Create readable language list
        languages_found = [f"{track.get('language', 'unknown').upper()}" for track in metadata['subtitle_tracks']]
        languages_str = ", ".join(languages_found) if languages_found else "none"

        result = {
            "success": True,
            "title": content.title,
            "content_id": content_id,
            "subtitle_count": len(metadata['subtitle_tracks']),
            "subtitles": metadata['subtitle_tracks'],
            "video_duration": metadata['duration'],
            "video_resolution": f"{metadata['width']}x{metadata['height']}"
        }

        # Auto-extract subtitles if found and auto_extract is enabled
        if auto_extract and len(metadata['subtitle_tracks']) > 0:
            logger.info(f"🚀 Starting background subtitle extraction (filtering for required languages: en, he, es)...")
            
            # Start extraction in background - returns immediately
            asyncio.create_task(_extract_subtitles_background(content_id, content.stream_url))
            
            result["extraction_started"] = True
            result["extraction_status"] = "background_processing"
            result["message"] = f"Found {len(metadata['subtitle_tracks'])} embedded subtitle tracks ({languages_str}). Extraction started in background."
            logger.info(f"✅ Subtitle extraction started in background for content {content_id}")
        else:
            result["message"] = f"Scanned video: {len(metadata['subtitle_tracks'])} embedded subtitle tracks found ({languages_str})"

        return result

    except Exception as e:
        logger.error(f"Error scanning video subtitles: {str(e)}")
        return {"success": False, "error": str(e)}


async def _extract_with_audit(content_id: str, stream_url: str, audit_id: str, languages: Optional[List[str]] = None):
    """Background task to extract subtitles and create audit action."""
    from app.services.ffmpeg_service import ffmpeg_service
    from app.services.subtitle_service import parse_subtitles
    from app.models.subtitles import SubtitleTrackDoc, SubtitleCueModel
    from app.models.librarian import AuditReport
    from app.services.ai_agent.logger import log_to_database
    
    try:
        logger.info(f"🔄 [Background] Starting subtitle extraction for audit {audit_id}")
        
        content = await Content.get(PydanticObjectId(content_id))
        if not content:
            logger.error(f"❌ [Background] Content {content_id} not found")
            return
        
        # Get audit report for logging
        audit_report = await AuditReport.find_one(AuditReport.audit_id == audit_id)
        
        # Extract subtitles with language filtering at extraction time (more efficient)
        # Limit to 10 subtitles max, prioritizing he, en, es
        extracted_subs = await ffmpeg_service.extract_all_subtitles(
            stream_url,
            languages=languages if languages else None,
            max_parallel=3,
            max_subtitles=10  # Max 10 subtitles per movie
        )

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
                    source="embedded",
                    cues=cues,
                    is_auto_generated=False
                )
                await subtitle_doc.insert()
                saved_count += 1
                saved_languages.append(sub['language'])
                logger.info(f"✅ [Background] Saved {sub['language']} subtitles")
                
                # Log individual extraction to audit
                if audit_report:
                    lang_display = {"he": "Hebrew", "en": "English", "es": "Spanish", "ar": "Arabic", "ru": "Russian", "fr": "French"}.get(sub['language'], sub['language'].upper())
                    await log_to_database(
                        audit_report,
                        "success",
                        f"📥 Extracted {lang_display} subtitle from embedded video track",
                        "AI Agent",
                        item_name=content.title,
                        content_id=content_id,
                        metadata={
                            "action": "extract_embedded_subtitle",
                            "language": sub['language'],
                            "source": "embedded",
                            "cue_count": len(cues),
                            "format": sub['format']
                        }
                    )
                
            except Exception as e:
                logger.error(f"❌ [Background] Failed to parse {sub['language']} subtitles: {str(e)}")

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
        
        logger.info(f"✅ [Background] Extraction complete for audit {audit_id}: {saved_count} tracks saved")

    except Exception as e:
        logger.error(f"❌ [Background] Error extracting video subtitles: {str(e)}")


async def execute_extract_video_subtitles(
    content_id: str,
    audit_id: str,
    languages: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Extract subtitle tracks from video and save to database.
    Starts extraction in background and returns immediately.
    """
    try:
        content = await Content.get(PydanticObjectId(content_id))
        if not content:
            return {"success": False, "error": "Content not found"}
        
        if not content.stream_url:
            return {"success": False, "error": "No stream URL available"}
        
        # Start extraction in background
        asyncio.create_task(_extract_with_audit(content_id, content.stream_url, audit_id, languages))
        
        logger.info(f"🚀 Started background subtitle extraction for content {content_id}")
        
        return {
            "success": True,
            "status": "extraction_started_in_background",
            "message": f"Subtitle extraction started in background for languages: {languages or 'all'}"
        }

    except Exception as e:
        logger.error(f"Error starting subtitle extraction: {str(e)}")
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
        # Get content info
        content = await Content.get(PydanticObjectId(content_id))
        if not content:
            return {"success": False, "error": "Content not found"}
        
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

            lang_display = {"he": "Hebrew", "en": "English", "es": "Spanish", "ar": "Arabic", "ru": "Russian", "fr": "French"}.get(language, language.upper())

            return {
                "success": True,
                "title": content.title,
                "content_id": content_id,
                "language": language,
                "source": track.source,
                "cue_count": len(track.cues),
                "external_id": track.external_id,
                "message": f"Downloaded {lang_display} subtitle from {track.source.upper()}"
            }
        else:
            return {
                "success": False,
                "title": content.title,
                "content_id": content_id,
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
    """
    Batch download subtitles for multiple content items.
    
    OpenSubtitles limit: Maximum 3 languages per request.
    Priority order: Hebrew (he), English (en), Spanish (es)
    """
    from app.services.external_subtitle_service import ExternalSubtitleService
    from app.models.librarian import LibrarianAction, AuditReport
    from app.services.ai_agent.logger import log_to_database

    try:
        # Limit to 3 languages for OpenSubtitles, prioritize he, en, es
        priority_order = ['he', 'en', 'es']
        prioritized_languages = []
        
        # Add priority languages first
        for lang in priority_order:
            if lang in languages:
                prioritized_languages.append(lang)
        
        # Add other languages
        for lang in languages:
            if lang not in prioritized_languages:
                prioritized_languages.append(lang)
        
        # Limit to 3 languages max
        limited_languages = prioritized_languages[:3]
        
        if len(languages) > 3:
            logger.info(
                f"⚠️ OpenSubtitles limited to 3 languages: {limited_languages} "
                f"(skipped: {prioritized_languages[3:]})"
            )
        
        service = ExternalSubtitleService()
        results = await service.batch_fetch_subtitles(
            content_ids=content_ids,
            languages=limited_languages,
            max_downloads=max_downloads
        )

        # Get audit report for detailed logging
        audit_report = None
        if audit_id:
            audit_report = await AuditReport.find_one(AuditReport.audit_id == audit_id)

        # Create individual log entries for each successful download
        if audit_report:
            for detail in results["details"]:
                if detail["status"] == "success":
                    lang_display = {"he": "Hebrew", "en": "English", "es": "Spanish", "ar": "Arabic", "ru": "Russian", "fr": "French"}.get(detail["language"], detail["language"].upper())
                    
                    await log_to_database(
                        audit_report,
                        "success",
                        f"⬇️ Downloaded {lang_display} subtitle from {detail['source'].upper()}",
                        "AI Agent",
                        item_name=detail["title"],
                        content_id=detail["content_id"],
                        metadata={
                            "action": "download_external_subtitle",
                            "language": detail["language"],
                            "source": detail["source"],
                            "method": "batch_download"
                        }
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

        # Create a detailed summary message
        success_items = [d for d in results["details"] if d["status"] == "success"]
        summary_parts = []
        if success_items:
            summary_parts.append(f"✅ {len(success_items)} subtitles downloaded:")
            for item in success_items[:5]:  # Show first 5
                lang_short = item["language"].upper()
                summary_parts.append(f"  • {item['title']} ({lang_short} from {item['source']})")
            if len(success_items) > 5:
                summary_parts.append(f"  • ...and {len(success_items) - 5} more")
        
        summary_message = "\n".join(summary_parts) if summary_parts else "No subtitles downloaded"

        return {
            "success": True,
            "message": summary_message,
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
                "duplicates": duplicates[:20]  # Limit response size
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
    action: str = "unpublish"
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
            "groups": variants[:20],  # Limit response size for Claude
            "message": f"Found {len(variants)} groups of content with multiple quality versions"
        }
    except Exception as e:
        logger.error(f"Error finding quality variants: {str(e)}")
        return {"success": False, "error": str(e)}


async def execute_link_quality_variants(
    content_ids: List[str],
    primary_id: Optional[str] = None
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
        # Build query for missing fields
        or_conditions = []
        for field in missing_fields:
            or_conditions.append({field: {"$in": [None, ""]}})
            or_conditions.append({field: {"$exists": False}})

        items = await Content.find(
            {"$or": or_conditions, "is_published": True}
        ).sort([("created_at", -1)]).limit(limit).to_list()

        # Analyze what's missing for each item
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

        # Count by missing field
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


async def execute_manage_podcast_episodes(
    audit_id: str,
    podcast_id: Optional[str] = None,
    max_episodes_to_keep: int = 3
) -> Dict[str, Any]:
    """
    Manage podcast episodes: sync latest from RSS and keep only the N most recent episodes.
    
    Args:
        audit_id: Current audit ID for tracking
        podcast_id: Optional specific podcast to manage, otherwise manages all
        max_episodes_to_keep: Maximum episodes to keep per podcast (default 3)
        
    Returns:
        Dictionary with management results
    """
    from app.services.podcast_sync import sync_podcast_episodes
    
    try:
        results = {
            "success": True,
            "podcasts_processed": 0,
            "episodes_synced": 0,
            "episodes_deleted": 0,
            "podcasts": []
        }
        
        # Get podcasts to process
        if podcast_id:
            podcast = await Podcast.get(podcast_id)
            if not podcast:
                return {
                    "success": False,
                    "error": f"Podcast not found: {podcast_id}"
                }
            podcasts = [podcast]
        else:
            # Get all active podcasts with RSS feeds
            podcasts = await Podcast.find(
                {"is_active": True, "rss_feed": {"$exists": True, "$ne": None}}
            ).to_list(length=None)
        
        if not podcasts:
            return {
                "success": True,
                "message": "No active podcasts with RSS feeds found",
                "podcasts_processed": 0
            }
        
        logger.info(f"🎙️ Managing {len(podcasts)} podcast(s)")
        
        # Process each podcast
        for podcast in podcasts:
            podcast_result = {
                "podcast_id": str(podcast.id),
                "title": podcast.title,
                "episodes_synced": 0,
                "episodes_deleted": 0,
                "current_episode_count": 0,
                "latest_episode_date": None
            }
            
            try:
                # Step 1: Sync latest episodes from RSS feed
                logger.info(f"📡 Syncing episodes for: {podcast.title}")
                episodes_synced = await sync_podcast_episodes(podcast, max_episodes=10)
                podcast_result["episodes_synced"] = episodes_synced
                results["episodes_synced"] += episodes_synced
                
                if episodes_synced > 0:
                    logger.info(f"✅ Synced {episodes_synced} new episode(s) for {podcast.title}")
                
                # Step 2: Get all episodes for this podcast, sorted by published date (newest first)
                all_episodes = await PodcastEpisode.find(
                    {"podcast_id": str(podcast.id)}
                ).sort([("published_at", -1)]).to_list(length=None)
                
                total_episodes = len(all_episodes)
                podcast_result["current_episode_count"] = total_episodes
                
                if all_episodes:
                    podcast_result["latest_episode_date"] = all_episodes[0].published_at.isoformat()
                
                # Step 3: Delete old episodes if we have more than max_episodes_to_keep
                if total_episodes > max_episodes_to_keep:
                    episodes_to_delete = all_episodes[max_episodes_to_keep:]
                    deleted_count = 0
                    
                    logger.info(
                        f"🗑️ Deleting {len(episodes_to_delete)} old episode(s) from {podcast.title} "
                        f"(keeping {max_episodes_to_keep} most recent)"
                    )
                    
                    for episode in episodes_to_delete:
                        try:
                            await episode.delete()
                            deleted_count += 1
                            logger.debug(f"   Deleted: {episode.title} ({episode.published_at.date()})")
                        except Exception as e:
                            logger.warning(f"Failed to delete episode {episode.title}: {str(e)}")
                    
                    podcast_result["episodes_deleted"] = deleted_count
                    results["episodes_deleted"] += deleted_count
                    
                    logger.info(f"✅ Deleted {deleted_count} old episode(s)")
                
                # Step 4: Update podcast metadata
                podcast.episode_count = min(total_episodes, max_episodes_to_keep)
                if all_episodes:
                    podcast.latest_episode_date = all_episodes[0].published_at
                podcast.updated_at = datetime.utcnow()
                await podcast.save()
                
                results["podcasts_processed"] += 1
                results["podcasts"].append(podcast_result)
                
                logger.info(
                    f"✅ {podcast.title}: {podcast_result['current_episode_count']} episode(s) "
                    f"(synced: {episodes_synced}, deleted: {podcast_result['episodes_deleted']})"
                )
                
            except Exception as e:
                logger.error(f"❌ Error managing {podcast.title}: {str(e)}")
                podcast_result["error"] = str(e)
                results["podcasts"].append(podcast_result)
        
        # Generate summary message
        summary = (
            f"Podcast Management Complete:\n"
            f"• Podcasts processed: {results['podcasts_processed']}\n"
            f"• New episodes synced: {results['episodes_synced']}\n"
            f"• Old episodes deleted: {results['episodes_deleted']}\n"
            f"• Max episodes per podcast: {max_episodes_to_keep}"
        )
        
        results["message"] = summary
        logger.info(f"\n✅ {summary}")
        
        return results
        
    except Exception as e:
        logger.error(f"❌ Failed to manage podcast episodes: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


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

        elif tool_name == "reclassify_as_series":
            return await execute_reclassify_as_series(**tool_input, audit_id=audit_id, dry_run=dry_run)

        elif tool_name == "reclassify_as_movie":
            return await execute_reclassify_as_movie(**tool_input, audit_id=audit_id, dry_run=dry_run)

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

        elif tool_name == "check_api_configuration":
            return await execute_check_api_configuration()

        elif tool_name == "find_duplicates":
            return await execute_find_duplicates(**tool_input)

        elif tool_name == "resolve_duplicates":
            return await execute_resolve_duplicates(**tool_input)

        elif tool_name == "find_quality_variants":
            return await execute_find_quality_variants(**tool_input)

        elif tool_name == "link_quality_variants":
            return await execute_link_quality_variants(**tool_input)

        elif tool_name == "find_missing_metadata":
            return await execute_find_missing_metadata(**tool_input)

        elif tool_name == "manage_podcast_episodes":
            return await execute_manage_podcast_episodes(**tool_input)

        elif tool_name == "complete_audit":
            # This is handled specially in the agent loop
            return {"success": True, "completed": True, **tool_input}

        else:
            return {"success": False, "error": f"Unknown tool: {tool_name}"}

    except Exception as e:
        logger.error(f"Error executing tool {tool_name}: {str(e)}")
        return {"success": False, "error": str(e)}


# ============================================================================
# COMPREHENSIVE SUMMARY LOGGING
# ============================================================================

async def _log_comprehensive_summary(
    audit_report: "AuditReport",
    completion_summary: Dict[str, Any],
    execution_time: float,
    iteration: int,
    total_cost: float
):
    """
    Log a comprehensive, well-formatted audit summary to execution logs.
    This creates the detailed summary report that appears in the UI.
    """

    # Build formatted summary sections
    summary_lines = []

    # Header
    summary_lines.append("🎉 **COMPREHENSIVE SUBTITLE MAINTENANCE SCAN COMPLETED!**")
    summary_lines.append("")
    summary_lines.append("## 📊 **FINAL AUDIT SUMMARY**")
    summary_lines.append("")

    # Overall Statistics
    total_items = completion_summary.get("items_checked", 0)
    issues_found = completion_summary.get("issues_found", 0)
    issues_fixed = completion_summary.get("issues_fixed", 0)
    flagged = completion_summary.get("flagged_for_review", 0)
    health_score = completion_summary.get("health_score", 0)

    summary_lines.append(f"**TOTAL COVERAGE:** All **{total_items} content items** systematically processed!")
    summary_lines.append("")
    summary_lines.append("**📊 RESULTS BREAKDOWN:**")
    summary_lines.append(f"- **Items Processed:** {total_items} (100% coverage)")
    summary_lines.append(f"- **Issues Discovered:** {issues_found}")
    summary_lines.append(f"- **Issues Auto-Fixed:** {issues_fixed}")
    summary_lines.append(f"- **Flagged for Manual Review:** {flagged}")
    if health_score > 0:
        health_emoji = "🟢" if health_score >= 90 else "🟡" if health_score >= 70 else "🟠" if health_score >= 50 else "🔴"
        summary_lines.append(f"- **Library Health Score:** {health_emoji} {health_score}/100")
    summary_lines.append("")

    # Subtitle Statistics (if provided)
    subtitle_stats = completion_summary.get("subtitle_stats", {})
    if subtitle_stats:
        summary_lines.append("### 🎬 **SUBTITLE ANALYSIS:**")
        items_with_all = subtitle_stats.get("items_with_all_required", 0)
        items_missing = subtitle_stats.get("items_missing_subtitles", 0)
        extracted = subtitle_stats.get("subtitles_extracted_from_video", 0)
        downloaded = subtitle_stats.get("subtitles_downloaded_external", 0)

        summary_lines.append(f"- ✅ Items with all required subtitles (he, en, es): **{items_with_all}**")
        summary_lines.append(f"- ⚠️ Items missing subtitles: **{items_missing}**")
        summary_lines.append(f"- 📼 Subtitles extracted from video files: **{extracted}**")
        summary_lines.append(f"- 🌐 Subtitles downloaded from external sources: **{downloaded}**")

        # Language breakdown
        by_language = subtitle_stats.get("by_language", {})
        if by_language:
            summary_lines.append("  - **By Language:**")
            lang_names = {"he": "Hebrew", "en": "English", "es": "Spanish", "ar": "Arabic", "ru": "Russian", "fr": "French"}
            for lang_code, count in sorted(by_language.items()):
                lang_name = lang_names.get(lang_code, lang_code.upper())
                summary_lines.append(f"    - {lang_name}: **{count}** tracks")

        # Quota info
        quota_used = subtitle_stats.get("opensubtitles_quota_used", 0)
        quota_remaining = subtitle_stats.get("opensubtitles_quota_remaining", 0)
        if quota_used > 0 or quota_remaining > 0:
            summary_lines.append(f"- 🎫 OpenSubtitles quota used: **{quota_used}** (remaining: **{quota_remaining}**)")
        summary_lines.append("")

    # Metadata Statistics (if provided)
    metadata_stats = completion_summary.get("metadata_stats", {})
    if metadata_stats:
        summary_lines.append("### 🎨 **METADATA & QUALITY FIXES:**")
        posters_fixed = metadata_stats.get("posters_fixed", 0)
        metadata_updated = metadata_stats.get("metadata_updated", 0)
        titles_cleaned = metadata_stats.get("titles_cleaned", 0)
        tmdb_searches = metadata_stats.get("tmdb_searches_performed", 0)

        if posters_fixed > 0:
            summary_lines.append(f"- 🖼️ Missing posters added: **{posters_fixed}**")
        if metadata_updated > 0:
            summary_lines.append(f"- 📝 Metadata updated (description, genres, year, IMDB): **{metadata_updated}**")
        if titles_cleaned > 0:
            summary_lines.append(f"- ✨ Titles cleaned (removed junk, extensions, quality markers): **{titles_cleaned}**")
        if tmdb_searches > 0:
            summary_lines.append(f"- 🔍 TMDB API searches performed: **{tmdb_searches}**")
        summary_lines.append("")

    # Categorization Statistics (if provided)
    categorization_stats = completion_summary.get("categorization_stats", {})
    if categorization_stats:
        items_recategorized = categorization_stats.get("items_recategorized", 0)
        if items_recategorized > 0:
            summary_lines.append("### 📁 **CATEGORIZATION IMPROVEMENTS:**")
            avg_confidence = categorization_stats.get("avg_confidence", 0)
            high_conf = categorization_stats.get("high_confidence_moves", 0)
            medium_conf = categorization_stats.get("medium_confidence_moves", 0)

            summary_lines.append(f"- Items recategorized: **{items_recategorized}**")
            summary_lines.append(f"- Average confidence score: **{avg_confidence:.1f}%**")
            summary_lines.append(f"  - High confidence (>95%): **{high_conf}**")
            summary_lines.append(f"  - Medium confidence (90-95%): **{medium_conf}**")
            summary_lines.append("")

    # Stream Validation Statistics (if provided)
    stream_stats = completion_summary.get("stream_validation_stats", {})
    if stream_stats:
        streams_checked = stream_stats.get("streams_checked", 0)
        if streams_checked > 0:
            summary_lines.append("### 📡 **STREAM VALIDATION:**")
            streams_healthy = stream_stats.get("streams_healthy", 0)
            streams_broken = stream_stats.get("streams_broken", 0)
            avg_response = stream_stats.get("avg_response_time_ms", 0)

            health_pct = (streams_healthy / streams_checked * 100) if streams_checked > 0 else 0
            summary_lines.append(f"- Streams checked: **{streams_checked}**")
            summary_lines.append(f"- ✅ Healthy streams: **{streams_healthy}** ({health_pct:.1f}%)")
            summary_lines.append(f"- ❌ Broken/inaccessible: **{streams_broken}**")
            if avg_response > 0:
                summary_lines.append(f"- Average response time: **{avg_response:.0f}ms**")
            summary_lines.append("")

    # Storage Statistics (if provided)
    storage_stats = completion_summary.get("storage_stats", {})
    if storage_stats:
        total_size = storage_stats.get("total_size_gb", 0)
        if total_size > 0:
            summary_lines.append("### 💾 **STORAGE ANALYSIS:**")
            file_count = storage_stats.get("file_count", 0)
            monthly_cost = storage_stats.get("estimated_monthly_cost_usd", 0)
            large_files = storage_stats.get("large_files_found", 0)

            summary_lines.append(f"- Total storage used: **{total_size:.2f} GB**")
            summary_lines.append(f"- Total files: **{file_count:,}**")
            if monthly_cost > 0:
                summary_lines.append(f"- Estimated monthly cost: **${monthly_cost:.2f}**")
            if large_files > 0:
                summary_lines.append(f"- ⚠️ Large files found (>5GB): **{large_files}**")
            summary_lines.append("")

    # Podcast Statistics (if provided)
    podcast_stats = completion_summary.get("podcast_stats", {})
    if podcast_stats:
        podcasts_synced = podcast_stats.get("podcasts_synced", 0)
        if podcasts_synced > 0:
            summary_lines.append("### 🎙️ **PODCAST MANAGEMENT:**")
            episodes_added = podcast_stats.get("episodes_added", 0)
            episodes_removed = podcast_stats.get("episodes_removed", 0)

            summary_lines.append(f"- Podcasts synced from RSS: **{podcasts_synced}**")
            summary_lines.append(f"- New episodes added: **{episodes_added}**")
            summary_lines.append(f"- Old episodes cleaned up: **{episodes_removed}**")
            summary_lines.append("")

    # Issue Breakdown (if provided)
    issue_breakdown = completion_summary.get("issue_breakdown", {})
    if issue_breakdown and any(v > 0 for v in issue_breakdown.values()):
        summary_lines.append("### 🔍 **ISSUES BY TYPE:**")
        issue_labels = {
            "missing_subtitles": "Missing Subtitles",
            "missing_metadata": "Missing Metadata",
            "missing_posters": "Missing Posters",
            "dirty_titles": "Dirty Titles",
            "broken_streams": "Broken Streams",
            "misclassifications": "Misclassifications",
            "quality_issues": "Quality Issues",
            "other": "Other"
        }
        for issue_type, count in sorted(issue_breakdown.items(), key=lambda x: x[1], reverse=True):
            if count > 0:
                label = issue_labels.get(issue_type, issue_type.replace("_", " ").title())
                summary_lines.append(f"- {label}: **{count}**")
        summary_lines.append("")

    # Action Breakdown (if provided)
    action_breakdown = completion_summary.get("action_breakdown", {})
    if action_breakdown and any(v > 0 for v in action_breakdown.values()):
        summary_lines.append("### ⚡ **ACTIONS TAKEN:**")
        action_labels = {
            "subtitle_extractions": "Subtitle Extractions",
            "subtitle_downloads": "Subtitle Downloads",
            "metadata_updates": "Metadata Updates",
            "poster_fixes": "Poster Fixes",
            "title_cleanups": "Title Cleanups",
            "recategorizations": "Recategorizations",
            "stream_validations": "Stream Validations",
            "manual_reviews_flagged": "Manual Reviews Flagged"
        }
        for action_type, count in sorted(action_breakdown.items(), key=lambda x: x[1], reverse=True):
            if count > 0:
                label = action_labels.get(action_type, action_type.replace("_", " ").title())
                summary_lines.append(f"- {label}: **{count}**")
        summary_lines.append("")

    # Performance Metrics
    summary_lines.append("### ⚙️ **PERFORMANCE METRICS:**")
    summary_lines.append(f"- Execution time: **{execution_time:.1f}s** ({execution_time/60:.1f} minutes)")
    summary_lines.append(f"- Agent iterations: **{iteration}**")
    summary_lines.append(f"- API cost: **${total_cost:.4f}**")
    items_per_minute = (total_items / (execution_time / 60)) if execution_time > 0 else 0
    summary_lines.append(f"- Processing speed: **{items_per_minute:.1f} items/minute**")
    summary_lines.append("")

    # Recommendations (if provided)
    recommendations = completion_summary.get("recommendations", [])
    if recommendations:
        summary_lines.append("### 💡 **STRATEGIC RECOMMENDATIONS:**")
        for i, rec in enumerate(recommendations, 1):
            summary_lines.append(f"{i}. {rec}")
        summary_lines.append("")

    # Agent Summary (narrative)
    agent_summary = completion_summary.get("summary", "")
    if agent_summary:
        summary_lines.append("### 📋 **AUDIT NARRATIVE:**")
        summary_lines.append(agent_summary)
        summary_lines.append("")

    # Completion Message
    summary_lines.append("---")
    summary_lines.append("✅ **Audit completed successfully!** All findings and actions have been logged.")

    # Join all lines and log to database
    full_summary = "\n".join(summary_lines)
    await log_to_database(
        audit_report,
        "info",
        full_summary,
        "AI Agent"
    )


# ============================================================================
# AI AGENT LOOP
# ============================================================================

async def run_ai_agent_audit(
    audit_type: str = "ai_agent",
    dry_run: bool = True,
    max_iterations: int = 50,
    budget_limit_usd: float = 1.0,
    language: str = "en",
    last_24_hours_only: bool = False,
    cyb_titles_only: bool = False,
    tmdb_posters_only: bool = False,
    opensubtitles_enabled: bool = False,
    classify_only: bool = False,
    audit_id: Optional[str] = None
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

    # Clear the content title cache for fresh lookups
    clear_title_cache()

    # Get or create audit report
    if audit_id:
        try:
            # Try to find by _id first (MongoDB ObjectId)
            try:
                object_id = PydanticObjectId(audit_id)
                audit_report = await AuditReport.get(object_id)
            except:
                # If not a valid ObjectId, search by audit_id field
                audit_report = await AuditReport.find_one({"audit_id": audit_id})
        except Exception as e:
            raise ValueError(f"Invalid audit_id format or not found: {e}")
        if not audit_report:
            raise ValueError(f"Audit report with id {audit_id} not found")
        logger.info(f"Using existing audit report: {audit_id}")
        # Ensure it has execution_logs field
        if not hasattr(audit_report, 'execution_logs') or audit_report.execution_logs is None:
            audit_report.execution_logs = []
    else:
        # Create new audit with legacy string ID format
        legacy_audit_id = f"ai-agent-{int(start_time.timestamp())}"
        audit_report = AuditReport(
            audit_id=legacy_audit_id,
            audit_date=start_time,
            audit_type=audit_type,
            status="in_progress",
            execution_logs=[]
        )
        await audit_report.insert()
        audit_id = str(audit_report.id)

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

**Strategy - SYSTEMATIC SUBTITLE ACQUISITION:**
1. **Get ALL Content IDs:** Use list_content_items to get complete list of all items
2. **Process in Batches:** Process 20-30 movies per batch_download_subtitles call
3. **Loop Until Done:** Continue calling batch_download_subtitles with next batch until ALL items processed
4. **Embedded First:** batch_download_subtitles automatically tries embedded subtitles before OpenSubtitles
5. **Track Progress:** After each batch, report how many items left to process

**Example Workflow:**
- Call list_content_items(limit=109) → Get all content IDs
- Split into batches of 20-30 IDs
- batch_download_subtitles(content_ids=batch1[20 IDs], languages=["he","en","es"])
- batch_download_subtitles(content_ids=batch2[20 IDs], languages=["he","en","es"])
- batch_download_subtitles(content_ids=batch3[20 IDs], languages=["he","en","es"])
- Continue until ALL items processed

**Daily Quota:** OpenSubtitles allows 1500 downloads/day. You can process ~150-200 movies (3 languages each).
**Budget:** You have 100 iterations and $5 budget - focus ONLY on subtitles! No other tasks.
""",
        "ai_agent": """
**AUDIT TYPE: Manual AI Agent Audit**

Your mission: Conduct a comprehensive audit based on current library needs.
Balance between metadata fixes, subtitle acquisition, and quality checks.
""",
    }
    
    # TASK-SPECIFIC PROMPTS: Override based on user selections
    # Priority: Specific task filters override audit_type
    
    if tmdb_posters_only:
        # TMDB POSTERS/METADATA ONLY MODE
        audit_specific_instruction = """**TASK: TMDB Posters & Metadata ONLY**

**Your ONLY mission:** Add/update TMDB posters and metadata for content items.

**What to do:**
1. Get ALL content items: `list_content_items(limit=100)`
2. For EACH item:
   - If title is dirty (.mp4, 1080p, [MX], etc) → `clean_title` FIRST
   - Search TMDB: `search_tmdb(title, year, content_type)`
   - Get poster: `fix_missing_poster(content_id, tmdb_id)`
   - Get metadata: `fix_missing_metadata(content_id, tmdb_id)`
3. Process ALL items systematically

**What NOT to do:**
- ❌ Skip subtitle checks entirely
- ❌ Skip category checks
- ❌ Skip stream URL validation
- ❌ Skip storage calculations

**Focus:** ONLY posters and metadata. Nothing else."""
        filter_instructions = ""
        
    elif cyb_titles_only:
        # TITLE CLEANING ONLY MODE
        audit_specific_instruction = """**TASK: Title Cleaning ONLY**

**Your ONLY mission:** Find and clean dirty titles (file artifacts, resolutions, codec names).

**What to do:**
1. Get ALL content items: `list_content_items(limit=100)`
2. Find items with dirty titles containing:
   - File extensions: .mp4, .mkv, .avi
   - Resolutions: 1080p, 720p, 4K, HD
   - Codec/Release: [MX], XviD, MDMA, BoK, [Hebrew]
   - Other junk: WEB-DL, BluRay, etc.
3. For each dirty title:
   - Clean it: `clean_title(content_id, current_title)`
   - Verify with TMDB: `search_tmdb(cleaned_title)`
4. Process ALL dirty titles

**What NOT to do:**
- ❌ Skip items with clean titles
- ❌ Don't check posters/metadata
- ❌ Don't check subtitles

**Focus:** ONLY title cleaning. Nothing else."""
        filter_instructions = ""
        
    elif classify_only:
        # CONTENT CLASSIFICATION/RECLASSIFICATION MODE
        audit_specific_instruction = """**TASK: Content Classification & Reclassification**

**Your ONLY mission:** Verify and fix content type classification (movies vs series).

**CRITICAL CLASSIFICATION RULES:**

**How to identify SERIES content:**
1. **Filename patterns indicating SERIES:**
   - Contains S01E01, S02E03, etc. (Season/Episode format)
   - Contains "1x01", "2x05" format
   - Contains ".S01.", ".S02." season indicators
   - Title ends with "Season 1", "Season 2", etc.
   - Part of known TV series (check TMDB type)

2. **TMDB Verification:**
   - Search TMDB with search_tmdb(title, year, content_type="tv")
   - If TMDB returns a TV show match → it's a SERIES
   - If TMDB returns a movie match → it's a MOVIE

**What to do:**
1. Get ALL content items: `list_content_items(limit=100, skip=0)`
2. For EACH item, check:
   a. Current `is_series` value
   b. Current `content_type` value ("movie" or "series")
   c. Title for S01E01, S02E03, etc. patterns
   d. TMDB to verify correct type
3. If classification is WRONG:
   - Use `reclassify_as_series(content_id)` for items that should be series
   - Use `reclassify_as_movie(content_id)` for items that should be movies
4. Continue with skip=100, skip=200, etc. until all items processed

**Classification Fixes to Make:**
- Movies incorrectly marked as `is_series=true` → Fix to movie
- Series incorrectly marked as `is_series=false` → Fix to series
- Items in wrong category (Movies vs Series) → Recategorize
- Missing `content_type` field → Set based on `is_series` value

**What NOT to do:**
- ❌ Don't check/fix posters or metadata
- ❌ Don't check/fix subtitles
- ❌ Don't clean titles (unless needed to verify classification)
- ❌ Don't check streaming URLs

**Expected Output:**
Report how many items:
- Were correctly classified
- Were reclassified from movie to series
- Were reclassified from series to movie
- Need manual review (uncertain classification)

**Focus:** ONLY content type classification. Nothing else."""
        filter_instructions = ""
        
    elif audit_type == "daily_maintenance" or opensubtitles_enabled:
        # SUBTITLES ONLY MODE (keep existing subtitle-focused prompt)
        audit_specific_instruction = audit_instructions.get("daily_maintenance")
        filter_instructions = ""
        if opensubtitles_enabled:
            audit_specific_instruction += "\n\n**🎬 OpenSubtitles API ENABLED:** You have access to 1500 downloads/day. Use batch_download_subtitles aggressively!\n"
            
    else:
        # COMPREHENSIVE MODE (default)
        audit_specific_instruction = audit_instructions.get(audit_type, audit_instructions["ai_agent"])
        filter_instructions = ""
        if last_24_hours_only:
            filter_instructions += "\n**⏰ TIME FILTER:** Focus ONLY on content added/modified in the last 24 hours\n"
    
    # Determine if this is a task-specific audit or comprehensive audit
    is_task_specific = tmdb_posters_only or cyb_titles_only or classify_only or (audit_type == "daily_maintenance")
    
    # Initial prompt for Claude (in English as instructions, Claude responds in requested language)
    if is_task_specific:
        # TASK-SPECIFIC MODE: Minimal, focused instructions
        initial_prompt = f"""You are an autonomous AI Librarian for Bayit+, an Israeli streaming platform.

{language_instruction}

{audit_specific_instruction}

**Processing Strategy:**
1. Get ALL content items: `list_content_items(limit=100, skip=0)`
2. If `has_more: true`, continue with skip=100, skip=200, etc.
3. Process EVERY item systematically
4. Report progress regularly
5. Complete ALL items before finishing

**Available Tools:** Use ONLY the tools needed for this specific task. Ignore irrelevant tools.

**Rules:**
- Stay focused on the assigned task
- Don't check or fix things outside your task scope
- Process systematically through ALL items
- Track comprehensive statistics as you work
- When calling complete_audit, provide detailed breakdown statistics (subtitle_stats, metadata_stats, issue_breakdown, action_breakdown, health_score, etc.)
- Report final comprehensive summary when done
"""
    else:
        # COMPREHENSIVE MODE: Full workflow instructions
        initial_prompt = f"""You are an autonomous AI Librarian for Bayit+, an Israeli streaming platform.

{language_instruction}

{audit_specific_instruction}
{filter_instructions}
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
11. **ELEVENTH:** For batch operations, use batch_download_subtitles with 20-30 content IDs at a time
12. **TWELFTH:** Manage podcasts - sync latest episodes and keep only 3 most recent → Use manage_podcast_episodes
13. **THIRTEENTH:** Check for other issues (categorization, broken URLs)

**What You Must Do:**
1. **BATCH PROCESSING STRATEGY:** Process ALL items in the library systematically
   - Call list_content_items with limit=100, skip=0 to get first batch
   - Process those 100 items
   - If response has "has_more": true, call list_content_items with skip=100
   - Continue incrementing skip by 100 until has_more is false
   - This ensures comprehensive coverage of the entire library

2. **SUBTITLE BATCH PROCESSING:** When using batch_download_subtitles:
   - Get ALL content IDs upfront (use list_content_items)
   - Process 20-30 movies per batch (not 2-5!)
   - Loop until ALL items are processed or quota exhausted
   - Don't stop after first batch - continue systematically
   - OpenSubtitles quota: 1500 downloads/day = ~150-200 movies (3 languages each)

3. **MANDATORY - Check each item for (IN THIS ORDER):**
   - 🔥 **HIGHEST PRIORITY:** Missing thumbnail/poster image
   - 🔥 **HIGHEST PRIORITY:** Missing metadata (description, genre, imdb_id, tmdb_id, cast, director)
   - 🔥 **HIGHEST PRIORITY:** Missing required subtitles (English, Hebrew, Spanish)
   - 🎙️ **PODCAST MANAGEMENT:** Ensure podcasts have latest episodes (max 3 per podcast)
   - ✅ Dirty titles (must clean BEFORE fixing poster/metadata!)
   - ✅ Missing backdrop (wide background image)
   - ✅ Embedded subtitles not extracted from MKV files
   - ✅ Incorrect categorization
   - ✅ Broken streaming URLs
4. **IMPORTANT - Logging:** Always document what you're checking and what you found
5. **CRITICAL:** Always clean titles BEFORE trying to fix posters/metadata (TMDB needs clean titles to search!)
6. Fix issues you're confident about (>90% confidence for recategorization, 100% for poster/metadata)
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
- list_content_items - Get list of items in batches (default 100, max 1000). Returns total, has_more, skip for pagination. Process all items by incrementing skip.
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

**Available Tools - Podcast Management:**
- manage_podcast_episodes - 🎙️ Sync latest podcast episodes from RSS feeds and keep only 3 most recent per podcast

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

**Batch Processing Example:**
```
Step 1: list_content_items(limit=100, skip=0)
        → Returns: {{"count": 100, "total": 450, "has_more": true}}
        → Process these 100 items
        
Step 2: list_content_items(limit=100, skip=100)
        → Returns: {{"count": 100, "total": 450, "has_more": true}}
        → Process these 100 items
        
Step 3: list_content_items(limit=100, skip=200)
        → Returns: {{"count": 100, "total": 450, "has_more": true}}
        → Process these 100 items
        
Step 4: list_content_items(limit=100, skip=300)
        → Returns: {{"count": 100, "total": 450, "has_more": true}}
        → Process these 100 items
        
Step 5: list_content_items(limit=100, skip=400)
        → Returns: {{"count": 50, "total": 450, "has_more": false}}
        → Process final 50 items
        → All 450 items covered!
```

**Mode:** {'DRY RUN - You cannot actually change data, only report what you would do' if dry_run else 'LIVE - You can make real changes'}

**Limits:**
- Maximum {max_iterations} tool uses
- API Budget: ${budget_limit_usd}

**📊 COMPREHENSIVE SUMMARY REQUIREMENTS:**

When you call `complete_audit`, you MUST provide a comprehensive breakdown of ALL your work:

**Required Statistics to Track Throughout Audit:**

1. **Subtitle Statistics:**
   - Count items with all required subtitles (he, en, es)
   - Count items still missing subtitles
   - Count subtitles extracted from video files
   - Count subtitles downloaded from external sources
   - Breakdown by language (he: X, en: Y, es: Z)
   - OpenSubtitles quota used and remaining

2. **Metadata Statistics:**
   - Count posters fixed
   - Count metadata updated (description, genres, year, IMDB)
   - Count titles cleaned
   - Count TMDB API searches performed

3. **Categorization Statistics:**
   - Count items recategorized
   - Average confidence score
   - High confidence moves (>95%)
   - Medium confidence moves (90-95%)

4. **Stream Validation Statistics:**
   - Count streams checked
   - Count healthy streams
   - Count broken streams
   - Average response time in ms

5. **Storage Statistics (if you checked):**
   - Total size in GB
   - File count
   - Estimated monthly cost
   - Large files found (>5GB)

6. **Podcast Statistics (if applicable):**
   - Podcasts synced
   - Episodes added
   - Episodes removed

7. **Issue Breakdown by Type:**
   - Missing subtitles: X
   - Missing metadata: Y
   - Missing posters: Z
   - Dirty titles: A
   - Broken streams: B
   - Misclassifications: C
   - Quality issues: D
   - Other: E

8. **Action Breakdown:**
   - Subtitle extractions: X
   - Subtitle downloads: Y
   - Metadata updates: Z
   - Poster fixes: A
   - Title cleanups: B
   - Recategorizations: C
   - Stream validations: D
   - Manual reviews flagged: E

9. **Health Score (0-100):**
   Calculate overall library health based on completeness and quality

**Example complete_audit Call:**
```
complete_audit(
  summary="Comprehensive 3-paragraph narrative of what you did",
  items_checked=109,
  issues_found=45,
  issues_fixed=38,
  flagged_for_review=7,
  recommendations=["Recommendation 1", "Recommendation 2", "Recommendation 3"],
  subtitle_stats={{
    "items_with_all_required": 85,
    "items_missing_subtitles": 24,
    "subtitles_extracted_from_video": 127,
    "subtitles_downloaded_external": 45,
    "by_language": {{"he": 95, "en": 102, "es": 89}},
    "opensubtitles_quota_used": 15,
    "opensubtitles_quota_remaining": 5
  }},
  metadata_stats={{
    "posters_fixed": 12,
    "metadata_updated": 18,
    "titles_cleaned": 8,
    "tmdb_searches_performed": 30
  }},
  issue_breakdown={{
    "missing_subtitles": 24,
    "missing_metadata": 18,
    "missing_posters": 12,
    "dirty_titles": 8,
    "broken_streams": 3,
    "misclassifications": 2,
    "quality_issues": 1,
    "other": 0
  }},
  action_breakdown={{
    "subtitle_extractions": 127,
    "subtitle_downloads": 45,
    "metadata_updates": 18,
    "poster_fixes": 12,
    "title_cleanups": 8,
    "recategorizations": 2,
    "stream_validations": 15,
    "manual_reviews_flagged": 7
  }},
  health_score=85
)
```

**Track these metrics as you work!** Keep running counts and provide accurate statistics in your final summary.

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

        # Check for cancellation/pause at each iteration
        if audit_id:
            await audit_task_manager.check_should_continue(audit_id)

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

                    # Extract item name from tool input if available
                    item_name = None
                    content_id = None
                    
                    # Try to extract from common parameter names
                    if isinstance(tool_input, dict):
                        # Look for title in various formats
                        item_name = (
                            tool_input.get("title") or 
                            tool_input.get("content_title") or
                            tool_input.get("name") or
                            tool_input.get("item_title")
                        )
                        content_id = (
                            tool_input.get("content_id") or
                            tool_input.get("id") or
                            tool_input.get("item_id")
                        )

                    # Log tool use START to database with structured data
                    await log_to_database(
                        audit_report,
                        "info",
                        f"🔧 TOOL START: {tool_name}",
                        "AI Agent",
                        item_name=item_name,
                        content_id=content_id,
                        metadata={"tool_input": tool_input}
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

                    # Extract item info from result if not already set
                    if not item_name and isinstance(result, dict):
                        item_name = (
                            result.get("title") or 
                            result.get("content_title") or
                            result.get("name") or
                            result.get("item_title")
                        )
                    if not content_id and isinstance(result, dict):
                        content_id = (
                            result.get("content_id") or
                            result.get("id") or
                            result.get("item_id")
                        )

                    # Log tool result to database with structured data
                    if result.get("success") is False:
                        error_msg = result.get("error", "Unknown error")
                        await log_to_database(
                            audit_report,
                            "error",
                            f"❌ TOOL FAILED: {tool_name} - {error_msg}",
                            "AI Agent",
                            item_name=item_name,
                            content_id=content_id,
                            metadata={"tool_result": result}
                        )
                        logger.error(f"   ❌ Tool failed: {error_msg}")
                    elif result.get("success") is True:
                        # Log successful tool executions with structured data
                        success_msg = result.get("message", "Success")
                        await log_to_database(
                            audit_report,
                            "success",
                            f"✅ TOOL SUCCESS: {tool_name} - {success_msg}",
                            "AI Agent",
                            item_name=item_name,
                            content_id=content_id,
                            metadata={"tool_result": result}
                        )
                        logger.info(f"   ✅ Tool succeeded: {success_msg}")
                    else:
                        # Tool returned data without explicit success/failure flag
                        await log_to_database(
                            audit_report,
                            "info",
                            f"📊 TOOL RESULT: {tool_name}",
                            "AI Agent",
                            item_name=item_name,
                            content_id=content_id,
                            metadata={"tool_result": result}
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
            "recommendations": completion_summary.get("recommendations", []),
            # Enhanced comprehensive statistics
            "subtitle_stats": completion_summary.get("subtitle_stats", {}),
            "metadata_stats": completion_summary.get("metadata_stats", {}),
            "categorization_stats": completion_summary.get("categorization_stats", {}),
            "stream_validation_stats": completion_summary.get("stream_validation_stats", {}),
            "storage_stats": completion_summary.get("storage_stats", {}),
            "podcast_stats": completion_summary.get("podcast_stats", {}),
            "issue_breakdown": completion_summary.get("issue_breakdown", {}),
            "action_breakdown": completion_summary.get("action_breakdown", {}),
            "health_score": completion_summary.get("health_score", 0)
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

    # Log comprehensive summary to execution logs for UI
    if completion_summary:
        await _log_comprehensive_summary(audit_report, completion_summary, execution_time, iteration, total_cost)
    else:
        # Final log for incomplete audits
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
