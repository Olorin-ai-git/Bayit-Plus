"""
Result Enhancement RAG Integration

RAG query methods and knowledge processing for the result enhancement engine.
"""

from typing import List, Optional

from app.service.logging import get_bridge_logger

from ..autonomous_context import StructuredInvestigationContext
from .enhanced_tool_base import ToolResult
from .rag_tool_context import ToolExecutionContext
from .result_augmentation_core import HistoricalPattern, ThreatCorrelation

logger = get_bridge_logger(__name__)

# RAG component imports
try:
    from ..rag import RAGRequest

    RAG_REQUEST_AVAILABLE = True
except ImportError:
    RAG_REQUEST_AVAILABLE = False
    RAGRequest = None


class ResultEnhancementRAGMixin:
    """Mixin class providing RAG query methods for result enhancement"""

    async def _query_interpretation_patterns(
        self, result: ToolResult, domain: Optional[str]
    ) -> Optional[str]:
        """Query knowledge base for result interpretation patterns"""

        if not self.rag_orchestrator or not RAG_REQUEST_AVAILABLE:
            return None

        query = f"How to interpret {domain} tool results: {str(result.data)[:200]}..."

        try:
            request = RAGRequest(
                query=query, categories=["result_interpretation_patterns"], max_chunks=5
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
        domain: Optional[str],
    ) -> Optional[str]:
        """Query knowledge base for contextual insights"""

        if not self.rag_orchestrator or not RAG_REQUEST_AVAILABLE:
            return None

        context_info = ""
        if context and context.knowledge_context:
            context_info = (
                f" with {context.knowledge_context.total_chunks} knowledge chunks"
            )

        query = f"Contextual analysis for {domain} investigation results{context_info}"

        try:
            request = RAGRequest(
                query=query, categories=["contextual_insights"], max_chunks=3
            )

            response = await self.rag_orchestrator.retrieve_knowledge(request)

            if response.success and response.chunks:
                return " ".join([chunk.content for chunk in response.chunks])

        except Exception as e:
            logger.debug(f"Failed to query contextual insights: {str(e)}")

        return None

    async def _query_historical_correlations(
        self, result: ToolResult, domain: Optional[str]
    ) -> Optional[str]:
        """Query knowledge base for historical correlations"""

        if not self.rag_orchestrator or not RAG_REQUEST_AVAILABLE:
            return None

        # Extract key characteristics from result for correlation
        result_characteristics = self._extract_result_characteristics(result)
        query = f"Historical patterns for {domain} investigation with characteristics: {result_characteristics}"

        try:
            request = RAGRequest(
                query=query, categories=["historical_correlations"], max_chunks=5
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
        investigation_context: Optional[StructuredInvestigationContext],
    ) -> Optional[str]:
        """Query knowledge base for next step recommendations"""

        if not self.rag_orchestrator or not RAG_REQUEST_AVAILABLE:
            return None

        context_summary = "general investigation"
        if investigation_context:
            context_summary = f"investigation {investigation_context.investigation_id}"

        query = f"Next steps after successful tool execution in {context_summary}"

        try:
            request = RAGRequest(
                query=query, categories=["next_step_recommendations"], max_chunks=5
            )

            response = await self.rag_orchestrator.retrieve_knowledge(request)

            if response.success and response.chunks:
                return " ".join([chunk.content for chunk in response.chunks])

        except Exception as e:
            logger.debug(f"Failed to query next step recommendations: {str(e)}")

        return None

    async def _query_threat_intelligence_correlation(
        self, result: ToolResult, domain: Optional[str]
    ) -> Optional[str]:
        """Query knowledge base for threat intelligence correlation"""

        if not self.rag_orchestrator or not RAG_REQUEST_AVAILABLE:
            return None

        # Extract potential indicators from result
        indicators = self._extract_potential_indicators(result)
        query = f"Threat intelligence for {domain} domain with indicators: {indicators}"

        try:
            request = RAGRequest(
                query=query,
                categories=["threat_intelligence_correlation"],
                max_chunks=3,
            )

            response = await self.rag_orchestrator.retrieve_knowledge(request)

            if response.success and response.chunks:
                return " ".join([chunk.content for chunk in response.chunks])

        except Exception as e:
            logger.debug(f"Failed to query threat intelligence: {str(e)}")

        return None

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
        elif any(
            term in data_str for term in ["suspicious", "anomal", "unusual", "threat"]
        ):
            return "potential security indicators"
        else:
            return "standard execution indicators"

    def _extract_historical_patterns(
        self, historical_knowledge: str, result: ToolResult, domain: Optional[str]
    ) -> List[HistoricalPattern]:
        """Extract historical patterns from knowledge"""

        patterns = []

        # Simple pattern extraction - would be enhanced with actual historical data analysis
        if "similar" in historical_knowledge.lower():
            patterns.append(
                HistoricalPattern(
                    pattern_type=(
                        f"{domain}_similar_results" if domain else "similar_results"
                    ),
                    similarity_score=0.7,
                    historical_context="Knowledge base indicates similar patterns in previous investigations",
                    outcome_prediction="Likely positive investigation outcome based on historical data",
                    confidence=0.6,
                )
            )

        if result.success and "success" in historical_knowledge.lower():
            patterns.append(
                HistoricalPattern(
                    pattern_type="successful_execution_pattern",
                    similarity_score=0.8,
                    historical_context="Pattern matches successful historical tool executions",
                    outcome_prediction="Expected continuation of successful investigation workflow",
                    confidence=0.7,
                )
            )

        return patterns

    def _extract_threat_correlation(
        self, threat_knowledge: str, result: ToolResult, domain: Optional[str]
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
            recommended_actions=(
                ["continue_monitoring", "escalate_analysis"]
                if risk_assessment != "low"
                else ["routine_monitoring"]
            ),
        )
