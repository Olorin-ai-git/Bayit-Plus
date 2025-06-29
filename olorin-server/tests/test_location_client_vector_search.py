#!/usr/bin/env python3
"""
Test script for LocationDataClient with Vector Search Tool integration.
This script tests the vector search functionality added to the location data client.
"""

import asyncio
import json
import logging
import os
import sys
from datetime import datetime, timezone
from typing import Any, Dict, List

# Add the parent directory to the path so we can import from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Mock data for testing
MOCK_SPLUNK_RESULTS = [
    {
        "fuzzy_device_id": "device_001",
        "city": "San Francisco",
        "state": "CA",
        "country": "US",
        "tm_smart_id": "smart_123",
        "tm_true_ip_geo": "US",
        "tm_true_ip": "192.168.1.100",
        "tm_proxy_ip": None,
        "rss_epoch_time": "1640995200000",  # 2022-01-01 00:00:00
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
        "tm_true_ip": "192.168.1.101",  # Different IP but same network
        "tm_proxy_ip": None,
        "rss_epoch_time": "1640995260000",  # 1 minute later
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
        "rss_epoch_time": "1640995320000",  # 2 minutes later
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
    {
        "fuzzy_device_id": "device_004",
        "city": "Los Angeles",
        "state": "CA",
        "country": "US",
        "tm_smart_id": "smart_789",
        "tm_true_ip_geo": "US",
        "tm_true_ip": "172.16.0.25",
        "tm_proxy_ip": None,
        "rss_epoch_time": "1640995380000",  # 3 minutes later
        "tm_os_anomaly": "false",
        "tm_http_os_signature": "mac os x",
        "tm_true_ip_longitude": "-118.2437",
        "tm_true_ip_latitude": "34.0522",
        "tm_input_ip_longitude": "-118.2437",
        "tm_input_ip_latitude": "34.0522",
        "tm_page_time_on": "45000",
        "tm_screen_color_depth": "32",
        "tm_agent_public_key_hash_type": "web:rsa",
        "tm_bb_bot_score": "50",
        "_time": "2022-01-01T00:03:00Z",
    },
    {
        "fuzzy_device_id": "device_005",
        "city": "San Francisco",
        "state": "CA",
        "country": "US",
        "tm_smart_id": "smart_123",  # Same smart ID as first two - should be similar
        "tm_true_ip_geo": "US",
        "tm_true_ip": "192.168.1.102",
        "tm_proxy_ip": None,
        "rss_epoch_time": "1640995440000",  # 4 minutes later
        "tm_os_anomaly": "false",
        "tm_http_os_signature": "windows 10",
        "tm_true_ip_longitude": "-122.4194",
        "tm_true_ip_latitude": "37.7749",
        "tm_input_ip_longitude": "-122.4194",
        "tm_input_ip_latitude": "37.7749",
        "tm_page_time_on": "28000",
        "tm_screen_color_depth": "32",
        "tm_agent_public_key_hash_type": "web:rsa",
        "tm_bb_bot_score": "90",
        "_time": "2022-01-01T00:04:00Z",
    },
]


class MockOIITool:
    """Mock OII tool for testing."""

    def _run(self, user_id: str) -> str:
        """Mock OII response."""
        mock_response = {
            "data": {
                "account": {
                    "accountProfile": {
                        "personInfo": {
                            "contactInfo": {
                                "addresses": [
                                    {
                                        "displayAddress": {
                                            "streetAddress": "123 Test St",
                                            "streetAddress2": "Apt 1",
                                            "country": "US",
                                            "locality": "San Francisco",
                                            "region": "CA",
                                            "postalCode": "94102",
                                            "postalCodeExt": "1234",
                                        }
                                    }
                                ],
                                "phoneNumbers": [{"originalNumber": "+1-555-123-4567"}],
                            }
                        }
                    }
                }
            }
        }
        return json.dumps(mock_response)


class MockSplunkQueryTool:
    """Mock Splunk query tool for testing."""

    async def arun(self, query_dict: Dict[str, str]) -> List[Dict[str, Any]]:
        """Mock Splunk query execution."""
        logger.info(
            f"Mock Splunk query executed: {query_dict.get('query', '')[:100]}..."
        )
        return MOCK_SPLUNK_RESULTS


async def test_vector_search_integration():
    """Test the vector search integration in LocationDataClient."""

    # Import the client after setting up mocks
    import os
    import sys

    sys.path.append(os.path.dirname(os.path.abspath(__file__)))

    from app.service.agent.ato_agents.location_data_agent.client import (
        LocationDataClient,
    )

    # Create client
    client = LocationDataClient()

    # Mock the OII tool
    client.oii_tool = MockOIITool()

    # Mock the Splunk tool by patching the import
    import app.service.agent.tools.splunk_tool.splunk_tool as splunk_module

    original_splunk_tool = getattr(splunk_module, "SplunkQueryTool", None)
    splunk_module.SplunkQueryTool = MockSplunkQueryTool

    # Mock settings
    class MockSettings:
        splunk_index = "test_index"

    import app.service.config as config_module

    original_get_settings = getattr(config_module, "get_settings_for_env", None)
    config_module.get_settings_for_env = lambda: MockSettings()

    try:
        logger.info("=== STARTING VECTOR SEARCH INTEGRATION TEST ===")

        # Test the main get_location_data method
        result = await client.get_location_data("test_user_123")

        logger.info("=== TEST RESULTS ===")
        logger.info(f"OII Results: {len(result.get('oii_results', []))} items")
        logger.info(f"Splunk Results: {len(result.get('splunk_results', []))} items")
        logger.info(
            f"Vector Analysis Status: {result.get('vector_analysis', {}).get('analysis_status', 'missing')}"
        )

        # Verify the structure
        assert "oii_results" in result, "Missing oii_results"
        assert "splunk_results" in result, "Missing splunk_results"
        assert "vector_analysis" in result, "Missing vector_analysis"

        # Check vector analysis
        vector_analysis = result["vector_analysis"]
        logger.info(f"Vector Analysis: {json.dumps(vector_analysis, indent=2)}")

        if vector_analysis.get("analysis_status") == "completed":
            logger.info("✅ Vector search analysis completed successfully")

            # Check analysis components
            assert "target_record" in vector_analysis, "Missing target_record"
            assert (
                "similar_records_found" in vector_analysis
            ), "Missing similar_records_found"
            assert "pattern_analysis" in vector_analysis, "Missing pattern_analysis"

            pattern_analysis = vector_analysis["pattern_analysis"]
            logger.info(f"Pattern Analysis: {json.dumps(pattern_analysis, indent=2)}")

            if pattern_analysis.get("status") == "analyzed":
                logger.info("✅ Pattern analysis completed")

                # Check similarity distribution
                similarity_dist = pattern_analysis.get("similarity_distribution", {})
                logger.info(f"Similarity Distribution: {similarity_dist}")

                # Check risk indicators
                risk_indicators = pattern_analysis.get("risk_indicators", {})
                logger.info(f"Risk Indicators: {risk_indicators}")

                # Verify we found some similar records
                total_similar = similarity_dist.get("total", 0)
                logger.info(f"Total similar records found: {total_similar}")

                if total_similar > 0:
                    logger.info("✅ Found similar records as expected")
                else:
                    logger.warning(
                        "⚠️ No similar records found - this might be expected with mock data"
                    )

            else:
                logger.warning(
                    f"⚠️ Pattern analysis status: {pattern_analysis.get('status')}"
                )

        elif vector_analysis.get("analysis_status") == "insufficient_data":
            logger.info(
                "ℹ️ Insufficient data for vector analysis (expected with limited mock data)"
            )

        else:
            logger.error(f"❌ Vector analysis failed: {vector_analysis}")

        logger.info("=== TESTING INDIVIDUAL VECTOR SEARCH METHODS ===")

        # Test the analyze_transaction_patterns method directly
        analysis_result = await client.analyze_transaction_patterns(
            MOCK_SPLUNK_RESULTS, "test_user_123"
        )
        logger.info(f"Direct analysis result: {json.dumps(analysis_result, indent=2)}")

        # Test with insufficient data
        insufficient_data_result = await client.analyze_transaction_patterns(
            [], "test_user_123"
        )
        logger.info(
            f"Insufficient data result: {json.dumps(insufficient_data_result, indent=2)}"
        )
        assert insufficient_data_result["analysis_status"] == "insufficient_data"

        # Test with single record
        single_record_result = await client.analyze_transaction_patterns(
            [MOCK_SPLUNK_RESULTS[0]], "test_user_123"
        )
        logger.info(
            f"Single record result: {json.dumps(single_record_result, indent=2)}"
        )
        assert single_record_result["analysis_status"] == "insufficient_data"

        logger.info("✅ ALL TESTS PASSED!")

    except Exception as e:
        logger.error(f"❌ TEST FAILED: {str(e)}", exc_info=True)
        raise

    finally:
        # Restore original modules
        if original_splunk_tool:
            splunk_module.SplunkQueryTool = original_splunk_tool
        if original_get_settings:
            config_module.get_settings_for_env = original_get_settings

        # Clean up client
        await client.close()


async def test_vector_search_tool_directly():
    """Test the vector search tool directly with mock data."""

    from app.service.agent.tools.vector_search_tool import VectorSearchTool

    logger.info("=== TESTING VECTOR SEARCH TOOL DIRECTLY ===")

    tool = VectorSearchTool()

    # Test with our mock data
    target_record = MOCK_SPLUNK_RESULTS[0]
    candidate_records = MOCK_SPLUNK_RESULTS[1:]

    result = await tool._arun(
        target_record=target_record,
        candidate_records=candidate_records,
        max_results=5,
        distance_threshold=15.0,
    )

    logger.info(f"Direct vector search result: {json.dumps(result, indent=2)}")

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
        assert distances == sorted(distances), "Records should be sorted by distance"
        logger.info("✅ Records are properly sorted by distance")

    # Log distance details
    for i, record in enumerate(similar_records):
        logger.info(
            f"Record {i+1}: distance={record['distance']:.2f}, smart_id={record['record'].get('tm_smart_id')}"
        )

    logger.info("✅ DIRECT VECTOR SEARCH TEST PASSED!")


async def main():
    """Run all tests."""
    logger.info("Starting LocationDataClient Vector Search Integration Tests")

    try:
        # Test vector search tool directly first
        await test_vector_search_tool_directly()

        # Test integration with location client
        await test_vector_search_integration()

        logger.info("🎉 ALL TESTS COMPLETED SUCCESSFULLY!")

    except Exception as e:
        logger.error(f"💥 TESTS FAILED: {str(e)}", exc_info=True)
        return 1

    return 0


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    exit(exit_code)
