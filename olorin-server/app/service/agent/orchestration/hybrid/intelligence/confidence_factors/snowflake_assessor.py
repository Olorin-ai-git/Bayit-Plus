"""
Snowflake Evidence Assessor

Assesses quality and completeness of Snowflake evidence for AI confidence calculation.
Primary data source with 35% weight in overall confidence.
"""

from typing import Dict, Any
from app.service.logging import get_bridge_logger
from ...state import HybridInvestigationState

logger = get_bridge_logger(__name__)


class SnowflakeAssessor:
    """
    Specialized assessor for Snowflake evidence quality and completeness.
    
    Analyzes transaction data, user behavior, risk indicators, and temporal patterns
    to determine the reliability and strength of Snowflake-sourced evidence.
    """
    
    def __init__(self):
        self.weight = 0.35  # Primary data source weight
        
    async def assess_evidence(self, state: HybridInvestigationState) -> float:
        """
        Assess quality and completeness of Snowflake evidence.
        
        Args:
            state: Current investigation state with Snowflake data
            
        Returns:
            Confidence score between 0.0 and 1.0
        """
        snowflake_data = state.get("snowflake_data", {})
        
        if not snowflake_data:
            logger.debug("   📊 Snowflake evidence: None available (0.0)")
            return 0.0
            
        # Check for key evidence indicators
        evidence_score = self._calculate_evidence_indicators(snowflake_data)
        
        # Apply fraud pattern boost
        fraud_boosted_score = self._apply_fraud_pattern_boost(evidence_score, snowflake_data)
        
        # Apply data completeness factor
        final_confidence = self._apply_completeness_factor(fraud_boosted_score, snowflake_data)
        
        logger.debug(f"   📊 Snowflake evidence confidence: {final_confidence:.3f}")
        
        return final_confidence
    
    def _calculate_evidence_indicators(self, snowflake_data: Dict[str, Any]) -> float:
        """Calculate base confidence from evidence indicators."""
        has_transaction_data = bool(snowflake_data.get("transactions"))
        has_user_behavior = bool(snowflake_data.get("user_behavior"))
        has_risk_indicators = bool(snowflake_data.get("risk_indicators"))
        has_temporal_patterns = bool(snowflake_data.get("temporal_analysis"))
        
        evidence_indicators = sum([
            has_transaction_data, has_user_behavior, 
            has_risk_indicators, has_temporal_patterns
        ])
        
        base_confidence = evidence_indicators / 4.0
        
        logger.debug(f"      Evidence indicators: {evidence_indicators}/4")
        return base_confidence
    
    def _apply_fraud_pattern_boost(self, base_score: float, snowflake_data: Dict[str, Any]) -> float:
        """Apply confidence boost for clear fraud patterns."""
        risk_indicators = snowflake_data.get("risk_indicators", {})
        fraud_probability = risk_indicators.get("fraud_probability", 0)
        
        if risk_indicators and fraud_probability > 0.7:
            boosted_score = min(1.0, base_score + 0.3)
            logger.debug(f"      Fraud pattern boost applied: {fraud_probability:.3f}")
            return boosted_score
            
        return base_score
    
    def _apply_completeness_factor(self, score: float, snowflake_data: Dict[str, Any]) -> float:
        """Apply data completeness weighting to final score."""
        # Rough measure of data richness
        data_completeness = len(str(snowflake_data)) / 1000.0
        completeness_factor = min(1.0, data_completeness)
        
        final_confidence = score * 0.8 + completeness_factor * 0.2
        
        logger.debug(f"      Data completeness factor: {completeness_factor:.3f}")
        return final_confidence