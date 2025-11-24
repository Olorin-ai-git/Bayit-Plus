#!/usr/bin/env python3
"""
Summary generation module.

Generates investigation summaries and key metrics from extracted data.
"""

import logging
import statistics
from typing import Dict, List, Any, Optional
from collections import Counter

from ..data_models import ExtractedData, InvestigationSummary
from ..utils import DataIntegrityChecker

logger = logging.getLogger(__name__)


class SummaryGenerator:
    """Generates investigation summaries from extracted data."""

    def generate_investigation_summary(self, extracted_data: ExtractedData) -> InvestigationSummary:
        """
        Generate investigation summary from extracted data.

        Args:
            extracted_data: Raw extracted data from investigation files

        Returns:
            Complete investigation summary with metrics
        """
<<<<<<< HEAD
        activities = extracted_data.autonomous_activities
=======
        activities = extracted_data.structured_activities
>>>>>>> 001-modify-analyzer-method
        metadata = extracted_data.metadata

        # Basic investigation info
        investigation_id = metadata.get('investigation_id', 'unknown')
        mode = metadata.get('mode', 'unknown')
        scenario = metadata.get('scenario', 'unknown')
        status = metadata.get('status', 'unknown')

        # Calculate metrics
        total_interactions = len(activities)
        duration_seconds = self._calculate_duration(activities)
        llm_calls = self._count_llm_calls(activities)
        tool_executions = self._count_tool_executions(activities)
        total_tokens = self._calculate_total_tokens(activities)
        agent_decisions = self._count_agent_decisions(activities)
        error_count = self._count_errors(activities)

        # Extract agents and tools used
        agents_used = self._extract_agents_used(activities)
        tools_used = self._extract_tools_used(activities)

        # Calculate final risk score
        final_risk_score = self._calculate_final_risk_score(activities)

        # Run data integrity checks
        integrity_checks = DataIntegrityChecker.run_checks(extracted_data)

        return InvestigationSummary(
            investigation_id=investigation_id,
            mode=mode,
            scenario=scenario,
            status=status,
            total_interactions=total_interactions,
            duration_seconds=duration_seconds,
            llm_calls=llm_calls,
            tool_executions=tool_executions,
            total_tokens=total_tokens,
            agent_decisions=agent_decisions,
            error_count=error_count,
            agents_used=agents_used,
            tools_used=tools_used,
            final_risk_score=final_risk_score,
            integrity_checks=integrity_checks
        )

    def _calculate_duration(self, activities: List[Dict[str, Any]]) -> Optional[float]:
        """Calculate investigation duration from timestamps."""
        timestamps = []
        for activity in activities:
            timestamp_str = activity.get('data', {}).get('timestamp')
            if timestamp_str:
                try:
                    from datetime import datetime
                    # Try parsing ISO format timestamp
                    timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                    timestamps.append(timestamp.timestamp())
                except (ValueError, AttributeError):
                    pass

        if len(timestamps) >= 2:
            return max(timestamps) - min(timestamps)
        return None

    def _count_llm_calls(self, activities: List[Dict[str, Any]]) -> int:
        """Count LLM calls in activities."""
        return sum(1 for activity in activities
                  if activity.get('interaction_type') == 'llm_call')

    def _count_tool_executions(self, activities: List[Dict[str, Any]]) -> int:
        """Count tool executions in activities."""
        return sum(1 for activity in activities
                  if activity.get('interaction_type') == 'tool_call')

    def _calculate_total_tokens(self, activities: List[Dict[str, Any]]) -> int:
        """Calculate total tokens used."""
        total_tokens = 0
        for activity in activities:
            if activity.get('interaction_type') == 'llm_call':
                tokens_used = activity.get('data', {}).get('tokens_used', {})
                if isinstance(tokens_used, dict):
                    total_tokens += tokens_used.get('total_tokens', 0)
                elif isinstance(tokens_used, (int, float)):
                    total_tokens += int(tokens_used)
        return total_tokens

    def _count_agent_decisions(self, activities: List[Dict[str, Any]]) -> int:
        """Count agent decisions made."""
        return sum(1 for activity in activities
                  if activity.get('interaction_type') in ['decision', 'agent_decision'])

    def _count_errors(self, activities: List[Dict[str, Any]]) -> int:
        """Count errors in activities."""
        error_count = 0
        for activity in activities:
            data = activity.get('data', {})
            if (data.get('status') == 'error' or
                data.get('error') or
                'error' in str(data.get('response_content', '')).lower()):
                error_count += 1
        return error_count

    def _extract_agents_used(self, activities: List[Dict[str, Any]]) -> List[str]:
        """Extract list of unique agents used."""
        agents = set()
        for activity in activities:
            agent_name = activity.get('data', {}).get('agent_name')
            if agent_name:
                agents.add(agent_name)
        return list(agents)

    def _extract_tools_used(self, activities: List[Dict[str, Any]]) -> List[str]:
        """Extract list of unique tools used."""
        tools = set()
        for activity in activities:
            data = activity.get('data', {})

            # Direct tool calls
            if activity.get('interaction_type') == 'tool_call':
                tool_name = data.get('tool_name')
                if tool_name:
                    tools.add(tool_name)

            # Tools used in LLM calls
            elif activity.get('interaction_type') == 'llm_call':
                tools_used = data.get('tools_used', [])
                if isinstance(tools_used, list):
                    tools.update(tools_used)

        return list(tools)

    def _calculate_final_risk_score(self, activities: List[Dict[str, Any]]) -> Optional[float]:
        """Calculate final risk score from activities."""
        risk_scores = []
        for activity in activities:
            risk_score = activity.get('data', {}).get('risk_score')
            if risk_score is not None:
                try:
                    risk_scores.append(float(risk_score))
                except (ValueError, TypeError):
                    pass

        if risk_scores:
            # Return the last risk score (most recent)
            return risk_scores[-1]
        return None