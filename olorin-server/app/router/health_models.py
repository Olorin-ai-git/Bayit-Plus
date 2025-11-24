"""
Health Check Models for Enhanced Health Monitoring System.

Provides Pydantic models for health status responses, probes, and metrics.
"""

import time
from datetime import datetime, timezone
from typing import Dict, Any, Optional

from pydantic import BaseModel

# Service startup time for uptime calculation
SERVICE_START_TIME = time.time()


class HealthStatus(BaseModel):
    """Basic health status response model."""
    status: str
    timestamp: str
    service: str
    version: str
    environment: str
    uptime_seconds: float


class DetailedHealthStatus(BaseModel):
    """Detailed health status with dependency checks."""
    status: str
    timestamp: str
    service: str
    version: str
    environment: str
    uptime_seconds: float
    dependencies: Dict[str, Any]
    checks: Dict[str, bool]
    metrics: Dict[str, Any]
    verification: Optional[Dict[str, Any]] = None


class LivenessProbe(BaseModel):
    """Liveness probe response."""
    alive: bool
    timestamp: str


class ReadinessProbe(BaseModel):
    """Readiness probe response."""
    ready: bool
    timestamp: str
    dependencies_ready: Dict[str, bool]


<<<<<<< HEAD
=======
class StartupProbe(BaseModel):
    """
    Startup probe response for Kubernetes.

    Constitutional Compliance:
    - No hardcoded startup thresholds
    - Startup status from runtime checks
    - Timestamp from system time (not hardcoded)
    """
    started: bool
    timestamp: str
    startup_time_seconds: Optional[float] = None


>>>>>>> 001-modify-analyzer-method
def get_current_timestamp() -> str:
    """Get current ISO timestamp."""
    return datetime.now(timezone.utc).isoformat()


def get_service_uptime() -> float:
    """Get service uptime in seconds."""
    return time.time() - SERVICE_START_TIME


def create_basic_health_response(environment: str) -> HealthStatus:
    """Create basic health response."""
    return HealthStatus(
        status="healthy",
        timestamp=get_current_timestamp(),
        service="olorin-backend",
        version="1.0.0",
        environment=environment,
        uptime_seconds=get_service_uptime()
    )