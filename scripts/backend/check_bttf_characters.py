#!/usr/bin/env python3
"""
Check Back to the Future character frame URLs in both
interactive_characters and characters collection.

Usage:
    cd backend && poetry run python scripts/check_bttf_characters.py
"""

import asyncio
import sys
from pathlib import Path

import httpx
from motor.motor_asyncio import AsyncIOMotorClient

SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

from app.core.config import get_settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)

BTTF_IMDB_ID = "tt0088763"


async def check_url(client: httpx.AsyncClient, url: str) -> tuple[int, str]:
    """HEAD-check a URL, return (status_code, reason)."""
    if not url:
        return 0, "EMPTY/NULL"
    try:
        resp = await client.head(url, follow_redirects=True, timeout=10)
        return resp.status_code, resp.reason_phrase or ""
    except Exception as exc:
        return -1, str(exc)[:80]


async def main():
    settings = get_settings()
    mongo = AsyncIOMotorClient(settings.MONGODB_URI)
    db = mongo[settings.MONGODB_DB_NAME]

    content = await db.content.find_one({"imdb_id": BTTF_IMDB_ID})
    if not content:
        print(f"BTTF not found (imdb_id={BTTF_IMDB_ID})")
        mongo.close()
        sys.exit(1)

    content_id = str(content["_id"])
    title = content.get("title", "?")
    title_en = content.get("title_en", "?")
    print(f"\n=== {title} / {title_en} (id={content_id}) ===\n")

    # --- interactive_characters (used by Pause & Ask) ---
    chars = content.get("interactive_characters", [])
    print(f"interactive_characters count: {len(chars)}")

    async with httpx.AsyncClient() as http:
        for i, ch in enumerate(chars):
            name = ch.get("name", "?")
            frame = ch.get("frame_url", "")
            voice = ch.get("voice_id", "?")
            gender = ch.get("gender", "?")
            status, reason = await check_url(http, frame)
            ok = "OK" if 200 <= status < 300 else "BROKEN"
            print(
                f"  [{i}] {name:20s} | frame_url={ok} (HTTP {status} {reason})"
            )
            print(f"       url: {frame or '(null)'}")
            print(f"       voice_id: {voice}, gender: {gender}")
            print()

    # --- characters collection (standalone records) ---
    print("\n--- characters collection (franchise=bttf or name match) ---")
    bttf_chars = await db.characters.find(
        {"$or": [{"franchise": "bttf"}, {"franchise": "back_to_the_future"}]}
    ).to_list(50)

    if not bttf_chars:
        # fallback: try by name
        names = [
            "Doc Brown", "Marty McFly", "Jennifer Parker",
            "Lorraine Baines", "George McFly", "Biff Tannen",
        ]
        bttf_chars = await db.characters.find(
            {"name": {"$in": names}}
        ).to_list(50)

    async with httpx.AsyncClient() as http:
        for ch in bttf_chars:
            name = ch.get("name", "?")
            face = ch.get("face_url", "")
            voice = ch.get("voice_id", "?")
            franchise = ch.get("franchise", "?")
            status, reason = await check_url(http, face)
            ok = "OK" if 200 <= status < 300 else "BROKEN"
            print(
                f"  {name:20s} | face_url={ok} (HTTP {status} {reason})"
            )
            print(f"       url: {face or '(null)'}")
            print(f"       voice_id: {voice}, franchise: {franchise}")
            print()

    # --- interactive_moments frame URLs ---
    moments = content.get("interactive_moments", [])
    print(f"\n--- interactive_moments count: {len(moments)} ---")
    async with httpx.AsyncClient() as http:
        for i, m in enumerate(moments):
            name = m.get("character_name", "?")
            ts = m.get("timestamp", 0)
            frame = m.get("character_frame_url", "")
            status, reason = await check_url(http, frame)
            ok = "OK" if 200 <= status < 300 else "BROKEN"
            print(
                f"  [{i}] {name:20s} @ {ts:7.0f}s | frame={ok} (HTTP {status})"
            )
            if ok == "BROKEN":
                print(f"       url: {frame or '(null)'}")

    mongo.close()
    print("\nDone.")


if __name__ == "__main__":
    asyncio.run(main())
