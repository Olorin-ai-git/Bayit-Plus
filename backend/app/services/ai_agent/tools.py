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
        "name": "reclassify_as_series",
        "description": "Reclassify a content item from movie to TV series. Use this when you detect series indicators in the title (S01E01, S02E03, 'Season 1', etc.) or when TMDB confirms the content is a TV show. This changes the content_type field and moves the item to the Series category.",
        "input_schema": {
            "type": "object",
            "properties": {
                "content_id": {
                    "type": "string",
                    "description": "The ID of the content item to reclassify"
                },
                "reason": {
                    "type": "string",
                    "description": "Explanation of why this should be classified as a series (e.g., 'Title contains S01E05 episode marker', 'TMDB confirms this is a TV series')"
                }
            },
            "required": ["content_id", "reason"]
        }
    },
    {
        "name": "reclassify_as_movie",
        "description": "Reclassify a content item from series to movie. Use this when a content item is incorrectly marked as a series but is actually a standalone movie. This changes the content_type field and moves the item to the Movies category.",
        "input_schema": {
            "type": "object",
            "properties": {
                "content_id": {
                    "type": "string",
                    "description": "The ID of the content item to reclassify"
                },
                "reason": {
                    "type": "string",
                    "description": "Explanation of why this should be classified as a movie (e.g., 'TMDB confirms this is a standalone film', 'No episode/season indicators found')"
                }
            },
            "required": ["content_id", "reason"]
        }
    },
    {
        "name": "flag_for_manual_review",
        "description": "Flag a content item for manual human review. Use this when you find an issue but aren't confident about the fix, or when the issue requires human judgment. NOTE: Do NOT use this for broken streams - use delete_broken_content instead.",
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
                    "enum": ["missing_metadata", "misclassification", "duplicate", "quality_issue", "other"]
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
        "name": "delete_broken_content",
        "description": "Delete a content item that has a broken or inaccessible stream URL. Use this when check_stream_url confirms the stream is broken/inaccessible. This permanently removes the content from the database and its associated GCS files. IMPORTANT: Only use after confirming stream is broken with check_stream_url.",
        "input_schema": {
            "type": "object",
            "properties": {
                "content_id": {
                    "type": "string",
                    "description": "The ID of the content item to delete"
                },
                "reason": {
                    "type": "string",
                    "description": "Reason for deletion (e.g., 'Stream URL returned 404', 'File not found in GCS')"
                },
                "stream_check_result": {
                    "type": "string",
                    "description": "The result from check_stream_url that confirms the stream is broken"
                }
            },
            "required": ["content_id", "reason"]
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
            "required": ["content_id", "cleaned_title", "reason"]
        }
    },
    {
        "name": "scan_video_subtitles",
        "description": "Analyze a video file (MKV/MP4) to detect embedded subtitle tracks and AUTOMATICALLY extract and save them to the database. Returns list of available subtitle languages and extraction results. This is a one-step process - no need to call extract_video_subtitles separately.",
        "input_schema": {
            "type": "object",
            "properties": {
                "content_id": {
                    "type": "string",
                    "description": "The ID of the content item to scan and extract subtitles from"
                },
                "auto_extract": {
                    "type": "boolean",
                    "description": "Whether to automatically extract and save found subtitles (default: true)"
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
                "languages": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Optional: Specific languages to extract (e.g., ['en', 'he']). If not provided, extracts all."
                }
            },
            "required": ["content_id"]
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
                }
            },
            "required": ["content_id", "language"]
        }
    },
    {
        "name": "batch_download_subtitles",
        "description": "Download subtitles for multiple content items in one batch operation. Automatically manages daily quotas (1500 downloads/day) and prioritizes content by recency and missing languages. IMPORTANT: OpenSubtitles is limited to 3 languages maximum per request, prioritized: Hebrew (he), English (en), Spanish (es). Use this for large-scale subtitle acquisition.",
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
                    "description": "Languages to fetch. Maximum 3 languages allowed. Priority: Hebrew (he), English (en), Spanish (es). Default: ['he', 'en', 'es']",
                    "default": ["he", "en", "es"]
                },
                "max_downloads": {
                    "type": "integer",
                    "description": "Maximum downloads to perform (respects daily quota)",
                    "default": 20
                }
            },
            "required": ["content_ids"]
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
        "name": "manage_podcast_episodes",
        "description": "Manage podcast episodes: sync latest episodes from RSS feeds and ensure only the 3 most recent episodes are kept per podcast. This tool will fetch the latest episode from RSS, delete old episodes if there are more than 3, and verify we have the latest. Use this regularly to maintain podcast freshness and prevent database bloat.",
        "input_schema": {
            "type": "object",
            "properties": {
                "podcast_id": {
                    "type": "string",
                    "description": "Optional: Specific podcast ID to manage. If not provided, manages all podcasts."
                },
                "max_episodes_to_keep": {
                    "type": "integer",
                    "description": "Maximum number of episodes to keep per podcast (default: 3)",
                    "default": 3
                }
            },
            "required": []
        }
    },
    {
        "name": "complete_audit",
        "description": "Call this when you've finished the audit and are ready to provide a final summary. This will end the audit session. Provide comprehensive breakdown statistics for all aspects of the audit.",
        "input_schema": {
            "type": "object",
            "properties": {
                "summary": {
                    "type": "string",
                    "description": "Overall summary of the audit: what you checked, what you found, what you fixed (2-3 paragraphs)"
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
                },
                "subtitle_stats": {
                    "type": "object",
                    "description": "Comprehensive subtitle statistics",
                    "properties": {
                        "items_with_all_required": {"type": "integer", "description": "Items with all required subtitles (he, en, es)"},
                        "items_missing_subtitles": {"type": "integer", "description": "Items still missing one or more required subtitles"},
                        "subtitles_extracted_from_video": {"type": "integer", "description": "Subtitle tracks extracted from embedded video"},
                        "subtitles_downloaded_external": {"type": "integer", "description": "Subtitle tracks downloaded from OpenSubtitles/TMDB"},
                        "by_language": {
                            "type": "object",
                            "description": "Breakdown by language (he, en, es, etc.)",
                            "additionalProperties": {"type": "integer"}
                        },
                        "opensubtitles_quota_used": {"type": "integer", "description": "Number of OpenSubtitles downloads used"},
                        "opensubtitles_quota_remaining": {"type": "integer", "description": "Remaining OpenSubtitles quota"}
                    }
                },
                "metadata_stats": {
                    "type": "object",
                    "description": "Metadata fix statistics",
                    "properties": {
                        "posters_fixed": {"type": "integer", "description": "Missing posters added"},
                        "metadata_updated": {"type": "integer", "description": "Items with missing metadata filled (description, genres, year, IMDB)"},
                        "titles_cleaned": {"type": "integer", "description": "Titles cleaned (removed file extensions, quality markers, junk)"},
                        "tmdb_searches_performed": {"type": "integer", "description": "Number of TMDB API searches"}
                    }
                },
                "categorization_stats": {
                    "type": "object",
                    "description": "Categorization statistics",
                    "properties": {
                        "items_recategorized": {"type": "integer", "description": "Items moved to different categories"},
                        "avg_confidence": {"type": "number", "description": "Average confidence score for recategorizations"},
                        "high_confidence_moves": {"type": "integer", "description": "Recategorizations with >95% confidence"},
                        "medium_confidence_moves": {"type": "integer", "description": "Recategorizations with 90-95% confidence"}
                    }
                },
                "stream_validation_stats": {
                    "type": "object",
                    "description": "Stream URL validation statistics",
                    "properties": {
                        "streams_checked": {"type": "integer", "description": "Total stream URLs validated"},
                        "streams_healthy": {"type": "integer", "description": "Working stream URLs"},
                        "streams_broken": {"type": "integer", "description": "Broken or inaccessible streams"},
                        "avg_response_time_ms": {"type": "number", "description": "Average stream response time"}
                    }
                },
                "storage_stats": {
                    "type": "object",
                    "description": "Storage statistics (if checked)",
                    "properties": {
                        "total_size_gb": {"type": "number", "description": "Total storage used in GB"},
                        "file_count": {"type": "integer", "description": "Total number of files"},
                        "estimated_monthly_cost_usd": {"type": "number", "description": "Estimated monthly GCS cost"},
                        "large_files_found": {"type": "integer", "description": "Number of unusually large files (>5GB)"}
                    }
                },
                "podcast_stats": {
                    "type": "object",
                    "description": "Podcast management statistics (if applicable)",
                    "properties": {
                        "podcasts_synced": {"type": "integer", "description": "Podcasts synced from RSS"},
                        "episodes_added": {"type": "integer", "description": "New episodes added"},
                        "episodes_removed": {"type": "integer", "description": "Old episodes cleaned up"}
                    }
                },
                "issue_breakdown": {
                    "type": "object",
                    "description": "Breakdown of issues by type",
                    "properties": {
                        "missing_subtitles": {"type": "integer"},
                        "missing_metadata": {"type": "integer"},
                        "missing_posters": {"type": "integer"},
                        "dirty_titles": {"type": "integer"},
                        "broken_streams": {"type": "integer"},
                        "misclassifications": {"type": "integer"},
                        "quality_issues": {"type": "integer"},
                        "other": {"type": "integer"}
                    }
                },
                "action_breakdown": {
                    "type": "object",
                    "description": "Breakdown of actions taken",
                    "properties": {
                        "subtitle_extractions": {"type": "integer"},
                        "subtitle_downloads": {"type": "integer"},
                        "metadata_updates": {"type": "integer"},
                        "poster_fixes": {"type": "integer"},
                        "title_cleanups": {"type": "integer"},
                        "recategorizations": {"type": "integer"},
                        "stream_validations": {"type": "integer"},
                        "manual_reviews_flagged": {"type": "integer"}
                    }
                },
                "health_score": {
                    "type": "number",
                    "description": "Overall library health score (0-100) based on completeness and quality"
                }
            },
            "required": ["summary", "items_checked", "issues_found", "issues_fixed"]
        }
    },
    # Series Linking Tools
    {
        "name": "find_unlinked_episodes",
        "description": "Find episodes that have season/episode numbers but are not linked to any parent series. Use this to discover episodes that need to be connected to their series for proper organization.",
        "input_schema": {
            "type": "object",
            "properties": {
                "limit": {
                    "type": "integer",
                    "description": "Maximum number of unlinked episodes to return (default 100)",
                    "default": 100
                }
            },
            "required": []
        }
    },
    {
        "name": "link_episode_to_series",
        "description": "Link an episode to its parent series. Use this when you've confirmed which series an episode belongs to.",
        "input_schema": {
            "type": "object",
            "properties": {
                "episode_id": {
                    "type": "string",
                    "description": "The ID of the episode content item"
                },
                "series_id": {
                    "type": "string",
                    "description": "The ID of the parent series"
                },
                "season": {
                    "type": "integer",
                    "description": "Season number (optional, uses existing value if not provided)"
                },
                "episode": {
                    "type": "integer",
                    "description": "Episode number (optional, uses existing value if not provided)"
                },
                "reason": {
                    "type": "string",
                    "description": "Brief explanation of why you're linking this episode"
                }
            },
            "required": ["episode_id", "series_id", "reason"]
        }
    },
    {
        "name": "auto_link_episodes",
        "description": "Automatically link unlinked episodes to their parent series using title pattern matching and TMDB lookup. Uses high confidence threshold (90%) to avoid incorrect links.",
        "input_schema": {
            "type": "object",
            "properties": {
                "limit": {
                    "type": "integer",
                    "description": "Maximum number of episodes to process (default 50)",
                    "default": 50
                },
                "confidence_threshold": {
                    "type": "number",
                    "description": "Minimum confidence score (0-1) required for auto-linking (default 0.9)",
                    "default": 0.9
                }
            },
            "required": []
        }
    },
    {
        "name": "create_series_from_episode",
        "description": "Create a new series container from an episode's information. Use this when an episode references a series that doesn't exist in our database. The new series will be populated with metadata from TMDB if available.",
        "input_schema": {
            "type": "object",
            "properties": {
                "episode_id": {
                    "type": "string",
                    "description": "The ID of the episode to create a series from"
                },
                "series_title": {
                    "type": "string",
                    "description": "The title for the new series"
                },
                "tmdb_id": {
                    "type": "integer",
                    "description": "Optional TMDB ID for the series to fetch metadata"
                },
                "reason": {
                    "type": "string",
                    "description": "Brief explanation of why you're creating this series"
                }
            },
            "required": ["episode_id", "series_title"]
        }
    },
    # Episode Deduplication Tools
    {
        "name": "find_duplicate_episodes",
        "description": "Find episodes that are duplicates (same series + season + episode number). Returns groups of duplicate episodes that need resolution.",
        "input_schema": {
            "type": "object",
            "properties": {
                "series_id": {
                    "type": "string",
                    "description": "Optional: Filter to a specific series ID"
                }
            },
            "required": []
        }
    },
    {
        "name": "resolve_duplicate_episodes",
        "description": "Resolve a group of duplicate episodes by keeping one and unpublishing/deleting the others. Choose the best quality version to keep.",
        "input_schema": {
            "type": "object",
            "properties": {
                "episode_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of duplicate episode IDs in the group"
                },
                "keep_id": {
                    "type": "string",
                    "description": "ID of the episode to keep (if not provided, auto-selects based on quality)"
                },
                "action": {
                    "type": "string",
                    "description": "What to do with duplicates: 'unpublish' (default) or 'delete'",
                    "enum": ["unpublish", "delete"],
                    "default": "unpublish"
                },
                "reason": {
                    "type": "string",
                    "description": "Brief explanation of why you're resolving these duplicates"
                }
            },
            "required": ["episode_ids"]
        }
    },
    # Integrity Tools
    {
        "name": "get_integrity_status",
        "description": "Get a summary of all data integrity issues: orphaned GCS files (uploaded but no database record), orphaned Content records (database record but no GCS file), and stuck upload jobs. Use this to understand the overall health of the storage system.",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": []
        }
    },
    {
        "name": "find_orphaned_gcs_files",
        "description": "Find files in Google Cloud Storage that have no corresponding Content record in the database. These are wasted storage that should be cleaned up.",
        "input_schema": {
            "type": "object",
            "properties": {
                "prefix": {
                    "type": "string",
                    "description": "Optional GCS path prefix to filter (e.g., 'movies/', 'seriess/')"
                },
                "limit": {
                    "type": "integer",
                    "description": "Maximum number of orphans to return (default 100)",
                    "default": 100
                }
            },
            "required": []
        }
    },
    {
        "name": "find_orphaned_content_records",
        "description": "Find Content records in the database whose GCS files no longer exist. These are broken content items that should be cleaned up.",
        "input_schema": {
            "type": "object",
            "properties": {
                "limit": {
                    "type": "integer",
                    "description": "Maximum number of orphans to return (default 100)",
                    "default": 100
                }
            },
            "required": []
        }
    },
    {
        "name": "find_stuck_upload_jobs",
        "description": "Find upload jobs that are stuck in processing state for too long. These jobs may need recovery or cleanup.",
        "input_schema": {
            "type": "object",
            "properties": {
                "threshold_minutes": {
                    "type": "integer",
                    "description": "Time after which a job is considered stuck (default 30 minutes)",
                    "default": 30
                }
            },
            "required": []
        }
    },
    {
        "name": "cleanup_orphans",
        "description": "Clean up orphaned data: delete orphaned GCS files and/or Content records. IMPORTANT: Use dry_run=true first to see what would be cleaned, then run with dry_run=false to actually clean.",
        "input_schema": {
            "type": "object",
            "properties": {
                "cleanup_type": {
                    "type": "string",
                    "description": "What to clean: 'gcs' for files, 'content' for records, 'all' for both",
                    "enum": ["gcs", "content", "all"],
                    "default": "all"
                },
                "dry_run": {
                    "type": "boolean",
                    "description": "If true, only report what would be cleaned without making changes (default true)",
                    "default": True
                },
                "limit": {
                    "type": "integer",
                    "description": "Maximum number of items to clean per category (default 100)",
                    "default": 100
                }
            },
            "required": []
        }
    },
    {
        "name": "recover_stuck_jobs",
        "description": "Recover stuck upload jobs by marking them as failed and optionally requeuing for retry. Use dry_run=true first to preview.",
        "input_schema": {
            "type": "object",
            "properties": {
                "dry_run": {
                    "type": "boolean",
                    "description": "If true, only report what would be recovered (default true)",
                    "default": True
                },
                "threshold_minutes": {
                    "type": "integer",
                    "description": "Time after which a job is considered stuck (default 30 minutes)",
                    "default": 30
                }
            },
            "required": []
        }
    },
    {
        "name": "run_full_cleanup",
        "description": "Run a comprehensive cleanup of all integrity issues: orphaned GCS files, orphaned Content records, and stuck upload jobs. Use dry_run=true first to preview all actions.",
        "input_schema": {
            "type": "object",
            "properties": {
                "dry_run": {
                    "type": "boolean",
                    "description": "If true, only report what would be cleaned up (default true)",
                    "default": True
                },
                "limit": {
                    "type": "integer",
                    "description": "Maximum number of items to clean per category (default 100)",
                    "default": 100
                }
            },
            "required": []
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
