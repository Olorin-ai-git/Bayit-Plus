"""
Smoke tests for VirusTotal threat intelligence API.
"""

import time
from typing import Any, Dict

from app.service.agent.tools.threat_intelligence_tool.virustotal.models import (
    VirusTotalConfig,
)
from app.service.agent.tools.threat_intelligence_tool.virustotal.virustotal_client import (
    VirusTotalClient,
)
from app.service.logging import get_bridge_logger

from .base_smoke_test import BaseSmokeTest
from .models import SmokeTestResult, SmokeTestSeverity

logger = get_bridge_logger(__name__)


class VirusTotalSmokeTest(BaseSmokeTest):
    """Smoke tests for VirusTotal threat intelligence service."""

    def __init__(self, enabled: bool = True):
        """Initialize VirusTotal smoke test."""
        super().__init__("VirusTotal", enabled)
        self.client = None
        self.config = VirusTotalConfig(
            api_key_secret="VIRUSTOTAL_API_KEY",
            base_url="https://www.virustotal.com/vtapi/v2",
            timeout_seconds=30,
        )

    async def run_connectivity_test(self) -> SmokeTestResult:
        """Test basic connectivity to VirusTotal API."""
        start_time = time.time()

        try:
            self.client = VirusTotalClient(self.config)

            # Test basic HTTP connectivity
            session = await self.client._get_session()
            async with session.get("https://www.virustotal.com") as response:
                # We expect a successful response, just checking connectivity
                pass

            response_time = self._measure_time(start_time)

            return self._create_success_result(
                "connectivity_test",
                response_time,
                "Successfully connected to VirusTotal API endpoint",
                SmokeTestSeverity.HIGH,
                {"endpoint_reachable": True},
            )

        except Exception as e:
            response_time = self._measure_time(start_time)
            return self._create_failure_result(
                "connectivity_test",
                response_time,
                "Failed to connect to VirusTotal API",
                str(e),
                SmokeTestSeverity.HIGH,
                {"connection_failed": True},
            )

    async def run_authentication_test(self) -> SmokeTestResult:
        """Test authentication with VirusTotal API."""
        start_time = time.time()

        try:
            if not self.client:
                self.client = VirusTotalClient(self.config)

            # Test API key validation with a simple IP lookup
            # Using Google DNS for testing
            test_ip = "8.8.8.8"
            response = await self.client.analyze_ip(test_ip)

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
                        "response_received": True,
                    },
                )
            else:
                return self._create_failure_result(
                    "authentication_test",
                    response_time,
                    "Authentication failed - invalid API response",
                    response.error or "Unknown error",
                    SmokeTestSeverity.HIGH,
                    {"api_authenticated": False},
                )

        except Exception as e:
            response_time = self._measure_time(start_time)
            error_str = str(e)

            # Check for specific authentication errors
            if "401" in error_str or "authentication failed" in error_str.lower():
                return self._create_failure_result(
                    "authentication_test",
                    response_time,
                    "Invalid API key",
                    error_str,
                    SmokeTestSeverity.HIGH,
                    {"invalid_api_key": True},
                )
            elif "403" in error_str or "quota" in error_str.lower():
                return self._create_failure_result(
                    "authentication_test",
                    response_time,
                    "API quota exceeded",
                    error_str,
                    SmokeTestSeverity.MEDIUM,
                    {"quota_exceeded": True},
                )
            else:
                return self._create_failure_result(
                    "authentication_test",
                    response_time,
                    "Authentication test failed",
                    error_str,
                    SmokeTestSeverity.HIGH,
                )

    async def run_basic_functionality_test(self) -> SmokeTestResult:
        """Test basic threat analysis functionality."""
        start_time = time.time()

        try:
            if not self.client:
                self.client = VirusTotalClient(self.config)

            # Test different analysis types
            test_cases = [
                {
                    "type": "ip",
                    "value": "8.8.8.8",
                    "description": "Google DNS IP analysis",
                },
                {
                    "type": "domain",
                    "value": "google.com",
                    "description": "Google domain analysis",
                },
            ]

            results = []
            for case in test_cases:
                try:
                    if case["type"] == "ip":
                        response = await self.client.analyze_ip(case["value"])
                    elif case["type"] == "domain":
                        response = await self.client.analyze_domain(case["value"])
                    else:
                        continue

                    if response.success:
                        results.append(
                            {
                                "type": case["type"],
                                "value": case["value"],
                                "description": case["description"],
                                "analysis_stats": (
                                    response.analysis_stats.__dict__
                                    if response.analysis_stats
                                    else None
                                ),
                                "vendor_count": (
                                    len(response.vendor_results)
                                    if response.vendor_results
                                    else 0
                                ),
                                "success": True,
                            }
                        )
                    else:
                        results.append(
                            {
                                "type": case["type"],
                                "value": case["value"],
                                "description": case["description"],
                                "error": response.error or "Unknown error",
                                "success": False,
                            }
                        )

                except Exception as case_error:
                    results.append(
                        {
                            "type": case["type"],
                            "value": case["value"],
                            "description": case["description"],
                            "error": str(case_error),
                            "success": False,
                        }
                    )

            response_time = self._measure_time(start_time)

            # Check if at least one test was successful
            successful_tests = [r for r in results if r.get("success", False)]

            if successful_tests:
                return self._create_success_result(
                    "functionality_test",
                    response_time,
                    f"Threat analysis successful ({len(successful_tests)}/{len(test_cases)} tests passed)",
                    SmokeTestSeverity.HIGH,
                    {
                        "test_results": results,
                        "successful_analyses": len(successful_tests),
                        "total_analyses": len(test_cases),
                    },
                )
            else:
                return self._create_failure_result(
                    "functionality_test",
                    response_time,
                    "All threat analysis tests failed",
                    "No successful analyses",
                    SmokeTestSeverity.HIGH,
                    {"test_results": results},
                )

        except Exception as e:
            response_time = self._measure_time(start_time)
            return self._create_failure_result(
                "functionality_test",
                response_time,
                "Basic functionality test failed",
                str(e),
                SmokeTestSeverity.HIGH,
            )
        finally:
            # Clean up client
            if self.client:
                try:
                    await self.client.close()
                except:
                    pass  # Ignore cleanup errors

    async def run_file_analysis_test(self) -> SmokeTestResult:
        """Test file hash analysis functionality."""
        start_time = time.time()

        try:
            if not self.client:
                self.client = VirusTotalClient(self.config)

            # Test with known file hashes
            # Using a well-known clean file hash for testing
            test_hash = (
                "d41d8cd98f00b204e9800998ecf8427e"  # MD5 of empty file - commonly known
            )

            response = await self.client.analyze_file_hash(test_hash)

            response_time = self._measure_time(start_time)

            if response.success:
                return self._create_success_result(
                    "file_analysis_test",
                    response_time,
                    "File hash analysis successful",
                    SmokeTestSeverity.MEDIUM,
                    {
                        "test_hash": test_hash,
                        "hash_type": response.hash_type,
                        "analysis_stats": (
                            response.analysis_stats.__dict__
                            if response.analysis_stats
                            else None
                        ),
                        "vendor_count": (
                            len(response.vendor_results)
                            if response.vendor_results
                            else 0
                        ),
                        "file_analyzed": True,
                    },
                )
            else:
                # File not found is acceptable for smoke test
                if "not found" in (response.error or "").lower():
                    return self._create_success_result(
                        "file_analysis_test",
                        response_time,
                        "File analysis API functional (test file not in database)",
                        SmokeTestSeverity.MEDIUM,
                        {"api_functional": True, "test_file_not_found": True},
                    )
                else:
                    return self._create_failure_result(
                        "file_analysis_test",
                        response_time,
                        "File analysis failed",
                        response.error or "Unknown error",
                        SmokeTestSeverity.MEDIUM,
                    )

        except Exception as e:
            response_time = self._measure_time(start_time)
            return self._create_failure_result(
                "file_analysis_test",
                response_time,
                "File analysis test failed",
                str(e),
                SmokeTestSeverity.MEDIUM,
            )

    async def run_all_tests(self) -> list[SmokeTestResult]:
        """Run all VirusTotal smoke tests."""
        base_results = await super().run_all_tests()

        # Only run file analysis test if basic functionality passed
        if (
            len(base_results) >= 3
            and base_results[2].test_name == "functionality_test"
            and base_results[2].status.value == "passed"
        ):

            try:
                file_analysis_result = await self._run_test_with_timeout(
                    self.run_file_analysis_test(), "file_analysis_test"
                )
                base_results.append(file_analysis_result)
            except Exception as e:
                base_results.append(
                    self._create_error_result(
                        f"File analysis test failed: {str(e)}", "file_analysis_test"
                    )
                )

        return base_results
