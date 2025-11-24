"""
Orchestration Module - Initialization and exports.

Now includes Hybrid Intelligence Graph System integration
with feature flags and confidence-based routing.
"""

# Import graph builder functions lazily to avoid circular imports
async def create_parallel_agent_graph(*args, **kwargs):
    from app.service.agent.orchestration.graph_builder import create_parallel_agent_graph as _create_parallel_agent_graph
    return await _create_parallel_agent_graph(*args, **kwargs)

async def create_sequential_agent_graph(*args, **kwargs):
    from app.service.agent.orchestration.graph_builder import create_sequential_agent_graph as _create_sequential_agent_graph
    return await _create_sequential_agent_graph(*args, **kwargs)

async def create_and_get_agent_graph(*args, **kwargs):
    from app.service.agent.orchestration.graph_builder import create_and_get_agent_graph as _create_and_get_agent_graph
    return await _create_and_get_agent_graph(*args, **kwargs)
from app.service.agent.orchestration.investigation_coordinator import start_investigation
from app.service.agent.orchestration.assistant import assistant
from app.service.agent.orchestration.enhanced_mcp_client_manager import (
    EnhancedMCPClientManager,
    MCPServerCategory,
    MCPServerInfo,
    RoutingPolicy
)
from app.service.agent.orchestration.langfuse_tracing import (
    LangfuseTracer,
    get_langfuse_tracer,
    init_langfuse_tracing
)

# Hybrid Intelligence Graph System - Import with fallback
try:
    from app.service.agent.orchestration.hybrid.migration_utilities import (
        get_investigation_graph,
        get_feature_flags,
        enable_hybrid_graph,
        disable_hybrid_graph,
        start_ab_test,
        stop_ab_test,
        GraphType
    )
    HYBRID_AVAILABLE = True
except ImportError:
    HYBRID_AVAILABLE = False
    # Create dummy functions for backward compatibility
    async def get_investigation_graph(*args, **kwargs):
        raise NotImplementedError("Hybrid Intelligence Graph system not available")
    def get_feature_flags():
        return None
    def enable_hybrid_graph(*args, **kwargs):
        pass
    def disable_hybrid_graph(*args, **kwargs):
        pass
    def start_ab_test(*args, **kwargs):
        pass
    def stop_ab_test():
        pass
    GraphType = None

__all__ = [
    # Core orchestration
    "create_parallel_agent_graph",
    "create_sequential_agent_graph", 
    "create_and_get_agent_graph",
    "start_investigation",
    "assistant",
    # Enhanced MCP client
    "EnhancedMCPClientManager",
    "MCPServerCategory",
    "MCPServerInfo",
    "RoutingPolicy",
    # Langfuse tracing
    "LangfuseTracer",
    "get_langfuse_tracer",
    "init_langfuse_tracing",
    # Hybrid Intelligence Graph System
    "get_investigation_graph",
    "get_feature_flags",
    "enable_hybrid_graph",
    "disable_hybrid_graph",
    "start_ab_test",
    "stop_ab_test",
    "GraphType",
    "HYBRID_AVAILABLE"
]