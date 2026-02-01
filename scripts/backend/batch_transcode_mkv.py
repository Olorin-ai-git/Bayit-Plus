#!/usr/bin/env python3
"""
Batch transcode all MKV content to MP4 with faststart.
Deletes original MKV after successful transcode.
"""

import asyncio
import os
import sys
import tempfile
from datetime import datetime

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from beanie import init_beanie
from bson import ObjectId
from google.cloud import storage as gcs_storage
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.models.content import Content


async def transcode_single(content: Content, gcs_client: gcs_storage.Client) -> bool:
    """Transcode a single content item."""
    src_url = content.stream_url

    # Parse GCS path
    parts = src_url.replace("https://storage.googleapis.com/", "").split("/", 1)
    bucket_name, blob_path = parts[0], parts[1]

    # Output path
    base_path = blob_path.rsplit(".", 1)[0]
    output_blob_path = f"{base_path}_web.mp4"
    output_url = f"https://storage.googleapis.com/{bucket_name}/{output_blob_path}"

    bucket = gcs_client.bucket(bucket_name)
    output_blob = bucket.blob(output_blob_path)
    src_blob = bucket.blob(blob_path)

    # Check if already transcoded
    if output_blob.exists():
        print(f"  ⏭️  Already transcoded, updating DB")
        content.stream_url = output_url
        if not content.video_metadata:
            content.video_metadata = {}
        content.video_metadata["transcoded"] = True
        content.video_metadata["format"] = "mp4_faststart"
        await content.save()
        # Delete original if still exists
        if src_blob.exists():
            src_blob.delete()
            print(f"  🗑️  Deleted original MKV")
        return True

    # Check source exists and is valid size
    if not src_blob.exists():
        print(f"  ⚠️  Source file not found")
        return False

    src_blob.reload()
    src_size_mb = src_blob.size / 1024 / 1024
    if src_size_mb < 10:
        print(f"  ⚠️  Skipping corrupt/tiny file ({src_size_mb:.0f} MB)")
        return False

    # Download from GCS
    input_file = f"/tmp/transcode_input_{os.getpid()}.mkv"
    output_file = f"/tmp/transcode_output_{os.getpid()}.mp4"

    try:
        print(f"  ⬇️  Downloading ({src_size_mb:.0f} MB)...")
        src_blob.download_to_filename(input_file)

        print(f"  🔄 Transcoding...")
        cmd = [
            "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
            "-i", input_file,
            "-c:v", "copy",
            "-c:a", "aac", "-b:a", "192k", "-ac", "2",
            "-movflags", "+faststart",
            output_file,
        ]

        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        stdout, stderr = await process.communicate()

        # Clean up input immediately
        if os.path.exists(input_file):
            os.unlink(input_file)

        if process.returncode != 0:
            error = stderr.decode()[-200:] if stderr else "Unknown"
            print(f"  ❌ FFmpeg failed: {error}")
            return False

        output_size = os.path.getsize(output_file) / 1024 / 1024
        print(f"  📦 Transcoded: {output_size:.0f} MB")

        print(f"  ⬆️  Uploading...")
        output_blob.upload_from_filename(output_file, content_type="video/mp4")

        # Update database
        if not content.video_metadata:
            content.video_metadata = {}
        content.video_metadata["original_mkv_url"] = src_url
        content.video_metadata["transcoded"] = True
        content.video_metadata["format"] = "mp4_faststart"
        content.stream_url = output_url
        await content.save()

        # Delete original MKV
        try:
            src_blob.delete()
            print(f"  🗑️  Deleted original MKV")
        except Exception:
            pass  # Already deleted

        return True

    finally:
        if os.path.exists(input_file):
            os.unlink(input_file)
        if os.path.exists(output_file):
            os.unlink(output_file)


async def main():
    print(f"🚀 Batch MKV Transcode Started: {datetime.now()}")
    print("=" * 60)

    # Init DB
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    await init_beanie(database=client[settings.MONGODB_DB_NAME], document_models=[Content])

    # Init GCS
    gcs_client = gcs_storage.Client()

    # Find all MKV content
    contents = await Content.find({
        "stream_url": {"$regex": r"\.mkv$", "$options": "i"}
    }).to_list(500)

    print(f"📋 Found {len(contents)} MKV files to transcode\n")

    success = 0
    failed = 0

    for i, content in enumerate(contents, 1):
        print(f"[{i}/{len(contents)}] {content.title}")
        print(f"  📂 {content.stream_url[-60:]}")

        try:
            if await transcode_single(content, gcs_client):
                success += 1
                print(f"  ✅ Done\n")
            else:
                failed += 1
                print(f"  ❌ Failed\n")
        except Exception as e:
            failed += 1
            print(f"  ❌ Error: {e}\n")

    print("=" * 60)
    print(f"🏁 Completed: {success} success, {failed} failed")
    print(f"⏱️  Finished: {datetime.now()}")


if __name__ == "__main__":
    asyncio.run(main())
