"""
OpenAI Message Formatter

Handles conversion of LangChain messages to OpenAI API format
with fraud detection optimization.
"""

from typing import Any, Dict, List

from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class MessageFormatter:
    """Formats messages for OpenAI Function Calling pattern"""
    
    def __init__(self, openai_config):
        self.openai_config = openai_config
    
    def convert_messages_to_openai_format(
        self, 
        messages: List[BaseMessage], 
        context: Dict[str, Any]
    ) -> List[Dict[str, str]]:
        """Convert LangChain messages to OpenAI API format"""
        
        openai_messages = []
        
        # Add fraud detection system prompt
        system_prompt = self._get_fraud_detection_system_prompt(context)
        openai_messages.append({"role": "system", "content": system_prompt})
        
        # Convert LangChain messages
        for message in messages:
            if isinstance(message, HumanMessage):
                openai_messages.append({"role": "user", "content": message.content})
            elif isinstance(message, SystemMessage):
                # Merge with existing system message or create new one
                if openai_messages[0]["role"] == "system":
                    openai_messages[0]["content"] += f"\n\n{message.content}"
                else:
                    openai_messages.insert(0, {"role": "system", "content": message.content})
        
        return openai_messages
    
    def _get_fraud_detection_system_prompt(self, context: Dict[str, Any]) -> str:
        """Generate fraud detection optimized system prompt"""
        investigation_id = context.get("investigation_id", "unknown")
        
        return f"""You are a fraud detection specialist analyzing investigation {investigation_id}.

Use the available tools to gather evidence and assess fraud risk:
- Splunk SIEM queries for security event analysis
- SumoLogic queries for application and infrastructure logs  
- Knowledge base retrieval for fraud patterns and procedures

Provide structured analysis with:
1. Risk Assessment (LOW/MEDIUM/HIGH)
2. Key Evidence Points
3. Confidence Score (0-100%)
4. Recommended Actions

Call functions as needed to gather comprehensive fraud intelligence."""
    
    def prepare_function_calling_params(
        self, 
        function_definitions: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Prepare function calling parameters for OpenAI API"""
        
        params = {
            "model": self.openai_config.model,
            "temperature": self.openai_config.temperature,
            "max_tokens": self.openai_config.max_tokens,
            "top_p": self.openai_config.top_p,
            "frequency_penalty": self.openai_config.frequency_penalty,
            "presence_penalty": self.openai_config.presence_penalty,
        }
        
        # Add function calling configuration
        if function_definitions:
            params["tools"] = [
                {"type": "function", "function": func_def} 
                for func_def in function_definitions
            ]
            params["tool_choice"] = self.openai_config.function_calling
            if hasattr(self.openai_config, 'parallel_tool_calls'):
                params["parallel_tool_calls"] = self.openai_config.parallel_tool_calls
        
        # Add streaming if enabled
        if self.openai_config.stream:
            params["stream"] = True
            if self.openai_config.stream_options:
                params["stream_options"] = self.openai_config.stream_options
        
        return params