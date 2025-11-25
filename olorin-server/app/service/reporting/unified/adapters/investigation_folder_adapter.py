"""
Investigation folder adapter for System 2 compatibility.

This adapter converts investigation folder data (from Enhanced HTML Report Generator)
into the unified report data format, maintaining compatibility with the existing
investigation folder workflow.
"""

import json
from typing import Any, Dict, List

try:
    import jsonlines

    JSONLINES_AVAILABLE = True
except ImportError:
    JSONLINES_AVAILABLE = False
    jsonlines = None
from datetime import datetime
from pathlib import Path

from ..core.data_adapter import DataSourceType
from ..core.data_structures import (
    AgentAnalysisData,
    ExplanationData,
    InvestigationFlowData,
    InvestigationStatus,
    InvestigationSummary,
    JourneyTrackingData,
    PerformanceData,
    RiskAnalysisData,
    TimelineEvent,
    ToolsAnalysisData,
    UnifiedReportData,
)
from .base_adapter import BaseAdapter


class InvestigationFolderAdapter(BaseAdapter):
    """
    Adapter for converting investigation folder data to unified format.

    This adapter handles investigation folders with the standard structure:
    - metadata.json - Investigation configuration and metadata
    - structured_activities.jsonl - Structured activity logs
    - journey_tracking.json - Investigation progress data
    - investigation.log - General investigation logs

    This maintains compatibility with the Enhanced HTML Report Generator
    while providing the data in the unified format.
    """

    def adapt_data(self, source: Path) -> UnifiedReportData:
        """
        Convert investigation folder to unified format.

        Args:
            source: Path to investigation folder

        Returns:
            UnifiedReportData: Standardized data structure

        Raises:
            ValueError: If folder is invalid or missing required files
            FileNotFoundError: If required files are missing
        """
        if not self.validate_source(source):
            raise ValueError("Invalid investigation folder")

        folder_path = Path(source)

        # Load investigation data from files
        metadata = self._load_metadata(folder_path)
        activities = self._load_activities(folder_path)
        journey_data = self._load_journey_data(folder_path)

        # Create investigation summary
        summary = self._create_summary_from_folder(metadata, activities, journey_data)

        # Extract timeline events from activities
        timeline_events = self._extract_timeline_from_activities(activities)

        # Create risk analysis
        risk_analysis = self._create_risk_analysis_from_activities(activities, metadata)

        # Extract agent and tools data
        agents_data = self._extract_agents_from_activities(activities)
        tools_data = self._extract_tools_from_activities(activities)

        # Extract flow data
        flow_data = self._extract_flow_from_activities(activities)

        # Convert journey data
        unified_journey_data = self._convert_journey_data(journey_data)

        # Extract performance metrics
        performance_metrics = self._extract_performance_from_activities(activities)

        # Extract explanations
        explanations = self._extract_explanations_from_activities(activities)

        # Get output files
        output_files = [str(f) for f in folder_path.glob("*") if f.is_file()]

        return UnifiedReportData(
            summary=summary,
            timeline_events=timeline_events,
            risk_analysis=risk_analysis,
            agents_data=agents_data,
            tools_data=tools_data,
            flow_data=flow_data,
            journey_data=unified_journey_data,
            performance_metrics=performance_metrics,
            explanations=explanations,
            raw_data={
                "metadata": metadata,
                "activities": activities,
                "journey_data": journey_data,
            },
            investigation_folder=str(folder_path),
            output_files=output_files,
        )

    def validate_source(self, source: Any) -> bool:
        """
        Validate investigation folder format.

        Args:
            source: Source to validate (should be Path or path string)

        Returns:
            bool: True if valid investigation folder
        """
        try:
            folder_path = Path(source)
            if not folder_path.exists() or not folder_path.is_dir():
                return False

            # Check for at least one of the expected files
            expected_files = [
                "metadata.json",
                "structured_activities.jsonl",
                "journey_tracking.json",
            ]
            return any((folder_path / filename).exists() for filename in expected_files)

        except (TypeError, ValueError):
            return False

    def get_supported_data_type(self) -> DataSourceType:
        """Return the supported data source type."""
        return DataSourceType.INVESTIGATION_FOLDER

    def _load_metadata(self, folder_path: Path) -> Dict[str, Any]:
        """Load metadata.json if it exists."""
        metadata_file = folder_path / "metadata.json"
        if metadata_file.exists():
            try:
                with open(metadata_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError):
                pass
        return {}

    def _load_activities(self, folder_path: Path) -> List[Dict[str, Any]]:
        """Load structured_activities.jsonl if it exists."""
        activities_file = folder_path / "structured_activities.jsonl"
        activities = []

        if activities_file.exists() and JSONLINES_AVAILABLE:
            try:
                with jsonlines.open(activities_file, "r") as reader:
                    activities = list(reader)
            except (jsonlines.InvalidLineError, IOError):
                pass
        elif activities_file.exists():
            # Fallback: try to read as regular JSON lines manually
            try:
                with open(activities_file, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line:
                            try:
                                activities.append(json.loads(line))
                            except json.JSONDecodeError:
                                continue
            except IOError:
                pass

        return activities

    def _load_journey_data(self, folder_path: Path) -> Dict[str, Any]:
        """Load journey_tracking.json if it exists."""
        journey_file = folder_path / "journey_tracking.json"
        if journey_file.exists():
            try:
                with open(journey_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError):
                pass
        return {}

    def _create_summary_from_folder(
        self,
        metadata: Dict[str, Any],
        activities: List[Dict[str, Any]],
        journey_data: Dict[str, Any],
    ) -> InvestigationSummary:
        """Create investigation summary from folder data."""

        # Extract basic information
        investigation_id = metadata.get("investigation_id", "unknown")
        scenario_name = metadata.get("scenario", "Unknown Scenario")
        mode = metadata.get("mode", "UNKNOWN")

        # Extract timing
        start_time = (
            self.safe_extract_datetime(metadata, "start_time") or datetime.now()
        )
        end_time = self.safe_extract_datetime(metadata, "end_time")

        # Calculate duration from activities or metadata
        duration = None
        if start_time and end_time:
            duration = (end_time - start_time).total_seconds()

        # Count interactions and calls
        total_interactions = len(activities)
        llm_calls = sum(
            1 for activity in activities if activity.get("type") == "llm_call"
        )
        tool_executions = sum(
            1 for activity in activities if activity.get("type") == "tool_execution"
        )

        # Calculate token usage
        total_tokens = 0
        for activity in activities:
            if "tokens" in activity:
                total_tokens += self.safe_extract_int(activity, "tokens")

        # Extract final risk score
        final_risk_score = None
        for activity in reversed(activities):
            if "risk_score" in activity:
                final_risk_score = self.safe_extract_float(activity, "risk_score")
                break

        if final_risk_score is None:
            final_risk_score = metadata.get("final_risk_score")

        # Extract agents and tools
        agents_used = []
        tools_used = []
        error_count = 0

        for activity in activities:
            agent = activity.get("agent")
            if agent and agent not in agents_used:
                agents_used.append(agent)

            tool = activity.get("tool")
            if tool and tool not in tools_used:
                tools_used.append(tool)

            if activity.get("status") == "error":
                error_count += 1

        # Determine status
        status = InvestigationStatus.COMPLETED
        if error_count > 0 or any(
            activity.get("status") == "failed" for activity in activities
        ):
            status = InvestigationStatus.FAILED
        elif any(activity.get("status") == "in_progress" for activity in activities):
            status = InvestigationStatus.IN_PROGRESS

        return InvestigationSummary(
            investigation_id=investigation_id,
            scenario_name=scenario_name,
            mode=mode,
            start_time=start_time,
            end_time=end_time,
            duration_seconds=duration,
            status=status,
            overall_risk_score=final_risk_score,
            total_interactions=total_interactions,
            llm_calls=llm_calls,
            tool_executions=tool_executions,
            total_tokens=total_tokens,
            error_count=error_count,
            agents_used=agents_used,
            tools_used=tools_used,
        )

    def _extract_timeline_from_activities(
        self, activities: List[Dict[str, Any]]
    ) -> List[TimelineEvent]:
        """Extract timeline events from activities."""
        events = []

        for activity in activities:
            timestamp = self.safe_extract_datetime(activity, "timestamp")
            if not timestamp:
                continue

            event_type = activity.get("type", "activity")
            title = activity.get(
                "title", activity.get("action", f"{event_type.title()} Event")
            )
            description = activity.get("description", activity.get("message", ""))

            events.append(
                TimelineEvent(
                    timestamp=timestamp,
                    event_type=event_type,
                    title=title,
                    description=description,
                    agent=activity.get("agent"),
                    tool=activity.get("tool"),
                    risk_score=self.safe_extract_float(activity, "risk_score"),
                    metadata=activity,
                )
            )

        return sorted(events, key=lambda e: e.timestamp)

    def _create_risk_analysis_from_activities(
        self, activities: List[Dict[str, Any]], metadata: Dict[str, Any]
    ) -> RiskAnalysisData:
        """Create risk analysis from activities and metadata."""

        # Get final risk score
        final_risk_score = None
        for activity in reversed(activities):
            if "risk_score" in activity:
                final_risk_score = self.safe_extract_float(activity, "risk_score")
                break

        if final_risk_score is None:
            final_risk_score = self.safe_extract_float(metadata, "final_risk_score")

        risk_level = self.calculate_risk_level(final_risk_score)

        # Extract risk progression
        risk_progression = []
        agent_risk_scores = {}

        for activity in activities:
            risk_score = self.safe_extract_float(activity, "risk_score")
            if risk_score > 0:
                timestamp = self.safe_extract_datetime(activity, "timestamp")
                if timestamp:
                    risk_progression.append(
                        {
                            "timestamp": timestamp.isoformat(),
                            "risk_score": risk_score,
                            "agent": activity.get("agent"),
                            "activity": activity.get("type", "unknown"),
                        }
                    )

                # Track agent risk scores
                agent = activity.get("agent")
                if agent:
                    if (
                        agent not in agent_risk_scores
                        or risk_score > agent_risk_scores[agent]
                    ):
                        agent_risk_scores[agent] = risk_score

        return RiskAnalysisData(
            final_risk_score=final_risk_score,
            risk_level=risk_level,
            risk_progression=risk_progression,
            agent_risk_scores=agent_risk_scores,
        )

    def _extract_agents_from_activities(
        self, activities: List[Dict[str, Any]]
    ) -> AgentAnalysisData:
        """Extract agent analysis from activities."""
        agents_data = AgentAnalysisData()

        agent_interactions = {}

        for activity in activities:
            agent = activity.get("agent")
            if not agent:
                continue

            if agent not in agent_interactions:
                agent_interactions[agent] = {
                    "total": 0,
                    "successes": 0,
                    "response_times": [],
                    "errors": 0,
                }

            agent_interactions[agent]["total"] += 1

            # Track success/failure
            status = activity.get("status", "unknown")
            if status in ["success", "completed", "passed"]:
                agent_interactions[agent]["successes"] += 1
            elif status in ["error", "failed"]:
                agent_interactions[agent]["errors"] += 1

            # Track response time
            duration = self.safe_extract_float(activity, "duration")
            if duration > 0:
                agent_interactions[agent]["response_times"].append(duration)

        # Convert to final format
        for agent, data in agent_interactions.items():
            agents_data.agent_usage[agent] = data["total"]

            if data["total"] > 0:
                agents_data.agent_success_rates[agent] = (
                    data["successes"] / data["total"]
                )

            if data["response_times"]:
                agents_data.agent_response_times[agent] = data["response_times"]

            agents_data.agent_error_counts[agent] = data["errors"]

        return agents_data

    def _extract_tools_from_activities(
        self, activities: List[Dict[str, Any]]
    ) -> ToolsAnalysisData:
        """Extract tools analysis from activities."""
        tools_data = ToolsAnalysisData()

        tool_interactions = {}

        for activity in activities:
            tool = activity.get("tool")
            if not tool:
                continue

            if tool not in tool_interactions:
                tool_interactions[tool] = {
                    "total": 0,
                    "successes": 0,
                    "execution_times": [],
                    "errors": 0,
                }

            tool_interactions[tool]["total"] += 1

            # Track success/failure
            status = activity.get("status", "unknown")
            if status in ["success", "completed", "passed"]:
                tool_interactions[tool]["successes"] += 1
            elif status in ["error", "failed"]:
                tool_interactions[tool]["errors"] += 1

            # Track execution time
            duration = self.safe_extract_float(activity, "duration")
            if duration > 0:
                tool_interactions[tool]["execution_times"].append(duration)

        # Convert to final format
        for tool, data in tool_interactions.items():
            tools_data.tool_usage[tool] = data["total"]

            if data["total"] > 0:
                tools_data.tool_success_rates[tool] = data["successes"] / data["total"]
                tools_data.tool_error_rates[tool] = data["errors"] / data["total"]

            if data["execution_times"]:
                tools_data.tool_execution_times[tool] = data["execution_times"]

        return tools_data

    def _extract_flow_from_activities(
        self, activities: List[Dict[str, Any]]
    ) -> InvestigationFlowData:
        """Extract investigation flow from activities."""
        phases = []
        phase_transitions = []
        completed_phases = []

        current_phase = None

        for activity in activities:
            # Look for phase-related activities
            activity_type = activity.get("type", "")
            if "phase" in activity_type.lower() or activity.get("phase"):
                phase_name = activity.get("phase", activity_type)

                if phase_name != current_phase:
                    # Phase transition
                    timestamp = self.safe_extract_datetime(activity, "timestamp")
                    if timestamp:
                        phase_transitions.append(
                            {
                                "from_phase": current_phase,
                                "to_phase": phase_name,
                                "timestamp": timestamp.isoformat(),
                                "trigger": activity.get("trigger", "automatic"),
                            }
                        )

                    current_phase = phase_name

                # Add to phases list if not already there
                if not any(p.get("name") == phase_name for p in phases):
                    phases.append(
                        {
                            "name": phase_name,
                            "start_time": self.safe_extract_datetime(
                                activity, "timestamp"
                            ),
                            "status": activity.get("status", "unknown"),
                            "agent": activity.get("agent"),
                        }
                    )

                # Track completed phases
                if (
                    activity.get("status") in ["completed", "success", "passed"]
                    and phase_name not in completed_phases
                ):
                    completed_phases.append(phase_name)

        return InvestigationFlowData(
            phases=phases,
            phase_transitions=phase_transitions,
            current_phase=current_phase,
            completed_phases=completed_phases,
        )

    def _convert_journey_data(
        self, journey_data: Dict[str, Any]
    ) -> JourneyTrackingData:
        """Convert journey tracking data to unified format."""
        milestones = self.safe_extract_list(journey_data, "milestones")
        progress_markers = self.safe_extract_list(journey_data, "progress")

        # Extract current step and completion info
        current_step = journey_data.get("current_step")
        completed_steps = self.safe_extract_list(journey_data, "completed_steps")
        total_steps = self.safe_extract_int(journey_data, "total_steps")

        return JourneyTrackingData(
            milestones=milestones,
            progress_markers=progress_markers,
            journey_visualization=journey_data,
            current_step=current_step,
            completed_steps=completed_steps,
            total_steps=total_steps if total_steps > 0 else None,
        )

    def _extract_performance_from_activities(
        self, activities: List[Dict[str, Any]]
    ) -> PerformanceData:
        """Extract performance metrics from activities."""
        total_execution_time = 0
        response_times = []
        api_calls = {}

        for activity in activities:
            duration = self.safe_extract_float(activity, "duration")
            if duration > 0:
                total_execution_time += duration
                response_times.append(duration)

            # Count API calls by type
            activity_type = activity.get("type", "unknown")
            api_calls[activity_type] = api_calls.get(activity_type, 0) + 1

        average_response_time = (
            sum(response_times) / len(response_times) if response_times else 0
        )

        return PerformanceData(
            total_execution_time=(
                total_execution_time if total_execution_time > 0 else None
            ),
            average_response_time=(
                average_response_time if average_response_time > 0 else None
            ),
            api_call_counts=api_calls,
        )

    def _extract_explanations_from_activities(
        self, activities: List[Dict[str, Any]]
    ) -> List[ExplanationData]:
        """Extract explanations from activities."""
        explanations = []

        for i, activity in enumerate(activities):
            # Look for explanation-type activities
            if (
                activity.get("type") in ["explanation", "reasoning", "analysis"]
                or "explanation" in activity.get("description", "").lower()
            ):

                timestamp = (
                    self.safe_extract_datetime(activity, "timestamp") or datetime.now()
                )
                agent = activity.get("agent", "unknown")
                reasoning = activity.get("reasoning", activity.get("description", ""))

                if reasoning:
                    explanations.append(
                        ExplanationData(
                            explanation_id=f"activity_{i}",
                            agent=agent,
                            timestamp=timestamp,
                            reasoning=reasoning,
                            confidence=self.safe_extract_float(activity, "confidence"),
                            metadata=activity,
                        )
                    )

        return explanations
