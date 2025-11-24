"""
Logs Domain Analysis Agent

Analyzes system logs, authentication patterns, and activity timelines for fraud detection.
"""

import time
from typing import Dict, Any, Optional, List

from app.service.logging import get_bridge_logger
from app.service.agent.orchestration.state_schema import InvestigationState, add_domain_findings
from .base import DomainAgentBase, log_agent_handover_complete, complete_chain_of_thought

logger = get_bridge_logger(__name__)


async def logs_agent_node(state: InvestigationState, config: Optional[Dict] = None) -> Dict[str, Any]:
    """
    Logs analysis agent.
    Analyzes system logs, authentication patterns, and activity timelines.
    """
    start_time = time.time()
    logger.info("[Step 5.2.4] 📝 Logs agent analyzing investigation")
    
    # Get relevant data from state
    snowflake_data = state.get("snowflake_data", {})
    tool_results = state.get("tool_results", {})
    entity_id = state["entity_id"]
    entity_type = state["entity_type"]
    investigation_id = state.get('investigation_id', 'unknown')
    
    # Initialize logging and chain of thought
    DomainAgentBase.log_agent_start("logs", entity_type, entity_id, False)
    DomainAgentBase.log_context_analysis(snowflake_data, tool_results, "logs")
    
    process_id = DomainAgentBase.start_chain_of_thought(
        investigation_id=investigation_id,
        agent_name="logs_agent",
        domain="logs",
        entity_type=entity_type,
        entity_id=entity_id,
        task_description="System logs and authentication patterns provide crucial behavioral insights "
                        "for fraud detection. Will analyze: (1) Failed transaction patterns and rejection "
                        "reasons, (2) Rapid-fire transaction sequences, (3) Error code patterns and anomalies, "
                        "(4) Splunk/SumoLogic suspicious activity indicators"
    )
    
    # Initialize logs findings
    logs_findings = DomainAgentBase.initialize_findings("logs")
    
    # Process Snowflake transaction logs
    results = DomainAgentBase.process_snowflake_results(snowflake_data, "logs")
    
    if results:
        # CRITICAL FIX: Apply field whitelisting to prevent cross-domain pollution
        from app.service.agent.orchestration.domain.field_whitelist import (
            filter_domain_fields, assert_no_cross_domain_pollution
        )
        
        # Extract raw metrics from Snowflake results
        raw_metrics = {}
        for record in results:
            if isinstance(record, dict):
                for field_name, field_value in record.items():
                    if field_name not in raw_metrics and field_value is not None:
                        raw_metrics[field_name] = field_value
        
        # Apply whitelist filter - HARD BLOCK on MODEL_SCORE and cross-domain fields
        filtered_metrics = filter_domain_fields("logs", raw_metrics)
        logs_findings["metrics"].update(filtered_metrics)
        
        # REMOVED: process_model_scores call to prevent MODEL_SCORE pollution
        # DomainAgentBase.process_model_scores(results, logs_findings, "logs")
        
        # Analyze failed transaction patterns
        _analyze_failed_transactions(results, logs_findings)
        
        # Analyze rapid-fire transaction patterns
        _analyze_transaction_timing(results, logs_findings)
        
        # Analyze error patterns
        _analyze_error_patterns(results, logs_findings)
    else:
        # Handle case where Snowflake data format is problematic
        if isinstance(snowflake_data, str):
            logs_findings["risk_indicators"].append("Snowflake data in non-structured format")
    
    # Analyze log analysis and activity intelligence
    _analyze_log_intelligence(tool_results, logs_findings)
    
    # Add evidence summary
    logs_findings["evidence_summary"] = {
        "total_evidence_points": len(logs_findings["evidence"]),
        "risk_indicators_found": len(logs_findings["risk_indicators"]),
        "metrics_collected": len(logs_findings["metrics"])
    }
    
    # CRITICAL: Use validated domain scorer with whitelist and 0.25 cap (with ALL tool results)
    from .base import analyze_evidence_with_llm
    logs_findings = await analyze_evidence_with_llm(
        domain="logs",
        findings=logs_findings,
        snowflake_data=snowflake_data,
        tool_results=tool_results,
        entity_type=entity_type,
        entity_id=entity_id
    )
    
    # Finalize findings
    analysis_duration = time.time() - start_time
    DomainAgentBase.finalize_findings(
        logs_findings, snowflake_data, tool_results, analysis_duration, "logs"
    )
    
    # CRITICAL: Assert no cross-domain pollution occurred
    from app.service.agent.orchestration.domain.field_whitelist import assert_no_cross_domain_pollution
    assert_no_cross_domain_pollution(logs_findings, "logs")
    
    # Complete logging
    log_agent_handover_complete("logs", logs_findings)
    complete_chain_of_thought(process_id, logs_findings, "logs")
    
    # Safe risk score formatting
    risk_score = logs_findings.get('risk_score')
    risk_str = f"{risk_score:.2f}" if risk_score is not None else "N/A"
    logger.info(f"[Step 5.2.4] ✅ Logs analysis complete - Risk: {risk_str}")
    
    # Update state with findings
    return add_domain_findings(state, "logs", logs_findings)


def _analyze_failed_transactions(results: list, findings: Dict[str, Any]) -> None:
    """Analyze failed transaction patterns."""
    failed_txs = [r for r in results if r.get("NSURE_LAST_DECISION") == "reject"]
    total_txs = len(results)
    
    findings["metrics"]["failed_transaction_count"] = len(failed_txs)
    findings["metrics"]["total_transaction_count"] = total_txs
    findings["metrics"]["failure_rate"] = len(failed_txs) / total_txs if total_txs > 0 else 0
    
    findings["evidence"].append(f"Transaction failures: {len(failed_txs)} out of {total_txs} transactions")
    
    if len(failed_txs) > 5:
        findings["risk_indicators"].append(f"High number of rejected transactions: {len(failed_txs)}")
        # CRITICAL FIX: Only modify risk_score if LLM hasn't set it yet AND risk_score is not None
        if "llm_risk_score" not in findings:
            current_score = findings.get("risk_score")
            if current_score is not None:
                findings["risk_score"] = max(current_score, 0.3)
        findings["evidence"].append(f"SUSPICIOUS: {len(failed_txs)} rejected transactions indicates potential fraud attempts")
    
    # Analyze rejection reasons
    rejection_reasons = [tx.get("REJECTION_REASON") for tx in failed_txs if tx.get("REJECTION_REASON")]
    if rejection_reasons:
        unique_reasons = set(rejection_reasons)
        findings["analysis"]["rejection_reasons"] = list(unique_reasons)
        findings["metrics"]["unique_rejection_reasons"] = len(unique_reasons)
        findings["evidence"].append(f"Rejection reasons: {list(unique_reasons)}")


def _analyze_transaction_timing(results: list, findings: Dict[str, Any]) -> None:
    """Analyze transaction timing patterns for rapid-fire detection."""
    tx_times = [r.get("TX_DATETIME") for r in results if r.get("TX_DATETIME")]
    
    findings["metrics"]["transaction_count"] = len(tx_times)
    findings["evidence"].append(f"Transaction frequency: {len(tx_times)} transactions analyzed")
    
    if len(tx_times) > 10:
        # In production, would calculate actual time deltas between transactions
        findings["risk_indicators"].append("Potential rapid-fire transaction pattern")
        # CRITICAL FIX: Only modify risk_score if LLM hasn't set it yet AND risk_score is not None
        if "llm_risk_score" not in findings:
            current_score = findings.get("risk_score")
            if current_score is not None:
                findings["risk_score"] = max(current_score, 0.2)
        findings["evidence"].append(f"SUSPICIOUS: {len(tx_times)} transactions may indicate automated behavior")
    
    findings["analysis"]["transaction_timeline"] = tx_times[:10]  # Store first 10 for analysis


def _analyze_error_patterns(results: list, findings: Dict[str, Any]) -> None:
    """Analyze error code patterns."""
    error_codes = [r.get("ERROR_CODE") for r in results if r.get("ERROR_CODE")]
    unique_errors = set(error_codes)
    
    findings["metrics"]["error_count"] = len(error_codes)
    findings["metrics"]["unique_error_codes"] = len(unique_errors)
    findings["analysis"]["error_codes"] = list(unique_errors)
    
    if error_codes:
        findings["evidence"].append(f"Error patterns: {len(error_codes)} errors with {len(unique_errors)} unique codes")
    
    if len(error_codes) > 3:
        findings["risk_indicators"].append(f"Multiple error codes detected: {len(unique_errors)}")
        # CRITICAL FIX: Only modify risk_score if LLM hasn't set it yet AND risk_score is not None
        if "llm_risk_score" not in findings:
            current_score = findings.get("risk_score")
            if current_score is not None:
                findings["risk_score"] = max(current_score, 0.1)
        findings["evidence"].append(f"SUSPICIOUS: {len(unique_errors)} different error types may indicate probing behavior")


def _analyze_log_intelligence(tool_results: Dict[str, Any], findings: Dict[str, Any]) -> None:
    """Analyze log analysis and activity intelligence from any tool that provides behavioral data."""
    
    logger.debug(f"[Step 5.2.4.2] 🔍 Category-based log analysis: Processing {len(tool_results)} tools")
    
    # Process ALL tool results, not just hardcoded ones
    for tool_name, result in tool_results.items():
        if not isinstance(result, dict):
            logger.debug(f"[Step 5.2.4.2]   ⏭️  Skipping {tool_name}: non-dict result")
            continue
            
        # Look for log intelligence indicators across any tool
        log_signals = _extract_log_signals(tool_name, result)
        
        if log_signals:
            logger.debug(f"[Step 5.2.4.2]   ✅ {tool_name}: Found {len(log_signals)} log signals")
            _process_log_signals(tool_name, log_signals, findings)
        else:
            logger.debug(f"[Step 5.2.4.2]   ➖ {tool_name}: No log intelligence signals detected")


def _extract_log_signals(tool_name: str, result: Dict[str, Any]) -> Dict[str, Any]:
    """Extract log intelligence signals from any tool result."""
    signals = {}
    
    logger.debug(f"[Step 5.2.4.2] 🔍 Extracting log signals from {tool_name} with {len(result)} top-level fields")
    
    # Common log analysis fields (tools may use different names)
    log_indicators = [
        "suspicious_activity", "anomaly", "alert", "violation", "breach",
        "failed_attempts", "rapid_fire", "bulk_activity", "automation",
        "session_anomaly", "pattern_violation", "behavioral_risk"
    ]
    
    # Log score fields
    log_score_indicators = [
        "alert_count", "anomaly_score", "activity_score", "behavioral_score",
        "session_risk_score", "pattern_score", "violation_count"
    ]
    
    # Extract boolean log indicators
    for indicator in log_indicators:
        if indicator in result:
            signals[f"log_{indicator}"] = result[indicator]
            logger.debug(f"[Step 5.2.4.2]     → Found log indicator: {indicator} = {result[indicator]}")
    
    # Extract numeric log scores
    for indicator in log_score_indicators:
        if indicator in result:
            try:
                signals[f"score_{indicator}"] = float(result[indicator])
                logger.debug(f"[Step 5.2.4.2]     → Found log score: {indicator} = {result[indicator]}")
            except (ValueError, TypeError):
                logger.debug(f"[Step 5.2.4.2]     → Skipped non-numeric score: {indicator} = {result[indicator]}")
                pass
    
    # Look for nested log data (many tools nest results)
    nested_count = 0
    for key, value in result.items():
        if isinstance(value, dict):
            nested_signals = _extract_log_signals(f"{tool_name}_{key}", value)
            signals.update(nested_signals)
            if nested_signals:
                nested_count += 1
        elif isinstance(value, list):
            # Handle arrays of log data
            for i, item in enumerate(value[:5]):  # Limit to first 5 items
                if isinstance(item, dict):
                    nested_signals = _extract_log_signals(f"{tool_name}_{key}_{i}", item)
                    signals.update(nested_signals)
                    if nested_signals:
                        nested_count += 1
    
    if nested_count > 0:
        logger.debug(f"[Step 5.2.4.2]     → Processed {nested_count} nested structures")
    
    logger.debug(f"[Step 5.2.4.2] ✅ Extracted {len(signals)} log signals from {tool_name}")
    return signals


def _process_log_signals(tool_name: str, signals: Dict[str, Any], findings: Dict[str, Any]) -> None:
    """Process extracted log signals to adjust risk score."""
    
    logger.debug(f"[Step 5.2.4.3] 🔍 Processing {len(signals)} log signals from {tool_name}")
    
    # Calculate log risk assessment from all signals
    log_risk_level = 0.0
    evidence_count = 0
    
    # Process boolean log indicators
    for key, value in signals.items():
        if key.startswith("log_") and value:
            if value is True or str(value).lower() in ["true", "yes", "1", "suspicious", "anomaly", "violation"]:
                log_risk_level += 0.2
                evidence_count += 1
                findings["evidence"].append(f"{tool_name}: {key} = {value}")
    
    # Process numeric scores
    for key, value in signals.items():
        if key.startswith("score_") and isinstance(value, (int, float)):
            # Normalize different score scales to 0-1 range
            normalized_score = _normalize_log_score(key, value)
            if normalized_score > 0.6:  # High log risk
                log_risk_level += normalized_score * 0.25
                evidence_count += 1
                findings["evidence"].append(f"{tool_name}: {key} = {value} (normalized: {normalized_score:.2f})")
            elif normalized_score < 0.2:  # Low log risk (normal activity)
                log_risk_level -= (0.2 - normalized_score) * 0.15
                findings["evidence"].append(f"{tool_name}: Normal log activity {key} = {value}")
    
    # CRITICAL FIX: Do NOT modify LLM risk score after LLM analysis
    # Only apply adjustments BEFORE LLM analysis (during evidence collection)
    if "llm_risk_score" in findings:
        # LLM has already analyzed - do NOT modify its score
        logger.debug(f"[Step 5.2.4.3]   ℹ️ LLM risk score already set ({findings.get('llm_risk_score', 'N/A')}), skipping log risk adjustments")
        # Still add indicators to evidence, but don't modify score
        if log_risk_level > 0.4:
            findings["risk_indicators"].append(f"{tool_name}: Suspicious log activity detected (level: {log_risk_level:.2f})")
        elif log_risk_level < -0.1:
            findings["evidence"].append(f"{tool_name}: Log activity appears normal (level: {log_risk_level:.2f})")
    else:
        # Pre-LLM analysis: Apply risk adjustment based on log assessment
        # CRITICAL: Only modify risk_score if it exists (no fallback scores)
        current_score = findings.get("risk_score")
        if current_score is not None:
            if log_risk_level > 0.4:
                # High log risk detected - increase risk
                risk_multiplier = 1.0 + min(0.1, log_risk_level * 0.06)
                findings["risk_score"] = min(1.0, current_score * risk_multiplier)
                findings["risk_indicators"].append(f"{tool_name}: Suspicious log activity detected (level: {log_risk_level:.2f})")
            elif log_risk_level < -0.1:
                # Normal log activity - reduce risk
                risk_multiplier = 1.0 + max(-0.05, log_risk_level * 0.1)  # log_risk_level is negative
                findings["risk_score"] = max(0.1, current_score * risk_multiplier)
                findings["evidence"].append(f"{tool_name}: Log activity appears normal (level: {log_risk_level:.2f})")
    
    # Store aggregated metrics
    if evidence_count > 0:
        findings["metrics"][f"{tool_name}_log_risk_level"] = log_risk_level
        findings["metrics"][f"{tool_name}_evidence_count"] = evidence_count
        logger.debug(f"[Step 5.2.4.3]   ✅ {tool_name}: Processed {evidence_count} log signals, risk level: {log_risk_level:.2f}")
    else:
        logger.debug(f"[Step 5.2.4.3]   ➖ {tool_name}: No actionable log signals found")


def _normalize_log_score(score_type: str, value: float) -> float:
    """Normalize different log score scales to 0-1 range."""
    
    # Common score ranges for different tools
    if "100" in str(value) or value > 10:
        # Likely 0-100 scale
        return min(1.0, max(0.0, value / 100.0))
    elif value > 1.0:
        # Likely 0-10 scale or similar
        return min(1.0, max(0.0, value / 10.0))
    else:
        # Likely already 0-1 scale
        return min(1.0, max(0.0, value))