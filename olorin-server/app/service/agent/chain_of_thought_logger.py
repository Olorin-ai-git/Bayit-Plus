"""
Agent Chain of Thought Logging System

This module captures and logs the complete reasoning process of structured investigation
agents, including decision-making chains, tool selection reasoning, confidence assessments,
and collaborative agent interactions.

Provides complete visibility into how agents think, reason, and make decisions during
structured investigations for testing, debugging, and optimization.
"""

import json
from typing import Dict, List, Any, Optional, Union, Tuple
from datetime import datetime, timezone
from dataclasses import dataclass, asdict
from enum import Enum
from pathlib import Path
import uuid
import re
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

class ReasoningType(Enum):
    ANALYSIS = "analysis"
    DECISION = "decision" 
    TOOL_SELECTION = "tool_selection"
    RISK_ASSESSMENT = "risk_assessment"
    EVIDENCE_EVALUATION = "evidence_evaluation"
    HYPOTHESIS_FORMATION = "hypothesis_formation"
    CONCLUSION = "conclusion"
    COLLABORATION = "collaboration"
    ERROR_RECOVERY = "error_recovery"

class ConfidenceLevel(Enum):
    VERY_LOW = "very_low"    # 0.0 - 0.2
    LOW = "low"              # 0.2 - 0.4
    MEDIUM = "medium"        # 0.4 - 0.6
    HIGH = "high"            # 0.6 - 0.8
    VERY_HIGH = "very_high"  # 0.8 - 1.0

@dataclass
class ReasoningStep:
    """Individual step in agent's chain of thought"""
    step_id: str
    timestamp: str
    reasoning_type: ReasoningType
    premise: str
    reasoning: str
    conclusion: str
    confidence: float
    supporting_evidence: List[Dict[str, Any]]
    alternative_considerations: List[str]
    metadata: Dict[str, Any]

@dataclass
class ToolSelectionReasoning:
    """Detailed reasoning for tool selection decisions"""
    selection_id: str
    timestamp: str
    available_tools: List[str]
    selected_tools: List[str]
    rejected_tools: List[str]
    selection_criteria: Dict[str, Any]
    reasoning_chain: List[str]
    expected_outcomes: Dict[str, str]  # tool_name -> expected_outcome
    confidence_scores: Dict[str, float]  # tool_name -> confidence
    contextual_factors: Dict[str, Any]

@dataclass
class AgentThoughtProcess:
    """Complete thought process record for an agent"""
    process_id: str
    investigation_id: str
    agent_name: str
    domain: str  # device, location, network, logs
    start_timestamp: str
    end_timestamp: Optional[str]
    reasoning_steps: List[ReasoningStep]
    tool_selections: List[ToolSelectionReasoning]
    final_assessment: Dict[str, Any]
    collaboration_notes: List[Dict[str, Any]]
    performance_metrics: Dict[str, Any]

class ChainOfThoughtLogger:
    """
    Comprehensive logging system for agent reasoning and decision-making.
    
    Captures the complete chain of thought for each agent during structured
    investigations, providing transparency into agent decision-making processes.
    """
    
    def __init__(self, output_directory: Optional[Path] = None):
        self.output_directory = output_directory or Path("logs/chain_of_thought")
        self.output_directory.mkdir(parents=True, exist_ok=True)
        
        # Active thought processes
        self._active_processes: Dict[str, AgentThoughtProcess] = {}
        
        # Monitoring callbacks
        self._monitoring_callbacks: List[callable] = []
        
        logger.info(f"Initialized ChainOfThoughtLogger with directory: {self.output_directory}")
    
    def start_agent_thinking(
        self,
        investigation_id: str,
        agent_name: str,
        domain: str,
        initial_context: Dict[str, Any]
    ) -> str:
        """Start tracking an agent's thought process"""
        
        process_id = f"{agent_name}_{investigation_id}_{int(datetime.now().timestamp())}"
        
        thought_process = AgentThoughtProcess(
            process_id=process_id,
            investigation_id=investigation_id,
            agent_name=agent_name,
            domain=domain,
            start_timestamp=datetime.now(timezone.utc).isoformat(),
            end_timestamp=None,
            reasoning_steps=[],
            tool_selections=[],
            final_assessment={},
            collaboration_notes=[],
            performance_metrics={
                "start_time": datetime.now(timezone.utc).isoformat(),
                "initial_context": initial_context
            }
        )
        
        self._active_processes[process_id] = thought_process
        
        # Log the start of thinking
        self._log_thinking_event(investigation_id, agent_name, "thinking_started", {
            "process_id": process_id,
            "domain": domain,
            "initial_context": initial_context
        })
        
        logger.info(f"Started thought process tracking for {agent_name} on investigation {investigation_id}")
        return process_id
    
    def log_reasoning_step(
        self,
        process_id: str,
        reasoning_type: ReasoningType,
        premise: str,
        reasoning: str,
        conclusion: str,
        confidence: float,
        supporting_evidence: List[Dict[str, Any]] = None,
        alternative_considerations: List[str] = None,
        metadata: Dict[str, Any] = None
    ) -> str:
        """Log a single step in the agent's reasoning chain"""
        
        if process_id not in self._active_processes:
            logger.warning(f"No active thought process for ID: {process_id}")
            return None
        
        step_id = str(uuid.uuid4())
        confidence_level = self._classify_confidence(confidence)
        
        reasoning_step = ReasoningStep(
            step_id=step_id,
            timestamp=datetime.now(timezone.utc).isoformat(),
            reasoning_type=reasoning_type,
            premise=premise,
            reasoning=reasoning,
            conclusion=conclusion,
            confidence=confidence,
            supporting_evidence=supporting_evidence or [],
            alternative_considerations=alternative_considerations or [],
            metadata=(metadata or {})
        )
        
        # Add confidence level to metadata
        reasoning_step.metadata["confidence_level"] = confidence_level.value
        
        thought_process = self._active_processes[process_id]
        thought_process.reasoning_steps.append(reasoning_step)
        
        # Log the reasoning step
        self._log_thinking_event(
            thought_process.investigation_id,
            thought_process.agent_name,
            "reasoning_step",
            {
                "step_id": step_id,
                "reasoning_type": reasoning_type.value,
                "premise": premise,
                "conclusion": conclusion,
                "confidence": confidence,
                "confidence_level": confidence_level.value
            }
        )
        
        logger.debug(f"Logged reasoning step for {thought_process.agent_name}: "
                    f"{reasoning_type.value} (confidence: {confidence:.2f})")
        
        return step_id
    
    def log_tool_selection_reasoning(
        self,
        process_id: str,
        available_tools: List[str],
        selected_tools: List[str],
        selection_criteria: Dict[str, Any],
        reasoning_chain: List[str],
        expected_outcomes: Dict[str, str] = None,
        confidence_scores: Dict[str, float] = None,
        contextual_factors: Dict[str, Any] = None
    ) -> str:
        """Log detailed reasoning for tool selection decisions"""
        
        if process_id not in self._active_processes:
            logger.warning(f"No active thought process for ID: {process_id}")
            return None
        
        selection_id = str(uuid.uuid4())
        rejected_tools = list(set(available_tools) - set(selected_tools))
        
        tool_selection = ToolSelectionReasoning(
            selection_id=selection_id,
            timestamp=datetime.now(timezone.utc).isoformat(),
            available_tools=available_tools,
            selected_tools=selected_tools,
            rejected_tools=rejected_tools,
            selection_criteria=selection_criteria,
            reasoning_chain=reasoning_chain,
            expected_outcomes=expected_outcomes or {},
            confidence_scores=confidence_scores or {},
            contextual_factors=contextual_factors or {}
        )
        
        thought_process = self._active_processes[process_id]
        thought_process.tool_selections.append(tool_selection)
        
        # Log tool selection
        self._log_thinking_event(
            thought_process.investigation_id,
            thought_process.agent_name,
            "tool_selection",
            {
                "selection_id": selection_id,
                "selected_tools": selected_tools,
                "rejected_tools": rejected_tools,
                "primary_reasoning": reasoning_chain[0] if reasoning_chain else "No reasoning provided",
                "confidence_scores": confidence_scores
            }
        )
        
        logger.debug(f"Logged tool selection for {thought_process.agent_name}: "
                    f"{selected_tools} from {available_tools}")
        
        return selection_id
    
    def log_collaboration_thought(
        self,
        process_id: str,
        collaboration_type: str,
        target_agent: Optional[str],
        collaboration_context: Dict[str, Any],
        reasoning: str,
        expected_outcome: str
    ) -> str:
        """Log agent thoughts about collaboration with other agents"""
        
        if process_id not in self._active_processes:
            logger.warning(f"No active thought process for ID: {process_id}")
            return None
        
        collaboration_id = str(uuid.uuid4())
        
        collaboration_note = {
            "collaboration_id": collaboration_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "collaboration_type": collaboration_type,
            "target_agent": target_agent,
            "context": collaboration_context,
            "reasoning": reasoning,
            "expected_outcome": expected_outcome
        }
        
        thought_process = self._active_processes[process_id]
        thought_process.collaboration_notes.append(collaboration_note)
        
        self._log_thinking_event(
            thought_process.investigation_id,
            thought_process.agent_name,
            "collaboration_thought",
            collaboration_note
        )
        
        logger.debug(f"Logged collaboration thought for {thought_process.agent_name}: "
                    f"{collaboration_type} with {target_agent}")
        
        return collaboration_id
    
    def complete_agent_thinking(
        self,
        process_id: str,
        final_assessment: Dict[str, Any],
        performance_notes: Dict[str, Any] = None
    ) -> AgentThoughtProcess:
        """Complete an agent's thought process and generate summary"""
        
        if process_id not in self._active_processes:
            logger.warning(f"No active thought process for ID: {process_id}")
            return None
        
        thought_process = self._active_processes[process_id]
        thought_process.end_timestamp = datetime.now(timezone.utc).isoformat()
        thought_process.final_assessment = final_assessment
        
        # Calculate performance metrics
        start_time = datetime.fromisoformat(thought_process.start_timestamp.replace('Z', '+00:00'))
        end_time = datetime.now(timezone.utc)
        thinking_duration = (end_time - start_time).total_seconds() * 1000
        
        thought_process.performance_metrics.update({
            "end_time": thought_process.end_timestamp,
            "thinking_duration_ms": thinking_duration,
            "total_reasoning_steps": len(thought_process.reasoning_steps),
            "total_tool_selections": len(thought_process.tool_selections),
            "collaboration_events": len(thought_process.collaboration_notes),
            "average_confidence": self._calculate_average_confidence(thought_process.reasoning_steps),
            "reasoning_complexity": self._assess_reasoning_complexity(thought_process),
            "performance_notes": performance_notes or {}
        })
        
        # Save thought process
        self._save_thought_process(thought_process)
        
        # Final thinking event
        self._log_thinking_event(
            thought_process.investigation_id,
            thought_process.agent_name,
            "thinking_completed",
            {
                "process_id": process_id,
                "final_assessment": final_assessment,
                "thinking_duration_ms": thinking_duration,
                "reasoning_steps_count": len(thought_process.reasoning_steps),
                "average_confidence": thought_process.performance_metrics["average_confidence"]
            }
        )
        
        # Remove from active tracking
        completed_process = self._active_processes.pop(process_id)
        
        logger.info(f"Completed thought process for {thought_process.agent_name}: "
                   f"{thinking_duration:.0f}ms, {len(thought_process.reasoning_steps)} steps")
        
        return completed_process
    
    def get_agent_thinking_summary(self, process_id: str) -> Dict[str, Any]:
        """Get summary of agent's current thinking process"""
        
        if process_id not in self._active_processes:
            return {"error": f"No active thought process for ID: {process_id}"}
        
        thought_process = self._active_processes[process_id]
        
        # Get recent reasoning steps
        recent_steps = thought_process.reasoning_steps[-5:] if thought_process.reasoning_steps else []
        
        # Calculate thinking metrics
        start_time = datetime.fromisoformat(thought_process.start_timestamp.replace('Z', '+00:00'))
        current_duration = (datetime.now(timezone.utc) - start_time).total_seconds() * 1000
        
        return {
            "process_id": process_id,
            "investigation_id": thought_process.investigation_id,
            "agent_name": thought_process.agent_name,
            "domain": thought_process.domain,
            "start_time": thought_process.start_timestamp,
            "current_duration_ms": current_duration,
            "reasoning_steps_count": len(thought_process.reasoning_steps),
            "tool_selections_count": len(thought_process.tool_selections),
            "collaboration_notes_count": len(thought_process.collaboration_notes),
            "recent_reasoning_steps": [
                {
                    "reasoning_type": step.reasoning_type.value,
                    "conclusion": step.conclusion,
                    "confidence": step.confidence,
                    "timestamp": step.timestamp
                }
                for step in recent_steps
            ],
            "current_confidence": self._calculate_average_confidence(thought_process.reasoning_steps),
            "thinking_patterns": self._analyze_thinking_patterns(thought_process)
        }
    
    def generate_chain_of_thought_report(self, investigation_id: str) -> Dict[str, Any]:
        """Generate comprehensive chain of thought report for investigation"""
        
        # Find all thought processes for this investigation
        investigation_processes = []
        for process in self._active_processes.values():
            if process.investigation_id == investigation_id:
                investigation_processes.append(process)
        
        # Also check saved processes - first try investigation folder, then fallback
        search_paths = []
        try:
            from app.service.logging.investigation_folder_manager import get_folder_manager
            folder_manager = get_folder_manager()
            investigation_folder_path = folder_manager.get_investigation_folder(investigation_id)
            if investigation_folder_path:
                search_paths.append(investigation_folder_path)
        except Exception:
            pass
        
        # Always include default directory as fallback
        search_paths.append(self.output_directory)
        
        for search_path in search_paths:
            for file_path in search_path.glob(f"thought_process_{investigation_id}_*.json"):
                try:
                    with open(file_path, 'r') as f:
                        saved_process_data = json.load(f)
                        investigation_processes.append(AgentThoughtProcess(**saved_process_data))
                except Exception as e:
                    logger.warning(f"Failed to load saved thought process {file_path}: {e}")
        
        if not investigation_processes:
            return {"error": f"No thought processes found for investigation: {investigation_id}"}
        
        # Generate comprehensive report
        report = {
            "investigation_id": investigation_id,
            "report_generated_at": datetime.now(timezone.utc).isoformat(),
            "total_agents": len(investigation_processes),
            "agent_summaries": [],
            "cross_agent_analysis": {},
            "investigation_reasoning_timeline": [],
            "key_insights": []
        }
        
        # Process each agent's thinking
        all_steps = []
        for process in investigation_processes:
            agent_summary = {
                "agent_name": process.agent_name,
                "domain": process.domain,
                "thinking_duration_ms": process.performance_metrics.get("thinking_duration_ms", 0),
                "reasoning_steps_count": len(process.reasoning_steps),
                "tool_selections_count": len(process.tool_selections),
                "average_confidence": self._calculate_average_confidence(process.reasoning_steps),
                "final_assessment": process.final_assessment,
                "key_reasoning_chains": self._extract_key_reasoning_chains(process)
            }
            report["agent_summaries"].append(agent_summary)
            
            # Collect all steps for timeline
            for step in process.reasoning_steps:
                all_steps.append({
                    "timestamp": step.timestamp,
                    "agent": process.agent_name,
                    "reasoning_type": step.reasoning_type.value,
                    "premise": step.premise,
                    "conclusion": step.conclusion,
                    "confidence": step.confidence
                })
        
        # Create investigation timeline
        all_steps.sort(key=lambda x: x["timestamp"])
        report["investigation_reasoning_timeline"] = all_steps
        
        # Cross-agent analysis
        report["cross_agent_analysis"] = self._perform_cross_agent_analysis(investigation_processes)
        
        # Extract key insights
        report["key_insights"] = self._extract_key_insights(investigation_processes)
        
        return report
    
    def _classify_confidence(self, confidence: float) -> ConfidenceLevel:
        """Classify numerical confidence into confidence level"""
        if confidence <= 0.2:
            return ConfidenceLevel.VERY_LOW
        elif confidence <= 0.4:
            return ConfidenceLevel.LOW
        elif confidence <= 0.6:
            return ConfidenceLevel.MEDIUM
        elif confidence <= 0.8:
            return ConfidenceLevel.HIGH
        else:
            return ConfidenceLevel.VERY_HIGH
    
    def _calculate_average_confidence(self, reasoning_steps: List[ReasoningStep]) -> float:
        """Calculate average confidence across reasoning steps"""
        if not reasoning_steps:
            return 0.0
        return sum(step.confidence for step in reasoning_steps) / len(reasoning_steps)
    
    def _assess_reasoning_complexity(self, thought_process: AgentThoughtProcess) -> Dict[str, Any]:
        """Assess the complexity of agent's reasoning process"""
        
        reasoning_types = set(step.reasoning_type for step in thought_process.reasoning_steps)
        
        complexity_score = 0
        complexity_factors = []
        
        # Factor 1: Variety of reasoning types
        if len(reasoning_types) > 3:
            complexity_score += 2
            complexity_factors.append("high_reasoning_variety")
        
        # Factor 2: Number of reasoning steps
        if len(thought_process.reasoning_steps) > 10:
            complexity_score += 2
            complexity_factors.append("extensive_reasoning")
        
        # Factor 3: Collaboration complexity
        if len(thought_process.collaboration_notes) > 2:
            complexity_score += 1
            complexity_factors.append("collaborative_thinking")
        
        # Factor 4: Tool selection complexity
        tool_selections = len(thought_process.tool_selections)
        if tool_selections > 3:
            complexity_score += 1
            complexity_factors.append("complex_tool_usage")
        
        # Factor 5: Alternative considerations
        alt_considerations = sum(len(step.alternative_considerations) for step in thought_process.reasoning_steps)
        if alt_considerations > 5:
            complexity_score += 1
            complexity_factors.append("thorough_alternatives_analysis")
        
        complexity_level = "low"
        if complexity_score >= 5:
            complexity_level = "high"
        elif complexity_score >= 3:
            complexity_level = "medium"
        
        return {
            "complexity_score": complexity_score,
            "complexity_level": complexity_level,
            "complexity_factors": complexity_factors,
            "reasoning_types_used": list(reasoning_types),
            "total_reasoning_steps": len(thought_process.reasoning_steps),
            "total_alternative_considerations": alt_considerations
        }
    
    def _analyze_thinking_patterns(self, thought_process: AgentThoughtProcess) -> Dict[str, Any]:
        """Analyze patterns in agent's thinking process"""
        
        if not thought_process.reasoning_steps:
            return {"error": "No reasoning steps to analyze"}
        
        # Analyze reasoning type patterns
        reasoning_sequence = [step.reasoning_type.value for step in thought_process.reasoning_steps]
        reasoning_counts = {}
        for reasoning_type in reasoning_sequence:
            reasoning_counts[reasoning_type] = reasoning_counts.get(reasoning_type, 0) + 1
        
        # Analyze confidence patterns
        confidence_values = [step.confidence for step in thought_process.reasoning_steps]
        confidence_trend = "stable"
        if len(confidence_values) > 2:
            if confidence_values[-1] > confidence_values[0] + 0.1:
                confidence_trend = "increasing"
            elif confidence_values[-1] < confidence_values[0] - 0.1:
                confidence_trend = "decreasing"
        
        return {
            "dominant_reasoning_types": sorted(reasoning_counts.items(), key=lambda x: x[1], reverse=True)[:3],
            "reasoning_sequence": reasoning_sequence,
            "confidence_trend": confidence_trend,
            "confidence_range": {
                "min": min(confidence_values),
                "max": max(confidence_values),
                "average": sum(confidence_values) / len(confidence_values)
            },
            "thinking_velocity": len(thought_process.reasoning_steps) / max(1, (thought_process.performance_metrics.get("thinking_duration_ms") or 1000) / 1000)
        }
    
    def _extract_key_reasoning_chains(self, thought_process: AgentThoughtProcess) -> List[Dict[str, Any]]:
        """Extract key reasoning chains from thought process"""
        
        key_chains = []
        
        # Group reasoning steps by type
        reasoning_groups = {}
        for step in thought_process.reasoning_steps:
            reasoning_type = step.reasoning_type.value
            if reasoning_type not in reasoning_groups:
                reasoning_groups[reasoning_type] = []
            reasoning_groups[reasoning_type].append(step)
        
        # Extract key chains for important reasoning types
        important_types = [ReasoningType.RISK_ASSESSMENT, ReasoningType.CONCLUSION, ReasoningType.EVIDENCE_EVALUATION]
        
        for reasoning_type in important_types:
            if reasoning_type.value in reasoning_groups:
                steps = reasoning_groups[reasoning_type.value]
                if steps:
                    # Get the highest confidence step
                    key_step = max(steps, key=lambda x: x.confidence)
                    key_chains.append({
                        "reasoning_type": reasoning_type.value,
                        "premise": key_step.premise,
                        "reasoning": key_step.reasoning,
                        "conclusion": key_step.conclusion,
                        "confidence": key_step.confidence,
                        "supporting_evidence_count": len(key_step.supporting_evidence)
                    })
        
        return key_chains
    
    def _perform_cross_agent_analysis(self, processes: List[AgentThoughtProcess]) -> Dict[str, Any]:
        """Analyze reasoning patterns across multiple agents"""
        
        analysis = {
            "consensus_areas": [],
            "conflicting_assessments": [],
            "complementary_insights": [],
            "collaboration_effectiveness": {}
        }
        
        # Analyze final assessments for consensus/conflicts
        final_assessments = []
        for process in processes:
            if process.final_assessment:
                final_assessments.append({
                    "agent": process.agent_name,
                    "domain": process.domain,
                    "assessment": process.final_assessment
                })
        
        # Look for consensus in risk scores
        risk_scores = []
        for assessment in final_assessments:
            if "risk_score" in assessment["assessment"]:
                risk_scores.append({
                    "agent": assessment["agent"],
                    "score": assessment["assessment"]["risk_score"]
                })
        
        if len(risk_scores) > 1:
            scores = [rs["score"] for rs in risk_scores]
            score_variance = max(scores) - min(scores)
            
            if score_variance <= 10:
                analysis["consensus_areas"].append({
                    "type": "risk_score_consensus",
                    "agents": [rs["agent"] for rs in risk_scores],
                    "average_score": sum(scores) / len(scores),
                    "variance": score_variance
                })
            else:
                analysis["conflicting_assessments"].append({
                    "type": "risk_score_conflict",
                    "agents_scores": risk_scores,
                    "variance": score_variance
                })
        
        return analysis
    
    def _extract_key_insights(self, processes: List[AgentThoughtProcess]) -> List[str]:
        """Extract key insights from all agent thinking processes"""
        
        insights = []
        
        # Analyze overall investigation reasoning quality
        total_steps = sum(len(p.reasoning_steps) for p in processes)
        avg_confidence = sum(self._calculate_average_confidence(p.reasoning_steps) for p in processes) / len(processes)
        
        insights.append(f"Investigation involved {total_steps} reasoning steps across {len(processes)} agents")
        insights.append(f"Average reasoning confidence was {avg_confidence:.2f}")
        
        # Find agents with exceptional performance
        for process in processes:
            agent_confidence = self._calculate_average_confidence(process.reasoning_steps)
            if agent_confidence > 0.8:
                insights.append(f"{process.agent_name} demonstrated high confidence reasoning (avg: {agent_confidence:.2f})")
        
        # Identify complex reasoning patterns
        complex_processes = [p for p in processes if self._assess_reasoning_complexity(p)["complexity_level"] == "high"]
        if complex_processes:
            agents = [p.agent_name for p in complex_processes]
            insights.append(f"Complex reasoning patterns observed in: {', '.join(agents)}")
        
        return insights
    
    def _save_thought_process(self, thought_process: AgentThoughtProcess) -> None:
        """Save completed thought process to disk"""
        
        # Try to use investigation folder if available
        investigation_folder = None
        try:
            from app.service.logging.investigation_folder_manager import get_folder_manager
            folder_manager = get_folder_manager()
            investigation_folder_path = folder_manager.get_investigation_folder(thought_process.investigation_id)
            if investigation_folder_path:
                investigation_folder = investigation_folder_path
                filename = f"thought_process_{thought_process.investigation_id}_{thought_process.agent_name}_{int(datetime.now().timestamp())}.json"
                file_path = investigation_folder / filename
            else:
                # Fall back to default directory
                filename = f"thought_process_{thought_process.investigation_id}_{thought_process.agent_name}_{int(datetime.now().timestamp())}.json"
                file_path = self.output_directory / filename
        except Exception as e:
            # Fall back to default directory if investigation folder manager fails
            logger.debug(f"Could not use investigation folder manager: {e}")
            filename = f"thought_process_{thought_process.investigation_id}_{thought_process.agent_name}_{int(datetime.now().timestamp())}.json"
            file_path = self.output_directory / filename
        
        # Convert to JSON-serializable format
        process_dict = asdict(thought_process)
        
        # Convert enum values to strings
        for step in process_dict["reasoning_steps"]:
            step["reasoning_type"] = step["reasoning_type"].value if hasattr(step["reasoning_type"], "value") else step["reasoning_type"]
        
        with open(file_path, 'w') as f:
            json.dump(process_dict, f, indent=2, default=str)
        
        logger.debug(f"Saved thought process to: {file_path}")
    
    def _log_thinking_event(self, investigation_id: str, agent_name: str, event_type: str, data: Dict[str, Any]) -> None:
        """Log thinking events for monitoring"""
        
        event = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "investigation_id": investigation_id,
            "agent_name": agent_name,
            "event_type": event_type,
            "data": data
        }
        
        # Notify monitoring callbacks
        for callback in self._monitoring_callbacks:
            try:
                callback(investigation_id, agent_name, event_type, data)
            except Exception as e:
                logger.warning(f"Chain of thought monitoring callback failed: {e}")
    
    def add_monitoring_callback(self, callback: callable) -> None:
        """Add callback for real-time thinking monitoring"""
        self._monitoring_callbacks.append(callback)

# Global chain of thought logger instance
chain_of_thought_logger = ChainOfThoughtLogger()

def get_chain_of_thought_logger() -> ChainOfThoughtLogger:
    """Get the global chain of thought logger instance"""
    return chain_of_thought_logger