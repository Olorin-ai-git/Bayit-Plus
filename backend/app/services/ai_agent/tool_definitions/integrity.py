"""Integrity and cleanup tool definitions including YouTube link validation."""

INTEGRITY_TOOLS = [
    {
        "name": "get_integrity_status",
        "description": "Get a summary of all data integrity issues: orphaned GCS files, orphaned Content records, and stuck upload jobs.",
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "find_orphaned_gcs_files",
        "description": "Find files in Google Cloud Storage that have no corresponding Content record in the database.",
        "input_schema": {
            "type": "object",
            "properties": {
                "prefix": {
                    "type": "string",
                    "description": "Optional GCS path prefix to filter (e.g., 'movies/', 'seriess/')",
                },
                "limit": {
                    "type": "integer",
                    "description": "Maximum number of orphans to return (default 100)",
                    "default": 100,
                },
            },
            "required": [],
        },
    },
    {
        "name": "find_orphaned_content_records",
        "description": "Find Content records in the database whose GCS files no longer exist.",
        "input_schema": {
            "type": "object",
            "properties": {
                "limit": {
                    "type": "integer",
                    "description": "Maximum number of orphans to return (default 100)",
                    "default": 100,
                }
            },
            "required": [],
        },
    },
    {
        "name": "find_stuck_upload_jobs",
        "description": "Find upload jobs that are stuck in processing state for too long.",
        "input_schema": {
            "type": "object",
            "properties": {
                "threshold_minutes": {
                    "type": "integer",
                    "description": "Time after which a job is considered stuck (default 30 minutes)",
                    "default": 30,
                }
            },
            "required": [],
        },
    },
    {
        "name": "cleanup_orphans",
        "description": "Clean up orphaned data: delete orphaned GCS files and/or Content records. Use dry_run=true first to preview.",
        "input_schema": {
            "type": "object",
            "properties": {
                "cleanup_type": {
                    "type": "string",
                    "description": "What to clean: 'gcs' for files, 'content' for records, 'all' for both",
                    "enum": ["gcs", "content", "all"],
                    "default": "all",
                },
                "dry_run": {
                    "type": "boolean",
                    "description": "If true, only report what would be cleaned (default true)",
                    "default": True,
                },
                "limit": {
                    "type": "integer",
                    "description": "Maximum number of items to clean per category (default 100)",
                    "default": 100,
                },
            },
            "required": [],
        },
    },
    {
        "name": "recover_stuck_jobs",
        "description": "Recover stuck upload jobs by marking them as failed and optionally requeuing for retry. Use dry_run=true first.",
        "input_schema": {
            "type": "object",
            "properties": {
                "dry_run": {
                    "type": "boolean",
                    "description": "If true, only report what would be recovered (default true)",
                    "default": True,
                },
                "threshold_minutes": {
                    "type": "integer",
                    "description": "Time after which a job is considered stuck (default 30 minutes)",
                    "default": 30,
                },
            },
            "required": [],
        },
    },
    {
        "name": "run_full_cleanup",
        "description": "Run a comprehensive cleanup of all integrity issues. Use dry_run=true first to preview all actions.",
        "input_schema": {
            "type": "object",
            "properties": {
                "dry_run": {
                    "type": "boolean",
                    "description": "If true, only report what would be cleaned up (default true)",
                    "default": True,
                },
                "limit": {
                    "type": "integer",
                    "description": "Maximum number of items to clean per category (default 100)",
                    "default": 100,
                },
            },
            "required": [],
        },
    },
    # YouTube Link Validation Tools
    {
        "name": "validate_youtube_links",
        "description": "Validate YouTube video links in the content library. Checks if YouTube videos are still available, not private, and not removed. Uses YouTube oEmbed API (no API key required). Returns list of broken videos that need attention.",
        "input_schema": {
            "type": "object",
            "properties": {
                "limit": {
                    "type": "integer",
                    "description": "Maximum number of items to validate (default 100)",
                    "default": 100,
                },
                "category_id": {
                    "type": "string",
                    "description": "Optional category ID to filter validation scope",
                },
                "include_kids": {
                    "type": "boolean",
                    "description": "Include kids content in validation (default true)",
                    "default": True,
                },
                "use_cache": {
                    "type": "boolean",
                    "description": "Use cached validation results to avoid redundant API calls (default true)",
                    "default": True,
                },
            },
            "required": [],
        },
    },
    {
        "name": "flag_broken_youtube_videos",
        "description": "Flag content items with broken YouTube videos for manual review. Sets needs_review=True with review details. Use after validate_youtube_links identifies broken videos.",
        "input_schema": {
            "type": "object",
            "properties": {
                "content_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of content IDs to flag as having broken YouTube videos",
                },
                "dry_run": {
                    "type": "boolean",
                    "description": "If true, only preview what would be flagged (default true)",
                    "default": True,
                },
            },
            "required": ["content_ids"],
        },
    },
    {
        "name": "get_youtube_content_stats",
        "description": "Get statistics about YouTube content in the library. Returns counts of YouTube content by category, kids vs non-kids, flagged broken content, and items missing posters. Use this to understand the scope before running validation or poster fixes.",
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
    # YouTube Poster/Thumbnail Tools
    {
        "name": "fix_youtube_posters",
        "description": "Fix missing or low-quality posters/thumbnails for YouTube content. Fetches high-quality thumbnails from YouTube (tries maxresdefault first, falls back to lower qualities) and updates thumbnail, backdrop, and poster_url fields. Use this to ensure all YouTube content has nice poster images.",
        "input_schema": {
            "type": "object",
            "properties": {
                "limit": {
                    "type": "integer",
                    "description": "Maximum number of items to process (default 100)",
                    "default": 100,
                },
                "category_id": {
                    "type": "string",
                    "description": "Optional category ID to filter which content to fix",
                },
                "include_kids": {
                    "type": "boolean",
                    "description": "Include kids content in the fix (default true)",
                    "default": True,
                },
                "dry_run": {
                    "type": "boolean",
                    "description": "If true, only preview what would be fixed (default true)",
                    "default": True,
                },
            },
            "required": [],
        },
    },
    {
        "name": "find_youtube_missing_posters",
        "description": "Find YouTube content items that are missing proper thumbnails/posters. Returns a list of items that need poster fixes. Use this to see which items need attention before running fix_youtube_posters.",
        "input_schema": {
            "type": "object",
            "properties": {
                "limit": {
                    "type": "integer",
                    "description": "Maximum number of items to return (default 100)",
                    "default": 100,
                },
                "include_kids": {
                    "type": "boolean",
                    "description": "Include kids content (default true)",
                    "default": True,
                },
            },
            "required": [],
        },
    },
]
