"""
AI Agent Tool Definitions

Claude tool use definitions for the autonomous AI agent.
These define the tools available to the agent for library management.
"""

# Tool definitions for Claude's tool use API
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


def get_language_name(code: str) -> str:
    """Get human-readable language name from code."""
    lang_map = {
        "he": "Hebrew",
        "en": "English",
        "es": "Spanish",
        "ar": "Arabic",
        "ru": "Russian",
        "fr": "French"
    }
    return lang_map.get(code, code.upper())
