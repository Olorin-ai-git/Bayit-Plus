"""
Tool Recommender Base Implementation

Core functionality for the Knowledge-Based Tool Recommender system.
"""

import asyncio
from typing import Any, Dict, List, Optional

from langchain_core.tools import BaseTool

# Lazy import to avoid circular dependencies
# from ..tools.tool_registry import ToolRegistry, get_tools_for_agent
from app.service.logging import get_bridge_logger

from ..autonomous_context import StructuredInvestigationContext
from .context_augmentor import (
    ContextAugmentationConfig,
    ContextAugmentor,
    KnowledgeContext,
)
from .rag_orchestrator import RAGOrchestrator
from .tool_analysis_utils import ToolAnalysisUtils
from .tool_recommender_core import (
    ToolRecommendation,
    ToolRecommendationStrategy,
    ToolRecommenderConfig,
)
from .tool_recommender_strategies import ToolRecommendationStrategies

logger = get_bridge_logger(__name__)


# Lazy import functions to avoid circular dependencies
def _import_tool_registry():
    """Lazy import tool registry to avoid circular dependencies."""
    try:
        from ..tools.tool_registry import ToolRegistry, get_tools_for_agent

        return ToolRegistry, get_tools_for_agent
    except ImportError:
        return None, None


class ToolRecommenderBase:
    """Base implementation for tool recommender functionality"""

    def __init__(
        self,
        rag_orchestrator: RAGOrchestrator,
        tool_registry: Any,  # Use Any to avoid circular import
        context_augmentor: Optional[ContextAugmentor] = None,
        config: Optional[ToolRecommenderConfig] = None,
    ):
        """Initialize tool recommender base"""
        self.rag_orchestrator = rag_orchestrator
        self.tool_registry = tool_registry
        self.context_augmentor = context_augmentor or ContextAugmentor(rag_orchestrator)
        self.config = config or ToolRecommenderConfig()

        # Initialize strategy handler and utilities
        self.strategies = ToolRecommendationStrategies(self.config, self.tool_registry)
        self.utils = ToolAnalysisUtils(self.tool_registry)

        # Knowledge categories for tool effectiveness
        self.tool_knowledge_categories = {
            "tool_effectiveness_patterns",
            "case_type_correlations",
            "tool_combination_strategies",
            "domain_specific_recommendations",
        }

        # Performance tracking
        self.recommendation_stats = {
            "total_recommendations": 0,
            "knowledge_enhanced_recommendations": 0,
            "fallback_recommendations": 0,
            "avg_recommendation_confidence": 0.0,
        }

        self.logger = get_bridge_logger(f"{__name__}.tool_recommender_base")

    async def retrieve_tool_knowledge(
        self, investigation_context: StructuredInvestigationContext, domain: str
    ) -> KnowledgeContext:
        """Retrieve tool-specific knowledge from RAG system"""

        # Create tool-specific context augmentation config
        tool_config = ContextAugmentationConfig(
            max_critical_chunks=5,
            max_supporting_chunks=10,
            max_background_chunks=5,
            critical_threshold=0.85,
            supporting_threshold=0.70,
            background_threshold=0.55,
            enable_domain_filtering=True,
            max_context_length=3000,
        )

        # Create temporary context augmentor with tool-specific config
        temp_augmentor = ContextAugmentor(self.rag_orchestrator, tool_config)

        # Generate tool-specific objectives for knowledge retrieval
        tool_objectives = [
            f"Tool effectiveness patterns for {domain} domain investigations",
            f"Best tool combinations for {investigation_context.entity_type.value if investigation_context.entity_type else 'general'} analysis",
            f"Historical tool performance in similar fraud cases",
            f"Domain-specific tool recommendations for {domain} analysis",
        ]

        return await temp_augmentor.augment_investigation_context(
            investigation_context, f"tool_selection_{domain}", tool_objectives
        )

    async def filter_and_rank_recommendations(
        self,
        recommendations: List[ToolRecommendation],
        investigation_context: StructuredInvestigationContext,
        domain: str,
    ) -> List[ToolRecommendation]:
        """Filter and rank final recommendations"""

        # Filter by confidence threshold
        filtered = [
            r
            for r in recommendations
            if r.confidence >= self.config.min_confidence_threshold
        ]

        # Sort by confidence
        filtered.sort(key=lambda r: r.confidence, reverse=True)

        # Apply category limits
        final_recommendations = []
        category_counts = {}

        for rec in filtered:
            # Determine tool category using utilities
            tool_category = self.utils.determine_tool_category(rec.tool)

            if (
                category_counts.get(tool_category, 0)
                < self.config.max_tools_per_category
            ):
                final_recommendations.append(rec)
                category_counts[tool_category] = (
                    category_counts.get(tool_category, 0) + 1
                )

                if len(final_recommendations) >= self.config.max_recommended_tools:
                    break

        return final_recommendations

    async def generate_fallback_recommendations(
        self, domain: str, categories: Optional[List[str]] = None
    ) -> List[ToolRecommendation]:
        """Generate fallback recommendations using standard tool selection"""

        self.recommendation_stats["fallback_recommendations"] += 1

        if not self.config.enable_fallback_recommendations:
            return []

        # Use standard tool selection as fallback
        fallback_categories = categories or self.utils.get_default_categories(domain)
        ToolRegistry, get_tools_for_agent = _import_tool_registry()
        if get_tools_for_agent:
            tools = get_tools_for_agent(categories=fallback_categories)
        else:
            logger.warning("Tool registry not available for fallback")
            tools = []

        # Convert to recommendations with lower confidence
        recommendations = []
        for tool in tools[: self.config.max_recommended_tools]:
            recommendation = ToolRecommendation(
                tool=tool,
                confidence=0.6,  # Base confidence for fallback
                reasoning="Standard tool selection (RAG enhancement unavailable)",
                domain_match=any(
                    domain_term in tool.name.lower() for domain_term in [domain]
                ),
            )
            recommendations.append(recommendation)

        self.logger.warning(f"Using fallback tool recommendations for {domain}")
        return recommendations

    def update_recommendation_statistics(
        self, recommendations: List[ToolRecommendation]
    ) -> None:
        """Update recommendation statistics"""

        # Update statistics
        knowledge_enhanced = len([r for r in recommendations if r.knowledge_sources])
        self.recommendation_stats[
            "knowledge_enhanced_recommendations"
        ] += knowledge_enhanced

        if recommendations:
            avg_confidence = sum(r.confidence for r in recommendations) / len(
                recommendations
            )
            current_avg = self.recommendation_stats["avg_recommendation_confidence"]
            total_recs = self.recommendation_stats["total_recommendations"]
            self.recommendation_stats["avg_recommendation_confidence"] = (
                current_avg * (total_recs - 1) + avg_confidence
            ) / total_recs

    def get_performance_stats(self) -> Dict[str, Any]:
        """Get tool recommender performance statistics"""

        total_recs = self.recommendation_stats["total_recommendations"]
        if total_recs == 0:
            return self.recommendation_stats.copy()

        enhanced_rate = (
            self.recommendation_stats["knowledge_enhanced_recommendations"] / total_recs
        )
        fallback_rate = (
            self.recommendation_stats["fallback_recommendations"] / total_recs
        )

        return {
            **self.recommendation_stats,
            "knowledge_enhancement_rate": enhanced_rate,
            "fallback_rate": fallback_rate,
            "knowledge_categories": len(self.tool_knowledge_categories),
        }

    async def clear_cache(self) -> None:
        """Clear recommender cache"""
        if hasattr(self.context_augmentor, "clear_cache"):
            await self.context_augmentor.clear_cache()

        self.logger.info("Tool recommender cache cleared")
