"""
Journey Tracking Logger Integration

Integrates journey tracking with unified investigation folder structure.
Writes journey data to standardized journey_tracking.json files.
"""

import json
import logging
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from .investigation_folder_manager import InvestigationMode, get_folder_manager

logger = logging.getLogger(__name__)


@dataclass
class JourneyEntry:
    """Single journey tracking entry"""

    timestamp: str
    event_type: str
    node_name: str
    data: Dict[str, Any]
    duration_ms: Optional[int] = None


class JourneyTracker:
    """
    Tracks investigation journey and state transitions.

    Integrates with unified investigation folder structure to maintain
    comprehensive journey logs in standardized locations.
    """

    def __init__(self):
        self.folder_manager = get_folder_manager()
        self._journey_data: Dict[str, Dict[str, Any]] = {}

    def start_journey_tracking(
        self, investigation_id: str, initial_state: Dict[str, Any] = None
    ) -> None:
        """
        Start journey tracking for an investigation.

        Args:
            investigation_id: Investigation identifier
            initial_state: Initial investigation state
        """
        timestamp = datetime.now(timezone.utc).isoformat()

        # Initialize journey data structure
        journey_data = {
            "investigation_id": investigation_id,
            "start_timestamp": timestamp,
            "end_timestamp": None,
            "status": "started",
            "node_executions": [],
            "state_transitions": [],
            "agent_coordinations": [],
            "final_state": initial_state or {},
        }

        self._journey_data[investigation_id] = journey_data
        self._write_journey_file(investigation_id)

        logger.info(f"Started journey tracking for investigation: {investigation_id}")

    def log_node_execution(
        self,
        investigation_id: str,
        node_name: str,
        node_type: str,
        input_data: Dict[str, Any],
        output_data: Dict[str, Any],
        duration_ms: int = 0,
        status: str = "completed",
    ) -> None:
        """
        Log LangGraph node execution in journey.

        Args:
            investigation_id: Investigation identifier
            node_name: Name of the executed node
            node_type: Type of node (agent, tool, condition, etc.)
            input_data: Node input data
            output_data: Node output data
            duration_ms: Execution duration in milliseconds
            status: Execution status (completed, failed, etc.)
        """
        if investigation_id not in self._journey_data:
            logger.warning(
                f"Journey tracking not started for investigation: {investigation_id}"
            )
            return

        timestamp = datetime.now(timezone.utc).isoformat()

        node_execution = {
            "timestamp": timestamp,
            "node_name": node_name,
            "node_type": node_type,
            "input_data": input_data,
            "output_data": output_data,
            "duration_ms": duration_ms,
            "status": status,
        }

        self._journey_data[investigation_id]["node_executions"].append(node_execution)
        self._write_journey_file(investigation_id)

        logger.debug(
            f"Logged node execution: {node_name} for investigation: {investigation_id}"
        )

    def log_state_transition(
        self,
        investigation_id: str,
        from_state: str,
        to_state: str,
        trigger: str,
        context: Dict[str, Any] = None,
    ) -> None:
        """
        Log state transition in investigation journey.

        Args:
            investigation_id: Investigation identifier
            from_state: Previous state
            to_state: New state
            trigger: What triggered the state change
            context: Additional context data
        """
        if investigation_id not in self._journey_data:
            logger.warning(
                f"Journey tracking not started for investigation: {investigation_id}"
            )
            return

        timestamp = datetime.now(timezone.utc).isoformat()

        state_transition = {
            "timestamp": timestamp,
            "from_state": from_state,
            "to_state": to_state,
            "trigger": trigger,
            "context": context or {},
        }

        self._journey_data[investigation_id]["state_transitions"].append(
            state_transition
        )
        self._write_journey_file(investigation_id)

        logger.debug(
            f"Logged state transition: {from_state} → {to_state} for investigation: {investigation_id}"
        )

    def log_agent_coordination(
        self,
        investigation_id: str,
        coordinator_agent: str,
        target_agent: str,
        action: str,
        data: Dict[str, Any] = None,
    ) -> None:
        """
        Log agent coordination events.

        Args:
            investigation_id: Investigation identifier
            coordinator_agent: Agent coordinating the action
            target_agent: Agent being coordinated
            action: Coordination action (handoff, request, response, etc.)
            data: Additional coordination data
        """
        if investigation_id not in self._journey_data:
            logger.warning(
                f"Journey tracking not started for investigation: {investigation_id}"
            )
            return

        timestamp = datetime.now(timezone.utc).isoformat()

        coordination = {
            "timestamp": timestamp,
            "coordinator_agent": coordinator_agent,
            "target_agent": target_agent,
            "action": action,
            "data": data or {},
        }

        self._journey_data[investigation_id]["agent_coordinations"].append(coordination)
        self._write_journey_file(investigation_id)

        logger.debug(
            f"Logged agent coordination: {coordinator_agent} → {target_agent} ({action}) for investigation: {investigation_id}"
        )

    def update_final_state(
        self, investigation_id: str, final_state: Dict[str, Any]
    ) -> None:
        """
        Update final state of investigation journey.

        Args:
            investigation_id: Investigation identifier
            final_state: Final investigation state
        """
        if investigation_id not in self._journey_data:
            logger.warning(
                f"Journey tracking not started for investigation: {investigation_id}"
            )
            return

        self._journey_data[investigation_id]["final_state"] = final_state
        self._write_journey_file(investigation_id)

        logger.debug(f"Updated final state for investigation: {investigation_id}")

    def complete_journey_tracking(
        self, investigation_id: str, status: str = "completed"
    ) -> Dict[str, Any]:
        """
        Complete journey tracking and finalize data.

        Args:
            investigation_id: Investigation identifier
            status: Final journey status

        Returns:
            Complete journey data
        """
        if investigation_id not in self._journey_data:
            logger.warning(
                f"Journey tracking not started for investigation: {investigation_id}"
            )
            return {}

        timestamp = datetime.now(timezone.utc).isoformat()

        # Update completion data
        self._journey_data[investigation_id].update(
            {"end_timestamp": timestamp, "status": status}
        )

        # Write final journey file
        self._write_journey_file(investigation_id)

        journey_data = self._journey_data[investigation_id]

        # Clean up tracking data
        del self._journey_data[investigation_id]

        logger.info(
            f"Completed journey tracking for investigation: {investigation_id} with status: {status}"
        )
        return journey_data

    def _write_journey_file(self, investigation_id: str) -> None:
        """
        Write journey data to investigation folder.

        Args:
            investigation_id: Investigation identifier
        """
        try:
            # Get file paths from folder manager
            file_paths = self.folder_manager.get_log_file_paths(investigation_id)
            journey_file = file_paths["journey_log"]

            # Write journey data
            with open(journey_file, "w") as f:
                json.dump(self._journey_data[investigation_id], f, indent=2)

        except Exception as e:
            logger.error(
                f"Failed to write journey file for investigation {investigation_id}: {e}"
            )

    def get_journey_data(self, investigation_id: str) -> Optional[Dict[str, Any]]:
        """
        Get current journey data for investigation.

        Args:
            investigation_id: Investigation identifier

        Returns:
            Journey data or None if not found
        """
        if investigation_id in self._journey_data:
            return self._journey_data[investigation_id].copy()

        # Try to load from file if not in memory
        try:
            file_paths = self.folder_manager.get_log_file_paths(investigation_id)
            journey_file = file_paths["journey_log"]

            if journey_file.exists():
                with open(journey_file) as f:
                    return json.load(f)
        except Exception as e:
            logger.error(
                f"Failed to load journey data for investigation {investigation_id}: {e}"
            )

        return None

    def list_active_journeys(self) -> List[str]:
        """
        List investigation IDs with active journey tracking.

        Returns:
            List of investigation IDs
        """
        return list(self._journey_data.keys())

    def get_journey_summary(self, investigation_id: str) -> Dict[str, Any]:
        """
        Get summary of investigation journey.

        Args:
            investigation_id: Investigation identifier

        Returns:
            Journey summary
        """
        journey_data = self.get_journey_data(investigation_id)
        if not journey_data:
            return {
                "error": f"Journey data not found for investigation: {investigation_id}"
            }

        # Calculate summary statistics
        node_executions = journey_data.get("node_executions", [])
        state_transitions = journey_data.get("state_transitions", [])
        agent_coordinations = journey_data.get("agent_coordinations", [])

        # Calculate total duration if we have start/end times
        start_time = journey_data.get("start_timestamp")
        end_time = journey_data.get("end_timestamp")
        total_duration_ms = None

        if start_time and end_time:
            try:
                start_dt = datetime.fromisoformat(start_time.replace("Z", "+00:00"))
                end_dt = datetime.fromisoformat(end_time.replace("Z", "+00:00"))
                total_duration_ms = int((end_dt - start_dt).total_seconds() * 1000)
            except ValueError:
                pass

        # Count node types
        node_types = {}
        for node in node_executions:
            node_type = node.get("node_type", "unknown")
            node_types[node_type] = node_types.get(node_type, 0) + 1

        return {
            "investigation_id": investigation_id,
            "status": journey_data.get("status", "unknown"),
            "start_timestamp": start_time,
            "end_timestamp": end_time,
            "total_duration_ms": total_duration_ms,
            "node_executions_count": len(node_executions),
            "state_transitions_count": len(state_transitions),
            "agent_coordinations_count": len(agent_coordinations),
            "node_types": node_types,
            "final_state": journey_data.get("final_state", {}),
        }


# Global instance
journey_tracker = JourneyTracker()


def get_journey_tracker() -> JourneyTracker:
    """Get the global journey tracker instance"""
    return journey_tracker
