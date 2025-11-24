"""
Evidence Analyzer

Calculates overall quality of available evidence from all investigation sources.
Provides quality metrics for decision confidence and audit purposes.
"""

from typing import Dict, Any
from app.service.logging import get_bridge_logger
from ...state import HybridInvestigationState

logger = get_bridge_logger(__name__)


class EvidenceAnalyzer:
    """
    Comprehensive evidence quality analyzer for investigation assessment.
    
    Evaluates evidence quality across all sources (Snowflake, tools, domains)
    to provide overall quality metrics supporting confidence calculations
    and investigation audit trails.
    """
    
    def __init__(self):
        self.quality_weights = {
            "snowflake": 0.5,  # Primary evidence source
            "tools": 0.3,      # Supporting tool evidence
            "domains": 0.2     # Domain analysis quality
        }
        
    async def calculate_evidence_quality(self, state: HybridInvestigationState) -> float:
        """
        Calculate overall quality of available evidence.
        
        Args:
            state: Current investigation state with all evidence
            
        Returns:
            Evidence quality score between 0.0 and 1.0
        """
        # Calculate quality components
        snowflake_quality = self._assess_snowflake_quality(state)
        tool_quality = self._assess_tool_quality(state)
        domain_quality = self._assess_domain_quality(state)
        
        # Weighted combination
        overall_quality = (
            snowflake_quality * self.quality_weights["snowflake"] +
            tool_quality * self.quality_weights["tools"] +
            domain_quality * self.quality_weights["domains"]
        )
        
        logger.debug(f"   📈 Evidence quality: {overall_quality:.3f}")
        logger.debug(f"      Components: Snowflake({snowflake_quality:.2f}), Tools({tool_quality:.2f}), Domains({domain_quality:.2f})")
        
        return overall_quality
    
    def _assess_snowflake_quality(self, state: HybridInvestigationState) -> float:
        """Assess quality of Snowflake evidence."""
        snowflake_data = state.get("snowflake_data")
        
        if not snowflake_data:
            return 0.0
        
        # Data richness as quality indicator
        data_richness = len(str(snowflake_data)) / 2000.0
        return min(1.0, data_richness)
    
    def _assess_tool_quality(self, state: HybridInvestigationState) -> float:
        """Assess quality of tool evidence."""
        tool_results = state.get("tool_results", {})
        
        if not tool_results:
            return 0.0
        
        # Success rate as quality indicator
        successful_results = sum(1 for result in tool_results.values() if result)
        total_results = len(tool_results)
        
        return successful_results / total_results if total_results > 0 else 0.0
    
    def _assess_domain_quality(self, state: HybridInvestigationState) -> float:
        """Assess quality of domain analysis."""
        domain_findings = state.get("domain_findings", {})
        
        if not domain_findings:
            return 0.0
        
        # High-confidence findings as quality indicator
        # CRITICAL FIX: Handle None values to prevent TypeError
        high_quality_findings = sum(
            1 for findings in domain_findings.values()
            if findings.get("confidence") is not None and findings.get("confidence", 0) > 0.6
        )
        total_findings = len(domain_findings)
        
        return high_quality_findings / total_findings if total_findings > 0 else 0.0