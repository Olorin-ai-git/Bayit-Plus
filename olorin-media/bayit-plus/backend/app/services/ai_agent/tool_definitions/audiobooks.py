"""Audiobook management tool definitions."""

AUDIOBOOK_TOOLS = [
    {
        "name": "find_multi_part_audiobooks",
        "description": "Find audiobooks that are parts of the same book (e.g., 'Book Title - Part 1', 'Book Title - Part 2'). Groups them by base title for unification.",
        "input_schema": {
            "type": "object",
            "properties": {
                "limit": {
                    "type": "integer",
                    "description": "Maximum number of audiobooks to scan (default 500)",
                    "default": 500,
                }
            },
            "required": [],
        },
    },
    {
        "name": "unify_multi_part_audiobooks",
        "description": "Unify multi-part audiobooks into single parent entries. Creates a parent audiobook container and links all parts as chapters. Use after find_multi_part_audiobooks to see what will be unified.",
        "input_schema": {
            "type": "object",
            "properties": {
                "base_title": {
                    "type": "string",
                    "description": "Base title of the audiobook to unify (e.g., 'The Art of War'). If not provided, processes all multi-part groups.",
                },
                "fetch_metadata": {
                    "type": "boolean",
                    "description": "If true, fetch metadata and poster from Google Books / Open Library (default true)",
                    "default": True,
                },
                "reason": {
                    "type": "string",
                    "description": "Brief explanation of why you're unifying these audiobooks",
                },
            },
            "required": [],
        },
    },
    {
        "name": "organize_all_audiobooks",
        "description": "Comprehensive audiobook organization tool. Scans all audiobooks, groups multi-part books, creates parent entries, links parts, fetches posters from Google Books / Open Library, verifies streams, and generates a report. Use for full audiobook library organization.",
        "input_schema": {
            "type": "object",
            "properties": {
                "limit": {
                    "type": "integer",
                    "description": "Maximum number of audiobooks to process (default processes all)",
                },
                "fetch_metadata": {
                    "type": "boolean",
                    "description": "If true, fetch metadata from Google Books / Open Library (default true)",
                    "default": True,
                },
                "verify_streams": {
                    "type": "boolean",
                    "description": "If true, verify stream URLs are accessible (default true)",
                    "default": True,
                },
            },
            "required": [],
        },
    },
    {
        "name": "find_audiobooks_without_posters",
        "description": "Find audiobooks that are missing poster/thumbnail images. Returns list of audiobooks that need posters.",
        "input_schema": {
            "type": "object",
            "properties": {
                "limit": {
                    "type": "integer",
                    "description": "Maximum number of audiobooks to return (default 100)",
                    "default": 100,
                },
                "include_parts": {
                    "type": "boolean",
                    "description": "If true, include audiobook parts (with series_id). If false, only parent/standalone audiobooks (default false)",
                    "default": False,
                },
            },
            "required": [],
        },
    },
    {
        "name": "enrich_audiobook_metadata",
        "description": "Fetch and apply metadata for an audiobook from Google Books API and Open Library. Updates poster, description, author, year, ISBN, and publisher if missing.",
        "input_schema": {
            "type": "object",
            "properties": {
                "audiobook_id": {
                    "type": "string",
                    "description": "The ID of the audiobook to enrich",
                },
                "search_title": {
                    "type": "string",
                    "description": "Optional custom title to search for (useful if original title has issues)",
                },
                "search_author": {
                    "type": "string",
                    "description": "Optional author name to improve search accuracy",
                },
                "reason": {
                    "type": "string",
                    "description": "Brief explanation of why you're enriching this audiobook",
                },
            },
            "required": ["audiobook_id"],
        },
    },
    {
        "name": "verify_audiobook_streams",
        "description": "Verify that audiobook stream URLs are accessible and valid. Returns list of broken streams with issues.",
        "input_schema": {
            "type": "object",
            "properties": {
                "audiobook_id": {
                    "type": "string",
                    "description": "Optional: Specific audiobook ID to verify. If not provided, scans all audiobooks.",
                },
                "limit": {
                    "type": "integer",
                    "description": "Maximum number of audiobooks to verify (default 100)",
                    "default": 100,
                },
            },
            "required": [],
        },
    },
    {
        "name": "link_audiobook_parts",
        "description": "Link audiobook parts to their parent audiobook. Use when parts are not properly linked to their parent container.",
        "input_schema": {
            "type": "object",
            "properties": {
                "parent_id": {
                    "type": "string",
                    "description": "The ID of the parent audiobook",
                },
                "part_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of part audiobook IDs to link to the parent",
                },
                "reason": {
                    "type": "string",
                    "description": "Brief explanation of why you're linking these parts",
                },
            },
            "required": ["parent_id", "part_ids"],
        },
    },
    {
        "name": "sync_audiobook_posters",
        "description": "Synchronize parent audiobook poster to all linked parts. Ensures visual consistency across all parts of a multi-part audiobook.",
        "input_schema": {
            "type": "object",
            "properties": {
                "parent_id": {
                    "type": "string",
                    "description": "Optional: Specific parent audiobook ID. If not provided, processes all parent audiobooks.",
                },
            },
            "required": [],
        },
    },
]
