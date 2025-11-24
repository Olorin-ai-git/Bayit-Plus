"""
Result Enhancement Engine Main Implementation

Advanced engine for generating sophisticated insights from tool results using RAG knowledge.
"""

import asyncio
from typing import Any, Dict, List, Optional

from .result_augmentation_core import (
    ResultInsights,
    HistoricalPattern,
    NextStepRecommendation,
    ThreatCorrelation
)
from .enhanced_tool_base import ToolResult
from .rag_tool_context import ToolExecutionContext
from ..autonomous_context import StructuredInvestigationContext
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

# RAG component imports with graceful fallback
try:
    from ..rag import RAGOrchestrator, RAGRequest
    RAG_AVAILABLE = True
except ImportError:
    RAG_AVAILABLE = False
    RAGOrchestrator = None
    RAGRequest = None


class ResultEnhancementEngine:
    """
    Advanced engine for generating sophisticated insights from tool results.
    
    Uses RAG knowledge base to provide:
    - Deep contextual analysis
    - Pattern-based interpretation  
    - Domain-specific insights
    - Intelligent next step recommendations
    - Threat intelligence correlation
    """
    
    def __init__(self, rag_orchestrator: Optional['RAGOrchestrator'] = None):
        """Initialize the result enhancement engine"""
        
        self.rag_orchestrator = rag_orchestrator
        self.rag_available = RAG_AVAILABLE and rag_orchestrator is not None
        
        # Knowledge categories for result enhancement
        self.knowledge_categories = {
            "result_interpretation_patterns": {"description": "Patterns for interpreting tool outputs and results", "weight": 0.3},
            "contextual_insights": {"description": "Additional context for tool results", "weight": 0.25},
            "historical_correlations": {"description": "Patterns from similar investigations", "weight": 0.2},
            "next_step_recommendations": {"description": "Suggested follow-up actions", "weight": 0.15},
            "confidence_assessment": {"description": "Knowledge-based confidence scoring", "weight": 0.05},
            "threat_intelligence_correlation": {"description": "Correlate results with threat intel", "weight": 0.05}
        }
        
        logger.info(f"Result enhancement engine initialized with RAG support: {self.rag_available}")
    
    async def generate_enhanced_insights(
        self,
        result: ToolResult,
        context: Optional[ToolExecutionContext] = None,
        investigation_context: Optional[StructuredInvestigationContext] = None,
        domain: Optional[str] = None
    ) -> ResultInsights:
        """Generate enhanced insights using RAG knowledge"""
        
        if not self.rag_available:
            return await self._generate_basic_insights(result, context, domain)
        
        try:
            # Query knowledge base for result interpretation patterns
            knowledge_tasks = [
                self._query_interpretation_patterns(result, domain),
                self._query_contextual_insights(result, context, domain),
                self._analyze_result_significance(result, investigation_context)
            ]
            
            interpretation_knowledge, contextual_knowledge, significance_analysis = await asyncio.gather(
                *knowledge_tasks, return_exceptions=True
            )
            
            # Generate comprehensive insights
            insights = await self._synthesize_insights(
                result=result,
                interpretation_knowledge=interpretation_knowledge if not isinstance(interpretation_knowledge, Exception) else None,
                contextual_knowledge=contextual_knowledge if not isinstance(contextual_knowledge, Exception) else None,
                significance_analysis=significance_analysis if not isinstance(significance_analysis, Exception) else None,
                context=context,
                domain=domain
            )
            
            logger.debug(f"Generated enhanced insights for {domain} tool result")
            return insights
            
        except Exception as e:
            logger.warning(f"Enhanced insight generation failed: {str(e)}")
            return await self._generate_basic_insights(result, context, domain)
    
    async def correlate_historical_patterns(
        self,
        result: ToolResult,
        domain: Optional[str] = None,
        max_patterns: int = 5
    ) -> List[HistoricalPattern]:
        """Correlate result with historical investigation patterns"""
        
        if not self.rag_available:
            return await self._generate_basic_patterns(result, domain, max_patterns)
        
        try:
            # Query for historical correlations
            historical_knowledge = await self._query_historical_correlations(result, domain)
            
            if not historical_knowledge:
                return await self._generate_basic_patterns(result, domain, max_patterns)
            
            # Extract patterns from knowledge
            patterns = self._extract_historical_patterns(historical_knowledge, result, domain)
            
            # Sort by similarity score and limit results
            patterns.sort(key=lambda p: p.similarity_score, reverse=True)
            return patterns[:max_patterns]
            
        except Exception as e:
            logger.warning(f"Historical pattern correlation failed: {str(e)}")
            return await self._generate_basic_patterns(result, domain, max_patterns)
    
    async def generate_intelligent_recommendations(
        self,
        result: ToolResult,
        context: Optional[ToolExecutionContext] = None,
        investigation_context: Optional[StructuredInvestigationContext] = None,
        max_recommendations: int = 10
    ) -> List[NextStepRecommendation]:
        """Generate intelligent next step recommendations"""
        
        if not self.rag_available:
            return await self._generate_basic_recommendations(result, context, max_recommendations)
        
        try:
            # Query for recommendation knowledge
            recommendation_tasks = [
                self._query_next_step_recommendations(result, investigation_context),
                self._analyze_investigation_context(investigation_context),
                self._assess_result_implications(result, context)
            ]
            
            recommendation_knowledge, context_analysis, result_implications = await asyncio.gather(
                *recommendation_tasks, return_exceptions=True
            )
            
            # Generate intelligent recommendations
            recommendations = await self._synthesize_recommendations(
                result=result,
                recommendation_knowledge=recommendation_knowledge if not isinstance(recommendation_knowledge, Exception) else None,
                context_analysis=context_analysis if not isinstance(context_analysis, Exception) else None,
                result_implications=result_implications if not isinstance(result_implications, Exception) else None,
                investigation_context=investigation_context,
                context=context
            )
            
            # Sort by priority and confidence
            recommendations.sort(key=lambda r: (r.priority == "high", r.confidence), reverse=True)
            return recommendations[:max_recommendations]
            
        except Exception as e:
            logger.warning(f"Intelligent recommendation generation failed: {str(e)}")
            return await self._generate_basic_recommendations(result, context, max_recommendations)
    
    async def correlate_threat_intelligence(
        self,
        result: ToolResult,
        domain: Optional[str] = None
    ) -> ThreatCorrelation:
        """Correlate result with threat intelligence data"""
        
        if not self.rag_available:
            return await self._generate_basic_threat_correlation(result, domain)
        
        try:
            # Query threat intelligence knowledge
            threat_knowledge = await self._query_threat_intelligence_correlation(result, domain)
            
            if not threat_knowledge:
                return await self._generate_basic_threat_correlation(result, domain)
            
            # Extract threat intelligence insights
            threat_correlation = self._extract_threat_correlation(threat_knowledge, result, domain)
            
            logger.debug(f"Generated threat correlation for {domain} with confidence {threat_correlation.correlation_confidence}")
            return threat_correlation
            
        except Exception as e:
            logger.warning(f"Threat intelligence correlation failed: {str(e)}")
            return await self._generate_basic_threat_correlation(result, domain)