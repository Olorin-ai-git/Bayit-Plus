"""
Domain Agent Enhancer - Enhanced domain agent wrappers with hybrid tracking.

This module provides enhanced wrappers for domain agents that add hybrid intelligence
tracking, performance metrics, and audit trail functionality.
"""

import asyncio
import os
from typing import Dict, Any, Optional, Callable
from datetime import datetime

from ...hybrid_state_schema import HybridInvestigationState
from app.service.agent.orchestration.metrics.safe import safe_div

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

# D1 FIX: Configurable domain agent timeout from environment (default: 60 seconds)
# Increased to 60s to accommodate LLM-based evidence analysis which can take 20-30s
DOMAIN_AGENT_TIMEOUT_SECONDS = int(os.getenv("DOMAIN_AGENT_TIMEOUT_SECONDS", "60"))


class DomainAgentEnhancer:
    """
    Enhanced domain agent wrappers with hybrid intelligence tracking.
    
    Provides enhanced versions of domain agents with performance monitoring,
    confidence tracking, and audit trail integration.
    """
    
    def __init__(self, components: Dict[str, Any]):
        """Initialize with graph foundation components."""
        self.components = components
        
    def create_enhanced_domain_agent(self, domain_name: str, original_agent: Callable) -> Callable:
        """Create enhanced domain agent with hybrid intelligence tracking"""
        
        async def enhanced_domain_agent(
            state: HybridInvestigationState,
            config: Optional[Dict] = None
        ) -> HybridInvestigationState:
            
            logger.info(f"🎯 Hybrid Intelligence {domain_name} agent starting")
            logger.debug(f"   Domain analysis: Enhanced with confidence tracking & audit trail")
            logger.debug(f"   Performance metrics: Real-time completion time monitoring")
            logger.debug(f"   D1 FIX: Timeout enforcement: {DOMAIN_AGENT_TIMEOUT_SECONDS}s deadline")

            try:
                # D1 FIX: Call original domain agent with timeout enforcement and duration tracking
                from app.service.agent.orchestration.timing import domain_timer

                try:
                    with domain_timer(state, domain_name):
                        # Enforce timeout using asyncio.wait_for
                        result = await asyncio.wait_for(
                            original_agent(state, config),
                            timeout=DOMAIN_AGENT_TIMEOUT_SECONDS
                        )
                except asyncio.TimeoutError:
                    # D1 FIX: Domain agent exceeded timeout - record failure and continue investigation
                    logger.error(f"⏱️ D1 FIX: {domain_name} agent exceeded {DOMAIN_AGENT_TIMEOUT_SECONDS}s timeout - short-circuiting")
                    logger.error(f"   Investigation will continue with partial results")

                    # Record timeout in state for transparency
                    if "agent_timeouts" not in state:
                        state["agent_timeouts"] = []
                    state["agent_timeouts"].append({
                        "domain": domain_name,
                        "timeout_seconds": DOMAIN_AGENT_TIMEOUT_SECONDS,
                        "timestamp": datetime.now().isoformat()
                    })

                    # Mark domain as insufficient evidence due to timeout
                    domain_findings = state.get("domain_findings", {})
                    domain_findings[domain_name] = {
                        "status": "TIMEOUT",
                        "risk_score": None,
                        "evidence": [],
                        "summary": f"Domain analysis exceeded {DOMAIN_AGENT_TIMEOUT_SECONDS}s timeout and was short-circuited",
                        "confidence": 0.0,
                        "timeout": True
                    }
                    state["domain_findings"] = domain_findings

                    # Record circuit breaker failure
                    from app.service.agent.orchestration.circuit_breaker import record_node_failure
                    timeout_error = TimeoutError(f"{domain_name} agent exceeded {DOMAIN_AGENT_TIMEOUT_SECONDS}s timeout")
                    record_node_failure(state, f"{domain_name}_agent", timeout_error)

                    # Return state with timeout recorded (investigation continues)
                    return state
                
                # Update domain completion tracking
                # Extract domain names from domains_completed (can be strings or dicts)
                domains_completed_raw = result.get("domains_completed", [])
                domains_completed = set()
                for domain in domains_completed_raw:
                    if isinstance(domain, dict):
                        domain_key = domain.get('domain') or domain.get('name') or str(domain)
                    else:
                        domain_key = str(domain)
                    if isinstance(domain_key, str):
                        domains_completed.add(domain_key)
                    else:
                        domains_completed.add(str(domain_key))
                domains_completed.add(domain_name)
                result["domains_completed"] = list(domains_completed)
                
                # Update confidence factors based on domain findings
                domain_findings = result.get("domain_findings", {})
                if domain_name in domain_findings:
                    finding_quality = domain_findings[domain_name].get("confidence", 0.5)
                    # CRITICAL FIX: Ensure confidence_factors exists before accessing
                    if "confidence_factors" not in result:
                        result["confidence_factors"] = {
                            "data_completeness": 0.0,
                            "evidence_quality": 0.0,
                            "pattern_recognition": 0.0,
                            "risk_indicators": 0.0
                        }
                    result["confidence_factors"][f"{domain_name}_analysis"] = finding_quality
                
                # Update performance metrics with domain duration
                # CRITICAL FIX: Ensure performance_metrics exists before accessing
                if "performance_metrics" not in result:
                    result["performance_metrics"] = {}
                
                # Use domain timer for duration tracking instead of timestamps
                from app.service.agent.orchestration.timing import domain_timer
                # Note: This will be tracked by the domain timer context manager
                
                # Add domain completion to audit trail
                # CRITICAL FIX: Ensure decision_audit_trail exists before accessing
                if "decision_audit_trail" not in result:
                    result["decision_audit_trail"] = []
                result["decision_audit_trail"].append({
                    "timestamp": datetime.now().isoformat(),
                    "decision_type": "domain_completion",
                    "details": {
                        "domain": domain_name,
                        "findings_available": domain_name in domain_findings,
                        "total_domains_completed": len(domains_completed)
                    }
                })
                
                logger.info(f"✅ Enhanced {domain_name} agent completed")
                logger.info(f"   Domains completed: {len(domains_completed)}/6")
                
                return result
                
            except Exception as e:
                logger.error(f"❌ Enhanced {domain_name} agent failed: {str(e)}")
                
                # Record failure with circuit breaker (includes error tracking)
                from app.service.agent.orchestration.circuit_breaker import record_node_failure
                record_node_failure(state, f"{domain_name}_agent", e)
                
                return state
        
        return enhanced_domain_agent
    
    def get_domain_completion_stats(self, state: HybridInvestigationState) -> Dict[str, Any]:
        """Get statistics about domain agent completion."""
        domains_completed = state.get("domains_completed", [])
        available_domains = ["network", "device", "location", "logs", "authentication", "risk"]
        
        return {
            "total_domains": len(available_domains),
            "completed_domains": len(domains_completed),
            "completion_percentage": len(domains_completed) / len(available_domains) * 100,
            "completed_domain_list": domains_completed,
            "pending_domains": [d for d in available_domains if d not in domains_completed]
        }
    
    def get_domain_performance_metrics(self, state: HybridInvestigationState) -> Dict[str, Any]:
        """Get performance metrics for domain agents using actual durations."""
        performance_metrics = state.get("performance_metrics", {})
        domain_durations = performance_metrics.get("domain_durations_ms", {})
        domain_metrics = {}
        
        for domain_name, duration_ms in domain_durations.items():
            domain_metrics[domain_name] = {
                "duration_ms": duration_ms,
                "duration_seconds": safe_div(duration_ms, 1000.0, 0.0),
                "completed": True
            }
        
        return domain_metrics
    
    def get_domain_confidence_factors(self, state: HybridInvestigationState) -> Dict[str, float]:
        """Get confidence factors from domain agent analyses."""
        confidence_factors = state.get("confidence_factors", {})
        domain_confidence = {}
        
        for key, value in confidence_factors.items():
            if key.endswith("_analysis"):
                domain_name = key.replace("_analysis", "")
                domain_confidence[domain_name] = value
        
        return domain_confidence