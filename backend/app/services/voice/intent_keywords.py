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
