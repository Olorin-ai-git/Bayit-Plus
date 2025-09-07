"""
Mock LLM for Testing with Real Response Integration
====================================================

This module provides a mock LLM that returns REAL LLM responses captured from
live investigations. This enables accurate testing without API costs.

Key Features:
- Uses actual Claude/GPT responses with real tool calls
- Maintains response quality while saving API costs
- Automatically selects appropriate response based on context
- Falls back to generated responses when no real data available

ONLY ACTIVATED when TEST_MODE=mock environment variable is set.

Updated: 2025-09-07 - Integrated real LLM response database
"""

import os
import json
import asyncio
from typing import Any, List, Optional, Dict, Union
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage
from langchain_core.language_models import BaseChatModel
from langchain_core.outputs import ChatResult, ChatGeneration
from langchain_core.callbacks import CallbackManagerForLLMRun, AsyncCallbackManagerForLLMRun
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class MockLLM(BaseChatModel):
    """
    Mock LLM for testing that returns realistic fraud detection responses.
    
    This mock LLM:
    1. Extracts the domain from the prompt
    2. Gets the entity risk score from context
    3. Generates appropriate mock responses using mock_llm_responses
    4. Returns responses that follow the expected format
    """
    
    model: str = "mock-llm"  # Pydantic field
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        logger.warning("="*80)
        logger.warning("🚨🚨🚨 MOCK LLM INITIALIZED - NOT USING REAL AI/LLM 🚨🚨🚨")
        logger.warning("    This is for TESTING ONLY - no actual LLM reasoning")
        logger.warning("    To use REAL LLM: unset TEST_MODE=mock environment variable")
        logger.warning("="*80)
    
    @property
    def _llm_type(self) -> str:
        """Return identifier of this LLM."""
        return "mock"
    
    def _generate(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Optional[CallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> ChatResult:
        """Generate mock response synchronously."""
        # Convert to async and run
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(
                self._agenerate(messages, stop, run_manager, **kwargs)
            )
            return result
        finally:
            loop.close()
    
    async def _agenerate(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Optional[AsyncCallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> ChatResult:
        """Generate mock response using REAL LLM responses when available."""
        
        # Extract domain and context from messages
        domain = self._extract_domain(messages)
        entity_risk_score = self._extract_entity_risk_score(messages, kwargs)
        investigation_id = self._extract_investigation_id(messages, kwargs)
        scenario = self._extract_scenario(messages, kwargs)
        entity_id = self._extract_entity_id(messages, kwargs) or "117.22.69.113"
        
        # First try to use REAL LLM responses
        try:
            from app.service.agent.real_llm_responses import get_real_response
            from app.service.agent.tool_name_mapper import update_tool_calls
            
            if domain:
                logger.warning(f"🎯 MockLLM: Attempting to use REAL LLM response for domain: {domain}")
                real_response = get_real_response(domain, entity_id, entity_risk_score or 0.5)
                
                if real_response and "content" in real_response:
                    # Map tool names to match registry
                    tool_calls = real_response.get("tool_calls", [])
                    if tool_calls:
                        # Update tool names to match what's available in registry
                        tool_calls = update_tool_calls(tool_calls, reverse=False)
                    
                    # Create message with real content and mapped tool calls
                    message = AIMessage(
                        content=real_response["content"],
                        additional_kwargs={
                            "tool_calls": tool_calls
                        } if tool_calls else {}
                    )
                    logger.warning(f"✅ Using REAL LLM response with {len(tool_calls)} tool calls")
                    logger.warning(f"📊 Real response risk score: {real_response.get('risk_score', 'N/A')}")
                    generation = ChatGeneration(message=message)
                    return ChatResult(generations=[generation])
        except Exception as e:
            logger.debug(f"Could not get real LLM response: {e}")
        
        # Fallback to generated mock responses
        logger.warning(f"🎭 MockLLM generating response for domain: {domain}")
        if entity_risk_score:
            logger.warning(f"📊 Using entity risk score: {entity_risk_score:.4f}")
        
        # Import here to avoid circular dependency
        from scripts.testing.mock_llm_responses import generate_mock_response
        
        # Generate appropriate mock response
        mock_response = generate_mock_response(
            agent_type=domain,
            scenario=scenario or "default",
            investigation_id=investigation_id or "mock-investigation",
            entity_risk_score=entity_risk_score
        )
        
        # Create AIMessage with the mock response
        message = AIMessage(content=mock_response)
        generation = ChatGeneration(message=message)
        
        return ChatResult(generations=[generation])
    
    def _extract_domain(self, messages: List[BaseMessage]) -> str:
        """Extract the domain from the messages."""
        for message in messages:
            content = message.content.lower() if hasattr(message, 'content') else str(message).lower()
            
            if 'network' in content:
                return 'network'
            elif 'device' in content:
                return 'device'
            elif 'location' in content:
                return 'location'
            elif 'logs' in content or 'log' in content:
                return 'logs'
            elif 'risk' in content:
                return 'risk'
        
        return 'unknown'
    
    def _extract_entity_risk_score(self, messages: List[BaseMessage], kwargs: Dict) -> Optional[float]:
        """Extract the entity risk score from context."""
        # Check kwargs config for entity data
        config = kwargs.get('config', {})
        configurable = config.get('configurable', {})
        agent_context = configurable.get('agent_context')
        
        if agent_context and hasattr(agent_context, 'metadata'):
            metadata = agent_context.metadata
            if hasattr(metadata, 'additional_metadata'):
                # Look for Snowflake risk score
                risk_score = metadata.additional_metadata.get('entity_risk_score')
                if risk_score:
                    return float(risk_score)
        
        # Check messages for risk score mentions
        for message in messages:
            if hasattr(message, 'content'):
                content = str(message.content)
                # Look for patterns like "IP: 117.22.69.113" which has 0.99 risk
                if '117.22.69.113' in content:
                    return 0.99  # Known high-risk IP from Snowflake
                elif '135.15.248.115' in content:
                    return 0.99
                elif '127.140.134.131' in content:
                    return 0.99
        
        return None
    
    def _extract_investigation_id(self, messages: List[BaseMessage], kwargs: Dict) -> Optional[str]:
        """Extract investigation ID from context."""
        config = kwargs.get('config', {})
        configurable = config.get('configurable', {})
        agent_context = configurable.get('agent_context')
        
        if agent_context and hasattr(agent_context, 'metadata'):
            metadata = agent_context.metadata
            if hasattr(metadata, 'additional_metadata'):
                return metadata.additional_metadata.get('investigation_id')
        
        return None
    
    def _extract_scenario(self, messages: List[BaseMessage], kwargs: Dict) -> Optional[str]:
        """Extract scenario from context."""
        config = kwargs.get('config', {})
        configurable = config.get('configurable', {})
        agent_context = configurable.get('agent_context')
        
        if agent_context and hasattr(agent_context, 'metadata'):
            metadata = agent_context.metadata
            if hasattr(metadata, 'additional_metadata'):
                return metadata.additional_metadata.get('scenario')
        
        return None
    
    def _extract_entity_id(self, messages: List[BaseMessage], kwargs: Dict) -> Optional[str]:
        """Extract entity ID (IP address, device ID, etc.) from context."""
        # Check kwargs config for entity data
        config = kwargs.get('config', {})
        configurable = config.get('configurable', {})
        agent_context = configurable.get('agent_context')
        
        if agent_context and hasattr(agent_context, 'metadata'):
            metadata = agent_context.metadata
            if hasattr(metadata, 'additional_metadata'):
                # Look for entity_id or ip_address
                entity_id = metadata.additional_metadata.get('entity_id')
                if entity_id:
                    return entity_id
                # Also check for ip_address field
                ip_address = metadata.additional_metadata.get('ip_address')
                if ip_address:
                    return ip_address
        
        # Check messages for entity mentions
        for message in messages:
            if hasattr(message, 'content'):
                content = str(message.content)
                # Look for IP addresses in content
                import re
                ip_pattern = r'\b(?:\d{1,3}\.){3}\d{1,3}\b'
                ip_matches = re.findall(ip_pattern, content)
                if ip_matches:
                    return ip_matches[0]  # Return first IP found
                
                # Look for explicit entity_id mentions
                if 'entity_id:' in content.lower():
                    parts = content.lower().split('entity_id:')
                    if len(parts) > 1:
                        entity_part = parts[1].strip().split()[0]
                        return entity_part
        
        return None
    
    def bind_tools(self, tools: List[Any], **kwargs) -> 'MockLLM':
        """Bind tools to the mock LLM (no-op for mock)."""
        logger.info(f"MockLLM: Binding {len(tools)} tools (mock - tools not actually used)")
        return self
    
    async def ainvoke(self, input: Union[str, List[BaseMessage]], config: Optional[Dict] = None, **kwargs) -> AIMessage:
        """Async invoke for compatibility."""
        if isinstance(input, str):
            messages = [HumanMessage(content=input)]
        else:
            messages = input
        
        # Merge config into kwargs
        if config:
            kwargs['config'] = config
        
        result = await self._agenerate(messages, **kwargs)
        return result.generations[0].message


def get_mock_llm():
    """Get or create the mock LLM instance."""
    return MockLLM()