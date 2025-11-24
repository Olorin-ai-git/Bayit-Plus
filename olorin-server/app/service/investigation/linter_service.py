"""
Linter Service

Quality gates and linter rules for investigation data consistency.
Validates risk scores, tool usage, and required fields.

Constitutional Compliance:
- No hardcoded values (all configurable)
- Complete implementation with all linter rules
- Configurable severity levels
"""

from typing import Dict, Any, List, Optional, Literal
from enum import Enum

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class LinterSeverity(str, Enum):
    """Linter rule severity levels"""
    WARN = "warn"
    FAIL = "fail"


class LinterIssue:
    """Represents a linter issue found during validation"""
    
    def __init__(
        self,
        rule_name: str,
        severity: LinterSeverity,
        message: str,
        resource_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        self.rule_name = rule_name
        self.severity = severity
        self.message = message
        self.resource_id = resource_id
        self.details = details or {}
    
    def __repr__(self):
        return f"LinterIssue(rule={self.rule_name}, severity={self.severity.value}, message={self.message})"


class LinterService:
    """
    Service for validating investigation data consistency.
    
    Implements quality gates and linter rules:
    1. Risk score consistency
    2. Tool usage validation
    3. End time check
    """
    
    def __init__(
        self,
        rule_severities: Optional[Dict[str, LinterSeverity]] = None
    ):
        """
        Initialize linter service.
        
        Args:
            rule_severities: Optional dictionary mapping rule names to severity levels.
                           Defaults to FAIL for all rules.
        """
        self.rule_severities = rule_severities or {
            "risk_score_consistency": LinterSeverity.FAIL,
            "tool_usage_validation": LinterSeverity.FAIL,
            "end_time_check": LinterSeverity.FAIL
        }
    
    def lint_investigation(
        self,
        investigation_data: Dict[str, Any],
        investigation_id: Optional[str] = None
    ) -> List[LinterIssue]:
        """
        Lint investigation data for consistency issues.
        
        Args:
            investigation_data: Investigation state dictionary
            investigation_id: Optional investigation ID for error reporting
            
        Returns:
            List of LinterIssue objects found
        """
        issues = []
        
        # Rule 1: Risk score consistency
        issues.extend(self._check_risk_score_consistency(investigation_data, investigation_id))
        
        # Rule 2: Tool usage validation
        issues.extend(self._check_tool_usage_validation(investigation_data, investigation_id))
        
        # Rule 3: End time check
        issues.extend(self._check_end_time(investigation_data, investigation_id))
        
        return issues
    
    def _check_risk_score_consistency(
        self,
        data: Dict[str, Any],
        investigation_id: Optional[str] = None
    ) -> List[LinterIssue]:
        """
        Check that state.risk_score == final_risk (fail if inconsistent).
        
        Args:
            data: Investigation state dictionary
            investigation_id: Optional investigation ID
            
        Returns:
            List of LinterIssue objects
        """
        issues = []
        rule_name = "risk_score_consistency"
        severity = self.rule_severities.get(rule_name, LinterSeverity.FAIL)
        
        # Extract risk scores
        state_risk_score = data.get("risk_score")
        final_risk_score = data.get("final_risk_score") or data.get("overall_risk_score")
        
        # Check domain findings for final risk
        domain_findings = data.get("domain_findings", {})
        if isinstance(domain_findings, dict):
            risk_findings = domain_findings.get("risk", {})
            if isinstance(risk_findings, dict):
                risk_score_from_domain = risk_findings.get("risk_score")
                if risk_score_from_domain is not None and final_risk_score is None:
                    final_risk_score = risk_score_from_domain
        
        # Both None is acceptable (investigation may not have risk score yet)
        if state_risk_score is None and final_risk_score is None:
            return issues
        
        # One None but not the other is inconsistent
        if state_risk_score is None and final_risk_score is not None:
            issues.append(LinterIssue(
                rule_name=rule_name,
                severity=severity,
                message=f"Risk score inconsistency: state.risk_score is None but final_risk_score={final_risk_score}",
                resource_id=investigation_id,
                details={
                    "state_risk_score": state_risk_score,
                    "final_risk_score": final_risk_score
                }
            ))
            return issues
        
        if state_risk_score is not None and final_risk_score is None:
            issues.append(LinterIssue(
                rule_name=rule_name,
                severity=severity,
                message=f"Risk score inconsistency: state.risk_score={state_risk_score} but final_risk_score is None",
                resource_id=investigation_id,
                details={
                    "state_risk_score": state_risk_score,
                    "final_risk_score": final_risk_score
                }
            ))
            return issues
        
        # Both present - check if they match (allowing small floating point differences)
        if abs(float(state_risk_score) - float(final_risk_score)) > 0.001:
            issues.append(LinterIssue(
                rule_name=rule_name,
                severity=severity,
                message=f"Risk score inconsistency: state.risk_score={state_risk_score} != final_risk_score={final_risk_score}",
                resource_id=investigation_id,
                details={
                    "state_risk_score": state_risk_score,
                    "final_risk_score": final_risk_score,
                    "difference": abs(float(state_risk_score) - float(final_risk_score))
                }
            ))
        
        return issues
    
    def _check_tool_usage_validation(
        self,
        data: Dict[str, Any],
        investigation_id: Optional[str] = None
    ) -> List[LinterIssue]:
        """
        Check that tools_used > 0 implies len(tool_results) > 0 (fail if empty).
        
        Args:
            data: Investigation state dictionary
            investigation_id: Optional investigation ID
            
        Returns:
            List of LinterIssue objects
        """
        issues = []
        rule_name = "tool_usage_validation"
        severity = self.rule_severities.get(rule_name, LinterSeverity.FAIL)
        
        # Extract tool usage information
        tools_used = data.get("tools_used", 0)
        tool_results = data.get("tool_results", [])
        
        # Check if tools_used > 0 but tool_results is empty
        if tools_used > 0 and (not tool_results or len(tool_results) == 0):
            issues.append(LinterIssue(
                rule_name=rule_name,
                severity=severity,
                message=f"Tool usage validation failed: tools_used={tools_used} but tool_results is empty",
                resource_id=investigation_id,
                details={
                    "tools_used": tools_used,
                    "tool_results_count": len(tool_results) if tool_results else 0
                }
            ))
        
        return issues
    
    def _check_end_time(
        self,
        data: Dict[str, Any],
        investigation_id: Optional[str] = None
    ) -> List[LinterIssue]:
        """
        Check that end_time is present before report finalize (fail if missing).
        
        Args:
            data: Investigation state dictionary
            investigation_id: Optional investigation ID
            
        Returns:
            List of LinterIssue objects
        """
        issues = []
        rule_name = "end_time_check"
        severity = self.rule_severities.get(rule_name, LinterSeverity.FAIL)
        
        # Check if investigation is completed
        status = data.get("status", "").upper()
        if status not in ("COMPLETED", "COMPLETE"):
            # Not completed yet, end_time not required
            return issues
        
        # Check for end_time in various locations
        end_time = (
            data.get("end_time") or
            data.get("completed_at") or
            data.get("finished_at")
        )
        
        # Check domain findings for timing
        domain_findings = data.get("domain_findings", {})
        if isinstance(domain_findings, dict):
            timing = domain_findings.get("timing", {})
            if isinstance(timing, dict):
                end_time = end_time or timing.get("end_time") or timing.get("end")
        
        if not end_time:
            issues.append(LinterIssue(
                rule_name=rule_name,
                severity=severity,
                message="End time check failed: end_time is missing for completed investigation",
                resource_id=investigation_id,
                details={
                    "status": status,
                    "has_end_time": False
                }
            ))
        
        return issues
    
    def should_block_report_generation(self, issues: List[LinterIssue]) -> bool:
        """
        Check if linter issues should block report generation.
        
        Args:
            issues: List of linter issues
            
        Returns:
            True if any FAIL severity issues exist, False otherwise
        """
        return any(issue.severity == LinterSeverity.FAIL for issue in issues)
    
    def format_issues_summary(self, issues: List[LinterIssue]) -> str:
        """
        Format linter issues as a summary string.
        
        Args:
            issues: List of linter issues
            
        Returns:
            Formatted summary string
        """
        if not issues:
            return "✅ No linter issues found"
        
        fail_count = sum(1 for issue in issues if issue.severity == LinterSeverity.FAIL)
        warn_count = sum(1 for issue in issues if issue.severity == LinterSeverity.WARN)
        
        summary = f"Found {len(issues)} linter issue(s): {fail_count} FAIL, {warn_count} WARN\n"
        
        for issue in issues:
            severity_marker = "❌" if issue.severity == LinterSeverity.FAIL else "⚠️"
            summary += f"  {severity_marker} [{issue.rule_name}] {issue.message}\n"
        
        return summary


# Global linter service instance
_linter_instance: Optional[LinterService] = None


def get_linter_service() -> LinterService:
    """Get the global linter service instance."""
    global _linter_instance
    if _linter_instance is None:
        _linter_instance = LinterService()
    return _linter_instance

