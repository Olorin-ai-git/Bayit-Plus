"""Content browsing tool definitions."""

CONTENT_TOOLS = [
    {
        "name": "list_content_items",
        "description": "Get a list of content items to audit. You can filter by category, limit results, or get a random sample. Use this to decide what to inspect.",
        "input_schema": {
            "type": "object",
            "properties": {
                "category_id": {
                    "type": "string",
                    "description": "Optional: Filter by category ID",
                },
                "limit": {
                    "type": "integer",
                    "description": "Maximum number of items to return (default 20, max 100)",
                    "default": 20,
                },
                "random_sample": {
                    "type": "boolean",
                    "description": "If true, return random sample instead of newest items",
                    "default": False,
                },
            },
            "required": [],
        },
    },
    {
        "name": "get_content_details",
        "description": "Get detailed information about a specific content item including metadata, streaming URL, poster, IMDB data, etc.",
        "input_schema": {
            "type": "object",
            "properties": {
                "content_id": {
                    "type": "string",
                    "description": "The ID of the content item to inspect",
                }
            },
            "required": ["content_id"],
        },
    },
    {
        "name": "get_categories",
        "description": "Get all available categories in the system. Use this to understand category structure and verify correct categorization.",
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
]
