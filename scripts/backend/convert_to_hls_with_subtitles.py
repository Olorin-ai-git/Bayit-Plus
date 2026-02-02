"""
Generic HLS Converter with Embedded Subtitle Support

Converts any movie to HLS format with embedded subtitle tracks for
AirPlay and Chromecast compatibility using the centralized HLS service.

Usage:
    python scripts/convert_to_hls_with_subtitles.py <content_id> [--force]
"""
import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from bson import ObjectId
from olorin_shared.database import init_mongodb
from app.core.config import settings
from app.services.upload_service.hls import hls_service


async def convert_content_to_hls(content_id: str, force: bool = False):
    """
    Convert content to HLS with embedded subtitles using centralized service

    Args:
        content_id: MongoDB ObjectId of the content
        force: Overwrite existing HLS content
    """
    print("=" * 70)
    print(f"Converting to HLS with Embedded Subtitles: {content_id}")
    print("=" * 70)

    # Connect to database using olorin_shared (includes SSL/TLS fix for Python 3.13+)
    print("\nConnecting to MongoDB...")
    mongo_connection = await init_mongodb()
    db = mongo_connection.get_database()

    # Convert string ID to ObjectId
    try:
        object_id = ObjectId(content_id)
    except Exception:
        print(f"  ✗ Invalid ObjectId format: {content_id}")
        return

    # Get content without Beanie to avoid index issues
    content_dict = await db["content"].find_one({"_id": object_id})

    if not content_dict:
        print(f"  ✗ Content not found: {content_id}")
        return

    print(f"  ✓ Found: {content_dict['title']}")
    stream_url = content_dict.get('stream_url')

    if not stream_url:
        print("\n⚠️  No stream URL found!")
        return

    # Check if already HLS
    if stream_url and ".m3u8" in stream_url and not force:
        print("\n⚠️  Already in HLS format!")
        print(f"   Current URL: {stream_url}")
        print("\n   Use --force to re-convert")
        return

    # Get subtitle tracks (content_id is stored as string in this collection)
    print("\nFetching subtitle tracks...")
    subtitle_tracks = await db["subtitle_tracks"].find(
        {"content_id": content_id}
    ).to_list(length=None)

    unique_languages = list(set(track['language'] for track in subtitle_tracks))
    if subtitle_tracks:
        print(f"  ✓ Found {len(unique_languages)} languages: {', '.join(unique_languages)}")
    else:
        print("  ⚠️  No subtitle tracks found - will convert without subtitles")

    try:
        # Use centralized HLS service with content_id for embedded subtitles
        print("\n" + "=" * 70)
        print("Starting HLS Conversion (this may take a while)...")
        print("=" * 70)

        async def on_progress(msg: str, progress: float):
            print(f"  {msg} ({progress:.0f}%)")

        # Determine content type
        content_type_str = "movies"  # Default to movies, could enhance to detect series

        # Call centralized service - automatically handles:
        # 1. Video transcoding to HLS with FFmpeg
        # 2. Subtitle VTT file generation from database
        # 3. Master manifest creation with EXT-X-MEDIA tags
        # 4. GCS upload of all files
        hls_url = await hls_service.convert_and_upload(
            source_path=stream_url,
            content_title=content_dict['title'],
            content_type=content_type_str,
            content_id=content_id,  # CRITICAL: Pass content_id for embedded subtitles
            on_progress=on_progress,
        )

        if not hls_url:
            print("\n❌ HLS conversion failed - no playlist URL returned")
            return

        print(f"\n" + "=" * 70)
        print("HLS Conversion Complete!")
        print("=" * 70)
        print(f"\nNew HLS URL: {hls_url}")

        # Update content document
        print("\nUpdating database...")
        old_url = stream_url
        await db["content"].update_one(
            {"_id": object_id},
            {
                "$set": {
                    "stream_url": hls_url,
                    "metadata.original_stream_url": old_url,
                    "metadata.hls_migrated_at": "2026-02-02",
                    "metadata.hls_has_embedded_subtitles": True,
                    "metadata.hls_subtitle_languages": unique_languages
                }
            }
        )

        print(f"\n{'=' * 70}")
        print("✅ SUCCESS!")
        print(f"{'=' * 70}")
        print(f"\nContent: {content_dict['title']}")
        print(f"New URL: {hls_url}")
        if subtitle_tracks:
            print(f"\nEmbedded Subtitle Languages: {', '.join(unique_languages)}")
        print(f"\n🎬 AirPlay/Chromecast ready with embedded subtitles!")
        print(f"{'=' * 70}")

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scripts/convert_to_hls_with_subtitles.py <content_id> [--force]")
        print("\nExamples:")
        print("  python scripts/convert_to_hls_with_subtitles.py 6965398bb0b67350385e6e0b")
        print("  python scripts/convert_to_hls_with_subtitles.py 6965398bb0b67350385e6e0b --force")
        sys.exit(1)

    content_id = sys.argv[1]
    force = "--force" in sys.argv

    asyncio.run(convert_content_to_hls(content_id, force))
