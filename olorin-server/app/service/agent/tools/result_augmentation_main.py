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
    from ..rag import RAGOrchestrator
    RAG_AVAILABLE = True
except ImportError:
    logger.warning("RAG components not available for result augmentation")
    RAG_AVAILABLE = False
    RAGOrchestrator = None


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
            # Import and use augmentation processor
            from .result_augmentation_processor import create_augmented_result_async
            
            augmented_result = await create_augmented_result_async(
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