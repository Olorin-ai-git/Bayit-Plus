"""Seed sample content for new training organizations."""

import asyncio
import logging

from app.core.config import settings
from app.models.content import Content
from app.models.integration_partner import IntegrationPartner
from app.services.olorin.ingest_orchestrator import create_ingest_job, run_pipeline
from app.utils.video_url_utils import validate_video_url

logger = logging.getLogger(__name__)


async def seed_sample_content(
    partner_id: str, partner: IntegrationPartner
) -> None:
    """Seed a sample video for a newly created training org.

    Skips silently if TRAINING_SAMPLE_VIDEO_URL is not configured
    or if the URL is invalid. Runs the ingest pipeline as a background
    coroutine — the content will appear as 'processing' in the admin
    dashboard immediately.
    """
    url = settings.TRAINING_SAMPLE_VIDEO_URL
    if not url:
        logger.debug("No sample video URL configured, skipping seed")
        return

    ok, err = validate_video_url(url)
    if not ok:
        logger.warning("Sample video URL invalid (%s): %s", url, err)
        return

    title = settings.TRAINING_SAMPLE_VIDEO_TITLE

    content = Content(
        title=title,
        description="Sample training video — explore AI-powered features",
        stream_url=url,
        topic_tags=["sample", "onboarding"],
        partner_id=partner_id,
    )
    await content.insert()

    job = await create_ingest_job(
        partner=partner,
        content=content,
        video_url=url,
        capabilities=["characters", "subtitles"],
        direct=True,
    )

    asyncio.create_task(run_pipeline(job))

    logger.info(
        "Seeded sample content for %s: content_id=%s", partner_id, content.id
    )
