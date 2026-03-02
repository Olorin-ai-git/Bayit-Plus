#!/usr/bin/env python3
"""
Chunked HLS Converter with Resume Support

Converts movies to HLS format with embedded subtitles using a multi-stage
approach with checkpointing for resume capability.

Stages:
    1. Initialize - Fetch content info and create state file
    2. Download - Download source file (if URL) with resume support
    3. Transcode - Convert to HLS segments
    4. Subtitles - Generate VTT files from database
    5. Upload - Upload HLS files to GCS with progress tracking
    6. Finalize - Update database with new URL

Usage:
    python convert_to_hls_chunked.py <content_id> [--force] [--clean]

    --force: Re-run even if already completed
    --clean: Remove state file and start fresh
"""

import argparse
import asyncio
import json
import os
import sys
import tempfile
import time
from datetime import datetime
from pathlib import Path
from typing import Optional

# Add backend and shared packages to path
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "backend"))
sys.path.insert(0, str(PROJECT_ROOT / "packages" / "olorin-shared"))
sys.path.insert(0, str(PROJECT_ROOT / "packages" / "python" / "olorin-i18n"))

STATE_DIR = Path(__file__).parent / ".hls_conversion_state"


class ConversionState:
    """Manages conversion state for resume capability."""

    STAGES = ["init", "download", "transcode", "subtitles", "upload", "finalize"]

    def __init__(self, content_id: str):
        self.content_id = content_id
        self.state_file = STATE_DIR / f"{content_id}.json"
        self.state = self._load_or_create()

    def _load_or_create(self) -> dict:
        """Load existing state or create new."""
        STATE_DIR.mkdir(parents=True, exist_ok=True)

        if self.state_file.exists():
            with open(self.state_file) as f:
                return json.load(f)

        return {
            "content_id": self.content_id,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "current_stage": "init",
            "completed_stages": [],
            "temp_dir": None,
            "source_url": None,
            "local_source": None,
            "hls_output_dir": None,
            "subtitle_files": [],
            "uploaded_files": [],
            "total_segments": 0,
            "uploaded_segments": 0,
            "final_url": None,
            "error": None,
        }

    def save(self):
        """Persist state to disk."""
        self.state["updated_at"] = datetime.now().isoformat()
        with open(self.state_file, "w") as f:
            json.dump(self.state, f, indent=2)

    def complete_stage(self, stage: str):
        """Mark a stage as completed."""
        if stage not in self.state["completed_stages"]:
            self.state["completed_stages"].append(stage)
        idx = self.STAGES.index(stage)
        if idx + 1 < len(self.STAGES):
            self.state["current_stage"] = self.STAGES[idx + 1]
        self.save()

    def is_stage_complete(self, stage: str) -> bool:
        """Check if a stage is already completed."""
        return stage in self.state["completed_stages"]

    def set_error(self, error: str):
        """Record an error."""
        self.state["error"] = error
        self.save()

    def clear_error(self):
        """Clear any recorded error."""
        self.state["error"] = None
        self.save()

    def cleanup(self):
        """Remove state file."""
        if self.state_file.exists():
            self.state_file.unlink()


async def run_stage_init(state: ConversionState, db) -> bool:
    """Stage 1: Initialize - fetch content info."""
    if state.is_stage_complete("init"):
        print("  [SKIP] Init stage already complete")
        return True

    print("\n[STAGE 1/6] Initializing...")
    from bson import ObjectId

    content = await db["content"].find_one({"_id": ObjectId(state.content_id)})
    if not content:
        state.set_error(f"Content not found: {state.content_id}")
        return False

    print(f"  Title: {content['title']}")
    print(f"  Stream URL: {content.get('stream_url', 'N/A')}")

    state.state["title"] = content["title"]
    state.state["source_url"] = content.get("stream_url")

    # Create temp directory for this conversion
    temp_dir = tempfile.mkdtemp(prefix=f"hls_{state.content_id}_")
    state.state["temp_dir"] = temp_dir
    state.state["hls_output_dir"] = os.path.join(temp_dir, "hls")
    os.makedirs(state.state["hls_output_dir"], exist_ok=True)

    state.complete_stage("init")
    print("  [OK] Init complete")
    return True


async def run_stage_download(state: ConversionState) -> bool:
    """Stage 2: Download source file (if URL)."""
    if state.is_stage_complete("download"):
        print("  [SKIP] Download stage already complete")
        return True

    print("\n[STAGE 2/6] Preparing source...")
    source_url = state.state["source_url"]

    if not source_url:
        state.set_error("No source URL found")
        return False

    # FFmpeg can read directly from HTTP URLs - no download needed
    # Just verify the URL is accessible
    if source_url.startswith("http"):
        print(f"  Source is URL: {source_url[:80]}...")
        print("  FFmpeg will stream directly from URL")
        state.state["local_source"] = source_url
    else:
        print(f"  Source is local file: {source_url}")
        state.state["local_source"] = source_url

    state.complete_stage("download")
    print("  [OK] Source ready")
    return True


async def run_stage_transcode(state: ConversionState) -> bool:
    """Stage 3: Convert to HLS segments."""
    if state.is_stage_complete("transcode"):
        print("  [SKIP] Transcode stage already complete")
        return True

    print("\n[STAGE 3/6] Transcoding to ABR HLS...")
    from app.services.ffmpeg.conversion import convert_to_abr_hls

    source = state.state["local_source"]
    output_dir = state.state["hls_output_dir"]

    print(f"  Input: {source[:80]}...")
    print(f"  Output: {output_dir}")
    print("  This may take a while (multi-bitrate encoding)...")

    try:
        result = await convert_to_abr_hls(
            input_path=source,
            output_dir=output_dir,
            segment_duration=6,
            timeout=28800,  # 8 hours max
        )

        state.state["variants"] = result["variants"]
        state.state["total_segments"] = result["total_segment_count"]
        variant_names = [v["name"] for v in result["variants"]]
        print(
            f"  [OK] Generated {result['total_segment_count']} segments "
            f"across {len(result['variants'])} variants: {variant_names}"
        )

        state.complete_stage("transcode")
        return True

    except Exception as e:
        state.set_error(f"Transcode failed: {e}")
        print(f"  [ERROR] {e}")
        return False


async def run_stage_subtitles(state: ConversionState, db) -> bool:
    """Stage 4: Generate VTT subtitle files."""
    if state.is_stage_complete("subtitles"):
        print("  [SKIP] Subtitles stage already complete")
        return True

    print("\n[STAGE 4/6] Generating subtitles...")
    output_dir = state.state["hls_output_dir"]

    # Get subtitle tracks from database
    tracks = await db["subtitle_tracks"].find(
        {"content_id": state.content_id}
    ).to_list(length=None)

    if not tracks:
        print("  No subtitles found in database")
        state.state["subtitle_files"] = []
        state.complete_stage("subtitles")
        return True

    languages = list(set(t["language"] for t in tracks))
    print(f"  Found {len(tracks)} tracks in {len(languages)} languages")

    # Group by language
    lang_tracks = {}
    for track in tracks:
        lang = track["language"]
        if lang not in lang_tracks:
            lang_tracks[lang] = track

    subtitle_files = []
    for lang, track in lang_tracks.items():
        # Generate VTT content
        vtt = "WEBVTT\n\n"
        for cue in track.get("cues", []):
            start = _format_timestamp(cue["start_time"])
            end = _format_timestamp(cue["end_time"])
            vtt += f"{cue['index']}\n{start} --> {end}\n{cue['text']}\n\n"

        # Write VTT file
        vtt_file = os.path.join(output_dir, f"subtitles_{lang}.vtt")
        with open(vtt_file, "w", encoding="utf-8") as f:
            f.write(vtt)

        # Generate HLS playlist wrapper for Apple TV
        m3u8_file = os.path.join(output_dir, f"subtitles_{lang}.m3u8")
        m3u8_content = f"""#EXTM3U
#EXT-X-TARGETDURATION:3600
#EXT-X-VERSION:3
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-PLAYLIST-TYPE:VOD
#EXTINF:3600.000,
subtitles_{lang}.vtt
#EXT-X-ENDLIST
"""
        with open(m3u8_file, "w", encoding="utf-8") as f:
            f.write(m3u8_content)

        subtitle_files.append({
            "language": lang,
            "label": _get_language_label(lang),
            "vtt_file": f"subtitles_{lang}.vtt",
            "m3u8_file": f"subtitles_{lang}.m3u8",
        })
        print(f"    Generated: {lang} ({_get_language_label(lang)})")

    # Generate ABR master manifest with subtitles and variants
    variants = state.state.get("variants", [])
    _generate_master_manifest(output_dir, subtitle_files, variants)
    variant_count = len(variants) if variants else 1
    print(
        f"  [OK] Generated ABR master manifest with "
        f"{variant_count} variant(s) and {len(subtitle_files)} subtitle track(s)"
    )

    state.state["subtitle_files"] = subtitle_files
    state.complete_stage("subtitles")
    return True


async def run_stage_upload(state: ConversionState) -> bool:
    """Stage 5: Upload HLS files to GCS with chunked progress."""
    if state.is_stage_complete("upload"):
        print("  [SKIP] Upload stage already complete")
        return True

    print("\n[STAGE 5/6] Uploading to GCS...")
    from google.cloud import storage as gcs_storage
    from app.core.config import settings

    # Clear stale credentials path so GCS client falls back to ADC
    creds_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "")
    if creds_path and not os.path.exists(creds_path):
        os.environ.pop("GOOGLE_APPLICATION_CREDENTIALS", None)

    output_dir = state.state["hls_output_dir"]
    title = state.state["title"]
    safe_title = _sanitize_title(title)
    gcs_path = f"movies/{safe_title}/hls"

    # Get list of files to upload
    files = list(Path(output_dir).glob("*"))
    total = len(files)
    uploaded = state.state.get("uploaded_files", [])

    print(f"  Total files: {total}")
    print(f"  Already uploaded: {len(uploaded)}")
    print(f"  Remaining: {total - len(uploaded)}")

    client = gcs_storage.Client()
    bucket = client.bucket(settings.GCS_BUCKET_NAME)

    master_url = None
    playlist_url = None

    for i, file_path in enumerate(files):
        if not file_path.is_file():
            continue

        filename = file_path.name
        if filename in uploaded:
            continue

        blob_name = f"{gcs_path}/{filename}"
        blob = bucket.blob(blob_name)

        # Set content type
        content_type = _get_content_type(filename)

        # Upload with retries
        for attempt in range(3):
            try:
                blob.upload_from_filename(str(file_path), content_type=content_type)
                break
            except Exception as e:
                if attempt == 2:
                    state.set_error(f"Upload failed for {filename}: {e}")
                    return False
                print(f"    Retry {attempt + 1} for {filename}")
                await asyncio.sleep(2 ** attempt)

        uploaded.append(filename)
        state.state["uploaded_files"] = uploaded
        state.save()  # Checkpoint after each file

        # Track playlist URLs
        url = f"https://storage.googleapis.com/{settings.GCS_BUCKET_NAME}/{blob_name}"
        if filename == "master.m3u8":
            master_url = url
        elif filename == "playlist.m3u8":
            playlist_url = url

        progress = (len(uploaded) / total) * 100
        print(f"    [{len(uploaded)}/{total}] {filename} ({progress:.0f}%)")

    state.state["final_url"] = master_url or playlist_url
    state.complete_stage("upload")
    print(f"  [OK] Upload complete: {state.state['final_url']}")
    return True


async def run_stage_finalize(state: ConversionState, db) -> bool:
    """Stage 6: Update database with new HLS URL."""
    if state.is_stage_complete("finalize"):
        print("  [SKIP] Finalize stage already complete")
        return True

    print("\n[STAGE 6/6] Updating database...")
    from bson import ObjectId

    final_url = state.state["final_url"]
    subtitle_langs = [s["language"] for s in state.state.get("subtitle_files", [])]

    await db["content"].update_one(
        {"_id": ObjectId(state.content_id)},
        {
            "$set": {
                "stream_url": final_url,
                "metadata.original_stream_url": state.state["source_url"],
                "metadata.hls_migrated_at": datetime.now().isoformat()[:10],
                "metadata.hls_has_embedded_subtitles": len(subtitle_langs) > 0,
                "metadata.hls_subtitle_languages": subtitle_langs,
            }
        },
    )

    state.complete_stage("finalize")
    print(f"  [OK] Database updated")
    print(f"\n{'='*60}")
    print(f"CONVERSION COMPLETE!")
    print(f"{'='*60}")
    print(f"Title: {state.state['title']}")
    print(f"HLS URL: {final_url}")
    print(f"Subtitles: {', '.join(subtitle_langs) if subtitle_langs else 'None'}")
    return True


def _format_timestamp(seconds: float) -> str:
    """Format seconds to VTT timestamp."""
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds % 1) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d}.{ms:03d}"


def _get_language_label(code: str) -> str:
    """Get language label from code."""
    labels = {
        "en": "English", "he": "Hebrew", "es": "Spanish", "fr": "French",
        "de": "German", "it": "Italian", "ru": "Russian", "ar": "Arabic",
        "zh": "Chinese", "ja": "Japanese",
    }
    return labels.get(code, code.upper())


def _sanitize_title(title: str) -> str:
    """Sanitize title for file paths."""
    import re
    safe = re.sub(r"[^\w\s\-\.]", "", title)
    return safe.replace(" ", "_")[:100]


def _get_content_type(filename: str) -> str:
    """Get MIME type for HLS files."""
    ext = Path(filename).suffix.lower()
    return {
        ".m3u8": "application/vnd.apple.mpegurl",
        ".ts": "video/MP2T",
        ".vtt": "text/vtt",
    }.get(ext, "application/octet-stream")


def _generate_master_manifest(
    output_dir: str,
    subtitle_files: list,
    variants: list = None,
):
    """Generate ABR master HLS manifest with variant and subtitle refs."""
    manifest = "#EXTM3U\n#EXT-X-VERSION:3\n\n"

    for sub in subtitle_files:
        manifest += (
            f'#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",'
            f'NAME="{sub["label"]}",DEFAULT=NO,AUTOSELECT=NO,FORCED=NO,'
            f'LANGUAGE="{sub["language"]}",'
            f'URI="{sub["m3u8_file"]}"\n'
        )

    if subtitle_files:
        manifest += "\n"

    has_subs = bool(subtitle_files)
    subs_attr = ',SUBTITLES="subs"' if has_subs else ""

    if variants:
        for variant in variants:
            manifest += (
                f"#EXT-X-STREAM-INF:"
                f"BANDWIDTH={variant['bandwidth']},"
                f"RESOLUTION={variant['width']}x{variant['height']},"
                f'CODECS="avc1.640029,mp4a.40.2"'
                f"{subs_attr}\n"
            )
            manifest += f"{variant['playlist']}\n"
    else:
        manifest += f"#EXT-X-STREAM-INF:BANDWIDTH=2000000{subs_attr}\n"
        manifest += "playlist.m3u8\n"

    with open(os.path.join(output_dir, "master.m3u8"), "w") as f:
        f.write(manifest)


async def main():
    parser = argparse.ArgumentParser(description="Chunked HLS conversion with resume")
    parser.add_argument("content_id", help="MongoDB content ID")
    parser.add_argument("--force", action="store_true", help="Re-run completed stages")
    parser.add_argument("--clean", action="store_true", help="Remove state and start fresh")
    args = parser.parse_args()

    print("=" * 60)
    print("HLS Conversion with Resume Support")
    print("=" * 60)

    state = ConversionState(args.content_id)

    if args.clean:
        print(f"Cleaning state for {args.content_id}...")
        state.cleanup()
        state = ConversionState(args.content_id)

    if args.force:
        print("Force mode: re-running all stages")
        state.state["completed_stages"] = []
        state.state["current_stage"] = "init"
        state.save()

    # Show current state
    print(f"\nContent ID: {args.content_id}")
    print(f"State file: {state.state_file}")
    print(f"Current stage: {state.state['current_stage']}")
    print(f"Completed: {state.state['completed_stages']}")

    if state.state.get("error"):
        print(f"Previous error: {state.state['error']}")
        state.clear_error()

    # Connect to MongoDB
    print("\nConnecting to MongoDB...")
    from olorin_shared.database import init_mongodb
    mongo = await init_mongodb()
    db = mongo.get_database()
    print("  [OK] Connected")

    # Run stages
    stages = [
        ("init", lambda: run_stage_init(state, db)),
        ("download", lambda: run_stage_download(state)),
        ("transcode", lambda: run_stage_transcode(state)),
        ("subtitles", lambda: run_stage_subtitles(state, db)),
        ("upload", lambda: run_stage_upload(state)),
        ("finalize", lambda: run_stage_finalize(state, db)),
    ]

    for stage_name, stage_func in stages:
        if not await stage_func():
            print(f"\n[FAILED] Stage '{stage_name}' failed")
            print(f"Error: {state.state.get('error')}")
            print(f"\nTo resume, run the same command again.")
            return 1

    # Cleanup state file on success
    state.cleanup()
    return 0


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
