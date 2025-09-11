"""
Pattern Recognition Assessor

Assesses clarity of risk patterns in the evidence for AI confidence calculation.
Pattern recognition has 15% weight in overall confidence.
"""

from typing import List, Dict, Any
from app.service.logging import get_bridge_logger
from ...state import HybridInvestigationState

logger = get_bridge_logger(__name__)


class PatternAssessor:
    """
    Specialized assessor for risk pattern clarity and consistency.
    
    Analyzes pattern strength, risk indicator consistency, and cross-source
    validation to determine confidence in detected fraud patterns.
    """
    
    def __init__(self):
        self.weight = 0.15  # Pattern recognition weight
        self.max_indicators = 5  # Maximum expected risk indicators
        
    async def assess_evidence(self, state: HybridInvestigationState) -> float:
        """
        Assess clarity of risk patterns in the evidence.
        
        Args:
            state: Current investigation state with risk indicators
            
        Returns:
            Confidence score between 0.0 and 1.0
        """
        risk_indicators = state.get("risk_indicators", [])
        risk_score = state.get("risk_score", 0.0)
        
        if not risk_indicators:
            logger.debug("   🎨 Pattern recognition: No risk indicators (0.0)")
            return 0.0
        
        # Calculate pattern strength components
        indicator_factor = self._calculate_indicator_factor(risk_indicators)
        risk_factor = self._calculate_risk_factor(risk_score)
        consistency_factor = self._calculate_consistency_factor(state)
        
        # Weighted combination of pattern factors
        pattern_strength = (
            indicator_factor * 0.4 + 
            risk_factor * 0.4 + 
            consistency_factor * 0.2
        )
        
        logger.debug(f"   🎨 Pattern recognition confidence: {pattern_strength:.3f}")
        logger.debug(f"      Risk indicators: {len(risk_indicators)}, Risk score: {risk_score:.3f}")
        
        return pattern_strength
    
    def _calculate_indicator_factor(self, risk_indicators: List[str]) -> float:
        """Calculate factor based on number of risk indicators."""
        # More indicators generally mean clearer patterns
        return min(1.0, len(risk_indicators) / self.max_indicators)
    
    def _calculate_risk_factor(self, risk_score: float) -> float:
        """Calculate factor based on overall risk score."""
        # High risk score suggests clear fraud patterns
        return min(1.0, risk_score)
    
    def _calculate_consistency_factor(self, state: HybridInvestigationState) -> float:
        """Calculate consistency factor across different evidence sources."""
        # Get risk assessments from different sources
        snowflake_risk = self._get_snowflake_risk(state)
        domain_risk = state.get("risk_score", 0.5)  # Domain analysis risk
        
        # Default moderate consistency
        consistency_factor = 0.5
        
        # Consistency bonus if sources agree (within 20% threshold)
        if abs(snowflake_risk - domain_risk) < 0.2:
            consistency_factor = 0.8
            logger.debug(f"      Pattern consistency detected between sources")
        
        return consistency_factor
    
    def _get_snowflake_risk(self, state: HybridInvestigationState) -> float:
        """Extract risk assessment from Snowflake data."""
        snowflake_data = state.get("snowflake_data", {})
        if snowflake_data and snowflake_data.get("risk_indicators"):
            return snowflake_data["risk_indicators"].get("fraud_probability", 0.5)
        return 0.5  # Default moderate risk