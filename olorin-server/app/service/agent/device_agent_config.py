"""
Device Agent Configuration and Utilities

Configuration helpers and utilities for RAG-enhanced device analysis.
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


def create_device_rag_config() -> Optional['ContextAugmentationConfig']:
    """Create device-specific RAG configuration."""
    if not RAG_AVAILABLE:
        return None
    
    try:
        config = ContextAugmentationConfig(
            # Device-specific retrieval limits
            max_critical_chunks=8,      # Device patterns, mobile forensics
            max_supporting_chunks=14,   # Hardware profiling, browser analysis
            max_background_chunks=20,   # General device knowledge
            
            # Adjusted thresholds for device domain
            critical_threshold=0.85,    # High precision for device threats
            supporting_threshold=0.65,  # Broader for device patterns
            background_threshold=0.42,  # Include general device knowledge
            
            # Device domain settings
            enable_domain_filtering=True,
            enable_entity_type_filtering=True,
            enable_temporal_filtering=True,
            
            # Enhanced context for device analysis
            include_source_attribution=True,
            include_confidence_scores=True,
            max_context_length=4800  # Increased for device technical details
        )
        
        logger.info("Created device-specific RAG configuration")
        return config
        
    except Exception as e:
        logger.warning(f"RAG configuration creation failed: {e}")
        return None


def get_device_objectives(rag_enabled: bool = False) -> List[str]:
    """Get device analysis objectives with optional RAG enhancement."""
    
    objectives = [
        "Analyze device fingerprints for authenticity and known fraud patterns using domain knowledge",
        "PRIORITY: Check device IP addresses against AbuseIPDB and VirusTotal threat databases",
        "PRIORITY: Use VirusTotal file analysis to check any file hashes associated with the device",
        "Scan for malware signatures and suspicious file modifications using VirusTotal",
        "Use Shodan to identify if device IPs are associated with known compromised infrastructure",
        "Leverage historical device fingerprinting patterns from knowledge base",
        "Apply mobile forensics techniques from domain expertise repository",
        "Detect device spoofing, emulation, or virtualization attempts using known patterns",
        "Check for jailbroken/rooted devices and security bypasses with historical context",
        "Analyze installed applications for malicious or fraudulent software patterns",
        "Identify device cloning or multiple accounts on same device using domain knowledge",
        "Check browser fingerprints against known fraud tools and automation patterns",
        "Detect remote access tools, screen sharing, or device takeover attempts",
        "Apply hardware profiling techniques for fraud detection from knowledge base",
        "Analyze device behavior patterns using domain expertise",
        "Use unified threat intelligence to correlate device indicators across sources"
    ]
    
    # Add RAG-specific objectives if enabled
    if rag_enabled and RAG_AVAILABLE:
        objectives.extend([
            "Utilize retrieved mobile forensics knowledge for enhanced device analysis",
            "Apply historical device fraud patterns and techniques from knowledge base"
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
    rag_stats["domain_knowledge_categories"] = 5  # device_fingerprinting, mobile_forensics, browser_analysis, hardware_profiling, device_behavior_patterns
    return rag_stats


def create_device_agent_metadata(rag_enabled: bool, rag_stats: Dict[str, Any]) -> Dict[str, Any]:
    """Create metadata for device agent tracking."""
    return {
        "domain": "device",
        "analysis_type": "rag_enhanced_llm_driven" if rag_enabled else "autonomous_llm_driven",
        "objectives_count": 18 if rag_enabled else 16,
        "rag_available": RAG_AVAILABLE,
        "rag_enabled": rag_enabled,
        "rag_performance": rag_stats,
        "enhancement_type": "rag_enhanced" if rag_enabled else "standard",
        "domain_knowledge_utilized": rag_stats.get("context_augmentation_success", False)
    }


def format_completion_message(rag_enabled: bool, findings_count: int, risk_score: float, rag_stats: Dict[str, Any]) -> str:
    """Format agent completion message with RAG information."""
    base_message = f"{'RAG-enhanced' if rag_enabled else 'Standard'} device analysis completed: {findings_count} findings, risk={risk_score:.2f}"
    
    if rag_enabled and rag_stats.get("knowledge_retrieval_count", 0) > 0:
        base_message += f", knowledge retrieval: {rag_stats['knowledge_retrieval_count']} queries"
    
    return base_message


def create_result_structure(findings, rag_enabled: bool, rag_stats: Dict[str, Any]) -> Dict[str, Any]:
    """Create structured result with RAG enhancement metadata."""
    analysis_type = "RAG-enhanced LLM-driven" if rag_enabled else "LLM-driven"
    summary_suffix = f" (RAG: {rag_stats['knowledge_retrieval_count']} queries)" if rag_enabled and rag_stats['knowledge_retrieval_count'] > 0 else ""
    
    return {
        "risk_assessment": {
            "risk_level": findings.risk_score,
            "confidence": findings.confidence,
            "risk_factors": findings.key_findings,
            "suspicious_indicators": findings.suspicious_indicators,
            "summary": f"{'RAG-enhanced' if rag_enabled else 'Autonomous'} device analysis: {len(findings.key_findings)} findings{summary_suffix}",
            "thoughts": f"Used {analysis_type} tool selection for device analysis with domain knowledge integration",
            "timestamp": findings.timestamp.isoformat(),
            "autonomous_execution": True,
            "domain": "device",
            "enhancement_type": "rag_enhanced" if rag_enabled else "standard",
            "rag_performance": rag_stats,
            "knowledge_augmentation": {
                "enabled": rag_enabled,
                "retrieval_count": rag_stats["knowledge_retrieval_count"],
                "context_success": rag_stats["context_augmentation_success"],
                "domain_categories": rag_stats["domain_knowledge_categories"]
            }
        }
    }