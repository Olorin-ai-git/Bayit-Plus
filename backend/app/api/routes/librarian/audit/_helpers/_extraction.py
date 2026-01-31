"""Extract issues from database for reapply."""
import logging
from datetime import datetime

from app.models.content import Content
from app.models.librarian import AuditReport

logger = logging.getLogger(__name__)


async def _extract_issues_from_database(limit_per_type: int = 100) -> dict:
    """Scan database for items that currently have issues (not relying on old audit logs)."""
    import re

    issues = {
        "dirty_titles": [],
        "missing_metadata": [],
        "missing_posters": [],
        "missing_subtitles": [],
        "misclassifications": [],
        "broken_streams": [],
    }

    # Patterns that indicate dirty titles (file markers, group tags, etc.)
    dirty_patterns = [
        r'\[.*?\]',  # [WEB-DL], [1080p], etc.
        r'\(.*?\)',  # (2023), (PROPER), etc. at end
        r'\.mkv$|\.mp4$|\.avi$|\.mov$',  # File extensions
        r'S\d+E\d+',  # Episode markers like S01E01
        r'x264|x265|HEVC|BluRay|WEBRip|HDRip',  # Encoding info
        r'YIFY|RARBG|YTS|EZTV',  # Release groups
    ]
    dirty_regex = re.compile('|'.join(dirty_patterns), re.IGNORECASE)

    # Query for items with issues
    try:
        # Find items with dirty titles (titles containing file markers)
        all_content = await Content.find(
            {"published": True}
        ).limit(1000).to_list()

        for item in all_content:
            content_id = str(item.id)
            title = item.title or ""

            # Check for dirty title
            if dirty_regex.search(title) and len(issues["dirty_titles"]) < limit_per_type:
                issues["dirty_titles"].append({
                    "id": content_id,
                    "title": title,
                })

            # Check for missing poster
            if not item.poster_url and len(issues["missing_posters"]) < limit_per_type:
                issues["missing_posters"].append({
                    "id": content_id,
                    "title": title,
                })

            # Check for missing metadata (description)
            if not item.description and len(issues["missing_metadata"]) < limit_per_type:
                issues["missing_metadata"].append({
                    "id": content_id,
                    "title": title,
                })

            # Check for missing subtitles (items with video but no subtitle tracks)
            if item.content_type in ["movie", "episode"] and len(issues["missing_subtitles"]) < limit_per_type:
                subtitle_languages = item.available_subtitle_languages or []
                if not subtitle_languages:
                    issues["missing_subtitles"].append({
                        "id": content_id,
                        "title": title,
                        "language": "en",  # Default to English
                    })

    except Exception as e:
        logger.error(f"Error scanning database for issues: {e}")

    logger.info(
        f"Scanned database for current issues: "
        f"dirty_titles={len(issues['dirty_titles'])}, "
        f"missing_metadata={len(issues['missing_metadata'])}, "
        f"missing_posters={len(issues['missing_posters'])}, "
        f"missing_subtitles={len(issues['missing_subtitles'])}, "
        f"misclassifications={len(issues['misclassifications'])}, "
        f"broken_streams={len(issues['broken_streams'])}"
    )

    return issues


async def _log_fix_progress(audit: AuditReport, fix_type: str, stats: dict):
    """Log fix progress to audit execution_logs."""
    import uuid

    log_entry = {
        "id": str(uuid.uuid4()),
        "timestamp": datetime.utcnow().isoformat(),
        "level": "info",
        "message": f"Applied {fix_type} fixes: {stats.get('success', 0)}/{stats.get('attempted', 0)} successful",
        "metadata": {"fix_type": fix_type, "stats": stats},
    }
    audit.execution_logs.append(log_entry)
    await audit.save()