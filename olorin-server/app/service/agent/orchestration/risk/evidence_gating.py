"""
Evidence Strength and Discordance Gating

Implements the user's specified evidence gating logic to prevent
single-source investigations from publishing misleading risk scores.
"""

from typing import Dict, Any, Optional
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def evidence_strength(sources: int, events: int, agree: float) -> float:
    """
    Calculate evidence strength based on sources, events, and agreement.
    
    Args:
        sources: Distinct evidence types used (>=1)
        events: Transaction count
        agree: Agreement score between sources (0-1)
    
    Returns:
        Evidence strength score 0.0-1.0
    """
    # sources: distinct evidence types used (>=1), events: tx count, agree∈[0,1]
    raw = 0.2 * (sources >= 2) + 0.2 * min(events / 5, 1.0) + 0.6 * agree
    return round(raw, 3)


def is_discordant(internal: float, ext_level: str, events: int) -> bool:
    """
    Detect discordant signals between internal model and external threat intelligence.
    
    Args:
        internal: Internal model score (0-1)
        ext_level: External threat intelligence level ("MINIMAL", "LOW", "HIGH", etc.)
        events: Number of events/transactions
    
    Returns:
        True if signals are discordant
    """
    return (internal >= 0.7) and (ext_level in {"MINIMAL", "LOW"}) and (events <= 1)


def fuse(internal: float, external: float) -> float:
    """
    Fuse internal and external risk scores with 70:30 weighting.
    
    Args:
        internal: Internal risk score (0-1)
        external: External risk score (0-1)
    
    Returns:
        Fused risk score
    """
    return round(0.7 * internal + 0.3 * external, 3)


def finalize(internal: float, external: float, ext_level: str, events: int, agree: float, sources: int) -> Dict[str, Any]:
    """
    Finalize risk score with evidence gating and discordance detection.
    
    Args:
        internal: Internal model score
        external: External risk score
        ext_level: External threat intelligence level
        events: Number of events
        agree: Agreement score between sources
        sources: Number of distinct evidence sources
    
    Returns:
        Dictionary with final risk score and status
    """
    fused = fuse(internal, external)
    es = evidence_strength(sources, events, agree)
    
    if es < 0.5 or is_discordant(internal, ext_level, events):
        return {
            "final": min(fused, 0.40),
            "status": "capped_for_low_evidence",
            "evidence_strength": es
        }
    
    return {
        "final": fused,
        "status": "ok",
        "evidence_strength": es
    }


def publish(final: Optional[float], status: str) -> Dict[str, str]:
    """
    Publish final risk score with proper None handling.
    Never coerce None → 0.00 on publish.
    
    Args:
        final: Final risk score or None
        status: Status description
    
    Returns:
        Dictionary with display value and status
    """
    if final is None:
        logger.info("final=None; withheld", extra={"status": status})
        return {"display": "N/A", "status": status}
    
    return {"display": f"{final:.3f}", "status": status}


def apply_evidence_gating(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Apply evidence gating to investigation state.
    
    Args:
        state: Investigation state
        
    Returns:
        Updated state with evidence gating applied
    """
    try:
        # Extract data for evidence gating
        snowflake_data = state.get("snowflake_data", {})
        domain_findings = state.get("domain_findings", {})
        
        # Calculate internal score (from domain aggregation)
        domain_scores = []
        for domain, findings in domain_findings.items():
            if isinstance(findings, dict) and "risk_score" in findings:
                score = findings["risk_score"]
                if score is not None:
                    domain_scores.append(score)
        
        internal_score = max(domain_scores) if domain_scores else 0.0
        
        # Determine external threat intelligence level
        ext_level = "MINIMAL"
        evidence_sources = set()
        
        for domain, findings in domain_findings.items():
            if isinstance(findings, dict):
                evidence = findings.get("evidence", [])
                for e in evidence:
                    e_str = str(e).upper()
                    if "THREAT LEVEL: HIGH" in e_str:
                        ext_level = "HIGH"
                    elif "THREAT LEVEL: CRITICAL" in e_str:
                        ext_level = "CRITICAL"
                    elif "ABUSEIPDB" in e_str:
                        evidence_sources.add("external_ti")
                    elif "VIRUSTOTAL" in e_str:
                        evidence_sources.add("external_ti")
        
        # Add Snowflake as evidence source
        if snowflake_data and snowflake_data.get("results"):
            evidence_sources.add("snowflake")
        
        # Count events/transactions
        events = 0
        if snowflake_data and snowflake_data.get("results"):
            events = len(snowflake_data["results"])
        
        # Calculate agreement (simplified)
        agree = 0.5  # Default moderate agreement
        
        # Apply evidence gating
        external_score = 0.1 if ext_level in {"MINIMAL", "LOW"} else 0.7
        sources = len(evidence_sources)
        
        result = finalize(internal_score, external_score, ext_level, events, agree, sources)
        
        # Update state
        state["evidence_gating"] = {
            "internal_score": internal_score,
            "external_score": external_score,
            "external_level": ext_level,
            "events": events,
            "sources": sources,
            "evidence_strength": result["evidence_strength"],
            "final_risk": result["final"],
            "status": result["status"]
        }

        # CRITICAL FIX: Also set evidence_strength at root level for policy validation
        state["evidence_strength"] = result["evidence_strength"]
        
        # Apply final risk score if evidence gating caps it
        if result["status"] == "capped_for_low_evidence":
            state["risk_score"] = result["final"]
            logger.info(f"🛡️ Evidence gating: Risk capped at {result['final']:.3f} due to {result['status']}")
        
        return state
        
    except Exception as e:
        logger.error(f"❌ Evidence gating failed: {e}")
        return state