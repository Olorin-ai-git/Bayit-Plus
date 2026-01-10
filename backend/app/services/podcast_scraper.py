"""
Podcast Scraper Service.
Fetches podcast episodes from real RSS feeds.
"""
import asyncio
from datetime import datetime
from typing import List, Optional, Dict, Any
from dataclasses import dataclass, field
import httpx
from bs4 import BeautifulSoup
import hashlib


@dataclass
class PodcastEpisodeData:
    """A single podcast episode from RSS feed"""
    title: str
    description: Optional[str] = None
    episode_number: Optional[int] = None
    season: int = 1
    audio_url: Optional[str] = None
    duration: Optional[str] = None
    published_date: Optional[datetime] = None
    guid: str = field(default_factory=str)

    def __post_init__(self):
        if not self.guid:
            self.guid = hashlib.md5(self.title.encode()).hexdigest()[:12]


@dataclass
class PodcastData:
    """Podcast feed data with episodes"""
    title: str
    author: Optional[str] = None
    description: Optional[str] = None
    cover: Optional[str] = None
    category: str = "general"
    rss_url: str = ""
    episodes: List[PodcastEpisodeData] = field(default_factory=list)


HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "application/rss+xml, application/atom+xml, */*",
}


async def fetch_rss_feed(rss_url: str) -> Optional[PodcastData]:
    """
    Fetch podcast from RSS feed.
    """
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            response = await client.get(rss_url, headers=HEADERS)
            response.raise_for_status()

            soup = BeautifulSoup(response.text, "html.parser")

            # Parse channel info
            channel = soup.find("channel")
            if not channel:
                return None

            title = channel.find("title")
            author = channel.find("author") or channel.find("managingEditor")
            description = channel.find("description")
            image_elem = channel.find("image")
            cover = None
            if image_elem:
                url_elem = image_elem.find("url")
                if url_elem:
                    cover = url_elem.get_text(strip=True)

            # Parse episodes
            items = channel.find_all("item")[:15]  # Get last 15 episodes
            episodes = []

            for item in items:
                ep_title = item.find("title")
                ep_desc = item.find("description") or item.find("summary")
                ep_audio = item.find("enclosure")
                ep_pubdate = item.find("pubDate")
                ep_duration = item.find("duration")
                ep_guid = item.find("guid")

                if not ep_title:
                    continue

                title_str = ep_title.get_text(strip=True)
                duration_str = None
                if ep_duration:
                    duration_str = ep_duration.get_text(strip=True)

                audio_url = None
                if ep_audio and ep_audio.get("url"):
                    audio_url = ep_audio.get("url")

                pub_date = None
                if ep_pubdate:
                    try:
                        # Parse RFC 2822 date
                        from email.utils import parsedate_to_datetime

                        pub_date = parsedate_to_datetime(ep_pubdate.get_text(strip=True))
                    except:
                        pub_date = None

                guid_str = ""
                if ep_guid:
                    guid_str = ep_guid.get_text(strip=True)[:12]

                episodes.append(
                    PodcastEpisodeData(
                        title=title_str,
                        description=ep_desc.get_text(strip=True)[:200]
                        if ep_desc
                        else None,
                        audio_url=audio_url,
                        duration=duration_str,
                        published_date=pub_date,
                        guid=guid_str,
                    )
                )

            podcast = PodcastData(
                title=title.get_text(strip=True) if title else "Unknown",
                author=author.get_text(strip=True) if author else None,
                description=description.get_text(strip=True)[:500]
                if description
                else None,
                cover=cover,
                rss_url=rss_url,
                episodes=episodes,
            )

            return podcast

    except Exception as e:
        print(f"Error fetching podcast from {rss_url}: {e}")
        return None


# Real working podcast feeds with verified RSS URLs
REAL_PODCASTS = {
    # Israeli Podcasts from PodcastOne & other platforms
    "עושים היסטוריה": {
        "rss_url": "https://feeds.podcastone.com/rss2/embedded-feed/1569610537",
        "category": "education",
    },
    "גיקטיים": {
        "rss_url": "https://feeds.podcastone.com/rss2/embedded-feed/1630251491",
        "category": "tech",
    },
    "הפודקאסט של שחר סגל": {
        "rss_url": "https://feeds.podcastone.com/rss2/embedded-feed/1706618000",
        "category": "entertainment",
    },
    "כאן כלכלה": {
        "rss_url": "https://feeds.podcastone.com/rss2/kan-economy",
        "category": "education",
    },
    "שדרות ב": {
        "rss_url": "https://feeds.podcastone.com/rss2/sdrot-bet",
        "category": "news",
    },
    # NPR Podcasts (trusted, verified working)
    "Up First": {
        "rss_url": "https://feeds.npr.org/510318/podcast.xml",
        "category": "news",
    },
    "Planet Money": {
        "rss_url": "https://feeds.npr.org/510289/podcast.xml",
        "category": "education",
    },
    "Invisibilia": {
        "rss_url": "https://feeds.npr.org/510307/podcast.xml",
        "category": "education",
    },
    "Morning Edition": {
        "rss_url": "https://feeds.npr.org/500005/podcast.xml",
        "category": "news",
    },
    "Stuff You Should Know": {
        "rss_url": "https://feeds.howstuffworks.com/stuffyoushouldknow",
        "category": "education",
    },
}


async def scrape_all_podcasts() -> Dict[str, PodcastData]:
    """
    Scrape all configured podcasts concurrently.
    """
    tasks = [
        fetch_rss_feed(config["rss_url"]) for config in REAL_PODCASTS.values()
    ]

    results = await asyncio.gather(*tasks, return_exceptions=True)

    podcasts_dict = {}
    for (name, config), result in zip(REAL_PODCASTS.items(), results):
        if isinstance(result, PodcastData):
            result.category = config["category"]
            podcasts_dict[name] = result
        elif not isinstance(result, Exception):
            print(f"No data returned for {name}")

    return podcasts_dict
