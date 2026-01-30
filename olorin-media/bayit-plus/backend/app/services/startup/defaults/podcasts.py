"""
Default podcast configurations for Bayit+ Backend.

These podcasts are seeded on startup if they don't already exist.
"""

from typing import Optional, TypedDict


class PodcastSeedConfig(TypedDict):
    title: str
    title_en: Optional[str]
    description: Optional[str]
    description_en: Optional[str]
    author: Optional[str]
    author_en: Optional[str]
    cover: Optional[str]
    category: Optional[str]
    category_en: Optional[str]
    culture_id: str
    rss_feed: Optional[str]
    is_featured: bool
    order: int


DEFAULT_PODCASTS: list[PodcastSeedConfig] = [
    {
        "title": '\u05e1\u05d2"\u05dc \u05d5\u05d1\u05e8\u05e7\u05d5 - \u05d4\u05e4\u05d5\u05d3\u05e7\u05d0\u05e1\u05d8',
        "title_en": "Saggal & Barko - The Podcast",
        "description": "\u05e4\u05d5\u05d3\u05e7\u05d0\u05e1\u05d8 \u05de-103FM",
        "description_en": "Podcast from 103FM",
        "author": "103FM",
        "author_en": "103FM",
        "cover": (
            "https://is1-ssl.mzstatic.com/image/thumb/"
            "Podcasts126/v4/b3/16/70/b31670e1-2b0a-8e73-3a9c-01e163e5a96a/"
            "mza_12265707752681498498.jpg/1200x1200bf.webp"
        ),
        "category": "\u05d1\u05d9\u05d3\u05d5\u05e8",
        "category_en": "Entertainment",
        "culture_id": "israeli",
        "rss_feed": (
            "https://www.omnycontent.com/d/playlist/"
            "397b9456-4f75-4509-acff-ac0600b4a6a4/"
            "0f1e0564-cb90-4133-be44-ad1600e52204/"
            "9f04eb00-8f09-4e0c-8df6-ad1600e5277f/podcast.rss"
        ),
        "is_featured": True,
        "order": 0,
    },
    {
        "title": "\u05d7\u05d5\u05e5 \u05dc\u05d0\u05e8\u05e5",
        "title_en": "Chutz La'Aretz (Outside the Country)",
        "description": "\u05e4\u05d5\u05d3\u05e7\u05d0\u05e1\u05d8 \u05d7\u05d3\u05e9\u05d5\u05ea \u05d5\u05e4\u05d5\u05dc\u05d9\u05d8\u05d9\u05e7\u05d4 \u05d1\u05d9\u05e0\u05dc\u05d0\u05d5\u05de\u05d9\u05ea \u05de\u05d4\u05d0\u05e8\u05e5",
        "description_en": "International news and politics podcast from Haaretz",
        "author": "\u05d4\u05d0\u05e8\u05e5",
        "author_en": "Haaretz",
        "cover": (
            "https://is1-ssl.mzstatic.com/image/thumb/"
            "Podcasts125/v4/5b/53/2b/5b532b11-01f6-8907-9567-74dee5900e85/"
            "mza_5697786007577311141.jpg/1200x1200bf.webp"
        ),
        "category": "\u05d7\u05d3\u05e9\u05d5\u05ea \u05d5\u05e4\u05d5\u05dc\u05d9\u05d8\u05d9\u05e7\u05d4",
        "category_en": "News & Politics",
        "culture_id": "israeli",
        "rss_feed": (
            "https://www.omnycontent.com/d/playlist/"
            "397b9456-4f75-4509-acff-ac0600b4a6a4/"
            "6b5c19f7-a385-49c0-bb95-ad4a0071daea/"
            "08535d76-8bf4-4bf2-af8d-ad4a007205a3/podcast.rss"
        ),
        "is_featured": True,
        "order": 1,
    },
]
