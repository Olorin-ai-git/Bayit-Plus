"""
Regenerate kid avatar lipsync videos for moments 0-3 (Remotion -> Aurora).

Extracts audio from the existing Remotion videos so the questions
stay identical, then re-renders with Aurora for consistent format.
"""

import asyncio
import hashlib
import subprocess
import tempfile

import httpx
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

from app.core.config import settings

CONTENT_ID = "698ff4b53fb07d3546f6fa4d"
KID_AVATAR_IMAGE = (
    "https://cdn.creatify.ai/creator/"
    "4045d05f-2dc5-4661-8121-733ecd3e8aec/st.png"
)
GCS_BUCKET = "bayit-plus-media-new"

# Indices of moments with Remotion URLs to regenerate
REMOTION_INDICES = [0, 1, 2, 3]


def extract_audio_from_video(video_path: str) -> str:
    """Extract audio track from video using ffmpeg."""
    audio_path = video_path.replace(".mp4", ".mp3")
    result = subprocess.run(
        [
            "ffmpeg", "-y",
            "-i", video_path,
            "-vn",
            "-acodec", "libmp3lame",
            "-q:a", "2",
            audio_path,
        ],
        capture_output=True,
        text=True,
        timeout=60,
    )
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg audio extract failed: {result.stderr}")
    return audio_path


def upload_to_gcs(local_path: str, gcs_path: str) -> str:
    """Upload file to GCS using gcloud CLI."""
    full_gcs = f"gs://{GCS_BUCKET}/{gcs_path}"
    result = subprocess.run(
        ["gcloud", "storage", "cp", local_path, full_gcs],
        capture_output=True,
        text=True,
        timeout=120,
    )
    if result.returncode != 0:
        raise RuntimeError(f"GCS upload failed: {result.stderr}")
    return f"https://storage.googleapis.com/{GCS_BUCKET}/{gcs_path}"


async def generate_aurora(
    image_url: str, audio_url: str, client: httpx.AsyncClient
) -> str:
    """Generate Aurora lip-sync video via fal.ai sync API."""
    headers = {
        "Authorization": f"Key {settings.FAL_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "image_url": image_url,
        "audio_url": audio_url,
        "resolution": "480p",
        "guidance_scale": 1,
        "audio_guidance_scale": 2,
    }

    print("  Calling Aurora sync API (2-5 min)...")
    resp = await client.post(
        "https://fal.run/fal-ai/creatify/aurora",
        headers=headers,
        json=payload,
        timeout=600,
    )
    resp.raise_for_status()
    result = resp.json()
    video_url = result.get("video", {}).get("url")
    if not video_url:
        raise RuntimeError(f"No video URL: {result}")
    return video_url


async def main():
    uri = str(settings.MONGODB_URI)
    mongo = AsyncIOMotorClient(uri)
    db = mongo["bayit_plus"]

    content = await db.content.find_one({"_id": ObjectId(CONTENT_ID)})
    if not content:
        raise RuntimeError("Content not found")

    moments = content.get("interactive_moments", [])
    print(f"Found {len(moments)} moments, regenerating indices {REMOTION_INDICES}\n")

    async with httpx.AsyncClient() as client:
        for idx in REMOTION_INDICES:
            moment = moments[idx]
            char = moment.get("character_name", "unknown")
            old_url = moment.get("lipsync_video_url", "")
            safe_name = char.lower().replace(" ", "_")

            if "remotionlambda" not in old_url:
                print(f"Moment {idx} ({char}): not Remotion, skipping")
                continue

            print(f"Moment {idx} ({char}):")
            print(f"  Old URL: {old_url[:70]}...")

            # 1. Download existing Remotion video
            print("  Downloading Remotion video...")
            video_resp = await client.get(old_url, timeout=120)
            video_resp.raise_for_status()

            with tempfile.NamedTemporaryFile(
                suffix=".mp4", delete=False, prefix=f"remotion_{safe_name}_"
            ) as f:
                f.write(video_resp.content)
                remotion_path = f.name
            print(f"  Downloaded: {len(video_resp.content)} bytes")

            # 2. Extract audio from Remotion video
            print("  Extracting audio...")
            audio_path = extract_audio_from_video(remotion_path)
            audio_hash = hashlib.md5(
                open(audio_path, "rb").read()
            ).hexdigest()[:12]
            print(f"  Audio extracted: {audio_path}")

            # 3. Upload extracted audio to GCS
            audio_gcs = (
                f"vod-interactions/kid-avatar-audio/"
                f"{safe_name}_regen_{audio_hash}.mp3"
            )
            audio_url = upload_to_gcs(audio_path, audio_gcs)
            print(f"  Audio GCS: {audio_url}")

            # 4. Aurora lip-sync with same audio + kid avatar image
            aurora_url = await generate_aurora(KID_AVATAR_IMAGE, audio_url, client)
            print(f"  Aurora done: {aurora_url[:60]}...")

            # 5. Download Aurora video and upload to GCS
            print("  Downloading Aurora video...")
            aurora_resp = await client.get(aurora_url, timeout=120)
            aurora_resp.raise_for_status()
            video_hash = hashlib.md5(aurora_resp.content).hexdigest()[:12]

            with tempfile.NamedTemporaryFile(
                suffix=".mp4", delete=False, prefix=f"aurora_{safe_name}_"
            ) as f:
                f.write(aurora_resp.content)
                aurora_local = f.name

            video_gcs = (
                f"vod-interactions/kid-avatar-lipsync/"
                f"bttf_kid_{safe_name}_{video_hash}.mp4"
            )
            gcs_url = upload_to_gcs(aurora_local, video_gcs)
            print(f"  New GCS URL: {gcs_url}")

            # 6. Update moment
            moment["lipsync_video_url"] = gcs_url
            print(f"  Updated moment {idx}\n")

        # Save
        await db.content.update_one(
            {"_id": ObjectId(CONTENT_ID)},
            {"$set": {"interactive_moments": moments}},
        )
        print("MongoDB saved.")

    mongo.close()
    print("Done!")


if __name__ == "__main__":
    asyncio.run(main())
