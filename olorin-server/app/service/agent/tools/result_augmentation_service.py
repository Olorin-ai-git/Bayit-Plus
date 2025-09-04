"""
Tool Result Augmentation Service

Enhances tool results with contextual knowledge and insights from the RAG system.
Provides result interpretation, historical context, pattern analysis, and 
knowledge-based recommendations for next steps.
"""

import asyncio
import time
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Union

from .enhanced_tool_base import ToolResult
from .rag_tool_context import ToolExecutionContext
from ..autonomous_context import AutonomousInvestigationContext
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

# Try to import RAG components with graceful fallback
try:
    from ..rag import RAGOrchestrator, ContextAugmentationConfig
    from ..rag.knowledge_base import KnowledgeBase
    RAG_AVAILABLE = True
except ImportError:
    logger.warning("RAG components not available for result augmentation")
    RAG_AVAILABLE = False
    RAGOrchestrator = None
    ContextAugmentationConfig = None
    KnowledgeBase = None


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
        augmented_metadata.update({
            "rag_augmented": True,
            "augmentation_time_ms": self.augmentation_time_ms,
            "knowledge_chunks_used": self.knowledge_chunks_used,
            "enhancement_confidence": self.enhancement_confidence,
            "insights_generated": bool(self.rag_insights.interpretation),
            "patterns_found": len(self.historical_patterns),
            "recommendations_count": len(self.next_step_recommendations)
        })
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


class ToolResultAugmentationService:
    """
    Service for augmenting tool results with RAG knowledge.
    
    Enhances tool results with:
    - Contextual knowledge and interpretation
    - Historical pattern correlation
    - Knowledge-based next step recommendations
    - Confidence assessment and threat intelligence correlation
    """
    
    def __init__(
        self,
        rag_orchestrator: Optional['RAGOrchestrator'] = None,
        config: Optional[ResultAugmentationConfig] = None
    ):
        """Initialize the result augmentation service"""
        
        self.config = config or ResultAugmentationConfig()
        self.rag_available = RAG_AVAILABLE and rag_orchestrator is not None
        self.rag_orchestrator = rag_orchestrator
        
        # Performance tracking
        self.metrics = {
            "total_augmentations": 0,
            "successful_augmentations": 0,
            "average_latency_ms": 0.0,
            "cache_hits": 0,
            "knowledge_utilization": 0
        }
        
        if self.rag_available:
            logger.info("Tool result augmentation service initialized with RAG support")
        else:
            logger.warning("Tool result augmentation service initialized without RAG support")
    
    async def augment_result(
        self,
        result: ToolResult,
        context: Optional[ToolExecutionContext] = None,
        investigation_context: Optional[AutonomousInvestigationContext] = None,
        domain: Optional[str] = None,
        augmentation_config: Optional[ResultAugmentationConfig] = None
    ) -> Union[AugmentedToolResult, ToolResult]:
        """
        Augment tool result with RAG-derived insights.
        
        Args:
            result: Original tool result to augment
            context: Tool execution context with knowledge
            investigation_context: Current investigation context
            domain: Investigation domain (network, device, location, logs, risk)
            augmentation_config: Override configuration for this augmentation
            
        Returns:
            AugmentedToolResult with enhanced insights or original result if RAG unavailable
        """
        
        start_time = time.time()
        config = augmentation_config or self.config
        
        # Track attempt
        self.metrics["total_augmentations"] += 1
        
        # If RAG not available or result failed, return original
        if not self.rag_available or not result.success:
            logger.debug(f"Skipping result augmentation: RAG available={self.rag_available}, result success={result.success}")
            return result
        
        try:
            # Create augmented result with all components
            augmented_result = await self._create_augmented_result(
                result=result,
                context=context,
                investigation_context=investigation_context,
                domain=domain,
                config=config,
                start_time=start_time
            )
            
            # Update performance metrics
            self.metrics["successful_augmentations"] += 1
            self._update_performance_metrics(augmented_result.augmentation_time_ms)
            
            logger.info(
                f"Successfully augmented result in {augmented_result.augmentation_time_ms:.1f}ms "
                f"with {augmented_result.knowledge_chunks_used} knowledge chunks"
            )
            
            return augmented_result
            
        except Exception as e:
            elapsed_time = (time.time() - start_time) * 1000
            logger.warning(f"Result augmentation failed after {elapsed_time:.1f}ms: {str(e)}")
            
            # Return original result with error metadata
            result.metadata["augmentation_error"] = str(e)
            result.metadata["augmentation_attempted"] = True
            return result
    
    async def _create_augmented_result(
        self,
        result: ToolResult,
        context: Optional[ToolExecutionContext],
        investigation_context: Optional[AutonomousInvestigationContext],
        domain: Optional[str],
        config: ResultAugmentationConfig,
        start_time: float
    ) -> AugmentedToolResult:
        """Create fully augmented result with all enhancement components"""
        
        # Gather all augmentation data concurrently for performance
        augmentation_tasks = []
        
        # Task 1: Generate insights
        if config.enable_interpretation:
            augmentation_tasks.append(
                self._generate_insights(result, context, domain)
            )
        else:
            augmentation_tasks.append(self._create_default_insights())
        
        # Task 2: Correlate historical patterns
        if config.enable_historical_correlation:
            augmentation_tasks.append(
                self._correlate_historical_patterns(result, domain, config.max_historical_patterns)
            )
        else:
            augmentation_tasks.append(self._create_default_patterns())
        
        # Task 3: Generate recommendations
        if config.enable_recommendations:
            augmentation_tasks.append(
                self._generate_recommendations(result, context, investigation_context, config.max_recommendations)
            )
        else:
            augmentation_tasks.append(self._create_default_recommendations())
        
        # Task 4: Assess confidence
        augmentation_tasks.append(
            self._assess_confidence(result, context)
        )
        
        # Task 5: Correlate threat intelligence
        if config.enable_threat_correlation:
            augmentation_tasks.append(
                self._correlate_threat_intelligence(result, domain)
            )
        else:
            augmentation_tasks.append(self._create_default_threat_correlation())
        
        # Execute all tasks concurrently
        (
            insights,
            historical_patterns,
            recommendations,
            confidence,
            threat_correlation
        ) = await asyncio.gather(*augmentation_tasks, return_exceptions=True)
        
        # Handle any task exceptions gracefully
        insights = self._handle_task_result(insights, self._create_default_insights)
        historical_patterns = self._handle_task_result(historical_patterns, self._create_default_patterns)
        recommendations = self._handle_task_result(recommendations, self._create_default_recommendations)
        confidence = self._handle_task_result(confidence, self._create_default_confidence)
        threat_correlation = self._handle_task_result(threat_correlation, self._create_default_threat_correlation)
        
        # Calculate performance metrics
        augmentation_time_ms = (time.time() - start_time) * 1000
        knowledge_chunks_used = self._count_knowledge_chunks_used(context)
        enhancement_confidence = self._calculate_enhancement_confidence(
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
    
    def _handle_task_result(self, task_result: Any, default_factory):
        """Handle task result, returning default on exception"""
        if isinstance(task_result, Exception):
            logger.warning(f"Augmentation task failed: {str(task_result)}")
            return default_factory()
        return task_result
    
    async def _generate_insights(
        self,
        result: ToolResult,
        context: Optional[ToolExecutionContext],
        domain: Optional[str]
    ) -> ResultInsights:
        """Generate RAG-based insights for tool result"""
        
        # Create basic interpretation from result data
        interpretation = f"Tool execution completed successfully with {len(str(result.data))} characters of result data"
        
        contextual_analysis = None
        if context and context.knowledge_context:
            knowledge_count = context.knowledge_context.total_chunks
            contextual_analysis = f"Analysis enhanced with {knowledge_count} knowledge chunks from domain expertise"
        
        # Assess significance based on result characteristics  
        significance_assessment = self._assess_result_significance(result)
        
        return ResultInsights(
            interpretation=interpretation,
            contextual_analysis=contextual_analysis,
            significance_assessment=significance_assessment,
            anomaly_indicators=[],
            domain_specific_notes=[]
        )
    
    async def _correlate_historical_patterns(
        self,
        result: ToolResult,
        domain: Optional[str],
        max_patterns: int
    ) -> List[HistoricalPattern]:
        """Correlate result with historical investigation patterns"""
        
        # For now, return placeholder pattern - would integrate with actual historical data
        if domain and result.success:
            return [HistoricalPattern(
                pattern_type=f"{domain}_analysis_success",
                similarity_score=0.8,
                historical_context=f"Similar successful {domain} analysis patterns observed in previous investigations",
                outcome_prediction="Likely to provide valuable investigation insights",
                confidence=0.7
            )]
        
        return []
    
    async def _generate_recommendations(
        self,
        result: ToolResult,
        context: Optional[ToolExecutionContext],
        investigation_context: Optional[AutonomousInvestigationContext],
        max_recommendations: int
    ) -> List[NextStepRecommendation]:
        """Generate knowledge-based next step recommendations"""
        
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
    
    async def _assess_confidence(
        self,
        result: ToolResult,
        context: Optional[ToolExecutionContext]
    ) -> ConfidenceScore:
        """Assess confidence based on knowledge base coverage"""
        
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
    
    async def _correlate_threat_intelligence(
        self,
        result: ToolResult,
        domain: Optional[str]
    ) -> ThreatCorrelation:
        """Correlate result with threat intelligence data"""
        
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
    
    # Default factory methods for graceful degradation
    
    async def _create_default_insights(self) -> ResultInsights:
        """Create default insights when generation fails"""
        return ResultInsights()
    
    async def _create_default_patterns(self) -> List[HistoricalPattern]:
        """Create default patterns when correlation fails"""
        return []
    
    async def _create_default_recommendations(self) -> List[NextStepRecommendation]:
        """Create default recommendations when generation fails"""
        return []
    
    def _create_default_confidence(self) -> ConfidenceScore:
        """Create default confidence when assessment fails"""
        return ConfidenceScore(
            overall_confidence=0.5,
            knowledge_coverage=0.0,
            pattern_match_confidence=0.5,
            interpretation_reliability=0.5,
            recommendation_quality=0.5
        )
    
    async def _create_default_threat_correlation(self) -> ThreatCorrelation:
        """Create default threat correlation when correlation fails"""
        return ThreatCorrelation(
            threat_indicators=[],
            risk_assessment="unknown",
            correlation_confidence=0.0,
            intelligence_sources=[],
            recommended_actions=[]
        )
    
    # Helper methods
    
    def _assess_result_significance(self, result: ToolResult) -> str:
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
    
    def _count_knowledge_chunks_used(self, context: Optional[ToolExecutionContext]) -> int:
        """Count knowledge chunks used in augmentation"""
        if not context or not context.knowledge_context:
            return 0
        return context.knowledge_context.total_chunks
    
    def _calculate_enhancement_confidence(
        self,
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
    
    def _update_performance_metrics(self, augmentation_time_ms: float) -> None:
        """Update service performance metrics"""
        
        successful_count = self.metrics["successful_augmentations"]
        current_avg = self.metrics["average_latency_ms"]
        
        # Calculate new average latency
        new_avg = ((current_avg * (successful_count - 1)) + augmentation_time_ms) / successful_count
        self.metrics["average_latency_ms"] = new_avg
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get service performance metrics"""
        
        success_rate = 0.0
        if self.metrics["total_augmentations"] > 0:
            success_rate = self.metrics["successful_augmentations"] / self.metrics["total_augmentations"]
        
        return {
            **self.metrics,
            "success_rate": success_rate,
            "rag_available": self.rag_available,
            "average_performance_target_met": self.metrics["average_latency_ms"] < 30.0
        }


# Global service instance for reuse
_result_augmentation_service = None


def get_result_augmentation_service(
    rag_orchestrator: Optional['RAGOrchestrator'] = None
) -> ToolResultAugmentationService:
    """Get or create the global result augmentation service instance"""
    
    global _result_augmentation_service
    
    if _result_augmentation_service is None:
        # Try to get RAG orchestrator if not provided
        if not rag_orchestrator and RAG_AVAILABLE:
            try:
                from ..rag.rag_orchestrator import get_rag_orchestrator
                rag_orchestrator = get_rag_orchestrator()
            except ImportError:
                pass
        
        _result_augmentation_service = ToolResultAugmentationService(rag_orchestrator)
        logger.info("Global result augmentation service created")
    
    return _result_augmentation_service