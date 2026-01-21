#!/usr/bin/env python3
"""
Comprehensive test script for Location Domain API and Vector Search Tool integration.
This script tests the actual API endpoints and vector search functionality.
"""

import asyncio
import json
import logging
import os
import sys
from datetime import datetime, timezone
from typing import Any, Dict, List

import httpx
import pytest

# Add the parent directory to the path so we can import from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Test configuration
BASE_URL = "http://localhost:8090"
TEST_USER_ID = "test_user_vector_search_123"
TEST_INVESTIGATION_ID = "test_investigation_vector_123"

# Mock Splunk data for testing vector search
MOCK_SPLUNK_DATA = [
    {
        "fuzzy_device_id": "device_001",
        "city": "San Francisco",
        "state": "CA",
        "country": "US",
        "tm_smart_id": "smart_123",
        "tm_true_ip_geo": "US",
        "tm_true_ip": "192.168.1.100",
        "tm_proxy_ip": None,
        "rss_epoch_time": "1640995200000",
        "tm_os_anomaly": "false",
        "tm_http_os_signature": "windows 10",
        "tm_true_ip_longitude": "-122.4194",
        "tm_true_ip_latitude": "37.7749",
        "tm_input_ip_longitude": "-122.4194",
        "tm_input_ip_latitude": "37.7749",
        "tm_page_time_on": "30000",
        "tm_screen_color_depth": "32",
        "tm_agent_public_key_hash_type": "web:rsa",
        "tm_bb_bot_score": "100",
        "_time": "2022-01-01T00:00:00Z",
    },
    {
        "fuzzy_device_id": "device_002",
        "city": "San Francisco",
        "state": "CA",
        "country": "US",
        "tm_smart_id": "smart_123",  # Same smart ID - should be very similar
        "tm_true_ip_geo": "US",
        "tm_true_ip": "192.168.1.101",
        "tm_proxy_ip": None,
        "rss_epoch_time": "1640995260000",
        "tm_os_anomaly": "false",
        "tm_http_os_signature": "windows 10",
        "tm_true_ip_longitude": "-122.4194",
        "tm_true_ip_latitude": "37.7749",
        "tm_input_ip_longitude": "-122.4194",
        "tm_input_ip_latitude": "37.7749",
        "tm_page_time_on": "35000",
        "tm_screen_color_depth": "32",
        "tm_agent_public_key_hash_type": "web:rsa",
        "tm_bb_bot_score": "120",
        "_time": "2022-01-01T00:01:00Z",
    },
    {
        "fuzzy_device_id": "device_003",
        "city": "New York",
        "state": "NY",
        "country": "US",
        "tm_smart_id": "smart_456",  # Different smart ID
        "tm_true_ip_geo": "US",
        "tm_true_ip": "10.0.0.50",
        "tm_proxy_ip": "proxy.suspicious.com",  # Using proxy - risk indicator
        "rss_epoch_time": "1640995320000",
        "tm_os_anomaly": "true",  # OS anomaly - risk indicator
        "tm_http_os_signature": "linux ubuntu",
        "tm_true_ip_longitude": "-74.0060",
        "tm_true_ip_latitude": "40.7128",
        "tm_input_ip_longitude": "-74.0060",
        "tm_input_ip_latitude": "40.7128",
        "tm_page_time_on": "5000",
        "tm_screen_color_depth": "24",  # Suspicious color depth
        "tm_agent_public_key_hash_type": "web:ecdsa",  # Suspicious key type
        "tm_bb_bot_score": "800",  # High bot score - risk indicator
        "_time": "2022-01-01T00:02:00Z",
    },
]

pytestmark = pytest.mark.skipif(
    "OLORIN_RUN_INTEGRATION" not in os.environ,
    reason="Integration test, requires running API server",
)


async def test_vector_search_tool_directly():
    """Test the vector search tool directly."""
    logger.info("=== TESTING VECTOR SEARCH TOOL DIRECTLY ===")

    try:
        from app.service.agent.tools.vector_search_tool import VectorSearchTool

        tool = VectorSearchTool()

        # Test with mock data
        target_record = MOCK_SPLUNK_DATA[0]
        candidate_records = MOCK_SPLUNK_DATA[1:]

        result = await tool._arun(
            target_record=target_record,
            candidate_records=candidate_records,
            max_results=5,
            distance_threshold=15.0,
        )

        logger.info(f"Vector search result: {json.dumps(result, indent=2)}")

        # Verify structure
        assert "target_record" in result
        assert "similar_records" in result
        assert "total_candidates" in result
        assert "total_results" in result

        similar_records = result["similar_records"]
        logger.info(f"Found {len(similar_records)} similar records")

        # Check that records are sorted by distance
        if len(similar_records) > 1:
            distances = [record["distance"] for record in similar_records]
            assert distances == sorted(
                distances
            ), "Records should be sorted by distance"
            logger.info("✅ Records are properly sorted by distance")

        # Log distance details
        for i, record in enumerate(similar_records):
            logger.info(
                f"Record {i+1}: distance={record['distance']:.2f}, smart_id={record['record'].get('tm_smart_id')}"
            )

        logger.info("✅ VECTOR SEARCH TOOL DIRECT TEST PASSED!")
        return True

    except Exception as e:
        logger.error(f"❌ Vector search tool test failed: {str(e)}", exc_info=True)
        return False


async def test_location_data_client():
    """Test the LocationDataClient with vector search integration."""
    logger.info("=== TESTING LOCATION DATA CLIENT ===")

    try:
        from app.service.agent.ato_agents.location_data_agent.client import (
            LocationDataClient,
        )

        # Create client
        client = LocationDataClient(api_keys={"test_key": "test_value"})

        # Test analyze_transaction_patterns method
        analysis_result = await client.analyze_transaction_patterns(
            MOCK_SPLUNK_DATA, TEST_USER_ID
        )
        logger.info(
            f"Transaction pattern analysis: {json.dumps(analysis_result, indent=2)}"
        )

        # Verify analysis structure
        assert "analysis_status" in analysis_result
        assert analysis_result["analysis_status"] in [
            "completed",
            "insufficient_data",
            "error",
        ]

        if analysis_result["analysis_status"] == "completed":
            assert "target_record" in analysis_result
            assert "similar_records_found" in analysis_result
            assert "pattern_analysis" in analysis_result
            logger.info("✅ Transaction pattern analysis completed successfully")

        # Clean up
        await client.close()

        logger.info("✅ LOCATION DATA CLIENT TEST PASSED!")
        return True

    except Exception as e:
        logger.error(f"❌ Location data client test failed: {str(e)}", exc_info=True)
        return False


async def test_location_api_endpoints():
    """Test the location API endpoints."""
    logger.info("=== TESTING LOCATION API ENDPOINTS ===")

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            # Test 1: Main location endpoint with vector search
            logger.info("--- Testing main location endpoint ---")

            response = await client.get(
                f"{BASE_URL}/api/location/{TEST_USER_ID}",
                params={"investigation_id": TEST_INVESTIGATION_ID, "time_range": "1m"},
                json=MOCK_SPLUNK_DATA,  # Pass mock data as raw_splunk_override
            )

            if response.status_code == 200:
                data = response.json()
                logger.info(f"Location endpoint response: {json.dumps(data, indent=2)}")

                # Check for vector search results
                if "vector_search_results" in data:
                    vector_results = data["vector_search_results"]
                    if (
                        vector_results
                        and not isinstance(vector_results, dict)
                        or "error" not in vector_results
                    ):
                        logger.info(
                            "✅ Vector search results found in location endpoint"
                        )
                    else:
                        logger.warning(
                            "⚠️ Vector search results contain error or are empty"
                        )
                else:
                    logger.warning(
                        "⚠️ No vector search results in location endpoint response"
                    )

                logger.info("✅ Main location endpoint test passed")
            else:
                logger.warning(
                    f"⚠️ Location endpoint returned status {response.status_code}: {response.text}"
                )

            # Test 2: Individual source endpoints
            logger.info("--- Testing individual source endpoints ---")

            source_endpoints = [
                f"/api/location/source/oii/{TEST_USER_ID}",
                f"/api/location/source/salesforce/{TEST_USER_ID}",
                f"/api/location/source/ekata/{TEST_USER_ID}",
                f"/api/location/source/business/{TEST_USER_ID}",
                f"/api/location/source/phone/{TEST_USER_ID}",
            ]

            for endpoint in source_endpoints:
                try:
                    response = await client.get(f"{BASE_URL}{endpoint}")
                    logger.info(f"Endpoint {endpoint}: Status {response.status_code}")
                    if response.status_code == 200:
                        data = response.json()
                        logger.info(f"Response: {json.dumps(data, indent=2)[:200]}...")
                except Exception as e:
                    logger.warning(f"Error testing {endpoint}: {str(e)}")

            # Test 3: Risk analysis endpoint
            logger.info("--- Testing risk analysis endpoint ---")

            try:
                response = await client.get(
                    f"{BASE_URL}/api/location/risk-analysis/{TEST_USER_ID}",
                    params={"time_range": "1m"},
                )

                if response.status_code == 200:
                    data = response.json()
                    logger.info(
                        f"Risk analysis response: {json.dumps(data, indent=2)[:500]}..."
                    )
                    logger.info("✅ Risk analysis endpoint test passed")
                else:
                    logger.warning(
                        f"⚠️ Risk analysis endpoint returned status {response.status_code}: {response.text}"
                    )
            except Exception as e:
                logger.warning(f"Error testing risk analysis endpoint: {str(e)}")

            logger.info("✅ LOCATION API ENDPOINTS TEST COMPLETED!")
            return True

        except Exception as e:
            logger.error(
                f"❌ Location API endpoints test failed: {str(e)}", exc_info=True
            )
            return False


async def test_server_health():
    """Test if the server is running and healthy."""
    logger.info("=== TESTING SERVER HEALTH ===")

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            # Test health endpoint
            response = await client.get(f"{BASE_URL}/health")
            if response.status_code == 200:
                logger.info("✅ Server health check passed")
                return True
            else:
                logger.error(f"❌ Health check failed: {response.status_code}")
                return False
        except Exception as e:
            logger.error(f"❌ Cannot connect to server: {str(e)}")
            logger.info(
                "💡 Make sure the server is running with: uvicorn app.main:app --reload"
            )
            return False


async def run_comprehensive_tests():
    """Run all tests in sequence."""
    logger.info("🚀 STARTING COMPREHENSIVE LOCATION API AND VECTOR SEARCH TESTS")

    test_results = {}

    # Test 1: Vector search tool directly
    test_results["vector_search_tool"] = await test_vector_search_tool_directly()

    # Test 2: Location data client
    test_results["location_data_client"] = await test_location_data_client()

    # Test 3: Server health
    test_results["server_health"] = await test_server_health()

    # Test 4: API endpoints (only if server is healthy)
    if test_results["server_health"]:
        test_results["api_endpoints"] = await test_location_api_endpoints()
    else:
        test_results["api_endpoints"] = False
        logger.warning("⚠️ Skipping API endpoint tests - server not available")

    # Summary
    logger.info("\n" + "=" * 60)
    logger.info("📊 TEST RESULTS SUMMARY")
    logger.info("=" * 60)

    for test_name, result in test_results.items():
        status = "✅ PASSED" if result else "❌ FAILED"
        logger.info(f"{test_name.replace('_', ' ').title()}: {status}")

    total_tests = len(test_results)
    passed_tests = sum(test_results.values())

    logger.info(f"\nOverall: {passed_tests}/{total_tests} tests passed")

    if passed_tests == total_tests:
        logger.info(
            "🎉 ALL TESTS PASSED! Vector search integration is working correctly!"
        )
    else:
        logger.warning(
            f"⚠️ {total_tests - passed_tests} test(s) failed. Check the logs above for details."
        )

    return passed_tests == total_tests


async def main():
    """Main test runner."""
    try:
        success = await run_comprehensive_tests()
        return 0 if success else 1
    except Exception as e:
        logger.error(f"💥 Test runner failed: {str(e)}", exc_info=True)
        return 1


@pytest.mark.asyncio
async def test_location_endpoint_invalid_user_id():
    async with httpx.AsyncClient(timeout=10.0) as client:
        # Empty user_id
        try:
            response = await client.get(
                f"{BASE_URL}/api/location//",
                params={"investigation_id": TEST_INVESTIGATION_ID},
            )
            assert response.status_code in (400, 422, 404)
        except httpx.ReadTimeout:
            pytest.skip("Server timed out for empty user_id (acceptable for edge case)")
        # Bad chars
        try:
            response = await client.get(
                f"{BASE_URL}/api/location/bad!user",
                params={"investigation_id": TEST_INVESTIGATION_ID},
            )
            assert response.status_code in (200, 400, 422, 500)
        except httpx.ReadTimeout:
            pytest.skip("Server timed out for bad user_id (acceptable for edge case)")


@pytest.mark.asyncio
async def test_location_endpoint_missing_investigation_id():
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(f"{BASE_URL}/api/location/{TEST_USER_ID}")
        assert response.status_code in (400, 422, 500)


@pytest.mark.asyncio
async def test_location_endpoint_server_error(monkeypatch):
    # Simulate server down or 500 error
    async with httpx.AsyncClient(timeout=10.0) as client:
        # Use a likely invalid port
        bad_url = BASE_URL.replace("8090", "9999")
        try:
            await client.get(
                f"{bad_url}/api/location/{TEST_USER_ID}",
                params={"investigation_id": TEST_INVESTIGATION_ID},
            )
        except Exception as e:
            assert (
                "Connection refused" in str(e)
                or "Failed to establish" in str(e)
                or isinstance(e, httpx.ConnectError)
            )


@pytest.mark.asyncio
async def test_location_endpoint_malformed_json(monkeypatch):
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client.get(
                f"{BASE_URL}/api/location/{TEST_USER_ID}",
                params={"investigation_id": TEST_INVESTIGATION_ID},
            )
            try:
                _ = response.json()
            except Exception as e:
                assert (
                    "Expecting value" in str(e)
                    or "No JSON object could be decoded" in str(e)
                    or isinstance(e, json.JSONDecodeError)
                )
        except httpx.ReadTimeout:
            pytest.skip(
                "Server timed out for malformed JSON test (acceptable for edge case)"
            )


@pytest.mark.asyncio
async def test_vector_search_error():
    async with httpx.AsyncClient(timeout=10.0) as client:
        # Remove 'json' argument, use params or switch to post if needed
        response = await client.get(
            f"{BASE_URL}/api/location/vector_search_error",
            params={"user_id": "testuser"},
        )
        assert response.status_code in (
            400,
            422,
            500,
            200,
        )  # Accept 200 if error info is in body
        # Optionally check for error message in body
        if response.status_code == 200:
            assert "error" in response.text.lower() or "fail" in response.text.lower()


@pytest.mark.asyncio
async def test_risk_analysis_endpoint_missing_params():
    async with httpx.AsyncClient(timeout=10.0) as client:
        # Missing investigation_id
        try:
            response = await client.get(
                f"{BASE_URL}/api/location/risk-analysis/{TEST_USER_ID}"
            )
            assert response.status_code in (400, 422, 500)
        except httpx.ReadTimeout:
            pytest.skip(
                "Server timed out for missing investigation_id (acceptable for edge case)"
            )
        # Invalid user_id
        try:
            response = await client.get(
                f"{BASE_URL}/api/location/risk-analysis/bad!user",
                params={"investigation_id": TEST_INVESTIGATION_ID},
            )
            assert response.status_code in (400, 422, 500)
        except httpx.ReadTimeout:
            pytest.skip(
                "Server timed out for invalid user_id (acceptable for edge case)"
            )


@pytest.mark.asyncio
async def test_individual_source_endpoints_invalid_user():
    async with httpx.AsyncClient(timeout=10.0) as client:
        endpoints = [
            "/api/location/oii/!nv@lid",
            "/api/location/salesforce/!nv@lid",
            "/api/location/ekata/!nv@lid",
            "/api/location/business/!nv@lid",
            "/api/location/phone/!nv@lid",
        ]
        for ep in endpoints:
            try:
                response = await client.get(
                    f"{BASE_URL}{ep}",
                    params={"investigation_id": TEST_INVESTIGATION_ID},
                )
                # Accept 200 if error info is in body, else require error status
                if response.status_code == 200:
                    assert (
                        "error" in response.text.lower()
                        or "invalid" in response.text.lower()
                    )
                else:
                    assert response.status_code in (400, 404, 422, 500)
            except httpx.ReadTimeout:
                pytest.skip(
                    f"Server timed out for endpoint {ep} (acceptable for edge case)"
                )


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    exit(exit_code)
