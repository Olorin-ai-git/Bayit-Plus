#!/usr/bin/env python3
"""
Scan for movies with subtitle sync mismatches.

Finds content where:
1. Content claims has_subtitles=True but no SubtitleTrackDoc exists
2. Content.available_subtitle_languages doesn't match actual SubtitleTrackDoc records
3. SubtitleTrackDoc exists but Content doesn't reference those languages
4. Content claims has_subtitles=False but SubtitleTrackDoc records exist
"""

import asyncio
import os
import sys

from motor.motor_asyncio import AsyncIOMotorClient

# Add backend to path for config import
sys.path.insert(
    0,
    os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        os.pardir,
        os.pardir,
        "backend",
    ),
)

from app.core.config import settings


async def scan_unsynced_subtitles():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    content_col = db["content"]
    subtitle_col = db["subtitle_tracks"]

    # --- Stats ---
    claims_subs_no_tracks = []   # has_subtitles=True, no SubtitleTrackDoc
    language_mismatch = []       # available_subtitle_languages != actual tracks
    orphan_tracks = []           # SubtitleTrackDoc with no matching Content
    false_negative = []          # has_subtitles=False but tracks exist

    # 1. Get all content that claims to have subtitles
    cursor = content_col.find(
        {"$or": [
            {"has_subtitles": True},
            {"available_subtitle_languages": {"$exists": True, "$ne": []}},
        ]},
        {"_id": 1, "title": 1, "has_subtitles": 1,
         "available_subtitle_languages": 1, "content_format": 1},
    )

    content_with_subs_claim = []
    async for doc in cursor:
        content_with_subs_claim.append(doc)

    print(f"Content claiming subtitles: {len(content_with_subs_claim)}")

    # Check each one against actual subtitle tracks
    for doc in content_with_subs_claim:
        content_id = str(doc["_id"])
        title = doc.get("title", "Unknown")
        claimed_langs = sorted(doc.get("available_subtitle_languages", []))
        has_subs_flag = doc.get("has_subtitles", False)
        content_format = doc.get("content_format", "unknown")

        # Find actual subtitle tracks
        actual_tracks = await subtitle_col.find(
            {"content_id": content_id},
            {"language": 1},
        ).to_list(length=None)
        actual_langs = sorted([t["language"] for t in actual_tracks])

        if has_subs_flag and not actual_tracks:
            claims_subs_no_tracks.append({
                "id": content_id,
                "title": title,
                "format": content_format,
                "claimed_langs": claimed_langs,
            })
        elif claimed_langs != actual_langs:
            language_mismatch.append({
                "id": content_id,
                "title": title,
                "format": content_format,
                "claimed": claimed_langs,
                "actual": actual_langs,
            })

    # 2. Find content with has_subtitles=False but that has SubtitleTrackDoc records
    no_subs_cursor = content_col.find(
        {"$or": [
            {"has_subtitles": False},
            {"has_subtitles": {"$exists": False}},
        ]},
        {"_id": 1, "title": 1, "content_format": 1,
         "available_subtitle_languages": 1},
    )

    async for doc in no_subs_cursor:
        content_id = str(doc["_id"])
        track_count = await subtitle_col.count_documents({"content_id": content_id})
        if track_count > 0:
            false_negative.append({
                "id": content_id,
                "title": doc.get("title", "Unknown"),
                "format": doc.get("content_format", "unknown"),
                "track_count": track_count,
                "claimed_langs": doc.get("available_subtitle_languages", []),
            })

    # 3. Find orphan subtitle tracks (content_id not in content collection)
    all_subtitle_content_ids = await subtitle_col.distinct("content_id")
    print(f"Unique content_ids in subtitle_tracks: {len(all_subtitle_content_ids)}")

    from bson import ObjectId

    for cid in all_subtitle_content_ids:
        # Try both ObjectId and string lookup
        found = False
        try:
            found = await content_col.find_one(
                {"_id": ObjectId(cid)}, {"_id": 1}
            ) is not None
        except Exception:
            pass
        if not found:
            found = await content_col.find_one(
                {"_id": cid}, {"_id": 1}
            ) is not None

        if not found:
            tracks = await subtitle_col.find(
                {"content_id": cid}, {"language": 1}
            ).to_list(length=None)
            orphan_tracks.append({
                "content_id": cid,
                "languages": [t["language"] for t in tracks],
                "track_count": len(tracks),
            })

    # --- Report ---
    print("\n" + "=" * 70)
    print("SUBTITLE SYNC SCAN RESULTS")
    print("=" * 70)

    print(f"\n[1] Content claims has_subtitles=True but NO tracks exist: "
          f"{len(claims_subs_no_tracks)}")
    for item in claims_subs_no_tracks:
        print(f"    - {item['title']} ({item['format']}) [id={item['id']}]")
        if item["claimed_langs"]:
            print(f"      Claimed languages: {item['claimed_langs']}")

    print(f"\n[2] Language mismatch (claimed != actual): "
          f"{len(language_mismatch)}")
    for item in language_mismatch:
        print(f"    - {item['title']} ({item['format']}) [id={item['id']}]")
        print(f"      Claimed: {item['claimed']}  |  Actual: {item['actual']}")

    print(f"\n[3] has_subtitles=False but tracks exist (false negatives): "
          f"{len(false_negative)}")
    for item in false_negative:
        print(f"    - {item['title']} ({item['format']}) [id={item['id']}]")
        print(f"      Tracks: {item['track_count']}, "
              f"Claimed langs: {item['claimed_langs']}")

    print(f"\n[4] Orphan subtitle tracks (content not found): "
          f"{len(orphan_tracks)}")
    for item in orphan_tracks:
        print(f"    - content_id={item['content_id']} "
              f"({item['track_count']} tracks, langs={item['languages']})")

    total_issues = (
        len(claims_subs_no_tracks)
        + len(language_mismatch)
        + len(false_negative)
        + len(orphan_tracks)
    )
    print(f"\n{'=' * 70}")
    print(f"TOTAL ISSUES: {total_issues}")
    print(f"{'=' * 70}")

    client.close()


if __name__ == "__main__":
    asyncio.run(scan_unsynced_subtitles())
