"""
Agent Service Integration Adapter for Hybrid Intelligence System

Provides clean interfaces between the hybrid system and the 
broader agent service infrastructure.
"""

from typing import Dict, Any, Optional, Protocol
from langgraph.graph import StateGraph
from datetime import datetime

from app.service.logging import get_bridge_logger
from ..migration.graph_selection.graph_selector import GraphSelector
from ..migration.feature_flags.flag_manager import GraphType

# Import observability for error tracking
try:
    from ..observability import increment_counter
except ImportError:
    def increment_counter(name: str, amount: int = 1, metadata=None):
        pass

logger = get_bridge_logger(__name__)


class ServiceIntegrationProtocol(Protocol):
    """Protocol for service integration requirements"""
    
    async def initialize_investigation(self, investigation_id: str, parameters: Dict[str, Any]) -> bool:
        """Initialize investigation with given parameters"""
        ...
    
    async def cleanup_investigation(self, investigation_id: str) -> bool:
        """Cleanup resources for completed investigation"""
        ...


class ServiceAdapter:
    """
    Adapter for integrating hybrid intelligence with agent services.
    
    Provides a clean abstraction layer between the hybrid system
    and the broader agent service infrastructure.
    """
    
    def __init__(self):
        self.graph_selector = None
        self.active_investigations = {}
        self.service_hooks = {}
        self._initialize_graph_selector()
    
    async def get_investigation_graph(
        self,
        investigation_id: str,
        entity_type: str = "ip",
        service_context: Optional[Dict[str, Any]] = None,
        force_graph_type: Optional[GraphType] = None
    ) -> StateGraph:
        """
        Get investigation graph with service integration.
        
        Args:
            investigation_id: Unique investigation identifier
            entity_type: Type of entity being investigated
            service_context: Additional service context
            force_graph_type: Force specific graph type (testing)
            
        Returns:
            Compiled investigation graph ready for execution
        """
        
        logger.info(f"🔗 Service adapter: Getting investigation graph")
        logger.info(f"   Investigation: {investigation_id}")
        logger.info(f"   Entity type: {entity_type}")
        
        try:
            # Initialize investigation context
            await self._initialize_investigation_context(
                investigation_id, entity_type, service_context
            )
            
            # Get graph from selector with null safety
            if not self.graph_selector:
                raise RuntimeError("Graph selector not initialized")
                
            graph = await self.graph_selector.get_investigation_graph(
                investigation_id=investigation_id,
                entity_type=entity_type,
                force_graph_type=force_graph_type
            )
            
            # Register active investigation with safe timestamp
            self.active_investigations[investigation_id] = {
                "entity_type": entity_type,
                "start_time": datetime.now().isoformat(),
                "service_context": service_context or {},
                "graph_type": self._determine_graph_type(graph)
            }
            
            logger.info(f"✅ Investigation graph ready: {investigation_id}")
            return graph
            
        except Exception as e:
            logger.error(f"❌ Service adapter failed: {str(e)}")
            increment_counter("service_adapter_failures", metadata={
                "investigation_id": investigation_id,
                "error_type": type(e).__name__,
                "entity_type": entity_type
            })
            await self._handle_initialization_failure(investigation_id, str(e))
            raise
    
    async def complete_investigation(
        self,
        investigation_id: str,
        success: bool,
        results: Optional[Dict[str, Any]] = None,
        error_message: Optional[str] = None
    ):
        """
        Complete investigation and cleanup resources.
        
        Args:
            investigation_id: Investigation identifier
            success: Whether investigation completed successfully
            results: Investigation results (if successful)
            error_message: Error message (if failed)
        """
        
        logger.info(f"🔗 Service adapter: Completing investigation {investigation_id}")
        
        try:
            # Get investigation context
            investigation_context = self.active_investigations.get(investigation_id)
            
            if investigation_context:
                # Notify rollback triggers with null safety
                try:
                    if (self.graph_selector and 
                        hasattr(self.graph_selector, 'rollback_triggers') and 
                        self.graph_selector.rollback_triggers):
                        self.graph_selector.rollback_triggers.record_investigation_result(
                            investigation_id=investigation_id,
                            success=success,
                            error_message=error_message
                        )
                except Exception as e:
                    logger.warning(f"Failed to record investigation result in rollback triggers: {e}")
                
                # Execute service hooks
                await self._execute_completion_hooks(
                    investigation_id, success, results, error_message
                )
                
                # Cleanup investigation
                await self._cleanup_investigation_context(investigation_id)
                
                # Remove from active investigations
                del self.active_investigations[investigation_id]
                
                logger.info(f"✅ Investigation completed: {investigation_id} (success={success})")
            else:
                logger.warning(f"⚠️ Investigation not found in active list: {investigation_id}")
                
        except Exception as e:
            logger.error(f"❌ Investigation completion failed: {str(e)}")
    
    def register_service_hook(
        self,
        hook_name: str,
        hook_function: callable
    ):
        """
        Register a service hook for integration events.
        
        Args:
            hook_name: Name of the hook
            hook_function: Function to call for the hook
        """
        
        self.service_hooks[hook_name] = hook_function
        logger.debug(f"🔗 Service hook registered: {hook_name}")
    
    def unregister_service_hook(self, hook_name: str):
        """
        Unregister a service hook.
        
        Args:
            hook_name: Name of the hook to remove
        """
        
        if hook_name in self.service_hooks:
            del self.service_hooks[hook_name]
            logger.debug(f"🔗 Service hook unregistered: {hook_name}")
    
    async def _initialize_investigation_context(
        self,
        investigation_id: str,
        entity_type: str,
        service_context: Optional[Dict[str, Any]]
    ):
        """Initialize investigation context and resources"""
        
        logger.debug(f"🔗 Initializing investigation context: {investigation_id}")
        
        # Execute initialization hooks
        await self._execute_service_hooks("pre_investigation_init", {
            "investigation_id": investigation_id,
            "entity_type": entity_type,
            "service_context": service_context
        })
        
        # Record investigation start in metrics with null safety
        try:
            if (self.graph_selector and 
                hasattr(self.graph_selector, 'rollback_triggers') and 
                self.graph_selector.rollback_triggers and
                hasattr(self.graph_selector.rollback_triggers, 'metrics_collector') and
                self.graph_selector.rollback_triggers.metrics_collector):
                graph_type = "unknown"  # Will be determined after graph selection
                self.graph_selector.rollback_triggers.metrics_collector.record_investigation_start(
                    investigation_id=investigation_id,
                    graph_type=graph_type
                )
        except Exception as e:
            logger.warning(f"Failed to record investigation start in metrics: {e}")
    
    async def _cleanup_investigation_context(self, investigation_id: str):
        """Cleanup investigation context and resources"""
        
        logger.debug(f"🔗 Cleaning up investigation context: {investigation_id}")
        
        # Execute cleanup hooks
        await self._execute_service_hooks("post_investigation_cleanup", {
            "investigation_id": investigation_id
        })
    
    async def _handle_initialization_failure(
        self,
        investigation_id: str,
        error_message: str
    ):
        """Handle investigation initialization failure"""
        
        logger.error(f"🔗 Investigation initialization failed: {investigation_id}")
        
        # Execute failure hooks
        await self._execute_service_hooks("investigation_init_failed", {
            "investigation_id": investigation_id,
            "error_message": error_message
        })
    
    async def _execute_completion_hooks(
        self,
        investigation_id: str,
        success: bool,
        results: Optional[Dict[str, Any]],
        error_message: Optional[str]
    ):
        """Execute investigation completion hooks"""
        
        hook_data = {
            "investigation_id": investigation_id,
            "success": success,
            "results": results,
            "error_message": error_message
        }
        
        if success:
            await self._execute_service_hooks("investigation_completed", hook_data)
        else:
            await self._execute_service_hooks("investigation_failed", hook_data)
    
    async def _execute_service_hooks(self, hook_name: str, data: Dict[str, Any]):
        """Execute registered service hooks"""
        
        if hook_name in self.service_hooks:
            try:
                hook_function = self.service_hooks[hook_name]
                if callable(hook_function):
                    await hook_function(data)
                    logger.debug(f"🔗 Service hook executed: {hook_name}")
            except Exception as e:
                logger.error(f"❌ Service hook failed: {hook_name} - {str(e)}")
    
    def _determine_graph_type(self, graph: StateGraph) -> str:
        """Determine graph type from graph instance with null safety"""
        
        if not graph:
            return "unknown"
            
        try:
            # Check graph attributes to determine type
            if hasattr(graph, '_nodes') and graph._nodes:
                # Analyze node structure to determine type
                node_names = list(graph._nodes.keys()) if graph._nodes else []
                
                # Look for hybrid-specific nodes
                if any('ai_confidence' in str(name).lower() for name in node_names):
                    return "hybrid"
                elif any('orchestrator' in str(name).lower() for name in node_names):
                    return "orchestrator"
                elif len(node_names) > 10:  # Complex graph likely hybrid
                    return "hybrid"
                else:
                    return "clean"
            else:
                return "unknown"
        except Exception as e:
            logger.warning(f"Failed to determine graph type: {e}")
            return "unknown"
    
    def get_active_investigations(self) -> Dict[str, Any]:
        """
        Get information about active investigations.
        
        Returns:
            Dictionary of active investigation contexts
        """
        
        return self.active_investigations.copy()
    
    def get_service_statistics(self) -> Dict[str, Any]:
        """
        Get service adapter statistics.
        
        Returns:
            Dictionary with adapter statistics
        """
        
        stats = {
            "active_investigations": len(self.active_investigations),
            "registered_hooks": list(self.service_hooks.keys()),
            "graph_selector_initialized": self.graph_selector is not None
        }
        
        # Add graph selector stats with null safety
        try:
            if self.graph_selector and hasattr(self.graph_selector, 'get_selection_stats'):
                stats["graph_selector_stats"] = self.graph_selector.get_selection_stats()
            else:
                stats["graph_selector_stats"] = {"error": "Graph selector not available"}
        except Exception as e:
            stats["graph_selector_stats"] = {"error": f"Failed to get stats: {str(e)}"}
            
        return stats
        
    def _initialize_graph_selector(self):
        """Initialize graph selector with error handling"""
        try:
            self.graph_selector = GraphSelector()
            logger.debug("🔗 Graph selector initialized successfully")
        except Exception as e:
            logger.error(f"❌ Failed to initialize graph selector: {e}")
            self.graph_selector = None
            increment_counter("graph_selector_init_failures", metadata={
                "error_type": type(e).__name__,
                "error_message": str(e)
            })
    
    def ensure_hybrid_graph_config(self) -> bool:
        """Ensure hybrid_graph_v1 configuration is present and valid"""
        try:
            if not self.graph_selector:
                logger.error("Graph selector not initialized")
                return False
                
            if not hasattr(self.graph_selector, 'feature_flags'):
                logger.error("Feature flags not available in graph selector")
                return False
                
            # Check if hybrid_graph_v1 flag exists
            flag_status = self.graph_selector.feature_flags.get_flag_status("hybrid_graph_v1")
            
            if not flag_status or flag_status.get("error"):
                logger.error(f"hybrid_graph_v1 flag not properly configured: {flag_status}")
                return False
                
            logger.debug(f"hybrid_graph_v1 configuration valid: {flag_status}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to validate hybrid_graph_v1 configuration: {e}")
            return False