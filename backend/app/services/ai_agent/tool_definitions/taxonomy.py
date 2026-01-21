"""
Taxonomy Tool Definitions for Librarian AI Agent

Tools for enforcing the 5-axis content classification system:
- Validate taxonomy compliance
- Suggest taxonomy classification
- Fix taxonomy violations
- Migrate content to new taxonomy
"""

TAXONOMY_TOOLS = [
    {
        "name": "validate_taxonomy_compliance",
        "description": """Validate that a content item has correct taxonomy assignments.

Checks:
- section_ids: Content must belong to at least one valid section
- primary_section_id: Must be set and reference a valid, active section
- content_format: Must be one of: movie, series, documentary, short, clip
- audience_id: Must reference a valid, active audience classification
- genre_ids: All IDs must reference valid, active genres
- subcategory_ids: All IDs must belong to sections the content is in
- topic_tags: Tags must be from the allowed list or valid custom tags

Returns a list of violations found and suggestions for fixes.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "content_id": {
                    "type": "string",
                    "description": "The ID of the content item to validate",
                }
            },
            "required": ["content_id"],
        },
    },
    {
        "name": "suggest_taxonomy_classification",
        "description": """Analyze content metadata and suggest appropriate taxonomy values.

Uses content title, description, existing genre/category info, and TMDB metadata
to suggest:
- Best section(s) for the content
- Appropriate content format
- Recommended audience classification
- Genre mappings from existing genre data
- Relevant topic tags
- Applicable subcategories

This is a non-destructive analysis tool - it only suggests, doesn't modify.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "content_id": {
                    "type": "string",
                    "description": "The ID of the content item to analyze",
                }
            },
            "required": ["content_id"],
        },
    },
    {
        "name": "apply_taxonomy_classification",
        "description": """Apply taxonomy classification to a content item.

Sets the 5-axis classification fields:
- section_ids: Which sections the content appears in (cross-listing allowed)
- primary_section_id: Main section for display priority
- content_format: Structural type (movie, series, documentary, short, clip)
- audience_id: Age appropriateness (general, kids, family, mature)
- genre_ids: Mood/style classifications (multiple allowed)
- topic_tags: Theme tags (multiple allowed)
- subcategory_ids: Section-specific sub-categories

Use suggest_taxonomy_classification first to get recommended values.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "content_id": {
                    "type": "string",
                    "description": "The ID of the content item to classify",
                },
                "section_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Section IDs the content should appear in",
                },
                "primary_section_id": {
                    "type": "string",
                    "description": "Main section ID for display priority",
                },
                "content_format": {
                    "type": "string",
                    "enum": ["movie", "series", "documentary", "short", "clip"],
                    "description": "Structural content type",
                },
                "audience_id": {
                    "type": "string",
                    "description": "Audience classification ID",
                },
                "genre_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Genre IDs to assign",
                },
                "topic_tags": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Topic tags to assign",
                },
                "subcategory_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Subcategory IDs to assign",
                },
            },
            "required": ["content_id"],
        },
    },
    {
        "name": "batch_migrate_taxonomy",
        "description": """Migrate a batch of content items from legacy categories to new taxonomy.

Automatically determines appropriate taxonomy values based on:
- Legacy category_id and category_name
- is_series flag
- is_kids_content flag
- content_type field
- Existing genre data

Use this for bulk migration of content that hasn't been migrated yet.
Processes content in batches and returns migration statistics.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "batch_size": {
                    "type": "integer",
                    "description": "Number of items to process (default: 50, max: 200)",
                    "default": 50,
                },
                "section_filter": {
                    "type": "string",
                    "description": "Optional: Only migrate content that would belong to this section slug",
                },
            },
            "required": [],
        },
    },
    {
        "name": "get_taxonomy_summary",
        "description": """Get a summary of the current taxonomy state.

Returns:
- List of all active sections with content counts
- List of all active genres with content counts
- List of all active audiences with content counts
- Migration status (how many items migrated vs pending)
- Any potential issues detected (orphaned references, etc.)""",
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "list_taxonomy_violations",
        "description": """Find content items that violate taxonomy rules.

Scans for:
- Content with empty section_ids
- Content with missing primary_section_id
- Content with invalid audience_id references
- Content with invalid genre_id references
- Content with subcategory_ids that don't match their sections
- Content with invalid content_format values

Returns a list of violating content IDs with specific violations for each.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "limit": {
                    "type": "integer",
                    "description": "Maximum number of violations to return (default: 100)",
                    "default": 100,
                },
                "violation_type": {
                    "type": "string",
                    "enum": [
                        "missing_section",
                        "missing_audience",
                        "invalid_genre",
                        "invalid_subcategory",
                        "invalid_format",
                        "all",
                    ],
                    "description": "Type of violation to look for (default: all)",
                },
            },
            "required": [],
        },
    },
]
