"""
Base class for smoke tests with common functionality.
"""

import asyncio
import time
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional

from app.service.logging import get_bridge_logger

from .models import SmokeTestResult, SmokeTestSeverity, SmokeTestStatus

logger = get_bridge_logger(__name__)


class BaseSmokeTest(ABC):
    """Base class for all smoke tests."""

    def __init__(self, service_name: str, enabled: bool = True):
        """Initialize smoke test."""
        self.service_name = service_name
        self.enabled = enabled
        self.timeout_seconds = 30
        self.max_response_time_ms = 10000  # 10 seconds

    @abstractmethod
    async def run_connectivity_test(self) -> SmokeTestResult:
        """Test basic connectivity to the service."""
        pass

    @abstractmethod
    async def run_authentication_test(self) -> SmokeTestResult:
        """Test authentication with the service."""
        pass

    @abstractmethod
    async def run_basic_functionality_test(self) -> SmokeTestResult:
        """Test basic functionality of the service."""
        pass

    async def run_all_tests(self) -> List[SmokeTestResult]:
        """Run all smoke tests for this service."""
        if not self.enabled:
            return [self._create_skipped_result("Service disabled in configuration")]

        results = []

        try:
            # Run tests in sequence with timeout
            logger.info(f"Starting smoke tests for {self.service_name}")

            # Connectivity test
            connectivity_result = await self._run_test_with_timeout(
                self.run_connectivity_test(), "connectivity_test"
            )
            results.append(connectivity_result)

            # Skip remaining tests if connectivity fails
            if connectivity_result.status == SmokeTestStatus.FAILED:
                logger.warning(
                    f"{self.service_name} connectivity failed, skipping remaining tests"
                )
                results.append(
                    self._create_skipped_result(
                        "Authentication test skipped - connectivity failed",
                        "authentication_test",
                    )
                )
                results.append(
                    self._create_skipped_result(
                        "Functionality test skipped - connectivity failed",
                        "functionality_test",
                    )
                )
                return results

            # Authentication test
            auth_result = await self._run_test_with_timeout(
                self.run_authentication_test(), "authentication_test"
            )
            results.append(auth_result)

            # Skip functionality test if auth fails
            if auth_result.status == SmokeTestStatus.FAILED:
                logger.warning(
                    f"{self.service_name} authentication failed, skipping functionality test"
                )
                results.append(
                    self._create_skipped_result(
                        "Functionality test skipped - authentication failed",
                        "functionality_test",
                    )
                )
                return results

            # Functionality test
            functionality_result = await self._run_test_with_timeout(
                self.run_basic_functionality_test(), "functionality_test"
            )
            results.append(functionality_result)

            logger.info(
                f"Completed smoke tests for {self.service_name}: {len(results)} tests"
            )

        except Exception as e:
            logger.error(
                f"Unexpected error running smoke tests for {self.service_name}: {e}"
            )
            results.append(
                self._create_error_result(
                    f"Unexpected error: {str(e)}", "unexpected_error"
                )
            )

        return results

    async def _run_test_with_timeout(
        self, test_coroutine, test_name: str
    ) -> SmokeTestResult:
        """Run a test with timeout protection."""
        try:
            return await asyncio.wait_for(test_coroutine, timeout=self.timeout_seconds)
        except asyncio.TimeoutError:
            return self._create_timeout_result(test_name)
        except Exception as e:
            return self._create_error_result(f"Test failed: {str(e)}", test_name)

    def _create_skipped_result(
        self,
        message: str,
        test_name: str = "service_test",
        severity: SmokeTestSeverity = SmokeTestSeverity.MEDIUM,
    ) -> SmokeTestResult:
        """Create a skipped test result."""
        return SmokeTestResult(
            service_name=self.service_name,
            test_name=test_name,
            status=SmokeTestStatus.SKIPPED,
            severity=severity,
            response_time_ms=0,
            message=message,
        )

    def _create_timeout_result(
        self, test_name: str, severity: SmokeTestSeverity = SmokeTestSeverity.HIGH
    ) -> SmokeTestResult:
        """Create a timeout test result."""
        return SmokeTestResult(
            service_name=self.service_name,
            test_name=test_name,
            status=SmokeTestStatus.FAILED,
            severity=severity,
            response_time_ms=self.timeout_seconds * 1000,
            message=f"Test timed out after {self.timeout_seconds} seconds",
            error="TIMEOUT",
        )

    def _create_error_result(
        self,
        error_message: str,
        test_name: str,
        severity: SmokeTestSeverity = SmokeTestSeverity.HIGH,
    ) -> SmokeTestResult:
        """Create an error test result."""
        return SmokeTestResult(
            service_name=self.service_name,
            test_name=test_name,
            status=SmokeTestStatus.FAILED,
            severity=severity,
            response_time_ms=0,
            message="Test failed with error",
            error=error_message,
        )

    def _measure_time(self, start_time: float) -> int:
        """Measure elapsed time in milliseconds."""
        return int((time.time() - start_time) * 1000)

    def _create_success_result(
        self,
        test_name: str,
        response_time_ms: int,
        message: str,
        severity: SmokeTestSeverity = SmokeTestSeverity.MEDIUM,
        details: Optional[Dict[str, Any]] = None,
    ) -> SmokeTestResult:
        """Create a successful test result."""
        # Check if response time is acceptable
        status = SmokeTestStatus.PASSED
        if response_time_ms > self.max_response_time_ms:
            status = SmokeTestStatus.WARNING
            message += f" (slow response: {response_time_ms}ms)"

        return SmokeTestResult(
            service_name=self.service_name,
            test_name=test_name,
            status=status,
            severity=severity,
            response_time_ms=response_time_ms,
            message=message,
            details=details,
        )

    def _create_failure_result(
        self,
        test_name: str,
        response_time_ms: int,
        message: str,
        error: str,
        severity: SmokeTestSeverity = SmokeTestSeverity.HIGH,
        details: Optional[Dict[str, Any]] = None,
    ) -> SmokeTestResult:
        """Create a failed test result."""
        return SmokeTestResult(
            service_name=self.service_name,
            test_name=test_name,
            status=SmokeTestStatus.FAILED,
            severity=severity,
            response_time_ms=response_time_ms,
            message=message,
            error=error,
            details=details,
        )
