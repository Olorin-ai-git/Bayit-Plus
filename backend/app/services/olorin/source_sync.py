"""
B2B Source Sync Service

Fetches new videos from connected sources (YouTube channels, playlists,
RSS feeds, Plex servers, IPTV playlists) and auto-submits them to the
orchestrated ingest pipeline.
"""

import asyncio
from typing import List

from app.core.logging_config import get_logger
from app.models.b2b_content_source import B2BContentSource
from app.models.content import Content
from app.models.integration_partner import IntegrationPartner
from app.services.olorin.fetchers import _FETCHERS

logger = get_logger(__name__)


async def sync_source(
    source: B2BContentSource,
    partner: IntegrationPartner,
) -> int:
    """
    Sync a content source. Returns count of new videos ingested.

    Dispatches to the appropriate fetcher based on source_type,
    creates Content documents, and submits to the ingest pipeline.
    """
    fetcher = _FETCHERS.get(source.source_type)
    if not fetcher:
        logger.warning(
            "Unknown source type",
            extra={"source_type": source.source_type},
        )
        return 0

    video_urls = await fetcher(source)
    existing = set(source.content_ids)
    new_count = 0

    for url, title in video_urls:
        content = Content(
            title=title or "Untitled",
            description=f"Auto-synced from {source.name}",
            stream_url=url,
        )
        await content.insert()
        content_id = str(content.id)

        if content_id not in existing:
            source.content_ids.append(content_id)

        if source.auto_process:
            await _submit_to_pipeline(
                content, partner, source.capabilities, url,
            )

        new_count += 1

    return new_count


async def _submit_to_pipeline(
    content: Content,
    partner: IntegrationPartner,
    capabilities: List[str],
    video_url: str,
) -> None:
    """Submit a video to the orchestrated ingest pipeline."""
    from app.services.olorin.ingest_orchestrator import (
        create_ingest_job,
        run_pipeline,
    )

    job = await create_ingest_job(
        partner=partner,
        content=content,
        video_url=video_url,
        capabilities=capabilities,
    )

    asyncio.create_task(run_pipeline(job))

    logger.info(
        "Auto-submitted to pipeline",
        extra={
            "content_id": str(content.id),
            "job_id": job.job_id,
            "capabilities": capabilities,
        },
    )
