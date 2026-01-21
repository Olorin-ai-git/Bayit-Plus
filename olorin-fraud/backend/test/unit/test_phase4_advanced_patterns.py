"""
Unit tests for Phase 4: Advanced Patterns implementation.
Tests human-in-the-loop, multi-agent coordination, and custom tool builder.
"""

import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

import asyncio
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, Mock, patch

import pytest

from app.service.agent.orchestration.custom_tool_builder import (
    InvestigationToolBuilder,
    PerformanceMonitor,
    ToolCategory,
    ToolSpecification,
    ToolValidator,
)
from app.service.agent.orchestration.human_in_the_loop import (
    EscalationReason,
    HumanResponse,
    HumanReviewManager,
    HumanReviewRequest,
    ReviewPriority,
    ReviewStatus,
)
from app.service.agent.orchestration.multi_agent_coordination import (
    AgentCapabilities,
    AgentPool,
    CommitteeStrategy,
    CoordinatedAgentOrchestrator,
    CoordinationStrategy,
    CoordinationTask,
    ParallelStrategy,
)


class TestHumanInTheLoop:
    """Test human-in-the-loop integration."""

    @pytest.fixture
    def review_manager(self):
        """Create HumanReviewManager instance."""
        return HumanReviewManager()

    @pytest.mark.asyncio
    async def test_request_human_review(self, review_manager):
        """Test requesting human review."""
        state = {"case_id": "TEST-001", "risk_score": 0.9, "confidence": 0.3}

        request = await review_manager.request_human_review(
            state, EscalationReason.LOW_CONFIDENCE
        )

        assert request.case_id == "TEST-001"
        assert request.reason == EscalationReason.LOW_CONFIDENCE
        assert request.priority == ReviewPriority.HIGH
        assert request.status == ReviewStatus.PENDING

    @pytest.mark.asyncio
    async def test_should_escalate_high_risk(self, review_manager):
        """Test escalation for high risk cases."""
        state = {"risk_score": 0.95}

        should_escalate, reason = await review_manager.should_escalate(state)

        assert should_escalate is True
        assert reason == EscalationReason.HIGH_RISK

    @pytest.mark.asyncio
    async def test_should_escalate_low_confidence(self, review_manager):
        """Test escalation for low confidence cases."""
        state = {"confidence": 0.2}

        should_escalate, reason = await review_manager.should_escalate(state)

        assert should_escalate is True
        assert reason == EscalationReason.LOW_CONFIDENCE

    @pytest.mark.asyncio
    async def test_process_human_response(self, review_manager):
        """Test processing human response."""
        # Create review request
        state = {"case_id": "TEST-002"}
        request = await review_manager.request_human_review(
            state, EscalationReason.MANUAL_REQUEST
        )

        # Create response
        response = HumanResponse(
            review_id=request.review_id,
            decision="approve",
            confidence=0.9,
            notes="Looks legitimate",
            reviewer_id="analyst-1",
        )

        # Process response
        updated_state = await review_manager.process_human_response(response, state)

        assert updated_state["human_decision"] == "approve"
        assert updated_state["human_confidence"] == 0.9
        assert request.review_id not in review_manager.pending_reviews
        assert request.review_id in review_manager.completed_reviews

    def test_get_pending_reviews(self, review_manager):
        """Test getting pending reviews."""
        # Add some reviews
        for i in range(3):
            request = HumanReviewRequest(
                review_id=f"REV-{i}",
                case_id=f"CASE-{i}",
                reason=EscalationReason.HIGH_RISK,
                priority=ReviewPriority.HIGH if i == 0 else ReviewPriority.MEDIUM,
            )
            review_manager.pending_reviews[request.review_id] = request

        # Get by priority
        high_priority = review_manager.get_pending_reviews(ReviewPriority.HIGH)
        assert len(high_priority) == 1
        assert high_priority[0].review_id == "REV-0"

        # Get all
        all_reviews = review_manager.get_pending_reviews()
        assert len(all_reviews) == 3


class TestMultiAgentCoordination:
    """Test multi-agent coordination patterns."""

    @pytest.fixture
    def orchestrator(self):
        """Create CoordinatedAgentOrchestrator instance."""
        return CoordinatedAgentOrchestrator()

    @pytest.fixture
    def agent_pool(self):
        """Create AgentPool instance."""
        return AgentPool()

    def test_agent_capabilities(self):
        """Test AgentCapabilities calculation."""
        agent = AgentCapabilities(
            name="test_agent",
            specializations=["analysis", "validation"],
            max_concurrent_tasks=5,
            current_load=2,
            success_rate=0.9,
            avg_response_time=2.0,
        )

        # Test availability score calculation
        score = agent.availability_score
        assert 0 <= score <= 1
        assert score > 0.5  # Should be reasonably available

    def test_coordination_task_matching(self):
        """Test task-agent matching."""
        agent = AgentCapabilities(
            name="specialist", specializations=["fraud_detection", "risk_scoring"]
        )

        # Matching task
        task1 = CoordinationTask(
            task_id="T1",
            task_type="analysis",
            complexity=0.5,
            required_capabilities=["fraud_detection"],
            input_data={},
        )
        assert task1.matches_agent(agent) is True

        # Non-matching task
        task2 = CoordinationTask(
            task_id="T2",
            task_type="analysis",
            complexity=0.5,
            required_capabilities=["network_analysis"],
            input_data={},
        )
        assert task2.matches_agent(agent) is False

    @pytest.mark.asyncio
    async def test_parallel_strategy(self):
        """Test parallel execution strategy."""
        strategy = ParallelStrategy()

        agents = [
            AgentCapabilities(
                name=f"agent_{i}", specializations=["analysis"], success_rate=0.9
            )
            for i in range(3)
        ]

        task = CoordinationTask(
            task_id="parallel_task",
            task_type="analysis",
            complexity=0.7,
            required_capabilities=["analysis"],
            input_data={"test": "data"},
        )

        result = await strategy.coordinate(agents, task)

        assert result["status"] == "completed"
        assert result["strategy"] == "parallel"
        assert len(result["results"]) > 0
        assert all(r["agent"].startswith("agent_") for r in result["results"])

    @pytest.mark.asyncio
    async def test_committee_strategy(self):
        """Test committee voting strategy."""
        strategy = CommitteeStrategy()

        agents = [
            AgentCapabilities(
                name=f"voter_{i}", specializations=["decision"], success_rate=0.95
            )
            for i in range(5)
        ]

        task = CoordinationTask(
            task_id="committee_task",
            task_type="decision",
            complexity=0.8,
            required_capabilities=["decision"],
            input_data={"case": "complex"},
        )

        result = await strategy.coordinate(agents, task)

        assert result["status"] == "completed"
        assert result["strategy"] == "committee"
        assert "votes" in result
        assert "decision" in result
        assert result["decision"] in ["approve", "reject", "abstain"]

    @pytest.mark.asyncio
    async def test_agent_pool_registration(self, agent_pool):
        """Test agent registration in pool."""
        agent = AgentCapabilities(name="test_agent", specializations=["test"])

        agent_pool.register_agent(agent)

        assert "test_agent" in agent_pool.agents
        assert agent_pool.agents["test_agent"] == agent

        # Test unregistration
        agent_pool.unregister_agent("test_agent")
        assert "test_agent" not in agent_pool.agents

    @pytest.mark.asyncio
    async def test_orchestrator_investigation(self, orchestrator):
        """Test coordinated fraud investigation."""
        case_data = {
            "case_id": "FRAUD-TEST-001",
            "device": {"fingerprint": "abc123"},
            "network": {"ip": "192.168.1.1"},
            "logs": {"entries": ["log1", "log2"]},
        }

        result = await orchestrator.investigate_fraud_case(case_data)

        assert result["case_id"] == "FRAUD-TEST-001"
        assert "investigation_phases" in result
        assert "coordination_metrics" in result
        assert result["coordination_metrics"]["total_agents_involved"] > 0


class TestCustomToolBuilder:
    """Test custom tool development framework."""

    @pytest.fixture
    def tool_builder(self):
        """Create InvestigationToolBuilder instance."""
        return InvestigationToolBuilder()

    def test_tool_specification_validation(self):
        """Test tool specification validation."""
        validator = ToolValidator()

        # Valid specification
        valid_spec = ToolSpecification(
            name="valid_tool",
            description="A valid tool for testing",
            category=ToolCategory.ANALYSIS,
            input_schema={"type": "object"},
            output_schema={"type": "object"},
            implementation=lambda x: {"result": x},
        )

        errors = validator.validate_specification(valid_spec)
        assert len(errors) == 0

        # Invalid specification
        invalid_spec = ToolSpecification(
            name="",  # Invalid name
            description="short",  # Too short
            category=ToolCategory.ANALYSIS,
            input_schema={},  # Empty schema
            output_schema={},  # Empty schema
            # No implementation
        )

        errors = validator.validate_specification(invalid_spec)
        assert len(errors) > 0
        assert any("name" in e for e in errors)
        assert any("description" in e for e in errors)
        assert any("implementation" in e for e in errors)

    def test_create_tool_from_specification(self, tool_builder):
        """Test creating tool from specification."""
        spec = ToolSpecification(
            name="test_analyzer",
            description="Test analysis tool",
            category=ToolCategory.ANALYSIS,
            input_schema={
                "type": "object",
                "properties": {"data": {"type": "string"}},
                "required": ["data"],
            },
            output_schema={
                "type": "object",
                "properties": {"result": {"type": "string"}},
            },
            implementation=lambda data: {"result": f"Analyzed: {data}"},
        )

        tool = tool_builder.create_tool(spec)

        assert tool.name == "test_analyzer"
        assert tool.description == "Test analysis tool"
        assert "test_analyzer" in tool_builder.registered_tools

    def test_create_tool_from_template(self, tool_builder):
        """Test creating tool from template."""

        def impl(fingerprint, metadata=None):
            return {"risk_score": 0.5, "anomalies": [], "device_trust": True}

        tool = tool_builder.create_from_template("device_analyzer", implementation=impl)

        assert tool.name == "device_fingerprint_analyzer"
        assert tool.spec.category == ToolCategory.ANALYSIS

    def test_create_tool_from_function(self, tool_builder):
        """Test creating tool from function."""

        def analyze_data(input_str: str, threshold: float = 0.5) -> dict:
            """Analyze input data."""
            return {"score": len(input_str) * threshold}

        tool = tool_builder.create_from_function(
            analyze_data, category=ToolCategory.ANALYSIS
        )

        assert tool.name == "analyze_data"
        assert "Analyze input data" in tool.description
        assert tool.spec.category == ToolCategory.ANALYSIS

    def test_performance_monitor(self):
        """Test performance monitoring."""
        monitor = PerformanceMonitor()

        # Record executions
        monitor.record_execution("tool1", 1.5, True, 100, 200)
        monitor.record_execution("tool1", 2.0, True, 150, 250)
        monitor.record_execution("tool1", 1.0, False, 50, 0)

        metrics = monitor.get_metrics("tool1")

        assert metrics["total_executions"] == 3
        assert metrics["successful_executions"] == 2
        assert metrics["failed_executions"] == 1
        assert metrics["avg_duration"] == pytest.approx(1.5, 0.1)
        assert metrics["max_duration"] == 2.0
        assert metrics["min_duration"] == 1.0

    def test_tool_optimization(self, tool_builder):
        """Test tool optimization based on metrics."""
        # Create a tool
        spec = ToolSpecification(
            name="slow_tool",
            description="A slow tool that needs optimization",
            category=ToolCategory.ANALYSIS,
            input_schema={"type": "object"},
            output_schema={"type": "object"},
            implementation=lambda: {"result": "slow"},
            performance_targets={"max_latency": 1.0, "min_success_rate": 0.95},
        )

        tool = tool_builder.create_tool(spec)

        # Simulate slow executions
        monitor = tool_builder.performance_monitor
        monitor.record_execution("slow_tool", 2.0, True)
        monitor.record_execution("slow_tool", 2.5, False)
        monitor.record_execution("slow_tool", 1.8, True)

        # Optimize
        result = tool_builder.optimize_tool("slow_tool")

        assert result["status"] == "optimized"
        assert len(result["optimizations"]) > 0
        assert tool.spec.cache_config is not None  # Should add caching

    def test_tool_catalog(self, tool_builder):
        """Test getting tool catalog."""
        # Create some tools
        for i in range(3):
            spec = ToolSpecification(
                name=f"tool_{i}",
                description=f"Test tool {i}",
                category=ToolCategory.ANALYSIS,
                input_schema={"type": "object"},
                output_schema={"type": "object"},
                implementation=lambda: {"id": i},
            )
            tool_builder.create_tool(spec)

        catalog = tool_builder.get_tool_catalog()

        assert len(catalog) == 3
        assert all(f"tool_{i}" in catalog for i in range(3))
        assert all("metrics" in info for info in catalog.values())


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
