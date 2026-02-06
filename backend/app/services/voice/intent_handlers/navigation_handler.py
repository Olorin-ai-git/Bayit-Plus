"""
Navigation Intent Handlers
Handles navigation, playback, scroll, and control commands
with multi-language support (Hebrew, English, Spanish)
"""

from typing import Any, Dict

from app.core.logging_config import get_logger

logger = get_logger(__name__)

# Allowlisted navigation paths for security validation
ALLOWED_NAVIGATION_PATHS = frozenset(
    ['/', '/live', '/vod', '/radio', '/podcasts', '/favorites', '/search']
)

NAVIGATION_MAPS: Dict[str, Dict[str, Dict[str, str]]] = {
    'he': {
        'בית': {'path': '/', 'spoken': 'עובר לעמוד הבית'},
        'ערוצים': {'path': '/live', 'spoken': 'עובר לטלוויזיה בשידור חי'},
        'סרטים': {'path': '/vod', 'spoken': 'עובר לסרטים וסדרות'},
        'רדיו': {'path': '/radio', 'spoken': 'עובר לרדיו'},
        'פודקאסטים': {'path': '/podcasts', 'spoken': 'עובר לפודקאסטים'},
        'מועדפים': {'path': '/favorites', 'spoken': 'עובר למועדפים'},
    },
    'en': {
        'home': {'path': '/', 'spoken': 'Going to the home page'},
        'back': {'path': '/', 'spoken': 'Going back to the home page'},
        'channels': {'path': '/live', 'spoken': 'Going to live TV channels'},
        'movies': {'path': '/vod', 'spoken': 'Going to movies and series'},
        'series': {'path': '/vod', 'spoken': 'Going to movies and series'},
        'radio': {'path': '/radio', 'spoken': 'Going to radio'},
        'podcasts': {'path': '/podcasts', 'spoken': 'Going to podcasts'},
        'favorites': {'path': '/favorites', 'spoken': 'Going to favorites'},
    },
    'es': {
        'inicio': {'path': '/', 'spoken': 'Yendo a la pagina principal'},
        'canales': {'path': '/live', 'spoken': 'Yendo a television en vivo'},
        'peliculas': {'path': '/vod', 'spoken': 'Yendo a peliculas y series'},
        'radio': {'path': '/radio', 'spoken': 'Yendo a radio'},
        'podcasts': {'path': '/podcasts', 'spoken': 'Yendo a podcasts'},
    },
}

PLAYBACK_MAPS: Dict[str, Dict[str, Dict[str, str]]] = {
    'he': {
        'נגן': {'action': 'play', 'spoken': 'מפעיל הנגן'},
        'הפעל': {'action': 'play', 'spoken': 'מפעיל הנגן'},
        'השהה': {'action': 'pause', 'spoken': 'משהה'},
        'עצור': {'action': 'stop', 'spoken': 'עוצר'},
        'המשך': {'action': 'resume', 'spoken': 'ממשיך'},
    },
    'en': {
        'play': {'action': 'play', 'spoken': 'Playing'},
        'start': {'action': 'play', 'spoken': 'Starting playback'},
        'pause': {'action': 'pause', 'spoken': 'Pausing'},
        'stop': {'action': 'stop', 'spoken': 'Stopping'},
        'resume': {'action': 'resume', 'spoken': 'Resuming playback'},
    },
    'es': {
        'reproducir': {'action': 'play', 'spoken': 'Reproduciendo'},
        'pausar': {'action': 'pause', 'spoken': 'Pausando'},
        'detener': {'action': 'stop', 'spoken': 'Deteniendo'},
    },
}

SCROLL_MAPS: Dict[str, Dict[str, Dict[str, str]]] = {
    'he': {
        'למעלה': {'direction': 'up', 'spoken': 'גולל למעלה'},
        'הקודם': {'direction': 'up', 'spoken': 'גולל למעלה'},
        'למטה': {'direction': 'down', 'spoken': 'גולל למטה'},
        'הבא': {'direction': 'down', 'spoken': 'גולל למטה'},
    },
    'en': {
        'up': {'direction': 'up', 'spoken': 'Scrolling up'},
        'previous': {'direction': 'up', 'spoken': 'Scrolling up'},
        'down': {'direction': 'down', 'spoken': 'Scrolling down'},
        'next': {'direction': 'down', 'spoken': 'Scrolling down'},
    },
    'es': {
        'arriba': {'direction': 'up', 'spoken': 'Desplazando arriba'},
        'abajo': {'direction': 'down', 'spoken': 'Desplazando abajo'},
    },
}

CONTROL_MAPS: Dict[str, Dict[str, Dict[str, str]]] = {
    'he': {
        'חזק': {'control': 'volume_up', 'spoken': 'הגברת הקול'},
        'שקט': {'control': 'volume_down', 'spoken': 'הנמכת הקול'},
        'השתק': {'control': 'mute', 'spoken': 'השתקת הקול'},
        'שפה': {'control': 'toggle_language', 'spoken': 'החלפת שפה'},
        'עזרה': {'control': 'show_help', 'spoken': 'מציג עזרה'},
    },
    'en': {
        'loud': {'control': 'volume_up', 'spoken': 'Turning volume up'},
        'quiet': {'control': 'volume_down', 'spoken': 'Turning volume down'},
        'mute': {'control': 'mute', 'spoken': 'Muting'},
        'language': {'control': 'toggle_language', 'spoken': 'Switching language'},
        'help': {'control': 'show_help', 'spoken': 'Showing help'},
    },
    'es': {
        'volumen': {'control': 'volume_up', 'spoken': 'Subiendo volumen'},
        'silencio': {'control': 'mute', 'spoken': 'Silenciando'},
        'idioma': {'control': 'toggle_language', 'spoken': 'Cambiando idioma'},
        'ayuda': {'control': 'show_help', 'spoken': 'Mostrando ayuda'},
    },
}

# Default spoken responses per language
_DEFAULT_NAVIGATION = {
    'he': 'עובר לעמוד הבית',
    'en': 'Going to the home page',
    'es': 'Yendo a la pagina principal',
}

_DEFAULT_PLAYBACK = {
    'he': 'מפעיל הנגן',
    'en': 'Playing',
    'es': 'Reproduciendo',
}

_DEFAULT_SCROLL = {
    'he': 'גולל למטה',
    'en': 'Scrolling down',
    'es': 'Desplazando abajo',
}

_DEFAULT_CONTROL = {
    'he': 'מציג עזרה',
    'en': 'Showing help',
    'es': 'Mostrando ayuda',
}


async def handle_navigation(
    transcript: str, language: str = "he"
) -> Dict[str, Any]:
    """Handle navigation command with multi-language support."""
    lang_map = NAVIGATION_MAPS.get(language, NAVIGATION_MAPS['en'])
    transcript_lower = transcript.lower()

    for keyword, nav_info in lang_map.items():
        if keyword in transcript_lower:
            path = nav_info['path']
            if path not in ALLOWED_NAVIGATION_PATHS:
                logger.warn(
                    "Navigation path not in allowlist",
                    extra={"path": path, "language": language},
                )
                continue
            return {
                "spoken_response": nav_info['spoken'],
                "action": {
                    "type": "navigate",
                    "payload": {"path": path},
                },
            }

    default_spoken = _DEFAULT_NAVIGATION.get(language, _DEFAULT_NAVIGATION['en'])
    return {
        "spoken_response": default_spoken,
        "action": {"type": "navigate", "payload": {"path": "/"}},
    }


async def handle_playback(
    transcript: str, language: str = "he"
) -> Dict[str, Any]:
    """Handle playback command with multi-language support."""
    lang_map = PLAYBACK_MAPS.get(language, PLAYBACK_MAPS['en'])
    transcript_lower = transcript.lower()

    for keyword, play_info in lang_map.items():
        if keyword in transcript_lower:
            return {
                "spoken_response": play_info['spoken'],
                "action": {
                    "type": "playback",
                    "payload": {"action": play_info['action']},
                },
            }

    default_spoken = _DEFAULT_PLAYBACK.get(language, _DEFAULT_PLAYBACK['en'])
    return {
        "spoken_response": default_spoken,
        "action": {"type": "playback", "payload": {"action": "play"}},
    }


async def handle_scroll(
    transcript: str, language: str = "he"
) -> Dict[str, Any]:
    """Handle scroll command with multi-language support."""
    lang_map = SCROLL_MAPS.get(language, SCROLL_MAPS['en'])
    transcript_lower = transcript.lower()

    for keyword, scroll_info in lang_map.items():
        if keyword in transcript_lower:
            return {
                "spoken_response": scroll_info['spoken'],
                "action": {
                    "type": "scroll",
                    "payload": {"direction": scroll_info['direction']},
                },
            }

    default_spoken = _DEFAULT_SCROLL.get(language, _DEFAULT_SCROLL['en'])
    return {
        "spoken_response": default_spoken,
        "action": {"type": "scroll", "payload": {"direction": "down"}},
    }


async def handle_control(
    transcript: str, language: str = "he"
) -> Dict[str, Any]:
    """Handle system control command with multi-language support."""
    lang_map = CONTROL_MAPS.get(language, CONTROL_MAPS['en'])
    transcript_lower = transcript.lower()

    for keyword, ctrl_info in lang_map.items():
        if keyword in transcript_lower:
            return {
                "spoken_response": ctrl_info['spoken'],
                "action": {
                    "type": "control",
                    "payload": {"control": ctrl_info['control']},
                },
            }

    default_spoken = _DEFAULT_CONTROL.get(language, _DEFAULT_CONTROL['en'])
    return {
        "spoken_response": default_spoken,
        "action": {"type": "control", "payload": {"control": "show_help"}},
    }
