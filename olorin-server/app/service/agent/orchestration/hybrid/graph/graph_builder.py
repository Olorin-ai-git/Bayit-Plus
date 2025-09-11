"""
Graph Builder - Main orchestrator for hybrid intelligence graph construction.

This module orchestrates all components to build the complete hybrid intelligence
investigation graph with modular, maintainable architecture.
"""

from typing import Optional
from langgraph.graph import StateGraph

from .builders import GraphFoundation, NodeFactory, EdgeConfigurator, MemoryProvider
from .nodes import (
    InvestigationNodes, IntelligenceNodes, OrchestratorNode, 
    DomainAgentEnhancer, SummaryNodes, ToolNodes
)
from .assistant import HybridAssistant, ContextEnhancer
from .metrics import PerformanceCalculator, SummaryGenerator

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class HybridGraphBuilder:
    """
    Main orchestrator for hybrid intelligence graph construction.
    
    Coordinates all components to build a complete, modular hybrid intelligence
    investigation graph with comprehensive functionality.
    """
    
    def __init__(self, intelligence_mode: str = "adaptive"):
        """Initialize graph builder with intelligence mode."""
        self.intelligence_mode = intelligence_mode
        
        # Initialize foundation components
        self.foundation = GraphFoundation(intelligence_mode)
        self.components = self.foundation.get_components()
        
        # Initialize all component modules
        self._initialize_components()
        
    def _initialize_components(self) -> None:
        """Initialize all graph component modules."""
        # Builder components
        self.node_factory = NodeFactory(self.components)
        self.edge_configurator = EdgeConfigurator(self.components)
        self.memory_provider = MemoryProvider()
        
        # Node components
        self.investigation_nodes = InvestigationNodes(self.components)
        self.intelligence_nodes = IntelligenceNodes(self.components)
        self.orchestrator_node = OrchestratorNode(self.components)
        self.domain_agent_enhancer = DomainAgentEnhancer(self.components)
        self.summary_nodes = SummaryNodes(self.components)
        self.tool_nodes = ToolNodes(self.components)
        
        # Assistant components
        self.hybrid_assistant = HybridAssistant(self.components)
        self.context_enhancer = ContextEnhancer(self.components)
        
        # Metrics components
        self.performance_calculator = PerformanceCalculator(self.components)
        self.summary_generator = SummaryGenerator(self.components)
        
    async def build_hybrid_investigation_graph(
        self,
        use_enhanced_tools: bool = True,
        enable_streaming: bool = True,
        enable_interrupts: bool = False
    ) -> StateGraph:
        """
        Build complete hybrid intelligence investigation graph.
        
        Args:
            use_enhanced_tools: Whether to use enhanced tool execution
            enable_streaming: Whether to enable real-time streaming
            enable_interrupts: Whether to interrupt before tool execution
            
        Returns:
            Compiled hybrid investigation graph
        """
        try:
            # Log graph creation start
            self.foundation.log_graph_creation_start(
                use_enhanced_tools, enable_streaming, enable_interrupts
            )
            
            # Create base graph
            builder = self.foundation.create_base_graph()
            
            # Add all nodes to the graph
            self._add_all_nodes(builder, use_enhanced_tools)
            
            # Configure all edges and routing
            self.edge_configurator.define_workflow_edges(builder, use_enhanced_tools)
            
            # Create memory system
            memory = await self.memory_provider.create_hybrid_memory()
            
            # Compile graph with configuration
            graph = self.foundation.compile_graph_with_configuration(
                builder, memory, enable_interrupts
            )
            
            # Log successful creation
            self.foundation.log_graph_creation_success(graph)
            
            return graph
            
        except Exception as e:
            raise self.foundation.handle_graph_creation_error(e)
    
    def _add_all_nodes(self, builder: StateGraph, use_enhanced_tools: bool) -> None:
        """Add all nodes to the graph builder."""
        # Add core investigation nodes
        self.node_factory.add_core_investigation_nodes(
            builder,
            self.investigation_nodes,
            self.intelligence_nodes,
            self.orchestrator_node,
            self.summary_nodes
        )
        
        # Add domain agent nodes
        self.node_factory.add_domain_agent_nodes(
            builder,
            self.domain_agent_enhancer
        )
        
        # Add tool nodes
        self.node_factory.add_tool_nodes(
            builder,
            self.tool_nodes,
            use_enhanced_tools
        )
        
        # Log node creation completion
        total_nodes = (
            8 +  # Core investigation and intelligence nodes
            6 +  # Domain agent nodes
            (2 if use_enhanced_tools else 1)  # Tool nodes
        )
        self.node_factory.log_node_creation_complete(total_nodes)
    
    def get_graph_info(self) -> dict:
        """Get comprehensive information about the graph configuration."""
        return {
            "intelligence_mode": self.intelligence_mode,
            "foundation_components": list(self.components.keys()),
            "node_components": [
                "investigation_nodes", "intelligence_nodes", "orchestrator_node",
                "domain_agent_enhancer", "summary_nodes", "tool_nodes"
            ],
            "assistant_components": ["hybrid_assistant", "context_enhancer"],
            "metrics_components": ["performance_calculator", "summary_generator"],
            "builder_components": [
                "node_factory", "edge_configurator", "memory_provider"
            ],
            "routing_info": self.edge_configurator.get_routing_strategy_info(),
            "memory_info": self.memory_provider.get_memory_info(),
            "domain_agents": self.node_factory.get_domain_agent_list()
        }
    
    def get_component_stats(self) -> dict:
        """Get statistics about component initialization."""
        return {
            "total_components": 14,  # All major components
            "foundation_initialized": bool(self.foundation),
            "nodes_initialized": bool(self.investigation_nodes),
            "assistant_initialized": bool(self.hybrid_assistant),
            "metrics_initialized": bool(self.performance_calculator),
            "builders_initialized": bool(self.node_factory),
            "intelligence_mode": self.intelligence_mode,
            "memory_type": self.memory_provider.memory_type
        }
    
    def _count_nodes(self) -> int:
        """Count total nodes that will be added to the graph."""
        core_nodes = 8  # Core investigation and intelligence nodes
        domain_nodes = 6  # Domain agent nodes
        tool_nodes = 2  # Tool nodes (enhanced + standard)
        total = core_nodes + domain_nodes + tool_nodes
        logger.debug(f"     📊 NODE COUNT: {total} total nodes ({core_nodes} core + {domain_nodes} domain + {tool_nodes} tool)")
        return total