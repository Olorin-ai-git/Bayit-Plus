"""
Multi-Agent Coordination Patterns - Advanced agent orchestration using LangGraph patterns.

This module implements Phase 4 of the LangGraph enhancement plan, providing:
- Advanced agent coordination strategies
- Agent resource pool management
- Parallel and sequential execution patterns
- Expert committee decision-making
- Dynamic agent allocation based on workload
"""

import logging
import asyncio
from typing import Dict, Any, List, Optional, Callable, Set, Tuple
from datetime import datetime
from dataclasses import dataclass, field
from enum import Enum
from abc import ABC, abstractmethod
import random

from langchain_core.agents import AgentFinish
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from langchain_core.runnables import RunnableConfig
from langchain_core.tools import BaseTool

logger = logging.getLogger(__name__)


class CoordinationStrategy(Enum):
    """Coordination strategies for multi-agent execution."""
    PARALLEL = "parallel"              # All agents work simultaneously
    SEQUENTIAL = "sequential"          # Agents work one after another
    COMMITTEE = "committee"            # Multiple agents vote on decisions
    HIERARCHICAL = "hierarchical"     # Parent-child agent relationships
    ROUND_ROBIN = "round_robin"       # Agents take turns
    LOAD_BALANCED = "load_balanced"   # Dynamic allocation based on load
    SPECIALIZED = "specialized"       # Route to specialized agents
    CONSENSUS = "consensus"           # All agents must agree


@dataclass
class AgentCapabilities:
    """Capabilities and metadata for an agent."""
    name: str
    specializations: List[str]
    max_concurrent_tasks: int = 3
    current_load: int = 0
    success_rate: float = 1.0
    avg_response_time: float = 0.0
    tools: List[str] = field(default_factory=list)
    
    @property
    def availability_score(self) -> float:
        """Calculate availability score for load balancing."""
        load_factor = 1.0 - (self.current_load / max(self.max_concurrent_tasks, 1))
        performance_factor = self.success_rate
        speed_factor = 1.0 / (1.0 + self.avg_response_time / 10.0)  # Normalize to 10s baseline
        
        return load_factor * 0.4 + performance_factor * 0.4 + speed_factor * 0.2


@dataclass
class CoordinationTask:
    """Task to be coordinated across agents."""
    task_id: str
    task_type: str
    complexity: float  # 0.0 to 1.0
    required_capabilities: List[str]
    input_data: Dict[str, Any]
    deadline: Optional[datetime] = None
    priority: int = 5  # 1 (lowest) to 10 (highest)
    dependencies: List[str] = field(default_factory=list)
    
    def matches_agent(self, agent: AgentCapabilities) -> bool:
        """Check if agent has required capabilities."""
        return all(cap in agent.specializations for cap in self.required_capabilities)


class BaseCoordinationStrategy(ABC):
    """Base class for coordination strategies."""
    
    @abstractmethod
    async def coordinate(self, agents: List[AgentCapabilities], 
                        task: CoordinationTask) -> Dict[str, Any]:
        """Coordinate task execution across agents."""
        pass


class ParallelStrategy(BaseCoordinationStrategy):
    """Execute tasks in parallel across multiple agents."""
    
    async def coordinate(self, agents: List[AgentCapabilities], 
                        task: CoordinationTask) -> Dict[str, Any]:
        """Execute task in parallel across available agents."""
        # Filter agents with required capabilities
        capable_agents = [a for a in agents if task.matches_agent(a)]
        
        if not capable_agents:
            logger.warning(f"No agents available for task {task.task_id}")
            return {"status": "no_agents_available", "task_id": task.task_id}
        
        # Sort by availability score
        capable_agents.sort(key=lambda a: a.availability_score, reverse=True)
        
        # Take top N agents based on complexity
        num_agents = min(max(1, int(task.complexity * 3) + 1), len(capable_agents))
        selected_agents = capable_agents[:num_agents]
        
        logger.info(f"Executing task {task.task_id} in parallel with {num_agents} agents")
        
        # Simulate parallel execution
        results = []
        for agent in selected_agents:
            agent.current_load += 1
            result = {
                "agent": agent.name,
                "result": f"Parallel execution by {agent.name}",
                "confidence": agent.success_rate * (1.0 - task.complexity * 0.2)
            }
            results.append(result)
            agent.current_load -= 1
        
        # Aggregate results
        return {
            "status": "completed",
            "task_id": task.task_id,
            "strategy": "parallel",
            "results": results,
            "selected_agents": [a.name for a in selected_agents]
        }


class SequentialStrategy(BaseCoordinationStrategy):
    """Execute tasks sequentially through agents."""
    
    async def coordinate(self, agents: List[AgentCapabilities], 
                        task: CoordinationTask) -> Dict[str, Any]:
        """Execute task sequentially through agents."""
        capable_agents = [a for a in agents if task.matches_agent(a)]
        
        if not capable_agents:
            return {"status": "no_agents_available", "task_id": task.task_id}
        
        # Order by specialization match and success rate
        capable_agents.sort(key=lambda a: (len(set(a.specializations) & set(task.required_capabilities)), 
                                          a.success_rate), reverse=True)
        
        logger.info(f"Executing task {task.task_id} sequentially")
        
        results = []
        current_output = task.input_data
        
        for agent in capable_agents[:3]:  # Limit to 3 agents in sequence
            agent.current_load += 1
            
            # Each agent processes the output of the previous
            result = {
                "agent": agent.name,
                "input": current_output,
                "output": f"Sequential processing by {agent.name}",
                "confidence": agent.success_rate
            }
            results.append(result)
            current_output = result["output"]
            
            agent.current_load -= 1
        
        return {
            "status": "completed",
            "task_id": task.task_id,
            "strategy": "sequential",
            "results": results,
            "final_output": current_output
        }


class CommitteeStrategy(BaseCoordinationStrategy):
    """Multiple agents vote on the best solution."""
    
    async def coordinate(self, agents: List[AgentCapabilities], 
                        task: CoordinationTask) -> Dict[str, Any]:
        """Have multiple agents vote on the solution."""
        capable_agents = [a for a in agents if task.matches_agent(a)]
        
        if len(capable_agents) < 3:
            # Need at least 3 agents for committee
            return {"status": "insufficient_agents", "task_id": task.task_id}
        
        # Select committee members
        committee_size = min(5, len(capable_agents))
        committee = random.sample(capable_agents, committee_size)
        
        logger.info(f"Committee of {committee_size} agents voting on task {task.task_id}")
        
        votes = []
        for agent in committee:
            agent.current_load += 1
            
            # Each agent provides a vote
            vote = {
                "agent": agent.name,
                "decision": random.choice(["approve", "reject", "abstain"]),
                "confidence": agent.success_rate,
                "reasoning": f"Analysis by {agent.name}"
            }
            votes.append(vote)
            
            agent.current_load -= 1
        
        # Tally votes
        decision_counts = {"approve": 0, "reject": 0, "abstain": 0}
        for vote in votes:
            decision_counts[vote["decision"]] += vote["confidence"]
        
        final_decision = max(decision_counts, key=decision_counts.get)
        
        return {
            "status": "completed",
            "task_id": task.task_id,
            "strategy": "committee",
            "votes": votes,
            "decision": final_decision,
            "confidence": decision_counts[final_decision] / sum(decision_counts.values())
        }


class LoadBalancedStrategy(BaseCoordinationStrategy):
    """Dynamically allocate tasks based on agent load."""
    
    async def coordinate(self, agents: List[AgentCapabilities], 
                        task: CoordinationTask) -> Dict[str, Any]:
        """Allocate task to least loaded capable agent."""
        capable_agents = [a for a in agents if task.matches_agent(a)]
        
        if not capable_agents:
            return {"status": "no_agents_available", "task_id": task.task_id}
        
        # Find agent with best availability score
        best_agent = max(capable_agents, key=lambda a: a.availability_score)
        
        if best_agent.current_load >= best_agent.max_concurrent_tasks:
            return {"status": "all_agents_busy", "task_id": task.task_id}
        
        logger.info(f"Load-balanced task {task.task_id} to {best_agent.name} (load: {best_agent.current_load}/{best_agent.max_concurrent_tasks})")
        
        best_agent.current_load += 1
        
        # Execute task
        result = {
            "agent": best_agent.name,
            "result": f"Load-balanced execution by {best_agent.name}",
            "load_before": best_agent.current_load - 1,
            "load_after": best_agent.current_load,
            "availability_score": best_agent.availability_score
        }
        
        # Simulate task completion
        await asyncio.sleep(0.1)  # Simulate work
        best_agent.current_load -= 1
        
        return {
            "status": "completed",
            "task_id": task.task_id,
            "strategy": "load_balanced",
            "result": result
        }


class AgentPool:
    """Manages a pool of agents for coordination."""
    
    def __init__(self):
        """Initialize agent pool."""
        self.agents: Dict[str, AgentCapabilities] = {}
        self.strategies: Dict[CoordinationStrategy, BaseCoordinationStrategy] = {
            CoordinationStrategy.PARALLEL: ParallelStrategy(),
            CoordinationStrategy.SEQUENTIAL: SequentialStrategy(),
            CoordinationStrategy.COMMITTEE: CommitteeStrategy(),
            CoordinationStrategy.LOAD_BALANCED: LoadBalancedStrategy()
        }
        
    def register_agent(self, agent: AgentCapabilities):
        """Register an agent in the pool."""
        self.agents[agent.name] = agent
        logger.info(f"Registered agent {agent.name} with specializations: {agent.specializations}")
    
    def unregister_agent(self, agent_name: str):
        """Remove an agent from the pool."""
        if agent_name in self.agents:
            del self.agents[agent_name]
            logger.info(f"Unregistered agent {agent_name}")
    
    def get_available_agents(self) -> List[AgentCapabilities]:
        """Get list of available agents."""
        return [a for a in self.agents.values() 
                if a.current_load < a.max_concurrent_tasks]
    
    def get_agent_by_specialization(self, specialization: str) -> List[AgentCapabilities]:
        """Get agents with specific specialization."""
        return [a for a in self.agents.values() 
                if specialization in a.specializations]
    
    async def execute_task(self, task: CoordinationTask, 
                          strategy: CoordinationStrategy = CoordinationStrategy.LOAD_BALANCED) -> Dict[str, Any]:
        """Execute a task using specified coordination strategy."""
        if strategy not in self.strategies:
            logger.error(f"Unknown strategy: {strategy}")
            return {"status": "error", "message": f"Unknown strategy: {strategy}"}
        
        coordinator = self.strategies[strategy]
        agents = list(self.agents.values())
        
        return await coordinator.coordinate(agents, task)


class CoordinatedAgentOrchestrator:
    """Orchestrates multiple agents with advanced coordination patterns."""
    
    def __init__(self):
        """Initialize orchestrator."""
        self.agent_pool = AgentPool()
        self._initialize_default_agents()
        self.task_queue: List[CoordinationTask] = []
        self.completed_tasks: List[Tuple[CoordinationTask, Dict[str, Any]]] = []
        
    def _initialize_default_agents(self):
        """Initialize default investigation agents."""
        # Device analysis agent
        self.agent_pool.register_agent(AgentCapabilities(
            name="device_analyst",
            specializations=["device_fingerprinting", "hardware_analysis", "os_detection"],
            max_concurrent_tasks=5,
            success_rate=0.95,
            avg_response_time=2.0,
            tools=["device_scanner", "fingerprint_analyzer"]
        ))
        
        # Network analysis agent
        self.agent_pool.register_agent(AgentCapabilities(
            name="network_analyst",
            specializations=["network_forensics", "ip_analysis", "traffic_patterns"],
            max_concurrent_tasks=3,
            success_rate=0.92,
            avg_response_time=3.5,
            tools=["packet_sniffer", "geo_locator"]
        ))
        
        # Log analysis agent
        self.agent_pool.register_agent(AgentCapabilities(
            name="log_analyst",
            specializations=["log_parsing", "pattern_detection", "anomaly_detection"],
            max_concurrent_tasks=10,
            success_rate=0.98,
            avg_response_time=1.5,
            tools=["splunk_connector", "log_parser"]
        ))
        
        # Risk assessment agent
        self.agent_pool.register_agent(AgentCapabilities(
            name="risk_assessor",
            specializations=["risk_scoring", "fraud_detection", "behavioral_analysis"],
            max_concurrent_tasks=4,
            success_rate=0.90,
            avg_response_time=4.0,
            tools=["ml_classifier", "risk_calculator"]
        ))
        
        # Decision maker agent
        self.agent_pool.register_agent(AgentCapabilities(
            name="decision_maker",
            specializations=["decision_synthesis", "report_generation", "recommendation"],
            max_concurrent_tasks=2,
            success_rate=0.96,
            avg_response_time=5.0,
            tools=["report_generator", "decision_tree"]
        ))
    
    async def investigate_fraud_case(self, case_data: Dict[str, Any]) -> Dict[str, Any]:
        """Coordinate multi-agent fraud investigation."""
        logger.info(f"Starting coordinated investigation for case: {case_data.get('case_id', 'unknown')}")
        
        # Phase 1: Parallel data gathering
        gathering_tasks = [
            CoordinationTask(
                task_id="device_check",
                task_type="analysis",
                complexity=0.6,
                required_capabilities=["device_fingerprinting"],
                input_data={"device_data": case_data.get("device", {})},
                priority=8
            ),
            CoordinationTask(
                task_id="network_check",
                task_type="analysis",
                complexity=0.7,
                required_capabilities=["network_forensics"],
                input_data={"network_data": case_data.get("network", {})},
                priority=7
            ),
            CoordinationTask(
                task_id="log_check",
                task_type="analysis",
                complexity=0.5,
                required_capabilities=["log_parsing"],
                input_data={"log_data": case_data.get("logs", {})},
                priority=6
            )
        ]
        
        # Execute parallel gathering
        gathering_results = []
        for task in gathering_tasks:
            result = await self.agent_pool.execute_task(task, CoordinationStrategy.PARALLEL)
            gathering_results.append(result)
            self.completed_tasks.append((task, result))
        
        # Phase 2: Risk assessment (committee decision)
        risk_task = CoordinationTask(
            task_id="risk_assessment",
            task_type="evaluation",
            complexity=0.8,
            required_capabilities=["risk_scoring", "fraud_detection"],
            input_data={"gathering_results": gathering_results},
            priority=9
        )
        
        risk_result = await self.agent_pool.execute_task(risk_task, CoordinationStrategy.COMMITTEE)
        self.completed_tasks.append((risk_task, risk_result))
        
        # Phase 3: Decision synthesis (sequential processing)
        decision_task = CoordinationTask(
            task_id="final_decision",
            task_type="synthesis",
            complexity=0.9,
            required_capabilities=["decision_synthesis", "recommendation"],
            input_data={
                "gathering_results": gathering_results,
                "risk_assessment": risk_result
            },
            priority=10
        )
        
        decision_result = await self.agent_pool.execute_task(decision_task, CoordinationStrategy.SEQUENTIAL)
        self.completed_tasks.append((decision_task, decision_result))
        
        # Compile final report
        return {
            "case_id": case_data.get("case_id", "unknown"),
            "investigation_phases": {
                "data_gathering": gathering_results,
                "risk_assessment": risk_result,
                "final_decision": decision_result
            },
            "coordination_metrics": {
                "total_agents_involved": len(self.agent_pool.agents),
                "tasks_completed": len(self.completed_tasks),
                "strategies_used": ["parallel", "committee", "sequential"]
            },
            "timestamp": datetime.now().isoformat()
        }
    
    def get_agent_workload_report(self) -> Dict[str, Any]:
        """Get current workload distribution across agents."""
        report = {}
        for name, agent in self.agent_pool.agents.items():
            report[name] = {
                "current_load": agent.current_load,
                "max_capacity": agent.max_concurrent_tasks,
                "utilization": agent.current_load / agent.max_concurrent_tasks if agent.max_concurrent_tasks > 0 else 0,
                "availability_score": agent.availability_score,
                "success_rate": agent.success_rate,
                "avg_response_time": agent.avg_response_time
            }
        return report
    
    async def optimize_agent_allocation(self):
        """Optimize agent allocation based on historical performance."""
        logger.info("Optimizing agent allocation based on performance metrics")
        
        # Analyze completed tasks
        strategy_performance = {}
        for task, result in self.completed_tasks:
            strategy = result.get("strategy", "unknown")
            if strategy not in strategy_performance:
                strategy_performance[strategy] = {"count": 0, "success": 0}
            
            strategy_performance[strategy]["count"] += 1
            if result.get("status") == "completed":
                strategy_performance[strategy]["success"] += 1
        
        # Calculate success rates
        for strategy, metrics in strategy_performance.items():
            metrics["success_rate"] = metrics["success"] / metrics["count"] if metrics["count"] > 0 else 0
        
        logger.info(f"Strategy performance analysis: {strategy_performance}")
        
        # Adjust agent parameters based on performance
        for agent in self.agent_pool.agents.values():
            # Simulate performance-based adjustment
            if agent.success_rate < 0.85:
                agent.max_concurrent_tasks = max(1, agent.max_concurrent_tasks - 1)
                logger.info(f"Reduced capacity for {agent.name} due to low success rate")
            elif agent.success_rate > 0.95 and agent.avg_response_time < 2.0:
                agent.max_concurrent_tasks = min(10, agent.max_concurrent_tasks + 1)
                logger.info(f"Increased capacity for {agent.name} due to high performance")


# Integration with LangGraph
def create_coordinated_investigation_graph() -> StateGraph:
    """Create a LangGraph with coordinated multi-agent execution."""
    
    class CoordinatedState(dict):
        """State for coordinated investigation."""
        messages: List[BaseMessage]
        investigation_data: Dict[str, Any]
        coordination_results: Dict[str, Any]
    
    graph = StateGraph(CoordinatedState)
    orchestrator = CoordinatedAgentOrchestrator()
    
    async def coordinate_investigation(state: CoordinatedState) -> CoordinatedState:
        """Node that coordinates multi-agent investigation."""
        investigation_data = state.get("investigation_data", {})
        
        # Run coordinated investigation
        results = await orchestrator.investigate_fraud_case(investigation_data)
        
        state["coordination_results"] = results
        state["messages"].append(
            AIMessage(content=f"Coordinated investigation completed with {len(results['investigation_phases'])} phases")
        )
        
        return state
    
    async def generate_report(state: CoordinatedState) -> CoordinatedState:
        """Generate final report from coordination results."""
        results = state.get("coordination_results", {})
        
        report = f"""
        Investigation Report
        ====================
        Case ID: {results.get('case_id', 'Unknown')}
        Timestamp: {results.get('timestamp', 'Unknown')}
        
        Phases Completed:
        - Data Gathering: {len(results.get('investigation_phases', {}).get('data_gathering', []))} parallel tasks
        - Risk Assessment: Committee decision with {results.get('investigation_phases', {}).get('risk_assessment', {}).get('strategy', 'unknown')} strategy
        - Final Decision: Sequential processing completed
        
        Coordination Metrics:
        - Total Agents: {results.get('coordination_metrics', {}).get('total_agents_involved', 0)}
        - Tasks Completed: {results.get('coordination_metrics', {}).get('tasks_completed', 0)}
        """
        
        state["messages"].append(AIMessage(content=report))
        return state
    
    # Add nodes
    graph.add_node("coordinate", coordinate_investigation)
    graph.add_node("report", generate_report)
    
    # Add edges
    graph.add_edge("coordinate", "report")
    graph.add_edge("report", END)
    
    # Set entry point
    graph.set_entry_point("coordinate")
    
    return graph.compile()


# Example usage
async def example_coordinated_investigation():
    """Example of using coordinated multi-agent investigation."""
    orchestrator = CoordinatedAgentOrchestrator()
    
    # Sample fraud case
    case_data = {
        "case_id": "FRAUD-2024-001",
        "device": {
            "fingerprint": "abc123",
            "os": "iOS 17.0",
            "browser": "Safari"
        },
        "network": {
            "ip": "192.168.1.100",
            "location": "San Francisco, CA",
            "isp": "Comcast"
        },
        "logs": {
            "login_attempts": 5,
            "failed_attempts": 2,
            "session_duration": 3600
        }
    }
    
    # Run investigation
    result = await orchestrator.investigate_fraud_case(case_data)
    
    # Get workload report
    workload = orchestrator.get_agent_workload_report()
    
    # Optimize allocation
    await orchestrator.optimize_agent_allocation()
    
    return result, workload


if __name__ == "__main__":
    # Run example
    asyncio.run(example_coordinated_investigation())