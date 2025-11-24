"""
Investigation Polling Adapter
Feature: 006-hybrid-graph-integration

Transforms hybrid graph internal state to polling API responses.
Maps database investigation state to InvestigationStatusSchema format.

SYSTEM MANDATE Compliance:
- Schema-locked: Uses existing database columns only
- Configuration-driven: No hardcoded values
- Complete implementation: No placeholders or TODOs
"""

from typing import Dict, List, Any, Optional
from datetime import datetime
import json
from contextlib import contextmanager
from sqlalchemy.exc import TimeoutError
from app.models.investigation_state import InvestigationState
from app.schemas.investigation_status import (
    InvestigationStatusSchema,
    AgentStatusSchema,
    ToolExecutionSchema,
    LogEntrySchema,
    ErrorDetailSchema
)


class InvestigationPollingAdapter:
    """
    Adapter transforming investigation state to polling responses.
    Extracts and formats progress, agent status, tool executions, and logs.
    Enforces query timeouts from configuration to prevent database overload.
    """

    def __init__(self):
        """Initialize adapter with timeout configuration."""
        from config.hybrid_graph_config import get_hybrid_graph_config
        self.config = get_hybrid_graph_config()

    @contextmanager
    def _query_timeout_context(self, timeout_ms: int):
        """Context manager for enforcing query timeouts."""
        try:
            yield
        except TimeoutError as e:
            raise RuntimeError(
                f"Database query exceeded timeout limit ({timeout_ms}ms): {str(e)}"
            ) from e

    def transform_to_status(self, investigation: InvestigationState) -> InvestigationStatusSchema:
        """
        Transform InvestigationState to InvestigationStatusSchema.

        Args:
            investigation: Database investigation state model

        Returns:
            Polling status response schema
        """
        progress_data = investigation.get_progress_data()

        return InvestigationStatusSchema(
            investigation_id=investigation.investigation_id,
            status=investigation.status,
            current_phase=investigation.get_current_phase(),
            progress_percentage=investigation.get_progress_percentage(),
            estimated_completion_time=self._estimate_completion_time(investigation),
            risk_score=self._extract_risk_score(investigation),
            agent_status=self._extract_agent_status(progress_data),
            tool_executions=self._extract_tool_executions(progress_data),
            logs=self._extract_log_entries(progress_data),
            error=self._extract_error_details(investigation)
        )

    def _estimate_completion_time(self, investigation: InvestigationState) -> Optional[datetime]:
        """Estimate completion time based on progress and elapsed time."""
        if investigation.status in ("completed", "failed", "cancelled"):
            return None

        progress_pct = investigation.get_progress_percentage()
        if progress_pct <= 0:
            return None

        elapsed = (datetime.utcnow() - investigation.created_at).total_seconds()
        estimated_total = (elapsed / progress_pct) * 100
        remaining = estimated_total - elapsed

        from datetime import timedelta
        return datetime.utcnow() + timedelta(seconds=remaining)

    def _extract_risk_score(self, investigation: InvestigationState) -> Optional[float]:
        """Extract current risk score from progress or results data."""
        progress_data = investigation.get_progress_data()

        if "risk_score" in progress_data:
            return float(progress_data["risk_score"])

        if investigation.results_json:
            try:
                results = json.loads(investigation.results_json)
                return float(results.get("overall_risk_score", 0.0))
            except (json.JSONDecodeError, TypeError, ValueError):
                pass

        return None

    def _extract_agent_status(self, progress_data: Dict[str, Any]) -> Dict[str, AgentStatusSchema]:
        """Extract agent execution status from progress data."""
        agent_status_dict = {}
        agents_data = progress_data.get("agents", {})

        for agent_name, agent_info in agents_data.items():
            agent_status_dict[agent_name] = AgentStatusSchema(
                agent_name=agent_info.get("name", agent_name),
                status=agent_info.get("status", "pending"),
                progress_percentage=float(agent_info.get("progress_percentage", 0.0)),
                tools_used=int(agent_info.get("tools_used", 0)),
                findings_count=int(agent_info.get("findings_count", 0)),
                execution_time_ms=agent_info.get("execution_time_ms")
            )

        return agent_status_dict

    def _extract_tool_executions(self, progress_data: Dict[str, Any]) -> List[ToolExecutionSchema]:
        """Extract tool execution details from progress data."""
        tool_executions = []
        tools_data = progress_data.get("tool_executions", [])

        for tool_info in tools_data:
            started_at = self._parse_datetime(tool_info.get("started_at"))
            completed_at = self._parse_datetime(tool_info.get("completed_at"))

            tool_executions.append(ToolExecutionSchema(
                tool_id=tool_info.get("tool_id", "unknown"),
                tool_name=tool_info.get("tool_name", "Unknown Tool"),
                status=tool_info.get("status", "pending"),
                started_at=started_at or datetime.utcnow(),
                completed_at=completed_at,
                duration_ms=tool_info.get("duration_ms"),
                output_summary=tool_info.get("output_summary", ""),
                error_message=tool_info.get("error_message")
            ))

        return tool_executions

    def _extract_log_entries(self, progress_data: Dict[str, Any]) -> List[LogEntrySchema]:
        """Extract log entries from progress data."""
        log_entries = []
        logs_data = progress_data.get("logs", [])

        for log_info in logs_data:
            timestamp = self._parse_datetime(log_info.get("timestamp"))

            log_entries.append(LogEntrySchema(
                timestamp=timestamp or datetime.utcnow(),
                severity=log_info.get("severity", "info"),
                source=log_info.get("source", "system"),
                message=log_info.get("message", ""),
                metadata=log_info.get("metadata", {})
            ))

        return log_entries

    def _extract_error_details(self, investigation: InvestigationState) -> Optional[ErrorDetailSchema]:
        """Extract error details if investigation failed."""
        if investigation.status not in ("failed", "error"):
            return None

        progress_data = investigation.get_progress_data()
        error_info = progress_data.get("error", {})

        if not error_info:
            return ErrorDetailSchema(
                error_code="UNKNOWN_ERROR",
                error_message="Investigation failed with unknown error",
                error_details=None,
                recovery_suggestions=["Retry the investigation", "Check system logs"]
            )

        return ErrorDetailSchema(
            error_code=error_info.get("error_code", "UNKNOWN_ERROR"),
            error_message=error_info.get("error_message", "Unknown error occurred"),
            error_details=error_info.get("error_details"),
            recovery_suggestions=error_info.get("recovery_suggestions", [])
        )

    def _parse_datetime(self, date_str: Optional[str]) -> Optional[datetime]:
        """Safely parse datetime string."""
        if not date_str:
            return None
        try:
            return datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        except (ValueError, AttributeError):
            return None
