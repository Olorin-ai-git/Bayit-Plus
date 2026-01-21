"""
Unit Tests for Multi-Entity Investigation Phase 2 Implementation

Tests for multi-entity investigation orchestration, API endpoints,
and comprehensive model validation.

Phase 2 Testing: Multi-Entity Investigation Orchestration
"""

import asyncio
import json
from datetime import datetime, timezone
from typing import Any, Dict, List
from unittest.mock import AsyncMock, patch

import pytest

# Import models and services
from app.models.multi_entity_investigation import (
    BooleanQueryParser,
    CrossEntityAnalysis,
    EntityRelationship,
    InvestigationResult,
    MultiEntityInvestigationRequest,
    MultiEntityInvestigationResult,
    MultiEntityRiskAssessment,
    RelationshipInsight,
    RelationshipType,
)
from app.service.agent.multi_entity.entity_manager import EntityType
from app.service.agent.multi_entity.investigation_orchestrator import (
    InvestigationContext,
    MultiEntityInvestigationOrchestrator,
    get_multi_entity_orchestrator,
)


class TestMultiEntityInvestigationModels:
    """Test multi-entity investigation Pydantic models"""

    def test_entity_relationship_model_creation(self):
        """Test EntityRelationship model creation and validation"""

        # Valid relationship
        relationship = EntityRelationship(
            source_entity_id="user_123",
            target_entity_id="txn_456",
            relationship_type=RelationshipType.INITIATED,
            strength=0.9,
            bidirectional=False,
            evidence={"source": "transaction_log", "timestamp": "2025-01-09T10:30:00Z"},
            confidence=0.95,
        )

        assert relationship.source_entity_id == "user_123"
        assert relationship.target_entity_id == "txn_456"
        assert relationship.relationship_type == RelationshipType.INITIATED
        assert relationship.strength == 0.9
        assert relationship.bidirectional is False
        assert relationship.confidence == 0.95
        assert relationship.evidence["source"] == "transaction_log"

    def test_entity_relationship_validation(self):
        """Test EntityRelationship validation constraints"""

        # Test strength validation (must be 0.0-1.0)
        with pytest.raises(ValueError):
            EntityRelationship(
                source_entity_id="user_123",
                target_entity_id="txn_456",
                relationship_type=RelationshipType.INITIATED,
                strength=1.5,  # Invalid: > 1.0
            )

        with pytest.raises(ValueError):
            EntityRelationship(
                source_entity_id="user_123",
                target_entity_id="txn_456",
                relationship_type=RelationshipType.INITIATED,
                strength=-0.1,  # Invalid: < 0.0
            )

    def test_multi_entity_investigation_request_model(self):
        """Test MultiEntityInvestigationRequest model creation"""

        relationships = [
            EntityRelationship(
                source_entity_id="user_123",
                target_entity_id="txn_456",
                relationship_type=RelationshipType.INITIATED,
            ),
            EntityRelationship(
                source_entity_id="txn_456",
                target_entity_id="store_789",
                relationship_type=RelationshipType.PROCESSED_BY,
            ),
        ]

        request = MultiEntityInvestigationRequest(
            entities=[
                {"entity_id": "user_123", "entity_type": "user"},
                {"entity_id": "txn_456", "entity_type": "original_tx_id"},
                {"entity_id": "store_789", "entity_type": "store_id"},
            ],
            relationships=relationships,
            boolean_logic="user_123 AND (txn_456 OR store_789)",
            investigation_scope=["device", "location", "network", "logs"],
            enable_cross_entity_analysis=True,
        )

        assert len(request.entities) == 3
        assert len(request.relationships) == 2
        assert request.boolean_logic == "user_123 AND (txn_456 OR store_789)"
        assert "device" in request.investigation_scope
        assert request.enable_cross_entity_analysis is True
        assert request.priority == "normal"  # Default value

    def test_multi_entity_investigation_request_validation(self):
        """Test MultiEntityInvestigationRequest validation constraints"""

        # Test minimum entities constraint (must have at least 2)
        with pytest.raises(ValueError):
            MultiEntityInvestigationRequest(
                entities=[
                    {"entity_id": "user_123", "entity_type": "user"}
                ]  # Only 1 entity
            )

        # Test maximum entities constraint (must have at most 10)
        entities = [
            {"entity_id": f"entity_{i}", "entity_type": "user"} for i in range(11)
        ]
        with pytest.raises(ValueError):
            MultiEntityInvestigationRequest(entities=entities)  # 11 entities > max

        # Test priority validation
        with pytest.raises(ValueError):
            MultiEntityInvestigationRequest(
                entities=[
                    {"entity_id": "user_123", "entity_type": "user"},
                    {"entity_id": "txn_456", "entity_type": "transaction"},
                ],
                priority="invalid_priority",
            )

    def test_investigation_result_model(self):
        """Test InvestigationResult model creation"""

        result = InvestigationResult(
            investigation_id="multi_test123",
            entity_id="user_456",
            agent_type="device_agent",
            findings={
                "device_fingerprint": "abc123def456",
                "device_type": "mobile",
                "risk_indicators": ["unusual_location", "new_device"],
            },
            risk_indicators=[
                {"type": "unusual_location", "severity": "medium", "confidence": 0.8},
                {"type": "new_device", "severity": "low", "confidence": 0.9},
            ],
            tool_results=[
                {
                    "tool": "device_analyzer",
                    "execution_time_ms": 1250,
                    "result": "completed",
                }
            ],
            risk_score=0.6,
            confidence_score=0.85,
            execution_time_ms=2500,
            agent_reasoning="Device analysis identified moderate risk factors",
        )

        assert result.investigation_id == "multi_test123"
        assert result.entity_id == "user_456"
        assert result.agent_type == "device_agent"
        assert result.risk_score == 0.6
        assert result.confidence_score == 0.85
        assert len(result.risk_indicators) == 2
        assert len(result.tool_results) == 1

    def test_multi_entity_investigation_result_model(self):
        """Test complete MultiEntityInvestigationResult model"""

        entity_results = {
            "user_123": [
                InvestigationResult(
                    investigation_id="multi_test456",
                    entity_id="user_123",
                    agent_type="device_agent",
                    risk_score=0.7,
                    confidence_score=0.9,
                )
            ],
            "txn_456": [
                InvestigationResult(
                    investigation_id="multi_test456",
                    entity_id="txn_456",
                    agent_type="logs_agent",
                    risk_score=0.4,
                    confidence_score=0.8,
                )
            ],
        }

        cross_analysis = CrossEntityAnalysis(
            investigation_id="multi_test456", overall_confidence=0.85
        )

        risk_assessment = MultiEntityRiskAssessment(
            investigation_id="multi_test456",
            overall_risk_score=0.55,
            individual_entity_scores={"user_123": 0.7, "txn_456": 0.4},
        )

        result = MultiEntityInvestigationResult(
            investigation_id="multi_test456",
            entities=[
                {"entity_id": "user_123", "entity_type": "user"},
                {"entity_id": "txn_456", "entity_type": "original_tx_id"},
            ],
            relationships=[],
            boolean_logic="user_123 AND txn_456",
            entity_results=entity_results,
            cross_entity_analysis=cross_analysis,
            overall_risk_assessment=risk_assessment,
        )

        assert result.investigation_id == "multi_test456"
        assert len(result.entities) == 2
        assert len(result.entity_results) == 2
        assert result.cross_entity_analysis is not None
        assert result.overall_risk_assessment.overall_risk_score == 0.55


class TestMultiEntityInvestigationOrchestrator:
    """Test MultiEntityInvestigationOrchestrator functionality"""

    @pytest.fixture
    def orchestrator(self):
        """Create orchestrator instance for testing"""
        return MultiEntityInvestigationOrchestrator()

    @pytest.fixture
    def sample_request(self):
        """Create sample multi-entity investigation request"""
        return MultiEntityInvestigationRequest(
            entities=[
                {"entity_id": "user_123", "entity_type": "user"},
                {"entity_id": "txn_456", "entity_type": "original_tx_id"},
                {"entity_id": "store_789", "entity_type": "store_id"},
            ],
            relationships=[
                EntityRelationship(
                    source_entity_id="user_123",
                    target_entity_id="txn_456",
                    relationship_type=RelationshipType.INITIATED,
                )
            ],
            boolean_logic="user_123 AND txn_456",
            investigation_scope=["device", "location"],
        )

    @pytest.mark.asyncio
    async def test_start_multi_entity_investigation(self, orchestrator, sample_request):
        """Test starting a multi-entity investigation"""

        result = await orchestrator.start_multi_entity_investigation(sample_request)

        assert result.investigation_id == sample_request.investigation_id
        assert result.status == "in_progress"
        assert len(result.entities) == 3
        assert len(result.investigation_timeline) > 0
        assert result.started_at is not None

        # Check that investigation is registered
        assert sample_request.investigation_id in orchestrator.active_investigations

        # Verify metrics updated
        assert orchestrator.metrics["total_investigations"] == 1

    @pytest.mark.asyncio
    async def test_investigation_context_initialization(
        self, orchestrator, sample_request
    ):
        """Test investigation context initialization"""

        context = await orchestrator._initialize_investigation_context(sample_request)

        assert context.investigation_id == sample_request.investigation_id
        assert len(context.entity_ids) == 3
        assert "user_123" in context.entity_ids
        assert "txn_456" in context.entity_ids
        assert "store_789" in context.entity_ids

        # Check entity type mappings
        assert context.entity_types["user_123"] == EntityType.USER
        assert context.entity_types["txn_456"] == EntityType.ORIGINAL_TX_ID
        assert context.entity_types["store_789"] == EntityType.STORE_ID

        assert len(context.relationships) == 1
        assert context.boolean_logic == "user_123 AND txn_456"

    @pytest.mark.asyncio
    async def test_investigation_context_validation(self, orchestrator):
        """Test investigation context validation with invalid data"""

        # Test invalid entity type
        invalid_request = MultiEntityInvestigationRequest(
            entities=[
                {"entity_id": "user_123", "entity_type": "invalid_type"},
                {"entity_id": "txn_456", "entity_type": "user"},
            ]
        )

        with pytest.raises(ValueError, match="Invalid entity type"):
            await orchestrator._initialize_investigation_context(invalid_request)

        # Test relationship with non-existent entity
        invalid_relationship_request = MultiEntityInvestigationRequest(
            entities=[
                {"entity_id": "user_123", "entity_type": "user"},
                {"entity_id": "txn_456", "entity_type": "transaction"},
            ],
            relationships=[
                EntityRelationship(
                    source_entity_id="user_123",
                    target_entity_id="non_existent_entity",  # Entity not in entities list
                    relationship_type=RelationshipType.RELATED_TO,
                )
            ],
        )

        with pytest.raises(ValueError, match="Relationship target entity not found"):
            await orchestrator._initialize_investigation_context(
                invalid_relationship_request
            )

    @pytest.mark.asyncio
    async def test_execute_entity_investigations(self, orchestrator, sample_request):
        """Test entity investigation execution phase"""

        context = await orchestrator._initialize_investigation_context(sample_request)

        # Execute entity investigations phase
        await orchestrator._execute_entity_investigations(context, sample_request)

        # Check that results were created for each entity and scope
        assert len(context.agent_results) == 3  # 3 entities

        for entity_id in context.entity_ids:
            assert entity_id in context.agent_results
            entity_results = context.agent_results[entity_id]

            # Should have results for each investigation scope
            assert len(entity_results) == len(sample_request.investigation_scope)

            for result in entity_results:
                assert result.investigation_id == context.investigation_id
                assert result.entity_id == entity_id
                assert result.risk_score >= 0.0
                assert result.risk_score <= 1.0
                assert result.confidence_score >= 0.0
                assert result.confidence_score <= 1.0

        # Check timeline updated
        assert len(context.timeline) >= 2  # Started and completed events

        # Check phase timing recorded
        assert "entity_investigations" in context.phase_timings

    @pytest.mark.asyncio
    async def test_execute_cross_entity_analysis(self, orchestrator, sample_request):
        """Test cross-entity analysis execution"""

        context = await orchestrator._initialize_investigation_context(sample_request)

        # Execute cross-entity analysis
        analysis = await orchestrator._execute_cross_entity_analysis(
            context, sample_request
        )

        assert analysis is not None
        assert analysis.investigation_id == context.investigation_id
        assert analysis.overall_confidence > 0.0
        assert isinstance(analysis.entity_interactions, list)
        assert isinstance(analysis.risk_correlations, list)

    @pytest.mark.asyncio
    async def test_execute_cross_entity_analysis_disabled(
        self, orchestrator, sample_request
    ):
        """Test cross-entity analysis when disabled"""

        sample_request.enable_cross_entity_analysis = False
        context = await orchestrator._initialize_investigation_context(sample_request)

        analysis = await orchestrator._execute_cross_entity_analysis(
            context, sample_request
        )

        assert analysis is None  # Should return None when disabled

    @pytest.mark.asyncio
    async def test_execute_relationship_analysis(self, orchestrator, sample_request):
        """Test relationship analysis execution"""

        context = await orchestrator._initialize_investigation_context(sample_request)

        insights = await orchestrator._execute_relationship_analysis(
            context, sample_request
        )

        assert isinstance(insights, list)
        assert len(insights) == len(
            context.relationships
        )  # One insight per relationship

        for insight in insights:
            assert insight.investigation_id == context.investigation_id
            assert insight.risk_impact >= 0.0
            assert insight.risk_impact <= 1.0
            assert insight.confidence_level >= 0.0
            assert insight.confidence_level <= 1.0

    @pytest.mark.asyncio
    async def test_execute_risk_assessment(self, orchestrator, sample_request):
        """Test risk assessment calculation"""

        context = await orchestrator._initialize_investigation_context(sample_request)

        # Add some mock agent results
        context.agent_results["user_123"] = [
            InvestigationResult(
                investigation_id=context.investigation_id,
                entity_id="user_123",
                agent_type="device_agent",
                risk_score=0.7,
            ),
            InvestigationResult(
                investigation_id=context.investigation_id,
                entity_id="user_123",
                agent_type="location_agent",
                risk_score=0.5,
            ),
        ]

        boolean_result = {"parsed": True, "evaluation_result": True}

        assessment = await orchestrator._execute_risk_assessment(
            context, sample_request, boolean_result
        )

        assert assessment.investigation_id == context.investigation_id
        assert assessment.overall_risk_score >= 0.0
        assert assessment.overall_risk_score <= 1.0
        assert "user_123" in assessment.individual_entity_scores
        assert (
            assessment.individual_entity_scores["user_123"] == 0.6
        )  # Average of 0.7 and 0.5

    def test_get_investigation_status(self, orchestrator, sample_request):
        """Test getting investigation status"""

        # Register investigation
        context = InvestigationContext(
            investigation_id=sample_request.investigation_id,
            entity_ids={"user_123", "txn_456"},
            entity_types={
                "user_123": EntityType.USER,
                "txn_456": EntityType.TRANSACTION,
            },
            relationships=[],
            boolean_logic="user_123 AND txn_456",
            investigation_scope=["device", "location"],
            agent_results={
                "user_123": [
                    InvestigationResult(
                        investigation_id=sample_request.investigation_id,
                        entity_id="user_123",
                        agent_type="device_agent",
                    )
                ]
            },
            cross_entity_findings=[],
            relationship_evidence={},
            timeline=[],
            start_time=datetime.now(timezone.utc),
            phase_timings={},
        )

        orchestrator.active_investigations[sample_request.investigation_id] = context

        status = orchestrator.get_investigation_status(sample_request.investigation_id)

        assert status is not None
        assert status["investigation_id"] == sample_request.investigation_id
        assert status["status"] == "in_progress"
        assert "progress_percentage" in status
        assert status["total_entities"] == 2
        assert status["entities_processed"] == 1  # Only user_123 has results

    def test_get_investigation_status_not_found(self, orchestrator):
        """Test getting status for non-existent investigation"""

        status = orchestrator.get_investigation_status("non_existent_id")
        assert status is None

    def test_orchestrator_metrics(self, orchestrator):
        """Test orchestrator metrics tracking"""

        initial_metrics = orchestrator.get_orchestrator_metrics()

        assert "total_investigations" in initial_metrics
        assert "successful_investigations" in initial_metrics
        assert "failed_investigations" in initial_metrics
        assert "avg_execution_time_ms" in initial_metrics
        assert "active_investigations" in initial_metrics
        assert "success_rate" in initial_metrics

        # Initial state should have zero values
        assert initial_metrics["total_investigations"] == 0
        assert initial_metrics["success_rate"] == 0.0
        assert initial_metrics["active_investigations"] == 0

    def test_orchestrator_singleton(self):
        """Test orchestrator singleton pattern"""

        orchestrator1 = get_multi_entity_orchestrator()
        orchestrator2 = get_multi_entity_orchestrator()

        assert orchestrator1 is orchestrator2


class TestBooleanQueryParser:
    """Test Boolean query parsing functionality"""

    def test_boolean_query_parser_creation(self):
        """Test BooleanQueryParser model creation"""

        parser = BooleanQueryParser(
            expression="user_123 AND (txn_456 OR store_789)",
            entity_mapping={
                "user_123": "USER_ID_12345",
                "txn_456": "TRANSACTION_ID_67890",
                "store_789": "STORE_ID_999",
            },
        )

        assert parser.expression == "user_123 AND (txn_456 OR store_789)"
        assert len(parser.entity_mapping) == 3
        assert parser.entity_mapping["user_123"] == "USER_ID_12345"

    def test_boolean_query_parser_parse_placeholder(self):
        """Test BooleanQueryParser parse method (placeholder implementation)"""

        parser = BooleanQueryParser(
            expression="A AND B", entity_mapping={"A": "entity_1", "B": "entity_2"}
        )

        result = parser.parse()

        assert "parsed" in result
        assert result["parsed"] is False  # Placeholder returns False
        assert result["expression"] == "A AND B"
        assert result["entity_mapping"] == {"A": "entity_1", "B": "entity_2"}
        assert "error" in result


class TestMultiEntityInvestigationIntegration:
    """Integration tests for complete multi-entity investigation workflow"""

    @pytest.mark.asyncio
    async def test_complete_investigation_workflow(self):
        """Test complete investigation workflow from start to finish"""

        orchestrator = MultiEntityInvestigationOrchestrator()

        request = MultiEntityInvestigationRequest(
            entities=[
                {"entity_id": "user_integration_test", "entity_type": "user"},
                {"entity_id": "txn_integration_test", "entity_type": "original_tx_id"},
            ],
            relationships=[
                EntityRelationship(
                    source_entity_id="user_integration_test",
                    target_entity_id="txn_integration_test",
                    relationship_type=RelationshipType.INITIATED,
                )
            ],
            boolean_logic="user_integration_test AND txn_integration_test",
            investigation_scope=["device", "logs"],
            enable_cross_entity_analysis=True,
        )

        # Start investigation
        initial_result = await orchestrator.start_multi_entity_investigation(request)
        assert initial_result.status == "in_progress"

        # Execute investigation
        final_result = await orchestrator.execute_multi_entity_investigation(
            request.investigation_id, request
        )

        # Validate final result
        assert final_result.status == "completed"
        assert final_result.investigation_id == request.investigation_id
        assert len(final_result.entities) == 2
        assert len(final_result.entity_results) == 2
        assert final_result.cross_entity_analysis is not None
        assert len(final_result.relationship_insights) == 1  # One relationship
        assert final_result.overall_risk_assessment is not None
        assert final_result.completed_at is not None
        assert final_result.total_duration_ms is not None
        assert len(final_result.investigation_timeline) > 0

        # Verify investigation was cleaned up
        assert request.investigation_id not in orchestrator.active_investigations

        # Verify metrics updated
        metrics = orchestrator.get_orchestrator_metrics()
        assert metrics["total_investigations"] == 1
        assert metrics["successful_investigations"] == 1
        assert metrics["entities_processed"] == 2

    @pytest.mark.asyncio
    async def test_investigation_failure_handling(self):
        """Test investigation failure handling and cleanup"""

        orchestrator = MultiEntityInvestigationOrchestrator()

        # Create request with invalid entity type to trigger failure
        invalid_request = MultiEntityInvestigationRequest(
            entities=[
                {"entity_id": "user_test", "entity_type": "invalid_entity_type"},
                {"entity_id": "txn_test", "entity_type": "transaction"},
            ]
        )

        # Should fail during initialization
        with pytest.raises(ValueError):
            await orchestrator.start_multi_entity_investigation(invalid_request)

        # Verify failure metrics updated
        metrics = orchestrator.get_orchestrator_metrics()
        assert metrics["failed_investigations"] == 1

    def test_performance_metrics_calculation(self):
        """Test performance metrics calculation and averaging"""

        orchestrator = MultiEntityInvestigationOrchestrator()

        # Simulate some investigations
        orchestrator.metrics["total_investigations"] = 3
        orchestrator.metrics["avg_execution_time_ms"] = 2000.0

        # Update with new execution time
        orchestrator._update_average_execution_time(
            5000
        )  # New investigation took 5 seconds

        # New average should be: ((2000 * 2) + 5000) / 3 = 3000
        assert orchestrator.metrics["avg_execution_time_ms"] == 3000.0

    def test_timeline_event_tracking(self):
        """Test investigation timeline event tracking"""

        context = InvestigationContext(
            investigation_id="timeline_test",
            entity_ids={"user_1"},
            entity_types={"user_1": EntityType.USER},
            relationships=[],
            boolean_logic="user_1",
            investigation_scope=["device"],
            agent_results={},
            cross_entity_findings=[],
            relationship_evidence={},
            timeline=[],
            start_time=datetime.now(timezone.utc),
            phase_timings={},
        )

        # Add timeline events
        context.add_timeline_event(
            "test_event", "Test event description", {"key": "value"}
        )
        context.add_timeline_event("second_event", "Second event")

        assert len(context.timeline) == 2

        first_event = context.timeline[0]
        assert first_event["event_type"] == "test_event"
        assert first_event["description"] == "Test event description"
        assert first_event["metadata"]["key"] == "value"
        assert "timestamp" in first_event

        second_event = context.timeline[1]
        assert second_event["event_type"] == "second_event"
        assert second_event["description"] == "Second event"
        assert second_event["metadata"] == {}


if __name__ == "__main__":
    # Run tests with pytest
    pytest.main([__file__, "-v", "--tb=short"])
