"""
Base classes and shared utilities for domain agents.

Provides common functionality used across all domain analysis agents.
"""

from typing import Dict, Any
from app.service.logging import get_bridge_logger
from app.service.agent.orchestration.state_schema import (
    InvestigationState,
    add_domain_findings
)
from app.service.agent.chain_of_thought_logger import get_chain_of_thought_logger, ReasoningType

logger = get_bridge_logger(__name__)


class DomainAgentBase:
    """Base class for domain analysis agents."""
    
    @staticmethod
    def _get_domain_step(domain: str) -> str:
        """Get step number for domain in Phase 5."""
        domain_steps = {
            "network": "5.2.1",
            "device": "5.2.2", 
            "location": "5.2.3",
            "logs": "5.2.4",
            "authentication": "5.2.5",
            "risk": "5.2.6"
        }
        return domain_steps.get(domain.lower(), "5.2.X")
    
    @staticmethod
    def log_agent_start(domain: str, entity_type: str, entity_id: str, is_test_mode: bool) -> None:
        """Log agent handover and initialization."""
        step = DomainAgentBase._get_domain_step(domain)
        logger.debug(f"[Step {step}] {domain.upper()} AGENT HANDOVER DEBUG:")
        logger.debug(f"[Step {step}]   🤝 Agent handover: Orchestrator → {domain.title()} Agent")
        logger.debug(f"[Step {step}]   🎯 Mode: {'TEST' if is_test_mode else 'LIVE'}")
        logger.debug(f"[Step {step}]   🏗️  Investigation ID: {entity_id}")
        logger.debug(f"[Step {step}]   🎯 Entity: {entity_type} - {entity_id}")
    
    @staticmethod
    def log_context_analysis(snowflake_data: Dict[str, Any], tool_results: Dict[str, Any], domain: str = "unknown") -> None:
        """Log available data sources for debugging."""
        step = DomainAgentBase._get_domain_step(domain)
        logger.debug(f"[Step {step}.1] 📊 Available data sources:")
        logger.debug(f"[Step {step}.1]   Snowflake data: {'Yes' if snowflake_data else 'No'} ({len(str(snowflake_data))} chars)")
        logger.debug(f"[Step {step}.1]   Tool results: {len(tool_results)} tools for category-based analysis")
        if tool_results:
            logger.debug(f"[Step {step}.1]   Tool results keys: {list(tool_results.keys())}")
            logger.debug(f"[Step {step}.1]   🔄 Category-based processing: Will extract domain-specific signals from all tools")
    
    @staticmethod
    def start_chain_of_thought(investigation_id: str, agent_name: str, domain: str, 
                             entity_type: str, entity_id: str, task_description: str) -> str:
        """Initialize chain of thought logging for the agent."""
        cot_logger = get_chain_of_thought_logger()
        
        # Get the actual process_id returned by start_agent_thinking
        process_id = cot_logger.start_agent_thinking(
            investigation_id=investigation_id,
            agent_name=agent_name,
            domain=domain,
            initial_context={"entity_type": entity_type, "entity_id": entity_id}
        )
        
        cot_logger.log_reasoning_step(
            process_id=process_id,
            reasoning_type=ReasoningType.ANALYSIS,
            premise=f"{domain.title()} domain analysis required for {entity_type} {entity_id}",
            reasoning=task_description,
            conclusion=f"Will examine Snowflake transaction data and tool results for {domain} risk indicators",
            confidence=0.8,
            supporting_evidence=[
                {"type": "domain", "data": f"{domain} analysis specialization"},
                {"type": "agent_initialization", "data": f"{agent_name} ready for analysis"}
            ],
            metadata={"agent": agent_name, "entity_type": entity_type, "entity_id": entity_id}
        )
        
        return process_id
    
    @staticmethod
    def initialize_findings(domain: str) -> Dict[str, Any]:
        """Initialize domain findings structure."""
        return {
            "domain": domain,
            "evidence": [],  # Collect evidence for LLM to analyze
            "metrics": {},  # Collect metrics without scoring
            "risk_indicators": [],
            "analysis": {},
            "risk_score": 0.0  # CRITICAL FIX: Initialize risk_score to prevent KeyError
        }
    
    @staticmethod
    def process_snowflake_results(snowflake_data: Dict[str, Any], domain: str) -> list:
        """Extract and validate Snowflake results."""
        results = []
        
        if snowflake_data:
            if isinstance(snowflake_data, dict) and "results" in snowflake_data:
                results = snowflake_data["results"]
                # Get step prefix for domain
                domain_steps = {
                    "network": "5.2.1", "device": "5.2.2", "location": "5.2.3",
                    "logs": "5.2.4", "authentication": "5.2.5", "risk": "5.2.6"
                }
                step = domain_steps.get(domain.lower(), "5.2.X")
                logger.debug(f"[Step {step}]   📊 Processing {len(results)} Snowflake records for {domain} analysis")
            elif isinstance(snowflake_data, str):
                step = DomainAgentBase._get_domain_step(domain)
                logger.warning(f"[Step {step}] ⚠️ {domain.title()} Agent: Snowflake data is string format, cannot extract structured results")
                logger.debug(f"[Step {step}]   String content preview: {snowflake_data[:200]}...")
            else:
                step = DomainAgentBase._get_domain_step(domain)
                logger.warning(f"[Step {step}] ⚠️ {domain.title()} Agent: Unexpected Snowflake data type: {type(snowflake_data)}")
                logger.debug(f"[Step {step}]   Data content preview: {str(snowflake_data)[:200]}...")
        
        return results
    
    @staticmethod
    def process_model_scores(results: list, findings: Dict[str, Any], domain: str) -> None:
        """
        Process Snowflake results for domain analysis.
        
        CRITICAL: MODEL_SCORE is COMPLETELY IGNORED per system architecture.
        MODEL_SCORE is only used for initial population sorting, not investigation scoring.
        Domain agents start from neutral baseline and analyze raw data independently.
        """
        if not results:
            return
            
        step = DomainAgentBase._get_domain_step(domain)
        logger.debug(f"[Step {step}]   📊 Processing {len(results)} records for {domain} anomaly detection")
        
        # Log data availability for debugging but DO NOT use MODEL_SCORE in calculations
        for idx, r in enumerate(results[:3]):  # Log first 3 records
            model_score = r.get("MODEL_SCORE")
            logger.debug(f"[Step {step}]      Record {idx+1}: Raw data available (MODEL_SCORE present but ignored: {model_score is not None})")
            logger.debug(f"[Step {step}]      Available fields for analysis: {list(r.keys())}")
        
        # CRITICAL ARCHITECTURAL FIX: 
        # 1. Start with ZERO baseline (0.0) - truly neutral, no pre-existing assumptions
        # 2. COMPLETELY IGNORE MODEL_SCORE - it's only for population sorting
        # 3. Let LLM agents analyze raw patterns and determine risk independently
        
        findings["risk_score"] = 0.0  # Zero baseline - build risk score from evidence only
        
        logger.debug(f"[Step {step}]   🎯 CORRECTED: Starting {domain} analysis from ZERO baseline (0.0)")
        logger.debug(f"[Step {step}]   🚫 MODEL_SCORE completely ignored per system architecture")
        logger.debug(f"[Step {step}]   🧠 LLM will analyze raw Snowflake patterns independently")
        
        # Store only record count for analysis - no MODEL_SCORE bias
        findings["metrics"]["snowflake_records_count"] = len(results)
        
        # Remove any MODEL_SCORE bias from risk indicators
        # Domain agents will add legitimate risk indicators based on actual pattern analysis
    
    @staticmethod
    def finalize_findings(findings: Dict[str, Any], snowflake_data: Dict[str, Any], 
                         tool_results: Dict[str, Any], analysis_duration: float, domain: str) -> None:
        """Finalize domain findings with confidence and completion logging."""
        # Cap risk score at 1.0
        findings["risk_score"] = min(1.0, findings["risk_score"])
        
        # Add confidence based on data availability (simplified for base class)
        data_sources = sum([
            1 if snowflake_data else 0,
            len(tool_results) * 0.25  # Each tool contributes 0.25 to confidence
        ])
        findings["confidence"] = min(1.0, data_sources / 4.0)
        
        step = DomainAgentBase._get_domain_step(domain)
        logger.info(f"[Step {step}] ✅ {domain.title()} analysis complete - Risk: {findings['risk_score']:.2f}")
        
        # DEBUG: Analysis completion
        # step already defined above
        logger.debug(f"[Step {step}] {domain.upper()} AGENT COMPLETION DEBUG:")
        logger.debug(f"[Step {step}]   ⏱️  Analysis duration: {analysis_duration:.3f}s")
        logger.debug(f"[Step {step}]   🎯 Risk score calculated: {findings['risk_score']:.2f}")
        logger.debug(f"[Step {step}]   🔍 Risk indicators found: {len(findings['risk_indicators'])}")
        for i, indicator in enumerate(findings['risk_indicators'][:3]):  # Show first 3
            logger.debug(f"[Step {step}]      Risk {i+1}: {indicator}")
        if len(findings['risk_indicators']) > 3:
            logger.debug(f"[Step {step}]      ... and {len(findings['risk_indicators']) - 3} more")
        logger.debug(f"[Step {step}]   📊 Confidence level: {findings.get('confidence', 0):.2f}")
        logger.debug(f"[Step {step}]   🧠 Evidence points collected: {len(findings.get('evidence', []))}")
        logger.debug(f"[Step {step}]   🔄 Category-based signals processed from {_count_tool_metrics(findings)} tools")


def _count_tool_metrics(findings: Dict[str, Any]) -> int:
    """Count how many tools provided metrics during category-based analysis."""
    metrics = findings.get("metrics", {})
    tool_names = set()
    
    # Look for tool-specific metrics (those with _evidence_count, _risk_level, _threat_level suffixes)
    for key in metrics.keys():
        if any(suffix in key for suffix in ["_evidence_count", "_risk_level", "_threat_level"]):
            # Extract tool name (everything before the suffix)
            for suffix in ["_evidence_count", "_risk_level", "_threat_level"]:
                if suffix in key:
                    tool_name = key.split(suffix)[0]
                    tool_names.add(tool_name)
                    break
    
    return len(tool_names)


def log_agent_handover_complete(domain: str, findings: Dict[str, Any]) -> None:
    """Log agent handover completion back to orchestrator."""
    step = DomainAgentBase._get_domain_step(domain)
    logger.debug(f"[Step {step}]   🤝 Agent handover: {domain.title()} Agent → Orchestrator")
    logger.debug(f"[Step {step}]   🎯 Findings delivered: {len(findings.get('risk_indicators', []))} indicators")
    logger.debug(f"[Step {step}]   🧠 Chain of thought: Analysis complete, control returned to orchestrator")


def _detect_confirmed_fraud(snowflake_data: Dict[str, Any]) -> bool:
    """
    Detect if there's confirmed fraud in the Snowflake data.
    
    Returns:
        True if confirmed fraud detected, False otherwise
    """
    if not snowflake_data or not isinstance(snowflake_data.get('results'), list):
        return False
    
    # Check each record for confirmed fraud
    for record in snowflake_data['results']:
        if not isinstance(record, dict):
            continue
            
        # Check IS_FRAUD_TX field
        fraud_flag = record.get('IS_FRAUD_TX')
        if fraud_flag == 1 or fraud_flag == '1' or str(fraud_flag).lower() == 'true':
            logger.debug(f"🚨 CONFIRMED FRAUD detected in Snowflake data: IS_FRAUD_TX = {fraud_flag}")
            return True
    
    return False


def _compute_algorithmic_risk_score(domain: str, findings: Dict[str, Any], snowflake_data: Dict[str, Any]) -> float:
    """
    Compute risk score algorithmically using deterministic domain logic WITH internal MODEL_SCORE evidence.
    
    MODEL_SCORE is used as INTERNAL evidence for risk fusion but LLMs are prevented from citing it.
    This prevents LLM anchoring while allowing proper high internal / low external discordance detection.
    """
    from .deterministic_scoring import (
        compute_logs_risk, compute_network_risk, compute_device_risk, 
        compute_location_risk, compute_authentication_risk
    )
    
    metrics = findings.get('metrics', {})
    
    # CRITICAL FIX: Extract MODEL_SCORE as internal evidence
    # This is the key high-risk signal that was being ignored
    model_score = None
    if snowflake_data and isinstance(snowflake_data.get('results'), list):
        for record in snowflake_data['results']:
            if isinstance(record, dict):
                score = record.get('MODEL_SCORE')
                if score is not None:
                    try:
                        model_score = float(score)
                        logger.debug(f"🎯 EXTRACTED MODEL_SCORE for {domain} domain: {model_score}")
                        break  # Use first valid MODEL_SCORE found
                    except (ValueError, TypeError):
                        continue
    
    # Extract external threat intelligence level
    ext_ti = "MINIMAL"  # Default
    evidence = findings.get('evidence', [])
    for e in evidence:
        if 'threat level: HIGH' in str(e).upper():
            ext_ti = "HIGH"
        elif 'threat level: CRITICAL' in str(e).upper():
            ext_ti = "CRITICAL"
        elif 'MINIMAL' in str(e).upper():
            ext_ti = "MINIMAL"
    
    # Use deterministic domain-specific scoring WITH MODEL_SCORE as internal evidence
    risk_score = None
    
    if domain == 'logs':
        tx_count = metrics.get('transaction_count', 0)
        failures = metrics.get('failed_transaction_count', 0)
        error_codes = metrics.get('unique_error_codes', 0)
        risk_score = compute_logs_risk(tx_count, failures, error_codes, ext_ti, model_score)
        
    elif domain == 'network':
        is_public = metrics.get('is_public', True)
        vpn_proxy = any('vpn' in str(e).lower() or 'proxy' in str(e).lower() for e in evidence)
        asn_rep = "CLEAN"  # Default
        velocity_anomaly = metrics.get('unique_ip_count', 1) > 3
        geo_diversity = metrics.get('unique_countries', 0)
        risk_score = compute_network_risk(is_public, vpn_proxy, asn_rep, velocity_anomaly, geo_diversity, ext_ti, model_score)
        
    elif domain == 'device':
        device_consistency = not any('inconsistent' in str(e).lower() for e in evidence)
        fingerprint_anomaly = any('fingerprint' in str(e).lower() and 'anomaly' in str(e).lower() for e in evidence)
        browser_spoofing = any('spoofing' in str(e).lower() for e in evidence)
        device_velocity = metrics.get('unique_device_count', 1)
        risk_score = compute_device_risk(device_consistency, fingerprint_anomaly, browser_spoofing, device_velocity, ext_ti, model_score)
        
    elif domain == 'location':
        impossible_travel = any('impossible travel' in str(e).lower() for e in evidence)
        travel_confidence = 0.8 if impossible_travel else 0.0
        location_consistency = not any('inconsistent' in str(e).lower() for e in evidence)
        high_risk_country = any('high-risk' in str(e).lower() and 'country' in str(e).lower() for e in evidence)
        risk_score = compute_location_risk(impossible_travel, travel_confidence, location_consistency, high_risk_country, ext_ti, model_score)
        
    elif domain == 'authentication':
        failed_attempts = metrics.get('max_login_attempts', 0)
        mfa_bypass = any('mfa bypass' in str(e).lower() for e in evidence)
        credential_stuffing = any('credential stuffing' in str(e).lower() for e in evidence)
        session_anomaly = any('session' in str(e).lower() and 'anomaly' in str(e).lower() for e in evidence)
        risk_score = compute_authentication_risk(failed_attempts, mfa_bypass, credential_stuffing, session_anomaly, ext_ti, model_score)
    
    # Fallback if deterministic scoring fails
    if risk_score is None:
        risk_score = 0.2  # Conservative default
    
    logger.debug(f"🧮 DETERMINISTIC RISK SCORE for {domain}: {risk_score:.3f} (NO MODEL_SCORE used)")
    return risk_score


async def analyze_evidence_with_llm(
    domain: str,
    findings: Dict[str, Any], 
    snowflake_data: Dict[str, Any],
    entity_type: str,
    entity_id: str
) -> Dict[str, Any]:
    """
    Analyze collected evidence using LLM, with computed risk score as authority.
    LLM must echo the computed score, preventing prompt hacking and overfitting.
    """
    from app.service.agent.evidence_analyzer import get_evidence_analyzer
    
    step = DomainAgentBase._get_domain_step(domain)
    logger.debug(f"[Step {step}.4] 🧠 LLM Evidence Analysis - Analyzing {len(findings.get('evidence', []))} evidence points")
    
    # CRITICAL FIX: Compute risk score algorithmically BEFORE LLM analysis
    computed_risk_score = _compute_algorithmic_risk_score(domain, findings, snowflake_data)
    
    try:
        evidence_analyzer = get_evidence_analyzer()
        
        # Analyze evidence with LLM for independent assessment
        llm_analysis = await evidence_analyzer.analyze_domain_evidence(
            domain=domain,
            evidence=findings.get('evidence', []),
            metrics=findings.get('metrics', {}),
            snowflake_data=snowflake_data,
            entity_type=entity_type,
            entity_id=entity_id
        )
        
        # Use LLM risk score for proper risk fusion (no authoritative override)
        llm_risk_score = llm_analysis.get("risk_score", computed_risk_score)
        
        # CRITICAL FIX: Use only computed algorithmic score, isolate LLM narrative
        # Store LLM risk assessment separately as "claimed_risk" to prevent contamination
        if "llm_analysis" in findings and "risk_score" in llm_analysis:
            findings["llm_analysis"]["claimed_risk"] = llm_analysis.pop("risk_score", None)
        
        # Use ONLY the computed algorithmic score for domain risk
        findings["risk_score"] = computed_risk_score
        findings["confidence"] = llm_analysis["confidence"]
        
        # Clean and deduplicate all text content before storing
        from app.service.text.clean import write_llm_sections, deduplicate_recommendations
        
        # Store the LLM analysis first
        findings["llm_analysis"] = llm_analysis
        
        # CRITICAL FIX: Detect confirmed fraud for severity guard
        has_confirmed_fraud = _detect_confirmed_fraud(snowflake_data)
        
        # Apply recommendations severity guard for confirmed fraud cases
        if has_confirmed_fraud and "recommendations" in llm_analysis:
            if isinstance(llm_analysis["recommendations"], list):
                llm_analysis["recommendations"] = deduplicate_recommendations(
                    llm_analysis["recommendations"], has_confirmed_fraud=True
                )
            elif isinstance(llm_analysis["recommendations"], str):
                # Convert string to list, apply guard, then back to string
                rec_list = [llm_analysis["recommendations"]]
                guarded_list = deduplicate_recommendations(rec_list, has_confirmed_fraud=True)
                llm_analysis["recommendations"] = guarded_list[0] if guarded_list else llm_analysis["recommendations"]
        
        # Apply write-time deduplication to prevent duplicate text propagation
        write_llm_sections(findings)
        
        # Add LLM reasoning to evidence
        findings["evidence"].append(f"LLM Analysis: {llm_analysis['reasoning'][:100]}...")
        
        # Add LLM risk factors to risk indicators
        if llm_analysis["risk_factors"]:
            findings["risk_indicators"].append(f"LLM Identified: {llm_analysis['risk_factors'][:100]}...")
        
        logger.debug(f"[Step {step}.4] ✅ LLM analysis complete - Risk: {findings['risk_score']:.2f}, Confidence: {findings['confidence']:.2f}")
        
        return findings
        
    except Exception as e:
        logger.error(f"[Step {step}.4] ❌ LLM evidence analysis failed: {e}")
        
        # Keep existing 0.0 baseline if LLM fails
        findings["confidence"] = 0.3  # Lower confidence due to analysis failure
        findings["evidence"].append(f"LLM analysis failed: {str(e)}")
        findings["risk_indicators"].append("LLM evidence analysis unavailable")
        
        return findings


def complete_chain_of_thought(process_id: str, findings: Dict[str, Any], domain: str) -> None:
    """Complete chain of thought logging for the agent."""
    cot_logger = get_chain_of_thought_logger()
    
    cot_logger.log_reasoning_step(
        process_id=process_id,
        reasoning_type=ReasoningType.CONCLUSION,
        premise=f"Completed {domain} domain analysis",
        reasoning=f"Analyzed available data sources and identified {len(findings.get('risk_indicators', []))} risk indicators",
        conclusion=f"Risk assessment: {findings.get('risk_score', 0):.2f}, Confidence: {findings.get('confidence', 0):.2f}",
        confidence=findings.get('confidence', 0.5),
        supporting_evidence=[
            {"type": "risk_indicators", "data": findings.get('risk_indicators', [])},
            {"type": "analysis_metrics", "data": findings.get('metrics', {})},
            {"type": "domain_completion", "data": f"{domain} analysis complete"}
        ],
        metadata={"agent": f"{domain}_agent", "risk_score": findings.get('risk_score', 0)}
    )
    
    cot_logger.complete_agent_thinking(
        process_id=process_id,
        final_assessment=findings
    )