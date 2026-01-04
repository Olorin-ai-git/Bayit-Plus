"""
Location Agent Configuration and Utilities

Configuration helpers and utilities for RAG-enhanced location analysis.
"""

from typing import Any, Dict, List, Optional

from app.service.logging import get_bridge_logger

# RAG imports with graceful fallback
try:
    from app.service.agent.rag import ContextAugmentationConfig

    RAG_AVAILABLE = True
except ImportError as e:
    logger = get_bridge_logger(__name__)
    logger.warning(f"RAG modules not available: {e}")
    RAG_AVAILABLE = False

logger = get_bridge_logger(__name__)


def create_location_rag_config() -> Optional["ContextAugmentationConfig"]:
    """Create location-specific RAG configuration."""
    if not RAG_AVAILABLE:
        return None

    try:
        config = ContextAugmentationConfig(
            # Location-specific retrieval limits
            max_critical_chunks=6,  # Geolocation analysis, travel patterns
            max_supporting_chunks=11,  # VPN detection, timezone analysis
            max_background_chunks=16,  # General location knowledge
            # Adjusted thresholds for location domain
            critical_threshold=0.90,  # Very high precision for location fraud
            supporting_threshold=0.70,  # Broader for geographic patterns
            background_threshold=0.48,  # Include general geographic knowledge
            # Location domain settings
            enable_domain_filtering=True,
            enable_entity_type_filtering=True,
            enable_temporal_filtering=True,
            # Enhanced context for location analysis
            include_source_attribution=True,
            include_confidence_scores=True,
            max_context_length=4200,  # Optimized for location analysis details
        )

        logger.info("Created location-specific RAG configuration")
        return config

    except Exception as e:
        logger.warning(f"RAG configuration creation failed: {e}")
        return None


def get_location_objectives(rag_enabled: bool = False) -> List[str]:
    """Get location analysis objectives with optional RAG enhancement."""

    objectives = [
        "Analyze geographic patterns and travel behavior for anomalies using domain knowledge",
        "PRIORITY: Check location IP addresses against AbuseIPDB for geographic consistency and reputation",
        "PRIORITY: Use Shodan to verify if IPs match claimed geographic locations and ISP data",
        "Query VirusTotal for IP geolocation verification and malicious activity indicators",
        "Leverage historical travel patterns and impossible travel detection from knowledge base",
        "Apply geolocation analysis techniques from domain expertise repository",
        "Detect VPN, proxy, or TOR usage masking true location using threat intelligence",
        "Identify impossible travel scenarios and velocity violations with historical context",
        "Check if locations are associated with high-risk countries or sanctioned regions",
        "Verify ISP and organization data matches expected location using Shodan intelligence",
        "Detect location spoofing using threat intelligence correlation and domain knowledge",
        "Identify data center IPs pretending to be residential using AbuseIPDB patterns",
        "Check for location-based fraud hotspots and known criminal infrastructure",
        "Analyze timezone inconsistencies with claimed location using domain expertise",
        "Apply geographic risk assessment patterns from knowledge base",
    ]

    # Add RAG-specific objectives if enabled
    if rag_enabled and RAG_AVAILABLE:
        objectives.extend(
            [
                "Utilize retrieved geolocation domain knowledge for enhanced location fraud detection",
                "Apply historical impossible travel patterns and geographic fraud techniques from knowledge base",
            ]
        )

    return objectives


def initialize_rag_stats() -> Dict[str, Any]:
    """Initialize RAG performance statistics."""
    return {
        "rag_enabled": RAG_AVAILABLE,
        "knowledge_retrieval_count": 0,
        "context_augmentation_success": False,
        "domain_knowledge_categories": 0,
    }


def update_rag_stats_on_success(rag_stats: Dict[str, Any]) -> Dict[str, Any]:
    """Update RAG statistics on successful configuration."""
    rag_stats["context_augmentation_success"] = True
    rag_stats["domain_knowledge_categories"] = (
        6  # geolocation_analysis, travel_patterns, vpn_proxy_detection, timezone_analysis, location_spoofing, geographic_risk_assessment
    )
    return rag_stats


def create_location_agent_metadata(
    rag_enabled: bool, rag_stats: Dict[str, Any]
) -> Dict[str, Any]:
    """Create metadata for location agent tracking."""
    return {
        "domain": "location",
        "analysis_type": (
            "rag_enhanced_llm_driven" if rag_enabled else "structured_llm_driven"
        ),
        "objectives_count": 17 if rag_enabled else 15,
        "rag_available": RAG_AVAILABLE,
        "rag_enabled": rag_enabled,
        "rag_performance": rag_stats,
        "enhancement_type": "rag_enhanced" if rag_enabled else "standard",
        "domain_knowledge_utilized": rag_stats.get(
            "context_augmentation_success", False
        ),
    }


def format_completion_message(
    rag_enabled: bool, findings_count: int, risk_score: float, rag_stats: Dict[str, Any]
) -> str:
    """Format agent completion message with RAG information."""
    base_message = f"{'RAG-enhanced' if rag_enabled else 'Standard'} location analysis completed: {findings_count} findings, risk={risk_score:.2f}"

    if rag_enabled and rag_stats.get("knowledge_retrieval_count", 0) > 0:
        base_message += (
            f", knowledge retrieval: {rag_stats['knowledge_retrieval_count']} queries"
        )

    return base_message


def create_result_structure(
    findings, rag_enabled: bool, rag_stats: Dict[str, Any]
) -> Dict[str, Any]:
    """Create structured result with RAG enhancement metadata."""
    analysis_type = "RAG-enhanced LLM-driven" if rag_enabled else "LLM-driven"
    summary_suffix = (
        f" (RAG: {rag_stats['knowledge_retrieval_count']} queries)"
        if rag_enabled and rag_stats["knowledge_retrieval_count"] > 0
        else ""
    )

    return {
        "risk_assessment": {
            "risk_level": findings.risk_score,
            "confidence": findings.confidence,
            "risk_factors": findings.key_findings,
            "suspicious_indicators": findings.suspicious_indicators,
            "summary": f"{'RAG-enhanced' if rag_enabled else 'Structured'} location analysis: {len(findings.key_findings)} findings{summary_suffix}",
            "thoughts": f"Used {analysis_type} tool selection for location analysis with domain knowledge integration",
            "timestamp": findings.timestamp.isoformat(),
            "structured_execution": True,
            "domain": "location",
            "enhancement_type": "rag_enhanced" if rag_enabled else "standard",
            "rag_performance": rag_stats,
            "knowledge_augmentation": {
                "enabled": rag_enabled,
                "retrieval_count": rag_stats["knowledge_retrieval_count"],
                "context_success": rag_stats["context_augmentation_success"],
                "domain_categories": rag_stats["domain_knowledge_categories"],
            },
        }
    }
