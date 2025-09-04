"""
Tool Result Augmentation Service Main Implementation

Main service implementation for augmenting tool results with RAG knowledge.
"""

import asyncio
import time
from typing import Any, Dict, List, Optional, Union

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
            augmentation_tasks.append(self._create_default_insights())
        
        # Task 2: Correlate historical patterns
        if config.enable_historical_correlation:
            augmentation_tasks.append(
                correlate_basic_patterns(result, domain, config.max_historical_patterns)
            )
        else:
            augmentation_tasks.append(self._create_default_patterns())
        
        # Task 3: Generate recommendations
        if config.enable_recommendations:
            augmentation_tasks.append(
                generate_basic_recommendations(result, context, investigation_context, config.max_recommendations)
            )
        else:
            augmentation_tasks.append(self._create_default_recommendations())
        
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