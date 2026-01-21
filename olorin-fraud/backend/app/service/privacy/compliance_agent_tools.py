"""
Compliance Agent Tools for DPA Enforcement.

Defines tools that the Compliance AI Agent can use to verify and enforce
DPA compliance autonomously.
"""

import os
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from langchain_core.tools import tool

from app.service.logging import get_bridge_logger
from app.service.privacy.audit_logger import get_privacy_audit_logger
from app.service.privacy.data_retention import get_data_retention_manager
from app.service.privacy.dpa_compliance_audit import get_dpa_compliance_auditor
from app.service.privacy.llm_privacy_wrapper import (
    APPROVED_SUBPROCESSORS,
    BLOCKED_PROVIDERS,
)
from app.service.privacy.pii_obfuscator import get_pii_obfuscator

logger = get_bridge_logger(__name__)


@tool
def run_compliance_audit() -> Dict[str, Any]:
    """
    Run a full DPA compliance audit and return results.

    Returns comprehensive audit report including:
    - All compliance check results
    - Personal data inventory
    - Sub-processor verification
    - Summary statistics
    """
    auditor = get_dpa_compliance_auditor()
    report = auditor.run_full_audit()

    return {
        "generated_at": report.generated_at,
        "summary": report.summary,
        "checks": [
            {
                "id": c.check_id,
                "question": c.question,
                "status": c.status.value,
                "evidence": c.evidence,
                "recommendation": c.recommendation,
            }
            for c in report.checks
        ],
        "sub_processors": report.sub_processors,
        "compliant": report.summary.get("non_compliant", 0) == 0,
    }


@tool
def verify_subprocessor(provider_name: str) -> Dict[str, Any]:
    """
    Verify if a specific LLM provider is DPA-approved.

    Args:
        provider_name: Name of the provider to verify (e.g., 'anthropic', 'openai', 'google')

    Returns:
        Verification result with approval status and details
    """
    provider_lower = provider_name.lower()

    is_approved = provider_lower in APPROVED_SUBPROCESSORS
    is_blocked = provider_lower in BLOCKED_PROVIDERS

    result = {
        "provider": provider_name,
        "approved": is_approved,
        "blocked": is_blocked,
        "dpa_section": "Section 6",
        "approved_list": list(APPROVED_SUBPROCESSORS),
        "blocked_list": list(BLOCKED_PROVIDERS),
    }

    if is_blocked:
        result["action_required"] = f"BLOCK all calls to {provider_name} - not DPA approved"
        result["violation"] = True
    elif not is_approved:
        result["action_required"] = f"Review {provider_name} - not in approved list"
        result["violation"] = True
    else:
        result["action_required"] = None
        result["violation"] = False

    logger.info(f"[COMPLIANCE_AGENT] Verified subprocessor {provider_name}: approved={is_approved}")
    return result


@tool
def check_pii_obfuscation_status() -> Dict[str, Any]:
    """
    Check current PII obfuscation configuration and statistics.

    Returns:
        Status of PII obfuscation system including enabled state and stats
    """
    obfuscator = get_pii_obfuscator()
    stats = obfuscator.get_stats()

    enabled = os.getenv("ENABLE_PII_OBFUSCATION", "true").lower() == "true"
    strict_mode = os.getenv("DPA_STRICT_MODE", "true").lower() == "true"

    result = {
        "obfuscation_enabled": enabled,
        "strict_mode": strict_mode,
        "statistics": stats,
        "pii_patterns_active": list(obfuscator.PATTERNS.keys()),
        "pii_fields_monitored": list(obfuscator.PII_FIELD_NAMES),
        "compliant": enabled,
    }

    if not enabled:
        result["violation"] = True
        result["action_required"] = "CRITICAL: Enable PII obfuscation - DPA Section 9.4 violation"
    else:
        result["violation"] = False
        result["action_required"] = None

    return result


@tool
def get_audit_log_summary(days: int = 1) -> Dict[str, Any]:
    """
    Get summary of privacy audit logs for recent period.

    Args:
        days: Number of days to analyze (default 1)

    Returns:
        Summary of audit log activity including transmissions, deletions, violations
    """
    audit_logger = get_privacy_audit_logger()

    summaries = []
    for i in range(days):
        date = (datetime.utcnow() - timedelta(days=i)).strftime("%Y-%m-%d")
        summary = audit_logger.get_audit_summary(date)
        summaries.append(summary)

    total_entries = sum(s.get("entries", 0) for s in summaries)
    total_transmissions = sum(s.get("summary", {}).get("llm_transmissions", 0) for s in summaries)
    total_violations = sum(s.get("summary", {}).get("violations", 0) for s in summaries)

    result = {
        "period_days": days,
        "total_entries": total_entries,
        "llm_transmissions": total_transmissions,
        "violations": total_violations,
        "daily_summaries": summaries,
        "compliant": total_violations == 0,
    }

    if total_violations > 0:
        result["violation"] = True
        result["action_required"] = f"ALERT: {total_violations} compliance violations detected in audit logs"
    else:
        result["violation"] = False
        result["action_required"] = None

    return result


@tool
def check_data_retention_policy() -> Dict[str, Any]:
    """
    Check current data retention policy configuration.

    Returns:
        Data retention policy details including period and deletion capabilities
    """
    retention_manager = get_data_retention_manager()
    policy = retention_manager.get_retention_policy()

    result = {
        "retention_days": policy["retention_period_days"],
        "deletion_sla_days": policy["deletion_sla_days"],
        "deletion_on_request": policy["deletion_on_request"],
        "policy_version": policy["policy_version"],
        "dpa_section": "Section 8",
        "compliant": policy["deletion_on_request"] and policy["retention_period_days"] <= 365,
    }

    if not policy["deletion_on_request"]:
        result["violation"] = True
        result["action_required"] = "Enable deletion on request capability - DPA Section 8"
    elif policy["retention_period_days"] > 365:
        result["violation"] = True
        result["action_required"] = f"Reduce retention period from {policy['retention_period_days']} to ≤365 days"
    else:
        result["violation"] = False
        result["action_required"] = None

    return result


@tool
def log_compliance_violation(
    violation_type: str,
    description: str,
    severity: str,
    affected_component: str,
) -> Dict[str, Any]:
    """
    Log a compliance violation for tracking and remediation.

    Args:
        violation_type: Type of violation (e.g., 'UNAPPROVED_SUBPROCESSOR', 'PII_EXPOSURE')
        description: Detailed description of the violation
        severity: Severity level ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')
        affected_component: Component where violation was detected

    Returns:
        Confirmation of logged violation
    """
    audit_logger = get_privacy_audit_logger()

    # Log as breach if critical
    if severity.upper() == "CRITICAL":
        audit_logger.log_breach_detection(
            breach_type=violation_type,
            affected_entity_hashes=[],
            description=description,
            severity=severity,
        )

    logger.warning(
        f"[COMPLIANCE_VIOLATION] Type: {violation_type}, "
        f"Severity: {severity}, Component: {affected_component}, "
        f"Description: {description}"
    )

    return {
        "logged": True,
        "violation_type": violation_type,
        "severity": severity,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "requires_notification": severity.upper() == "CRITICAL",
        "notification_deadline_hours": 24 if severity.upper() == "CRITICAL" else None,
    }


@tool
def generate_compliance_report() -> Dict[str, Any]:
    """
    Generate a comprehensive DPA compliance report with Annex 1 responses.

    Returns:
        Full compliance report suitable for DPA documentation
    """
    auditor = get_dpa_compliance_auditor()
    report = auditor.run_full_audit()
    responses = auditor.generate_annex1_responses()

    return {
        "report_date": report.generated_at,
        "overall_status": "COMPLIANT" if report.summary.get("non_compliant", 0) == 0 else "NON_COMPLIANT",
        "summary": report.summary,
        "annex1_responses": responses,
        "personal_data_inventory": report.personal_data_inventory,
        "sub_processors": report.sub_processors,
        "recommendations": [
            c.recommendation for c in report.checks if c.recommendation
        ],
    }


# Export all tools for the Compliance Agent
COMPLIANCE_TOOLS = [
    run_compliance_audit,
    verify_subprocessor,
    check_pii_obfuscation_status,
    get_audit_log_summary,
    check_data_retention_policy,
    log_compliance_violation,
    generate_compliance_report,
]
