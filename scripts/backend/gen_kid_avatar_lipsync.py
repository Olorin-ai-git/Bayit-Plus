"""
Generate kid avatar lipsync videos for Biff and Marty moments.

Uses ElevenLabs TTS (Etai's cloned voice) + fal.ai Aurora lip-sync
+ GCS upload + MongoDB update.
"""

import asyncio
import hashlib
import subprocess
import tempfile
import time
from pathlib import Path

import httpx
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

from app.core.config import settings

CONTENT_ID = "698ff4b53fb07d3546f6fa4d"
KID_AVATAR_IMAGE = (
    "https://cdn.creatify.ai/creator/"
    "4045d05f-2dc5-4661-8121-733ecd3e8aec/st.png"
)
KID_VOICE_ID = "jQkT4jjvjt0UEM7lOGtL"
GCS_BUCKET = "bayit-plus-media-new"

# Moments to generate (character_name -> question text)
MOMENTS_TO_GEN = {
    "Biff Tannen": (
        "Hey Biff! Why are you always so mean to everyone? "
        "Do you ever wish you could be nicer?"
    ),
    "Marty McFly": (
        "Hey Marty! What is it like traveling through time? "
        "Were you scared when you went back to 1955?"
    ),
}


async def generate_tts(text: str, voice_id: str, client: httpx.AsyncClient) -> bytes:
    """Generate TTS audio via ElevenLabs."""
    resp = await client.post(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
        headers={
            "xi-api-key": settings.ELEVENLABS_API_KEY,
            "Content-Type": "application/json",
        },
        json={
            "text": text,
            "model_id": "eleven_multilingual_v2",
            "voice_settings": {"stability": 0.5, "similarity_boost": 0.75},
        },
        timeout=60,
    )
    resp.raise_for_status()
    return resp.content


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


async def generate_aurora_lipsync(
    image_url: str, audio_url: str, client: httpx.AsyncClient
) -> str:
    """Generate Aurora lip-sync video via fal.ai synchronous API."""
    fal_key = settings.FAL_KEY
    headers = {"Authorization": f"Key {fal_key}", "Content-Type": "application/json"}
    payload = {
        "image_url": image_url,
        "audio_url": audio_url,
        "resolution": "480p",
        "guidance_scale": 1,
        "audio_guidance_scale": 2,
    }

    print("  Calling Aurora sync API (may take 2-5 min)...")
    resp = await client.post(
        "https://fal.run/fal-ai/creatify/aurora",
        headers=headers,
        json=payload,
        timeout=600,
    )
    resp.raise_for_status()
    result_data = resp.json()
    video_url = result_data.get("video", {}).get("url")
    if not video_url:
        raise RuntimeError(f"No video URL in Aurora result: {result_data}")

    print(f"  Aurora complete: {video_url[:80]}...")
    return video_url


async def main():
    uri = str(settings.MONGODB_URI)
    mongo = AsyncIOMotorClient(uri)
    db = mongo["bayit_plus"]

    content = await db.content.find_one({"_id": ObjectId(CONTENT_ID)})
    if not content:
        raise RuntimeError(f"Content {CONTENT_ID} not found")

    moments = content.get("interactive_moments", [])
    print(f"Found {len(moments)} moments")

    async with httpx.AsyncClient() as client:
        for idx, moment in enumerate(moments):
            char_name = moment.get("character_name", "")
            if char_name not in MOMENTS_TO_GEN:
                continue

            existing_lipsync = moment.get("lipsync_video_url")
            if existing_lipsync and existing_lipsync.startswith("http"):
                print(f"Moment {idx} ({char_name}): already has lipsync, skipping")
                continue

            question_text = MOMENTS_TO_GEN[char_name]
            safe_name = char_name.lower().replace(" ", "_")
            print(f"\nMoment {idx} ({char_name}): generating kid avatar lipsync")
            print(f"  Question: {question_text}")

            # 1. Generate TTS audio
            print("  Generating TTS audio...")
            audio_data = await generate_tts(question_text, KID_VOICE_ID, client)
            audio_hash = hashlib.md5(audio_data).hexdigest()[:12]

            with tempfile.NamedTemporaryFile(
                suffix=".mp3", delete=False, prefix=f"kid_tts_{safe_name}_"
            ) as f:
                f.write(audio_data)
                audio_local = f.name
            print(f"  TTS audio: {len(audio_data)} bytes -> {audio_local}")

            # 2. Upload audio to GCS
            audio_gcs_path = (
                f"vod-interactions/kid-avatar-audio/{safe_name}_{audio_hash}.mp3"
            )
            audio_url = upload_to_gcs(audio_local, audio_gcs_path)
            print(f"  Audio uploaded: {audio_url}")

            # 3. Generate Aurora lip-sync
            print("  Generating Aurora lip-sync...")
            aurora_video_url = await generate_aurora_lipsync(
                KID_AVATAR_IMAGE, audio_url, client
            )

            # 4. Download Aurora video and upload to GCS
            print("  Downloading Aurora video...")
            video_resp = await client.get(aurora_video_url, timeout=120)
            video_resp.raise_for_status()
            video_hash = hashlib.md5(video_resp.content).hexdigest()[:12]

            with tempfile.NamedTemporaryFile(
                suffix=".mp4", delete=False, prefix=f"kid_aurora_{safe_name}_"
            ) as f:
                f.write(video_resp.content)
                video_local = f.name

            video_gcs_path = (
                f"vod-interactions/kid-avatar-lipsync/"
                f"bttf_kid_{safe_name}_{video_hash}.mp4"
            )
            video_gcs_url = upload_to_gcs(video_local, video_gcs_path)
            print(f"  Video uploaded: {video_gcs_url}")

            # 5. Update MongoDB
            moment["lipsync_video_url"] = video_gcs_url
            print(f"  MongoDB moment {idx} updated with lipsync_video_url")

        # Save all updates
        await db.content.update_one(
            {"_id": ObjectId(CONTENT_ID)},
            {"$set": {"interactive_moments": moments}},
        )
        print("\nMongoDB saved successfully")

    mongo.close()
    print("Done!")


if __name__ == "__main__":
    asyncio.run(main())
