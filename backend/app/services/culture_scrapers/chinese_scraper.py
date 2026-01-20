"""
Chinese culture scraper for Chinese news and content.

Handles Chinese news sources (Sina, Sohu, NetEase, Xinhua) with Mandarin and English keywords.
"""

import logging
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx
from app.core.config import settings
from app.services.culture_scrapers.base_scraper import (
    DEFAULT_HEADERS,
    BaseCultureScraper,
    CultureHeadlineItem,
)
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)


class ChineseScraper(BaseCultureScraper):
    """
    Scraper for Chinese culture content.

    Covers major Chinese news sources with focus on:
    - Beijing (history, culture, politics)
    - Shanghai (finance, tech, fashion)
    - General Chinese news for diaspora
    """

    culture_id = "chinese"
    culture_name = "Chinese"
    primary_language = "zh"

    # Mandarin keywords by category (simplified Chinese)
    keywords_native = {
        # History & Culture
        "history": ["历史", "故宫", "长城", "文化遗产", "古迹", "博物馆", "传统"],
        "culture": ["文化", "艺术", "音乐", "戏曲", "书法", "国画", "京剧"],
        # Modern categories
        "finance": ["金融", "股市", "经济", "投资", "银行", "贸易", "商业"],
        "tech": ["科技", "创新", "人工智能", "互联网", "电商", "创业", "高科技"],
        "food": ["美食", "餐厅", "料理", "小吃", "饮食", "厨师"],
        "expat": ["华人", "海外华人", "留学", "移民", "华侨"],
        # Cities
        "beijing": ["北京", "首都", "天安门", "故宫", "颐和园"],
        "shanghai": ["上海", "浦东", "外滩", "陆家嘴"],
        # General
        "general": ["中国", "新闻", "资讯"],
    }

    # English keywords by category
    keywords_english = {
        "history": [
            "history",
            "forbidden city",
            "great wall",
            "heritage",
            "museum",
            "ancient",
            "traditional",
        ],
        "culture": [
            "culture",
            "art",
            "music",
            "opera",
            "calligraphy",
            "painting",
            "theater",
        ],
        "finance": [
            "finance",
            "stock market",
            "economy",
            "investment",
            "banking",
            "trade",
            "business",
        ],
        "tech": [
            "tech",
            "technology",
            "innovation",
            "ai",
            "internet",
            "e-commerce",
            "startup",
        ],
        "food": ["food", "restaurant", "cuisine", "dim sum", "cooking", "chef"],
        "expat": [
            "chinese diaspora",
            "overseas chinese",
            "study abroad",
            "immigration",
            "chinese community",
        ],
        "beijing": [
            "beijing",
            "capital",
            "tiananmen",
            "forbidden city",
            "summer palace",
        ],
        "shanghai": ["shanghai", "pudong", "bund", "lujiazui"],
        "general": ["china", "news", "chinese"],
    }

    # Category labels
    category_labels = {
        "history": {"zh": "历史", "en": "History", "he": "היסטוריה", "es": "Historia"},
        "culture": {"zh": "文化", "en": "Culture", "he": "תרבות", "es": "Cultura"},
        "finance": {"zh": "金融", "en": "Finance", "he": "פיננסים", "es": "Finanzas"},
        "tech": {"zh": "科技", "en": "Tech", "he": "טכנולוגיה", "es": "Tecnologia"},
        "food": {"zh": "美食", "en": "Food", "he": "אוכל", "es": "Comida"},
        "expat": {
            "zh": "海外华人",
            "en": "Expat",
            "he": "קהילה סינית",
            "es": "Comunidad China",
        },
        "beijing": {"zh": "北京", "en": "Beijing", "he": "בייג'ינג", "es": "Beijing"},
        "shanghai": {"zh": "上海", "en": "Shanghai", "he": "שנגחאי", "es": "Shanghai"},
        "general": {"zh": "综合", "en": "General", "he": "כללי", "es": "General"},
    }

    # City configurations
    city_configs: Dict[str, Dict[str, Any]] = {
        "beijing": {
            "name": "Beijing",
            "name_native": "北京",
            "default_category": "culture",
            "priority_categories": ["history", "culture", "politics"],
            "rss_feeds": [
                "https://rss.cnn.com/rss/edition_asia.rss",  # CNN Asia
            ],
        },
        "shanghai": {
            "name": "Shanghai",
            "name_native": "上海",
            "default_category": "finance",
            "priority_categories": ["finance", "tech", "food", "fashion"],
            "rss_feeds": [
                "https://rss.cnn.com/rss/edition_asia.rss",  # CNN Asia
            ],
        },
    }

    # Source configurations (for web scraping)
    source_configs = [
        {
            "name": "South China Morning Post",
            "name_native": "南华早报",
            "url": "https://www.scmp.com/rss/91/feed",
            "type": "rss",
            "language": "en",
        },
        {
            "name": "China Daily",
            "name_native": "中国日报",
            "url": "https://www.chinadaily.com.cn/rss/china_rss.xml",
            "type": "rss",
            "language": "en",
        },
        {
            "name": "Global Times",
            "name_native": "环球时报",
            "url": "https://www.globaltimes.cn/rss/beijing.xml",
            "type": "rss",
            "language": "en",
        },
    ]

    async def scrape_headlines(self) -> List[CultureHeadlineItem]:
        """
        Scrape headlines from all Chinese news sources.

        Uses RSS feeds for English-language Chinese news sources.
        """
        all_headlines: List[CultureHeadlineItem] = []

        for source in self.source_configs:
            try:
                if source["type"] == "rss":
                    headlines = await self._scrape_rss(
                        source["url"],
                        source["name"],
                        source["name_native"],
                    )
                    all_headlines.extend(headlines)
            except Exception as e:
                logger.error(f"Error scraping {source['name']}: {e}")
                continue

        # Calculate relevance and filter
        scored_items = self.filter_by_relevance(all_headlines)

        # Sort by relevance score
        scored_items.sort(key=lambda x: x.relevance_score, reverse=True)

        return scored_items

    async def scrape_city_news(self, city_id: str) -> List[CultureHeadlineItem]:
        """
        Scrape news specific to a city.

        Args:
            city_id: "beijing" or "shanghai"
        """
        all_headlines: List[CultureHeadlineItem] = []
        city_config = self.city_configs.get(city_id)

        if not city_config:
            logger.warning(f"Unknown city_id: {city_id}")
            return []

        # Get all headlines and filter by city
        all_items = await self.scrape_headlines()
        city_name_native = city_config.get("name_native", "")
        city_name = city_config.get("name", city_id)

        for item in all_items:
            text = f"{item.title} {item.summary or ''}".lower()
            if city_name.lower() in text or city_name_native in text:
                all_headlines.append(item)

        return all_headlines

    def get_search_queries(self, city_name: str) -> List[str]:
        """
        Get search queries for a city in Mandarin and English.
        """
        queries = []

        if city_name.lower() == "beijing":
            queries = [
                "北京新闻",
                "Beijing news",
                "北京文化",
                "Beijing culture",
                "故宫",
                "Forbidden City",
            ]
        elif city_name.lower() == "shanghai":
            queries = [
                "上海新闻",
                "Shanghai news",
                "上海金融",
                "Shanghai finance",
                "上海科技",
                "Shanghai tech",
            ]
        else:
            queries = [
                f"{city_name}新闻",
                f"{city_name} news",
                f"{city_name}中国",
                f"{city_name} China",
            ]

        return queries

    async def _scrape_rss(
        self,
        url: str,
        source_name: str,
        source_name_native: str,
    ) -> List[CultureHeadlineItem]:
        """Scrape headlines from an RSS feed."""
        headlines = []

        try:
            html = await self.fetch_html(url)
            if not html:
                return []

            soup = self.parse_html(html)

            # Parse RSS items
            items = soup.find_all("item")
            for item in items[:20]:  # Limit to 20 items
                try:
                    title_elem = item.find("title")
                    link_elem = item.find("link")

                    if not title_elem or not link_elem:
                        continue

                    title = title_elem.get_text(strip=True)
                    url = link_elem.get_text(strip=True)

                    # Get optional fields
                    summary = None
                    description_elem = item.find("description")
                    if description_elem:
                        summary_html = description_elem.get_text()
                        summary = BeautifulSoup(summary_html, "html.parser").get_text(
                            strip=True
                        )[:200]

                    # Get publication date
                    published_at = None
                    pub_date_elem = item.find("pubDate")
                    if pub_date_elem:
                        try:
                            from email.utils import parsedate_to_datetime

                            published_at = parsedate_to_datetime(
                                pub_date_elem.get_text()
                            )
                        except Exception:
                            published_at = datetime.now(timezone.utc)

                    # Get image if available
                    image_url = None
                    media_elem = item.find("media:content") or item.find("enclosure")
                    if media_elem and media_elem.get("url"):
                        image_url = media_elem.get("url")

                    headline = CultureHeadlineItem(
                        source=source_name,
                        title=title,
                        url=url,
                        published_at=published_at,
                        summary=summary,
                        image_url=image_url,
                        title_native=None,  # English source
                        summary_native=None,
                    )
                    headlines.append(headline)

                except Exception as e:
                    logger.error(f"Error parsing RSS item: {e}")
                    continue

        except Exception as e:
            logger.error(f"Error scraping RSS {url}: {e}")

        return headlines


# Singleton instance
chinese_scraper = ChineseScraper()
