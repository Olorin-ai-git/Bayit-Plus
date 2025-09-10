"""
Main smoke test runner that orchestrates all external API smoke tests.
"""

import asyncio
import os
import time
from datetime import datetime
from typing import List, Optional

from app.service.config_loader import get_config_loader
from app.service.logging import get_bridge_logger
from .models import (
    SmokeTestReport, 
    ServiceSmokeTestSuite, 
    SmokeTestStatus,
    SmokeTestSeverity
)
from .snowflake_smoke_test import SnowflakeSmokeTest
from .abuseipdb_smoke_test import AbuseIPDBSmokeTest
from .virustotal_smoke_test import VirusTotalSmokeTest
from .shodan_smoke_test import ShodanSmokeTest
from .splunk_smoke_test import SplunkSmokeTest

logger = get_bridge_logger(__name__)


class SmokeTestRunner:
    """Orchestrates smoke tests for all external API services."""
    
    def __init__(self):
        """Initialize smoke test runner."""
        self.config_loader = get_config_loader()
        self.report: Optional[SmokeTestReport] = None
        
        # Initialize service configurations
        self.service_configs = self._load_service_configurations()
        
    def _load_service_configurations(self) -> dict:
        """Load service configurations from environment variables."""
        return {
            "snowflake": {
                "enabled": os.getenv("USE_SNOWFLAKE", "false").lower() == "true",
                "severity": SmokeTestSeverity.CRITICAL,
                "description": "Snowflake data warehouse for fraud analytics"
            },
            "abuseipdb": {
                "enabled": (
                    os.getenv("USE_ABUSEIPDB_IP_REPUTATION", "false").lower() == "true" or
                    os.getenv("USE_ABUSEIPDB_BULK_ANALYSIS", "false").lower() == "true"
                ),
                "severity": SmokeTestSeverity.HIGH,
                "description": "AbuseIPDB IP reputation and threat intelligence"
            },
            "virustotal": {
                "enabled": (
                    os.getenv("USE_VIRUSTOTAL_IP_ANALYSIS", "false").lower() == "true" or
                    os.getenv("USE_VIRUSTOTAL_DOMAIN_ANALYSIS", "false").lower() == "true" or
                    os.getenv("USE_VIRUSTOTAL_FILE_ANALYSIS", "false").lower() == "true"
                ),
                "severity": SmokeTestSeverity.HIGH,
                "description": "VirusTotal malware and threat analysis"
            },
            "shodan": {
                "enabled": (
                    os.getenv("USE_SHODAN_INFRASTRUCTURE", "false").lower() == "true" or
                    os.getenv("USE_SHODAN_SEARCH", "false").lower() == "true"
                ),
                "severity": SmokeTestSeverity.HIGH,
                "description": "Shodan infrastructure and IoT device intelligence"
            },
            "splunk": {
                "enabled": os.getenv("USE_SPLUNK", "false").lower() == "true",
                "severity": SmokeTestSeverity.CRITICAL,
                "description": "Splunk log analysis and SIEM integration"
            }
        }
    
    def _create_smoke_test_instance(self, service_name: str, enabled: bool):
        """Create smoke test instance for a service."""
        test_classes = {
            "snowflake": SnowflakeSmokeTest,
            "abuseipdb": AbuseIPDBSmokeTest,
            "virustotal": VirusTotalSmokeTest,
            "shodan": ShodanSmokeTest,
            "splunk": SplunkSmokeTest
        }
        
        test_class = test_classes.get(service_name)
        if not test_class:
            logger.error(f"Unknown service: {service_name}")
            return None
            
        return test_class(enabled=enabled)
    
    async def run_service_smoke_tests(
        self, 
        service_name: str, 
        enabled: bool
    ) -> ServiceSmokeTestSuite:
        """Run smoke tests for a single service."""
        logger.info(f"Starting smoke tests for {service_name} (enabled: {enabled})")
        
        suite = ServiceSmokeTestSuite(
            service_name=service_name.title(),
            enabled=enabled
        )
        
        if not enabled:
            logger.info(f"{service_name} is disabled, skipping tests")
            return suite
            
        try:
            # Create smoke test instance
            smoke_test = self._create_smoke_test_instance(service_name, enabled)
            if not smoke_test:
                return suite
            
            # Run all tests for the service
            start_time = time.time()
            test_results = await smoke_test.run_all_tests()
            total_time = int((time.time() - start_time) * 1000)
            
            suite.tests = test_results
            suite.total_response_time_ms = total_time
            
            logger.info(
                f"Completed {service_name} smoke tests: "
                f"{len(suite.passed_tests)} passed, "
                f"{len(suite.failed_tests)} failed, "
                f"{len(suite.skipped_tests)} skipped"
            )
            
        except Exception as e:
            logger.error(f"Error running smoke tests for {service_name}: {e}")
            # Add error result to suite
            from .models import SmokeTestResult
            error_result = SmokeTestResult(
                service_name=service_name.title(),
                test_name="service_error",
                status=SmokeTestStatus.FAILED,
                severity=SmokeTestSeverity.CRITICAL,
                response_time_ms=0,
                message="Service smoke test failed with error",
                error=str(e)
            )
            suite.tests = [error_result]
        
        return suite
    
    async def run_all_smoke_tests(
        self, 
        services: Optional[List[str]] = None,
        parallel: bool = True
    ) -> SmokeTestReport:
        """
        Run smoke tests for all configured services.
        
        Args:
            services: List of specific services to test (None = all)
            parallel: Whether to run tests in parallel
            
        Returns:
            Comprehensive smoke test report
        """
        start_time = datetime.utcnow()
        logger.info("Starting comprehensive smoke test suite")
        
        # Determine which services to test
        if services is None:
            services = list(self.service_configs.keys())
        
        # Filter to only valid services
        valid_services = [s for s in services if s in self.service_configs]
        if len(valid_services) != len(services):
            invalid = set(services) - set(valid_services)
            logger.warning(f"Ignoring invalid services: {invalid}")
        
        service_suites = []
        
        if parallel:
            # Run tests in parallel for faster execution
            logger.info(f"Running smoke tests in parallel for {len(valid_services)} services")
            
            tasks = []
            for service_name in valid_services:
                config = self.service_configs[service_name]
                task = self.run_service_smoke_tests(service_name, config["enabled"])
                tasks.append(task)
            
            service_suites = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Handle any exceptions
            for i, result in enumerate(service_suites):
                if isinstance(result, Exception):
                    logger.error(f"Service {valid_services[i]} smoke test failed: {result}")
                    # Create error suite
                    error_suite = ServiceSmokeTestSuite(
                        service_name=valid_services[i].title(),
                        enabled=True
                    )
                    from .models import SmokeTestResult
                    error_result = SmokeTestResult(
                        service_name=valid_services[i].title(),
                        test_name="parallel_error",
                        status=SmokeTestStatus.FAILED,
                        severity=SmokeTestSeverity.CRITICAL,
                        response_time_ms=0,
                        message="Parallel execution error",
                        error=str(result)
                    )
                    error_suite.tests = [error_result]
                    service_suites[i] = error_suite
                    
        else:
            # Run tests sequentially
            logger.info(f"Running smoke tests sequentially for {len(valid_services)} services")
            
            for service_name in valid_services:
                config = self.service_configs[service_name]
                suite = await self.run_service_smoke_tests(service_name, config["enabled"])
                service_suites.append(suite)
        
        # Calculate overall statistics
        total_tests = sum(len(suite.tests) for suite in service_suites)
        passed = sum(len(suite.passed_tests) for suite in service_suites)
        failed = sum(len(suite.failed_tests) for suite in service_suites)
        skipped = sum(len(suite.skipped_tests) for suite in service_suites)
        warnings = sum(
            len([t for t in suite.tests if t.status == SmokeTestStatus.WARNING])
            for suite in service_suites
        )
        total_response_time = sum(suite.total_response_time_ms for suite in service_suites)
        
        # Create comprehensive report
        self.report = SmokeTestReport(
            timestamp=start_time,
            total_tests=total_tests,
            passed=passed,
            failed=failed,
            skipped=skipped,
            warnings=warnings,
            total_response_time_ms=total_response_time,
            services=service_suites
        )
        
        # Log summary
        execution_time = (datetime.utcnow() - start_time).total_seconds()
        logger.info(
            f"Smoke test suite completed in {execution_time:.2f}s: "
            f"{passed} passed, {failed} failed, {skipped} skipped, {warnings} warnings"
        )
        
        if self.report.has_critical_failures:
            logger.error(
                f"CRITICAL FAILURES DETECTED in services: {self.report.critical_services_down}"
            )
            if self.report.should_block_investigations:
                logger.error("❌ INVESTIGATIONS SHOULD BE BLOCKED due to critical service failures")
        else:
            logger.info("✅ All critical services are operational")
        
        return self.report
    
    def get_last_report(self) -> Optional[SmokeTestReport]:
        """Get the last smoke test report."""
        return self.report
    
    async def run_quick_health_check(self) -> dict:
        """
        Run a quick health check of critical services only.
        
        Returns:
            Quick health status summary
        """
        logger.info("Running quick health check for critical services")
        
        # Only test critical services
        critical_services = [
            name for name, config in self.service_configs.items()
            if config["severity"] == SmokeTestSeverity.CRITICAL and config["enabled"]
        ]
        
        if not critical_services:
            return {
                "status": "healthy",
                "message": "No critical services configured",
                "timestamp": datetime.utcnow().isoformat(),
                "services": []
            }
        
        # Run smoke tests for critical services only
        report = await self.run_all_smoke_tests(
            services=critical_services,
            parallel=True
        )
        
        # Summarize results
        critical_failures = []
        healthy_services = []
        
        for suite in report.services:
            if suite.has_critical_failures:
                critical_failures.append({
                    "service": suite.service_name,
                    "failures": [
                        {"test": test.test_name, "error": test.error}
                        for test in suite.failed_tests
                        if test.is_critical_failure
                    ]
                })
            elif suite.overall_status == SmokeTestStatus.PASSED:
                healthy_services.append(suite.service_name)
        
        overall_status = "unhealthy" if critical_failures else "healthy"
        
        return {
            "status": overall_status,
            "message": f"Critical services check: {len(healthy_services)} healthy, {len(critical_failures)} failed",
            "timestamp": datetime.utcnow().isoformat(),
            "healthy_services": healthy_services,
            "critical_failures": critical_failures,
            "should_block_investigations": report.should_block_investigations
        }