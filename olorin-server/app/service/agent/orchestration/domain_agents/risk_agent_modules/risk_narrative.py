"""
Risk Narrative Generation Module

Extracted narrative generation logic from risk_agent.py
"""

from typing import Dict, Any, List
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class RiskNarrativeGenerator:
    """Handles risk narrative and aggregation narrative generation"""
    
    def __init__(self):
        self.logger = logger
    
    def generate_aggregation_narrative(
        self,
        facts: Dict[str, Any],
        domain_findings: Dict[str, Any]
    ) -> str:
        """Generate narrative explaining aggregation decisions."""
        narrative_parts = []
        
        # Check for hard evidence that triggers fraud floor
        hard_evidence = []
        if facts.get("manual_case_outcome") == "fraud":
            hard_evidence.append("manual fraud determination")
        
        if hard_evidence:
            narrative_parts.append(f"Fraud floor (≥0.60) applied due to: {', '.join(hard_evidence)}")
        
        # Summarize domain spread
        domain_scores = []
        for domain, findings in domain_findings.items():
            if isinstance(findings, dict) and "risk_score" in findings:
                score = findings["risk_score"]
                if score is not None:
                    domain_scores.append(f"{domain}={score:.3f}")
        
        if domain_scores:
            narrative_parts.append(f"Domain scores: {', '.join(domain_scores)}")
        
        # Evidence gating status
        numeric_domains = sum(1 for d, f in domain_findings.items() 
                             if isinstance(f, dict) and f.get("risk_score") is not None)
        total_signals = sum(len(f.get("signals", [])) for f in domain_findings.values() 
                           if isinstance(f, dict))
        
        if numeric_domains >= 2 or (numeric_domains >= 1 and total_signals >= 2):
            narrative_parts.append("Evidence gating: PASS (sufficient corroboration)")
        else:
            narrative_parts.append("Evidence gating: BLOCK (insufficient corroboration)")
        
        return "; ".join(narrative_parts)
    
    def build_risk_narrative(
        self,
        aggregation_narrative: str,
        fraud_floor: bool,
        other_domains: List[Dict[str, Any]]
    ) -> str:
        """Build the main narrative for the risk synthesis domain."""
        active_domains = [d for d in other_domains if d.get("risk_score") is not None]
        blocked_domains = [d for d in other_domains if d.get("risk_score") is None]
        
        narrative_parts = [
            f"Risk synthesis: {aggregation_narrative}",
            f"Active scoring domains: {len(active_domains)}, insufficient evidence: {len(blocked_domains)}"
        ]
        
        if fraud_floor:
            narrative_parts.append("Fraud floor (≥0.60) applied due to confirmed fraud indicators")
        
        return "; ".join(narrative_parts)
    
    def generate_risk_narrative(
        self,
        facts: Dict[str, Any],
        domain_findings: Dict[str, Any],
        risk_findings: Dict[str, Any]
    ) -> None:
        """Generate narrative about risk assessment process."""
        aggregation_story = risk_findings["analysis"]["aggregation_narrative"]
        risk_findings["evidence"].append(f"Aggregation: {aggregation_story}")
        
        # Summarize domain contributions
        active_domains = [d for d, f in domain_findings.items() 
                         if isinstance(f, dict) and f.get("risk_score") is not None]
        blocked_domains = [d for d, f in domain_findings.items() 
                          if isinstance(f, dict) and f.get("risk_score") is None]
        
        if active_domains:
            risk_findings["evidence"].append(f"Active scoring domains: {', '.join(active_domains)}")
        if blocked_domains:
            risk_findings["evidence"].append(f"Insufficient evidence domains: {', '.join(blocked_domains)}")
        
        risk_findings["risk_indicators"].append("Risk domain provides synthesis narrative only (no numeric score)")
    
    def analyze_cross_domain_patterns(
        self,
        domain_findings: Dict[str, Any],
        risk_findings: Dict[str, Any]
    ) -> None:
        """Analyze patterns across multiple domains (narrative only)."""
        if len(domain_findings) >= 3:
            high_risk_domains = []
            for d, f in domain_findings.items():
                if isinstance(f, dict):
                    risk_score = f.get("risk_score")
                    if risk_score is not None and risk_score > 0.6:
                        high_risk_domains.append(d)
            
            if len(high_risk_domains) >= 2:
                risk_findings["evidence"].append(
                    f"Cross-domain pattern: {len(high_risk_domains)} domains "
                    f"({', '.join(high_risk_domains)}) show elevated risk"
                )
                
                risk_findings["metrics"]["high_risk_domains_count"] = len(high_risk_domains)
                risk_findings["analysis"]["high_risk_domains"] = high_risk_domains
    
    def synthesize_domain_findings(
        self,
        domain_findings: Dict[str, Any],
        risk_findings: Dict[str, Any]
    ) -> None:
        """Synthesize findings from all domain agents."""
        domain_risk_scores = {}
        
        for domain, findings in domain_findings.items():
            if isinstance(findings, dict):
                domain_risk = findings.get("risk_score", 0)
                domain_risk_scores[domain] = domain_risk
                
                # Extract key evidence from each domain
                domain_evidence = findings.get("evidence", [])
                domain_indicators = findings.get("risk_indicators", [])
                
                if domain_evidence:
                    risk_findings["evidence"].append(
                        f"{domain.title()} domain evidence: {len(domain_evidence)} points collected"
                    )
                
                if domain_indicators:
                    risk_findings["evidence"].append(
                        f"{domain.title()} risk indicators: {', '.join(domain_indicators[:3])}"
                    )
                    if len(domain_indicators) > 3:
                        risk_findings["evidence"].append(
                            f"... and {len(domain_indicators) - 3} more {domain} indicators"
                        )
        
        # Store domain risk breakdown
        risk_findings["metrics"]["domain_risk_scores"] = domain_risk_scores
        risk_findings["analysis"]["domain_risk_breakdown"] = domain_risk_scores
