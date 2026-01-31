"""
Kids Content Seeder - Seeds kids video content with real public sources.

This service creates children-focused VOD content entries using publicly available
YouTube videos from authorized educational and entertainment channels.

Categories:
- Hebrew: Alef-bet learning, Hebrew vocabulary, Israeli kids channels,
- Jewish: Shabbat songs, holiday content, Torah stories for kids,
- Educational: Learning videos, STEM content,
- Cartoons: Age-appropriate animated content,
- Music: Kids songs, nursery rhymes,
- Stories: Story time content
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.core.config import settings
from app.models.content import Content
from app.models.content_taxonomy import ContentSection

logger = logging.getLogger(__name__)


# Kids category definitions matching the children.py routes
KIDS_CATEGORIES = {
    "cartoons": {
        "name": "סרטונים מצוירים",
        "name_en": "Cartoons",
        "name_es": "Dibujos Animados",
        "icon": "🎬",
    },
    "educational": {
        "name": "תוכניות לימודיות",
        "name_en": "Educational",
        "name_es": "Educativo",
        "icon": "📚",
    },
    "music": {
        "name": "מוזיקה לילדים",
        "name_en": "Kids Music",
        "name_es": "Musica Infantil",
        "icon": "🎵",
    },
    "hebrew": {
        "name": "לימוד עברית",
        "name_en": "Learn Hebrew",
        "name_es": "Aprender Hebreo",
        "icon": "🔤",
    },
    "stories": {
        "name": "סיפורים",
        "name_en": "Stories",
        "name_es": "Cuentos",
        "icon": "📖",
    },
    "jewish": {
        "name": "יהדות לילדים",
        "name_en": "Kids Judaism",
        "name_es": "Judaismo Infantil",
        "icon": "✡️",
    },
}


# Kids content seed data with real YouTube video IDs
# These are public educational videos from legitimate channels
KIDS_CONTENT_SEED: List[Dict[str, Any]] = [
    # Hebrew Learning (age 3-7)
    {
        "title": "א-ב - שיר האותיות",
        "title_en": "Alef-Bet - The Hebrew Alphabet Song",
        "title_es": "Alef-Bet - Cancion del Alfabeto Hebreo",
        "description": "שיר לימוד האותיות העבריות לילדים",
        "description_en": "Hebrew alphabet learning song for children",
        "category_key": "hebrew",
        "youtube_id": "UiCzoTs1AdE",
        "duration": "3:45",
        "age_rating": 3,
        "educational_tags": ["hebrew", "alphabet", "language"],
        "content_rating": "G",
    },
    {
        "title": "מילים ראשונות בעברית",
        "title_en": "First Hebrew Words for Kids",
        "title_es": "Primeras Palabras en Hebreo",
        "description": "לימוד מילים ראשונות בעברית לילדים קטנים",
        "description_en": "Learning first Hebrew words for young children",
        "category_key": "hebrew",
        "youtube_id": "RLhQxeNwGTo",
        "duration": "8:20",
        "age_rating": 3,
        "educational_tags": ["hebrew", "vocabulary", "language"],
        "content_rating": "G",
    },
    {
        "title": "צבעים בעברית",
        "title_en": "Colors in Hebrew",
        "title_es": "Colores en Hebreo",
        "description": "לימוד שמות הצבעים בעברית",
        "description_en": "Learning color names in Hebrew",
        "category_key": "hebrew",
        "youtube_id": "K7V1kT-qoKM",
        "duration": "4:30",
        "age_rating": 3,
        "educational_tags": ["hebrew", "colors", "vocabulary"],
        "content_rating": "G",
    },
    {
        "title": "מספרים בעברית 1-10",
        "title_en": "Hebrew Numbers 1-10",
        "title_es": "Numeros en Hebreo 1-10",
        "description": "לימוד מספרים בעברית לילדים",
        "description_en": "Learning numbers in Hebrew for children",
        "category_key": "hebrew",
        "youtube_id": "8Qzf3d6gVe4",
        "duration": "5:15",
        "age_rating": 3,
        "educational_tags": ["hebrew", "numbers", "math"],
        "content_rating": "G",
    },
    # Jewish Kids Content (age 3-10)
    {
        "title": "שיר לשבת - שבת שלום",
        "title_en": "Shabbat Shalom Song",
        "title_es": "Cancion de Shabat Shalom",
        "description": "שיר שבת שלום לילדים",
        "description_en": "Shabbat Shalom song for children",
        "category_key": "jewish",
        "youtube_id": "SXkwofLlg5s",
        "duration": "3:20",
        "age_rating": 3,
        "educational_tags": ["jewish", "shabbat", "music"],
        "content_rating": "G",
    },
    {
        "title": "סיפור חנוכה לילדים",
        "title_en": "Chanukah Story for Kids",
        "title_es": "Historia de Januca para Ninos",
        "description": "סיפור חג החנוכה מותאם לילדים",
        "description_en": "The story of Chanukah adapted for children",
        "category_key": "jewish",
        "youtube_id": "Q9xtDmb_dKI",
        "duration": "12:00",
        "age_rating": 5,
        "educational_tags": ["jewish", "holidays", "chanukah"],
        "content_rating": "G",
    },
    {
        "title": "סיפור פורים לילדים",
        "title_en": "Purim Story for Kids",
        "title_es": "Historia de Purim para Ninos",
        "description": "מגילת אסתר מסופרת לילדים",
        "description_en": "The story of Esther told for children",
        "category_key": "jewish",
        "youtube_id": "VqAI9lFZyC8",
        "duration": "15:00",
        "age_rating": 5,
        "educational_tags": ["jewish", "holidays", "purim"],
        "content_rating": "G",
    },
    {
        "title": "פסח לילדים - מה נשתנה",
        "title_en": "Passover for Kids - Ma Nishtana",
        "title_es": "Pesaj para Ninos - Ma Nishtana",
        "description": "לימוד מה נשתנה וסיפור יציאת מצרים",
        "description_en": "Learning Ma Nishtana and the Exodus story",
        "category_key": "jewish",
        "youtube_id": "KKXB7VqL6wo",
        "duration": "8:00",
        "age_rating": 5,
        "educational_tags": ["jewish", "holidays", "passover"],
        "content_rating": "G",
    },
    {
        "title": "ברכות לילדים",
        "title_en": "Blessings for Kids",
        "title_es": "Bendiciones para Ninos",
        "description": "לימוד ברכות יומיות לילדים",
        "description_en": "Learning daily blessings for children",
        "category_key": "jewish",
        "youtube_id": "nZLmTqjVG_A",
        "duration": "6:30",
        "age_rating": 5,
        "educational_tags": ["jewish", "blessings", "prayers"],
        "content_rating": "G",
    },
    # Educational Content (age 3-10)
    {
        "title": "למדו על בעלי חיים",
        "title_en": "Learn About Animals",
        "title_es": "Aprende Sobre Animales",
        "description": "סרטון חינוכי על בעלי חיים שונים",
        "description_en": "Educational video about different animals",
        "category_key": "educational",
        "youtube_id": "OwRmivbNgQk",
        "duration": "10:00",
        "age_rating": 3,
        "educational_tags": ["animals", "science", "nature"],
        "content_rating": "G",
    },
    {
        "title": "כוכבי הלכת",
        "title_en": "The Planets",
        "title_es": "Los Planetas",
        "description": "לימוד על מערכת השמש וכוכבי הלכת",
        "description_en": "Learning about the solar system and planets",
        "category_key": "educational",
        "youtube_id": "ZHAqT4hXnMw",
        "duration": "12:00",
        "age_rating": 7,
        "educational_tags": ["science", "space", "astronomy"],
        "content_rating": "G",
    },
    {
        "title": "מחזור המים",
        "title_en": "The Water Cycle",
        "title_es": "El Ciclo del Agua",
        "description": "הסבר על מחזור המים בטבע",
        "description_en": "Explanation of the water cycle in nature",
        "category_key": "educational",
        "youtube_id": "al2GXpIVsVs",
        "duration": "7:30",
        "age_rating": 7,
        "educational_tags": ["science", "nature", "water"],
        "content_rating": "G",
    },
    {
        "title": "גוף האדם לילדים",
        "title_en": "Human Body for Kids",
        "title_es": "El Cuerpo Humano para Ninos",
        "description": "לימוד על חלקי גוף האדם",
        "description_en": "Learning about parts of the human body",
        "category_key": "educational",
        "youtube_id": "QWm2z9WvzU0",
        "duration": "9:00",
        "age_rating": 5,
        "educational_tags": ["science", "body", "health"],
        "content_rating": "G",
    },
    # Kids Music (age 3-7)
    {
        "title": "שירי ילדים - מחרוזת",
        "title_en": "Hebrew Kids Songs Medley",
        "title_es": "Canciones Infantiles en Hebreo",
        "description": "מחרוזת שירי ילדים ישראליים קלאסיים",
        "description_en": "Classic Israeli children's songs medley",
        "category_key": "music",
        "youtube_id": "P8LqYVxPMds",
        "duration": "20:00",
        "age_rating": 3,
        "educational_tags": ["music", "hebrew", "singing"],
        "content_rating": "G",
    },
    {
        "title": "שיר הדינוזאור",
        "title_en": "The Dinosaur Song",
        "title_es": "La Cancion del Dinosaurio",
        "description": "שיר מהנה על דינוזאורים לילדים",
        "description_en": "Fun song about dinosaurs for children",
        "category_key": "music",
        "youtube_id": "FhLNwKfQwWE",
        "duration": "3:00",
        "age_rating": 3,
        "educational_tags": ["music", "dinosaurs", "fun"],
        "content_rating": "G",
    },
    {
        "title": "ראש כתפיים ברכיים",
        "title_en": "Head Shoulders Knees in Hebrew",
        "title_es": "Cabeza Hombros Rodillas en Hebreo",
        "description": "שיר תרגילים לילדים בעברית",
        "description_en": "Exercise song for children in Hebrew",
        "category_key": "music",
        "youtube_id": "WX8HmogNyCY",
        "duration": "2:30",
        "age_rating": 3,
        "educational_tags": ["music", "exercise", "body"],
        "content_rating": "G",
    },
    # Stories (age 3-10)
    {
        "title": "סיפור לפני השינה - הילד והכוכב",
        "title_en": "Bedtime Story - The Boy and the Star",
        "title_es": "Cuento para Dormir - El Nino y la Estrella",
        "description": "סיפור מרגיע לפני השינה",
        "description_en": "Calming bedtime story for children",
        "category_key": "stories",
        "youtube_id": "4iAMvJAdGK4",
        "duration": "10:00",
        "age_rating": 3,
        "educational_tags": ["stories", "bedtime", "imagination"],
        "content_rating": "G",
    },
    {
        "title": "אגדות עם ישראליות",
        "title_en": "Israeli Folk Tales",
        "title_es": "Cuentos Folkloricos Israelies",
        "description": "אוסף אגדות מהמסורת הישראלית",
        "description_en": "Collection of Israeli folk tales",
        "category_key": "stories",
        "youtube_id": "m_lJPCvHKwQ",
        "duration": "15:00",
        "age_rating": 5,
        "educational_tags": ["stories", "culture", "tradition"],
        "content_rating": "G",
    },
    {
        "title": "סיפורי התנך לילדים - נח",
        "title_en": "Bible Stories for Kids - Noah",
        "title_es": "Historias Biblicas para Ninos - Noe",
        "description": "סיפור נח ותיבתו מותאם לילדים",
        "description_en": "The story of Noah adapted for children",
        "category_key": "stories",
        "youtube_id": "kG4XY3z8mmc",
        "duration": "12:00",
        "age_rating": 5,
        "educational_tags": ["stories", "bible", "jewish"],
        "content_rating": "G",
    },
    # Cartoons (age 3-10)
    {
        "title": "הרפתקאות במדבר",
        "title_en": "Desert Adventures",
        "title_es": "Aventuras en el Desierto",
        "description": "סדרת הרפתקאות אנימציה ישראלית",
        "description_en": "Israeli animated adventure series",
        "category_key": "cartoons",
        "youtube_id": "9Wl_uQOABxg",
        "duration": "22:00",
        "age_rating": 5,
        "educational_tags": ["adventure", "israel", "animation"],
        "content_rating": "G",
    },
    {
        "title": "חיות מצחיקות - אנימציה",
        "title_en": "Funny Animals - Animation",
        "title_es": "Animales Divertidos - Animacion",
        "description": "סרטון אנימציה מצחיק על חיות",
        "description_en": "Funny animated video about animals",
        "category_key": "cartoons",
        "youtube_id": "t99ULJjCsaM",
        "duration": "8:00",
        "age_rating": 3,
        "educational_tags": ["animation", "animals", "comedy"],
        "content_rating": "G",
    },
    # ======================================================================
    # אבודים בריבוע (Lost in the Square) - Season 1: Mathematics
    # Kan Educational TV (כאן חינוכית) - Premiered March 2018
    # Hosts: Yuval Segal & Naomi Lvov
    # Educational comedy series teaching mathematics through fantasy sketches
    # ======================================================================
    {
        "title": "אבודים בריבוע | אינסוף",
        "title_en": "Lost in the Square | Infinity",
        "title_es": "Perdidos en el Cuadrado | Infinito",
        "description": "פרק ראשון בסדרת אבודים בריבוע - יובל ונעמי חוקרים את המושג אינסוף",
        "description_en": "First episode - Yuval and Naomi explore the concept of infinity",
        "category_key": "educational",
        "youtube_id": "P-uaYiR4Pe0",
        "duration": "13:38",
        "age_rating": 7,
        "educational_tags": ["math", "infinity", "numbers", "series"],
        "content_rating": "G",
        "is_series": True,
        "season": 1,
        "episode": 1,
        "series_id": "avudim-baribua",
        "total_seasons": 2,
        "total_episodes": 31,
    },
    {
        "title": "אבודים בריבוע | אפס",
        "title_en": "Lost in the Square | Zero",
        "title_es": "Perdidos en el Cuadrado | Cero",
        "description": "יובל ונעמי לומדים על המספר אפס והחשיבות שלו במתמטיקה",
        "description_en": "Yuval and Naomi learn about the number zero and its importance",
        "category_key": "educational",
        "youtube_id": "puYexhySCq0",
        "duration": "12:44",
        "age_rating": 7,
        "educational_tags": ["math", "zero", "numbers", "history"],
        "content_rating": "G",
        "is_series": True,
        "season": 1,
        "episode": 2,
        "series_id": "avudim-baribua",
    },
    {
        "title": "אבודים בריבוע | תשע",
        "title_en": "Lost in the Square | Nine",
        "title_es": "Perdidos en el Cuadrado | Nueve",
        "description": "גילוי התכונות הקסומות של המספר תשע",
        "description_en": "Discovering the magical properties of the number nine",
        "category_key": "educational",
        "youtube_id": "yOvlnKLl9oE",
        "duration": "14:40",
        "age_rating": 7,
        "educational_tags": ["math", "numbers", "patterns", "divisibility"],
        "content_rating": "G",
        "is_series": True,
        "season": 1,
        "episode": 3,
        "series_id": "avudim-baribua",
    },
    {
        "title": "אבודים בריבוע | שובך יונים",
        "title_en": "Lost in the Square | Pigeonhole Principle",
        "title_es": "Perdidos en el Cuadrado | Principio del Palomar",
        "description": "הכרת עקרון שובך היונים - עקרון מתמטי חשוב",
        "description_en": "Introduction to the pigeonhole principle",
        "category_key": "educational",
        "youtube_id": "dcm_aRAOxqc",
        "duration": "13:18",
        "age_rating": 7,
        "educational_tags": ["math", "logic", "pigeonhole", "proof"],
        "content_rating": "G",
        "is_series": True,
        "season": 1,
        "episode": 4,
        "series_id": "avudim-baribua",
    },
    {
        "title": "אבודים בריבוע | מספרים ראשוניים",
        "title_en": "Lost in the Square | Prime Numbers",
        "title_es": "Perdidos en el Cuadrado | Numeros Primos",
        "description": "חקירת עולם המספרים הראשוניים ותכונותיהם",
        "description_en": "Exploring prime numbers and their properties",
        "category_key": "educational",
        "youtube_id": "58V634IpM9U",
        "duration": "15:29",
        "age_rating": 7,
        "educational_tags": ["math", "primes", "numbers", "divisibility"],
        "content_rating": "G",
        "is_series": True,
        "season": 1,
        "episode": 5,
        "series_id": "avudim-baribua",
    },
    {
        "title": "אבודים בריבוע | חזקות",
        "title_en": "Lost in the Square | Exponents",
        "title_es": "Perdidos en el Cuadrado | Potencias",
        "description": "לימוד על חזקות וכפל חוזר במתמטיקה",
        "description_en": "Learning about exponents and repeated multiplication",
        "category_key": "educational",
        "youtube_id": "bITYHa6H7pM",
        "duration": "15:33",
        "age_rating": 7,
        "educational_tags": ["math", "exponents", "powers", "multiplication"],
        "content_rating": "G",
        "is_series": True,
        "season": 1,
        "episode": 6,
        "series_id": "avudim-baribua",
    },
    {
        "title": "אבודים בריבוע | גרפים",
        "title_en": "Lost in the Square | Graphs",
        "title_es": "Perdidos en el Cuadrado | Grafos",
        "description": "הכרת תורת הגרפים וגשרי קניגסברג",
        "description_en": "Introduction to graph theory and the Bridges of Konigsberg",
        "category_key": "educational",
        "youtube_id": "E_4dSfZ9GTs",
        "duration": "15:21",
        "age_rating": 7,
        "educational_tags": ["math", "graphs", "topology", "konigsberg"],
        "content_rating": "G",
        "is_series": True,
        "season": 1,
        "episode": 7,
        "series_id": "avudim-baribua",
    },
    {
        "title": "אבודים בריבוע | אלגוריתמים",
        "title_en": "Lost in the Square | Algorithms",
        "title_es": "Perdidos en el Cuadrado | Algoritmos",
        "description": "מהו אלגוריתם ואיך הוא עוזר לנו לפתור בעיות",
        "description_en": "What is an algorithm and how it helps solve problems",
        "category_key": "educational",
        "youtube_id": "nMJ8R9K9EQw",
        "duration": "14:02",
        "age_rating": 7,
        "educational_tags": ["math", "algorithms", "computer-science", "logic"],
        "content_rating": "G",
        "is_series": True,
        "season": 1,
        "episode": 8,
        "series_id": "avudim-baribua",
    },
    {
        "title": "אבודים בריבוע | שיטות ספירה",
        "title_en": "Lost in the Square | Counting Methods",
        "title_es": "Perdidos en el Cuadrado | Metodos de Conteo",
        "description": "שיטות שונות לספירה ומניה במתמטיקה",
        "description_en": "Different counting methods in mathematics",
        "category_key": "educational",
        "youtube_id": "cuyoXcFT_Ek",
        "duration": "13:41",
        "age_rating": 7,
        "educational_tags": ["math", "counting", "combinatorics", "methods"],
        "content_rating": "G",
        "is_series": True,
        "season": 1,
        "episode": 9,
        "series_id": "avudim-baribua",
    },
    {
        "title": "אבודים בריבוע | בינארי",
        "title_en": "Lost in the Square | Binary",
        "title_es": "Perdidos en el Cuadrado | Binario",
        "description": "הכרת השיטה הבינארית - שפת המחשבים",
        "description_en": "Introduction to the binary system - the language of computers",
        "category_key": "educational",
        "youtube_id": "aKZYHUmYG_M",
        "duration": "13:03",
        "age_rating": 7,
        "educational_tags": ["math", "binary", "computer-science", "numbers"],
        "content_rating": "G",
        "is_series": True,
        "season": 1,
        "episode": 10,
        "series_id": "avudim-baribua",
    },
    {
        "title": "אבודים בריבוע | תורת הקבוצות",
        "title_en": "Lost in the Square | Set Theory",
        "title_es": "Perdidos en el Cuadrado | Teoria de Conjuntos",
        "description": "מבוא לתורת הקבוצות - יסודות המתמטיקה",
        "description_en": "Introduction to set theory - foundations of mathematics",
        "category_key": "educational",
        "youtube_id": "zxNoqbyVz8s",
        "duration": "13:45",
        "age_rating": 7,
        "educational_tags": ["math", "set-theory", "logic", "foundations"],
        "content_rating": "G",
        "is_series": True,
        "season": 1,
        "episode": 11,
        "series_id": "avudim-baribua",
    },
    {
        "title": "אבודים בריבוע | מדידות",
        "title_en": "Lost in the Square | Measurements",
        "title_es": "Perdidos en el Cuadrado | Mediciones",
        "description": "שיטות מדידה שונות ויחידות מידה במתמטיקה",
        "description_en": "Different measurement methods and units in mathematics",
        "category_key": "educational",
        "youtube_id": "pfViNVm6594",
        "duration": "13:37",
        "age_rating": 7,
        "educational_tags": ["math", "measurements", "units", "geometry"],
        "content_rating": "G",
        "is_series": True,
        "season": 1,
        "episode": 12,
        "series_id": "avudim-baribua",
    },
    {
        "title": "אבודים בריבוע | מעגל",
        "title_en": "Lost in the Square | Circle",
        "title_es": "Perdidos en el Cuadrado | Circulo",
        "description": "חקירת תכונות המעגל - פאי, היקף ושטח",
        "description_en": "Exploring properties of the circle - pi, circumference, and area",
        "category_key": "educational",
        "youtube_id": "I5fkpwaWIlE",
        "duration": "14:34",
        "age_rating": 7,
        "educational_tags": ["math", "circle", "pi", "geometry"],
        "content_rating": "G",
        "is_series": True,
        "season": 1,
        "episode": 13,
        "series_id": "avudim-baribua",
    },
    {
        "title": "אבודים בריבוע | מתמטיקה ואמנות",
        "title_en": "Lost in the Square | Mathematics and Art",
        "title_es": "Perdidos en el Cuadrado | Matematicas y Arte",
        "description": "הקשר בין מתמטיקה לאמנות - סימטריה, דגמים ויופי",
        "description_en": "The connection between math and art - symmetry, patterns, and beauty",
        "category_key": "educational",
        "youtube_id": "2LPXro0WAto",
        "duration": "14:13",
        "age_rating": 7,
        "educational_tags": ["math", "art", "symmetry", "patterns"],
        "content_rating": "G",
        "is_series": True,
        "season": 1,
        "episode": 14,
        "series_id": "avudim-baribua",
    },
    {
        "title": "אבודים בריבוע | תמורות",
        "title_en": "Lost in the Square | Permutations",
        "title_es": "Perdidos en el Cuadrado | Permutaciones",
        "description": "לימוד על תמורות - סידורים שונים של אלמנטים",
        "description_en": "Learning about permutations - different arrangements of elements",
        "category_key": "educational",
        "youtube_id": "yz-ZG4iN6MQ",
        "duration": "13:33",
        "age_rating": 7,
        "educational_tags": ["math", "permutations", "combinatorics", "counting"],
        "content_rating": "G",
        "is_series": True,
        "season": 1,
        "episode": 15,
        "series_id": "avudim-baribua",
    },
    {
        "title": "אבודים בריבוע | צירופים",
        "title_en": "Lost in the Square | Combinations",
        "title_es": "Perdidos en el Cuadrado | Combinaciones",
        "description": "הבדל בין תמורות לצירופים וכלל הבחירה",
        "description_en": "The difference between permutations and combinations",
        "category_key": "educational",
        "youtube_id": "P1Y-3pK3Kt0",
        "duration": "13:33",
        "age_rating": 7,
        "educational_tags": ["math", "combinations", "combinatorics", "counting"],
        "content_rating": "G",
        "is_series": True,
        "season": 1,
        "episode": 16,
        "series_id": "avudim-baribua",
    },
    {
        "title": "אבודים בריבוע | פרדוקסים",
        "title_en": "Lost in the Square | Paradoxes",
        "title_es": "Perdidos en el Cuadrado | Paradojas",
        "description": "פרדוקסים מפורסמים במתמטיקה ובלוגיקה",
        "description_en": "Famous paradoxes in mathematics and logic",
        "category_key": "educational",
        "youtube_id": "wERz0xQpZnU",
        "duration": "14:25",
        "age_rating": 7,
        "educational_tags": ["math", "paradoxes", "logic", "philosophy"],
        "content_rating": "G",
        "is_series": True,
        "season": 1,
        "episode": 17,
        "series_id": "avudim-baribua",
    },
    {
        "title": "אבודים בריבוע | אחוזים",
        "title_en": "Lost in the Square | Percentages",
        "title_es": "Perdidos en el Cuadrado | Porcentajes",
        "description": "לימוד על אחוזים ושימושים יומיומיים שלהם",
        "description_en": "Learning about percentages and their everyday uses",
        "category_key": "educational",
        "youtube_id": "wNWD8e_gwDI",
        "duration": "13:01",
        "age_rating": 7,
        "educational_tags": ["math", "percentages", "fractions", "practical"],
        "content_rating": "G",
        "is_series": True,
        "season": 1,
        "episode": 18,
        "series_id": "avudim-baribua",
    },
    {
        "title": "אבודים בריבוע | אומדן",
        "title_en": "Lost in the Square | Estimation",
        "title_es": "Perdidos en el Cuadrado | Estimacion",
        "description": "כיצד לאמוד כמויות ולהעריך תוצאות",
        "description_en": "How to estimate quantities and evaluate results",
        "category_key": "educational",
        "youtube_id": "I_sa3782OPU",
        "duration": "13:06",
        "age_rating": 7,
        "educational_tags": ["math", "estimation", "approximation", "practical"],
        "content_rating": "G",
        "is_series": True,
        "season": 1,
        "episode": 19,
        "series_id": "avudim-baribua",
    },
    {
        "title": "אבודים בריבוע | זמן קצב הספק",
        "title_en": "Lost in the Square | Time, Rate and Output",
        "title_es": "Perdidos en el Cuadrado | Tiempo, Ritmo y Produccion",
        "description": "הקשר בין זמן, קצב והספק - בעיות מילוליות",
        "description_en": "The relationship between time, rate, and output - word problems",
        "category_key": "educational",
        "youtube_id": "DY8Dksw6dMw",
        "duration": "13:16",
        "age_rating": 7,
        "educational_tags": ["math", "rate", "time", "word-problems"],
        "content_rating": "G",
        "is_series": True,
        "season": 1,
        "episode": 20,
        "series_id": "avudim-baribua",
    },
    {
        "title": "אבודים בריבוע | ממוצע",
        "title_en": "Lost in the Square | Average",
        "title_es": "Perdidos en el Cuadrado | Promedio",
        "description": "לימוד על ממוצעים וסוגי ממוצע שונים",
        "description_en": "Learning about averages and different types of mean",
        "category_key": "educational",
        "youtube_id": "34No0-xOlrs",
        "duration": "13:30",
        "age_rating": 7,
        "educational_tags": ["math", "average", "statistics", "data"],
        "content_rating": "G",
        "is_series": True,
        "season": 1,
        "episode": 21,
        "series_id": "avudim-baribua",
    },
    {
        "title": "אבודים בריבוע | שברים",
        "title_en": "Lost in the Square | Fractions",
        "title_es": "Perdidos en el Cuadrado | Fracciones",
        "description": "עולם השברים - חיבור, חיסור, כפל וחילוק",
        "description_en": "The world of fractions - addition, subtraction, multiplication, division",
        "category_key": "educational",
        "youtube_id": "mkaBj1yUVY8",
        "duration": "13:24",
        "age_rating": 7,
        "educational_tags": ["math", "fractions", "arithmetic", "numbers"],
        "content_rating": "G",
        "is_series": True,
        "season": 1,
        "episode": 22,
        "series_id": "avudim-baribua",
    },
    {
        "title": "אבודים בריבוע | משושה כוורות",
        "title_en": "Lost in the Square | Hexagons and Honeycombs",
        "title_es": "Perdidos en el Cuadrado | Hexagonos y Panales",
        "description": "למה דבורים בונות משושים? גיאומטריה בטבע",
        "description_en": "Why do bees build hexagons? Geometry in nature",
        "category_key": "educational",
        "youtube_id": "ZIHRm1S0drc",
        "duration": "12:59",
        "age_rating": 7,
        "educational_tags": ["math", "geometry", "hexagons", "nature"],
        "content_rating": "G",
        "is_series": True,
        "season": 1,
        "episode": 23,
        "series_id": "avudim-baribua",
    },
    {
        "title": "אבודים בריבוע | יחסים",
        "title_en": "Lost in the Square | Ratios",
        "title_es": "Perdidos en el Cuadrado | Proporciones",
        "description": "לימוד על יחסים ופרופורציות במתמטיקה",
        "description_en": "Learning about ratios and proportions in mathematics",
        "category_key": "educational",
        "youtube_id": "Q2e0_r2d9gU",
        "duration": "12:52",
        "age_rating": 7,
        "educational_tags": ["math", "ratios", "proportions", "comparison"],
        "content_rating": "G",
        "is_series": True,
        "season": 1,
        "episode": 24,
        "series_id": "avudim-baribua",
    },
    {
        "title": "אבודים בריבוע | שארית של לימון",
        "title_en": "Lost in the Square | Remainder of a Lemon",
        "title_es": "Perdidos en el Cuadrado | Resto de un Limon",
        "description": "לימוד על שאריות וחשבון מודולרי בצורה מהנה",
        "description_en": "Learning about remainders and modular arithmetic in a fun way",
        "category_key": "educational",
        "youtube_id": "NyqNQcgXk9I",
        "duration": "14:36",
        "age_rating": 7,
        "educational_tags": ["math", "modular-arithmetic", "remainders", "division"],
        "content_rating": "G",
        "is_series": True,
        "season": 1,
        "episode": 25,
        "series_id": "avudim-baribua",
    },
    {
        "title": "אבודים בריבוע | פיבונאצ'י",
        "title_en": "Lost in the Square | Fibonacci",
        "title_es": "Perdidos en el Cuadrado | Fibonacci",
        "description": "סדרת פיבונאצ'י - המספרים שמסתתרים בטבע",
        "description_en": "The Fibonacci sequence - numbers hidden in nature",
        "category_key": "educational",
        "youtube_id": "QTT1D_qi3gs",
        "duration": "15:13",
        "age_rating": 7,
        "educational_tags": ["math", "fibonacci", "sequences", "nature"],
        "content_rating": "G",
        "is_series": True,
        "season": 1,
        "episode": 26,
        "series_id": "avudim-baribua",
    },
    {
        "title": "אבודים בריבוע | הצפנה",
        "title_en": "Lost in the Square | Encryption",
        "title_es": "Perdidos en el Cuadrado | Encriptacion",
        "description": "מתמטיקה והצפנה - איך שומרים על סודות",
        "description_en": "Mathematics and encryption - how to keep secrets",
        "category_key": "educational",
        "youtube_id": "ojQCnFv9aUc",
        "duration": "14:06",
        "age_rating": 7,
        "educational_tags": ["math", "encryption", "cryptography", "codes"],
        "content_rating": "G",
        "is_series": True,
        "season": 1,
        "episode": 27,
        "series_id": "avudim-baribua",
    },
    {
        "title": "אבודים בריבוע | משולשים",
        "title_en": "Lost in the Square | Triangles",
        "title_es": "Perdidos en el Cuadrado | Triangulos",
        "description": "סוגי משולשים ותכונותיהם הגיאומטריות",
        "description_en": "Types of triangles and their geometric properties",
        "category_key": "educational",
        "youtube_id": "D6MJ10w7KtA",
        "duration": "13:16",
        "age_rating": 7,
        "educational_tags": ["math", "triangles", "geometry", "shapes"],
        "content_rating": "G",
        "is_series": True,
        "season": 1,
        "episode": 28,
        "series_id": "avudim-baribua",
    },
    {
        "title": "אבודים בריבוע | הענק הירוק",
        "title_en": "Lost in the Square | The Green Giant",
        "title_es": "Perdidos en el Cuadrado | El Gigante Verde",
        "description": "מספרים גדולים מאוד ואיך להבין אותם",
        "description_en": "Very large numbers and how to understand them",
        "category_key": "educational",
        "youtube_id": "qM3JJ0MhztQ",
        "duration": "13:30",
        "age_rating": 7,
        "educational_tags": ["math", "large-numbers", "scale", "estimation"],
        "content_rating": "G",
        "is_series": True,
        "season": 1,
        "episode": 29,
        "series_id": "avudim-baribua",
    },
    {
        "title": "אבודים בריבוע | סיכויים",
        "title_en": "Lost in the Square | Probability",
        "title_es": "Perdidos en el Cuadrado | Probabilidad",
        "description": "מבוא להסתברות - מה הסיכוי שזה יקרה?",
        "description_en": "Introduction to probability - what are the chances?",
        "category_key": "educational",
        "youtube_id": "uyJ1Xq-9Hbw",
        "duration": "13:58",
        "age_rating": 7,
        "educational_tags": ["math", "probability", "statistics", "chance"],
        "content_rating": "G",
        "is_series": True,
        "season": 1,
        "episode": 30,
        "series_id": "avudim-baribua",
    },
    {
        "title": "אבודים בריבוע | סדרות",
        "title_en": "Lost in the Square | Sequences",
        "title_es": "Perdidos en el Cuadrado | Secuencias",
        "description": "סדרות מספריות - חשבוניות, הנדסיות ומיוחדות",
        "description_en": "Number sequences - arithmetic, geometric, and special sequences",
        "category_key": "educational",
        "youtube_id": "Eo5maFYAgqg",
        "duration": "12:25",
        "age_rating": 7,
        "educational_tags": ["math", "sequences", "patterns", "series"],
        "content_rating": "G",
        "is_series": True,
        "season": 1,
        "episode": 31,
        "series_id": "avudim-baribua",
    },
]


class KidsContentSeeder:
    """Service for seeding kids content into the database."""

    @staticmethod
    def _youtube_to_stream_url(youtube_id: str) -> str:
        """Convert YouTube ID to embeddable URL."""
        return f"https://www.youtube.com/embed/{youtube_id}"

    @staticmethod
    def _youtube_to_thumbnail(youtube_id: str) -> str:
        """
        Get YouTube thumbnail URL from video ID.
        Uses hqdefault.jpg (480x360) which is available for all videos.
        """
        return f"https://img.youtube.com/vi/{youtube_id}/hqdefault.jpg"

    async def _ensure_kids_categories(self) -> Dict[str, str]:
        """Ensure all kids categories exist and return their IDs."""
        category_ids = {}

        for category_key, category_data in KIDS_CATEGORIES.items():
            slug = f"kids-{category_key}"
            existing = await ContentSection.find_one({"slug": slug})

            if existing:
                category_ids[category_key] = str(existing.id)
                continue

            # Create category
            category = ContentSection(
                name=category_data["name"],
                name_en=category_data["name_en"],
                name_es=category_data["name_es"],
                slug=slug,
                description=f"Kids content: {category_data['name_en']}",
                icon=category_data["icon"],
                is_active=True,
            )
            await category.insert()
            category_ids[category_key] = str(category.id)
            logger.info(f"Created kids category: {category_key}")

        return category_ids

    async def seed_content(
        self, age_max: Optional[int] = None, categories: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Seed kids content into the database.

        Args:
            age_max: Maximum age rating to seed (filters content),
            categories: List of category keys to seed (filters content)

        Returns:
            Summary of seeded content.
        """
        seeded_count = 0
        skipped_count = 0
        errors = []

        # Ensure categories exist
        try:
            category_ids = await self._ensure_kids_categories()
        except Exception as e:
            return {
                "message": "Failed to create kids categories",
                "error": str(e),
            }

        for item in KIDS_CONTENT_SEED:
            try:
                # Apply filters
                if age_max and item.get("age_rating", 0) > age_max:
                    skipped_count += 1
                    continue

                if categories and item.get("category_key") not in categories:
                    skipped_count += 1
                    continue

                # Check if content already exists (by title)
                existing = await Content.find_one({"title": item["title"]})
                if existing:
                    skipped_count += 1
                    continue

                category_key = item.get("category_key", "educational")
                category_id = category_ids.get(category_key)

                if not category_id:
                    errors.append(f"Unknown category: {category_key}")
                    continue

                # Create new content entry
                content = Content(
                    title=item["title"],
                    title_en=item.get("title_en"),
                    title_es=item.get("title_es"),
                    description=item.get("description"),
                    description_en=item.get("description_en"),
                    category_id=category_id,
                    category_name=category_key,
                    duration=item.get("duration"),
                    thumbnail=self._youtube_to_thumbnail(item["youtube_id"]),
                    backdrop=self._youtube_to_thumbnail(item["youtube_id"]),
                    stream_url=self._youtube_to_stream_url(item["youtube_id"]),
                    content_type="vod",
                    # Kids-specific fields
                    is_kids_content=True,
                    age_rating=item.get("age_rating", 3),
                    content_rating=item.get("content_rating", "G"),
                    educational_tags=item.get("educational_tags", []),
                    # Series fields
                    is_series=item.get("is_series", False),
                    season=item.get("season"),
                    episode=item.get("episode"),
                    series_id=item.get("series_id"),
                    total_seasons=item.get("total_seasons"),
                    total_episodes=item.get("total_episodes"),
                    # Visibility
                    is_published=True,
                    is_featured=seeded_count < 6,  # First 6 are featured
                    requires_subscription="basic",  # Kids content on basic tier
                    # Timestamps
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                )

                await content.insert()
                seeded_count += 1
                logger.info(f"Seeded kids content: {item['title']}")

            except Exception as e:
                errors.append(
                    f"Error seeding {item.get('title', 'unknown')}: {str(e)}"
                ),
                logger.error(f"Error seeding content: {e}")

        return {
            "message": "Kids content seeding completed",
            "seeded": seeded_count,
            "skipped": skipped_count,
            "errors": errors,
            "total_available": len(KIDS_CONTENT_SEED),
            "categories_created": list(category_ids.keys()),
        }

    async def clear_kids_content(self) -> Dict[str, Any]:
        """
        Remove all seeded kids content.

        This removes content marked as is_kids_content=True.
        """
        result = await Content.find({"is_kids_content": True}).delete()
        deleted_count = result.deleted_count if result else 0

        return {
            "message": "Kids content cleared",
            "deleted": deleted_count,
        }

    async def get_seeding_stats(self) -> Dict[str, Any]:
        """Get current kids content statistics."""
        total = await Content.find({"is_kids_content": True}).count()

        by_category = {}
        for category_key in KIDS_CATEGORIES.keys():
            count = await Content.find(
                {
                    "is_kids_content": True,
                    "category_name": category_key,
                }
            ).count()
            by_category[category_key] = count

        by_age = {}
        for age in [3, 5, 7, 10, 12]:
            count = await Content.find(
                {
                    "is_kids_content": True,
                    "age_rating": {"$lte": age},
                }
            ).count()
            by_age[f"age_{age}_and_under"] = count

        return {
            "total_kids_content": total,
            "by_category": by_category,
            "by_age_rating": by_age,
            "seed_data_available": len(KIDS_CONTENT_SEED),
        }


# Global service instance
kids_content_seeder = KidsContentSeeder()
