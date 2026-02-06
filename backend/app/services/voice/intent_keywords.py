"""
Intent Classification Keywords
Multi-language keyword patterns for voice intent classification
"""

# Kids content patterns (3 languages)
KIDS_KEYWORDS = {
    "he": ["ילדים", "לילדים", "ילד", "קטנים", "קרטון", "מצויר", "אנימציה"],
    "en": ["kids", "children", "child", "cartoons", "animated", "for kids"],
    "es": ["niños", "infantil", "dibujos", "animados", "para niños"]
}

# Navigation patterns (3 languages)
NAVIGATION_KEYWORDS = [
    'בית', 'חזור הביתה', 'עמוד ראשי',
    'ערוצים', 'שידור חי', 'טלוויזיה',
    'סרטים', 'סדרות', 'תוכן', 'וידאו',
    'רדיו', 'פודקאסטים', 'מועדפים',
    'home', 'back', 'channels', 'movies', 'series', 'radio', 'podcasts',
    'inicio', 'canales', 'películas', 'series'
]

# Search patterns (3 languages)
SEARCH_KEYWORDS = [
    'חפש', 'מצא', 'איפה', 'הצג',
    'אקשן', 'קומדיה', 'דרמה', 'דוקומנטרים',
    'search', 'find', 'show', 'where',
    'action', 'comedy', 'drama', 'documentary',
    'buscar', 'encontrar', 'mostrar'
]

# Playback control patterns (3 languages)
PLAYBACK_KEYWORDS = [
    'נגן', 'הפעל', 'התחל', 'השהה', 'עצור', 'המשך',
    'play', 'start', 'pause', 'stop', 'resume',
    'reproducir', 'pausar', 'detener'
]

# Scroll patterns (3 languages)
SCROLL_KEYWORDS = [
    'גלול', 'למטה', 'למעלה', 'עוד', 'הבא', 'הקודם',
    'scroll', 'down', 'up', 'next', 'previous',
    'desplazar', 'abajo', 'arriba'
]

# System control patterns (3 languages)
CONTROL_KEYWORDS = [
    'חזק', 'שקט', 'השתק', 'שפה', 'עזרה',
    'loud', 'quiet', 'mute', 'language', 'help',
    'volumen', 'silencio', 'idioma', 'ayuda'
]

# Content query patterns (3 languages) - questions about content
CONTENT_QUERY_KEYWORDS = {
    "he": ["מה זה", "ספר לי על", "פרטים על", "מידע על", "על מה"],
    "en": ["what is", "tell me about", "details about", "info on", "what's this"],
    "es": ["qué es", "cuéntame sobre", "detalles de", "información de"]
}

# Display channels patterns (3 languages) - show channel list/grid
DISPLAY_CHANNELS_KEYWORDS = {
    "he": ["הראה ערוצים", "רשימת ערוצים", "כל הערוצים", "פתח ערוצים"],
    "en": ["show channels", "channel list", "all channels", "open channels"],
    "es": ["mostrar canales", "lista de canales", "todos los canales"]
}

# Web search patterns (3 languages) - external web search
WEB_SEARCH_KEYWORDS = {
    "he": ["חפש באינטרנט", "חפש ברשת", "גוגל", "חפש לי"],
    "en": ["search the web", "search online", "google", "look up online"],
    "es": ["buscar en internet", "buscar en la web", "googlear"]
}

# Playback control-only keywords (never followed by content name)
PLAYBACK_CONTROL_ONLY_KEYWORDS = [
    'השהה', 'עצור', 'המשך',
    'pause', 'stop', 'resume',
    'pausar', 'detener',
]

# Play/start keywords that may precede a content name (include trailing space)
PLAY_CONTENT_PREFIXES = [
    'נגן ', 'הפעל ', 'התחל ',
    'play ', 'start ',
    'reproducir ',
]


def is_play_content_request(transcript: str) -> bool:
    """
    Check if a playback-matching transcript is a content play request.

    "play" or "pause" -> False (bare playback control)
    "play the 25th hour" -> True (user wants to find and play content)
    """
    transcript_lower = transcript.lower().strip()

    if any(kw in transcript_lower for kw in PLAYBACK_CONTROL_ONLY_KEYWORDS):
        return False

    for prefix in PLAY_CONTENT_PREFIXES:
        if prefix in transcript_lower:
            idx = transcript_lower.index(prefix) + len(prefix)
            remaining = transcript_lower[idx:].strip()
            if len(remaining) > 3:
                return True

    return False


def clean_play_prefix(transcript: str) -> str:
    """Strip play keyword prefix from transcript for better search."""
    transcript_lower = transcript.lower()
    for prefix in PLAY_CONTENT_PREFIXES:
        if prefix in transcript_lower:
            idx = transcript_lower.index(prefix) + len(prefix)
            return transcript[idx:].strip()
    return transcript


# Content-type hint keywords for play-content routing
LIVE_CONTENT_HINTS = {
    "he": ["ערוץ", "שידור חי", "טלוויזיה", "חדשות"],
    "en": ["channel", "live", "tv", "news"],
    "es": ["canal", "en vivo", "television", "noticias"],
}
PODCAST_CONTENT_HINTS = {
    "he": ["פודקאסט", "תוכנית"],
    "en": ["podcast", "episode", "show"],
    "es": ["podcast", "episodio", "programa"],
}
RADIO_CONTENT_HINTS = {
    "he": ["רדיו", "תחנה"],
    "en": ["radio", "station"],
    "es": ["radio", "estacion"],
}


def detect_content_types(query: str, language: str) -> list:
    """Detect which content types to search based on keywords in the query."""
    query_lower = query.lower()

    if any(kw in query_lower for kw in LIVE_CONTENT_HINTS.get(language, LIVE_CONTENT_HINTS["en"])):
        return ["live"]
    if any(kw in query_lower for kw in PODCAST_CONTENT_HINTS.get(language, PODCAST_CONTENT_HINTS["en"])):
        return ["podcast"]
    if any(kw in query_lower for kw in RADIO_CONTENT_HINTS.get(language, RADIO_CONTENT_HINTS["en"])):
        return ["radio"]

    return ["vod", "live", "radio", "podcast"]


# Spoken response templates for play-content (10 languages)
PLAYING_RESPONSES = {
    "he": "מנגן {}", "en": "Playing {}", "es": "Reproduciendo {}",
    "zh": "正在播放 {}", "fr": "Lecture de {}", "it": "Riproduzione di {}",
    "hi": "{} चला रहे हैं", "ta": "{} இயக்குகிறது",
    "bn": "{} চালানো হচ্ছে", "ja": "{} を再生中",
}
CONTENT_NOT_FOUND_RESPONSES = {
    "he": "לא מצאתי את {}. מחפש תוכן דומה.",
    "en": "I couldn't find {}. Searching for similar content.",
    "es": "No encontre {}. Buscando contenido similar.",
    "zh": "找不到 {}。正在搜索类似内容。",
    "fr": "Je n'ai pas trouvé {}. Recherche de contenu similaire.",
    "it": "Non ho trovato {}. Cercando contenuti simili.",
    "hi": "{} नहीं मिला। समान सामग्री खोज रहे हैं।",
    "ta": "{} கிடைக்கவில்லை. ஒத்த உள்ளடக்கத்தைத் தேடுகிறது.",
    "bn": "{} পাওয়া যায়নি। অনুরূপ বিষয়বস্তু খোঁজা হচ্ছে।",
    "ja": "{} が見つかりませんでした。類似コンテンツを検索中。",
}
