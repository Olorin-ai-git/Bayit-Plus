"""
Unit tests for smoke test system.
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime

from app.service.smoke_tests.smoke_test_runner import SmokeTestRunner
from app.service.smoke_tests.models import (
    SmokeTestStatus, 
    SmokeTestSeverity,
    SmokeTestResult,
    ServiceSmokeTestSuite
)


class TestSmokeTestRunner:
    """Test cases for the SmokeTestRunner."""
    
    @pytest.fixture
    def runner(self):
        """Create a smoke test runner instance."""
        return SmokeTestRunner()
    
    def test_service_configurations_loaded(self, runner):
        """Test that service configurations are loaded correctly."""
        configs = runner.service_configs
        
        # Should have all expected services
        expected_services = {
            "snowflake", "abuseipdb", "virustotal", "shodan", "splunk"
        }
        assert set(configs.keys()) == expected_services
        
        # Each service should have required configuration keys
        for service_name, config in configs.items():
            assert "enabled" in config
            assert "severity" in config
            assert "description" in config
            assert isinstance(config["enabled"], bool)
            assert isinstance(config["severity"], SmokeTestSeverity)
            assert isinstance(config["description"], str)
    
    def test_create_smoke_test_instances(self, runner):
        """Test creating smoke test instances for all services."""
        for service_name in runner.service_configs.keys():
            instance = runner._create_smoke_test_instance(service_name, True)
            assert instance is not None
            assert hasattr(instance, 'run_all_tests')
    
    @patch.dict('os.environ', {
        'USE_SNOWFLAKE': 'true',
        'USE_ABUSEIPDB_IP_REPUTATION': 'false',
        'USE_VIRUSTOTAL_IP_ANALYSIS': 'false',
        'USE_SHODAN_INFRASTRUCTURE': 'false',
        'USE_SPLUNK': 'false'
    })
    def test_service_enablement_configuration(self):
        """Test that service enablement is configured correctly."""
        runner = SmokeTestRunner()
        configs = runner.service_configs
        
        assert configs["snowflake"]["enabled"] is True
        assert configs["abuseipdb"]["enabled"] is False
        assert configs["virustotal"]["enabled"] is False
        assert configs["shodan"]["enabled"] is False
        assert configs["splunk"]["enabled"] is False
    
    @pytest.mark.asyncio
    async def test_run_service_smoke_tests_disabled(self, runner):
        """Test running smoke tests for a disabled service."""
        suite = await runner.run_service_smoke_tests("test_service", enabled=False)
        
        assert suite.service_name == "Test_service"
        assert suite.enabled is False
        assert len(suite.tests) == 0
        assert suite.overall_status == SmokeTestStatus.SKIPPED
    
    @pytest.mark.asyncio
    async def test_run_service_smoke_tests_with_error(self, runner):
        """Test handling of service smoke test errors."""
        # Mock a service that raises an exception
        with patch.object(runner, '_create_smoke_test_instance') as mock_create:
            mock_create.return_value = None  # Simulate creation failure
            
            suite = await runner.run_service_smoke_tests("invalid_service", enabled=True)
            
            assert suite.service_name == "Invalid_service"
            assert suite.enabled is True
            assert len(suite.tests) == 0  # No successful tests
    
    @pytest.mark.asyncio  
    async def test_quick_health_check_no_critical_services(self, runner):
        """Test quick health check when no critical services are enabled."""
        # Mock all services as disabled
        with patch.object(runner, 'service_configs', {
            "test_service": {
                "enabled": False,
                "severity": SmokeTestSeverity.CRITICAL,
                "description": "Test service"
            }
        }):
            health_status = await runner.run_quick_health_check()
            
            assert health_status["status"] == "healthy"
            assert "No critical services configured" in health_status["message"]
            assert health_status["services"] == []
    
    @pytest.mark.asyncio
    async def test_run_all_smoke_tests_invalid_services(self, runner):
        """Test running smoke tests with invalid service names."""
        report = await runner.run_all_smoke_tests(
            services=["invalid_service", "snowflake"],
            parallel=False
        )
        
        # Should only run tests for valid services
        assert len(report.services) <= len(runner.service_configs)
    
    @pytest.mark.asyncio
    async def test_run_all_smoke_tests_parallel_vs_sequential(self, runner):
        """Test that parallel and sequential execution both work."""
        services = ["snowflake"]  # Test with one service to avoid external dependencies
        
        # Mock the service smoke tests to avoid actual API calls
        with patch.object(runner, 'run_service_smoke_tests') as mock_run:
            mock_suite = ServiceSmokeTestSuite(
                service_name="Snowflake",
                enabled=True
            )
            mock_suite.tests = [
                SmokeTestResult(
                    service_name="Snowflake",
                    test_name="mock_test",
                    status=SmokeTestStatus.PASSED,
                    severity=SmokeTestSeverity.CRITICAL,
                    response_time_ms=100,
                    message="Mock test passed"
                )
            ]
            mock_run.return_value = mock_suite
            
            # Test parallel execution
            parallel_report = await runner.run_all_smoke_tests(
                services=services,
                parallel=True
            )
            
            # Test sequential execution
            sequential_report = await runner.run_all_smoke_tests(
                services=services,
                parallel=False
            )
            
            # Both should produce similar results
            assert len(parallel_report.services) == len(sequential_report.services)
            assert parallel_report.total_tests == sequential_report.total_tests
    
    def test_get_last_report_initially_none(self, runner):
        """Test that last report is initially None."""
        assert runner.get_last_report() is None
    
    @pytest.mark.asyncio
    async def test_get_last_report_after_execution(self, runner):
        """Test that last report is stored after execution."""
        # Mock the service smoke tests
        with patch.object(runner, 'run_service_smoke_tests') as mock_run:
            mock_suite = ServiceSmokeTestSuite(
                service_name="Test",
                enabled=True
            )
            mock_run.return_value = mock_suite
            
            await runner.run_all_smoke_tests(services=["snowflake"], parallel=False)
            
            last_report = runner.get_last_report()
            assert last_report is not None
            assert len(last_report.services) > 0


class TestSmokeTestModels:
    """Test cases for smoke test data models."""
    
    def test_smoke_test_result_is_critical_failure(self):
        """Test critical failure detection in smoke test results."""
        # Critical failure
        critical_result = SmokeTestResult(
            service_name="Test",
            test_name="test",
            status=SmokeTestStatus.FAILED,
            severity=SmokeTestSeverity.CRITICAL,
            response_time_ms=0,
            message="Critical failure"
        )
        assert critical_result.is_critical_failure is True
        
        # High severity failure (also critical)
        high_result = SmokeTestResult(
            service_name="Test", 
            test_name="test",
            status=SmokeTestStatus.FAILED,
            severity=SmokeTestSeverity.HIGH,
            response_time_ms=0,
            message="High severity failure"
        )
        assert high_result.is_critical_failure is True
        
        # Medium severity failure (not critical)
        medium_result = SmokeTestResult(
            service_name="Test",
            test_name="test", 
            status=SmokeTestStatus.FAILED,
            severity=SmokeTestSeverity.MEDIUM,
            response_time_ms=0,
            message="Medium severity failure"
        )
        assert medium_result.is_critical_failure is False
        
        # Passed test (not critical)
        passed_result = SmokeTestResult(
            service_name="Test",
            test_name="test",
            status=SmokeTestStatus.PASSED,
            severity=SmokeTestSeverity.CRITICAL,
            response_time_ms=100,
            message="Test passed"
        )
        assert passed_result.is_critical_failure is False
    
    def test_service_smoke_test_suite_properties(self):
        """Test ServiceSmokeTestSuite property calculations."""
        suite = ServiceSmokeTestSuite(
            service_name="Test",
            enabled=True
        )
        
        # Add various test results
        suite.tests = [
            SmokeTestResult(
                service_name="Test",
                test_name="passed_test",
                status=SmokeTestStatus.PASSED,
                severity=SmokeTestSeverity.MEDIUM,
                response_time_ms=100,
                message="Passed"
            ),
            SmokeTestResult(
                service_name="Test",
                test_name="failed_test",
                status=SmokeTestStatus.FAILED,
                severity=SmokeTestSeverity.HIGH,
                response_time_ms=200,
                message="Failed"
            ),
            SmokeTestResult(
                service_name="Test",
                test_name="skipped_test",
                status=SmokeTestStatus.SKIPPED,
                severity=SmokeTestSeverity.LOW,
                response_time_ms=0,
                message="Skipped"
            )
        ]
        
        assert len(suite.passed_tests) == 1
        assert len(suite.failed_tests) == 1
        assert len(suite.skipped_tests) == 1
        assert suite.has_critical_failures is True  # High severity failure
        assert suite.overall_status == SmokeTestStatus.FAILED
    
    def test_smoke_test_report_blocking_logic(self):
        """Test smoke test report investigation blocking logic."""
        from app.service.smoke_tests.models import SmokeTestReport
        
        # Create report with critical failures
        report = SmokeTestReport(
            timestamp=datetime.utcnow(),
            total_tests=2,
            passed=1,
            failed=1,
            skipped=0,
            warnings=0,
            total_response_time_ms=1000
        )
        
        # Add service with critical failure
        critical_suite = ServiceSmokeTestSuite(
            service_name="Critical Service",
            enabled=True
        )
        critical_suite.tests = [
            SmokeTestResult(
                service_name="Critical Service",
                test_name="critical_test",
                status=SmokeTestStatus.FAILED,
                severity=SmokeTestSeverity.CRITICAL,
                response_time_ms=0,
                message="Critical failure"
            )
        ]
        
        report.services = [critical_suite]
        
        assert report.has_critical_failures is True
        assert report.should_block_investigations is True
        assert "Critical Service" in report.critical_services_down
    
    def test_smoke_test_report_to_dict(self):
        """Test smoke test report serialization to dictionary."""
        from app.service.smoke_tests.models import SmokeTestReport
        
        report = SmokeTestReport(
            timestamp=datetime.utcnow(),
            total_tests=1,
            passed=1,
            failed=0,
            skipped=0,
            warnings=0,
            total_response_time_ms=500
        )
        
        report_dict = report.to_dict()
        
        # Check required keys
        assert "timestamp" in report_dict
        assert "summary" in report_dict
        assert "services" in report_dict
        
        # Check summary structure
        summary = report_dict["summary"]
        assert "total_tests" in summary
        assert "passed" in summary
        assert "failed" in summary
        assert "has_critical_failures" in summary
        assert "should_block_investigations" in summary