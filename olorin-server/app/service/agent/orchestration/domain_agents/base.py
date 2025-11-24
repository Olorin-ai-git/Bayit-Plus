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
<<<<<<< HEAD
            "risk": "5.2.6"
=======
            "web": "5.2.6",
            "merchant": "5.2.7",
            "risk": "5.2.8"
>>>>>>> 001-modify-analyzer-method
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
<<<<<<< HEAD
        logger.debug(f"[Step {step}.1]   Snowflake data: {'Yes' if snowflake_data else 'No'} ({len(str(snowflake_data))} chars)")
=======
        # Summarize snowflake_data instead of converting to string for character count
        if snowflake_data:
            if isinstance(snowflake_data, dict) and 'results' in snowflake_data:
                results = snowflake_data.get('results', [])
                logger.debug(f"[Step {step}.1]   Snowflake data: Yes ({len(results)} records)")
            elif isinstance(snowflake_data, dict) and 'row_count' in snowflake_data:
                logger.debug(f"[Step {step}.1]   Snowflake data: Yes ({snowflake_data.get('row_count', 0)} rows)")
            else:
                logger.debug(f"[Step {step}.1]   Snowflake data: Yes (data available)")
        else:
            logger.debug(f"[Step {step}.1]   Snowflake data: No")
>>>>>>> 001-modify-analyzer-method
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
<<<<<<< HEAD
        results = []
        
        if snowflake_data:
            if isinstance(snowflake_data, dict) and "results" in snowflake_data:
=======
        import json
        results = []

        if not snowflake_data:
            return results

        # Handle dict type (most common case)
        if isinstance(snowflake_data, dict):
            if "results" in snowflake_data:
>>>>>>> 001-modify-analyzer-method
                results = snowflake_data["results"]
                # Get step prefix for domain
                domain_steps = {
                    "network": "5.2.1", "device": "5.2.2", "location": "5.2.3",
                    "logs": "5.2.4", "authentication": "5.2.5", "risk": "5.2.6"
                }
                step = domain_steps.get(domain.lower(), "5.2.X")
                logger.debug(f"[Step {step}]   📊 Processing {len(results)} Snowflake records for {domain} analysis")
<<<<<<< HEAD
            elif isinstance(snowflake_data, str):
                step = DomainAgentBase._get_domain_step(domain)
                logger.warning(f"[Step {step}] ⚠️ {domain.title()} Agent: Snowflake data is string format, cannot extract structured results")
                logger.debug(f"[Step {step}]   String content preview: {snowflake_data[:200]}...")
            else:
                step = DomainAgentBase._get_domain_step(domain)
                logger.warning(f"[Step {step}] ⚠️ {domain.title()} Agent: Unexpected Snowflake data type: {type(snowflake_data)}")
                logger.debug(f"[Step {step}]   Data content preview: {str(snowflake_data)[:200]}...")
        
=======
            else:
                # Dict but no "results" key - might be a different format, try to extract data
                step = DomainAgentBase._get_domain_step(domain)
                logger.info(f"[Step {step}]   📊 Snowflake data is dict but no 'results' key. Keys: {list(snowflake_data.keys())}")
                # Try to find data in other common keys
                if "data" in snowflake_data:
                    data_value = snowflake_data["data"]
                    if isinstance(data_value, list):
                        results = data_value
                        logger.info(f"[Step {step}]   ✅ Extracted {len(results)} records from 'data' key")
                    else:
                        logger.warning(f"[Step {step}]   ⚠️ 'data' key exists but is not a list (type: {type(data_value).__name__})")
                        results = []
                elif "rows" in snowflake_data:
                    rows_value = snowflake_data["rows"]
                    if isinstance(rows_value, list):
                        results = rows_value
                        logger.info(f"[Step {step}]   ✅ Extracted {len(results)} records from 'rows' key")
                    else:
                        logger.warning(f"[Step {step}]   ⚠️ 'rows' key exists but is not a list (type: {type(rows_value).__name__})")
                        results = []
                else:
                    logger.warning(f"[Step {step}]   ⚠️ No 'results', 'data', or 'rows' key found in snowflake_data")
                    results = []
        # Handle string type (JSON string that needs parsing)
        elif isinstance(snowflake_data, str):
            step = DomainAgentBase._get_domain_step(domain)
            try:
                logger.debug(f"[Step {step}]   📊 Parsing JSON string snowflake_data for {domain} analysis")
                parsed_data = json.loads(snowflake_data)
                if isinstance(parsed_data, dict) and "results" in parsed_data:
                    results = parsed_data["results"]
                    logger.info(f"[Step {step}]   ✅ Successfully parsed {len(results)} Snowflake records from JSON string")
                else:
                    logger.warning(f"[Step {step}]   ⚠️ Parsed JSON but no 'results' key found. Keys: {list(parsed_data.keys()) if isinstance(parsed_data, dict) else 'not a dict'}")
            except (json.JSONDecodeError, Exception) as e:
                logger.error(f"[Step {step}]   ❌ Failed to parse JSON snowflake_data: {str(e)}")
                logger.debug(f"[Step {step}]   String content length: {len(snowflake_data)} chars (preview: {snowflake_data[:50]}...)")
        # Handle unexpected types (should not happen, but log for debugging)
        else:
            step = DomainAgentBase._get_domain_step(domain)
            data_type = type(snowflake_data).__name__
            logger.debug(f"[Step {step}]   ℹ️ {domain.title()} Agent: Snowflake data type is {data_type} (expected dict or str). Attempting to extract results anyway.")
            # Try to extract results even from unexpected types
            if hasattr(snowflake_data, 'get') and callable(getattr(snowflake_data, 'get')):
                # It's dict-like, try to get results
                results = snowflake_data.get("results", snowflake_data.get("data", []))
            elif hasattr(snowflake_data, '__iter__') and not isinstance(snowflake_data, str):
                # It's iterable (like a list), use it directly
                results = list(snowflake_data) if snowflake_data else []
            else:
                logger.warning(f"[Step {step}] ⚠️ {domain.title()} Agent: Cannot extract results from Snowflake data type: {data_type}")
                results = []

>>>>>>> 001-modify-analyzer-method
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
<<<<<<< HEAD
            model_score = r.get("MODEL_SCORE")
=======
            # Support both uppercase (Snowflake) and lowercase (PostgreSQL) column names
            model_score = r.get("MODEL_SCORE") or r.get("model_score")
>>>>>>> 001-modify-analyzer-method
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
<<<<<<< HEAD
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
=======
        # CRITICAL FIX: Handle None risk_score (insufficient data case)
        risk_score = findings.get("risk_score")
        
        # CRITICAL FIX: Only cap risk_score if LLM hasn't set it yet and it's not None
        # LLM scores are already validated to be 0.0-1.0, so don't modify them
        if "llm_risk_score" not in findings and risk_score is not None:
            findings["risk_score"] = min(1.0, risk_score)
        
        # Add confidence based on data availability (simplified for base class)
        # CRITICAL FIX: Only set fallback confidence if LLM hasn't already set it
        # LLM confidence (from analyze_evidence_with_llm) should take priority
        # Check for explicit marker that LLM set confidence, or if confidence exists and wasn't explicitly None
        if not findings.get("_llm_confidence_set", False) and ("confidence" not in findings or findings.get("confidence") is None):
            data_sources = sum([
                1 if snowflake_data else 0,
                len(tool_results) * 0.25  # Each tool contributes 0.25 to confidence
            ])
            findings["confidence"] = min(1.0, data_sources / 4.0)
        # If confidence was already set by LLM (marked with _llm_confidence_set), preserve it
        
        step = DomainAgentBase._get_domain_step(domain)
        # CRITICAL FIX: Handle None risk_score in logging
        if risk_score is not None:
            logger.info(f"[Step {step}] ✅ {domain.title()} analysis complete - Risk: {risk_score:.2f}")
        else:
            logger.info(f"[Step {step}] ✅ {domain.title()} analysis complete - Risk: INSUFFICIENT_DATA")
>>>>>>> 001-modify-analyzer-method
        
        # DEBUG: Analysis completion
        # step already defined above
        logger.debug(f"[Step {step}] {domain.upper()} AGENT COMPLETION DEBUG:")
        logger.debug(f"[Step {step}]   ⏱️  Analysis duration: {analysis_duration:.3f}s")
<<<<<<< HEAD
        logger.debug(f"[Step {step}]   🎯 Risk score calculated: {findings['risk_score']:.2f}")
=======
        if risk_score is not None:
            logger.debug(f"[Step {step}]   🎯 Risk score calculated: {risk_score:.2f}")
        else:
            logger.debug(f"[Step {step}]   🎯 Risk score: INSUFFICIENT_DATA (LLM did not provide score)")
>>>>>>> 001-modify-analyzer-method
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
    
<<<<<<< HEAD
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
    
=======
    CRITICAL: IS_FRAUD_TX removed - must not use ground truth labels during investigation.
    This function now only checks for other fraud indicators (chargebacks, disputes, etc.)

    Returns:
        True if confirmed fraud detected, False otherwise
    """
    # CRITICAL FIX: Parse JSON string to dict if needed
    if isinstance(snowflake_data, str):
        try:
            import json
            snowflake_data = json.loads(snowflake_data)
            logger.debug("📊 _detect_confirmed_fraud: Parsed JSON string snowflake_data to dict")
        except (json.JSONDecodeError, Exception) as e:
            logger.error(f"📊 _detect_confirmed_fraud: Failed to parse JSON snowflake_data: {str(e)}")
            return False

    if not snowflake_data or not isinstance(snowflake_data.get('results'), list):
        return False
    
    # CRITICAL: No fraud indicators can be used during investigation to prevent data leakage
    # This function now returns False - fraud detection must be based on behavioral patterns only
    # All fraud indicator columns (IS_FRAUD_TX, COUNT_DISPUTES, COUNT_FRAUD_ALERTS, etc.) are excluded
>>>>>>> 001-modify-analyzer-method
    return False


def _compute_algorithmic_risk_score(domain: str, findings: Dict[str, Any], snowflake_data: Dict[str, Any]) -> float:
    """
    Compute risk score using validated domain scorers without model score pollution.
<<<<<<< HEAD
    
    CRITICAL FIX: Uses the new domain scorers that exclude MODEL_SCORE and IS_FRAUD_TX 
    to prevent narrative/score contradictions identified in user's investigation runs.
    """
    from app.service.agent.orchestration.domain.logs_scorer import score_logs_domain
    from app.service.agent.orchestration.domain.network_scorer import score_network_domain
    from app.service.agent.orchestration.domain.domain_result import validate_domain
    
=======

    CRITICAL FIX: Uses the new domain scorers that exclude MODEL_SCORE and IS_FRAUD_TX
    to prevent narrative/score contradictions identified in user's investigation runs.
    """
    # CRITICAL FIX: Parse JSON string to dict if needed
    if isinstance(snowflake_data, str):
        try:
            import json
            snowflake_data = json.loads(snowflake_data)
            logger.debug(f"📊 _compute_algorithmic_risk_score ({domain}): Parsed JSON string snowflake_data to dict")
        except (json.JSONDecodeError, Exception) as e:
            logger.error(f"📊 _compute_algorithmic_risk_score ({domain}): Failed to parse JSON snowflake_data: {str(e)}")
            return 0.5  # Return neutral score on parse error

    from app.service.agent.orchestration.domain.logs_scorer import score_logs_domain
    from app.service.agent.orchestration.domain.network_scorer import score_network_domain
    from app.service.agent.orchestration.domain.domain_result import validate_domain

>>>>>>> 001-modify-analyzer-method
    # Get metrics and facts for domain scoring
    metrics = findings.get('metrics', {})
    facts = {}

    # CRITICAL FIX: Define evidence outside conditional blocks to prevent UnboundLocalError
    evidence = findings.get('evidence', [])

    # CRITICAL: DO NOT pass MODEL_SCORE or IS_FRAUD_TX to domain scorers
    # This prevents the cross-domain pollution that causes narrative/score mismatches

    # Use validated domain scorers
    risk_score = None
    domain_result = None
    
    if domain == 'logs':
        # Use logs scorer with LOGS_ALLOWED whitelist (excludes MODEL_SCORE)
        logs_metrics = {
            "transaction_count": metrics.get('transaction_count', 0),
            "failed_transaction_count": metrics.get('failed_transaction_count', 0), 
            "error_count": metrics.get('unique_error_codes', 0),
            "total_transaction_count": metrics.get('transaction_count', 0)
        }
        domain_result = score_logs_domain(logs_metrics, facts)

    elif domain == 'network':
        # Use network scorer with signal requirements

        # Extract network-specific signals
        ti_hits = []
        if any('abuse' in str(e).lower() for e in evidence):
            ti_hits.append({"provider": "AbuseIPDB", "confidence": 75})

        proxy_vpn = any('vpn' in str(e).lower() or 'proxy' in str(e).lower() for e in evidence)
        tor_detected = any('tor' in str(e).lower() for e in evidence)
        asn_risk = any('high-risk' in str(e).lower() and 'asn' in str(e).lower() for e in evidence)
        geo_anomaly = any('geo' in str(e).lower() and ('anomaly' in str(e).lower() or 'suspicious' in str(e).lower()) for e in evidence)

        # Get IP from entity_id or fallback
        ip_str = findings.get('entity_id', '127.0.0.1')

        domain_result = score_network_domain(ti_hits, proxy_vpn, tor_detected, asn_risk, geo_anomaly, ip_str)

    elif domain == 'device':
        # Fallback to deterministic scoring for device domain (not implemented in new scorers yet)
        from .deterministic_scoring import compute_device_risk

        device_consistency = not any('inconsistent' in str(e).lower() for e in evidence)
        fingerprint_anomaly = any('fingerprint' in str(e).lower() and 'anomaly' in str(e).lower() for e in evidence)
        browser_spoofing = any('spoofing' in str(e).lower() for e in evidence)
        device_velocity = metrics.get('unique_device_count', 1)

        # CRITICAL: Pass None for model_score to prevent pollution
        risk_score = compute_device_risk(device_consistency, fingerprint_anomaly, browser_spoofing, device_velocity, "MINIMAL", None)

    elif domain == 'location':
        # Fallback to deterministic scoring for location domain
        from .deterministic_scoring import compute_location_risk

        impossible_travel = any('impossible travel' in str(e).lower() for e in evidence)
        travel_confidence = 0.8 if impossible_travel else 0.0
        location_consistency = not any('inconsistent' in str(e).lower() for e in evidence)
        high_risk_country = any('high-risk' in str(e).lower() and 'country' in str(e).lower() for e in evidence)

        # CRITICAL: Pass None for model_score to prevent pollution
        risk_score = compute_location_risk(impossible_travel, travel_confidence, location_consistency, high_risk_country, "MINIMAL", None)

    elif domain == 'authentication':
        # Fallback to deterministic scoring for authentication domain
        from .deterministic_scoring import compute_authentication_risk

        failed_attempts = metrics.get('max_login_attempts', 0)
        mfa_bypass = any('mfa bypass' in str(e).lower() for e in evidence)
        credential_stuffing = any('credential stuffing' in str(e).lower() for e in evidence)
        session_anomaly = any('session' in str(e).lower() and 'anomaly' in str(e).lower() for e in evidence)
        
        # CRITICAL: Pass None for model_score to prevent pollution
        risk_score = compute_authentication_risk(failed_attempts, mfa_bypass, credential_stuffing, session_anomaly, "MINIMAL", None)
    
    # Extract score from domain result if using new scorers
    if domain_result is not None:
        validate_domain(domain_result)  # Apply validation
        risk_score = domain_result.score
        logger.debug(f"🎯 VALIDATED DOMAIN SCORER for {domain}: score={risk_score}, status={domain_result.status}, signals={len(domain_result.signals)}")
    
<<<<<<< HEAD
    # Fallback if all scoring fails
    if risk_score is None:
        risk_score = 0.2  # Conservative default
=======
    # CRITICAL: No fallback scores - return None if all scoring fails
    # This allows the system to properly handle insufficient data cases
    if risk_score is None:
        logger.debug(f"🧮 DETERMINISTIC RISK SCORE for {domain}: None (insufficient data - NO fallback score)")
        return None
>>>>>>> 001-modify-analyzer-method
    
    logger.debug(f"🧮 DETERMINISTIC RISK SCORE for {domain}: {risk_score:.3f} (NO MODEL_SCORE used)")
    return risk_score


async def analyze_evidence_with_llm(
    domain: str,
<<<<<<< HEAD
    findings: Dict[str, Any], 
    snowflake_data: Dict[str, Any],
=======
    findings: Dict[str, Any],
    snowflake_data: Dict[str, Any],
    tool_results: Dict[str, Any],
>>>>>>> 001-modify-analyzer-method
    entity_type: str,
    entity_id: str
) -> Dict[str, Any]:
    """
<<<<<<< HEAD
    Analyze collected evidence using LLM, with computed risk score as authority.
    LLM must echo the computed score, preventing prompt hacking and overfitting.
    """
    from app.service.agent.evidence_analyzer import get_evidence_analyzer
    
    step = DomainAgentBase._get_domain_step(domain)
    logger.debug(f"[Step {step}.4] 🧠 LLM Evidence Analysis - Analyzing {len(findings.get('evidence', []))} evidence points")
    
    try:
        evidence_analyzer = get_evidence_analyzer()

        # PRIORITY 1: Try LLM-determined risk score first
=======
    Analyze collected evidence using LLM, with ALL tool execution results included.

    CRITICAL: This function now receives tool_results to ensure LLM has access to
    ALL tool execution data, not just evidence that was manually added to findings.

    Args:
        domain: Domain name (network, device, location, logs, authentication)
        findings: Domain findings with evidence and metrics
        snowflake_data: Snowflake query results
        tool_results: ALL tool execution results from state (ADDED for complete aggregation)
        entity_type: Type of entity being analyzed
        entity_id: ID of entity being analyzed

    Returns:
        Updated findings with LLM analysis
    """
    from app.service.agent.evidence_analyzer import get_evidence_analyzer

    step = DomainAgentBase._get_domain_step(domain)
    logger.debug(f"[Step {step}.4] 🧠 LLM Evidence Analysis - Analyzing {len(findings.get('evidence', []))} evidence points")

    # CRITICAL FIX: Ensure tool_results is at least an empty dict (NEVER None)
    if tool_results is None:
        logger.warning(f"[Step {step}.4] ⚠️ tool_results was None, converting to empty dict")
        tool_results = {}

    logger.info(f"[Step {step}.4] 🔧 Tool Results Aggregation - {len(tool_results)} tool results available for LLM analysis")

    # CRITICAL: Verify tool aggregation before LLM invocation
    if tool_results:
        logger.info(f"[Step {step}.4] 📊 Tool Result Keys: {list(tool_results.keys())}")
    else:
        logger.warning(f"[Step {step}.4] ⚠️ No tool results available - LLM will only see Snowflake data and manual evidence")

    try:
        evidence_analyzer = get_evidence_analyzer()

        # PRIORITY 1: Try LLM-determined risk score first with ALL tool results
>>>>>>> 001-modify-analyzer-method
        llm_analysis = await evidence_analyzer.analyze_domain_evidence(
            domain=domain,
            evidence=findings.get('evidence', []),
            metrics=findings.get('metrics', {}),
            snowflake_data=snowflake_data,
<<<<<<< HEAD
=======
            tool_results=tool_results,
>>>>>>> 001-modify-analyzer-method
            entity_type=entity_type,
            entity_id=entity_id
        )

        # Check if LLM provided a valid risk score
        llm_risk_score = llm_analysis.get("risk_score")
<<<<<<< HEAD
        if llm_risk_score is not None and isinstance(llm_risk_score, (int, float)) and 0.0 <= llm_risk_score <= 1.0:
            # Use LLM risk score as primary authority
            findings["risk_score"] = llm_risk_score
            findings["confidence"] = llm_analysis.get("confidence", 0.7)
            logger.debug(f"[Step {step}.4] ✅ Using LLM-determined risk score: {llm_risk_score:.3f}")
        else:
            # FALLBACK: Compute algorithmic risk score when LLM fails
            logger.warning(f"[Step {step}.4] ⚠️ LLM risk score invalid ({llm_risk_score}), attempting algorithmic fallback")
            computed_risk_score = _compute_algorithmic_risk_score(domain, findings, snowflake_data)

            # Validate algorithmic score
            if computed_risk_score is not None and isinstance(computed_risk_score, (int, float)) and 0.0 <= computed_risk_score <= 1.0:
                findings["risk_score"] = computed_risk_score
                findings["confidence"] = llm_analysis.get("confidence", 0.5)
                logger.warning(f"[Step {step}.4] 🔄 Using algorithmic fallback: {computed_risk_score:.3f}")
            else:
                # CRITICAL FAILURE: Both LLM and algorithmic scoring failed
                error_msg = f"CRITICAL: Both LLM (score: {llm_risk_score}) and algorithmic (score: {computed_risk_score}) risk scoring failed for {domain} domain"
                logger.error(f"[Step {step}.4] ❌ {error_msg}")
                raise RuntimeError(error_msg)
=======

        # C2 FIX: Normalize LLM scores from 0-100 to 0-1 range
        if llm_risk_score is not None and isinstance(llm_risk_score, (int, float)):
            original_score = llm_risk_score

            # Detect and normalize 0-100 scale scores to 0-1 scale
            if llm_risk_score > 1.0:
                # Score is in 0-100 range, normalize to 0-1
                llm_risk_score = min(llm_risk_score / 100.0, 1.0)  # Cap at 1.0 for safety
                logger.info(f"[Step {step}.4] 🔄 C2 FIX: Normalized LLM score from {original_score} (0-100 scale) to {llm_risk_score:.3f} (0-1 scale)")
                # Update the llm_analysis dict with normalized score
                llm_analysis["risk_score"] = llm_risk_score
            elif llm_risk_score < 0.0:
                # Negative score - clip to 0
                llm_risk_score = 0.0
                logger.warning(f"[Step {step}.4] ⚠️ C2 FIX: Clipped negative LLM score from {original_score} to 0.0")
                llm_analysis["risk_score"] = llm_risk_score

        # Check if LLM analysis indicates insufficient data
        if llm_analysis.get("risk_score_status") == "INSUFFICIENT_DATA" or llm_analysis.get("status") == "INSUFFICIENT_DATA":
            # LLM did not provide a risk score - mark as insufficient data
            findings["risk_score"] = None
            findings["risk_score_status"] = "INSUFFICIENT_DATA"
            findings["confidence"] = 0.0
            findings["llm_risk_score"] = None
            logger.warning(f"[Step {step}.4] ⚠️ INSUFFICIENT_DATA: LLM did not provide risk score for {domain} domain. Marking as insufficient data instead of using fallback.")
        elif llm_risk_score is not None and isinstance(llm_risk_score, (int, float)) and 0.0 <= llm_risk_score <= 1.0:
            # Use LLM risk score as primary authority - DO NOT MODIFY IT
            # CRITICAL FIX: Store LLM risk score directly without post-processing modifications
            # Post-processing modifications (like risk_multiplier) should NOT override LLM scores
            findings["risk_score"] = llm_risk_score
            
            # CRITICAL FIX: Set confidence from LLM analysis, mark it as LLM-set
            llm_confidence = llm_analysis.get("confidence")
            if llm_confidence is not None:
                findings["confidence"] = llm_confidence
                findings["_llm_confidence_set"] = True  # Marker to prevent overwrite
            else:
                # LLM didn't provide confidence, use default but mark it
                findings["confidence"] = 0.7
                findings["_llm_confidence_set"] = True  # Still mark as set to prevent fallback overwrite
            
            findings["llm_risk_score"] = llm_risk_score  # Store original LLM score for reference
            logger.info(f"[Step {step}.4] ✅ Using LLM-determined risk score: {llm_risk_score:.3f} (stored directly, no modifications)")
        else:
            # CRITICAL: LLM did not provide a valid risk score - mark as insufficient data
            # DO NOT use algorithmic fallback - this is insufficient data, not a computation failure
            findings["risk_score"] = None
            findings["risk_score_status"] = "INSUFFICIENT_DATA"
            findings["confidence"] = 0.0
            findings["llm_risk_score"] = None
            logger.warning(f"[Step {step}.4] ⚠️ INSUFFICIENT_DATA: LLM risk score invalid ({llm_risk_score}) for {domain} domain. Marking as insufficient data instead of using algorithmic fallback.")
>>>>>>> 001-modify-analyzer-method
        
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
        
<<<<<<< HEAD
        # Add LLM reasoning to evidence
        findings["evidence"].append(f"LLM Analysis: {llm_analysis['reasoning'][:100]}...")
        
        # Add LLM risk factors to risk indicators
        if llm_analysis["risk_factors"]:
            findings["risk_indicators"].append(f"LLM Identified: {llm_analysis['risk_factors'][:100]}...")
        
        logger.debug(f"[Step {step}.4] ✅ LLM analysis complete - Risk: {findings['risk_score']:.2f}, Confidence: {findings['confidence']:.2f}")
=======
        # Add LLM reasoning to evidence (if available)
        if llm_analysis.get("reasoning"):
            findings["evidence"].append(f"LLM Analysis: {llm_analysis['reasoning'][:100]}...")
        
        # Add LLM risk factors to risk indicators (if available)
        if llm_analysis.get("risk_factors"):
            findings["risk_indicators"].append(f"LLM Identified: {llm_analysis['risk_factors'][:100]}...")
        
        # Log completion status
        risk_score = findings.get('risk_score')
        confidence = findings.get('confidence', 0.0)
        if risk_score is not None:
            logger.debug(f"[Step {step}.4] ✅ LLM analysis complete - Risk: {risk_score:.2f}, Confidence: {confidence:.2f}")
        else:
            logger.debug(f"[Step {step}.4] ⚠️ LLM analysis complete - Insufficient data (no risk score)")
>>>>>>> 001-modify-analyzer-method
        
        return findings
        
    except Exception as e:
        logger.error(f"[Step {step}.4] ❌ LLM evidence analysis completely failed: {e}")

        # FALLBACK: Use algorithmic scoring when LLM completely fails
        try:
            computed_risk_score = _compute_algorithmic_risk_score(domain, findings, snowflake_data)

            # Validate algorithmic score
            if computed_risk_score is not None and isinstance(computed_risk_score, (int, float)) and 0.0 <= computed_risk_score <= 1.0:
                findings["risk_score"] = computed_risk_score
                findings["confidence"] = 0.3  # Lower confidence due to LLM failure
                findings["evidence"].append(f"LLM analysis failed, using algorithmic fallback: {str(e)}")
                findings["risk_indicators"].append("LLM evidence analysis unavailable - algorithmic score used")
                logger.warning(f"[Step {step}.4] 🔄 LLM completely failed, using algorithmic fallback: {computed_risk_score:.3f}")
                return findings
            else:
                # CRITICAL FAILURE: Both LLM and algorithmic scoring failed
                error_msg = f"CRITICAL: Both LLM (exception: {str(e)}) and algorithmic (score: {computed_risk_score}) risk scoring failed for {domain} domain"
                logger.error(f"[Step {step}.4] ❌ {error_msg}")
                raise RuntimeError(error_msg)
        except Exception as algorithmic_error:
            # CRITICAL FAILURE: Algorithmic scoring also threw an exception
            error_msg = f"CRITICAL: Both LLM (exception: {str(e)}) and algorithmic (exception: {str(algorithmic_error)}) risk scoring failed for {domain} domain"
            logger.error(f"[Step {step}.4] ❌ {error_msg}")
            raise RuntimeError(error_msg)


def complete_chain_of_thought(process_id: str, findings: Dict[str, Any], domain: str) -> None:
    """Complete chain of thought logging for the agent."""
    cot_logger = get_chain_of_thought_logger()
    
<<<<<<< HEAD
=======
    # CRITICAL FIX: Handle None risk_score
    risk_score = findings.get('risk_score')
    risk_score_str = f"{risk_score:.2f}" if risk_score is not None else "INSUFFICIENT_DATA"
    
>>>>>>> 001-modify-analyzer-method
    cot_logger.log_reasoning_step(
        process_id=process_id,
        reasoning_type=ReasoningType.CONCLUSION,
        premise=f"Completed {domain} domain analysis",
        reasoning=f"Analyzed available data sources and identified {len(findings.get('risk_indicators', []))} risk indicators",
<<<<<<< HEAD
        conclusion=f"Risk assessment: {findings.get('risk_score', 0):.2f}, Confidence: {findings.get('confidence', 0):.2f}",
=======
        conclusion=f"Risk assessment: {risk_score_str}, Confidence: {findings.get('confidence', 0):.2f}",
>>>>>>> 001-modify-analyzer-method
        confidence=findings.get('confidence', 0.5),
        supporting_evidence=[
            {"type": "risk_indicators", "data": findings.get('risk_indicators', [])},
            {"type": "analysis_metrics", "data": findings.get('metrics', {})},
            {"type": "domain_completion", "data": f"{domain} analysis complete"}
        ],
<<<<<<< HEAD
        metadata={"agent": f"{domain}_agent", "risk_score": findings.get('risk_score', 0)}
=======
        metadata={"agent": f"{domain}_agent", "risk_score": risk_score if risk_score is not None else 0}
>>>>>>> 001-modify-analyzer-method
    )
    
    cot_logger.complete_agent_thinking(
        process_id=process_id,
        final_assessment=findings
    )