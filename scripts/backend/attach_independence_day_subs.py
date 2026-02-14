#!/usr/bin/env python3
"""Attach OCR'd PGS subtitles to Independence Day (1996)."""

import asyncio
import os
import re
import sys
from datetime import UTC, datetime
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

from google.cloud import storage
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import get_settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)

SRT_DIR = "/Users/olorin/Movies/ID4_US_V2"
SRT_FILES = {
    "en": "title_t00.en.srt",
    "es": "title_t00.es.srt",
}
GCS_SUBS_PATH = "movies/Independence_Day_1996/subtitles"
IMDB_ID = "tt0116629"

LANGUAGE_NAMES = {
    "en": ("English", "English"),
    "es": ("Espa\u00f1ol", "Spanish"),
}


def parse_timestamp_srt(ts: str) -> float:
    ts = ts.strip().replace(",", ".")
    parts = ts.split(":")
    if len(parts) == 3:
        h, m, s = parts
        return float(h) * 3600 + float(m) * 60 + float(s)
    return 0.0


def parse_srt_to_cues(content: str) -> list[dict]:
    cues = []
    blocks = re.split(r"\n\s*\n", content.strip())
    for block in blocks:
        lines = block.strip().split("\n")
        if len(lines) < 2:
            continue
        try:
            if lines[0].strip().isdigit():
                index = int(lines[0].strip())
                timestamp_line = lines[1]
                text_lines = lines[2:]
            else:
                index = len(cues) + 1
                timestamp_line = lines[0]
                text_lines = lines[1:]
            if "-->" in timestamp_line:
                parts = timestamp_line.split("-->")
                start_time = parse_timestamp_srt(parts[0])
                end_time = parse_timestamp_srt(parts[1])
                text = " ".join(line.strip() for line in text_lines)
                text = re.sub(r"<[^>]+>", "", text)
                if text.strip():
                    cues.append({
                        "index": index,
                        "start_time": round(start_time, 3),
                        "end_time": round(end_time, 3),
                        "text": text.strip(),
                    })
        except (ValueError, IndexError):
            continue
    return cues


def upload_srt_to_gcs(srt_path: str, gcs_key: str, bucket_name: str) -> str:
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(gcs_key)
    blob.upload_from_filename(srt_path, content_type="text/plain")
    url = f"https://storage.googleapis.com/{bucket_name}/{gcs_key}"
    logger.info("  Uploaded %s -> %s", srt_path, url)
    return url


async def main():
    settings = get_settings()
    creds_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "")
    correct_creds = str(
        PROJECT_ROOT / "backend" / "credentials" / "bayit-plus-7c3927963c21.json"
    )
    if not os.path.exists(creds_path) and os.path.exists(correct_creds):
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = correct_creds

    logger.info("=" * 70)
    logger.info("Attach Subtitles: Independence Day (1996)")
    logger.info("=" * 70)

    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]

    content = await db.content.find_one({"imdb_id": IMDB_ID})
    if not content:
        logger.error("Content not found for IMDB %s", IMDB_ID)
        client.close()
        sys.exit(1)

    content_id = str(content["_id"])
    logger.info("Found content: %s (ID: %s)", content["title"], content_id)

    inserted_languages = []
    for lang_code, srt_filename in SRT_FILES.items():
        srt_path = os.path.join(SRT_DIR, srt_filename)
        if not os.path.exists(srt_path):
            logger.warning("SRT not found: %s (OCR may not be done)", srt_path)
            continue
        logger.info("")
        logger.info("Processing %s subtitles...", lang_code.upper())
        with open(srt_path, "r", encoding="utf-8") as f:
            srt_content = f.read()
        if not srt_content.strip():
            logger.warning("SRT file is empty: %s", srt_path)
            continue
        cues = parse_srt_to_cues(srt_content)
        logger.info("  Parsed %d subtitle cues", len(cues))
        if not cues:
            logger.warning("No cues parsed from %s", srt_path)
            continue

        gcs_key = f"{GCS_SUBS_PATH}/{lang_code}.srt"
        source_url = upload_srt_to_gcs(srt_path, gcs_key, settings.GCS_BUCKET_NAME)

        existing = await db.subtitle_tracks.find_one({
            "content_id": content_id, "language": lang_code, "source": "embedded",
        })
        if existing:
            logger.info("  Subtitle track already exists, updating...")
            await db.subtitle_tracks.update_one(
                {"_id": existing["_id"]},
                {"$set": {
                    "cues": cues, "source_url": source_url,
                    "format": "srt", "codec": "pgs_ocr",
                    "updated_at": datetime.now(UTC),
                }},
            )
        else:
            native_name, _ = LANGUAGE_NAMES.get(lang_code, (lang_code.upper(), lang_code.upper()))
            track_doc = {
                "content_id": content_id, "content_type": "vod",
                "language": lang_code, "language_name": native_name,
                "format": "srt", "source_url": source_url, "cues": cues,
                "has_nikud_version": False, "has_shoresh_version": False,
                "has_heblish_version": False, "has_grammar_flip_version": False,
                "has_slang_synthesis_version": False, "has_engrew_version": False,
                "is_default": lang_code == "en", "is_auto_generated": False,
                "source": "embedded", "codec": "pgs_ocr",
                "created_at": datetime.now(UTC), "updated_at": datetime.now(UTC),
            }
            await db.subtitle_tracks.insert_one(track_doc)
            logger.info("  Inserted subtitle track: %s (%d cues)", lang_code, len(cues))
        inserted_languages.append(lang_code)

    logger.info("")
    logger.info("Updating content record...")
    update_fields = {"updated_at": datetime.now(UTC)}
    if inserted_languages:
        all_langs = list(set(
            (content.get("available_subtitle_languages") or []) + inserted_languages
        ))
        update_fields["has_subtitles"] = True
        update_fields["available_subtitle_languages"] = sorted(all_langs)
        update_fields["embedded_subtitle_count"] = len(all_langs)
        update_fields["subtitle_extraction_status"] = "completed"
        update_fields["subtitle_last_checked"] = datetime.now(UTC)
    await db.content.update_one({"_id": content["_id"]}, {"$set": update_fields})

    if inserted_languages:
        logger.info("  has_subtitles: True")
        logger.info("  languages: %s", inserted_languages)
    client.close()

    logger.info("")
    logger.info("=" * 70)
    logger.info("DONE")
    logger.info("=" * 70)
    logger.info("  Content: %s", content["title"])
    logger.info("  Subtitles: %s", inserted_languages or "none")


if __name__ == "__main__":
    asyncio.run(main())
