"""Series management tool definitions."""

SERIES_TOOLS = [
    {
        "name": "find_unlinked_episodes",
        "description": "Find episodes that have season/episode numbers but are not linked to any parent series.",
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
        "description": "Link an episode to its parent series. Use when you've confirmed which series an episode belongs to.",
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
                    "description": "Season number (optional)"
                },
                "episode": {
                    "type": "integer",
                    "description": "Episode number (optional)"
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
        "description": "Automatically link unlinked episodes to their parent series using title pattern matching and TMDB lookup. Uses high confidence threshold (90%).",
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
        "description": "Create a new series container from an episode's information. Use when an episode references a series that doesn't exist in our database.",
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
    {
        "name": "sync_series_posters_to_episodes",
        "description": "Synchronize series posters/thumbnails/backdrops to all linked episodes. Ensures visual consistency across episodes.",
        "input_schema": {
            "type": "object",
            "properties": {
                "series_id": {
                    "type": "string",
                    "description": "Optional: Specific series ID to process. If not provided, processes all series."
                },
                "fetch_from_tmdb": {
                    "type": "boolean",
                    "description": "If true, fetch missing posters from TMDB when tmdb_id is available (default true)",
                    "default": True
                }
            },
            "required": []
        }
    },
    {
        "name": "find_misclassified_episodes",
        "description": "Find content items that are misclassified as series containers but are actually episodes. Returns grouped by series name.",
        "input_schema": {
            "type": "object",
            "properties": {
                "limit": {
                    "type": "integer",
                    "description": "Maximum number of misclassified episodes to find (default 100)",
                    "default": 100
                }
            },
            "required": []
        }
    },
    {
        "name": "fix_misclassified_series",
        "description": "Fix misclassified episodes for a specific series. Creates proper parent container, fetches TMDB metadata, converts items to episodes, and links them.",
        "input_schema": {
            "type": "object",
            "properties": {
                "series_name": {
                    "type": "string",
                    "description": "Name of the series to fix (must match exactly)"
                },
                "tmdb_id": {
                    "type": "integer",
                    "description": "Optional: TMDB ID for the series. Will search TMDB by name if not provided."
                },
                "fetch_tmdb_metadata": {
                    "type": "boolean",
                    "description": "If true, fetch poster/metadata from TMDB (default true)",
                    "default": True
                }
            },
            "required": ["series_name"]
        }
    },
    {
        "name": "organize_all_series",
        "description": "Comprehensive series organization tool. Scans all content, identifies episodes by title patterns (S01E01), groups by series name, creates series parent containers with TMDB metadata and posters, links all episodes, and propagates poster/backdrop to episodes. Use for full library reorganization.",
        "input_schema": {
            "type": "object",
            "properties": {
                "fetch_tmdb_metadata": {
                    "type": "boolean",
                    "description": "If true, fetch metadata from TMDB for each series (default true)",
                    "default": True
                },
                "propagate_to_episodes": {
                    "type": "boolean",
                    "description": "If true, apply series poster/backdrop to all linked episodes (default true)",
                    "default": True
                },
                "include_hebrew": {
                    "type": "boolean",
                    "description": "If true, process Hebrew series with Hebrew-to-English title mapping for TMDB lookup (default true)",
                    "default": True
                }
            },
            "required": []
        }
    },
    {
        "name": "find_duplicate_episodes",
        "description": "Find episodes that are duplicates (same series + season + episode number). Returns groups of duplicate episodes.",
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
        "description": "Resolve a group of duplicate episodes by keeping one and unpublishing/deleting the others.",
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
                    "description": "ID of the episode to keep (auto-selects based on quality if not provided)"
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
]
