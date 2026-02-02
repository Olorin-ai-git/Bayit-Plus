"""
Error Messages Module
Multi-language error messages for voice interactions
"""

from typing import Dict

# Error message translations for Hebrew, English, and Spanish
ERROR_MESSAGES: Dict[str, Dict[str, str]] = {
    "claude_api_failure": {
        "he": "מצטער, לא הצלחתי להבין את זה כרגע",
        "en": "Sorry, I couldn't understand that right now",
        "es": "Lo siento, no pude entender eso ahora"
    },
    "search_failure": {
        "he": "מצטער, לא הצלחתי לחפש כרגע",
        "en": "Sorry, I couldn't search right now",
        "es": "Lo siento, no pude buscar ahora"
    },
    "kids_content_empty": {
        "he": "לא מצאתי תוכן מתאים לגיל זה",
        "en": "No content found for that age",
        "es": "No se encontró contenido para esa edad"
    },
    "family_controls_block": {
        "he": "תוכן זה חסום על ידי בקרת הורים",
        "en": "This content is blocked by parental controls",
        "es": "Este contenido está bloqueado por controles parentales"
    },
    "timeout": {
        "he": "החיפוש לוקח זמן, נסה שוב",
        "en": "Search is taking time, try again",
        "es": "La búsqueda está tardando, inténtalo de nuevo"
    },
    "unknown_error": {
        "he": "שגיאה בלתי צפויה, נסה שוב",
        "en": "Unexpected error, try again",
        "es": "Error inesperado, inténtalo de nuevo"
    },
    "no_results": {
        "he": "מצטער, לא מצאתי תוצאות",
        "en": "Sorry, I found no results",
        "es": "Lo siento, no encontré resultados"
    },
    "age_detection_failed": {
        "he": "לא הצלחתי לזהות את הגיל מהבקשה",
        "en": "Couldn't detect age from request",
        "es": "No pude detectar la edad de la solicitud"
    }
}


def get_error_message(error_type: str, language: str = "he") -> str:
    """
    Get localized error message.

    Args:
        error_type: Error type key (e.g., 'claude_api_failure')
        language: Language code (he, en, es)

    Returns:
        Localized error message string
    """
    messages = ERROR_MESSAGES.get(error_type, ERROR_MESSAGES["unknown_error"])
    return messages.get(language, messages["en"])
