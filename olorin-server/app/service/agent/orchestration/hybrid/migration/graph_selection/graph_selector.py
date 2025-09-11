"""
Main Graph Selection Logic for Hybrid Intelligence System

Orchestrates graph selection based on feature flags, rollback triggers,
and A/B testing configuration with typed results to prevent silent failures.
"""

from typing import Optional
from datetime import datetime
from langgraph.graph import StateGraph

from app.service.logging import get_bridge_logger
from ..feature_flags.flag_manager import GraphType, FeatureFlags
from ..rollback.rollback_triggers import RollbackTriggers
from .graph_builders import GraphBuilders
from .ab_test_manager import ABTestManager
from .graph_selection_result import (
    GraphSelectionResult, GraphSelectionSuccess, GraphSelectionFailure,
    GraphSelectionError, SelectionReason, create_success_result, create_failure_result,
    is_success, is_failure
)
from ...observability import increment_counter

logger = get_bridge_logger(__name__)


class GraphSelector:
    """
    Safe graph selection with feature flags and rollback capability.
    
    Selects appropriate graph implementation based on:
    - Feature flag configuration
    - A/B testing assignments
    - Rollback triggers
    - Investigation characteristics
    
    Returns typed results to prevent silent failures and track fallbacks.
    """
    
    def __init__(self):
        self.feature_flags = FeatureFlags()
        self.rollback_triggers = RollbackTriggers()
        self.graph_builders = GraphBuilders()
        self.ab_test_manager = ABTestManager(self.feature_flags)
        self.performance_metrics = {}
        self.fallback_counter = 0  # Track fallbacks for CI monitoring
    
    async def select_investigation_graph(
        self,
        investigation_id: str,
        entity_type: str = "ip_address",
        force_graph_type: Optional[GraphType] = None
    ) -> GraphSelectionResult:
        """
        Select appropriate investigation graph with typed result.
        
        Args:
            investigation_id: Unique investigation identifier
            entity_type: Type of entity being investigated
            force_graph_type: Force specific graph type (for testing)
            
        Returns:
            Typed graph selection result (success or failure)
        """
        
        if not investigation_id:
            increment_counter("graph_selection_failures", metadata={"reason": "missing_investigation_id"})
            return create_failure_result(
                "investigation_id is required",
                investigation_id or "unknown",
                context={"entity_type": entity_type}
            )
        
        # Track all graph selection attempts
        increment_counter("graph_selection_attempts", metadata={"entity_type": entity_type})
        
        logger.info(f"🎯 Selecting investigation graph with typed results")
        logger.info(f"   Investigation: {investigation_id}")
        logger.info(f"   Entity type: {entity_type}")
        logger.info(f"   Fallback counter: {self.fallback_counter}")
        
        try:
            # Check for forced graph type (testing/debugging)
            if force_graph_type:
                logger.info(f"   🎯 Forced graph type: {force_graph_type.value}")
                try:
                    graph = await self.graph_builders.build_graph(force_graph_type)
                    self._record_graph_selection(investigation_id, force_graph_type, SelectionReason.FORCED)
                    return create_success_result(
                        graph, force_graph_type, SelectionReason.FORCED, investigation_id,
                        context={"entity_type": entity_type}
                    )
                except Exception as e:
                    return create_failure_result(
                        f"Failed to build forced graph type {force_graph_type.value}: {str(e)}",
                        investigation_id, force_graph_type,
                        context={"entity_type": entity_type, "error_type": type(e).__name__}
                    )
            
            # Check rollback triggers first (highest priority)
            if self.rollback_triggers.should_rollback():
                logger.warning(f"   🔄 Rollback triggered - using clean graph")
                self.fallback_counter += 1
                increment_counter("graph_selection_fallbacks", metadata={"reason": "rollback_triggered"})
                try:
                    graph = await self.graph_builders.build_graph(GraphType.CLEAN)
                    self._record_graph_selection(investigation_id, GraphType.CLEAN, SelectionReason.ROLLBACK)
                    return create_success_result(
                        graph, GraphType.CLEAN, SelectionReason.ROLLBACK, investigation_id,
                        fallback_occurred=True,
                        context={"entity_type": entity_type, "rollback_reason": "rollback_triggers_active"}
                    )
                except Exception as e:
                    return create_failure_result(
                        f"Failed to build rollback graph: {str(e)}",
                        investigation_id, GraphType.CLEAN,
                        context={"entity_type": entity_type, "rollback_failed": True}
                    )
            
            # Check A/B testing
            try:
                ab_assignment = self.ab_test_manager.get_ab_test_assignment(investigation_id)
                if ab_assignment:
                    logger.info(f"   🧪 A/B testing assignment: {ab_assignment.value}")
                    try:
                        graph = await self.graph_builders.build_graph(ab_assignment)
                        self._record_graph_selection(investigation_id, ab_assignment, SelectionReason.AB_TEST)
                        return create_success_result(
                            graph, ab_assignment, SelectionReason.AB_TEST, investigation_id,
                            context={"entity_type": entity_type, "ab_test_active": True}
                        )
                    except Exception as e:
                        logger.error(f"A/B test graph build failed: {str(e)}")
                        # Continue to next selection method instead of hard failing
            except Exception as e:
                logger.warning(f"A/B test assignment failed: {str(e)} - continuing with feature flags")
            
            # Check hybrid graph feature flag
            try:
                if self.feature_flags.is_enabled("hybrid_graph_v1", investigation_id):
                    logger.info(f"   🧠 Hybrid intelligence graph selected")
                    try:
                        graph = await self.graph_builders.build_graph(GraphType.HYBRID)
                        self._record_graph_selection(investigation_id, GraphType.HYBRID, SelectionReason.FEATURE_FLAG)
                        return create_success_result(
                            graph, GraphType.HYBRID, SelectionReason.FEATURE_FLAG, investigation_id,
                            context={"entity_type": entity_type, "feature_flag": "hybrid_graph_v1"}
                        )
                    except Exception as e:
                        logger.error(f"Hybrid graph build failed: {str(e)} - falling back to clean")
                        self.fallback_counter += 1
                        increment_counter("graph_selection_fallbacks", metadata={"reason": "hybrid_build_failed"})
            except Exception as e:
                logger.warning(f"Feature flag check failed: {str(e)} - using default")
            
            # Default to clean graph
            logger.info(f"   📋 Clean graph selected (default)")
            try:
                graph = await self.graph_builders.build_graph(GraphType.CLEAN)
                self._record_graph_selection(investigation_id, GraphType.CLEAN, SelectionReason.DEFAULT)
                return create_success_result(
                    graph, GraphType.CLEAN, SelectionReason.DEFAULT, investigation_id,
                    context={"entity_type": entity_type, "selection_method": "default"}
                )
            except Exception as e:
                return create_failure_result(
                    f"Failed to build default clean graph: {str(e)}",
                    investigation_id, GraphType.CLEAN,
                    context={"entity_type": entity_type, "default_failed": True}
                )
            
        except Exception as e:
            logger.error(f"❌ Graph selection process failed: {str(e)}")
            self.fallback_counter += 1
            increment_counter("graph_selection_fallbacks", metadata={"reason": "emergency_fallback"})
            
            # Emergency fallback to clean graph
            logger.error(f"   Attempting emergency fallback to clean graph")
            try:
                graph = await self.graph_builders.build_graph(GraphType.CLEAN)
                self._record_graph_selection(investigation_id, GraphType.CLEAN, SelectionReason.EMERGENCY_FALLBACK)
                return create_success_result(
                    graph, GraphType.CLEAN, SelectionReason.EMERGENCY_FALLBACK, investigation_id,
                    fallback_occurred=True,
                    context={
                        "entity_type": entity_type,
                        "original_error": str(e),
                        "emergency_fallback": True
                    }
                )
            except Exception as fallback_error:
                logger.critical(f"🚨 Emergency fallback failed: {str(fallback_error)}")
                return create_failure_result(
                    f"Critical failure: Cannot build any graph type. Original: {str(e)}, Fallback: {str(fallback_error)}",
                    investigation_id,
                    context={
                        "entity_type": entity_type,
                        "original_error": str(e),
                        "fallback_error": str(fallback_error),
                        "critical_failure": True
                    }
                )
    
    async def get_investigation_graph(
        self,
        investigation_id: str,
        entity_type: str = "ip_address",
        force_graph_type: Optional[GraphType] = None
    ) -> StateGraph:
        """
        Legacy method that returns graph directly.
        
        DEPRECATED: Use select_investigation_graph() for typed results.
        This method raises typed exceptions on failure.
        
        Args:
            investigation_id: Unique investigation identifier
            entity_type: Type of entity being investigated
            force_graph_type: Force specific graph type (for testing)
            
        Returns:
            Compiled investigation graph
            
        Raises:
            GraphSelectionError: When graph selection fails
        """
        result = await self.select_investigation_graph(investigation_id, entity_type, force_graph_type)
        
        if is_success(result):
            return result.graph
        else:
            # Convert failure to typed exception
            raise result.to_exception()
    
    def _record_graph_selection(
        self, 
        investigation_id: str, 
        graph_type: GraphType,
        selection_reason: SelectionReason
    ):
        """
        Record graph selection for metrics and debugging.
        
        Args:
            investigation_id: Investigation identifier
            graph_type: Selected graph type
            selection_reason: Reason for selection
        """
        
        selection_record = {
            "investigation_id": investigation_id,
            "graph_type": graph_type.value,
            "selection_reason": selection_reason.value,
            "timestamp": datetime.now().isoformat(),
            "feature_flags": {
                "hybrid_graph_v1": self.feature_flags.get_flag_status("hybrid_graph_v1"),
                "ab_test_hybrid_vs_clean": self.feature_flags.get_flag_status("ab_test_hybrid_vs_clean")
            },
            "rollback_active": self.rollback_triggers.rollback_active,
            "fallback_counter": self.fallback_counter
        }
        
        # Cache selection for metrics
        self.performance_metrics[investigation_id] = selection_record
        
        logger.debug(f"📊 Graph selection recorded: {graph_type.value}")
        logger.debug(f"   Reason: {selection_reason.value}")
        logger.debug(f"   Fallback counter: {self.fallback_counter}")
        logger.debug(f"   Migration system: Feature flag tracking & performance metrics")
    
    def get_selection_history(self, investigation_id: str = None) -> dict:
        """
        Get graph selection history.
        
        Args:
            investigation_id: Filter by investigation ID (optional)
            
        Returns:
            Selection history records
        """
        
        if investigation_id:
            return {investigation_id: self.performance_metrics.get(investigation_id)}
        
        return self.performance_metrics.copy()
    
    def get_selection_stats(self) -> dict:
        """
        Get graph selection statistics.
        
        Returns:
            Statistics on graph type usage
        """
        
        stats = {
            "total_selections": len(self.performance_metrics),
            "graph_type_counts": {},
            "selection_reason_counts": {}
        }
        
        for record in self.performance_metrics.values():
            graph_type = record["graph_type"]
            reason = record["selection_reason"]
            
            stats["graph_type_counts"][graph_type] = stats["graph_type_counts"].get(graph_type, 0) + 1
            stats["selection_reason_counts"][reason] = stats["selection_reason_counts"].get(reason, 0) + 1
        
        # Add fallback tracking to stats
        stats["fallback_counter"] = self.fallback_counter
        stats["fallback_rate"] = self.fallback_counter / max(1, len(self.performance_metrics))
        
        return stats
    
    def get_fallback_counter(self) -> int:
        """Get current fallback counter for CI monitoring."""
        return self.fallback_counter
    
    def reset_fallback_counter(self) -> None:
        """Reset fallback counter (for testing)."""
        self.fallback_counter = 0