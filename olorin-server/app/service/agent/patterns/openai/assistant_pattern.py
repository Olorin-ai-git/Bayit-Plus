"""
OpenAI Assistant Pattern Implementation

This pattern integrates OpenAI Assistant API with the existing sophisticated
Olorin fraud detection system, providing cutting-edge AI agent capabilities
while maintaining compatibility with existing tools and workflows.
"""

from typing import Any, Dict, List

from langchain_core.messages import BaseMessage

from ..base import OpenAIBasePattern, PatternResult, PatternMetrics, PatternType
from .assistant_manager import AssistantManager
from .run_executor import RunExecutor
from .tool_adapter import convert_langgraph_tools_to_openai_functions
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class OpenAIAssistantPattern(OpenAIBasePattern):
    """
    OpenAI Assistant-based pattern for fraud investigation.
    
    Integrates OpenAI Assistant API with existing fraud detection tools,
    providing streaming responses and sophisticated investigation capabilities.
    """
    
    def __init__(self, config, openai_config, tools=None, ws_streaming=None):
        """Initialize OpenAI Assistant pattern"""
        super().__init__(config, openai_config, tools, ws_streaming)
        self._assistant_manager = None
        self._run_executor = None
        self._function_definitions: List[Dict[str, Any]] = []
        
        # Prepare function definitions from existing tools
        if self.tools:
            self._function_definitions = convert_langgraph_tools_to_openai_functions(self.tools)
            logger.info(f"Converted {len(self._function_definitions)} tools to OpenAI functions")
    
    async def execute_openai_pattern(
        self,
        messages: List[BaseMessage],
        context: Dict[str, Any]
    ) -> PatternResult:
        """Execute OpenAI Assistant pattern for fraud investigation"""
        
        metrics = PatternMetrics(pattern_type=PatternType.OPENAI_ASSISTANT)
        
        try:
            # Ensure we have an OpenAI client and initialize managers
            await self._ensure_openai_client()
            await self._initialize_managers()
            
            # Create or get assistant optimized for fraud detection
            assistant = await self._assistant_manager.get_or_create_fraud_assistant(
                self._function_definitions
            )
            metrics.openai_assistant_id = assistant.id
            
            # Create or get thread for conversation continuity
            thread = await self._assistant_manager.get_or_create_thread(context)
            
            # Add messages to thread and run assistant
            await self._run_executor.add_messages_to_thread(thread.id, messages)
            
            # Execute the assistant run with function calling
            run_result = await self._run_executor.run_assistant_with_streaming(
                thread.id, 
                assistant.id, 
                context.get("investigation_id", "unknown"),
                self.openai_config.stream
            )
            
            if run_result["success"]:
                # Update metrics with execution data
                self._update_openai_metrics(
                    metrics,
                    run_id=run_result.get("run_id"),
                    assistant_id=assistant.id,
                    function_calls=run_result.get("function_calls", 0),
                    streaming_chunks=run_result.get("streaming_chunks", 0)
                )
                
                return PatternResult.success_result(
                    result=run_result["result"],
                    confidence=0.9,
                    reasoning="OpenAI Assistant completed fraud investigation"
                )
            else:
                return PatternResult.error_result(
                    error_message=run_result.get("error", "Assistant execution failed")
                )
                
        except Exception as e:
            logger.error(f"OpenAI Assistant pattern execution failed: {e}")
            return PatternResult.error_result(
                error_message=f"Assistant pattern failed: {str(e)}"
            )
    
    async def _initialize_managers(self):
        """Initialize assistant manager and run executor"""
        if not self._assistant_manager:
            self._assistant_manager = AssistantManager(self._openai_client, self.openai_config)
        
        if not self._run_executor:
            self._run_executor = RunExecutor(self._openai_client, self.tools, self.ws_streaming)
    
    async def cleanup(self) -> None:
        """Clean up OpenAI resources"""
        if self._assistant_manager:
            self._assistant_manager.cleanup()
        
        logger.info("OpenAI Assistant pattern cleaned up")