"""
RAG System Package

Retrieval-Augmented Generation system for enhanced natural language processing,
knowledge retrieval, and context-aware investigation support.
"""

from .context_augmentor import (
    ContextAugmentationConfig,
    ContextAugmentor,
    ContextRelevanceLevel,
    KnowledgeContext,
    create_context_augmentor,
)
from .knowledge_base import (
    ChunkingStrategy,
    DocumentChunk,
    DocumentMetadata,
    KnowledgeBase,
    KnowledgeBaseConfig,
)
from .rag_orchestrator import (
    RAGConfig,
    RAGMetrics,
    RAGOrchestrator,
    RAGRequest,
    RAGResponse,
    get_rag_orchestrator,
)

# Enhanced retrieval and context augmentation modules
from .retrieval_engine import (
    QueryExpansionMethod,
    RetrievalEngine,
    RetrievalEngineConfig,
    SearchQuery,
    SearchResult,
    SearchStrategy,
    create_retrieval_engine,
)


# Tool recommendation system (lazy import to avoid circular dependencies with tool_registry)
def _import_tool_recommender():
    """Lazy import tool recommender to avoid circular dependencies."""
    try:
        from .tool_recommender import (
            KnowledgeBasedToolRecommender,
            ToolEffectivenessMetrics,
            ToolRecommendation,
            ToolRecommendationStrategy,
            ToolRecommenderConfig,
            create_tool_recommender,
        )

        return {
            "KnowledgeBasedToolRecommender": KnowledgeBasedToolRecommender,
            "ToolRecommendation": ToolRecommendation,
            "ToolEffectivenessMetrics": ToolEffectivenessMetrics,
            "ToolRecommendationStrategy": ToolRecommendationStrategy,
            "ToolRecommenderConfig": ToolRecommenderConfig,
            "create_tool_recommender": create_tool_recommender,
        }
    except ImportError:
        return {}


# Tool recommendation utilities (for advanced usage) - lazy import to avoid circular dependencies
from .tool_analysis_utils import ToolAnalysisUtils


# Lazy import for ToolRecommendationStrategies to avoid circular dependency with tool_registry
def _import_tool_strategies():
    """Lazy import tool strategies to avoid circular dependencies."""
    try:
        from .tool_recommender_strategies import ToolRecommendationStrategies

        return ToolRecommendationStrategies
    except ImportError:
        return None


__all__ = [
    # Knowledge Base
    "KnowledgeBase",
    "DocumentChunk",
    "DocumentMetadata",
    "ChunkingStrategy",
    "KnowledgeBaseConfig",
    # RAG Orchestrator
    "RAGOrchestrator",
    "RAGRequest",
    "RAGResponse",
    "RAGConfig",
    "RAGMetrics",
    "get_rag_orchestrator",
    # Retrieval Engine
    "RetrievalEngine",
    "SearchQuery",
    "SearchResult",
    "SearchStrategy",
    "QueryExpansionMethod",
    "RetrievalEngineConfig",
    "create_retrieval_engine",
    # Context Augmentor
    "ContextAugmentor",
    "KnowledgeContext",
    "ContextRelevanceLevel",
    "ContextAugmentationConfig",
    "create_context_augmentor",
    # Tool Recommender (lazy loaded)
    "KnowledgeBasedToolRecommender",
    "ToolRecommendation",
    "ToolEffectivenessMetrics",
    "ToolRecommendationStrategy",
    "ToolRecommenderConfig",
    "create_tool_recommender",
    # Tool Recommendation Utilities (advanced usage)
    "ToolAnalysisUtils",
    "ToolRecommendationStrategies",
]

# Cache for lazily loaded tool recommender modules
_tool_recommender_cache = None
_tool_strategies_cache = None


def __getattr__(name: str):
    """Handle lazy loading of tool recommender modules to avoid circular imports."""
    global _tool_recommender_cache, _tool_strategies_cache

    # Tool recommender components that need lazy loading
    tool_recommender_names = {
        "KnowledgeBasedToolRecommender",
        "ToolRecommendation",
        "ToolEffectivenessMetrics",
        "ToolRecommendationStrategy",
        "ToolRecommenderConfig",
        "create_tool_recommender",
    }

    if name in tool_recommender_names:
        if _tool_recommender_cache is None:
            _tool_recommender_cache = _import_tool_recommender()

        if name in _tool_recommender_cache:
            return _tool_recommender_cache[name]
        else:
            raise ImportError(
                f"Tool recommender module '{name}' not available due to circular import"
            )

    # Handle ToolRecommendationStrategies
    elif name == "ToolRecommendationStrategies":
        if _tool_strategies_cache is None:
            _tool_strategies_cache = _import_tool_strategies()

        if _tool_strategies_cache is not None:
            return _tool_strategies_cache
        else:
            raise ImportError(
                f"Tool strategies module 'ToolRecommendationStrategies' not available due to circular import"
            )

    raise AttributeError(f"module '{__name__}' has no attribute '{name}'")
