"""
Health check utilities for Bayit+ Backend.

Provides structured health checking for various service dependencies.
"""

import asyncio
from dataclasses import dataclass
from enum import Enum
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.core.database import db


class HealthStatus(str, Enum):
    """Health status enumeration."""

    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"


@dataclass
class ServiceHealth:
    """Health status for a single service."""

    name: str
    status: HealthStatus
    latency_ms: Optional[float] = None
    message: Optional[str] = None

    def to_dict(self) -> dict:
        """Convert to dictionary representation."""
        result = {
            "name": self.name,
            "status": self.status.value,
        }
        if self.latency_ms is not None:
            result["latency_ms"] = round(self.latency_ms, 2)
        if self.message:
            result["message"] = self.message
        return result


async def check_mongodb_health() -> ServiceHealth:
    """Check MongoDB connectivity and measure latency."""
    import time

    start = time.monotonic()
    try:
        if db.client is None:
            return ServiceHealth(
                name="mongodb",
                status=HealthStatus.UNHEALTHY,
                message="Database client not initialized",
            )

        # Run ping command to verify connectivity
        result = await db.client.admin.command("ping")
        latency = (time.monotonic() - start) * 1000

        if result.get("ok") == 1:
            return ServiceHealth(
                name="mongodb",
                status=HealthStatus.HEALTHY,
                latency_ms=latency,
            )
        return ServiceHealth(
            name="mongodb",
            status=HealthStatus.UNHEALTHY,
            latency_ms=latency,
            message="Ping command returned unexpected result",
        )
    except Exception as e:
        latency = (time.monotonic() - start) * 1000
        return ServiceHealth(
            name="mongodb",
            status=HealthStatus.UNHEALTHY,
            latency_ms=latency,
            message=str(e),
        )


async def check_gcs_health() -> ServiceHealth:
    """Check Google Cloud Storage connectivity."""
    import time

    start = time.monotonic()
    try:
        from google.cloud import storage

        client = storage.Client()
        bucket_name = settings.GCS_BUCKET_NAME

        if not bucket_name:
            return ServiceHealth(
                name="gcs",
                status=HealthStatus.DEGRADED,
                message="GCS bucket not configured",
            )

        # Just check if we can access the bucket metadata
        bucket = client.bucket(bucket_name)
        bucket.reload()
        latency = (time.monotonic() - start) * 1000

        return ServiceHealth(
            name="gcs",
            status=HealthStatus.HEALTHY,
            latency_ms=latency,
        )
    except Exception as e:
        latency = (time.monotonic() - start) * 1000
        return ServiceHealth(
            name="gcs",
            status=HealthStatus.DEGRADED,
            latency_ms=latency,
            message=str(e),
        )


async def check_sentry_health() -> ServiceHealth:
    """Check if Sentry is configured."""
    try:
        if settings.SENTRY_DSN:
            return ServiceHealth(
                name="sentry",
                status=HealthStatus.HEALTHY,
                message="Sentry DSN configured",
            )
        return ServiceHealth(
            name="sentry",
            status=HealthStatus.DEGRADED,
            message="Sentry DSN not configured",
        )
    except Exception as e:
        return ServiceHealth(
            name="sentry",
            status=HealthStatus.DEGRADED,
            message=str(e),
        )


async def check_pinecone_health() -> ServiceHealth:
    """Check Pinecone vector database connectivity."""
    import time

    start = time.monotonic()
    try:
        if not settings.PINECONE_API_KEY:
            return ServiceHealth(
                name="pinecone",
                status=HealthStatus.DEGRADED,
                message="API key not configured",
            )

        from pinecone import Pinecone

        pc = Pinecone(api_key=settings.PINECONE_API_KEY)
        indexes = pc.list_indexes()
        latency = (time.monotonic() - start) * 1000

        # Check if our index exists
        index_names = [idx.name for idx in indexes]
        if settings.PINECONE_INDEX_NAME in index_names:
            return ServiceHealth(
                name="pinecone",
                status=HealthStatus.HEALTHY,
                latency_ms=latency,
                message=f"Index '{settings.PINECONE_INDEX_NAME}' available",
            )
        return ServiceHealth(
            name="pinecone",
            status=HealthStatus.DEGRADED,
            latency_ms=latency,
            message=f"Index '{settings.PINECONE_INDEX_NAME}' not found",
        )
    except ImportError:
        return ServiceHealth(
            name="pinecone",
            status=HealthStatus.DEGRADED,
            message="Pinecone SDK not installed",
        )
    except Exception as e:
        latency = (time.monotonic() - start) * 1000
        return ServiceHealth(
            name="pinecone",
            status=HealthStatus.DEGRADED,
            latency_ms=latency,
            message=str(e),
        )


async def check_openai_health() -> ServiceHealth:
    """Check OpenAI API connectivity."""
    import time

    import httpx

    start = time.monotonic()
    try:
        if not settings.OPENAI_API_KEY:
            return ServiceHealth(
                name="openai",
                status=HealthStatus.DEGRADED,
                message="API key not configured",
            )

        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                "https://api.openai.com/v1/models",
                headers={"Authorization": f"Bearer {settings.OPENAI_API_KEY}"},
            )
            latency = (time.monotonic() - start) * 1000

            if response.status_code == 200:
                return ServiceHealth(
                    name="openai",
                    status=HealthStatus.HEALTHY,
                    latency_ms=latency,
                )
            return ServiceHealth(
                name="openai",
                status=HealthStatus.DEGRADED,
                latency_ms=latency,
                message=f"API returned {response.status_code}",
            )
    except Exception as e:
        latency = (time.monotonic() - start) * 1000
        return ServiceHealth(
            name="openai",
            status=HealthStatus.DEGRADED,
            latency_ms=latency,
            message=str(e),
        )


async def check_elevenlabs_health() -> ServiceHealth:
    """Check ElevenLabs API connectivity."""
    import time

    import httpx

    start = time.monotonic()
    try:
        if not settings.ELEVENLABS_API_KEY:
            return ServiceHealth(
                name="elevenlabs",
                status=HealthStatus.DEGRADED,
                message="API key not configured",
            )

        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                "https://api.elevenlabs.io/v1/user",
                headers={"xi-api-key": settings.ELEVENLABS_API_KEY},
            )
            latency = (time.monotonic() - start) * 1000

            if response.status_code == 200:
                return ServiceHealth(
                    name="elevenlabs",
                    status=HealthStatus.HEALTHY,
                    latency_ms=latency,
                )
            return ServiceHealth(
                name="elevenlabs",
                status=HealthStatus.DEGRADED,
                latency_ms=latency,
                message=f"API returned {response.status_code}",
            )
    except Exception as e:
        latency = (time.monotonic() - start) * 1000
        return ServiceHealth(
            name="elevenlabs",
            status=HealthStatus.DEGRADED,
            latency_ms=latency,
            message=str(e),
        )


async def check_external_services() -> list[ServiceHealth]:
    """Check external service availability (non-blocking)."""
    import time

    import httpx

    services = []

    # Check ElevenLabs API (if configured)
    elevenlabs_health = await check_elevenlabs_health()
    services.append(elevenlabs_health)

    if settings.ELEVENLABS_API_KEY:
        start = time.monotonic()
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(
                    "https://api.elevenlabs.io/v1/user",
                    headers={"xi-api-key": settings.ELEVENLABS_API_KEY},
                )
                latency = (time.monotonic() - start) * 1000
                if response.status_code == 200:
                    services.append(
                        ServiceHealth(
                            name="elevenlabs",
                            status=HealthStatus.HEALTHY,
                            latency_ms=latency,
                        )
                    )
                else:
                    services.append(
                        ServiceHealth(
                            name="elevenlabs",
                            status=HealthStatus.DEGRADED,
                            latency_ms=latency,
                            message=f"API returned {response.status_code}",
                        )
                    )
        except Exception as e:
            services.append(
                ServiceHealth(
                    name="elevenlabs",
                    status=HealthStatus.DEGRADED,
                    message=str(e),
                )
            )
    else:
        services.append(
            ServiceHealth(
                name="elevenlabs",
                status=HealthStatus.DEGRADED,
                message="API key not configured",
            )
        )

    return services


async def run_liveness_check() -> dict:
    """
    Liveness probe - check if the application is running.

    This is a simple check that verifies the application process is alive
    and can respond to requests. Used by Kubernetes/Cloud Run for restart decisions.
    """
    return {
        "status": HealthStatus.HEALTHY.value,
        "app": settings.APP_NAME,
        "check": "liveness",
    }


async def run_readiness_check() -> dict:
    """
    Readiness probe - check if the application is ready to receive traffic.

    Verifies database connectivity. Used by load balancers to determine
    whether to send traffic to this instance.
    """
    mongodb_health = await check_mongodb_health()

    overall_status = (
        HealthStatus.HEALTHY
        if mongodb_health.status == HealthStatus.HEALTHY
        else HealthStatus.UNHEALTHY
    )

    return {
        "status": overall_status.value,
        "app": settings.APP_NAME,
        "check": "readiness",
        "services": {
            "mongodb": mongodb_health.to_dict(),
        },
    }


async def run_deep_health_check() -> dict:
    """
    Deep health check - comprehensive check of all services.

    Checks all external dependencies including database, storage,
    vector search, AI services, and third-party APIs. This is more
    expensive and should not be called too frequently.
    """
    # Run all checks concurrently
    mongodb_task = asyncio.create_task(check_mongodb_health())
    gcs_task = asyncio.create_task(check_gcs_health())
    sentry_task = asyncio.create_task(check_sentry_health())
    pinecone_task = asyncio.create_task(check_pinecone_health())
    openai_task = asyncio.create_task(check_openai_health())
    external_task = asyncio.create_task(check_external_services())

    mongodb_health = await mongodb_task
    gcs_health = await gcs_task
    sentry_health = await sentry_task
    pinecone_health = await pinecone_task
    openai_health = await openai_task
    external_services = await external_task

    # Collect all service health statuses
    all_services = [
        mongodb_health,
        gcs_health,
        sentry_health,
        pinecone_health,
        openai_health,
    ] + external_services

    # Determine overall status
    unhealthy_count = sum(1 for s in all_services if s.status == HealthStatus.UNHEALTHY)
    degraded_count = sum(1 for s in all_services if s.status == HealthStatus.DEGRADED)

    if unhealthy_count > 0:
        # If critical services (MongoDB) are unhealthy, mark as unhealthy
        if mongodb_health.status == HealthStatus.UNHEALTHY:
            overall_status = HealthStatus.UNHEALTHY
        else:
            overall_status = HealthStatus.DEGRADED
    elif degraded_count > 0:
        overall_status = HealthStatus.DEGRADED
    else:
        overall_status = HealthStatus.HEALTHY

    return {
        "status": overall_status.value,
        "app": settings.APP_NAME,
        "check": "deep",
        "services": {s.name: s.to_dict() for s in all_services},
        "summary": {
            "total": len(all_services),
            "healthy": sum(1 for s in all_services if s.status == HealthStatus.HEALTHY),
            "degraded": degraded_count,
            "unhealthy": unhealthy_count,
        },
    }
