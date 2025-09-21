"""
Main Migration Manager for Hybrid Intelligence System

Orchestrates all migration components to provide a unified interface
for graph selection, feature flags, rollback, and integration.
"""

from typing import Dict, Any, Optional
from langgraph.graph import StateGraph
from datetime import datetime

from app.service.logging import get_bridge_logger

# Import core components
from .feature_flags.flag_manager import FeatureFlags, GraphType, DeploymentMode
from .graph_selection.graph_selector import GraphSelector
from .rollback.rollback_triggers import RollbackTriggers
from ..integration.service_adapter import ServiceAdapter
from ..integration.state_validator import StateValidator
from ..integration.metrics_reporter import MetricsReporter
from ..integration.error_handler import ErrorHandler, ErrorCategory, ErrorSeverity, ErrorContext

logger = get_bridge_logger(__name__)


class MigrationManager:
    """
    Central orchestrator for hybrid intelligence migration.
    
    Coordinates all migration components to provide safe,
    monitored deployment of hybrid graph capabilities.
    """
    
    def __init__(self):
        # Core migration components
        self.feature_flags = FeatureFlags()
        self.graph_selector = GraphSelector()
        self.rollback_triggers = RollbackTriggers()
        
        # Integration components
        self.service_adapter = ServiceAdapter()
        self.state_validator = StateValidator()
        self.metrics_reporter = MetricsReporter()
        self.error_handler = ErrorHandler()
        
        # Migration state
        self.migration_active = True
        self.initialization_time = datetime.now()
        
        logger.info(f"🎯 Migration Manager initialized")
        logger.info(f"   Feature flags: {len(self.feature_flags.flags)} flags")
        logger.info(f"   Components: All migration and integration components loaded")
    
    async def get_investigation_graph(
        self,
        investigation_id: str,
        entity_type: str = "ip",
        force_graph_type: Optional[GraphType] = None,
        service_context: Optional[Dict[str, Any]] = None
    ) -> StateGraph:
        """
        Get investigation graph with full migration support.
        
        Args:
            investigation_id: Unique investigation identifier
            entity_type: Type of entity being investigated
            force_graph_type: Force specific graph type (for testing)
            service_context: Additional service context
            
        Returns:
            Compiled investigation graph
        """
        
        logger.info(f"🎯 Migration Manager: Getting investigation graph")
        logger.info(f"   Investigation: {investigation_id}")
        
        start_time = datetime.now()
        
        try:
            # Record feature flag usage for metrics
            self._record_feature_flag_metrics(investigation_id)
            
            # Get graph through service adapter (includes error handling)
            graph = await self.service_adapter.get_investigation_graph(
                investigation_id=investigation_id,
                entity_type=entity_type,
                service_context=service_context,
                force_graph_type=force_graph_type
            )
            
            # Record performance metrics
            duration_ms = (datetime.now() - start_time).total_seconds() * 1000
            self._record_graph_selection_metrics(
                investigation_id, graph, duration_ms, force_graph_type
            )
            
            logger.info(f"✅ Investigation graph ready: {investigation_id}")
            return graph
            
        except Exception as e:
            # Handle error through error handler
            error_context = ErrorContext(
                investigation_id=investigation_id,
                component="migration_manager",
                operation="get_investigation_graph",
                user_context={"entity_type": entity_type, "service_context": service_context}
            )
            
            recovery_result = self.error_handler.handle_error(
                error=e,
                category=ErrorCategory.GRAPH_SELECTION,
                severity=ErrorSeverity.HIGH,
                context=error_context,
                recovery_data={"entity_type": entity_type}
            )
            
            if recovery_result["success"]:
                logger.warning(f"🔧 Graph selection recovered: {recovery_result['action']}")
                
                # If recovery suggests fallback to clean graph, do that
                if recovery_result.get("fallback_graph_type") == "clean":
                    return await self.graph_selector.graph_builders.build_graph(GraphType.CLEAN)
                    
            # Re-raise if recovery failed
            logger.error(f"❌ Graph selection failed and recovery unsuccessful")
            raise
    
    async def complete_investigation(
        self,
        investigation_id: str,
        success: bool,
        results: Optional[Dict[str, Any]] = None,
        error_message: Optional[str] = None,
        duration_seconds: Optional[float] = None
    ):
        """
        Complete investigation with full migration support.
        
        Args:
            investigation_id: Investigation identifier
            success: Whether investigation completed successfully
            results: Investigation results (if successful)
            error_message: Error message (if failed)
            duration_seconds: Investigation duration
        """
        
        logger.info(f"🎯 Migration Manager: Completing investigation {investigation_id}")
        
        try:
            # Validate results if provided
            if results:
                validation_result = self.state_validator.validate_investigation_state(
                    results, investigation_id
                )
                
                if not validation_result.is_valid:
                    logger.warning(f"⚠️ Investigation results validation issues found")
                    # Auto-correct if possible
                    corrected_results = self.state_validator.handle_validation_error(
                        validation_result, results, investigation_id
                    )
                    results = corrected_results
            
            # Record rollback metrics
            self.rollback_triggers.record_investigation_result(
                investigation_id=investigation_id,
                success=success,
                duration_seconds=duration_seconds or 0.0,
                error_message=error_message
            )
            
            # Complete through service adapter
            await self.service_adapter.complete_investigation(
                investigation_id=investigation_id,
                success=success,
                results=results,
                error_message=error_message
            )
            
            # Record completion metrics
            self.metrics_reporter.record_performance_metric(
                metric_name="investigation_completion",
                value=1.0 if success else 0.0,
                unit="boolean",
                investigation_id=investigation_id,
                context={
                    "success": success,
                    "duration_seconds": duration_seconds,
                    "has_error": error_message is not None
                }
            )
            
            logger.info(f"✅ Investigation completed: {investigation_id} (success={success})")
            
        except Exception as e:
            error_context = ErrorContext(
                investigation_id=investigation_id,
                component="migration_manager",
                operation="complete_investigation"
            )
            
            self.error_handler.handle_error(
                error=e,
                category=ErrorCategory.INTEGRATION,
                severity=ErrorSeverity.MEDIUM,
                context=error_context
            )
            
            logger.error(f"❌ Investigation completion failed: {str(e)}")
    
    def enable_hybrid_graph(
        self,
        rollout_percentage: int = 10,
        deployment_mode: DeploymentMode = DeploymentMode.CANARY
    ):
        """
        Enable hybrid graph with specified rollout.
        
        Args:
            rollout_percentage: Percentage of investigations to use hybrid graph
            deployment_mode: Deployment mode for rollout
        """
        
        logger.info(f"🚀 Enabling hybrid graph: {rollout_percentage}% rollout")
        
        self.feature_flags.enable_flag(
            "hybrid_graph_v1",
            rollout_percentage=rollout_percentage,
            deployment_mode=deployment_mode
        )
        
        # Record in metrics
        self.metrics_reporter.record_performance_metric(
            metric_name="hybrid_graph_enabled",
            value=rollout_percentage,
            unit="percentage"
        )
    
    def disable_hybrid_graph(self, reason: str = "manual_disable"):
        """
        Disable hybrid graph and rollback to clean graph.
        
        Args:
            reason: Reason for disabling
        """
        
        logger.warning(f"🛑 Disabling hybrid graph: {reason}")
        
        self.feature_flags.disable_flag("hybrid_graph_v1", reason)
        
        # Record in metrics
        self.metrics_reporter.record_rollback_event(
            event_type="manual_disable",
            reason=reason
        )
    
    def start_ab_test(self, test_split: int = 50):
        """
        Start A/B test between hybrid and clean graphs.
        
        Args:
            test_split: Percentage split for hybrid graph
        """
        
        logger.info(f"🧪 Starting A/B test: {test_split}% hybrid, {100-test_split}% clean")
        
        self.graph_selector.ab_test_manager.start_ab_test(
            test_name="hybrid_vs_clean",
            test_split=test_split
        )
        
        # Record in metrics
        self.metrics_reporter.record_performance_metric(
            metric_name="ab_test_started",
            value=test_split,
            unit="percentage"
        )
    
    def stop_ab_test(self):
        """Stop A/B testing"""
        
        logger.info(f"🧪 Stopping A/B test")
        
        self.graph_selector.ab_test_manager.stop_ab_test("hybrid_vs_clean")
        
        # Record in metrics
        self.metrics_reporter.record_performance_metric(
            metric_name="ab_test_stopped",
            value=1.0,
            unit="boolean"
        )
    
    def trigger_rollback(self, reason: str):
        """
        Manually trigger rollback to clean graph.
        
        Args:
            reason: Reason for rollback
        """
        
        logger.error(f"🔄 Triggering manual rollback: {reason}")
        
        self.rollback_triggers.trigger_rollback(reason)
        
        # Record in metrics
        self.metrics_reporter.record_rollback_event(
            event_type="triggered",
            reason=reason
        )
    
    def clear_rollback(self):
        """Clear rollback state and resume normal operation"""
        
        logger.info(f"✅ Clearing rollback state")
        
        self.rollback_triggers.clear_rollback()
        
        # Record in metrics
        self.metrics_reporter.record_rollback_event(
            event_type="cleared",
            reason="manual_clear"
        )
    
    def get_migration_status(self) -> Dict[str, Any]:
        """
        Get comprehensive migration system status.
        
        Returns:
            Dictionary with status of all migration components
        """
        
        return {
            "migration_active": self.migration_active,
            "initialization_time": self.initialization_time.isoformat(),
            "feature_flags": {
                flag: self.feature_flags.get_flag_status(flag)
                for flag in ["hybrid_graph_v1", "ab_test_hybrid_vs_clean"]
            },
            "rollback_status": self.rollback_triggers.get_rollback_status(),
            "graph_selection_stats": self.graph_selector.get_selection_stats(),
            "service_adapter_stats": self.service_adapter.get_service_statistics(),
            "error_statistics": self.error_handler.get_error_statistics(),
            "active_investigations": len(self.service_adapter.get_active_investigations())
        }
    
    def _record_feature_flag_metrics(self, investigation_id: str):
        """Record feature flag usage metrics"""
        
        key_flags = ["hybrid_graph_v1", "ab_test_hybrid_vs_clean"]
        
        for flag_name in key_flags:
            flag_config = self.feature_flags.get_flag_status(flag_name)
            enabled = self.feature_flags.is_enabled(flag_name, investigation_id)
            
            self.metrics_reporter.record_feature_flag_usage(
                flag_name=flag_name,
                enabled=enabled,
                investigation_id=investigation_id,
                rollout_percentage=flag_config.get("rollout_percentage", 0)
            )
    
    def _record_graph_selection_metrics(
        self,
        investigation_id: str,
        graph: StateGraph,
        duration_ms: float,
        force_graph_type: Optional[GraphType]
    ):
        """Record graph selection metrics"""
        
        # Determine graph type and selection reason
        graph_type = "unknown"
        selection_reason = "unknown"
        
        if force_graph_type:
            graph_type = force_graph_type.value
            selection_reason = "forced"
        elif self.rollback_triggers.should_rollback():
            graph_type = "clean"
            selection_reason = "rollback"
        elif self.feature_flags.is_enabled("hybrid_graph_v1", investigation_id):
            graph_type = "hybrid"
            selection_reason = "feature_flag"
        else:
            graph_type = "clean" 
            selection_reason = "default"
        
        # Record metrics
        self.metrics_reporter.record_graph_selection(
            investigation_id=investigation_id,
            graph_type=graph_type,
            selection_reason=selection_reason,
            feature_flags={
                flag: self.feature_flags.get_flag_status(flag)
                for flag in ["hybrid_graph_v1", "ab_test_hybrid_vs_clean"]
            },
            duration_ms=duration_ms
        )


# Global migration manager instance
_migration_manager = None


async def get_investigation_graph(
    investigation_id: str,
    entity_type: str = "ip",
    force_graph_type: Optional[GraphType] = None
) -> StateGraph:
    """
    Global function to get investigation graph with migration support.
    
    This is the main entry point for getting investigation graphs.
    """
    
    global _migration_manager
    if _migration_manager is None:
        _migration_manager = MigrationManager()
    
    return await _migration_manager.get_investigation_graph(
        investigation_id=investigation_id,
        entity_type=entity_type,
        force_graph_type=force_graph_type
    )


def get_feature_flags() -> FeatureFlags:
    """Get global feature flags instance"""
    
    global _migration_manager
    if _migration_manager is None:
        _migration_manager = MigrationManager()
    
    return _migration_manager.feature_flags


def enable_hybrid_graph(rollout_percentage: int = 10):
    """Enable hybrid graph with gradual rollout"""
    
    global _migration_manager
    if _migration_manager is None:
        _migration_manager = MigrationManager()
    
    _migration_manager.enable_hybrid_graph(rollout_percentage)


def disable_hybrid_graph(reason: str = "manual_disable"):
    """Disable hybrid graph and rollback to clean graph"""
    
    global _migration_manager
    if _migration_manager is None:
        _migration_manager = MigrationManager()
    
    _migration_manager.disable_hybrid_graph(reason)


def start_ab_test(test_split: int = 50):
    """Start A/B test between hybrid and clean graphs"""
    
    global _migration_manager
    if _migration_manager is None:
        _migration_manager = MigrationManager()
    
    _migration_manager.start_ab_test(test_split)


def stop_ab_test():
    """Stop A/B testing"""
    
    global _migration_manager
    if _migration_manager is None:
        _migration_manager = MigrationManager()
    
    _migration_manager.stop_ab_test()