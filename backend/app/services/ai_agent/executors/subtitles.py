"""
AI Agent Executors - Subtitle Management

Functions for scanning, extracting, verifying, and downloading subtitles.
"""

import asyncio
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional

from beanie import PydanticObjectId

from app.models.content import Content
from app.models.librarian import LibrarianAction
from app.services.ai_agent.tools import get_language_name

logger = logging.getLogger(__name__)


async def _extract_subtitles_background(content_id: str, stream_url: str):
    """Background task to extract and save subtitle tracks."""
    from app.services.ffmpeg_service import ffmpeg_service
    from app.services.subtitle_service import parse_subtitles
    from app.models.subtitles import SubtitleTrackDoc, SubtitleCueModel

    try:
        logger.info(f"[Background] Starting subtitle extraction for content {content_id}")

        content = await Content.get(PydanticObjectId(content_id))
        if not content:
            logger.error(f"[Background] Content {content_id} not found")
            return

        content.subtitle_extraction_status = "extracting"
        await content.save()

        extracted_subs = await ffmpeg_service.extract_all_subtitles(
            stream_url,
            languages=['en', 'he', 'es'],
            max_parallel=3,
            max_subtitles=10
        )

        saved_count = 0
        saved_languages = []

        for sub in extracted_subs:
            try:
                existing = await SubtitleTrackDoc.find_one({
                    "content_id": content_id,
                    "language": sub['language']
                })

                if existing:
                    continue

                track = parse_subtitles(sub['content'], sub['format'])
                cues = [
                    SubtitleCueModel(
                        index=cue.index,
                        start_time=cue.start_time,
                        end_time=cue.end_time,
                        text=cue.text,
                        text_nikud=cue.text_nikud
                    )
                    for cue in track.cues
                ]

                subtitle_doc = SubtitleTrackDoc(
                    content_id=content_id,
                    content_type="vod",
                    language=sub['language'],
                    language_name=get_language_name(sub['language']),
                    format="srt",
                    source="embedded",
                    cues=cues,
                    is_auto_generated=False
                )
                await subtitle_doc.insert()
                saved_count += 1
                saved_languages.append(sub['language'])
                logger.info(f"[Background] Saved {sub['language']} subtitles ({len(cues)} cues)")

            except Exception as e:
                logger.error(f"[Background] Failed to save {sub['language']} subtitles: {str(e)}")

        content.has_subtitles = saved_count > 0
        content.available_subtitle_languages = saved_languages
        content.subtitle_extraction_status = "completed" if saved_count > 0 else "failed"
        await content.save()

        logger.info(f"[Background] Extraction complete for {content_id}: {saved_count} tracks saved")

    except Exception as e:
        logger.error(f"[Background] Subtitle extraction failed for {content_id}: {str(e)}")
        try:
            content = await Content.get(PydanticObjectId(content_id))
            if content:
                content.subtitle_extraction_status = "failed"
                await content.save()
        except Exception:
            pass


async def execute_scan_video_subtitles(
    content_id: str,
    auto_extract: bool = True
) -> Dict[str, Any]:
    """Scan video file for embedded subtitles."""
    from app.services.ffmpeg_service import ffmpeg_service

    try:
        content = await Content.get(PydanticObjectId(content_id))
        if not content:
            return {"success": False, "error": "Content not found"}

        if not content.stream_url:
            return {"success": False, "error": "No video URL available"}

        metadata = await ffmpeg_service.analyze_video(content.stream_url)

        content.video_metadata = metadata
        content.embedded_subtitle_count = len(metadata['subtitle_tracks'])
        content.subtitle_last_checked = datetime.utcnow()
        await content.save()

        languages_found = [
            f"{track.get('language', 'unknown').upper()}"
            for track in metadata['subtitle_tracks']
        ]
        languages_str = ", ".join(languages_found) if languages_found else "none"

        result = {
            "success": True,
            "title": content.title,
            "content_id": content_id,
            "subtitle_count": len(metadata['subtitle_tracks']),
            "subtitles": metadata['subtitle_tracks'],
            "video_duration": metadata['duration'],
            "video_resolution": f"{metadata['width']}x{metadata['height']}"
        }

        if auto_extract and len(metadata['subtitle_tracks']) > 0:
            asyncio.create_task(_extract_subtitles_background(content_id, content.stream_url))
            result["extraction_started"] = True
            result["extraction_status"] = "background_processing"
            result["message"] = f"Found {len(metadata['subtitle_tracks'])} embedded tracks ({languages_str}). Extraction started."
        else:
            result["message"] = f"Scanned video: {len(metadata['subtitle_tracks'])} embedded tracks ({languages_str})"

        return result

    except Exception as e:
        logger.error(f"Error scanning video subtitles: {str(e)}")
        return {"success": False, "error": str(e)}


async def execute_extract_video_subtitles(
    content_id: str,
    audit_id: str,
    languages: Optional[List[str]] = None
) -> Dict[str, Any]:
    """Extract subtitle tracks from video and save to database."""
    try:
        content = await Content.get(PydanticObjectId(content_id))
        if not content:
            return {"success": False, "error": "Content not found"}

        if not content.stream_url:
            return {"success": False, "error": "No stream URL available"}

        asyncio.create_task(_extract_with_audit(content_id, content.stream_url, audit_id, languages))

        logger.info(f"Started background subtitle extraction for content {content_id}")

        return {
            "success": True,
            "status": "extraction_started_in_background",
            "message": f"Subtitle extraction started in background for languages: {languages or 'all'}"
        }

    except Exception as e:
        logger.error(f"Error starting subtitle extraction: {str(e)}")
        return {"success": False, "error": str(e)}


async def _extract_with_audit(
    content_id: str,
    stream_url: str,
    audit_id: str,
    languages: Optional[List[str]] = None
):
    """Background task to extract subtitles and create audit action."""
    from app.services.ffmpeg_service import ffmpeg_service
    from app.services.subtitle_service import parse_subtitles
    from app.models.subtitles import SubtitleTrackDoc, SubtitleCueModel
    from app.models.librarian import AuditReport
    from app.services.ai_agent.logger import log_to_database

    try:
        content = await Content.get(PydanticObjectId(content_id))
        if not content:
            return

        audit_report = await AuditReport.find_one(AuditReport.audit_id == audit_id)

        extracted_subs = await ffmpeg_service.extract_all_subtitles(
            stream_url,
            languages=languages if languages else None,
            max_parallel=3,
            max_subtitles=10
        )

        saved_count = 0
        saved_languages = []

        for sub in extracted_subs:
            try:
                track = parse_subtitles(sub['content'], sub['format'])
                cues = [
                    SubtitleCueModel(
                        index=cue.index,
                        start_time=cue.start_time,
                        end_time=cue.end_time,
                        text=cue.text,
                        text_nikud=cue.text_nikud
                    )
                    for cue in track.cues
                ]

                subtitle_doc = SubtitleTrackDoc(
                    content_id=content_id,
                    content_type="vod",
                    language=sub['language'],
                    language_name=get_language_name(sub['language']),
                    format="srt",
                    source="embedded",
                    cues=cues,
                    is_auto_generated=False
                )
                await subtitle_doc.insert()
                saved_count += 1
                saved_languages.append(sub['language'])

                if audit_report:
                    lang_display = get_language_name(sub['language'])
                    await log_to_database(
                        audit_report,
                        "success",
                        f"Extracted {lang_display} subtitle from embedded video track",
                        "AI Agent",
                        item_name=content.title,
                        content_id=content_id,
                        metadata={
                            "action": "extract_embedded_subtitle",
                            "language": sub['language'],
                            "source": "embedded",
                            "cue_count": len(cues),
                            "format": sub['format']
                        }
                    )

            except Exception as e:
                logger.error(f"[Background] Failed to parse {sub['language']} subtitles: {str(e)}")

        content.has_subtitles = saved_count > 0
        content.available_subtitle_languages = saved_languages
        content.subtitle_extraction_status = "completed"
        await content.save()

        action = LibrarianAction(
            audit_id=audit_id,
            action_type="extract_subtitles",
            content_id=content_id,
            content_type="content",
            issue_type="missing_subtitles",
            description=f"Extracted {saved_count} subtitle tracks for '{content.title}': {', '.join(saved_languages)}",
            auto_approved=True
        )
        await action.insert()

        logger.info(f"[Background] Extraction complete for audit {audit_id}: {saved_count} tracks saved")

    except Exception as e:
        logger.error(f"[Background] Error extracting video subtitles: {str(e)}")


async def execute_verify_required_subtitles(
    content_id: str,
    required_languages: List[str] = None
) -> Dict[str, Any]:
    """Verify content has required subtitle languages."""
    from app.models.subtitles import SubtitleTrackDoc

    if required_languages is None:
        required_languages = ["en", "he", "es"]

    try:
        content = await Content.get(PydanticObjectId(content_id))
        if not content:
            return {"success": False, "error": "Content not found"}

        existing_tracks = await SubtitleTrackDoc.find({"content_id": content_id}).to_list()
        existing_languages = [track.language for track in existing_tracks]
        missing_languages = [lang for lang in required_languages if lang not in existing_languages]

        return {
            "success": True,
            "has_all_required": len(missing_languages) == 0,
            "existing_languages": existing_languages,
            "missing_languages": missing_languages,
            "required_languages": required_languages
        }

    except Exception as e:
        logger.error(f"Error verifying subtitles: {str(e)}")
        return {"success": False, "error": str(e)}


async def execute_search_external_subtitles(
    content_id: str,
    language: str,
    sources: List[str] = None
) -> Dict[str, Any]:
    """Search for subtitles on external sources without downloading."""
    from app.services.external_subtitle_service import ExternalSubtitleService

    if sources is None:
        sources = ["opensubtitles", "tmdb"]

    try:
        service = ExternalSubtitleService()
        results = await service.search_subtitle_sources(
            content_id=content_id,
            language=language,
            sources=sources
        )
        return {
            "success": True,
            "found": results["found"],
            "source": results["source"],
            "available_sources": results["sources"],
            "cached": results["cached"]
        }
    except Exception as e:
        logger.error(f"Error searching external subtitles: {str(e)}")
        return {"success": False, "error": str(e)}


async def execute_download_external_subtitle(
    content_id: str,
    language: str,
    audit_id: str
) -> Dict[str, Any]:
    """Download and save subtitle from external source."""
    from app.services.external_subtitle_service import ExternalSubtitleService

    try:
        content = await Content.get(PydanticObjectId(content_id))
        if not content:
            return {"success": False, "error": "Content not found"}

        service = ExternalSubtitleService()
        track = await service.fetch_subtitle_for_content(
            content_id=content_id,
            language=language
        )

        if track:
            action = LibrarianAction(
                audit_id=audit_id,
                action_type="download_external_subtitle",
                content_id=content_id,
                content_type="content",
                issue_type="missing_subtitles",
                description=f"Downloaded {language} subtitle for '{content.title}' from {track.source} ({len(track.cues)} cues)",
                auto_approved=True
            )
            await action.insert()

            lang_display = get_language_name(language)

            return {
                "success": True,
                "title": content.title,
                "content_id": content_id,
                "language": language,
                "source": track.source,
                "cue_count": len(track.cues),
                "external_id": track.external_id,
                "message": f"Downloaded {lang_display} subtitle from {track.source.upper()}"
            }
        else:
            return {
                "success": False,
                "title": content.title,
                "content_id": content_id,
                "error": "No subtitles found from any source"
            }

    except Exception as e:
        logger.error(f"Error downloading external subtitle: {str(e)}")
        return {"success": False, "error": str(e)}


async def execute_batch_download_subtitles(
    content_ids: List[str],
    languages: List[str] = None,
    max_downloads: int = 20,
    audit_id: str = None
) -> Dict[str, Any]:
    """Batch download subtitles for multiple content items."""
    from app.services.external_subtitle_service import ExternalSubtitleService
    from app.models.librarian import AuditReport
    from app.services.ai_agent.logger import log_to_database

    if languages is None:
        languages = ["he", "en", "es"]

    try:
        priority_order = ['he', 'en', 'es']
        prioritized_languages = []

        for lang in priority_order:
            if lang in languages:
                prioritized_languages.append(lang)

        for lang in languages:
            if lang not in prioritized_languages:
                prioritized_languages.append(lang)

        limited_languages = prioritized_languages[:3]

        if len(languages) > 3:
            logger.info(f"OpenSubtitles limited to 3 languages: {limited_languages}")

        service = ExternalSubtitleService()
        results = await service.batch_fetch_subtitles(
            content_ids=content_ids,
            languages=limited_languages,
            max_downloads=max_downloads
        )

        audit_report = None
        if audit_id:
            from app.models.librarian import AuditReport
            audit_report = await AuditReport.find_one(AuditReport.audit_id == audit_id)

        if audit_report:
            for detail in results["details"]:
                if detail["status"] == "success":
                    lang_display = get_language_name(detail["language"])
                    await log_to_database(
                        audit_report,
                        "success",
                        f"Downloaded {lang_display} subtitle from {detail['source'].upper()}",
                        "AI Agent",
                        item_name=detail["title"],
                        content_id=detail["content_id"],
                        metadata={
                            "action": "download_external_subtitle",
                            "language": detail["language"],
                            "source": detail["source"],
                            "method": "batch_download"
                        }
                    )

        success_items = [d for d in results["details"] if d["status"] == "success"]

        if audit_id:
            # Build detailed description with affected titles
            titles_affected = [d.get("title", d.get("content_id", "unknown")) for d in success_items[:5]]
            titles_str = ", ".join(f"'{t}'" for t in titles_affected)
            if len(success_items) > 5:
                titles_str += f" +{len(success_items) - 5} more"

            action = LibrarianAction(
                audit_id=audit_id,
                action_type="batch_subtitle_download",
                content_id="batch_operation",
                content_type="batch",
                issue_type="missing_subtitles",
                description=f"Batch downloaded subtitles: {results['success']}/{results['processed']} successful. Items: {titles_str}",
                auto_approved=True
            )
            await action.insert()
        summary_parts = []
        if success_items:
            summary_parts.append(f"{len(success_items)} subtitles downloaded:")
            for item in success_items[:5]:
                lang_short = item["language"].upper()
                summary_parts.append(f"  - {item['title']} ({lang_short} from {item['source']})")
            if len(success_items) > 5:
                summary_parts.append(f"  - ...and {len(success_items) - 5} more")

        summary_message = "\n".join(summary_parts) if summary_parts else "No subtitles downloaded"

        return {
            "success": True,
            "message": summary_message,
            "processed": results["processed"],
            "success_count": results["success"],
            "failed_count": results["failed"],
            "quota_remaining": results["quota_remaining"],
            "quota_used": results["quota_used"],
            "details": results["details"]
        }

    except Exception as e:
        logger.error(f"Error in batch subtitle download: {str(e)}")
        return {"success": False, "error": str(e)}


async def execute_check_subtitle_quota() -> Dict[str, Any]:
    """Check remaining subtitle download quota."""
    from app.services.opensubtitles_service import get_opensubtitles_service

    try:
        service = get_opensubtitles_service()
        quota = await service.check_quota_available()
        return {
            "success": True,
            "quota_available": quota["available"],
            "remaining": quota["remaining"],
            "used": quota["used"],
            "daily_limit": quota["daily_limit"],
            "resets_at": quota["resets_at"].isoformat()
        }
    except Exception as e:
        logger.error(f"Error checking subtitle quota: {str(e)}")
        return {"success": False, "error": str(e)}
