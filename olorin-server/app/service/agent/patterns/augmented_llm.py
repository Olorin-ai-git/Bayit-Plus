"""
Augmented LLM Pattern

Base building block that enhances LLM with tool integration, memory context,
retrieval augmentation, and reasoning streaming via WebSocket.
"""

from typing import Any, Dict, List

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

from .base import BasePattern, PatternResult
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class AugmentedLLMPattern(BasePattern):
    """
    Augmented LLM Pattern implementation.
    
    Enhances basic LLM with:
    - Tool integration and function calling
    - Memory context management 
    - Retrieval augmentation capabilities
    - Real-time reasoning streaming
    """
    
    def __init__(self, config, tools=None, ws_streaming=None):
        """Initialize the Augmented LLM pattern"""
        super().__init__(config, tools, ws_streaming)
        
        # Initialize LLM with configuration
        self.llm = self._initialize_llm()
        
        # Bind tools to LLM if available
        if self.tools:
            self.llm_with_tools = self.llm.bind_tools(self.tools)
        else:
            self.llm_with_tools = self.llm
    
    def _initialize_llm(self) -> ChatOpenAI:
        """Initialize the ChatOpenAI instance with proper configuration"""
        from app.service.config import get_settings_for_env
        
        settings = get_settings_for_env()
        
        return ChatOpenAI(
            api_key="anything",  # Placeholder for local LLM
            model="gpt-4o-mini",  # Cheaper alternative to gpt-4
            base_url=settings.llm_base_url,
            temperature=0.1,  # Low temperature for consistent, deterministic results
            max_completion_tokens=4000,
            timeout=60,  # Longer timeout for complex reasoning
        )
    
    async def execute(self, messages: List[BaseMessage], context: Dict[str, Any]) -> PatternResult:
        """Execute the Augmented LLM pattern"""
        
        try:
            # Stream reasoning start event if WebSocket available
            if self.ws_streaming:
                await self._stream_reasoning_start(context)
            
            # Augment messages with context and memory
            augmented_messages = await self._augment_messages(messages, context)
            
            # Execute LLM with tools
            response = await self._execute_llm_with_tools(augmented_messages, context)
            
            # Process tool calls if present
            if hasattr(response, 'tool_calls') and response.tool_calls:
                response = await self._process_tool_calls(response, augmented_messages, context)
            
            # Stream reasoning completion if WebSocket available
            if self.ws_streaming:
                await self._stream_reasoning_complete(response, context)
            
            # Calculate confidence based on response quality
            confidence = self._calculate_confidence(response, context)
            
            return PatternResult.success_result(
                result=response,
                confidence=confidence,
                reasoning=self._extract_reasoning(response)
            )
            
        except Exception as e:
            logger.error(f"Augmented LLM execution failed: {str(e)}", exc_info=True)
            
            if self.ws_streaming:
                await self._stream_error(str(e), context)
            
            return PatternResult.error_result(
                error_message=f"Augmented LLM execution failed: {str(e)}"
            )
    
    async def _augment_messages(self, messages: List[BaseMessage], context: Dict[str, Any]) -> List[BaseMessage]:
        """Augment messages with context, memory, and retrieval information"""
        
        augmented_messages = []
        
        # Add system context message
        system_context = await self._build_system_context(context)
        if system_context:
            augmented_messages.append(SystemMessage(content=system_context))
        
        # Add memory context if available
        memory_context = await self._retrieve_memory_context(context)
        if memory_context:
            augmented_messages.append(SystemMessage(content=f"Previous context: {memory_context}"))
        
        # Add retrieval augmentation if applicable
        if self._should_use_retrieval(context):
            retrieval_context = await self._retrieve_relevant_information(messages, context)
            if retrieval_context:
                augmented_messages.append(SystemMessage(content=f"Relevant information: {retrieval_context}"))
        
        # Add original messages
        augmented_messages.extend(messages)
        
        return augmented_messages
    
    async def _build_system_context(self, context: Dict[str, Any]) -> str:
        """Build system context from execution context"""
        
        context_parts = []
        
        # Add investigation context
        if "investigation_id" in context:
            context_parts.append(f"Investigation ID: {context['investigation_id']}")
        
        if "entity_id" in context:
            context_parts.append(f"Entity under investigation: {context['entity_id']}")
        
        if "entity_type" in context:
            context_parts.append(f"Entity type: {context['entity_type']}")
        
        # Add available tools context
        if self.tools:
            tool_names = [getattr(tool, 'name', str(tool.__class__.__name__)) for tool in self.tools]
            context_parts.append(f"Available tools: {', '.join(tool_names)}")
        
        # Add role-based context
        role_context = self._get_role_context(context)
        if role_context:
            context_parts.append(role_context)
        
        return "\n".join(context_parts) if context_parts else ""
    
    def _get_role_context(self, context: Dict[str, Any]) -> str:
        """Get role-specific context for the investigation"""
        
        # Default fraud investigator context
        return """
        You are an expert fraud investigator with access to advanced analytical tools.
        Your role is to:
        1. Analyze suspicious activities and patterns
        2. Use available tools to gather comprehensive evidence
        3. Provide clear, actionable insights based on findings
        4. Maintain objectivity and follow proper investigation protocols
        5. Document your reasoning process for audit purposes
        """
    
    async def _retrieve_memory_context(self, context: Dict[str, Any]) -> str:
        """Retrieve relevant memory context from previous interactions"""
        
        # Placeholder for memory retrieval implementation
        # This would integrate with Redis/database to get conversation history
        
        investigation_id = context.get("investigation_id")
        if not investigation_id:
            return ""
        
        # TODO: Implement actual memory retrieval from persistent storage
        return ""
    
    def _should_use_retrieval(self, context: Dict[str, Any]) -> bool:
        """Determine if retrieval augmentation should be used"""
        
        # Use retrieval for complex investigations or when explicitly requested
        entity_type = context.get("entity_type", "")
        complex_types = ["user", "device", "network", "transaction"]
        
        return entity_type in complex_types or context.get("use_retrieval", False)
    
    async def _retrieve_relevant_information(self, messages: List[BaseMessage], context: Dict[str, Any]) -> str:
        """Retrieve relevant information to augment the LLM context"""
        
        # Extract key terms from messages for retrieval
        query_terms = self._extract_query_terms(messages)
        
        # TODO: Implement actual retrieval from knowledge base/vector store
        # This would integrate with vector search tools
        
        return ""
    
    def _extract_query_terms(self, messages: List[BaseMessage]) -> List[str]:
        """Extract key terms from messages for retrieval queries"""
        
        terms = []
        for message in messages:
            if isinstance(message, HumanMessage):
                # Simple keyword extraction - could be enhanced with NLP
                content = message.content.lower()
                
                # Extract common fraud investigation terms
                fraud_terms = ["fraud", "suspicious", "anomaly", "risk", "transaction", 
                              "device", "location", "network", "account", "behavior"]
                
                terms.extend([term for term in fraud_terms if term in content])
        
        return list(set(terms))
    
    async def _execute_llm_with_tools(self, messages: List[BaseMessage], context: Dict[str, Any]) -> AIMessage:
        """Execute LLM with tool binding"""
        
        # Stream thinking process if WebSocket available
        if self.ws_streaming:
            await self._stream_thinking_process(messages, context)
        
        # Execute LLM
        response = await self.llm_with_tools.ainvoke(messages)
        
        return response
    
    async def _process_tool_calls(self, response: AIMessage, messages: List[BaseMessage], context: Dict[str, Any]) -> AIMessage:
        """Process tool calls and integrate results"""
        
        tool_messages = []
        
        for tool_call in response.tool_calls:
            try:
                # Stream tool execution if WebSocket available
                if self.ws_streaming:
                    await self._stream_tool_execution(tool_call, context)
                
                # Find and execute the tool
                tool_result = await self._execute_tool(tool_call, context)
                tool_messages.append(tool_result)
                
            except Exception as e:
                logger.error(f"Tool execution failed: {str(e)}")
                tool_messages.append({
                    "role": "tool",
                    "name": tool_call.get("name", "unknown"),
                    "content": f"Tool execution failed: {str(e)}"
                })
        
        if tool_messages:
            # Add tool results to message chain and re-invoke LLM
            extended_messages = messages + [response] + tool_messages
            response = await self.llm.ainvoke(extended_messages)
        
        return response
    
    async def _execute_tool(self, tool_call: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a specific tool call"""
        
        tool_name = tool_call.get("name")
        tool_args = tool_call.get("args", {})
        
        # Find the tool by name
        for tool in self.tools:
            if getattr(tool, 'name', None) == tool_name:
                try:
                    result = await tool.ainvoke(tool_args)
                    return {
                        "role": "tool",
                        "name": tool_name,
                        "content": str(result)
                    }
                except Exception as e:
                    raise Exception(f"Tool {tool_name} execution failed: {str(e)}")
        
        raise Exception(f"Tool {tool_name} not found")
    
    def _calculate_confidence(self, response: AIMessage, context: Dict[str, Any]) -> float:
        """Calculate confidence score based on response quality"""
        
        confidence = 0.5  # Base confidence
        
        # Increase confidence for responses with tool usage
        if hasattr(response, 'tool_calls') and response.tool_calls:
            confidence += 0.2
        
        # Increase confidence for longer, more detailed responses
        if len(response.content) > 500:
            confidence += 0.1
        
        # Increase confidence for structured responses
        if any(keyword in response.content.lower() for keyword in 
               ["analysis", "conclusion", "recommendation", "evidence"]):
            confidence += 0.2
        
        return min(confidence, 1.0)
    
    def _extract_reasoning(self, response: AIMessage) -> str:
        """Extract reasoning explanation from the response"""
        
        # Look for reasoning patterns in the response
        content = response.content
        
        reasoning_indicators = ["because", "therefore", "analysis shows", "evidence suggests", 
                              "based on", "reasoning:", "conclusion:"]
        
        for indicator in reasoning_indicators:
            if indicator in content.lower():
                # Extract the sentence containing reasoning
                sentences = content.split('. ')
                for sentence in sentences:
                    if indicator in sentence.lower():
                        return sentence.strip()
        
        # Return first part of response as reasoning if no specific patterns found
        return content[:200] + "..." if len(content) > 200 else content
    
    # WebSocket streaming methods
    async def _stream_reasoning_start(self, context: Dict[str, Any]) -> None:
        """Stream reasoning start event"""
        if not isinstance(self.ws_streaming, WebSocketStreamingService):
            return
        
        await self.ws_streaming.send_agent_thought({
            "type": "reasoning_start",
            "pattern": "augmented_llm",
            "message": "Starting enhanced analysis with tool integration...",
            "context": context.get("investigation_id", "unknown")
        })
    
    async def _stream_thinking_process(self, messages: List[BaseMessage], context: Dict[str, Any]) -> None:
        """Stream thinking process"""
        if not isinstance(self.ws_streaming, WebSocketStreamingService):
            return
        
        await self.ws_streaming.send_agent_thought({
            "type": "thinking",
            "pattern": "augmented_llm", 
            "message": f"Processing {len(messages)} messages with {len(self.tools)} available tools...",
            "context": context.get("investigation_id", "unknown")
        })
    
    async def _stream_tool_execution(self, tool_call: Dict[str, Any], context: Dict[str, Any]) -> None:
        """Stream tool execution event"""
        if not isinstance(self.ws_streaming, WebSocketStreamingService):
            return
        
        await self.ws_streaming.send_tool_execution({
            "type": "tool_execution",
            "tool_name": tool_call.get("name", "unknown"),
            "args": tool_call.get("args", {}),
            "context": context.get("investigation_id", "unknown")
        })
    
    async def _stream_reasoning_complete(self, response: AIMessage, context: Dict[str, Any]) -> None:
        """Stream reasoning completion event"""
        if not isinstance(self.ws_streaming, WebSocketStreamingService):
            return
        
        await self.ws_streaming.send_agent_thought({
            "type": "reasoning_complete",
            "pattern": "augmented_llm",
            "message": "Analysis complete with enhanced insights",
            "result_length": len(response.content),
            "tools_used": len(getattr(response, 'tool_calls', [])),
            "context": context.get("investigation_id", "unknown")
        })
    
    async def _stream_error(self, error_message: str, context: Dict[str, Any]) -> None:
        """Stream error event"""
        if not isinstance(self.ws_streaming, WebSocketStreamingService):
            return
        
        await self.ws_streaming.send_agent_thought({
            "type": "error",
            "pattern": "augmented_llm",
            "message": f"Analysis failed: {error_message}",
            "context": context.get("investigation_id", "unknown")
        })