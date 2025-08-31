"""
OpenAI RAG Pattern Implementation

Implements Retrieval-Augmented Generation for knowledge-enhanced fraud investigations.
"""

import logging
from typing import Any, Dict, List

from langchain_core.messages import BaseMessage

from ..base import OpenAIBasePattern, PatternResult, PatternMetrics, PatternType
from ...rag.rag_orchestrator import get_rag_orchestrator, RAGRequest
from .message_formatter import MessageFormatter
from .chat_completion_handler import ChatCompletionHandler
from .streaming_handler import StreamingHandler

logger = logging.getLogger(__name__)


class OpenAIRAGPattern(OpenAIBasePattern):
    """OpenAI RAG pattern for knowledge-enhanced fraud investigation."""
    
    def __init__(self, config, openai_config, tools=None, ws_streaming=None):
        """Initialize OpenAI RAG pattern"""
        super().__init__(config, openai_config, tools, ws_streaming)
        self._rag_orchestrator = get_rag_orchestrator()
        self._message_formatter = MessageFormatter(openai_config)
        self._chat_handler = None
        self._streaming_handler = None
        self._max_knowledge_chunks = openai_config.rag_retrieval_count
        logger.info("OpenAI RAG pattern initialized")
    
    async def execute_openai_pattern(self, messages: List[BaseMessage], context: Dict[str, Any]) -> PatternResult:
        """Execute RAG-enhanced fraud investigation workflow"""
        metrics = PatternMetrics(pattern_type=PatternType.OPENAI_RAG)
        
        try:
            await self._initialize_handlers()
            
            # Retrieve knowledge
            query = self._extract_query(messages)
            rag_request = self._create_rag_request(query, context)
            knowledge_response = await self._rag_orchestrator.process_request(rag_request)
            
            if knowledge_response.success:
                # Enhance with knowledge
                enhanced_messages = await self._augment_messages(messages, knowledge_response)
                metrics.function_calls += len(knowledge_response.retrieved_chunks)
                
                # Generate response
                if self.openai_config.stream and self.ws_streaming:
                    result = await self._generate_streaming(enhanced_messages, context, knowledge_response)
                else:
                    result = await self._generate_standard(enhanced_messages, context, knowledge_response)
                return result
            else:
                return await self._fallback_standard(messages, context)
                
        except Exception as e:
            logger.error(f"RAG pattern failed: {e}")
            return PatternResult.error_result(f"RAG pattern failed: {str(e)}")
    
    async def _initialize_handlers(self):
        """Initialize handlers if needed"""
        if not self._chat_handler:
            self._chat_handler = ChatCompletionHandler(self._openai_client, self.openai_config)
        if not self._streaming_handler and self.ws_streaming:
            self._streaming_handler = StreamingHandler(self._openai_client, self.ws_streaming)
    
    def _extract_query(self, messages: List[BaseMessage]) -> str:
        """Extract investigation query from messages"""
        if not messages:
            return "fraud investigation analysis"
        user_messages = [msg for msg in messages if hasattr(msg, 'type') and msg.type == 'human']
        return user_messages[-1].content if user_messages else messages[-1].content
    
    def _create_rag_request(self, query: str, context: Dict[str, Any]) -> RAGRequest:
        """Create RAG request with investigation context"""
        return RAGRequest(
            query=query,
            context=context,
            investigation_id=context.get("investigation_id", "unknown"),
            entity_id=context.get("entity_id"),
            entity_type=context.get("entity_type"),
            investigation_type=context.get("investigation_type", "fraud_analysis"),
            max_retrieved_chunks=self._max_knowledge_chunks,
            similarity_threshold=0.6,
            required_tags={"fraud", "investigation", "analysis"},
            temperature=self.openai_config.temperature,
            include_sources=True
        )
    
    async def _augment_messages(self, messages: List[BaseMessage], knowledge_response) -> List[BaseMessage]:
        """Augment messages with retrieved knowledge"""
        if not knowledge_response.retrieved_chunks:
            return messages
        
        # Create knowledge context
        context_parts = ["=== FRAUD INTELLIGENCE ==="]
        for i, chunk in enumerate(knowledge_response.retrieved_chunks[:5], 1):
            content = chunk.content[:150] + "..." if len(chunk.content) > 150 else chunk.content
            context_parts.append(f"[Source {i}] {content}")
        context_parts.append("=== END INTELLIGENCE ===")
        
        knowledge_context = "\n".join(context_parts)
        return self._message_formatter.enhance_with_knowledge_context(
            messages, knowledge_context, knowledge_response.source_documents
        )
    
    async def _generate_streaming(self, messages, context, knowledge_response) -> PatternResult:
        """Generate streaming response with knowledge enhancement"""
        try:
            result = await self._streaming_handler.stream_chat_completion(
                messages=messages,
                context=context,
                investigation_id=context.get("investigation_id", "unknown"),
                model=self.openai_config.model,
                temperature=self.openai_config.temperature
            )
            
            enhanced_result = self._enhance_result(result["response"], knowledge_response)
            return PatternResult.success_result(
                result=enhanced_result,
                confidence=min(0.95, knowledge_response.confidence_score + 0.1),
                reasoning="RAG-enhanced streaming analysis"
            )
        except Exception as e:
            return PatternResult.error_result(f"RAG streaming failed: {str(e)}")
    
    async def _generate_standard(self, messages, context, knowledge_response) -> PatternResult:
        """Generate standard response with knowledge enhancement"""
        try:
            result = await self._chat_handler.create_chat_completion(
                messages=messages,
                model=self.openai_config.model,
                temperature=self.openai_config.temperature,
                max_tokens=self.openai_config.max_tokens
            )
            
            enhanced_result = self._enhance_result(result, knowledge_response)
            return PatternResult.success_result(
                result=enhanced_result,
                confidence=min(0.95, knowledge_response.confidence_score + 0.1),
                reasoning="RAG-enhanced analysis with fraud intelligence"
            )
        except Exception as e:
            return PatternResult.error_result(f"RAG generation failed: {str(e)}")
    
    def _enhance_result(self, ai_response: str, knowledge_response) -> Dict[str, Any]:
        """Enhance AI response with knowledge metadata"""
        return {
            "response": ai_response,
            "knowledge_enhanced": True,
            "retrieved_chunks": len(knowledge_response.retrieved_chunks),
            "knowledge_confidence": knowledge_response.confidence_score,
            "source_documents": knowledge_response.source_documents,
            "processing_time": knowledge_response.processing_time_seconds,
            "pattern_type": "openai_rag"
        }
    
    async def _fallback_standard(self, messages, context) -> PatternResult:
        """Fallback to standard pattern when RAG fails"""
        logger.info("Falling back to standard pattern")
        try:
            await self._initialize_handlers()
            result = await self._chat_handler.create_chat_completion(
                messages=messages,
                model=self.openai_config.model,
                temperature=self.openai_config.temperature
            )
            return PatternResult.success_result(
                result={
                    "response": result,
                    "knowledge_enhanced": False,
                    "pattern_type": "openai_rag_fallback"
                },
                confidence=0.7,
                reasoning="Standard analysis (RAG unavailable)"
            )
        except Exception as e:
            return PatternResult.error_result(f"RAG fallback failed: {str(e)}")