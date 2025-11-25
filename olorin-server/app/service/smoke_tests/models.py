"""
Models and data structures for smoke test results.
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional


class SmokeTestStatus(Enum):
    """Smoke test result status."""

    PASSED = "passed"
    FAILED = "failed"
    SKIPPED = "skipped"
    WARNING = "warning"


class SmokeTestSeverity(Enum):
    """Severity levels for smoke test failures."""

    CRITICAL = "critical"  # Investigation should be blocked
    HIGH = "high"  # Investigation can proceed with warnings
    MEDIUM = "medium"  # Non-essential service
    LOW = "low"  # Nice to have service


@dataclass
class SmokeTestResult:
    """Result of a single smoke test."""

    service_name: str
    test_name: str
    status: SmokeTestStatus
    severity: SmokeTestSeverity
    response_time_ms: int
    message: str
    details: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    timestamp: datetime = field(default_factory=datetime.utcnow)

    @property
    def is_critical_failure(self) -> bool:
        """Check if this is a critical failure that should block investigations."""
        return self.status == SmokeTestStatus.FAILED and self.severity in [
            SmokeTestSeverity.CRITICAL,
            SmokeTestSeverity.HIGH,
        ]


@dataclass
class ServiceSmokeTestSuite:
    """Collection of smoke tests for a single service."""

    service_name: str
    enabled: bool
    tests: List[SmokeTestResult] = field(default_factory=list)
    total_response_time_ms: int = 0

    @property
    def passed_tests(self) -> List[SmokeTestResult]:
        """Get all passed tests."""
        return [t for t in self.tests if t.status == SmokeTestStatus.PASSED]

    @property
    def failed_tests(self) -> List[SmokeTestResult]:
        """Get all failed tests."""
        return [t for t in self.tests if t.status == SmokeTestStatus.FAILED]

    @property
    def skipped_tests(self) -> List[SmokeTestResult]:
        """Get all skipped tests."""
        return [t for t in self.tests if t.status == SmokeTestStatus.SKIPPED]

    @property
    def has_critical_failures(self) -> bool:
        """Check if any tests have critical failures."""
        return any(test.is_critical_failure for test in self.tests)

    @property
    def overall_status(self) -> SmokeTestStatus:
        """Get overall status for this service."""
        if not self.enabled:
            return SmokeTestStatus.SKIPPED
        if not self.tests:
            return SmokeTestStatus.SKIPPED
        if any(t.status == SmokeTestStatus.FAILED for t in self.tests):
            return SmokeTestStatus.FAILED
        if any(t.status == SmokeTestStatus.WARNING for t in self.tests):
            return SmokeTestStatus.WARNING
        if any(t.status == SmokeTestStatus.PASSED for t in self.tests):
            return SmokeTestStatus.PASSED
        return SmokeTestStatus.SKIPPED


@dataclass
class SmokeTestReport:
    """Comprehensive smoke test report for all services."""

    timestamp: datetime
    total_tests: int
    passed: int
    failed: int
    skipped: int
    warnings: int
    total_response_time_ms: int
    services: List[ServiceSmokeTestSuite] = field(default_factory=list)

    @property
    def has_critical_failures(self) -> bool:
        """Check if any service has critical failures."""
        return any(service.has_critical_failures for service in self.services)

    @property
    def critical_services_down(self) -> List[str]:
        """Get list of critical services that are down."""
        return [
            service.service_name
            for service in self.services
            if service.has_critical_failures
        ]

    @property
    def should_block_investigations(self) -> bool:
        """Determine if investigations should be blocked due to critical failures."""
        return self.has_critical_failures

    def to_dict(self) -> Dict[str, Any]:
        """Convert report to dictionary for JSON serialization."""
        return {
            "timestamp": self.timestamp.isoformat(),
            "summary": {
                "total_tests": self.total_tests,
                "passed": self.passed,
                "failed": self.failed,
                "skipped": self.skipped,
                "warnings": self.warnings,
                "total_response_time_ms": self.total_response_time_ms,
                "has_critical_failures": self.has_critical_failures,
                "should_block_investigations": self.should_block_investigations,
            },
            "services": [
                {
                    "service_name": service.service_name,
                    "enabled": service.enabled,
                    "overall_status": service.overall_status.value,
                    "has_critical_failures": service.has_critical_failures,
                    "total_response_time_ms": service.total_response_time_ms,
                    "tests": [
                        {
                            "test_name": test.test_name,
                            "status": test.status.value,
                            "severity": test.severity.value,
                            "response_time_ms": test.response_time_ms,
                            "message": test.message,
                            "error": test.error,
                            "timestamp": test.timestamp.isoformat(),
                            "details": test.details,
                        }
                        for test in service.tests
                    ],
                }
                for service in self.services
            ],
        }
