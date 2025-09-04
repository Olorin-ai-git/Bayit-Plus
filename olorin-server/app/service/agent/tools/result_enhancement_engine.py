"""
Result Enhancement Engine

Advanced engine for generating sophisticated insights from tool results using RAG knowledge.
Provides deep analysis, pattern recognition, and intelligent recommendations based on 
knowledge base integration and domain expertise.
"""

import asyncio
import re
from typing import Any, Dict, List, Optional, Tuple

from .result_augmentation_service import (
    ResultInsights,
    HistoricalPattern,
    NextStepRecommendation,
    ThreatCorrelation
)
from .enhanced_tool_base import ToolResult
from .rag_tool_context import ToolExecutionContext
from ..autonomous_context import AutonomousInvestigationContext
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
            "result_interpretation_patterns": {
                "description": "Patterns for interpreting tool outputs and results",
                "weight": 0.3
            },
            "contextual_insights": {
                "description": "Additional context for tool results",
                "weight": 0.25
            },
            "historical_correlations": {
                "description": "Patterns from similar investigations", 
                "weight": 0.2
            },
            "next_step_recommendations": {
                "description": "Suggested follow-up actions",
                "weight": 0.15
            },
            "confidence_assessment": {
                "description": "Knowledge-based confidence scoring",
                "weight": 0.05
            },
            "threat_intelligence_correlation": {
                "description": "Correlate results with threat intel",
                "weight": 0.05
            }
        }
        
        logger.info(f"Result enhancement engine initialized with RAG support: {self.rag_available}")
    
    async def generate_enhanced_insights(
        self,
        result: ToolResult,
        context: Optional[ToolExecutionContext] = None,
        investigation_context: Optional[AutonomousInvestigationContext] = None,
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
        investigation_context: Optional[AutonomousInvestigationContext] = None,
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
    
    # RAG Knowledge Query Methods
    
    async def _query_interpretation_patterns(
        self,
        result: ToolResult,
        domain: Optional[str]
    ) -> Optional[str]:
        """Query knowledge base for result interpretation patterns"""
        
        if not self.rag_orchestrator:
            return None
        
        query = f"How to interpret {domain} tool results: {str(result.data)[:200]}..."
        
        try:
            request = RAGRequest(
                query=query,
                categories=["result_interpretation_patterns"],
                max_chunks=5
            )
            
            response = await self.rag_orchestrator.retrieve_knowledge(request)
            
            if response.success and response.chunks:
                return " ".join([chunk.content for chunk in response.chunks[:3]])
            
        except Exception as e:
            logger.debug(f"Failed to query interpretation patterns: {str(e)}")
        
        return None
    
    async def _query_contextual_insights(
        self,
        result: ToolResult,
        context: Optional[ToolExecutionContext],
        domain: Optional[str]
    ) -> Optional[str]:
        """Query knowledge base for contextual insights"""
        
        if not self.rag_orchestrator:
            return None
        
        context_info = ""
        if context and context.knowledge_context:
            context_info = f" with {context.knowledge_context.total_chunks} knowledge chunks"
        
        query = f"Contextual analysis for {domain} investigation results{context_info}"
        
        try:
            request = RAGRequest(
                query=query,
                categories=["contextual_insights"],
                max_chunks=3
            )
            
            response = await self.rag_orchestrator.retrieve_knowledge(request)
            
            if response.success and response.chunks:
                return " ".join([chunk.content for chunk in response.chunks])
            
        except Exception as e:
            logger.debug(f"Failed to query contextual insights: {str(e)}")
        
        return None
    
    async def _query_historical_correlations(
        self,
        result: ToolResult,
        domain: Optional[str]
    ) -> Optional[str]:
        """Query knowledge base for historical correlations"""
        
        if not self.rag_orchestrator:
            return None
        
        # Extract key characteristics from result for correlation
        result_characteristics = self._extract_result_characteristics(result)
        query = f"Historical patterns for {domain} investigation with characteristics: {result_characteristics}"
        
        try:
            request = RAGRequest(
                query=query,
                categories=["historical_correlations"],
                max_chunks=5
            )
            
            response = await self.rag_orchestrator.retrieve_knowledge(request)
            
            if response.success and response.chunks:
                return " ".join([chunk.content for chunk in response.chunks])
            
        except Exception as e:
            logger.debug(f"Failed to query historical correlations: {str(e)}")
        
        return None
    
    async def _query_next_step_recommendations(
        self,
        result: ToolResult,
        investigation_context: Optional[AutonomousInvestigationContext]
    ) -> Optional[str]:
        """Query knowledge base for next step recommendations"""
        
        if not self.rag_orchestrator:
            return None
        
        context_summary = "general investigation"
        if investigation_context:
            context_summary = f"investigation {investigation_context.investigation_id}"
        
        query = f"Next steps after successful tool execution in {context_summary}"
        
        try:
            request = RAGRequest(
                query=query,
                categories=["next_step_recommendations"],
                max_chunks=5
            )
            
            response = await self.rag_orchestrator.retrieve_knowledge(request)
            
            if response.success and response.chunks:
                return " ".join([chunk.content for chunk in response.chunks])
            
        except Exception as e:
            logger.debug(f"Failed to query next step recommendations: {str(e)}")
        
        return None
    
    async def _query_threat_intelligence_correlation(
        self,
        result: ToolResult,
        domain: Optional[str]
    ) -> Optional[str]:
        """Query knowledge base for threat intelligence correlation"""
        
        if not self.rag_orchestrator:
            return None
        
        # Extract potential indicators from result
        indicators = self._extract_potential_indicators(result)
        query = f"Threat intelligence for {domain} domain with indicators: {indicators}"
        
        try:
            request = RAGRequest(
                query=query,
                categories=["threat_intelligence_correlation"],
                max_chunks=3
            )
            
            response = await self.rag_orchestrator.retrieve_knowledge(request)
            
            if response.success and response.chunks:
                return " ".join([chunk.content for chunk in response.chunks])
            
        except Exception as e:
            logger.debug(f"Failed to query threat intelligence: {str(e)}")
        
        return None
    
    # Analysis Methods
    
    async def _analyze_result_significance(
        self,
        result: ToolResult,
        investigation_context: Optional[AutonomousInvestigationContext]
    ) -> str:
        """Analyze the significance of the tool result"""
        
        if not result.success:
            return "Tool execution failed - requires troubleshooting and retry"
        
        data_characteristics = self._analyze_data_characteristics(result.data)
        
        context_relevance = "standalone analysis"
        if investigation_context:
            context_relevance = f"part of ongoing investigation {investigation_context.investigation_id}"
        
        return f"Result shows {data_characteristics} as {context_relevance}"
    
    async def _analyze_investigation_context(
        self,
        investigation_context: Optional[AutonomousInvestigationContext]
    ) -> str:
        """Analyze the current investigation context"""
        
        if not investigation_context:
            return "No specific investigation context available"
        
        context_analysis = f"Investigation {investigation_context.investigation_id}"
        
        if hasattr(investigation_context, 'findings') and investigation_context.findings:
            findings_count = len([f for f in investigation_context.findings if f])
            context_analysis += f" with {findings_count} domain findings"
        
        return context_analysis
    
    async def _assess_result_implications(
        self,
        result: ToolResult,
        context: Optional[ToolExecutionContext]
    ) -> str:
        """Assess the implications of the tool result"""
        
        if not result.success:
            return "Failed execution implies tool configuration or connectivity issues"
        
        implications = "Successful execution provides investigation data"
        
        if context and context.knowledge_context and context.knowledge_context.total_chunks > 0:
            implications += f" enhanced with {context.knowledge_context.total_chunks} knowledge references"
        
        return implications
    
    # Synthesis Methods
    
    async def _synthesize_insights(
        self,
        result: ToolResult,
        interpretation_knowledge: Optional[str],
        contextual_knowledge: Optional[str],
        significance_analysis: str,
        context: Optional[ToolExecutionContext],
        domain: Optional[str]
    ) -> ResultInsights:
        """Synthesize comprehensive insights from all knowledge sources"""
        
        # Generate interpretation
        interpretation = self._create_interpretation(result, interpretation_knowledge, domain)
        
        # Generate contextual analysis
        contextual_analysis = self._create_contextual_analysis(contextual_knowledge, context)
        
        # Use significance analysis
        significance_assessment = significance_analysis
        
        # Extract anomaly indicators
        anomaly_indicators = self._extract_anomaly_indicators(result, interpretation_knowledge)
        
        # Generate domain-specific notes
        domain_notes = self._generate_domain_notes(result, domain, contextual_knowledge)
        
        return ResultInsights(
            interpretation=interpretation,
            contextual_analysis=contextual_analysis,
            significance_assessment=significance_assessment,
            anomaly_indicators=anomaly_indicators,
            domain_specific_notes=domain_notes
        )
    
    async def _synthesize_recommendations(
        self,
        result: ToolResult,
        recommendation_knowledge: Optional[str],
        context_analysis: Optional[str],
        result_implications: Optional[str],
        investigation_context: Optional[AutonomousInvestigationContext],
        context: Optional[ToolExecutionContext]
    ) -> List[NextStepRecommendation]:
        """Synthesize intelligent recommendations from all sources"""
        
        recommendations = []
        
        # Generate primary recommendation based on result success
        if result.success:
            primary_rec = NextStepRecommendation(
                action_type="result_analysis",
                description="Analyze tool results for investigation insights and cross-domain correlations",
                priority="high",
                rationale="Successful tool execution provides valuable data for investigation progression",
                expected_outcome="Enhanced understanding of investigation scope and next analytical steps",
                confidence=0.8
            )
            recommendations.append(primary_rec)
            
            # Add context-based recommendations
            if context and context.knowledge_context:
                knowledge_rec = NextStepRecommendation(
                    action_type="knowledge_validation",
                    description="Validate results against knowledge base patterns and historical cases",
                    priority="medium", 
                    rationale="Knowledge-enhanced analysis improves accuracy and provides additional insights",
                    expected_outcome="Increased confidence in findings and identification of relevant patterns",
                    confidence=0.7
                )
                recommendations.append(knowledge_rec)
        
        else:
            # Recommendations for failed tool execution
            failure_rec = NextStepRecommendation(
                action_type="error_resolution",
                description="Investigate tool execution failure and retry with adjusted parameters",
                priority="high",
                rationale="Tool failure may indicate configuration issues or connectivity problems",
                expected_outcome="Resolved tool execution enabling continued investigation",
                confidence=0.9
            )
            recommendations.append(failure_rec)
        
        # Add investigation context recommendations
        if investigation_context:
            context_rec = NextStepRecommendation(
                action_type="cross_domain_analysis",
                description="Correlate findings across all investigation domains for comprehensive analysis",
                priority="medium",
                rationale="Multi-domain correlation often reveals hidden patterns and connections",
                expected_outcome="Comprehensive view of investigation scope and interconnected findings",
                confidence=0.6
            )
            recommendations.append(context_rec)
        
        return recommendations
    
    # Helper Methods
    
    def _extract_result_characteristics(self, result: ToolResult) -> str:
        """Extract key characteristics from tool result"""
        
        if not result.success:
            return "failed execution"
        
        if not result.data:
            return "empty result"
        
        data_str = str(result.data)
        data_length = len(data_str)
        
        if data_length > 1000:
            return "substantial data output"
        elif data_length > 100:
            return "moderate data output"
        else:
            return "minimal data output"
    
    def _extract_potential_indicators(self, result: ToolResult) -> str:
        """Extract potential threat indicators from result"""
        
        if not result.success or not result.data:
            return "no indicators available"
        
        data_str = str(result.data).lower()
        
        # Look for common indicator patterns
        if any(term in data_str for term in ["error", "failed", "timeout", "denied"]):
            return "execution issues detected"
        elif any(term in data_str for term in ["suspicious", "anomal", "unusual", "threat"]):
            return "potential security indicators"
        else:
            return "standard execution indicators"
    
    def _analyze_data_characteristics(self, data: Any) -> str:
        """Analyze characteristics of result data"""
        
        if not data:
            return "no data returned"
        
        data_str = str(data)
        
        # Analyze data structure and content
        if isinstance(data, (dict, list)):
            return f"structured data with {len(data)} elements"
        elif len(data_str) > 500:
            return "comprehensive data output"
        else:
            return "basic data output"
    
    def _create_interpretation(
        self,
        result: ToolResult,
        interpretation_knowledge: Optional[str],
        domain: Optional[str]
    ) -> str:
        """Create interpretation text for the result"""
        
        base_interpretation = f"Tool execution {'succeeded' if result.success else 'failed'}"
        
        if domain:
            base_interpretation += f" in {domain} domain analysis"
        
        if interpretation_knowledge:
            base_interpretation += f". Knowledge base suggests: {interpretation_knowledge[:200]}..."
        
        return base_interpretation
    
    def _create_contextual_analysis(
        self,
        contextual_knowledge: Optional[str],
        context: Optional[ToolExecutionContext]
    ) -> Optional[str]:
        """Create contextual analysis text"""
        
        if not contextual_knowledge and not context:
            return None
        
        analysis_parts = []
        
        if contextual_knowledge:
            analysis_parts.append(f"Domain expertise: {contextual_knowledge[:150]}...")
        
        if context and context.knowledge_context:
            analysis_parts.append(f"Enhanced with {context.knowledge_context.total_chunks} knowledge chunks")
        
        return ". ".join(analysis_parts) if analysis_parts else None
    
    def _extract_anomaly_indicators(
        self,
        result: ToolResult,
        interpretation_knowledge: Optional[str]
    ) -> List[str]:
        """Extract anomaly indicators from result and knowledge"""
        
        indicators = []
        
        if not result.success:
            indicators.append("tool_execution_failure")
        
        if result.data and "error" in str(result.data).lower():
            indicators.append("error_in_result_data")
        
        if interpretation_knowledge and "anomal" in interpretation_knowledge.lower():
            indicators.append("knowledge_based_anomaly_detected")
        
        return indicators
    
    def _generate_domain_notes(
        self,
        result: ToolResult,
        domain: Optional[str],
        contextual_knowledge: Optional[str]
    ) -> List[str]:
        """Generate domain-specific notes"""
        
        notes = []
        
        if domain and result.success:
            notes.append(f"Successful {domain} domain analysis completed")
        
        if contextual_knowledge and len(contextual_knowledge) > 100:
            notes.append("Rich contextual knowledge available for enhanced analysis")
        
        return notes
    
    def _extract_historical_patterns(
        self,
        historical_knowledge: str,
        result: ToolResult,
        domain: Optional[str]
    ) -> List[HistoricalPattern]:
        """Extract historical patterns from knowledge"""
        
        patterns = []
        
        # Simple pattern extraction - would be enhanced with actual historical data analysis
        if "similar" in historical_knowledge.lower():
            patterns.append(HistoricalPattern(
                pattern_type=f"{domain}_similar_results" if domain else "similar_results",
                similarity_score=0.7,
                historical_context="Knowledge base indicates similar patterns in previous investigations",
                outcome_prediction="Likely positive investigation outcome based on historical data",
                confidence=0.6
            ))
        
        if result.success and "success" in historical_knowledge.lower():
            patterns.append(HistoricalPattern(
                pattern_type="successful_execution_pattern",
                similarity_score=0.8,
                historical_context="Pattern matches successful historical tool executions",
                outcome_prediction="Expected continuation of successful investigation workflow",
                confidence=0.7
            ))
        
        return patterns
    
    def _extract_threat_correlation(
        self,
        threat_knowledge: str,
        result: ToolResult,
        domain: Optional[str]
    ) -> ThreatCorrelation:
        """Extract threat correlation from knowledge"""
        
        threat_indicators = []
        risk_assessment = "low"
        correlation_confidence = 0.4
        
        # Extract threat indicators from knowledge
        if "high" in threat_knowledge.lower():
            risk_assessment = "high"
            correlation_confidence = 0.8
            threat_indicators.append("high_risk_indicators_detected")
        elif "medium" in threat_knowledge.lower() or domain in ["network", "risk"]:
            risk_assessment = "medium"
            correlation_confidence = 0.6
            threat_indicators.append("moderate_risk_indicators")
        
        return ThreatCorrelation(
            threat_indicators=threat_indicators,
            risk_assessment=risk_assessment,
            correlation_confidence=correlation_confidence,
            intelligence_sources=["knowledge_base", "domain_analysis"],
            recommended_actions=["continue_monitoring", "escalate_analysis"] if risk_assessment != "low" else ["routine_monitoring"]
        )
    
    # Fallback methods for when RAG is unavailable
    
    async def _generate_basic_insights(
        self,
        result: ToolResult,
        context: Optional[ToolExecutionContext],
        domain: Optional[str]
    ) -> ResultInsights:
        """Generate basic insights without RAG"""
        
        interpretation = f"Tool execution {'completed successfully' if result.success else 'failed'}"
        if domain:
            interpretation += f" for {domain} analysis"
        
        return ResultInsights(
            interpretation=interpretation,
            contextual_analysis="Limited analysis without RAG knowledge integration",
            significance_assessment="Standard tool execution result",
            anomaly_indicators=[],
            domain_specific_notes=[]
        )
    
    async def _generate_basic_patterns(
        self,
        result: ToolResult,
        domain: Optional[str],
        max_patterns: int
    ) -> List[HistoricalPattern]:
        """Generate basic patterns without RAG"""
        
        if result.success:
            return [HistoricalPattern(
                pattern_type="basic_success_pattern",
                similarity_score=0.5,
                historical_context="Basic successful tool execution pattern",
                outcome_prediction="Standard investigation continuation",
                confidence=0.4
            )]
        
        return []
    
    async def _generate_basic_recommendations(
        self,
        result: ToolResult,
        context: Optional[ToolExecutionContext],
        max_recommendations: int
    ) -> List[NextStepRecommendation]:
        """Generate basic recommendations without RAG"""
        
        if result.success:
            return [NextStepRecommendation(
                action_type="continue_analysis",
                description="Continue investigation with additional analysis tools",
                priority="medium",
                rationale="Tool executed successfully, providing data for further analysis",
                expected_outcome="Enhanced investigation insights",
                confidence=0.5
            )]
        else:
            return [NextStepRecommendation(
                action_type="retry_execution",
                description="Retry tool execution with adjusted parameters",
                priority="high",
                rationale="Tool execution failed, requiring retry or troubleshooting",
                expected_outcome="Successful tool execution",
                confidence=0.7
            )]
    
    async def _generate_basic_threat_correlation(
        self,
        result: ToolResult,
        domain: Optional[str]
    ) -> ThreatCorrelation:
        """Generate basic threat correlation without RAG"""
        
        return ThreatCorrelation(
            threat_indicators=[],
            risk_assessment="unknown",
            correlation_confidence=0.0,
            intelligence_sources=["basic_analysis"],
            recommended_actions=["manual_review_required"]
        )