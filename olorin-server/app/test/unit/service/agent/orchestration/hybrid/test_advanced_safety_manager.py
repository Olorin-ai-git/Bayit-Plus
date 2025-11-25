"""
Unit tests for Advanced Safety Manager
"""

import os
from datetime import datetime, timedelta
from unittest.mock import Mock, patch

import pytest

from app.service.agent.orchestration.hybrid.hybrid_state_schema import (
    AIConfidenceLevel,
    HybridInvestigationState,
    InvestigationStrategy,
    SafetyConcernType,
    create_hybrid_initial_state,
)
from app.service.agent.orchestration.hybrid.safety import (
    AdvancedSafetyManager,
    SafetyConcern,
    SafetyLevel,
    SafetyLimits,
    SafetyStatus,
)


class TestAdvancedSafetyManager:

    @pytest.fixture
    def safety_manager(self):
        return AdvancedSafetyManager()

    @pytest.fixture
    def mock_state(self):
        return create_hybrid_initial_state(
            investigation_id="safety-test-001",
            entity_id="192.168.1.200",
            entity_type="ip",
        )

    def test_validate_current_state_basic(self, safety_manager, mock_state):
        """Test basic safety validation"""

        # Act
        safety_status = safety_manager.validate_current_state(mock_state)

        # Assert
        assert isinstance(safety_status, SafetyStatus)
        assert isinstance(safety_status.allows_ai_control, bool)
        assert isinstance(safety_status.requires_immediate_termination, bool)
        assert safety_status.safety_level in SafetyLevel
        assert isinstance(safety_status.current_limits, SafetyLimits)
        assert isinstance(safety_status.resource_pressure, float)
        assert 0.0 <= safety_status.resource_pressure <= 1.0

    def test_determine_safety_level_high_confidence(self, safety_manager, mock_state):
        """Test safety level determination with high AI confidence"""

        # Arrange
        mock_state["ai_confidence"] = 0.9
        mock_state["ai_confidence_level"] = AIConfidenceLevel.HIGH
        mock_state["safety_overrides"] = []
        mock_state["orchestrator_loops"] = 2

        # Act
        safety_level = safety_manager._determine_safety_level(mock_state)

        # Assert
        assert safety_level == SafetyLevel.PERMISSIVE

    def test_determine_safety_level_low_confidence(self, safety_manager, mock_state):
        """Test safety level determination with low AI confidence"""

        # Arrange
        mock_state["ai_confidence"] = 0.2
        mock_state["ai_confidence_level"] = AIConfidenceLevel.LOW

        # Act
        safety_level = safety_manager._determine_safety_level(mock_state)

        # Assert
        assert safety_level == SafetyLevel.STRICT

    def test_determine_safety_level_emergency(self, safety_manager, mock_state):
        """Test safety level determination for emergency conditions"""

        # Arrange
        mock_state["orchestrator_loops"] = 25  # Excessive loops

        # Act
        safety_level = safety_manager._determine_safety_level(mock_state)

        # Assert
        assert safety_level == SafetyLevel.EMERGENCY

    def test_determine_safety_level_multiple_overrides(
        self, safety_manager, mock_state
    ):
        """Test safety level with multiple safety overrides"""

        # Arrange
        mock_state["safety_overrides"] = [
            {"reason": "override1"},
            {"reason": "override2"},
            {"reason": "override3"},
        ]

        # Act
        safety_level = safety_manager._determine_safety_level(mock_state)

        # Assert
        assert safety_level == SafetyLevel.EMERGENCY

    @patch.dict(os.environ, {"TEST_MODE": "mock"})
    def test_calculate_dynamic_limits_test_mode(self, safety_manager, mock_state):
        """Test dynamic limits calculation in test mode"""

        # Arrange
        mock_state["investigation_strategy"] = InvestigationStrategy.ADAPTIVE

        # Act
        limits = safety_manager._calculate_dynamic_limits(
            mock_state, SafetyLevel.STANDARD
        )

        # Assert
        assert isinstance(limits, SafetyLimits)
        assert limits.max_orchestrator_loops == 12  # Test mode base limit
        assert limits.max_tool_executions == 8
        assert limits.max_domain_attempts == 6

    @patch.dict(os.environ, {"TEST_MODE": "live"})
    def test_calculate_dynamic_limits_live_mode(self, safety_manager, mock_state):
        """Test dynamic limits calculation in live mode"""

        # Arrange
        mock_state["investigation_strategy"] = InvestigationStrategy.ADAPTIVE

        # Act
        limits = safety_manager._calculate_dynamic_limits(
            mock_state, SafetyLevel.STANDARD
        )

        # Assert
        assert limits.max_orchestrator_loops == 25  # Live mode base limit
        assert limits.max_tool_executions == 15
        assert limits.max_domain_attempts == 10

    def test_calculate_dynamic_limits_permissive_level(
        self, safety_manager, mock_state
    ):
        """Test dynamic limits with permissive safety level"""

        # Arrange
        mock_state["investigation_strategy"] = InvestigationStrategy.ADAPTIVE

        # Act
        limits = safety_manager._calculate_dynamic_limits(
            mock_state, SafetyLevel.PERMISSIVE
        )

        # Assert
        # Should have increased limits due to permissive level
        standard_limits = safety_manager._calculate_dynamic_limits(
            mock_state, SafetyLevel.STANDARD
        )
        assert limits.max_orchestrator_loops > standard_limits.max_orchestrator_loops
        assert limits.max_tool_executions > standard_limits.max_tool_executions

    def test_calculate_dynamic_limits_strict_level(self, safety_manager, mock_state):
        """Test dynamic limits with strict safety level"""

        # Arrange
        mock_state["investigation_strategy"] = InvestigationStrategy.ADAPTIVE

        # Act
        limits = safety_manager._calculate_dynamic_limits(
            mock_state, SafetyLevel.STRICT
        )

        # Assert
        # Should have decreased limits due to strict level
        standard_limits = safety_manager._calculate_dynamic_limits(
            mock_state, SafetyLevel.STANDARD
        )
        assert limits.max_orchestrator_loops < standard_limits.max_orchestrator_loops
        assert limits.max_tool_executions < standard_limits.max_tool_executions

    def test_calculate_dynamic_limits_comprehensive_strategy(
        self, safety_manager, mock_state
    ):
        """Test dynamic limits with comprehensive strategy"""

        # Arrange
        mock_state["investigation_strategy"] = InvestigationStrategy.COMPREHENSIVE

        # Act
        limits = safety_manager._calculate_dynamic_limits(
            mock_state, SafetyLevel.STANDARD
        )

        # Assert
        # Should have increased limits for comprehensive strategy
        adaptive_limits = safety_manager._calculate_dynamic_limits(
            {**mock_state, "investigation_strategy": InvestigationStrategy.ADAPTIVE},
            SafetyLevel.STANDARD,
        )
        assert limits.max_orchestrator_loops >= adaptive_limits.max_orchestrator_loops
        assert limits.max_tool_executions >= adaptive_limits.max_tool_executions

    def test_calculate_dynamic_limits_minimal_strategy(
        self, safety_manager, mock_state
    ):
        """Test dynamic limits with minimal strategy"""

        # Arrange
        mock_state["investigation_strategy"] = InvestigationStrategy.MINIMAL

        # Act
        limits = safety_manager._calculate_dynamic_limits(
            mock_state, SafetyLevel.STANDARD
        )

        # Assert
        # Should have decreased limits for minimal strategy
        adaptive_limits = safety_manager._calculate_dynamic_limits(
            {**mock_state, "investigation_strategy": InvestigationStrategy.ADAPTIVE},
            SafetyLevel.STANDARD,
        )
        assert limits.max_orchestrator_loops <= adaptive_limits.max_orchestrator_loops
        assert limits.max_tool_executions <= adaptive_limits.max_tool_executions

    def test_calculate_resource_pressure_low(self, safety_manager, mock_state):
        """Test resource pressure calculation with low usage"""

        # Arrange
        mock_state["orchestrator_loops"] = 2
        mock_state["tools_used"] = ["tool1"]
        mock_state["domains_completed"] = ["network"]

        limits = SafetyLimits(
            max_orchestrator_loops=20,
            max_tool_executions=10,
            max_domain_attempts=6,
            max_investigation_time_minutes=30,
            confidence_threshold_for_override=0.4,
            resource_pressure_threshold=0.8,
        )

        # Act
        pressure = safety_manager._calculate_resource_pressure(mock_state, limits)

        # Assert
        assert 0.0 <= pressure <= 1.0
        assert pressure < 0.5  # Should be low pressure

    def test_calculate_resource_pressure_high(self, safety_manager, mock_state):
        """Test resource pressure calculation with high usage"""

        # Arrange
        mock_state["orchestrator_loops"] = 18  # Close to limit of 20
        mock_state["tools_used"] = [
            "tool1",
            "tool2",
            "tool3",
            "tool4",
            "tool5",
            "tool6",
            "tool7",
            "tool8",
        ]
        mock_state["domains_completed"] = [
            "network",
            "device",
            "location",
            "logs",
            "auth",
        ]

        limits = SafetyLimits(
            max_orchestrator_loops=20,
            max_tool_executions=10,
            max_domain_attempts=6,
            max_investigation_time_minutes=30,
            confidence_threshold_for_override=0.4,
            resource_pressure_threshold=0.8,
        )

        # Act
        pressure = safety_manager._calculate_resource_pressure(mock_state, limits)

        # Assert
        assert pressure > 0.8  # Should be high pressure

    def test_identify_safety_concerns_loop_risk(self, safety_manager, mock_state):
        """Test identification of loop risk concerns"""

        # Arrange
        mock_state["orchestrator_loops"] = 18

        limits = SafetyLimits(
            max_orchestrator_loops=20,
            max_tool_executions=10,
            max_domain_attempts=6,
            max_investigation_time_minutes=30,
            confidence_threshold_for_override=0.4,
            resource_pressure_threshold=0.8,
        )

        # Act
        concerns = safety_manager._identify_safety_concerns(mock_state, limits, 0.9)

        # Assert
        loop_concerns = [
            c for c in concerns if c.concern_type == SafetyConcernType.LOOP_RISK
        ]
        assert len(loop_concerns) > 0
        assert any(c.severity in ["high", "critical"] for c in loop_concerns)

    def test_identify_safety_concerns_resource_pressure(
        self, safety_manager, mock_state
    ):
        """Test identification of resource pressure concerns"""

        # Arrange
        limits = SafetyLimits(
            max_orchestrator_loops=20,
            max_tool_executions=10,
            max_domain_attempts=6,
            max_investigation_time_minutes=30,
            confidence_threshold_for_override=0.4,
            resource_pressure_threshold=0.7,
        )

        # Act
        concerns = safety_manager._identify_safety_concerns(mock_state, limits, 0.85)

        # Assert
        pressure_concerns = [
            c for c in concerns if c.concern_type == SafetyConcernType.RESOURCE_PRESSURE
        ]
        assert len(pressure_concerns) > 0

    def test_identify_safety_concerns_confidence_drop(self, safety_manager, mock_state):
        """Test identification of confidence drop concerns"""

        # Arrange
        mock_state["confidence_evolution"] = [
            {
                "timestamp": "2024-01-01T10:00:00",
                "confidence": 0.8,
                "trigger": "initial",
            },
            {
                "timestamp": "2024-01-01T10:05:00",
                "confidence": 0.4,
                "trigger": "update",
            },  # Significant drop
        ]

        limits = SafetyLimits(
            max_orchestrator_loops=20,
            max_tool_executions=10,
            max_domain_attempts=6,
            max_investigation_time_minutes=30,
            confidence_threshold_for_override=0.4,
            resource_pressure_threshold=0.8,
        )

        # Act
        concerns = safety_manager._identify_safety_concerns(mock_state, limits, 0.3)

        # Assert
        confidence_concerns = [
            c for c in concerns if c.concern_type == SafetyConcernType.CONFIDENCE_DROP
        ]
        assert len(confidence_concerns) > 0

    def test_identify_safety_concerns_evidence_insufficient(
        self, safety_manager, mock_state
    ):
        """Test identification of insufficient evidence concerns"""

        # Arrange
        from app.service.agent.orchestration.hybrid.hybrid_state_schema import (
            AIConfidenceLevel,
            AIRoutingDecision,
            InvestigationStrategy,
        )

        low_evidence_decision = AIRoutingDecision(
            confidence=0.3,
            confidence_level=AIConfidenceLevel.LOW,
            recommended_action="continue",
            reasoning=["Low evidence"],
            evidence_quality=0.2,  # Low evidence quality
            investigation_completeness=0.3,
            strategy=InvestigationStrategy.ADAPTIVE,
            agents_to_activate=[],
            tools_recommended=[],
            required_safety_checks=[],
            resource_impact="medium",
        )

        mock_state["ai_decisions"] = [low_evidence_decision]
        mock_state["orchestrator_loops"] = 6

        limits = SafetyLimits(
            max_orchestrator_loops=20,
            max_tool_executions=10,
            max_domain_attempts=6,
            max_investigation_time_minutes=30,
            confidence_threshold_for_override=0.4,
            resource_pressure_threshold=0.8,
        )

        # Act
        concerns = safety_manager._identify_safety_concerns(mock_state, limits, 0.3)

        # Assert
        evidence_concerns = [
            c
            for c in concerns
            if c.concern_type == SafetyConcernType.EVIDENCE_INSUFFICIENT
        ]
        assert len(evidence_concerns) > 0

    def test_should_allow_ai_control_high_confidence_low_pressure(
        self, safety_manager, mock_state
    ):
        """Test AI control allowed with high confidence and low pressure"""

        # Arrange
        mock_state["ai_confidence"] = 0.9
        mock_state["ai_confidence_level"] = AIConfidenceLevel.HIGH

        # Act
        allows_control = safety_manager._should_allow_ai_control(mock_state, [], 0.3)

        # Assert
        assert allows_control is True

    def test_should_allow_ai_control_critical_concerns(
        self, safety_manager, mock_state
    ):
        """Test AI control denied with critical concerns"""

        # Arrange
        critical_concern = SafetyConcern(
            concern_type=SafetyConcernType.LOOP_RISK,
            severity="critical",
            message="Critical loop risk",
            metrics={"loops": 25},
            recommended_action="terminate",
        )

        # Act
        allows_control = safety_manager._should_allow_ai_control(
            mock_state, [critical_concern], 0.3
        )

        # Assert
        assert allows_control is False

    def test_should_allow_ai_control_medium_confidence_high_pressure(
        self, safety_manager, mock_state
    ):
        """Test AI control denied with medium confidence and high pressure"""

        # Arrange
        mock_state["ai_confidence"] = 0.6
        mock_state["ai_confidence_level"] = AIConfidenceLevel.MEDIUM

        # Act
        allows_control = safety_manager._should_allow_ai_control(mock_state, [], 0.85)

        # Assert
        assert allows_control is False

    def test_requires_immediate_termination_critical_concerns(
        self, safety_manager, mock_state
    ):
        """Test immediate termination with critical concerns"""

        # Arrange
        critical_concern = SafetyConcern(
            concern_type=SafetyConcernType.LOOP_RISK,
            severity="critical",
            message="Critical loop risk",
            metrics={},
            recommended_action="terminate",
        )

        limits = SafetyLimits(
            max_orchestrator_loops=20,
            max_tool_executions=10,
            max_domain_attempts=6,
            max_investigation_time_minutes=30,
            confidence_threshold_for_override=0.4,
            resource_pressure_threshold=0.8,
        )

        # Act
        requires_termination = safety_manager._requires_immediate_termination(
            mock_state, [critical_concern], limits
        )

        # Assert
        assert requires_termination is True

    def test_requires_immediate_termination_loop_limit_exceeded(
        self, safety_manager, mock_state
    ):
        """Test immediate termination when loop limit exceeded"""

        # Arrange
        mock_state["orchestrator_loops"] = 25

        limits = SafetyLimits(
            max_orchestrator_loops=20,
            max_tool_executions=10,
            max_domain_attempts=6,
            max_investigation_time_minutes=30,
            confidence_threshold_for_override=0.4,
            resource_pressure_threshold=0.8,
        )

        # Act
        requires_termination = safety_manager._requires_immediate_termination(
            mock_state, [], limits
        )

        # Assert
        assert requires_termination is True

    def test_requires_immediate_termination_normal_conditions(
        self, safety_manager, mock_state
    ):
        """Test no immediate termination under normal conditions"""

        # Arrange
        mock_state["orchestrator_loops"] = 5
        mock_state["tools_used"] = ["tool1", "tool2"]

        limits = SafetyLimits(
            max_orchestrator_loops=20,
            max_tool_executions=10,
            max_domain_attempts=6,
            max_investigation_time_minutes=30,
            confidence_threshold_for_override=0.4,
            resource_pressure_threshold=0.8,
        )

        # Act
        requires_termination = safety_manager._requires_immediate_termination(
            mock_state, [], limits
        )

        # Assert
        assert requires_termination is False

    def test_build_override_reasoning(self, safety_manager, mock_state):
        """Test override reasoning construction"""

        # Arrange
        concerns = [
            SafetyConcern(
                concern_type=SafetyConcernType.RESOURCE_PRESSURE,
                severity="high",
                message="High resource usage",
                metrics={},
                recommended_action="reduce_usage",
            )
        ]

        # Act
        reasoning = safety_manager._build_override_reasoning(
            mock_state, concerns, False
        )

        # Assert
        assert len(reasoning) > 0
        assert any("denied" in r.lower() for r in reasoning)

    def test_calculate_remaining_resources(self, safety_manager, mock_state):
        """Test remaining resources calculation"""

        # Arrange
        mock_state["orchestrator_loops"] = 5
        mock_state["tools_used"] = ["tool1", "tool2"]
        mock_state["domains_completed"] = ["network"]

        limits = SafetyLimits(
            max_orchestrator_loops=20,
            max_tool_executions=10,
            max_domain_attempts=6,
            max_investigation_time_minutes=30,
            confidence_threshold_for_override=0.4,
            resource_pressure_threshold=0.8,
        )

        # Act
        remaining = safety_manager._calculate_remaining_resources(mock_state, limits)

        # Assert
        assert remaining["orchestrator_loops"] == 15  # 20 - 5
        assert remaining["tool_executions"] == 8  # 10 - 2
        assert remaining["domain_attempts"] == 5  # 6 - 1
        assert "time_minutes" in remaining

    def test_generate_recommended_actions_critical_concerns(
        self, safety_manager, mock_state
    ):
        """Test recommended actions with critical concerns"""

        # Arrange
        critical_concern = SafetyConcern(
            concern_type=SafetyConcernType.LOOP_RISK,
            severity="critical",
            message="Critical issue",
            metrics={},
            recommended_action="terminate",
        )

        # Act
        actions = safety_manager._generate_recommended_actions(
            mock_state, [critical_concern], 0.9
        )

        # Assert
        assert len(actions) > 0
        assert any("immediate" in action.lower() for action in actions)
        assert any("emergency" in action.lower() for action in actions)

    def test_generate_recommended_actions_high_pressure(
        self, safety_manager, mock_state
    ):
        """Test recommended actions with high resource pressure"""

        # Act
        actions = safety_manager._generate_recommended_actions(mock_state, [], 0.85)

        # Assert
        assert len(actions) > 0
        assert any("reduce" in action.lower() for action in actions)

    def test_generate_recommended_actions_normal_conditions(
        self, safety_manager, mock_state
    ):
        """Test recommended actions under normal conditions"""

        # Act
        actions = safety_manager._generate_recommended_actions(mock_state, [], 0.3)

        # Assert
        assert len(actions) > 0
        assert any("continue" in action.lower() for action in actions)

    def test_safety_concern_creation(self):
        """Test SafetyConcern object creation"""

        # Act
        concern = SafetyConcern(
            concern_type=SafetyConcernType.LOOP_RISK,
            severity="high",
            message="Test concern",
            metrics={"test": "value"},
            recommended_action="test_action",
        )

        # Assert
        assert concern.concern_type == SafetyConcernType.LOOP_RISK
        assert concern.severity == "high"
        assert concern.message == "Test concern"
        assert concern.metrics == {"test": "value"}
        assert concern.recommended_action == "test_action"
        assert concern.timestamp is not None

    def test_safety_limits_creation(self):
        """Test SafetyLimits object creation"""

        # Act
        limits = SafetyLimits(
            max_orchestrator_loops=20,
            max_tool_executions=10,
            max_domain_attempts=6,
            max_investigation_time_minutes=30,
            confidence_threshold_for_override=0.4,
            resource_pressure_threshold=0.8,
        )

        # Assert
        assert limits.max_orchestrator_loops == 20
        assert limits.max_tool_executions == 10
        assert limits.max_domain_attempts == 6
        assert limits.max_investigation_time_minutes == 30
        assert limits.confidence_threshold_for_override == 0.4
        assert limits.resource_pressure_threshold == 0.8
