"""
Integration Tests for Multi-Entity Investigation API Endpoints

Tests for multi-entity investigation REST API endpoints including
request validation, response format, and end-to-end workflows.

Phase 2 Integration Testing: Multi-Entity Investigation API
"""
import pytest
import asyncio
import json
from typing import Dict, Any
from fastapi.testclient import TestClient
from httpx import AsyncClient
from unittest.mock import patch, AsyncMock

# Import FastAPI app and models
from app.main import app
from app.models.multi_entity_investigation import (
    MultiEntityInvestigationRequest,
    MultiEntityInvestigationResult,
    EntityRelationship,
    RelationshipType
)


class TestMultiEntityInvestigationAPIEndpoints:
    """Test multi-entity investigation API endpoints"""
    
    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)
    
    @pytest.fixture
    async def async_client(self):
        """Create async test client"""
        async with AsyncClient(app=app, base_url="http://test") as ac:
            yield ac
    
    @pytest.fixture
    def sample_multi_entity_request(self):
        """Sample multi-entity investigation request"""
        return {
            "entities": [
                {"entity_id": "USER_API_TEST_123", "entity_type": "user"},
                {"entity_id": "TXN_API_TEST_456", "entity_type": "original_tx_id"},
                {"entity_id": "STORE_API_TEST_789", "entity_type": "store_id"}
            ],
            "relationships": [
                {
                    "source_entity_id": "USER_API_TEST_123",
                    "target_entity_id": "TXN_API_TEST_456",
                    "relationship_type": "initiated",
                    "strength": 1.0,
                    "bidirectional": False,
                    "confidence": 0.95
                },
                {
                    "source_entity_id": "TXN_API_TEST_456",
                    "target_entity_id": "STORE_API_TEST_789",
                    "relationship_type": "processed_by",
                    "strength": 0.9,
                    "bidirectional": False,
                    "confidence": 0.8
                }
            ],
            "boolean_logic": "USER_API_TEST_123 AND (TXN_API_TEST_456 OR STORE_API_TEST_789)",
            "investigation_scope": ["device", "location", "network", "logs"],
            "priority": "high",
            "enable_verbose_logging": True,
            "enable_journey_tracking": True,
            "enable_chain_of_thought": True,
            "enable_cross_entity_analysis": True,
            "metadata": {
                "test_case": "api_integration_test",
                "created_by": "pytest"
            }
        }
    
    def test_start_multi_entity_investigation_endpoint(self, client, sample_multi_entity_request):
        """Test starting multi-entity investigation via API"""
        
        # Make request to start investigation
        response = client.post(
            "/v1/autonomous/multi-entity/start",
            json=sample_multi_entity_request
        )
        
        # Validate response
        assert response.status_code == 200
        data = response.json()
        
        # Validate response structure
        assert "investigation_id" in data
        assert "status" in data
        assert "entities" in data
        assert "relationships" in data
        assert "boolean_logic" in data
        assert "started_at" in data
        assert "investigation_timeline" in data
        
        # Validate response data
        assert data["status"] == "in_progress"
        assert len(data["entities"]) == 3
        assert len(data["relationships"]) == 2
        assert data["boolean_logic"] == sample_multi_entity_request["boolean_logic"]
        
        # Validate entities format
        for i, entity in enumerate(data["entities"]):
            assert entity["entity_id"] == sample_multi_entity_request["entities"][i]["entity_id"]
            assert entity["entity_type"] == sample_multi_entity_request["entities"][i]["entity_type"]
        
        # Validate investigation_id format
        investigation_id = data["investigation_id"]
        assert investigation_id.startswith("multi_")
        assert len(investigation_id) > len("multi_")
    
    def test_start_multi_entity_investigation_validation_errors(self, client):
        """Test API validation errors for multi-entity investigation start"""
        
        # Test with insufficient entities (minimum 2 required)
        invalid_request_1 = {
            "entities": [{"entity_id": "USER_123", "entity_type": "user"}]  # Only 1 entity
        }
        
        response = client.post("/v1/autonomous/multi-entity/start", json=invalid_request_1)
        assert response.status_code == 422  # Validation error
        
        # Test with too many entities (maximum 10 allowed)
        entities = [{"entity_id": f"entity_{i}", "entity_type": "user"} for i in range(11)]
        invalid_request_2 = {"entities": entities}
        
        response = client.post("/v1/autonomous/multi-entity/start", json=invalid_request_2)
        assert response.status_code == 422  # Validation error
        
        # Test with invalid priority
        invalid_request_3 = {
            "entities": [
                {"entity_id": "USER_123", "entity_type": "user"},
                {"entity_id": "TXN_456", "entity_type": "transaction"}
            ],
            "priority": "invalid_priority"
        }
        
        response = client.post("/v1/autonomous/multi-entity/start", json=invalid_request_3)
        assert response.status_code == 422  # Validation error
        
        # Test with invalid entity type
        invalid_request_4 = {
            "entities": [
                {"entity_id": "USER_123", "entity_type": "invalid_entity_type"},
                {"entity_id": "TXN_456", "entity_type": "user"}
            ]
        }
        
        response = client.post("/v1/autonomous/multi-entity/start", json=invalid_request_4)
        assert response.status_code == 400  # Bad request (will fail during orchestrator processing)
    
    def test_get_multi_entity_investigation_status_endpoint(self, client, sample_multi_entity_request):
        """Test getting multi-entity investigation status via API"""
        
        # First start an investigation
        start_response = client.post("/v1/autonomous/multi-entity/start", json=sample_multi_entity_request)
        assert start_response.status_code == 200
        investigation_id = start_response.json()["investigation_id"]
        
        # Get status
        status_response = client.get(f"/v1/autonomous/multi-entity/{investigation_id}/status")
        
        if status_response.status_code == 200:
            # Investigation is still active
            data = status_response.json()
            
            assert "investigation_id" in data
            assert "status" in data
            assert "progress_percentage" in data
            assert "total_entities" in data
            assert "started_at" in data
            
            assert data["investigation_id"] == investigation_id
            assert data["status"] == "in_progress"
            assert data["total_entities"] == 3
            
        elif status_response.status_code == 404:
            # Investigation completed quickly and was cleaned up
            # This is acceptable behavior
            assert "not found" in status_response.json()["detail"].lower()
        else:
            pytest.fail(f"Unexpected status code: {status_response.status_code}")
    
    def test_get_multi_entity_investigation_status_not_found(self, client):
        """Test getting status for non-existent investigation"""
        
        response = client.get("/v1/autonomous/multi-entity/non_existent_id/status")
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()
    
    def test_get_multi_entity_investigation_results_endpoint(self, client):
        """Test getting multi-entity investigation results (Phase 2.2 placeholder)"""
        
        response = client.get("/v1/autonomous/multi-entity/test_id/results")
        
        # Should return 501 Not Implemented for Phase 2.1
        assert response.status_code == 501
        assert "Phase 2.2" in response.json()["detail"]
    
    def test_update_multi_entity_relationships_endpoint(self, client):
        """Test updating entity relationships (Phase 2.2 placeholder)"""
        
        relationships = [
            {
                "source_entity_id": "USER_123",
                "target_entity_id": "TXN_456",
                "relationship_type": "initiated",
                "strength": 1.0
            }
        ]
        
        response = client.put(
            "/v1/autonomous/multi-entity/test_id/relationships",
            json=relationships
        )
        
        # Should return 501 Not Implemented for Phase 2.1
        assert response.status_code == 501
        assert "Phase 2.2" in response.json()["detail"]
    
    def test_get_enhanced_entity_types_endpoint(self, client):
        """Test getting enhanced entity types"""
        
        response = client.get("/v1/autonomous/entities/types/enhanced")
        
        assert response.status_code == 200
        data = response.json()
        
        # Validate response structure
        assert "core_entity_types" in data
        assert "transaction_entity_types" in data
        assert "extended_entity_types" in data
        assert "all_entity_types" in data
        assert "total_types" in data
        
        # Validate core entity types
        core_types = data["core_entity_types"]
        assert "device" in core_types
        assert "location" in core_types
        assert "network" in core_types
        assert "user" in core_types
        
        # Validate transaction entity types (Phase 1 additions)
        transaction_types = data["transaction_entity_types"]
        assert "timestamp" in transaction_types
        assert "original_tx_id" in transaction_types
        assert "store_id" in transaction_types
        assert "email_normalized" in transaction_types
        
        # Validate total types count
        assert data["total_types"] > 50  # Should have many entity types
        assert len(data["all_entity_types"]) == data["total_types"]
    
    def test_get_multi_entity_metrics_endpoint(self, client):
        """Test getting multi-entity orchestrator metrics"""
        
        response = client.get("/v1/autonomous/multi-entity/metrics")
        
        assert response.status_code == 200
        data = response.json()
        
        # Validate metrics structure
        assert "total_investigations" in data
        assert "successful_investigations" in data
        assert "failed_investigations" in data
        assert "avg_execution_time_ms" in data
        assert "entities_processed" in data
        assert "active_investigations" in data
        assert "success_rate" in data
        
        # Validate data types
        assert isinstance(data["total_investigations"], int)
        assert isinstance(data["successful_investigations"], int)
        assert isinstance(data["failed_investigations"], int)
        assert isinstance(data["avg_execution_time_ms"], (int, float))
        assert isinstance(data["entities_processed"], int)
        assert isinstance(data["active_investigations"], int)
        assert isinstance(data["success_rate"], (int, float))
    
    def test_health_check_with_multi_entity_features(self, client):
        """Test health check endpoint includes multi-entity features"""
        
        response = client.get("/v1/autonomous/health")
        
        assert response.status_code == 200
        data = response.json()
        
        # Validate health check structure
        assert data["status"] == "healthy"
        assert "router_version" in data
        assert "modules" in data
        assert "features" in data
        assert "multi_entity_investigations" in data
        
        # Validate multi-entity specific additions
        assert "2.1.0" in data["router_version"]  # Version should include multi-entity
        
        modules = data["modules"]
        assert "models.multi_entity_investigation" in modules
        assert "service.agent.multi_entity.investigation_orchestrator" in modules
        
        features = data["features"]
        assert "multi_entity_investigation" in features
        assert "boolean_logic_queries" in features
        assert "cross_entity_analysis" in features
        assert "relationship_insights" in features
        assert "enhanced_entity_types" in features
    
    @pytest.mark.asyncio
    async def test_multi_entity_investigation_request_model_validation(self, async_client):
        """Test multi-entity investigation request model validation"""
        
        # Test valid request
        valid_request = {
            "entities": [
                {"entity_id": "USER_123", "entity_type": "user"},
                {"entity_id": "TXN_456", "entity_type": "original_tx_id"}
            ],
            "boolean_logic": "USER_123 AND TXN_456"
        }
        
        response = await async_client.post("/v1/autonomous/multi-entity/start", json=valid_request)
        assert response.status_code == 200
        
        # Test relationship strength validation
        invalid_strength_request = {
            "entities": [
                {"entity_id": "USER_123", "entity_type": "user"},
                {"entity_id": "TXN_456", "entity_type": "transaction"}
            ],
            "relationships": [
                {
                    "source_entity_id": "USER_123",
                    "target_entity_id": "TXN_456",
                    "relationship_type": "initiated",
                    "strength": 1.5  # Invalid: > 1.0
                }
            ]
        }
        
        response = await async_client.post("/v1/autonomous/multi-entity/start", json=invalid_strength_request)
        assert response.status_code == 422  # Validation error
    
    def test_entity_relationship_enum_values(self, client):
        """Test that relationship type enum values are accepted"""
        
        # Test all RelationshipType enum values
        relationship_types = [
            "occurred_at", "initiated_by", "preceded_by", "followed_by",
            "initiated", "processed_by", "authorized_by", "reviewed_by",
            "associated_with", "belongs_to", "used_by", "accessed_by",
            "merchant_of", "payment_for", "store_of", "event_of",
            "related_to", "connected_to", "derived_from"
        ]
        
        for relationship_type in relationship_types:
            request = {
                "entities": [
                    {"entity_id": "ENTITY_A", "entity_type": "user"},
                    {"entity_id": "ENTITY_B", "entity_type": "transaction"}
                ],
                "relationships": [
                    {
                        "source_entity_id": "ENTITY_A",
                        "target_entity_id": "ENTITY_B",
                        "relationship_type": relationship_type,
                        "strength": 0.8
                    }
                ]
            }
            
            response = client.post("/v1/autonomous/multi-entity/start", json=request)
            assert response.status_code == 200, f"Failed for relationship type: {relationship_type}"
    
    def test_investigation_scope_validation(self, client):
        """Test investigation scope parameter validation"""
        
        # Test valid investigation scopes
        valid_scopes = [
            ["device"],
            ["location"],
            ["network"], 
            ["logs"],
            ["device", "location"],
            ["device", "location", "network", "logs"],
            []  # Empty scope should be allowed
        ]
        
        for scope in valid_scopes:
            request = {
                "entities": [
                    {"entity_id": "USER_123", "entity_type": "user"},
                    {"entity_id": "TXN_456", "entity_type": "transaction"}
                ],
                "investigation_scope": scope
            }
            
            response = client.post("/v1/autonomous/multi-entity/start", json=request)
            assert response.status_code == 200, f"Failed for scope: {scope}"
    
    def test_boolean_logic_parameter(self, client):
        """Test boolean logic parameter handling"""
        
        boolean_expressions = [
            "A AND B",
            "A OR B", 
            "(A AND B) OR C",
            "A AND (B OR C)",
            "NOT A",
            "A",  # Single entity
            "A AND B AND C"  # Multiple entities
        ]
        
        for expression in boolean_expressions:
            request = {
                "entities": [
                    {"entity_id": "A", "entity_type": "user"},
                    {"entity_id": "B", "entity_type": "transaction"},
                    {"entity_id": "C", "entity_type": "store_id"}
                ],
                "boolean_logic": expression
            }
            
            response = client.post("/v1/autonomous/multi-entity/start", json=request)
            assert response.status_code == 200, f"Failed for boolean logic: {expression}"
            
            data = response.json()
            assert data["boolean_logic"] == expression
    
    def test_metadata_handling(self, client):
        """Test metadata parameter handling"""
        
        request_with_metadata = {
            "entities": [
                {"entity_id": "USER_123", "entity_type": "user"},
                {"entity_id": "TXN_456", "entity_type": "transaction"}
            ],
            "metadata": {
                "source": "fraud_detection_system",
                "priority_reason": "high_risk_user",
                "related_case_id": "CASE_789",
                "analyst": "john.doe@company.com",
                "custom_tags": ["suspicious", "multi_device", "location_anomaly"]
            }
        }
        
        response = client.post("/v1/autonomous/multi-entity/start", json=request_with_metadata)
        assert response.status_code == 200
        
        # Metadata should be preserved in the investigation context
        # (Validation of metadata persistence would require additional implementation)
    
    @pytest.mark.asyncio
    async def test_concurrent_multi_entity_investigations(self, async_client):
        """Test handling multiple concurrent multi-entity investigations"""
        
        # Create multiple investigation requests
        requests = []
        for i in range(3):
            request = {
                "entities": [
                    {"entity_id": f"USER_CONCURRENT_{i}", "entity_type": "user"},
                    {"entity_id": f"TXN_CONCURRENT_{i}", "entity_type": "transaction"}
                ],
                "boolean_logic": f"USER_CONCURRENT_{i} AND TXN_CONCURRENT_{i}",
                "priority": "normal"
            }
            requests.append(request)
        
        # Start all investigations concurrently
        tasks = [
            async_client.post("/v1/autonomous/multi-entity/start", json=req)
            for req in requests
        ]
        
        responses = await asyncio.gather(*tasks)
        
        # Validate all investigations started successfully
        investigation_ids = []
        for response in responses:
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "in_progress"
            investigation_ids.append(data["investigation_id"])
        
        # Verify all investigation IDs are unique
        assert len(set(investigation_ids)) == len(investigation_ids)


class TestMultiEntityInvestigationErrorHandling:
    """Test error handling for multi-entity investigation API"""
    
    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)
    
    def test_malformed_json_handling(self, client):
        """Test handling of malformed JSON requests"""
        
        # Send malformed JSON
        response = client.post(
            "/v1/autonomous/multi-entity/start",
            data='{"entities": [{"entity_id": "USER_123", "entity_type": "user"',  # Missing closing braces
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 422  # Unprocessable Entity
    
    def test_missing_required_fields(self, client):
        """Test handling of requests with missing required fields"""
        
        # Missing entities field
        request_missing_entities = {
            "boolean_logic": "A AND B"
        }
        
        response = client.post("/v1/autonomous/multi-entity/start", json=request_missing_entities)
        assert response.status_code == 422
    
    def test_empty_entities_list(self, client):
        """Test handling of empty entities list"""
        
        request_empty_entities = {
            "entities": []
        }
        
        response = client.post("/v1/autonomous/multi-entity/start", json=request_empty_entities)
        assert response.status_code == 422  # Should fail min_items validation
    
    def test_invalid_relationship_references(self, client):
        """Test handling of relationships referencing non-existent entities"""
        
        request_invalid_relationship = {
            "entities": [
                {"entity_id": "USER_123", "entity_type": "user"},
                {"entity_id": "TXN_456", "entity_type": "transaction"}
            ],
            "relationships": [
                {
                    "source_entity_id": "USER_123",
                    "target_entity_id": "NON_EXISTENT_ENTITY",  # Not in entities list
                    "relationship_type": "related_to"
                }
            ]
        }
        
        response = client.post("/v1/autonomous/multi-entity/start", json=request_invalid_relationship)
        assert response.status_code == 400  # Bad request from orchestrator validation
    
    @patch('app.service.agent.multi_entity.investigation_orchestrator.MultiEntityInvestigationOrchestrator.start_multi_entity_investigation')
    def test_orchestrator_exception_handling(self, mock_start_investigation, client):
        """Test handling of orchestrator exceptions"""
        
        # Mock orchestrator to raise exception
        mock_start_investigation.side_effect = Exception("Orchestrator internal error")
        
        valid_request = {
            "entities": [
                {"entity_id": "USER_123", "entity_type": "user"},
                {"entity_id": "TXN_456", "entity_type": "transaction"}
            ]
        }
        
        response = client.post("/v1/autonomous/multi-entity/start", json=valid_request)
        assert response.status_code == 400
        assert "Failed to start investigation" in response.json()["detail"]


if __name__ == "__main__":
    # Run tests with pytest
    pytest.main([__file__, "-v", "--tb=short"])