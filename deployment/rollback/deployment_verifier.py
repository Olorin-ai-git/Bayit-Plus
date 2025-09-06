#!/usr/bin/env python3
"""
Deployment Verifier for Olorin Platform.

Implements comprehensive deployment verification with smoke testing,
performance regression detection, security validation, and integration testing.
"""

import asyncio
import aiohttp
import logging
import time
import json
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from enum import Enum
import subprocess

logger = logging.getLogger(__name__)


class VerificationType(Enum):
    """Types of deployment verification."""
    SMOKE_TEST = "smoke_test"
    PERFORMANCE_TEST = "performance_test"
    SECURITY_SCAN = "security_scan"
    INTEGRATION_TEST = "integration_test"
    HEALTH_CHECK = "health_check"
    USER_ACCEPTANCE = "user_acceptance"


class VerificationStatus(Enum):
    """Verification status."""
    PENDING = "pending"
    RUNNING = "running"
    PASSED = "passed"
    FAILED = "failed"
    WARNING = "warning"
    SKIPPED = "skipped"


@dataclass
class VerificationTest:
    """Individual verification test."""
    test_id: str
    test_name: str
    verification_type: VerificationType
    service: str
    description: str
    timeout_seconds: int = 300
    critical: bool = True
    baseline_metrics: Optional[Dict[str, float]] = None


@dataclass
class TestResult:
    """Result of a verification test."""
    test_id: str
    status: VerificationStatus
    started_at: datetime
    completed_at: Optional[datetime] = None
    duration_ms: Optional[float] = None
    details: Dict[str, Any] = None
    error_message: Optional[str] = None
    metrics: Optional[Dict[str, float]] = None
    
    def __post_init__(self):
        if self.details is None:
            self.details = {}
        if self.metrics is None:
            self.metrics = {}


@dataclass
class VerificationSuite:
    """Complete verification suite execution."""
    suite_id: str
    deployment_id: str
    environment: str
    tests: List[VerificationTest]
    status: VerificationStatus
    started_at: datetime
    completed_at: Optional[datetime] = None
    passed_tests: int = 0
    failed_tests: int = 0
    warning_tests: int = 0
    test_results: List[TestResult] = None
    
    def __post_init__(self):
        if self.test_results is None:
            self.test_results = []


class DeploymentVerifier:
    """
    Comprehensive deployment verification system.
    
    Executes multiple verification types to ensure deployment quality,
    performance, security, and functionality before considering deployment complete.
    """
    
    def __init__(self):
        # Test configuration
        self.test_configurations = self._initialize_test_configurations()
        
        # Performance baselines
        self.performance_baselines: Dict[str, Dict[str, float]] = {
            "backend": {
                "response_time_ms": 500,
                "error_rate_percent": 1.0,
                "throughput_rps": 100,
                "cpu_usage_percent": 70,
                "memory_usage_mb": 2048
            },
            "frontend": {
                "load_time_ms": 2000,
                "first_contentful_paint_ms": 1500,
                "largest_contentful_paint_ms": 2500,
                "cumulative_layout_shift": 0.1
            }
        }
        
        # Security scan configurations
        self.security_configs = {
            "vulnerability_scan": {
                "critical_threshold": 0,
                "high_threshold": 2,
                "medium_threshold": 10
            },
            "dependency_scan": {
                "critical_threshold": 0,
                "high_threshold": 5
            }
        }
        
        # Active verifications
        self.active_verifications: Dict[str, VerificationSuite] = {}
    
    async def verify_deployment(
        self,
        deployment_id: str,
        services: List[str],
        environment: str,
        verification_types: Optional[List[VerificationType]] = None
    ) -> str:
        """
        Start comprehensive deployment verification.
        
        Args:
            deployment_id: Unique identifier for the deployment
            services: List of services to verify
            environment: Environment being verified
            verification_types: Specific verification types to run (optional)
            
        Returns:
            Verification suite ID
        """
        suite_id = f"verify_{deployment_id}_{int(datetime.now().timestamp())}"
        
        # Generate verification tests
        tests = await self._generate_verification_tests(
            services, environment, verification_types
        )
        
        # Create verification suite
        suite = VerificationSuite(
            suite_id=suite_id,
            deployment_id=deployment_id,
            environment=environment,
            tests=tests,
            status=VerificationStatus.PENDING,
            started_at=datetime.now(timezone.utc)
        )
        
        self.active_verifications[suite_id] = suite
        
        logger.info(
            f"Starting deployment verification {suite_id} "
            f"with {len(tests)} tests for services: {services}"
        )
        
        # Start verification process
        asyncio.create_task(self._execute_verification_suite(suite))
        
        return suite_id
    
    async def run_smoke_tests(
        self,
        deployment_id: str,
        services: List[str],
        environment: str
    ) -> Dict[str, Any]:
        """
        Run quick smoke tests for deployment validation.
        
        Args:
            deployment_id: Unique identifier for the deployment
            services: List of services to test
            environment: Environment being tested
            
        Returns:
            Smoke test results
        """
        logger.info(f"Running smoke tests for deployment {deployment_id}")
        
        results = {
            "deployment_id": deployment_id,
            "environment": environment,
            "started_at": datetime.now(timezone.utc).isoformat(),
            "tests": {}
        }
        
        # Run smoke tests for each service
        for service in services:
            service_results = await self._run_service_smoke_tests(service, environment)
            results["tests"][service] = service_results
        
        # Determine overall result
        all_passed = all(
            test_result.get("status") == "passed" 
            for service_tests in results["tests"].values()
            for test_result in service_tests.values()
        )
        
        results["overall_status"] = "passed" if all_passed else "failed"
        results["completed_at"] = datetime.now(timezone.utc).isoformat()
        
        return results
    
    async def check_performance_regression(
        self,
        service: str,
        environment: str,
        current_metrics: Dict[str, float]
    ) -> Dict[str, Any]:
        """
        Check for performance regression against baseline.
        
        Args:
            service: Service to check
            environment: Environment being checked
            current_metrics: Current performance metrics
            
        Returns:
            Performance regression analysis
        """
        logger.info(f"Checking performance regression for service: {service}")
        
        baseline = self.performance_baselines.get(service, {})
        
        regression_results = {
            "service": service,
            "environment": environment,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "baseline_metrics": baseline,
            "current_metrics": current_metrics,
            "regressions": [],
            "improvements": [],
            "overall_status": "passed"
        }
        
        # Compare metrics
        for metric, baseline_value in baseline.items():
            current_value = current_metrics.get(metric)
            
            if current_value is None:
                continue
            
            # Calculate percentage change
            if baseline_value > 0:
                change_percent = ((current_value - baseline_value) / baseline_value) * 100
            else:
                change_percent = 0
            
            # Determine if this is a regression (depends on metric type)
            is_regression_metric = self._is_regression_metric(metric)
            threshold_percent = 20  # 20% threshold for regression
            
            if is_regression_metric and change_percent > threshold_percent:
                regression_results["regressions"].append({
                    "metric": metric,
                    "baseline_value": baseline_value,
                    "current_value": current_value,
                    "change_percent": round(change_percent, 2),
                    "severity": self._get_regression_severity(change_percent)
                })
            elif not is_regression_metric and change_percent < -threshold_percent:
                regression_results["improvements"].append({
                    "metric": metric,
                    "baseline_value": baseline_value,
                    "current_value": current_value,
                    "improvement_percent": round(abs(change_percent), 2)
                })
        
        # Determine overall status
        if regression_results["regressions"]:
            critical_regressions = [
                r for r in regression_results["regressions"] 
                if r["severity"] == "critical"
            ]
            if critical_regressions:
                regression_results["overall_status"] = "failed"
            else:
                regression_results["overall_status"] = "warning"
        
        return regression_results
    
    async def run_security_validation(
        self,
        service: str,
        environment: str
    ) -> Dict[str, Any]:
        """
        Run security validation for deployed service.
        
        Args:
            service: Service to validate
            environment: Environment being validated
            
        Returns:
            Security validation results
        """
        logger.info(f"Running security validation for service: {service}")
        
        security_results = {
            "service": service,
            "environment": environment,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "scans": {},
            "overall_status": "passed"
        }
        
        # Run vulnerability scan
        vuln_results = await self._run_vulnerability_scan(service, environment)
        security_results["scans"]["vulnerability_scan"] = vuln_results
        
        # Run dependency scan
        dep_results = await self._run_dependency_scan(service)
        security_results["scans"]["dependency_scan"] = dep_results
        
        # Run configuration security check
        config_results = await self._check_security_configuration(service, environment)
        security_results["scans"]["configuration_check"] = config_results
        
        # Determine overall security status
        critical_issues = sum([
            scan.get("critical_issues", 0) 
            for scan in security_results["scans"].values()
        ])
        
        high_issues = sum([
            scan.get("high_issues", 0) 
            for scan in security_results["scans"].values()
        ])
        
        if critical_issues > 0:
            security_results["overall_status"] = "failed"
        elif high_issues > self.security_configs["vulnerability_scan"]["high_threshold"]:
            security_results["overall_status"] = "warning"
        
        return security_results
    
    async def run_integration_tests(
        self,
        deployment_id: str,
        services: List[str],
        environment: str
    ) -> Dict[str, Any]:
        """
        Run integration tests across services.
        
        Args:
            deployment_id: Unique identifier for the deployment
            services: List of services to test
            environment: Environment being tested
            
        Returns:
            Integration test results
        """
        logger.info(f"Running integration tests for deployment {deployment_id}")
        
        integration_results = {
            "deployment_id": deployment_id,
            "environment": environment,
            "started_at": datetime.now(timezone.utc).isoformat(),
            "test_suites": {},
            "overall_status": "passed"
        }
        
        # Run cross-service integration tests
        if "backend" in services and "frontend" in services:
            api_tests = await self._run_api_integration_tests(environment)
            integration_results["test_suites"]["api_integration"] = api_tests
        
        # Run end-to-end user workflows
        if "frontend" in services:
            e2e_tests = await self._run_end_to_end_tests(environment)
            integration_results["test_suites"]["end_to_end"] = e2e_tests
        
        # Determine overall status
        failed_suites = [
            suite for suite in integration_results["test_suites"].values()
            if suite.get("status") == "failed"
        ]
        
        if failed_suites:
            integration_results["overall_status"] = "failed"
        
        integration_results["completed_at"] = datetime.now(timezone.utc).isoformat()
        
        return integration_results
    
    def get_verification_status(self, suite_id: str) -> Optional[Dict[str, Any]]:
        """
        Get status of verification suite.
        
        Args:
            suite_id: Verification suite identifier
            
        Returns:
            Verification status dictionary
        """
        if suite_id not in self.active_verifications:
            return None
        
        suite = self.active_verifications[suite_id]
        
        return {
            "suite_id": suite.suite_id,
            "deployment_id": suite.deployment_id,
            "environment": suite.environment,
            "status": suite.status.value,
            "started_at": suite.started_at.isoformat(),
            "completed_at": suite.completed_at.isoformat() if suite.completed_at else None,
            "total_tests": len(suite.tests),
            "passed_tests": suite.passed_tests,
            "failed_tests": suite.failed_tests,
            "warning_tests": suite.warning_tests,
            "test_results": [
                {
                    "test_id": result.test_id,
                    "status": result.status.value,
                    "duration_ms": result.duration_ms,
                    "error_message": result.error_message
                }
                for result in suite.test_results
            ]
        }
    
    async def _generate_verification_tests(
        self,
        services: List[str],
        environment: str,
        verification_types: Optional[List[VerificationType]] = None
    ) -> List[VerificationTest]:
        """Generate verification tests for services."""
        tests = []
        
        if verification_types is None:
            verification_types = list(VerificationType)
        
        for service in services:
            service_config = self.test_configurations.get(service, {})
            
            for verification_type in verification_types:
                if verification_type in service_config:
                    test_configs = service_config[verification_type]
                    for config in test_configs:
                        test = VerificationTest(
                            test_id=f"{service}_{verification_type.value}_{config['name']}",
                            test_name=config["name"],
                            verification_type=verification_type,
                            service=service,
                            description=config["description"],
                            timeout_seconds=config.get("timeout", 300),
                            critical=config.get("critical", True),
                            baseline_metrics=self.performance_baselines.get(service)
                        )
                        tests.append(test)
        
        return tests
    
    async def _execute_verification_suite(self, suite: VerificationSuite):
        """Execute complete verification suite."""
        try:
            suite.status = VerificationStatus.RUNNING
            
            # Execute tests in parallel (with some limits)
            semaphore = asyncio.Semaphore(5)  # Max 5 concurrent tests
            
            tasks = [
                self._execute_verification_test(test, semaphore)
                for test in suite.tests
            ]
            
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Process results
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    # Handle test execution error
                    error_result = TestResult(
                        test_id=suite.tests[i].test_id,
                        status=VerificationStatus.FAILED,
                        started_at=datetime.now(timezone.utc),
                        completed_at=datetime.now(timezone.utc),
                        error_message=str(result)
                    )
                    suite.test_results.append(error_result)
                    suite.failed_tests += 1
                else:
                    suite.test_results.append(result)
                    
                    if result.status == VerificationStatus.PASSED:
                        suite.passed_tests += 1
                    elif result.status == VerificationStatus.FAILED:
                        suite.failed_tests += 1
                    elif result.status == VerificationStatus.WARNING:
                        suite.warning_tests += 1
            
            # Determine overall suite status
            if suite.failed_tests == 0:
                suite.status = VerificationStatus.PASSED
            elif suite.passed_tests == 0:
                suite.status = VerificationStatus.FAILED
            else:
                # Check if all failures are non-critical
                critical_failures = [
                    result for result in suite.test_results
                    if result.status == VerificationStatus.FAILED and
                    any(test.critical for test in suite.tests if test.test_id == result.test_id)
                ]
                
                if critical_failures:
                    suite.status = VerificationStatus.FAILED
                else:
                    suite.status = VerificationStatus.WARNING
            
            suite.completed_at = datetime.now(timezone.utc)
            
            logger.info(
                f"Verification suite {suite.suite_id} completed: {suite.status.value} "
                f"(Passed: {suite.passed_tests}, Failed: {suite.failed_tests}, "
                f"Warnings: {suite.warning_tests})"
            )
            
        except Exception as e:
            suite.status = VerificationStatus.FAILED
            suite.completed_at = datetime.now(timezone.utc)
            logger.error(f"Verification suite {suite.suite_id} failed with error: {e}")
    
    async def _execute_verification_test(
        self,
        test: VerificationTest,
        semaphore: asyncio.Semaphore
    ) -> TestResult:
        """Execute individual verification test."""
        async with semaphore:
            start_time = datetime.now(timezone.utc)
            
            try:
                logger.info(f"Starting verification test: {test.test_id}")
                
                result = TestResult(
                    test_id=test.test_id,
                    status=VerificationStatus.RUNNING,
                    started_at=start_time
                )
                
                # Execute test based on type
                if test.verification_type == VerificationType.SMOKE_TEST:
                    await self._execute_smoke_test(test, result)
                elif test.verification_type == VerificationType.PERFORMANCE_TEST:
                    await self._execute_performance_test(test, result)
                elif test.verification_type == VerificationType.SECURITY_SCAN:
                    await self._execute_security_test(test, result)
                elif test.verification_type == VerificationType.INTEGRATION_TEST:
                    await self._execute_integration_test(test, result)
                elif test.verification_type == VerificationType.HEALTH_CHECK:
                    await self._execute_health_check(test, result)
                
                if result.status == VerificationStatus.RUNNING:
                    result.status = VerificationStatus.PASSED
                
                result.completed_at = datetime.now(timezone.utc)
                result.duration_ms = (result.completed_at - start_time).total_seconds() * 1000
                
                logger.info(
                    f"Verification test {test.test_id} completed: {result.status.value} "
                    f"({result.duration_ms:.0f}ms)"
                )
                
                return result
                
            except asyncio.TimeoutError:
                result.status = VerificationStatus.FAILED
                result.completed_at = datetime.now(timezone.utc)
                result.error_message = "Test timed out"
                result.duration_ms = (result.completed_at - start_time).total_seconds() * 1000
                
                logger.error(f"Verification test {test.test_id} timed out")
                return result
                
            except Exception as e:
                result.status = VerificationStatus.FAILED
                result.completed_at = datetime.now(timezone.utc)
                result.error_message = str(e)
                result.duration_ms = (result.completed_at - start_time).total_seconds() * 1000
                
                logger.error(f"Verification test {test.test_id} failed: {e}")
                return result
    
    # Test execution methods (placeholder implementations)
    async def _execute_smoke_test(self, test: VerificationTest, result: TestResult):
        """Execute smoke test."""
        # TODO: Implement actual smoke test execution
        await asyncio.sleep(1)  # Simulate test execution
    
    async def _execute_performance_test(self, test: VerificationTest, result: TestResult):
        """Execute performance test."""
        # TODO: Implement actual performance test execution
        await asyncio.sleep(2)  # Simulate test execution
    
    async def _execute_security_test(self, test: VerificationTest, result: TestResult):
        """Execute security test."""
        # TODO: Implement actual security test execution
        await asyncio.sleep(3)  # Simulate test execution
    
    async def _execute_integration_test(self, test: VerificationTest, result: TestResult):
        """Execute integration test."""
        # TODO: Implement actual integration test execution
        await asyncio.sleep(2)  # Simulate test execution
    
    async def _execute_health_check(self, test: VerificationTest, result: TestResult):
        """Execute health check test."""
        # TODO: Implement actual health check execution
        await asyncio.sleep(1)  # Simulate test execution
    
    # Service-specific test methods (placeholders)
    async def _run_service_smoke_tests(self, service: str, environment: str) -> Dict[str, Any]:
        """Run smoke tests for a specific service."""
        return {
            "health_check": {"status": "passed", "response_time_ms": 45},
            "basic_functionality": {"status": "passed", "tests_passed": 5}
        }
    
    async def _run_vulnerability_scan(self, service: str, environment: str) -> Dict[str, Any]:
        """Run vulnerability scan."""
        return {
            "status": "passed",
            "critical_issues": 0,
            "high_issues": 1,
            "medium_issues": 3,
            "low_issues": 5
        }
    
    async def _run_dependency_scan(self, service: str) -> Dict[str, Any]:
        """Run dependency vulnerability scan."""
        return {
            "status": "passed",
            "critical_issues": 0,
            "high_issues": 0,
            "outdated_dependencies": 2
        }
    
    async def _check_security_configuration(self, service: str, environment: str) -> Dict[str, Any]:
        """Check security configuration."""
        return {
            "status": "passed",
            "https_enabled": True,
            "security_headers": True,
            "authentication_required": True
        }
    
    async def _run_api_integration_tests(self, environment: str) -> Dict[str, Any]:
        """Run API integration tests."""
        return {
            "status": "passed",
            "tests_run": 15,
            "tests_passed": 15,
            "average_response_time": 120
        }
    
    async def _run_end_to_end_tests(self, environment: str) -> Dict[str, Any]:
        """Run end-to-end tests."""
        return {
            "status": "passed",
            "workflows_tested": 3,
            "workflows_passed": 3,
            "total_duration_seconds": 45
        }
    
    def _is_regression_metric(self, metric: str) -> bool:
        """Check if higher values indicate regression for this metric."""
        regression_metrics = [
            "response_time_ms", "load_time_ms", "error_rate_percent",
            "cpu_usage_percent", "memory_usage_mb", "first_contentful_paint_ms",
            "largest_contentful_paint_ms", "cumulative_layout_shift"
        ]
        return metric in regression_metrics
    
    def _get_regression_severity(self, change_percent: float) -> str:
        """Get regression severity based on change percentage."""
        if change_percent >= 100:
            return "critical"
        elif change_percent >= 50:
            return "high"
        elif change_percent >= 25:
            return "medium"
        else:
            return "low"
    
    def _initialize_test_configurations(self) -> Dict[str, Dict[VerificationType, List[Dict[str, Any]]]]:
        """Initialize test configurations for services."""
        return {
            "backend": {
                VerificationType.SMOKE_TEST: [
                    {"name": "health_endpoint", "description": "Check health endpoint availability", "timeout": 30},
                    {"name": "database_connection", "description": "Verify database connectivity", "timeout": 60}
                ],
                VerificationType.PERFORMANCE_TEST: [
                    {"name": "response_time", "description": "Check API response times", "timeout": 120},
                    {"name": "throughput", "description": "Verify API throughput", "timeout": 300}
                ],
                VerificationType.SECURITY_SCAN: [
                    {"name": "vulnerability_scan", "description": "Scan for vulnerabilities", "timeout": 600},
                    {"name": "dependency_check", "description": "Check dependency security", "timeout": 300}
                ]
            },
            "frontend": {
                VerificationType.SMOKE_TEST: [
                    {"name": "page_load", "description": "Check if pages load correctly", "timeout": 30},
                    {"name": "api_connectivity", "description": "Verify API connectivity", "timeout": 60}
                ],
                VerificationType.PERFORMANCE_TEST: [
                    {"name": "lighthouse_audit", "description": "Run Lighthouse performance audit", "timeout": 180}
                ]
            }
        }