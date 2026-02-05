"""
Navigate To Page Tool Executor
Validates route against allowed routes and returns a navigate action payload
"""

from typing import Any, Dict

from app.core.logging_config import get_logger

logger = get_logger(__name__)

# Allowed routes for voice navigation (maps aliases to actual paths)
# Includes English, Hebrew, and Spanish aliases
ALLOWED_ROUTES: Dict[str, str] = {
    # English aliases
    "home": "/",
    "live": "/live",
    "vod": "/vod",
    "movies": "/vod",
    "series": "/vod",
    "radio": "/radio",
    "podcasts": "/podcasts",
    "audiobooks": "/audiobooks",
    "favorites": "/favorites",
    "watchlist": "/watchlist",
    "downloads": "/downloads",
    "search": "/search",
    "profile": "/profile",
    "settings": "/settings",
    "children": "/children",
    "kids": "/children",
    "judaism": "/judaism",
    "epg": "/epg",
    "recordings": "/recordings",
    "subscribe": "/subscribe",
    "help": "/support",
    # Hebrew aliases
    "בית": "/",
    "ערוצים": "/live",
    "שידור חי": "/live",
    "סרטים": "/vod",
    "סדרות": "/vod",
    "רדיו": "/radio",
    "פודקאסטים": "/podcasts",
    "ספרי שמע": "/audiobooks",
    "מועדפים": "/favorites",
    "חיפוש": "/search",
    "פרופיל": "/profile",
    "הגדרות": "/settings",
    "ילדים": "/children",
    "יהדות": "/judaism",
    "הקלטות": "/recordings",
    "עזרה": "/support",
    # Spanish aliases
    "inicio": "/",
    "en vivo": "/live",
    "peliculas": "/vod",
    "series_es": "/vod",
    "podcasts_es": "/podcasts",
    "audiolibros": "/audiobooks",
    "favoritos": "/favorites",
    "buscar": "/search",
    "perfil": "/profile",
    "ajustes": "/settings",
    "ninos": "/children",
    "ayuda": "/support",
}

# Also allow direct path matching
ALLOWED_PATHS = set(ALLOWED_ROUTES.values())


async def execute_navigate_to_page(
    page: str,
) -> Dict[str, Any]:
    """
    Execute navigate_to_page tool - navigate to a Bayit+ page.

    Validates the route against the allowed list to prevent
    navigation to arbitrary URLs.

    Args:
        page: Page name or path (e.g. 'radio', '/vod', 'home')

    Returns:
        Dict with navigate action payload or error
    """
    try:
        normalized = page.lower().strip().strip("/")

        logger.info(
            "Navigate to page requested",
            extra={"page": page, "normalized": normalized},
        )

        # Try alias lookup first
        if normalized in ALLOWED_ROUTES:
            path = ALLOWED_ROUTES[normalized]
        elif f"/{normalized}" in ALLOWED_PATHS:
            path = f"/{normalized}"
        else:
            return {
                "success": False,
                "error": f"Unknown page: {page}",
                "available_pages": sorted(ALLOWED_ROUTES.keys()),
            }

        return {
            "success": True,
            "page": page,
            "path": path,
            "_action": {
                "type": "navigate",
                "payload": {"path": path},
            },
        }

    except Exception as e:
        logger.error(
            "Failed to execute navigate_to_page",
            extra={"page": page, "error": str(e)},
            exc_info=True,
        )
        return {"success": False, "error": str(e)}
