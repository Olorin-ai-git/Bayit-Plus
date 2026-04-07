"""Extracted helpers for demo video ingest — partner seeding and pipeline execution."""
from app.core.logging_config import get_logger
from app.models.ingest_job import IngestJob
from app.models.integration_partner import IntegrationPartner
from app.services import demo_usage_service
from app.services.olorin.ingest_orchestrator import run_pipeline

logger = get_logger(__name__)

# Invalid bcrypt hash sentinel — demo partner never authenticates via API key
_INVALID_BCRYPT = "$2b$12$000000000000000000000000000000000000000000000000000"


async def ensure_demo_partner() -> None:
    """Ensure a 'demo' IntegrationPartner exists for pipeline execution."""
    existing = await IntegrationPartner.find_one(
        IntegrationPartner.partner_id == "demo",
    )
    if existing:
        return
    partner = IntegrationPartner(
        partner_id="demo",
        name="Demo Portal",
        name_en="Demo Portal",
        api_key_hash=_INVALID_BCRYPT,
        api_key_prefix="demo____",
        contact_email="demo@olorin.ai",
        capabilities={},
        is_active=True,
    )
    await partner.insert()
    logger.info("Demo IntegrationPartner seeded")


async def run_demo_pipeline_and_increment(
    job: IngestJob, user_id: str,
) -> None:
    """Run ingest pipeline; increment usage only on success."""
    try:
        await ensure_demo_partner()
        await run_pipeline(job)
        await demo_usage_service.increment(user_id, "video_ingest")
        logger.info(
            "Demo pipeline completed",
            extra={"user_id": user_id, "job_id": job.job_id},
        )
    except Exception:
        logger.exception(
            "Demo pipeline failed",
            extra={"user_id": user_id, "job_id": job.job_id},
        )
