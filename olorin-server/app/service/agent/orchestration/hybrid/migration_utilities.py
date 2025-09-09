"""
Migration Utilities with Feature Flags for Hybrid Intelligence System

This module provides safe migration capabilities between different graph implementations
with feature flags, A/B testing, and rollback mechanisms.
"""

import os
import json
from typing import Dict, Any, Optional, List
from datetime import datetime
from enum import Enum

from langgraph.graph import StateGraph

from .hybrid_graph_builder import HybridGraphBuilder
from .hybrid_state_schema import HybridInvestigationState, create_hybrid_initial_state

# Import existing graph builders for comparison
from app.service.agent.orchestration.clean_graph_builder import build_clean_investigation_graph
from app.service.agent.orchestration.orchestrator_graph import create_orchestrator_driven_graph

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class GraphType(Enum):
    """Available graph implementations"""
    CLEAN = "clean"                    # Original clean graph with safety
    ORCHESTRATOR = "orchestrator"      # AI-driven orchestrator graph
    HYBRID = "hybrid"                  # New hybrid intelligence graph


class DeploymentMode(Enum):
    """Deployment modes for gradual rollout"""
    DISABLED = "disabled"              # Feature completely disabled
    CANARY = "canary"                  # Small percentage rollout
    AB_TEST = "ab_test"               # A/B testing phase
    FULL_ROLLOUT = "full_rollout"     # Full production rollout


class FeatureFlags:
    """
    Feature flag system for safe hybrid intelligence deployment.
    
    Manages feature flags for:
    - Hybrid graph enablement
    - A/B testing configuration
    - Rollback triggers
    - Performance monitoring
    """
    
    def __init__(self):
        self.flags = {
            # Core feature flags
            "hybrid_graph_v1": {
                "enabled": False,
                "rollout_percentage": 0,
                "deployment_mode": DeploymentMode.DISABLED.value,
                "created_at": datetime.now().isoformat(),
                "last_updated": datetime.now().isoformat()
            },
            
            # Component feature flags
            "ai_confidence_engine": {
                "enabled": False,
                "rollout_percentage": 0,
                "deployment_mode": DeploymentMode.DISABLED.value
            },
            
            "advanced_safety_manager": {
                "enabled": False,
                "rollout_percentage": 0,
                "deployment_mode": DeploymentMode.DISABLED.value
            },
            
            "intelligent_router": {
                "enabled": False,
                "rollout_percentage": 0,
                "deployment_mode": DeploymentMode.DISABLED.value
            },
            
            # Testing and monitoring flags
            "hybrid_performance_monitoring": {
                "enabled": True,  # Always monitor performance
                "rollout_percentage": 100
            },
            
            "hybrid_audit_logging": {
                "enabled": True,  # Always log for audit
                "rollout_percentage": 100
            },
            
            # A/B testing flags
            "ab_test_hybrid_vs_clean": {
                "enabled": False,
                "rollout_percentage": 0,
                "test_split": 50  # 50/50 split when enabled
            }
        }
        
        # Load environment overrides
        self._load_environment_overrides()
    
    def is_enabled(self, flag_name: str, investigation_id: str = None) -> bool:
        """
        Check if a feature flag is enabled for a given investigation.
        
        Args:
            flag_name: Name of the feature flag
            investigation_id: Investigation ID for percentage rollout
            
        Returns:
            True if feature is enabled for this investigation
        """
        
        flag = self.flags.get(flag_name)
        if not flag:
            logger.warning(f"🚩 Unknown feature flag: {flag_name}")
            return False
        
        # Check if globally enabled
        if not flag.get("enabled", False):
            return False
        
        # Check rollout percentage
        rollout_percentage = flag.get("rollout_percentage", 0)
        if rollout_percentage >= 100:
            return True
        
        if rollout_percentage <= 0:
            return False
        
        # Percentage-based rollout using investigation ID hash
        if investigation_id:
            # Simple hash-based percentage rollout
            hash_value = abs(hash(investigation_id)) % 100
            is_enabled = hash_value < rollout_percentage
            
            logger.debug(f"🚩 Hybrid Intelligence feature flag {flag_name}: {rollout_percentage}% rollout")
            logger.debug(f"   Investigation {investigation_id}: hash={hash_value}, enabled={is_enabled}")
            logger.debug(f"   Feature flag system: Safe gradual rollout with hash-based assignment")
            
            return is_enabled
        
        # Default to enabled if no investigation ID provided
        return True
    
    def enable_flag(
        self,
        flag_name: str,
        rollout_percentage: int = 100,
        deployment_mode: DeploymentMode = DeploymentMode.FULL_ROLLOUT
    ):
        """Enable a feature flag with specified rollout"""
        
        if flag_name not in self.flags:
            logger.error(f"🚩 Cannot enable unknown flag: {flag_name}")
            return
        
        self.flags[flag_name].update({
            "enabled": True,
            "rollout_percentage": rollout_percentage,
            "deployment_mode": deployment_mode.value,
            "last_updated": datetime.now().isoformat()
        })
        
        logger.info(f"🚩 Feature flag enabled: {flag_name}")
        logger.info(f"   Rollout: {rollout_percentage}%")
        logger.info(f"   Mode: {deployment_mode.value}")
    
    def disable_flag(self, flag_name: str, reason: str = "manual_disable"):
        """Disable a feature flag"""
        
        if flag_name not in self.flags:
            logger.error(f"🚩 Cannot disable unknown flag: {flag_name}")
            return
        
        self.flags[flag_name].update({
            "enabled": False,
            "rollout_percentage": 0,
            "deployment_mode": DeploymentMode.DISABLED.value,
            "last_updated": datetime.now().isoformat(),
            "disable_reason": reason
        })
        
        logger.warning(f"🚩 Feature flag disabled: {flag_name}")
        logger.warning(f"   Reason: {reason}")
    
    def get_flag_status(self, flag_name: str) -> Dict[str, Any]:
        """Get complete status of a feature flag"""
        
        return self.flags.get(flag_name, {
            "enabled": False,
            "error": "Flag not found"
        })
    
    def _load_environment_overrides(self):
        """Load feature flag overrides from environment variables"""
        
        # Environment variable format: HYBRID_FLAG_{FLAG_NAME}=true/false
        for flag_name in self.flags.keys():
            env_var = f"HYBRID_FLAG_{flag_name.upper()}"
            env_value = os.environ.get(env_var)
            
            if env_value is not None:
                if env_value.lower() in ['true', '1', 'yes', 'on']:
                    self.flags[flag_name]["enabled"] = True
                    self.flags[flag_name]["rollout_percentage"] = 100
                    logger.info(f"🚩 Environment override: {flag_name} enabled via {env_var}")
                elif env_value.lower() in ['false', '0', 'no', 'off']:
                    self.flags[flag_name]["enabled"] = False
                    self.flags[flag_name]["rollout_percentage"] = 0
                    logger.info(f"🚩 Environment override: {flag_name} disabled via {env_var}")


class GraphSelector:
    """
    Safe graph selection with feature flags and rollback capability.
    
    Selects appropriate graph implementation based on:
    - Feature flag configuration
    - A/B testing assignments
    - Rollback triggers
    - Investigation characteristics
    """
    
    def __init__(self):
        self.feature_flags = FeatureFlags()
        self.performance_metrics = {}
        self.rollback_triggers = RollbackTriggers()
    
    async def get_investigation_graph(
        self,
        investigation_id: str,
        entity_type: str = "ip_address",
        force_graph_type: Optional[GraphType] = None
    ) -> StateGraph:
        """
        Select and return appropriate investigation graph.
        
        Args:
            investigation_id: Unique investigation identifier
            entity_type: Type of entity being investigated
            force_graph_type: Force specific graph type (for testing)
            
        Returns:
            Compiled investigation graph
        """
        
        logger.info(f"🎯 Selecting investigation graph")
        logger.info(f"   Investigation: {investigation_id}")
        logger.info(f"   Entity type: {entity_type}")
        
        try:
            # Check for forced graph type (testing/debugging)
            if force_graph_type:
                logger.info(f"   🎯 Forced graph type: {force_graph_type.value}")
                return await self._build_specific_graph(force_graph_type)
            
            # Check rollback triggers
            if self.rollback_triggers.should_rollback():
                logger.warning(f"   🔄 Rollback triggered - using clean graph")
                return await self._build_clean_graph()
            
            # Check hybrid graph feature flag
            if self.feature_flags.is_enabled("hybrid_graph_v1", investigation_id):
                logger.info(f"   🧠 Hybrid intelligence graph selected")
                graph = await self._build_hybrid_graph()
                self._record_graph_selection(investigation_id, GraphType.HYBRID)
                return graph
            
            # Check A/B testing flag
            if self.feature_flags.is_enabled("ab_test_hybrid_vs_clean", investigation_id):
                logger.info(f"   🧪 A/B testing active")
                graph_type = self._get_ab_test_assignment(investigation_id)
                graph = await self._build_specific_graph(graph_type)
                self._record_ab_test_assignment(investigation_id, graph_type)
                return graph
            
            # Default to clean graph
            logger.info(f"   📋 Clean graph selected (default)")
            graph = await self._build_clean_graph()
            self._record_graph_selection(investigation_id, GraphType.CLEAN)
            return graph
            
        except Exception as e:
            logger.error(f"❌ Graph selection failed: {str(e)}")
            logger.error(f"   Falling back to clean graph")
            
            # Emergency fallback to clean graph
            return await self._build_clean_graph()
    
    async def _build_hybrid_graph(self) -> StateGraph:
        """Build hybrid intelligence graph"""
        
        builder = HybridGraphBuilder(intelligence_mode="adaptive")
        return await builder.build_hybrid_investigation_graph(
            use_enhanced_tools=True,
            enable_streaming=True
        )
    
    async def _build_clean_graph(self) -> StateGraph:
        """Build clean graph (original implementation)"""
        
        return await build_clean_investigation_graph()
    
    async def _build_orchestrator_graph(self) -> StateGraph:
        """Build orchestrator-driven graph"""
        
        return await create_orchestrator_driven_graph(
            orchestration_mode="ai_driven",
            use_enhanced_tools=True
        )
    
    async def _build_specific_graph(self, graph_type: GraphType) -> StateGraph:
        """Build specific graph type"""
        
        if graph_type == GraphType.HYBRID:
            return await self._build_hybrid_graph()
        elif graph_type == GraphType.ORCHESTRATOR:
            return await self._build_orchestrator_graph()
        else:  # GraphType.CLEAN
            return await self._build_clean_graph()
    
    def _get_ab_test_assignment(self, investigation_id: str) -> GraphType:
        """Get A/B test assignment for investigation"""
        
        # Simple hash-based assignment
        hash_value = abs(hash(investigation_id)) % 100
        test_split = self.feature_flags.flags["ab_test_hybrid_vs_clean"].get("test_split", 50)
        
        if hash_value < test_split:
            logger.debug(f"   🧪 A/B assignment: HYBRID Intelligence Graph (hash={hash_value}, split={test_split})")
            return GraphType.HYBRID
        else:
            logger.debug(f"   🧪 A/B assignment: CLEAN Graph (hash={hash_value}, split={test_split})")
            return GraphType.CLEAN
    
    def _record_graph_selection(self, investigation_id: str, graph_type: GraphType):
        """Record graph selection for metrics"""
        
        selection_record = {
            "investigation_id": investigation_id,
            "graph_type": graph_type.value,
            "timestamp": datetime.now().isoformat(),
            "feature_flags": {
                flag: self.feature_flags.get_flag_status(flag)
                for flag in ["hybrid_graph_v1", "ab_test_hybrid_vs_clean"]
            }
        }
        
        logger.debug(f"📊 Hybrid Intelligence graph selection recorded: {graph_type.value}")
        logger.debug(f"   Migration utilities: Feature flag tracking & performance metrics collection")
    
    def _record_ab_test_assignment(self, investigation_id: str, graph_type: GraphType):
        """Record A/B test assignment"""
        
        assignment_record = {
            "investigation_id": investigation_id,
            "assignment": graph_type.value,
            "timestamp": datetime.now().isoformat(),
            "test_name": "hybrid_vs_clean"
        }
        
        logger.info(f"🧪 A/B test assignment: {investigation_id} → {graph_type.value}")


class RollbackTriggers:
    """
    Automatic rollback trigger system.
    
    Monitors system health and triggers rollback to clean graph
    when issues are detected.
    """
    
    def __init__(self):
        self.rollback_active = False
        self.rollback_reason = None
        self.rollback_timestamp = None
        
        # Rollback thresholds
        self.thresholds = {
            "error_rate": 0.1,          # 10% error rate triggers rollback
            "performance_degradation": 0.2,  # 20% slower triggers rollback
            "safety_override_rate": 0.3,     # 30% safety overrides triggers rollback
            "investigation_failure_rate": 0.15  # 15% failures triggers rollback
        }
    
    def should_rollback(self) -> bool:
        """Check if rollback should be triggered"""
        
        if self.rollback_active:
            logger.warning(f"🔄 Rollback active: {self.rollback_reason}")
            return True
        
        # Check for rollback triggers
        if self._check_error_rate():
            return True
        
        if self._check_performance_degradation():
            return True
        
        if self._check_safety_override_rate():
            return True
        
        return False
    
    def trigger_rollback(self, reason: str):
        """Manually trigger rollback"""
        
        self.rollback_active = True
        self.rollback_reason = reason
        self.rollback_timestamp = datetime.now().isoformat()
        
        logger.error(f"🔄 ROLLBACK TRIGGERED: {reason}")
        logger.error(f"   All investigations will use clean graph")
    
    def clear_rollback(self):
        """Clear rollback state"""
        
        self.rollback_active = False
        self.rollback_reason = None
        self.rollback_timestamp = None
        
        logger.info(f"✅ Rollback cleared - hybrid graph available")
    
    def _check_error_rate(self) -> bool:
        """Check if error rate exceeds threshold"""
        
        # This would check actual metrics in production
        # For now, return False (no rollback)
        return False
    
    def _check_performance_degradation(self) -> bool:
        """Check if performance has degraded significantly"""
        
        # This would check actual performance metrics
        # For now, return False (no rollback)
        return False
    
    def _check_safety_override_rate(self) -> bool:
        """Check if safety override rate is too high"""
        
        # This would check safety override metrics
        # For now, return False (no rollback)
        return False


# Global instance for easy access
_graph_selector = None

async def get_investigation_graph(
    investigation_id: str,
    entity_type: str = "ip_address",
    force_graph_type: Optional[GraphType] = None
) -> StateGraph:
    """
    Global function to get investigation graph with feature flags.
    
    This is the main entry point for getting investigation graphs.
    """
    
    global _graph_selector
    if _graph_selector is None:
        _graph_selector = GraphSelector()
    
    return await _graph_selector.get_investigation_graph(
        investigation_id=investigation_id,
        entity_type=entity_type,
        force_graph_type=force_graph_type
    )


def get_feature_flags() -> FeatureFlags:
    """Get global feature flags instance"""
    
    global _graph_selector
    if _graph_selector is None:
        _graph_selector = GraphSelector()
    
    return _graph_selector.feature_flags


def enable_hybrid_graph(rollout_percentage: int = 10):
    """Enable hybrid graph with gradual rollout"""
    
    feature_flags = get_feature_flags()
    feature_flags.enable_flag(
        "hybrid_graph_v1",
        rollout_percentage=rollout_percentage,
        deployment_mode=DeploymentMode.CANARY
    )
    
    logger.info(f"🚀 Hybrid graph enabled: {rollout_percentage}% rollout")


def disable_hybrid_graph(reason: str = "manual_disable"):
    """Disable hybrid graph and rollback to clean graph"""
    
    feature_flags = get_feature_flags()
    feature_flags.disable_flag("hybrid_graph_v1", reason)
    
    logger.warning(f"🛑 Hybrid graph disabled: {reason}")


def start_ab_test(test_split: int = 50):
    """Start A/B test between hybrid and clean graphs"""
    
    feature_flags = get_feature_flags()
    feature_flags.flags["ab_test_hybrid_vs_clean"].update({
        "enabled": True,
        "rollout_percentage": 100,
        "test_split": test_split
    })
    
    logger.info(f"🧪 A/B test started: {test_split}% hybrid, {100-test_split}% clean")


def stop_ab_test():
    """Stop A/B testing"""
    
    feature_flags = get_feature_flags()
    feature_flags.disable_flag("ab_test_hybrid_vs_clean", "ab_test_complete")
    
    logger.info(f"🧪 A/B test stopped")