#!/usr/bin/env python3
"""
Investigation Flow Processor for Enhanced HTML Report Generator.

Processes investigation flow and phase transitions from activities.
"""

from typing import Dict, List, Any


class InvestigationFlowProcessor:
    """Processes investigation flow data."""

    @staticmethod
    def build_investigation_flow(
        activities: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """Build investigation flow from activities."""
        flow_phases = []
        current_phase = None

        for activity in activities:
            data = activity.get("data", {})
            phase = data.get("phase") or data.get("stage")

            if phase and phase != current_phase:
                flow_phases.append(
                    {
                        "from_phase": current_phase,
                        "to_phase": phase,
                        "timestamp": data.get("timestamp"),
                        "agent": data.get("agent_name"),
                    }
                )
                current_phase = phase

        return flow_phases
