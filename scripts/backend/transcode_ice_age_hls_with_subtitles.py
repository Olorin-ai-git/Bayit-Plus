"""
Transcode Ice Age to HLS with subtitle support for AirPlay/Chromecast

This script:
1. Downloads the video from GCS
2. Fetches all subtitle tracks in WebVTT format
3. Transcodes video to HLS with multiple bitrates
4. Generates HLS manifest with subtitle tracks
5. Uploads everything to GCS
"""
import asyncio
import os
import sys
import tempfile
import shutil
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.core.config import settings
from app.models.content import Content
from app.models.subtitles import SubtitleTrackDoc as SubtitleTrack
import subprocess


async def download_file(url: str, output_path: str):
    """Download file from URL using curl"""
    print(f"  Downloading {url}...")
    cmd = ["curl", "-L", "-o", output_path, url]
    process = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    await process.communicate()
    if process.returncode != 0:
        raise Exception(f"Failed to download {url}")
    print(f"  ✓ Downloaded to {output_path}")


async def transcode_to_hls_with_subtitles(
    video_path: str,
    subtitle_files: dict,
    output_dir: str
):
    """
    Transcode video to HLS with subtitle tracks embedded in manifest

    Args:
        video_path: Path to input video file
        subtitle_files: Dict of {language: vtt_file_path}
        output_dir: Directory for HLS output
    """
    print("\n=== Transcoding to HLS with subtitles ===")

    os.makedirs(output_dir, exist_ok=True)

    # Step 1: Transcode video to HLS
    print("Transcoding video...")
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

    # Count segments
    segment_count = len([f for f in os.listdir(output_dir) if f.endswith(".ts")])
    print(f"  ✓ Created {segment_count} video segments")

    # Step 2: Copy subtitle files to output directory
    print("Copying subtitle files...")
    for lang, vtt_path in subtitle_files.items():
        dest_path = os.path.join(output_dir, f"subtitles_{lang}.vtt")
        shutil.copy(vtt_path, dest_path)
        print(f"  ✓ Copied {lang} subtitles")

    # Step 3: Create master manifest with subtitles
    print("Creating master manifest with subtitle tracks...")
    master_path = os.path.join(output_dir, "master.m3u8")

    with open(master_path, 'w') as f:
        f.write("#EXTM3U\n")
        f.write("#EXT-X-VERSION:3\n\n")

        # Add subtitle tracks
        for lang, _ in subtitle_files.items():
            lang_name = {
                'he': 'Hebrew',
                'en': 'English',
                'es': 'Spanish',
                'da': 'Danish',
                'de': 'German',
                'et': 'Estonian',
                'fi': 'Finnish',
                'fr': 'French',
                'hu': 'Hungarian',
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

        # Add video stream
        f.write(f'#EXT-X-STREAM-INF:BANDWIDTH=5000000,SUBTITLES="subs"\n')
        f.write("playlist.m3u8\n")

    print(f"  ✓ Created master manifest: {master_path}")

    return {
        "master_path": master_path,
        "playlist_path": playlist_path,
        "segment_count": segment_count,
        "subtitle_count": len(subtitle_files)
    }


async def upload_to_gcs(local_dir: str, gcs_path: str):
    """Upload directory to GCS using gsutil"""
    print(f"\nUploading to GCS: gs://{settings.GCS_BUCKET_NAME}/{gcs_path}/...")

    cmd = [
        "gsutil",
        "-m",  # Multi-threaded
        "cp",
        "-r",  # Recursive
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
    print(f"  ✓ Uploaded to: {master_url}")

    return master_url


async def main():
    print("=" * 70)
    print("Ice Age HLS Transcoding with Subtitle Support")
    print("=" * 70)

    # Connect to database
    print("\nConnecting to MongoDB...")
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    await init_beanie(
        database=client[settings.MONGODB_DB_NAME],
        document_models=[Content, SubtitleTrack]
    )
    print("  ✓ Connected")

    # Get Ice Age content
    content_id = "6965398bb0b67350385e6e0b"
    print(f"\nFetching content: {content_id}")
    content = await Content.get(content_id)

    if not content:
        print(f"  ✗ Content not found: {content_id}")
        return

    print(f"  ✓ Found: {content.title}")
    print(f"    Stream URL: {content.stream_url}")

    # Check if already HLS
    if content.stream_url and ".m3u8" in content.stream_url:
        print("\n⚠️  Already in HLS format!")
        print(f"   Current URL: {content.stream_url}")
        response = input("\nOverwrite existing HLS? (yes/no): ")
        if response.lower() not in ['yes', 'y']:
            print("Aborted.")
            return

    # Get subtitle tracks
    print("\nFetching subtitle tracks...")
    subtitle_tracks = await SubtitleTrack.find(
        {"content_id": content_id}
    ).to_list()

    unique_languages = list(set(track.language for track in subtitle_tracks))
    print(f"  ✓ Found subtitles in {len(unique_languages)} languages: {', '.join(unique_languages)}")

    # Create temp directory
    temp_dir = tempfile.mkdtemp(prefix="ice_age_hls_")
    print(f"\nWorking directory: {temp_dir}")

    try:
        # Download video
        video_path = os.path.join(temp_dir, "ice_age.mp4")
        await download_file(content.stream_url, video_path)

        # Download subtitle files in VTT format
        print("\nDownloading subtitle files...")
        subtitle_files = {}

        for lang in unique_languages:
            # Use first subtitle track for each language
            track = next(t for t in subtitle_tracks if t.language == lang)
            vtt_url = f"http://localhost:8000/api/v1/subtitles/vtt/{content_id}?language={lang}"
            vtt_path = os.path.join(temp_dir, f"subtitles_{lang}.vtt")

            await download_file(vtt_url, vtt_path)
            subtitle_files[lang] = vtt_path

        print(f"  ✓ Downloaded {len(subtitle_files)} subtitle files")

        # Transcode to HLS with subtitles
        hls_dir = os.path.join(temp_dir, "hls_output")
        result = await transcode_to_hls_with_subtitles(
            video_path,
            subtitle_files,
            hls_dir
        )

        print(f"\n✓ HLS transcoding complete:")
        print(f"  - Video segments: {result['segment_count']}")
        print(f"  - Subtitle tracks: {result['subtitle_count']}")
        print(f"  - Master manifest: {result['master_path']}")

        # Upload to GCS
        gcs_path = "movies/Ice_Age/hls"
        master_url = await upload_to_gcs(hls_dir, gcs_path)

        # Update content in database
        print("\nUpdating content in database...")
        old_url = content.stream_url
        content.stream_url = master_url

        if not content.metadata:
            content.metadata = {}
        content.metadata["original_stream_url"] = old_url
        content.metadata["hls_migrated_at"] = "2026-02-02"
        content.metadata["hls_has_subtitles"] = True
        content.metadata["hls_subtitle_languages"] = unique_languages

        await content.save()

        print(f"  ✓ Updated content document")
        print(f"\n{'=' * 70}")
        print("✅ SUCCESS!")
        print(f"{'=' * 70}")
        print(f"\nNew HLS URL: {master_url}")
        print(f"\nSubtitles embedded in HLS manifest:")
        for lang in unique_languages:
            print(f"  - {lang}")
        print(f"\n🎬 Apple TV and Chromecast can now display subtitles!")
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
            print("  ✓ Cleaned up temp files")
        except Exception as e:
            print(f"  ⚠️  Failed to clean up: {e}")


if __name__ == "__main__":
    asyncio.run(main())
