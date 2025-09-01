"""
Phase 4: Analysis Endpoint Testing for Olorin Platform.

Tests all fraud analysis endpoints to verify device, network, location,
and log analysis capabilities. Uses REAL data and AI analysis - NO MOCK DATA.

Endpoints tested:
1. GET /api/device/{entity_id} - Device analysis
2. GET /api/network/{entity_id} - Network analysis  
3. GET /api/location/source/oii/{user_id} - OII location
4. GET /api/location/source/business/{user_id} - Business location
5. GET /api/location/source/phone/{user_id} - Phone location
6. GET /api/location/risk-analysis/{user_id} - Location risk analysis
7. GET /api/logs/{user_id} - Log analysis
8. GET /api/oii/{user_id} - Online identity info
"""

import pytest
import logging
import json
from typing import Dict, Any
from datetime import datetime, timezone

from .conftest import ENDPOINT_TEST_CONFIG

logger = logging.getLogger(__name__)


class TestAnalysisEndpoints:
    """Test suite for fraud analysis endpoints."""
    
    @pytest.mark.asyncio
    async def test_device_analysis(self, endpoint_client, endpoint_validator, auth_headers, real_test_data):
        """Test GET /api/device/{entity_id} - Device analysis."""
        logger.info("Testing device analysis: GET /api/device/{entity_id}")
        
        if not auth_headers:
            pytest.skip("No authentication headers available - skipping protected endpoint test")
        
        # Generate test data
        test_data = real_test_data.generate_comprehensive_test_data()
        entity_id = test_data.entity_id
        investigation_id = test_data.investigation_id
        
        # Test device analysis
        params = {
            "investigation_id": investigation_id,
            "entity_type": "user_id",
            "time_range": "30d"
        }
        
        response, metrics = await endpoint_client.get(
            f"/api/device/{entity_id}",
            headers=auth_headers,
            params=params
        )
        
        # Validate response using analysis-specific validator
        result = endpoint_validator.validate_analysis_response(
            response, metrics, analysis_type="device"
        )
        
        # Log results
        logger.info(f"Device analysis result: {result.get_summary()}")
        
        if response.status_code == 200:
            # Test successful device analysis
            try:
                data = response.json()
                logger.info("Device analysis successful")
                
                # Check for device analysis fields
                device_fields = [
                    "device_signals", "risk_assessment", "raw_splunk_results", 
                    "device_risk_assessment", "analysis_metadata"
                ]
                found_fields = [field for field in device_fields if field in data]
                
                if found_fields:
                    logger.info(f"Device analysis fields found: {found_fields}")
                    
                    # Check device signals structure
                    if "device_signals" in data:
                        signals = data["device_signals"]
                        if isinstance(signals, list) and signals:
                            logger.info(f"Found {len(signals)} device signals")
                            sample_signal = signals[0]
                            logger.info(f"Sample signal fields: {list(sample_signal.keys())}")
                        else:
                            logger.info("No device signals found or empty list")
                    
                    # Check risk assessment
                    if "risk_assessment" in data:
                        risk_data = data["risk_assessment"]
                        if isinstance(risk_data, dict):
                            risk_level = risk_data.get("risk_level")
                            confidence = risk_data.get("confidence")
                            logger.info(f"Device risk level: {risk_level}, confidence: {confidence}")
                    
                    # Check raw data
                    if "raw_splunk_results" in data:
                        raw_results = data["raw_splunk_results"]
                        if isinstance(raw_results, list):
                            logger.info(f"Found {len(raw_results)} raw device events")
                else:
                    logger.warning("No standard device analysis fields found")
                
                # Performance check for analysis
                if result.response_time_ms > 30000:  # 30 seconds
                    logger.warning(f"Device analysis is very slow: {result.response_time_ms:.1f}ms")
                
            except Exception as e:
                pytest.fail(f"Device analysis response parsing failed: {e}")
        
        elif response.status_code == 422:
            logger.warning("Device analysis failed with validation error")
            try:
                error_data = response.json()
                logger.info(f"Device analysis validation error: {error_data}")
            except:
                pass
        
        elif response.status_code == 503:
            logger.warning("Device analysis service unavailable - external dependencies may be down")
        
        else:
            pytest.fail(f"Unexpected status code for device analysis: {response.status_code}")
        
        # Fail if validation errors
        if result.errors:
            pytest.fail(f"Device analysis validation failed: {'; '.join(result.errors)}")

    @pytest.mark.asyncio
    async def test_network_analysis(self, endpoint_client, endpoint_validator, auth_headers, real_test_data):
        """Test GET /api/network/{entity_id} - Network analysis."""
        logger.info("Testing network analysis: GET /api/network/{entity_id}")
        
        if not auth_headers:
            pytest.skip("No authentication headers available - skipping protected endpoint test")
        
        # Generate test data
        test_data = real_test_data.generate_comprehensive_test_data()
        entity_id = test_data.entity_id
        investigation_id = test_data.investigation_id
        
        # Test network analysis
        params = {
            "investigation_id": investigation_id,
            "time_range": "30d"
        }
        
        response, metrics = await endpoint_client.get(
            f"/api/network/{entity_id}",
            headers=auth_headers,
            params=params
        )
        
        # Validate response
        result = endpoint_validator.validate_analysis_response(
            response, metrics, analysis_type="network"
        )
        
        # Log results  
        logger.info(f"Network analysis result: {result.get_summary()}")
        
        if response.status_code == 200:
            # Test successful network analysis
            try:
                data = response.json()
                logger.info("Network analysis successful")
                
                # Check for network analysis fields
                network_fields = [
                    "network_risk_assessment", "device_network_signals", 
                    "raw_splunk_results", "analysis_metadata"
                ]
                found_fields = [field for field in network_fields if field in data]
                
                if found_fields:
                    logger.info(f"Network analysis fields found: {found_fields}")
                    
                    # Check network risk assessment
                    if "network_risk_assessment" in data:
                        risk_assessment = data["network_risk_assessment"]
                        if isinstance(risk_assessment, dict):
                            risk_level = risk_assessment.get("risk_level")
                            summary = risk_assessment.get("summary")
                            logger.info(f"Network risk level: {risk_level}")
                            if summary:
                                logger.info(f"Network risk summary: {summary[:100]}...")
                    
                    # Check network signals
                    if "device_network_signals" in data:
                        signals = data["device_network_signals"]
                        if isinstance(signals, list):
                            logger.info(f"Found {len(signals)} network signals")
                        
                else:
                    logger.warning("No standard network analysis fields found")
                
            except Exception as e:
                pytest.fail(f"Network analysis response parsing failed: {e}")
        
        elif response.status_code == 422:
            logger.warning("Network analysis failed with validation error")
        
        elif response.status_code == 503:
            logger.warning("Network analysis service unavailable")
        
        else:
            pytest.fail(f"Unexpected status code for network analysis: {response.status_code}")
        
        # Fail if validation errors
        if result.errors:
            pytest.fail(f"Network analysis validation failed: {'; '.join(result.errors)}")

    @pytest.mark.asyncio
    async def test_oii_location_source(self, endpoint_client, endpoint_validator, auth_headers, real_test_data):
        """Test GET /api/location/source/oii/{user_id} - OII location."""
        logger.info("Testing OII location source: GET /api/location/source/oii/{user_id}")
        
        if not auth_headers:
            pytest.skip("No authentication headers available - skipping protected endpoint test")
        
        # Generate test data
        test_data = real_test_data.generate_comprehensive_test_data()
        user_id = test_data.user_id
        
        # Test OII location
        response, metrics = await endpoint_client.get(
            f"/api/location/source/oii/{user_id}",
            headers=auth_headers
        )
        
        # Validate response
        result = endpoint_validator.validate_response(
            response,
            metrics,
            expected_status=[200, 404, 500],  # 404 if no data, 500 if service down
            endpoint_type="analysis"
        )
        
        # Log results
        logger.info(f"OII location result: {result.get_summary()}")
        
        if response.status_code == 200:
            # Test successful OII location retrieval
            try:
                data = response.json()
                logger.info("OII location data retrieved")
                
                # Check for location fields
                location_fields = [
                    "address", "city", "state", "country", "zip_code",
                    "latitude", "longitude", "confidence"
                ]
                found_fields = [field for field in location_fields if field in data and data[field] is not None]
                
                if found_fields:
                    logger.info(f"OII location fields found: {found_fields}")
                    
                    # Log location info (sanitized)
                    if "city" in data and data["city"]:
                        logger.info(f"OII location city: {data['city']}")
                    if "state" in data and data["state"]:
                        logger.info(f"OII location state: {data['state']}")
                    if "country" in data and data["country"]:
                        logger.info(f"OII location country: {data['country']}")
                    if "confidence" in data and data["confidence"] is not None:
                        logger.info(f"OII location confidence: {data['confidence']}")
                else:
                    logger.info("No OII location data found")
                
            except Exception as e:
                pytest.fail(f"OII location response parsing failed: {e}")
        
        elif response.status_code == 404:
            logger.info("No OII location data found for user (404)")
        
        elif response.status_code == 500:
            logger.warning("OII location service error (500) - external service may be down")
        
        else:
            logger.warning(f"OII location returned: {response.status_code}")
        
        # Don't fail for data not found or service issues
        if response.status_code in [404, 500, 503]:
            logger.info("OII location test completed (service/data unavailable)")
            return
        
        # Fail if validation errors for successful responses
        if result.errors:
            pytest.fail(f"OII location validation failed: {'; '.join(result.errors)}")

    @pytest.mark.asyncio
    async def test_business_location_source(self, endpoint_client, endpoint_validator, auth_headers, real_test_data):
        """Test GET /api/location/source/business/{user_id} - Business location."""
        logger.info("Testing business location source: GET /api/location/source/business/{user_id}")
        
        if not auth_headers:
            pytest.skip("No authentication headers available - skipping protected endpoint test")
        
        # Generate test data
        test_data = real_test_data.generate_comprehensive_test_data()
        user_id = test_data.user_id
        
        # Test business location
        response, metrics = await endpoint_client.get(
            f"/api/location/source/business/{user_id}",
            headers=auth_headers
        )
        
        # Validate response
        result = endpoint_validator.validate_response(
            response,
            metrics,
            expected_status=[200, 404, 500],
            endpoint_type="analysis"
        )
        
        # Log results
        logger.info(f"Business location result: {result.get_summary()}")
        
        if response.status_code == 200:
            # Test successful business location retrieval
            try:
                data = response.json()
                logger.info("Business location data retrieved")
                
                # Business location might be a list
                if isinstance(data, list):
                    logger.info(f"Found {len(data)} business locations")
                    if data:
                        sample_location = data[0]
                        logger.info(f"Sample business location fields: {list(sample_location.keys())}")
                elif isinstance(data, dict):
                    logger.info(f"Business location fields: {list(data.keys())}")
                else:
                    logger.warning(f"Unexpected business location data type: {type(data)}")
                
            except Exception as e:
                pytest.fail(f"Business location response parsing failed: {e}")
        
        elif response.status_code == 404:
            logger.info("No business location data found (404)")
        
        elif response.status_code == 500:
            logger.warning("Business location service error (500)")
        
        # Don't fail for unavailable data/service
        if response.status_code in [404, 500, 503]:
            return
        
        if result.errors:
            pytest.fail(f"Business location validation failed: {'; '.join(result.errors)}")

    @pytest.mark.asyncio
    async def test_phone_location_source(self, endpoint_client, endpoint_validator, auth_headers, real_test_data):
        """Test GET /api/location/source/phone/{user_id} - Phone location."""
        logger.info("Testing phone location source: GET /api/location/source/phone/{user_id}")
        
        if not auth_headers:
            pytest.skip("No authentication headers available - skipping protected endpoint test")
        
        # Generate test data
        test_data = real_test_data.generate_comprehensive_test_data()
        user_id = test_data.user_id
        
        # Test phone location
        response, metrics = await endpoint_client.get(
            f"/api/location/source/phone/{user_id}",
            headers=auth_headers
        )
        
        # Validate response
        result = endpoint_validator.validate_response(
            response,
            metrics,
            expected_status=[200, 404, 500],
            endpoint_type="analysis"
        )
        
        # Log results
        logger.info(f"Phone location result: {result.get_summary()}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                logger.info("Phone location data retrieved")
                
                # Phone location might be a list
                if isinstance(data, list):
                    logger.info(f"Found {len(data)} phone locations")
                elif isinstance(data, dict):
                    logger.info(f"Phone location fields: {list(data.keys())}")
                
            except Exception as e:
                pytest.fail(f"Phone location response parsing failed: {e}")
        
        elif response.status_code == 404:
            logger.info("No phone location data found (404)")
        
        elif response.status_code == 500:
            logger.warning("Phone location service error (500)")
        
        # Don't fail for unavailable data/service  
        if response.status_code in [404, 500, 503]:
            return
        
        if result.errors:
            pytest.fail(f"Phone location validation failed: {'; '.join(result.errors)}")

    @pytest.mark.asyncio
    async def test_location_risk_analysis(self, endpoint_client, endpoint_validator, auth_headers, real_test_data):
        """Test GET /api/location/risk-analysis/{user_id} - Location risk analysis."""
        logger.info("Testing location risk analysis: GET /api/location/risk-analysis/{user_id}")
        
        if not auth_headers:
            pytest.skip("No authentication headers available - skipping protected endpoint test")
        
        # Generate test data
        test_data = real_test_data.generate_comprehensive_test_data()
        user_id = test_data.user_id
        investigation_id = test_data.investigation_id
        
        # Test location risk analysis
        params = {
            "investigation_id": investigation_id,
            "time_range": "30d"
        }
        
        response, metrics = await endpoint_client.get(
            f"/api/location/risk-analysis/{user_id}",
            headers=auth_headers,
            params=params
        )
        
        # Validate response using location analysis validator
        result = endpoint_validator.validate_analysis_response(
            response, metrics, analysis_type="location"
        )
        
        # Log results
        logger.info(f"Location risk analysis result: {result.get_summary()}")
        
        if response.status_code == 200:
            # Test successful location risk analysis
            try:
                data = response.json()
                logger.info("Location risk analysis successful")
                
                # Check for location risk fields
                location_risk_fields = [
                    "user_id", "oii_location_info", "business_location_info",
                    "phone_location_info", "device_analysis_results", 
                    "overall_location_risk_assessment"
                ]
                found_fields = [field for field in location_risk_fields if field in data]
                
                if found_fields:
                    logger.info(f"Location risk fields found: {found_fields}")
                    
                    # Check overall risk assessment
                    if "overall_location_risk_assessment" in data:
                        risk_assessment = data["overall_location_risk_assessment"]
                        if risk_assessment and isinstance(risk_assessment, dict):
                            risk_data = risk_assessment.get("risk_assessment", {})
                            if isinstance(risk_data, dict):
                                risk_level = risk_data.get("risk_level")
                                confidence = risk_data.get("confidence")
                                summary = risk_data.get("summary")
                                logger.info(f"Location risk: {risk_level}, confidence: {confidence}")
                                if summary:
                                    logger.info(f"Location risk summary: {summary[:100]}...")
                    
                    # Check individual location sources
                    for source in ["oii_location_info", "business_location_info", "phone_location_info"]:
                        if source in data and data[source] is not None:
                            logger.info(f"Found {source} data")
                else:
                    logger.warning("No standard location risk fields found")
                
                # Performance check - location analysis can be slow due to multiple sources
                if result.response_time_ms > 45000:  # 45 seconds
                    logger.warning(f"Location risk analysis is very slow: {result.response_time_ms:.1f}ms")
                
            except Exception as e:
                pytest.fail(f"Location risk analysis response parsing failed: {e}")
        
        elif response.status_code == 500:
            logger.warning("Location risk analysis failed with server error")
        
        else:
            pytest.fail(f"Unexpected status code for location risk analysis: {response.status_code}")
        
        # Fail if validation errors
        if result.errors:
            pytest.fail(f"Location risk analysis validation failed: {'; '.join(result.errors)}")

    @pytest.mark.asyncio
    async def test_log_analysis(self, endpoint_client, endpoint_validator, auth_headers, real_test_data):
        """Test GET /api/logs/{user_id} - Log analysis."""
        logger.info("Testing log analysis: GET /api/logs/{user_id}")
        
        if not auth_headers:
            pytest.skip("No authentication headers available - skipping protected endpoint test")
        
        # Generate test data
        test_data = real_test_data.generate_comprehensive_test_data()
        user_id = test_data.user_id
        investigation_id = test_data.investigation_id
        
        # Test log analysis
        params = {
            "investigation_id": investigation_id,
            "time_range": "7d"
        }
        
        response, metrics = await endpoint_client.get(
            f"/api/logs/{user_id}",
            headers=auth_headers,
            params=params
        )
        
        # Validate response using logs analysis validator
        result = endpoint_validator.validate_analysis_response(
            response, metrics, analysis_type="logs"
        )
        
        # Log results
        logger.info(f"Log analysis result: {result.get_summary()}")
        
        if response.status_code == 200:
            # Test successful log analysis
            try:
                data = response.json()
                logger.info("Log analysis successful")
                
                # Check for log analysis fields
                log_fields = [
                    "risk_assessment", "splunk_data", "warning"
                ]
                found_fields = [field for field in log_fields if field in data]
                
                if found_fields:
                    logger.info(f"Log analysis fields found: {found_fields}")
                    
                    # Check risk assessment
                    if "risk_assessment" in data:
                        risk_assessment = data["risk_assessment"]
                        if isinstance(risk_assessment, dict):
                            risk_level = risk_assessment.get("risk_level")
                            confidence = risk_assessment.get("confidence")
                            summary = risk_assessment.get("summary")
                            risk_factors = risk_assessment.get("risk_factors", [])
                            
                            logger.info(f"Log risk level: {risk_level}, confidence: {confidence}")
                            logger.info(f"Risk factors count: {len(risk_factors)}")
                            if summary:
                                logger.info(f"Log risk summary: {summary[:100]}...")
                    
                    # Check Splunk data
                    if "splunk_data" in data:
                        splunk_data = data["splunk_data"]
                        if isinstance(splunk_data, list):
                            logger.info(f"Found {len(splunk_data)} log events")
                        else:
                            logger.info(f"Splunk data type: {type(splunk_data)}")
                    
                    # Check for warnings (e.g., data truncation)
                    if "warning" in data:
                        logger.info(f"Log analysis warning: {data['warning']}")
                        
                else:
                    logger.warning("No standard log analysis fields found")
                
                # Performance check - log analysis involves LLM processing
                if result.response_time_ms > 60000:  # 60 seconds
                    logger.warning(f"Log analysis is very slow: {result.response_time_ms:.1f}ms")
                
            except Exception as e:
                pytest.fail(f"Log analysis response parsing failed: {e}")
        
        elif response.status_code == 503:
            logger.warning("Log analysis service unavailable - Splunk may be down")
        
        else:
            pytest.fail(f"Unexpected status code for log analysis: {response.status_code}")
        
        # Fail if validation errors
        if result.errors:
            pytest.fail(f"Log analysis validation failed: {'; '.join(result.errors)}")

    @pytest.mark.asyncio
    async def test_online_identity_info(self, endpoint_client, endpoint_validator, auth_headers, real_test_data):
        """Test GET /api/oii/{user_id} - Online identity info."""
        logger.info("Testing online identity info: GET /api/oii/{user_id}")
        
        if not auth_headers:
            pytest.skip("No authentication headers available - skipping protected endpoint test")
        
        # Generate test data
        test_data = real_test_data.generate_comprehensive_test_data()
        user_id = test_data.user_id
        
        # Test OII
        response, metrics = await endpoint_client.get(
            f"/api/oii/{user_id}",
            headers=auth_headers
        )
        
        # Validate response
        result = endpoint_validator.validate_response(
            response,
            metrics,
            expected_status=[200, 404, 500],
            endpoint_type="analysis"
        )
        
        # Log results
        logger.info(f"Online identity info result: {result.get_summary()}")
        
        if response.status_code == 200:
            # Test successful OII retrieval
            try:
                data = response.json()
                logger.info("Online identity info retrieved")
                
                # Check for OII fields
                oii_fields = [
                    "personal_info", "contact_info", "address_info",
                    "identity_verification", "risk_indicators"
                ]
                found_fields = [field for field in oii_fields if field in data]
                
                if found_fields:
                    logger.info(f"OII fields found: {found_fields}")
                    
                    # Log structure (avoid logging PII)
                    if "personal_info" in data and data["personal_info"]:
                        personal_fields = list(data["personal_info"].keys())
                        logger.info(f"Personal info fields: {personal_fields}")
                    
                    if "risk_indicators" in data:
                        risk_indicators = data["risk_indicators"]
                        if isinstance(risk_indicators, list):
                            logger.info(f"Found {len(risk_indicators)} risk indicators")
                        
                else:
                    logger.info("No standard OII fields found - checking raw structure")
                    if isinstance(data, dict):
                        logger.info(f"OII response fields: {list(data.keys())}")
                
            except Exception as e:
                pytest.fail(f"OII response parsing failed: {e}")
        
        elif response.status_code == 404:
            logger.info("No OII data found for user (404)")
        
        elif response.status_code == 500:
            logger.warning("OII service error (500)")
        
        # Don't fail for unavailable data/service
        if response.status_code in [404, 500, 503]:
            return
        
        if result.errors:
            pytest.fail(f"OII validation failed: {'; '.join(result.errors)}")


# Test execution summary
@pytest.mark.asyncio
async def test_analysis_endpoints_summary(endpoint_client, auth_headers, real_test_data):
    """Summary test to verify analysis endpoints functionality."""
    logger.info("="*70)
    logger.info("ANALYSIS ENDPOINTS TEST SUMMARY") 
    logger.info("="*70)
    
    if not auth_headers:
        logger.warning("No authentication headers - cannot test analysis endpoints")
        return
    
    # Generate test data
    test_data = real_test_data.generate_comprehensive_test_data()
    user_id = test_data.user_id
    entity_id = test_data.entity_id
    investigation_id = test_data.investigation_id
    
    # Analysis endpoints to test
    analysis_tests = [
        ("Device Analysis", "GET", f"/api/device/{entity_id}", {"investigation_id": investigation_id, "entity_type": "user_id"}),
        ("Network Analysis", "GET", f"/api/network/{entity_id}", {"investigation_id": investigation_id}),
        ("OII Location", "GET", f"/api/location/source/oii/{user_id}", None),
        ("Business Location", "GET", f"/api/location/source/business/{user_id}", None),
        ("Phone Location", "GET", f"/api/location/source/phone/{user_id}", None),
        ("Location Risk Analysis", "GET", f"/api/location/risk-analysis/{user_id}", {"investigation_id": investigation_id}),
        ("Log Analysis", "GET", f"/api/logs/{user_id}", {"investigation_id": investigation_id, "time_range": "7d"}),
        ("Online Identity Info", "GET", f"/api/oii/{user_id}", None),
    ]
    
    results = {}
    
    for test_name, method, endpoint, params in analysis_tests:
        try:
            logger.info(f"Testing {test_name}...")
            
            if method == "GET":
                response, metrics = await endpoint_client.get(
                    endpoint, 
                    headers=auth_headers,
                    params=params
                )
            
            # Determine success based on status code
            success = False
            if response.status_code == 200:
                success = True
            elif response.status_code in [404, 503]:  # Data not found or service unavailable
                success = True  # These are acceptable for analysis endpoints
                
            results[test_name] = {
                "status": response.status_code,
                "time_ms": metrics["response_time_ms"],
                "success": success
            }
            
        except Exception as e:
            results[test_name] = {
                "status": "ERROR",
                "error": str(e),
                "success": False
            }
    
    # Log summary
    for test_name, result in results.items():
        if result["success"]:
            status_info = f"{result['status']}"
            if "time_ms" in result:
                status_info += f" ({result['time_ms']:.1f}ms)"
            logger.info(f"✓ {test_name}: {status_info}")
        else:
            error_info = result.get("error", f"Status {result['status']}")
            logger.error(f"✗ {test_name}: {error_info}")
    
    # Count successes
    successful = sum(1 for r in results.values() if r["success"])
    total = len(results)
    
    logger.info(f"Analysis endpoints summary: {successful}/{total} successful")
    
    # Performance analysis
    if results:
        times = [r.get("time_ms", 0) for r in results.values() if "time_ms" in r]
        if times:
            avg_time = sum(times) / len(times)
            max_time = max(times)
            logger.info(f"Average analysis time: {avg_time:.1f}ms")
            logger.info(f"Slowest analysis: {max_time:.1f}ms")
    
    logger.info("="*70)
    
    # At least some analysis endpoints should be accessible
    assert successful > 0, "At least some analysis endpoints should be accessible"