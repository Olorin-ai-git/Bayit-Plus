"""
Seed Help Content Script
Populates FAQ tips, FAQ entries, and video tutorials for the Help & Support page.
Run once to seed the database. Safe to re-run — skips existing entries.
"""

import asyncio
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.models.support import FAQEntry, VideoTutorial


FAQ_TIPS = [
    {
        "question_key": "tip.live_tv",
        "answer_key": "tip.live_tv_answer",
        "translations": {
            "en": {
                "question": "Get the most out of Live TV",
                "answer": "Use the guide button while watching to see what's on next across all channels.",
            }
        },
        "category": "tip",
        "order": 1,
        "is_featured": True,
    },
    {
        "question_key": "tip.zeh_ani",
        "answer_key": "tip.zeh_ani_answer",
        "translations": {
            "en": {
                "question": "Ask Zeh-Ani anything",
                "answer": "Tap the AI button and ask about shows, get personalised recommendations, or get help navigating the app.",
            }
        },
        "category": "tip",
        "order": 2,
        "is_featured": True,
    },
    {
        "question_key": "tip.family_profiles",
        "answer_key": "tip.family_profiles_answer",
        "translations": {
            "en": {
                "question": "Set up family profiles",
                "answer": "Create separate profiles for each family member with their own preferences, watch history, and parental controls.",
            }
        },
        "category": "tip",
        "order": 3,
        "is_featured": True,
    },
]

FAQ_ENTRIES = [
    {
        "question_key": "faq.add_source",
        "answer_key": "faq.add_source_answer",
        "translations": {
            "en": {
                "question": "How do I add a content source?",
                "answer": "Go to Settings → Content Sources → tap Add Source. Bayit+ supports IPTV, Xtream Codes, Plex, and YouTube.",
            }
        },
        "category": "features",
        "order": 1,
    },
    {
        "question_key": "faq.premium",
        "answer_key": "faq.premium_answer",
        "translations": {
            "en": {
                "question": "What's included in Bayit+ Premium?",
                "answer": "Live TV (10+ Israeli channels), VOD library, Radio & Podcasts, Zeh-Ani AI assistant, unlimited family profiles, widgets, and priority support.",
            }
        },
        "category": "billing",
        "order": 2,
    },
    {
        "question_key": "faq.parental_controls",
        "answer_key": "faq.parental_controls_answer",
        "translations": {
            "en": {
                "question": "How do I set parental controls?",
                "answer": "Go to Profile → Settings → Content Restrictions and set a PIN. You can restrict content by rating for each family profile.",
            }
        },
        "category": "features",
        "order": 3,
    },
    {
        "question_key": "faq.stream_not_loading",
        "answer_key": "faq.stream_not_loading_answer",
        "translations": {
            "en": {
                "question": "Why isn't my stream loading?",
                "answer": "Check your internet connection first. Try switching video quality in Settings → Playback. If the issue persists, contact support.",
            }
        },
        "category": "troubleshooting",
        "order": 4,
    },
    {
        "question_key": "faq.switch_profile",
        "answer_key": "faq.switch_profile_answer",
        "translations": {
            "en": {
                "question": "How do I switch profiles?",
                "answer": "Press the Menu button from the home screen and select Switch Profile, or go to Profile → Switch Profile.",
            }
        },
        "category": "account",
        "order": 5,
    },
    {
        "question_key": "faq.languages",
        "answer_key": "faq.languages_answer",
        "translations": {
            "en": {
                "question": "What languages are supported?",
                "answer": "Hebrew, English, French, Spanish, Italian, Hindi, Tamil, Bengali, Japanese, and Chinese are fully supported in the app.",
            }
        },
        "category": "general",
        "order": 6,
    },
]

VIDEO_TUTORIALS = [
    {
        "title": "Getting Started",
        "description": "A quick tour of everything Bayit+ has to offer",
        "video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        "thumbnail_asset_name": "tutorial-getting-started",
        "duration_seconds": 150,
        "order": 1,
        "language": "en",
    },
    {
        "title": "Watching Live TV",
        "description": "Browse channels, use the guide, and set reminders",
        "video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
        "thumbnail_asset_name": "tutorial-live-tv",
        "duration_seconds": 255,
        "order": 2,
        "language": "en",
    },
    {
        "title": "Using Zeh-Ani AI",
        "description": "Get recommendations, ask questions, and explore content with AI",
        "video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        "thumbnail_asset_name": "tutorial-zeh-ani",
        "duration_seconds": 180,
        "order": 3,
        "language": "en",
    },
    {
        "title": "Setting Up Your Profile",
        "description": "Customise your avatar, preferences, and family profiles",
        "video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
        "thumbnail_asset_name": "tutorial-profile",
        "duration_seconds": 200,
        "order": 4,
        "language": "en",
    },
    {
        "title": "BYOC & Content Sources",
        "description": "Connect IPTV, Xtream, Plex, and YouTube sources",
        "video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
        "thumbnail_asset_name": "tutorial-byoc",
        "duration_seconds": 240,
        "order": 5,
        "language": "en",
    },
]


async def seed():
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    await init_beanie(
        database=client[settings.MONGODB_DB_NAME],
        document_models=[FAQEntry, VideoTutorial],
    )

    inserted_faqs = 0
    for data in FAQ_TIPS + FAQ_ENTRIES:
        existing = await FAQEntry.find_one({"question_key": data["question_key"]})
        if existing:
            continue
        entry = FAQEntry(
            question_key=data["question_key"],
            answer_key=data["answer_key"],
            translations=data["translations"],
            category=data["category"],
            order=data["order"],
            is_featured=data.get("is_featured", False),
        )
        await entry.insert()
        inserted_faqs += 1

    inserted_tutorials = 0
    for data in VIDEO_TUTORIALS:
        existing = await VideoTutorial.find_one({"title": data["title"], "language": data["language"]})
        if existing:
            continue
        tutorial = VideoTutorial(
            title=data["title"],
            description=data["description"],
            video_url=data["video_url"],
            thumbnail_asset_name=data["thumbnail_asset_name"],
            duration_seconds=data["duration_seconds"],
            order=data["order"],
            language=data["language"],
        )
        await tutorial.insert()
        inserted_tutorials += 1

    print(f"Seeded {inserted_faqs} FAQ/tip entries, {inserted_tutorials} video tutorials.")
    client.close()


if __name__ == "__main__":
    asyncio.run(seed())
