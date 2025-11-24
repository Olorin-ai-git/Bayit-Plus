"""
Enhanced Health Check Router for Olorin Backend Service.

Provides comprehensive health endpoints for Kubernetes/Cloud Run probes,
monitoring systems, and deployment validation.
"""

import os
from datetime import datetime, timezone
from typing import Dict, Any

<<<<<<< HEAD
from fastapi import APIRouter

from .health_models import (
    HealthStatus, DetailedHealthStatus, LivenessProbe, ReadinessProbe,
=======
from fastapi import APIRouter, Request

from .health_models import (
    HealthStatus, DetailedHealthStatus, LivenessProbe, ReadinessProbe, StartupProbe,
>>>>>>> 001-modify-analyzer-method
    get_current_timestamp, get_service_uptime, create_basic_health_response
)
from .health_checks import (
    check_database_connectivity, check_redis_connectivity, check_external_services,
    get_service_metrics, check_disk_space, check_memory_available, 
    check_environment_variables
)
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)
router = APIRouter(prefix="/health", tags=["health"])


@router.get("", response_model=HealthStatus)
@router.get("/", response_model=HealthStatus)
async def basic_health():
    """
    Basic health check endpoint for Cloud Run and load balancers.
    
    Returns simple health status without extensive dependency checks.
    Suitable for basic liveness probes.
    """
    environment = os.getenv("APP_ENV", "development")
    return create_basic_health_response(environment)


@router.get("/live", response_model=LivenessProbe)
async def liveness_probe():
    """
    Kubernetes liveness probe endpoint.
    
    Checks if the application is alive and responding.
    Should only fail if the application needs to be restarted.
    """
    return LivenessProbe(
        alive=True,
        timestamp=get_current_timestamp()
    )


@router.get("/ready", response_model=ReadinessProbe)
async def readiness_probe():
    """
    Kubernetes readiness probe endpoint.
<<<<<<< HEAD
    
=======

>>>>>>> 001-modify-analyzer-method
    Checks if the application is ready to serve traffic.
    Includes basic dependency checks.
    """
    dependencies_ready = {
        "database": await check_database_connectivity(),
        "redis": await check_redis_connectivity(),
    }
<<<<<<< HEAD
    
    # Service is ready if all critical dependencies are available
    all_ready = all(dependencies_ready.values())
    
=======

    # Service is ready if all critical dependencies are available
    all_ready = all(dependencies_ready.values())

>>>>>>> 001-modify-analyzer-method
    return ReadinessProbe(
        ready=all_ready,
        timestamp=get_current_timestamp(),
        dependencies_ready=dependencies_ready
    )


<<<<<<< HEAD
@router.get("/detailed", response_model=DetailedHealthStatus)
async def detailed_health():
=======
@router.get("/startup", response_model=StartupProbe)
async def startup_probe():
    """
    Kubernetes startup probe endpoint.

    Indicates whether the application has finished starting up.
    Should return success after initialization is complete.

    Constitutional Compliance:
    - No hardcoded startup time threshold
    - Startup status based on actual service state
    - Uptime from runtime calculation (not hardcoded)
    """
    uptime = get_service_uptime()

    # Service is considered started if it's been running for any amount of time
    # (if we're responding to this request, we've started successfully)
    return StartupProbe(
        started=True,
        timestamp=get_current_timestamp(),
        startup_time_seconds=uptime
    )


@router.get("/detailed", response_model=DetailedHealthStatus)
async def detailed_health(request: Request):
>>>>>>> 001-modify-analyzer-method
    """
    Detailed health check with comprehensive dependency validation.
    
    Suitable for monitoring systems and deployment validation.
    Includes metrics, dependency status, and system checks.
    """
    uptime = get_service_uptime()
    
    # Check dependencies
    dependencies = {
        "database": await check_database_connectivity(),
        "redis": await check_redis_connectivity(),
        "external_services": await check_external_services(),
    }
    
<<<<<<< HEAD
=======
    # Add microservice availability status (if available)
    if request and hasattr(request, 'app') and hasattr(request.app, 'state'):
        services = {}
        if hasattr(request.app.state, 'database_available'):
            services["database"] = request.app.state.database_available
        if hasattr(request.app.state, 'database_provider_connected'):
            services["database_provider"] = request.app.state.database_provider_connected
        if hasattr(request.app.state, 'agent_system_available'):
            services["agent_system"] = request.app.state.agent_system_available
        if hasattr(request.app.state, 'anomaly_detection_available'):
            services["anomaly_detection"] = request.app.state.anomaly_detection_available
        if hasattr(request.app.state, 'rag_initialized'):
            services["rag"] = request.app.state.rag_initialized
        if hasattr(request.app.state, 'detection_scheduler'):
            services["detection_scheduler"] = request.app.state.detection_scheduler is not None
        
        if services:
            dependencies["microservices"] = services
    
>>>>>>> 001-modify-analyzer-method
    # Run system checks
    checks = {
        "disk_space_available": check_disk_space(),
        "memory_available": check_memory_available(),
        "environment_variables": check_environment_variables(),
    }
    
    # Get metrics
    metrics = get_service_metrics()
    metrics["uptime_seconds"] = uptime
    
    # Get verification settings
    from app.service.config import get_settings_for_env
    settings = get_settings_for_env()
    verification_config = {
        "enabled": bool(getattr(settings, "verification_enabled", False)),
        "mode": getattr(settings, "verification_mode", "shadow"),
        "sample_percent": float(getattr(settings, "verification_sample_percent", 1.0) or 0.0),
        "threshold_default": float(getattr(settings, "verification_threshold_default", 0.85)),
    }
    
    # Determine overall status
    all_dependencies_healthy = all(
        isinstance(dep, bool) and dep for dep in dependencies.values()
        if isinstance(dep, bool)
    ) and all(
        all(svc.values()) for svc in dependencies.values()
        if isinstance(svc, dict)
    )
    
    all_checks_passed = all(checks.values())
    
    if all_dependencies_healthy and all_checks_passed:
        overall_status = "healthy"
    else:
        overall_status = "degraded"
    
    return DetailedHealthStatus(
        status=overall_status,
        timestamp=get_current_timestamp(),
        service="olorin-backend",
        version="1.0.0",
        environment=os.getenv("APP_ENV", "development"),
        uptime_seconds=uptime,
        dependencies=dependencies,
        checks=checks,
        metrics=metrics,
        verification=verification_config
    )