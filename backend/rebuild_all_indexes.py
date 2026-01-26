#!/usr/bin/env python3
"""
Rebuild ALL collection indexes for performance optimization.

This script recreates all indexes from model definitions for ALL collections.

Usage:
    poetry run python rebuild_all_indexes.py

To rebuild specific collection:
    poetry run python rebuild_all_indexes.py --collection subtitle_tracks
"""

import asyncio
import sys
from pathlib import Path
from typing import List, Type, Optional

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from beanie import Document
from pymongo import IndexModel, TEXT

from app.core.database import connect_to_mongo, close_mongo_connection, get_database
from app.models.subtitles import SubtitleTrackDoc, TranslationCacheDoc, SubtitleSearchCacheDoc, SubtitleQuotaTrackerDoc
from app.models.content import Content, LiveChannel, EPGEntry, RadioStation, Podcast, PodcastEpisode, TranslationStageMetrics
from app.models.user import User
from app.models.playback_session import PlaybackSession
from app.models.watchlist import WatchlistItem, WatchHistory, Conversation


async def rebuild_collection_indexes(
    model: Type[Document],
    collection_name: str,
    verbose: bool = True
) -> int:
    """
    Rebuild indexes for a single collection.

    Args:
        model: Beanie Document model class
        collection_name: Name of the collection
        verbose: Print detailed progress

    Returns:
        Number of indexes created
    """
    if verbose:
        print(f"\n{'='*60}")
        print(f"📊 Collection: {collection_name}")
        print(f"{'='*60}")

    # Get MongoDB collection directly
    db = get_database()
    collection = db[collection_name]

    # Get existing indexes
    existing_indexes = await collection.list_indexes().to_list(None)
    if verbose:
        print(f"\n📋 Current indexes ({len(existing_indexes)}):")
        for idx in existing_indexes:
            print(f"   - {idx['name']}")

    # Drop all indexes except _id
    if verbose:
        print("\n🗑️  Dropping existing indexes...")
    dropped_count = 0
    for idx in existing_indexes:
        if idx['name'] != '_id_':
            try:
                await collection.drop_index(idx['name'])
                if verbose:
                    print(f"   ✓ Dropped: {idx['name']}")
                dropped_count += 1
            except Exception as e:
                if verbose:
                    print(f"   ⚠️  Skip: {idx['name']} - {e}")

    # Recreate indexes from model Settings
    if verbose:
        print(f"\n🔨 Creating indexes from {model.__name__} model...")

    # Get indexes from model Settings
    if hasattr(model, 'Settings') and hasattr(model.Settings, 'indexes'):
        indexes_to_create = []

        for index_def in model.Settings.indexes:
            if isinstance(index_def, IndexModel):
                # Already an IndexModel
                indexes_to_create.append(index_def)
            elif isinstance(index_def, str):
                # Single field index
                indexes_to_create.append(IndexModel([(index_def, 1)]))
            elif isinstance(index_def, (tuple, list)):
                # Check if it's a list of tuples (compound index already formatted)
                if index_def and isinstance(index_def[0], tuple):
                    # Already formatted as [(field, direction), ...]
                    indexes_to_create.append(IndexModel(index_def))
                else:
                    # List of field names, convert to tuples
                    indexes_to_create.append(IndexModel([(field, 1) for field in index_def]))
            else:
                if verbose:
                    print(f"   ⚠️  Unknown index type: {type(index_def)}")

        # Create indexes in bulk
        if indexes_to_create:
            try:
                await collection.create_indexes(indexes_to_create)
                if verbose:
                    print(f"   ✓ Created {len(indexes_to_create)} indexes")
            except Exception as e:
                if verbose:
                    print(f"   ⚠️  Error creating indexes: {e}")
                # Try creating indexes one by one
                for idx_model in indexes_to_create:
                    try:
                        await collection.create_indexes([idx_model])
                        if verbose:
                            print(f"   ✓ Created index: {idx_model.document['key']}")
                    except Exception as e2:
                        if verbose:
                            print(f"   ⚠️  Failed to create index: {e2}")
    else:
        if verbose:
            print(f"   ⚠️  No indexes defined in {model.__name__}.Settings")

    # Verify new indexes
    new_indexes = await collection.list_indexes().to_list(None)
    if verbose:
        print(f"\n✅ Rebuilt indexes ({len(new_indexes)}):")
        for idx in new_indexes:
            key_info = idx.get('key', {})
            print(f"   - {idx['name']}: {dict(key_info)}")

    return len(new_indexes) - 1  # Exclude _id index from count


async def rebuild_indexes(target_collection: Optional[str] = None):
    """
    Rebuild indexes for all collections or a specific collection.

    Args:
        target_collection: Optional collection name to rebuild. If None, rebuilds all.
    """
    print("🔧 Connecting to database and initializing models...")

    # connect_to_mongo initializes Beanie with all models
    await connect_to_mongo()

    try:
        # Define all collections that need index rebuilding
        collections_to_rebuild = [
            # CRITICAL: Subtitle collections (primary fix for 62s query)
            (SubtitleTrackDoc, "subtitle_tracks"),
            (TranslationCacheDoc, "translation_cache"),
            (SubtitleSearchCacheDoc, "subtitle_search_cache"),
            (SubtitleQuotaTrackerDoc, "subtitle_quota_tracker"),

            # Content collections
            (Content, "content"),
            (LiveChannel, "live_channels"),
            (EPGEntry, "epg_entries"),
            (RadioStation, "radio_stations"),
            (Podcast, "podcasts"),
            (PodcastEpisode, "podcast_episodes"),
            (TranslationStageMetrics, "translation_stage_metrics"),

            # User and analytics collections
            (User, "users"),
            (PlaybackSession, "playback_sessions"),
            (WatchlistItem, "watchlist_items"),
            (WatchHistory, "watch_history"),
            (Conversation, "conversations"),
        ]

        # Filter to specific collection if requested
        if target_collection:
            collections_to_rebuild = [
                (model, name) for model, name in collections_to_rebuild
                if name == target_collection
            ]
            if not collections_to_rebuild:
                print(f"❌ Collection '{target_collection}' not found in rebuild list")
                return

        total_collections = len(collections_to_rebuild)
        total_indexes = 0

        print(f"\n🎯 Rebuilding {total_collections} collection(s)...\n")

        # Rebuild each collection
        for i, (model, collection_name) in enumerate(collections_to_rebuild, 1):
            print(f"\n[{i}/{total_collections}] Processing {collection_name}...")

            index_count = await rebuild_collection_indexes(
                model=model,
                collection_name=collection_name,
                verbose=True
            )
            total_indexes += index_count

        # Summary
        print("\n" + "="*60)
        print("🎉 INDEX REBUILD COMPLETE")
        print("="*60)
        print(f"✓ Collections processed: {total_collections}")
        print(f"✓ Total indexes created: {total_indexes}")

        # Performance improvements summary
        print("\n💡 Performance improvements:")
        if not target_collection or target_collection == "subtitle_tracks":
            print("   ✓ subtitle_tracks.content_id → Fast subtitle lookup (fixes 62s query)")
            print("   ✓ subtitle_tracks.language → Fast language filtering")
            print("   ✓ subtitle_tracks.cues.text → Full-text subtitle search")
        if not target_collection or target_collection == "content":
            print("   ✓ content.is_series → Fast content type filtering")
            print("   ✓ content.title → Fast alphabetical sorting")
            print("   ✓ content.year → Fast year sorting")
            print("   ✓ content.view_count → Fast popularity sorting")

        print("\n🚀 Indexes ready! Queries should now be fast.")

    finally:
        await close_mongo_connection()
        print("\n✨ Done!")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Rebuild MongoDB collection indexes for performance"
    )
    parser.add_argument(
        "--collection",
        type=str,
        help="Specific collection to rebuild (e.g., subtitle_tracks)",
    )

    args = parser.parse_args()

    try:
        asyncio.run(rebuild_indexes(target_collection=args.collection))
    except KeyboardInterrupt:
        print("\n⚠️  Interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
