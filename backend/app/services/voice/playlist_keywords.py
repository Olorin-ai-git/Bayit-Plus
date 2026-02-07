"""
Playlist Voice Keywords
Multi-language keyword patterns for playlist voice intent classification.
Supports 3 input languages (he, en, es).
Spoken responses are in playlist_responses.py.
"""

import re

# Playlist trigger words (3 languages)
PLAYLIST_KEYWORDS = {
    "he": ["רשימת השמעה", "הרשימה שלי", "התור שלי", "רשימה", "פלייליסט"],
    "en": ["playlist", "my list", "my queue", "the list", "the queue", "play list"],
    "es": ["lista de reproduccion", "mi lista", "mi cola", "la lista", "playlist"],
}

# Sub-action keywords (3 languages)
PLAYLIST_ADD_KEYWORDS = {
    "he": ["הוסף", "שים", "תכניס", "תוסיף", "הכנס"],
    "en": ["add", "put", "append", "include"],
    "es": ["agregar", "poner", "a\u00f1adir", "anadir", "incluir"],
}
PLAYLIST_REMOVE_KEYWORDS = {
    "he": ["הסר", "מחק", "תוריד", "תסיר", "הורד"],
    "en": ["remove", "delete", "take out", "drop"],
    "es": ["eliminar", "quitar", "borrar", "sacar"],
}
PLAYLIST_CLEAR_KEYWORDS = {
    "he": ["נקה", "רוקן", "תנקה", "תרוקן", "נקה את"],
    "en": ["clear", "empty", "wipe", "reset"],
    "es": ["limpiar", "vaciar", "borrar todo"],
}
PLAYLIST_PLAY_KEYWORDS = {
    "he": ["נגן את הרשימה", "תנגן את הרשימה", "הפעל רשימה", "נגן רשימת השמעה"],
    "en": ["play my list", "play my playlist", "start my playlist", "play the playlist"],
    "es": ["reproducir mi lista", "reproducir playlist", "iniciar mi lista"],
}
PLAYLIST_REVIEW_KEYWORDS = {
    "he": ["הראה רשימה", "מה ברשימה", "הצג רשימה", "הראה את הרשימה"],
    "en": ["show my playlist", "review my playlist", "what's in my playlist", "show my list"],
    "es": ["mostrar mi lista", "ver mi lista", "que hay en mi lista"],
}

# Preposition patterns for content query extraction (3 languages)
_PREPOSITIONS = {
    "he": ["את", "של", "שלי", "לרשימה", "מהרשימה"],
    "en": ["to", "from", "my", "the", "in", "into"],
    "es": ["a", "de", "mi", "la", "en", "al"],
}


def is_playlist_request(transcript: str, language: str) -> bool:
    """Detect if transcript is a playlist-related request via compound matching."""
    transcript_lower = transcript.lower().strip()
    playlist_words = PLAYLIST_KEYWORDS.get(language, PLAYLIST_KEYWORDS["en"])

    if not any(kw in transcript_lower for kw in playlist_words):
        return False

    all_action_kws = []
    for kw_dict in (
        PLAYLIST_ADD_KEYWORDS, PLAYLIST_REMOVE_KEYWORDS,
        PLAYLIST_CLEAR_KEYWORDS, PLAYLIST_PLAY_KEYWORDS,
        PLAYLIST_REVIEW_KEYWORDS,
    ):
        all_action_kws.extend(kw_dict.get(language, kw_dict["en"]))

    return any(kw in transcript_lower for kw in all_action_kws)


def detect_playlist_sub_action(transcript: str, language: str) -> str:
    """Detect which playlist sub-action the user wants."""
    transcript_lower = transcript.lower().strip()

    action_map = [
        (PLAYLIST_PLAY_KEYWORDS, "play"),
        (PLAYLIST_CLEAR_KEYWORDS, "clear"),
        (PLAYLIST_REVIEW_KEYWORDS, "review"),
        (PLAYLIST_REMOVE_KEYWORDS, "remove"),
        (PLAYLIST_ADD_KEYWORDS, "add"),
    ]

    for kw_dict, action in action_map:
        keywords = kw_dict.get(language, kw_dict["en"])
        if any(kw in transcript_lower for kw in keywords):
            return action

    return "review"


def extract_content_query(transcript: str, language: str) -> str:
    """Strip action verbs, playlist words, and prepositions to isolate content name."""
    result = transcript

    removal_words = []
    for kw_dict in (PLAYLIST_ADD_KEYWORDS, PLAYLIST_REMOVE_KEYWORDS, PLAYLIST_KEYWORDS):
        removal_words.extend(kw_dict.get(language, kw_dict["en"]))

    removal_words.extend(_PREPOSITIONS.get(language, _PREPOSITIONS["en"]))

    # Sort by length descending to match longer phrases first
    removal_words.sort(key=len, reverse=True)

    for word in removal_words:
        pattern = re.compile(re.escape(word), re.IGNORECASE)
        result = pattern.sub("", result)

    # Clean up whitespace and punctuation
    result = re.sub(r"\s+", " ", result).strip().rstrip(" .!?,;")
    return result
