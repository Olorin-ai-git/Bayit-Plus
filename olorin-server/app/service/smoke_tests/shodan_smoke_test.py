"""
Smoke tests for Shodan infrastructure analysis API.
"""

import time
from typing import Dict, Any

from app.service.agent.tools.threat_intelligence_tool.shodan.shodan_client import ShodanClient
from app.service.logging import get_bridge_logger
from .base_smoke_test import BaseSmokeTest
from .models import SmokeTestResult, SmokeTestSeverity

logger = get_bridge_logger(__name__)


class ShodanSmokeTest(BaseSmokeTest):
    """Smoke tests for Shodan infrastructure analysis service."""
    
    def __init__(self, enabled: bool = True):
        """Initialize Shodan smoke test."""
        super().__init__("Shodan", enabled)
        self.client = None
        
    async def run_connectivity_test(self) -> SmokeTestResult:
        """Test basic connectivity to Shodan API."""
        start_time = time.time()
        
        try:
            self.client = ShodanClient()
            
            # Test basic HTTP connectivity
            session = await self.client._get_session()
            async with session.get("https://api.shodan.io") as response:
                # We expect some response, just checking connectivity
                pass
                
            response_time = self._measure_time(start_time)
            
            return self._create_success_result(
                "connectivity_test",
                response_time,
                "Successfully connected to Shodan API endpoint",
                SmokeTestSeverity.HIGH,
                {"endpoint_reachable": True}
            )
            
        except Exception as e:
            response_time = self._measure_time(start_time)
            return self._create_failure_result(
                "connectivity_test",
                response_time,
                "Failed to connect to Shodan API",
                str(e),
                SmokeTestSeverity.HIGH,
                {"connection_failed": True}
            )
    
    async def run_authentication_test(self) -> SmokeTestResult:
        """Test authentication with Shodan API."""
        start_time = time.time()
        
        try:
            if not self.client:
                self.client = ShodanClient()
            
            # Test API key validation by getting API info
            api_info = await self.client.api_info()
            
            response_time = self._measure_time(start_time)
            
            return self._create_success_result(
                "authentication_test",
                response_time,
                f"API key authentication successful - Plan: {api_info.plan}",
                SmokeTestSeverity.HIGH,
                {
                    "api_authenticated": True,
                    "plan": api_info.plan,
                    "query_credits": api_info.query_credits,
                    "scan_credits": api_info.scan_credits
                }
            )
                
        except ValueError as e:
            response_time = self._measure_time(start_time)
            error_str = str(e)
            
            # Check for specific authentication errors
            if "invalid api key" in error_str.lower() or "unauthorized" in error_str.lower():
                return self._create_failure_result(
                    "authentication_test",
                    response_time,
                    "Invalid API key",
                    error_str,
                    SmokeTestSeverity.HIGH,
                    {"invalid_api_key": True}
                )
            elif "insufficient credits" in error_str.lower() or "402" in error_str:
                return self._create_failure_result(
                    "authentication_test",
                    response_time,
                    "Insufficient API credits",
                    error_str,
                    SmokeTestSeverity.MEDIUM,
                    {"insufficient_credits": True}
                )
            elif "membership" in error_str.lower() or "upgrade" in error_str.lower():
                return self._create_failure_result(
                    "authentication_test",
                    response_time,
                    "Paid subscription required",
                    error_str,
                    SmokeTestSeverity.MEDIUM,
                    {"subscription_required": True}
                )
            else:
                return self._create_failure_result(
                    "authentication_test",
                    response_time,
                    "Authentication test failed",
                    error_str,
                    SmokeTestSeverity.HIGH
                )
        except Exception as e:
            response_time = self._measure_time(start_time)
            return self._create_failure_result(
                "authentication_test",
                response_time,
                "Authentication test failed",
                str(e),
                SmokeTestSeverity.HIGH
            )
    
    async def run_basic_functionality_test(self) -> SmokeTestResult:
        """Test basic infrastructure analysis functionality."""
        start_time = time.time()
        
        try:
            if not self.client:
                self.client = ShodanClient()
            
            # Test host lookup with a well-known IP (Google DNS)
            test_ip = "8.8.8.8"
            host_info = await self.client.host_info(test_ip)
            
            response_time = self._measure_time(start_time)
            
            if host_info.ip_str:
                return self._create_success_result(
                    "functionality_test",
                    response_time,
                    f"Host analysis successful for {test_ip}",
                    SmokeTestSeverity.HIGH,
                    {
                        "test_ip": test_ip,
                        "host_analyzed": True,
                        "org": host_info.org,
                        "country": host_info.country_name,
                        "ports_found": len(host_info.ports),
                        "services_found": len(host_info.data),
                        "hostnames": len(host_info.hostnames)
                    }
                )
            else:
                return self._create_failure_result(
                    "functionality_test",
                    response_time,
                    "Host analysis returned no data",
                    "Empty host information",
                    SmokeTestSeverity.HIGH,
                    {"host_analyzed": False}
                )
                
        except ValueError as e:
            response_time = self._measure_time(start_time)
            error_str = str(e)
            
            # Check for plan-specific errors
            if "membership" in error_str.lower() or "upgrade" in error_str.lower():
                return self._create_failure_result(
                    "functionality_test",
                    response_time,
                    "Paid subscription required for host lookup",
                    error_str,
                    SmokeTestSeverity.MEDIUM,
                    {"subscription_required": True}
                )
            else:
                return self._create_failure_result(
                    "functionality_test",
                    response_time,
                    "Basic functionality test failed",
                    error_str,
                    SmokeTestSeverity.HIGH
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
    
    async def run_search_functionality_test(self) -> SmokeTestResult:
        """Test search functionality."""
        start_time = time.time()
        
        try:
            if not self.client:
                self.client = ShodanClient()
            
            # Test basic search with a simple query
            search_query = "port:80"
            search_results = await self.client.search(
                search_query,
                page=1,
                minify=True
            )
            
            response_time = self._measure_time(start_time)
            
            if search_results.total > 0:
                return self._create_success_result(
                    "search_functionality_test",
                    response_time,
                    f"Search functionality working - found {search_results.total} results",
                    SmokeTestSeverity.MEDIUM,
                    {
                        "search_query": search_query,
                        "total_results": search_results.total,
                        "results_returned": len(search_results.matches),
                        "search_functional": True
                    }
                )
            else:
                return self._create_success_result(
                    "search_functionality_test",
                    response_time,
                    "Search functionality working (no results for test query)",
                    SmokeTestSeverity.MEDIUM,
                    {"search_functional": True, "no_results": True}
                )
                
        except ValueError as e:
            response_time = self._measure_time(start_time)
            error_str = str(e)
            
            # Check for plan-specific errors
            if "membership" in error_str.lower() or "upgrade" in error_str.lower():
                return self._create_failure_result(
                    "search_functionality_test",
                    response_time,
                    "Paid subscription required for search",
                    error_str,
                    SmokeTestSeverity.MEDIUM,
                    {"subscription_required": True}
                )
            else:
                return self._create_failure_result(
                    "search_functionality_test",
                    response_time,
                    "Search functionality test failed",
                    error_str,
                    SmokeTestSeverity.MEDIUM
                )
        except Exception as e:
            response_time = self._measure_time(start_time)
            return self._create_failure_result(
                "search_functionality_test",
                response_time,
                "Search functionality test failed",
                str(e),
                SmokeTestSeverity.MEDIUM
            )
    
    async def run_dns_lookup_test(self) -> SmokeTestResult:
        """Test DNS lookup functionality."""
        start_time = time.time()
        
        try:
            if not self.client:
                self.client = ShodanClient()
            
            # Test DNS lookup with a well-known domain
            test_domain = "google.com"
            dns_info = await self.client.dns_lookup(test_domain)
            
            response_time = self._measure_time(start_time)
            
            if dns_info.domain:
                return self._create_success_result(
                    "dns_lookup_test",
                    response_time,
                    f"DNS lookup successful for {test_domain}",
                    SmokeTestSeverity.LOW,
                    {
                        "test_domain": test_domain,
                        "dns_records": len(dns_info.data),
                        "subdomains": len(dns_info.subdomains),
                        "tags": len(dns_info.tags),
                        "dns_functional": True
                    }
                )
            else:
                return self._create_failure_result(
                    "dns_lookup_test",
                    response_time,
                    "DNS lookup returned no data",
                    "Empty DNS information",
                    SmokeTestSeverity.LOW,
                    {"dns_functional": False}
                )
                
        except Exception as e:
            response_time = self._measure_time(start_time)
            return self._create_failure_result(
                "dns_lookup_test",
                response_time,
                "DNS lookup test failed",
                str(e),
                SmokeTestSeverity.LOW
            )
    
    async def run_all_tests(self) -> list[SmokeTestResult]:
        """Run all Shodan smoke tests."""
        base_results = await super().run_all_tests()
        
        # Only run additional tests if basic functionality passed
        if (len(base_results) >= 3 and 
            base_results[2].test_name == "functionality_test" and
            base_results[2].status.value == "passed"):
            
            # Run search functionality test
            try:
                search_result = await self._run_test_with_timeout(
                    self.run_search_functionality_test(),
                    "search_functionality_test"
                )
                base_results.append(search_result)
            except Exception as e:
                base_results.append(self._create_error_result(
                    f"Search functionality test failed: {str(e)}",
                    "search_functionality_test"
                ))
            
            # Run DNS lookup test
            try:
                dns_result = await self._run_test_with_timeout(
                    self.run_dns_lookup_test(),
                    "dns_lookup_test"
                )
                base_results.append(dns_result)
            except Exception as e:
                base_results.append(self._create_error_result(
                    f"DNS lookup test failed: {str(e)}",
                    "dns_lookup_test"
                ))
        
        return base_results