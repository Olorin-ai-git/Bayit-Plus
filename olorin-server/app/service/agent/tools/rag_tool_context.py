"""
RAG Tool Context System

Provides RAG context injection capabilities for enhanced tool execution
with knowledge-augmented parameter optimization and result interpretation.
"""

import asyncio
import time
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Union

from ..rag import (
    RAGOrchestrator, 
    ContextAugmentor,
    KnowledgeContext,
    ContextAugmentationConfig,
    get_rag_orchestrator,
    create_context_augmentor
)
from ..autonomous_context import StructuredInvestigationContext
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class ContextInjectionStrategy(Enum):
    """Strategies for injecting RAG context into tool execution"""
    PARAMETER_ENHANCEMENT = "parameter_enhancement"
    CONTEXT_AUGMENTATION = "context_augmentation" 
    RESULT_INTERPRETATION = "result_interpretation"
    FULL_INTEGRATION = "full_integration"


@dataclass
class ToolExecutionContext:
    """Enhanced tool execution context with RAG capabilities"""
    
    # Base execution context
    tool_name: str
    execution_id: str
    investigation_id: Optional[str] = None
    domain: Optional[str] = None
    
    # RAG context
    knowledge_context: Optional[KnowledgeContext] = None
    rag_enabled: bool = False
    context_retrieval_time_ms: float = 0.0
    
    # Enhanced parameters
    original_parameters: Dict[str, Any] = field(default_factory=dict)
    enhanced_parameters: Dict[str, Any] = field(default_factory=dict)
    parameter_enhancements: List[str] = field(default_factory=list)
    
    # Context metadata
    context_injection_strategy: ContextInjectionStrategy = ContextInjectionStrategy.FULL_INTEGRATION
    timestamp: datetime = field(default_factory=datetime.now)
    performance_metrics: Dict[str, float] = field(default_factory=dict)
    
    @property
    def has_rag_context(self) -> bool:
        """Check if RAG context is available and populated"""
        return (
            self.rag_enabled and 
            self.knowledge_context is not None and 
            self.knowledge_context.total_chunks > 0
        )
    
    @property
    def total_knowledge_chunks(self) -> int:
        """Get total number of knowledge chunks available"""
        if self.knowledge_context:
            return self.knowledge_context.total_chunks
        return 0


@dataclass 
class ToolContextEnhancementResult:
    """Result of RAG context enhancement for tool execution"""
    
    success: bool
    enhanced_parameters: Dict[str, Any] = field(default_factory=dict)
    context_summary: str = ""
    knowledge_chunks_used: int = 0
    enhancement_time_ms: float = 0.0
    error: Optional[str] = None
    
    @classmethod
    def success_result(
        cls,
        enhanced_parameters: Dict[str, Any],
        context_summary: str,
        knowledge_chunks_used: int,
        enhancement_time_ms: float
    ) -> 'ToolContextEnhancementResult':
        """Create successful enhancement result"""
        return cls(
            success=True,
            enhanced_parameters=enhanced_parameters,
            context_summary=context_summary,
            knowledge_chunks_used=knowledge_chunks_used,
            enhancement_time_ms=enhancement_time_ms
        )
    
    @classmethod
    def failure_result(cls, error: str) -> 'ToolContextEnhancementResult':
        """Create failed enhancement result"""
        return cls(success=False, error=error)


class ToolExecutionContextEnhancer:
    """
    RAG Context Injection System for Tool Execution
    
    Provides knowledge-augmented tool execution capabilities:
    - Parameter optimization based on domain knowledge
    - Context injection for enhanced tool performance  
    - Result interpretation with knowledge validation
    - Performance monitoring with <50ms overhead target
    """
    
    def __init__(
        self,
        rag_orchestrator: Optional[RAGOrchestrator] = None,
        enable_enhancement: bool = True,
        performance_target_ms: float = 50.0
    ):
        """Initialize tool execution context enhancer"""
        
        self.enable_enhancement = enable_enhancement
        self.performance_target_ms = performance_target_ms
        self.rag_available = False
        
        # RAG system integration
        try:
            self.rag_orchestrator = rag_orchestrator or get_rag_orchestrator()
            self.context_augmentor = create_context_augmentor(self.rag_orchestrator)
            self.rag_available = True
            logger.info("ToolExecutionContextEnhancer initialized with RAG capabilities")
        except Exception as e:
            logger.warning(f"RAG initialization failed - continuing without RAG: {str(e)}")
            self.rag_orchestrator = None
            self.context_augmentor = None
            self.rag_available = False
        
        # Performance tracking
        self.enhancement_stats = {
            "total_enhancements": 0,
            "successful_enhancements": 0,
            "failed_enhancements": 0,
            "avg_enhancement_time_ms": 0.0,
            "enhancements_under_target": 0,
            "knowledge_chunks_utilized": 0
        }
    
    async def enhance_tool_execution_context(
        self,
        tool_name: str,
        input_parameters: Dict[str, Any],
        investigation_context: Optional[StructuredInvestigationContext] = None,
        domain: Optional[str] = None,
        execution_id: Optional[str] = None
    ) -> ToolExecutionContext:
        """
        Enhance tool execution context with RAG knowledge
        
        Args:
            tool_name: Name of tool being executed
            input_parameters: Original tool parameters
            investigation_context: Optional investigation context
            domain: Optional domain context
            execution_id: Optional execution identifier
            
        Returns:
            Enhanced tool execution context with RAG knowledge
        """
        
        start_time = time.time()
        
        # Create base execution context
        exec_context = ToolExecutionContext(
            tool_name=tool_name,
            execution_id=execution_id or f"{tool_name}_{int(time.time() * 1000)}",
            investigation_id=investigation_context.investigation_id if investigation_context else None,
            domain=domain,
            original_parameters=input_parameters.copy(),
            rag_enabled=self.enable_enhancement and self.rag_available
        )
        
        # Attempt RAG enhancement if available
        if exec_context.rag_enabled:
            try:
                enhancement_result = await self._perform_rag_enhancement(
                    tool_name, input_parameters, investigation_context, domain
                )
                
                if enhancement_result.success:
                    # Apply successful enhancement
                    exec_context.enhanced_parameters = enhancement_result.enhanced_parameters
                    exec_context.parameter_enhancements = [enhancement_result.context_summary]
                    exec_context.context_retrieval_time_ms = enhancement_result.enhancement_time_ms
                    
                    # Retrieve knowledge context for the tool
                    knowledge_context = await self._retrieve_tool_knowledge_context(
                        tool_name, input_parameters, investigation_context, domain
                    )
                    exec_context.knowledge_context = knowledge_context
                    
                    self._update_success_stats(enhancement_result.enhancement_time_ms, enhancement_result.knowledge_chunks_used)
                    
                else:
                    # Enhancement failed - use original parameters
                    exec_context.enhanced_parameters = input_parameters.copy()
                    self._update_failure_stats()
                    logger.warning(f"RAG enhancement failed for {tool_name}: {enhancement_result.error}")
            
            except Exception as e:
                # RAG enhancement error - graceful fallback
                exec_context.enhanced_parameters = input_parameters.copy()
                exec_context.rag_enabled = False
                self._update_failure_stats()
                logger.error(f"RAG enhancement error for {tool_name}: {str(e)}")
        
        else:
            # RAG not available - use original parameters
            exec_context.enhanced_parameters = input_parameters.copy()
        
        # Record performance metrics
        total_time_ms = (time.time() - start_time) * 1000
        exec_context.performance_metrics = {
            "total_enhancement_time_ms": total_time_ms,
            "context_retrieval_time_ms": exec_context.context_retrieval_time_ms,
            "under_performance_target": total_time_ms < self.performance_target_ms
        }
        
        return exec_context
    
    async def _perform_rag_enhancement(
        self,
        tool_name: str,
        input_parameters: Dict[str, Any], 
        investigation_context: Optional[StructuredInvestigationContext],
        domain: Optional[str]
    ) -> ToolContextEnhancementResult:
        """Perform RAG-based parameter enhancement"""
        
        enhancement_start = time.time()
        
        try:
            # Create tool-specific query for knowledge retrieval
            tool_query = self._create_tool_enhancement_query(
                tool_name, input_parameters, domain
            )
            
            # Retrieve relevant knowledge for tool optimization
            knowledge_context = await self._retrieve_tool_knowledge_context(
                tool_name, input_parameters, investigation_context, domain
            )
            
            if not knowledge_context or knowledge_context.total_chunks == 0:
                return ToolContextEnhancementResult.failure_result("No relevant knowledge found")
            
            # Enhance parameters using knowledge context
            enhanced_params = await self._apply_knowledge_to_parameters(
                tool_name, input_parameters, knowledge_context
            )
            
            enhancement_time_ms = (time.time() - enhancement_start) * 1000
            
            context_summary = f"Enhanced {tool_name} with {knowledge_context.total_chunks} knowledge chunks"
            
            return ToolContextEnhancementResult.success_result(
                enhanced_parameters=enhanced_params,
                context_summary=context_summary,
                knowledge_chunks_used=knowledge_context.total_chunks,
                enhancement_time_ms=enhancement_time_ms
            )
            
        except Exception as e:
            return ToolContextEnhancementResult.failure_result(str(e))
    
    async def _retrieve_tool_knowledge_context(
        self,
        tool_name: str,
        parameters: Dict[str, Any],
        investigation_context: Optional[StructuredInvestigationContext],
        domain: Optional[str]
    ) -> Optional[KnowledgeContext]:
        """Retrieve knowledge context specific to tool execution"""
        
        if not self.context_augmentor or not investigation_context:
            return None
        
        try:
            # Create tool-specific objectives for knowledge retrieval
            tool_objectives = [
                f"Optimize {tool_name} tool execution parameters",
                f"Enhance {tool_name} tool effectiveness based on historical patterns",
                f"Validate {tool_name} tool configuration for {domain} domain analysis"
            ]
            
            # Use context augmentor to retrieve relevant knowledge
            knowledge_context = await self.context_augmentor.augment_investigation_context(
                investigation_context=investigation_context,
                domain=domain or "general",
                specific_objectives=tool_objectives
            )
            
            return knowledge_context
            
        except Exception as e:
            logger.error(f"Failed to retrieve tool knowledge context: {str(e)}")
            return None
    
    def _create_tool_enhancement_query(
        self,
        tool_name: str,
        parameters: Dict[str, Any],
        domain: Optional[str]
    ) -> str:
        """Create query for tool enhancement knowledge retrieval"""
        
        param_summary = ", ".join(parameters.keys())
        domain_context = f" in {domain} domain" if domain else ""
        
        return f"Optimize {tool_name} tool execution with parameters: {param_summary}{domain_context}"
    
    async def _apply_knowledge_to_parameters(
        self,
        tool_name: str,
        original_params: Dict[str, Any],
        knowledge_context: KnowledgeContext
    ) -> Dict[str, Any]:
        """Apply knowledge context to enhance tool parameters"""
        
        # Start with original parameters
        enhanced_params = original_params.copy()
        
        # Apply tool-specific enhancements based on knowledge
        if tool_name.lower() in ["splunk", "enhanced_splunk"]:
            enhanced_params = await self._enhance_splunk_parameters(enhanced_params, knowledge_context)
        elif tool_name.lower() in ["vector_search", "semantic_search"]:
            enhanced_params = await self._enhance_search_parameters(enhanced_params, knowledge_context)
        else:
            # Generic enhancement for unknown tools
            enhanced_params = await self._enhance_generic_parameters(enhanced_params, knowledge_context)
        
        return enhanced_params
    
    async def _enhance_splunk_parameters(
        self,
        params: Dict[str, Any],
        knowledge_context: KnowledgeContext
    ) -> Dict[str, Any]:
        """Enhance Splunk tool parameters using knowledge context"""
        
        enhanced = params.copy()
        
        # Enhance search query based on domain knowledge
        if "query" in params and knowledge_context.critical_knowledge:
            # Add knowledge-based search terms
            original_query = params["query"]
            knowledge_terms = self._extract_search_terms_from_knowledge(knowledge_context.critical_knowledge)
            if knowledge_terms:
                enhanced["query"] = f"({original_query}) AND ({' OR '.join(knowledge_terms)})"
                enhanced["_rag_enhancement"] = f"Added {len(knowledge_terms)} knowledge-based search terms"
        
        # Enhance time range based on knowledge patterns
        if knowledge_context.supporting_knowledge:
            time_patterns = self._extract_time_patterns_from_knowledge(knowledge_context.supporting_knowledge)
            if time_patterns and "earliest_time" not in params:
                enhanced["earliest_time"] = time_patterns.get("recommended_earliest", "-24h")
                enhanced["_rag_time_enhancement"] = "Applied knowledge-based time range optimization"
        
        return enhanced
    
    async def _enhance_search_parameters(
        self,
        params: Dict[str, Any],
        knowledge_context: KnowledgeContext
    ) -> Dict[str, Any]:
        """Enhance search tool parameters using knowledge context"""
        
        enhanced = params.copy()
        
        # Enhance search terms based on knowledge
        if "search_terms" in params or "query" in params:
            search_field = "search_terms" if "search_terms" in params else "query"
            original_terms = params[search_field]
            
            # Extract relevant terms from knowledge context
            knowledge_terms = self._extract_relevant_terms_from_knowledge(knowledge_context)
            if knowledge_terms:
                if isinstance(original_terms, str):
                    enhanced[search_field] = f"{original_terms} {' '.join(knowledge_terms)}"
                elif isinstance(original_terms, list):
                    enhanced[search_field] = original_terms + knowledge_terms
        
        # Enhance result limits based on knowledge complexity
        if knowledge_context.total_chunks > 10:
            enhanced["max_results"] = max(params.get("max_results", 10), 20)
            enhanced["_rag_result_enhancement"] = "Increased result limit due to rich knowledge context"
        
        return enhanced
    
    async def _enhance_generic_parameters(
        self,
        params: Dict[str, Any],
        knowledge_context: KnowledgeContext
    ) -> Dict[str, Any]:
        """Generic parameter enhancement for unknown tools"""
        
        enhanced = params.copy()
        
        # Add knowledge context as metadata
        enhanced["_rag_context"] = {
            "knowledge_chunks": knowledge_context.total_chunks,
            "domains_covered": list(knowledge_context.knowledge_sources) if knowledge_context.knowledge_sources else [],
            "enhancement_timestamp": datetime.now().isoformat()
        }
        
        return enhanced
    
    def _extract_search_terms_from_knowledge(self, knowledge_chunks: List[Any]) -> List[str]:
        """Extract relevant search terms from knowledge chunks"""
        terms = set()
        
        for chunk in knowledge_chunks[:5]:  # Limit to most relevant chunks
            if hasattr(chunk, 'content'):
                # Simple term extraction - could be enhanced with NLP
                content = chunk.content.lower()
                if "error" in content:
                    terms.add("error")
                if "failed" in content or "failure" in content:
                    terms.add("failed")
                if "suspicious" in content:
                    terms.add("suspicious")
                if "anomaly" in content or "anomalous" in content:
                    terms.add("anomaly")
        
        return list(terms)
    
    def _extract_time_patterns_from_knowledge(self, knowledge_chunks: List[Any]) -> Dict[str, str]:
        """Extract time-related patterns from knowledge chunks"""
        patterns = {}
        
        for chunk in knowledge_chunks[:3]:
            if hasattr(chunk, 'content'):
                content = chunk.content.lower()
                if "last 24 hours" in content or "24h" in content:
                    patterns["recommended_earliest"] = "-24h"
                elif "last week" in content or "7d" in content:
                    patterns["recommended_earliest"] = "-7d"
                elif "real-time" in content:
                    patterns["recommended_earliest"] = "-1h"
        
        return patterns
    
    def _extract_relevant_terms_from_knowledge(self, knowledge_context: KnowledgeContext) -> List[str]:
        """Extract relevant terms from all knowledge levels"""
        terms = []
        
        # Process critical knowledge first
        for chunk in knowledge_context.critical_knowledge[:3]:
            if hasattr(chunk, 'content'):
                # Extract key terms - simplified extraction
                content_words = chunk.content.lower().split()
                terms.extend([word for word in content_words if len(word) > 4 and word.isalpha()][:2])
        
        return list(set(terms))[:5]  # Return unique terms, max 5
    
    def _update_success_stats(self, enhancement_time_ms: float, knowledge_chunks: int) -> None:
        """Update success statistics"""
        self.enhancement_stats["total_enhancements"] += 1
        self.enhancement_stats["successful_enhancements"] += 1
        self.enhancement_stats["knowledge_chunks_utilized"] += knowledge_chunks
        
        if enhancement_time_ms < self.performance_target_ms:
            self.enhancement_stats["enhancements_under_target"] += 1
        
        # Update running average
        total_enhancements = self.enhancement_stats["total_enhancements"]
        current_avg = self.enhancement_stats["avg_enhancement_time_ms"]
        new_avg = ((current_avg * (total_enhancements - 1)) + enhancement_time_ms) / total_enhancements
        self.enhancement_stats["avg_enhancement_time_ms"] = new_avg
    
    def _update_failure_stats(self) -> None:
        """Update failure statistics"""
        self.enhancement_stats["total_enhancements"] += 1
        self.enhancement_stats["failed_enhancements"] += 1
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get enhancement performance metrics"""
        total = self.enhancement_stats["total_enhancements"]
        
        return {
            "enhancement_stats": self.enhancement_stats.copy(),
            "performance_metrics": {
                "success_rate": (
                    self.enhancement_stats["successful_enhancements"] / max(1, total)
                ),
                "performance_target_hit_rate": (
                    self.enhancement_stats["enhancements_under_target"] / max(1, total)
                ),
                "avg_knowledge_chunks_per_enhancement": (
                    self.enhancement_stats["knowledge_chunks_utilized"] / 
                    max(1, self.enhancement_stats["successful_enhancements"])
                )
            },
            "rag_status": {
                "available": self.rag_available,
                "enabled": self.enable_enhancement
            }
        }
    
    async def clear_cache(self) -> None:
        """Clear any internal caches"""
        if self.context_augmentor:
            await self.context_augmentor.clear_cache()
        logger.info("ToolExecutionContextEnhancer cache cleared")


# Global instance
_tool_context_enhancer: Optional[ToolExecutionContextEnhancer] = None


def get_tool_context_enhancer() -> ToolExecutionContextEnhancer:
    """Get global tool execution context enhancer instance"""
    global _tool_context_enhancer
    
    if _tool_context_enhancer is None:
        _tool_context_enhancer = ToolExecutionContextEnhancer()
    
    return _tool_context_enhancer