"""
Logs Domain Analysis Agent

Analyzes system logs, authentication patterns, and activity timelines for fraud detection.
"""

import time
from typing import Dict, Any, List

from app.service.logging import get_bridge_logger
from app.service.agent.orchestration.state_schema import InvestigationState, add_domain_findings
from .base import DomainAgentBase, log_agent_handover_complete, complete_chain_of_thought

logger = get_bridge_logger(__name__)


async def logs_agent_node(state: InvestigationState) -> Dict[str, Any]:
    """
    Logs analysis agent.
    Analyzes system logs, authentication patterns, and activity timelines.
    """
    start_time = time.time()
    logger.info("📝 Logs agent analyzing investigation")
    
    # Get relevant data from state
    snowflake_data = state.get("snowflake_data", {})
    tool_results = state.get("tool_results", {})
    entity_id = state["entity_id"]
    entity_type = state["entity_type"]
    investigation_id = state.get('investigation_id', 'unknown')
    
    # Initialize logging and chain of thought
    DomainAgentBase.log_agent_start("logs", entity_type, entity_id, False)
    DomainAgentBase.log_context_analysis(snowflake_data, tool_results)
    
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
        # Process MODEL_SCORE
        DomainAgentBase.process_model_scores(results, logs_findings, "logs")
        
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
    
    # Analyze log analysis tool results
    _analyze_log_tools(tool_results, logs_findings)
    
    # Add evidence summary
    logs_findings["evidence_summary"] = {
        "total_evidence_points": len(logs_findings["evidence"]),
        "risk_indicators_found": len(logs_findings["risk_indicators"]),
        "metrics_collected": len(logs_findings["metrics"])
    }
    
    # Finalize findings
    analysis_duration = time.time() - start_time
    DomainAgentBase.finalize_findings(
        logs_findings, snowflake_data, tool_results, analysis_duration, "logs"
    )
    
    # Complete logging
    log_agent_handover_complete("logs", logs_findings)
    complete_chain_of_thought(process_id, logs_findings, "logs")
    
    logger.info(f"✅ Logs analysis complete - Risk: {logs_findings['risk_score']:.2f}")
    
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
        findings["risk_score"] = max(findings["risk_score"], 0.3)
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
        findings["risk_score"] = max(findings["risk_score"], 0.2)
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
        findings["risk_score"] = max(findings["risk_score"], 0.1)
        findings["evidence"].append(f"SUSPICIOUS: {len(unique_errors)} different error types may indicate probing behavior")


def _analyze_log_tools(tool_results: Dict[str, Any], findings: Dict[str, Any]) -> None:
    """Analyze results from log analysis tools (Splunk, SumoLogic, etc.)."""
    log_tools = ["splunk_tool", "sumologic_tool", "elasticsearch_tool"]
    
    for tool_name in log_tools:
        if tool_name in tool_results:
            result = tool_results[tool_name]
            if isinstance(result, dict):
                suspicious_activity = result.get("suspicious_activity", False)
                alert_count = result.get("alert_count", 0)
                
                if suspicious_activity or alert_count > 0:
                    findings["risk_indicators"].append(f"{tool_name}: Suspicious activity detected")
                    findings["risk_score"] = max(findings["risk_score"], 0.2)
                    findings["evidence"].append(
                        f"Log analysis alert from {tool_name}: "
                        f"suspicious={suspicious_activity}, alerts={alert_count}"
                    )
                
                # Store metrics
                findings["metrics"][f"{tool_name}_suspicious"] = suspicious_activity
                findings["metrics"][f"{tool_name}_alert_count"] = alert_count