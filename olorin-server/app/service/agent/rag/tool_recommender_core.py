"""
Knowledge-Based Tool Recommender Core Classes

Core data structures and enums for the RAG-enhanced tool recommendation system.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional

from langchain_core.tools import BaseTool


class ToolRecommendationStrategy(Enum):
    """Tool recommendation strategies"""
    EFFECTIVENESS_BASED = "effectiveness_based"  # Based on historical effectiveness
    CASE_SIMILARITY = "case_similarity"  # Based on similar case patterns
    DOMAIN_SPECIFIC = "domain_specific"  # Domain-specific tool patterns
    HYBRID = "hybrid"  # Combination of strategies


@dataclass
class ToolEffectivenessMetrics:
    """Tool effectiveness metrics from knowledge base"""
    
    tool_name: str
    success_rate: float = 0.0
    avg_confidence: float = 0.0
    usage_frequency: int = 0
    domain_relevance: float = 0.0
    case_type_match: float = 0.0
    recent_performance: float = 0.0
    combined_score: float = 0.0


@dataclass 
class ToolRecommendation:
    """Tool recommendation with reasoning"""
    
    tool: BaseTool
    confidence: float = 0.0
    reasoning: str = ""
    knowledge_sources: List[str] = field(default_factory=list)
    effectiveness_metrics: Optional[ToolEffectivenessMetrics] = None
    domain_match: bool = False
    case_similarity: float = 0.0


@dataclass
class ToolRecommenderConfig:
    """Configuration for tool recommender"""
    
    # Recommendation limits
    max_recommended_tools: int = 12
    min_confidence_threshold: float = 0.6
    max_tools_per_category: int = 4
    
    # Knowledge retrieval settings
    max_knowledge_chunks: int = 20
    effectiveness_threshold: float = 0.7
    similarity_threshold: float = 0.75
    
    # Strategy weights
    effectiveness_weight: float = 0.4
    case_similarity_weight: float = 0.3
    domain_relevance_weight: float = 0.3
    
    # Fallback settings
    enable_fallback_recommendations: bool = True
    fallback_to_standard_selection: bool = True