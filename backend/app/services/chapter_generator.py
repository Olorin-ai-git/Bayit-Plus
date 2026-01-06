"""
AI Chapter Generator Service.
Uses Claude AI to generate smart chapters for news broadcasts and long-form content.
"""
from datetime import datetime
from typing import List, Optional, Dict, Any
from dataclasses import dataclass, field
import json
import anthropic
from app.core.config import settings


@dataclass
class ChapterItem:
    """A single chapter in a video"""
    start_time: float  # seconds
    end_time: float  # seconds
    title: str  # Hebrew title
    title_en: Optional[str] = None  # English title
    category: str = "general"  # security, tech, culture, politics, sports, economy
    summary: Optional[str] = None  # Brief summary
    keywords: List[str] = field(default_factory=list)


@dataclass
class GeneratedChapters:
    """Result of chapter generation"""
    chapters: List[ChapterItem]
    content_id: str
    content_title: str
    total_duration: float
    generated_at: datetime = field(default_factory=datetime.utcnow)
    source: str = "ai"  # ai, manual


# Category info for chapters
CHAPTER_CATEGORIES = {
    "security": {"he": "ביטחון", "en": "Security", "icon": "🔒"},
    "politics": {"he": "פוליטיקה", "en": "Politics", "icon": "🏛️"},
    "tech": {"he": "טכנולוגיה", "en": "Tech", "icon": "💻"},
    "culture": {"he": "תרבות", "en": "Culture", "icon": "🎭"},
    "sports": {"he": "ספורט", "en": "Sports", "icon": "⚽"},
    "economy": {"he": "כלכלה", "en": "Economy", "icon": "📈"},
    "weather": {"he": "מזג אוויר", "en": "Weather", "icon": "🌤️"},
    "entertainment": {"he": "בידור", "en": "Entertainment", "icon": "🎬"},
    "health": {"he": "בריאות", "en": "Health", "icon": "🏥"},
    "general": {"he": "כללי", "en": "General", "icon": "📰"},
}


async def generate_chapters_from_title(
    content_id: str,
    content_title: str,
    duration: float,
    description: Optional[str] = None,
    is_news: bool = True,
) -> GeneratedChapters:
    """
    Generate AI chapters based on content title and description.
    This is a lightweight generation that estimates chapters based on typical news structure.
    """
    if is_news:
        return await _generate_news_chapters(content_id, content_title, duration, description)
    else:
        return await _generate_general_chapters(content_id, content_title, duration, description)


async def _generate_news_chapters(
    content_id: str,
    content_title: str,
    duration: float,
    description: Optional[str] = None,
) -> GeneratedChapters:
    """
    Generate chapters for news broadcast content.
    Uses Claude to analyze the title/description and create sensible chapter structure.
    """
    prompt = f"""אתה מחלק שידורי חדשות לפרקים. בהינתן הפרטים הבאים, צור רשימת פרקים לשידור החדשות.

כותרת: {content_title}
{f"תיאור: {description}" if description else ""}
משך: {int(duration)} שניות ({int(duration // 60)} דקות)

צור רשימת פרקים בפורמט JSON:
{{
    "chapters": [
        {{
            "start_time": 0,
            "end_time": 300,
            "title": "כותרת הפרק בעברית",
            "title_en": "Chapter title in English",
            "category": "security|politics|tech|culture|sports|economy|weather|entertainment|health|general",
            "summary": "תקציר קצר (משפט אחד)"
        }}
    ]
}}

הנחיות:
1. צור 4-8 פרקים בהתאם לאורך השידור
2. פרקים טיפוסיים בחדשות: כותרות ראשיות, ביטחון, פוליטיקה, כלכלה, מזג אוויר, ספורט
3. כל פרק צריך להיות לפחות 2 דקות (120 שניות)
4. הזמנים צריכים להיות רציפים (end_time של פרק = start_time של הבא)
5. הפרק האחרון צריך להסתיים ב-{int(duration)} שניות"""

    try:
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1500,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )

        response_text = response.content[0].text.strip()

        # Clean JSON
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]

        data = json.loads(response_text)

        chapters = []
        for c in data.get("chapters", []):
            chapters.append(ChapterItem(
                start_time=float(c.get("start_time", 0)),
                end_time=float(c.get("end_time", duration)),
                title=c.get("title", ""),
                title_en=c.get("title_en"),
                category=c.get("category", "general"),
                summary=c.get("summary"),
            ))

        return GeneratedChapters(
            chapters=chapters,
            content_id=content_id,
            content_title=content_title,
            total_duration=duration,
        )

    except Exception as e:
        print(f"Error generating chapters: {e}")
        # Fallback to default news structure
        return _create_default_news_chapters(content_id, content_title, duration)


def _create_default_news_chapters(
    content_id: str,
    content_title: str,
    duration: float,
) -> GeneratedChapters:
    """
    Create default chapter structure for news when AI fails.
    """
    # Standard news broadcast structure
    segment_duration = duration / 5

    chapters = [
        ChapterItem(
            start_time=0,
            end_time=segment_duration,
            title="כותרות ראשיות",
            title_en="Top Headlines",
            category="general",
        ),
        ChapterItem(
            start_time=segment_duration,
            end_time=segment_duration * 2,
            title="חדשות הביטחון",
            title_en="Security News",
            category="security",
        ),
        ChapterItem(
            start_time=segment_duration * 2,
            end_time=segment_duration * 3,
            title="פוליטיקה וכלכלה",
            title_en="Politics & Economy",
            category="politics",
        ),
        ChapterItem(
            start_time=segment_duration * 3,
            end_time=segment_duration * 4,
            title="ספורט",
            title_en="Sports",
            category="sports",
        ),
        ChapterItem(
            start_time=segment_duration * 4,
            end_time=duration,
            title="מזג אוויר וסיום",
            title_en="Weather & Closing",
            category="weather",
        ),
    ]

    return GeneratedChapters(
        chapters=chapters,
        content_id=content_id,
        content_title=content_title,
        total_duration=duration,
        source="default",
    )


async def _generate_general_chapters(
    content_id: str,
    content_title: str,
    duration: float,
    description: Optional[str] = None,
) -> GeneratedChapters:
    """
    Generate chapters for general (non-news) content.
    """
    prompt = f"""צור פרקים לתוכן הווידאו הבא:

כותרת: {content_title}
{f"תיאור: {description}" if description else ""}
משך: {int(duration)} שניות ({int(duration // 60)} דקות)

צור רשימת פרקים בפורמט JSON:
{{
    "chapters": [
        {{
            "start_time": 0,
            "end_time": 300,
            "title": "כותרת הפרק",
            "title_en": "Chapter title",
            "summary": "תקציר קצר"
        }}
    ]
}}

הנחיות:
1. צור 3-6 פרקים לוגיים
2. כל פרק לפחות 2 דקות
3. הזמנים צריכים להיות רציפים"""

    try:
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1000,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )

        response_text = response.content[0].text.strip()

        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]

        data = json.loads(response_text)

        chapters = []
        for c in data.get("chapters", []):
            chapters.append(ChapterItem(
                start_time=float(c.get("start_time", 0)),
                end_time=float(c.get("end_time", duration)),
                title=c.get("title", ""),
                title_en=c.get("title_en"),
                category="general",
                summary=c.get("summary"),
            ))

        return GeneratedChapters(
            chapters=chapters,
            content_id=content_id,
            content_title=content_title,
            total_duration=duration,
        )

    except Exception as e:
        print(f"Error generating chapters: {e}")
        # Simple fallback - divide into 3 parts
        third = duration / 3
        return GeneratedChapters(
            chapters=[
                ChapterItem(0, third, "פתיחה", "Opening", "general"),
                ChapterItem(third, third * 2, "חלק עיקרי", "Main Content", "general"),
                ChapterItem(third * 2, duration, "סיום", "Closing", "general"),
            ],
            content_id=content_id,
            content_title=content_title,
            total_duration=duration,
            source="default",
        )


async def generate_chapters_from_transcript(
    content_id: str,
    content_title: str,
    duration: float,
    transcript: str,
) -> GeneratedChapters:
    """
    Generate chapters from a transcript.
    This provides more accurate chapters when transcript is available.
    """
    # Limit transcript length
    max_transcript = 8000
    if len(transcript) > max_transcript:
        transcript = transcript[:max_transcript] + "..."

    prompt = f"""נתח את התמליל הבא וצור פרקים לווידאו.

כותרת: {content_title}
משך: {int(duration)} שניות

תמליל:
{transcript}

צור רשימת פרקים בפורמט JSON:
{{
    "chapters": [
        {{
            "start_time": 0,
            "end_time": 300,
            "title": "כותרת הפרק",
            "title_en": "Chapter title",
            "category": "security|politics|tech|culture|sports|economy|weather|entertainment|health|general",
            "summary": "תקציר קצר",
            "keywords": ["מילת מפתח 1", "מילת מפתח 2"]
        }}
    ]
}}

הנחיות:
1. זהה שינויי נושא בתמליל
2. צור פרק לכל נושא עיקרי
3. הערך את הזמנים לפי מיקום בתמליל
4. כל פרק לפחות 90 שניות"""

    try:
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2000,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )

        response_text = response.content[0].text.strip()

        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]

        data = json.loads(response_text)

        chapters = []
        for c in data.get("chapters", []):
            chapters.append(ChapterItem(
                start_time=float(c.get("start_time", 0)),
                end_time=float(c.get("end_time", duration)),
                title=c.get("title", ""),
                title_en=c.get("title_en"),
                category=c.get("category", "general"),
                summary=c.get("summary"),
                keywords=c.get("keywords", []),
            ))

        return GeneratedChapters(
            chapters=chapters,
            content_id=content_id,
            content_title=content_title,
            total_duration=duration,
        )

    except Exception as e:
        print(f"Error generating chapters from transcript: {e}")
        return await generate_chapters_from_title(
            content_id, content_title, duration, None, True
        )


def chapters_to_dict(gen_chapters: GeneratedChapters) -> Dict[str, Any]:
    """Convert generated chapters to dictionary for API response"""
    return {
        "content_id": gen_chapters.content_id,
        "content_title": gen_chapters.content_title,
        "total_duration": gen_chapters.total_duration,
        "generated_at": gen_chapters.generated_at.isoformat(),
        "source": gen_chapters.source,
        "chapters": [
            {
                "start_time": c.start_time,
                "end_time": c.end_time,
                "title": c.title,
                "title_en": c.title_en,
                "category": c.category,
                "category_info": CHAPTER_CATEGORIES.get(c.category, CHAPTER_CATEGORIES["general"]),
                "summary": c.summary,
                "keywords": c.keywords,
                "formatted_start": _format_time(c.start_time),
                "formatted_end": _format_time(c.end_time),
            }
            for c in gen_chapters.chapters
        ],
    }


def _format_time(seconds: float) -> str:
    """Format seconds as HH:MM:SS or MM:SS"""
    total_seconds = int(seconds)
    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    secs = total_seconds % 60

    if hours > 0:
        return f"{hours}:{minutes:02d}:{secs:02d}"
    return f"{minutes}:{secs:02d}"
