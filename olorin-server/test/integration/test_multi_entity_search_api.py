"""
Multi-Entity Investigation API Integration Tests

Comprehensive integration tests for multi-entity structured investigation endpoints.
Tests end-to-end functionality including request/response validation and error handling.
"""

import asyncio
import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.service import create_app


class TestMultiEntityInvestigationAPI:
    """Integration tests for multi-entity investigation API endpoints"""

    @pytest.fixture
    def client(self):
        """Create test client"""
        app = create_app()
        return TestClient(app)

    @pytest.fixture
    def sample_multi_entity_request(self):
        """Sample multi-entity investigation request"""
        return {
            "entities": [
                {"entity_id": "user_12345", "entity_type": "user"},
                {"entity_id": "transaction_67890", "entity_type": "transaction_id"},
                {"entity_id": "store_555", "entity_type": "merchant"},
            ],
            "relationships": [
                {
                    "source_entity_id": "user_12345",
                    "target_entity_id": "transaction_67890",
                    "relationship_type": "initiated",
                    "strength": 0.9,
                },
                {
                    "source_entity_id": "transaction_67890",
                    "target_entity_id": "store_555",
                    "relationship_type": "processed_by",
                    "strength": 0.8,
                },
            ],
            "boolean_logic": "(user_12345 AND transaction_67890) OR store_555",
            "investigation_scope": ["device", "location", "network", "logs"],
            "priority": "high",
            "enable_verbose_logging": True,
            "enable_cross_entity_analysis": True,
        }

    def test_start_multi_entity_investigation_success(
        self, client, sample_multi_entity_request
    ):
        """Test successful multi-entity investigation start"""
        with patch(
            "app.service.agent.multi_entity.investigation_orchestrator.get_multi_entity_orchestrator"
        ) as mock_orchestrator:
            # Mock orchestrator response
            mock_instance = AsyncMock()
            mock_orchestrator.return_value = mock_instance
            mock_instance.start_multi_entity_investigation.return_value = {
                "investigation_id": "multi_test123",
                "status": "in_progress",
                "entities": sample_multi_entity_request["entities"],
                "relationships": sample_multi_entity_request["relationships"],
                "boolean_logic": sample_multi_entity_request["boolean_logic"],
                "entity_results": {},
                "cross_entity_analysis": None,
                "overall_risk_assessment": None,
                "investigation_timeline": [],
                "start_time": "2025-01-09T10:00:00Z",
                "total_duration_ms": 0,
            }

            response = client.post(
                "/v1/structured/multi-entity/start", json=sample_multi_entity_request
            )

            assert response.status_code == 200
            data = response.json()

            assert data["investigation_id"] == "multi_test123"
            assert data["status"] == "in_progress"
            assert len(data["entities"]) == 3
            assert len(data["relationships"]) == 2
            assert (
                data["boolean_logic"]
                == "(user_12345 AND transaction_67890) OR store_555"
            )

            # Verify orchestrator was called
            mock_instance.start_multi_entity_investigation.assert_called_once()

    def test_start_multi_entity_investigation_validation_errors(self, client):
        """Test validation errors for invalid requests"""
        # Test missing entities
        response = client.post(
            "/v1/structured/multi-entity/start", json={"entities": []}
        )
        assert response.status_code == 422  # Validation error

        # Test invalid entity structure
        response = client.post(
            "/v1/structured/multi-entity/start",
            json={"entities": [{"invalid": "structure"}]},
        )
        assert response.status_code == 422

        # Test too many entities (>10)
        entities = [
            {"entity_id": f"entity_{i}", "entity_type": "user"} for i in range(15)
        ]
        response = client.post(
            "/v1/structured/multi-entity/start", json={"entities": entities}
        )
        assert response.status_code == 422

    def test_get_multi_entity_investigation_status_success(self, client):
        """Test successful status retrieval"""
        with patch(
            "app.service.agent.multi_entity.investigation_orchestrator.get_multi_entity_orchestrator"
        ) as mock_orchestrator:
            mock_instance = MagicMock()
            mock_orchestrator.return_value = mock_instance
            mock_instance.get_investigation_status.return_value = {
                "investigation_id": "multi_test123",
                "status": "in_progress",
                "progress": 0.5,
                "current_phase": "executing_agents",
                "completed_entities": ["user_12345"],
                "remaining_entities": ["transaction_67890", "store_555"],
                "estimated_completion_time": "2025-01-09T10:05:00Z",
            }

            response = client.get("/v1/structured/multi-entity/multi_test123/status")

            assert response.status_code == 200
            data = response.json()

            assert data["investigation_id"] == "multi_test123"
            assert data["status"] == "in_progress"
            assert data["progress"] == 0.5
            assert "user_12345" in data["completed_entities"]

    def test_get_multi_entity_investigation_status_not_found(self, client):
        """Test status retrieval for non-existent investigation"""
        with patch(
            "app.service.agent.multi_entity.investigation_orchestrator.get_multi_entity_orchestrator"
        ) as mock_orchestrator:
            mock_instance = MagicMock()
            mock_orchestrator.return_value = mock_instance
            mock_instance.get_investigation_status.return_value = None

            response = client.get("/v1/structured/multi-entity/nonexistent123/status")

            assert response.status_code == 404
            assert "not found" in response.json()["detail"]

    def test_get_multi_entity_investigation_results_success(self, client):
        """Test successful results retrieval"""
        # Note: This will return placeholder until Phase 2.2 storage is implemented
        response = client.get("/v1/structured/multi-entity/multi_test123/results")

        # Currently returns placeholder - should be 200 when storage is implemented
        assert response.status_code in [200, 501]  # 501 for not implemented

    def test_update_multi_entity_relationships_success(self, client):
        """Test successful relationship updates"""
        new_relationships = [
            {
                "source_entity_id": "user_12345",
                "target_entity_id": "new_entity_999",
                "relationship_type": "associated_with",
                "strength": 0.7,
                "evidence": {"source": "updated_data"},
            }
        ]

        with patch(
            "app.service.agent.multi_entity.investigation_orchestrator.get_multi_entity_orchestrator"
        ) as mock_orchestrator:
            mock_instance = MagicMock()
            mock_orchestrator.return_value = mock_instance
            mock_instance.update_investigation_relationships.return_value = {
                "investigation_id": "multi_test123",
                "updated_relationships": new_relationships,
                "status": "relationships_updated",
            }

            response = client.put(
                "/v1/structured/multi-entity/multi_test123/relationships",
                json=new_relationships,
            )

            assert response.status_code == 200
            data = response.json()

            assert data["investigation_id"] == "multi_test123"
            assert data["status"] == "relationships_updated"
            assert len(data["updated_relationships"]) == 1

    def test_get_enhanced_entity_types_success(self, client):
        """Test enhanced entity types endpoint"""
        response = client.get("/v1/structured/entities/types/enhanced")

        assert response.status_code == 200
        data = response.json()

        # Verify expected categories are present
        assert "core_types" in data
        assert "transaction_types" in data
        assert "behavioral_types" in data
        assert "risk_types" in data
        assert "meta_types" in data

        # Verify core types are present
        assert "device" in data["core_types"]
        assert "location" in data["core_types"]
        assert "network" in data["core_types"]
        assert "user" in data["core_types"]

        # Verify transaction types are present
        assert "timestamp" in data["transaction_types"]
        assert "tx_datetime" in data["transaction_types"]
        assert "store_id" in data["transaction_types"]

    def test_get_multi_entity_metrics_success(self, client):
        """Test multi-entity metrics endpoint"""
        with patch(
            "app.service.agent.multi_entity.investigation_orchestrator.get_multi_entity_orchestrator"
        ) as mock_orchestrator:
            mock_instance = MagicMock()
            mock_orchestrator.return_value = mock_instance
            mock_instance.get_orchestrator_metrics.return_value = {
                "total_coordinated_investigations": 5,
                "successful_investigations": 4,
                "parallel_entity_investigations": 15,
                "cross_entity_correlations_found": 8,
                "active_investigations": 1,
                "average_investigation_duration_ms": 45000,
                "boolean_query_complexity_avg": 3.2,
            }

            response = client.get("/v1/structured/multi-entity/metrics")

            assert response.status_code == 200
            data = response.json()

            assert data["total_coordinated_investigations"] == 5
            assert data["successful_investigations"] == 4
            assert data["active_investigations"] == 1

    def test_health_check_includes_multi_entity_info(self, client):
        """Test that health check includes multi-entity investigation info"""
        with patch(
            "app.service.agent.multi_entity.investigation_orchestrator.get_multi_entity_orchestrator"
        ) as mock_orchestrator:
            mock_instance = MagicMock()
            mock_orchestrator.return_value = mock_instance
            mock_instance.get_orchestrator_metrics.return_value = {
                "active_investigations": 2,
                "total_coordinated_investigations": 10,
            }

            response = client.get("/v1/structured/health")

            assert response.status_code == 200
            data = response.json()

            assert data["status"] == "healthy"
            assert "multi_entity_investigations" in data
            assert "multi_entity_investigation" in data["features"]
            assert "boolean_logic_queries" in data["features"]
            assert "cross_entity_analysis" in data["features"]


class TestMultiEntityAPIErrorHandling:
    """Test error handling scenarios for multi-entity API"""

    @pytest.fixture
    def client(self):
        """Create test client"""
        app = create_app()
        return TestClient(app)

    def test_orchestrator_unavailable_error(self, client):
        """Test handling when orchestrator is unavailable"""
        with patch(
            "app.service.agent.multi_entity.investigation_orchestrator.get_multi_entity_orchestrator"
        ) as mock_orchestrator:
            mock_orchestrator.side_effect = Exception(
                "Orchestrator service unavailable"
            )

            response = client.post(
                "/v1/structured/multi-entity/start",
                json={
                    "entities": [
                        {"entity_id": "user_123", "entity_type": "user"},
                        {"entity_id": "txn_456", "entity_type": "transaction_id"},
                    ]
                },
            )

            assert response.status_code == 400
            assert "Failed to start investigation" in response.json()["detail"]

    def test_invalid_boolean_logic_error(self, client):
        """Test handling of invalid Boolean logic expressions"""
        with patch(
            "app.service.agent.multi_entity.investigation_orchestrator.get_multi_entity_orchestrator"
        ) as mock_orchestrator:
            mock_instance = AsyncMock()
            mock_orchestrator.return_value = mock_instance
            mock_instance.start_multi_entity_investigation.side_effect = ValueError(
                "Invalid Boolean expression"
            )

            response = client.post(
                "/v1/structured/multi-entity/start",
                json={
                    "entities": [
                        {"entity_id": "user_123", "entity_type": "user"},
                        {"entity_id": "txn_456", "entity_type": "transaction_id"},
                    ],
                    "boolean_logic": "user_123 AND AND txn_456",  # Invalid syntax
                },
            )

            assert response.status_code == 400
            assert "Invalid Boolean expression" in response.json()["detail"]

    def test_concurrent_request_handling(self, client):
        """Test handling of concurrent multi-entity investigation requests"""
        request_data = {
            "entities": [
                {"entity_id": "user_123", "entity_type": "user"},
                {"entity_id": "txn_456", "entity_type": "transaction_id"},
            ],
            "boolean_logic": "user_123 AND txn_456",
        }

        with patch(
            "app.service.agent.multi_entity.investigation_orchestrator.get_multi_entity_orchestrator"
        ) as mock_orchestrator:
            mock_instance = AsyncMock()
            mock_orchestrator.return_value = mock_instance
            mock_instance.start_multi_entity_investigation.return_value = {
                "investigation_id": "concurrent_test",
                "status": "in_progress",
                "entities": request_data["entities"],
                "relationships": [],
                "boolean_logic": request_data["boolean_logic"],
                "entity_results": {},
                "cross_entity_analysis": None,
                "overall_risk_assessment": None,
                "investigation_timeline": [],
                "start_time": "2025-01-09T10:00:00Z",
                "total_duration_ms": 0,
            }

            # Simulate concurrent requests
            import threading

            results = []

            def make_request():
                response = client.post(
                    "/v1/structured/multi-entity/start", json=request_data
                )
                results.append(response.status_code)

            # Start 5 concurrent requests
            threads = [threading.Thread(target=make_request) for _ in range(5)]
            for thread in threads:
                thread.start()
            for thread in threads:
                thread.join()

            # All requests should succeed
            assert all(status == 200 for status in results)
            assert len(results) == 5


class TestMultiEntityAPIPerformance:
    """Performance tests for multi-entity API endpoints"""

    @pytest.fixture
    def client(self):
        """Create test client"""
        app = create_app()
        return TestClient(app)

    def test_large_entity_set_performance(self, client):
        """Test performance with large number of entities"""
        # Create request with maximum allowed entities (10)
        entities = [
            {"entity_id": f"entity_{i}", "entity_type": "user"} for i in range(10)
        ]

        request_data = {
            "entities": entities,
            "boolean_logic": " AND ".join([f"entity_{i}" for i in range(10)]),
        }

        with patch(
            "app.service.agent.multi_entity.investigation_orchestrator.get_multi_entity_orchestrator"
        ) as mock_orchestrator:
            mock_instance = AsyncMock()
            mock_orchestrator.return_value = mock_instance
            mock_instance.start_multi_entity_investigation.return_value = {
                "investigation_id": "perf_test",
                "status": "in_progress",
                "entities": entities,
                "relationships": [],
                "boolean_logic": request_data["boolean_logic"],
                "entity_results": {},
                "cross_entity_analysis": None,
                "overall_risk_assessment": None,
                "investigation_timeline": [],
                "start_time": "2025-01-09T10:00:00Z",
                "total_duration_ms": 0,
            }

            import time

            start_time = time.time()

            response = client.post(
                "/v1/structured/multi-entity/start", json=request_data
            )

            request_time = time.time() - start_time

            assert response.status_code == 200
            assert request_time < 2.0  # Should complete within 2 seconds

    def test_complex_boolean_logic_performance(self, client):
        """Test performance with complex Boolean logic expressions"""
        entities = [
            {"entity_id": f"entity_{i}", "entity_type": "user"} for i in range(8)
        ]

        # Create complex nested Boolean expression
        boolean_logic = "((entity_0 AND entity_1) OR (entity_2 AND entity_3)) AND ((entity_4 OR entity_5) AND (entity_6 OR entity_7))"

        request_data = {"entities": entities, "boolean_logic": boolean_logic}

        with patch(
            "app.service.agent.multi_entity.investigation_orchestrator.get_multi_entity_orchestrator"
        ) as mock_orchestrator:
            mock_instance = AsyncMock()
            mock_orchestrator.return_value = mock_instance
            mock_instance.start_multi_entity_investigation.return_value = {
                "investigation_id": "complex_test",
                "status": "in_progress",
                "entities": entities,
                "relationships": [],
                "boolean_logic": boolean_logic,
                "entity_results": {},
                "cross_entity_analysis": None,
                "overall_risk_assessment": None,
                "investigation_timeline": [],
                "start_time": "2025-01-09T10:00:00Z",
                "total_duration_ms": 0,
            }

            import time

            start_time = time.time()

            response = client.post(
                "/v1/structured/multi-entity/start", json=request_data
            )

            request_time = time.time() - start_time

            assert response.status_code == 200
            assert request_time < 1.0  # Complex Boolean logic should still be fast
