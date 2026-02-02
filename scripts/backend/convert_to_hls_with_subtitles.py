"""
Generic HLS Converter with Subtitle Support

Converts any movie to HLS format with embedded subtitle tracks for
AirPlay and Chromecast compatibility.

Usage:
    python scripts/convert_to_hls_with_subtitles.py <content_id>
"""
import asyncio
import os
import sys
import tempfile
import shutil
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from bson import ObjectId
from olorin_shared.database import init_mongodb
from app.core.config import settings
from app.models.content import Content
from app.models.subtitles import SubtitleTrackDoc as SubtitleTrack


async def download_file(url: str, output_path: str):
    """Download file from URL using curl"""
    print(f"  Downloading...")
    # URL encode spaces and special characters
    import urllib.parse
    # Parse URL and encode path component
    from urllib.parse import urlparse, quote
    parsed = urlparse(url)
    # Encode the path (which may contain spaces)
    encoded_path = quote(parsed.path, safe='/')
    # Reconstruct URL with encoded path
    encoded_url = f"{parsed.scheme}://{parsed.netloc}{encoded_path}"

    cmd = ["curl", "-L", "-o", output_path, encoded_url]
    process = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await process.communicate()
    if process.returncode != 0:
        raise Exception(f"Failed to download: {stderr.decode()}")
    print(f"  ✓ Downloaded")


async def transcode_to_hls_with_subtitles(
    video_path: str,
    subtitle_files: dict,
    output_dir: str
):
    """
    Transcode video to HLS with subtitle tracks

    Args:
        video_path: Path to input video file
        subtitle_files: Dict of {language: vtt_file_path}
        output_dir: Directory for HLS output
    """
    print("\n=== Transcoding to HLS ===")

    os.makedirs(output_dir, exist_ok=True)

    # Transcode video to HLS
    playlist_path = os.path.join(output_dir, "playlist.m3u8")
    segment_pattern = os.path.join(output_dir, "segment_%03d.ts")

    cmd = [
        "ffmpeg",
        "-i", video_path,
        "-c:v", "libx264",
        "-c:a", "aac",
        "-hls_time", "10",
        "-hls_list_size", "0",
        "-hls_segment_filename", segment_pattern,
        "-f", "hls",
        "-y",
        playlist_path,
    ]

    process = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )

    stdout, stderr = await process.communicate()

    if process.returncode != 0:
        raise Exception(f"FFmpeg failed: {stderr.decode()}")

    segment_count = len([f for f in os.listdir(output_dir) if f.endswith(".ts")])
    print(f"  ✓ Created {segment_count} video segments")

    # Copy subtitle files
    print("  Copying subtitle files...")
    for lang, vtt_path in subtitle_files.items():
        dest_path = os.path.join(output_dir, f"subtitles_{lang}.vtt")
        shutil.copy(vtt_path, dest_path)

    # Create master manifest with subtitles
    master_path = os.path.join(output_dir, "master.m3u8")

    with open(master_path, 'w') as f:
        f.write("#EXTM3U\n")
        f.write("#EXT-X-VERSION:3\n\n")

        # Add subtitle tracks
        for lang, _ in subtitle_files.items():
            lang_name = {
                'he': 'Hebrew', 'en': 'English', 'es': 'Spanish',
                'da': 'Danish', 'de': 'German', 'et': 'Estonian',
                'fi': 'Finnish', 'fr': 'French', 'hu': 'Hungarian',
                'id': 'Indonesian'
            }.get(lang, lang.upper())

            is_default = "YES" if lang == "he" else "NO"
            is_autoselect = "YES" if lang == "he" else "NO"

            f.write(
                f'#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",'
                f'NAME="{lang_name}",DEFAULT={is_default},'
                f'AUTOSELECT={is_autoselect},FORCED=NO,LANGUAGE="{lang}",'
                f'URI="subtitles_{lang}.vtt"\n'
            )

        f.write("\n")
        f.write(f'#EXT-X-STREAM-INF:BANDWIDTH=5000000,SUBTITLES="subs"\n')
        f.write("playlist.m3u8\n")

    print(f"  ✓ Created master manifest with {len(subtitle_files)} subtitle tracks")

    return {
        "master_path": master_path,
        "segment_count": segment_count,
        "subtitle_count": len(subtitle_files)
    }


async def upload_to_gcs(local_dir: str, gcs_path: str):
    """Upload directory to GCS using gsutil"""
    print(f"\nUploading to GCS: gs://{settings.GCS_BUCKET_NAME}/{gcs_path}/...")

    cmd = [
        "gsutil",
        "-m",
        "cp",
        "-r",
        f"{local_dir}/*",
        f"gs://{settings.GCS_BUCKET_NAME}/{gcs_path}/"
    ]

    process = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )

    stdout, stderr = await process.communicate()

    if process.returncode != 0:
        raise Exception(f"GCS upload failed: {stderr.decode()}")

    master_url = f"https://storage.googleapis.com/{settings.GCS_BUCKET_NAME}/{gcs_path}/master.m3u8"
    print(f"  ✓ Uploaded: {master_url}")

    return master_url


async def convert_content_to_hls(content_id: str, force: bool = False):
    """
    Convert content to HLS with subtitles

    Args:
        content_id: MongoDB ObjectId of the content
        force: Overwrite existing HLS content
    """
    print("=" * 70)
    print(f"Converting to HLS with Subtitles: {content_id}")
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

    # Check if already HLS
    if stream_url and ".m3u8" in stream_url and not force:
        print("\n⚠️  Already in HLS format!")
        print(f"   Current URL: {stream_url}")
        return

    # Get subtitle tracks (content_id is stored as string in this collection)
    print("\nFetching subtitle tracks...")
    subtitle_tracks = await db["subtitle_tracks"].find(
        {"content_id": content_id}
    ).to_list(length=None)

    unique_languages = list(set(track['language'] for track in subtitle_tracks))
    print(f"  ✓ Found {len(unique_languages)} languages: {', '.join(unique_languages)}")

    # Create temp directory
    temp_dir = tempfile.mkdtemp(prefix="hls_convert_")
    print(f"\nWorking directory: {temp_dir}")

    try:
        # Download video
        video_path = os.path.join(temp_dir, "video.mp4")
        await download_file(stream_url, video_path)

        # Download subtitle files
        print("\nDownloading subtitles...")
        subtitle_files = {}

        for lang in unique_languages:
            vtt_url = f"http://localhost:8000/api/v1/subtitles/vtt/{content_id}?language={lang}"
            vtt_path = os.path.join(temp_dir, f"subtitles_{lang}.vtt")
            await download_file(vtt_url, vtt_path)
            subtitle_files[lang] = vtt_path

        # Transcode to HLS
        hls_dir = os.path.join(temp_dir, "hls_output")
        result = await transcode_to_hls_with_subtitles(
            video_path,
            subtitle_files,
            hls_dir
        )

        print(f"\n✓ Transcoding complete:")
        print(f"  - Segments: {result['segment_count']}")
        print(f"  - Subtitles: {result['subtitle_count']}")

        # Upload to GCS
        safe_title = content_dict['title'].replace(' ', '_').replace('/', '_')[:50]
        gcs_path = f"movies/{safe_title}/hls"
        master_url = await upload_to_gcs(hls_dir, gcs_path)

        # Update content
        print("\nUpdating database...")
        old_url = stream_url
        await db["content"].update_one(
            {"_id": object_id},
            {
                "$set": {
                    "stream_url": master_url,
                    "metadata.original_stream_url": old_url,
                    "metadata.hls_migrated_at": "2026-02-02",
                    "metadata.hls_has_subtitles": True,
                    "metadata.hls_subtitle_languages": unique_languages
                }
            }
        )

        print(f"\n{'=' * 70}")
        print("✅ SUCCESS!")
        print(f"{'=' * 70}")
        print(f"\nNew HLS URL: {master_url}")
        print(f"\nSubtitle languages: {', '.join(unique_languages)}")
        print(f"\n🎬 AirPlay/Chromecast ready!")
        print(f"{'=' * 70}")

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

    finally:
        # Clean up
        print(f"\nCleaning up: {temp_dir}")
        try:
            shutil.rmtree(temp_dir)
            print("  ✓ Cleaned up")
        except Exception as e:
            print(f"  ⚠️  Failed to clean up: {e}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scripts/convert_to_hls_with_subtitles.py <content_id> [--force]")
        sys.exit(1)

    content_id = sys.argv[1]
    force = "--force" in sys.argv

    asyncio.run(convert_content_to_hls(content_id, force))
