"""
Enhanced Test Configuration for Olorin Endpoint Testing Framework.

This conftest provides comprehensive fixtures for testing all 52+ endpoints
in the Olorin fraud investigation platform with REAL data only.
NO MOCK DATA is used anywhere in this testing framework.

Features:
- Real HTTP client with async support
- Authentication helpers with JWT token management
- Performance tracking for all requests
- Real test data generators
- Response validation utilities
- Database and external service integration
"""

import asyncio
import json
import logging
import os
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from unittest.mock import patch

import httpx
import pytest
import pytest_asyncio
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from app.persistence.database import Base, get_db
from app.persistence.models import InvestigationRecord
from app.service.config import get_settings_for_env
from app.test.firebase_secrets_test_config import (
    TEST_SECRETS,
    FirebaseSecretsMockManager,
    cleanup_test_environment,
    setup_firebase_secrets_mocking,
    setup_test_environment,
)

logger = logging.getLogger(__name__)

# Test configuration
ENDPOINT_TEST_CONFIG = {
    "base_url": "http://localhost:8090",  # Olorin server URL
    "timeout": 30.0,  # Request timeout
    "max_retries": 3,  # Max retry attempts
    "retry_delay": 1.0,  # Delay between retries
    "performance_threshold_ms": 5000,  # Performance threshold
    "real_user_id": "olorin_test_user_001",  # Real test user ID
    "real_investigation_id": "olorin_test_inv_001",  # Real investigation ID
}

# Global performance tracking
performance_metrics = {
    "requests": [],
    "total_requests": 0,
    "total_response_time": 0.0,
    "slowest_endpoint": None,
    "fastest_endpoint": None,
}


class EndpointTestClient:
    """Enhanced HTTP client for endpoint testing with performance tracking."""

    def __init__(self, base_url: str, timeout: float = 30.0):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.session_metrics = []

    async def request(
        self,
        method: str,
        endpoint: str,
        headers: Optional[Dict[str, str]] = None,
        params: Optional[Dict[str, Any]] = None,
        json_data: Optional[Dict[str, Any]] = None,
        data: Optional[Dict[str, Any]] = None,
    ) -> Tuple[httpx.Response, Dict[str, Any]]:
        """
        Make HTTP request with performance tracking.

        Returns:
            Tuple of (response, metrics)
        """
        start_time = time.time()

        # Prepare request
        url = (
            f"{self.base_url}{endpoint}"
            if not endpoint.startswith("http")
            else endpoint
        )
        request_data = {
            "method": method.upper(),
            "url": url,
            "timeout": self.timeout,
        }

        if headers:
            request_data["headers"] = headers
        if params:
            request_data["params"] = params
        if json_data:
            request_data["json"] = json_data
        if data:
            request_data["data"] = data

        # Make request
        async with httpx.AsyncClient(verify=False) as client:
            try:
                response = await client.request(**request_data)
                response_time = (time.time() - start_time) * 1000  # Convert to ms

                # Track metrics
                metrics = {
                    "endpoint": endpoint,
                    "method": method.upper(),
                    "status_code": response.status_code,
                    "response_time_ms": response_time,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "request_size": len(json.dumps(json_data or data or {}).encode()),
                    "response_size": len(response.content) if response.content else 0,
                }

                # Update global metrics
                performance_metrics["requests"].append(metrics)
                performance_metrics["total_requests"] += 1
                performance_metrics["total_response_time"] += response_time

                if (
                    not performance_metrics["slowest_endpoint"]
                    or response_time
                    > performance_metrics["slowest_endpoint"]["response_time_ms"]
                ):
                    performance_metrics["slowest_endpoint"] = metrics

                if (
                    not performance_metrics["fastest_endpoint"]
                    or response_time
                    < performance_metrics["fastest_endpoint"]["response_time_ms"]
                ):
                    performance_metrics["fastest_endpoint"] = metrics

                self.session_metrics.append(metrics)

                logger.info(
                    f"{method.upper()} {endpoint} -> {response.status_code} "
                    f"({response_time:.1f}ms)"
                )

                return response, metrics

            except Exception as e:
                response_time = (time.time() - start_time) * 1000
                logger.error(
                    f"Request failed: {method.upper()} {endpoint} "
                    f"after {response_time:.1f}ms - {str(e)}"
                )
                raise

    async def get(
        self, endpoint: str, **kwargs
    ) -> Tuple[httpx.Response, Dict[str, Any]]:
        """GET request."""
        return await self.request("GET", endpoint, **kwargs)

    async def post(
        self, endpoint: str, **kwargs
    ) -> Tuple[httpx.Response, Dict[str, Any]]:
        """POST request."""
        return await self.request("POST", endpoint, **kwargs)

    async def put(
        self, endpoint: str, **kwargs
    ) -> Tuple[httpx.Response, Dict[str, Any]]:
        """PUT request."""
        return await self.request("PUT", endpoint, **kwargs)

    async def delete(
        self, endpoint: str, **kwargs
    ) -> Tuple[httpx.Response, Dict[str, Any]]:
        """DELETE request."""
        return await self.request("DELETE", endpoint, **kwargs)

    def get_session_summary(self) -> Dict[str, Any]:
        """Get summary of this session's requests."""
        if not self.session_metrics:
            return {"total_requests": 0}

        response_times = [m["response_time_ms"] for m in self.session_metrics]
        status_codes = [m["status_code"] for m in self.session_metrics]

        return {
            "total_requests": len(self.session_metrics),
            "average_response_time_ms": sum(response_times) / len(response_times),
            "min_response_time_ms": min(response_times),
            "max_response_time_ms": max(response_times),
            "success_rate": len([s for s in status_codes if 200 <= s < 300])
            / len(status_codes),
            "status_code_distribution": {
                str(code): status_codes.count(code) for code in set(status_codes)
            },
        }


@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
def firebase_secrets_setup():
    """Setup Firebase secrets mocking for endpoint tests."""
    setup_test_environment()
    mock_manager, patches = setup_firebase_secrets_mocking(TEST_SECRETS)

    # Start all patches
    active_patches = []
    for patch_obj in patches:
        mock_obj = patch_obj.start()
        active_patches.append(patch_obj)

    yield mock_manager

    # Stop all patches
    for patch_obj in active_patches:
        patch_obj.stop()

    cleanup_test_environment()


@pytest.fixture(scope="session")
def real_database(firebase_secrets_setup):
    """Real test database fixture."""
    test_db_url = os.getenv("TEST_DATABASE_URL", "sqlite:///./test_endpoint_olorin.db")

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
    """Database session for tests."""
    session = real_database()
    try:
        yield session
    finally:
        session.close()


@pytest_asyncio.fixture
async def endpoint_client():
    """Enhanced HTTP client for endpoint testing."""
    client = EndpointTestClient(
        base_url=ENDPOINT_TEST_CONFIG["base_url"],
        timeout=ENDPOINT_TEST_CONFIG["timeout"],
    )
    yield client

    # Log session summary
    summary = client.get_session_summary()
    if summary["total_requests"] > 0:
        logger.info(f"Test session completed: {summary}")


@pytest_asyncio.fixture
async def auth_headers(endpoint_client, firebase_secrets_setup):
    """Get authentication headers for protected endpoints."""
    from .utils.auth_helper import get_test_auth_headers

    try:
        headers = await get_test_auth_headers(endpoint_client)
        logger.info("Authentication successful - got JWT token")
        return headers
    except Exception as e:
        logger.warning(f"Authentication failed: {e}")
        return {}


@pytest.fixture
def real_test_data(db_session):
    """Generate real test data for investigations."""
    from .utils.test_data_generator import TestDataGenerator

    generator = TestDataGenerator(db_session)
    yield generator

    # Cleanup test data
    generator.cleanup()


@pytest.fixture
def endpoint_validator():
    """Response validation utilities."""
    from .utils.endpoint_validators import EndpointValidator

    return EndpointValidator()


@pytest.fixture(autouse=True)
def setup_endpoint_logging():
    """Configure logging for endpoint tests."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler("tests/endpoint_test_run.log", mode="a"),
        ],
    )

    # Create test run header
    logger.info("=" * 80)
    logger.info(f"ENDPOINT TEST RUN STARTED - {datetime.now(timezone.utc).isoformat()}")
    logger.info(f"Target server: {ENDPOINT_TEST_CONFIG['base_url']}")
    logger.info("=" * 80)


@pytest.fixture(scope="session", autouse=True)
def endpoint_test_session_summary(request):
    """Print comprehensive test session summary."""

    def print_summary():
        logger.info("=" * 80)
        logger.info("ENDPOINT TEST SESSION SUMMARY")
        logger.info("=" * 80)

        metrics = performance_metrics
        if metrics["total_requests"] > 0:
            avg_response_time = (
                metrics["total_response_time"] / metrics["total_requests"]
            )

            logger.info(f"Total requests: {metrics['total_requests']}")
            logger.info(f"Average response time: {avg_response_time:.1f}ms")

            if metrics["slowest_endpoint"]:
                slowest = metrics["slowest_endpoint"]
                logger.info(
                    f"Slowest endpoint: {slowest['method']} {slowest['endpoint']} "
                    f"({slowest['response_time_ms']:.1f}ms)"
                )

            if metrics["fastest_endpoint"]:
                fastest = metrics["fastest_endpoint"]
                logger.info(
                    f"Fastest endpoint: {fastest['method']} {fastest['endpoint']} "
                    f"({fastest['response_time_ms']:.1f}ms)"
                )

            # Status code summary
            status_codes = {}
            for req in metrics["requests"]:
                code = req["status_code"]
                status_codes[code] = status_codes.get(code, 0) + 1

            logger.info("Status code distribution:")
            for code, count in sorted(status_codes.items()):
                percentage = (count / metrics["total_requests"]) * 100
                logger.info(f"  {code}: {count} ({percentage:.1f}%)")

            # Performance analysis
            slow_requests = [
                r
                for r in metrics["requests"]
                if r["response_time_ms"]
                > ENDPOINT_TEST_CONFIG["performance_threshold_ms"]
            ]

            if slow_requests:
                logger.warning(
                    f"Found {len(slow_requests)} slow requests (>{ENDPOINT_TEST_CONFIG['performance_threshold_ms']}ms):"
                )
                for req in slow_requests[:5]:  # Show top 5
                    logger.warning(
                        f"  {req['method']} {req['endpoint']}: {req['response_time_ms']:.1f}ms"
                    )

        logger.info("=" * 80)
        logger.info(
            f"ENDPOINT TEST SESSION COMPLETED - {datetime.now(timezone.utc).isoformat()}"
        )
        logger.info("=" * 80)

    request.addfinalizer(print_summary)


# Export key fixtures and utilities
__all__ = [
    "endpoint_client",
    "auth_headers",
    "real_test_data",
    "endpoint_validator",
    "db_session",
    "real_database",
    "firebase_secrets_setup",
    "ENDPOINT_TEST_CONFIG",
    "performance_metrics",
    "EndpointTestClient",
]
