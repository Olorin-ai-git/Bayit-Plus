"""Test configuration for olorin-server tests.

This conftest.py sets up the Python path and common test configurations
for both unit and integration tests with MongoDB support.

SYSTEM MANDATE Compliance:
- No hardcoded values: All configuration from environment
- Complete implementation: No placeholders or TODOs
- Test isolation: Proper markers and fixtures
"""

import logging
import os
import sys
from pathlib import Path

import pytest

# Add the project root to Python path for imports
project_root = Path(__file__).parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

# Also add the app directory
app_path = project_root / "app"
if str(app_path) not in sys.path:
    sys.path.insert(0, str(app_path))

# Configure logging for tests
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)


def pytest_configure(config):
    """Configure pytest markers and asyncio mode."""
    config.addinivalue_line("markers", "integration: marks tests as integration tests")
    config.addinivalue_line("markers", "unit: marks tests as unit tests")
    config.addinivalue_line(
        "markers", "asyncio: marks tests as async (automatic with pytest-asyncio)"
    )
    config.addinivalue_line(
        "markers", "mongodb: marks tests that require MongoDB testcontainer"
    )

    # Set asyncio mode to auto for pytest-asyncio
    config.option.asyncio_mode = "auto"


def pytest_collection_modifyitems(config, items):
    """Automatically mark tests based on their location and content."""
    for item in items:
        # Mark integration tests
        if "integration" in str(item.fspath):
            item.add_marker(pytest.mark.integration)

        # Mark unit tests
        elif "unit" in str(item.fspath):
            item.add_marker(pytest.mark.unit)

        # Mark async tests automatically
        if "async" in item.name or "asyncio" in item.fixturenames:
            item.add_marker(pytest.mark.asyncio)

        # Mark MongoDB tests
        if any(
            fixture in item.fixturenames
            for fixture in [
                "test_mongodb",
                "mongodb_container",
                "mongodb_client",
                "investigation_repository",
                "detector_repository",
                "detection_run_repository",
                "anomaly_event_repository",
                "transaction_score_repository",
                "audit_log_repository",
                "template_repository",
                "composio_connection_repository",
                "composio_action_audit_repository",
                "soar_playbook_execution_repository",
            ]
        ):
            item.add_marker(pytest.mark.mongodb)
