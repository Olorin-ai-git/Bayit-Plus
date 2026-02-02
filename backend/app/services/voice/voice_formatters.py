"""
Voice Formatters - Shared voice response formatting utilities
"""

from typing import List, Dict, Any


def format_voice_search_results(results: List[Dict[str, Any]], language: str) -> str:
    """
    Format search results for voice output in multiple languages.

    Args:
        results: List of search result dictionaries
        language: Language code (he, en, es)

    Returns:
        Voice-optimized search results string
    """
    total = len(results)

    if total == 0:
        # No results messages
        messages = {
            "he": "מצטער, לא מצאתי תוצאות",
            "en": "Sorry, I found no results",
            "es": "Lo siento, no encontré resultados"
        }
        return messages.get(language, messages["en"])

    if total == 1:
        # Single result messages
        item = results[0]
        title = item.get("title", "")
        year = item.get("year", "")

        if language == "he":
            if year:
                return f"מצאתי: {title} משנת {year}"
            return f"מצאתי: {title}"
        elif language == "es":
            if year:
                return f"Encontré: {title} del año {year}"
            return f"Encontré: {title}"
        else:  # en
            if year:
                return f"Found: {title} from {year}"
            return f"Found: {title}"

    # Multiple results
    top_items = results[:3]
    titles = [item.get("title", "") for item in top_items]

    if language == "he":
        titles_str = ", ".join(titles)
        return f"מצאתי {total} תוצאות. הנה 3 הראשונות: {titles_str}"
    elif language == "es":
        titles_str = ", ".join(titles)
        return f"Encontré {total} resultados. Aquí están los 3 mejores: {titles_str}"
    else:  # en
        titles_str = ", ".join(titles)
        return f"Found {total} results. Here are the top 3: {titles_str}"


def format_kids_response(items: List[Dict[str, Any]], age: int, language: str) -> str:
    """
    Format kids content response for voice output.

    Args:
        items: List of kids content items
        age: Age of target audience
        language: Language code (he, en, es)

    Returns:
        Voice-optimized kids content response
    """
    total = len(items)

    if total == 0:
        # No results messages
        messages = {
            "he": "לא מצאתי תוכן מתאים לגיל זה",
            "en": "No content found for that age",
            "es": "No se encontró contenido para esa edad"
        }
        return messages.get(language, messages["en"])

    # Results found messages
    if language == "he":
        return f"מצאתי {total} פריטי תוכן לגיל {age}"
    elif language == "es":
        return f"Encontré {total} elementos para edad {age}"
    else:  # en
        return f"Found {total} items for age {age}"
