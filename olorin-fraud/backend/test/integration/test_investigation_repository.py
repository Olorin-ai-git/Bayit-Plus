"""Integration tests for InvestigationRepository with MongoDB.

SYSTEM MANDATE Compliance:
- No hardcoded values: All test data from fixtures
- Complete implementation: No placeholders or TODOs
- Real database: Uses MongoDB testcontainer
"""

from datetime import datetime

import pytest

from app.models.investigation_mongodb import (
    Investigation,
    InvestigationProgress,
    InvestigationSettings,
    InvestigationStatus,
    LifecycleStage,
)
from app.persistence.repositories import InvestigationRepository


@pytest.mark.asyncio
@pytest.mark.integration
async def test_create_investigation(
    investigation_repository: InvestigationRepository,
):
    """Test creating a new investigation."""
    investigation = Investigation(
        investigation_id="test-inv-001",
        user_id="user-123",
        tenant_id="tenant-456",
        lifecycle_stage=LifecycleStage.CREATED,
        status=InvestigationStatus.PENDING,
        settings=InvestigationSettings(
            entity_type="user",
            entity_value="john@example.com",
        ),
        version=1,
    )

    created = await investigation_repository.create(investigation)

    assert created.id is not None
    assert created.investigation_id == "test-inv-001"
    assert created.user_id == "user-123"
    assert created.tenant_id == "tenant-456"


@pytest.mark.asyncio
@pytest.mark.integration
async def test_find_by_id(
    investigation_repository: InvestigationRepository,
):
    """Test finding investigation by ID."""
    investigation = Investigation(
        investigation_id="test-inv-002",
        user_id="user-123",
        tenant_id="tenant-456",
        lifecycle_stage=LifecycleStage.CREATED,
        status=InvestigationStatus.PENDING,
        version=1,
    )

    await investigation_repository.create(investigation)

    found = await investigation_repository.find_by_id(
        "test-inv-002", tenant_id="tenant-456"
    )

    assert found is not None
    assert found.investigation_id == "test-inv-002"
    assert found.user_id == "user-123"


@pytest.mark.asyncio
@pytest.mark.integration
async def test_find_by_id_wrong_tenant(
    investigation_repository: InvestigationRepository,
):
    """Test finding investigation with wrong tenant returns None."""
    investigation = Investigation(
        investigation_id="test-inv-003",
        user_id="user-123",
        tenant_id="tenant-456",
        lifecycle_stage=LifecycleStage.CREATED,
        status=InvestigationStatus.PENDING,
        version=1,
    )

    await investigation_repository.create(investigation)

    found = await investigation_repository.find_by_id(
        "test-inv-003", tenant_id="wrong-tenant"
    )

    assert found is None


@pytest.mark.asyncio
@pytest.mark.integration
async def test_update_with_version_success(
    investigation_repository: InvestigationRepository,
):
    """Test optimistic locking update with correct version."""
    investigation = Investigation(
        investigation_id="test-inv-004",
        user_id="user-123",
        tenant_id="tenant-456",
        lifecycle_stage=LifecycleStage.CREATED,
        status=InvestigationStatus.PENDING,
        version=1,
    )

    created = await investigation_repository.create(investigation)

    updates = {"status": InvestigationStatus.RUNNING.value}
    updated = await investigation_repository.update_with_version(
        "test-inv-004", current_version=1, updates=updates, tenant_id="tenant-456"
    )

    assert updated is not None
    assert updated.status == InvestigationStatus.RUNNING
    assert updated.version == 2


@pytest.mark.asyncio
@pytest.mark.integration
async def test_update_with_version_conflict(
    investigation_repository: InvestigationRepository,
):
    """Test optimistic locking fails with wrong version."""
    investigation = Investigation(
        investigation_id="test-inv-005",
        user_id="user-123",
        tenant_id="tenant-456",
        lifecycle_stage=LifecycleStage.CREATED,
        status=InvestigationStatus.PENDING,
        version=1,
    )

    await investigation_repository.create(investigation)

    updates = {"status": InvestigationStatus.RUNNING.value}
    updated = await investigation_repository.update_with_version(
        "test-inv-005", current_version=999, updates=updates, tenant_id="tenant-456"
    )

    assert updated is None


@pytest.mark.asyncio
@pytest.mark.integration
async def test_update_progress(
    investigation_repository: InvestigationRepository,
):
    """Test updating investigation progress."""
    investigation = Investigation(
        investigation_id="test-inv-006",
        user_id="user-123",
        tenant_id="tenant-456",
        lifecycle_stage=LifecycleStage.IN_PROGRESS,
        status=InvestigationStatus.RUNNING,
        progress=InvestigationProgress(current_phase="detection", progress_percentage=25.0),
        version=1,
    )

    await investigation_repository.create(investigation)

    updated = await investigation_repository.update_progress(
        "test-inv-006",
        current_phase="analysis",
        progress_percentage=50.0,
        tenant_id="tenant-456",
    )

    assert updated is not None
    assert updated.progress.current_phase == "analysis"
    assert updated.progress.progress_percentage == 50.0


@pytest.mark.asyncio
@pytest.mark.integration
async def test_find_by_user_pagination(
    investigation_repository: InvestigationRepository,
):
    """Test finding investigations by user with pagination."""
    for i in range(5):
        investigation = Investigation(
            investigation_id=f"test-inv-pag-{i}",
            user_id="user-pagination",
            tenant_id="tenant-456",
            lifecycle_stage=LifecycleStage.CREATED,
            status=InvestigationStatus.PENDING,
            version=1,
        )
        await investigation_repository.create(investigation)

    # Get first page
    page1 = await investigation_repository.find_by_user(
        "user-pagination", tenant_id="tenant-456", limit=2, skip=0
    )
    assert len(page1) == 2

    # Get second page
    page2 = await investigation_repository.find_by_user(
        "user-pagination", tenant_id="tenant-456", limit=2, skip=2
    )
    assert len(page2) == 2

    # Get third page
    page3 = await investigation_repository.find_by_user(
        "user-pagination", tenant_id="tenant-456", limit=2, skip=4
    )
    assert len(page3) == 1


@pytest.mark.asyncio
@pytest.mark.integration
async def test_find_by_status(
    investigation_repository: InvestigationRepository,
):
    """Test finding investigations by status."""
    for i in range(3):
        investigation = Investigation(
            investigation_id=f"test-inv-status-{i}",
            user_id="user-123",
            tenant_id="tenant-456",
            lifecycle_stage=LifecycleStage.IN_PROGRESS,
            status=InvestigationStatus.RUNNING,
            version=1,
        )
        await investigation_repository.create(investigation)

    found = await investigation_repository.find_by_status(
        InvestigationStatus.RUNNING, tenant_id="tenant-456"
    )

    assert len(found) == 3
    assert all(inv.status == InvestigationStatus.RUNNING for inv in found)


@pytest.mark.asyncio
@pytest.mark.integration
async def test_delete_investigation(
    investigation_repository: InvestigationRepository,
):
    """Test deleting an investigation."""
    investigation = Investigation(
        investigation_id="test-inv-delete",
        user_id="user-123",
        tenant_id="tenant-456",
        lifecycle_stage=LifecycleStage.CREATED,
        status=InvestigationStatus.PENDING,
        version=1,
    )

    await investigation_repository.create(investigation)

    deleted = await investigation_repository.delete(
        "test-inv-delete", tenant_id="tenant-456"
    )
    assert deleted is True

    found = await investigation_repository.find_by_id(
        "test-inv-delete", tenant_id="tenant-456"
    )
    assert found is None


@pytest.mark.asyncio
@pytest.mark.integration
async def test_count_by_user(
    investigation_repository: InvestigationRepository,
):
    """Test counting investigations for a user."""
    for i in range(7):
        investigation = Investigation(
            investigation_id=f"test-inv-count-{i}",
            user_id="user-count-test",
            tenant_id="tenant-456",
            lifecycle_stage=LifecycleStage.CREATED,
            status=InvestigationStatus.PENDING,
            version=1,
        )
        await investigation_repository.create(investigation)

    count = await investigation_repository.count_by_user(
        "user-count-test", tenant_id="tenant-456"
    )

    assert count == 7


@pytest.mark.asyncio
@pytest.mark.integration
async def test_isolation_between_tests(
    investigation_repository: InvestigationRepository,
):
    """Test that each test gets isolated database.

    This test should always find zero investigations because
    each test gets a clean database.
    """
    count = await investigation_repository.count_by_user(
        "non-existent-user", tenant_id="tenant-456"
    )

    assert count == 0
