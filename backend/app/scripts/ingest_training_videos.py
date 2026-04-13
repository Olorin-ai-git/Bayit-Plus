"""Ingest training demo videos through the Olorin pipeline.

Usage (from backend/ directory):
    poetry run python -m app.scripts.ingest_training_videos [--dry-run] [--force]

Ingests 5 public-domain training videos (OSHA + US Copyright Office)
and prints their content IDs for use in portal-demo training-content.ts.
"""

import asyncio
import uuid as _uuid
from dataclasses import dataclass

from app.core.logging_config import get_logger
from app.models.content import Content
from app.models.ingest_job import IngestJob
from app.services.demo_ingest_service import ensure_demo_partner
from app.services.olorin.ingest_orchestrator import run_pipeline

logger = get_logger(__name__)


@dataclass
class TrainingVideo:
    slug: str
    title: str
    youtube_url: str
    persona_prompt: str


TRAINING_VIDEOS = [
    TrainingVideo(
        slug="workplace-safety",
        title="Respiratory Protection in General Industry",
        youtube_url="https://www.youtube.com/watch?v=p1yYmABesZE",
        persona_prompt="OSHA workplace safety training instructor explaining respiratory protection requirements in general industry.",
    ),
    TrainingVideo(
        slug="silica-hazards",
        title="Protecting Workers from Silica Hazards",
        youtube_url="https://www.youtube.com/watch?v=-kQmLYqIR2A",
        persona_prompt="OSHA safety instructor explaining silica exposure hazards and protective measures in the workplace.",
    ),
    TrainingVideo(
        slug="osha-inspection",
        title="The OSHA Inspection Process",
        youtube_url="https://www.youtube.com/watch?v=HA6bixDzeLY",
        persona_prompt="OSHA representative walking through the federal workplace safety inspection process.",
    ),
    TrainingVideo(
        slug="what-is-copyright",
        title="What is Copyright?",
        youtube_url="https://www.youtube.com/watch?v=ukFl-siTFtg",
        persona_prompt="US Copyright Office instructor explaining the fundamentals of copyright law and protection.",
    ),
    TrainingVideo(
        slug="hey-thats-my-idea",
        title="Hey That's My Idea!",
        youtube_url="https://www.youtube.com/watch?v=6DqSJ5uYtPg",
        persona_prompt="US Copyright Office instructor explaining the boundaries of copyright protection for ideas vs expression.",
    ),
]


async def _init_db() -> None:
    from app.core.database import connect_to_mongo
    await connect_to_mongo()


async def ingest_one(video: TrainingVideo, dry_run: bool, force: bool = False) -> str:
    """Create Content + IngestJob and run pipeline. Returns content_id."""
    existing = await Content.find_one(Content.title == video.title)
    if existing and not force:
        cid = str(existing.id)
        logger.info(f"[{video.slug}] Already ingested: {cid}")
        return cid

    if existing and force:
        # Re-run pipeline on existing content with a new job
        cid = str(existing.id)
        logger.info(f"[{video.slug}] Force re-running pipeline on existing content: {cid}")
        job_id = _uuid.uuid4().hex
        job = IngestJob(
            job_id=job_id,
            partner_id="demo",
            content_id=cid,
            video_url=video.youtube_url,
            direct=True,
            capabilities={"characters": "pending"},
        )
        await job.insert()
        await ensure_demo_partner()
        await run_pipeline(job)
        return cid

    if dry_run:
        logger.info(f"[{video.slug}] DRY RUN — would ingest {video.youtube_url}")
        return "dry-run"

    content = Content(
        title=video.title,
        stream_url=video.youtube_url,
        stream_type="youtube",
        persona_mode="speaker",
        is_published=False,
    )
    await content.insert()
    cid = str(content.id)

    job_id = _uuid.uuid4().hex
    job = IngestJob(
        job_id=job_id,
        partner_id="demo",
        content_id=cid,
        video_url=video.youtube_url,
        direct=True,
        capabilities={"characters": "pending"},
    )
    await job.insert()

    logger.info(f"[{video.slug}] Ingesting {video.youtube_url} → content_id={cid}, job_id={job_id}")

    await ensure_demo_partner()
    await run_pipeline(job)

    return cid


async def main() -> None:
    import sys
    dry_run = "--dry-run" in sys.argv
    force = "--force" in sys.argv

    await _init_db()

    results: dict[str, str] = {}
    for video in TRAINING_VIDEOS:
        try:
            cid = await ingest_one(video, dry_run, force)
            results[video.slug] = cid
        except Exception:
            logger.exception(f"[{video.slug}] Pipeline failed")
            results[video.slug] = "FAILED"

    print("\n" + "=" * 60)
    print("TRAINING VIDEO CONTENT IDS")
    print("=" * 60)
    for slug, cid in results.items():
        print(f"  {slug}: {cid}")
    print("=" * 60)
    print("\nUpdate these in portal-demo/src/tour/training-content.ts")


if __name__ == "__main__":
    import logging
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s %(message)s")
    asyncio.run(main())
