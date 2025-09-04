"""
Tool Result Augmentation Utilities

Utility functions for generating insights, patterns, recommendations, and assessments.
"""

from typing import List, Optional

from .result_augmentation_core import (
    ResultInsights,
    HistoricalPattern,
    NextStepRecommendation,
    ConfidenceScore,
    ThreatCorrelation
)
from .enhanced_tool_base import ToolResult
from .rag_tool_context import ToolExecutionContext
from ..autonomous_context import AutonomousInvestigationContext
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


async def generate_basic_insights(
    result: ToolResult,
    context: Optional[ToolExecutionContext],
    domain: Optional[str]
) -> ResultInsights:
    """Generate basic insights for tool result"""
    
    # Create basic interpretation from result data
    interpretation = f"Tool execution completed successfully with {len(str(result.data))} characters of result data"
    
    contextual_analysis = None
    if context and context.knowledge_context:
        knowledge_count = context.knowledge_context.total_chunks
        contextual_analysis = f"Analysis enhanced with {knowledge_count} knowledge chunks from domain expertise"
    
    # Assess significance based on result characteristics  
    significance_assessment = _assess_result_significance(result)
    
    return ResultInsights(
        interpretation=interpretation,
        contextual_analysis=contextual_analysis,
        significance_assessment=significance_assessment,
        anomaly_indicators=[],
        domain_specific_notes=[]
    )


async def correlate_basic_patterns(
    result: ToolResult,
    domain: Optional[str],
    max_patterns: int
) -> List[HistoricalPattern]:
    """Correlate result with basic historical investigation patterns"""
    
    # For now, return basic pattern - would integrate with actual historical data
    if domain and result.success:
        return [HistoricalPattern(
            pattern_type=f"{domain}_analysis_success",
            similarity_score=0.8,
            historical_context=f"Similar successful {domain} analysis patterns observed in previous investigations",
            outcome_prediction="Likely to provide valuable investigation insights",
            confidence=0.7
        )]
    
    return []


async def generate_basic_recommendations(
    result: ToolResult,
    context: Optional[ToolExecutionContext],
    investigation_context: Optional[AutonomousInvestigationContext],
    max_recommendations: int
) -> List[NextStepRecommendation]:
    """Generate basic knowledge-based next step recommendations"""
    
    recommendations = []
    
    if result.success and result.data:
        # Generate basic recommendation based on successful result
        recommendations.append(NextStepRecommendation(
            action_type="analysis_continuation",
            description="Continue investigation with correlated analysis across other domains",
            priority="medium",
            rationale="Successful tool execution indicates viable investigation path",
            expected_outcome="Enhanced cross-domain correlation and findings",
            confidence=0.6
        ))
        
        # Add domain-specific recommendation if context available
        if context and hasattr(context, 'tool_name'):
            recommendations.append(NextStepRecommendation(
                action_type="result_validation",
                description=f"Validate {context.tool_name} results with complementary analysis tools",
                priority="high",
                rationale="Knowledge base suggests validation improves investigation accuracy",
                expected_outcome="Increased confidence in investigation findings",
                confidence=0.7
            ))
    
    return recommendations[:max_recommendations]


async def assess_basic_confidence(
    result: ToolResult,
    context: Optional[ToolExecutionContext]
) -> ConfidenceScore:
    """Assess confidence based on available information"""
    
    # Calculate confidence metrics based on available information
    overall_confidence = 0.7 if result.success else 0.3
    
    knowledge_coverage = 0.0
    if context and context.knowledge_context:
        # Higher knowledge coverage with more chunks
        knowledge_coverage = min(1.0, context.knowledge_context.total_chunks / 10.0)
    
    pattern_match_confidence = 0.6 if result.success else 0.2
    interpretation_reliability = 0.7 if result.data else 0.4
    recommendation_quality = 0.6  # Based on recommendation generation success
    
    return ConfidenceScore(
        overall_confidence=overall_confidence,
        knowledge_coverage=knowledge_coverage,
        pattern_match_confidence=pattern_match_confidence,
        interpretation_reliability=interpretation_reliability,
        recommendation_quality=recommendation_quality
    )


async def correlate_basic_threat_intelligence(
    result: ToolResult,
    domain: Optional[str]
) -> ThreatCorrelation:
    """Correlate result with basic threat intelligence data"""
    
    # Basic threat correlation - would integrate with actual threat intel feeds
    threat_indicators = []
    risk_assessment = "low"
    correlation_confidence = 0.5
    
    if result.success and domain:
        # Generate basic threat assessment
        if domain in ["network", "risk"]:
            risk_assessment = "medium"
            correlation_confidence = 0.7
            threat_indicators.append("network_activity_analysis")
    
    return ThreatCorrelation(
        threat_indicators=threat_indicators,
        risk_assessment=risk_assessment,
        correlation_confidence=correlation_confidence,
        intelligence_sources=["knowledge_base", "domain_patterns"],
        recommended_actions=["continue_monitoring", "cross_reference_analysis"]
    )


def _assess_result_significance(result: ToolResult) -> str:
    """Assess the significance of the tool result"""
    if not result.success:
        return "Tool execution failed - requires investigation"
    
    data_size = len(str(result.data)) if result.data else 0
    if data_size > 1000:
        return "Substantial result data - likely contains valuable insights"
    elif data_size > 100:
        return "Moderate result data - contains useful information"
    else:
        return "Minimal result data - may require additional analysis"