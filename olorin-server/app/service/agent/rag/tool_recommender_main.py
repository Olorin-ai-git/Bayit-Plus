"""
Knowledge-Based Tool Recommender Main Implementation

Main class for RAG-enhanced tool selection with historical effectiveness analysis.
"""

from typing import Any, List, Optional

from langchain_core.tools import BaseTool

from .tool_recommender_core import (
    ToolRecommendation,
    ToolRecommendationStrategy,
    ToolRecommenderConfig
)
from .tool_recommender_base import ToolRecommenderBase
from .context_augmentor import ContextAugmentor
from .rag_orchestrator import RAGOrchestrator
from ..autonomous_context import StructuredInvestigationContext
# Lazy import to avoid circular dependencies
# from ..tools.tool_registry import ToolRegistry, get_tools_for_agent
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


# Lazy import functions to avoid circular dependencies
def _import_tool_registry():
    """Lazy import tool registry to avoid circular dependencies."""
    try:
        from ..tools.tool_registry import ToolRegistry, get_tools_for_agent
        return ToolRegistry, get_tools_for_agent
    except ImportError:
        return None, None


class KnowledgeBasedToolRecommender(ToolRecommenderBase):
    """
    Knowledge-Based Tool Recommender
    
    Features:
    - Historical tool effectiveness analysis from investigation outcomes
    - Case-specific tool recommendations using RAG knowledge retrieval
    - Tool performance knowledge base integration
    - Dynamic tool prioritization based on context and domain
    - Intelligent fallback to standard tool selection
    - Integration with existing ToolRegistry system
    """
    
    async def recommend_tools(
        self,
        investigation_context: StructuredInvestigationContext,
        domain: str,
        strategy: ToolRecommendationStrategy = ToolRecommendationStrategy.HYBRID,
        requested_categories: Optional[List[str]] = None
    ) -> List[ToolRecommendation]:
        """
        Recommend tools based on RAG knowledge and historical effectiveness
        
        Args:
            investigation_context: Investigation context
            domain: Investigation domain (network, device, location, logs, risk)
            strategy: Recommendation strategy to use
            requested_categories: Specific tool categories requested
            
        Returns:
            List of tool recommendations with confidence scores
        """
        try:
            self.recommendation_stats["total_recommendations"] += 1
            
            self.logger.info(
                f"Generating RAG-enhanced tool recommendations for {domain} domain "
                f"(strategy: {strategy.value})"
            )
            
            # Get knowledge context for tool selection
            knowledge_context = await self.retrieve_tool_knowledge(
                investigation_context, domain
            )
            
            # Generate recommendations based on strategy
            if strategy == ToolRecommendationStrategy.EFFECTIVENESS_BASED:
                recommendations = await self.strategies.effectiveness_based_recommendations(
                    knowledge_context, domain, requested_categories
                )
            elif strategy == ToolRecommendationStrategy.CASE_SIMILARITY:
                recommendations = await self.strategies.case_similarity_recommendations(
                    investigation_context, knowledge_context, domain, requested_categories
                )
            elif strategy == ToolRecommendationStrategy.DOMAIN_SPECIFIC:
                recommendations = await self.strategies.domain_specific_recommendations(
                    knowledge_context, domain, requested_categories
                )
            else:  # HYBRID
                recommendations = await self.strategies.hybrid_recommendations(
                    investigation_context, knowledge_context, domain, requested_categories
                )
            
            # Filter and rank final recommendations
            final_recommendations = await self.filter_and_rank_recommendations(
                recommendations, investigation_context, domain
            )
            
            # Update statistics
            self.update_recommendation_statistics(final_recommendations)
            
            self.logger.info(
                f"Generated {len(final_recommendations)} tool recommendations for {domain}"
            )
            
            return final_recommendations
            
        except Exception as e:
            self.logger.error(f"Tool recommendation failed for {domain}: {str(e)}")
            
            # Fallback to standard tool selection
            return await self.generate_fallback_recommendations(domain, requested_categories)
    
    async def get_enhanced_tool_list(
        self,
        investigation_context: StructuredInvestigationContext,
        domain: str,
        categories: Optional[List[str]] = None,
        tool_names: Optional[List[str]] = None
    ) -> List[BaseTool]:
        """
        Get enhanced tool list using RAG recommendations
        
        Compatible with existing get_tools_for_agent interface while adding
        RAG-enhanced intelligent tool selection.
        
        Args:
            investigation_context: Investigation context
            domain: Investigation domain
            categories: Tool categories to include
            tool_names: Specific tool names to include
            
        Returns:
            List of recommended tools
        """
        try:
            # Get RAG-enhanced recommendations
            recommendations = await self.recommend_tools(
                investigation_context, 
                domain,
                requested_categories=categories
            )
            
            # Extract tools from recommendations
            recommended_tools = [rec.tool for rec in recommendations]
            
            # Add specifically requested tools if any
            if tool_names:
                for tool_name in tool_names:
                    tool = self.tool_registry.get_tool(tool_name)
                    if tool and tool not in recommended_tools:
                        recommended_tools.append(tool)
            
            # Ensure we have tools from requested categories as fallback
            if categories and not recommended_tools:
                category_tools = []
                for category in categories:
                    category_tools.extend(self.tool_registry.get_tools_by_category(category))
                recommended_tools.extend(category_tools[:self.config.max_recommended_tools])
            
            self.logger.debug(f"Enhanced tool list: {len(recommended_tools)} tools for {domain}")
            
            return recommended_tools[:self.config.max_recommended_tools]
            
        except Exception as e:
            self.logger.error(f"Enhanced tool list generation failed: {str(e)}")
            
            # Fallback to standard tool selection
            ToolRegistry, get_tools_for_agent = _import_tool_registry()
            if get_tools_for_agent:
                return get_tools_for_agent(categories=categories, tool_names=tool_names)
            else:
                logger.warning("Tool registry not available for fallback")
                return []


# Factory function for easy initialization
def create_tool_recommender(
    rag_orchestrator: RAGOrchestrator,
    tool_registry: Any,  # Use Any to avoid circular import
    config: Optional[ToolRecommenderConfig] = None
) -> KnowledgeBasedToolRecommender:
    """Create knowledge-based tool recommender instance"""
    return KnowledgeBasedToolRecommender(rag_orchestrator, tool_registry, config=config)