"""
Pytest configuration and fixtures for Bayit+ backend tests.
"""

import os
import secrets
import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

# Bootstrap required env vars for test runs so app.core.config.Settings can
# initialize without a real .env file present. Only sets defaults — does NOT
# override values already provided by CI or a developer shell.
os.environ.setdefault("SECRET_KEY", secrets.token_urlsafe(32))
os.environ.setdefault("MONGODB_URI", "mongodb://localhost:27017/test_bayit_plus")
os.environ.setdefault("MONGODB_URL", "mongodb://localhost:27017/test_bayit_plus")
os.environ.setdefault("OPENAI_API_KEY", "test-openai-key")
os.environ.setdefault("ANTHROPIC_API_KEY", "test-anthropic-key")

from typing import Optional

import pytest
import pytest_asyncio
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient


@pytest.fixture
def mock_settings():
    """Mock settings for testing."""
    from unittest.mock import Mock

    settings = Mock()
    settings.ANTHROPIC_API_KEY = "test-api-key"
    settings.MONGODB_URL = "mongodb://localhost:27017"
    settings.MONGODB_DB_NAME = "test_bayit_plus"
    settings.KIDS_EDUCATIONAL_SITES_CONFIG = ""
    settings.KIDS_CONTENT_CACHE_TTL_MINUTES = 30
    return settings


@pytest.fixture
def mock_kids_subcategory():
    """Mock kids subcategory for testing."""
    from app.models.kids_content import KidsSubcategory

    return KidsSubcategory.LEARNING_HEBREW


@pytest.fixture
def mock_age_group():
    """Mock age group for testing."""
    from app.models.kids_content import KidsAgeGroup

    return KidsAgeGroup.PRESCHOOL


@pytest.fixture
def sample_discovery_result():
    """Sample discovery result for testing."""
    from app.models.kids_content import KidsSubcategory
    from app.services.mcp_content_discovery import DiscoveryResult

    return DiscoveryResult(
        source_type="youtube",
        source_url="https://youtube.com/watch?v=test123",
        title="Test Educational Video",
        description="A test video for kids",
        thumbnail_url="https://example.com/thumb.jpg",
        suggested_category="educational",
        suggested_subcategory=KidsSubcategory.LEARNING_HEBREW,
        confidence_score=0.85,
    )


def pytest_configure(config):
    """Configure pytest markers."""
    config.addinivalue_line("markers", "asyncio: mark test as async")
    config.addinivalue_line("markers", "slow: mark test as slow running")
    config.addinivalue_line("markers", "integration: mark test as integration test")
    config.addinivalue_line("markers", "olorin: mark test as Olorin platform test")
    config.addinivalue_line(
        "markers", "phase2: mark test as Phase 2 (separate database) test"
    )


# ============================================
# Olorin Database Test Fixtures (Phase 2)
# ============================================


@pytest_asyncio.fixture
async def olorin_db_client():
    """
    Create Olorin test database client.

    For Phase 2 separate database testing.
    Creates a separate test database for Olorin models.
    """
    from app.core.config import settings
    from app.models.content_embedding import ContentEmbedding, RecapSession
    from app.models.cultural_reference import CulturalReference
    from app.models.integration_partner import (
        DubbingSession,
        IntegrationPartner,
        UsageRecord,
        WebhookDelivery,
    )
    from app.models.trial_history import TrialHistory

    # Use test database name
    test_db_name = f"{settings.olorin.database.mongodb_db_name}_test"
    mongodb_url = settings.olorin.database.mongodb_url or settings.MONGODB_URL

    client = AsyncIOMotorClient(mongodb_url)

    # Initialize Beanie with Olorin models
    await init_beanie(
        database=client[test_db_name],
        document_models=[
            IntegrationPartner,
            UsageRecord,
            DubbingSession,
            WebhookDelivery,
            ContentEmbedding,
            RecapSession,
            CulturalReference,
            TrialHistory,
        ],
    )

    yield client

    # Cleanup - drop test database
    await client.drop_database(test_db_name)
    client.close()


@pytest_asyncio.fixture
async def content_db_client():
    """
    Create Content database client for cross-database testing.

    Provides access to Bayit+ Content model for Olorin tests
    that need to verify cross-database access patterns.
    """
    from app.core.config import settings
    from app.models.content import Content

    # Use test database name
    test_db_name = f"{settings.MONGODB_DB_NAME}_content_test"

    client = AsyncIOMotorClient(settings.MONGODB_URL)

    # Initialize Beanie with Content model only
    await init_beanie(
        database=client[test_db_name],
        document_models=[Content],
    )

    yield client

    # Cleanup - drop test database
    await client.drop_database(test_db_name)
    client.close()


@pytest_asyncio.fixture
async def combined_db_clients(olorin_db_client, content_db_client):
    """
    Combined fixture providing both Olorin and Content database clients.

    Use this for tests that need to verify cross-database operations,
    such as ContentMetadataService functionality.

    Returns:
        tuple: (olorin_client, content_client)
    """
    return (olorin_db_client, content_db_client)


@pytest_asyncio.fixture
async def mock_content_metadata_service(content_db_client):
    """
    Mock ContentMetadataService for testing Olorin services.

    Initializes the service with test Content database client.
    """
    from app.services.olorin.content_metadata_service import content_metadata_service

    # Initialize with test database
    await content_metadata_service.initialize()

    yield content_metadata_service


@pytest_asyncio.fixture
async def bayit_db_client():
    """
    Create Bayit+ main database client for testing.

    Provides access to User, Household, Profile, and FamilyControls models.
    Creates a separate test database for these core Bayit+ models.
    """
    from app.core.config import settings
    from app.models.user import User
    from app.models.household import Household
    from app.models.profile import Profile
    from app.models.family_controls import FamilyControls

    # Use test database name
    test_db_name = f"{settings.MONGODB_DB_NAME}_test"

    client = AsyncIOMotorClient(settings.MONGODB_URL)

    # Initialize Beanie with Bayit+ core models
    await init_beanie(
        database=client[test_db_name],
        document_models=[
            User,
            Household,
            Profile,
            FamilyControls,
        ],
    )

    yield client

    # Cleanup - drop test database
    await client.drop_database(test_db_name)
    client.close()
