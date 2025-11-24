"""
Risk Agent Configuration and Utilities

Configuration helpers and utilities for RAG-enhanced risk assessment.
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


def create_risk_rag_config() -> Optional['ContextAugmentationConfig']:
    """Create risk-specific RAG configuration."""
    if not RAG_AVAILABLE:
        return None
    
    try:
        config = ContextAugmentationConfig(
            # Risk-specific retrieval limits
            max_critical_chunks=8,      # Risk models, critical fraud indicators
            max_supporting_chunks=15,   # Historical patterns, case studies
            max_background_chunks=20,   # General risk knowledge, methodologies
            
            # Adjusted thresholds for risk domain
            critical_threshold=0.90,    # Very high precision for risk models
            supporting_threshold=0.72,  # Broader for risk patterns  
            background_threshold=0.50,  # Include general risk knowledge
            
            # Risk domain settings
            enable_domain_filtering=True,
            enable_entity_type_filtering=True,
            enable_temporal_filtering=True,
            
            # Enhanced context for risk analysis
            include_source_attribution=True,
            include_confidence_scores=True,
            max_context_length=5000  # Expanded for complex risk models
        )
        
        logger.info("Created risk-specific RAG configuration")
        return config
        
    except Exception as e:
        logger.warning(f"RAG configuration creation failed: {e}")
        return None


def get_risk_objectives(rag_enabled: bool = False) -> List[str]:
    """Get risk assessment objectives with optional RAG enhancement."""
    
    objectives = [
        "Integrate findings from all investigation domains (device, network, location, logs)",
        "PRIORITY: Use unified_threat_intelligence tool to aggregate all threat signals from multiple sources",
        "Correlate threat intelligence findings from AbuseIPDB, VirusTotal, and Shodan",
        "Calculate weighted risk score based on threat intelligence confidence levels",
        "Analyze consensus between different threat intelligence providers",
        "Identify high-confidence malicious indicators confirmed by multiple sources",
        "Assess infrastructure risk using Shodan vulnerability and exposure data",
        "Evaluate file and URL threats using VirusTotal analysis results",
        "Determine IP reputation consensus from AbuseIPDB and VirusTotal",
        "Generate comprehensive fraud probability incorporating threat intelligence signals",
        "Prioritize critical threats requiring immediate action",
        "Provide risk-based recommendations with threat intelligence context",
        "Create executive summary highlighting key threat intelligence findings"
    ]
    
    # Add RAG-specific objectives if enabled
    if rag_enabled and RAG_AVAILABLE:
        objectives.extend([
            "Enhance risk scoring with historical models and proven methodologies from knowledge base",
            "Apply fraud risk indicators analysis using domain expertise and pattern libraries",
            "Utilize behavioral risk assessment techniques from knowledge base for user profiling",
            "Leverage financial risk pattern recognition from historical fraud case patterns"
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
    rag_stats["domain_knowledge_categories"] = 8  # risk_scoring_models, fraud_risk_indicators, behavioral_risk_analysis, financial_risk_patterns, account_risk_assessment, transaction_risk_analysis, risk_correlation_techniques, regulatory_compliance_risk
    return rag_stats


def create_risk_agent_metadata(rag_enabled: bool, rag_stats: Dict[str, Any]) -> Dict[str, Any]:
    """Create metadata for risk agent tracking."""
    return {
        "domain": "risk",
        "analysis_type": "rag_enhanced_llm_driven" if rag_enabled else "structured_llm_driven",
        "objectives_count": 17 if rag_enabled else 13,
        "rag_available": RAG_AVAILABLE,
        "rag_enabled": rag_enabled,
        "rag_performance": rag_stats,
        "enhancement_type": "rag_enhanced" if rag_enabled else "standard",
        "domain_knowledge_utilized": rag_stats.get("context_augmentation_success", False)
    }


def format_completion_message(rag_enabled: bool, findings_count: int, risk_score: float, rag_stats: Dict[str, Any]) -> str:
    """Format agent completion message with RAG information."""
    base_message = f"{'RAG-enhanced' if rag_enabled else 'Standard'} risk assessment completed: {findings_count} findings, risk={risk_score:.2f}"
    
    if rag_enabled and rag_stats.get("knowledge_retrieval_count", 0) > 0:
        base_message += f", knowledge retrieval: {rag_stats['knowledge_retrieval_count']} queries"
    
    return base_message


def create_result_structure(findings, rag_enabled: bool, rag_stats: Dict[str, Any]) -> Dict[str, Any]:
    """Create structured result with RAG enhancement metadata."""
    analysis_type = "RAG-enhanced LLM-driven" if rag_enabled else "LLM-driven"
    summary_suffix = f" (RAG: {rag_stats['knowledge_retrieval_count']} queries)" if rag_enabled and rag_stats['knowledge_retrieval_count'] > 0 else ""
    
    return {
        "risk_assessment": {
            "overall_risk_score": findings.risk_score,
            "confidence": findings.confidence,
            "risk_factors": findings.key_findings,
            "suspicious_indicators": findings.suspicious_indicators,
            "summary": f"{'RAG-enhanced' if rag_enabled else 'Structured'} risk assessment: {len(findings.key_findings)} findings{summary_suffix}",
            "thoughts": f"Used {analysis_type} tool selection for comprehensive risk evaluation with domain knowledge integration",
            "timestamp": findings.timestamp.isoformat(),
            "structured_execution": True,
            "domain": "risk",
            "enhancement_type": "rag_enhanced" if rag_enabled else "standard",
            "rag_performance": rag_stats,
            "knowledge_augmentation": {
                "enabled": rag_enabled,
                "retrieval_count": rag_stats["knowledge_retrieval_count"],
                "context_success": rag_stats["context_augmentation_success"],
                "domain_categories": rag_stats["domain_knowledge_categories"]
            },
            "recommended_actions": findings.recommended_actions
        }
    }