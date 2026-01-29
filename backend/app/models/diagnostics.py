"""
Diagnostics Models
MongoDB document models for system diagnostics and health monitoring
"""

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, Optional

from beanie import Document
from pydantic import BaseModel, Field


# ============ ENUMS ============


class ClientType(str, Enum):
    """Type of client platform"""
    WEB = "web"
    IOS = "ios"
    ANDROID = "android"
    TVOS = "tvos"
    TIZEN = "tizen"
    BACKEND = "backend"


class ClientStatus(str, Enum):
    """Client health status"""
    ONLINE = "online"
    OFFLINE = "offline"
    DEGRADED = "degraded"


class DiagnosticSeverity(str, Enum):
    """Severity level for diagnostic alerts"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


# ============ BASE MODELS ============


class ClientMetrics(BaseModel):
    """Client performance metrics"""
    cpu_usage: Optional[float] = Field(None, ge=0, le=100, description="CPU usage percentage")
    memory_usage: Optional[float] = Field(None, ge=0, le=100, description="Memory usage percentage")
    network_latency: Optional[float] = Field(None, ge=0, description="Network latency in ms")
    error_count: int = Field(0, ge=0, description="Number of errors in last interval")
    active_users: int = Field(0, ge=0, description="Number of active users")
    fps: Optional[float] = Field(None, ge=0, description="Frames per second (for clients)")


class SystemMetrics(BaseModel):
    """System-wide performance metrics"""
    total_requests: int = Field(0, ge=0)
    failed_requests: int = Field(0, ge=0)
    avg_response_time_ms: Optional[float] = Field(None, ge=0)
    active_connections: int = Field(0, ge=0)
    queue_depth: int = Field(0, ge=0)


# ============ DOCUMENTS ============


class ClientHeartbeat(Document):
    """
    Stores heartbeat data from client platforms
    Used for real-time monitoring of client health
    """
    client_type: ClientType
    client_id: str = Field(..., description="Unique client identifier")
    client_version: Optional[str] = Field(None, description="Client app version")
    status: ClientStatus = ClientStatus.ONLINE
    metrics: ClientMetrics
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_seen: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    api_latency: Optional[float] = Field(None, ge=0, description="API latency in ms")
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None

    class Settings:
        name = "client_heartbeats"
        indexes = [
            "client_id",
            "client_type",
            "status",
            [("timestamp", -1)],  # For time-based queries
            [("last_seen", -1)],  # For cleanup of stale heartbeats
        ]


class ClientHealthHistory(Document):
    """
    Historical health data for trend analysis
    Aggregated from ClientHeartbeat data
    """
    client_type: ClientType
    status: ClientStatus
    metrics_snapshot: Dict[str, Any] = Field(default_factory=dict)
    recorded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    aggregation_period: str = Field("1m", description="Time period: 1m, 5m, 1h, 1d")

    class Settings:
        name = "client_health_history"
        indexes = [
            "client_type",
            [("recorded_at", -1)],
            [("client_type", 1), ("recorded_at", -1)],
        ]


class ClientAlert(Document):
    """
    Diagnostic alerts for client/system issues
    """
    alert_id: str = Field(..., description="Unique alert identifier")
    client_type: Optional[ClientType] = None
    client_id: Optional[str] = None
    severity: DiagnosticSeverity
    title: str
    message: str
    details: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[str] = None  # Admin user ID
    is_resolved: bool = False

    class Settings:
        name = "client_alerts"
        indexes = [
            "alert_id",
            "client_type",
            "severity",
            "is_resolved",
            [("created_at", -1)],
        ]


# ============ REQUEST/RESPONSE MODELS ============


class HeartbeatRequest(BaseModel):
    """Client heartbeat submission request"""
    client_type: ClientType
    client_id: str
    client_version: Optional[str] = None
    metrics: ClientMetrics
    api_latency: Optional[float] = None


class HeartbeatResponse(BaseModel):
    """Heartbeat submission response"""
    status: str = "ok"
    message: str = "Heartbeat recorded"
    next_heartbeat_interval_seconds: int = 10


class ClientStatusResponse(BaseModel):
    """Client status summary"""
    client_type: ClientType
    client_id: str
    status: ClientStatus
    last_seen: datetime
    metrics: ClientMetrics
    api_latency: Optional[float] = None


class ServiceHealthResponse(BaseModel):
    """Service health status"""
    service_name: str
    status: str  # "healthy", "degraded", "unhealthy"
    latency_ms: Optional[float] = None
    message: Optional[str] = None
    last_check: datetime


class DiagnosticsOverviewResponse(BaseModel):
    """Complete diagnostics overview"""
    services: Dict[str, ServiceHealthResponse]
    clients: Dict[str, list[ClientStatusResponse]]
    system_metrics: SystemMetrics
    alerts: list[ClientAlert]
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class PingResponse(BaseModel):
    """Ping response"""
    client_type: ClientType
    ping_sent_at: datetime
    status: str = "ping_sent"


class AnalyticsResponse(BaseModel):
    """Aggregated analytics"""
    time_range: str
    total_heartbeats: int
    unique_clients: int
    avg_metrics: Dict[str, float]
    status_distribution: Dict[str, int]
