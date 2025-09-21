"""
Network Agent Configuration and Utilities

Configuration helpers and utilities for RAG-enhanced network analysis.
"""

from typing import Dict, Any, List, Optional
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


def create_network_rag_config() -> Optional['ContextAugmentationConfig']:
    """Create network-specific RAG configuration."""
    if not RAG_AVAILABLE:
        return None
    
    try:
        config = ContextAugmentationConfig(
            # Network-specific retrieval limits
            max_critical_chunks=7,      # Network patterns, threat intel
            max_supporting_chunks=12,   # Historical data, case studies
            max_background_chunks=18,   # General network knowledge
            
            # Adjusted thresholds for network domain
            critical_threshold=0.88,    # High precision for network threats
            supporting_threshold=0.68,  # Broader for network patterns
            background_threshold=0.45,  # Include general networking knowledge
            
            # Network domain settings
            enable_domain_filtering=True,
            enable_entity_type_filtering=True,
            enable_temporal_filtering=True,
            
            # Enhanced context for network analysis
            include_source_attribution=True,
            include_confidence_scores=True,
            max_context_length=4500  # Increased for network technical details
        )
        
        logger.info("Created network-specific RAG configuration")
        return config
        
    except Exception as e:
        logger.warning(f"RAG configuration creation failed: {e}")
        return None


def get_network_objectives(rag_enabled: bool = False, mcp_enhanced: bool = False) -> List[str]:
    """Get network analysis objectives with optional RAG enhancement."""
    
    objectives = [
        "STEP 1: CHECK if context.data_sources['user'] contains an 'ip' field",
        "STEP 2: If NO 'ip' field exists, DO NOT USE these tools: abuseipdb_ip_reputation, shodan_infrastructure_analysis, virustotal (for IP)",
        "STEP 3: If 'ip' field EXISTS and contains a valid IP (like 192.168.1.1), then use IP-based tools",
        "CRITICAL WARNING: Entity IDs (like 'K1F6HIIGBVHH20TX' or 'TESTUSER123456') are NOT IP addresses - NEVER pass them to IP tools",
        "When NO IP is available, focus on: log analysis, behavioral patterns, transaction analysis, user activity patterns",
        "Analyze network patterns for suspicious connections and anomalies using available data",
        "Leverage historical network patterns and threat intelligence from knowledge base",
        "Apply known network topology analysis techniques from domain expertise",
        "Identify geographic anomalies and impossible travel patterns from available location data",
        "Detect command and control (C2) server connections and botnet activity patterns",
        "Check for connections to known malicious domains if domain names are available",
        "Analyze unusual network protocols and communication patterns",
        "Identify data exfiltration patterns and suspicious outbound connections",
        "Detect network-based fraud indicators including account takeover attempts",
        "Cross-reference findings with known fraud indicator patterns from knowledge base",
        "Apply advanced network forensics techniques based on available data"
    ]
    
    # Add RAG-specific objectives if enabled
    if rag_enabled and RAG_AVAILABLE:
        objectives.extend([
            "Utilize retrieved domain knowledge for enhanced network threat detection",
            "Apply historical case patterns and threat intelligence from knowledge base"
        ])
    
    # Add MCP-specific objectives if enhanced mode is enabled
    if mcp_enhanced:
        objectives.extend([
            "Leverage MCP intelligence gathering services for comprehensive threat data collection",
            "Use MCP machine learning models for advanced network anomaly detection and classification",
            "Apply MCP blockchain analysis tools for cryptocurrency-related network investigations",
            "Utilize MCP caching and circuit breaker patterns for reliable threat intelligence retrieval",
            "Implement parallel MCP service calls for enhanced network investigation performance"
        ])
    
    return objectives


def initialize_rag_stats() -> Dict[str, Any]:
    """Initialize RAG performance statistics."""
    return {
        "rag_enabled": RAG_AVAILABLE,
        "knowledge_retrieval_count": 0,
        "context_augmentation_success": False,
        "domain_knowledge_categories": 0
    }


def update_rag_stats_on_success(rag_stats: Dict[str, Any]) -> Dict[str, Any]:
    """Update RAG statistics on successful configuration."""
    rag_stats["context_augmentation_success"] = True
    rag_stats["domain_knowledge_categories"] = 4  # network_patterns, threat_intel, network_topology, fraud_indicators
    return rag_stats


def create_network_agent_metadata(rag_enabled: bool, rag_stats: Dict[str, Any], mcp_enhanced: bool = False) -> Dict[str, Any]:
    """Create metadata for network agent tracking."""
    base_objectives = 15
    rag_objectives = 2 if rag_enabled else 0
    mcp_objectives = 5 if mcp_enhanced else 0
    total_objectives = base_objectives + rag_objectives + mcp_objectives
    
    analysis_type = "mcp_enhanced_llm_driven" if mcp_enhanced else ("rag_enhanced_llm_driven" if rag_enabled else "autonomous_llm_driven")
    enhancement_type = "mcp_enhanced" if mcp_enhanced else ("rag_enhanced" if rag_enabled else "standard")
    
    return {
        "domain": "network",
        "analysis_type": analysis_type,
        "objectives_count": total_objectives,
        "rag_available": RAG_AVAILABLE,
        "rag_enabled": rag_enabled,
        "mcp_enhanced": mcp_enhanced,
        "rag_performance": rag_stats,
        "enhancement_type": enhancement_type,
        "domain_knowledge_utilized": rag_stats.get("context_augmentation_success", False)
    }


def format_completion_message(rag_enabled: bool, findings_count: int, risk_score: float, rag_stats: Dict[str, Any], mcp_enhanced: bool = False) -> str:
    """Format agent completion message with RAG and MCP information."""
    analysis_type = "MCP-enhanced" if mcp_enhanced else ("RAG-enhanced" if rag_enabled else "Standard")
    base_message = f"{analysis_type} network analysis completed: {findings_count} findings, risk={risk_score:.2f}"
    
    if rag_enabled and rag_stats.get("knowledge_retrieval_count", 0) > 0:
        base_message += f", knowledge retrieval: {rag_stats['knowledge_retrieval_count']} queries"
    
    if mcp_enhanced:
        base_message += ", MCP services: intelligence gathering, ML models, caching"
    
    return base_message


def create_result_structure(findings, rag_enabled: bool, rag_stats: Dict[str, Any], mcp_enhanced: bool = False) -> Dict[str, Any]:
    """Create structured result with RAG and MCP enhancement metadata."""
    analysis_type = "MCP-enhanced LLM-driven" if mcp_enhanced else ("RAG-enhanced LLM-driven" if rag_enabled else "LLM-driven")
    summary_suffix = f" (RAG: {rag_stats['knowledge_retrieval_count']} queries)" if rag_enabled and rag_stats['knowledge_retrieval_count'] > 0 else ""
    if mcp_enhanced:
        summary_suffix += " (MCP: enhanced intelligence & reliability)" if summary_suffix else " (MCP: enhanced intelligence & reliability)"
    
    return {
        "risk_assessment": {
            "risk_level": findings.risk_score,
            "confidence": findings.confidence,
            "risk_factors": findings.key_findings,
            "suspicious_indicators": findings.suspicious_indicators,
            "summary": f"{'MCP-enhanced' if mcp_enhanced else ('RAG-enhanced' if rag_enabled else 'Autonomous')} network analysis: {len(findings.key_findings)} findings{summary_suffix}",
            "thoughts": f"Used {analysis_type} tool selection for network analysis with domain knowledge integration",
            "timestamp": findings.timestamp.isoformat(),
            "autonomous_execution": True,
            "domain": "network",
            "enhancement_type": "mcp_enhanced" if mcp_enhanced else ("rag_enhanced" if rag_enabled else "standard"),
            "rag_performance": rag_stats,
            "knowledge_augmentation": {
                "enabled": rag_enabled,
                "retrieval_count": rag_stats["knowledge_retrieval_count"],
                "context_success": rag_stats["context_augmentation_success"],
                "domain_categories": rag_stats["domain_knowledge_categories"]
            },
            "mcp_enhancement": {
                "enabled": mcp_enhanced,
                "intelligence_gathering": mcp_enhanced,
                "ml_models": mcp_enhanced,
                "connection_pooling": mcp_enhanced,
                "circuit_breakers": mcp_enhanced
            }
        }
    }