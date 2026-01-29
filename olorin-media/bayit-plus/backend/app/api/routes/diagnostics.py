"""
Diagnostics API Routes
System health monitoring and diagnostic endpoints for admin dashboard
"""

from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorClient

from app.api.routes.admin_content_utils import has_permission
from app.core.config import settings
from app.core.database import db
from app.core.health_checks import (HealthStatus, ServiceHealth,
                                    check_gcs_health, check_mongodb_health,
                                    check_openai_health, check_pinecone_health,
                                    check_sentry_health, check_elevenlabs_health)
from app.core.security import get_current_active_user
from app.models.admin import Permission
from app.models.diagnostics import (AnalyticsResponse, ClientAlert,
                                    ClientHealthHistory, ClientHeartbeat,
                                    ClientStatus, ClientStatusResponse,
                                    ClientType, DiagnosticsOverviewResponse,
                                    HeartbeatRequest, HeartbeatResponse,
                                    PingResponse, ServiceHealthResponse,
                                    SystemMetrics)
from app.models.user import User

router = APIRouter(prefix="/diagnostics", tags=["Diagnostics"])


@router.post("/heartbeat", response_model=HeartbeatResponse)
async def submit_heartbeat(
    heartbeat: HeartbeatRequest,
    current_user: User = Depends(get_current_active_user),
):
    """
    Submit client heartbeat telemetry.

    Clients should send heartbeat every 10 seconds during active sessions.
    """
    # Create or update heartbeat document
    existing = await ClientHeartbeat.find_one(
        ClientHeartbeat.client_id == heartbeat.client_id,
        ClientHeartbeat.client_type == heartbeat.client_type
    )

    now = datetime.now(timezone.utc)

    if existing:
        # Update existing heartbeat
        existing.metrics = heartbeat.metrics
        existing.last_seen = now
        existing.timestamp = now
        existing.api_latency = heartbeat.api_latency
        existing.client_version = heartbeat.client_version
        existing.status = ClientStatus.ONLINE
        await existing.save()
    else:
        # Create new heartbeat
        new_heartbeat = ClientHeartbeat(
            client_type=heartbeat.client_type,
            client_id=heartbeat.client_id,
            client_version=heartbeat.client_version,
            metrics=heartbeat.metrics,
            api_latency=heartbeat.api_latency,
            timestamp=now,
            last_seen=now,
            status=ClientStatus.ONLINE,
        )
        await new_heartbeat.insert()

    # Archive to history (every minute aggregation)
    await archive_heartbeat_history(heartbeat.client_type, heartbeat.metrics)

    return HeartbeatResponse(
        status="ok",
        message="Heartbeat recorded",
        next_heartbeat_interval_seconds=settings.DIAGNOSTICS_HEARTBEAT_INTERVAL_SECONDS
    )


@router.get("/clients", response_model=Dict[str, List[ClientStatusResponse]])
async def get_clients(
    _current_user: User = Depends(has_permission(Permission.DIAGNOSTICS_READ)),
):
    """
    Get all client statuses (admin only).

    Returns current status of all connected clients grouped by platform.
    """
    # Get all recent heartbeats (within last 5 minutes)
    cutoff_time = datetime.now(timezone.utc) - timedelta(
        seconds=settings.DIAGNOSTICS_CLIENT_TIMEOUT_SECONDS
    )

    heartbeats = await ClientHeartbeat.find(
        ClientHeartbeat.last_seen >= cutoff_time
    ).to_list()

    # Mark stale clients as offline
    await mark_stale_clients_offline(cutoff_time)

    # Group by client type
    clients_by_type: Dict[str, List[ClientStatusResponse]] = {
        client_type.value: [] for client_type in ClientType
    }

    for heartbeat in heartbeats:
        client_response = ClientStatusResponse(
            client_type=heartbeat.client_type,
            client_id=heartbeat.client_id,
            status=heartbeat.status,
            last_seen=heartbeat.last_seen,
            metrics=heartbeat.metrics,
            api_latency=heartbeat.api_latency,
        )
        clients_by_type[heartbeat.client_type.value].append(client_response)

    return clients_by_type


@router.get("/backend-services", response_model=Dict[str, ServiceHealthResponse])
async def get_backend_services(
    _current_user: User = Depends(has_permission(Permission.DIAGNOSTICS_READ)),
):
    """
    Get backend service health (admin only).

    Runs deep health check on all backend services.
    """
    # Run all health checks concurrently
    import asyncio

    health_checks = await asyncio.gather(
        check_mongodb_health(),
        check_gcs_health(),
        check_pinecone_health(),
        check_openai_health(),
        check_sentry_health(),
        check_elevenlabs_health(),
        return_exceptions=True
    )

    services = {}
    for check in health_checks:
        if isinstance(check, ServiceHealth):
            services[check.name] = ServiceHealthResponse(
                service_name=check.name,
                status=check.status.value,
                latency_ms=check.latency_ms,
                message=check.message,
                last_check=datetime.now(timezone.utc)
            )
        elif isinstance(check, Exception):
            # Handle exception case
            services["unknown"] = ServiceHealthResponse(
                service_name="unknown",
                status="unhealthy",
                message=str(check),
                last_check=datetime.now(timezone.utc)
            )

    return services


@router.post("/ping/{client_type}", response_model=PingResponse)
async def ping_clients(
    client_type: ClientType,
    _current_user: User = Depends(has_permission(Permission.DIAGNOSTICS_MANAGE)),
):
    """
    Trigger ping to specific client type (admin only).

    This would be used with WebSocket to request clients to send immediate heartbeat.
    """
    # In practice, this would broadcast via WebSocket to connected clients
    # For now, just return acknowledgment
    return PingResponse(
        client_type=client_type,
        ping_sent_at=datetime.now(timezone.utc),
        status="ping_sent"
    )


@router.get("/analytics", response_model=AnalyticsResponse)
async def get_analytics(
    time_range: str = Query("1h", regex="^(15m|1h|6h|24h)$"),
    _current_user: User = Depends(has_permission(Permission.DIAGNOSTICS_READ)),
):
    """
    Get aggregate analytics and trends (admin only).

    Time range options: 15m, 1h, 6h, 24h
    """
    # Parse time range
    range_minutes = {
        "15m": 15,
        "1h": 60,
        "6h": 360,
        "24h": 1440,
    }[time_range]

    cutoff_time = datetime.now(timezone.utc) - timedelta(minutes=range_minutes)

    # Get heartbeats in time range
    heartbeats = await ClientHeartbeat.find(
        ClientHeartbeat.timestamp >= cutoff_time
    ).to_list()

    # Calculate statistics
    total_heartbeats = len(heartbeats)
    unique_clients = len(set(h.client_id for h in heartbeats))

    # Calculate average metrics
    total_cpu = sum(h.metrics.cpu_usage for h in heartbeats if h.metrics.cpu_usage is not None)
    total_memory = sum(h.metrics.memory_usage for h in heartbeats if h.metrics.memory_usage is not None)
    cpu_count = sum(1 for h in heartbeats if h.metrics.cpu_usage is not None)
    memory_count = sum(1 for h in heartbeats if h.metrics.memory_usage is not None)

    avg_metrics = {
        "cpu_usage": total_cpu / cpu_count if cpu_count > 0 else 0,
        "memory_usage": total_memory / memory_count if memory_count > 0 else 0,
    }

    # Status distribution
    status_distribution = {}
    for status in ClientStatus:
        count = sum(1 for h in heartbeats if h.status == status)
        status_distribution[status.value] = count

    return AnalyticsResponse(
        time_range=time_range,
        total_heartbeats=total_heartbeats,
        unique_clients=unique_clients,
        avg_metrics=avg_metrics,
        status_distribution=status_distribution,
    )


# ============ HELPER FUNCTIONS ============


async def archive_heartbeat_history(client_type: ClientType, metrics: dict):
    """Archive heartbeat to history collection (1-minute aggregation)."""
    # Create aggregated history entry
    history = ClientHealthHistory(
        client_type=client_type,
        status=ClientStatus.ONLINE,
        metrics_snapshot=metrics.dict() if hasattr(metrics, 'dict') else metrics,
        recorded_at=datetime.now(timezone.utc),
        aggregation_period="1m"
    )
    await history.insert()


async def mark_stale_clients_offline(cutoff_time: datetime):
    """Mark clients that haven't sent heartbeat recently as offline."""
    stale_clients = await ClientHeartbeat.find(
        ClientHeartbeat.last_seen < cutoff_time,
        ClientHeartbeat.status != ClientStatus.OFFLINE
    ).to_list()

    for client in stale_clients:
        client.status = ClientStatus.OFFLINE
        await client.save()
