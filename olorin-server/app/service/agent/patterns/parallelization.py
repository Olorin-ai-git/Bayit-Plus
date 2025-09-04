"""
Parallelization Pattern

Concurrent task execution with sectioning and voting strategies.
Enables parallel processing of independent investigation tasks.
"""

import asyncio
from typing import Any, Dict, List, Optional
from dataclasses import dataclass

from langchain_core.messages import BaseMessage

from .augmented_llm import AugmentedLLMPattern
from .base import BasePattern, PatternResult
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


@dataclass
class ParallelTask:
    """Represents a task that can be executed in parallel"""
    
    task_id: str
    name: str
    messages: List[BaseMessage]
    context: Dict[str, Any]
    priority: int = 1
    timeout_seconds: int = 60
    result: Optional[PatternResult] = None
    start_time: Optional[float] = None
    end_time: Optional[float] = None


class ParallelizationPattern(BasePattern):
    """
    Parallelization Pattern implementation.
    
    Provides:
    - Concurrent task execution
    - Sectioning strategies for breaking down complex tasks
    - Voting mechanisms for result aggregation
    - Load balancing across available resources
    """
    
    def __init__(self, config, tools=None, ws_streaming=None):
        """Initialize the Parallelization pattern"""
        super().__init__(config, tools, ws_streaming)
        
        # Initialize underlying LLM pattern for individual tasks
        self.llm_pattern = AugmentedLLMPattern(config, tools, ws_streaming)
        
        # Configure parallelization settings
        self.max_parallel_tasks = config.custom_params.get("max_parallel_tasks", 5)
        self.task_timeout = config.custom_params.get("task_timeout_seconds", 60)
        self.voting_strategy = config.custom_params.get("voting_strategy", "majority")
        self.sectioning_strategy = config.custom_params.get("sectioning_strategy", "domain_based")
    
    async def execute(self, messages: List[BaseMessage], context: Dict[str, Any]) -> PatternResult:
        """Execute the Parallelization pattern"""
        
        try:
            # Stream parallelization start
            if self.ws_streaming:
                await self._stream_parallel_start(context)
            
            # Determine parallelization strategy based on context
            strategy = context.get("parallel_strategy", self.sectioning_strategy)
            
            # Section the task into parallel subtasks
            parallel_tasks = await self._create_parallel_tasks(messages, context, strategy)
            
            if not parallel_tasks:
                # Fall back to sequential execution
                return await self.llm_pattern.execute(messages, context)
            
            # Stream task creation
            if self.ws_streaming:
                await self._stream_tasks_created(parallel_tasks, context)
            
            # Execute tasks in parallel
            results = await self._execute_parallel_tasks(parallel_tasks)
            
            # Aggregate results using voting strategy
            final_result = await self._aggregate_results(results, parallel_tasks, context)
            
            # Stream completion
            if self.ws_streaming:
                await self._stream_parallel_complete(len(results), final_result.success, context)
            
            return final_result
            
        except Exception as e:
            logger.error(f"Parallelization pattern execution failed: {str(e)}", exc_info=True)
            
            if self.ws_streaming:
                await self._stream_error(str(e), context)
            
            return PatternResult.error_result(f"Parallel execution failed: {str(e)}")
    
    async def _create_parallel_tasks(
        self, 
        messages: List[BaseMessage], 
        context: Dict[str, Any], 
        strategy: str
    ) -> List[ParallelTask]:
        """Create parallel tasks based on sectioning strategy"""
        
        if strategy == "domain_based":
            return await self._create_domain_based_tasks(messages, context)
        elif strategy == "aspect_based":
            return await self._create_aspect_based_tasks(messages, context)
        elif strategy == "voting_based":
            return await self._create_voting_tasks(messages, context)
        elif strategy == "tool_based":
            return await self._create_tool_based_tasks(messages, context)
        else:
            logger.warning(f"Unknown sectioning strategy: {strategy}")
            return []
    
    async def _create_domain_based_tasks(
        self, 
        messages: List[BaseMessage], 
        context: Dict[str, Any]
    ) -> List[ParallelTask]:
        """Create tasks based on fraud investigation domains"""
        
        domains = {
            "device": "Analyze device-related fraud indicators and behavioral patterns",
            "location": "Examine geographic patterns and location-based risk factors", 
            "network": "Investigate network security and connection anomalies",
            "behavioral": "Assess user behavior patterns and deviation indicators",
            "temporal": "Analyze time-based patterns and temporal anomalies"
        }
        
        tasks = []
        
        for domain, description in domains.items():
            task_context = context.copy()
            task_context.update({
                "domain_focus": domain,
                "analysis_type": "domain_specific",
                "parallel_task": True
            })
            
            # Create domain-specific messages
            domain_messages = messages + [
                BaseMessage(content=f"Focus specifically on {description} for entity {context.get('entity_id', 'unknown')}")
            ]
            
            task = ParallelTask(
                task_id=f"domain_{domain}",
                name=f"Domain Analysis: {domain.title()}",
                messages=domain_messages,
                context=task_context,
                priority=2 if domain in ["device", "behavioral"] else 1
            )
            
            tasks.append(task)
        
        return tasks
    
    async def _create_aspect_based_tasks(
        self, 
        messages: List[BaseMessage], 
        context: Dict[str, Any]
    ) -> List[ParallelTask]:
        """Create tasks based on investigation aspects"""
        
        aspects = {
            "risk_assessment": "Calculate comprehensive risk scores and threat levels",
            "pattern_detection": "Identify suspicious patterns and behavioral anomalies",
            "correlation_analysis": "Find correlations with known fraud indicators", 
            "timeline_analysis": "Analyze temporal sequences and timing patterns",
            "context_evaluation": "Evaluate contextual factors and environmental indicators"
        }
        
        tasks = []
        
        for aspect, description in aspects.items():
            task_context = context.copy()
            task_context.update({
                "aspect_focus": aspect,
                "analysis_type": "aspect_specific",
                "parallel_task": True
            })
            
            aspect_messages = messages + [
                BaseMessage(content=f"{description} for the current investigation case.")
            ]
            
            task = ParallelTask(
                task_id=f"aspect_{aspect}",
                name=f"Aspect Analysis: {aspect.replace('_', ' ').title()}",
                messages=aspect_messages,
                context=task_context,
                priority=3 if aspect == "risk_assessment" else 2
            )
            
            tasks.append(task)
        
        return tasks
    
    async def _create_voting_tasks(
        self, 
        messages: List[BaseMessage], 
        context: Dict[str, Any]
    ) -> List[ParallelTask]:
        """Create multiple tasks for voting-based consensus"""
        
        voting_approaches = {
            "conservative": "Take a conservative approach, emphasizing caution and thorough verification",
            "aggressive": "Take an aggressive stance, prioritizing detection of subtle fraud indicators",
            "balanced": "Maintain a balanced perspective, weighing all evidence objectively",
            "statistical": "Focus on statistical analysis and quantitative risk indicators",
            "contextual": "Emphasize contextual analysis and qualitative assessment"
        }
        
        tasks = []
        
        for approach, instruction in voting_approaches.items():
            task_context = context.copy()
            task_context.update({
                "voting_approach": approach,
                "analysis_type": "voting_consensus",
                "parallel_task": True
            })
            
            voting_messages = messages + [
                BaseMessage(content=f"Investigation instruction: {instruction}. Provide your analysis and conclusion.")
            ]
            
            task = ParallelTask(
                task_id=f"vote_{approach}",
                name=f"Voting Analysis: {approach.title()}",
                messages=voting_messages,
                context=task_context,
                priority=2
            )
            
            tasks.append(task)
        
        return tasks
    
    async def _create_tool_based_tasks(
        self, 
        messages: List[BaseMessage], 
        context: Dict[str, Any]
    ) -> List[ParallelTask]:
        """Create tasks based on available tools"""
        
        if not self.tools:
            return []
        
        tasks = []
        
        # Group tools by category
        tool_categories = self._categorize_tools()
        
        for category, category_tools in tool_categories.items():
            if not category_tools:
                continue
            
            task_context = context.copy()
            task_context.update({
                "tool_category": category,
                "assigned_tools": [tool.name for tool in category_tools if hasattr(tool, 'name')],
                "analysis_type": "tool_specific",
                "parallel_task": True
            })
            
            tool_messages = messages + [
                BaseMessage(content=f"Use {category} tools to analyze the investigation case thoroughly.")
            ]
            
            task = ParallelTask(
                task_id=f"tool_{category}",
                name=f"Tool Analysis: {category.title()}",
                messages=tool_messages,
                context=task_context,
                priority=1,
                timeout_seconds=90  # Longer timeout for tool-based tasks
            )
            
            # Assign specific tools to the LLM pattern for this task
            task_llm_pattern = AugmentedLLMPattern(self.config, category_tools, self.ws_streaming)
            setattr(task, '_llm_pattern', task_llm_pattern)
            
            tasks.append(task)
        
        return tasks
    
    def _categorize_tools(self) -> Dict[str, List[Any]]:
        """Categorize tools by their functionality"""
        
        categories = {
            "search": [],
            "analysis": [],
            "data_retrieval": [],
            "security": []
        }
        
        for tool in self.tools:
            tool_name = getattr(tool, 'name', str(tool.__class__.__name__)).lower()
            
            if any(keyword in tool_name for keyword in ['search', 'vector', 'retriever']):
                categories["search"].append(tool)
            elif any(keyword in tool_name for keyword in ['splunk', 'query', 'database']):
                categories["data_retrieval"].append(tool)
            elif any(keyword in tool_name for keyword in ['oii', 'security', 'cdc']):
                categories["security"].append(tool)
            else:
                categories["analysis"].append(tool)
        
        # Remove empty categories
        return {k: v for k, v in categories.items() if v}
    
    async def _execute_parallel_tasks(self, tasks: List[ParallelTask]) -> List[PatternResult]:
        """Execute tasks in parallel with concurrency control"""
        
        semaphore = asyncio.Semaphore(self.max_parallel_tasks)
        results = []
        
        async def execute_single_task(task: ParallelTask) -> PatternResult:
            async with semaphore:
                try:
                    # Stream task start
                    if self.ws_streaming:
                        await self._stream_task_start(task)
                    
                    task.start_time = asyncio.get_event_loop().time()
                    
                    # Use custom LLM pattern if assigned, otherwise use default
                    llm_pattern = getattr(task, '_llm_pattern', self.llm_pattern)
                    
                    # Execute with timeout
                    result = await asyncio.wait_for(
                        llm_pattern.execute(task.messages, task.context),
                        timeout=task.timeout_seconds
                    )
                    
                    task.end_time = asyncio.get_event_loop().time()
                    task.result = result
                    
                    # Stream task completion
                    if self.ws_streaming:
                        await self._stream_task_complete(task, result.success)
                    
                    return result
                    
                except asyncio.TimeoutError:
                    task.end_time = asyncio.get_event_loop().time()
                    result = PatternResult.error_result(f"Task {task.name} timed out after {task.timeout_seconds}s")
                    task.result = result
                    
                    if self.ws_streaming:
                        await self._stream_task_timeout(task)
                    
                    return result
                    
                except Exception as e:
                    task.end_time = asyncio.get_event_loop().time()
                    result = PatternResult.error_result(f"Task {task.name} failed: {str(e)}")
                    task.result = result
                    
                    if self.ws_streaming:
                        await self._stream_task_error(task, str(e))
                    
                    return result
        
        # Execute all tasks concurrently
        task_coroutines = [execute_single_task(task) for task in tasks]
        results = await asyncio.gather(*task_coroutines, return_exceptions=False)
        
        return results
    
    async def _aggregate_results(
        self, 
        results: List[PatternResult], 
        tasks: List[ParallelTask],
        context: Dict[str, Any]
    ) -> PatternResult:
        """Aggregate results using the specified voting strategy"""
        
        successful_results = [r for r in results if r.success]
        
        if not successful_results:
            return PatternResult.error_result("All parallel tasks failed")
        
        if self.voting_strategy == "majority":
            return await self._majority_voting(successful_results, tasks, context)
        elif self.voting_strategy == "weighted":
            return await self._weighted_voting(successful_results, tasks, context)
        elif self.voting_strategy == "consensus":
            return await self._consensus_voting(successful_results, tasks, context)
        elif self.voting_strategy == "best_confidence":
            return await self._best_confidence_voting(successful_results, tasks, context)
        else:
            # Default to simple aggregation
            return await self._simple_aggregation(successful_results, tasks, context)
    
    async def _majority_voting(
        self, 
        results: List[PatternResult], 
        tasks: List[ParallelTask],
        context: Dict[str, Any]
    ) -> PatternResult:
        """Aggregate results using majority voting"""
        
        # For fraud investigation, combine insights from majority of successful analyses
        aggregated_insights = []
        confidence_scores = []
        
        for result in results:
            if result.success:
                aggregated_insights.append(str(result.result))
                confidence_scores.append(result.confidence_score)
        
        # Calculate weighted average confidence
        avg_confidence = sum(confidence_scores) / len(confidence_scores) if confidence_scores else 0.0
        
        # Combine insights
        combined_result = {
            "aggregation_method": "majority_voting",
            "successful_tasks": len(results),
            "insights": aggregated_insights,
            "average_confidence": avg_confidence,
            "task_summary": [{"task": task.name, "success": task.result.success if task.result else False} 
                           for task in tasks]
        }
        
        return PatternResult.success_result(
            result=combined_result,
            confidence=avg_confidence,
            reasoning=f"Majority voting from {len(results)} successful parallel analyses"
        )
    
    async def _weighted_voting(
        self, 
        results: List[PatternResult], 
        tasks: List[ParallelTask],
        context: Dict[str, Any]
    ) -> PatternResult:
        """Aggregate results using weighted voting based on task priority and confidence"""
        
        weighted_results = []
        total_weight = 0
        
        for i, result in enumerate(results):
            if result.success and i < len(tasks):
                task = tasks[i]
                weight = task.priority * result.confidence_score
                weighted_results.append({
                    "result": result.result,
                    "weight": weight,
                    "task": task.name
                })
                total_weight += weight
        
        if total_weight == 0:
            return PatternResult.error_result("No weighted results available")
        
        # Calculate weighted average confidence
        weighted_confidence = sum(r["weight"] for r in weighted_results) / total_weight
        
        combined_result = {
            "aggregation_method": "weighted_voting", 
            "total_weight": total_weight,
            "weighted_results": weighted_results,
            "weighted_confidence": weighted_confidence
        }
        
        return PatternResult.success_result(
            result=combined_result,
            confidence=weighted_confidence,
            reasoning=f"Weighted voting from {len(weighted_results)} results with total weight {total_weight:.2f}"
        )
    
    async def _consensus_voting(
        self, 
        results: List[PatternResult], 
        tasks: List[ParallelTask],
        context: Dict[str, Any]
    ) -> PatternResult:
        """Find consensus among results"""
        
        # Look for common themes and conclusions across results
        all_content = [str(result.result).lower() for result in results if result.success]
        
        # Simple consensus detection based on common keywords
        common_keywords = self._find_common_keywords(all_content)
        consensus_strength = len(common_keywords) / max(len(all_content), 1)
        
        combined_result = {
            "aggregation_method": "consensus_voting",
            "consensus_keywords": common_keywords,
            "consensus_strength": consensus_strength,
            "participating_results": len(results),
            "full_results": [result.result for result in results if result.success]
        }
        
        avg_confidence = sum(r.confidence_score for r in results) / len(results)
        final_confidence = avg_confidence * consensus_strength  # Adjust by consensus strength
        
        return PatternResult.success_result(
            result=combined_result,
            confidence=final_confidence,
            reasoning=f"Consensus from {len(results)} results with {consensus_strength:.2f} agreement strength"
        )
    
    async def _best_confidence_voting(
        self, 
        results: List[PatternResult], 
        tasks: List[ParallelTask],
        context: Dict[str, Any]
    ) -> PatternResult:
        """Select result with highest confidence score"""
        
        best_result = max(results, key=lambda r: r.confidence_score)
        best_task_index = results.index(best_result)
        best_task = tasks[best_task_index] if best_task_index < len(tasks) else None
        
        combined_result = {
            "aggregation_method": "best_confidence",
            "selected_result": best_result.result,
            "selected_confidence": best_result.confidence_score,
            "selected_task": best_task.name if best_task else "unknown",
            "all_confidences": [r.confidence_score for r in results],
            "alternative_results": [r.result for r in results if r != best_result]
        }
        
        return PatternResult.success_result(
            result=combined_result,
            confidence=best_result.confidence_score,
            reasoning=f"Best confidence result from {best_task.name if best_task else 'unknown task'}"
        )
    
    async def _simple_aggregation(
        self, 
        results: List[PatternResult], 
        tasks: List[ParallelTask],
        context: Dict[str, Any]
    ) -> PatternResult:
        """Simple aggregation of all successful results"""
        
        combined_result = {
            "aggregation_method": "simple_aggregation",
            "results": [result.result for result in results],
            "confidences": [result.confidence_score for result in results],
            "task_names": [task.name for task in tasks if task.result and task.result.success]
        }
        
        avg_confidence = sum(r.confidence_score for r in results) / len(results)
        
        return PatternResult.success_result(
            result=combined_result,
            confidence=avg_confidence,
            reasoning=f"Simple aggregation of {len(results)} successful parallel results"
        )
    
    def _find_common_keywords(self, content_list: List[str]) -> List[str]:
        """Find keywords that appear in multiple results"""
        
        fraud_keywords = [
            "suspicious", "anomaly", "risk", "fraud", "unusual", "pattern",
            "high", "low", "medium", "score", "behavior", "deviation"
        ]
        
        common_keywords = []
        threshold = len(content_list) / 2  # Must appear in at least half the results
        
        for keyword in fraud_keywords:
            appearances = sum(1 for content in content_list if keyword in content)
            if appearances >= threshold:
                common_keywords.append(keyword)
        
        return common_keywords
    
    # WebSocket streaming methods
    async def _stream_parallel_start(self, context: Dict[str, Any]) -> None:
        """Stream parallelization start event"""
        if self.ws_streaming:
            await self.ws_streaming.send_agent_thought({
                "type": "parallel_start",
                "pattern": "parallelization",
                "max_concurrent": self.max_parallel_tasks,
                "message": f"Starting parallel execution with max {self.max_parallel_tasks} concurrent tasks",
                "context": context.get("investigation_id", "unknown")
            })
    
    async def _stream_tasks_created(self, tasks: List[ParallelTask], context: Dict[str, Any]) -> None:
        """Stream task creation event"""
        if self.ws_streaming:
            await self.ws_streaming.send_agent_thought({
                "type": "tasks_created",
                "pattern": "parallelization", 
                "task_count": len(tasks),
                "task_names": [task.name for task in tasks],
                "message": f"Created {len(tasks)} parallel tasks",
                "context": context.get("investigation_id", "unknown")
            })
    
    async def _stream_task_start(self, task: ParallelTask) -> None:
        """Stream individual task start"""
        if self.ws_streaming:
            await self.ws_streaming.send_agent_thought({
                "type": "task_start",
                "pattern": "parallelization",
                "task_id": task.task_id,
                "task_name": task.name,
                "priority": task.priority,
                "message": f"Starting task: {task.name}",
                "context": task.context.get("investigation_id", "unknown")
            })
    
    async def _stream_task_complete(self, task: ParallelTask, success: bool) -> None:
        """Stream task completion"""
        if self.ws_streaming:
            duration = (task.end_time - task.start_time) if task.start_time and task.end_time else 0
            await self.ws_streaming.send_agent_thought({
                "type": "task_complete",
                "pattern": "parallelization",
                "task_id": task.task_id,
                "task_name": task.name,
                "success": success,
                "duration_seconds": duration,
                "message": f"Task {task.name} {'completed' if success else 'failed'}",
                "context": task.context.get("investigation_id", "unknown")
            })
    
    async def _stream_task_timeout(self, task: ParallelTask) -> None:
        """Stream task timeout event"""
        if self.ws_streaming:
            await self.ws_streaming.send_agent_thought({
                "type": "task_timeout",
                "pattern": "parallelization",
                "task_id": task.task_id,
                "task_name": task.name,
                "timeout_seconds": task.timeout_seconds,
                "message": f"Task {task.name} timed out after {task.timeout_seconds}s",
                "context": task.context.get("investigation_id", "unknown")
            })
    
    async def _stream_task_error(self, task: ParallelTask, error_message: str) -> None:
        """Stream task error event"""
        if self.ws_streaming:
            await self.ws_streaming.send_agent_thought({
                "type": "task_error",
                "pattern": "parallelization",
                "task_id": task.task_id,
                "task_name": task.name,
                "error": error_message,
                "message": f"Task {task.name} failed: {error_message}",
                "context": task.context.get("investigation_id", "unknown")
            })
    
    async def _stream_parallel_complete(self, successful_count: int, overall_success: bool, context: Dict[str, Any]) -> None:
        """Stream parallelization completion"""
        if self.ws_streaming:
            await self.ws_streaming.send_agent_thought({
                "type": "parallel_complete",
                "pattern": "parallelization",
                "successful_tasks": successful_count,
                "overall_success": overall_success,
                "voting_strategy": self.voting_strategy,
                "message": f"Parallel execution complete: {successful_count} successful tasks",
                "context": context.get("investigation_id", "unknown")
            })
    
    async def _stream_error(self, error_message: str, context: Dict[str, Any]) -> None:
        """Stream error event"""
        if self.ws_streaming:
            await self.ws_streaming.send_agent_thought({
                "type": "error",
                "pattern": "parallelization",
                "message": f"Parallel execution failed: {error_message}",
                "context": context.get("investigation_id", "unknown")
            })