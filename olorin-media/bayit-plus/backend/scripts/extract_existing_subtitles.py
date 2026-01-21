#!/usr/bin/env python3
"""
Extract subtitles from existing content that has embedded subtitles.

This script:
1. Finds content with embedded_subtitle_count > 0 but no extracted subtitles
2. Attempts to extract subtitles from the GCS stream URL
3. Saves extracted subtitles to the database
4. Reports progress and any failures

Note: Extraction from remote GCS URLs is slow (1-2 minutes per file).
For large libraries, consider running this overnight or in batches.
"""

import asyncio
import os
import sys
from datetime import datetime
from typing import List

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import connect_to_mongo
from app.models.content import Content
from app.models.subtitles import SubtitleCueModel, SubtitleTrackDoc
from app.services.ffmpeg_service import FFmpegService
from app.services.subtitle_service import parse_srt


async def extract_subtitles_for_content(
    content: Content, ffmpeg: FFmpegService
) -> dict:
    """
    Extract subtitles for a single content item.

    Returns:
        dict with keys: success, extracted_count, error
    """
    try:
        print(f"\n{'='*80}")
        print(f"Processing: {content.title}")
        print(f"  Stream URL: {content.stream_url[:80]}...")
        print(f"  Embedded tracks: {content.embedded_subtitle_count}")
        print(
            f"  Languages detected: {content.available_subtitle_languages or 'unknown'}"
        )

        # Extract subtitles (only required languages: en, he, es)
        print(f"  Extracting subtitles (this may take 1-2 minutes for remote files)...")
        start_time = datetime.utcnow()

        extracted_subs = await ffmpeg.extract_all_subtitles(
            content.stream_url,
            languages=["en", "he", "es"],
            max_parallel=2,  # Limit parallelism for remote files
        )

        elapsed = (datetime.utcnow() - start_time).total_seconds()

        if not extracted_subs:
            print(f"  ⚠️  No compatible subtitles found (took {elapsed:.1f}s)")
            return {"success": True, "extracted_count": 0, "skipped": True}

        print(f"  ✅ Extracted {len(extracted_subs)} tracks in {elapsed:.1f}s")

        # Save to database
        saved_count = 0
        for sub_data in extracted_subs:
            try:
                # Parse subtitle content
                cues = parse_srt(sub_data["content"])

                # Check if already exists
                existing = await SubtitleTrackDoc.find_one(
                    SubtitleTrackDoc.content_id == str(content.id),
                    SubtitleTrackDoc.language == sub_data["language"],
                    SubtitleTrackDoc.source == "embedded",
                )

                if existing:
                    print(f"     - {sub_data['language']}: already exists, skipping")
                    continue

                # Create subtitle track document
                subtitle_track = SubtitleTrackDoc(
                    content_id=str(content.id),
                    language=sub_data["language"],
                    source="embedded",
                    format=sub_data.get("format", "srt"),
                    codec=sub_data.get("codec", "unknown"),
                    cues=[SubtitleCueModel(**cue) for cue in cues],
                    is_default=sub_data["language"] == "en",
                )

                await subtitle_track.insert()
                saved_count += 1
                print(f"     - {sub_data['language']}: saved {len(cues)} cues")

            except Exception as e:
                print(f"     - {sub_data['language']}: ❌ failed to save: {str(e)}")

        # Update content
        if saved_count > 0:
            content.subtitle_extraction_status = "completed"
            content.subtitle_last_checked = datetime.utcnow()
            await content.save()

        return {"success": True, "extracted_count": saved_count}

    except Exception as e:
        error_msg = str(e)
        print(f"  ❌ FAILED: {error_msg}")

        # Update content status
        content.subtitle_extraction_status = "failed"
        content.subtitle_last_checked = datetime.utcnow()
        await content.save()

        return {"success": False, "extracted_count": 0, "error": error_msg}


async def main():
    """Main extraction process"""
    print("=" * 80)
    print("SUBTITLE EXTRACTION FOR EXISTING CONTENT")
    print("=" * 80)

    # Connect to database
    await connect_to_mongo()

    # Find content with embedded subtitles but no extracted ones
    print("\nFinding content with embedded subtitles...")

    content_items = await Content.find(Content.embedded_subtitle_count > 0).to_list()

    print(f"Found {len(content_items)} content items with embedded subtitles")

    if not content_items:
        print("No content to process. Exiting.")
        return

    # Check which ones already have extracted subtitles
    needs_extraction = []
    for content in content_items:
        existing_subs = await SubtitleTrackDoc.find(
            SubtitleTrackDoc.content_id == str(content.id),
            SubtitleTrackDoc.source == "embedded",
        ).count()

        if existing_subs == 0:
            needs_extraction.append(content)
        else:
            print(
                f"  ✓ {content.title}: already has {existing_subs} extracted subtitles"
            )

    if not needs_extraction:
        print("\n✅ All content already has extracted subtitles!")
        return

    print(f"\nNeed to extract subtitles for {len(needs_extraction)} items")
    print(
        f"Estimated time: {len(needs_extraction) * 1.5:.0f}-{len(needs_extraction) * 3:.0f} minutes"
    )
    print("\nStarting extraction...")

    # Initialize FFmpeg service
    ffmpeg = FFmpegService()

    # Process each content item
    results = {
        "success": 0,
        "failed": 0,
        "skipped": 0,
        "total_extracted": 0,
        "errors": [],
    }

    for i, content in enumerate(needs_extraction, 1):
        print(f"\n[{i}/{len(needs_extraction)}]", end=" ")

        result = await extract_subtitles_for_content(content, ffmpeg)

        if result.get("success"):
            if result.get("skipped"):
                results["skipped"] += 1
            else:
                results["success"] += 1
                results["total_extracted"] += result.get("extracted_count", 0)
        else:
            results["failed"] += 1
            results["errors"].append(
                {"title": content.title, "error": result.get("error", "Unknown error")}
            )

    # Print summary
    print("\n" + "=" * 80)
    print("EXTRACTION COMPLETE")
    print("=" * 80)
    print(f"Processed: {len(needs_extraction)} items")
    print(f"  ✅ Success: {results['success']}")
    print(f"  ⚠️  Skipped (no compatible tracks): {results['skipped']}")
    print(f"  ❌ Failed: {results['failed']}")
    print(f"  📝 Total subtitles extracted: {results['total_extracted']}")

    if results["errors"]:
        print(f"\nErrors:")
        for error in results["errors"]:
            print(f"  - {error['title']}: {error['error']}")


if __name__ == "__main__":
    asyncio.run(main())
