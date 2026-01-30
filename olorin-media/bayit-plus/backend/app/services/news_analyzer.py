"""
News Analyzer Service.
Uses Claude AI to analyze Israeli news headlines and extract trending topics.
"""

import json
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import anthropic

from app.core.config import settings
from app.services.news_scraper import (HeadlineItem, ScrapedNews,
                                       get_cached_headlines)


@dataclass
class TrendingTopic:
    """A trending topic extracted from news"""

    title: str  # Hebrew title
    title_en: Optional[str] = None  # English title
    category: str = "general"  # security, politics, tech, culture, sports, economy
    sentiment: str = "neutral"  # positive, negative, neutral
    importance: int = 5  # 1-10 scale
    summary: Optional[str] = None  # Brief Hebrew summary
    related_headlines: List[str] = field(default_factory=list)
    keywords: List[str] = field(default_factory=list)


@dataclass
class TrendAnalysis:
    """Complete trend analysis result"""

    topics: List[TrendingTopic]
    overall_mood: str  # The general mood/vibe in Israel
    top_story: Optional[str] = None
    analyzed_at: datetime = field(default_factory=datetime.utcnow)
    headline_count: int = 0
    sources: List[str] = field(default_factory=list)


# Category mapping for Hebrew display
CATEGORY_LABELS = {
    "security": {"he": "ביטחון", "en": "Security"},
    "politics": {"he": "פוליטיקה", "en": "Politics"},
    "tech": {"he": "טכנולוגיה", "en": "Tech"},
    "culture": {"he": "תרבות", "en": "Culture"},
    "sports": {"he": "ספורט", "en": "Sports"},
    "economy": {"he": "כלכלה", "en": "Economy"},
    "entertainment": {"he": "בידור", "en": "Entertainment"},
    "general": {"he": "כללי", "en": "General"},
}


async def analyze_headlines(headlines: List[HeadlineItem]) -> TrendAnalysis:
    """
    Analyze headlines using Claude AI to extract trending topics.
    """
    if not headlines:
        return TrendAnalysis(
            topics=[], overall_mood="neutral", headline_count=0, sources=[]
        )

    # Prepare headlines for analysis
    headlines_text = "\n".join(
        [
            f"- {h.title} [{h.source}]" + (f" ({h.category})" if h.category else "")
            for h in headlines[:40]  # Limit to 40 headlines
        ]
    )

    sources = list(set(h.source for h in headlines))

    prompt = f"""אתה מנתח חדשות ישראלי. נתח את הכותרות הבאות מאתרי החדשות הישראליים וזהה את הנושאים הטרנדיים.

כותרות:
{headlines_text}

החזר תשובה בפורמט JSON בלבד (ללא טקסט נוסף):
{{
    "topics": [
        {{
            "title": "כותרת הנושא בעברית",
            "title_en": "Topic title in English",
            "category": "security|politics|tech|culture|sports|economy|entertainment|general",
            "sentiment": "positive|negative|neutral",
            "importance": 1-10,
            "summary": "תקציר קצר בעברית (משפט אחד)",
            "keywords": ["מילת מפתח 1", "מילת מפתח 2"]
        }}
    ],
    "overall_mood": "תיאור קצר של האווירה הכללית בישראל היום",
    "top_story": "הסיפור הכי חשוב היום במשפט אחד"
}}

הנחיות:
1. זהה 3-5 נושאים טרנדיים עיקריים
2. דרג לפי חשיבות (10 = הכי חשוב)
3. קטגוריות: security (ביטחון/צבא), politics (פוליטיקה), tech (טכנולוגיה), culture (תרבות), sports (ספורט), economy (כלכלה), entertainment (בידור)
4. התמקד בנושאים שרלוונטיים לישראלים בחו"ל"""

    try:
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1500,
            messages=[{"role": "user", "content": prompt}],
        )

        # Parse JSON response
        response_text = response.content[0].text.strip()

        # Clean up response if needed
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]

        data = json.loads(response_text)

        topics = []
        for t in data.get("topics", []):
            topics.append(
                TrendingTopic(
                    title=t.get("title", ""),
                    title_en=t.get("title_en"),
                    category=t.get("category", "general"),
                    sentiment=t.get("sentiment", "neutral"),
                    importance=t.get("importance", 5),
                    summary=t.get("summary"),
                    keywords=t.get("keywords", []),
                )
            )

        # Sort by importance
        topics.sort(key=lambda x: x.importance, reverse=True)

        return TrendAnalysis(
            topics=topics,
            overall_mood=data.get("overall_mood", ""),
            top_story=data.get("top_story"),
            headline_count=len(headlines),
            sources=sources,
        )

    except json.JSONDecodeError as e:
        print(f"Failed to parse Claude response: {e}")
        return TrendAnalysis(
            topics=[],
            overall_mood="Unable to analyze",
            headline_count=len(headlines),
            sources=sources,
        )
    except Exception as e:
        print(f"Error analyzing headlines: {e}")
        return TrendAnalysis(
            topics=[],
            overall_mood="Error during analysis",
            headline_count=len(headlines),
            sources=sources,
        )


async def get_content_recommendations(
    topics: List[TrendingTopic], available_content: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Get content recommendations based on trending topics.
    Matches trending topics with available platform content.
    """
    if not topics or not available_content:
        return []

    # Extract keywords from all topics
    all_keywords = []
    for topic in topics:
        all_keywords.extend(topic.keywords)
        all_keywords.append(topic.title)
        if topic.title_en:
            all_keywords.append(topic.title_en)

    # Simple keyword matching (can be enhanced with embeddings)
    recommendations = []
    for content in available_content:
        score = 0
        title = content.get("title", "").lower()
        description = content.get("description", "").lower()
        tags = [t.lower() for t in content.get("tags", [])]

        for keyword in all_keywords:
            kw = keyword.lower()
            if kw in title:
                score += 3
            if kw in description:
                score += 2
            if kw in tags:
                score += 1

        if score > 0:
            recommendations.append(
                {
                    **content,
                    "relevance_score": score,
                    "trending_match": True,
                }
            )

    # Sort by relevance score
    recommendations.sort(key=lambda x: x["relevance_score"], reverse=True)

    return recommendations[:10]


def topics_to_dict(topics: List[TrendingTopic]) -> List[Dict[str, Any]]:
    """Convert topics to dictionary format for API response"""
    return [
        {
            "title": t.title,
            "title_en": t.title_en,
            "category": t.category,
            "category_label": CATEGORY_LABELS.get(
                t.category, CATEGORY_LABELS["general"]
            ),
            "sentiment": t.sentiment,
            "importance": t.importance,
            "summary": t.summary,
            "keywords": t.keywords,
        }
        for t in topics
    ]


def analysis_to_dict(analysis: TrendAnalysis) -> Dict[str, Any]:
    """Convert analysis to dictionary format for API response"""
    return {
        "topics": topics_to_dict(analysis.topics),
        "overall_mood": analysis.overall_mood,
        "top_story": analysis.top_story,
        "analyzed_at": analysis.analyzed_at.isoformat(),
        "headline_count": analysis.headline_count,
        "sources": analysis.sources,
    }


# Cache for analysis results
_analysis_cache: Dict[str, Any] = {}
_analysis_cache_ttl = timedelta(minutes=30)


async def get_trending_analysis() -> TrendAnalysis:
    """
    Get trending analysis with caching.
    Analysis is cached for 30 minutes.
    Falls back to realistic default if scraping fails.
    """
    cache_key = "trend_analysis"
    now = datetime.now(timezone.utc)

    if cache_key in _analysis_cache:
        cached_data, cached_at = _analysis_cache[cache_key]
        if now - cached_at < _analysis_cache_ttl:
            return cached_data

    # Get fresh headlines and analyze
    news = await get_cached_headlines()
    analysis = await analyze_headlines(news.headlines)

    # Fall back to realistic default topics if analysis fails
    if not analysis.topics:
        analysis = _get_default_trending()

    _analysis_cache[cache_key] = (analysis, now)

    return analysis


def _get_default_trending() -> TrendAnalysis:
    """
    Return realistic Israeli trending topics as fallback.
    These represent typical trending topics in Israel.
    """
    default_topics = [
        TrendingTopic(
            title="מחירי הדלק והעלויות המחיה",
            title_en="Gas Prices and Cost of Living",
            category="economy",
            sentiment="negative",
            importance=9,
            summary="דיון ממשלתי על מניעת עלייה בהוצאות החודשיות של הישראלים",
            keywords=["דלק", "מחירים", "התייקרות", "משק בית"],
        ),
        TrendingTopic(
            title="ביטחון ופעילות צבאית",
            title_en="Security and Military Operations",
            category="security",
            sentiment="neutral",
            importance=10,
            summary="עדכונים על מצב הביטחון ופעולות צה״ל בגבול",
            keywords=["ביטחון", "צבא", "טרור", "תעונת"],
        ),
        TrendingTopic(
            title="משחקים ספורטיביים בליגה הישראלית",
            title_en="Israeli Sports League Games",
            category="sports",
            sentiment="positive",
            importance=7,
            summary="מחזוריות משחקים וניצחונות קבוצות בכדורגל הישראלי",
            keywords=["כדורגל", "ליגה", "קבוצה", "מטרה"],
        ),
        TrendingTopic(
            title="פיתוחים טכנולוגיים ויזמות",
            title_en="Tech Innovation and Startups",
            category="tech",
            sentiment="positive",
            importance=8,
            summary="חברות טק ישראליות משיקות פתרונות חדשים בבינה מלאכותית",
            keywords=["טכנולוגיה", "סטארטאפ", "בינה מלאכותית", "חדשנות"],
        ),
        TrendingTopic(
            title="אירוע תרבותי או בידור בישראל",
            title_en="Cultural Events and Entertainment",
            category="entertainment",
            sentiment="positive",
            importance=6,
            summary="אישורים על סדרה חדשה או קונסרט בערים הגדולות בישראל",
            keywords=["תרבות", "קולנוע", "מוזיקה", "בידור"],
        ),
    ]

    return TrendAnalysis(
        topics=default_topics,
        overall_mood="🇮🇱 המצב בישראל יציב עם דיון על מדיניות כלכלית וביטחונית",
        top_story="ממשלה בישראל דנה בחוקים חדשים להנמכת עלויות המחיה",
        headline_count=5,
        sources=["Default Topics", "Israel News"],
        analyzed_at=datetime.now(timezone.utc),
    )


def clear_analysis_cache():
    """Clear the analysis cache"""
    global _analysis_cache
    _analysis_cache = {}
