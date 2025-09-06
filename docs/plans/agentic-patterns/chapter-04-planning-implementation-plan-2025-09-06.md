# Chapter 4: Planning Pattern - Implementation Plan
**Date**: September 6, 2025  
**Author**: Gil Klainert  
**Reference**: Chapter 4 Analysis Document  
**Jira Epic**: OLORIN-PLAN-001  
**Status**: Ready for Implementation

## Executive Summary

This document provides a comprehensive implementation plan to address the planning pattern gaps identified in Chapter 4 analysis. The plan transforms Olorin from a reactive, sequential system to an intelligent, adaptive platform with sophisticated planning capabilities, LangGraph integration, and dynamic investigation strategies.

## Implementation Overview

### Timeline
- **Duration**: 8 weeks
- **Start Date**: Upon approval
- **End Date**: Start + 8 weeks
- **Team Size**: 2-3 developers

### Budget Estimate
- **Development**: 320 hours
- **Testing**: 80 hours
- **Documentation**: 40 hours
- **Total**: 440 hours

## Phase 1: Foundation - Core Planning Layer (Weeks 1-2)

### 1.1 Planning Module Structure
**Jira Story**: OLORIN-PLAN-002

#### Directory Structure
```
olorin-server/app/planning/
├── __init__.py
├── models/
│   ├── __init__.py
│   ├── plan.py           # Plan data models
│   ├── goal.py           # Goal representations
│   └── state.py          # Planning state models
├── core/
│   ├── __init__.py
│   ├── investigation_planner.py
│   ├── plan_executor.py
│   └── plan_validator.py
├── strategies/
│   ├── __init__.py
│   ├── quick_investigation.py
│   ├── comprehensive_investigation.py
│   └── adaptive_investigation.py
└── utils/
    ├── __init__.py
    ├── metrics.py
    └── visualization.py
```

### 1.2 Core Planning Models
**Jira Story**: OLORIN-PLAN-003

```python
# File: olorin-server/app/planning/models/plan.py

from enum import Enum
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from datetime import datetime

class PlanStatus(str, Enum):
    DRAFT = "draft"
    READY = "ready"
    EXECUTING = "executing"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"
    REPLANNING = "replanning"

class PlanPriority(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class PlanStep(BaseModel):
    """Individual step in an investigation plan"""
    id: str = Field(..., description="Unique step identifier")
    name: str = Field(..., description="Step name")
    description: str = Field(..., description="Detailed description")
    agent_type: str = Field(..., description="Required agent type")
    dependencies: List[str] = Field(default_factory=list, description="Step dependencies")
    parameters: Dict[str, Any] = Field(default_factory=dict)
    estimated_duration: int = Field(default=60, description="Estimated duration in seconds")
    retry_strategy: Dict[str, Any] = Field(default_factory=dict)
    success_criteria: Dict[str, Any] = Field(default_factory=dict)
    
class InvestigationPlan(BaseModel):
    """Complete investigation plan"""
    id: str = Field(..., description="Unique plan identifier")
    investigation_id: str = Field(..., description="Associated investigation ID")
    status: PlanStatus = Field(default=PlanStatus.DRAFT)
    priority: PlanPriority = Field(default=PlanPriority.MEDIUM)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Plan structure
    steps: List[PlanStep] = Field(default_factory=list)
    current_step: Optional[str] = Field(None, description="Currently executing step")
    completed_steps: List[str] = Field(default_factory=list)
    
    # Metadata
    strategy: str = Field(..., description="Planning strategy used")
    estimated_total_duration: int = Field(0, description="Total estimated duration")
    actual_duration: Optional[int] = Field(None, description="Actual execution duration")
    
    # Performance metrics
    metrics: Dict[str, Any] = Field(default_factory=dict)
    optimization_score: float = Field(0.0, description="Plan optimization score")
    
    # Adaptive planning
    replan_count: int = Field(0, description="Number of replanning events")
    replan_triggers: List[Dict[str, Any]] = Field(default_factory=list)
    alternative_plans: List[str] = Field(default_factory=list, description="Alternative plan IDs")
```

### 1.3 Investigation Planner
**Jira Story**: OLORIN-PLAN-004

```python
# File: olorin-server/app/planning/core/investigation_planner.py

from typing import List, Dict, Any, Optional
import asyncio
from abc import ABC, abstractmethod
import networkx as nx
from app.planning.models.plan import InvestigationPlan, PlanStep, PlanPriority
from app.planning.models.goal import Goal, GoalHierarchy

class PlanningStrategy(ABC):
    """Abstract base class for planning strategies"""
    
    @abstractmethod
    async def generate_plan(self, 
                           case_data: Dict[str, Any], 
                           constraints: Dict[str, Any]) -> InvestigationPlan:
        """Generate investigation plan based on case data"""
        pass
    
    @abstractmethod
    async def optimize_plan(self, plan: InvestigationPlan) -> InvestigationPlan:
        """Optimize the generated plan"""
        pass

class InvestigationPlanner:
    """Core planning engine for fraud investigations"""
    
    def __init__(self):
        self.strategies: Dict[str, PlanningStrategy] = {}
        self.plan_cache: Dict[str, InvestigationPlan] = {}
        self.dependency_graph = nx.DiGraph()
        self._register_strategies()
        
    def _register_strategies(self):
        """Register available planning strategies"""
        from app.planning.strategies.quick_investigation import QuickInvestigationStrategy
        from app.planning.strategies.comprehensive_investigation import ComprehensiveStrategy
        from app.planning.strategies.adaptive_investigation import AdaptiveStrategy
        
        self.strategies["quick"] = QuickInvestigationStrategy()
        self.strategies["comprehensive"] = ComprehensiveStrategy()
        self.strategies["adaptive"] = AdaptiveStrategy()
        
    async def create_investigation_plan(self, 
                                       case_data: Dict[str, Any],
                                       strategy_name: str = "adaptive",
                                       constraints: Optional[Dict[str, Any]] = None) -> InvestigationPlan:
        """Create an investigation plan for the given case"""
        
        # Select strategy
        strategy = self.strategies.get(strategy_name, self.strategies["adaptive"])
        
        # Analyze case complexity
        complexity = await self._analyze_case_complexity(case_data)
        
        # Set constraints based on complexity
        constraints = constraints or self._generate_constraints(complexity)
        
        # Generate initial plan
        plan = await strategy.generate_plan(case_data, constraints)
        
        # Optimize plan
        optimized_plan = await strategy.optimize_plan(plan)
        
        # Validate plan
        await self._validate_plan(optimized_plan)
        
        # Cache plan
        self.plan_cache[optimized_plan.id] = optimized_plan
        
        return optimized_plan
        
    async def _analyze_case_complexity(self, case_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze the complexity of the investigation case"""
        
        complexity_factors = {
            "data_volume": len(case_data.get("transactions", [])),
            "entity_count": len(case_data.get("entities", [])),
            "time_span": self._calculate_time_span(case_data),
            "risk_indicators": len(case_data.get("risk_indicators", [])),
            "cross_border": case_data.get("cross_border", False),
            "priority": case_data.get("priority", "medium")
        }
        
        # Calculate complexity score
        complexity_score = self._calculate_complexity_score(complexity_factors)
        
        return {
            "factors": complexity_factors,
            "score": complexity_score,
            "level": self._determine_complexity_level(complexity_score)
        }
        
    def _calculate_complexity_score(self, factors: Dict[str, Any]) -> float:
        """Calculate overall complexity score"""
        
        weights = {
            "data_volume": 0.2,
            "entity_count": 0.2,
            "time_span": 0.15,
            "risk_indicators": 0.25,
            "cross_border": 0.1,
            "priority": 0.1
        }
        
        score = 0.0
        
        # Normalize and weight factors
        if factors["data_volume"] > 1000:
            score += weights["data_volume"] * 1.0
        elif factors["data_volume"] > 100:
            score += weights["data_volume"] * 0.5
        else:
            score += weights["data_volume"] * 0.2
            
        # Add other factor calculations...
        
        return min(1.0, score)
        
    def _determine_complexity_level(self, score: float) -> str:
        """Determine complexity level from score"""
        if score > 0.7:
            return "high"
        elif score > 0.4:
            return "medium"
        else:
            return "low"
            
    def _generate_constraints(self, complexity: Dict[str, Any]) -> Dict[str, Any]:
        """Generate planning constraints based on complexity"""
        
        level = complexity["level"]
        
        if level == "high":
            return {
                "max_duration": 3600,  # 1 hour
                "max_agents": 6,
                "parallel_execution": True,
                "optimization_level": "aggressive",
                "replan_threshold": 0.3
            }
        elif level == "medium":
            return {
                "max_duration": 1800,  # 30 minutes
                "max_agents": 4,
                "parallel_execution": True,
                "optimization_level": "balanced",
                "replan_threshold": 0.5
            }
        else:
            return {
                "max_duration": 900,  # 15 minutes
                "max_agents": 3,
                "parallel_execution": False,
                "optimization_level": "conservative",
                "replan_threshold": 0.7
            }
            
    async def _validate_plan(self, plan: InvestigationPlan) -> bool:
        """Validate the generated plan"""
        
        # Check for circular dependencies
        if self._has_circular_dependencies(plan):
            raise ValueError("Plan contains circular dependencies")
            
        # Validate resource requirements
        if not await self._validate_resources(plan):
            raise ValueError("Insufficient resources for plan execution")
            
        # Check success criteria
        if not self._validate_success_criteria(plan):
            raise ValueError("Invalid success criteria in plan")
            
        return True
        
    def _has_circular_dependencies(self, plan: InvestigationPlan) -> bool:
        """Check for circular dependencies in plan steps"""
        
        # Build dependency graph
        G = nx.DiGraph()
        for step in plan.steps:
            G.add_node(step.id)
            for dep in step.dependencies:
                G.add_edge(dep, step.id)
                
        # Check for cycles
        return not nx.is_directed_acyclic_graph(G)
        
    async def _validate_resources(self, plan: InvestigationPlan) -> bool:
        """Validate that required resources are available"""
        
        # Check agent availability
        required_agents = set(step.agent_type for step in plan.steps)
        # Would check against available agents in the system
        
        return True  # Simplified for now
        
    def _validate_success_criteria(self, plan: InvestigationPlan) -> bool:
        """Validate success criteria for all steps"""
        
        for step in plan.steps:
            if not step.success_criteria:
                return False
                
        return True
        
    def _calculate_time_span(self, case_data: Dict[str, Any]) -> int:
        """Calculate time span of the case in days"""
        # Implementation would calculate based on transaction dates
        return 30  # Placeholder
```

### 1.4 Plan Executor
**Jira Story**: OLORIN-PLAN-005

```python
# File: olorin-server/app/planning/core/plan_executor.py

import asyncio
from typing import Dict, Any, Optional, List
from datetime import datetime
from app.planning.models.plan import InvestigationPlan, PlanStatus, PlanStep

class PlanExecutor:
    """Executes investigation plans with monitoring and control"""
    
    def __init__(self, agent_coordinator, monitoring_service):
        self.agent_coordinator = agent_coordinator
        self.monitoring_service = monitoring_service
        self.execution_tasks: Dict[str, asyncio.Task] = {}
        self.execution_state: Dict[str, Dict[str, Any]] = {}
        
    async def execute_plan(self, 
                          plan: InvestigationPlan,
                          context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Execute an investigation plan"""
        
        plan.status = PlanStatus.EXECUTING
        plan.updated_at = datetime.utcnow()
        
        # Initialize execution state
        self.execution_state[plan.id] = {
            "context": context or {},
            "results": {},
            "errors": [],
            "start_time": datetime.utcnow()
        }
        
        try:
            # Execute plan based on dependency order
            execution_order = self._determine_execution_order(plan)
            
            for batch in execution_order:
                # Execute steps in parallel within batch
                batch_results = await self._execute_batch(plan, batch)
                
                # Update execution state
                self.execution_state[plan.id]["results"].update(batch_results)
                
                # Check for failures
                if any(r.get("status") == "failed" for r in batch_results.values()):
                    if not await self._handle_failure(plan, batch_results):
                        break
                        
            # Finalize execution
            plan.status = PlanStatus.COMPLETED
            plan.actual_duration = (
                datetime.utcnow() - self.execution_state[plan.id]["start_time"]
            ).total_seconds()
            
        except Exception as e:
            plan.status = PlanStatus.FAILED
            self.execution_state[plan.id]["errors"].append(str(e))
            raise
            
        finally:
            plan.updated_at = datetime.utcnow()
            
        return self.execution_state[plan.id]
        
    def _determine_execution_order(self, plan: InvestigationPlan) -> List[List[PlanStep]]:
        """Determine execution order based on dependencies"""
        
        import networkx as nx
        
        # Build dependency graph
        G = nx.DiGraph()
        step_map = {step.id: step for step in plan.steps}
        
        for step in plan.steps:
            G.add_node(step.id)
            for dep in step.dependencies:
                if dep in step_map:
                    G.add_edge(dep, step.id)
                    
        # Topological sort for execution order
        topo_order = list(nx.topological_sort(G))
        
        # Group into parallel execution batches
        batches = []
        processed = set()
        
        for node in topo_order:
            if node not in processed:
                # Find all nodes that can be executed in parallel
                batch = []
                for candidate in topo_order:
                    if candidate not in processed:
                        # Check if all dependencies are processed
                        deps = set(G.predecessors(candidate))
                        if deps.issubset(processed):
                            batch.append(step_map[candidate])
                            
                if batch:
                    batches.append(batch)
                    processed.update(step.id for step in batch)
                    
        return batches
        
    async def _execute_batch(self, 
                           plan: InvestigationPlan, 
                           batch: List[PlanStep]) -> Dict[str, Any]:
        """Execute a batch of steps in parallel"""
        
        tasks = []
        for step in batch:
            task = asyncio.create_task(self._execute_step(plan, step))
            tasks.append((step.id, task))
            
        # Wait for all tasks to complete
        results = {}
        for step_id, task in tasks:
            try:
                result = await task
                results[step_id] = result
                plan.completed_steps.append(step_id)
            except Exception as e:
                results[step_id] = {
                    "status": "failed",
                    "error": str(e)
                }
                
        return results
        
    async def _execute_step(self, plan: InvestigationPlan, step: PlanStep) -> Dict[str, Any]:
        """Execute a single plan step"""
        
        # Update current step
        plan.current_step = step.id
        
        # Get appropriate agent
        agent = await self.agent_coordinator.get_agent(step.agent_type)
        
        # Prepare step context
        step_context = {
            **self.execution_state[plan.id]["context"],
            "step": step.dict(),
            "previous_results": self.execution_state[plan.id]["results"]
        }
        
        # Execute with monitoring
        start_time = datetime.utcnow()
        
        try:
            # Execute agent task
            result = await agent.execute(
                task=step.name,
                parameters=step.parameters,
                context=step_context
            )
            
            # Validate against success criteria
            if self._validate_result(result, step.success_criteria):
                return {
                    "status": "success",
                    "result": result,
                    "duration": (datetime.utcnow() - start_time).total_seconds()
                }
            else:
                return {
                    "status": "failed",
                    "error": "Success criteria not met",
                    "result": result,
                    "duration": (datetime.utcnow() - start_time).total_seconds()
                }
                
        except Exception as e:
            # Handle retry if configured
            if step.retry_strategy:
                return await self._retry_step(plan, step, e)
            else:
                raise
                
    async def _retry_step(self, 
                         plan: InvestigationPlan, 
                         step: PlanStep, 
                         error: Exception) -> Dict[str, Any]:
        """Retry a failed step based on retry strategy"""
        
        strategy = step.retry_strategy
        max_attempts = strategy.get("max_attempts", 3)
        backoff = strategy.get("backoff", 1.0)
        
        for attempt in range(max_attempts):
            await asyncio.sleep(backoff * (2 ** attempt))
            
            try:
                return await self._execute_step(plan, step)
            except Exception as e:
                if attempt == max_attempts - 1:
                    return {
                        "status": "failed",
                        "error": f"Failed after {max_attempts} attempts: {str(e)}",
                        "attempts": max_attempts
                    }
                    
    def _validate_result(self, result: Any, criteria: Dict[str, Any]) -> bool:
        """Validate result against success criteria"""
        
        if not criteria:
            return True
            
        # Check required fields
        if "required_fields" in criteria:
            for field in criteria["required_fields"]:
                if field not in result:
                    return False
                    
        # Check minimum score
        if "min_score" in criteria:
            if result.get("score", 0) < criteria["min_score"]:
                return False
                
        # Check custom validators
        if "validators" in criteria:
            for validator in criteria["validators"]:
                if not self._run_validator(result, validator):
                    return False
                    
        return True
        
    def _run_validator(self, result: Any, validator: Dict[str, Any]) -> bool:
        """Run a custom validator on the result"""
        # Implementation would run custom validation logic
        return True
        
    async def _handle_failure(self, 
                            plan: InvestigationPlan, 
                            batch_results: Dict[str, Any]) -> bool:
        """Handle step failures"""
        
        # Analyze failure impact
        failed_steps = [k for k, v in batch_results.items() if v.get("status") == "failed"]
        
        # Check if failures are critical
        critical_steps = [s for s in plan.steps if s.id in failed_steps and s.priority == "critical"]
        
        if critical_steps:
            # Critical failure - stop execution
            plan.status = PlanStatus.FAILED
            return False
        else:
            # Non-critical failure - continue if possible
            # Mark failed steps for potential replanning
            plan.metrics["failed_steps"] = failed_steps
            return True
            
    async def pause_execution(self, plan_id: str):
        """Pause plan execution"""
        
        if plan_id in self.execution_tasks:
            task = self.execution_tasks[plan_id]
            task.cancel()
            
            # Update plan status
            # Implementation would update the plan in storage
            
    async def resume_execution(self, plan_id: str):
        """Resume paused plan execution"""
        
        # Retrieve plan and execution state
        # Continue from last completed step
        pass
```

## Phase 2: LangGraph Integration (Weeks 3-4)

### 2.1 LangGraph Workflow Engine
**Jira Story**: OLORIN-PLAN-006

```python
# File: olorin-server/app/workflows/investigation_workflow.py

from typing import Dict, Any, List, Literal
from langgraph.graph import StateGraph, END
from langgraph.checkpoint import MemorySaver
from typing_extensions import TypedDict

class InvestigationState(TypedDict):
    """State for investigation workflow"""
    investigation_id: str
    case_data: Dict[str, Any]
    plan: Dict[str, Any]
    current_phase: str
    collected_evidence: List[Dict[str, Any]]
    analysis_results: Dict[str, Any]
    risk_assessment: Dict[str, Any]
    decision: str
    should_replan: bool
    replan_reason: str
    execution_history: List[Dict[str, Any]]

class InvestigationWorkflow:
    """LangGraph-based investigation workflow management"""
    
    def __init__(self, planner, executor, monitor):
        self.planner = planner
        self.executor = executor
        self.monitor = monitor
        self.workflow = self._build_workflow()
        
    def _build_workflow(self) -> StateGraph:
        """Build the investigation workflow graph"""
        
        # Create workflow
        workflow = StateGraph(InvestigationState)
        
        # Add nodes
        workflow.add_node("plan_generation", self.generate_plan)
        workflow.add_node("data_collection", self.collect_data)
        workflow.add_node("analysis", self.analyze_evidence)
        workflow.add_node("risk_assessment", self.assess_risk)
        workflow.add_node("decision_making", self.make_decision)
        workflow.add_node("replanning", self.replan)
        workflow.add_node("report_generation", self.generate_report)
        
        # Add edges
        workflow.add_edge("plan_generation", "data_collection")
        workflow.add_edge("data_collection", "analysis")
        workflow.add_edge("analysis", "risk_assessment")
        
        # Add conditional edges
        workflow.add_conditional_edges(
            "risk_assessment",
            self.should_replan,
            {
                True: "replanning",
                False: "decision_making"
            }
        )
        
        workflow.add_edge("replanning", "data_collection")
        workflow.add_edge("decision_making", "report_generation")
        workflow.add_edge("report_generation", END)
        
        # Set entry point
        workflow.set_entry_point("plan_generation")
        
        # Compile with checkpointing
        return workflow.compile(checkpointer=MemorySaver())
        
    async def generate_plan(self, state: InvestigationState) -> InvestigationState:
        """Generate investigation plan"""
        
        plan = await self.planner.create_investigation_plan(
            case_data=state["case_data"],
            strategy_name="adaptive"
        )
        
        state["plan"] = plan.dict()
        state["current_phase"] = "planning"
        state["execution_history"].append({
            "phase": "planning",
            "timestamp": datetime.utcnow().isoformat(),
            "plan_id": plan.id
        })
        
        return state
        
    async def collect_data(self, state: InvestigationState) -> InvestigationState:
        """Collect investigation data"""
        
        state["current_phase"] = "data_collection"
        
        # Execute data collection steps from plan
        collection_steps = [
            s for s in state["plan"]["steps"] 
            if s["name"].startswith("collect_")
        ]
        
        evidence = []
        for step in collection_steps:
            result = await self.executor.execute_step(step)
            evidence.append(result)
            
        state["collected_evidence"] = evidence
        state["execution_history"].append({
            "phase": "data_collection",
            "timestamp": datetime.utcnow().isoformat(),
            "evidence_count": len(evidence)
        })
        
        return state
        
    async def analyze_evidence(self, state: InvestigationState) -> InvestigationState:
        """Analyze collected evidence"""
        
        state["current_phase"] = "analysis"
        
        # Execute analysis steps
        analysis_steps = [
            s for s in state["plan"]["steps"]
            if s["name"].startswith("analyze_")
        ]
        
        results = {}
        for step in analysis_steps:
            result = await self.executor.execute_step(step)
            results[step["name"]] = result
            
        state["analysis_results"] = results
        state["execution_history"].append({
            "phase": "analysis",
            "timestamp": datetime.utcnow().isoformat(),
            "analyses_completed": len(results)
        })
        
        return state
        
    async def assess_risk(self, state: InvestigationState) -> InvestigationState:
        """Assess fraud risk based on analysis"""
        
        state["current_phase"] = "risk_assessment"
        
        # Aggregate risk from analysis results
        risk_scores = []
        for analysis_name, result in state["analysis_results"].items():
            if "risk_score" in result:
                risk_scores.append(result["risk_score"])
                
        # Calculate overall risk
        if risk_scores:
            overall_risk = sum(risk_scores) / len(risk_scores)
        else:
            overall_risk = 0.0
            
        state["risk_assessment"] = {
            "overall_risk": overall_risk,
            "risk_level": self._determine_risk_level(overall_risk),
            "component_scores": risk_scores,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Check if replanning is needed
        if overall_risk > 0.8 and len(state["collected_evidence"]) < 5:
            state["should_replan"] = True
            state["replan_reason"] = "High risk with insufficient evidence"
        else:
            state["should_replan"] = False
            
        return state
        
    def should_replan(self, state: InvestigationState) -> bool:
        """Determine if replanning is needed"""
        return state.get("should_replan", False)
        
    async def replan(self, state: InvestigationState) -> InvestigationState:
        """Generate new plan based on current findings"""
        
        state["current_phase"] = "replanning"
        
        # Create enhanced plan based on findings
        enhanced_case_data = {
            **state["case_data"],
            "previous_findings": state["analysis_results"],
            "risk_indicators": state["risk_assessment"]
        }
        
        new_plan = await self.planner.create_investigation_plan(
            case_data=enhanced_case_data,
            strategy_name="comprehensive"
        )
        
        state["plan"] = new_plan.dict()
        state["should_replan"] = False
        state["execution_history"].append({
            "phase": "replanning",
            "timestamp": datetime.utcnow().isoformat(),
            "reason": state["replan_reason"]
        })
        
        return state
        
    async def make_decision(self, state: InvestigationState) -> InvestigationState:
        """Make fraud determination decision"""
        
        state["current_phase"] = "decision"
        
        risk_level = state["risk_assessment"]["risk_level"]
        
        if risk_level == "critical":
            decision = "block_transaction"
        elif risk_level == "high":
            decision = "flag_for_review"
        elif risk_level == "medium":
            decision = "additional_verification"
        else:
            decision = "approve"
            
        state["decision"] = decision
        state["execution_history"].append({
            "phase": "decision",
            "timestamp": datetime.utcnow().isoformat(),
            "decision": decision
        })
        
        return state
        
    async def generate_report(self, state: InvestigationState) -> InvestigationState:
        """Generate investigation report"""
        
        state["current_phase"] = "reporting"
        
        # Generate comprehensive report
        report = {
            "investigation_id": state["investigation_id"],
            "summary": self._generate_summary(state),
            "evidence": state["collected_evidence"],
            "analysis": state["analysis_results"],
            "risk_assessment": state["risk_assessment"],
            "decision": state["decision"],
            "execution_history": state["execution_history"],
            "generated_at": datetime.utcnow().isoformat()
        }
        
        state["report"] = report
        
        return state
        
    def _determine_risk_level(self, score: float) -> str:
        """Determine risk level from score"""
        if score > 0.8:
            return "critical"
        elif score > 0.6:
            return "high"
        elif score > 0.4:
            return "medium"
        else:
            return "low"
            
    def _generate_summary(self, state: InvestigationState) -> str:
        """Generate investigation summary"""
        return f"""
        Investigation {state['investigation_id']} completed.
        Risk Level: {state['risk_assessment']['risk_level']}
        Decision: {state['decision']}
        Evidence Collected: {len(state['collected_evidence'])}
        Analyses Performed: {len(state['analysis_results'])}
        """
        
    async def run_investigation(self, 
                               investigation_id: str,
                               case_data: Dict[str, Any]) -> Dict[str, Any]:
        """Run complete investigation workflow"""
        
        initial_state: InvestigationState = {
            "investigation_id": investigation_id,
            "case_data": case_data,
            "plan": {},
            "current_phase": "initialization",
            "collected_evidence": [],
            "analysis_results": {},
            "risk_assessment": {},
            "decision": "",
            "should_replan": False,
            "replan_reason": "",
            "execution_history": []
        }
        
        # Run workflow
        final_state = await self.workflow.ainvoke(initial_state)
        
        return final_state
```

### 2.2 State Management and Checkpointing
**Jira Story**: OLORIN-PLAN-007

```python
# File: olorin-server/app/workflows/state_manager.py

from typing import Dict, Any, Optional
from langgraph.checkpoint import BaseCheckpointSaver
import json
import aioredis
from datetime import datetime

class RedisCheckpointSaver(BaseCheckpointSaver):
    """Redis-based checkpoint storage for LangGraph"""
    
    def __init__(self, redis_url: str = "redis://localhost"):
        self.redis_url = redis_url
        self.redis = None
        
    async def connect(self):
        """Connect to Redis"""
        self.redis = await aioredis.create_redis_pool(self.redis_url)
        
    async def put(self, 
                 config: Dict[str, Any], 
                 checkpoint: Dict[str, Any]) -> None:
        """Save checkpoint to Redis"""
        
        thread_id = config["configurable"]["thread_id"]
        checkpoint_id = checkpoint["id"]
        
        key = f"checkpoint:{thread_id}:{checkpoint_id}"
        
        # Serialize checkpoint
        checkpoint_data = {
            "checkpoint": checkpoint,
            "config": config,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        await self.redis.set(
            key,
            json.dumps(checkpoint_data),
            expire=86400  # 24 hour expiry
        )
        
        # Update latest checkpoint reference
        latest_key = f"checkpoint:latest:{thread_id}"
        await self.redis.set(latest_key, checkpoint_id)
        
    async def get(self, config: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Retrieve checkpoint from Redis"""
        
        thread_id = config["configurable"]["thread_id"]
        
        # Get checkpoint ID
        checkpoint_id = config["configurable"].get("checkpoint_id")
        
        if not checkpoint_id:
            # Get latest checkpoint
            latest_key = f"checkpoint:latest:{thread_id}"
            checkpoint_id = await self.redis.get(latest_key)
            
        if not checkpoint_id:
            return None
            
        # Retrieve checkpoint
        key = f"checkpoint:{thread_id}:{checkpoint_id}"
        data = await self.redis.get(key)
        
        if data:
            checkpoint_data = json.loads(data)
            return checkpoint_data["checkpoint"]
            
        return None
        
    async def list(self, config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """List all checkpoints for a thread"""
        
        thread_id = config["configurable"]["thread_id"]
        pattern = f"checkpoint:{thread_id}:*"
        
        keys = await self.redis.keys(pattern)
        checkpoints = []
        
        for key in keys:
            data = await self.redis.get(key)
            if data:
                checkpoint_data = json.loads(data)
                checkpoints.append(checkpoint_data)
                
        # Sort by timestamp
        checkpoints.sort(key=lambda x: x["timestamp"], reverse=True)
        
        return checkpoints
```

## Phase 3: Adaptive Planning System (Weeks 5-6)

### 3.1 Adaptive Planner
**Jira Story**: OLORIN-PLAN-008

```python
# File: olorin-server/app/planning/adaptive/adaptive_planner.py

from typing import Dict, Any, List, Optional
from enum import Enum
from datetime import datetime
from app.planning.models.plan import InvestigationPlan, PlanStatus

class ReplanTrigger(str, Enum):
    """Triggers for replanning"""
    HIGH_RISK_DISCOVERY = "high_risk_discovery"
    INVESTIGATION_TIMEOUT = "investigation_timeout"
    RESOURCE_CONSTRAINT = "resource_constraint"
    NEW_EVIDENCE = "new_evidence"
    AGENT_FAILURE = "agent_failure"
    PERFORMANCE_DEGRADATION = "performance_degradation"
    USER_REQUEST = "user_request"

class AdaptivePlanner:
    """Dynamic replanning based on investigation progress"""
    
    def __init__(self, base_planner, monitor, decision_engine):
        self.base_planner = base_planner
        self.monitor = monitor
        self.decision_engine = decision_engine
        self.replan_history: Dict[str, List[Dict[str, Any]]] = {}
        self.performance_thresholds = self._initialize_thresholds()
        
    def _initialize_thresholds(self) -> Dict[str, Any]:
        """Initialize performance thresholds"""
        return {
            "max_execution_time": 3600,  # 1 hour
            "min_success_rate": 0.7,
            "max_retry_count": 3,
            "risk_threshold": 0.8,
            "evidence_threshold": 5
        }
        
    async def monitor_execution(self, 
                               plan: InvestigationPlan,
                               execution_state: Dict[str, Any]) -> Optional[ReplanTrigger]:
        """Monitor plan execution and detect replan triggers"""
        
        # Check various trigger conditions
        triggers = []
        
        # Check execution time
        if await self._check_timeout(plan, execution_state):
            triggers.append(ReplanTrigger.INVESTIGATION_TIMEOUT)
            
        # Check risk level
        if await self._check_risk_level(execution_state):
            triggers.append(ReplanTrigger.HIGH_RISK_DISCOVERY)
            
        # Check agent failures
        if await self._check_agent_failures(execution_state):
            triggers.append(ReplanTrigger.AGENT_FAILURE)
            
        # Check performance
        if await self._check_performance(plan, execution_state):
            triggers.append(ReplanTrigger.PERFORMANCE_DEGRADATION)
            
        # Check for new evidence
        if await self._check_new_evidence(execution_state):
            triggers.append(ReplanTrigger.NEW_EVIDENCE)
            
        # Return highest priority trigger
        if triggers:
            return self._prioritize_triggers(triggers)
            
        return None
        
    async def _check_timeout(self, 
                           plan: InvestigationPlan,
                           execution_state: Dict[str, Any]) -> bool:
        """Check if execution is timing out"""
        
        elapsed = (datetime.utcnow() - execution_state["start_time"]).total_seconds()
        estimated = plan.estimated_total_duration
        
        # Check if significantly over estimate
        if elapsed > estimated * 1.5:
            return True
            
        # Check against hard limit
        if elapsed > self.performance_thresholds["max_execution_time"]:
            return True
            
        return False
        
    async def _check_risk_level(self, execution_state: Dict[str, Any]) -> bool:
        """Check if risk level triggers replanning"""
        
        results = execution_state.get("results", {})
        
        for step_id, result in results.items():
            if "risk_score" in result:
                if result["risk_score"] > self.performance_thresholds["risk_threshold"]:
                    # High risk detected
                    evidence_count = len(execution_state.get("evidence", []))
                    if evidence_count < self.performance_thresholds["evidence_threshold"]:
                        # High risk with insufficient evidence
                        return True
                        
        return False
        
    async def _check_agent_failures(self, execution_state: Dict[str, Any]) -> bool:
        """Check for agent failures"""
        
        failures = execution_state.get("errors", [])
        
        if len(failures) > self.performance_thresholds["max_retry_count"]:
            return True
            
        # Check for critical agent failures
        for error in failures:
            if "critical" in error.lower() or "agent" in error.lower():
                return True
                
        return False
        
    async def _check_performance(self, 
                               plan: InvestigationPlan,
                               execution_state: Dict[str, Any]) -> bool:
        """Check performance metrics"""
        
        results = execution_state.get("results", {})
        completed = len([r for r in results.values() if r.get("status") == "success"])
        total = len(plan.steps)
        
        if total > 0:
            success_rate = completed / total
            if success_rate < self.performance_thresholds["min_success_rate"]:
                return True
                
        return False
        
    async def _check_new_evidence(self, execution_state: Dict[str, Any]) -> bool:
        """Check for new evidence requiring replanning"""
        
        # Check if external evidence has been added
        new_evidence = execution_state.get("new_evidence", [])
        
        if new_evidence:
            # Analyze impact of new evidence
            impact = await self._analyze_evidence_impact(new_evidence)
            if impact > 0.5:  # Significant impact
                return True
                
        return False
        
    async def _analyze_evidence_impact(self, evidence: List[Dict[str, Any]]) -> float:
        """Analyze the impact of new evidence"""
        
        # Simplified impact calculation
        # In reality, would use ML model or rules engine
        
        impact_score = 0.0
        
        for item in evidence:
            if item.get("type") == "high_risk_indicator":
                impact_score += 0.3
            elif item.get("type") == "pattern_match":
                impact_score += 0.2
            else:
                impact_score += 0.1
                
        return min(1.0, impact_score)
        
    def _prioritize_triggers(self, triggers: List[ReplanTrigger]) -> ReplanTrigger:
        """Prioritize replan triggers"""
        
        priority_order = [
            ReplanTrigger.AGENT_FAILURE,
            ReplanTrigger.HIGH_RISK_DISCOVERY,
            ReplanTrigger.INVESTIGATION_TIMEOUT,
            ReplanTrigger.NEW_EVIDENCE,
            ReplanTrigger.PERFORMANCE_DEGRADATION,
            ReplanTrigger.RESOURCE_CONSTRAINT,
            ReplanTrigger.USER_REQUEST
        ]
        
        for trigger in priority_order:
            if trigger in triggers:
                return trigger
                
        return triggers[0]
        
    async def trigger_replanning(self,
                                current_plan: InvestigationPlan,
                                trigger: ReplanTrigger,
                                execution_state: Dict[str, Any]) -> InvestigationPlan:
        """Generate new plan based on trigger and current state"""
        
        # Record replan event
        self._record_replan_event(current_plan, trigger, execution_state)
        
        # Analyze current situation
        situation_analysis = await self._analyze_situation(
            current_plan,
            trigger,
            execution_state
        )
        
        # Generate replan strategy
        strategy = await self._determine_replan_strategy(trigger, situation_analysis)
        
        # Create new plan
        new_plan = await self._generate_adaptive_plan(
            current_plan,
            strategy,
            situation_analysis
        )
        
        # Optimize new plan
        optimized_plan = await self._optimize_adaptive_plan(new_plan, execution_state)
        
        return optimized_plan
        
    def _record_replan_event(self,
                            plan: InvestigationPlan,
                            trigger: ReplanTrigger,
                            execution_state: Dict[str, Any]):
        """Record replanning event for analysis"""
        
        if plan.id not in self.replan_history:
            self.replan_history[plan.id] = []
            
        self.replan_history[plan.id].append({
            "timestamp": datetime.utcnow().isoformat(),
            "trigger": trigger.value,
            "execution_progress": len(plan.completed_steps) / len(plan.steps),
            "state_summary": self._summarize_state(execution_state)
        })
        
    def _summarize_state(self, execution_state: Dict[str, Any]) -> Dict[str, Any]:
        """Create summary of execution state"""
        
        return {
            "completed_steps": len(execution_state.get("results", {})),
            "errors": len(execution_state.get("errors", [])),
            "evidence_collected": len(execution_state.get("evidence", [])),
            "elapsed_time": (
                datetime.utcnow() - execution_state["start_time"]
            ).total_seconds() if "start_time" in execution_state else 0
        }
        
    async def _analyze_situation(self,
                                plan: InvestigationPlan,
                                trigger: ReplanTrigger,
                                execution_state: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze current investigation situation"""
        
        return {
            "trigger": trigger,
            "completed_ratio": len(plan.completed_steps) / len(plan.steps),
            "failed_steps": [
                s for s, r in execution_state.get("results", {}).items()
                if r.get("status") == "failed"
            ],
            "current_risk": self._calculate_current_risk(execution_state),
            "available_resources": await self._check_available_resources(),
            "time_remaining": self._calculate_time_remaining(plan, execution_state)
        }
        
    def _calculate_current_risk(self, execution_state: Dict[str, Any]) -> float:
        """Calculate current risk level from execution state"""
        
        risk_scores = []
        for result in execution_state.get("results", {}).values():
            if "risk_score" in result:
                risk_scores.append(result["risk_score"])
                
        if risk_scores:
            return sum(risk_scores) / len(risk_scores)
        return 0.0
        
    async def _check_available_resources(self) -> Dict[str, Any]:
        """Check available resources for replanning"""
        
        # Would check actual agent availability, system resources, etc.
        return {
            "available_agents": 4,
            "cpu_usage": 0.6,
            "memory_usage": 0.5,
            "api_quota_remaining": 1000
        }
        
    def _calculate_time_remaining(self,
                                 plan: InvestigationPlan,
                                 execution_state: Dict[str, Any]) -> float:
        """Calculate remaining time budget"""
        
        elapsed = (datetime.utcnow() - execution_state["start_time"]).total_seconds()
        budget = self.performance_thresholds["max_execution_time"]
        
        return max(0, budget - elapsed)
        
    async def _determine_replan_strategy(self,
                                        trigger: ReplanTrigger,
                                        situation: Dict[str, Any]) -> str:
        """Determine replanning strategy based on trigger and situation"""
        
        if trigger == ReplanTrigger.HIGH_RISK_DISCOVERY:
            if situation["available_resources"]["available_agents"] > 2:
                return "comprehensive_investigation"
            else:
                return "focused_investigation"
                
        elif trigger == ReplanTrigger.INVESTIGATION_TIMEOUT:
            if situation["completed_ratio"] > 0.7:
                return "quick_completion"
            else:
                return "prioritized_investigation"
                
        elif trigger == ReplanTrigger.AGENT_FAILURE:
            return "alternative_agents"
            
        elif trigger == ReplanTrigger.NEW_EVIDENCE:
            return "evidence_integration"
            
        else:
            return "adaptive_investigation"
            
    async def _generate_adaptive_plan(self,
                                     current_plan: InvestigationPlan,
                                     strategy: str,
                                     situation: Dict[str, Any]) -> InvestigationPlan:
        """Generate new adaptive plan"""
        
        # Build enhanced case data
        case_data = {
            "original_plan": current_plan.dict(),
            "completed_steps": current_plan.completed_steps,
            "situation": situation,
            "strategy_override": strategy
        }
        
        # Generate new plan with strategy
        new_plan = await self.base_planner.create_investigation_plan(
            case_data=case_data,
            strategy_name=strategy
        )
        
        # Inherit completion status for already done steps
        for step in new_plan.steps:
            if step.id in current_plan.completed_steps:
                new_plan.completed_steps.append(step.id)
                
        # Update replan metadata
        new_plan.replan_count = current_plan.replan_count + 1
        new_plan.replan_triggers.append({
            "trigger": situation["trigger"].value,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        return new_plan
        
    async def _optimize_adaptive_plan(self,
                                     plan: InvestigationPlan,
                                     execution_state: Dict[str, Any]) -> InvestigationPlan:
        """Optimize the adaptive plan"""
        
        # Remove completed steps
        plan.steps = [s for s in plan.steps if s.id not in plan.completed_steps]
        
        # Prioritize based on risk
        if execution_state.get("current_risk", 0) > 0.7:
            # High risk - prioritize risk assessment steps
            plan.steps.sort(key=lambda s: s.name.startswith("assess_risk"), reverse=True)
            
        # Optimize for time if running out
        time_remaining = self._calculate_time_remaining(plan, execution_state)
        if time_remaining < 600:  # Less than 10 minutes
            # Keep only critical steps
            plan.steps = [s for s in plan.steps if s.priority == "critical"]
            
        return plan
```

## Phase 4: Advanced Features (Weeks 7-8)

### 4.1 Goal Decomposition Framework
**Jira Story**: OLORIN-PLAN-009

```python
# File: olorin-server/app/planning/goals/goal_manager.py

from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from enum import Enum
import networkx as nx

class GoalType(str, Enum):
    PRIMARY = "primary"
    SUBGOAL = "subgoal"
    TASK = "task"

class GoalStatus(str, Enum):
    PENDING = "pending"
    ACTIVE = "active"
    COMPLETED = "completed"
    FAILED = "failed"
    BLOCKED = "blocked"

@dataclass
class Goal:
    """Representation of an investigation goal"""
    id: str
    name: str
    description: str
    type: GoalType
    status: GoalStatus
    parent_id: Optional[str]
    dependencies: List[str]
    success_criteria: Dict[str, Any]
    assigned_agent: Optional[str]
    priority: int
    estimated_effort: float
    actual_effort: Optional[float]
    
class GoalHierarchy:
    """Hierarchical goal structure"""
    
    def __init__(self):
        self.goals: Dict[str, Goal] = {}
        self.graph = nx.DiGraph()
        
    def add_goal(self, goal: Goal):
        """Add goal to hierarchy"""
        self.goals[goal.id] = goal
        self.graph.add_node(goal.id, goal=goal)
        
        if goal.parent_id:
            self.graph.add_edge(goal.parent_id, goal.id)
            
        for dep in goal.dependencies:
            if dep in self.goals:
                self.graph.add_edge(dep, goal.id)
                
    def get_subgoals(self, goal_id: str) -> List[Goal]:
        """Get direct subgoals of a goal"""
        subgoal_ids = list(self.graph.successors(goal_id))
        return [self.goals[gid] for gid in subgoal_ids]
        
    def get_leaf_tasks(self) -> List[Goal]:
        """Get all leaf tasks (no subgoals)"""
        leaf_nodes = [n for n in self.graph.nodes() if self.graph.out_degree(n) == 0]
        return [self.goals[gid] for gid in leaf_nodes]
        
    def get_execution_order(self) -> List[List[Goal]]:
        """Get goals in execution order (batched for parallel execution)"""
        
        # Topological sort
        topo_order = list(nx.topological_sort(self.graph))
        
        # Group into parallel batches
        batches = []
        processed = set()
        
        for node in topo_order:
            if node not in processed:
                batch = []
                for candidate in topo_order:
                    if candidate not in processed:
                        deps = set(self.graph.predecessors(candidate))
                        if deps.issubset(processed):
                            batch.append(self.goals[candidate])
                            
                if batch:
                    batches.append(batch)
                    processed.update(g.id for g in batch)
                    
        return batches

class GoalManager:
    """Manages goal decomposition and tracking"""
    
    def __init__(self):
        self.goal_templates = self._load_goal_templates()
        self.decomposition_rules = self._load_decomposition_rules()
        
    def _load_goal_templates(self) -> Dict[str, Dict[str, Any]]:
        """Load predefined goal templates"""
        return {
            "investigate_fraud": {
                "subgoals": [
                    "analyze_transaction_pattern",
                    "verify_user_identity",
                    "assess_network_risk",
                    "compile_evidence",
                    "make_decision"
                ]
            },
            "analyze_transaction_pattern": {
                "tasks": [
                    "query_transaction_history",
                    "identify_anomalies",
                    "calculate_velocity",
                    "check_amount_patterns"
                ]
            },
            "verify_user_identity": {
                "tasks": [
                    "check_device_fingerprint",
                    "validate_location",
                    "analyze_behavior",
                    "verify_credentials"
                ]
            }
        }
        
    def _load_decomposition_rules(self) -> List[Dict[str, Any]]:
        """Load goal decomposition rules"""
        return [
            {
                "condition": lambda g: g.type == GoalType.PRIMARY,
                "action": "decompose_to_subgoals"
            },
            {
                "condition": lambda g: g.type == GoalType.SUBGOAL,
                "action": "decompose_to_tasks"
            }
        ]
        
    async def decompose_investigation_goal(self,
                                          primary_goal: str,
                                          case_data: Dict[str, Any]) -> GoalHierarchy:
        """Decompose primary investigation goal into hierarchy"""
        
        hierarchy = GoalHierarchy()
        
        # Create primary goal
        primary = Goal(
            id="goal_0",
            name=primary_goal,
            description=f"Primary goal: {primary_goal}",
            type=GoalType.PRIMARY,
            status=GoalStatus.PENDING,
            parent_id=None,
            dependencies=[],
            success_criteria={"all_subgoals_complete": True},
            assigned_agent=None,
            priority=1,
            estimated_effort=0.0,
            actual_effort=None
        )
        
        hierarchy.add_goal(primary)
        
        # Decompose based on templates and rules
        await self._recursive_decompose(primary, hierarchy, case_data)
        
        return hierarchy
        
    async def _recursive_decompose(self,
                                  goal: Goal,
                                  hierarchy: GoalHierarchy,
                                  case_data: Dict[str, Any]):
        """Recursively decompose goal"""
        
        # Check if template exists
        if goal.name in self.goal_templates:
            template = self.goal_templates[goal.name]
            
            if "subgoals" in template:
                for i, subgoal_name in enumerate(template["subgoals"]):
                    subgoal = Goal(
                        id=f"{goal.id}_sg_{i}",
                        name=subgoal_name,
                        description=f"Subgoal: {subgoal_name}",
                        type=GoalType.SUBGOAL,
                        status=GoalStatus.PENDING,
                        parent_id=goal.id,
                        dependencies=[],
                        success_criteria=self._generate_success_criteria(subgoal_name),
                        assigned_agent=self._assign_agent(subgoal_name),
                        priority=goal.priority + 1,
                        estimated_effort=self._estimate_effort(subgoal_name, case_data),
                        actual_effort=None
                    )
                    
                    hierarchy.add_goal(subgoal)
                    
                    # Recursively decompose subgoal
                    await self._recursive_decompose(subgoal, hierarchy, case_data)
                    
            elif "tasks" in template:
                for i, task_name in enumerate(template["tasks"]):
                    task = Goal(
                        id=f"{goal.id}_t_{i}",
                        name=task_name,
                        description=f"Task: {task_name}",
                        type=GoalType.TASK,
                        status=GoalStatus.PENDING,
                        parent_id=goal.id,
                        dependencies=self._determine_dependencies(task_name, template["tasks"][:i]),
                        success_criteria=self._generate_success_criteria(task_name),
                        assigned_agent=self._assign_agent(task_name),
                        priority=goal.priority + 1,
                        estimated_effort=self._estimate_effort(task_name, case_data),
                        actual_effort=None
                    )
                    
                    hierarchy.add_goal(task)
                    
    def _generate_success_criteria(self, goal_name: str) -> Dict[str, Any]:
        """Generate success criteria for a goal"""
        
        criteria_map = {
            "analyze_transaction_pattern": {
                "patterns_identified": True,
                "risk_score_calculated": True,
                "min_confidence": 0.7
            },
            "verify_user_identity": {
                "identity_verified": True,
                "confidence_score": 0.8,
                "checks_passed": ["device", "location", "behavior"]
            },
            "assess_network_risk": {
                "network_analyzed": True,
                "risk_assessment_complete": True,
                "threats_identified": True
            }
        }
        
        return criteria_map.get(goal_name, {"completed": True})
        
    def _assign_agent(self, goal_name: str) -> Optional[str]:
        """Assign appropriate agent to goal"""
        
        agent_map = {
            "query_transaction_history": "data_agent",
            "identify_anomalies": "pattern_agent",
            "check_device_fingerprint": "device_agent",
            "validate_location": "location_agent",
            "analyze_behavior": "behavior_agent",
            "assess_network_risk": "network_agent"
        }
        
        return agent_map.get(goal_name)
        
    def _estimate_effort(self, goal_name: str, case_data: Dict[str, Any]) -> float:
        """Estimate effort required for goal"""
        
        base_effort = {
            "analyze_transaction_pattern": 120,
            "verify_user_identity": 90,
            "assess_network_risk": 60,
            "query_transaction_history": 30,
            "identify_anomalies": 45
        }
        
        effort = base_effort.get(goal_name, 30)
        
        # Adjust based on case data
        if case_data.get("data_volume", 0) > 1000:
            effort *= 1.5
            
        return effort
        
    def _determine_dependencies(self, 
                               task_name: str, 
                               previous_tasks: List[str]) -> List[str]:
        """Determine task dependencies"""
        
        dependency_rules = {
            "identify_anomalies": ["query_transaction_history"],
            "calculate_velocity": ["query_transaction_history"],
            "analyze_behavior": ["check_device_fingerprint", "validate_location"]
        }
        
        deps = dependency_rules.get(task_name, [])
        
        # Only include dependencies that are in previous tasks
        return [d for d in deps if d in previous_tasks]
        
    async def track_goal_progress(self, 
                                 hierarchy: GoalHierarchy,
                                 execution_state: Dict[str, Any]) -> Dict[str, Any]:
        """Track progress of goal hierarchy"""
        
        progress = {
            "total_goals": len(hierarchy.goals),
            "completed": 0,
            "active": 0,
            "pending": 0,
            "failed": 0,
            "blocked": 0,
            "completion_percentage": 0.0
        }
        
        for goal in hierarchy.goals.values():
            if goal.status == GoalStatus.COMPLETED:
                progress["completed"] += 1
            elif goal.status == GoalStatus.ACTIVE:
                progress["active"] += 1
            elif goal.status == GoalStatus.PENDING:
                progress["pending"] += 1
            elif goal.status == GoalStatus.FAILED:
                progress["failed"] += 1
            elif goal.status == GoalStatus.BLOCKED:
                progress["blocked"] += 1
                
        progress["completion_percentage"] = (
            progress["completed"] / progress["total_goals"] * 100
            if progress["total_goals"] > 0 else 0
        )
        
        return progress
```

## Integration and Testing

### Integration Points
**Jira Story**: OLORIN-PLAN-010

```python
# File: olorin-server/app/service/enhanced_investigation_service.py

from app.planning.core.investigation_planner import InvestigationPlanner
from app.planning.core.plan_executor import PlanExecutor
from app.planning.adaptive.adaptive_planner import AdaptivePlanner
from app.workflows.investigation_workflow import InvestigationWorkflow
from app.planning.goals.goal_manager import GoalManager

class EnhancedInvestigationService:
    """Enhanced investigation service with planning capabilities"""
    
    def __init__(self):
        self.planner = InvestigationPlanner()
        self.executor = PlanExecutor(
            agent_coordinator=self.agent_coordinator,
            monitoring_service=self.monitoring_service
        )
        self.adaptive_planner = AdaptivePlanner(
            base_planner=self.planner,
            monitor=self.monitoring_service,
            decision_engine=self.decision_engine
        )
        self.workflow = InvestigationWorkflow(
            planner=self.planner,
            executor=self.executor,
            monitor=self.monitoring_service
        )
        self.goal_manager = GoalManager()
        
    async def investigate_with_planning(self,
                                       investigation_id: str,
                                       case_data: Dict[str, Any]) -> Dict[str, Any]:
        """Run investigation with advanced planning"""
        
        # Decompose goals
        goal_hierarchy = await self.goal_manager.decompose_investigation_goal(
            primary_goal="investigate_fraud",
            case_data=case_data
        )
        
        # Run workflow with LangGraph
        result = await self.workflow.run_investigation(
            investigation_id=investigation_id,
            case_data={
                **case_data,
                "goal_hierarchy": goal_hierarchy
            }
        )
        
        return result
```

### Testing Strategy
**Jira Story**: OLORIN-PLAN-011

```python
# File: olorin-server/test/test_planning.py

import pytest
from app.planning.core.investigation_planner import InvestigationPlanner
from app.planning.models.plan import InvestigationPlan, PlanStatus

@pytest.mark.asyncio
async def test_plan_generation():
    """Test investigation plan generation"""
    
    planner = InvestigationPlanner()
    
    case_data = {
        "investigation_id": "test_123",
        "transactions": [
            {"id": "t1", "amount": 100, "timestamp": "2024-01-01T10:00:00Z"},
            {"id": "t2", "amount": 5000, "timestamp": "2024-01-01T10:05:00Z"}
        ],
        "priority": "high"
    }
    
    plan = await planner.create_investigation_plan(case_data)
    
    assert isinstance(plan, InvestigationPlan)
    assert plan.status == PlanStatus.READY
    assert len(plan.steps) > 0
    assert plan.priority == "high"

@pytest.mark.asyncio
async def test_adaptive_replanning():
    """Test adaptive replanning"""
    
    from app.planning.adaptive.adaptive_planner import AdaptivePlanner, ReplanTrigger
    
    # Setup
    planner = InvestigationPlanner()
    adaptive = AdaptivePlanner(planner, None, None)
    
    # Create initial plan
    initial_plan = await planner.create_investigation_plan({"test": "data"})
    
    # Trigger replanning
    new_plan = await adaptive.trigger_replanning(
        current_plan=initial_plan,
        trigger=ReplanTrigger.HIGH_RISK_DISCOVERY,
        execution_state={"results": {}, "errors": []}
    )
    
    assert new_plan.replan_count == 1
    assert len(new_plan.replan_triggers) == 1
```

## Deployment Plan

### Week 7: Staging Deployment
1. Deploy to staging environment
2. Run integration tests
3. Performance benchmarking
4. Security review

### Week 8: Production Rollout
1. Feature flag deployment
2. Gradual rollout (10% → 50% → 100%)
3. Monitor metrics
4. Gather feedback

## Success Metrics

### Technical Metrics
- Plan generation time < 2 seconds
- 80% of plans execute without replanning
- 90% successful adaptation to triggers
- 75% optimal resource utilization

### Business Metrics
- 35-40% faster investigation completion
- 25% improvement in fraud detection
- 30% better resource utilization
- 50% reduction in failed investigations

## Risk Mitigation

### Implementation Risks
1. **Complexity**: Phased implementation with thorough testing
2. **Performance**: Caching and optimization strategies
3. **Integration**: Careful API design and backward compatibility
4. **Training**: Team workshops and documentation

## Conclusion

This implementation plan provides a comprehensive roadmap for enhancing Olorin's planning capabilities based on Chapter 4 of the Agentic Design Patterns book. The 8-week implementation will transform the platform from a reactive system to an intelligent, adaptive investigation platform with sophisticated planning, goal decomposition, and workflow management capabilities.

---

**Document Status**: Complete  
**Approval Required**: Yes  
**Implementation Start**: Upon Approval  
**Estimated Completion**: 8 weeks from start