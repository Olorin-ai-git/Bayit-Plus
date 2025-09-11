"""
Domain Evidence Assessor

Assesses quality of domain agent analysis for AI confidence calculation.
Domain evidence has 20% weight in overall confidence.
"""

from typing import Dict, List, Any
from app.service.logging import get_bridge_logger
from ...state import HybridInvestigationState

logger = get_bridge_logger(__name__)


class DomainAssessor:
    """
    Specialized assessor for domain agent analysis quality.
    
    Analyzes domain completion ratios, finding quality, and confidence levels
    across different investigation domains (network, device, location, etc.).
    """
    
    def __init__(self):
        self.weight = 0.20  # Domain evidence weight
        self.total_domains = 6  # network, device, location, logs, authentication, risk
        
    async def assess_evidence(self, state: HybridInvestigationState) -> float:
        """
        Assess quality of domain agent analysis.
        
        Args:
            state: Current investigation state with domain findings
            
        Returns:
            Confidence score between 0.0 and 1.0
        """
        domains_completed = state.get("domains_completed", [])
        domain_findings = state.get("domain_findings", {})
        
        if not domains_completed:
            logger.debug("   🎯 Domain evidence: No domains completed (0.0)")
            return 0.0
        
        # Calculate domain metrics
        completion_ratio = self._calculate_completion_ratio(domains_completed)
        quality_factor = self._calculate_quality_factor(domains_completed, domain_findings)
        risk_factor = self._calculate_average_risk_score(domains_completed, domain_findings)
        
        # Weighted combination of factors
        domain_confidence = (
            completion_ratio * 0.4 + 
            quality_factor * 0.4 + 
            risk_factor * 0.2
        )
        
        logger.debug(f"   🎯 Domain evidence confidence: {domain_confidence:.3f}")
        logger.debug(f"      Completed: {len(domains_completed)}/{self.total_domains}, Quality: {quality_factor:.3f}")
        
        return domain_confidence
    
    def _calculate_completion_ratio(self, domains_completed: List[str]) -> float:
        """Calculate the ratio of completed domains."""
        return len(domains_completed) / self.total_domains
    
    def _calculate_quality_factor(self, domains_completed: List[str], domain_findings: Dict[str, Any]) -> float:
        """Calculate quality factor based on high-confidence domain findings."""
        if not domains_completed:
            return 0.0
            
        high_confidence_domains = 0
        
        for domain in domains_completed:
            findings = domain_findings.get(domain, {})
            if findings:
                confidence = findings.get("confidence", 0.0)
                if confidence > 0.7:
                    high_confidence_domains += 1
        
        return high_confidence_domains / len(domains_completed)
    
    def _calculate_average_risk_score(self, domains_completed: List[str], domain_findings: Dict[str, Any]) -> float:
        """Calculate average risk score across completed domains."""
        if not domains_completed:
            return 0.0
            
        total_risk_score = 0.0
        
        for domain in domains_completed:
            findings = domain_findings.get(domain, {})
            if findings:
                risk_score = findings.get("risk_score", 0.0)
                total_risk_score += risk_score
        
        return total_risk_score / len(domains_completed)