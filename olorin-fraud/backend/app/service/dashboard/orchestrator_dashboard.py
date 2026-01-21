"""
Investigation Dashboard Integration Service

Provides real-time orchestrator decision visualization and investigation flow monitoring
for the structured investigation orchestrator system.

Author: Gil Klainert
Date: 2025-09-06
Plan Reference: /docs/plans/2025-09-06-structured-investigation-orchestrator-langgraph-plan.md
Phase: 4.2 - Investigation Dashboard Integration
"""

import asyncio
import json
import logging
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional, Set

from app.router.handlers.orchestrator_websocket import OrchestratorWebSocketHandler
from app.service.agent.orchestrator_state import (
    InvestigationPhase,
    OrchestratorStateManager,
)


class DashboardViewType(Enum):
    """Types of dashboard views available"""

    REAL_TIME_DECISIONS = "real_time_decisions"
    AGENT_COORDINATION = "agent_coordination"
    INVESTIGATION_FLOW = "investigation_flow"
    PERFORMANCE_METRICS = "performance_metrics"
    BOTTLENECK_ANALYSIS = "bottleneck_analysis"


@dataclass
class DashboardDecisionVisualization:
    """Real-time orchestrator decision visualization data"""

    decision_id: str
    timestamp: datetime
    decision_type: str
    reasoning: str
    confidence_score: float
    alternatives: List[Dict[str, Any]]
    decision_factors: Dict[str, Any]
    execution_time_ms: float
    impact_level: str  # critical, high, medium, low
    visualization_type: str  # flowchart, tree, matrix, timeline


@dataclass
class AgentCoordinationTimeline:
    """Agent coordination visualization with timeline and dependencies"""

    coordination_id: str
    timestamp: datetime
    source_agent: str
    target_agent: str
    handoff_reason: str
    data_transferred: Dict[str, Any]
    coordination_mode: str  # sequential, parallel, hybrid, adaptive
    dependencies: List[str]
    estimated_completion: datetime
    actual_completion: Optional[datetime] = None
    status: str = "in_progress"  # pending, in_progress, completed, failed


@dataclass
class InvestigationFlowProgress:
    """Investigation flow progress with bottleneck identification"""

    flow_id: str
    investigation_id: str
    current_phase: InvestigationPhase
    completed_phases: List[InvestigationPhase]
    phase_durations: Dict[str, float]  # phase -> duration in seconds
    bottlenecks: List[Dict[str, Any]]
    critical_path: List[str]
    estimated_completion: datetime
    completion_percentage: float
    quality_score: float


@dataclass
class PerformanceMetrics:
    """Orchestrator performance metrics and optimization recommendations"""

    metrics_id: str
    timestamp: datetime
    decision_latency_ms: float
    agent_handoff_efficiency: float
    investigation_success_rate: float
    resource_utilization: Dict[str, float]
    optimization_recommendations: List[str]
    performance_trends: Dict[str, List[float]]
    anomalies: List[Dict[str, Any]]


class OrchestratorDashboardService:
    """
    Investigation Dashboard Integration Service

    Provides comprehensive real-time visualization capabilities for the structured
    investigation orchestrator, enabling operators to monitor AI-driven decisions,
    agent coordination, investigation flow, and performance metrics.
    """

    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.state_manager = OrchestratorStateManager()
        self.websocket_handler = OrchestratorWebSocketHandler()

        # Dashboard data storage
        self.active_visualizations: Dict[str, Any] = {}
        self.decision_history: Dict[str, List[DashboardDecisionVisualization]] = {}
        self.coordination_timelines: Dict[str, List[AgentCoordinationTimeline]] = {}
        self.flow_progress: Dict[str, InvestigationFlowProgress] = {}
        self.performance_metrics: Dict[str, PerformanceMetrics] = {}

        # Dashboard configuration
        self.max_decision_history = 1000
        self.refresh_interval_seconds = 1
        self.bottleneck_threshold_seconds = 30

        # Active dashboard connections
        self.dashboard_connections: Set[str] = set()

    async def initialize_dashboard(self, investigation_id: str) -> Dict[str, Any]:
        """Initialize dashboard for investigation with baseline data"""
        try:
            self.logger.info(
                f"Initializing dashboard for investigation: {investigation_id}"
            )

            # Initialize data structures
            self.decision_history[investigation_id] = []
            self.coordination_timelines[investigation_id] = []

            # Get initial investigation state
            investigation_state = await self.state_manager.get_investigation_state(
                investigation_id
            )

            # Create initial flow progress
            self.flow_progress[investigation_id] = InvestigationFlowProgress(
                flow_id=f"flow_{investigation_id}",
                investigation_id=investigation_id,
                current_phase=investigation_state.get(
                    "current_phase", InvestigationPhase.INITIALIZATION
                ),
                completed_phases=[],
                phase_durations={},
                bottlenecks=[],
                critical_path=[],
                estimated_completion=datetime.now() + timedelta(minutes=30),
                completion_percentage=0.0,
                quality_score=0.0,
            )

            # Initialize performance metrics
            self.performance_metrics[investigation_id] = PerformanceMetrics(
                metrics_id=f"metrics_{investigation_id}",
                timestamp=datetime.now(),
                decision_latency_ms=0.0,
                agent_handoff_efficiency=1.0,
                investigation_success_rate=1.0,
                resource_utilization={},
                optimization_recommendations=[],
                performance_trends={},
                anomalies=[],
            )

            return {
                "dashboard_id": f"dashboard_{investigation_id}",
                "investigation_id": investigation_id,
                "initialization_status": "success",
                "available_views": [view.value for view in DashboardViewType],
                "websocket_endpoint": f"/ws/orchestrator/{investigation_id}",
                "refresh_interval": self.refresh_interval_seconds,
            }

        except Exception as e:
            self.logger.error(f"Dashboard initialization failed: {str(e)}")
            raise

    async def update_decision_visualization(
        self, investigation_id: str, decision_data: Dict[str, Any]
    ) -> None:
        """Update real-time decision visualization"""
        try:
            # Create decision visualization
            visualization = DashboardDecisionVisualization(
                decision_id=decision_data["decision_id"],
                timestamp=datetime.fromisoformat(decision_data["timestamp"]),
                decision_type=decision_data["decision_type"],
                reasoning=decision_data["reasoning"],
                confidence_score=decision_data["confidence_score"],
                alternatives=decision_data.get("alternatives", []),
                decision_factors=decision_data.get("decision_factors", {}),
                execution_time_ms=decision_data.get("execution_time_ms", 0.0),
                impact_level=self._determine_impact_level(decision_data),
                visualization_type=self._determine_visualization_type(
                    decision_data["decision_type"]
                ),
            )

            # Add to history
            if investigation_id not in self.decision_history:
                self.decision_history[investigation_id] = []

            self.decision_history[investigation_id].append(visualization)

            # Limit history size
            if len(self.decision_history[investigation_id]) > self.max_decision_history:
                self.decision_history[investigation_id] = self.decision_history[
                    investigation_id
                ][-self.max_decision_history :]

            # Broadcast to dashboard connections
            await self._broadcast_dashboard_update(
                investigation_id,
                DashboardViewType.REAL_TIME_DECISIONS,
                asdict(visualization),
            )

            self.logger.debug(
                f"Updated decision visualization: {decision_data['decision_id']}"
            )

        except Exception as e:
            self.logger.error(f"Failed to update decision visualization: {str(e)}")

    async def update_coordination_timeline(
        self, investigation_id: str, coordination_data: Dict[str, Any]
    ) -> None:
        """Update agent coordination timeline visualization"""
        try:
            # Create coordination timeline entry
            timeline_entry = AgentCoordinationTimeline(
                coordination_id=coordination_data["coordination_id"],
                timestamp=datetime.fromisoformat(coordination_data["timestamp"]),
                source_agent=coordination_data["source_agent"],
                target_agent=coordination_data["target_agent"],
                handoff_reason=coordination_data["handoff_reason"],
                data_transferred=coordination_data.get("data_transferred", {}),
                coordination_mode=coordination_data.get(
                    "coordination_mode", "sequential"
                ),
                dependencies=coordination_data.get("dependencies", []),
                estimated_completion=datetime.fromisoformat(
                    coordination_data.get(
                        "estimated_completion",
                        (datetime.now() + timedelta(minutes=5)).isoformat(),
                    )
                ),
                status=coordination_data.get("status", "in_progress"),
            )

            # Add to timeline
            if investigation_id not in self.coordination_timelines:
                self.coordination_timelines[investigation_id] = []

            self.coordination_timelines[investigation_id].append(timeline_entry)

            # Update dependencies and critical path
            await self._update_critical_path(investigation_id)

            # Broadcast to dashboard connections
            await self._broadcast_dashboard_update(
                investigation_id,
                DashboardViewType.AGENT_COORDINATION,
                asdict(timeline_entry),
            )

            self.logger.debug(
                f"Updated coordination timeline: {coordination_data['coordination_id']}"
            )

        except Exception as e:
            self.logger.error(f"Failed to update coordination timeline: {str(e)}")

    async def update_investigation_flow(
        self, investigation_id: str, flow_data: Dict[str, Any]
    ) -> None:
        """Update investigation flow progress with bottleneck identification"""
        try:
            if investigation_id not in self.flow_progress:
                await self.initialize_dashboard(investigation_id)

            flow_progress = self.flow_progress[investigation_id]

            # Update flow progress
            if "current_phase" in flow_data:
                flow_progress.current_phase = InvestigationPhase(
                    flow_data["current_phase"]
                )

            if "completed_phases" in flow_data:
                flow_progress.completed_phases = [
                    InvestigationPhase(phase) for phase in flow_data["completed_phases"]
                ]

            # Update phase durations
            if "phase_duration" in flow_data:
                phase_name = flow_data.get(
                    "phase_name", str(flow_progress.current_phase)
                )
                flow_progress.phase_durations[phase_name] = flow_data["phase_duration"]

            # Calculate completion percentage
            total_phases = len(InvestigationPhase)
            completed_count = len(flow_progress.completed_phases)
            flow_progress.completion_percentage = (completed_count / total_phases) * 100

            # Identify bottlenecks
            flow_progress.bottlenecks = await self._identify_bottlenecks(
                investigation_id
            )

            # Update quality score
            flow_progress.quality_score = await self._calculate_quality_score(
                investigation_id
            )

            # Broadcast to dashboard connections
            await self._broadcast_dashboard_update(
                investigation_id,
                DashboardViewType.INVESTIGATION_FLOW,
                asdict(flow_progress),
            )

            self.logger.debug(f"Updated investigation flow: {investigation_id}")

        except Exception as e:
            self.logger.error(f"Failed to update investigation flow: {str(e)}")

    async def update_performance_metrics(
        self, investigation_id: str, metrics_data: Dict[str, Any]
    ) -> None:
        """Update performance metrics and optimization recommendations"""
        try:
            if investigation_id not in self.performance_metrics:
                await self.initialize_dashboard(investigation_id)

            metrics = self.performance_metrics[investigation_id]

            # Update metrics
            metrics.timestamp = datetime.now()

            if "decision_latency_ms" in metrics_data:
                metrics.decision_latency_ms = metrics_data["decision_latency_ms"]

            if "agent_handoff_efficiency" in metrics_data:
                metrics.agent_handoff_efficiency = metrics_data[
                    "agent_handoff_efficiency"
                ]

            if "investigation_success_rate" in metrics_data:
                metrics.investigation_success_rate = metrics_data[
                    "investigation_success_rate"
                ]

            if "resource_utilization" in metrics_data:
                metrics.resource_utilization.update(
                    metrics_data["resource_utilization"]
                )

            # Generate optimization recommendations
            metrics.optimization_recommendations = (
                await self._generate_optimization_recommendations(
                    investigation_id, metrics
                )
            )

            # Update performance trends
            await self._update_performance_trends(investigation_id, metrics)

            # Detect anomalies
            metrics.anomalies = await self._detect_performance_anomalies(
                investigation_id, metrics
            )

            # Broadcast to dashboard connections
            await self._broadcast_dashboard_update(
                investigation_id, DashboardViewType.PERFORMANCE_METRICS, asdict(metrics)
            )

            self.logger.debug(f"Updated performance metrics: {investigation_id}")

        except Exception as e:
            self.logger.error(f"Failed to update performance metrics: {str(e)}")

    async def get_dashboard_view(
        self,
        investigation_id: str,
        view_type: DashboardViewType,
        time_range: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        """Get specific dashboard view data"""
        try:
            if view_type == DashboardViewType.REAL_TIME_DECISIONS:
                decisions = self.decision_history.get(investigation_id, [])
                if time_range:
                    decisions = self._filter_by_time_range(decisions, time_range)
                return {
                    "view_type": view_type.value,
                    "decisions": [asdict(d) for d in decisions],
                    "total_decisions": len(decisions),
                }

            elif view_type == DashboardViewType.AGENT_COORDINATION:
                timeline = self.coordination_timelines.get(investigation_id, [])
                if time_range:
                    timeline = self._filter_by_time_range(timeline, time_range)
                return {
                    "view_type": view_type.value,
                    "timeline": [asdict(t) for t in timeline],
                    "active_coordinations": len(
                        [t for t in timeline if t.status == "in_progress"]
                    ),
                }

            elif view_type == DashboardViewType.INVESTIGATION_FLOW:
                flow = self.flow_progress.get(investigation_id)
                if not flow:
                    return {
                        "view_type": view_type.value,
                        "error": "Flow data not available",
                    }
                return {"view_type": view_type.value, "flow_progress": asdict(flow)}

            elif view_type == DashboardViewType.PERFORMANCE_METRICS:
                metrics = self.performance_metrics.get(investigation_id)
                if not metrics:
                    return {
                        "view_type": view_type.value,
                        "error": "Metrics data not available",
                    }
                return {
                    "view_type": view_type.value,
                    "performance_metrics": asdict(metrics),
                }

            elif view_type == DashboardViewType.BOTTLENECK_ANALYSIS:
                bottlenecks = await self._identify_bottlenecks(investigation_id)
                return {
                    "view_type": view_type.value,
                    "bottlenecks": bottlenecks,
                    "recommendations": await self._get_bottleneck_recommendations(
                        bottlenecks
                    ),
                }

            else:
                return {"error": f"Unknown view type: {view_type}"}

        except Exception as e:
            self.logger.error(f"Failed to get dashboard view {view_type}: {str(e)}")
            return {"error": str(e)}

    # Private helper methods

    def _determine_impact_level(self, decision_data: Dict[str, Any]) -> str:
        """Determine the impact level of a decision"""
        confidence = decision_data.get("confidence_score", 0.5)
        decision_type = decision_data.get("decision_type", "")

        if "critical" in decision_type.lower() or confidence > 0.9:
            return "critical"
        elif "important" in decision_type.lower() or confidence > 0.7:
            return "high"
        elif confidence > 0.5:
            return "medium"
        else:
            return "low"

    def _determine_visualization_type(self, decision_type: str) -> str:
        """Determine the best visualization type for a decision"""
        decision_type_lower = decision_type.lower()

        if "strategy" in decision_type_lower:
            return "flowchart"
        elif "agent" in decision_type_lower or "coordination" in decision_type_lower:
            return "tree"
        elif "comparison" in decision_type_lower or "evaluation" in decision_type_lower:
            return "matrix"
        else:
            return "timeline"

    async def _update_critical_path(self, investigation_id: str) -> None:
        """Update the critical path for investigation flow"""
        try:
            timeline = self.coordination_timelines.get(investigation_id, [])
            if not timeline:
                return

            # Simple critical path calculation based on dependencies
            nodes = set()
            edges = []

            for entry in timeline:
                nodes.add(entry.source_agent)
                nodes.add(entry.target_agent)
                edges.append(
                    (entry.source_agent, entry.target_agent, entry.estimated_completion)
                )

            # For now, use a simple longest path approach
            # In production, implement proper critical path method (CPM)
            critical_path = list(nodes)  # Simplified

            if investigation_id in self.flow_progress:
                self.flow_progress[investigation_id].critical_path = critical_path

        except Exception as e:
            self.logger.error(f"Failed to update critical path: {str(e)}")

    async def _identify_bottlenecks(
        self, investigation_id: str
    ) -> List[Dict[str, Any]]:
        """Identify bottlenecks in the investigation flow"""
        try:
            bottlenecks = []
            timeline = self.coordination_timelines.get(investigation_id, [])

            for entry in timeline:
                if entry.status == "in_progress":
                    duration = (datetime.now() - entry.timestamp).total_seconds()
                    if duration > self.bottleneck_threshold_seconds:
                        bottlenecks.append(
                            {
                                "type": "agent_coordination",
                                "description": f"Agent handoff from {entry.source_agent} to {entry.target_agent} taking too long",
                                "duration_seconds": duration,
                                "severity": "high" if duration > 60 else "medium",
                                "recommendations": [
                                    f"Check {entry.target_agent} availability",
                                    "Consider alternative agent selection",
                                    "Review coordination strategy",
                                ],
                            }
                        )

            return bottlenecks

        except Exception as e:
            self.logger.error(f"Failed to identify bottlenecks: {str(e)}")
            return []

    async def _calculate_quality_score(self, investigation_id: str) -> float:
        """Calculate investigation quality score based on multiple factors"""
        try:
            # Get investigation state and metrics
            state = await self.state_manager.get_investigation_state(investigation_id)
            metrics = self.performance_metrics.get(investigation_id)

            if not state or not metrics:
                return 0.5  # Default score

            # Quality factors (weights sum to 1.0)
            factors = {
                "decision_confidence": 0.3,  # Average decision confidence
                "coordination_efficiency": 0.2,  # Agent handoff success rate
                "completion_rate": 0.2,  # Phase completion without errors
                "response_time": 0.15,  # Overall investigation speed
                "data_quality": 0.15,  # Quality of collected data
            }

            # Calculate individual scores (0-1)
            scores = {
                "decision_confidence": metrics.investigation_success_rate,
                "coordination_efficiency": metrics.agent_handoff_efficiency,
                "completion_rate": (
                    len(self.flow_progress[investigation_id].completed_phases)
                    / len(InvestigationPhase)
                    if investigation_id in self.flow_progress
                    else 0.0
                ),
                "response_time": min(
                    1.0, 30.0 / max(1.0, metrics.decision_latency_ms / 1000.0)
                ),
                "data_quality": 0.8,  # Placeholder - would calculate from actual data quality metrics
            }

            # Weighted average
            quality_score = sum(
                scores[factor] * weight for factor, weight in factors.items()
            )

            return min(1.0, max(0.0, quality_score))

        except Exception as e:
            self.logger.error(f"Failed to calculate quality score: {str(e)}")
            return 0.5

    async def _generate_optimization_recommendations(
        self, investigation_id: str, metrics: PerformanceMetrics
    ) -> List[str]:
        """Generate optimization recommendations based on performance data"""
        try:
            recommendations = []

            # Decision latency optimization
            if metrics.decision_latency_ms > 1000:  # > 1 second
                recommendations.append("Consider optimizing AI decision-making prompts")
                recommendations.append(
                    "Implement decision caching for similar scenarios"
                )

            # Agent handoff efficiency optimization
            if metrics.agent_handoff_efficiency < 0.8:
                recommendations.append("Review agent selection criteria")
                recommendations.append("Implement preemptive agent warming")

            # Investigation success rate optimization
            if metrics.investigation_success_rate < 0.9:
                recommendations.append(
                    "Review failure patterns and implement additional fallbacks"
                )
                recommendations.append("Enhance error recovery mechanisms")

            # Resource utilization optimization
            cpu_usage = metrics.resource_utilization.get("cpu_percent", 0)
            if cpu_usage > 80:
                recommendations.append("Consider scaling orchestrator resources")

            memory_usage = metrics.resource_utilization.get("memory_percent", 0)
            if memory_usage > 80:
                recommendations.append("Optimize memory usage in agent coordination")

            return recommendations

        except Exception as e:
            self.logger.error(
                f"Failed to generate optimization recommendations: {str(e)}"
            )
            return []

    async def _update_performance_trends(
        self, investigation_id: str, metrics: PerformanceMetrics
    ) -> None:
        """Update performance trends for historical analysis"""
        try:
            trend_metrics = [
                "decision_latency_ms",
                "agent_handoff_efficiency",
                "investigation_success_rate",
            ]

            for metric_name in trend_metrics:
                if metric_name not in metrics.performance_trends:
                    metrics.performance_trends[metric_name] = []

                # Add current value
                current_value = getattr(metrics, metric_name)
                metrics.performance_trends[metric_name].append(current_value)

                # Keep only last 100 data points
                if len(metrics.performance_trends[metric_name]) > 100:
                    metrics.performance_trends[metric_name] = (
                        metrics.performance_trends[metric_name][-100:]
                    )

        except Exception as e:
            self.logger.error(f"Failed to update performance trends: {str(e)}")

    async def _detect_performance_anomalies(
        self, investigation_id: str, metrics: PerformanceMetrics
    ) -> List[Dict[str, Any]]:
        """Detect performance anomalies using simple statistical methods"""
        try:
            anomalies = []

            for metric_name, values in metrics.performance_trends.items():
                if len(values) < 10:  # Need enough data points
                    continue

                # Simple anomaly detection: values beyond 2 standard deviations
                import statistics

                mean = statistics.mean(values)
                stdev = statistics.stdev(values)
                current_value = values[-1]

                z_score = abs((current_value - mean) / stdev) if stdev > 0 else 0

                if z_score > 2:  # Anomaly threshold
                    anomalies.append(
                        {
                            "metric": metric_name,
                            "current_value": current_value,
                            "mean": mean,
                            "z_score": z_score,
                            "severity": "high" if z_score > 3 else "medium",
                            "description": f"{metric_name} is {z_score:.2f} standard deviations from normal",
                        }
                    )

            return anomalies

        except Exception as e:
            self.logger.error(f"Failed to detect performance anomalies: {str(e)}")
            return []

    async def _get_bottleneck_recommendations(
        self, bottlenecks: List[Dict[str, Any]]
    ) -> List[str]:
        """Get recommendations for resolving bottlenecks"""
        try:
            recommendations = []

            for bottleneck in bottlenecks:
                if bottleneck["type"] == "agent_coordination":
                    recommendations.extend(bottleneck.get("recommendations", []))

            # Add general recommendations
            if len(bottlenecks) > 3:
                recommendations.append("Consider implementing parallel agent execution")
                recommendations.append(
                    "Review overall investigation strategy for optimization"
                )

            return list(set(recommendations))  # Remove duplicates

        except Exception as e:
            self.logger.error(f"Failed to get bottleneck recommendations: {str(e)}")
            return []

    def _filter_by_time_range(
        self, data: List[Any], time_range: Dict[str, str]
    ) -> List[Any]:
        """Filter data by time range"""
        try:
            start_time = (
                datetime.fromisoformat(time_range["start"])
                if "start" in time_range
                else None
            )
            end_time = (
                datetime.fromisoformat(time_range["end"])
                if "end" in time_range
                else None
            )

            filtered_data = []
            for item in data:
                item_time = getattr(item, "timestamp", None)
                if item_time:
                    if start_time and item_time < start_time:
                        continue
                    if end_time and item_time > end_time:
                        continue
                    filtered_data.append(item)

            return filtered_data

        except Exception as e:
            self.logger.error(f"Failed to filter by time range: {str(e)}")
            return data

    async def _broadcast_dashboard_update(
        self,
        investigation_id: str,
        view_type: DashboardViewType,
        update_data: Dict[str, Any],
    ) -> None:
        """Broadcast dashboard update to connected clients"""
        try:
            message = {
                "type": "dashboard_update",
                "investigation_id": investigation_id,
                "view_type": view_type.value,
                "timestamp": datetime.now().isoformat(),
                "data": update_data,
            }

            # Use WebSocket handler to broadcast
            await self.websocket_handler.broadcast_custom_event(
                investigation_id, "dashboard_update", message
            )

        except Exception as e:
            self.logger.error(f"Failed to broadcast dashboard update: {str(e)}")
