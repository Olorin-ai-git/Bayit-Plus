"""
OpenAI Conversation Pattern Implementation

This pattern provides multi-turn conversation management with context preservation
for fraud investigation workflows. Features conversation history, memory optimization,
and context continuity across investigation sessions.
"""

import logging
from typing import Any, Dict, List, Optional
from datetime import datetime, timedelta

from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage

from ..base import OpenAIBasePattern, PatternResult, PatternMetrics, PatternType
from .tool_converter import convert_langgraph_tools_to_openai_functions
from .streaming_handler import StreamingHandler
from .chat_completion_handler import ChatCompletionHandler
from .message_formatter import MessageFormatter

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
        
        # Conversation history storage: investigation_id -> messages
        self._conversation_history: Dict[str, List[Dict[str, Any]]] = {}
        self._context_cache: Dict[str, Dict[str, Any]] = {}
        self._max_history_size = 50  # Prevent memory issues
        self._max_context_age_hours = 24  # Context expiration
        
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
            await self._manage_conversation_history(investigation_id, messages)
            
            # Prepare enriched context with conversation history
            enriched_context = await self._enrich_context_with_history(investigation_id, context)
            
            # Prepare messages including conversation history
            openai_messages = self._message_formatter.convert_messages_to_openai_format(
                messages, enriched_context
            )
            
            # Inject conversation history into messages
            openai_messages = await self._inject_conversation_history(
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
                await self._store_assistant_response(
                    investigation_id, completion_result["result"]
                )
                
                # Update context cache
                self._update_context_cache(investigation_id, enriched_context)
                
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
    
    async def _manage_conversation_history(
        self, 
        investigation_id: str, 
        new_messages: List[BaseMessage]
    ) -> None:
        """Manage conversation history with sliding window optimization"""
        
        # Initialize history if not exists
        if investigation_id not in self._conversation_history:
            self._conversation_history[investigation_id] = []
        
        history = self._conversation_history[investigation_id]
        
        # Add new messages to history
        for message in new_messages:
            history.append({
                "role": "user" if isinstance(message, HumanMessage) else "system",
                "content": message.content,
                "timestamp": datetime.now().isoformat()
            })
        
        # Apply sliding window if history exceeds limit
        if len(history) > self._max_history_size:
            # Keep most recent messages and summarize older ones
            recent_messages = history[-self._max_history_size:]
            older_messages = history[:-self._max_history_size]
            
            # Create summary of older messages for context preservation
            if older_messages:
                summary = await self._summarize_conversation_history(older_messages)
                recent_messages.insert(0, {
                    "role": "system",
                    "content": f"Previous conversation summary: {summary}",
                    "timestamp": datetime.now().isoformat()
                })
            
            self._conversation_history[investigation_id] = recent_messages
            logger.debug(f"Applied sliding window to conversation {investigation_id}")
    
    async def _enrich_context_with_history(
        self, 
        investigation_id: str, 
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Enrich context with conversation metadata and preserved investigation context"""
        
        enriched_context = context.copy()
        enriched_context["conversation_id"] = investigation_id
        enriched_context["conversation_turn_count"] = len(
            self._conversation_history.get(investigation_id, [])
        )
        
        # Restore cached context if available and not expired
        if investigation_id in self._context_cache:
            cached_context = self._context_cache[investigation_id]
            cached_time = datetime.fromisoformat(cached_context.get("cached_at", "1970-01-01"))
            
            if datetime.now() - cached_time < timedelta(hours=self._max_context_age_hours):
                # Merge cached fraud investigation context
                for key in ["risk_factors", "evidence_points", "investigation_notes"]:
                    if key in cached_context:
                        enriched_context[key] = cached_context[key]
        
        return enriched_context
    
    async def _inject_conversation_history(
        self, 
        investigation_id: str, 
        openai_messages: List[Dict[str, str]]
    ) -> List[Dict[str, str]]:
        """Inject conversation history into OpenAI messages format"""
        
        history = self._conversation_history.get(investigation_id, [])
        if not history:
            return openai_messages
        
        # Insert conversation history after system prompt but before current user message
        system_messages = [msg for msg in openai_messages if msg["role"] == "system"]
        user_messages = [msg for msg in openai_messages if msg["role"] != "system"]
        
        # Convert history to OpenAI format (exclude current session messages)
        history_messages = []
        for hist_msg in history[:-len(user_messages)] if len(history) > len(user_messages) else []:
            if hist_msg["role"] in ["user", "assistant", "system"]:
                history_messages.append({
                    "role": hist_msg["role"],
                    "content": hist_msg["content"]
                })
        
        # Combine: system messages + conversation history + current user messages
        return system_messages + history_messages + user_messages
    
    async def _store_assistant_response(self, investigation_id: str, response: str) -> None:
        """Store assistant response in conversation history"""
        
        if investigation_id not in self._conversation_history:
            self._conversation_history[investigation_id] = []
        
        self._conversation_history[investigation_id].append({
            "role": "assistant",
            "content": response,
            "timestamp": datetime.now().isoformat()
        })
    
    def _update_context_cache(self, investigation_id: str, context: Dict[str, Any]) -> None:
        """Update context cache with fraud investigation metadata"""
        
        cache_entry = {
            "cached_at": datetime.now().isoformat(),
            "investigation_id": investigation_id,
        }
        
        # Preserve important fraud investigation context
        for key in ["risk_factors", "evidence_points", "investigation_notes", "fraud_indicators"]:
            if key in context:
                cache_entry[key] = context[key]
        
        self._context_cache[investigation_id] = cache_entry
    
    async def _summarize_conversation_history(self, messages: List[Dict[str, Any]]) -> str:
        """Summarize older conversation messages to preserve context efficiently"""
        
        # Simple summarization - in production, could use OpenAI for better summarization
        summary_parts = []
        user_messages = [m for m in messages if m["role"] == "user"]
        assistant_messages = [m for m in messages if m["role"] == "assistant"]
        
        if user_messages:
            summary_parts.append(f"User made {len(user_messages)} queries")
        if assistant_messages:
            summary_parts.append(f"Assistant provided {len(assistant_messages)} responses")
        
        return "; ".join(summary_parts) if summary_parts else "No previous conversation"
    
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
        return self._conversation_history.get(investigation_id, []).copy()
    
    async def clear_conversation_history(self, investigation_id: str) -> None:
        """Clear conversation history for investigation"""
        if investigation_id in self._conversation_history:
            del self._conversation_history[investigation_id]
        if investigation_id in self._context_cache:
            del self._context_cache[investigation_id]
        logger.info(f"Cleared conversation history for investigation {investigation_id}")
    
    async def cleanup(self) -> None:
        """Clean up conversation pattern resources"""
        self._conversation_history.clear()
        self._context_cache.clear()
        logger.info("OpenAI Conversation pattern cleaned up")