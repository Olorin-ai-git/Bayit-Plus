"""
OpenAI Multi-Agent Pattern Implementation

This pattern implements multi-agent coordination for complex fraud investigations
requiring specialized domain experts working together with intelligent handoffs.
"""

import asyncio
from typing import Any, Dict, List

from langchain_core.messages import BaseMessage

from ..base import OpenAIBasePattern, PatternResult, PatternMetrics, PatternType
from .assistant_manager import AssistantManager
from .multi_agent_coordinator import MultiAgentCoordinator, HandoffManager
from .result_synthesizer import ResultSynthesizer
from .run_executor import RunExecutor
from .tool_adapter import convert_langgraph_tools_to_openai_functions
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class OpenAIMultiAgentPattern(OpenAIBasePattern):
    """
    Multi-agent coordination pattern for comprehensive fraud investigations.
    
    Orchestrates specialized domain agents with intelligent handoffs and result synthesis.
    """
    
    def __init__(self, config, openai_config, tools=None, ws_streaming=None):
        """Initialize multi-agent pattern"""
        super().__init__(config, openai_config, tools, ws_streaming)
        self._coordinator = None
        self._handoff_manager = None  
        self._synthesizer = None
        self._assistant_manager = None
        self._run_executor = None
        
        # Prepare function definitions
        self._function_definitions = []
        if self.tools:
            self._function_definitions = convert_langgraph_tools_to_openai_functions(self.tools)
    
    async def execute_openai_pattern(self, messages: List[BaseMessage], 
                                   context: Dict[str, Any]) -> PatternResult:
        """Execute multi-agent coordination workflow"""
        
        metrics = PatternMetrics(pattern_type=PatternType.OPENAI_MULTI_AGENT)
        
        try:
            await self._ensure_openai_client()
            await self._initialize_components()
            
            # Route investigation to appropriate agents
            required_agents = await self._coordinator.route_investigation(context)
            execution_strategy = await self._coordinator.determine_execution_strategy(required_agents, context)
            
            # Execute agents based on strategy
            if execution_strategy == "parallel":
                agent_results = await self._execute_parallel_agents(required_agents, messages, context)
            else:
                agent_results = await self._execute_sequential_agents(required_agents, messages, context)
            
            # Synthesize results
            synthesis = await self._synthesizer.synthesize_results(agent_results)
            
            # Update metrics
            metrics.function_calls = sum(r.get("function_calls", 0) for r in agent_results.values())
            
            return PatternResult.success_result(
                result=synthesis,
                confidence=synthesis.get("confidence_score", 0.0),
                reasoning=synthesis.get("investigation_summary", "Multi-agent investigation completed")
            )
            
        except Exception as e:
            logger.error(f"Multi-agent pattern execution failed: {e}")
            return PatternResult.error_result(error_message=f"Multi-agent coordination failed: {str(e)}")
    
    async def _execute_parallel_agents(self, agents: List[str], messages: List[BaseMessage], 
                                     context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute multiple agents in parallel"""
        tasks = []
        
        for agent in agents:
            task = self._execute_single_agent(agent, messages, context)
            tasks.append(task)
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Combine results
        agent_results = {}
        for i, agent in enumerate(agents):
            if isinstance(results[i], Exception):
                agent_results[agent] = {"success": False, "error": str(results[i])}
            else:
                agent_results[agent] = results[i]
        
        return agent_results
    
    async def _execute_sequential_agents(self, agents: List[str], messages: List[BaseMessage],
                                       context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute agents sequentially with handoffs"""
        agent_results = {}
        current_context = context.copy()
        
        for i, agent in enumerate(agents):
            # Create handoff context if not the first agent
            if i > 0:
                handoff_context = await self._handoff_manager.create_handoff_context(
                    agents[i-1], agent, current_context
                )
                current_context.update(handoff_context)
            
            # Execute agent
            result = await self._execute_single_agent(agent, messages, current_context)
            agent_results[agent] = result
            
            # Update context with findings for next agent
            if result.get("success") and result.get("findings"):
                current_context.setdefault("findings", {}).update({agent: result["findings"]})
        
        return agent_results
    
    async def _execute_single_agent(self, agent_type: str, messages: List[BaseMessage],
                                  context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a single domain agent"""
        try:
            agent_config = self._coordinator.domain_agents[agent_type]
            
            # Create specialized assistant for this agent type
            assistant = await self._assistant_manager.get_or_create_specialized_assistant(
                agent_type, agent_config, self._function_definitions
            )
            
            # Create thread and add messages
            thread = await self._assistant_manager.get_or_create_thread(context)
            await self._run_executor.add_messages_to_thread(thread.id, messages)
            
            # Execute assistant run
            run_result = await self._run_executor.run_assistant_with_streaming(
                thread.id, assistant.id,
                context.get("investigation_id", "unknown"), 
                self.openai_config.stream
            )
            
            return run_result
            
        except Exception as e:
            logger.error(f"Failed to execute {agent_type} agent: {e}")
            return {"success": False, "error": str(e)}
    
    async def _initialize_components(self):
        """Initialize multi-agent components"""
        if not self._coordinator:
            self._coordinator = MultiAgentCoordinator(self._openai_client, self.tools, self.ws_streaming)
        
        if not self._handoff_manager:
            self._handoff_manager = HandoffManager(self._openai_client)
        
        if not self._synthesizer:
            self._synthesizer = ResultSynthesizer()
        
        if not self._assistant_manager:
            self._assistant_manager = AssistantManager(self._openai_client, self.openai_config)
        
        if not self._run_executor:
            self._run_executor = RunExecutor(self._openai_client, self.tools, self.ws_streaming)
    
    async def cleanup(self) -> None:
        """Clean up multi-agent resources"""
        if self._assistant_manager:
            self._assistant_manager.cleanup()
        
        logger.info("Multi-agent pattern cleaned up")