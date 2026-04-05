#!/usr/bin/env python3
"""Seed the Steve Jobs — Stanford 2005 EDU content entry.

Idempotent upsert. Creates a Content document for the demo EDU card on
demo.olorin.ai, including a single interactive "speaker" (Steve Jobs)
used by the Pause & Ask flow in speaker persona mode.

Run:
    poetry run python scripts/seed_jobs_stanford_2005.py
"""

import asyncio
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import motor.motor_asyncio
from bson import ObjectId

from app.core.config import settings
from app.models.content import Content
from app.models.vod_interaction import ContentCharacter, InteractiveMoment

FILM_URL = (
    "https://storage.googleapis.com/bayit-plus-media-new/demo/"
    "jobs-stanford-2005.mp4"
)
POSTER_URL = (
    "https://storage.googleapis.com/bayit-plus-media-new/demo/"
    "jobs-stanford-2005-poster.jpg"
)

SPEAKER_NAME = "Steve Jobs"
SPEAKER_DESCRIPTION = (
    "Co-founder of Apple and Pixar. Delivered this commencement address at "
    "Stanford in 2005, eight years before his death, reflecting on three "
    "stories from his life: connecting the dots, love and loss, and death."
)
AUDIENCE_DESCRIPTION = (
    "adult learners interested in entrepreneurship, design, and life philosophy"
)

# Five speech transitions used as pause moments. Timestamps approximate.
MOMENTS = [
    {
        "timestamp": 45.0,
        "duration": 60.0,
        "scene_context": (
            "Opening: Jobs says he never graduated from college and this is "
            "the closest he has ever gotten to a college graduation. He will "
            "tell three stories from his life."
        ),
        "interaction_prompt": "Ask Steve about the opening of his speech",
    },
    {
        "timestamp": 180.0,
        "duration": 120.0,
        "scene_context": (
            "First story — connecting the dots. Jobs dropped out of Reed "
            "College, dropped in on classes that interested him including "
            "calligraphy, and ten years later that calligraphy knowledge "
            "shaped the Macintosh's beautiful typography."
        ),
        "interaction_prompt": "Ask about dropping out and calligraphy",
    },
    {
        "timestamp": 450.0,
        "duration": 120.0,
        "scene_context": (
            "Second story — love and loss. Jobs is fired from Apple, the "
            "company he co-founded, at age 30. He describes this as one of "
            "the best things that ever happened to him: it freed him to "
            "enter one of the most creative periods of his life."
        ),
        "interaction_prompt": "Ask about being fired from Apple",
    },
    {
        "timestamp": 660.0,
        "duration": 120.0,
        "scene_context": (
            "Third story — death. Jobs describes being diagnosed with "
            "pancreatic cancer and initially told he had 3-6 months to live. "
            "He argues that remembering you are going to die is the best way "
            "to avoid the trap of thinking you have something to lose."
        ),
        "interaction_prompt": "Ask about facing his cancer diagnosis",
    },
    {
        "timestamp": 810.0,
        "duration": 60.0,
        "scene_context": (
            "Closing: Jobs quotes the final issue of the Whole Earth "
            "Catalog: 'Stay Hungry. Stay Foolish.' and wishes the graduates "
            "the same."
        ),
        "interaction_prompt": "Ask about 'Stay Hungry, Stay Foolish'",
    },
]


async def upsert_jobs_content(collection) -> dict:
    """Idempotently create or update the Jobs Stanford 2005 Content doc.

    Uses raw motor (no Beanie init) to avoid index build on the content
    collection which currently fails due to pre-existing null keys.
    """
    existing = await collection.find_one({"title": "Steve Jobs — Stanford 2005"})

    interactive_characters = [
        ContentCharacter(
            name=SPEAKER_NAME,
            voice_id=settings.CHARACTER_VOICE_DEFAULT,
            frame_url=POSTER_URL,
            description=SPEAKER_DESCRIPTION,
            movie_context=(
                "Stanford University commencement address, June 12, 2005. "
                "A 15-minute speech structured around three autobiographical "
                "stories about life, work, and death."
            ),
            actor_name=SPEAKER_NAME,
            gender="male",
            suggested_questions=[
                "Why did you drop out of college?",
                "What did you learn from being fired from Apple?",
                "How did your cancer diagnosis change you?",
            ],
        ),
    ]

    interactive_moments = [
        InteractiveMoment(
            timestamp=m["timestamp"],
            duration=m["duration"],
            scene_context=m["scene_context"],
            character_name=SPEAKER_NAME,
            character_frame_url=POSTER_URL,
            interaction_prompt=m["interaction_prompt"],
            voice_id=settings.CHARACTER_VOICE_DEFAULT,
        )
        for m in MOMENTS
    ]

    payload = {
        "title": "Steve Jobs — Stanford 2005",
        "source_provider": "olorin_demo",
        "source_id": "jobs-stanford-2005",
        "description": (
            "Steve Jobs' 2005 Stanford commencement address. Three stories "
            "from his life: connecting the dots, love and loss, and death."
        ),
        "year": 2005,
        "duration": "0:15:00",
        "rating": "G",
        "content_format": "short",
        "audience_id": "general",
        "topic_tags": ["educational", "entrepreneurship", "philosophy"],
        "stream_url": FILM_URL,
        "stream_type": "mp4",
        "is_drm_protected": False,
        "interactive_moments": interactive_moments,
        "interactive_characters": interactive_characters,
        "supports_avatar_interaction": True,
        "persona_mode": "speaker",
        "audience_description": AUDIENCE_DESCRIPTION,
    }

    # Build dict for raw insert — validate sub-models individually. Can't
    # instantiate the Content Beanie Document without init_beanie.
    doc_dict = dict(payload)
    doc_dict["interactive_characters"] = [
        c.model_dump() for c in interactive_characters
    ]
    doc_dict["interactive_moments"] = [
        m.model_dump() for m in interactive_moments
    ]
    doc_dict["updated_at"] = datetime.utcnow()
    # Required Content fields not in payload
    doc_dict.setdefault("is_published", True)
    doc_dict.setdefault("created_at", datetime.utcnow())

    if existing is not None:
        await collection.update_one(
            {"_id": existing["_id"]},
            {"$set": doc_dict},
        )
        print(f"✓ Updated existing Content: {existing['_id']}")
        return {"_id": existing["_id"]}

    doc_dict["_id"] = ObjectId()
    doc_dict["created_at"] = datetime.utcnow()
    await collection.insert_one(doc_dict)
    print(f"✓ Inserted new Content: {doc_dict['_id']}")
    return {"_id": doc_dict["_id"]}


async def main() -> None:
    client = motor.motor_asyncio.AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    collection = db["content"]
    print("🎓 Seeding Steve Jobs — Stanford 2005…")
    content = await upsert_jobs_content(collection)
    print()
    print(f"content_id: {content['_id']}")
    print("Copy this id into portal-demo manifest:")
    print("  public/content/jobs-stanford-2005/manifest.json")


if __name__ == "__main__":
    asyncio.run(main())
