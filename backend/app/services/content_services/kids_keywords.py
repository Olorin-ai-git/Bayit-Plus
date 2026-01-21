"""
Kids Content Keywords Module - Keyword definitions for children's content filtering.

Contains bilingual (Hebrew/English) keyword sets for:
- Content categorization (hebrew, jewish, educational, music, stories, cartoons)
- Subcategory detection (learning hebrew, young science, math fun, nature/animals, etc.)
- Age group classification (toddlers, preschool, elementary, preteen)
- UI labels (trilingual: he, en, es)
- Seed content (fallback content when database is empty)
"""

from app.models.kids_content import (
    KidsAgeGroup,
    KidsContentCategory,
    KidsSubcategory,
)

# Dual-language keyword filters for relevance scoring and categorization
KIDS_KEYWORDS_HE = {
    "hebrew": [
        "עברית",
        "אלף בית",
        "אותיות",
        "מילים",
        "קריאה",
        "כתיבה",
        "שפה",
        "דקדוק",
        "ניקוד",
    ],
    "jewish": [
        "שבת",
        "חנוכה",
        "פורים",
        "פסח",
        "תורה",
        "ברכות",
        "תפילה",
        "חגים",
        "יהדות",
        "מצוות",
        "סוכות",
        "ראש השנה",
    ],
    "educational": [
        "לימוד",
        "חינוכי",
        "מדע",
        "חשבון",
        "מתמטיקה",
        "טבע",
        "בעלי חיים",
        "גוף האדם",
        "היסטוריה",
    ],
    "music": [
        "שירים",
        "מוסיקה",
        "שיר",
        "זמר",
        "ריקוד",
        "שירי ילדים",
        "ניגון",
        "מנגינה",
    ],
    "stories": [
        "סיפור",
        "אגדה",
        "מעשה",
        "סיפורים",
        "מעשיות",
        "ספר",
        "קריאה בקול",
    ],
    "cartoons": [
        "אנימציה",
        "מצויר",
        "סרטון",
        "קריקטורה",
        "דמויות",
        "צפיה לילדים",
    ],
}

KIDS_KEYWORDS_EN = {
    "hebrew": [
        "hebrew",
        "alphabet",
        "alef bet",
        "letters",
        "reading hebrew",
        "learn hebrew",
    ],
    "jewish": [
        "shabbat",
        "chanukah",
        "hanukkah",
        "purim",
        "passover",
        "pesach",
        "torah",
        "jewish holidays",
        "mitzvot",
    ],
    "educational": [
        "educational",
        "learning",
        "science",
        "math",
        "nature",
        "animals",
        "abc",
        "numbers",
    ],
    "music": [
        "kids songs",
        "children music",
        "nursery rhymes",
        "sing along",
        "music for kids",
    ],
    "stories": [
        "story",
        "stories",
        "tale",
        "fairy tale",
        "bedtime story",
        "read aloud",
    ],
    "cartoons": [
        "cartoon",
        "animation",
        "animated",
        "kids show",
        "children show",
    ],
}


# Subcategory-specific keyword filters
SUBCATEGORY_KEYWORDS_HE = {
    KidsSubcategory.LEARNING_HEBREW: [
        "לימוד עברית",
        "אלף בית",
        "אותיות",
        "ניקוד",
        "קריאה בעברית",
        "כתיבה בעברית",
        "מילים חדשות",
        "אוצר מילים",
    ],
    KidsSubcategory.YOUNG_SCIENCE: [
        "מדע צעיר",
        "ניסויים",
        "מעבדה",
        "חקירה",
        "גילוי",
        "פיזיקה לילדים",
        "כימיה לילדים",
        "מדענים צעירים",
    ],
    KidsSubcategory.MATH_FUN: [
        "מתמטיקה",
        "חשבון",
        "מספרים",
        "חיבור",
        "חיסור",
        "כפל",
        "חילוק",
        "גיאומטריה לילדים",
    ],
    KidsSubcategory.NATURE_ANIMALS: [
        "טבע",
        "חיות",
        "בעלי חיים",
        "צמחים",
        "יער",
        "אוקיינוס",
        "חי וצומח",
        "דינוזאורים",
        "ג'ונגל",
    ],
    KidsSubcategory.INTERACTIVE: [
        "אינטראקטיבי",
        "משחק",
        "השתתפות",
        "יחד",
        "פעילות",
        "חידות",
        "בוא נשחק",
    ],
    KidsSubcategory.HEBREW_SONGS: [
        "שירים בעברית",
        "שירי ילדים",
        "שירים ישראליים",
        "שיר ישראלי",
        "מוסיקה ישראלית לילדים",
    ],
    KidsSubcategory.NURSERY_RHYMES: [
        "שירי פעוטות",
        "שירי עריסה",
        "ניני יה",
        "לילה טוב",
        "שירים לתינוקות",
        "פעוטון",
    ],
    KidsSubcategory.KIDS_MOVIES: [
        "סרט לילדים",
        "סרט מצויר ארוך",
        "סרט משפחתי",
        "סרט קולנוע לילדים",
    ],
    KidsSubcategory.KIDS_SERIES: [
        "סדרה לילדים",
        "סדרת ילדים",
        "פרקים",
        "עונה",
        "תוכנית טלוויזיה לילדים",
    ],
    KidsSubcategory.JEWISH_HOLIDAYS: [
        "חגי ישראל",
        "חגים יהודיים",
        "חנוכה לילדים",
        "פסח לילדים",
        "פורים לילדים",
        "סוכות לילדים",
        "ראש השנה לילדים",
        "יום כיפור לילדים",
    ],
    KidsSubcategory.TORAH_STORIES: [
        "סיפורי תורה",
        "סיפורים מהתנ״ך",
        "פרשת השבוע",
        "אבות",
        "משה רבנו",
        "אברהם אבינו",
        "דוד המלך",
    ],
    KidsSubcategory.BEDTIME_STORIES: [
        "סיפורי ערב טוב",
        "סיפור לפני השינה",
        "לילה טוב",
        "חלומות פז",
        "סיפורים מרגיעים",
    ],
}

SUBCATEGORY_KEYWORDS_EN = {
    KidsSubcategory.LEARNING_HEBREW: [
        "learn hebrew",
        "hebrew alphabet",
        "alef bet",
        "hebrew letters",
        "read hebrew",
        "write hebrew",
        "hebrew vocabulary",
    ],
    KidsSubcategory.YOUNG_SCIENCE: [
        "young science",
        "science experiments",
        "science for kids",
        "stem kids",
        "discover science",
        "lab experiments",
    ],
    KidsSubcategory.MATH_FUN: [
        "fun math",
        "math for kids",
        "numbers game",
        "counting",
        "addition",
        "subtraction",
        "numberblocks",
    ],
    KidsSubcategory.NATURE_ANIMALS: [
        "nature",
        "animals",
        "wildlife",
        "zoo",
        "ocean",
        "dinosaurs",
        "jungle",
        "pets",
        "farm animals",
    ],
    KidsSubcategory.INTERACTIVE: [
        "interactive",
        "play along",
        "join in",
        "participate",
        "games",
        "puzzles",
        "riddles",
    ],
    KidsSubcategory.HEBREW_SONGS: [
        "hebrew songs",
        "israeli songs",
        "songs in hebrew",
        "israeli children songs",
    ],
    KidsSubcategory.NURSERY_RHYMES: [
        "nursery rhymes",
        "lullaby",
        "baby songs",
        "toddler songs",
        "cocomelon",
        "little baby bum",
    ],
    KidsSubcategory.KIDS_MOVIES: [
        "kids movie",
        "children movie",
        "family movie",
        "animated movie",
        "feature film kids",
    ],
    KidsSubcategory.KIDS_SERIES: [
        "kids series",
        "children series",
        "tv show kids",
        "episodes",
        "cartoon series",
    ],
    KidsSubcategory.JEWISH_HOLIDAYS: [
        "jewish holidays kids",
        "hanukkah for kids",
        "passover for kids",
        "purim for kids",
        "sukkot kids",
        "rosh hashanah kids",
    ],
    KidsSubcategory.TORAH_STORIES: [
        "torah stories",
        "bible stories kids",
        "parsha",
        "moses story",
        "abraham story",
        "david king",
    ],
    KidsSubcategory.BEDTIME_STORIES: [
        "bedtime stories",
        "goodnight stories",
        "sleep stories",
        "calming stories",
        "story before sleep",
    ],
}


# Subcategory labels for UI (trilingual)
SUBCATEGORY_LABELS = {
    KidsSubcategory.LEARNING_HEBREW: {
        "he": "לימוד עברית",
        "en": "Learning Hebrew",
        "es": "Aprender Hebreo",
    },
    KidsSubcategory.YOUNG_SCIENCE: {
        "he": "מדע צעיר",
        "en": "Young Science",
        "es": "Ciencia Joven",
    },
    KidsSubcategory.MATH_FUN: {
        "he": "מתמטיקה מהנה",
        "en": "Fun Math",
        "es": "Matemáticas Divertidas",
    },
    KidsSubcategory.NATURE_ANIMALS: {
        "he": "טבע וחיות",
        "en": "Nature & Animals",
        "es": "Naturaleza y Animales",
    },
    KidsSubcategory.INTERACTIVE: {
        "he": "אינטראקטיבי",
        "en": "Interactive",
        "es": "Interactivo",
    },
    KidsSubcategory.HEBREW_SONGS: {
        "he": "שירים בעברית",
        "en": "Hebrew Songs",
        "es": "Canciones en Hebreo",
    },
    KidsSubcategory.NURSERY_RHYMES: {
        "he": "שירי פעוטות",
        "en": "Nursery Rhymes",
        "es": "Canciones de Cuna",
    },
    KidsSubcategory.KIDS_MOVIES: {
        "he": "סרטי ילדים",
        "en": "Kids Movies",
        "es": "Películas para Niños",
    },
    KidsSubcategory.KIDS_SERIES: {
        "he": "סדרות לילדים",
        "en": "Kids Series",
        "es": "Series para Niños",
    },
    KidsSubcategory.JEWISH_HOLIDAYS: {
        "he": "חגי ישראל",
        "en": "Jewish Holidays",
        "es": "Fiestas Judías",
    },
    KidsSubcategory.TORAH_STORIES: {
        "he": "סיפורי תורה",
        "en": "Torah Stories",
        "es": "Historias de la Torá",
    },
    KidsSubcategory.BEDTIME_STORIES: {
        "he": "סיפורי ערב טוב",
        "en": "Bedtime Stories",
        "es": "Cuentos para Dormir",
    },
}


# Age group labels for UI (trilingual)
AGE_GROUP_LABELS = {
    KidsAgeGroup.TODDLERS: {
        "he": "פעוטות (0-3)",
        "en": "Toddlers (0-3)",
        "es": "Bebés (0-3)",
    },
    KidsAgeGroup.PRESCHOOL: {
        "he": "גן ילדים (3-5)",
        "en": "Preschool (3-5)",
        "es": "Preescolar (3-5)",
    },
    KidsAgeGroup.ELEMENTARY: {
        "he": "יסודי (5-10)",
        "en": "Elementary (5-10)",
        "es": "Primaria (5-10)",
    },
    KidsAgeGroup.PRETEEN: {
        "he": "לפני בר/בת מצווה (10-12)",
        "en": "Pre-teen (10-12)",
        "es": "Preadolescentes (10-12)",
    },
}

# Category labels for UI (trilingual)
KIDS_CATEGORY_LABELS = {
    KidsContentCategory.CARTOONS: {
        "he": "סרטונים מצוירים",
        "en": "Cartoons",
        "es": "Dibujos Animados",
    },
    KidsContentCategory.EDUCATIONAL: {
        "he": "תוכניות לימודיות",
        "en": "Educational",
        "es": "Educativo",
    },
    KidsContentCategory.MUSIC: {
        "he": "מוזיקה לילדים",
        "en": "Kids Music",
        "es": "Musica Infantil",
    },
    KidsContentCategory.HEBREW: {
        "he": "לימוד עברית",
        "en": "Learn Hebrew",
        "es": "Aprender Hebreo",
    },
    KidsContentCategory.STORIES: {
        "he": "סיפורים",
        "en": "Stories",
        "es": "Cuentos",
    },
    KidsContentCategory.JEWISH: {
        "he": "יהדות לילדים",
        "en": "Kids Judaism",
        "es": "Judaismo para Ninos",
    },
    KidsContentCategory.ALL: {
        "he": "הכל",
        "en": "All",
        "es": "Todo",
    },
}

# Seed content - always available when no database content found
KIDS_CONTENT_SEED = [
    {
        "id": "seed-hebrew-1",
        "title": "לומדים עברית - אלף בית",
        "title_en": "Learning Hebrew - Alphabet",
        "description": "לומדים את אותיות האלף בית בצורה מהנה",
        "thumbnail": None,
        "duration": "10:00",
        "age_rating": 3,
        "category": KidsContentCategory.HEBREW,
        "educational_tags": ["hebrew", "alphabet"],
        "relevance_score": 10.0,
        "source_type": "seed",
    },
    {
        "id": "seed-jewish-1",
        "title": "סיפורי שבת לילדים",
        "title_en": "Shabbat Stories for Kids",
        "description": "סיפורים יפים על שבת ומסורת יהודית",
        "thumbnail": None,
        "duration": "15:00",
        "age_rating": 5,
        "category": KidsContentCategory.JEWISH,
        "educational_tags": ["jewish", "shabbat"],
        "relevance_score": 9.5,
        "source_type": "seed",
    },
    {
        "id": "seed-music-1",
        "title": "שירי ילדים ישראליים",
        "title_en": "Israeli Kids Songs",
        "description": "אוסף שירי ילדים אהובים בעברית",
        "thumbnail": None,
        "duration": "20:00",
        "age_rating": 3,
        "category": KidsContentCategory.MUSIC,
        "educational_tags": ["music", "hebrew"],
        "relevance_score": 9.0,
        "source_type": "seed",
    },
    {
        "id": "seed-educational-1",
        "title": "מדע לילדים - עולם החיות",
        "title_en": "Science for Kids - Animal World",
        "description": "לומדים על בעלי חיים מרתקים",
        "thumbnail": None,
        "duration": "12:00",
        "age_rating": 5,
        "category": KidsContentCategory.EDUCATIONAL,
        "educational_tags": ["science", "animals"],
        "relevance_score": 8.5,
        "source_type": "seed",
    },
    {
        "id": "seed-stories-1",
        "title": "סיפורים לפני השינה",
        "title_en": "Bedtime Stories",
        "description": "סיפורים מרגיעים לילדים לפני השינה",
        "thumbnail": None,
        "duration": "8:00",
        "age_rating": 3,
        "category": KidsContentCategory.STORIES,
        "educational_tags": ["stories"],
        "relevance_score": 8.0,
        "source_type": "seed",
    },
    {
        "id": "seed-cartoons-1",
        "title": "סרטון מצויר - הרפתקאות",
        "title_en": "Cartoon Adventures",
        "description": "הרפתקאות מצוירות לילדים",
        "thumbnail": None,
        "duration": "25:00",
        "age_rating": 5,
        "category": KidsContentCategory.CARTOONS,
        "educational_tags": ["cartoons"],
        "relevance_score": 7.5,
        "source_type": "seed",
    },
]

