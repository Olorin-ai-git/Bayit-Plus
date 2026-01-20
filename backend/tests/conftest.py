"""
Pytest configuration and fixtures for Bayit+ backend tests.
"""

import sys
import os
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

import pytest
import pytest_asyncio
from typing import Optional


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
    from app.services.mcp_content_discovery import DiscoveryResult
    from app.models.kids_content import KidsSubcategory

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
    config.addinivalue_line(
        "markers", "asyncio: mark test as async"
    )
    config.addinivalue_line(
        "markers", "slow: mark test as slow running"
    )
    config.addinivalue_line(
        "markers", "integration: mark test as integration test"
    )
