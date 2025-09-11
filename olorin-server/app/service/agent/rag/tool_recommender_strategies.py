"""
Tool Recommendation Strategies

Implementation of different tool recommendation strategies for the RAG system.
"""

from typing import List, Optional

from langchain_core.tools import BaseTool

from .tool_recommender_core import ToolRecommendation, ToolRecommenderConfig
from .tool_analysis_utils import ToolAnalysisUtils
from .tool_strategy_implementations import ToolStrategyImplementations
from .context_augmentor import KnowledgeContext
from ..autonomous_context import AutonomousInvestigationContext
# Lazy import to avoid circular dependencies
# from ..tools.tool_registry import get_tools_for_agent
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


# Lazy import functions to avoid circular dependencies
def _import_tool_registry():
    """Lazy import tool registry to avoid circular dependencies."""
    try:
        from ..tools.tool_registry import get_tools_for_agent
        return get_tools_for_agent
    except ImportError:
        return None


class ToolRecommendationStrategies:
    """Implementation of different tool recommendation strategies"""
    
    def __init__(self, config: ToolRecommenderConfig, tool_registry):
        self.config = config
        self.tool_registry = tool_registry
        self.utils = ToolAnalysisUtils(tool_registry)
        self.implementations = ToolStrategyImplementations(config, self.utils)
        
    async def effectiveness_based_recommendations(
        self,
        knowledge_context: KnowledgeContext,
        domain: str,
        categories: Optional[List[str]] = None
    ) -> List[ToolRecommendation]:
        """Generate recommendations based on tool effectiveness patterns"""
        
        available_tools = self._get_available_tools(categories, domain)
        return await self.implementations.effectiveness_strategy(
            knowledge_context, domain, available_tools
        )
    
    async def case_similarity_recommendations(
        self,
        investigation_context: AutonomousInvestigationContext,
        knowledge_context: KnowledgeContext,
        domain: str,
        categories: Optional[List[str]] = None
    ) -> List[ToolRecommendation]:
        """Generate recommendations based on case similarity patterns"""
        
        available_tools = self._get_available_tools(categories, domain)
        return await self.implementations.case_similarity_strategy(
            investigation_context, knowledge_context, available_tools
        )
    
    async def domain_specific_recommendations(
        self,
        knowledge_context: KnowledgeContext,
        domain: str,
        categories: Optional[List[str]] = None
    ) -> List[ToolRecommendation]:
        """Generate domain-specific tool recommendations"""
        
        available_tools = self._get_available_tools(categories, domain)
        return await self.implementations.domain_specific_strategy(
            knowledge_context, domain, available_tools
        )
    
    async def hybrid_recommendations(
        self,
        investigation_context: AutonomousInvestigationContext,
        knowledge_context: KnowledgeContext,
        domain: str,
        categories: Optional[List[str]] = None
    ) -> List[ToolRecommendation]:
        """Generate hybrid recommendations combining multiple strategies"""
        
        available_tools = self._get_available_tools(categories, domain)
        
        # Get recommendations from all strategies
        effectiveness_recs = await self.implementations.effectiveness_strategy(
            knowledge_context, domain, available_tools
        )
        
        case_recs = await self.implementations.case_similarity_strategy(
            investigation_context, knowledge_context, available_tools
        )
        
        domain_recs = await self.implementations.domain_specific_strategy(
            knowledge_context, domain, available_tools
        )
        
        # Combine using hybrid strategy
        return self.implementations.combine_hybrid_recommendations(
            effectiveness_recs, case_recs, domain_recs, knowledge_context
        )
    
    def _get_available_tools(self, categories: Optional[List[str]], domain: str) -> List[BaseTool]:
        """Get available tools from categories or domain defaults"""
        
        if categories:
            tools = []
            for category in categories:
                tools.extend(self.tool_registry.get_tools_by_category(category))
            return tools
        
        # Default categories for each domain
        default_categories = self.utils.get_default_categories(domain)
        get_tools_for_agent = _import_tool_registry()
        if get_tools_for_agent:
            return get_tools_for_agent(categories=default_categories)
        else:
            logger.warning("Tool registry not available for domain recommendations")
            return []