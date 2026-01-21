"""
Tool Recommender Integration Example

Example showing how to integrate the Knowledge-Based Tool Recommender
with existing agent workflows for enhanced tool selection.
"""

from typing import List, Optional

from langchain_core.tools import BaseTool

from app.service.agent.autonomous_context import StructuredInvestigationContext
from app.service.agent.tools.tool_registry import get_tools_for_agent, tool_registry
from app.service.logging import get_bridge_logger

# RAG imports with graceful fallback
try:
    from app.service.agent.rag import (
        KnowledgeBasedToolRecommender,
        ToolRecommendationStrategy,
        create_tool_recommender,
        get_rag_orchestrator,
    )

    RAG_AVAILABLE = True
except ImportError:
    RAG_AVAILABLE = False

logger = get_bridge_logger(__name__)


# Global tool recommender instance (initialized lazily)
_tool_recommender: Optional[KnowledgeBasedToolRecommender] = None


def get_tool_recommender() -> Optional[KnowledgeBasedToolRecommender]:
    """Get or create the global tool recommender instance"""
    global _tool_recommender

    if not RAG_AVAILABLE:
        return None

    if _tool_recommender is None:
        try:
            rag_orchestrator = get_rag_orchestrator()
            if rag_orchestrator and tool_registry.is_initialized():
                _tool_recommender = create_tool_recommender(
                    rag_orchestrator=rag_orchestrator, tool_registry=tool_registry
                )
                logger.info("Knowledge-based tool recommender initialized")
            else:
                logger.warning(
                    "Cannot initialize tool recommender: RAG orchestrator or tool registry not available"
                )
        except Exception as e:
            logger.error(f"Failed to initialize tool recommender: {e}")

    return _tool_recommender


async def get_enhanced_tools_for_agent(
    investigation_context: StructuredInvestigationContext,
    domain: str,
    categories: Optional[List[str]] = None,
    tool_names: Optional[List[str]] = None,
    use_rag_recommendations: bool = True,
) -> List[BaseTool]:
    """
    Enhanced tool selection that uses RAG recommendations when available,
    with graceful fallback to standard tool selection.

    This function can be used as a drop-in replacement for get_tools_for_agent()
    to add RAG-enhanced tool recommendations to existing agent workflows.

    Args:
        investigation_context: Investigation context for RAG enhancement
        domain: Investigation domain (network, device, location, logs, risk)
        categories: Tool categories to include
        tool_names: Specific tool names to include
        use_rag_recommendations: Whether to use RAG recommendations

    Returns:
        List of recommended tools
    """
    try:
        if use_rag_recommendations and RAG_AVAILABLE:
            tool_recommender = get_tool_recommender()

            if tool_recommender:
                logger.info(f"Using RAG-enhanced tool selection for {domain} domain")

                # Get RAG-enhanced tool recommendations
                enhanced_tools = await tool_recommender.get_enhanced_tool_list(
                    investigation_context=investigation_context,
                    domain=domain,
                    categories=categories,
                    tool_names=tool_names,
                )

                if enhanced_tools:
                    logger.debug(
                        f"RAG recommender provided {len(enhanced_tools)} tools for {domain}"
                    )
                    return enhanced_tools
                else:
                    logger.warning(
                        f"RAG recommender returned no tools, falling back to standard selection"
                    )

        # Fallback to standard tool selection
        logger.debug(f"Using standard tool selection for {domain} domain")
        return get_tools_for_agent(categories=categories, tool_names=tool_names)

    except Exception as e:
        logger.error(
            f"Enhanced tool selection failed: {e}, falling back to standard selection"
        )
        return get_tools_for_agent(categories=categories, tool_names=tool_names)


async def get_tool_recommendations_with_reasoning(
    investigation_context: StructuredInvestigationContext,
    domain: str,
    strategy: ToolRecommendationStrategy = ToolRecommendationStrategy.HYBRID,
    categories: Optional[List[str]] = None,
) -> List[dict]:
    """
    Get tool recommendations with detailed reasoning for inspection or logging.

    Args:
        investigation_context: Investigation context
        domain: Investigation domain
        strategy: Recommendation strategy
        categories: Tool categories to consider

    Returns:
        List of recommendation dictionaries with tools and reasoning
    """
    try:
        tool_recommender = get_tool_recommender()

        if not tool_recommender:
            logger.warning("Tool recommender not available")
            return []

        # Get detailed recommendations
        recommendations = await tool_recommender.recommend_tools(
            investigation_context=investigation_context,
            domain=domain,
            strategy=strategy,
            requested_categories=categories,
        )

        # Convert to dictionaries for easy inspection
        recommendation_details = []
        for rec in recommendations:
            rec_dict = {
                "tool_name": rec.tool.name,
                "tool_description": rec.tool.description,
                "confidence": rec.confidence,
                "reasoning": rec.reasoning,
                "domain_match": rec.domain_match,
                "case_similarity": rec.case_similarity,
                "knowledge_sources": rec.knowledge_sources,
                "effectiveness_metrics": (
                    {
                        "success_rate": (
                            rec.effectiveness_metrics.success_rate
                            if rec.effectiveness_metrics
                            else 0.0
                        ),
                        "domain_relevance": (
                            rec.effectiveness_metrics.domain_relevance
                            if rec.effectiveness_metrics
                            else 0.0
                        ),
                    }
                    if rec.effectiveness_metrics
                    else None
                ),
            }
            recommendation_details.append(rec_dict)

        logger.info(
            f"Generated {len(recommendation_details)} detailed recommendations for {domain}"
        )
        return recommendation_details

    except Exception as e:
        logger.error(f"Failed to generate tool recommendations with reasoning: {e}")
        return []


# Integration example for existing agent code
class EnhancedAgentToolSelection:
    """
    Helper class showing how to integrate RAG-enhanced tool selection
    into existing agent workflows with minimal code changes.
    """

    @staticmethod
    async def get_risk_agent_tools(
        investigation_context: StructuredInvestigationContext,
    ) -> List[BaseTool]:
        """Example: Enhanced tool selection for risk agent"""

        # Standard categories for risk agent
        risk_categories = [
            "olorin",
            "search",
            "database",
            "threat_intelligence",
            "ml_ai",
        ]

        # Get enhanced tools with RAG recommendations
        return await get_enhanced_tools_for_agent(
            investigation_context=investigation_context,
            domain="risk",
            categories=risk_categories,
            use_rag_recommendations=True,
        )

    @staticmethod
    async def get_network_agent_tools(
        investigation_context: StructuredInvestigationContext,
    ) -> List[BaseTool]:
        """Example: Enhanced tool selection for network agent"""

        network_categories = ["threat_intelligence", "intelligence", "search", "api"]

        return await get_enhanced_tools_for_agent(
            investigation_context=investigation_context,
            domain="network",
            categories=network_categories,
            use_rag_recommendations=True,
        )

    @staticmethod
    async def get_logs_agent_tools(
        investigation_context: StructuredInvestigationContext,
    ) -> List[BaseTool]:
        """Example: Enhanced tool selection for logs agent"""

        logs_categories = ["olorin", "database", "search", "ml_ai"]

        return await get_enhanced_tools_for_agent(
            investigation_context=investigation_context,
            domain="logs",
            categories=logs_categories,
            use_rag_recommendations=True,
        )


# Utility function for performance monitoring
def get_tool_recommender_stats() -> dict:
    """Get tool recommender performance statistics"""

    tool_recommender = get_tool_recommender()

    if not tool_recommender:
        return {
            "available": False,
            "reason": "RAG not available or tool recommender not initialized",
        }

    try:
        stats = tool_recommender.get_performance_stats()
        stats["available"] = True
        return stats
    except Exception as e:
        return {"available": False, "reason": f"Error getting stats: {e}"}


# Example usage in agent code:
"""
# In your agent function (e.g., risk_agent.py):

async def structured_risk_agent(state, config) -> dict:
    # ... existing code for context creation ...
    
    # Enhanced tool selection with RAG recommendations
    from app.service.agent.rag.tool_integration_example import get_enhanced_tools_for_agent
    
    tools = await get_enhanced_tools_for_agent(
        investigation_context=structured_context,
        domain="risk",
        categories=["olorin", "search", "database", "threat_intelligence", "ml_ai"],
        use_rag_recommendations=True
    )
    
    # ... rest of agent code remains the same ...
    
    # Optional: Log recommendation details for analysis
    from app.service.agent.rag.tool_integration_example import get_tool_recommendations_with_reasoning
    
    recommendations = await get_tool_recommendations_with_reasoning(
        investigation_context=structured_context,
        domain="risk"
    )
    
    logger.info(f"Tool recommendations: {len(recommendations)} tools recommended")
    for rec in recommendations[:3]:  # Log top 3 recommendations
        logger.debug(f"Recommended: {rec['tool_name']} (confidence: {rec['confidence']:.2f}, reasoning: {rec['reasoning']})")
"""
