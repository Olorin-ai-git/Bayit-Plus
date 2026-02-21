"""
Periodic scanner for trailer extraction.

Finds published content with a YouTube ``trailer_url`` but no
``trailer_stream_url`` and runs the extraction pipeline for each.
"""

import logging

from app.core.config import settings
from app.models.content import Content
from app.services.trailer_extraction.pipeline import extract_trailer_for_content

logger = logging.getLogger(__name__)


async def scan_and_extract_trailers() -> int:
    """
    Scan for content missing a ``trailer_stream_url`` and extract them.

    Returns:
        Number of trailers successfully extracted in this batch.
    """
    batch_limit = settings.TRAILER_EXTRACTION_BATCH_LIMIT

    candidates = await Content.find(
        Content.is_published == True,  # noqa: E712
        Content.trailer_url != None,  # noqa: E711
        Content.trailer_stream_url == None,  # noqa: E711
    ).limit(batch_limit).to_list()

    if not candidates:
        logger.debug("No content found needing trailer extraction")
        return 0

    logger.info(
        "Trailer extraction scan started",
        extra={"candidate_count": len(candidates)},
    )

    extracted = 0
    for content in candidates:
        gcs_url = await extract_trailer_for_content(content)
        if gcs_url:
            extracted += 1

    logger.info(
        "Trailer extraction scan complete",
        extra={"extracted": extracted, "total": len(candidates)},
    )

    return extracted
