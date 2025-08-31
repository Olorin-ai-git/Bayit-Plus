"""
OpenAI Conversation Pattern Implementation

This pattern provides multi-turn conversation management with context preservation
for fraud investigation workflows. Features conversation history, memory optimization,
and context continuity across investigation sessions.
"""

import logging
from typing import Any, Dict, List

from langchain_core.messages import BaseMessage

from ..base import OpenAIBasePattern, PatternResult, PatternMetrics, PatternType
from .tool_converter import convert_langgraph_tools_to_openai_functions
from .streaming_handler import StreamingHandler
from .chat_completion_handler import ChatCompletionHandler
from .message_formatter import MessageFormatter
from .conversation_manager import ConversationManager

logger = logging.getLogger(__name__)


class OpenAIConversationPattern(OpenAIBasePattern):
    """
    Multi-turn conversation pattern for fraud investigation with context preservation.
    
    Ideal for:
    - Complex fraud investigations requiring multiple interaction rounds
    - Context-aware conversations with investigation history
    - Long-term investigation tracking and memory management
    - Interactive fraud analysis workflows
    """
    
    def __init__(self, config, openai_config, tools=None, ws_streaming=None):
        """Initialize OpenAI Conversation pattern with memory management"""
        super().__init__(config, openai_config, tools, ws_streaming)
        
        # Initialize conversation manager with memory limits from config
        max_history = getattr(openai_config, 'conversation_memory_limit', 50)
        self._conversation_manager = ConversationManager(max_history_size=max_history)
        
        # Core components
        self._function_definitions: List[Dict[str, Any]] = []
        self._streaming_handler: StreamingHandler = None
        self._completion_handler: ChatCompletionHandler = None
        self._message_formatter: MessageFormatter = None
        
        # Prepare function definitions from existing tools
        if self.tools:
            self._function_definitions = convert_langgraph_tools_to_openai_functions(self.tools)
            logger.info(f"Conversation pattern initialized with {len(self._function_definitions)} tools")
    
    async def execute_openai_pattern(
        self,
        messages: List[BaseMessage],
        context: Dict[str, Any]
    ) -> PatternResult:
        """Execute OpenAI Conversation pattern with history management"""
        
        metrics = PatternMetrics(pattern_type=PatternType.OPENAI_CONVERSATION)
        investigation_id = context.get("investigation_id", "default")
        
        try:
            # Initialize handlers and OpenAI client
            await self._ensure_openai_client()
            await self._initialize_handlers()
            
            # Manage conversation history with sliding window
            await self._conversation_manager.manage_history(investigation_id, messages)
            
            # Prepare enriched context with conversation history
            enriched_context = await self._conversation_manager.enrich_context(investigation_id, context)
            
            # Prepare messages including conversation history
            openai_messages = self._message_formatter.convert_messages_to_openai_format(
                messages, enriched_context
            )
            
            # Inject conversation history into messages
            openai_messages = await self._conversation_manager.inject_history(
                investigation_id, openai_messages
            )
            
            # Prepare function calling parameters
            function_calling_params = self._message_formatter.prepare_function_calling_params(
                self._function_definitions
            )
            
            # Execute chat completion with conversation context
            completion_result = await self._completion_handler.execute_completion(
                openai_messages, 
                function_calling_params,
                enriched_context
            )
            
            if completion_result["success"]:
                # Store assistant response in conversation history
                await self._conversation_manager.store_response(
                    investigation_id, completion_result["result"]
                )
                
                # Update context cache
                self._conversation_manager.update_context_cache(investigation_id, enriched_context)
                
                # Update metrics
                self._update_openai_metrics(
                    metrics,
                    function_calls=completion_result.get("function_calls", 0),
                    streaming_chunks=completion_result.get("streaming_chunks", 0),
                    cost_cents=completion_result.get("cost_cents", 0.0)
                )
                
                return PatternResult.success_result(
                    result=completion_result["result"],
                    confidence=0.95,
                    reasoning=f"Conversation pattern completed for investigation {investigation_id}"
                )
            else:
                return PatternResult.error_result(
                    error_message=completion_result.get("error", "Conversation execution failed")
                )
                
        except Exception as e:
            logger.error(f"OpenAI Conversation pattern execution failed: {e}")
            return PatternResult.error_result(
                error_message=f"Conversation pattern failed: {str(e)}"
            )
    
    
    async def _initialize_handlers(self):
        """Initialize all required handlers"""
        if not self._streaming_handler:
            self._streaming_handler = StreamingHandler(self._openai_client, self.ws_streaming)
        
        if not self._completion_handler:
            self._completion_handler = ChatCompletionHandler(
                self._openai_client, 
                self.tools, 
                self._streaming_handler
            )
        
        if not self._message_formatter:
            self._message_formatter = MessageFormatter(self.openai_config)
    
    async def get_conversation_history(self, investigation_id: str) -> List[Dict[str, Any]]:
        """Get conversation history for investigation"""
        return await self._conversation_manager.get_history(investigation_id)
    
    async def clear_conversation_history(self, investigation_id: str) -> None:
        """Clear conversation history for investigation"""
        await self._conversation_manager.clear_history(investigation_id)
    
    async def cleanup(self) -> None:
        """Clean up conversation pattern resources"""
        self._conversation_manager.cleanup()
        logger.info("OpenAI Conversation pattern cleaned up")