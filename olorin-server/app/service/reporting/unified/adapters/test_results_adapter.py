"""
Test results adapter for System 1 compatibility.

This adapter converts test runner results (from unified_autonomous_test_runner.py)
into the unified report data format, maintaining compatibility with the existing
test runner reporting workflow.
"""

from typing import Any, Dict, List
from datetime import datetime
from pathlib import Path

from ..core.data_adapter import DataSourceType
from ..core.data_structures import (
    UnifiedReportData, InvestigationSummary, TimelineEvent,
    RiskAnalysisData, AgentAnalysisData, ToolsAnalysisData,
    InvestigationFlowData, PerformanceData, ExplanationData,
    JourneyTrackingData, InvestigationStatus
)
from .base_adapter import BaseAdapter


class TestResultsAdapter(BaseAdapter):
    """
    Adapter for converting test runner results to unified format.
    
    This adapter handles the data format produced by the unified autonomous
    test runner and converts it into the standardized UnifiedReportData
    structure for consistent report generation.
    
    Expected input format:
    {
        "scenario_name": {
            "status": "PASSED|FAILED",
            "duration": float,
            "overall_score": float, 
            "final_risk_score": float,
            "confidence": float,
            "phases": dict,
            "errors": list,
            "journey_data": dict,
            "logging_data": dict,
            "performance_data": dict,
            "validation_results": dict,
            "websocket_events": list,
            "investigation_id": str,
            "start_time": str,
            "end_time": str,
            "investigation_folder": str
        }
    }
    """
    
    def adapt_data(self, source: Dict[str, Any]) -> UnifiedReportData:
        """
        Convert test results to unified format.
        
        Args:
            source: Test results dictionary from test runner
            
        Returns:
            UnifiedReportData: Standardized data structure
            
        Raises:
            ValueError: If source data is invalid
        """
        if not self.validate_source(source):
            raise ValueError("Invalid test results data format")
        
        # Extract the first (and usually only) test result
        test_data = next(iter(source.values()))
        
        # Create investigation summary
        summary = self._create_summary(test_data, source)
        
        # Extract timeline events
        timeline_events = self._extract_timeline_events(test_data)
        
        # Create risk analysis
        risk_analysis = self._create_risk_analysis(test_data)
        
        # Extract agent and tools data
        agents_data = self._extract_agents_data(test_data)
        tools_data = self._extract_tools_data(test_data)
        
        # Extract flow and journey data
        flow_data = self._extract_flow_data(test_data)
        journey_data = self._extract_journey_data(test_data)
        
        # Extract performance metrics
        performance_metrics = self._extract_performance_data(test_data)
        
        # Extract explanations
        explanations = self._extract_explanations(test_data)
        
        return UnifiedReportData(
            summary=summary,
            timeline_events=timeline_events,
            risk_analysis=risk_analysis,
            agents_data=agents_data,
            tools_data=tools_data,
            flow_data=flow_data,
            journey_data=journey_data,
            performance_metrics=performance_metrics,
            explanations=explanations,
            raw_data=test_data,
            investigation_folder=test_data.get("investigation_folder"),
            output_files=self._extract_output_files(test_data)
        )
    
    def validate_source(self, source: Any) -> bool:
        """
        Validate test results data format.
        
        Args:
            source: Source data to validate
            
        Returns:
            bool: True if valid test results format
        """
        if not isinstance(source, dict):
            return False
        
        # Must have at least one test result
        if not source:
            return False
        
        # Check if first value looks like test result data
        first_result = next(iter(source.values()))
        if not isinstance(first_result, dict):
            return False
        
        # Check for required fields in test result
        required_fields = ["status", "investigation_id"]
        return all(field in first_result for field in required_fields)
    
    def get_supported_data_type(self) -> DataSourceType:
        """Return the supported data source type."""
        return DataSourceType.TEST_RESULTS
    
    def _create_summary(self, test_data: Dict[str, Any], all_results: Dict[str, Any]) -> InvestigationSummary:
        """Create investigation summary from test data."""
        investigation_id = test_data.get("investigation_id", "unknown")
        scenario_name = list(all_results.keys())[0] if all_results else "Unknown Scenario"
        
        # Extract timing information
        start_time = self.safe_extract_datetime(test_data, "start_time") or datetime.now()
        end_time = self.safe_extract_datetime(test_data, "end_time")
        duration = self.safe_extract_float(test_data, "duration")
        
        # Calculate test metrics
        total_tests = len(all_results)
        passed_tests = sum(1 for result in all_results.values() 
                          if result.get("status") == "PASSED")
        failed_tests = total_tests - passed_tests
        pass_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0.0
        
        # Extract risk and confidence scores
        overall_risk_score = self.safe_extract_float(test_data, "final_risk_score")
        confidence_score = self.safe_extract_float(test_data, "confidence")
        
        # Extract agent and tool information
        agents_used = self.extract_agents_from_data(test_data)
        tools_used = self.extract_tools_from_data(test_data)
        
        # Count errors
        errors = self.safe_extract_list(test_data, "errors")
        error_count = len(errors)
        
        # Determine status
        status_str = test_data.get("status", "PENDING")
        status = self.extract_status_from_string(status_str)
        
        return InvestigationSummary(
            investigation_id=investigation_id,
            scenario_name=scenario_name,
            mode=test_data.get("mode", "UNKNOWN"),
            start_time=start_time,
            end_time=end_time,
            duration_seconds=duration,
            status=status,
            overall_risk_score=overall_risk_score,
            confidence_score=confidence_score,
            tests_passed=passed_tests,
            tests_failed=failed_tests,
            pass_rate=pass_rate,
            error_count=error_count,
            agents_used=agents_used,
            tools_used=tools_used
        )
    
    def _extract_timeline_events(self, test_data: Dict[str, Any]) -> List[TimelineEvent]:
        """Extract timeline events from test data."""
        events = []
        
        # Extract from websocket events if available
        websocket_events = self.safe_extract_list(test_data, "websocket_events")
        for event in websocket_events:
            if isinstance(event, dict):
                timestamp = self.safe_extract_datetime(event, "timestamp")
                if timestamp:
                    events.append(TimelineEvent(
                        timestamp=timestamp,
                        event_type=event.get("type", "websocket_event"),
                        title=event.get("title", "WebSocket Event"),
                        description=event.get("message", ""),
                        metadata=event
                    ))
        
        # Extract from phases if available
        phases = self.safe_extract_dict(test_data, "phases")
        for phase_name, phase_data in phases.items():
            if isinstance(phase_data, dict):
                timestamp = self.safe_extract_datetime(phase_data, "start_time")
                if timestamp:
                    events.append(TimelineEvent(
                        timestamp=timestamp,
                        event_type="phase_start",
                        title=f"Phase: {phase_name}",
                        description=phase_data.get("description", ""),
                        agent=phase_data.get("agent"),
                        risk_score=self.safe_extract_float(phase_data, "risk_score"),
                        metadata=phase_data
                    ))
        
        # Sort events by timestamp
        events.sort(key=lambda e: e.timestamp)
        return events
    
    def _create_risk_analysis(self, test_data: Dict[str, Any]) -> RiskAnalysisData:
        """Create risk analysis from test data."""
        final_risk_score = self.safe_extract_float(test_data, "final_risk_score")
        risk_level = self.calculate_risk_level(final_risk_score)
        
        # Extract risk breakdown from phases
        risk_breakdown = {}
        agent_risk_scores = {}
        phases = self.safe_extract_dict(test_data, "phases")
        
        for phase_name, phase_data in phases.items():
            if isinstance(phase_data, dict):
                risk_score = self.safe_extract_float(phase_data, "risk_score")
                if risk_score > 0:
                    risk_breakdown[phase_name] = risk_score
                
                agent = phase_data.get("agent")
                if agent and risk_score > 0:
                    agent_risk_scores[agent] = risk_score
        
        return RiskAnalysisData(
            final_risk_score=final_risk_score,
            risk_level=risk_level,
            risk_breakdown=risk_breakdown,
            agent_risk_scores=agent_risk_scores
        )
    
    def _extract_agents_data(self, test_data: Dict[str, Any]) -> AgentAnalysisData:
        """Extract agent analysis data."""
        agents_data = AgentAnalysisData()
        
        # Extract from phases
        phases = self.safe_extract_dict(test_data, "phases")
        for phase_name, phase_data in phases.items():
            if isinstance(phase_data, dict):
                agent = phase_data.get("agent")
                if agent:
                    # Count usage
                    agents_data.agent_usage[agent] = agents_data.agent_usage.get(agent, 0) + 1
                    
                    # Track success/failure
                    success = phase_data.get("status") == "PASSED"
                    if agent not in agents_data.agent_success_rates:
                        agents_data.agent_success_rates[agent] = []
                    agents_data.agent_success_rates[agent].append(1.0 if success else 0.0)
                    
                    # Track response times
                    duration = self.safe_extract_float(phase_data, "duration")
                    if duration > 0:
                        if agent not in agents_data.agent_response_times:
                            agents_data.agent_response_times[agent] = []
                        agents_data.agent_response_times[agent].append(duration)
        
        # Convert success rates from lists to averages
        for agent, successes in agents_data.agent_success_rates.items():
            if successes:
                agents_data.agent_success_rates[agent] = sum(successes) / len(successes)
        
        return agents_data
    
    def _extract_tools_data(self, test_data: Dict[str, Any]) -> ToolsAnalysisData:
        """Extract tools analysis data."""
        # For test results, tool data is limited, so create basic structure
        tools_used = self.extract_tools_from_data(test_data)
        tools_data = ToolsAnalysisData()
        
        for tool in tools_used:
            tools_data.tool_usage[tool] = 1  # Basic usage count
        
        return tools_data
    
    def _extract_flow_data(self, test_data: Dict[str, Any]) -> InvestigationFlowData:
        """Extract investigation flow data."""
        phases = self.safe_extract_dict(test_data, "phases")
        
        phase_list = []
        completed_phases = []
        
        for phase_name, phase_data in phases.items():
            if isinstance(phase_data, dict):
                phase_info = {
                    "name": phase_name,
                    "status": phase_data.get("status", "UNKNOWN"),
                    "agent": phase_data.get("agent"),
                    "duration": self.safe_extract_float(phase_data, "duration"),
                    "risk_score": self.safe_extract_float(phase_data, "risk_score")
                }
                phase_list.append(phase_info)
                
                if phase_data.get("status") == "PASSED":
                    completed_phases.append(phase_name)
        
        return InvestigationFlowData(
            phases=phase_list,
            completed_phases=completed_phases
        )
    
    def _extract_journey_data(self, test_data: Dict[str, Any]) -> JourneyTrackingData:
        """Extract journey tracking data."""
        journey_data = self.safe_extract_dict(test_data, "journey_data")
        
        milestones = []
        progress_markers = []
        
        if journey_data:
            # Extract milestones and progress markers from journey data
            if "milestones" in journey_data:
                milestones = self.safe_extract_list(journey_data, "milestones")
            if "progress" in journey_data:
                progress_markers = self.safe_extract_list(journey_data, "progress")
        
        return JourneyTrackingData(
            milestones=milestones,
            progress_markers=progress_markers,
            journey_visualization=journey_data
        )
    
    def _extract_performance_data(self, test_data: Dict[str, Any]) -> PerformanceData:
        """Extract performance metrics."""
        performance_data = self.safe_extract_dict(test_data, "performance_data")
        
        total_execution_time = self.safe_extract_float(test_data, "duration")
        
        return PerformanceData(
            total_execution_time=total_execution_time,
            performance_bottlenecks=performance_data.get("bottlenecks", [])
        )
    
    def _extract_explanations(self, test_data: Dict[str, Any]) -> List[ExplanationData]:
        """Extract explanation data."""
        explanations = []
        
        # Extract from phases
        phases = self.safe_extract_dict(test_data, "phases")
        for phase_name, phase_data in phases.items():
            if isinstance(phase_data, dict):
                explanation_text = phase_data.get("explanation", "")
                if explanation_text:
                    explanations.append(ExplanationData(
                        explanation_id=f"phase_{phase_name}",
                        agent=phase_data.get("agent", "unknown"),
                        timestamp=self.safe_extract_datetime(phase_data, "start_time") or datetime.now(),
                        reasoning=explanation_text,
                        confidence=self.safe_extract_float(phase_data, "confidence"),
                        metadata=phase_data
                    ))
        
        return explanations
    
    def _extract_output_files(self, test_data: Dict[str, Any]) -> List[str]:
        """Extract list of output files generated."""
        files = []
        
        # Add investigation folder files if available
        investigation_folder = test_data.get("investigation_folder")
        if investigation_folder and Path(investigation_folder).exists():
            folder_path = Path(investigation_folder)
            files.extend(str(f) for f in folder_path.glob("*") if f.is_file())
        
        return files