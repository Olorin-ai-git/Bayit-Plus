"""
Intent Handler Functions
Individual handlers for each voice intent type
"""

from typing import Dict, Any, Optional


async def handle_chat(transcript: str) -> Dict[str, Any]:
    """Handle natural language chat"""
    return {
        "spoken_response": "מעבד את הבקשה שלך...",
        "action": {
            "type": "chat",
            "payload": {"message": transcript}
        }
    }


async def handle_search(transcript: str) -> Dict[str, Any]:
    """Handle search command"""
    return {
        "spoken_response": f"מחפש: {transcript}",
        "action": {
            "type": "search",
            "payload": {"query": transcript}
        }
    }


async def handle_navigation(transcript: str) -> Dict[str, Any]:
    """Handle navigation command"""

    # Map Hebrew navigation commands to paths
    navigation_map = {
        'בית': {'path': '/', 'spoken': 'עובר לעמוד הבית'},
        'ערוצים': {'path': '/live', 'spoken': 'עובר לטלוויזיה בשידור חי'},
        'סרטים': {'path': '/vod', 'spoken': 'עובר לסרטים וסדרות'},
        'רדיו': {'path': '/radio', 'spoken': 'עובר לרדיו'},
        'פודקאסטים': {'path': '/podcasts', 'spoken': 'עובר לפודקאסטים'},
        'מועדפים': {'path': '/favorites', 'spoken': 'עובר למועדפים'},
    }

    for keyword, nav_info in navigation_map.items():
        if keyword in transcript.lower():
            return {
                "spoken_response": nav_info['spoken'],
                "action": {
                    "type": "navigate",
                    "payload": {"path": nav_info['path']}
                }
            }

    # Default home navigation
    return {
        "spoken_response": "עובר לעמוד הבית",
        "action": {
            "type": "navigate",
            "payload": {"path": "/"}
        }
    }


async def handle_playback(transcript: str) -> Dict[str, Any]:
    """Handle playback command"""

    playback_map = {
        'נגן': {'action': 'play', 'spoken': 'מפעיל הנגן'},
        'הפעל': {'action': 'play', 'spoken': 'מפעיל הנגן'},
        'השהה': {'action': 'pause', 'spoken': 'משהה'},
        'עצור': {'action': 'stop', 'spoken': 'עוצר'},
        'המשך': {'action': 'resume', 'spoken': 'ממשיך'},
    }

    for keyword, play_info in playback_map.items():
        if keyword in transcript.lower():
            return {
                "spoken_response": play_info['spoken'],
                "action": {
                    "type": "playback",
                    "payload": {"action": play_info['action']}
                }
            }

    # Default play
    return {
        "spoken_response": "מפעיל הנגן",
        "action": {
            "type": "playback",
            "payload": {"action": "play"}
        }
    }


async def handle_scroll(transcript: str) -> Dict[str, Any]:
    """Handle scroll command"""

    direction = "down"
    spoken = "גולל למטה"

    if any(kw in transcript.lower() for kw in ['למעלה', 'הקודם']):
        direction = "up"
        spoken = "גולל למעלה"

    return {
        "spoken_response": spoken,
        "action": {
            "type": "scroll",
            "payload": {"direction": direction}
        }
    }


async def handle_control(transcript: str) -> Dict[str, Any]:
    """Handle system control command"""

    control_map = {
        'חזק': {'control': 'volume_up', 'spoken': 'הגברת הקול'},
        'שקט': {'control': 'volume_down', 'spoken': 'הנמכת הקול'},
        'השתק': {'control': 'mute', 'spoken': 'השתקת הקול'},
        'שפה': {'control': 'toggle_language', 'spoken': 'החלפת שפה'},
        'עזרה': {'control': 'show_help', 'spoken': 'מציג עזרה'},
    }

    for keyword, ctrl_info in control_map.items():
        if keyword in transcript.lower():
            return {
                "spoken_response": ctrl_info['spoken'],
                "action": {
                    "type": "control",
                    "payload": {"control": ctrl_info['control']}
                }
            }

    # Default help
    return {
        "spoken_response": "מציג עזרה",
        "action": {
            "type": "control",
            "payload": {"control": "show_help"}
        }
    }


def get_intent_gesture(intent: str) -> Optional[Dict[str, Any]]:
    """Get wizard gesture for intent"""

    gesture_map = {
        "SEARCH": {"gesture": "browsing", "duration": 2000},
        "CHAT": {"gesture": "conjuring", "duration": None},
        "NAVIGATION": None,
        "PLAYBACK": None,
        "SCROLL": None,
        "CONTROL": None,
    }

    return gesture_map.get(intent)
