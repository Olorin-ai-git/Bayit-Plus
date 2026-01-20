"""Diagnostics tool definitions - API configuration, duplicates, metadata quality."""

DIAGNOSTICS_TOOLS = [
    {
        "name": "check_api_configuration",
        "description": "Check which external APIs are configured and ready to use (TMDB, OpenSubtitles, Anthropic, SendGrid). Use this at the start of an audit to understand what tools are available.",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": []
        }
    },
    {
        "name": "find_duplicates",
        "description": "Find duplicate content items in the library using various detection methods. Duplicates waste storage and confuse users.",
        "input_schema": {
            "type": "object",
            "properties": {
                "detection_type": {
                    "type": "string",
                    "description": "Detection method to use",
                    "enum": ["all", "hash", "tmdb", "imdb", "exact_name", "title"],
                    "default": "all"
                }
            },
            "required": []
        }
    },
    {
        "name": "resolve_duplicates",
        "description": "Resolve a group of duplicate content items by keeping one and removing/unpublishing the rest.",
        "input_schema": {
            "type": "object",
            "properties": {
                "content_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of content IDs in the duplicate group"
                },
                "keep_id": {
                    "type": "string",
                    "description": "The ID of the content item to keep"
                },
                "action": {
                    "type": "string",
                    "description": "What to do with duplicates",
                    "enum": ["unpublish", "delete"],
                    "default": "unpublish"
                }
            },
            "required": ["content_ids", "keep_id"]
        }
    },
    {
        "name": "find_quality_variants",
        "description": "Find content items that are quality variants of each other (e.g., 720p and 1080p versions of the same movie). These should be linked together.",
        "input_schema": {
            "type": "object",
            "properties": {
                "limit": {
                    "type": "integer",
                    "description": "Maximum number of variant groups to return",
                    "default": 50
                },
                "unlinked_only": {
                    "type": "boolean",
                    "description": "Only show variants that aren't already linked",
                    "default": True
                }
            },
            "required": []
        }
    },
    {
        "name": "link_quality_variants",
        "description": "Link multiple content items as quality variants of each other. This allows users to choose their preferred quality.",
        "input_schema": {
            "type": "object",
            "properties": {
                "content_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of content IDs to link as variants"
                },
                "primary_id": {
                    "type": "string",
                    "description": "Optional: ID of the primary/preferred version"
                }
            },
            "required": ["content_ids"]
        }
    },
    {
        "name": "find_missing_metadata",
        "description": "Find content items missing important metadata fields. This helps identify content that needs enrichment.",
        "input_schema": {
            "type": "object",
            "properties": {
                "limit": {
                    "type": "integer",
                    "description": "Maximum number of items to return",
                    "default": 100
                },
                "missing_fields": {
                    "type": "array",
                    "items": {
                        "type": "string",
                        "enum": ["description", "poster_url", "thumbnail", "tmdb_id", "imdb_id", "year", "genre"]
                    },
                    "description": "Which fields to check for missing values",
                    "default": ["description", "poster_url", "thumbnail"]
                }
            },
            "required": []
        }
    }
]
