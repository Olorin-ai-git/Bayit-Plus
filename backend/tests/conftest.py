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


@pytest.fixture
def mock_settings():
    """Mock settings for testing."""
    from unittest.mock import Mock

    settings = Mock()
    settings.ANTHROPIC_API_KEY = "test-api-key"
    settings.MONGODB_URL = "mongodb://localhost:27017"
    settings.MONGODB_DB_NAME = "test_bayit_plus"
    return settings
