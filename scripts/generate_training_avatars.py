"""
Generate photorealistic instructor avatar headshots via Google Gemini Imagen 3.

Usage:
    export GEMINI_API_KEY=$(grep GEMINI_API_KEY /opt/olorin/.env.bayit | cut -d= -f2)
    python3 scripts/generate_training_avatars.py

Generates 512x512 JPEG headshots for all placeholder avatars in the
training manifest. Skips avatars whose file is already >20KB (real).
"""

import base64
import json
import logging
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger(__name__)

API_KEY = os.environ.get("GEMINI_API_KEY")
if not API_KEY:
    logger.error("GEMINI_API_KEY not set")
    sys.exit(1)

BASE_URL = "https://generativelanguage.googleapis.com/v1beta"
MODEL = "models/imagen-4.0-generate-001"

ASSET_DIR = (
    Path(__file__).resolve().parent.parent / "shared/assets/avatars/training"
)
MANIFEST_PATH = ASSET_DIR / "manifest.json"

PLACEHOLDER_THRESHOLD_BYTES = 20_000

AVATAR_PROMPTS = {
    "instructor_f01": (
        "Professional headshot portrait of a woman in her 30s, "
        "wearing a dark blazer, neutral background, soft studio lighting, "
        "confident smile, corporate style, high resolution."
    ),
    "instructor_f02": (
        "Friendly headshot portrait of a woman in her late 20s, "
        "casual smart attire, warm natural lighting, approachable smile, "
        "slightly off-center pose, neutral blurred background."
    ),
    "instructor_f03": (
        "Authoritative headshot portrait of a woman in her 40s, "
        "wearing glasses, dark formal top, serious but approachable expression, "
        "studio lighting, professional background."
    ),
    "instructor_m01": (
        "Professional headshot portrait of a man in his 30s, "
        "wearing a suit and tie, neutral background, studio lighting, "
        "confident expression, corporate style."
    ),
    "instructor_m02": (
        "Friendly headshot portrait of a man in his late 20s, "
        "casual button-down shirt, warm lighting, genuine smile, "
        "slightly turned pose, soft background."
    ),
    "instructor_m03": (
        "Authoritative headshot portrait of a man in his 50s, "
        "wearing a dark blazer, silver hair, composed expression, "
        "professional studio lighting, neutral background."
    ),
}


def generate_image(prompt: str) -> bytes:
    """Call Gemini Imagen 3 API and return raw image bytes."""
    url = f"{BASE_URL}/{MODEL}:predict?key={API_KEY}"
    payload = json.dumps({
        "instances": [{"prompt": prompt}],
        "parameters": {
            "sampleCount": 1,
            "aspectRatio": "1:1",
            "outputOptions": {"mimeType": "image/jpeg"},
        },
    }).encode()

    req = urllib.request.Request(
        url, data=payload,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        data = json.loads(resp.read())

    predictions = data.get("predictions", [])
    if not predictions:
        raise ValueError("No image returned from Imagen API")

    return base64.b64decode(predictions[0]["bytesBase64Encoded"])


def main():
    manifest = json.loads(MANIFEST_PATH.read_text())

    for avatar in manifest["avatars"]:
        avatar_id = avatar["id"]
        if avatar_id not in AVATAR_PROMPTS:
            logger.info("SKIP %s (no prompt configured)", avatar_id)
            continue

        file_path = ASSET_DIR / avatar["file"]
        if (
            file_path.exists()
            and file_path.stat().st_size > PLACEHOLDER_THRESHOLD_BYTES
        ):
            logger.info(
                "SKIP %s (%d bytes, already real)",
                avatar_id, file_path.stat().st_size,
            )
            continue

        logger.info("GENERATING %s...", avatar_id)
        try:
            image_bytes = generate_image(AVATAR_PROMPTS[avatar_id])
        except (urllib.error.URLError, ValueError) as exc:
            logger.error("FAILED %s: %s", avatar_id, exc)
            continue

        out_path = file_path.with_suffix(".jpg")
        out_path.write_bytes(image_bytes)
        avatar["file"] = out_path.name
        logger.info("SAVED %s (%d bytes)", out_path.name, len(image_bytes))

        if file_path.suffix == ".png" and file_path.exists():
            file_path.unlink()
            logger.info("REMOVED old %s", file_path.name)

        time.sleep(15)

    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + "\n")
    logger.info("Manifest updated.")


if __name__ == "__main__":
    main()
