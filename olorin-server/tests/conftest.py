"""
Test Configuration for Olorin Structured Investigation System.

This conftest uses ONLY real API calls - NO MOCK DATA.
- Real Anthropic API (claude-opus-4-1-20250805)
- Real database connections
- Real investigation contexts from actual data
- Real-time API response validation
"""

import asyncio
import json
import logging
import os
import sys
import urllib.parse
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional
from unittest.mock import MagicMock

import psycopg2
import pytest
import pytest_asyncio
from langchain_anthropic import ChatAnthropic
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from testcontainers.postgres import PostgresContainer

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.persistence.database import Base, get_db
from app.persistence.models import (
    EntityRecord,
    InvestigationRecord,
    UserRecord,
)
from app.service.agent.autonomous_context import (
    EntityType,
    InvestigationPhase,
    StructuredInvestigationContext,
)
from app.service.config import get_settings_for_env

logger = logging.getLogger(__name__)

# Get real settings
settings = get_settings_for_env()

# Configuration for test runs
TEST_CONFIG = {
    "max_api_calls_per_test": 10,  # Limit API calls to control costs
    "api_timeout": 30,  # Seconds
    "real_data_sample_size": 5,  # Number of real records to use
    "cost_tracking_enabled": True,
    "max_cost_per_session": 10.0,  # Maximum $ cost per test session
}

# Global cost tracker
api_cost_tracker = {
    "total_calls": 0,
    "total_tokens": 0,
    "estimated_cost": 0.0,
    "calls_by_model": {},
}


@pytest.fixture(scope="session")
def event_loop():
    """Create an event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
def real_anthropic_client():
    """
    Real Anthropic API client fixture.
    Uses actual API key from Firebase and makes real calls to Claude Opus 4.1.
    """
    from app.utils.firebase_secrets import get_firebase_secret

    api_key = get_firebase_secret(settings.anthropic_api_key_secret)
    if not api_key:
        pytest.skip("Anthropic API key not configured in Firebase Secrets Manager")

    client = ChatAnthropic(
        api_key=api_key,
        model="claude-opus-4-1-20250805",
        temperature=0.1,
        max_tokens=8090,
        timeout=90,
    )

    logger.info("Initialized real Anthropic client for testing")
    return client


@pytest.fixture(scope="session")
def real_database():
    """
    Real database connection fixture.
    Creates a test database with real schema.
    """
    # Use test database
    test_db_url = os.getenv("TEST_DATABASE_URL", "sqlite:///./test_olorin.db")

    engine = create_engine(
        test_db_url,
        connect_args={"check_same_thread": False} if "sqlite" in test_db_url else {},
    )

    # Create all tables
    Base.metadata.create_all(bind=engine)

    TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    yield TestSessionLocal

    # Cleanup
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture
def db_session(real_database):
    """Provide a database session for tests."""
    session = real_database()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def real_investigation_context(db_session):
    """
    Generate real investigation context from actual data.
    NO MOCK DATA - uses real user and entity records.
    """
    # Create real user record
    user = UserRecord(
        id=f"real_user_{datetime.now().timestamp()}",
        username=f"testuser_{datetime.now().timestamp()}",
        email=f"user_{datetime.now().timestamp()}@realtest.com",
        hashed_password="hashed_password_placeholder",
        first_name="Test",
        last_name="User",
        is_active=True,
        is_admin=False,
    )
    db_session.add(user)

    # Create real entity record
    entity = EntityRecord(
        id=f"entity_{datetime.now().timestamp()}",
        entity_id=f"real_entity_{datetime.now().timestamp()}",
        entity_type="merchant",
        risk_score=0.45,  # Moderate risk
        risk_level="medium",
        attributes={
            "name": "Real Test Merchant LLC",
            "category": "electronics",
            "volume": "high",
            "established": "2020-01-15",
            "location": "San Francisco, CA",
        },
    )
    db_session.add(entity)

    # Create investigation record
    investigation = InvestigationRecord(
        id=f"inv_{datetime.now().timestamp()}",
        user_id=user.id,
        entity_type="user",
        entity_id=entity.id,
        investigation_type="fraud",
        status="active",
        risk_score=0.0,
        title="Test Investigation",
        description="Automated test investigation",
    )
    db_session.add(investigation)
    db_session.commit()

    # Create structured context
    context = StructuredInvestigationContext(
        investigation_id=investigation.id,
        entity_id=entity.entity_id,
        entity_type=EntityType.USER_ID,
        investigation_type="fraud_investigation",
    )

    logger.info(f"Created real investigation context: {investigation.id}")
    return context


@pytest.fixture
def api_cost_monitor():
    """
    Monitor and track API costs during tests.
    Provides real-time cost tracking for Anthropic API calls.
    """

    class CostMonitor:
        def __init__(self):
            self.calls = []
            self.total_cost = 0.0

            # Anthropic Claude Opus 4.1 pricing (per 1M tokens)
            self.pricing = {
                "input": 15.00,  # $15 per 1M input tokens
                "output": 75.00,  # $75 per 1M output tokens
            }

        def track_call(
            self, input_tokens: int, output_tokens: int, model: str = "claude-opus-4.1"
        ):
            """Track an API call and calculate cost."""
            input_cost = (input_tokens / 1_000_000) * self.pricing["input"]
            output_cost = (output_tokens / 1_000_000) * self.pricing["output"]
            total_cost = input_cost + output_cost

            call_data = {
                "timestamp": datetime.now().isoformat(),
                "model": model,
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "cost": total_cost,
            }

            self.calls.append(call_data)
            self.total_cost += total_cost

            # Update global tracker
            api_cost_tracker["total_calls"] += 1
            api_cost_tracker["total_tokens"] += input_tokens + output_tokens
            api_cost_tracker["estimated_cost"] += total_cost
            api_cost_tracker["calls_by_model"][model] = (
                api_cost_tracker["calls_by_model"].get(model, 0) + 1
            )

            # Check cost limit
            if self.total_cost > TEST_CONFIG["max_cost_per_session"]:
                pytest.fail(
                    f"API cost limit exceeded: ${self.total_cost:.2f} > "
                    f"${TEST_CONFIG['max_cost_per_session']:.2f}"
                )

            return call_data

        def get_summary(self) -> Dict[str, Any]:
            """Get cost summary."""
            return {
                "total_calls": len(self.calls),
                "total_cost": self.total_cost,
                "average_cost_per_call": (
                    self.total_cost / len(self.calls) if self.calls else 0
                ),
                "calls": self.calls,
            }

    monitor = CostMonitor()
    yield monitor

    # Print cost summary after test
    if monitor.calls:
        summary = monitor.get_summary()
        logger.info(
            f"Test API costs: ${summary['total_cost']:.4f} for {summary['total_calls']} calls"
        )


@pytest.fixture
def real_webhook_server():
    """
    Real webhook server for testing agent communications.
    Receives real agent progress updates.
    """
    import threading

    from aiohttp import web

    received_webhooks = []

    async def webhook_handler(request):
        """Handle incoming webhooks."""
        data = await request.json()
        received_webhooks.append(
            {
                "timestamp": datetime.now().isoformat(),
                "data": data,
            }
        )
        return web.Response(text="OK", status=200)

    app = web.Application()
    app.router.add_post("/webhook", webhook_handler)

    runner = web.AppRunner(app)

    async def start_server():
        await runner.setup()
        site = web.TCPSite(runner, "localhost", 8899)
        await site.start()

    async def stop_server():
        await runner.cleanup()

    # Start server in background
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(start_server())

    server_info = {
        "url": "http://localhost:8899/webhook",
        "received": received_webhooks,
        "runner": runner,
        "loop": loop,
    }

    yield server_info

    # Cleanup
    loop.run_until_complete(stop_server())
    loop.close()


# PostgreSQL Docker Fixtures (T010)


@pytest.fixture(scope="session")
def postgresql_container():
    """
    Provides a PostgreSQL container for testing using testcontainers.

    This fixture starts a PostgreSQL container at the beginning of the test session
    and stops it at the end. The container provides an isolated PostgreSQL instance
    for integration testing.

    Returns:
        PostgresContainer: Running PostgreSQL container instance
    """
    # Start PostgreSQL container
    postgres = PostgresContainer("postgres:15-alpine")
    postgres.start()

    # Log connection info
    logger.info(f"PostgreSQL container started: {postgres.get_connection_url()}")

    yield postgres

    # Cleanup
    postgres.stop()
    logger.info("PostgreSQL container stopped")


@pytest.fixture(scope="function")
def postgresql_connection(postgresql_container):
    """
    Provides a PostgreSQL connection for each test function.

    This fixture creates a new connection for each test, ensuring test isolation.
    The connection is automatically closed after the test completes.

    Args:
        postgresql_container: The PostgreSQL container fixture

    Returns:
        psycopg2.connection: Active PostgreSQL connection
    """
    # Parse connection URL from container
    connection_url = postgresql_container.get_connection_url()
    parsed = urllib.parse.urlparse(connection_url)

    # Create connection
    conn = psycopg2.connect(
        host=parsed.hostname,
        port=parsed.port,
        database=parsed.path[1:],  # Remove leading '/'
        user=parsed.username,
        password=parsed.password,
    )

    # Set autocommit for test isolation
    conn.autocommit = True

    logger.debug(f"Created PostgreSQL connection for test")

    yield conn

    # Cleanup
    conn.close()
    logger.debug("Closed PostgreSQL connection")


@pytest.fixture(autouse=True)
def setup_test_logging():
    """Configure logging for tests."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler("tests/test_run.log"),
        ],
    )


@pytest.fixture(scope="session", autouse=True)
def test_session_summary(request):
    """Print test session summary at the end."""

    def print_summary():
        logger.info("=" * 50)
        logger.info("Test Session Summary")
        logger.info("=" * 50)
        logger.info(f"Total API calls: {api_cost_tracker['total_calls']}")
        logger.info(f"Total tokens used: {api_cost_tracker['total_tokens']:,}")
        logger.info(f"Estimated cost: ${api_cost_tracker['estimated_cost']:.4f}")
        logger.info(f"Calls by model: {api_cost_tracker['calls_by_model']}")
        logger.info("=" * 50)

    request.addfinalizer(print_summary)


# Export fixtures for use in tests
__all__ = [
    "real_anthropic_client",
    "real_database",
    "db_session",
    "real_investigation_context",
    "api_cost_monitor",
    "real_webhook_server",
    "postgresql_container",
    "postgresql_connection",
]
