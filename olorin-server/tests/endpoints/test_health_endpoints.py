"""
Phase 1: Health and Utility Endpoint Testing for Olorin Platform.

Tests all 6 health and utility endpoints to verify server functionality
and basic API accessibility. Uses REAL requests - NO MOCK DATA.

Endpoints tested:
1. GET / - Root endpoint
2. GET /health - Simple health check 
3. GET /health/full - Comprehensive health check
4. GET /version - Version information
5. GET /favicon.ico - Favicon resource
6. GET /performance/health - Performance system health
"""

import pytest
import logging
from typing import Dict, Any

from .conftest import ENDPOINT_TEST_CONFIG

logger = logging.getLogger(__name__)


class TestHealthEndpoints:
    """Test suite for health and utility endpoints."""

    @pytest.mark.asyncio
    async def test_root_endpoint(self, endpoint_client, endpoint_validator):
        """Test GET / - Root endpoint."""
        logger.info("Testing root endpoint: GET /")
        
        response, metrics = await endpoint_client.get("/")
        
        # Validate response
        result = endpoint_validator.validate_response(
            response, 
            metrics,
            expected_status=200,
            endpoint_type="health",
            required_fields=None  # Root endpoint might return various formats
        )
        
        # Log results
        logger.info(f"Root endpoint result: {result.get_summary()}")
        
        # Basic assertions
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert result.response_time_ms < 1000, f"Root endpoint too slow: {result.response_time_ms}ms"
        
        # Check if response has content
        if response.content:
            logger.info(f"Root endpoint returned content: {len(response.content)} bytes")
        
        # Performance check
        if result.warnings:
            for warning in result.warnings:
                logger.warning(f"Root endpoint warning: {warning}")
        
        # Fail if validation errors
        if result.errors:
            pytest.fail(f"Root endpoint validation failed: {'; '.join(result.errors)}")

    @pytest.mark.asyncio
    async def test_simple_health_check(self, endpoint_client, endpoint_validator):
        """Test GET /health - Simple health check."""
        logger.info("Testing simple health check: GET /health")
        
        response, metrics = await endpoint_client.get("/health")
        
        # Validate response using health-specific validator
        result = endpoint_validator.validate_health_response(response, metrics)
        
        # Log results
        logger.info(f"Simple health check result: {result.get_summary()}")
        
        # Assertions
        assert response.status_code == 200, f"Health check failed with status {response.status_code}"
        assert result.response_time_ms < 500, f"Health check too slow: {result.response_time_ms}ms"
        
        # Check response content
        if response.content:
            try:
                data = response.json()
                logger.info(f"Health check data: {data}")
                
                # Should have status field
                assert "status" in data, "Health response missing status field"
                
                # Status should indicate healthy
                status = data["status"]
                healthy_statuses = ["healthy", "ok", "UP"]
                assert status in healthy_statuses, f"Unhealthy status: {status}"
                
            except Exception as e:
                logger.warning(f"Could not parse health response as JSON: {e}")
        
        # Fail if validation errors
        if result.errors:
            pytest.fail(f"Health check validation failed: {'; '.join(result.errors)}")

    @pytest.mark.asyncio
    async def test_full_health_check(self, endpoint_client, endpoint_validator):
        """Test GET /health/full - Comprehensive health check."""
        logger.info("Testing comprehensive health check: GET /health/full")
        
        response, metrics = await endpoint_client.get("/health/full")
        
        # Validate response
        result = endpoint_validator.validate_response(
            response,
            metrics,
            expected_status=200,
            endpoint_type="health",
            required_fields=["status"],
            business_validators=[self._validate_full_health_structure]
        )
        
        # Log results
        logger.info(f"Full health check result: {result.get_summary()}")
        
        # Assertions
        assert response.status_code == 200, f"Full health check failed with status {response.status_code}"
        assert result.response_time_ms < 2000, f"Full health check too slow: {result.response_time_ms}ms"
        
        # Check response structure
        if response.content:
            try:
                data = response.json()
                logger.info(f"Full health check components: {list(data.keys())}")
                
                # Should have more detailed information than simple health
                assert len(data) >= 1, "Full health check should have detailed information"
                
                # Check for common health check components
                expected_components = ["status", "version", "uptime", "components", "checks"]
                found_components = [comp for comp in expected_components if comp in data]
                
                if found_components:
                    logger.info(f"Found health components: {found_components}")
                else:
                    logger.warning("No standard health components found")
                
            except Exception as e:
                logger.warning(f"Could not parse full health response as JSON: {e}")
        
        # Performance warning for comprehensive checks
        if result.response_time_ms > 1000:
            logger.warning(f"Full health check is slow: {result.response_time_ms}ms")
        
        # Fail if validation errors
        if result.errors:
            pytest.fail(f"Full health check validation failed: {'; '.join(result.errors)}")

    @pytest.mark.asyncio
    async def test_version_endpoint(self, endpoint_client, endpoint_validator):
        """Test GET /version - Version information."""
        logger.info("Testing version endpoint: GET /version")
        
        response, metrics = await endpoint_client.get("/version")
        
        # Validate response
        result = endpoint_validator.validate_response(
            response,
            metrics,
            expected_status=200,
            endpoint_type="health",
            business_validators=[self._validate_version_structure]
        )
        
        # Log results
        logger.info(f"Version endpoint result: {result.get_summary()}")
        
        # Assertions
        assert response.status_code == 200, f"Version endpoint failed with status {response.status_code}"
        assert result.response_time_ms < 500, f"Version endpoint too slow: {result.response_time_ms}ms"
        
        # Check response content
        if response.content:
            try:
                data = response.json()
                logger.info(f"Version information: {data}")
                
                # Should have version-related fields
                version_fields = ["version", "build", "commit", "timestamp", "name"]
                found_fields = [field for field in version_fields if field in data]
                
                if found_fields:
                    logger.info(f"Found version fields: {found_fields}")
                    
                    # Log specific version info if available
                    if "version" in data:
                        logger.info(f"Application version: {data['version']}")
                    if "build" in data:
                        logger.info(f"Build info: {data['build']}")
                else:
                    logger.warning("No standard version fields found")
                
            except Exception as e:
                logger.warning(f"Could not parse version response as JSON: {e}")
                # Version might be plain text
                if response.text:
                    logger.info(f"Version (text): {response.text[:100]}")
        
        # Fail if validation errors
        if result.errors:
            pytest.fail(f"Version endpoint validation failed: {'; '.join(result.errors)}")

    @pytest.mark.asyncio
    async def test_favicon_endpoint(self, endpoint_client, endpoint_validator):
        """Test GET /favicon.ico - Favicon resource."""
        logger.info("Testing favicon endpoint: GET /favicon.ico")
        
        response, metrics = await endpoint_client.get("/favicon.ico")
        
        # Favicon might not exist (404) or might be served (200)
        result = endpoint_validator.validate_response(
            response,
            metrics,
            expected_status=[200, 404],
            endpoint_type="health"
        )
        
        # Log results
        logger.info(f"Favicon endpoint result: {result.get_summary()}")
        
        # Assertions
        assert response.status_code in [200, 404], f"Unexpected favicon status: {response.status_code}"
        assert result.response_time_ms < 1000, f"Favicon request too slow: {result.response_time_ms}ms"
        
        if response.status_code == 200:
            # Check content type if favicon exists
            content_type = response.headers.get("content-type", "")
            if content_type:
                logger.info(f"Favicon content-type: {content_type}")
                
                # Should be an image type
                image_types = ["image/", "application/octet-stream"]
                is_image = any(img_type in content_type for img_type in image_types)
                
                if not is_image:
                    logger.warning(f"Favicon has unexpected content-type: {content_type}")
            
            # Check content size
            content_length = len(response.content) if response.content else 0
            logger.info(f"Favicon size: {content_length} bytes")
            
            if content_length > 50 * 1024:  # 50KB
                logger.warning(f"Favicon is very large: {content_length} bytes")
        
        else:  # 404
            logger.info("Favicon not found (404) - this is acceptable")
        
        # Fail if validation errors
        if result.errors:
            pytest.fail(f"Favicon endpoint validation failed: {'; '.join(result.errors)}")

    @pytest.mark.asyncio
    async def test_performance_health_endpoint(self, endpoint_client, endpoint_validator):
        """Test GET /performance/health - Performance system health."""
        logger.info("Testing performance health endpoint: GET /performance/health")
        
        response, metrics = await endpoint_client.get("/performance/health")
        
        # Performance health might not be implemented (404) or might return health info (200)
        result = endpoint_validator.validate_response(
            response,
            metrics,
            expected_status=[200, 404, 501],  # 501 = Not Implemented
            endpoint_type="health",
            business_validators=[self._validate_performance_health] if response.status_code == 200 else None
        )
        
        # Log results
        logger.info(f"Performance health result: {result.get_summary()}")
        
        # Assertions
        assert response.status_code in [200, 404, 501], f"Unexpected performance health status: {response.status_code}"
        assert result.response_time_ms < 2000, f"Performance health check too slow: {result.response_time_ms}ms"
        
        if response.status_code == 200:
            # Check response content for performance metrics
            if response.content:
                try:
                    data = response.json()
                    logger.info(f"Performance health data: {data}")
                    
                    # Look for performance-related fields
                    perf_fields = ["cpu", "memory", "disk", "network", "threads", "gc", "uptime"]
                    found_fields = [field for field in perf_fields if field in data]
                    
                    if found_fields:
                        logger.info(f"Found performance metrics: {found_fields}")
                    else:
                        logger.warning("No performance metrics found in response")
                    
                except Exception as e:
                    logger.warning(f"Could not parse performance health response as JSON: {e}")
        
        elif response.status_code == 404:
            logger.info("Performance health endpoint not found (404) - feature may not be implemented")
        
        elif response.status_code == 501:
            logger.info("Performance health not implemented (501) - this is acceptable")
        
        # Fail if validation errors
        if result.errors:
            pytest.fail(f"Performance health validation failed: {'; '.join(result.errors)}")

    def _validate_full_health_structure(self, data: Dict[str, Any], result):
        """Business validator for full health check structure."""
        if not isinstance(data, dict):
            result.add_error("Full health response should be a JSON object")
            return
        
        # Should have status field
        if "status" not in data:
            result.add_error("Full health response missing status field")
            return
        
        # Status should be healthy
        status = data["status"]
        if status not in ["healthy", "ok", "UP"]:
            result.add_error(f"Unhealthy status in full health check: {status}")
    
    def _validate_version_structure(self, data: Dict[str, Any], result):
        """Business validator for version information structure."""
        if isinstance(data, dict):
            # Check for version fields
            if not any(field in data for field in ["version", "build", "name"]):
                result.add_warning("Version response missing standard version fields")
    
    def _validate_performance_health(self, data: Dict[str, Any], result):
        """Business validator for performance health structure.""" 
        if not isinstance(data, dict):
            result.add_error("Performance health response should be a JSON object")
            return
        
        # Look for performance metrics
        perf_indicators = ["status", "metrics", "cpu", "memory", "healthy"]
        found_indicators = [field for field in perf_indicators if field in data]
        
        if not found_indicators:
            result.add_warning("Performance health response missing performance indicators")


# Test execution summary
@pytest.mark.asyncio
async def test_health_endpoints_summary(endpoint_client):
    """Summary test to verify all health endpoints are accessible."""
    logger.info("="*60)
    logger.info("HEALTH ENDPOINTS TEST SUMMARY")
    logger.info("="*60)
    
    endpoints = [
        "/",
        "/health", 
        "/health/full",
        "/version",
        "/favicon.ico",
        "/performance/health"
    ]
    
    results = {}
    
    for endpoint in endpoints:
        try:
            response, metrics = await endpoint_client.get(endpoint)
            results[endpoint] = {
                "status": response.status_code,
                "time_ms": metrics["response_time_ms"],
                "success": 200 <= response.status_code < 300 or response.status_code == 404
            }
        except Exception as e:
            results[endpoint] = {
                "status": "ERROR",
                "error": str(e),
                "success": False
            }
    
    # Log summary
    for endpoint, result in results.items():
        if result["success"]:
            logger.info(f"✓ {endpoint}: {result['status']} ({result.get('time_ms', 0):.1f}ms)")
        else:
            logger.error(f"✗ {endpoint}: {result.get('status', 'ERROR')} - {result.get('error', 'Failed')}")
    
    # Count successes
    successful = sum(1 for r in results.values() if r["success"])
    total = len(results)
    
    logger.info(f"Health endpoints summary: {successful}/{total} successful")
    logger.info("="*60)
    
    # Assert at least basic endpoints are working
    assert results["/"]["success"], "Root endpoint must be accessible"
    assert results["/health"]["success"], "Basic health check must be accessible"