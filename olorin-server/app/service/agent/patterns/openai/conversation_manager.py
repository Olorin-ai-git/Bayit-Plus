"""
OpenAI Conversation Manager

Handles conversation history management, context preservation, and memory optimization
for the OpenAI Conversation Pattern.
"""

from typing import Any, Dict, List
from datetime import datetime, timedelta

from langchain_core.messages import BaseMessage, HumanMessage
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class ConversationManager:
    """Manages conversation history and context for OpenAI patterns"""
    
    def __init__(self, max_history_size: int = 50, max_context_age_hours: int = 24):
        """Initialize conversation manager with memory limits"""
        self._conversation_history: Dict[str, List[Dict[str, Any]]] = {}
        self._context_cache: Dict[str, Dict[str, Any]] = {}
        self.max_history_size = max_history_size
        self.max_context_age_hours = max_context_age_hours
    
    async def manage_history(self, investigation_id: str, new_messages: List[BaseMessage]) -> None:
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
        if len(history) > self.max_history_size:
            # Keep most recent messages and summarize older ones
            recent_messages = history[-self.max_history_size:]
            older_messages = history[:-self.max_history_size]
            
            # Create summary of older messages for context preservation
            if older_messages:
                summary = await self._summarize_history(older_messages)
                recent_messages.insert(0, {
                    "role": "system",
                    "content": f"Previous conversation summary: {summary}",
                    "timestamp": datetime.now().isoformat()
                })
            
            self._conversation_history[investigation_id] = recent_messages
            logger.debug(f"Applied sliding window to conversation {investigation_id}")
    
    async def enrich_context(self, investigation_id: str, context: Dict[str, Any]) -> Dict[str, Any]:
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
            
            if datetime.now() - cached_time < timedelta(hours=self.max_context_age_hours):
                # Merge cached fraud investigation context
                for key in ["risk_factors", "evidence_points", "investigation_notes"]:
                    if key in cached_context:
                        enriched_context[key] = cached_context[key]
        
        return enriched_context
    
    async def inject_history(
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
    
    async def store_response(self, investigation_id: str, response: str) -> None:
        """Store assistant response in conversation history"""
        
        if investigation_id not in self._conversation_history:
            self._conversation_history[investigation_id] = []
        
        self._conversation_history[investigation_id].append({
            "role": "assistant",
            "content": response,
            "timestamp": datetime.now().isoformat()
        })
    
    def update_context_cache(self, investigation_id: str, context: Dict[str, Any]) -> None:
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
    
    async def get_history(self, investigation_id: str) -> List[Dict[str, Any]]:
        """Get conversation history for investigation"""
        return self._conversation_history.get(investigation_id, []).copy()
    
    async def clear_history(self, investigation_id: str) -> None:
        """Clear conversation history for investigation"""
        if investigation_id in self._conversation_history:
            del self._conversation_history[investigation_id]
        if investigation_id in self._context_cache:
            del self._context_cache[investigation_id]
        logger.info(f"Cleared conversation history for investigation {investigation_id}")
    
    def cleanup(self) -> None:
        """Clean up conversation manager resources"""
        self._conversation_history.clear()
        self._context_cache.clear()
    
    async def _summarize_history(self, messages: List[Dict[str, Any]]) -> str:
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