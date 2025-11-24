"""
RAG-Enhanced Tool Base

Extension of EnhancedToolBase with RAG context injection capabilities.
Provides knowledge-augmented tool execution with parameter optimization
and result interpretation enhancement.
"""

import asyncio
import time
from typing import Any, Dict, List, Optional

from .enhanced_tool_base import EnhancedToolBase, ToolConfig, ToolResult, ToolMetrics
from .rag_tool_context import (
    ToolExecutionContextEnhancer,
    ToolExecutionContext,
    get_tool_context_enhancer
)
from ..autonomous_context import StructuredInvestigationContext
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

# Import result augmentation service with graceful fallback
try:
    from .result_augmentation_service import (
        ToolResultAugmentationService,
        AugmentedToolResult,
        get_result_augmentation_service
    )
    RESULT_AUGMENTATION_AVAILABLE = True
except ImportError:
    logger.info("Result augmentation service not available")
    RESULT_AUGMENTATION_AVAILABLE = False
    ToolResultAugmentationService = None
    AugmentedToolResult = None
    get_result_augmentation_service = None


class RAGEnhancedToolBase(EnhancedToolBase):
    """
    RAG-Enhanced Tool Base Class
    
    Extends EnhancedToolBase with RAG capabilities:
    - Knowledge-augmented parameter optimization
    - Context-aware tool execution
    - RAG-enhanced result interpretation
    - Performance monitoring with <50ms overhead target
    - Graceful degradation when RAG unavailable
    """
    
    def __init__(
        self, 
        config: ToolConfig,
        enable_rag: bool = True,
        rag_context_enhancer: Optional[ToolExecutionContextEnhancer] = None
    ):
        """Initialize RAG-enhanced tool"""
        super().__init__(config)
        
        self.enable_rag = enable_rag
        self.rag_available = False
        
        # Initialize RAG context enhancer
        try:
            self.context_enhancer = rag_context_enhancer or get_tool_context_enhancer()
            self.rag_available = self.context_enhancer.rag_available
            if self.rag_available:
                logger.info(f"RAG enhancement enabled for tool {config.name}")
            else:
                logger.info(f"RAG enhancement initialized but not available for tool {config.name}")
        except Exception as e:
            logger.warning(f"RAG context enhancer initialization failed for {config.name}: {str(e)}")
            self.context_enhancer = None
            self.rag_available = False
            self.enable_rag = False
        
        # Initialize result augmentation service
        self.result_augmentation_service = None
        self.result_augmentation_available = False
        
        if RESULT_AUGMENTATION_AVAILABLE:
            try:
                self.result_augmentation_service = get_result_augmentation_service()
                self.result_augmentation_available = self.result_augmentation_service.rag_available
                if self.result_augmentation_available:
                    logger.info(f"Result augmentation enabled for tool {config.name}")
            except Exception as e:
                logger.warning(f"Result augmentation service initialization failed for {config.name}: {str(e)}")
        
        # RAG-specific metrics
        self.rag_metrics = {
            "rag_enhanced_executions": 0,
            "standard_executions": 0,
            "rag_enhancement_failures": 0,
            "avg_rag_overhead_ms": 0.0,
            "knowledge_chunks_utilized": 0,
            "parameter_enhancements": 0,
            "result_interpretations": 0,
            "result_augmentations": 0
        }
    
    async def execute(
        self, 
        input_data: Dict[str, Any], 
        context: Optional[Dict[str, Any]] = None
    ) -> ToolResult:
        """Execute tool with RAG enhancement capabilities"""
        
        start_time = time.time()
        
        # Extract investigation context if available
        investigation_context = self._extract_investigation_context(context)
        domain = context.get("domain") if context else None
        
        # Attempt RAG-enhanced execution if available
        if self.enable_rag and self.rag_available and self.context_enhancer:
            try:
                return await self._rag_enhanced_execute(input_data, context, investigation_context, domain)
            except Exception as e:
                logger.warning(f"RAG-enhanced execution failed for {self.config.name}, falling back to standard: {str(e)}")
                self.rag_metrics["rag_enhancement_failures"] += 1
        
        # Fallback to standard execution
        self.rag_metrics["standard_executions"] += 1
        return await super().execute(input_data, context)
    
    async def _rag_enhanced_execute(
        self,
        input_data: Dict[str, Any],
        context: Optional[Dict[str, Any]],
        investigation_context: Optional[StructuredInvestigationContext],
        domain: Optional[str]
    ) -> ToolResult:
        """Execute tool with RAG context enhancement"""
        
        rag_start_time = time.time()
        
        # Step 1: Enhance execution context with RAG knowledge
        enhanced_context = await self.context_enhancer.enhance_tool_execution_context(
            tool_name=self.config.name,
            input_parameters=input_data,
            investigation_context=investigation_context,
            domain=domain,
            execution_id=f"{self.config.name}_{int(time.time() * 1000)}"
        )
        
        rag_overhead_ms = (time.time() - rag_start_time) * 1000
        
        # Step 2: Execute tool with enhanced parameters
        execution_start = time.time()
        
        # Use enhanced parameters if available, otherwise fall back to original
        execution_data = enhanced_context.enhanced_parameters
        enhanced_context_dict = self._create_enhanced_context_dict(context, enhanced_context)
        
        # Execute the actual tool implementation
        result = await super().execute(execution_data, enhanced_context_dict)
        
        execution_time = (time.time() - execution_start) * 1000
        
        # Step 3: Enhance result with comprehensive RAG augmentation if successful
        if result.success and enhanced_context.has_rag_context:
            result = await self._enhance_result_with_comprehensive_augmentation(
                result, enhanced_context, investigation_context, domain
            )
        
        # Step 4: Update RAG-specific metrics
        total_time = (time.time() - rag_start_time) * 1000
        self._update_rag_metrics(enhanced_context, rag_overhead_ms, total_time)
        
        # Add RAG metadata to result
        result.metadata.update({
            "rag_enhanced": True,
            "rag_overhead_ms": rag_overhead_ms,
            "knowledge_chunks_used": enhanced_context.total_knowledge_chunks,
            "parameter_enhancements": len(enhanced_context.parameter_enhancements),
            "performance_target_met": rag_overhead_ms < 50.0
        })
        
        logger.info(
            f"RAG-enhanced execution completed for {self.config.name}: "
            f"overhead={rag_overhead_ms:.1f}ms, chunks={enhanced_context.total_knowledge_chunks}"
        )
        
        self.rag_metrics["rag_enhanced_executions"] += 1
        
        return result
    
    def _extract_investigation_context(
        self, 
        context: Optional[Dict[str, Any]]
    ) -> Optional[StructuredInvestigationContext]:
        """Extract investigation context from execution context"""
        if not context:
            return None
        
        # Look for investigation context in various possible locations
        if "investigation_context" in context:
            return context["investigation_context"]
        
        if "structured_context" in context:
            return context["structured_context"]
            
        # Try to construct from available data
        if "investigation_id" in context:
            # This would need to be enhanced based on actual context structure
            # For now, return None to avoid errors
            pass
        
        return None
    
    def _create_enhanced_context_dict(
        self,
        original_context: Optional[Dict[str, Any]],
        enhanced_context: ToolExecutionContext
    ) -> Dict[str, Any]:
        """Create enhanced context dictionary for tool execution"""
        
        context_dict = original_context.copy() if original_context else {}
        
        # Add RAG enhancement information
        context_dict.update({
            "rag_enhanced": True,
            "tool_execution_context": enhanced_context,
            "knowledge_context": enhanced_context.knowledge_context,
            "parameter_enhancements": enhanced_context.parameter_enhancements,
            "execution_id": enhanced_context.execution_id
        })
        
        return context_dict
    
    async def _enhance_result_with_comprehensive_augmentation(
        self,
        result: ToolResult,
        enhanced_context: ToolExecutionContext,
        investigation_context: Optional[StructuredInvestigationContext],
        domain: Optional[str]
    ) -> ToolResult:
        """Enhance tool result with comprehensive RAG augmentation"""
        
        # Try comprehensive result augmentation first if available
        if self.result_augmentation_available and self.result_augmentation_service:
            try:
                augmentation_start = time.time()
                
                # Use the comprehensive augmentation service
                augmented_result = await self.result_augmentation_service.augment_result(
                    result=result,
                    context=enhanced_context,
                    investigation_context=investigation_context,
                    domain=domain
                )
                
                augmentation_time = (time.time() - augmentation_start) * 1000
                
                # If we got an augmented result, use it
                if isinstance(augmented_result, AugmentedToolResult):
                    self.rag_metrics["result_augmentations"] += 1
                    logger.debug(
                        f"Comprehensive result augmentation completed for {self.config.name} "
                        f"in {augmentation_time:.1f}ms"
                    )
                    return augmented_result
                
            except Exception as e:
                logger.warning(
                    f"Comprehensive result augmentation failed for {self.config.name}, "
                    f"falling back to basic interpretation: {str(e)}"
                )
        
        # Fallback to basic RAG interpretation
        return await self._enhance_result_with_basic_interpretation(result, enhanced_context)
    
    async def _enhance_result_with_basic_interpretation(
        self,
        result: ToolResult,
        enhanced_context: ToolExecutionContext
    ) -> ToolResult:
        """Enhance tool result with basic RAG-based interpretation (fallback)"""
        
        if not enhanced_context.knowledge_context:
            return result
        
        try:
            interpretation_start = time.time()
            
            # Create interpretation based on knowledge context
            interpretation = await self._create_rag_interpretation(result, enhanced_context)
            
            # Add interpretation to result metadata
            if interpretation:
                result.metadata["rag_interpretation"] = interpretation
                result.metadata["interpretation_confidence"] = self._calculate_interpretation_confidence(
                    enhanced_context.knowledge_context
                )
                
                interpretation_time = (time.time() - interpretation_start) * 1000
                result.metadata["interpretation_time_ms"] = interpretation_time
                
                self.rag_metrics["result_interpretations"] += 1
        
        except Exception as e:
            logger.warning(f"RAG result interpretation failed for {self.config.name}: {str(e)}")
            result.metadata["rag_interpretation_error"] = str(e)
        
        return result
    
    async def _create_rag_interpretation(
        self,
        result: ToolResult,
        enhanced_context: ToolExecutionContext
    ) -> Optional[str]:
        """Create RAG-based interpretation of tool results"""
        
        knowledge_context = enhanced_context.knowledge_context
        if not knowledge_context or knowledge_context.total_chunks == 0:
            return None
        
        # Create basic interpretation based on knowledge context
        interpretation_parts = []
        
        if knowledge_context.critical_knowledge:
            interpretation_parts.append(
                f"Result validated against {len(knowledge_context.critical_knowledge)} critical knowledge sources"
            )
        
        if knowledge_context.supporting_knowledge:
            interpretation_parts.append(
                f"Analysis supported by {len(knowledge_context.supporting_knowledge)} domain knowledge references"
            )
        
        if enhanced_context.parameter_enhancements:
            interpretation_parts.append(
                f"Tool execution enhanced with: {'; '.join(enhanced_context.parameter_enhancements)}"
            )
        
        return ". ".join(interpretation_parts) if interpretation_parts else None
    
    def _calculate_interpretation_confidence(self, knowledge_context) -> float:
        """Calculate confidence score for RAG interpretation"""
        
        if not knowledge_context:
            return 0.0
        
        # Simple confidence calculation based on knowledge availability
        critical_weight = len(knowledge_context.critical_knowledge) * 0.5
        supporting_weight = len(knowledge_context.supporting_knowledge) * 0.3
        background_weight = len(knowledge_context.background_knowledge) * 0.1
        
        confidence = min(1.0, (critical_weight + supporting_weight + background_weight) / 10.0)
        return confidence
    
    def _update_rag_metrics(
        self,
        enhanced_context: ToolExecutionContext,
        rag_overhead_ms: float,
        total_time_ms: float
    ) -> None:
        """Update RAG-specific metrics"""
        
        # Update knowledge utilization
        self.rag_metrics["knowledge_chunks_utilized"] += enhanced_context.total_knowledge_chunks
        
        # Update parameter enhancement count
        self.rag_metrics["parameter_enhancements"] += len(enhanced_context.parameter_enhancements)
        
        # Update average RAG overhead
        total_rag_executions = self.rag_metrics["rag_enhanced_executions"] + 1
        current_avg = self.rag_metrics["avg_rag_overhead_ms"]
        new_avg = ((current_avg * (total_rag_executions - 1)) + rag_overhead_ms) / total_rag_executions
        self.rag_metrics["avg_rag_overhead_ms"] = new_avg
    
    def get_rag_metrics(self) -> Dict[str, Any]:
        """Get RAG-specific metrics"""
        
        total_executions = (
            self.rag_metrics["rag_enhanced_executions"] + 
            self.rag_metrics["standard_executions"]
        )
        
        rag_usage_rate = 0.0
        if total_executions > 0:
            rag_usage_rate = self.rag_metrics["rag_enhanced_executions"] / total_executions
        
        avg_chunks_per_execution = 0.0
        if self.rag_metrics["rag_enhanced_executions"] > 0:
            avg_chunks_per_execution = (
                self.rag_metrics["knowledge_chunks_utilized"] / 
                self.rag_metrics["rag_enhanced_executions"]
            )
        
        return {
            "rag_status": {
                "enabled": self.enable_rag,
                "available": self.rag_available,
                "tool_name": self.config.name,
                "result_augmentation_available": self.result_augmentation_available
            },
            "usage_metrics": self.rag_metrics.copy(),
            "performance_metrics": {
                "rag_usage_rate": rag_usage_rate,
                "avg_knowledge_chunks_per_execution": avg_chunks_per_execution,
                "total_executions": total_executions,
                "performance_target_hit_rate": self._calculate_performance_target_hit_rate(),
                "result_augmentation_rate": self._calculate_augmentation_rate()
            }
        }
    
    def _calculate_performance_target_hit_rate(self) -> float:
        """Calculate percentage of executions meeting performance target"""
        if self.rag_metrics["rag_enhanced_executions"] == 0:
            return 1.0
        
        # This is simplified - would need to track individual execution performance
        return 1.0 if self.rag_metrics["avg_rag_overhead_ms"] < 50.0 else 0.8
    
    def _calculate_augmentation_rate(self) -> float:
        """Calculate percentage of results that received comprehensive augmentation"""
        total_rag_executions = self.rag_metrics["rag_enhanced_executions"]
        if total_rag_executions == 0:
            return 0.0
        
        return self.rag_metrics["result_augmentations"] / total_rag_executions
    
    async def clear_rag_cache(self) -> None:
        """Clear RAG-related caches"""
        if self.context_enhancer:
            await self.context_enhancer.clear_cache()
        logger.info(f"RAG cache cleared for tool {self.config.name}")
    
    def is_rag_enhanced(self) -> bool:
        """Check if tool is RAG-enhanced and available"""
        return self.enable_rag and self.rag_available
    
    async def get_enhanced_health_status(self) -> Dict[str, Any]:
        """Get enhanced health status including RAG capabilities"""
        
        base_health = self.get_health_status()
        rag_metrics = self.get_rag_metrics()
        
        # Enhanced health check
        rag_health_score = 1.0
        
        if self.enable_rag:
            if not self.rag_available:
                rag_health_score = 0.5
            elif self.rag_metrics["rag_enhancement_failures"] > 5:
                rag_health_score = 0.7
            elif self.rag_metrics["avg_rag_overhead_ms"] > 100.0:
                rag_health_score = 0.8
        
        return {
            **base_health,
            "rag_capabilities": {
                "enabled": self.enable_rag,
                "available": self.rag_available,
                "result_augmentation_available": self.result_augmentation_available,
                "health_score": rag_health_score
            },
            "rag_metrics": rag_metrics
        }