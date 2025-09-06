"""
LangGraph Journey Tracking and Visualization System

This module provides comprehensive tracking and visualization of LangGraph investigation
journeys, capturing every node execution, state transition, and agent coordination
to provide complete visibility into autonomous investigation workflows.
"""

import asyncio
import json
import threading
from typing import Dict, List, Any, Optional, Tuple, Set
from datetime import datetime, timezone
from dataclasses import dataclass, asdict
from pathlib import Path
from enum import Enum
from app.service.logging import get_bridge_logger

# Optional networkx import for visualization features
try:
    import networkx as nx
except ImportError:
    nx = None
import uuid

logger = get_bridge_logger(__name__)

class NodeType(Enum):
    AGENT = "agent"
    TOOL = "tool" 
    CONDITION = "condition"
    START = "start"
    END = "end"
    PARALLEL = "parallel"
    ROUTER = "router"

class NodeStatus(Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"

@dataclass
class NodeExecution:
    """Detailed record of a single node execution"""
    execution_id: str
    investigation_id: str
    node_name: str
    node_type: NodeType
    timestamp: str
    duration_ms: int
    status: NodeStatus
    input_state: Dict[str, Any]
    output_state: Dict[str, Any]
    state_changes: Dict[str, Any]  # What changed from input to output
    metadata: Dict[str, Any]
    agent_name: Optional[str] = None
    tool_name: Optional[str] = None
    error_message: Optional[str] = None
    retry_count: int = 0

@dataclass
class StateTransition:
    """Record of state changes between nodes"""
    transition_id: str
    investigation_id: str
    from_node: str
    to_node: str
    timestamp: str
    state_before: Dict[str, Any]
    state_after: Dict[str, Any]
    transition_reason: str
    condition_result: Optional[Dict[str, Any]] = None

@dataclass
class AgentCoordination:
    """Record of agent handoffs and coordination"""
    coordination_id: str
    investigation_id: str
    from_agent: Optional[str]
    to_agent: str
    timestamp: str
    handoff_context: Dict[str, Any]
    reasoning: str
    coordination_type: str  # handoff, parallel, collaboration

@dataclass
class InvestigationJourney:
    """Complete journey record for an investigation"""
    investigation_id: str
    start_timestamp: str
    end_timestamp: Optional[str]
    status: str
    node_executions: List[NodeExecution]
    state_transitions: List[StateTransition]
    agent_coordinations: List[AgentCoordination]
    final_state: Dict[str, Any]
    journey_metadata: Dict[str, Any]

class LangGraphJourneyTracker:
    """
    Comprehensive tracking system for LangGraph investigation journeys.
    
    Features:
    - Track every node execution with timing and state changes
    - Monitor agent coordination and handoffs
    - Generate visual journey maps and execution flows
    - Provide real-time progress monitoring
    - Create detailed audit trails for investigation workflows
    """
    
    def __init__(self, output_directory: Optional[Path] = None):
        self.output_directory = output_directory or Path("logs/journey_tracking")
        self.output_directory.mkdir(parents=True, exist_ok=True)
        
        # Thread-safe active journey tracking
        self._active_journeys: Dict[str, InvestigationJourney] = {}
        self._journey_graphs: Dict[str, Any] = {}  # nx.DiGraph if networkx available
        self._journey_locks: Dict[str, threading.RLock] = {}
        self._global_lock = threading.RLock()
        
        # Callback for real-time monitoring
        self._monitoring_callbacks: List[callable] = []
        
        logger.info(f"Initialized LangGraphJourneyTracker with output: {self.output_directory}")
    
    def start_journey_tracking(self, investigation_id: str, initial_state: Dict[str, Any]) -> None:
        """Initialize journey tracking for a new investigation with thread-safety"""
        with self._global_lock:
            # Don't recreate if already exists
            if investigation_id in self._active_journeys:
                logger.debug(f"Journey tracking already active for investigation: {investigation_id}")
                return
                
            journey = InvestigationJourney(
                investigation_id=investigation_id,
                start_timestamp=datetime.now(timezone.utc).isoformat(),
                end_timestamp=None,
                status="in_progress",
                node_executions=[],
                state_transitions=[],
                agent_coordinations=[],
                final_state={},
                journey_metadata={
                    "initial_state": initial_state,
                    "started_at": datetime.now(timezone.utc).isoformat()
                }
            )
            
            self._active_journeys[investigation_id] = journey
            self._journey_graphs[investigation_id] = nx.DiGraph() if nx else {}
            self._journey_locks[investigation_id] = threading.RLock()
            
            logger.info(f"Started journey tracking for investigation: {investigation_id}")
    
    def track_node_execution(
        self,
        investigation_id: str,
        node_name: str,
        node_type: NodeType,
        input_state: Dict[str, Any],
        output_state: Dict[str, Any],
        duration_ms: int,
        status: NodeStatus = NodeStatus.COMPLETED,
        agent_name: Optional[str] = None,
        tool_name: Optional[str] = None,
        metadata: Dict[str, Any] = None,
        error_message: Optional[str] = None,
        retry_count: int = 0
    ) -> str:
        """Track execution of a single LangGraph node with thread-safety and resilience"""
        
        # Get or create journey lock
        with self._global_lock:
            if investigation_id not in self._journey_locks:
                self._journey_locks[investigation_id] = threading.RLock()
            journey_lock = self._journey_locks[investigation_id]
        
        with journey_lock:
            if investigation_id not in self._active_journeys:
                logger.warning(
                    f"No active journey for investigation: {investigation_id}. "
                    f"Creating emergency journey for node tracking."
                )
                # Create emergency journey to prevent data loss
                self.start_journey_tracking(investigation_id, {
                    "emergency_created": True,
                    "first_node": node_name,
                    "agent_name": agent_name
                })
                
            if investigation_id not in self._active_journeys:
                logger.error(f"Failed to create journey for investigation: {investigation_id}")
                return None
        
        execution_id = str(uuid.uuid4())
        state_changes = self._calculate_state_changes(input_state, output_state)
        
        node_execution = NodeExecution(
            execution_id=execution_id,
            investigation_id=investigation_id,
            node_name=node_name,
            node_type=node_type,
            timestamp=datetime.now(timezone.utc).isoformat(),
            duration_ms=duration_ms,
            status=status,
            input_state=input_state,
            output_state=output_state,
            state_changes=state_changes,
            metadata=metadata or {},
            agent_name=agent_name,
            tool_name=tool_name,
            error_message=error_message,
            retry_count=retry_count
        )
        
        journey = self._active_journeys[investigation_id]
        journey.node_executions.append(node_execution)
        
        # Update journey graph (if networkx available)
        if nx:
            graph = self._journey_graphs[investigation_id]
            graph.add_node(node_name, 
                          node_type=node_type.value,
                          status=status.value,
                          duration_ms=duration_ms,
                          agent_name=agent_name,
                          tool_name=tool_name,
                          execution_count=len([n for n in journey.node_executions if n.node_name == node_name]))
        
        # Notify monitoring callbacks
        self._notify_callbacks(investigation_id, "node_execution", asdict(node_execution))
        
        logger.debug(f"Tracked node execution: {node_name} ({duration_ms}ms) - {status.value}")
        return execution_id
    
    def track_state_transition(
        self,
        investigation_id: str,
        from_node: str,
        to_node: str,
        state_before: Dict[str, Any],
        state_after: Dict[str, Any],
        transition_reason: str,
        condition_result: Optional[Dict[str, Any]] = None
    ) -> str:
        """Track state transitions between nodes with thread-safety"""
        
        # Get or create journey lock
        with self._global_lock:
            if investigation_id not in self._journey_locks:
                self._journey_locks[investigation_id] = threading.RLock()
            journey_lock = self._journey_locks[investigation_id]
        
        with journey_lock:
            if investigation_id not in self._active_journeys:
                logger.warning(
                    f"No active journey for investigation: {investigation_id}. "
                    f"Creating emergency journey for state tracking."
                )
                # Create emergency journey
                self.start_journey_tracking(investigation_id, {
                    "emergency_created": True,
                    "first_transition": f"{from_node} -> {to_node}"
                })
                
            if investigation_id not in self._active_journeys:
                logger.error(f"Failed to create journey for state transition: {investigation_id}")
                return None
        
        transition_id = str(uuid.uuid4())
        
        state_transition = StateTransition(
            transition_id=transition_id,
            investigation_id=investigation_id,
            from_node=from_node,
            to_node=to_node,
            timestamp=datetime.now(timezone.utc).isoformat(),
            state_before=state_before,
            state_after=state_after,
            transition_reason=transition_reason,
            condition_result=condition_result
        )
        
        journey = self._active_journeys[investigation_id]
        journey.state_transitions.append(state_transition)
        
        # Update journey graph with edge (if networkx available)
        if nx:
            graph = self._journey_graphs[investigation_id]
            graph.add_edge(from_node, to_node, 
                          transition_reason=transition_reason,
                          timestamp=state_transition.timestamp)
        
        self._notify_callbacks(investigation_id, "state_transition", asdict(state_transition))
        
        logger.debug(f"Tracked state transition: {from_node} -> {to_node} ({transition_reason})")
        return transition_id
    
    def track_agent_coordination(
        self,
        investigation_id: str,
        from_agent: Optional[str],
        to_agent: str,
        handoff_context: Dict[str, Any],
        reasoning: str,
        coordination_type: str = "handoff"
    ) -> str:
        """Track agent handoffs and coordination events with thread-safety"""
        
        # Get or create journey lock
        with self._global_lock:
            if investigation_id not in self._journey_locks:
                self._journey_locks[investigation_id] = threading.RLock()
            journey_lock = self._journey_locks[investigation_id]
        
        with journey_lock:
            if investigation_id not in self._active_journeys:
                logger.warning(
                    f"No active journey for investigation: {investigation_id}. "
                    f"Creating emergency journey for agent coordination."
                )
                # Create emergency journey
                self.start_journey_tracking(investigation_id, {
                    "emergency_created": True,
                    "first_coordination": f"{from_agent} -> {to_agent}"
                })
                
            if investigation_id not in self._active_journeys:
                logger.error(f"Failed to create journey for agent coordination: {investigation_id}")
                return None
        
        coordination_id = str(uuid.uuid4())
        
        agent_coordination = AgentCoordination(
            coordination_id=coordination_id,
            investigation_id=investigation_id,
            from_agent=from_agent,
            to_agent=to_agent,
            timestamp=datetime.now(timezone.utc).isoformat(),
            handoff_context=handoff_context,
            reasoning=reasoning,
            coordination_type=coordination_type
        )
        
        journey = self._active_journeys[investigation_id]
        journey.agent_coordinations.append(agent_coordination)
        
        self._notify_callbacks(investigation_id, "agent_coordination", asdict(agent_coordination))
        
        logger.debug(f"Tracked agent coordination: {from_agent} -> {to_agent} ({coordination_type})")
        return coordination_id
    
    def complete_journey(self, investigation_id: str, final_state: Dict[str, Any]) -> InvestigationJourney:
        """Complete journey tracking and generate final journey record with thread-safety"""
        
        # Get journey lock
        with self._global_lock:
            if investigation_id not in self._journey_locks:
                logger.warning(f"No journey lock for investigation: {investigation_id}")
                return None
            journey_lock = self._journey_locks[investigation_id]
        
        with journey_lock:
            if investigation_id not in self._active_journeys:
                logger.warning(f"No active journey for investigation: {investigation_id}")
                return None
            
            journey = self._active_journeys[investigation_id]
        journey.end_timestamp = datetime.now(timezone.utc).isoformat()
        journey.status = "completed"
        journey.final_state = final_state
        
        # Calculate journey statistics
        total_duration = sum(execution.duration_ms for execution in journey.node_executions)
        unique_agents = set(execution.agent_name for execution in journey.node_executions if execution.agent_name)
        
        journey.journey_metadata.update({
            "completed_at": journey.end_timestamp,
            "total_duration_ms": total_duration,
            "total_nodes_executed": len(journey.node_executions),
            "total_state_transitions": len(journey.state_transitions),
            "total_agent_coordinations": len(journey.agent_coordinations),
            "unique_agents_involved": list(unique_agents),
            "execution_path": [execution.node_name for execution in journey.node_executions]
        })
        
        # Save journey to disk
        self._save_journey(journey)
        
        # Remove from active tracking
        del self._active_journeys[investigation_id]
        # Clean up journey graph and lock
        if investigation_id in self._journey_graphs:
            del self._journey_graphs[investigation_id]
        if investigation_id in self._journey_locks:
            del self._journey_locks[investigation_id]
        
        logger.info(f"Completed journey tracking for investigation: {investigation_id} "
                   f"({total_duration}ms, {len(journey.node_executions)} nodes)")
        
        return journey
    
    def get_journey_status(self, investigation_id: str) -> Dict[str, Any]:
        """Get current status of an active journey with thread-safety"""
        
        # Get journey lock if exists
        with self._global_lock:
            if investigation_id not in self._journey_locks:
                return {"error": f"No active journey for investigation: {investigation_id}"}
            journey_lock = self._journey_locks[investigation_id]
        
        with journey_lock:
            if investigation_id not in self._active_journeys:
                return {"error": f"No active journey for investigation: {investigation_id}"}
        
        journey = self._active_journeys[investigation_id]
        graph = self._journey_graphs[investigation_id]
        
        # Calculate progress metrics
        recent_executions = journey.node_executions[-5:] if journey.node_executions else []
        current_agents = set(execution.agent_name for execution in recent_executions if execution.agent_name)
        
        return {
            "investigation_id": investigation_id,
            "status": journey.status,
            "start_time": journey.start_timestamp,
            "duration_so_far_ms": sum(execution.duration_ms for execution in journey.node_executions),
            "nodes_executed": len(journey.node_executions),
            "state_transitions": len(journey.state_transitions),
            "agent_coordinations": len(journey.agent_coordinations),
            "current_active_agents": list(current_agents),
            "recent_node_executions": [
                {
                    "node_name": execution.node_name,
                    "timestamp": execution.timestamp,
                    "status": execution.status.value,
                    "agent_name": execution.agent_name
                }
                for execution in recent_executions
            ],
            "graph_structure": {
                "total_nodes": graph.number_of_nodes() if nx and hasattr(graph, 'number_of_nodes') else 0,
                "total_edges": graph.number_of_edges() if nx and hasattr(graph, 'number_of_edges') else 0,
                "execution_path": [execution.node_name for execution in journey.node_executions]
            }
        }
    
    def track_tool_selection(
        self,
        investigation_id: str,
        domain: str,
        selection_time_ms: float,
        tools_selected: int,
        strategy: str = "unknown"
    ) -> None:
        """Track tool selection performance metrics with thread-safety.
        
        Args:
            investigation_id: Investigation identifier
            domain: Investigation domain
            selection_time_ms: Time taken for tool selection
            tools_selected: Number of tools selected
            strategy: Selection strategy used (rag_enhanced, static, etc.)
        """
        try:
            # Get or create journey lock
            with self._global_lock:
                if investigation_id not in self._journey_locks:
                    self._journey_locks[investigation_id] = threading.RLock()
                journey_lock = self._journey_locks[investigation_id]
            
            with journey_lock:
                # Create a pseudo node execution for tool selection tracking
                execution = NodeExecution(
                    execution_id=str(uuid.uuid4()),
                    investigation_id=investigation_id,
                    node_name=f"tool_selection_{domain}",
                    node_type=NodeType.TOOL,
                    timestamp=datetime.now(timezone.utc).isoformat(),
                    duration_ms=int(selection_time_ms),
                    status=NodeStatus.COMPLETED,
                    input_state={"domain": domain, "strategy": strategy},
                    output_state={
                        "tools_selected": tools_selected, 
                        "selection_time_ms": selection_time_ms,
                        "performance_target_met": selection_time_ms <= 100
                    },
                    metadata={
                        "tracking_type": "tool_selection",
                        "domain": domain,
                        "strategy": strategy,
                        "tools_count": tools_selected,
                        "performance_ms": selection_time_ms,
                        "target_met": selection_time_ms <= 100
                    },
                    agent_name=f"ToolSelector-{strategy.title()}"
                )
            
                # Store the execution in active journey
                if investigation_id in self._active_journeys:
                    self._active_journeys[investigation_id].node_executions.append(execution)
                else:
                    # Create new journey if needed
                    journey = InvestigationJourney(
                        investigation_id=investigation_id,
                        start_timestamp=datetime.now(timezone.utc).isoformat(),
                        end_timestamp=None,
                        status="in_progress", 
                        node_executions=[execution],
                        state_transitions=[],
                        agent_coordinations=[],
                        final_state={},
                        journey_metadata={
                            "created_for_tool_tracking": True,
                            "domain": domain
                        }
                    )
                    self._active_journeys[investigation_id] = journey
            
            logger.debug(
                f"🚀 Tool selection tracked for {domain}: {tools_selected} tools selected "
                f"in {selection_time_ms:.1f}ms using {strategy} strategy"
            )
            
        except Exception as e:
            logger.error(f"Failed to track tool selection for {domain}: {str(e)}")
    
    def generate_journey_visualization(self, investigation_id: str) -> Dict[str, Any]:
        """Generate visual representation of investigation journey"""
        
        journey = self._active_journeys.get(investigation_id)
        if not journey:
            # Try to load completed journey
            journey_file = self.output_directory / f"journey_{investigation_id}.json"
            if journey_file.exists():
                with open(journey_file, 'r') as f:
                    journey_data = json.load(f)
                    journey = InvestigationJourney(**journey_data)
            else:
                return {"error": f"Journey not found: {investigation_id}"}
        
        graph = self._journey_graphs.get(investigation_id, nx.DiGraph() if nx else {})
        
        # Generate visualization data
        visualization = {
            "investigation_id": investigation_id,
            "journey_metadata": journey.journey_metadata,
            "nodes": [],
            "edges": [],
            "timeline": [],
            "agent_flow": [],
            "state_evolution": []
        }
        
        # Process nodes for visualization
        node_positions = {}
        for i, execution in enumerate(journey.node_executions):
            node_data = {
                "id": execution.node_name,
                "type": execution.node_type.value,
                "status": execution.status.value,
                "agent_name": execution.agent_name,
                "tool_name": execution.tool_name,
                "duration_ms": execution.duration_ms,
                "position": {"x": i * 100, "y": 0},  # Simple linear layout
                "timestamp": execution.timestamp,
                "retry_count": execution.retry_count
            }
            visualization["nodes"].append(node_data)
            node_positions[execution.node_name] = i
        
        # Process edges for visualization
        for transition in journey.state_transitions:
            if transition.from_node in node_positions and transition.to_node in node_positions:
                edge_data = {
                    "from": transition.from_node,
                    "to": transition.to_node,
                    "reason": transition.transition_reason,
                    "timestamp": transition.timestamp
                }
                visualization["edges"].append(edge_data)
        
        # Generate timeline
        all_events = []
        
        # Add node executions to timeline
        for execution in journey.node_executions:
            all_events.append({
                "timestamp": execution.timestamp,
                "type": "node_execution",
                "description": f"Executed {execution.node_name} ({execution.node_type.value})",
                "agent": execution.agent_name,
                "duration_ms": execution.duration_ms,
                "status": execution.status.value
            })
        
        # Add agent coordinations to timeline
        for coordination in journey.agent_coordinations:
            all_events.append({
                "timestamp": coordination.timestamp,
                "type": "agent_coordination",
                "description": f"Agent handoff: {coordination.from_agent} -> {coordination.to_agent}",
                "reasoning": coordination.reasoning
            })
        
        # Sort timeline by timestamp
        all_events.sort(key=lambda x: x["timestamp"])
        visualization["timeline"] = all_events
        
        # Generate agent flow
        agent_flow = []
        current_agents = set()
        for execution in journey.node_executions:
            if execution.agent_name:
                if execution.agent_name not in current_agents:
                    agent_flow.append({
                        "timestamp": execution.timestamp,
                        "event": "agent_started",
                        "agent": execution.agent_name,
                        "node": execution.node_name
                    })
                    current_agents.add(execution.agent_name)
        
        visualization["agent_flow"] = agent_flow
        
        return visualization
    
    def _calculate_state_changes(self, input_state: Dict[str, Any], output_state: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate what changed between input and output states"""
        changes = {}
        
        # Find added keys
        added_keys = set(output_state.keys()) - set(input_state.keys())
        if added_keys:
            changes["added"] = {key: output_state[key] for key in added_keys}
        
        # Find removed keys
        removed_keys = set(input_state.keys()) - set(output_state.keys())
        if removed_keys:
            changes["removed"] = list(removed_keys)
        
        # Find modified values
        modified = {}
        for key in set(input_state.keys()) & set(output_state.keys()):
            if input_state[key] != output_state[key]:
                modified[key] = {
                    "old": input_state[key],
                    "new": output_state[key]
                }
        
        if modified:
            changes["modified"] = modified
        
        return changes
    
    def _save_journey(self, journey: InvestigationJourney) -> None:
        """Save journey to disk for persistence"""
        journey_file = self.output_directory / f"journey_{journey.investigation_id}.json"
        
        # Convert journey to JSON-serializable format
        journey_dict = asdict(journey)
        
        with open(journey_file, 'w') as f:
            json.dump(journey_dict, f, indent=2, default=str)
        
        logger.debug(f"Saved journey to: {journey_file}")
    
    def _notify_callbacks(self, investigation_id: str, event_type: str, data: Dict[str, Any]) -> None:
        """Notify monitoring callbacks of journey events"""
        for callback in self._monitoring_callbacks:
            try:
                callback(investigation_id, event_type, data)
            except Exception as e:
                logger.warning(f"Journey monitoring callback failed: {e}")
    
    def add_monitoring_callback(self, callback: callable) -> None:
        """Add callback for real-time journey monitoring"""
        self._monitoring_callbacks.append(callback)
    
    def export_journey_mermaid(self, investigation_id: str) -> str:
        """Export journey as Mermaid diagram"""
        
        journey = self._active_journeys.get(investigation_id)
        if not journey:
            return "Journey not found"
        
        mermaid_lines = [
            "graph TD",
            "    %% Investigation Journey Diagram",
            f"    %% Investigation ID: {investigation_id}",
            ""
        ]
        
        # Add nodes
        for i, execution in enumerate(journey.node_executions):
            node_id = f"N{i}"
            node_label = execution.node_name
            if execution.agent_name:
                node_label += f"<br/>{execution.agent_name}"
            
            status_color = {
                NodeStatus.COMPLETED: "fill:#90EE90",
                NodeStatus.FAILED: "fill:#FFB6C1",
                NodeStatus.IN_PROGRESS: "fill:#FFE4B5"
            }.get(execution.status, "fill:#E6E6FA")
            
            mermaid_lines.append(f"    {node_id}[\"{node_label}\"]")
            mermaid_lines.append(f"    style {node_id} {status_color}")
        
        # Add edges
        for i in range(len(journey.node_executions) - 1):
            mermaid_lines.append(f"    N{i} --> N{i+1}")
        
        return "\n".join(mermaid_lines)

# Global journey tracker instance
journey_tracker = LangGraphJourneyTracker()

def get_journey_tracker() -> LangGraphJourneyTracker:
    """Get the global journey tracker instance"""
    return journey_tracker