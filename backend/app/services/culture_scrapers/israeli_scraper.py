"""
Israeli culture scraper for Israeli news and content.

Handles Israeli news sources (Ynet, Walla, Mako, etc.) with Hebrew and English keywords.
Migrated from jerusalem_content_service.py to support the Global Cultures system.
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.services.culture_scrapers.base_scraper import (
    BaseCultureScraper,
    CultureHeadlineItem,
)
from app.services.news_scraper import (
    HeadlineItem,
    scrape_jerusalem_news,
    scrape_mako,
    scrape_tel_aviv_news,
    scrape_walla,
    scrape_ynet,
)

logger = logging.getLogger(__name__)


class IsraeliScraper(BaseCultureScraper):
    """
    Scraper for Israeli culture content.

    Covers Israeli news sources with focus on:
    - Jerusalem (Kotel, IDF ceremonies, holy sites)
    - Tel Aviv (beaches, nightlife, tech)
    - General Israeli news
    """

    culture_id = "israeli"
    culture_name = "Israeli"
    primary_language = "he"

    # Hebrew keywords by category
    keywords_native = {
        # Jerusalem categories
        "kotel": [
            "כותל",
            "הכותל המערבי",
            "העיר העתיקה",
            "הר הבית",
            "עיר דוד",
            "הר הזיתים",
        ],
        "idf-ceremony": [
            'טקס צה"ל',
            "טקס צהל",
            "השבעה",
            "גיוס",
            "בר מצווה",
            "בת מצווה",
            "טקס סיום",
            "חיילים בכותל",
        ],
        "diaspora": ["תפוצות", "עלייה", "תגלית", "יהדות העולם", "עולים", "נפש בנפש"],
        "holy-sites": ["מערת המכפלה", "קבר רחל", "מקומות קדושים"],
        "jerusalem-events": ["אירוע בירושלים", "פסטיבל ירושלים", "ירושלים"],
        # Tel Aviv categories
        "beaches": ["חוף", "ים", "חוף הים", "תל אביב חוף"],
        "nightlife": ["מועדון", "לילה", "בילוי", "בר", "מסיבה"],
        "tech": ["הייטק", "סטארטאפ", "טכנולוגיה", "חדשנות"],
        "culture": ["תרבות", "אמנות", "מוזיקה", "תיאטרון", "גלריה"],
        "food": ["אוכל", "מסעדה", "שוק", "שף", "מטבח"],
        # Politics & Security
        "politics": [
            "ממשלה",
            "כנסת",
            "בחירות",
            "ראש הממשלה",
            "שר",
            "פוליטיקה",
            "קואליציה",
            "אופוזיציה",
            "נתניהו",
            "ארדואן",
            "טורקיה",
            "כורדים",
            "דרוזים",
        ],
        "security": [
            "ביטחון",
            'צה"ל',
            "צבא",
            "מלחמה",
            "פיגוע",
            "טרור",
            "חמאס",
            "חיזבאללה",
            "עזה",
            "גבול",
            "רקטות",
            "ברזל",
            "מבצע",
        ],
        # General
        "general": ["ישראל", "חדשות"],
    }

    # English keywords by category
    keywords_english = {
        # Jerusalem categories
        "kotel": [
            "jerusalem",
            "kotel",
            "western wall",
            "old city",
            "temple mount",
            "city of david",
            "mount of olives",
            "har habayit",
        ],
        "idf-ceremony": [
            "idf ceremony",
            "swearing in",
            "graduation",
            "bar mitzvah",
            "bat mitzvah",
            "military ceremony",
            "soldiers kotel",
        ],
        "diaspora": [
            "diaspora",
            "aliyah",
            "birthright",
            "world jewry",
            "jewish world",
            "jews abroad",
            "olim",
            "nefesh b'nefesh",
        ],
        "holy-sites": [
            "cave of the patriarchs",
            "rachel's tomb",
            "machpela",
            "holy sites",
            "sacred places",
        ],
        "jerusalem-events": ["jerusalem event", "jerusalem festival"],
        # Tel Aviv categories
        "beaches": ["beach", "sea", "seaside", "tel aviv beach", "mediterranean"],
        "nightlife": ["club", "nightlife", "party", "bar", "entertainment"],
        "tech": ["tech", "startup", "technology", "innovation", "silicon wadi"],
        "culture": ["culture", "art", "music", "theater", "gallery", "bauhaus"],
        "food": ["food", "restaurant", "market", "chef", "cuisine"],
        # Politics & Security
        "politics": [
            "government",
            "knesset",
            "election",
            "prime minister",
            "minister",
            "politics",
            "coalition",
            "opposition",
            "netanyahu",
            "erdogan",
            "turkey",
            "kurds",
            "druze",
        ],
        "security": [
            "security",
            "idf",
            "army",
            "war",
            "attack",
            "terror",
            "hamas",
            "hezbollah",
            "gaza",
            "border",
            "rockets",
            "iron dome",
            "operation",
        ],
        # General
        "general": ["israel", "news"],
    }

    # Category labels
    category_labels = {
        "kotel": {"he": "הכותל המערבי", "en": "Western Wall", "es": "Muro Occidental"},
        "idf-ceremony": {
            "he": 'טקסי צה"ל',
            "en": "IDF Ceremonies",
            "es": "Ceremonias de las FDI",
        },
        "diaspora": {
            "he": "קשר לתפוצות",
            "en": "Diaspora Connection",
            "es": "Conexion con la Diaspora",
        },
        "holy-sites": {
            "he": "מקומות קדושים",
            "en": "Holy Sites",
            "es": "Lugares Sagrados",
        },
        "jerusalem-events": {
            "he": "אירועים בירושלים",
            "en": "Jerusalem Events",
            "es": "Eventos en Jerusalen",
        },
        "beaches": {"he": "חופים", "en": "Beaches", "es": "Playas"},
        "nightlife": {"he": "חיי לילה", "en": "Nightlife", "es": "Vida Nocturna"},
        "tech": {"he": "הייטק", "en": "Tech", "es": "Tecnologia"},
        "culture": {"he": "תרבות", "en": "Culture", "es": "Cultura"},
        "food": {"he": "אוכל", "en": "Food", "es": "Comida"},
        "politics": {"he": "פוליטיקה", "en": "Politics", "es": "Politica"},
        "security": {"he": "ביטחון", "en": "Security", "es": "Seguridad"},
        "general": {"he": "כללי", "en": "General", "es": "General"},
    }

    # City configurations
    city_configs: Dict[str, Dict[str, Any]] = {
        "jerusalem": {
            "name": "Jerusalem",
            "name_native": "ירושלים",
            "default_category": "jerusalem-events",
            "priority_categories": [
                "kotel",
                "idf-ceremony",
                "diaspora",
                "holy-sites",
                "jerusalem-events",
            ],
            "scrape_function": "scrape_jerusalem_news",
        },
        "tel-aviv": {
            "name": "Tel Aviv",
            "name_native": "תל אביב",
            "default_category": "culture",
            "priority_categories": ["beaches", "nightlife", "tech", "culture", "food"],
            "scrape_function": "scrape_tel_aviv_news",
        },
    }

    async def scrape_headlines(self) -> List[CultureHeadlineItem]:
        """
        Scrape headlines from all Israeli news sources.

        Uses existing news_scraper infrastructure.
        """
        import asyncio

        all_headlines: List[CultureHeadlineItem] = []

        try:
            # Scrape from multiple sources concurrently
            results = await asyncio.gather(
                scrape_ynet(),
                scrape_walla(),
                scrape_mako(),
                return_exceptions=True,
            )

            for result in results:
                if isinstance(result, Exception):
                    logger.error(f"Error scraping Israeli source: {result}")
                    continue

                for headline in result:
                    culture_item = self._convert_headline(headline)
                    all_headlines.append(culture_item)

        except Exception as e:
            logger.error(f"Failed to scrape Israeli headlines: {e}")

        # Calculate relevance and filter
        scored_items = self.filter_by_relevance(all_headlines)

        # Sort by relevance score
        scored_items.sort(key=lambda x: x.relevance_score, reverse=True)

        return scored_items

    async def scrape_city_news(self, city_id: str) -> List[CultureHeadlineItem]:
        """
        Scrape news specific to a city.

        Args:
            city_id: "jerusalem" or "tel-aviv"
        """
        all_headlines: List[CultureHeadlineItem] = []

        try:
            if city_id == "jerusalem":
                # Use the specialized Jerusalem news scraper
                headlines = await scrape_jerusalem_news()
                for headline in headlines:
                    culture_item = self._convert_headline(headline)
                    all_headlines.append(culture_item)

            elif city_id == "tel-aviv":
                # Use the specialized Tel Aviv news scraper
                headlines = await scrape_tel_aviv_news()
                for headline in headlines:
                    culture_item = self._convert_headline(headline)
                    all_headlines.append(culture_item)

            else:
                # Fallback to general Israeli news with city filter
                all_items = await self.scrape_headlines()
                city_config = self.city_configs.get(city_id, {})
                city_name = city_config.get("name_native", city_id)

                # Filter by city name in title/summary
                for item in all_items:
                    text = f"{item.title} {item.summary or ''}".lower()
                    if city_name.lower() in text or city_id.lower() in text:
                        all_headlines.append(item)

        except Exception as e:
            logger.error(f"Failed to scrape {city_id} news: {e}")

        # Calculate relevance and filter
        scored_items = self.filter_by_relevance(all_headlines)

        # Sort by relevance score
        scored_items.sort(key=lambda x: x.relevance_score, reverse=True)

        return scored_items

    def get_search_queries(self, city_name: str) -> List[str]:
        """
        Get search queries for a city in Hebrew and English.

        Args:
            city_name: City name in English
        """
        queries = []

        if city_name.lower() == "jerusalem":
            queries = [
                "ירושלים חדשות",
                "Jerusalem news",
                "הכותל המערבי",
                "Western Wall",
                "עיר דוד",
                "City of David",
            ]
        elif city_name.lower() in ["tel aviv", "tel-aviv"]:
            queries = [
                "תל אביב חדשות",
                "Tel Aviv news",
                "תל אביב הייטק",
                "Tel Aviv tech",
                "תל אביב תרבות",
                "Tel Aviv culture",
            ]
        else:
            # Generic queries
            queries = [
                f"{city_name} חדשות",
                f"{city_name} news",
                f"{city_name} ישראל",
                f"{city_name} Israel",
            ]

        return queries

    def _convert_headline(self, headline: HeadlineItem) -> CultureHeadlineItem:
        """Convert a HeadlineItem to CultureHeadlineItem."""
        return CultureHeadlineItem(
            source=headline.source,
            title=headline.title,
            url=headline.url,
            scraped_at=headline.scraped_at,
            published_at=headline.published_at,
            summary=headline.summary,
            image_url=headline.image_url,
            title_native=headline.title,  # Hebrew is the native language
            summary_native=headline.summary,
            category=None,  # Will be set by calculate_relevance_score
            tags=[],  # Will be set by calculate_relevance_score
            relevance_score=0.0,
            matched_keywords=[],
        )


# Singleton instance
israeli_scraper = IsraeliScraper()
