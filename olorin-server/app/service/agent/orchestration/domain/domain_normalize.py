"""
Domain Normalization - Unified domain result formatting.

This module provides domain normalization to prevent KeyError crashes
and ensure all domains have consistent field structure.
"""

from typing import List, Dict, Any


def normalize_domains(domains: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Normalize all domain dictionaries to have consistent field structure.
    
    This prevents KeyError crashes when different parts of the system
    expect different field names or missing keys.
    
    Args:
        domains: List of domain result dictionaries
        
    Returns:
        List of normalized domain dictionaries
    """
    normalized = []
    
    for domain in domains:
        # Create shallow copy to avoid modifying original
        d = dict(domain)
        
        # Unify numeric field name - prefer 'score' but keep both for compatibility
        if "score" not in d and "risk_score" in d:
            d["score"] = d.get("risk_score")
        
        # Keep legacy key to avoid KeyError anywhere in the system
        d.setdefault("risk_score", d.get("score", None))
        
        # Ensure all required fields have defaults
        d.setdefault("name", "unknown")
        d.setdefault("signals", [])
        d.setdefault("status", "OK" if d.get("score") is not None else "INSUFFICIENT_EVIDENCE")
        d.setdefault("confidence", 0.0)
        d.setdefault("narrative", "")
        d.setdefault("provenance", [])
        
        normalized.append(d)
    
    return normalized


def is_narrative_only_domain(domain_name: str) -> bool:
    """
    Check if a domain should be excluded from numeric aggregation.
    
    Args:
        domain_name: Name of the domain
        
    Returns:
        True if domain is narrative-only (like risk synthesis)
    """
    return domain_name in {"risk"}


def get_numeric_domains(domains: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Filter domains to only include those with numeric scores for aggregation.
    
    Args:
        domains: List of normalized domain dictionaries
        
    Returns:
        List of domains that should be included in numeric aggregation
    """
    return [
        d for d in domains
        if not is_narrative_only_domain(d.get("name", ""))
        and isinstance(d.get("score"), (int, float))
    ]