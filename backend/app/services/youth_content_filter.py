"""
Youth Content Filter Service.

AI-powered filtering for trending topics and news to ensure age-appropriate content
for youngsters (ages 12-17). Filters out mature content, violence, and inappropriate themes.
"""
import json
import logging
from dataclasses import dataclass
from typing import List, Optional

import anthropic
from app.core.config import settings
from app.services.news_analyzer import TrendingTopic

logger = logging.getLogger(__name__)


# Safe categories for youngsters
YOUTH_SAFE_CATEGORIES = {
    "sports",
    "tech",
    "culture",
    "entertainment",
    "economy",  # Economic news (filtered for appropriate topics)
}

# Categories that require careful filtering
YOUTH_CAUTION_CATEGORIES = {
    "politics",  # Some political topics OK, others not
    "security",  # Security news often contains violence
    "general",
}

# Keywords that indicate inappropriate content for youth
YOUTH_UNSAFE_KEYWORDS = [
    # Violence
    "violence",
    "אלימות",
    "terror",
    "טרור",
    "war",
    "מלחמה",
    "killed",
    "נהרג",
    "death",
    "מוות",
    "wounded",
    "פצוע",
    "attack",
    "פיגוע",
    "bombing",
    "הפצצה",
    "shooting",
    "ירי",
    "stabbing",
    "דקירה",
    "murder",
    "רצח",
    "assault",
    "תקיפה",
    # Sexual content
    "sexual",
    "מיני",
    "rape",
    "אונס",
    "harassment",
    "הטרדה מינית",
    # Drugs and alcohol
    "drugs",
    "סמים",
    "narcotics",
    "נרקוטיקה",
    "alcohol abuse",
    "שימוש באלכוהול",
    # Crime
    "crime scene",
    "זירת פשע",
    "corruption",
    "שחיתות",
    "fraud",
    "הונאה",
    # Mature themes
    "adult content",
    "תוכן למבוגרים",
    "explicit",
    "מפורש",
    "graphic",
    "גרפי",
]

# Keywords that indicate safe/educational content for youth
YOUTH_SAFE_KEYWORDS = [
    # Education
    "education",
    "חינוך",
    "school",
    "בית ספר",
    "university",
    "אוניברסיטה",
    "learning",
    "למידה",
    "study",
    "לימודים",
    "science",
    "מדע",
    # Technology
    "tech",
    "טכנולוגיה",
    "innovation",
    "חדשנות",
    "startup",
    "סטארטאפ",
    "app",
    "אפליקציה",
    "coding",
    "תכנות",
    "AI",
    "בינה מלאכותית",
    "gaming",
    "גיימינג",
    "esports",
    "ספורט אלקטרוני",
    # Sports
    "sports",
    "ספורט",
    "basketball",
    "כדורסל",
    "football",
    "כדורגל",
    "olympics",
    "אולימפיאדה",
    "championship",
    "אליפות",
    "team",
    "קבוצה",
    # Culture
    "music",
    "מוזיקה",
    "film",
    "סרט",
    "festival",
    "פסטיבל",
    "art",
    "אמנות",
    "culture",
    "תרבות",
    "concert",
    "קונצרט",
    # Positive news
    "achievement",
    "הישג",
    "success",
    "הצלחה",
    "winner",
    "מנצח",
    "innovation",
    "חדשנות",
    "discovery",
    "גילוי",
    "breakthrough",
    "פריצת דרך",
]


@dataclass
class FilteredTopic:
    """A trending topic with youth appropriateness rating."""

    topic: TrendingTopic
    is_appropriate: bool
    confidence: float  # 0.0-1.0
    filter_reason: Optional[str] = None


async def filter_topics_for_youth(
    topics: List[TrendingTopic], age_group: Optional[str] = None, use_ai: bool = True
) -> List[TrendingTopic]:
    """
    Filter trending topics for youth appropriateness.

    Args:
        topics: List of trending topics to filter
        age_group: Age group (middle_school, high_school) - stricter for younger
        use_ai: Whether to use AI for intelligent filtering

    Returns:
        List of age-appropriate trending topics
    """
    if not topics:
        return []

    # First pass: Quick keyword-based filtering
    quick_filtered = []
    for topic in topics:
        if _is_topic_safe_quick(topic):
            quick_filtered.append(topic)

    # Second pass: AI-powered intelligent filtering (if enabled and API key available)
    if use_ai and settings.ANTHROPIC_API_KEY and quick_filtered:
        ai_filtered = await _ai_filter_topics(quick_filtered, age_group)
        return ai_filtered

    return quick_filtered


def _is_topic_safe_quick(topic: TrendingTopic) -> bool:
    """
    Quick keyword-based safety check.
    Returns True if topic appears safe for youth.
    """
    # Automatically approve safe categories
    if topic.category in YOUTH_SAFE_CATEGORIES:
        # Still check for unsafe keywords even in safe categories
        combined_text = f"{topic.title} {topic.title_en or ''} {topic.summary or ''} {' '.join(topic.keywords)}"
        combined_text_lower = combined_text.lower()

        # Check for unsafe keywords
        for unsafe_keyword in YOUTH_UNSAFE_KEYWORDS:
            if unsafe_keyword.lower() in combined_text_lower:
                logger.debug(
                    f"Topic '{topic.title}' filtered: contains unsafe keyword '{unsafe_keyword}'"
                )
                return False

        return True

    # Caution categories require stricter checking
    if topic.category in YOUTH_CAUTION_CATEGORIES:
        combined_text = f"{topic.title} {topic.title_en or ''} {topic.summary or ''} {' '.join(topic.keywords)}"
        combined_text_lower = combined_text.lower()

        # Check for unsafe keywords
        for unsafe_keyword in YOUTH_UNSAFE_KEYWORDS:
            if unsafe_keyword.lower() in combined_text_lower:
                logger.debug(
                    f"Topic '{topic.title}' filtered: contains unsafe keyword '{unsafe_keyword}'"
                )
                return False

        # If no unsafe keywords, check if it has safe keywords
        safe_score = 0
        for safe_keyword in YOUTH_SAFE_KEYWORDS:
            if safe_keyword.lower() in combined_text_lower:
                safe_score += 1

        # Require at least one safe keyword for caution categories
        if safe_score > 0:
            return True

        # No explicit safe or unsafe signals - be conservative
        logger.debug(
            f"Topic '{topic.title}' filtered: caution category with no clear safe indicators"
        )
        return False

    # Unknown categories - be conservative
    logger.debug(f"Topic '{topic.title}' filtered: unknown category '{topic.category}'")
    return False


async def _ai_filter_topics(
    topics: List[TrendingTopic], age_group: Optional[str] = None
) -> List[TrendingTopic]:
    """
    Use Claude AI to intelligently filter topics for youth appropriateness.

    Analyzes context, sentiment, and content to determine if topics are suitable
    for ages 12-17.
    """
    if not topics:
        return []

    age_description = {
        "middle_school": "ages 12-14 (middle school)",
        "high_school": "ages 15-17 (high school)",
    }.get(age_group, "ages 12-17")

    # Prepare topics for analysis
    topics_text = "\n".join(
        [
            f"{i+1}. {t.title} ({t.category}) - {t.summary or 'No summary'}"
            for i, t in enumerate(topics)
        ]
    )

    prompt = f"""You are a content moderator for a youth platform serving {age_description}.

Analyze these trending topics and determine which are appropriate for this age group.

Topics:
{topics_text}

Filtering criteria:
- EXCLUDE: Graphic violence, terrorism, war casualties, sexual content, crime details
- EXCLUDE: Mature political controversies, corruption scandals
- INCLUDE: Sports, technology, education, positive cultural events
- INCLUDE: Age-appropriate news about achievements, innovation, entertainment
- INCLUDE: Economic news that doesn't involve crime or mature themes

Return ONLY a JSON array of topic numbers (1-indexed) that are appropriate:
{{"appropriate": [1, 3, 5]}}

Consider the age group ({age_description}) when making decisions. Be protective but not overly restrictive."""

    try:
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}],
        )

        # Parse JSON response
        response_text = response.content[0].text.strip()

        # Clean up response
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]

        data = json.loads(response_text)
        appropriate_indices = data.get("appropriate", [])

        # Filter topics based on AI response
        filtered_topics = []
        for idx in appropriate_indices:
            if 1 <= idx <= len(topics):
                filtered_topics.append(topics[idx - 1])

        logger.info(
            f"AI filtered {len(topics)} topics down to {len(filtered_topics)} appropriate for youth"
        )
        return filtered_topics

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse AI filter response: {e}")
        # Fall back to quick filter results
        return topics
    except Exception as e:
        logger.error(f"Error during AI filtering: {e}")
        # Fall back to quick filter results
        return topics


def get_safe_categories_for_youth() -> List[str]:
    """Get list of safe topic categories for youth."""
    return list(YOUTH_SAFE_CATEGORIES)


def get_caution_categories_for_youth() -> List[str]:
    """Get list of categories that require filtering for youth."""
    return list(YOUTH_CAUTION_CATEGORIES)
