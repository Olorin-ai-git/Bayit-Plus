"""
Unit tests for Diagnostics Models.
"""

import pytest
import pytest_asyncio
from datetime import datetime, timezone, timedelta
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.models.diagnostics import (
    ClientHeartbeat,
    ClientHealthHistory,
    ClientAlert,
    ClientType,
    ClientStatus,
    DiagnosticSeverity,
    ClientMetrics,
)


@pytest_asyncio.fixture
async def db_client():
    """Create test database client."""
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    test_db_name = "test_diagnostics_models"

    # Initialize Beanie
    await init_beanie(
        database=client[test_db_name],
        document_models=[
            ClientHeartbeat,
            ClientHealthHistory,
            ClientAlert,
        ],
    )

    yield client

    # Cleanup
    await client.drop_database(test_db_name)
    client.close()


# ============================================
# ClientType Enum Tests
# ============================================


def test_client_type_enum():
    """Test ClientType enum values."""
    assert ClientType.WEB == "web"
    assert ClientType.IOS == "ios"
    assert ClientType.ANDROID == "android"
    assert ClientType.TVOS == "tvos"
    assert ClientType.TIZEN == "tizen"
    assert ClientType.BACKEND == "backend"


# ============================================
# ClientStatus Enum Tests
# ============================================


def test_client_status_enum():
    """Test ClientStatus enum values."""
    assert ClientStatus.ONLINE == "online"
    assert ClientStatus.OFFLINE == "offline"
    assert ClientStatus.DEGRADED == "degraded"


# ============================================
# DiagnosticSeverity Enum Tests
# ============================================


def test_diagnostic_severity_enum():
    """Test DiagnosticSeverity enum values."""
    assert DiagnosticSeverity.INFO == "info"
    assert DiagnosticSeverity.WARNING == "warning"
    assert DiagnosticSeverity.ERROR == "error"
    assert DiagnosticSeverity.CRITICAL == "critical"


# ============================================
# ClientMetrics Model Tests
# ============================================


def test_client_metrics_creation():
    """Test creating ClientMetrics instance."""
    metrics = ClientMetrics(
        cpu_usage=45.5,
        memory_usage=68.2,
        network_latency=120.0,
        error_count=2,
        active_users=5,
    )

    assert metrics.cpu_usage == 45.5
    assert metrics.memory_usage == 68.2
    assert metrics.network_latency == 120.0
    assert metrics.error_count == 2
    assert metrics.active_users == 5


def test_client_metrics_optional_fields():
    """Test ClientMetrics with optional fields."""
    metrics = ClientMetrics(
        error_count=0,
        active_users=1,
    )

    assert metrics.cpu_usage is None
    assert metrics.memory_usage is None
    assert metrics.network_latency is None
    assert metrics.error_count == 0
    assert metrics.active_users == 1


# ============================================
# ClientHeartbeat Model Tests
# ============================================


@pytest.mark.asyncio
async def test_client_heartbeat_creation(db_client):
    """Test creating and saving ClientHeartbeat."""
    now = datetime.now(timezone.utc)

    heartbeat = ClientHeartbeat(
        client_type=ClientType.WEB,
        client_id="test-web-client-1",
        client_version="1.0.0",
        status=ClientStatus.ONLINE,
        metrics=ClientMetrics(
            cpu_usage=40.0,
            memory_usage=60.0,
            error_count=0,
            active_users=3,
        ),
        timestamp=now,
        last_seen=now,
        api_latency=85.5,
    )

    await heartbeat.insert()

    # Retrieve and verify
    retrieved = await ClientHeartbeat.find_one(
        ClientHeartbeat.client_id == "test-web-client-1"
    )

    assert retrieved is not None
    assert retrieved.client_type == ClientType.WEB
    assert retrieved.client_id == "test-web-client-1"
    assert retrieved.client_version == "1.0.0"
    assert retrieved.status == ClientStatus.ONLINE
    assert retrieved.metrics.cpu_usage == 40.0
    assert retrieved.api_latency == 85.5


@pytest.mark.asyncio
async def test_client_heartbeat_update(db_client):
    """Test updating ClientHeartbeat."""
    now = datetime.now(timezone.utc)

    # Create initial heartbeat
    heartbeat = ClientHeartbeat(
        client_type=ClientType.IOS,
        client_id="test-ios-client-1",
        client_version="1.0.0",
        status=ClientStatus.ONLINE,
        metrics=ClientMetrics(
            cpu_usage=30.0,
            memory_usage=50.0,
            error_count=0,
            active_users=1,
        ),
        timestamp=now,
        last_seen=now,
    )
    await heartbeat.insert()

    # Update metrics
    heartbeat.metrics.cpu_usage = 60.0
    heartbeat.metrics.error_count = 2
    heartbeat.status = ClientStatus.DEGRADED
    heartbeat.last_seen = datetime.now(timezone.utc)
    await heartbeat.save()

    # Retrieve and verify
    retrieved = await ClientHeartbeat.find_one(
        ClientHeartbeat.client_id == "test-ios-client-1"
    )

    assert retrieved.metrics.cpu_usage == 60.0
    assert retrieved.metrics.error_count == 2
    assert retrieved.status == ClientStatus.DEGRADED


@pytest.mark.asyncio
async def test_client_heartbeat_indexes(db_client):
    """Test that ClientHeartbeat indexes are created."""
    # Create multiple heartbeats
    for i in range(5):
        await ClientHeartbeat(
            client_type=ClientType.WEB,
            client_id=f"web-client-{i}",
            client_version="1.0.0",
            status=ClientStatus.ONLINE,
            metrics=ClientMetrics(
                cpu_usage=40.0 + i * 5,
                memory_usage=50.0 + i * 5,
                error_count=i,
                active_users=i + 1,
            ),
            timestamp=datetime.now(timezone.utc),
            last_seen=datetime.now(timezone.utc),
        ).insert()

    # Query using indexed fields
    web_clients = await ClientHeartbeat.find(
        ClientHeartbeat.client_type == ClientType.WEB
    ).to_list()
    assert len(web_clients) == 5

    online_clients = await ClientHeartbeat.find(
        ClientHeartbeat.status == ClientStatus.ONLINE
    ).to_list()
    assert len(online_clients) == 5


# ============================================
# ClientHealthHistory Model Tests
# ============================================


@pytest.mark.asyncio
async def test_client_health_history_creation(db_client):
    """Test creating and saving ClientHealthHistory."""
    history = ClientHealthHistory(
        client_type=ClientType.ANDROID,
        status=ClientStatus.ONLINE,
        metrics_snapshot={
            "cpu_usage": 35.0,
            "memory_usage": 55.0,
            "error_count": 1,
            "active_users": 2,
        },
        recorded_at=datetime.now(timezone.utc),
        aggregation_period="1m",
    )

    await history.insert()

    # Retrieve and verify
    retrieved = await ClientHealthHistory.find_one(
        ClientHealthHistory.client_type == ClientType.ANDROID
    )

    assert retrieved is not None
    assert retrieved.client_type == ClientType.ANDROID
    assert retrieved.status == ClientStatus.ONLINE
    assert retrieved.metrics_snapshot["cpu_usage"] == 35.0
    assert retrieved.aggregation_period == "1m"


@pytest.mark.asyncio
async def test_client_health_history_time_series(db_client):
    """Test querying ClientHealthHistory as time series."""
    base_time = datetime.now(timezone.utc)

    # Create historical records
    for i in range(10):
        await ClientHealthHistory(
            client_type=ClientType.WEB,
            status=ClientStatus.ONLINE,
            metrics_snapshot={
                "cpu_usage": 30.0 + i * 2,
                "memory_usage": 50.0 + i * 2,
                "error_count": 0,
                "active_users": 5,
            },
            recorded_at=base_time - timedelta(minutes=i),
            aggregation_period="1m",
        ).insert()

    # Query last 5 minutes
    cutoff_time = base_time - timedelta(minutes=5)
    recent_history = await ClientHealthHistory.find(
        ClientHealthHistory.client_type == ClientType.WEB,
        ClientHealthHistory.recorded_at >= cutoff_time,
    ).sort(-ClientHealthHistory.recorded_at).to_list()

    assert len(recent_history) == 6  # 0 to 5 minutes inclusive


# ============================================
# ClientAlert Model Tests
# ============================================


@pytest.mark.asyncio
async def test_client_alert_creation(db_client):
    """Test creating and saving ClientAlert."""
    alert = ClientAlert(
        alert_id="alert-tvos-1",
        client_type=ClientType.TVOS,
        client_id="tvos-client-1",
        severity=DiagnosticSeverity.ERROR,
        title="High Memory Usage",
        message="High memory usage detected",
        details={"memory_usage": 95.0, "threshold": 90.0},
        is_resolved=False,
    )

    await alert.insert()

    # Retrieve and verify
    retrieved = await ClientAlert.find_one(
        ClientAlert.client_id == "tvos-client-1"
    )

    assert retrieved is not None
    assert retrieved.alert_id == "alert-tvos-1"
    assert retrieved.client_type == ClientType.TVOS
    assert retrieved.severity == DiagnosticSeverity.ERROR
    assert retrieved.title == "High Memory Usage"
    assert retrieved.message == "High memory usage detected"
    assert retrieved.details["memory_usage"] == 95.0
    assert retrieved.is_resolved is False


@pytest.mark.asyncio
async def test_client_alert_resolution(db_client):
    """Test resolving ClientAlert."""
    now = datetime.now(timezone.utc)

    # Create alert
    alert = ClientAlert(
        alert_id="alert-backend-1",
        client_type=ClientType.BACKEND,
        client_id="backend-service-1",
        severity=DiagnosticSeverity.CRITICAL,
        title="Service Down",
        message="Service is not responding",
        created_at=now,
        is_resolved=False,
    )
    await alert.insert()

    # Resolve alert
    alert.is_resolved = True
    alert.resolved_at = datetime.now(timezone.utc)
    alert.resolved_by = "admin-user-1"
    await alert.save()

    # Verify
    retrieved = await ClientAlert.find_one(
        ClientAlert.client_id == "backend-service-1"
    )

    assert retrieved.is_resolved is True
    assert retrieved.resolved_at is not None
    assert retrieved.resolved_by == "admin-user-1"


@pytest.mark.asyncio
async def test_client_alert_filtering(db_client):
    """Test filtering alerts by severity and status."""
    # Create alerts with different severities
    await ClientAlert(
        alert_id="alert-web-1",
        client_type=ClientType.WEB,
        client_id="web-1",
        severity=DiagnosticSeverity.INFO,
        title="Minor Issue",
        message="Minor performance issue",
        is_resolved=False,
    ).insert()

    await ClientAlert(
        alert_id="alert-web-2",
        client_type=ClientType.WEB,
        client_id="web-2",
        severity=DiagnosticSeverity.CRITICAL,
        title="Critical Issue",
        message="Critical system failure",
        is_resolved=False,
    ).insert()

    await ClientAlert(
        alert_id="alert-web-3",
        client_type=ClientType.WEB,
        client_id="web-3",
        severity=DiagnosticSeverity.WARNING,
        title="Medium Issue",
        message="Moderate performance degradation",
        is_resolved=True,
    ).insert()

    # Query unresolved alerts
    unresolved = await ClientAlert.find(
        ClientAlert.is_resolved == False
    ).to_list()
    assert len(unresolved) == 2

    # Query critical alerts
    critical = await ClientAlert.find(
        ClientAlert.severity == DiagnosticSeverity.CRITICAL
    ).to_list()
    assert len(critical) == 1
    assert critical[0].title == "Critical Issue"
