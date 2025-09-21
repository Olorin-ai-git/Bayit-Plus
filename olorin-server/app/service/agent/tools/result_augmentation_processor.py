"""
Tool Result Augmentation Processor

Handles the core result augmentation processing logic.
"""

import asyncio
import time
from typing import Any, Dict, List, Optional

from .result_augmentation_core import (
    ResultInsights,
    HistoricalPattern,
    NextStepRecommendation,
    ConfidenceScore,
    ThreatCorrelation,
    AugmentedToolResult,
    ResultAugmentationConfig
)
from .enhanced_tool_base import ToolResult
from .rag_tool_context import ToolExecutionContext
from ..autonomous_context import AutonomousInvestigationContext
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


async def create_augmented_result_async(
    result: ToolResult,
    context: Optional[ToolExecutionContext],
    investigation_context: Optional[AutonomousInvestigationContext],
    domain: Optional[str],
    config: ResultAugmentationConfig,
    start_time: float
) -> AugmentedToolResult:
    """Create fully augmented result with all enhancement components"""
    
    # Import enhancement components
    from .result_augmentation_utils import (
        generate_basic_insights,
        correlate_basic_patterns,
        generate_basic_recommendations,
        assess_basic_confidence,
        correlate_basic_threat_intelligence
    )
    
    # Gather all augmentation data concurrently for performance
    augmentation_tasks = []
    
    # Task 1: Generate insights
    if config.enable_interpretation:
        augmentation_tasks.append(
            generate_basic_insights(result, context, domain)
        )
    else:
        augmentation_tasks.append(_create_default_insights())
    
    # Task 2: Correlate historical patterns
    if config.enable_historical_correlation:
        augmentation_tasks.append(
            correlate_basic_patterns(result, domain, config.max_historical_patterns)
        )
    else:
        augmentation_tasks.append(_create_default_patterns())
    
    # Task 3: Generate recommendations
    if config.enable_recommendations:
        augmentation_tasks.append(
            generate_basic_recommendations(result, context, investigation_context, config.max_recommendations)
        )
    else:
        augmentation_tasks.append(_create_default_recommendations())
    
    # Task 4: Assess confidence
    augmentation_tasks.append(
        assess_basic_confidence(result, context)
    )
    
    # Task 5: Correlate threat intelligence
    if config.enable_threat_correlation:
        augmentation_tasks.append(
            correlate_basic_threat_intelligence(result, domain)
        )
    else:
        augmentation_tasks.append(_create_default_threat_correlation())
    
    # Execute all tasks concurrently
    (
        insights,
        historical_patterns,
        recommendations,
        confidence,
        threat_correlation
    ) = await asyncio.gather(*augmentation_tasks, return_exceptions=True)
    
    # Handle any task exceptions gracefully
    insights = _handle_task_result(insights, _create_default_insights)
    historical_patterns = _handle_task_result(historical_patterns, _create_default_patterns)
    recommendations = _handle_task_result(recommendations, _create_default_recommendations)
    confidence = _handle_task_result(confidence, _create_default_confidence)
    threat_correlation = _handle_task_result(threat_correlation, _create_default_threat_correlation)
    
    # Calculate performance metrics
    augmentation_time_ms = (time.time() - start_time) * 1000
    knowledge_chunks_used = _count_knowledge_chunks_used(context)
    enhancement_confidence = _calculate_enhancement_confidence(
        insights, historical_patterns, recommendations, confidence
    )
    
    # Create and return augmented result
    return AugmentedToolResult(
        original_result=result,
        rag_insights=insights,
        historical_patterns=historical_patterns,
        next_step_recommendations=recommendations,
        confidence_assessment=confidence,
        threat_intelligence_correlation=threat_correlation,
        augmentation_time_ms=augmentation_time_ms,
        knowledge_chunks_used=knowledge_chunks_used,
        enhancement_confidence=enhancement_confidence
    )


def _handle_task_result(task_result: Any, default_factory):
    """Handle task result, returning default on exception"""
    if isinstance(task_result, Exception):
        logger.warning(f"Augmentation task failed: {str(task_result)}")
        return default_factory()
    return task_result


# Default factory methods for graceful degradation

async def _create_default_insights() -> ResultInsights:
    """Create default insights when generation fails"""
    return ResultInsights()


async def _create_default_patterns() -> List[HistoricalPattern]:
    """Create default patterns when correlation fails"""
    return []


async def _create_default_recommendations() -> List[NextStepRecommendation]:
    """Create default recommendations when generation fails"""
    return []


def _create_default_confidence() -> ConfidenceScore:
    """Create MINIMAL confidence when assessment fails - NO HARDCODED VALUES"""
    raise ValueError("CRITICAL: Cannot create default confidence - assessment must be based on REAL data only")


async def _create_default_threat_correlation() -> ThreatCorrelation:
    """Create default threat correlation when correlation fails"""
    return ThreatCorrelation(
        threat_indicators=[],
        risk_assessment="unknown",
        correlation_confidence=0.0,
        intelligence_sources=[],
        recommended_actions=[]
    )


# Helper methods

def _count_knowledge_chunks_used(context: Optional[ToolExecutionContext]) -> int:
    """Count knowledge chunks used in augmentation"""
    if not context or not context.knowledge_context:
        return 0
    return context.knowledge_context.total_chunks


def _calculate_enhancement_confidence(
    insights: ResultInsights,
    patterns: List[HistoricalPattern],
    recommendations: List[NextStepRecommendation], 
    confidence: ConfidenceScore
) -> float:
    """Calculate overall enhancement confidence score"""
    
    components = [
        0.3 if insights.interpretation else 0.0,  # 30% for insights
        0.2 * len(patterns) / 5.0,  # 20% for patterns (max 5)
        0.3 * len(recommendations) / 5.0,  # 30% for recommendations (max 5)
        0.2 * confidence.overall_confidence  # 20% for confidence
    ]
    
    return min(1.0, sum(components))