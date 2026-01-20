"""Subtitle tool definitions."""

SUBTITLE_TOOLS = [
    {
        "name": "scan_video_subtitles",
        "description": "Analyze a video file (MKV/MP4) to detect embedded subtitle tracks and AUTOMATICALLY extract and save them to the database.",
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
        "description": "Extract ALL embedded subtitle tracks from a video file and save them to the database. Use this after scan_video_subtitles confirms subtitles exist.",
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
                    "description": "Optional: Specific languages to extract. If not provided, extracts all."
                }
            },
            "required": ["content_id"]
        }
    },
    {
        "name": "verify_required_subtitles",
        "description": "Verify that a content item has subtitles in the required languages (English, Hebrew, Spanish). Returns which languages are missing.",
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
        "description": "Search for subtitles on external sources (OpenSubtitles, TMDB) for a content item without downloading them.",
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
        "description": "Download and save a subtitle from external sources (OpenSubtitles or TMDB). Respects daily download quotas.",
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
        "description": "Download subtitles for multiple content items in one batch operation. Automatically manages daily quotas (1500 downloads/day). OpenSubtitles limited to 3 languages max: Hebrew (he), English (en), Spanish (es).",
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
                    "description": "Languages to fetch. Maximum 3 languages allowed. Default: ['he', 'en', 'es']",
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
        "description": "Check remaining OpenSubtitles download quota for today. Free tier limit is 20 downloads per day.",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": []
        }
    },
]
