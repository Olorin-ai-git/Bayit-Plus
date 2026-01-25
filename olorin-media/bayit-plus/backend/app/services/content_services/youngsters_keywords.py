"""
Youngsters Content Keywords Module - Keyword definitions for teen content filtering.

Contains bilingual (Hebrew/English) keyword sets for:
- Content categorization (trending, news, culture, educational, music, entertainment, sports, tech, judaism)
- Subcategory detection (TikTok trends, viral videos, memes, study help, gaming, etc.)
- Age group classification (middle school, high school)
- UI labels (trilingual: he, en, es)
- Seed content (fallback content when database is empty)
"""

from app.models.youngsters_content import (YoungstersAgeGroup,
                                           YoungstersContentCategory,
                                           YoungstersSubcategory)

# Allowed content ratings for youngsters (PG-13 and below)
YOUNGSTERS_ALLOWED_RATINGS = ["G", "PG", "PG-13", "TV-G", "TV-PG", "TV-14"]

# Dual-language keyword filters for relevance scoring and categorization
YOUNGSTERS_KEYWORDS_HE = {
    "trending": [
        "טרנד",
        "ויראלי",
        "פופולרי",
        "חם עכשיו",
        "TikTok",
        "טיקטוק",
        "אינסטגרם",
        "מה שרץ",
        "מה שקורה",
    ],
    "news": [
        "חדשות",
        "אקטואליה",
        "מה קורה בעולם",
        "עדכונים",
        "ידיעות",
        "חדשות לנוער",
        "סיקור",
    ],
    "culture": [
        "תרבות",
        "אמנות",
        "קולנוע",
        "מוזיקה",
        "אוכל",
        "סטייל",
        "אופנה",
        "טרנדים",
    ],
    "educational": [
        "לימודי",
        "בגרויות",
        "סיכומים",
        "הכנה למבחן",
        "לימודים",
        "חינוך",
        "קריירה",
        "מיומנויות חיים",
    ],
    "music": [
        "מוזיקה",
        "שירים",
        "אומנים",
        "להקות",
        "קליפים",
        "פסטיבלים",
        "הופעות",
    ],
    "entertainment": [
        "בידור",
        "סדרות",
        "סרטים",
        "נטפליקס",
        "צפייה",
        "סטרימינג",
        "שואו",
    ],
    "sports": [
        "ספורט",
        "כדורגל",
        "כדורסל",
        "NBA",
        "מכבי",
        "הפועל",
        "משחקים",
        "ליגה",
    ],
    "tech": [
        "טכנולוגיה",
        "גיימינג",
        "משחקים",
        "קודינג",
        "פורטנייט",
        "גאדג'טים",
        "אייפון",
        "תכנות",
    ],
    "judaism": [
        "יהדות",
        "בר מצווה",
        "בת מצווה",
        "תורה",
        "שיעור",
        "רב",
        "היסטוריה יהודית",
    ],
}

YOUNGSTERS_KEYWORDS_EN = {
    "trending": [
        "trending",
        "viral",
        "popular",
        "hot now",
        "tiktok",
        "instagram",
        "what's trending",
        "buzz",
    ],
    "news": [
        "news",
        "current events",
        "what's happening",
        "updates",
        "youth news",
        "teen news",
    ],
    "culture": [
        "culture",
        "arts",
        "movies",
        "music scene",
        "film culture",
        "food culture",
        "style",
    ],
    "educational": [
        "educational",
        "study",
        "exam prep",
        "learning",
        "career",
        "life skills",
        "college prep",
    ],
    "music": [
        "music",
        "songs",
        "artists",
        "bands",
        "music videos",
        "concerts",
        "festivals",
    ],
    "entertainment": [
        "entertainment",
        "series",
        "movies",
        "netflix",
        "streaming",
        "shows",
        "teen drama",
    ],
    "sports": [
        "sports",
        "football",
        "basketball",
        "soccer",
        "nba",
        "games",
        "league",
    ],
    "tech": [
        "technology",
        "gaming",
        "coding",
        "fortnite",
        "gadgets",
        "iphone",
        "programming",
        "tech",
    ],
    "judaism": [
        "judaism",
        "bar mitzvah",
        "bat mitzvah",
        "torah",
        "rabbi",
        "jewish history",
        "teen jewish",
    ],
}


# Subcategory-specific keyword filters
SUBCATEGORY_KEYWORDS_HE = {
    YoungstersSubcategory.TIKTOK_TRENDS: [
        "TikTok",
        "טיקטוק",
        "טרנד TikTok",
        "וידאו ויראלי",
        "אתגר TikTok",
    ],
    YoungstersSubcategory.VIRAL_VIDEOS: [
        "ויראלי",
        "וידאו ויראלי",
        "התפוצצות ברשת",
        "צפו המון",
    ],
    YoungstersSubcategory.MEMES: [
        "מימז",
        "ממים",
        "בדיחות ברשת",
        "קומיקס",
    ],
    YoungstersSubcategory.ISRAEL_NEWS: [
        "חדשות ישראל",
        "ישראל",
        "חדשות מקומיות",
        "אקטואליה ישראלית",
    ],
    YoungstersSubcategory.WORLD_NEWS: [
        "חדשות העולם",
        "בעולם",
        "חדשות בינלאומיות",
        "גלובלי",
    ],
    YoungstersSubcategory.SCIENCE_NEWS: [
        "חדשות מדע",
        "מדע",
        "מחקר",
        "גילוי מדעי",
        "טכנולוגיה",
    ],
    YoungstersSubcategory.SPORTS_NEWS: [
        "חדשות ספורט",
        "ספורט",
        "עדכוני ספורט",
        "תוצאות משחק",
    ],
    YoungstersSubcategory.MUSIC_CULTURE: [
        "תרבות מוזיקלית",
        "סצנת מוזיקה",
        "אומנים",
        "פסטיבלים",
    ],
    YoungstersSubcategory.FILM_CULTURE: [
        "תרבות קולנוע",
        "סרטים",
        "קולנוע",
        "ביקורת סרטים",
    ],
    YoungstersSubcategory.ART_CULTURE: [
        "אמנות",
        "גלריה",
        "ציור",
        "פיסול",
        "אמנות רחוב",
    ],
    YoungstersSubcategory.FOOD_CULTURE: [
        "תרבות אוכל",
        "אוכל",
        "מתכונים",
        "בישול",
        "מסעדות",
    ],
    YoungstersSubcategory.STUDY_HELP: [
        "עזרה בלימודים",
        "סיכומים",
        "בגרויות",
        "הכנה למבחן",
        "שיעורים",
    ],
    YoungstersSubcategory.CAREER_PREP: [
        "הכנה לקריירה",
        "מקצועות",
        "השכלה גבוהה",
        "אוניברסיטה",
        "קורסים",
    ],
    YoungstersSubcategory.LIFE_SKILLS: [
        "מיומנויות חיים",
        "חיים עצמאיים",
        "כישורים אישיים",
        "ניהול כסף",
    ],
    YoungstersSubcategory.TEEN_MOVIES: [
        "סרטי נוער",
        "סרטים לבני נוער",
        "דרמה נוערית",
    ],
    YoungstersSubcategory.TEEN_SERIES: [
        "סדרות נוער",
        "סדרות לבני נוער",
        "נטפליקס נוער",
    ],
    YoungstersSubcategory.GAMING: [
        "גיימינג",
        "משחקי וידאו",
        "פורטנייט",
        "e-sports",
        "גיימרים",
    ],
    YoungstersSubcategory.CODING: [
        "קודינג",
        "תכנות",
        "פיתוח",
        "למידת קוד",
        "פייתון",
        "JavaScript",
    ],
    YoungstersSubcategory.GADGETS: [
        "גאדג'טים",
        "טכנולוגיה",
        "אייפון",
        "סמארטפון",
        "ביקורות טכנולוגיות",
    ],
    YoungstersSubcategory.BAR_BAT_MITZVAH: [
        "בר מצווה",
        "בת מצווה",
        "מצווה",
        "13 שנים",
        "טקס בר מצווה",
    ],
    YoungstersSubcategory.TEEN_TORAH: [
        "תורה לנוער",
        "שיעור תורה",
        "פרשת השבוע",
        "גמרא לנוער",
    ],
    YoungstersSubcategory.JEWISH_HISTORY: [
        "היסטוריה יהודית",
        "תולדות עם ישראל",
        "אירועים יהודיים",
        "שואה",
    ],
}

SUBCATEGORY_KEYWORDS_EN = {
    YoungstersSubcategory.TIKTOK_TRENDS: [
        "tiktok trends",
        "tiktok challenge",
        "viral tiktok",
    ],
    YoungstersSubcategory.VIRAL_VIDEOS: [
        "viral video",
        "viral",
        "trending video",
        "went viral",
    ],
    YoungstersSubcategory.MEMES: [
        "memes",
        "funny memes",
        "internet memes",
    ],
    YoungstersSubcategory.ISRAEL_NEWS: [
        "israel news",
        "israel",
        "israeli news",
    ],
    YoungstersSubcategory.WORLD_NEWS: [
        "world news",
        "international news",
        "global news",
    ],
    YoungstersSubcategory.SCIENCE_NEWS: [
        "science news",
        "science",
        "research",
        "scientific discovery",
    ],
    YoungstersSubcategory.SPORTS_NEWS: [
        "sports news",
        "sports updates",
        "game results",
    ],
    YoungstersSubcategory.MUSIC_CULTURE: [
        "music culture",
        "music scene",
        "artists",
        "festivals",
    ],
    YoungstersSubcategory.FILM_CULTURE: [
        "film culture",
        "movies",
        "cinema",
        "film reviews",
    ],
    YoungstersSubcategory.ART_CULTURE: [
        "art",
        "gallery",
        "painting",
        "street art",
    ],
    YoungstersSubcategory.FOOD_CULTURE: [
        "food culture",
        "recipes",
        "cooking",
        "restaurants",
    ],
    YoungstersSubcategory.STUDY_HELP: [
        "study help",
        "exam prep",
        "homework help",
        "tutoring",
    ],
    YoungstersSubcategory.CAREER_PREP: [
        "career prep",
        "college",
        "university",
        "courses",
    ],
    YoungstersSubcategory.LIFE_SKILLS: [
        "life skills",
        "personal skills",
        "money management",
    ],
    YoungstersSubcategory.TEEN_MOVIES: [
        "teen movies",
        "youth movies",
        "teen drama",
    ],
    YoungstersSubcategory.TEEN_SERIES: [
        "teen series",
        "youth series",
        "netflix teen",
    ],
    YoungstersSubcategory.GAMING: [
        "gaming",
        "video games",
        "fortnite",
        "e-sports",
        "gamers",
    ],
    YoungstersSubcategory.CODING: [
        "coding",
        "programming",
        "learn to code",
        "python",
        "javascript",
    ],
    YoungstersSubcategory.GADGETS: [
        "gadgets",
        "tech",
        "iphone",
        "smartphone",
        "tech reviews",
    ],
    YoungstersSubcategory.BAR_BAT_MITZVAH: [
        "bar mitzvah",
        "bat mitzvah",
        "mitzvah",
        "13 years",
    ],
    YoungstersSubcategory.TEEN_TORAH: [
        "teen torah",
        "torah class",
        "parsha",
        "gemara",
    ],
    YoungstersSubcategory.JEWISH_HISTORY: [
        "jewish history",
        "history of israel",
        "holocaust",
    ],
}


# Subcategory labels for UI (trilingual)
SUBCATEGORY_LABELS = {
    YoungstersSubcategory.TIKTOK_TRENDS: {
        "he": "טרנדים TikTok",
        "en": "TikTok Trends",
        "es": "Tendencias TikTok",
    },
    YoungstersSubcategory.VIRAL_VIDEOS: {
        "he": "וידאו ויראלי",
        "en": "Viral Videos",
        "es": "Videos Virales",
    },
    YoungstersSubcategory.MEMES: {
        "he": "ממים",
        "en": "Memes",
        "es": "Memes",
    },
    YoungstersSubcategory.ISRAEL_NEWS: {
        "he": "חדשות ישראל",
        "en": "Israel News",
        "es": "Noticias de Israel",
    },
    YoungstersSubcategory.WORLD_NEWS: {
        "he": "חדשות העולם",
        "en": "World News",
        "es": "Noticias Mundiales",
    },
    YoungstersSubcategory.SCIENCE_NEWS: {
        "he": "חדשות מדע",
        "en": "Science News",
        "es": "Noticias de Ciencia",
    },
    YoungstersSubcategory.SPORTS_NEWS: {
        "he": "חדשות ספורט",
        "en": "Sports News",
        "es": "Noticias Deportivas",
    },
    YoungstersSubcategory.MUSIC_CULTURE: {
        "he": "תרבות מוזיקלית",
        "en": "Music Culture",
        "es": "Cultura Musical",
    },
    YoungstersSubcategory.FILM_CULTURE: {
        "he": "תרבות קולנוע",
        "en": "Film Culture",
        "es": "Cultura Cinematográfica",
    },
    YoungstersSubcategory.ART_CULTURE: {
        "he": "אמנות",
        "en": "Art Culture",
        "es": "Cultura Artística",
    },
    YoungstersSubcategory.FOOD_CULTURE: {
        "he": "תרבות אוכל",
        "en": "Food Culture",
        "es": "Cultura Gastronómica",
    },
    YoungstersSubcategory.STUDY_HELP: {
        "he": "עזרה בלימודים",
        "en": "Study Help",
        "es": "Ayuda de Estudio",
    },
    YoungstersSubcategory.CAREER_PREP: {
        "he": "הכנה לקריירה",
        "en": "Career Prep",
        "es": "Preparación Profesional",
    },
    YoungstersSubcategory.LIFE_SKILLS: {
        "he": "מיומנויות חיים",
        "en": "Life Skills",
        "es": "Habilidades de Vida",
    },
    YoungstersSubcategory.TEEN_MOVIES: {
        "he": "סרטי נוער",
        "en": "Teen Movies",
        "es": "Películas para Adolescentes",
    },
    YoungstersSubcategory.TEEN_SERIES: {
        "he": "סדרות נוער",
        "en": "Teen Series",
        "es": "Series para Adolescentes",
    },
    YoungstersSubcategory.GAMING: {
        "he": "גיימינג",
        "en": "Gaming",
        "es": "Videojuegos",
    },
    YoungstersSubcategory.CODING: {
        "he": "קודינג",
        "en": "Coding",
        "es": "Programación",
    },
    YoungstersSubcategory.GADGETS: {
        "he": "גאדג'טים",
        "en": "Gadgets",
        "es": "Tecnología",
    },
    YoungstersSubcategory.BAR_BAT_MITZVAH: {
        "he": "בר/בת מצווה",
        "en": "Bar/Bat Mitzvah",
        "es": "Bar/Bat Mitzvá",
    },
    YoungstersSubcategory.TEEN_TORAH: {
        "he": "תורה לנוער",
        "en": "Teen Torah",
        "es": "Torá para Jóvenes",
    },
    YoungstersSubcategory.JEWISH_HISTORY: {
        "he": "היסטוריה יהודית",
        "en": "Jewish History",
        "es": "Historia Judía",
    },
}


# Age group labels for UI (trilingual)
AGE_GROUP_LABELS = {
    YoungstersAgeGroup.MIDDLE_SCHOOL: {
        "he": "חטיבת ביניים (12-14)",
        "en": "Middle School (12-14)",
        "es": "Secundaria (12-14)",
    },
    YoungstersAgeGroup.HIGH_SCHOOL: {
        "he": "תיכון (15-17)",
        "en": "High School (15-17)",
        "es": "Preparatoria (15-17)",
    },
}

# Category labels for UI (trilingual)
YOUNGSTERS_CATEGORY_LABELS = {
    YoungstersContentCategory.TRENDING: {
        "he": "טרנדים",
        "en": "Trending",
        "es": "Tendencias",
    },
    YoungstersContentCategory.NEWS: {
        "he": "חדשות לנוער",
        "en": "Youth News",
        "es": "Noticias Juveniles",
    },
    YoungstersContentCategory.CULTURE: {
        "he": "תרבות",
        "en": "Culture",
        "es": "Cultura",
    },
    YoungstersContentCategory.EDUCATIONAL: {
        "he": "לימודי",
        "en": "Educational",
        "es": "Educativo",
    },
    YoungstersContentCategory.MUSIC: {
        "he": "מוזיקה",
        "en": "Music",
        "es": "Música",
    },
    YoungstersContentCategory.ENTERTAINMENT: {
        "he": "בידור",
        "en": "Entertainment",
        "es": "Entretenimiento",
    },
    YoungstersContentCategory.SPORTS: {
        "he": "ספורט",
        "en": "Sports",
        "es": "Deportes",
    },
    YoungstersContentCategory.TECH: {
        "he": "טכנולוגיה",
        "en": "Technology",
        "es": "Tecnología",
    },
    YoungstersContentCategory.JUDAISM: {
        "he": "יהדות לנוער",
        "en": "Teen Judaism",
        "es": "Judaísmo Juvenil",
    },
    YoungstersContentCategory.ALL: {
        "he": "הכל",
        "en": "All",
        "es": "Todo",
    },
}

# Seed content - always available when no database content found
YOUNGSTERS_CONTENT_SEED = [
    {
        "id": "seed-trending-1",
        "title": "טרנדים ויראליים השבוע",
        "title_en": "This Week's Viral Trends",
        "description": "סקירת הטרנדים החמים ביותר ברשתות החברתיות",
        "thumbnail": None,
        "duration": "10:00",
        "age_rating": 13,
        "category": YoungstersContentCategory.TRENDING,
        "educational_tags": ["trending", "social-media"],
        "relevance_score": 10.0,
        "source_type": "seed",
    },
    {
        "id": "seed-news-1",
        "title": "חדשות השבוע לנוער",
        "title_en": "This Week's Youth News",
        "description": "עדכוני חדשות מותאמים לגילאי 12-17",
        "thumbnail": None,
        "duration": "15:00",
        "age_rating": 12,
        "category": YoungstersContentCategory.NEWS,
        "educational_tags": ["news", "current-events"],
        "relevance_score": 9.5,
        "source_type": "seed",
    },
    {
        "id": "seed-educational-1",
        "title": "הכנה לבגרויות - טיפים וטריקים",
        "title_en": "Exam Prep - Tips and Tricks",
        "description": "עזרה בהכנה למבחני בגרות",
        "thumbnail": None,
        "duration": "20:00",
        "age_rating": 15,
        "category": YoungstersContentCategory.EDUCATIONAL,
        "educational_tags": ["study", "exams"],
        "relevance_score": 9.0,
        "source_type": "seed",
    },
    {
        "id": "seed-tech-1",
        "title": "למידת קודינג למתחילים",
        "title_en": "Coding for Beginners",
        "description": "מבוא לתכנות בשפת Python",
        "thumbnail": None,
        "duration": "25:00",
        "age_rating": 13,
        "category": YoungstersContentCategory.TECH,
        "educational_tags": ["coding", "technology"],
        "relevance_score": 8.5,
        "source_type": "seed",
    },
    {
        "id": "seed-judaism-1",
        "title": "הכנה לבר/בת מצווה",
        "title_en": "Bar/Bat Mitzvah Preparation",
        "description": "כל מה שצריך לדעת על בר ובת מצווה",
        "thumbnail": None,
        "duration": "18:00",
        "age_rating": 12,
        "category": YoungstersContentCategory.JUDAISM,
        "educational_tags": ["bar-mitzvah", "jewish"],
        "relevance_score": 8.0,
        "source_type": "seed",
    },
    {
        "id": "seed-sports-1",
        "title": "סקירת הליגה - עדכוני ספורט",
        "title_en": "League Highlights - Sports Updates",
        "description": "עדכונים וסיכומי משחקים",
        "thumbnail": None,
        "duration": "12:00",
        "age_rating": 12,
        "category": YoungstersContentCategory.SPORTS,
        "educational_tags": ["sports"],
        "relevance_score": 7.5,
        "source_type": "seed",
    },
]
