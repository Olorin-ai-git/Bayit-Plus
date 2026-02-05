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
    },
    {
        "name": "play_content",
        "description": "הפעלת תוכן בבית+ (סרט, סדרה, ערוץ חי, רדיו, פודקאסט, ספר שמע) | Play content on Bayit+ (movie, series, live channel, radio, podcast, audiobook) | Reproducir contenido en Bayit+ (película, serie, canal en vivo, radio, podcast, audiolibro)",
        "input_schema": {
            "type": "object",
            "properties": {
                "content_id": {
                    "type": "string",
                    "description": "Content ID to play"
                },
                "content_type": {
                    "type": "string",
                    "enum": ["vod", "live", "radio", "podcast", "audiobook"],
                    "description": "Content type"
                },
                "timestamp": {
                    "type": "number",
                    "description": "Start time in seconds (optional)"
                }
            },
            "required": ["content_id", "content_type"]
        }
    },
    {
        "name": "select_subtitles",
        "description": "שינוי שפת כתוביות או הפעלה/כיבוי כתוביות | Change subtitle language or toggle subtitles on/off | Cambiar idioma de subtítulos o activar/desactivar subtítulos",
        "input_schema": {
            "type": "object",
            "properties": {
                "language": {
                    "type": "string",
                    "description": "Subtitle language code (e.g. en, he, es, fr)"
                },
                "enabled": {
                    "type": "boolean",
                    "description": "Enable (true) or disable (false) subtitles"
                }
            },
            "required": []
        }
    },
    {
        "name": "navigate_to_page",
        "description": "ניווט לעמוד בבית+ (בית, ערוצים, סרטים, רדיו, פודקאסטים, מועדפים) | Navigate to a Bayit+ page (home, live, movies, radio, podcasts, favorites) | Navegar a una página de Bayit+ (inicio, canales, películas, radio, podcasts, favoritos)",
        "input_schema": {
            "type": "object",
            "properties": {
                "page": {
                    "type": "string",
                    "description": "Page name or path (e.g. home, live, radio, vod, podcasts, favorites, settings, search)"
                }
            },
            "required": ["page"]
        }
    },
    {
        "name": "control_playback",
        "description": "שליטה בהפעלת מדיה (השהיה, המשך, עצירה, דילוג) | Control media playback (pause, resume, stop, seek) | Controlar reproducción (pausar, reanudar, detener, saltar)",
        "input_schema": {
            "type": "object",
            "properties": {
                "command": {
                    "type": "string",
                    "enum": ["play", "pause", "resume", "stop", "seek", "mute", "unmute"],
                    "description": "Playback command"
                },
                "value": {
                    "type": "number",
                    "description": "Optional value (e.g. seek position in seconds)"
                }
            },
            "required": ["command"]
        }
    }
]
