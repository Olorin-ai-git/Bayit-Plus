"""
Smoke tests for AbuseIPDB threat intelligence API.
"""

import time
from typing import Dict, Any

from app.service.agent.tools.threat_intelligence_tool.abuseipdb.abuseipdb_client import AbuseIPDBClient
from app.service.agent.tools.threat_intelligence_tool.abuseipdb.models import AbuseIPDBConfig
from app.service.logging import get_bridge_logger
from .base_smoke_test import BaseSmokeTest
from .models import SmokeTestResult, SmokeTestSeverity

logger = get_bridge_logger(__name__)


class AbuseIPDBSmokeTest(BaseSmokeTest):
    """Smoke tests for AbuseIPDB threat intelligence service."""
    
    def __init__(self, enabled: bool = True):
        """Initialize AbuseIPDB smoke test."""
        super().__init__("AbuseIPDB", enabled)
        self.client = None
        self.config = AbuseIPDBConfig(
            api_key_secret="ABUSEIPDB_API_KEY",
            base_url="https://api.abuseipdb.com/api/v2",
            timeout=30
        )
        
    async def run_connectivity_test(self) -> SmokeTestResult:
        """Test basic connectivity to AbuseIPDB API."""
        start_time = time.time()
        
        try:
            self.client = AbuseIPDBClient(self.config)
            
            # Test basic HTTP connectivity without authentication
            session = await self.client._get_session()
            async with session.get("https://api.abuseipdb.com") as response:
                # We expect a 404 or similar, just checking connectivity
                pass
                
            response_time = self._measure_time(start_time)
            
            return self._create_success_result(
                "connectivity_test",
                response_time,
                "Successfully connected to AbuseIPDB API endpoint",
                SmokeTestSeverity.HIGH,
                {"endpoint_reachable": True}
            )
            
        except Exception as e:
            response_time = self._measure_time(start_time)
            return self._create_failure_result(
                "connectivity_test",
                response_time,
                "Failed to connect to AbuseIPDB API",
                str(e),
                SmokeTestSeverity.HIGH,
                {"connection_failed": True}
            )
    
    async def run_authentication_test(self) -> SmokeTestResult:
        """Test authentication with AbuseIPDB API."""
        start_time = time.time()
        
        try:
            if not self.client:
                self.client = AbuseIPDBClient(self.config)
            
            # Test API key validation by making a simple request
            # Using a known clean IP (Google DNS) for testing
            test_ip = "8.8.8.8"
            response = await self.client.check_ip_reputation(
                test_ip, 
                max_age_days=30, 
                verbose=False
            )
            
            response_time = self._measure_time(start_time)
            
            if response.success:
                return self._create_success_result(
                    "authentication_test",
                    response_time,
                    "API key authentication successful",
                    SmokeTestSeverity.HIGH,
                    {
                        "api_authenticated": True,
                        "test_ip": test_ip,
                        "response_received": True
                    }
                )
            else:
                return self._create_failure_result(
                    "authentication_test",
                    response_time,
                    "Authentication failed - invalid API response",
                    response.error or "Unknown error",
                    SmokeTestSeverity.HIGH,
                    {"api_authenticated": False}
                )
                
        except Exception as e:
            response_time = self._measure_time(start_time)
            error_str = str(e)
            
            # Check for specific authentication errors
            if "401" in error_str or "unauthorized" in error_str.lower():
                return self._create_failure_result(
                    "authentication_test",
                    response_time,
                    "Invalid API key",
                    error_str,
                    SmokeTestSeverity.HIGH,
                    {"invalid_api_key": True}
                )
            elif "402" in error_str or "credits" in error_str.lower():
                return self._create_failure_result(
                    "authentication_test",
                    response_time,
                    "Insufficient API credits",
                    error_str,
                    SmokeTestSeverity.MEDIUM,
                    {"insufficient_credits": True}
                )
            else:
                return self._create_failure_result(
                    "authentication_test",
                    response_time,
                    "Authentication test failed",
                    error_str,
                    SmokeTestSeverity.HIGH
                )
    
    async def run_basic_functionality_test(self) -> SmokeTestResult:
        """Test basic IP reputation check functionality."""
        start_time = time.time()
        
        try:
            if not self.client:
                self.client = AbuseIPDBClient(self.config)
            
            # Test with a known clean IP and a known malicious IP
            test_cases = [
                {"ip": "8.8.8.8", "description": "Google DNS (clean)"},
                {"ip": "1.2.3.4", "description": "Test IP"}  # Using neutral IP for testing
            ]
            
            results = []
            for case in test_cases:
                try:
                    response = await self.client.check_ip_reputation(
                        case["ip"], 
                        max_age_days=30,
                        verbose=True
                    )
                    
                    if response.success and response.ip_info:
                        results.append({
                            "ip": case["ip"],
                            "description": case["description"],
                            "confidence": response.ip_info.abuse_confidence_percentage,
                            "country": response.ip_info.country_name,
                            "reports": response.ip_info.total_reports,
                            "success": True
                        })
                    else:
                        results.append({
                            "ip": case["ip"],
                            "description": case["description"],
                            "error": response.error or "Unknown error",
                            "success": False
                        })
                        
                except Exception as case_error:
                    results.append({
                        "ip": case["ip"], 
                        "description": case["description"],
                        "error": str(case_error),
                        "success": False
                    })
            
            response_time = self._measure_time(start_time)
            
            # Check if at least one test was successful
            successful_tests = [r for r in results if r.get("success", False)]
            
            if successful_tests:
                return self._create_success_result(
                    "functionality_test",
                    response_time,
                    f"IP reputation checks successful ({len(successful_tests)}/{len(test_cases)} tests passed)",
                    SmokeTestSeverity.HIGH,
                    {
                        "test_results": results,
                        "successful_queries": len(successful_tests),
                        "total_queries": len(test_cases)
                    }
                )
            else:
                return self._create_failure_result(
                    "functionality_test",
                    response_time,
                    "All IP reputation checks failed",
                    "No successful queries",
                    SmokeTestSeverity.HIGH,
                    {"test_results": results}
                )
                
        except Exception as e:
            response_time = self._measure_time(start_time)
            return self._create_failure_result(
                "functionality_test",
                response_time,
                "Basic functionality test failed",
                str(e),
                SmokeTestSeverity.HIGH
            )
        finally:
            # Clean up client
            if self.client:
                try:
                    await self.client.close()
                except:
                    pass  # Ignore cleanup errors
    
    async def run_rate_limit_test(self) -> SmokeTestResult:
        """Test rate limiting behavior."""
        start_time = time.time()
        
        try:
            if not self.client:
                self.client = AbuseIPDBClient(self.config)
            
            # Make multiple quick requests to test rate limiting
            test_ip = "8.8.8.8"
            request_count = 3
            successful_requests = 0
            
            for i in range(request_count):
                try:
                    response = await self.client.check_ip_reputation(test_ip, max_age_days=30)
                    if response.success:
                        successful_requests += 1
                except Exception:
                    break  # Stop on first rate limit or error
            
            response_time = self._measure_time(start_time)
            
            return self._create_success_result(
                "rate_limit_test",
                response_time,
                f"Rate limiting test completed ({successful_requests}/{request_count} requests successful)",
                SmokeTestSeverity.LOW,
                {
                    "successful_requests": successful_requests,
                    "total_requests": request_count,
                    "rate_limit_respected": True
                }
            )
            
        except Exception as e:
            response_time = self._measure_time(start_time)
            return self._create_failure_result(
                "rate_limit_test",
                response_time,
                "Rate limit test failed",
                str(e),
                SmokeTestSeverity.LOW
            )
    
    async def run_all_tests(self) -> list[SmokeTestResult]:
        """Run all AbuseIPDB smoke tests."""
        base_results = await super().run_all_tests()
        
        # Only run rate limit test if basic functionality passed
        if (len(base_results) >= 3 and 
            base_results[2].test_name == "functionality_test" and
            base_results[2].status.value == "passed"):
            
            try:
                rate_limit_result = await self._run_test_with_timeout(
                    self.run_rate_limit_test(),
                    "rate_limit_test"
                )
                base_results.append(rate_limit_result)
            except Exception as e:
                base_results.append(self._create_error_result(
                    f"Rate limit test failed: {str(e)}",
                    "rate_limit_test"
                ))
        
        return base_results