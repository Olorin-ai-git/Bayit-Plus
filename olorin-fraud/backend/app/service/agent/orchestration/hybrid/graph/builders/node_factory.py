"""
Node Factory - Creates and configures all graph nodes for hybrid intelligence.

This module handles the creation and configuration of all nodes in the
hybrid intelligence investigation graph.
"""

from typing import Any, Callable, Dict, Optional

from langgraph.graph import StateGraph

from app.service.logging import get_bridge_logger

# Import domain agents lazily to avoid circular imports
# Domain agents will be imported when needed in methods


logger = get_bridge_logger(__name__)


class NodeFactory:
    """
    Factory for creating and adding all nodes to the hybrid intelligence graph.

    Handles node creation and configuration for investigation workflow.
    """

    def __init__(self, components: Dict[str, Any]):
        """Initialize with graph foundation components."""
        self.components = components

    def add_core_investigation_nodes(
        self,
        builder: StateGraph,
        investigation_nodes,
        intelligence_nodes,
        orchestrator_node,
        summary_nodes,
    ) -> None:
        """Add core investigation workflow nodes."""
        logger.debug("🔧 Adding core investigation nodes")

        # Core investigation nodes
        builder.add_node(
            "start_investigation", investigation_nodes.enhanced_start_investigation
        )

        # CRITICAL FIX A0.2: Add database fetch node to populate snowflake_data
        builder.add_node("fetch_database_data", investigation_nodes.fetch_database_data)
        logger.debug("📊 DATABASE FETCH: Added fetch_database_data node")

        builder.add_node("raw_data_node", investigation_nodes.enhanced_raw_data_node)
        builder.add_node(
            "fraud_investigation", investigation_nodes.enhanced_fraud_investigation
        )

        # Hybrid intelligence nodes
        builder.add_node(
            "ai_confidence_assessment", intelligence_nodes.ai_confidence_assessment_node
        )
        builder.add_node(
            "hybrid_orchestrator", orchestrator_node.hybrid_orchestrator_node
        )
        builder.add_node("safety_validation", intelligence_nodes.safety_validation_node)

        # Summary and completion nodes
        builder.add_node("summary", summary_nodes.enhanced_summary_node)
        builder.add_node("complete", summary_nodes.enhanced_complete_node)

        logger.debug("✅ Core investigation nodes added")

    def add_domain_agent_nodes(
        self, builder: StateGraph, domain_agent_enhancer
    ) -> None:
        """Add enhanced domain agent nodes."""
        logger.debug("🎯 Adding enhanced domain agent nodes")

        # Import domain agents locally to avoid circular imports
        from app.service.agent.orchestration.domain_agents.authentication_agent import (
            authentication_agent_node,
        )
        from app.service.agent.orchestration.domain_agents.device_agent import (
            device_agent_node,
        )
        from app.service.agent.orchestration.domain_agents.location_agent import (
            location_agent_node,
        )
        from app.service.agent.orchestration.domain_agents.logs_agent import (
            logs_agent_node,
        )
        from app.service.agent.orchestration.domain_agents.merchant_agent import (
            merchant_agent_node,
        )
        from app.service.agent.orchestration.domain_agents.network_agent import (
            network_agent_node,
        )
        from app.service.agent.orchestration.domain_agents.risk_agent import (
            risk_agent_node,
        )
        from app.service.agent.orchestration.domain_agents.web_agent import (
            web_agent_node,
        )

        # Add domain agents with hybrid tracking
        builder.add_node(
            "network_agent",
            domain_agent_enhancer.create_enhanced_domain_agent(
                "network", network_agent_node
            ),
        )
        builder.add_node(
            "device_agent",
            domain_agent_enhancer.create_enhanced_domain_agent(
                "device", device_agent_node
            ),
        )
        builder.add_node(
            "location_agent",
            domain_agent_enhancer.create_enhanced_domain_agent(
                "location", location_agent_node
            ),
        )
        builder.add_node(
            "logs_agent",
            domain_agent_enhancer.create_enhanced_domain_agent("logs", logs_agent_node),
        )
        builder.add_node(
            "authentication_agent",
            domain_agent_enhancer.create_enhanced_domain_agent(
                "authentication", authentication_agent_node
            ),
        )
        builder.add_node(
            "web_agent",
            domain_agent_enhancer.create_enhanced_domain_agent("web", web_agent_node),
        )
        builder.add_node(
            "merchant_agent",
            domain_agent_enhancer.create_enhanced_domain_agent(
                "merchant", merchant_agent_node
            ),
        )
        builder.add_node(
            "risk_agent",
            domain_agent_enhancer.create_enhanced_domain_agent("risk", risk_agent_node),
        )

        # Add Remediation Agent - runs after risk assessment to take countermeasures (labeling)
        from app.service.agent.orchestration.remediation_agent import (
            remediation_agent_node,
        )

        builder.add_node("remediation_agent", remediation_agent_node)
        logger.info("✅ Added remediation_agent node")

        logger.debug("✅ Enhanced domain agent nodes added")

    def add_tool_nodes(
        self,
        builder: StateGraph,
        tool_nodes,
        use_enhanced_tools: bool = True,
        investigation_id: Optional[str] = None,
    ) -> None:
        """Add tool execution nodes to the graph."""
        logger.debug(
            f"🔧 Adding tool nodes (enhanced: {use_enhanced_tools}, investigation_id: {investigation_id})"
        )

        # Add tool nodes based on configuration
        tool_nodes.add_tool_nodes(builder, use_enhanced_tools, investigation_id)

        logger.debug("✅ Tool nodes added")

    def get_domain_agent_list(self) -> list:
        """Get list of domain agent node names."""
        return [
            "network_agent",
            "device_agent",
            "location_agent",
            "logs_agent",
            "authentication_agent",
            "merchant_agent",
            "risk_agent",
        ]

    def log_node_creation_complete(self, node_count: int) -> None:
        """Log completion of node creation."""
        logger.info(f"🏗️ Node factory completed: {node_count} nodes created")
        logger.debug(
            f"   Intelligence mode: {self.components.get('intelligence_mode', 'adaptive')}"
        )
        logger.debug(f"   Core nodes: investigation, intelligence, orchestration")
        logger.debug(f"   Domain agents: 7 enhanced domain agents")
        logger.debug(f"   Tool nodes: Dynamic tool execution system")
