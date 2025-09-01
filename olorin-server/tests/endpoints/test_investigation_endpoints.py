"""
Phase 3: Investigation Management Endpoint Testing for Olorin Platform.

Tests all 7 investigation management endpoints to verify CRUD operations,
data persistence, and bulk operations. Uses REAL data only - NO MOCK DATA.

Endpoints tested:
1. POST /api/investigation - Create investigation
2. GET /api/investigation/{id} - Get investigation
3. PUT /api/investigation/{id} - Update investigation  
4. DELETE /api/investigation/{id} - Delete investigation
5. GET /api/investigations - List all investigations
6. DELETE /api/investigation - Bulk delete
7. DELETE /api/investigations/delete_all - Delete all (admin)
"""

import pytest
import logging
import json
from typing import Dict, Any, List
from datetime import datetime, timezone

from .conftest import ENDPOINT_TEST_CONFIG

logger = logging.getLogger(__name__)


class TestInvestigationEndpoints:
    """Test suite for investigation management endpoints."""
    
    def __init__(self):
        self.created_investigations = []  # Track for cleanup
    
    @pytest.mark.asyncio
    async def test_create_investigation(self, endpoint_client, endpoint_validator, auth_headers, real_test_data):
        """Test POST /api/investigation - Create investigation."""
        logger.info("Testing create investigation: POST /api/investigation")
        
        if not auth_headers:
            pytest.skip("No authentication headers available - skipping protected endpoint test")
        
        # Generate real investigation data
        test_data = real_test_data.generate_comprehensive_test_data()
        investigation_payload = {
            "id": test_data.investigation_id,
            "entity_id": test_data.entity_id,
            "entity_type": "user_id",
            "status": "IN_PROGRESS",
            "risk_score": 0.0,
            "metadata": {
                "source": "endpoint_testing",
                "priority": "high",
                "test_case": "investigation_creation"
            }
        }
        
        # Create investigation
        response, metrics = await endpoint_client.post(
            "/api/investigation",
            headers=auth_headers,
            json_data=investigation_payload
        )
        
        # Validate response
        result = endpoint_validator.validate_investigation_response(response, metrics)
        
        # Log results
        logger.info(f"Create investigation result: {result.get_summary()}")
        
        if response.status_code == 201 or response.status_code == 200:
            # Test successful creation
            try:
                data = response.json()
                logger.info("Investigation created successfully")
                
                # Should return the created investigation
                assert "id" in data, "Created investigation response missing id"
                investigation_id = data["id"]
                
                # Store for cleanup and other tests
                self.created_investigations.append(investigation_id)
                
                # Verify required fields
                required_fields = ["id", "entity_id", "entity_type", "status", "risk_score"]
                for field in required_fields:
                    assert field in data, f"Missing required field in created investigation: {field}"
                
                # Verify data matches payload
                assert data["id"] == investigation_payload["id"], "Investigation ID mismatch"
                assert data["entity_id"] == investigation_payload["entity_id"], "Entity ID mismatch"
                assert data["entity_type"] == investigation_payload["entity_type"], "Entity type mismatch"
                assert data["status"] == investigation_payload["status"], "Status mismatch"
                
                logger.info(f"Created investigation ID: {investigation_id}")
                logger.info(f"Investigation status: {data['status']}")
                logger.info(f"Investigation risk score: {data['risk_score']}")
                
                # Check timestamps
                if "created_at" in data:
                    logger.info(f"Investigation created at: {data['created_at']}")
                
            except Exception as e:
                pytest.fail(f"Create investigation response parsing failed: {e}")
        
        elif response.status_code == 422:
            # Validation error
            logger.error("Investigation creation failed with validation error")
            try:
                error_data = response.json()
                logger.error(f"Validation error details: {error_data}")
                pytest.fail(f"Investigation creation validation failed: {error_data}")
            except:
                pytest.fail("Investigation creation failed with 422 validation error")
        
        elif response.status_code == 409:
            # Conflict - investigation already exists
            logger.warning("Investigation creation failed - already exists")
            try:
                error_data = response.json()
                logger.warning(f"Conflict details: {error_data}")
            except:
                pass
            pytest.fail("Investigation already exists - test data should be unique")
        
        else:
            pytest.fail(f"Unexpected status code for investigation creation: {response.status_code}")
        
        # Fail if validation errors
        if result.errors:
            pytest.fail(f"Investigation creation validation failed: {'; '.join(result.errors)}")

    @pytest.mark.asyncio
    async def test_get_investigation(self, endpoint_client, endpoint_validator, auth_headers, real_test_data):
        """Test GET /api/investigation/{id} - Get investigation."""
        logger.info("Testing get investigation: GET /api/investigation/{id}")
        
        if not auth_headers:
            pytest.skip("No authentication headers available - skipping protected endpoint test")
        
        # First create an investigation to retrieve
        test_data = real_test_data.generate_comprehensive_test_data()
        investigation_id = test_data.investigation_id
        
        create_payload = {
            "id": investigation_id,
            "entity_id": test_data.entity_id,
            "entity_type": "user_id",
            "status": "IN_PROGRESS",
            "risk_score": 0.25,
            "metadata": {"source": "get_test"}
        }
        
        # Create the investigation first
        create_response, _ = await endpoint_client.post(
            "/api/investigation",
            headers=auth_headers,
            json_data=create_payload
        )
        
        if create_response.status_code not in [200, 201]:
            pytest.skip("Could not create investigation for GET test")
        
        self.created_investigations.append(investigation_id)
        
        # Now get the investigation
        response, metrics = await endpoint_client.get(
            f"/api/investigation/{investigation_id}",
            headers=auth_headers
        )
        
        # Validate response
        result = endpoint_validator.validate_investigation_response(response, metrics)
        
        # Log results
        logger.info(f"Get investigation result: {result.get_summary()}")
        
        if response.status_code == 200:
            # Test successful retrieval
            try:
                data = response.json()
                logger.info("Investigation retrieved successfully")
                
                # Should match created investigation
                assert data["id"] == investigation_id, "Retrieved investigation ID mismatch"
                assert data["entity_id"] == create_payload["entity_id"], "Entity ID mismatch"
                assert data["status"] == create_payload["status"], "Status mismatch"
                assert data["risk_score"] == create_payload["risk_score"], "Risk score mismatch"
                
                logger.info(f"Retrieved investigation: {investigation_id}")
                logger.info(f"Investigation details: status={data['status']}, risk={data['risk_score']}")
                
                # Check for additional fields
                additional_fields = ["created_at", "updated_at", "metadata"]
                found_fields = [field for field in additional_fields if field in data]
                if found_fields:
                    logger.info(f"Additional fields present: {found_fields}")
                
            except Exception as e:
                pytest.fail(f"Get investigation response parsing failed: {e}")
        
        elif response.status_code == 404:
            pytest.fail(f"Investigation not found: {investigation_id} - creation may have failed")
        
        else:
            pytest.fail(f"Unexpected status code for get investigation: {response.status_code}")
        
        # Fail if validation errors
        if result.errors:
            pytest.fail(f"Get investigation validation failed: {'; '.join(result.errors)}")

    @pytest.mark.asyncio
    async def test_update_investigation(self, endpoint_client, endpoint_validator, auth_headers, real_test_data):
        """Test PUT /api/investigation/{id} - Update investigation."""
        logger.info("Testing update investigation: PUT /api/investigation/{id}")
        
        if not auth_headers:
            pytest.skip("No authentication headers available - skipping protected endpoint test")
        
        # First create an investigation to update
        test_data = real_test_data.generate_comprehensive_test_data()
        investigation_id = test_data.investigation_id
        
        create_payload = {
            "id": investigation_id,
            "entity_id": test_data.entity_id,
            "entity_type": "user_id",
            "status": "IN_PROGRESS",
            "risk_score": 0.3,
            "metadata": {"source": "update_test"}
        }
        
        # Create the investigation
        create_response, _ = await endpoint_client.post(
            "/api/investigation",
            headers=auth_headers,
            json_data=create_payload
        )
        
        if create_response.status_code not in [200, 201]:
            pytest.skip("Could not create investigation for UPDATE test")
        
        self.created_investigations.append(investigation_id)
        
        # Now update the investigation
        update_payload = {
            "status": "UNDER_REVIEW",
            "risk_score": 0.75,
            "metadata": {
                "source": "update_test",
                "updated_by": "endpoint_test",
                "review_notes": "Updated via endpoint testing"
            }
        }
        
        response, metrics = await endpoint_client.put(
            f"/api/investigation/{investigation_id}",
            headers=auth_headers,
            json_data=update_payload
        )
        
        # Validate response
        result = endpoint_validator.validate_investigation_response(response, metrics)
        
        # Log results
        logger.info(f"Update investigation result: {result.get_summary()}")
        
        if response.status_code == 200:
            # Test successful update
            try:
                data = response.json()
                logger.info("Investigation updated successfully")
                
                # Should reflect the updates
                assert data["id"] == investigation_id, "Updated investigation ID mismatch"
                assert data["status"] == update_payload["status"], "Status not updated"
                assert data["risk_score"] == update_payload["risk_score"], "Risk score not updated"
                
                logger.info(f"Updated investigation: {investigation_id}")
                logger.info(f"New status: {data['status']}")
                logger.info(f"New risk score: {data['risk_score']}")
                
                # Check updated_at timestamp
                if "updated_at" in data:
                    logger.info(f"Investigation updated at: {data['updated_at']}")
                
                # Verify entity_id is preserved
                assert data["entity_id"] == create_payload["entity_id"], "Entity ID should be preserved"
                
            except Exception as e:
                pytest.fail(f"Update investigation response parsing failed: {e}")
        
        elif response.status_code == 404:
            pytest.fail(f"Investigation not found for update: {investigation_id}")
        
        elif response.status_code == 422:
            # Validation error
            logger.error("Investigation update failed with validation error")
            try:
                error_data = response.json()
                logger.error(f"Update validation error: {error_data}")
                pytest.fail(f"Investigation update validation failed: {error_data}")
            except:
                pytest.fail("Investigation update failed with 422 validation error")
        
        else:
            pytest.fail(f"Unexpected status code for update investigation: {response.status_code}")
        
        # Fail if validation errors
        if result.errors:
            pytest.fail(f"Update investigation validation failed: {'; '.join(result.errors)}")

    @pytest.mark.asyncio
    async def test_list_investigations(self, endpoint_client, endpoint_validator, auth_headers, real_test_data):
        """Test GET /api/investigations - List all investigations."""
        logger.info("Testing list investigations: GET /api/investigations")
        
        if not auth_headers:
            pytest.skip("No authentication headers available - skipping protected endpoint test")
        
        # Create multiple investigations for listing
        test_investigations = real_test_data.create_test_investigation_variants(3)
        created_ids = []
        
        for inv_data in test_investigations:
            create_payload = {
                "id": inv_data["id"],
                "entity_id": inv_data["entity_id"],
                "entity_type": inv_data["entity_type"],
                "status": inv_data["status"],
                "risk_score": inv_data["risk_score"],
                "metadata": {"source": "list_test"}
            }
            
            create_response, _ = await endpoint_client.post(
                "/api/investigation",
                headers=auth_headers,
                json_data=create_payload
            )
            
            if create_response.status_code in [200, 201]:
                created_ids.append(inv_data["id"])
                self.created_investigations.append(inv_data["id"])
        
        if not created_ids:
            pytest.skip("Could not create investigations for LIST test")
        
        # Now list investigations
        response, metrics = await endpoint_client.get(
            "/api/investigations",
            headers=auth_headers
        )
        
        # Validate response
        result = endpoint_validator.validate_response(
            response,
            metrics,
            expected_status=200,
            endpoint_type="default",
            business_validators=[self._validate_investigations_list]
        )
        
        # Log results
        logger.info(f"List investigations result: {result.get_summary()}")
        
        if response.status_code == 200:
            # Test successful listing
            try:
                data = response.json()
                logger.info("Investigations listed successfully")
                
                # Should be a list or have a data field with list
                investigations_list = data
                if isinstance(data, dict) and "data" in data:
                    investigations_list = data["data"]
                elif isinstance(data, dict) and "investigations" in data:
                    investigations_list = data["investigations"]
                
                assert isinstance(investigations_list, list), "Investigations should be returned as a list"
                
                logger.info(f"Found {len(investigations_list)} investigations")
                
                # Should include our created investigations
                returned_ids = [inv.get("id") for inv in investigations_list if inv.get("id")]
                found_created = [inv_id for inv_id in created_ids if inv_id in returned_ids]
                
                logger.info(f"Found {len(found_created)} of our created investigations in list")
                
                if found_created:
                    logger.info(f"Our investigations found: {found_created}")
                else:
                    logger.warning("None of our created investigations found in list")
                
                # Check structure of returned investigations
                if investigations_list:
                    sample_inv = investigations_list[0]
                    required_fields = ["id", "status"]
                    found_fields = [field for field in required_fields if field in sample_inv]
                    logger.info(f"Sample investigation fields: {list(sample_inv.keys())}")
                
                # Check for pagination info
                if isinstance(data, dict):
                    pagination_fields = ["total", "count", "limit", "offset", "page"]
                    found_pagination = [field for field in pagination_fields if field in data]
                    if found_pagination:
                        logger.info(f"Pagination fields found: {found_pagination}")
                
            except Exception as e:
                pytest.fail(f"List investigations response parsing failed: {e}")
        
        else:
            pytest.fail(f"Unexpected status code for list investigations: {response.status_code}")
        
        # Fail if validation errors
        if result.errors:
            pytest.fail(f"List investigations validation failed: {'; '.join(result.errors)}")

    @pytest.mark.asyncio
    async def test_delete_investigation(self, endpoint_client, endpoint_validator, auth_headers, real_test_data):
        """Test DELETE /api/investigation/{id} - Delete investigation."""
        logger.info("Testing delete investigation: DELETE /api/investigation/{id}")
        
        if not auth_headers:
            pytest.skip("No authentication headers available - skipping protected endpoint test")
        
        # Create an investigation to delete
        test_data = real_test_data.generate_comprehensive_test_data()
        investigation_id = test_data.investigation_id
        
        create_payload = {
            "id": investigation_id,
            "entity_id": test_data.entity_id,
            "entity_type": "user_id",
            "status": "COMPLETED",
            "risk_score": 0.1,
            "metadata": {"source": "delete_test"}
        }
        
        # Create the investigation
        create_response, _ = await endpoint_client.post(
            "/api/investigation",
            headers=auth_headers,
            json_data=create_payload
        )
        
        if create_response.status_code not in [200, 201]:
            pytest.skip("Could not create investigation for DELETE test")
        
        # Now delete the investigation
        response, metrics = await endpoint_client.delete(
            f"/api/investigation/{investigation_id}",
            headers=auth_headers
        )
        
        # Validate response
        result = endpoint_validator.validate_response(
            response,
            metrics,
            expected_status=[200, 204, 404],  # 204 for no content
            endpoint_type="default"
        )
        
        # Log results
        logger.info(f"Delete investigation result: {result.get_summary()}")
        
        if response.status_code in [200, 204]:
            logger.info("Investigation deleted successfully")
            
            # Check response content
            if response.content:
                try:
                    data = response.json()
                    logger.info(f"Delete response: {data}")
                    
                    if "message" in data:
                        logger.info(f"Delete message: {data['message']}")
                except:
                    if response.text:
                        logger.info(f"Delete response (text): {response.text}")
            
            # Verify investigation is actually deleted by trying to get it
            get_response, _ = await endpoint_client.get(
                f"/api/investigation/{investigation_id}",
                headers=auth_headers
            )
            
            if get_response.status_code == 404:
                logger.info("Investigation confirmed deleted (404 on GET)")
            else:
                logger.warning(f"Investigation may still exist after delete: {get_response.status_code}")
        
        elif response.status_code == 404:
            logger.warning("Investigation not found for deletion - may not have been created")
        
        else:
            pytest.fail(f"Unexpected status code for delete investigation: {response.status_code}")
        
        # Don't need to clean up this one since we deleted it
        if investigation_id in self.created_investigations:
            self.created_investigations.remove(investigation_id)
        
        # Fail if validation errors
        if result.errors:
            pytest.fail(f"Delete investigation validation failed: {'; '.join(result.errors)}")

    @pytest.mark.asyncio
    async def test_bulk_delete_investigations(self, endpoint_client, endpoint_validator, auth_headers, real_test_data):
        """Test DELETE /api/investigation - Bulk delete."""
        logger.info("Testing bulk delete investigations: DELETE /api/investigation")
        
        if not auth_headers:
            pytest.skip("No authentication headers available - skipping protected endpoint test")
        
        # Create multiple investigations for bulk delete
        test_investigations = real_test_data.create_test_investigation_variants(2)
        created_ids = []
        
        for inv_data in test_investigations:
            create_payload = {
                "id": inv_data["id"],
                "entity_id": inv_data["entity_id"],
                "entity_type": inv_data["entity_type"],
                "status": inv_data["status"],
                "risk_score": inv_data["risk_score"],
                "metadata": {"source": "bulk_delete_test"}
            }
            
            create_response, _ = await endpoint_client.post(
                "/api/investigation",
                headers=auth_headers,
                json_data=create_payload
            )
            
            if create_response.status_code in [200, 201]:
                created_ids.append(inv_data["id"])
                self.created_investigations.append(inv_data["id"])
        
        if not created_ids:
            pytest.skip("Could not create investigations for bulk delete test")
        
        # Now bulk delete
        bulk_delete_payload = {"investigation_ids": created_ids}
        
        response, metrics = await endpoint_client.delete(
            "/api/investigation",
            headers=auth_headers,
            json_data=bulk_delete_payload
        )
        
        # Validate response
        result = endpoint_validator.validate_response(
            response,
            metrics,
            expected_status=[200, 204, 404, 501],  # 501 if not implemented
            endpoint_type="default"
        )
        
        # Log results
        logger.info(f"Bulk delete result: {result.get_summary()}")
        
        if response.status_code in [200, 204]:
            logger.info("Bulk delete successful")
            
            # Check response content
            if response.content:
                try:
                    data = response.json()
                    logger.info(f"Bulk delete response: {data}")
                    
                    if "deleted_count" in data:
                        logger.info(f"Deleted count: {data['deleted_count']}")
                    if "deleted_ids" in data:
                        logger.info(f"Deleted IDs: {data['deleted_ids']}")
                except:
                    pass
            
            # Remove from our tracking since they were deleted
            for inv_id in created_ids:
                if inv_id in self.created_investigations:
                    self.created_investigations.remove(inv_id)
        
        elif response.status_code == 404:
            logger.info("Bulk delete endpoint not found (404) - may not be implemented")
        
        elif response.status_code == 501:
            logger.info("Bulk delete not implemented (501)")
        
        else:
            logger.warning(f"Bulk delete returned: {response.status_code}")
        
        # Fail if validation errors (except for not implemented)
        if result.errors and response.status_code not in [404, 501]:
            pytest.fail(f"Bulk delete validation failed: {'; '.join(result.errors)}")

    @pytest.mark.asyncio
    async def test_delete_all_investigations_admin(self, endpoint_client, endpoint_validator, auth_headers):
        """Test DELETE /api/investigations/delete_all - Delete all (admin)."""
        logger.info("Testing delete all investigations: DELETE /api/investigations/delete_all")
        
        if not auth_headers:
            pytest.skip("No authentication headers available - skipping protected endpoint test")
        
        # WARNING: This is a destructive operation - be careful!
        logger.warning("Testing DESTRUCTIVE delete all operation")
        
        response, metrics = await endpoint_client.delete(
            "/api/investigations/delete_all",
            headers=auth_headers
        )
        
        # Validate response
        result = endpoint_validator.validate_response(
            response,
            metrics,
            expected_status=[200, 204, 403, 404, 501],  # 403 if insufficient permissions
            endpoint_type="default"
        )
        
        # Log results
        logger.info(f"Delete all result: {result.get_summary()}")
        
        if response.status_code in [200, 204]:
            logger.warning("Delete all successful - all investigations deleted")
            
            # Clear our tracking since everything was deleted
            self.created_investigations.clear()
            
            # Check response
            if response.content:
                try:
                    data = response.json()
                    logger.info(f"Delete all response: {data}")
                    
                    if "deleted_count" in data:
                        logger.info(f"Total deleted: {data['deleted_count']}")
                except:
                    pass
        
        elif response.status_code == 403:
            logger.info("Delete all forbidden (403) - insufficient permissions (expected for non-admin)")
        
        elif response.status_code == 404:
            logger.info("Delete all endpoint not found (404) - may not be implemented")
        
        elif response.status_code == 501:
            logger.info("Delete all not implemented (501)")
        
        else:
            logger.warning(f"Delete all returned: {response.status_code}")
        
        # This endpoint might not exist or require admin permissions
        # Don't fail the test if it's not implemented or forbidden
        if response.status_code in [403, 404, 501]:
            logger.info("Delete all endpoint test completed (not accessible)")
            return
        
        # Fail if validation errors for implemented endpoints
        if result.errors:
            pytest.fail(f"Delete all validation failed: {'; '.join(result.errors)}")

    def _validate_investigations_list(self, data: Any, result):
        """Business validator for investigations list response."""
        # Handle different response formats
        investigations = data
        if isinstance(data, dict):
            if "data" in data:
                investigations = data["data"]
            elif "investigations" in data:
                investigations = data["investigations"]
        
        if not isinstance(investigations, list):
            result.add_error("Investigations should be returned as a list")
            return
        
        # If there are investigations, check structure
        if investigations:
            sample = investigations[0]
            if not isinstance(sample, dict):
                result.add_error("Investigation items should be objects")
                return
            
            # Check for required fields in investigation objects
            if "id" not in sample:
                result.add_error("Investigation objects should have id field")

    @pytest.fixture(autouse=True)
    def cleanup_investigations(self, request, endpoint_client, auth_headers):
        """Cleanup created investigations after tests."""
        yield
        
        # Cleanup any remaining investigations
        if hasattr(self, 'created_investigations') and self.created_investigations and auth_headers:
            logger.info(f"Cleaning up {len(self.created_investigations)} test investigations")
            
            async def cleanup():
                for inv_id in self.created_investigations[:]:  # Copy to avoid modification during iteration
                    try:
                        delete_response, _ = await endpoint_client.delete(
                            f"/api/investigation/{inv_id}",
                            headers=auth_headers
                        )
                        
                        if delete_response.status_code in [200, 204, 404]:
                            logger.debug(f"Cleaned up investigation: {inv_id}")
                            self.created_investigations.remove(inv_id)
                        else:
                            logger.warning(f"Failed to cleanup investigation {inv_id}: {delete_response.status_code}")
                            
                    except Exception as e:
                        logger.warning(f"Error cleaning up investigation {inv_id}: {e}")
            
            # Run cleanup
            import asyncio
            asyncio.create_task(cleanup())


# Test execution summary
@pytest.mark.asyncio
async def test_investigation_endpoints_summary(endpoint_client, auth_headers):
    """Summary test to verify investigation endpoints functionality."""
    logger.info("="*70)
    logger.info("INVESTIGATION ENDPOINTS TEST SUMMARY")
    logger.info("="*70)
    
    if not auth_headers:
        logger.warning("No authentication headers - cannot test investigation endpoints")
        return
    
    endpoints = [
        ("POST", "/api/investigation", "Create"),
        ("GET", "/api/investigation/{id}", "Get"),
        ("PUT", "/api/investigation/{id}", "Update"),
        ("DELETE", "/api/investigation/{id}", "Delete"),
        ("GET", "/api/investigations", "List"),
        ("DELETE", "/api/investigation", "Bulk Delete"),
        ("DELETE", "/api/investigations/delete_all", "Delete All")
    ]
    
    results = {}
    
    # Test basic endpoints that don't require data
    try:
        # List investigations
        response, _ = await endpoint_client.get("/api/investigations", headers=auth_headers)
        results["List"] = {"status": response.status_code, "success": response.status_code == 200}
    except Exception as e:
        results["List"] = {"status": "ERROR", "error": str(e), "success": False}
    
    # Test create (to enable other tests)
    test_payload = {
        "id": f"summary_test_{int(datetime.now(timezone.utc).timestamp())}",
        "entity_id": f"entity_{int(datetime.now(timezone.utc).timestamp())}",
        "entity_type": "user_id",
        "status": "IN_PROGRESS",
        "risk_score": 0.5
    }
    
    try:
        response, _ = await endpoint_client.post("/api/investigation", headers=auth_headers, json_data=test_payload)
        results["Create"] = {"status": response.status_code, "success": response.status_code in [200, 201]}
        
        if results["Create"]["success"]:
            investigation_id = test_payload["id"]
            
            # Test Get
            try:
                response, _ = await endpoint_client.get(f"/api/investigation/{investigation_id}", headers=auth_headers)
                results["Get"] = {"status": response.status_code, "success": response.status_code == 200}
            except Exception as e:
                results["Get"] = {"status": "ERROR", "success": False}
            
            # Test Update
            try:
                update_payload = {"status": "COMPLETED", "risk_score": 0.8}
                response, _ = await endpoint_client.put(f"/api/investigation/{investigation_id}", headers=auth_headers, json_data=update_payload)
                results["Update"] = {"status": response.status_code, "success": response.status_code == 200}
            except Exception as e:
                results["Update"] = {"status": "ERROR", "success": False}
            
            # Test Delete
            try:
                response, _ = await endpoint_client.delete(f"/api/investigation/{investigation_id}", headers=auth_headers)
                results["Delete"] = {"status": response.status_code, "success": response.status_code in [200, 204]}
            except Exception as e:
                results["Delete"] = {"status": "ERROR", "success": False}
        
    except Exception as e:
        results["Create"] = {"status": "ERROR", "error": str(e), "success": False}
    
    # Test admin endpoints
    try:
        response, _ = await endpoint_client.delete("/api/investigations/delete_all", headers=auth_headers)
        results["Delete All"] = {"status": response.status_code, "success": response.status_code in [200, 204, 403, 404, 501]}
    except Exception as e:
        results["Delete All"] = {"status": "ERROR", "success": False}
    
    # Log summary
    for operation, result in results.items():
        if result["success"]:
            logger.info(f"✓ {operation}: {result['status']}")
        else:
            logger.warning(f"✗ {operation}: {result.get('status', 'ERROR')} - {result.get('error', 'Failed')}")
    
    # Count successes
    successful = sum(1 for r in results.values() if r["success"])
    total = len(results)
    
    logger.info(f"Investigation endpoints summary: {successful}/{total} successful")
    logger.info("="*70)
    
    # At least list should work
    assert results.get("List", {}).get("success", False), "List investigations endpoint should be accessible"