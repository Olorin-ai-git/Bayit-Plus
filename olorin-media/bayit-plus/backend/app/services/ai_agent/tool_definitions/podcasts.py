"""Podcast tool definitions."""

PODCAST_TOOLS = [
    {
        "name": "manage_podcast_episodes",
        "description": "Manage podcast episodes: sync latest episodes from RSS feeds and ensure only the 3 most recent episodes are kept per podcast.",
        "input_schema": {
            "type": "object",
            "properties": {
                "podcast_id": {
                    "type": "string",
                    "description": "Optional: Specific podcast ID to manage. If not provided, manages all podcasts.",
                },
                "max_episodes_to_keep": {
                    "type": "integer",
                    "description": "Maximum number of episodes to keep per podcast (default: 3)",
                    "default": 3,
                },
            },
            "required": [],
        },
    },
]
