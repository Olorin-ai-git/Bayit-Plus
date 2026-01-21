"""Metadata and TMDB tool definitions."""

METADATA_TOOLS = [
    {
        "name": "search_tmdb",
        "description": "Search TMDB for a movie or series to get metadata, poster, and IMDB rating. Use this when you find missing or suspicious metadata.",
        "input_schema": {
            "type": "object",
            "properties": {
                "title": {"type": "string", "description": "Title to search for"},
                "year": {
                    "type": "integer",
                    "description": "Optional: Release year to improve search accuracy",
                },
                "content_type": {
                    "type": "string",
                    "description": "Type of content: 'movie' or 'series'",
                    "enum": ["movie", "series"],
                    "default": "movie",
                },
            },
            "required": ["title"],
        },
    },
    {
        "name": "fix_missing_poster",
        "description": "Add a missing poster to a content item by fetching it from TMDB. Only use this when you've confirmed the poster is missing and you have TMDB data.",
        "input_schema": {
            "type": "object",
            "properties": {
                "content_id": {
                    "type": "string",
                    "description": "The ID of the content item",
                },
                "reason": {
                    "type": "string",
                    "description": "Brief explanation of why you're fixing this",
                },
            },
            "required": ["content_id", "reason"],
        },
    },
    {
        "name": "fix_missing_metadata",
        "description": "Update missing or incomplete metadata (description, genres, year, IMDB rating, etc.) by fetching from TMDB.",
        "input_schema": {
            "type": "object",
            "properties": {
                "content_id": {
                    "type": "string",
                    "description": "The ID of the content item",
                },
                "reason": {
                    "type": "string",
                    "description": "Brief explanation of what metadata is missing and why you're fixing it",
                },
            },
            "required": ["content_id", "reason"],
        },
    },
    {
        "name": "recategorize_content",
        "description": "Move a content item to a different category. Only use this when you're confident (>90%) that it's miscategorized.",
        "input_schema": {
            "type": "object",
            "properties": {
                "content_id": {
                    "type": "string",
                    "description": "The ID of the content item",
                },
                "new_category_id": {
                    "type": "string",
                    "description": "The ID of the category to move it to",
                },
                "reason": {
                    "type": "string",
                    "description": "Detailed explanation of why this recategorization is correct",
                },
                "confidence": {
                    "type": "number",
                    "description": "Your confidence level (0-100) that this is the correct category",
                },
            },
            "required": ["content_id", "new_category_id", "reason", "confidence"],
        },
    },
    {
        "name": "reclassify_as_series",
        "description": "Reclassify a content item from movie to TV series. Use this when you detect series indicators in the title (S01E01, S02E03, 'Season 1', etc.) or when TMDB confirms the content is a TV show.",
        "input_schema": {
            "type": "object",
            "properties": {
                "content_id": {
                    "type": "string",
                    "description": "The ID of the content item to reclassify",
                },
                "reason": {
                    "type": "string",
                    "description": "Explanation of why this should be classified as a series",
                },
            },
            "required": ["content_id", "reason"],
        },
    },
    {
        "name": "reclassify_as_movie",
        "description": "Reclassify a content item from series to movie. Use this when a content item is incorrectly marked as a series but is actually a standalone movie.",
        "input_schema": {
            "type": "object",
            "properties": {
                "content_id": {
                    "type": "string",
                    "description": "The ID of the content item to reclassify",
                },
                "reason": {
                    "type": "string",
                    "description": "Explanation of why this should be classified as a movie",
                },
            },
            "required": ["content_id", "reason"],
        },
    },
    {
        "name": "flag_for_manual_review",
        "description": "Flag a content item for manual human review. Use this when you find an issue but aren't confident about the fix. Do NOT use for broken streams - use delete_broken_content instead.",
        "input_schema": {
            "type": "object",
            "properties": {
                "content_id": {
                    "type": "string",
                    "description": "The ID of the content item",
                },
                "issue_type": {
                    "type": "string",
                    "description": "Type of issue",
                    "enum": [
                        "missing_metadata",
                        "misclassification",
                        "duplicate",
                        "quality_issue",
                        "other",
                    ],
                },
                "reason": {
                    "type": "string",
                    "description": "Detailed explanation of the issue and why it needs manual review",
                },
                "priority": {
                    "type": "string",
                    "description": "Priority level",
                    "enum": ["low", "medium", "high", "critical"],
                    "default": "medium",
                },
            },
            "required": ["content_id", "issue_type", "reason"],
        },
    },
    {
        "name": "delete_broken_content",
        "description": "Delete a content item that has a broken or inaccessible stream URL. Use this when check_stream_url confirms the stream is broken. IMPORTANT: Only use after confirming stream is broken.",
        "input_schema": {
            "type": "object",
            "properties": {
                "content_id": {
                    "type": "string",
                    "description": "The ID of the content item to delete",
                },
                "reason": {
                    "type": "string",
                    "description": "Reason for deletion (e.g., 'Stream URL returned 404')",
                },
                "stream_check_result": {
                    "type": "string",
                    "description": "The result from check_stream_url that confirms the stream is broken",
                },
            },
            "required": ["content_id", "reason"],
        },
    },
    {
        "name": "clean_title",
        "description": "Clean up a content item's title by removing file extensions, quality markers, release group names. Use when you detect titles with garbage text.",
        "input_schema": {
            "type": "object",
            "properties": {
                "content_id": {
                    "type": "string",
                    "description": "The ID of the content item with messy title",
                },
                "cleaned_title": {
                    "type": "string",
                    "description": "The cleaned version of the title",
                },
                "cleaned_title_en": {
                    "type": "string",
                    "description": "The cleaned English title (optional)",
                },
                "reason": {
                    "type": "string",
                    "description": "Brief explanation of what you cleaned",
                },
            },
            "required": ["content_id", "cleaned_title", "reason"],
        },
    },
]
