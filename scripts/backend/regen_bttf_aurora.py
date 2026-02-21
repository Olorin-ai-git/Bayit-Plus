#!/usr/bin/env python3
"""
Generate Aurora lip-sync videos for all 5 BTTF interactive moments.
Downloads results locally, then upload to GCS via gcloud CLI.
"""
import asyncio
import hashlib
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import httpx
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import get_settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)

SYNC_ENDPOINT = "https://fal.run/fal-ai/creatify/aurora"
QUEUE_ENDPOINT = "https://queue.fal.run/fal-ai/creatify/aurora"
GCS_BUCKET = "gs://bayit-plus-media-new"
OUTPUT_DIR = Path("/tmp/bttf-aurora")

MOMENTS = [
    {
        "index": 0,
        "character": "Jennifer Parker",
        "face_url": "https://static.wikia.nocookie.net/bttf/images/6/65/Jennifer-02.jpg/revision/latest",
        "audio_url": "https://storage.googleapis.com/bayit-plus-media-new/vod-interactions/character-audio/jennifer_parker.mp3",
    },
    {
        "index": 1,
        "character": "Doc Brown",
        "face_url": "https://storage.googleapis.com/bayit-plus-media-new/vod-interactions/character-faces/doc_brown.jpg",
        "audio_url": "https://storage.googleapis.com/bayit-plus-media-new/vod-interactions/character-audio/doc_brown_1.mp3",
    },
    {
        "index": 2,
        "character": "George McFly",
        "face_url": "https://storage.googleapis.com/bayit-plus-media-new/vod-interactions/character-faces/george_mcfly.jpg",
        "audio_url": "https://storage.googleapis.com/bayit-plus-media-new/vod-interactions/character-audio/george_mcfly.mp3",
    },
    {
        "index": 3,
        "character": "Doc Brown (2)",
        "face_url": "https://storage.googleapis.com/bayit-plus-media-new/vod-interactions/character-faces/doc_brown.jpg",
        "audio_url": "https://storage.googleapis.com/bayit-plus-media-new/vod-interactions/character-audio/doc_brown_2.mp3",
    },
    {
        "index": 4,
        "character": "Biff Tannen",
        "face_url": "https://storage.googleapis.com/bayit-plus-media-new/vod-interactions/character-faces/biff_tannen.jpg",
        "audio_url": "https://storage.googleapis.com/bayit-plus-media-new/vod-interactions/character-audio/biff_tannen_621f75d1.mp3",
    },
]


async def call_aurora(
    image_url: str,
    audio_url: str,
    fal_key: str,
    client: httpx.AsyncClient,
    max_retries: int = 3,
) -> str:
    """Call Aurora lip-sync API with retry logic, return temporary video URL."""
    headers = {
        "Authorization": f"Key {fal_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "image_url": image_url,
        "audio_url": audio_url,
        "resolution": "480p",
        "guidance_scale": 1,
        "audio_guidance_scale": 2,
    }

    for attempt in range(max_retries):
        resp = await client.post(SYNC_ENDPOINT, json=payload, headers=headers)

        if resp.status_code == 200:
            return resp.json()["video"]["url"]

        if resp.status_code in (202, 409):
            request_id = resp.json().get("request_id")
            logger.info("Aurora queued: %s, polling...", request_id)
            return await poll_aurora(request_id, fal_key, client)

        if resp.status_code >= 500 and attempt < max_retries - 1:
            wait = (attempt + 1) * 15
            logger.info(
                "Aurora 500 error (attempt %d/%d), retrying in %ds...",
                attempt + 1, max_retries, wait,
            )
            await asyncio.sleep(wait)
            continue

        logger.error("Aurora error %d: %s", resp.status_code, resp.text[:200])
        resp.raise_for_status()

    return ""


async def poll_aurora(
    request_id: str, fal_key: str, client: httpx.AsyncClient,
) -> str:
    """Poll Aurora queue until complete."""
    headers = {"Authorization": f"Key {fal_key}", "Content-Type": "application/json"}
    status_url = f"{QUEUE_ENDPOINT}/requests/{request_id}/status"
    result_url = f"{QUEUE_ENDPOINT}/requests/{request_id}"

    for attempt in range(120):
        resp = await client.get(status_url, headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            st = data.get("status")
            if st == "COMPLETED":
                res = await client.get(result_url, headers=headers)
                res.raise_for_status()
                return res.json()["video"]["url"]
            if st in ("FAILED", "CANCELLED"):
                raise RuntimeError(f"Aurora job {request_id} failed: {data}")
        if attempt % 6 == 0:
            logger.info("Polling Aurora %s, attempt %d", request_id, attempt)
        await asyncio.sleep(5)

    raise TimeoutError(f"Aurora job {request_id} timed out")


async def download_video(url: str, local_path: Path, client: httpx.AsyncClient) -> None:
    """Download video from temporary URL."""
    resp = await client.get(url)
    resp.raise_for_status()
    local_path.write_bytes(resp.content)
    logger.info("Downloaded %d bytes to %s", len(resp.content), local_path)


def upload_to_gcs(local_path: Path, gcs_path: str) -> str:
    """Upload file to GCS via gcloud CLI, return public URL."""
    full_gcs = f"{GCS_BUCKET}/{gcs_path}"
    result = subprocess.run(
        ["gcloud", "storage", "cp", str(local_path), full_gcs],
        capture_output=True, text=True, timeout=60,
    )
    if result.returncode != 0:
        raise RuntimeError(f"gcloud upload failed: {result.stderr}")
    public_url = f"https://storage.googleapis.com/bayit-plus-media-new/{gcs_path}"
    logger.info("Uploaded to GCS: %s", public_url)
    return public_url


async def main():
    settings = get_settings()
    fal_key = settings.FAL_KEY
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    mongo = AsyncIOMotorClient(settings.MONGODB_URI)
    db = mongo[settings.MONGODB_DB_NAME]
    content = await db.content.find_one({"imdb_id": "tt0088763"})
    if not content:
        logger.error("BTTF content not found")
        return

    moments = content.get("interactive_moments", [])
    results = {}

    async with httpx.AsyncClient(
        timeout=httpx.Timeout(600.0, connect=15.0),
        follow_redirects=True,
    ) as client:
        for m in MOMENTS:
            idx = m["index"]
            char = m["character"]

            # Skip already-completed moments (have GCS video URL)
            existing_video = moments[idx].get("character_response_video_url", "")
            if existing_video.startswith("https://storage.googleapis.com/"):
                logger.info("Moment %d (%s): already done, skipping", idx, char)
                results[idx] = existing_video
                continue

            logger.info("=== Moment %d: %s ===", idx, char)

            # Call Aurora
            temp_video_url = await call_aurora(
                m["face_url"], m["audio_url"], fal_key, client,
            )
            logger.info("Aurora result for %s: %s", char, temp_video_url[:80])

            # Download locally
            url_hash = hashlib.md5(m["face_url"].encode()).hexdigest()[:12]
            local_file = OUTPUT_DIR / f"moment_{idx}_{url_hash}.mp4"
            await download_video(temp_video_url, local_file, client)

            # Upload to GCS
            gcs_path = f"vod-interactions/aurora-lipsync/bttf_moment_{idx}_{url_hash}.mp4"
            gcs_url = upload_to_gcs(local_file, gcs_path)
            results[idx] = gcs_url

            # Update MongoDB incrementally
            moments[idx]["character_response_video_url"] = gcs_url
            await db.content.update_one(
                {"_id": content["_id"]},
                {"$set": {"interactive_moments": moments}},
            )
            logger.info("Moment %d saved to MongoDB: %s", idx, gcs_url[:80])

    logger.info("=== ALL DONE ===")
    for idx, url in results.items():
        logger.info("  Moment %d: %s", idx, url)

    mongo.close()


if __name__ == "__main__":
    asyncio.run(main())
