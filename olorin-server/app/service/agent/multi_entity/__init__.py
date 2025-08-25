"""
Multi-Entity Investigation System

Advanced multi-entity investigation capabilities supporting complex fraud patterns,
cross-entity analysis, and coordinated investigation workflows.
"""

from .entity_manager import (
    EntityManager,
    Entity,
    EntityType,
    EntityRelationship,
    EntityGraph
)

from .cross_entity_analyzer import (
    CrossEntityAnalyzer,
    CrossEntityPattern,
    EntityCluster,
    AnalysisResult
)

from .investigation_coordinator import (
    InvestigationCoordinator,
    MultiEntityInvestigation,
    InvestigationPlan,
    CoordinationStrategy
)

from .pattern_detector import (
    PatternDetector,
    FraudPattern,
    PatternMatch,
    PatternConfidence
)

__all__ = [
    # Entity Management
    "EntityManager",
    "Entity",
    "EntityType", 
    "EntityRelationship",
    "EntityGraph",
    
    # Cross-Entity Analysis
    "CrossEntityAnalyzer",
    "CrossEntityPattern",
    "EntityCluster",
    "AnalysisResult",
    
    # Investigation Coordination
    "InvestigationCoordinator", 
    "MultiEntityInvestigation",
    "InvestigationPlan",
    "CoordinationStrategy",
    
    # Pattern Detection
    "PatternDetector",
    "FraudPattern",
    "PatternMatch",
    "PatternConfidence"
]