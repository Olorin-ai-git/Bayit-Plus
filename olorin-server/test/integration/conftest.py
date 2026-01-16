"""Pytest configuration for integration tests with MongoDB.

SYSTEM MANDATE Compliance:
- No hardcoded values: All configuration from fixtures
- Complete implementation: No placeholders or TODOs
- Test isolation: Each test gets clean database
"""

import asyncio
from typing import AsyncGenerator, Generator

import pytest
import pytest_asyncio
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from testcontainers.mongodb import MongoDbContainer

from app.persistence.mongodb import (
    close_mongodb,
    ensure_mongodb_collections,
    init_mongodb,
)
from app.persistence.repositories import (
    AnomalyEventRepository,
    AuditLogRepository,
    ComposioActionAuditRepository,
    ComposioConnectionRepository,
    DetectionRunRepository,
    DetectorRepository,
    InvestigationRepository,
    SOARPlaybookExecutionRepository,
    TemplateRepository,
    TransactionScoreRepository,
)


@pytest.fixture(scope="session")
def event_loop() -> Generator[asyncio.AbstractEventLoop, None, None]:
    """Create event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
def mongodb_container() -> Generator[MongoDbContainer, None, None]:
    """Create MongoDB testcontainer for integration tests.

    Scope: session - container reused across all tests for performance.
    Each test gets isolated database via cleanup fixtures.
    """
    with MongoDbContainer("mongo:7.0") as container:
        yield container


@pytest_asyncio.fixture(scope="session")
async def mongodb_client(
    mongodb_container: MongoDbContainer,
) -> AsyncGenerator[AsyncIOMotorClient, None]:
    """Create MongoDB client connected to test container.

    Scope: session - client reused, but each test gets clean database.
    """
    connection_url = mongodb_container.get_connection_url()
    client = AsyncIOMotorClient(connection_url)

    yield client

    client.close()


@pytest_asyncio.fixture(scope="function")
async def test_mongodb(
    mongodb_client: AsyncIOMotorClient,
) -> AsyncGenerator[AsyncIOMotorDatabase, None]:
    """Create test database with fresh collections for each test.

    Scope: function - each test gets isolated database.
    Collections are created with proper indexes before test runs.
    Database is dropped after test completes for full isolation.
    """
    db_name = f"test_olorin_{id(object())}"
    db = mongodb_client[db_name]

    # Create collections and indexes
    await ensure_mongodb_collections(db)

    yield db

    # Cleanup: drop entire test database
    await mongodb_client.drop_database(db_name)


# Repository fixtures - each test gets fresh repository with isolated database


@pytest_asyncio.fixture(scope="function")
async def investigation_repository(
    test_mongodb: AsyncIOMotorDatabase,
) -> InvestigationRepository:
    """Create InvestigationRepository with test database."""
    return InvestigationRepository(db=test_mongodb)


@pytest_asyncio.fixture(scope="function")
async def detector_repository(
    test_mongodb: AsyncIOMotorDatabase,
) -> DetectorRepository:
    """Create DetectorRepository with test database."""
    return DetectorRepository(db=test_mongodb)


@pytest_asyncio.fixture(scope="function")
async def detection_run_repository(
    test_mongodb: AsyncIOMotorDatabase,
) -> DetectionRunRepository:
    """Create DetectionRunRepository with test database."""
    return DetectionRunRepository(db=test_mongodb)


@pytest_asyncio.fixture(scope="function")
async def anomaly_event_repository(
    test_mongodb: AsyncIOMotorDatabase,
) -> AnomalyEventRepository:
    """Create AnomalyEventRepository with test database."""
    return AnomalyEventRepository(db=test_mongodb)


@pytest_asyncio.fixture(scope="function")
async def transaction_score_repository(
    test_mongodb: AsyncIOMotorDatabase,
) -> TransactionScoreRepository:
    """Create TransactionScoreRepository with test database."""
    return TransactionScoreRepository(db=test_mongodb)


@pytest_asyncio.fixture(scope="function")
async def audit_log_repository(
    test_mongodb: AsyncIOMotorDatabase,
) -> AuditLogRepository:
    """Create AuditLogRepository with test database."""
    return AuditLogRepository(db=test_mongodb)


@pytest_asyncio.fixture(scope="function")
async def template_repository(
    test_mongodb: AsyncIOMotorDatabase,
) -> TemplateRepository:
    """Create TemplateRepository with test database."""
    return TemplateRepository(db=test_mongodb)


@pytest_asyncio.fixture(scope="function")
async def composio_connection_repository(
    test_mongodb: AsyncIOMotorDatabase,
) -> ComposioConnectionRepository:
    """Create ComposioConnectionRepository with test database."""
    return ComposioConnectionRepository(db=test_mongodb)


@pytest_asyncio.fixture(scope="function")
async def composio_action_audit_repository(
    test_mongodb: AsyncIOMotorDatabase,
) -> ComposioActionAuditRepository:
    """Create ComposioActionAuditRepository with test database."""
    return ComposioActionAuditRepository(db=test_mongodb)


@pytest_asyncio.fixture(scope="function")
async def soar_playbook_execution_repository(
    test_mongodb: AsyncIOMotorDatabase,
) -> SOARPlaybookExecutionRepository:
    """Create SOARPlaybookExecutionRepository with test database."""
    return SOARPlaybookExecutionRepository(db=test_mongodb)


# Legacy fixture for backward compatibility (will be removed in future)
@pytest.fixture(scope="function")
def db(test_mongodb: AsyncIOMotorDatabase):
    """Legacy fixture for backward compatibility with existing tests.

    DEPRECATED: Use repository fixtures directly instead.
    This fixture will be removed after all tests are migrated to repositories.
    """
    return test_mongodb
