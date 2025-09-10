#!/usr/bin/env python3
"""
Example integration of smoke tests with investigation workflows.

This example shows how to integrate smoke tests into investigation workflows
to ensure external dependencies are operational before running expensive operations.
"""

import asyncio
import sys
import os
from pathlib import Path

# Add the app directory to Python path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "app"))

from app.service.smoke_tests.smoke_test_runner import SmokeTestRunner
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class InvestigationBlockedError(Exception):
    """Exception raised when investigations are blocked due to service failures."""
    pass


async def run_investigation_with_health_check(investigation_id: str):
    """
    Example of running an investigation with pre-flight health checks.
    
    Args:
        investigation_id: Unique identifier for the investigation
        
    Raises:
        InvestigationBlockedError: If critical services are down
    """
    logger.info(f"Starting investigation {investigation_id}")
    
    # Step 1: Quick health check before starting expensive operations
    logger.info("Performing pre-investigation health check...")
    runner = SmokeTestRunner()
    
    try:
        health_status = await runner.run_quick_health_check()
        
        if health_status.get('should_block_investigations'):
            critical_failures = health_status.get('critical_failures', [])
            error_msg = f"Critical services down: {[f['service'] for f in critical_failures]}"
            logger.error(f"Investigation {investigation_id} blocked: {error_msg}")
            raise InvestigationBlockedError(error_msg)
        
        if health_status['status'] == 'unhealthy':
            logger.warning(f"Some services have issues but investigation can proceed: {health_status['message']}")
        else:
            logger.info("✅ All critical services are healthy - investigation can proceed")
            
    except Exception as e:
        logger.error(f"Health check failed for investigation {investigation_id}: {e}")
        raise InvestigationBlockedError(f"Unable to verify service health: {str(e)}")
    
    # Step 2: Proceed with investigation (mock implementation)
    logger.info(f"Executing investigation {investigation_id}...")
    
    # Simulate investigation work
    await asyncio.sleep(1)
    
    # Mock investigation results
    investigation_results = {
        "investigation_id": investigation_id,
        "status": "completed",
        "risk_score": 75,
        "findings": ["Suspicious IP activity", "Multiple failed login attempts"],
        "recommendations": ["Block IP address", "Reset user password"]
    }
    
    logger.info(f"Investigation {investigation_id} completed successfully")
    return investigation_results


async def run_comprehensive_service_validation():
    """
    Example of running comprehensive service validation.
    
    This might be used during system startup or maintenance windows.
    """
    logger.info("Running comprehensive service validation...")
    
    runner = SmokeTestRunner()
    
    try:
        # Run full smoke test suite
        report = await runner.run_all_smoke_tests(parallel=True)
        
        # Log detailed results
        logger.info(f"Smoke test completed: {report.passed} passed, {report.failed} failed, {report.skipped} skipped")
        
        # Check each service
        for service in report.services:
            if service.overall_status.value == "passed":
                logger.info(f"✅ {service.service_name}: All tests passed ({service.total_response_time_ms}ms)")
            elif service.overall_status.value == "failed":
                logger.error(f"❌ {service.service_name}: {len(service.failed_tests)} tests failed")
                for failed_test in service.failed_tests:
                    logger.error(f"   - {failed_test.test_name}: {failed_test.message}")
            elif service.overall_status.value == "skipped":
                logger.info(f"⏭️  {service.service_name}: Service disabled")
            else:
                logger.warning(f"⚠️  {service.service_name}: Service has warnings")
        
        # Overall assessment
        if report.should_block_investigations:
            logger.error("🚫 CRITICAL: Investigations should be blocked due to service failures")
            return False
        elif report.has_critical_failures:
            logger.warning("⚠️  Some services have issues but investigations can proceed")
            return True
        else:
            logger.info("✅ All services are operational")
            return True
            
    except Exception as e:
        logger.error(f"Comprehensive service validation failed: {e}")
        return False


async def monitor_service_health():
    """
    Example of continuous service health monitoring.
    
    This could be run as a background task to monitor service health.
    """
    logger.info("Starting continuous service health monitoring...")
    
    runner = SmokeTestRunner()
    consecutive_failures = 0
    
    while True:
        try:
            # Quick health check every 5 minutes
            health_status = await runner.run_quick_health_check()
            
            if health_status['status'] == 'healthy':
                consecutive_failures = 0
                logger.debug(f"Services healthy: {health_status['message']}")
            else:
                consecutive_failures += 1
                logger.warning(f"Service issues detected (failure #{consecutive_failures}): {health_status['message']}")
                
                # Alert after 3 consecutive failures
                if consecutive_failures >= 3:
                    logger.error("🚨 ALERT: Multiple consecutive service failures detected")
                    # Here you would send alerts to monitoring systems
                    # send_alert_to_monitoring_system(health_status)
            
            # Wait 5 minutes before next check
            await asyncio.sleep(300)
            
        except KeyboardInterrupt:
            logger.info("Monitoring stopped by user")
            break
        except Exception as e:
            logger.error(f"Health monitoring error: {e}")
            await asyncio.sleep(60)  # Wait 1 minute on error


async def validate_configuration_before_deployment():
    """
    Example of configuration validation before deployment.
    
    This checks that all required configuration is present without
    actually testing the external services.
    """
    logger.info("Validating configuration for deployment...")
    
    from app.service.config_loader import get_config_loader
    
    config_loader = get_config_loader()
    validation_errors = []
    
    # Validate Snowflake configuration if enabled
    if os.getenv("USE_SNOWFLAKE", "false").lower() == "true":
        logger.info("Validating Snowflake configuration...")
        snowflake_config = config_loader.load_snowflake_config()
        
        required_fields = ["account", "user", "password", "database"]
        missing_fields = [field for field in required_fields if not snowflake_config.get(field)]
        
        if missing_fields:
            validation_errors.append(f"Missing Snowflake configuration: {missing_fields}")
        else:
            logger.info("✅ Snowflake configuration valid")
    
    # Validate threat intelligence API keys
    threat_intel_services = [
        ("AbuseIPDB", "ABUSEIPDB_API_KEY", "USE_ABUSEIPDB_IP_REPUTATION"),
        ("VirusTotal", "VIRUSTOTAL_API_KEY", "USE_VIRUSTOTAL_IP_ANALYSIS"),
        ("Shodan", "SHODAN_API_KEY", "USE_SHODAN_INFRASTRUCTURE")
    ]
    
    for service_name, api_key_var, enable_var in threat_intel_services:
        if os.getenv(enable_var, "false").lower() == "true":
            logger.info(f"Validating {service_name} configuration...")
            api_key = os.getenv(api_key_var)
            
            if not api_key:
                validation_errors.append(f"Missing {service_name} API key: {api_key_var}")
            elif len(api_key) < 10:  # Basic sanity check
                validation_errors.append(f"Invalid {service_name} API key format")
            else:
                logger.info(f"✅ {service_name} configuration valid")
    
    # Report results
    if validation_errors:
        logger.error("❌ Configuration validation failed:")
        for error in validation_errors:
            logger.error(f"   - {error}")
        return False
    else:
        logger.info("✅ All configuration validation passed")
        return True


async def main():
    """Main example function demonstrating various smoke test integrations."""
    
    print("🔍 Olorin Smoke Test Integration Examples")
    print("=" * 50)
    
    try:
        # Example 1: Configuration validation
        print("\n1️⃣  Configuration Validation")
        config_valid = await validate_configuration_before_deployment()
        
        if not config_valid:
            print("❌ Configuration validation failed - fix errors before proceeding")
            return 1
        
        # Example 2: Comprehensive service validation
        print("\n2️⃣  Comprehensive Service Validation")
        services_healthy = await run_comprehensive_service_validation()
        
        # Example 3: Investigation with health check
        print("\n3️⃣  Investigation with Health Check")
        try:
            results = await run_investigation_with_health_check("INV-2025-001")
            print(f"Investigation completed: {results['status']}")
            print(f"Risk Score: {results['risk_score']}")
            print(f"Findings: {', '.join(results['findings'])}")
        except InvestigationBlockedError as e:
            print(f"Investigation blocked: {e}")
        
        # Example 4: Demonstrate monitoring (run briefly)
        print("\n4️⃣  Health Monitoring (5 seconds demo)")
        monitoring_task = asyncio.create_task(monitor_service_health())
        
        # Let it run for 5 seconds then cancel
        await asyncio.sleep(5)
        monitoring_task.cancel()
        
        try:
            await monitoring_task
        except asyncio.CancelledError:
            print("Monitoring demo completed")
        
        print("\n✅ All examples completed successfully!")
        return 0
        
    except KeyboardInterrupt:
        print("\n⚠️  Examples interrupted by user")
        return 130
    except Exception as e:
        print(f"\n❌ Examples failed with error: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)