"""
Logs Agent Configuration and Utilities

Configuration helpers and utilities for RAG-enhanced logs analysis.
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


def create_logs_rag_config() -> Optional["ContextAugmentationConfig"]:
    """Create logs-specific RAG configuration."""
    if not RAG_AVAILABLE:
        return None

    try:
        config = ContextAugmentationConfig(
            # Logs-specific retrieval limits
            max_critical_chunks=9,  # Log pattern analysis, security event correlation
            max_supporting_chunks=16,  # Splunk optimization, audit trail analysis
            max_background_chunks=22,  # General logs knowledge, behavioral analytics
            # Adjusted thresholds for logs domain
            critical_threshold=0.82,  # High precision for log threats and patterns
            supporting_threshold=0.62,  # Broader for log analysis patterns
            background_threshold=0.40,  # Include general logging knowledge
            # Logs domain settings
            enable_domain_filtering=True,
            enable_entity_type_filtering=True,
            enable_temporal_filtering=True,
            # Enhanced context for logs analysis
            include_source_attribution=True,
            include_confidence_scores=True,
            max_context_length=5000,  # Increased for comprehensive log analysis details
        )

        logger.info("Created logs-specific RAG configuration")
        return config

    except Exception as e:
        logger.warning(f"RAG configuration creation failed: {e}")
        return None


def get_logs_objectives(rag_enabled: bool = False) -> List[str]:
    """Get logs analysis objectives with optional RAG enhancement."""

    objectives = [
        "Analyze activity logs for suspicious patterns and fraud indicators using domain knowledge",
        "PRIORITY: Cross-reference accessed URLs with VirusTotal for malicious domain detection",
        "PRIORITY: Check ALL IP addresses in logs against AbuseIPDB threat database for reputation scores",
        "Identify connections to known C2 servers or malicious infrastructure using Shodan intelligence",
        "Leverage historical log pattern analysis techniques from knowledge base",
        "Apply Splunk query optimization methods from domain expertise repository",
        "Detect automated bot behavior and scripted attack patterns using established methodologies",
        "Identify brute force attempts, credential stuffing, and account takeover activities with domain knowledge",
        "Check for data exfiltration patterns to suspicious IPs using threat intelligence correlation",
        "Analyze user agent strings for known malicious tools and fraud frameworks using historical patterns",
        "Detect privilege escalation attempts and lateral movement patterns with security event knowledge",
        "Identify API abuse and rate limit violations indicative of attacks using behavioral analytics",
        "Check for access from sanctioned countries or high-risk regions with geographic intelligence",
        "Use unified threat intelligence to correlate behavioral anomalies with known attack patterns",
        "Apply audit trail analysis methodologies from domain expertise",
        "Utilize threat hunting techniques for log-based pattern detection from knowledge base",
        "Apply incident response playbooks for comprehensive log analysis",
    ]

    # Add RAG-specific objectives if enabled
    if rag_enabled and RAG_AVAILABLE:
        objectives.extend(
            [
                "Utilize retrieved log analysis domain knowledge for enhanced pattern detection",
                "Apply historical security incident patterns and threat hunting techniques from knowledge base",
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
        7  # log_pattern_analysis, splunk_query_optimization, security_event_correlation, audit_trail_analysis, behavioral_analytics, threat_hunting_techniques, incident_response_playbooks
    )
    return rag_stats


def create_logs_agent_metadata(
    rag_enabled: bool, rag_stats: Dict[str, Any]
) -> Dict[str, Any]:
    """Create metadata for logs agent tracking."""
    return {
        "domain": "logs",
        "analysis_type": (
            "rag_enhanced_llm_driven" if rag_enabled else "structured_llm_driven"
        ),
        "objectives_count": 19 if rag_enabled else 17,
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
    base_message = f"{'RAG-enhanced' if rag_enabled else 'Standard'} logs analysis completed: {findings_count} findings, risk={risk_score:.2f}"

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
            "summary": f"{'RAG-enhanced' if rag_enabled else 'Structured'} logs analysis: {len(findings.key_findings)} findings{summary_suffix}",
            "thoughts": f"Used {analysis_type} tool selection for logs analysis with domain knowledge integration",
            "timestamp": findings.timestamp.isoformat(),
            "structured_execution": True,
            "domain": "logs",
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
