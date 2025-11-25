"""
Tool Result Augmentation Core Data Structures

Core data structures and configurations for result augmentation system.
"""

from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Union

from .enhanced_tool_base import ToolResult


@dataclass
class ResultInsights:
    """Container for RAG-generated result insights"""

    interpretation: Optional[str] = None
    contextual_analysis: Optional[str] = None
    significance_assessment: Optional[str] = None
    anomaly_indicators: List[str] = None
    domain_specific_notes: List[str] = None

    def __post_init__(self):
        if self.anomaly_indicators is None:
            self.anomaly_indicators = []
        if self.domain_specific_notes is None:
            self.domain_specific_notes = []


@dataclass
class HistoricalPattern:
    """Historical pattern correlation with current result"""

    pattern_type: str
    similarity_score: float
    historical_context: str
    outcome_prediction: Optional[str] = None
    confidence: float = 0.0


@dataclass
class NextStepRecommendation:
    """Knowledge-based recommendation for next investigation steps"""

    action_type: str
    description: str
    priority: str  # "high", "medium", "low"
    rationale: str
    expected_outcome: Optional[str] = None
    confidence: float = 0.0


@dataclass
class ConfidenceScore:
    """Confidence assessment based on knowledge base coverage"""

    overall_confidence: float
    knowledge_coverage: float
    pattern_match_confidence: float
    interpretation_reliability: float
    recommendation_quality: float


@dataclass
class ThreatCorrelation:
    """Threat intelligence correlation with tool results"""

    threat_indicators: List[str]
    risk_assessment: str
    correlation_confidence: float
    intelligence_sources: List[str]
    recommended_actions: List[str]

    def __post_init__(self):
        if self.threat_indicators is None:
            self.threat_indicators = []
        if self.intelligence_sources is None:
            self.intelligence_sources = []
        if self.recommended_actions is None:
            self.recommended_actions = []


@dataclass
class AugmentedToolResult:
    """Enhanced tool result with RAG augmentation"""

    # Original result data (preserved)
    original_result: ToolResult

    # RAG augmentation data
    rag_insights: ResultInsights
    historical_patterns: List[HistoricalPattern]
    next_step_recommendations: List[NextStepRecommendation]
    confidence_assessment: ConfidenceScore
    threat_intelligence_correlation: ThreatCorrelation

    # Performance metrics
    augmentation_time_ms: float
    knowledge_chunks_used: int
    enhancement_confidence: float

    # Delegate ToolResult properties and methods
    @property
    def success(self) -> bool:
        return self.original_result.success

    @property
    def data(self) -> Any:
        return self.original_result.data

    @property
    def error(self) -> Optional[str]:
        return self.original_result.error

    @property
    def metadata(self) -> Dict[str, Any]:
        # Combine original metadata with augmentation metadata
        augmented_metadata = self.original_result.metadata.copy()
        augmented_metadata.update(
            {
                "rag_augmented": True,
                "augmentation_time_ms": self.augmentation_time_ms,
                "knowledge_chunks_used": self.knowledge_chunks_used,
                "enhancement_confidence": self.enhancement_confidence,
                "insights_generated": bool(self.rag_insights.interpretation),
                "patterns_found": len(self.historical_patterns),
                "recommendations_count": len(self.next_step_recommendations),
            }
        )
        return augmented_metadata


@dataclass
class ResultAugmentationConfig:
    """Configuration for result augmentation behavior"""

    enable_interpretation: bool = True
    enable_historical_correlation: bool = True
    enable_recommendations: bool = True
    enable_threat_correlation: bool = True
    max_historical_patterns: int = 5
    max_recommendations: int = 10
    confidence_threshold: float = 0.3
    max_augmentation_time_ms: float = 30.0
