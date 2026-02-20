"""
Bayit+ Lip-Sync Generator CLI

Generates lip-synced videos from a still image + audio file (or text via
ElevenLabs TTS) using the fal.ai Aurora pipeline.

Run via the bash wrapper:
    ./scripts/generate-lipsync.sh --image photo.jpg --audio speech.mp3
    ./scripts/generate-lipsync.sh --image photo.jpg --text "Hello" --open
"""

import asyncio
import hashlib
import subprocess
import sys
from pathlib import Path

import httpx

from app.core.config import settings
from app.core.fal_aurora_client import fal_aurora_client
from app.core.logging_config import get_logger

logger = get_logger(__name__)

ELEVENLABS_TTS_URL = "https://api.elevenlabs.io/v1/text-to-speech"


def parse_args(argv: list[str]) -> dict:
    """Parse CLI arguments from sys.argv[1:]."""
    args: dict = {}
    i = 0
    while i < len(argv):
        token = argv[i]
        if token == "--image" and i + 1 < len(argv):
            args["image"] = argv[i + 1]
            i += 2
        elif token == "--audio" and i + 1 < len(argv):
            args["audio"] = argv[i + 1]
            i += 2
        elif token == "--text" and i + 1 < len(argv):
            args["text"] = argv[i + 1]
            i += 2
        elif token == "--voice-id" and i + 1 < len(argv):
            args["voice_id"] = argv[i + 1]
            i += 2
        elif token == "--resolution" and i + 1 < len(argv):
            args["resolution"] = argv[i + 1]
            i += 2
        elif token == "--output" and i + 1 < len(argv):
            args["output"] = argv[i + 1]
            i += 2
        elif token == "--open":
            args["open"] = True
            i += 1
        else:
            i += 1
    return args


async def ensure_public_url(local_path: str) -> str:
    """Upload a local file to tmpfiles.org so external APIs can access it."""
    path = Path(local_path)
    if not path.exists():
        raise FileNotFoundError(f"Local file not found: {path}")

    async with httpx.AsyncClient(timeout=httpx.Timeout(30.0)) as client:
        files = {"file": (path.name, path.read_bytes())}
        resp = await client.post(settings.TEMP_FILE_HOST_URL, files=files)
        resp.raise_for_status()
        page_url = resp.json()["data"]["url"]
        parts = page_url.split("tmpfiles.org/", 1)
        public_url = f"https://tmpfiles.org/dl/{parts[1]}"
        logger.info(
            "Uploaded local file to temp host",
            extra={"local": local_path, "public": public_url},
        )
        return public_url


async def resolve_url(value: str) -> str:
    """Resolve an image/audio argument to a public URL."""
    if value.startswith("http"):
        return value
    return await ensure_public_url(value)


async def generate_tts(text: str, voice_id: str) -> str:
    """Generate speech audio via ElevenLabs TTS. Returns local file path."""
    async with httpx.AsyncClient(timeout=httpx.Timeout(30.0)) as client:
        response = await client.post(
            f"{ELEVENLABS_TTS_URL}/{voice_id}",
            json={
                "text": text,
                "model_id": "eleven_multilingual_v2",
                "voice_settings": {
                    "stability": 0.5,
                    "similarity_boost": 0.75,
                },
            },
            headers={
                "xi-api-key": settings.ELEVENLABS_API_KEY,
                "Content-Type": "application/json",
            },
        )
        response.raise_for_status()

    text_hash = hashlib.md5(text.encode()).hexdigest()[:8]
    upload_dir = Path(settings.UPLOAD_DIR) / "cli-lipsync"
    upload_dir.mkdir(parents=True, exist_ok=True)
    audio_path = upload_dir / f"tts_{text_hash}.mp3"
    audio_path.write_bytes(response.content)
    logger.info(
        "TTS audio saved locally",
        extra={"path": str(audio_path), "size": len(response.content)},
    )
    return str(audio_path)


async def main() -> None:
    args = parse_args(sys.argv[1:])

    if "resolution" in args:
        fal_aurora_client.resolution = args["resolution"]

    # Resolve image URL
    image_url = await resolve_url(args["image"])

    # Resolve audio URL (from file or TTS)
    if "audio" in args:
        audio_url = await resolve_url(args["audio"])
    else:
        voice_id = args.get("voice_id", settings.ELEVENLABS_DEFAULT_VOICE_ID)
        local_audio = await generate_tts(args["text"], voice_id)
        audio_url = await ensure_public_url(local_audio)

    # Generate lip-sync video via Aurora
    storage_url = await fal_aurora_client.create_lipsync(
        image_url=image_url,
        audio_url=audio_url,
    )

    # Download result to local output path
    if "output" in args:
        output_path = Path(args["output"])
    else:
        url_hash = hashlib.md5(image_url.encode()).hexdigest()[:8]
        output_dir = Path(settings.UPLOAD_DIR) / "cli-lipsync"
        output_dir.mkdir(parents=True, exist_ok=True)
        output_path = output_dir / f"lipsync_{url_hash}.mp4"

    async with httpx.AsyncClient(timeout=httpx.Timeout(120.0)) as client:
        resp = await client.get(storage_url)
        resp.raise_for_status()
    output_path.write_bytes(resp.content)

    sys.stdout.write(f"{output_path}\n")

    if args.get("open"):
        subprocess.run(["open", str(output_path)], check=False)


if __name__ == "__main__":
    asyncio.run(main())
