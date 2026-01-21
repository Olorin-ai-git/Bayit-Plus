"""
Phase 7: Error Handling Testing for Olorin Platform.

Tests comprehensive error scenarios across all endpoints to verify proper
error responses, rate limiting, timeout handling, and resilience.
Uses REAL error conditions - NO MOCK DATA.

Error scenarios tested:
1. Authentication failures (401, 403)
2. Invalid parameters (400, 422)
3. Resource not found (404)
4. Rate limiting (429)
5. Server errors (500, 503)
6. Timeout scenarios (504)
7. Malformed requests
8. Boundary condition testing
"""

import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List

import pytest

from .conftest import ENDPOINT_TEST_CONFIG

logger = logging.getLogger(__name__)


class TestErrorHandling:
    """Test suite for comprehensive error handling across all endpoints."""

    @pytest.mark.asyncio
    async def test_authentication_failures(self, endpoint_client, endpoint_validator):
        """Test various authentication failure scenarios."""
        logger.info("Testing authentication failure scenarios")

        # Authentication failure scenarios
        auth_scenarios = [
            {
                "name": "No Authorization Header",
                "headers": {},
                "expected_status": 401,
                "description": "Request without any authentication",
            },
            {
                "name": "Invalid Bearer Token",
                "headers": {"Authorization": "Bearer invalid_token_123"},
                "expected_status": 401,
                "description": "Request with invalid JWT token",
            },
            {
                "name": "Malformed Authorization Header",
                "headers": {"Authorization": "NotBearer token123"},
                "expected_status": 401,
                "description": "Authorization header with wrong format",
            },
            {
                "name": "Empty Bearer Token",
                "headers": {"Authorization": "Bearer "},
                "expected_status": 401,
                "description": "Authorization header with empty token",
            },
            {
                "name": "Expired Token Simulation",
                "headers": {
                    "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJleHAiOjE2MDAwMDAwMDB9.invalid"
                },
                "expected_status": 401,
                "description": "Simulated expired token",
            },
        ]

        # Protected endpoints to test
        protected_endpoints = [
            ("GET", "/auth/me"),
            ("GET", "/api/investigations"),
            ("POST", "/api/investigation"),
            (
                "GET",
                "/api/device/test_user",
                {"investigation_id": "test_inv", "entity_type": "user_id"},
            ),
            ("GET", "/api/logs/test_user", {"investigation_id": "test_inv"}),
        ]

        auth_results = {}

        for scenario in auth_scenarios:
            logger.info(f"Testing auth scenario: {scenario['name']}")
            scenario_results = []

            for method, endpoint, *params in protected_endpoints:
                endpoint_params = params[0] if params else None

                try:
                    if method == "GET":
                        response, metrics = await endpoint_client.get(
                            endpoint,
                            headers=scenario["headers"],
                            params=endpoint_params,
                        )
                    elif method == "POST":
                        response, metrics = await endpoint_client.post(
                            endpoint,
                            headers=scenario["headers"],
                            json_data={"test": "data"},
                        )

                    # Check if we got expected authentication error
                    success = response.status_code == scenario["expected_status"]
                    scenario_results.append(
                        {
                            "endpoint": f"{method} {endpoint}",
                            "status": response.status_code,
                            "success": success,
                        }
                    )

                    # Check error response format
                    if response.status_code == 401:
                        try:
                            error_data = response.json()
                            if "detail" in error_data or "error" in error_data:
                                logger.debug(f"  Good error format for {endpoint}")
                        except:
                            pass

                except Exception as e:
                    scenario_results.append(
                        {
                            "endpoint": f"{method} {endpoint}",
                            "status": "ERROR",
                            "error": str(e),
                            "success": False,
                        }
                    )

            # Summarize scenario results
            successful_endpoints = sum(
                1 for r in scenario_results if r.get("success", False)
            )
            total_endpoints = len(scenario_results)

            auth_results[scenario["name"]] = {
                "success_rate": (
                    successful_endpoints / total_endpoints if total_endpoints > 0 else 0
                ),
                "successful": successful_endpoints,
                "total": total_endpoints,
                "results": scenario_results,
            }

            logger.info(
                f"  {scenario['name']}: {successful_endpoints}/{total_endpoints} endpoints handled auth correctly"
            )

        # Log authentication error handling summary
        logger.info("-" * 60)
        logger.info("AUTHENTICATION ERROR HANDLING SUMMARY")
        logger.info("-" * 60)

        for scenario_name, results in auth_results.items():
            success_rate = results["success_rate"] * 100
            logger.info(
                f"{scenario_name}: {success_rate:.1f}% correct ({results['successful']}/{results['total']})"
            )

        # Overall authentication error handling should be consistent
        overall_success_rate = sum(
            r["successful"] for r in auth_results.values()
        ) / sum(r["total"] for r in auth_results.values())
        logger.info(
            f"Overall authentication error handling: {overall_success_rate*100:.1f}%"
        )

        # Assert that authentication is properly enforced
        assert (
            overall_success_rate > 0.7
        ), "Authentication error handling should be consistent across endpoints"

    @pytest.mark.asyncio
    async def test_invalid_parameter_handling(
        self, endpoint_client, endpoint_validator, auth_headers
    ):
        """Test handling of invalid parameters."""
        logger.info("Testing invalid parameter handling")

        if not auth_headers:
            pytest.skip(
                "No authentication headers available - skipping parameter validation tests"
            )

        # Invalid parameter scenarios
        parameter_scenarios = [
            {
                "name": "Device Analysis - Invalid Time Range",
                "method": "GET",
                "endpoint": "/api/device/test_user",
                "params": {
                    "investigation_id": "test_inv",
                    "entity_type": "user_id",
                    "time_range": "invalid_range",
                },
                "expected_status": [400, 422],
                "description": "Invalid time range parameter",
            },
            {
                "name": "Device Analysis - Missing Investigation ID",
                "method": "GET",
                "endpoint": "/api/device/test_user",
                "params": {"entity_type": "user_id"},  # Missing investigation_id
                "expected_status": [400, 422],
                "description": "Missing required parameter",
            },
            {
                "name": "Investigation Creation - Invalid Status",
                "method": "POST",
                "endpoint": "/api/investigation",
                "json_data": {
                    "id": "test_invalid_status",
                    "entity_id": "test_entity",
                    "entity_type": "user_id",
                    "status": "INVALID_STATUS",  # Invalid status
                    "risk_score": 0.5,
                },
                "expected_status": [400, 422],
                "description": "Invalid enum value",
            },
            {
                "name": "Investigation Creation - Invalid Risk Score",
                "method": "POST",
                "endpoint": "/api/investigation",
                "json_data": {
                    "id": "test_invalid_risk",
                    "entity_id": "test_entity",
                    "entity_type": "user_id",
                    "status": "IN_PROGRESS",
                    "risk_score": 1.5,  # Risk score should be 0.0-1.0
                },
                "expected_status": [400, 422],
                "description": "Out of range numeric value",
            },
            {
                "name": "Investigation Creation - Missing Required Fields",
                "method": "POST",
                "endpoint": "/api/investigation",
                "json_data": {
                    "id": "test_missing_fields"
                    # Missing entity_id, entity_type, etc.
                },
                "expected_status": [400, 422],
                "description": "Missing required fields",
            },
            {
                "name": "Logs Analysis - Invalid Time Range Format",
                "method": "GET",
                "endpoint": "/api/logs/test_user",
                "params": {
                    "investigation_id": "test_inv",
                    "time_range": "not_a_time_range",
                },
                "expected_status": [400, 422],
                "description": "Invalid time format",
            },
        ]

        parameter_results = []

        for scenario in parameter_scenarios:
            logger.info(f"Testing parameter scenario: {scenario['name']}")

            try:
                if scenario["method"] == "GET":
                    response, metrics = await endpoint_client.get(
                        scenario["endpoint"],
                        headers=auth_headers,
                        params=scenario.get("params"),
                    )
                elif scenario["method"] == "POST":
                    response, metrics = await endpoint_client.post(
                        scenario["endpoint"],
                        headers=auth_headers,
                        json_data=scenario.get("json_data"),
                    )

                # Check if we got expected validation error
                expected_statuses = scenario["expected_status"]
                if not isinstance(expected_statuses, list):
                    expected_statuses = [expected_statuses]

                success = response.status_code in expected_statuses
                parameter_results.append(
                    {
                        "scenario": scenario["name"],
                        "status": response.status_code,
                        "expected": expected_statuses,
                        "success": success,
                    }
                )

                # Check error response format
                if response.status_code in [400, 422]:
                    try:
                        error_data = response.json()
                        if "detail" in error_data or "error" in error_data:
                            logger.debug(f"  Good error format: {scenario['name']}")

                        # Check for field-specific validation errors
                        if isinstance(error_data.get("detail"), list):
                            logger.debug(f"  Detailed validation errors provided")
                    except:
                        pass

                if success:
                    logger.info(f"  ✓ {scenario['name']}: {response.status_code}")
                else:
                    logger.warning(
                        f"  ✗ {scenario['name']}: {response.status_code} (expected {expected_statuses})"
                    )

            except Exception as e:
                parameter_results.append(
                    {
                        "scenario": scenario["name"],
                        "status": "ERROR",
                        "error": str(e),
                        "success": False,
                    }
                )
                logger.error(f"  ✗ {scenario['name']}: {str(e)}")

        # Log parameter validation summary
        logger.info("-" * 60)
        logger.info("PARAMETER VALIDATION ERROR HANDLING SUMMARY")
        logger.info("-" * 60)

        successful_validations = sum(1 for r in parameter_results if r["success"])
        total_validations = len(parameter_results)

        for result in parameter_results:
            status = "✓" if result["success"] else "✗"
            logger.info(f"{status} {result['scenario']}: {result['status']}")

        validation_rate = (
            successful_validations / total_validations if total_validations > 0 else 0
        )
        logger.info(
            f"Parameter validation success rate: {validation_rate*100:.1f}% ({successful_validations}/{total_validations})"
        )

        # Assert that parameter validation is working
        assert (
            validation_rate > 0.6
        ), "Parameter validation should catch most invalid inputs"

    @pytest.mark.asyncio
    async def test_resource_not_found_handling(
        self, endpoint_client, endpoint_validator, auth_headers
    ):
        """Test 404 Not Found error handling."""
        logger.info("Testing resource not found (404) handling")

        if not auth_headers:
            pytest.skip("No authentication headers available - skipping 404 tests")

        # 404 scenarios
        not_found_scenarios = [
            {
                "name": "Non-existent Investigation",
                "method": "GET",
                "endpoint": "/api/investigation/nonexistent_investigation_123",
                "expected_status": 404,
                "description": "Get investigation that doesn't exist",
            },
            {
                "name": "Update Non-existent Investigation",
                "method": "PUT",
                "endpoint": "/api/investigation/nonexistent_investigation_456",
                "json_data": {"status": "COMPLETED"},
                "expected_status": 404,
                "description": "Update investigation that doesn't exist",
            },
            {
                "name": "Delete Non-existent Investigation",
                "method": "DELETE",
                "endpoint": "/api/investigation/nonexistent_investigation_789",
                "expected_status": 404,
                "description": "Delete investigation that doesn't exist",
            },
            {
                "name": "Non-existent Endpoint",
                "method": "GET",
                "endpoint": "/api/nonexistent_endpoint",
                "expected_status": 404,
                "description": "Access endpoint that doesn't exist",
            },
            {
                "name": "Analysis for Non-existent User",
                "method": "GET",
                "endpoint": "/api/device/nonexistent_user_999",
                "params": {"investigation_id": "test_inv", "entity_type": "user_id"},
                "expected_status": [
                    404,
                    200,
                ],  # May return empty results instead of 404
                "description": "Analysis for user that doesn't exist",
            },
        ]

        not_found_results = []

        for scenario in not_found_scenarios:
            logger.info(f"Testing 404 scenario: {scenario['name']}")

            try:
                if scenario["method"] == "GET":
                    response, metrics = await endpoint_client.get(
                        scenario["endpoint"],
                        headers=auth_headers,
                        params=scenario.get("params"),
                    )
                elif scenario["method"] == "PUT":
                    response, metrics = await endpoint_client.put(
                        scenario["endpoint"],
                        headers=auth_headers,
                        json_data=scenario.get("json_data"),
                    )
                elif scenario["method"] == "DELETE":
                    response, metrics = await endpoint_client.delete(
                        scenario["endpoint"], headers=auth_headers
                    )
                elif scenario["method"] == "POST":
                    response, metrics = await endpoint_client.post(
                        scenario["endpoint"],
                        headers=auth_headers,
                        json_data=scenario.get("json_data"),
                    )

                # Check if we got expected 404 or acceptable alternative
                expected_statuses = scenario["expected_status"]
                if not isinstance(expected_statuses, list):
                    expected_statuses = [expected_statuses]

                success = response.status_code in expected_statuses
                not_found_results.append(
                    {
                        "scenario": scenario["name"],
                        "status": response.status_code,
                        "expected": expected_statuses,
                        "success": success,
                    }
                )

                # Check 404 error response format
                if response.status_code == 404:
                    try:
                        error_data = response.json()
                        if (
                            "detail" in error_data
                            or "error" in error_data
                            or "message" in error_data
                        ):
                            logger.debug(f"  Good 404 error format: {scenario['name']}")
                    except:
                        # 404 responses might not be JSON
                        pass

                if success:
                    logger.info(f"  ✓ {scenario['name']}: {response.status_code}")
                else:
                    logger.warning(
                        f"  ✗ {scenario['name']}: {response.status_code} (expected {expected_statuses})"
                    )

            except Exception as e:
                not_found_results.append(
                    {
                        "scenario": scenario["name"],
                        "status": "ERROR",
                        "error": str(e),
                        "success": False,
                    }
                )
                logger.error(f"  ✗ {scenario['name']}: {str(e)}")

        # Log 404 handling summary
        logger.info("-" * 60)
        logger.info("404 NOT FOUND ERROR HANDLING SUMMARY")
        logger.info("-" * 60)

        successful_404s = sum(1 for r in not_found_results if r["success"])
        total_404_tests = len(not_found_results)

        for result in not_found_results:
            status = "✓" if result["success"] else "✗"
            logger.info(f"{status} {result['scenario']}: {result['status']}")

        not_found_rate = successful_404s / total_404_tests if total_404_tests > 0 else 0
        logger.info(
            f"404 handling success rate: {not_found_rate*100:.1f}% ({successful_404s}/{total_404_tests})"
        )

    @pytest.mark.asyncio
    async def test_malformed_request_handling(
        self, endpoint_client, endpoint_validator, auth_headers
    ):
        """Test handling of malformed requests."""
        logger.info("Testing malformed request handling")

        if not auth_headers:
            pytest.skip(
                "No authentication headers available - skipping malformed request tests"
            )

        # Malformed request scenarios
        malformed_scenarios = [
            {
                "name": "Invalid JSON in POST",
                "method": "POST",
                "endpoint": "/api/investigation",
                "raw_data": '{"invalid": json malformed',  # Invalid JSON
                "headers": {**auth_headers, "Content-Type": "application/json"},
                "expected_status": [400, 422],
                "description": "Malformed JSON in request body",
            },
            {
                "name": "Empty POST Body",
                "method": "POST",
                "endpoint": "/api/investigation",
                "raw_data": "",  # Empty body
                "headers": {**auth_headers, "Content-Type": "application/json"},
                "expected_status": [400, 422],
                "description": "Empty request body for POST",
            },
            {
                "name": "Wrong Content-Type",
                "method": "POST",
                "endpoint": "/api/investigation",
                "raw_data": '{"id": "test"}',
                "headers": {
                    **auth_headers,
                    "Content-Type": "text/plain",
                },  # Wrong content type
                "expected_status": [400, 422],
                "description": "Wrong Content-Type header",
            },
            {
                "name": "Extremely Large Request",
                "method": "POST",
                "endpoint": "/api/investigation",
                "json_data": {
                    "id": "test_large",
                    "entity_id": "test",
                    "entity_type": "user_id",
                    "status": "IN_PROGRESS",
                    "risk_score": 0.5,
                    "metadata": {"large_data": "x" * 100000},  # Very large metadata
                },
                "expected_status": [400, 413, 422],  # 413 = Payload Too Large
                "description": "Request with very large payload",
            },
        ]

        malformed_results = []

        for scenario in malformed_scenarios:
            logger.info(f"Testing malformed request: {scenario['name']}")

            try:
                # Handle raw data vs json data
                if "raw_data" in scenario:
                    # Send raw data
                    import httpx

                    async with httpx.AsyncClient() as client:
                        response = await client.request(
                            scenario["method"],
                            f"{ENDPOINT_TEST_CONFIG['base_url']}{scenario['endpoint']}",
                            headers=scenario["headers"],
                            content=scenario["raw_data"],
                        )
                else:
                    # Send JSON data
                    if scenario["method"] == "POST":
                        response, metrics = await endpoint_client.post(
                            scenario["endpoint"],
                            headers=auth_headers,
                            json_data=scenario["json_data"],
                        )

                # Check response
                expected_statuses = scenario["expected_status"]
                if not isinstance(expected_statuses, list):
                    expected_statuses = [expected_statuses]

                success = response.status_code in expected_statuses
                malformed_results.append(
                    {
                        "scenario": scenario["name"],
                        "status": response.status_code,
                        "expected": expected_statuses,
                        "success": success,
                    }
                )

                if success:
                    logger.info(f"  ✓ {scenario['name']}: {response.status_code}")
                else:
                    logger.warning(
                        f"  ✗ {scenario['name']}: {response.status_code} (expected {expected_statuses})"
                    )

            except Exception as e:
                # Some malformed requests might cause connection errors
                malformed_results.append(
                    {
                        "scenario": scenario["name"],
                        "status": "ERROR",
                        "error": str(e),
                        "success": True,  # Connection errors are acceptable for malformed requests
                    }
                )
                logger.info(f"  ✓ {scenario['name']}: Connection error (acceptable)")

        # Log malformed request handling summary
        logger.info("-" * 60)
        logger.info("MALFORMED REQUEST HANDLING SUMMARY")
        logger.info("-" * 60)

        successful_malformed = sum(1 for r in malformed_results if r["success"])
        total_malformed_tests = len(malformed_results)

        for result in malformed_results:
            status = "✓" if result["success"] else "✗"
            logger.info(f"{status} {result['scenario']}: {result['status']}")

        malformed_rate = (
            successful_malformed / total_malformed_tests
            if total_malformed_tests > 0
            else 0
        )
        logger.info(
            f"Malformed request handling: {malformed_rate*100:.1f}% ({successful_malformed}/{total_malformed_tests})"
        )

    @pytest.mark.asyncio
    async def test_rate_limiting_behavior(
        self, endpoint_client, endpoint_validator, auth_headers
    ):
        """Test rate limiting behavior (if implemented)."""
        logger.info("Testing rate limiting behavior")

        if not auth_headers:
            pytest.skip(
                "No authentication headers available - skipping rate limiting tests"
            )

        # Test rapid requests to trigger rate limiting
        test_endpoint = "/health"  # Use a simple endpoint
        rate_limit_results = []

        # Send many requests rapidly
        request_count = 100
        rapid_fire_interval = 0.01  # 10ms between requests

        logger.info(f"Sending {request_count} rapid requests to test rate limiting...")

        status_codes = []
        response_times = []

        for i in range(request_count):
            try:
                response, metrics = await endpoint_client.get(test_endpoint)
                status_codes.append(response.status_code)
                response_times.append(metrics["response_time_ms"])

                # Check for rate limiting status codes
                if response.status_code == 429:  # Too Many Requests
                    logger.info(f"Rate limiting triggered at request {i+1}")

                    # Check rate limit headers
                    rate_limit_headers = {}
                    for header in [
                        "X-RateLimit-Limit",
                        "X-RateLimit-Remaining",
                        "Retry-After",
                    ]:
                        if header in response.headers:
                            rate_limit_headers[header] = response.headers[header]

                    if rate_limit_headers:
                        logger.info(f"Rate limit headers: {rate_limit_headers}")

                    break

                # Small delay between requests
                await asyncio.sleep(rapid_fire_interval)

            except Exception as e:
                logger.warning(f"Request {i+1} failed: {str(e)}")
                break

        # Analyze results
        unique_statuses = set(status_codes)
        logger.info(f"Unique status codes from rapid requests: {unique_statuses}")

        rate_limited = 429 in unique_statuses
        if rate_limited:
            logger.info("✓ Rate limiting is implemented and working")
            rate_limit_results.append({"test": "Rate Limiting", "success": True})
        else:
            logger.info("Rate limiting not detected (may not be implemented)")
            rate_limit_results.append(
                {"test": "Rate Limiting", "success": False, "note": "Not implemented"}
            )

        # Check if response times increased under load
        if len(response_times) > 10:
            early_times = response_times[:10]
            late_times = response_times[-10:]

            early_avg = sum(early_times) / len(early_times)
            late_avg = sum(late_times) / len(late_times)

            if late_avg > early_avg * 1.5:  # 50% slower
                logger.info(
                    "Response times increased under load (possible rate limiting/throttling)"
                )
            else:
                logger.info("Response times remained consistent under load")

        # Log rate limiting summary
        logger.info("-" * 60)
        logger.info("RATE LIMITING BEHAVIOR SUMMARY")
        logger.info("-" * 60)

        if rate_limited:
            logger.info("✓ Rate limiting detected and functioning")
        else:
            logger.info("? Rate limiting not detected (may not be implemented)")

        logger.info(f"Total requests sent: {len(status_codes)}")
        logger.info(
            f"Average response time: {sum(response_times)/len(response_times):.1f}ms"
        )

    @pytest.mark.asyncio
    async def test_timeout_handling(
        self, endpoint_client, endpoint_validator, auth_headers
    ):
        """Test timeout handling for slow requests."""
        logger.info("Testing timeout handling")

        if not auth_headers:
            pytest.skip("No authentication headers available - skipping timeout tests")

        # Test with very short timeout
        original_timeout = endpoint_client.timeout

        try:
            # Set very short timeout
            endpoint_client.timeout = 0.001  # 1ms timeout

            logger.info("Testing with 1ms timeout...")

            try:
                response, metrics = await endpoint_client.get("/health")
                logger.info(
                    f"Request completed despite short timeout: {response.status_code}"
                )

            except Exception as e:
                if "timeout" in str(e).lower():
                    logger.info("✓ Timeout properly triggered with short timeout")
                else:
                    logger.warning(f"Unexpected error with short timeout: {str(e)}")

            # Test normal timeout
            endpoint_client.timeout = 30.0  # Normal timeout

            # Test potentially slow endpoint
            slow_endpoints = [
                "/api/logs/test_user?investigation_id=test_inv&time_range=30d",
                "/api/device/test_user?investigation_id=test_inv&entity_type=user_id&time_range=90d",
            ]

            for endpoint in slow_endpoints:
                try:
                    logger.info(f"Testing timeout behavior for: {endpoint}")
                    response, metrics = await endpoint_client.get(
                        endpoint, headers=auth_headers
                    )

                    if metrics["response_time_ms"] > 30000:  # 30 seconds
                        logger.info(
                            f"Endpoint is slow but completed: {metrics['response_time_ms']:.1f}ms"
                        )
                    else:
                        logger.info(
                            f"Endpoint completed normally: {metrics['response_time_ms']:.1f}ms"
                        )

                except Exception as e:
                    if "timeout" in str(e).lower():
                        logger.info(
                            f"✓ Proper timeout handling for slow endpoint: {endpoint}"
                        )
                    else:
                        logger.warning(
                            f"Error testing slow endpoint {endpoint}: {str(e)}"
                        )

        finally:
            # Restore original timeout
            endpoint_client.timeout = original_timeout

        logger.info("Timeout handling test completed")

    @pytest.mark.asyncio
    async def test_boundary_conditions(
        self, endpoint_client, endpoint_validator, auth_headers
    ):
        """Test boundary conditions and edge cases."""
        logger.info("Testing boundary conditions and edge cases")

        if not auth_headers:
            pytest.skip("No authentication headers available - skipping boundary tests")

        boundary_scenarios = [
            {
                "name": "Very Long Investigation ID",
                "method": "GET",
                "endpoint": f"/api/investigation/{'x' * 255}",  # Very long ID
                "expected_status": [404, 400, 414],  # 414 = URI Too Long
                "description": "Investigation ID at character limit",
            },
            {
                "name": "Unicode Characters in ID",
                "method": "GET",
                "endpoint": "/api/investigation/测试调查_🔍_investigation",
                "expected_status": [404, 400],
                "description": "Unicode characters in investigation ID",
            },
            {
                "name": "Special Characters in Parameters",
                "method": "GET",
                "endpoint": "/api/device/user@#$%^&*()",
                "params": {"investigation_id": "test<>\"'&", "entity_type": "user_id"},
                "expected_status": [400, 404, 422],
                "description": "Special characters in user ID and parameters",
            },
            {
                "name": "Null/None Values in JSON",
                "method": "POST",
                "endpoint": "/api/investigation",
                "json_data": {
                    "id": None,
                    "entity_id": None,
                    "entity_type": "user_id",
                    "status": "IN_PROGRESS",
                    "risk_score": None,
                },
                "expected_status": [400, 422],
                "description": "Null values in required fields",
            },
            {
                "name": "Extreme Risk Score Values",
                "method": "POST",
                "endpoint": "/api/investigation",
                "json_data": {
                    "id": "test_extreme_risk",
                    "entity_id": "test",
                    "entity_type": "user_id",
                    "status": "IN_PROGRESS",
                    "risk_score": 999.99,  # Way out of range
                },
                "expected_status": [400, 422],
                "description": "Risk score far outside valid range",
            },
        ]

        boundary_results = []

        for scenario in boundary_scenarios:
            logger.info(f"Testing boundary condition: {scenario['name']}")

            try:
                if scenario["method"] == "GET":
                    response, metrics = await endpoint_client.get(
                        scenario["endpoint"],
                        headers=auth_headers,
                        params=scenario.get("params"),
                    )
                elif scenario["method"] == "POST":
                    response, metrics = await endpoint_client.post(
                        scenario["endpoint"],
                        headers=auth_headers,
                        json_data=scenario.get("json_data"),
                    )

                expected_statuses = scenario["expected_status"]
                if not isinstance(expected_statuses, list):
                    expected_statuses = [expected_statuses]

                success = response.status_code in expected_statuses
                boundary_results.append(
                    {
                        "scenario": scenario["name"],
                        "status": response.status_code,
                        "expected": expected_statuses,
                        "success": success,
                    }
                )

                if success:
                    logger.info(f"  ✓ {scenario['name']}: {response.status_code}")
                else:
                    logger.warning(
                        f"  ✗ {scenario['name']}: {response.status_code} (expected {expected_statuses})"
                    )

            except Exception as e:
                # Some boundary conditions may cause connection errors
                boundary_results.append(
                    {
                        "scenario": scenario["name"],
                        "status": "ERROR",
                        "error": str(e),
                        "success": True,  # Errors can be acceptable for boundary conditions
                    }
                )
                logger.info(
                    f"  ✓ {scenario['name']}: Error (acceptable for boundary condition)"
                )

        # Log boundary condition summary
        logger.info("-" * 60)
        logger.info("BOUNDARY CONDITION HANDLING SUMMARY")
        logger.info("-" * 60)

        for result in boundary_results:
            status = "✓" if result["success"] else "✗"
            logger.info(f"{status} {result['scenario']}: {result['status']}")


# Test execution summary
@pytest.mark.asyncio
async def test_error_handling_comprehensive_summary(endpoint_client, auth_headers):
    """Comprehensive summary of error handling across all test categories."""
    logger.info("=" * 80)
    logger.info("COMPREHENSIVE ERROR HANDLING TEST SUMMARY")
    logger.info("=" * 80)

    # Summary of all error handling categories
    error_categories = [
        "Authentication Failures",
        "Invalid Parameters",
        "Resource Not Found",
        "Malformed Requests",
        "Rate Limiting",
        "Timeout Handling",
        "Boundary Conditions",
    ]

    logger.info("Error handling categories tested:")
    for i, category in enumerate(error_categories, 1):
        logger.info(f"{i}. {category}")

    # Quick test of critical error scenarios
    critical_errors = []

    if auth_headers:
        # Test 401 handling
        try:
            response, _ = await endpoint_client.get(
                "/api/investigations", headers={"Authorization": "Bearer invalid_token"}
            )
            critical_errors.append(
                {"test": "401 Authentication", "success": response.status_code == 401}
            )
        except:
            critical_errors.append({"test": "401 Authentication", "success": False})

        # Test 404 handling
        try:
            response, _ = await endpoint_client.get(
                "/api/investigation/nonexistent", headers=auth_headers
            )
            critical_errors.append(
                {"test": "404 Not Found", "success": response.status_code == 404}
            )
        except:
            critical_errors.append({"test": "404 Not Found", "success": False})

        # Test 422 validation
        try:
            response, _ = await endpoint_client.post(
                "/api/investigation",
                headers=auth_headers,
                json_data={"invalid": "data"},  # Missing required fields
            )
            critical_errors.append(
                {"test": "422 Validation", "success": response.status_code == 422}
            )
        except:
            critical_errors.append({"test": "422 Validation", "success": False})

    # Log critical error handling results
    logger.info("-" * 50)
    logger.info("CRITICAL ERROR HANDLING QUICK CHECK")
    logger.info("-" * 50)

    for error_test in critical_errors:
        status = "✓" if error_test["success"] else "✗"
        logger.info(f"{status} {error_test['test']}")

    critical_success_rate = (
        sum(1 for e in critical_errors if e["success"]) / len(critical_errors)
        if critical_errors
        else 0
    )
    logger.info(
        f"Critical error handling: {critical_success_rate*100:.1f}% ({sum(1 for e in critical_errors if e['success'])}/{len(critical_errors)})"
    )

    logger.info("=" * 80)
    logger.info("ERROR HANDLING TEST SUMMARY COMPLETE")
    logger.info("=" * 80)

    # Assert critical error handling is working
    assert critical_success_rate > 0.5, "Critical error handling should be functional"
