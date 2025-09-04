"""
Knowledge-Based Tool Recommender for RAG System

Enhances tool selection with RAG knowledge-based recommendations using historical
tool effectiveness analysis, case-specific recommendations, and domain expertise.

This module provides a unified interface to the modular tool recommendation system.
"""

# Import all core components
from .tool_recommender_core import (
    ToolRecommendationStrategy,
    ToolEffectivenessMetrics,
    ToolRecommendation,
    ToolRecommenderConfig
)

# Import main implementation
from .tool_recommender_main import (
    KnowledgeBasedToolRecommender,
    create_tool_recommender
)

# Import strategies (for advanced usage)
from .tool_recommender_strategies import ToolRecommendationStrategies

# Re-export all public components
__all__ = [
    # Core data structures
    "ToolRecommendationStrategy",
    "ToolEffectivenessMetrics", 
    "ToolRecommendation",
    "ToolRecommenderConfig",
    
    # Main implementation
    "KnowledgeBasedToolRecommender",
    "create_tool_recommender",
    
    # Strategy implementation (for advanced usage)
    "ToolRecommendationStrategies"
]