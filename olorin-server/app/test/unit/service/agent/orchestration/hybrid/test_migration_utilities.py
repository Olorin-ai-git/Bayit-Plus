"""
Unit tests for Migration Utilities with Feature Flags
"""

import pytest
import os
from unittest.mock import Mock, patch, AsyncMock

from app.service.agent.orchestration.hybrid.migration_utilities import (
    FeatureFlags,
    GraphSelector,
    RollbackTriggers,
    GraphType,
    DeploymentMode,
    get_investigation_graph,
    enable_hybrid_graph,
    disable_hybrid_graph,
    start_ab_test,
    stop_ab_test
)


class TestFeatureFlags:
    
    @pytest.fixture
    def feature_flags(self):
        return FeatureFlags()
    
    def test_initialization(self, feature_flags):
        """Test feature flags initialization"""
        
        # Assert
        assert isinstance(feature_flags.flags, dict)
        assert "hybrid_graph_v1" in feature_flags.flags
        assert "ai_confidence_engine" in feature_flags.flags
        assert "advanced_safety_manager" in feature_flags.flags
        
        # Check default states
        assert feature_flags.flags["hybrid_graph_v1"]["enabled"] is False
        assert feature_flags.flags["hybrid_graph_v1"]["rollout_percentage"] == 0
    
    def test_is_enabled_disabled_flag(self, feature_flags):
        """Test is_enabled with disabled flag"""
        
        # Act
        is_enabled = feature_flags.is_enabled("hybrid_graph_v1", "test-001")
        
        # Assert
        assert is_enabled is False
    
    def test_is_enabled_unknown_flag(self, feature_flags):
        """Test is_enabled with unknown flag"""
        
        # Act
        is_enabled = feature_flags.is_enabled("unknown_flag", "test-001")
        
        # Assert
        assert is_enabled is False
    
    def test_is_enabled_100_percent_rollout(self, feature_flags):
        """Test is_enabled with 100% rollout"""
        
        # Arrange
        feature_flags.enable_flag("hybrid_graph_v1", 100)
        
        # Act
        is_enabled = feature_flags.is_enabled("hybrid_graph_v1", "test-001")
        
        # Assert
        assert is_enabled is True
    
    def test_is_enabled_0_percent_rollout(self, feature_flags):
        """Test is_enabled with 0% rollout"""
        
        # Arrange
        feature_flags.flags["hybrid_graph_v1"]["enabled"] = True
        feature_flags.flags["hybrid_graph_v1"]["rollout_percentage"] = 0
        
        # Act
        is_enabled = feature_flags.is_enabled("hybrid_graph_v1", "test-001")
        
        # Assert
        assert is_enabled is False
    
    def test_is_enabled_percentage_rollout_consistent(self, feature_flags):
        """Test percentage rollout consistency for same investigation ID"""
        
        # Arrange
        feature_flags.enable_flag("hybrid_graph_v1", 50)
        investigation_id = "consistent-test-001"
        
        # Act
        result1 = feature_flags.is_enabled("hybrid_graph_v1", investigation_id)
        result2 = feature_flags.is_enabled("hybrid_graph_v1", investigation_id)
        
        # Assert
        assert result1 == result2  # Should be consistent
    
    def test_enable_flag(self, feature_flags):
        """Test enabling a feature flag"""
        
        # Act
        feature_flags.enable_flag("hybrid_graph_v1", 75, DeploymentMode.AB_TEST)
        
        # Assert
        flag = feature_flags.flags["hybrid_graph_v1"]
        assert flag["enabled"] is True
        assert flag["rollout_percentage"] == 75
        assert flag["deployment_mode"] == DeploymentMode.AB_TEST.value
        assert "last_updated" in flag
    
    def test_enable_unknown_flag(self, feature_flags):
        """Test enabling unknown flag"""
        
        # Act
        feature_flags.enable_flag("unknown_flag", 50)
        
        # Assert - should not crash, but flag won't be created
        assert "unknown_flag" not in feature_flags.flags
    
    def test_disable_flag(self, feature_flags):
        """Test disabling a feature flag"""
        
        # Arrange
        feature_flags.enable_flag("hybrid_graph_v1", 100)
        
        # Act
        feature_flags.disable_flag("hybrid_graph_v1", "test_reason")
        
        # Assert
        flag = feature_flags.flags["hybrid_graph_v1"]
        assert flag["enabled"] is False
        assert flag["rollout_percentage"] == 0
        assert flag["deployment_mode"] == DeploymentMode.DISABLED.value
        assert flag["disable_reason"] == "test_reason"
    
    def test_disable_unknown_flag(self, feature_flags):
        """Test disabling unknown flag"""
        
        # Act - should not crash
        feature_flags.disable_flag("unknown_flag", "test")
        
        # Assert
        assert "unknown_flag" not in feature_flags.flags
    
    def test_get_flag_status_existing(self, feature_flags):
        """Test getting status of existing flag"""
        
        # Act
        status = feature_flags.get_flag_status("hybrid_graph_v1")
        
        # Assert
        assert isinstance(status, dict)
        assert "enabled" in status
        assert "rollout_percentage" in status
    
    def test_get_flag_status_unknown(self, feature_flags):
        """Test getting status of unknown flag"""
        
        # Act
        status = feature_flags.get_flag_status("unknown_flag")
        
        # Assert
        assert status["enabled"] is False
        assert "error" in status
    
    @patch.dict(os.environ, {'HYBRID_FLAG_HYBRID_GRAPH_V1': 'true'})
    def test_environment_override_enable(self):
        """Test environment variable override to enable flag"""
        
        # Act
        feature_flags = FeatureFlags()
        
        # Assert
        assert feature_flags.flags["hybrid_graph_v1"]["enabled"] is True
        assert feature_flags.flags["hybrid_graph_v1"]["rollout_percentage"] == 100
    
    @patch.dict(os.environ, {'HYBRID_FLAG_AI_CONFIDENCE_ENGINE': 'false'})
    def test_environment_override_disable(self):
        """Test environment variable override to disable flag"""
        
        # Act
        feature_flags = FeatureFlags()
        
        # Assert
        assert feature_flags.flags["ai_confidence_engine"]["enabled"] is False
        assert feature_flags.flags["ai_confidence_engine"]["rollout_percentage"] == 0
    
    @patch.dict(os.environ, {'HYBRID_FLAG_HYBRID_GRAPH_V1': 'invalid'})
    def test_environment_override_invalid_value(self):
        """Test environment variable override with invalid value"""
        
        # Act
        feature_flags = FeatureFlags()
        
        # Assert - should not change from default
        assert feature_flags.flags["hybrid_graph_v1"]["enabled"] is False


class TestGraphSelector:
    
    @pytest.fixture
    def graph_selector(self):
        return GraphSelector()
    
    @pytest.mark.asyncio
    async def test_get_investigation_graph_default_clean(self, graph_selector):
        """Test default graph selection returns clean graph"""
        
        # Mock the graph building methods
        with patch.object(graph_selector, '_build_clean_graph', new_callable=AsyncMock) as mock_clean:
            mock_clean.return_value = Mock()
            
            # Act
            graph = await graph_selector.get_investigation_graph("test-001")
            
            # Assert
            mock_clean.assert_called_once()
            assert graph is not None
    
    @pytest.mark.asyncio
    async def test_get_investigation_graph_forced_hybrid(self, graph_selector):
        """Test forced hybrid graph selection"""
        
        # Mock the graph building methods
        with patch.object(graph_selector, '_build_hybrid_graph', new_callable=AsyncMock) as mock_hybrid:
            mock_hybrid.return_value = Mock()
            
            # Act
            graph = await graph_selector.get_investigation_graph(
                "test-001", 
                force_graph_type=GraphType.HYBRID
            )
            
            # Assert
            mock_hybrid.assert_called_once()
            assert graph is not None
    
    @pytest.mark.asyncio
    async def test_get_investigation_graph_forced_orchestrator(self, graph_selector):
        """Test forced orchestrator graph selection"""
        
        # Mock the graph building methods
        with patch.object(graph_selector, '_build_orchestrator_graph', new_callable=AsyncMock) as mock_orchestrator:
            mock_orchestrator.return_value = Mock()
            
            # Act
            graph = await graph_selector.get_investigation_graph(
                "test-001",
                force_graph_type=GraphType.ORCHESTRATOR
            )
            
            # Assert
            mock_orchestrator.assert_called_once()
            assert graph is not None
    
    @pytest.mark.asyncio
    async def test_get_investigation_graph_rollback_active(self, graph_selector):
        """Test graph selection with active rollback"""
        
        # Arrange
        graph_selector.rollback_triggers.trigger_rollback("test_rollback")
        
        with patch.object(graph_selector, '_build_clean_graph', new_callable=AsyncMock) as mock_clean:
            mock_clean.return_value = Mock()
            
            # Act
            graph = await graph_selector.get_investigation_graph("test-001")
            
            # Assert
            mock_clean.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_get_investigation_graph_hybrid_enabled(self, graph_selector):
        """Test graph selection with hybrid enabled"""
        
        # Arrange
        graph_selector.feature_flags.enable_flag("hybrid_graph_v1", 100)
        
        with patch.object(graph_selector, '_build_hybrid_graph', new_callable=AsyncMock) as mock_hybrid:
            mock_hybrid.return_value = Mock()
            
            # Act
            graph = await graph_selector.get_investigation_graph("test-001")
            
            # Assert
            mock_hybrid.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_get_investigation_graph_ab_test(self, graph_selector):
        """Test graph selection with A/B testing enabled"""
        
        # Arrange
        graph_selector.feature_flags.enable_flag("ab_test_hybrid_vs_clean", 100)
        
        with patch.object(graph_selector, '_build_hybrid_graph', new_callable=AsyncMock) as mock_hybrid, \
             patch.object(graph_selector, '_build_clean_graph', new_callable=AsyncMock) as mock_clean:
            
            mock_hybrid.return_value = Mock()
            mock_clean.return_value = Mock()
            
            # Act - test with different investigation IDs to get both assignments
            graph1 = await graph_selector.get_investigation_graph("test-001")
            graph2 = await graph_selector.get_investigation_graph("test-002")
            
            # Assert - at least one of each method should be called
            total_calls = mock_hybrid.call_count + mock_clean.call_count
            assert total_calls == 2
    
    @pytest.mark.asyncio
    async def test_get_investigation_graph_error_fallback(self, graph_selector):
        """Test error handling with fallback to clean graph"""
        
        # Arrange
        graph_selector.feature_flags.enable_flag("hybrid_graph_v1", 100)
        
        with patch.object(graph_selector, '_build_hybrid_graph', new_callable=AsyncMock) as mock_hybrid, \
             patch.object(graph_selector, '_build_clean_graph', new_callable=AsyncMock) as mock_clean:
            
            mock_hybrid.side_effect = Exception("Hybrid graph error")
            mock_clean.return_value = Mock()
            
            # Act
            graph = await graph_selector.get_investigation_graph("test-001")
            
            # Assert
            mock_clean.assert_called_once()
            assert graph is not None
    
    def test_get_ab_test_assignment_consistent(self, graph_selector):
        """Test A/B test assignment consistency"""
        
        # Arrange
        graph_selector.feature_flags.flags["ab_test_hybrid_vs_clean"]["test_split"] = 50
        investigation_id = "consistent-ab-test"
        
        # Act
        assignment1 = graph_selector._get_ab_test_assignment(investigation_id)
        assignment2 = graph_selector._get_ab_test_assignment(investigation_id)
        
        # Assert
        assert assignment1 == assignment2  # Should be consistent
        assert assignment1 in [GraphType.HYBRID, GraphType.CLEAN]
    
    def test_record_graph_selection(self, graph_selector):
        """Test recording graph selection"""
        
        # Act - should not raise exception
        graph_selector._record_graph_selection("test-001", GraphType.HYBRID)
        
        # Assert - just verify no exception raised
        assert True
    
    def test_record_ab_test_assignment(self, graph_selector):
        """Test recording A/B test assignment"""
        
        # Act - should not raise exception
        graph_selector._record_ab_test_assignment("test-001", GraphType.CLEAN)
        
        # Assert - just verify no exception raised
        assert True


class TestRollbackTriggers:
    
    @pytest.fixture
    def rollback_triggers(self):
        return RollbackTriggers()
    
    def test_initialization(self, rollback_triggers):
        """Test rollback triggers initialization"""
        
        # Assert
        assert rollback_triggers.rollback_active is False
        assert rollback_triggers.rollback_reason is None
        assert rollback_triggers.rollback_timestamp is None
        assert isinstance(rollback_triggers.thresholds, dict)
    
    def test_should_rollback_inactive(self, rollback_triggers):
        """Test should_rollback when rollback is inactive"""
        
        # Act
        should_rollback = rollback_triggers.should_rollback()
        
        # Assert
        assert should_rollback is False
    
    def test_trigger_rollback(self, rollback_triggers):
        """Test triggering rollback"""
        
        # Act
        rollback_triggers.trigger_rollback("test_reason")
        
        # Assert
        assert rollback_triggers.rollback_active is True
        assert rollback_triggers.rollback_reason == "test_reason"
        assert rollback_triggers.rollback_timestamp is not None
    
    def test_should_rollback_active(self, rollback_triggers):
        """Test should_rollback when rollback is active"""
        
        # Arrange
        rollback_triggers.trigger_rollback("test_reason")
        
        # Act
        should_rollback = rollback_triggers.should_rollback()
        
        # Assert
        assert should_rollback is True
    
    def test_clear_rollback(self, rollback_triggers):
        """Test clearing rollback"""
        
        # Arrange
        rollback_triggers.trigger_rollback("test_reason")
        
        # Act
        rollback_triggers.clear_rollback()
        
        # Assert
        assert rollback_triggers.rollback_active is False
        assert rollback_triggers.rollback_reason is None
        assert rollback_triggers.rollback_timestamp is None
    
    def test_check_error_rate(self, rollback_triggers):
        """Test error rate checking"""
        
        # Act
        should_rollback = rollback_triggers._check_error_rate()
        
        # Assert
        assert should_rollback is False  # Default implementation
    
    def test_check_performance_degradation(self, rollback_triggers):
        """Test performance degradation checking"""
        
        # Act
        should_rollback = rollback_triggers._check_performance_degradation()
        
        # Assert
        assert should_rollback is False  # Default implementation
    
    def test_check_safety_override_rate(self, rollback_triggers):
        """Test safety override rate checking"""
        
        # Act
        should_rollback = rollback_triggers._check_safety_override_rate()
        
        # Assert
        assert should_rollback is False  # Default implementation


class TestGlobalFunctions:
    
    @pytest.mark.asyncio
    async def test_get_investigation_graph_global(self):
        """Test global get_investigation_graph function"""
        
        with patch('app.service.agent.orchestration.hybrid.migration_utilities.GraphSelector') as mock_selector_class:
            mock_selector = Mock()
            mock_selector.get_investigation_graph = AsyncMock(return_value=Mock())
            mock_selector_class.return_value = mock_selector
            
            # Act
            graph = await get_investigation_graph("test-001")
            
            # Assert
            mock_selector.get_investigation_graph.assert_called_once_with(
                investigation_id="test-001",
                entity_type="ip_address",
                force_graph_type=None
            )
            assert graph is not None
    
    def test_enable_hybrid_graph_global(self):
        """Test global enable_hybrid_graph function"""
        
        with patch('app.service.agent.orchestration.hybrid.migration_utilities.get_feature_flags') as mock_get_flags:
            mock_flags = Mock()
            mock_get_flags.return_value = mock_flags
            
            # Act
            enable_hybrid_graph(25)
            
            # Assert
            mock_flags.enable_flag.assert_called_once_with(
                "hybrid_graph_v1",
                rollout_percentage=25,
                deployment_mode=DeploymentMode.CANARY
            )
    
    def test_disable_hybrid_graph_global(self):
        """Test global disable_hybrid_graph function"""
        
        with patch('app.service.agent.orchestration.hybrid.migration_utilities.get_feature_flags') as mock_get_flags:
            mock_flags = Mock()
            mock_get_flags.return_value = mock_flags
            
            # Act
            disable_hybrid_graph("test_disable")
            
            # Assert
            mock_flags.disable_flag.assert_called_once_with("hybrid_graph_v1", "test_disable")
    
    def test_start_ab_test_global(self):
        """Test global start_ab_test function"""
        
        with patch('app.service.agent.orchestration.hybrid.migration_utilities.get_feature_flags') as mock_get_flags:
            mock_flags = Mock()
            mock_flags.flags = {"ab_test_hybrid_vs_clean": {}}
            mock_get_flags.return_value = mock_flags
            
            # Act
            start_ab_test(60)
            
            # Assert
            assert mock_flags.flags["ab_test_hybrid_vs_clean"]["enabled"] is True
            assert mock_flags.flags["ab_test_hybrid_vs_clean"]["rollout_percentage"] == 100
            assert mock_flags.flags["ab_test_hybrid_vs_clean"]["test_split"] == 60
    
    def test_stop_ab_test_global(self):
        """Test global stop_ab_test function"""
        
        with patch('app.service.agent.orchestration.hybrid.migration_utilities.get_feature_flags') as mock_get_flags:
            mock_flags = Mock()
            mock_get_flags.return_value = mock_flags
            
            # Act
            stop_ab_test()
            
            # Assert
            mock_flags.disable_flag.assert_called_once_with("ab_test_hybrid_vs_clean", "ab_test_complete")


class TestEnumDefinitions:
    
    def test_graph_type_enum(self):
        """Test GraphType enum values"""
        
        # Assert
        assert GraphType.CLEAN.value == "clean"
        assert GraphType.ORCHESTRATOR.value == "orchestrator"
        assert GraphType.HYBRID.value == "hybrid"
    
    def test_deployment_mode_enum(self):
        """Test DeploymentMode enum values"""
        
        # Assert
        assert DeploymentMode.DISABLED.value == "disabled"
        assert DeploymentMode.CANARY.value == "canary"
        assert DeploymentMode.AB_TEST.value == "ab_test"
        assert DeploymentMode.FULL_ROLLOUT.value == "full_rollout"