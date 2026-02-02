"""
Tool Definitions - Claude tool definitions with multilingual descriptions
"""

# Tool definitions with multilingual descriptions
WIZARD_TOOLS = [
    {
        "name": "search_content",
        "description": "חיפוש תכנים בקטלוג בית+ (סרטים, סדרות, שידורים חיים, רדיו, פודקאסטים) | Search Bayit+ catalog (movies, series, live TV, radio, podcasts) | Buscar catálogo Bayit+ (películas, series, TV en vivo, radio, podcasts)",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Search query - title, genre, actor, director, or descriptive terms"
                },
                "content_type": {
                    "type": "string",
                    "enum": ["vod", "live", "radio", "podcast"],
                    "description": "Content type filter (default: vod)"
                },
                "genres": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Genre filters (e.g., ['action', 'comedy'])"
                },
                "year_min": {
                    "type": "integer",
                    "description": "Minimum year filter"
                },
                "year_max": {
                    "type": "integer",
                    "description": "Maximum year filter"
                },
                "is_kids_content": {
                    "type": "boolean",
                    "description": "Filter for children's content only"
                },
                "limit": {
                    "type": "integer",
                    "description": "Maximum results (default: 5, max: 10)"
                }
            },
            "required": ["query"]
        }
    },
    {
        "name": "get_recommendations",
        "description": "קבלת המלצות מותאמות אישית על סמך היסטוריית הצפייה | Get personalized recommendations based on watch history | Obtener recomendaciones personalizadas basadas en historial",
        "input_schema": {
            "type": "object",
            "properties": {
                "content_type": {
                    "type": "string",
                    "enum": ["vod", "live", "radio", "podcast"],
                    "description": "Content type for recommendations"
                },
                "based_on": {
                    "type": "string",
                    "description": "Optional content ID to find similar content"
                },
                "limit": {
                    "type": "integer",
                    "description": "Maximum results (default: 10, max: 10)"
                }
            },
            "required": []
        }
    },
    {
        "name": "get_live_channels",
        "description": "רשימת ערוצי טלוויזיה בשידור חי לפי קטגוריה | List live TV channels by category | Listar canales de TV en vivo por categoría",
        "input_schema": {
            "type": "object",
            "properties": {
                "category": {
                    "type": "string",
                    "enum": ["news", "sports", "entertainment", "kids"],
                    "description": "Optional category filter"
                }
            },
            "required": []
        }
    },
    {
        "name": "get_kids_content",
        "description": "קבלת תוכן בטוח לילדים לפי קבוצת גיל | Get age-appropriate safe content for kids | Obtener contenido seguro para niños por grupo de edad",
        "input_schema": {
            "type": "object",
            "properties": {
                "age_group": {
                    "type": "string",
                    "enum": ["toddler", "preschool", "elementary", "preteen"],
                    "description": "Age group (toddler: 0-3, preschool: 4-6, elementary: 7-11, preteen: 12+)"
                },
                "category": {
                    "type": "string",
                    "enum": ["cartoons", "educational", "music", "hebrew", "stories", "jewish"],
                    "description": "Optional category filter"
                },
                "limit": {
                    "type": "integer",
                    "description": "Maximum results (default: 10, max: 10)"
                }
            },
            "required": ["age_group"]
        }
    },
    {
        "name": "lookup_user_guide",
        "description": "חיפוש במדריך המשתמש של בית+ (איך להשתמש, פתרון בעיות) | Search Bayit+ user guide (how-to, troubleshooting) | Buscar guía de usuario Bayit+ (cómo usar, solución de problemas)",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Search query for documentation"
                }
            },
            "required": ["query"]
        }
    }
]
