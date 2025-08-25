"""
Orchestrator-Workers Pattern

Dynamic task breakdown with worker pool management and dependency resolution.
Orchestrates complex investigations by delegating specialized tasks to worker agents.
"""

import logging
from typing import Any, Dict, List, Optional, Set
from dataclasses import dataclass
from enum import Enum

from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage

from .augmented_llm import AugmentedLLMPattern
from .base import BasePattern, PatternResult

logger = logging.getLogger(__name__)


class TaskStatus(Enum):
    """Status of a worker task"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress" 
    COMPLETED = "completed"
    FAILED = "failed"
    BLOCKED = "blocked"


@dataclass
class WorkerTask:
    """Represents a task assigned to a worker"""
    
    task_id: str
    name: str
    description: str
    messages: List[BaseMessage]
    context: Dict[str, Any]
    dependencies: Set[str]
    assigned_worker: Optional[str] = None
    status: TaskStatus = TaskStatus.PENDING
    result: Optional[PatternResult] = None
    priority: int = 1
    estimated_duration: int = 60  # seconds
    retry_count: int = 0
    max_retries: int = 2


@dataclass 
class WorkerAgent:
    """Represents a specialized worker agent"""
    
    worker_id: str
    name: str
    specialization: str
    capabilities: List[str]
    is_busy: bool = False
    current_task: Optional[str] = None
    completed_tasks: int = 0
    success_rate: float = 1.0


class OrchestratorWorkersPattern(BasePattern):
    """
    Orchestrator-Workers Pattern implementation.
    
    Provides:
    - Dynamic task breakdown based on investigation complexity
    - Specialized worker pool management
    - Dependency resolution and task scheduling
    - Load balancing and resource optimization
    """
    
    def __init__(self, config, tools=None, ws_streaming=None):
        """Initialize the Orchestrator-Workers pattern"""
        super().__init__(config, tools, ws_streaming)
        
        # Initialize underlying LLM pattern for orchestrator and workers
        self.llm_pattern = AugmentedLLMPattern(config, tools, ws_streaming)
        
        # Initialize worker pool
        self.workers = self._initialize_worker_pool()
        
        # Task management
        self.pending_tasks: Dict[str, WorkerTask] = {}
        self.completed_tasks: Dict[str, WorkerTask] = {}
        
        # Configuration
        self.max_concurrent_tasks = config.custom_params.get("max_concurrent_tasks", 3)
        self.task_timeout = config.custom_params.get("task_timeout_seconds", 120)
    
    def _initialize_worker_pool(self) -> Dict[str, WorkerAgent]:
        """Initialize the pool of specialized worker agents"""
        
        workers = {}
        
        # Device Analysis Worker
        workers["device_worker"] = WorkerAgent(
            worker_id="device_worker",
            name="Device Analysis Specialist",
            specialization="device_analysis",
            capabilities=[
                "device_fingerprinting",
                "browser_analysis", 
                "mobile_device_detection",
                "hardware_profiling",
                "device_reputation_scoring"
            ]
        )
        
        # Location Analysis Worker
        workers["location_worker"] = WorkerAgent(
            worker_id="location_worker", 
            name="Geographic Analysis Specialist",
            specialization="location_analysis",
            capabilities=[
                "geolocation_verification",
                "ip_geolocation",
                "location_velocity_analysis", 
                "geographic_risk_assessment",
                "jurisdiction_compliance"
            ]
        )
        
        # Network Security Worker
        workers["network_worker"] = WorkerAgent(
            worker_id="network_worker",
            name="Network Security Specialist", 
            specialization="network_analysis",
            capabilities=[
                "ip_reputation_analysis",
                "proxy_detection",
                "vpn_identification",
                "network_anomaly_detection",
                "connection_pattern_analysis"
            ]
        )
        
        # Behavioral Analysis Worker
        workers["behavioral_worker"] = WorkerAgent(
            worker_id="behavioral_worker",
            name="Behavioral Analysis Specialist",
            specialization="behavioral_analysis", 
            capabilities=[
                "user_behavior_profiling",
                "anomaly_detection",
                "pattern_recognition",
                "risk_scoring",
                "behavioral_biometrics"
            ]
        )
        
        # Risk Assessment Worker
        workers["risk_worker"] = WorkerAgent(
            worker_id="risk_worker",
            name="Risk Assessment Specialist",
            specialization="risk_assessment",
            capabilities=[
                "composite_risk_scoring", 
                "threat_assessment",
                "vulnerability_analysis",
                "risk_mitigation_planning",
                "compliance_verification"
            ]
        )
        
        # Data Correlation Worker
        workers["correlation_worker"] = WorkerAgent(
            worker_id="correlation_worker",
            name="Data Correlation Specialist",
            specialization="data_correlation",
            capabilities=[
                "cross_entity_correlation",
                "temporal_analysis",
                "pattern_correlation",
                "data_fusion",
                "relationship_mapping"
            ]
        )
        
        return workers
    
    async def execute(self, messages: List[BaseMessage], context: Dict[str, Any]) -> PatternResult:
        """Execute the Orchestrator-Workers pattern"""
        
        try:
            # Stream orchestration start
            if self.ws_streaming:
                await self._stream_orchestration_start(context)
            
            # Orchestrator: Analyze the request and break down into tasks
            task_breakdown = await self._orchestrate_task_breakdown(messages, context)
            
            if not task_breakdown.success:
                return task_breakdown
            
            # Create worker tasks from breakdown
            worker_tasks = await self._create_worker_tasks(task_breakdown.result, messages, context)
            
            # Stream task assignment
            if self.ws_streaming:
                await self._stream_task_assignment(worker_tasks, context)
            
            # Execute tasks with dependency resolution
            execution_results = await self._execute_with_dependencies(worker_tasks)
            
            # Orchestrator: Synthesize results from workers
            final_result = await self._synthesize_worker_results(execution_results, context)
            
            # Stream orchestration completion
            if self.ws_streaming:
                await self._stream_orchestration_complete(len(execution_results), final_result.success, context)
            
            return final_result
            
        except Exception as e:
            logger.error(f"Orchestrator-Workers execution failed: {str(e)}", exc_info=True)
            
            if self.ws_streaming:
                await self._stream_error(str(e), context)
            
            return PatternResult.error_result(f"Orchestration failed: {str(e)}")
    
    async def _orchestrate_task_breakdown(self, messages: List[BaseMessage], context: Dict[str, Any]) -> PatternResult:
        """Orchestrator analyzes request and creates task breakdown"""
        
        orchestrator_prompt = f"""
        As the Investigation Orchestrator, analyze this fraud investigation request and break it down into specialized tasks.
        
        Request Context:
        - Entity ID: {context.get('entity_id', 'unknown')}
        - Entity Type: {context.get('entity_type', 'unknown')}  
        - Investigation Type: {context.get('investigation_type', 'fraud')}
        
        Available Specialist Workers:
        - Device Analysis Specialist: device fingerprinting, hardware profiling
        - Geographic Analysis Specialist: location verification, geolocation analysis  
        - Network Security Specialist: IP analysis, proxy detection
        - Behavioral Analysis Specialist: behavior profiling, anomaly detection
        - Risk Assessment Specialist: risk scoring, threat assessment
        - Data Correlation Specialist: cross-entity correlation, pattern analysis
        
        For each task, specify:
        1. Task name and description
        2. Best suited specialist worker
        3. Dependencies on other tasks
        4. Priority level (1-5)
        5. Estimated complexity
        
        Return a structured breakdown with clear task assignments and dependencies.
        """
        
        orchestrator_messages = messages + [SystemMessage(content=orchestrator_prompt)]
        
        return await self.llm_pattern.execute(orchestrator_messages, context)
    
    async def _create_worker_tasks(
        self, 
        breakdown: Any, 
        original_messages: List[BaseMessage],
        context: Dict[str, Any]
    ) -> List[WorkerTask]:
        """Create structured worker tasks from orchestrator breakdown"""
        
        tasks = []
        
        # Default task set if breakdown parsing fails
        default_tasks = [
            {
                "name": "device_analysis",
                "description": "Analyze device characteristics and fingerprinting data",
                "worker": "device_worker",
                "dependencies": set(),
                "priority": 2
            },
            {
                "name": "location_analysis", 
                "description": "Examine geographic and location-based indicators",
                "worker": "location_worker",
                "dependencies": set(),
                "priority": 2
            },
            {
                "name": "network_analysis",
                "description": "Investigate network security and connection patterns",
                "worker": "network_worker", 
                "dependencies": set(),
                "priority": 2
            },
            {
                "name": "behavioral_analysis",
                "description": "Profile user behavior and detect anomalies",
                "worker": "behavioral_worker",
                "dependencies": {"device_analysis", "location_analysis"},
                "priority": 3
            },
            {
                "name": "correlation_analysis",
                "description": "Correlate findings across all analysis domains",
                "worker": "correlation_worker",
                "dependencies": {"device_analysis", "location_analysis", "network_analysis"},
                "priority": 4
            },
            {
                "name": "risk_assessment",
                "description": "Calculate comprehensive risk scores and recommendations",
                "worker": "risk_worker",
                "dependencies": {"behavioral_analysis", "correlation_analysis"},
                "priority": 5
            }
        ]
        
        # Use default tasks for now - in production, parse breakdown result
        for i, task_def in enumerate(default_tasks):
            task_context = context.copy()
            task_context.update({
                "worker_specialization": self.workers[task_def["worker"]].specialization,
                "task_focus": task_def["name"],
                "analysis_scope": task_def["description"]
            })
            
            task_messages = original_messages + [
                HumanMessage(content=f"As a {self.workers[task_def['worker']].name}, {task_def['description']} for this investigation.")
            ]
            
            task = WorkerTask(
                task_id=f"task_{i:03d}_{task_def['name']}",
                name=task_def["name"],
                description=task_def["description"],
                messages=task_messages,
                context=task_context,
                dependencies=task_def["dependencies"],
                priority=task_def["priority"],
                estimated_duration=60 + (task_def["priority"] * 20)
            )
            
            tasks.append(task)
        
        return tasks
    
    async def _execute_with_dependencies(self, tasks: List[WorkerTask]) -> List[PatternResult]:
        """Execute tasks while respecting dependencies"""
        
        self.pending_tasks = {task.task_id: task for task in tasks}
        results = []
        
        while self.pending_tasks or any(worker.is_busy for worker in self.workers.values()):
            
            # Find ready tasks (no unmet dependencies)
            ready_tasks = self._find_ready_tasks()
            
            # Assign ready tasks to available workers  
            assignments = self._assign_tasks_to_workers(ready_tasks)
            
            # Execute assigned tasks
            if assignments:
                task_results = await self._execute_assigned_tasks(assignments)
                results.extend(task_results)
                
                # Update worker states and move completed tasks
                self._update_worker_states(assignments, task_results)
            else:
                # No ready tasks or available workers, wait briefly
                import asyncio
                await asyncio.sleep(1)
        
        return results
    
    def _find_ready_tasks(self) -> List[WorkerTask]:
        """Find tasks that have all dependencies satisfied"""
        
        ready_tasks = []
        completed_task_names = {task.name for task in self.completed_tasks.values()}
        
        for task in self.pending_tasks.values():
            if task.status == TaskStatus.PENDING:
                if task.dependencies.issubset(completed_task_names):
                    ready_tasks.append(task)
        
        # Sort by priority (higher priority first)
        ready_tasks.sort(key=lambda t: t.priority, reverse=True)
        
        return ready_tasks
    
    def _assign_tasks_to_workers(self, ready_tasks: List[WorkerTask]) -> Dict[str, WorkerTask]:
        """Assign ready tasks to available workers based on specialization"""
        
        assignments = {}
        available_workers = [w for w in self.workers.values() if not w.is_busy]
        
        for task in ready_tasks:
            if len(assignments) >= self.max_concurrent_tasks:
                break
                
            # Find best worker for this task
            best_worker = self._find_best_worker(task, available_workers)
            
            if best_worker:
                assignments[best_worker.worker_id] = task
                best_worker.is_busy = True
                best_worker.current_task = task.task_id
                task.assigned_worker = best_worker.worker_id
                task.status = TaskStatus.IN_PROGRESS
                
                # Remove from available workers for this round
                available_workers.remove(best_worker)
        
        return assignments
    
    def _find_best_worker(self, task: WorkerTask, available_workers: List[WorkerAgent]) -> Optional[WorkerAgent]:
        """Find the best worker for a specific task"""
        
        # Try to find worker with matching specialization
        for worker in available_workers:
            if worker.specialization in task.name or task.name in worker.specialization:
                return worker
        
        # Fall back to worker with highest success rate
        if available_workers:
            return max(available_workers, key=lambda w: w.success_rate)
        
        return None
    
    async def _execute_assigned_tasks(self, assignments: Dict[str, WorkerTask]) -> List[PatternResult]:
        """Execute tasks assigned to workers"""
        
        import asyncio
        
        async def execute_worker_task(worker_id: str, task: WorkerTask) -> PatternResult:
            try:
                # Stream task start
                if self.ws_streaming:
                    await self._stream_worker_task_start(worker_id, task)
                
                # Execute task with timeout
                result = await asyncio.wait_for(
                    self.llm_pattern.execute(task.messages, task.context),
                    timeout=task.estimated_duration
                )
                
                task.result = result
                task.status = TaskStatus.COMPLETED if result.success else TaskStatus.FAILED
                
                # Stream task completion
                if self.ws_streaming:
                    await self._stream_worker_task_complete(worker_id, task, result.success)
                
                return result
                
            except asyncio.TimeoutError:
                result = PatternResult.error_result(f"Task {task.name} timed out")
                task.result = result
                task.status = TaskStatus.FAILED
                
                if self.ws_streaming:
                    await self._stream_worker_task_timeout(worker_id, task)
                
                return result
                
            except Exception as e:
                result = PatternResult.error_result(f"Task {task.name} failed: {str(e)}")
                task.result = result
                task.status = TaskStatus.FAILED
                
                if self.ws_streaming:
                    await self._stream_worker_task_error(worker_id, task, str(e))
                
                return result
        
        # Execute all assigned tasks concurrently
        task_coroutines = [execute_worker_task(worker_id, task) for worker_id, task in assignments.items()]
        results = await asyncio.gather(*task_coroutines, return_exceptions=False)
        
        return results
    
    def _update_worker_states(self, assignments: Dict[str, WorkerTask], results: List[PatternResult]) -> None:
        """Update worker states and task tracking after execution"""
        
        for (worker_id, task), result in zip(assignments.items(), results):
            worker = self.workers[worker_id]
            
            # Update worker state
            worker.is_busy = False
            worker.current_task = None
            worker.completed_tasks += 1
            
            # Update success rate
            if result.success:
                worker.success_rate = (worker.success_rate * (worker.completed_tasks - 1) + 1.0) / worker.completed_tasks
            else:
                worker.success_rate = (worker.success_rate * (worker.completed_tasks - 1) + 0.0) / worker.completed_tasks
            
            # Move task from pending to completed
            if task.task_id in self.pending_tasks:
                del self.pending_tasks[task.task_id]
                self.completed_tasks[task.task_id] = task
    
    async def _synthesize_worker_results(self, results: List[PatternResult], context: Dict[str, Any]) -> PatternResult:
        """Orchestrator synthesizes results from all workers"""
        
        successful_results = [r for r in results if r.success]
        
        if not successful_results:
            return PatternResult.error_result("All worker tasks failed")
        
        synthesis_prompt = f"""
        As the Investigation Orchestrator, synthesize the results from specialist workers into a comprehensive analysis.
        
        Worker Results Summary:
        - Total workers: {len(results)}
        - Successful analyses: {len(successful_results)}
        - Failed analyses: {len(results) - len(successful_results)}
        
        Specialist Findings:
        """
        
        # Add each worker's findings
        for i, result in enumerate(successful_results):
            synthesis_prompt += f"\n{i+1}. {str(result.result)[:200]}..."
        
        synthesis_prompt += """
        
        Provide a synthesized analysis that:
        1. Integrates findings from all specialists
        2. Identifies key risk factors and patterns
        3. Resolves any conflicting assessments
        4. Provides an overall risk score and recommendation
        5. Suggests follow-up actions if needed
        
        Focus on creating a cohesive narrative that leverages the expertise of all specialists.
        """
        
        synthesis_messages = [SystemMessage(content=synthesis_prompt)]
        synthesis_result = await self.llm_pattern.execute(synthesis_messages, context)
        
        if synthesis_result.success:
            # Enhance result with worker metadata
            enhanced_result = {
                "orchestration_summary": synthesis_result.result,
                "worker_contributions": len(successful_results),
                "synthesis_confidence": synthesis_result.confidence_score,
                "individual_results": [r.result for r in successful_results],
                "worker_performance": {
                    worker.worker_id: {
                        "completed_tasks": worker.completed_tasks,
                        "success_rate": worker.success_rate,
                        "specialization": worker.specialization
                    }
                    for worker in self.workers.values()
                }
            }
            
            return PatternResult.success_result(
                result=enhanced_result,
                confidence=synthesis_result.confidence_score,
                reasoning=f"Orchestrated synthesis from {len(successful_results)} specialist workers"
            )
        else:
            # Fall back to simple aggregation if synthesis fails
            return PatternResult.success_result(
                result={
                    "aggregated_results": [r.result for r in successful_results],
                    "worker_count": len(successful_results),
                    "synthesis_failed": True
                },
                confidence=0.7,
                reasoning="Simple aggregation due to synthesis failure"
            )
    
    # WebSocket streaming methods
    async def _stream_orchestration_start(self, context: Dict[str, Any]) -> None:
        """Stream orchestration start event"""
        if self.ws_streaming:
            await self.ws_streaming.send_agent_thought({
                "type": "orchestration_start",
                "pattern": "orchestrator_workers",
                "worker_count": len(self.workers),
                "max_concurrent": self.max_concurrent_tasks,
                "message": f"Starting orchestration with {len(self.workers)} specialist workers",
                "context": context.get("investigation_id", "unknown")
            })
    
    async def _stream_task_assignment(self, tasks: List[WorkerTask], context: Dict[str, Any]) -> None:
        """Stream task assignment event"""
        if self.ws_streaming:
            await self.ws_streaming.send_agent_thought({
                "type": "task_assignment",
                "pattern": "orchestrator_workers",
                "total_tasks": len(tasks),
                "task_breakdown": [{"name": task.name, "priority": task.priority, "dependencies": list(task.dependencies)} for task in tasks],
                "message": f"Created {len(tasks)} specialist tasks with dependency resolution",
                "context": context.get("investigation_id", "unknown")
            })
    
    async def _stream_worker_task_start(self, worker_id: str, task: WorkerTask) -> None:
        """Stream worker task start"""
        if self.ws_streaming:
            worker_name = self.workers[worker_id].name
            await self.ws_streaming.send_agent_thought({
                "type": "worker_task_start",
                "pattern": "orchestrator_workers",
                "worker_id": worker_id,
                "worker_name": worker_name,
                "task_name": task.name,
                "task_priority": task.priority,
                "message": f"{worker_name} starting: {task.name}",
                "context": task.context.get("investigation_id", "unknown")
            })
    
    async def _stream_worker_task_complete(self, worker_id: str, task: WorkerTask, success: bool) -> None:
        """Stream worker task completion"""
        if self.ws_streaming:
            worker_name = self.workers[worker_id].name
            await self.ws_streaming.send_agent_thought({
                "type": "worker_task_complete", 
                "pattern": "orchestrator_workers",
                "worker_id": worker_id,
                "worker_name": worker_name,
                "task_name": task.name,
                "success": success,
                "message": f"{worker_name} {'completed' if success else 'failed'}: {task.name}",
                "context": task.context.get("investigation_id", "unknown")
            })
    
    async def _stream_worker_task_timeout(self, worker_id: str, task: WorkerTask) -> None:
        """Stream worker task timeout"""
        if self.ws_streaming:
            worker_name = self.workers[worker_id].name
            await self.ws_streaming.send_agent_thought({
                "type": "worker_task_timeout",
                "pattern": "orchestrator_workers",
                "worker_id": worker_id,
                "worker_name": worker_name,
                "task_name": task.name,
                "timeout_duration": task.estimated_duration,
                "message": f"{worker_name} timed out on: {task.name}",
                "context": task.context.get("investigation_id", "unknown")
            })
    
    async def _stream_worker_task_error(self, worker_id: str, task: WorkerTask, error_message: str) -> None:
        """Stream worker task error"""
        if self.ws_streaming:
            worker_name = self.workers[worker_id].name
            await self.ws_streaming.send_agent_thought({
                "type": "worker_task_error",
                "pattern": "orchestrator_workers",
                "worker_id": worker_id,
                "worker_name": worker_name,
                "task_name": task.name,
                "error": error_message,
                "message": f"{worker_name} error on {task.name}: {error_message}",
                "context": task.context.get("investigation_id", "unknown")
            })
    
    async def _stream_orchestration_complete(self, completed_tasks: int, success: bool, context: Dict[str, Any]) -> None:
        """Stream orchestration completion"""
        if self.ws_streaming:
            await self.ws_streaming.send_agent_thought({
                "type": "orchestration_complete",
                "pattern": "orchestrator_workers",
                "completed_tasks": completed_tasks,
                "total_workers": len(self.workers),
                "overall_success": success,
                "message": f"Orchestration complete: {completed_tasks} tasks with {len(self.workers)} workers",
                "context": context.get("investigation_id", "unknown")
            })
    
    async def _stream_error(self, error_message: str, context: Dict[str, Any]) -> None:
        """Stream error event"""
        if self.ws_streaming:
            await self.ws_streaming.send_agent_thought({
                "type": "error",
                "pattern": "orchestrator_workers",
                "message": f"Orchestration failed: {error_message}",
                "context": context.get("investigation_id", "unknown")
            })