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
from datetime import datetime
from typing import List, Dict, Any, Optional
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
                "audit_id": {
                    "type": "string",
                    "description": "The current audit ID for tracking"
                },
                "reason": {
                    "type": "string",
                    "description": "Brief explanation of why you're fixing this"
                }
            },
            "required": ["content_id", "audit_id", "reason"]
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
                "audit_id": {
                    "type": "string",
                    "description": "The current audit ID for tracking"
                },
                "reason": {
                    "type": "string",
                    "description": "Brief explanation of what metadata is missing and why you're fixing it"
                }
            },
            "required": ["content_id", "audit_id", "reason"]
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
                "audit_id": {
                    "type": "string",
                    "description": "The current audit ID for tracking"
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
            "required": ["content_id", "new_category_id", "audit_id", "reason", "confidence"]
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
                    "description": "GCS bucket name to check (default: bayit-plus-media)",
                    "default": "bayit-plus-media"
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
                    "description": "GCS bucket name to check (default: bayit-plus-media)",
                    "default": "bayit-plus-media"
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
                    "description": "GCS bucket name to analyze (default: bayit-plus-media)",
                    "default": "bayit-plus-media"
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
            # MongoDB aggregation for random sample
            pipeline = [
                {"$match": query},
                {"$sample": {"size": limit}}
            ]
            items = await Content.aggregate(pipeline).to_list()
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
                "description_en": content.description_en,
                "category_id": str(content.category_id) if content.category_id else None,
                "content_type": content.content_type,
                "poster_url": content.poster_url,
                "backdrop_url": content.backdrop_url,
                "stream_url": content.stream_url,
                "trailer_url": content.trailer_url,
                "imdb_id": content.imdb_id,
                "imdb_rating": content.imdb_rating,
                "tmdb_id": content.tmdb_id,
                "release_year": content.release_year,
                "duration_minutes": content.duration_minutes,
                "genres": content.genres,
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
                    "content_type": cat.content_type,
                    "order": cat.order
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
        # Import TMDB service
        from app.services.tmdb_service import search_content, get_movie_details, get_tv_details

        # Search for the content
        search_results = await search_content(title, content_type, year)

        if not search_results:
            return {
                "success": True,
                "found": False,
                "message": f"No results found for '{title}'"
            }

        # Get details for the first result
        tmdb_id = search_results[0].get("id")
        if content_type == "movie":
            details = await get_movie_details(tmdb_id)
        else:
            details = await get_tv_details(tmdb_id)

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
        if dry_run:
            return {
                "success": True,
                "dry_run": True,
                "message": f"[DRY RUN] Would fix missing poster for content {content_id}. Reason: {reason}"
            }

        # Use auto_fixer service (which uses TMDB internally)
        result = await auto_fix_metadata(content_id, ["missing_poster"], audit_id)

        if result.success:
            return {
                "success": True,
                "fixed": True,
                "message": "Added poster from TMDB",
                "fields_updated": result.fields_updated or []
            }
        else:
            return {
                "success": False,
                "error": result.error or "Could not find poster on TMDB"
            }

    except Exception as e:
        logger.error(f"Error in fix_missing_poster: {str(e)}")
        return {"success": False, "error": str(e)}


async def execute_fix_missing_metadata(
    content_id: str,
    audit_id: str,
    reason: str,
    dry_run: bool = False
) -> Dict[str, Any]:
    """Fix missing metadata for a content item."""
    try:
        if dry_run:
            return {
                "success": True,
                "dry_run": True,
                "message": f"[DRY RUN] Would fix missing metadata for content {content_id}. Reason: {reason}"
            }

        # Use auto_fixer service
        result = await auto_fix_metadata(content_id, ["missing_description", "missing_imdb", "missing_poster"], audit_id)

        if result.success:
            return {
                "success": True,
                "fixed": True,
                "message": "Updated metadata from TMDB",
                "fields_updated": result.fields_updated or []
            }
        else:
            return {
                "success": False,
                "error": result.error or "Failed to update metadata"
            }

    except Exception as e:
        logger.error(f"Error in fix_missing_metadata: {str(e)}")
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
        # Require high confidence
        if confidence < 90:
            return {
                "success": False,
                "error": f"Confidence too low ({confidence}%). Requires 90%+ for auto-recategorization. Use flag_for_manual_review instead."
            }

        if dry_run:
            return {
                "success": True,
                "dry_run": True,
                "message": f"[DRY RUN] Would recategorize content {content_id} to category {new_category_id} (confidence: {confidence}%). Reason: {reason}"
            }

        # Get content and verify category exists
        content = await Content.get(content_id)
        new_category = await Category.get(new_category_id)

        if not content:
            return {"success": False, "error": "Content not found"}
        if not new_category:
            return {"success": False, "error": "Category not found"}

        # Use auto_fixer service
        old_category_id = str(content.category_id) if content.category_id else None
        result = await fix_misclassification(content_id, new_category_id, confidence / 100.0, audit_id)

        if result.success:
            return {
                "success": True,
                "recategorized": True,
                "message": f"Moved from category {old_category_id} to {new_category_id}",
                "old_category": old_category_id,
                "new_category": new_category_id
            }
        else:
            return {
                "success": False,
                "error": result.error or "Failed to recategorize"
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


async def execute_check_storage_usage(
    bucket_name: str = "bayit-plus-media"
) -> Dict[str, Any]:
    """Check GCS bucket storage usage statistics."""
    try:
        from google.cloud import storage

        client = storage.Client()
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
    bucket_name: str = "bayit-plus-media",
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
    bucket_name: str = "bayit-plus-media",
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

        elif tool_name == "check_storage_usage":
            return await execute_check_storage_usage(**tool_input)

        elif tool_name == "list_large_files":
            return await execute_list_large_files(**tool_input)

        elif tool_name == "calculate_storage_costs":
            return await execute_calculate_storage_costs(**tool_input)

        elif tool_name == "send_email_notification":
            return await execute_send_email_notification(**tool_input)

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
    budget_limit_usd: float = 1.0
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
    """

    start_time = datetime.utcnow()
    audit_id = f"ai-agent-{int(start_time.timestamp())}"

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

    # Initial prompt for Claude
    initial_prompt = f"""אתה ספרן AI אוטונומי למערכת Bayit+, פלטפורמת סטרימינג ישראלית.

**המשימה שלך:** בצע ביקורת מקיפה של ספריית התוכן והתקן בעיות באופן אוטונומי.

**מה עליך לעשות:**
1. בחר אילו פריטי תוכן לבדוק (השתמש בשיקול דעת - לא צריך לבדוק הכל)
2. בדוק כל פריט עבור בעיות: מטאדאטה חסרה, פוסטרים חסרים, קישורי סטרימינג שבורים, סיווג לא נכון
3. **חדש:** בדוק שימוש באחסון - קבצים גדולים >5GB, שימוש כולל, עלויות
4. תקן בעיות שאתה בטוח בהן (>90% ביטחון)
5. סמן פריטים לבדיקה ידנית כשאתה לא בטוח
6. **חשוב:** אם אתה מוצא בעיות חמורות או קריטיות - שלח התראת אימייל למנהלים באמצעות send_email_notification
7. התאם את האסטרטגיה שלך בהתבסס על מה שאתה מוצא
8. בסוף, קרא ל-complete_audit עם סיכום מקיף

**כלים זמינים - ניהול תוכן:**
- list_content_items - קבל רשימת פריטים לביקורת
- get_content_details - בדוק פרטים על פריט ספציפי
- get_categories - ראה את כל הקטגוריות
- check_stream_url - בדוק אם URL עובד
- search_tmdb - חפש מטאדאטה ב-TMDB
- fix_missing_poster - הוסף פוסטר חסר
- fix_missing_metadata - עדכן מטאדאטה
- recategorize_content - העבר פריט לקטגוריה אחרת (רק אם בטוח >90%)
- flag_for_manual_review - סמן לבדיקה ידנית

**כלים זמינים - ניטור אחסון (חדש!):**
- check_storage_usage - 📊 בדוק שימוש באחסון (גודל כולל, מספר קבצים, פילוח לפי סוג)
- list_large_files - 🔍 מצא קבצים גדולים מ-5GB
- calculate_storage_costs - 💰 חשב עלויות אחסון חודשיות

**כלים זמינים - התראות:**
- send_email_notification - 📧 שלח התראת אימייל למנהלים (רק לבעיות חמורות!)
- complete_audit - סיים את הביקורת

**מתי לשלוח אימייל?**
שלח התראת אימייל רק אם מצאת אחת מאלה:
- 🚨 קישורי סטרימינג שבורים (>5 פריטים)
- 🚨 סיווג לא נכון בקנה מידה רחב (>10 פריטים)
- 🚨 מטאדאטה חסרה או שגויה בהיקף רחב (>20 פריטים)
- 🚨 קבצים גדולים מאוד (>5GB) או שימוש גבוה באחסון (>500GB)
- 🚨 עלויות אחסון גבוהות (>$100/חודש)
- 🚨 בעיות איכות קריטיות שמשפיעות על חוויית משתמש
- 🚨 כל בעיה אחרת שדורשת תשומת לב מיידית

אל תשלח אימייל עבור:
- ✅ בעיות קטנות שתיקנת
- ✅ ביקורות רוטיניות בלי בעיות משמעותיות
- ✅ בעיות בודדות שסומנו לבדיקה ידנית

**מצב:** {'DRY RUN - אתה לא יכול לשנות נתונים באמת, רק לדווח מה היית עושה' if dry_run else 'LIVE - אתה יכול לבצע שינויים אמיתיים'}

**מגבלות:**
- מקסימום {max_iterations} שימושי כלים
- תקציב API: ${budget_limit_usd}

התחל את הביקורת!"""

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
                    logger.info(f"💭 Claude: {block.text[:200]}...")

                elif isinstance(block, ToolUseBlock):
                    tool_name = block.name
                    tool_input = block.input

                    logger.info(f"🔧 Claude wants to use: {tool_name}")
                    logger.info(f"   Input: {json.dumps(tool_input, ensure_ascii=False)[:200]}")

                    # Check for completion
                    if tool_name == "complete_audit":
                        audit_complete = True
                        completion_summary = tool_input
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": json.dumps({"success": True, "message": "Audit completed successfully!"})
                        })
                        break

                    # Execute tool
                    result = await execute_tool(tool_name, tool_input, audit_id, dry_run)

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

    # Create audit report
    end_time = datetime.utcnow()
    execution_time = (end_time - start_time).total_seconds()

    # Extract summary from completion if available
    if completion_summary:
        summary = {
            "total_items": completion_summary.get("items_checked", 0),
            "issues_found": completion_summary.get("issues_found", 0),
            "issues_fixed": completion_summary.get("issues_fixed", 0),
            "manual_review_needed": completion_summary.get("flagged_for_review", 0),
            "agent_summary": completion_summary.get("summary", ""),
            "recommendations": completion_summary.get("recommendations", [])
        }
    else:
        summary = {
            "total_items": 0,
            "issues_found": 0,
            "issues_fixed": 0,
            "manual_review_needed": 0,
            "agent_summary": "Audit incomplete - reached iteration or budget limit"
        }

    # Create report
    report = AuditReport(
        audit_id=audit_id,
        audit_date=start_time,
        audit_type=audit_type,
        execution_time_seconds=execution_time,
        status="completed" if audit_complete else "partial",
        summary=summary,
        content_results={
            "agent_mode": True,
            "iterations": iteration,
            "tool_uses": len(tool_uses),
            "total_cost_usd": round(total_cost, 4)
        },
        live_channel_results={},
        podcast_results={},
        radio_results={},
        broken_streams=[],
        missing_metadata=[],
        misclassifications=[],
        orphaned_items=[],
        fixes_applied=[],
        manual_review_needed=[],
        database_health={},
        ai_insights=completion_summary.get("recommendations", []) if completion_summary else [],
        completed_at=end_time
    )

    await report.insert()

    logger.info("=" * 80)
    logger.info("✅ AI Agent Audit Complete")
    logger.info(f"   Iterations: {iteration}")
    logger.info(f"   Tool uses: {len(tool_uses)}")
    logger.info(f"   Total cost: ${total_cost:.4f}")
    logger.info(f"   Execution time: {execution_time:.2f}s")
    logger.info(f"   Status: {report.status}")
    logger.info("=" * 80)

    return report
