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
