#!/usr/bin/env python3
"""
Test query performance for subtitle and episode queries.
Compares old vs new implementation.
"""

import asyncio
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from app.core.database import connect_to_mongo, close_mongo_connection
from app.models.content import Content
from app.models.subtitles import SubtitleTrackDoc


async def test_subtitle_query_performance():
    """Test subtitle query with content_id index."""
    print("=" * 60)
    print("SUBTITLE QUERY PERFORMANCE TEST")
    print("=" * 60)

    # Get some content IDs
    content_items = await Content.find().limit(20).to_list()
    content_ids = [str(item.id) for item in content_items]

    if not content_ids:
        print("⚠️  No content found in database")
        return

    print(f"\nTesting with {len(content_ids)} content IDs...")

    # Test OLD query (fetching all fields including massive cues array)
    print("\n📊 WITHOUT projection (fetching all fields including cues):")
    start = time.time()
    subtitle_tracks_full = await SubtitleTrackDoc.find(
        {"content_id": {"$in": content_ids}}
    ).to_list()
    duration_full_ms = (time.time() - start) * 1000
    print(f"  Duration: {duration_full_ms:.0f}ms")
    print(f"  Found {len(subtitle_tracks_full)} subtitle tracks")

    # Test NEW query (with projection to exclude cues)
    print("\n⚡ WITH projection (content_id + language only):")
    start = time.time()
    from app.core.database import get_database
    db = get_database()
    subtitle_tracks_projected = await db.subtitle_tracks.find(
        {"content_id": {"$in": content_ids}},
        {"content_id": 1, "language": 1}
    ).to_list(None)
    duration_projected_ms = (time.time() - start) * 1000
    print(f"  Duration: {duration_projected_ms:.0f}ms")
    print(f"  Found {len(subtitle_tracks_projected)} subtitle tracks")

    # Performance comparison
    if duration_full_ms > 0:
        speedup = duration_full_ms / duration_projected_ms if duration_projected_ms > 0 else 0
        improvement_pct = ((duration_full_ms - duration_projected_ms) / duration_full_ms * 100)

        print(f"\n✅ Projection speedup: {speedup:.1f}x faster ({improvement_pct:.0f}% improvement)")
        duration_ms = duration_projected_ms
    else:
        duration_ms = duration_projected_ms

    if duration_ms < 100:
        print(f"  🎉 EXCELLENT - Query is very fast!")
    elif duration_ms < 500:
        print(f"  ✅ GOOD - Query is fast")
    elif duration_ms < 2000:
        print(f"  ⚠️  ACCEPTABLE - Could be faster")
    else:
        print(f"  ❌ SLOW - Index may not be used properly")


async def test_episode_count_performance():
    """Test episode counting with aggregation vs fetching all."""
    print("\n" + "=" * 60)
    print("EPISODE COUNT PERFORMANCE TEST")
    print("=" * 60)

    # Get some series IDs
    series_items = await Content.find({"is_series": True}).limit(10).to_list()
    series_ids = [str(item.id) for item in series_items]

    if not series_ids:
        print("⚠️  No series found in database")
        return

    print(f"\nTesting with {len(series_ids)} series IDs...")

    # Test OLD method: fetch all episodes
    print("\n📊 OLD METHOD (fetch all documents):")
    start = time.time()
    all_episodes = await Content.find({"series_id": {"$in": series_ids}}).to_list()
    old_duration_ms = (time.time() - start) * 1000

    episode_counts_old = {}
    for episode in all_episodes:
        series_id = episode.series_id
        episode_counts_old[series_id] = episode_counts_old.get(series_id, 0) + 1

    print(f"  Duration: {old_duration_ms:.0f}ms")
    print(f"  Episodes fetched: {len(all_episodes)}")
    print(f"  Series with episodes: {len(episode_counts_old)}")

    # Test NEW method: aggregation
    print("\n⚡ NEW METHOD (aggregation):")
    start = time.time()
    pipeline = [
        {"$match": {"series_id": {"$in": series_ids}}},
        {"$group": {"_id": "$series_id", "count": {"$sum": 1}}}
    ]
    # Use PyMongo collection directly
    from app.core.database import get_database
    db = get_database()
    aggregation_result = await db.content.aggregate(pipeline).to_list(None)
    new_duration_ms = (time.time() - start) * 1000

    episode_counts_new = {doc["_id"]: doc["count"] for doc in aggregation_result}

    print(f"  Duration: {new_duration_ms:.0f}ms")
    print(f"  Series with episodes: {len(episode_counts_new)}")

    # Verify results match
    assert episode_counts_old == episode_counts_new, "Results don't match!"
    print("\n✅ Results verified - both methods return same counts")

    # Performance comparison
    speedup = old_duration_ms / new_duration_ms if new_duration_ms > 0 else 0
    improvement_pct = ((old_duration_ms - new_duration_ms) / old_duration_ms * 100) if old_duration_ms > 0 else 0

    print("\n" + "=" * 60)
    print("PERFORMANCE IMPROVEMENT")
    print("=" * 60)
    print(f"Old method: {old_duration_ms:.0f}ms")
    print(f"New method: {new_duration_ms:.0f}ms")
    print(f"Speedup: {speedup:.1f}x faster")
    print(f"Improvement: {improvement_pct:.1f}% reduction")

    if speedup > 10:
        print(f"🎉 EXCELLENT - {speedup:.0f}x performance improvement!")
    elif speedup > 5:
        print(f"✅ GREAT - {speedup:.0f}x faster")
    elif speedup > 2:
        print(f"✓ GOOD - {speedup:.0f}x improvement")
    else:
        print(f"⚠️  Marginal improvement - may need more data to see difference")


async def test_full_hierarchical_query():
    """Simulate the full hierarchical content query."""
    print("\n" + "=" * 60)
    print("FULL HIERARCHICAL QUERY TEST (20 items)")
    print("=" * 60)

    # Build query similar to admin endpoint
    query = Content.find(
        {
            "$and": [
                {
                    "$or": [
                        {"series_id": None},
                        {"series_id": {"$exists": False}},
                        {"series_id": ""},
                    ]
                },
                {
                    "$or": [
                        {"review_issue_type": {"$ne": "merged"}},
                        {"review_issue_type": None},
                        {"review_issue_type": {"$exists": False}},
                    ]
                },
            ]
        }
    )

    start_total = time.time()

    # Count
    start = time.time()
    total = await query.count()
    count_ms = (time.time() - start) * 1000
    print(f"\n1. Count query: {count_ms:.0f}ms ({total} items)")

    # Main query
    start = time.time()
    items = await query.sort("+title").skip(0).limit(20).to_list()
    main_ms = (time.time() - start) * 1000
    print(f"2. Main query: {main_ms:.0f}ms ({len(items)} items)")

    # Subtitle query (with projection to exclude large cues array)
    start = time.time()
    content_ids = [str(item.id) for item in items]
    from app.core.database import get_database
    db = get_database()
    subtitle_tracks = await db.subtitle_tracks.find(
        {"content_id": {"$in": content_ids}},
        {"content_id": 1, "language": 1}
    ).to_list(None)
    subtitle_ms = (time.time() - start) * 1000
    print(f"3. Subtitle query: {subtitle_ms:.0f}ms ({len(subtitle_tracks)} tracks)")

    # Episode query (aggregation)
    start = time.time()
    series_ids = [str(item.id) for item in items if item.is_series]
    if series_ids:
        pipeline = [
            {"$match": {"series_id": {"$in": series_ids}}},
            {"$group": {"_id": "$series_id", "count": {"$sum": 1}}}
        ]
        from app.core.database import get_database
        db = get_database()
        episode_counts = await db.content.aggregate(pipeline).to_list(None)
        episode_count_total = sum(doc["count"] for doc in episode_counts)
    else:
        episode_count_total = 0
    episode_ms = (time.time() - start) * 1000
    print(f"4. Episode query: {episode_ms:.0f}ms ({episode_count_total} episodes)")

    total_ms = (time.time() - start_total) * 1000

    print("\n" + "=" * 60)
    print(f"TOTAL TIME: {total_ms:.0f}ms")
    print("=" * 60)

    if total_ms < 500:
        print("🎉 EXCELLENT - Very fast query!")
    elif total_ms < 1000:
        print("✅ GREAT - Fast query")
    elif total_ms < 2000:
        print("✓ GOOD - Acceptable performance")
    else:
        print("⚠️  Could be optimized further")


async def main():
    """Run all performance tests."""
    print("\n🔧 Connecting to database...\n")
    await connect_to_mongo()

    try:
        await test_subtitle_query_performance()
        await test_episode_count_performance()
        await test_full_hierarchical_query()

        print("\n" + "=" * 60)
        print("ALL TESTS COMPLETE")
        print("=" * 60)

    finally:
        await close_mongo_connection()
        print("\n✨ Done!")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n⚠️  Interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
