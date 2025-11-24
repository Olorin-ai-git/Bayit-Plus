"""
RAG Orchestrator

Main orchestrator for Retrieval-Augmented Generation system, coordinating
knowledge retrieval, context augmentation, and enhanced LLM responses.
"""

import asyncio
import time
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional, Set, Union
import uuid

from .knowledge_base import KnowledgeBase, KnowledgeBaseConfig, DocumentChunk
from ..communication.ice_events import ICEEventBus, ICEEventType, get_event_bus
from app.service.logging import get_bridge_logger
from app.service.llm_manager import get_llm_manager
from langchain_core.messages import SystemMessage, HumanMessage

logger = get_bridge_logger(__name__)


@dataclass
class RAGRequest:
    """RAG system request"""
    
    request_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    query: str = ""
    context: Dict[str, Any] = field(default_factory=dict)
    
    # Investigation context
    investigation_id: str = ""
    entity_id: Optional[str] = None
    entity_type: Optional[str] = None
    investigation_type: Optional[str] = None
    
    # Retrieval parameters
    max_retrieved_chunks: int = 10
    similarity_threshold: float = 0.7
    required_tags: Set[str] = field(default_factory=set)
    
    # Generation parameters
    max_response_length: int = 1000
    temperature: float = 0.1  # Low temperature for consistent results
    include_sources: bool = True
    
    # Request metadata
    timestamp: datetime = field(default_factory=datetime.now)
    requested_by: str = "system"


@dataclass
class RAGResponse:
    """RAG system response"""
    
    request_id: str = ""
    response_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    
    # Generated content
    generated_text: str = ""
    confidence_score: float = 0.0
    
    # Retrieved knowledge
    retrieved_chunks: List[DocumentChunk] = field(default_factory=list)
    source_documents: List[str] = field(default_factory=list)
    
    # Processing metadata
    processing_time_seconds: float = 0.0
    timestamp: datetime = field(default_factory=datetime.now)
    
    # Quality metrics
    retrieval_quality_score: float = 0.0
    generation_quality_score: float = 0.0
    
    # Context information
    context_used: Dict[str, Any] = field(default_factory=dict)
    augmented_prompt: str = ""
    
    success: bool = True
    error_message: Optional[str] = None


@dataclass
class RAGMetrics:
    """RAG system performance metrics"""
    
    requests_processed: int = 0
    successful_responses: int = 0
    failed_responses: int = 0
    
    total_processing_time: float = 0.0
    avg_processing_time: float = 0.0
    avg_retrieval_time: float = 0.0
    avg_generation_time: float = 0.0
    
    total_chunks_retrieved: int = 0
    avg_chunks_per_request: float = 0.0
    avg_confidence_score: float = 0.0
    
    cache_hits: int = 0
    cache_misses: int = 0
    
    start_time: datetime = field(default_factory=datetime.now)


@dataclass
class RAGConfig:
    """RAG system configuration"""
    
    # Knowledge base settings
    knowledge_base_config: KnowledgeBaseConfig = field(default_factory=KnowledgeBaseConfig)
    
    # LLM settings
    llm_model: str = "gpt-3.5-turbo"
    llm_api_key: Optional[str] = None
    llm_base_url: Optional[str] = None
    
    # Processing settings
    max_concurrent_requests: int = 10
    request_timeout_seconds: int = 60
    
    # Caching settings
    enable_response_caching: bool = True
    cache_ttl_seconds: int = 1800  # 30 minutes
    max_cache_size: int = 1000
    
    # Quality settings
    min_confidence_threshold: float = 0.5
    enable_quality_filtering: bool = True
    
    # Advanced features
    enable_context_compression: bool = True
    enable_multi_turn_conversations: bool = True
    conversation_memory_size: int = 5


class RAGOrchestrator:
    """
    RAG (Retrieval-Augmented Generation) Orchestrator
    
    Features:
    - Knowledge retrieval from domain-specific knowledge base
    - Context augmentation and prompt engineering
    - LLM integration for enhanced generation
    - Multi-turn conversation support
    - Response caching and optimization
    - Quality assessment and filtering
    - Performance monitoring and analytics
    """
    
    def __init__(self, config: RAGConfig, event_bus: Optional[ICEEventBus] = None):
        """Initialize RAG orchestrator"""
        
        self.config = config
        self.event_bus = event_bus or get_event_bus()
        
        # Initialize knowledge base
        self.knowledge_base = KnowledgeBase(config.knowledge_base_config)
        
        # Response caching
        self.response_cache: Dict[str, tuple[RAGResponse, datetime]] = {}
        
        # Conversation memory
        self.conversation_memory: Dict[str, List[Dict[str, Any]]] = {}
        
        # Request tracking
        self.active_requests: Dict[str, RAGRequest] = {}
        self.request_semaphore = asyncio.Semaphore(config.max_concurrent_requests)
        
        # Metrics
        self.metrics = RAGMetrics()
        
        # Use explicit logger name to avoid undefined __name__ issues
        self.logger = get_bridge_logger("app.service.agent.rag.rag_orchestrator")
        
<<<<<<< HEAD
        # LLM client placeholder
        self.llm_client = None
=======
        # LLM client
        self.llm_manager = None
>>>>>>> 001-modify-analyzer-method
        self._initialize_llm_client()
    
    def _initialize_llm_client(self) -> None:
        """Initialize LLM client"""
        try:
            self.llm_manager = get_llm_manager()
            if self.llm_manager and self.llm_manager.selected_model:
                self.logger.info(f"Initialized LLM client: {self.config.llm_model}")
            else:
                self.logger.warning("LLM manager initialized but no model available - will use fallback")
        except Exception as e:
            self.logger.error(f"Failed to initialize LLM client: {str(e)}")
            self.llm_manager = None
    
    async def process_request(self, request: RAGRequest) -> RAGResponse:
        """Process RAG request"""
        
        start_time = time.time()
        
        try:
            # Check cache first
            if self.config.enable_response_caching:
                cached_response = self._get_cached_response(request)
                if cached_response:
                    self.metrics.cache_hits += 1
                    return cached_response
            
            self.metrics.cache_misses += 1
            
            # Acquire processing semaphore
            async with self.request_semaphore:
                # Track active request
                self.active_requests[request.request_id] = request
                
                try:
                    # Publish processing start event
                    await self.event_bus.publish(
                        ICEEventType.CUSTOM_EVENT,
                        {
                            'event_type': 'rag_processing_started',
                            'request_id': request.request_id,
                            'query': request.query[:100] + "..." if len(request.query) > 100 else request.query
                        },
                        investigation_id=request.investigation_id
                    )
                    
                    # Retrieve relevant knowledge
                    retrieval_start = time.time()
                    retrieved_chunks = await self._retrieve_knowledge(request)
                    retrieval_time = time.time() - retrieval_start
                    
                    # Generate augmented response
                    generation_start = time.time()
                    response = await self._generate_response(request, retrieved_chunks)
                    generation_time = time.time() - generation_start
                    
                    # Calculate processing time
                    total_processing_time = time.time() - start_time
                    response.processing_time_seconds = total_processing_time
                    
                    # Update metrics
                    self._update_metrics(total_processing_time, retrieval_time, generation_time, len(retrieved_chunks), response.confidence_score, True)
                    
                    # Cache response
                    if self.config.enable_response_caching:
                        self._cache_response(request, response)
                    
                    # Publish completion event
                    await self.event_bus.publish(
                        ICEEventType.CUSTOM_EVENT,
                        {
                            'event_type': 'rag_processing_completed',
                            'request_id': request.request_id,
                            'success': response.success,
                            'processing_time': total_processing_time,
                            'chunks_retrieved': len(retrieved_chunks)
                        },
                        investigation_id=request.investigation_id
                    )
                    
                    return response
                    
                finally:
                    # Clean up active request
                    self.active_requests.pop(request.request_id, None)
        
        except Exception as e:
            error_message = f"RAG processing failed: {str(e)}"
            self.logger.error(error_message)
            
            # Update metrics
            processing_time = time.time() - start_time
            self._update_metrics(processing_time, 0, 0, 0, 0, False)
            
            # Create error response
            response = RAGResponse(
                request_id=request.request_id,
                success=False,
                error_message=error_message,
                processing_time_seconds=processing_time
            )
            
            return response
    
    async def _retrieve_knowledge(self, request: RAGRequest) -> List[DocumentChunk]:
        """Retrieve relevant knowledge chunks"""
        
        try:
            # Search knowledge base
            chunks = await self.knowledge_base.search_chunks(
                query=request.query,
                max_results=request.max_retrieved_chunks,
                entity_type=request.entity_type,
                investigation_type=request.investigation_type,
                tags=request.required_tags,
                similarity_threshold=request.similarity_threshold
            )
            
            return chunks
            
        except Exception as e:
            self.logger.error(f"Knowledge retrieval failed: {str(e)}")
            return []
    
    async def _generate_response(self, request: RAGRequest, chunks: List[DocumentChunk]) -> RAGResponse:
        """Generate augmented response using retrieved knowledge"""
        
        try:
            # Create augmented prompt
            augmented_prompt = self._create_augmented_prompt(request, chunks)
            
            # Generate response using LLM
            generated_text, confidence = await self._call_llm(augmented_prompt, request)
            
            # Create response
            response = RAGResponse(
                request_id=request.request_id,
                generated_text=generated_text,
                confidence_score=confidence,
                retrieved_chunks=chunks,
                source_documents=[chunk.document_id for chunk in chunks],
                retrieval_quality_score=self._calculate_retrieval_quality(chunks, request.query),
                generation_quality_score=confidence,
                context_used=request.context,
                augmented_prompt=augmented_prompt[:200] + "..." if len(augmented_prompt) > 200 else augmented_prompt,
                success=True
            )
            
            return response
            
        except Exception as e:
            self.logger.error(f"Response generation failed: {str(e)}")
            return RAGResponse(
                request_id=request.request_id,
                success=False,
                error_message=str(e)
            )
    
    def _create_augmented_prompt(self, request: RAGRequest, chunks: List[DocumentChunk]) -> str:
        """Create augmented prompt with retrieved knowledge"""
        
        # Base system prompt - explicitly state that knowledge context contains actual data
        system_prompt = """You are an expert fraud investigation assistant with direct access to investigation data and results.

IMPORTANT: The "RELEVANT KNOWLEDGE" section below contains ACTUAL investigation data, transaction records, investigation results, and findings from the fraud investigation system. This is real data from completed investigations, not general knowledge.

Your task:
1. Use the provided investigation data to answer the user's query directly
2. If the user asks about transactions, entities, or investigation details, extract and present the relevant information from the knowledge context
3. If the data contains specific values (amounts, dates, IDs, risk scores, etc.), use those exact values in your response
4. If the user's query cannot be answered from the provided data, clearly state what information is missing
5. Do NOT say you don't have access to data - you DO have access through the knowledge context provided below"""
        
        # Add knowledge context
        knowledge_context = ""
        if chunks:
            knowledge_context = "\n\n=== RELEVANT KNOWLEDGE (ACTUAL INVESTIGATION DATA) ===\n"
            knowledge_context += "The following contains real investigation results, transaction data, and findings:\n\n"
            for i, chunk in enumerate(chunks, 1):
                knowledge_context += f"\n[Investigation Data Source {i}]\n{chunk.content}\n"
            knowledge_context += "\n=== END INVESTIGATION DATA ===\n"
        
        # Add investigation context
        investigation_context = ""
        if request.investigation_id or request.entity_type:
            investigation_context = "\n=== CURRENT INVESTIGATION CONTEXT ===\n"
            if request.investigation_id:
                investigation_context += f"Investigation ID: {request.investigation_id}\n"
            if request.entity_type:
                investigation_context += f"Entity Type: {request.entity_type}\n"
            if request.investigation_type:
                investigation_context += f"Investigation Type: {request.investigation_type}\n"
            investigation_context += "=== END CONTEXT ===\n"
        
        # Construct final prompt
        prompt_parts = [
            system_prompt,
            knowledge_context,
            investigation_context,
            f"\nUser Query: {request.query}",
            "\n\nInstructions: Answer the user's query using the ACTUAL investigation data provided above. Extract specific details, values, and findings from the knowledge context. If the data contains transaction information, entity details, risk scores, or other specific values, present them directly in your response."
        ]
        
        if request.include_sources and chunks:
            prompt_parts.append("\nInclude references to the investigation data sources you used.")
        
        return "\n".join(prompt_parts)
    
    async def _call_llm(self, prompt: str, request: RAGRequest) -> tuple[str, float]:
        """Call LLM for text generation"""
        
        try:
            # Try to use real LLM if available
            if self.llm_manager and self.llm_manager.selected_model:
                try:
                    # Parse the prompt to extract system and user messages
                    # The prompt format from _create_augmented_prompt includes:
                    # 1. System prompt (expert fraud investigation assistant)
                    # 2. Knowledge context (=== RELEVANT KNOWLEDGE ===)
                    # 3. Investigation context (=== INVESTIGATION CONTEXT ===)
                    # 4. User query
                    
                    system_parts = []
                    user_parts = []
                    
                    # Extract system prompt (before knowledge context)
                    if "=== RELEVANT KNOWLEDGE ===" in prompt:
                        system_end = prompt.find("=== RELEVANT KNOWLEDGE ===")
                        system_parts.append(prompt[:system_end].strip())
                        
                        # Extract knowledge context
                        knowledge_start = prompt.find("=== RELEVANT KNOWLEDGE ===")
                        knowledge_end = prompt.find("=== END KNOWLEDGE ===")
                        if knowledge_end == -1:
                            knowledge_end = prompt.find("=== INVESTIGATION CONTEXT ===")
                        if knowledge_end == -1:
                            knowledge_end = prompt.find("User Query:")
                        if knowledge_end > knowledge_start:
                            knowledge_section = prompt[knowledge_start:knowledge_end].strip()
                            system_parts.append(knowledge_section)
                        
                        # Extract investigation context if present
                        if "=== INVESTIGATION CONTEXT ===" in prompt:
                            inv_start = prompt.find("=== INVESTIGATION CONTEXT ===")
                            inv_end = prompt.find("=== END CONTEXT ===")
                            if inv_end == -1:
                                inv_end = prompt.find("User Query:")
                            if inv_end > inv_start:
                                inv_section = prompt[inv_start:inv_end].strip()
                                system_parts.append(inv_section)
                        
                        # Extract user query
                        if "User Query:" in prompt:
                            query_start = prompt.find("User Query:") + len("User Query:")
                            user_query = prompt[query_start:].strip()
                            user_parts.append(user_query)
                    else:
                        # Fallback: treat entire prompt as user message
                        user_parts.append(prompt)
                    
                    # Build messages
                    messages = []
                    if system_parts:
                        system_content = "\n\n".join(system_parts)
                        messages.append(SystemMessage(content=system_content))
                    
                    if user_parts:
                        user_content = "\n\n".join(user_parts)
                        messages.append(HumanMessage(content=user_content))
                    else:
                        # Fallback: use the full prompt as user message
                        messages.append(HumanMessage(content=prompt))
                    
                    # Invoke LLM
                    response = await self.llm_manager.selected_model.ainvoke(messages)
                    
                    # Extract text from response
                    if hasattr(response, 'content'):
                        generated_text = response.content
                    else:
                        generated_text = str(response)
                    
                    # Calculate confidence based on response quality
                    # Higher confidence if response is substantial and relevant
                    response_length = len(generated_text)
                    confidence = min(0.95, 0.6 + min(response_length / 1000, 0.3))
                    
                    self.logger.debug(f"LLM generated response: {len(generated_text)} chars, confidence: {confidence:.2f}")
                    return generated_text, confidence
                    
                except Exception as llm_error:
                    self.logger.warning(f"LLM call failed, using fallback: {llm_error}", exc_info=True)
                    # Fall through to fallback response
            
            # Fallback: Generate a simple answer from the prompt context
            # Extract the actual query from the prompt
            query_text = request.query
            if not query_text and "User Query:" in prompt:
                # Try to extract query from prompt
                query_start = prompt.find("User Query:") + len("User Query:")
                query_end = prompt.find("\n", query_start)
                if query_end == -1:
                    query_end = len(prompt)
                query_text = prompt[query_start:query_end].strip()
            
            # Check if we have knowledge context in the prompt
            has_knowledge = "=== RELEVANT KNOWLEDGE ===" in prompt or "knowledge_context" in prompt.lower()
            
            if has_knowledge:
                # We have knowledge but LLM failed - provide a helpful message
                generated_text = f"I found relevant information related to your query: \"{query_text}\". However, I encountered an issue generating a detailed response. Please try rephrasing your question or contact support if the issue persists."
                confidence = 0.5
            else:
                # No knowledge found
                generated_text = f"I couldn't find specific information about \"{query_text}\" in the knowledge base. The system may not have indexed relevant data yet, or your query may need to be more specific."
                confidence = 0.3
            
            return generated_text, confidence
            
        except Exception as e:
            self.logger.error(f"LLM call failed: {str(e)}", exc_info=True)
            return "I apologize, but I encountered an error while processing your request. Please try again or contact support if the issue persists.", 0.1
    
    def _calculate_retrieval_quality(self, chunks: List[DocumentChunk], query: str) -> float:
        """Calculate quality score for retrieved chunks"""
        
        if not chunks:
            return 0.0
        
        # Simple quality calculation based on chunk relevance
        query_terms = set(query.lower().split())
        total_relevance = 0.0
        
        for chunk in chunks:
            relevance = chunk.calculate_relevance_score(query_terms)
            total_relevance += relevance
        
        return min(1.0, total_relevance / len(chunks))
    
    def _get_cached_response(self, request: RAGRequest) -> Optional[RAGResponse]:
        """Get cached response if available"""
        
        cache_key = self._create_cache_key(request)
        
        if cache_key in self.response_cache:
            response, timestamp = self.response_cache[cache_key]
            
            # Check if cache is still valid
            if datetime.now() - timestamp < timedelta(seconds=self.config.cache_ttl_seconds):
                return response
            else:
                # Remove expired cache entry
                del self.response_cache[cache_key]
        
        return None
    
    def _cache_response(self, request: RAGRequest, response: RAGResponse) -> None:
        """Cache response for future use"""
        
        if len(self.response_cache) >= self.config.max_cache_size:
            # Remove oldest cache entry
            oldest_key = min(self.response_cache.keys(), 
                           key=lambda k: self.response_cache[k][1])
            del self.response_cache[oldest_key]
        
        cache_key = self._create_cache_key(request)
        self.response_cache[cache_key] = (response, datetime.now())
    
    def _create_cache_key(self, request: RAGRequest) -> str:
        """Create cache key for request"""
        
        import hashlib
        
        key_parts = [
            request.query,
            str(request.entity_type),
            str(request.investigation_type),
            str(sorted(request.required_tags)) if request.required_tags else "",
            str(request.max_retrieved_chunks),
            str(request.similarity_threshold)
        ]
        
        key_string = "|".join(key_parts)
        return hashlib.sha256(key_string.encode()).hexdigest()[:16]
    
    def _update_metrics(
        self,
        processing_time: float,
        retrieval_time: float,
        generation_time: float,
        chunks_count: int,
        confidence: float,
        success: bool
    ) -> None:
        """Update performance metrics"""
        
        self.metrics.requests_processed += 1
        
        if success:
            self.metrics.successful_responses += 1
        else:
            self.metrics.failed_responses += 1
        
        self.metrics.total_processing_time += processing_time
        self.metrics.avg_processing_time = self.metrics.total_processing_time / self.metrics.requests_processed
        
        # Update running averages (simplified)
        if success:
            self.metrics.avg_retrieval_time = (self.metrics.avg_retrieval_time + retrieval_time) / 2
            self.metrics.avg_generation_time = (self.metrics.avg_generation_time + generation_time) / 2
            
            self.metrics.total_chunks_retrieved += chunks_count
            self.metrics.avg_chunks_per_request = self.metrics.total_chunks_retrieved / self.metrics.requests_processed
            
            self.metrics.avg_confidence_score = (self.metrics.avg_confidence_score + confidence) / 2
    
    async def add_knowledge_document(
        self,
        content: str,
        title: str = "",
        document_type: str = "general",
        entity_types: Optional[Set[str]] = None,
        investigation_types: Optional[Set[str]] = None,
        tags: Optional[Set[str]] = None
    ) -> str:
        """Add document to knowledge base"""
        
        from .knowledge_base import DocumentMetadata
        
        metadata = DocumentMetadata(
            title=title,
            document_type=document_type,
            entity_types=entity_types or set(),
            investigation_types=investigation_types or set(),
            tags=tags or set()
        )
        
        return await self.knowledge_base.add_document(content, metadata)
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get RAG system metrics"""
        
        uptime = (datetime.now() - self.metrics.start_time).total_seconds()
        
        return {
            'rag_status': {
                'uptime_seconds': uptime,
                'active_requests': len(self.active_requests),
                'cached_responses': len(self.response_cache),
                'llm_client_available': self.llm_client is not None
            },
            'processing_metrics': {
                'requests_processed': self.metrics.requests_processed,
                'successful_responses': self.metrics.successful_responses,
                'failed_responses': self.metrics.failed_responses,
                'success_rate': self.metrics.successful_responses / max(1, self.metrics.requests_processed),
                'avg_processing_time': self.metrics.avg_processing_time,
                'avg_retrieval_time': self.metrics.avg_retrieval_time,
                'avg_generation_time': self.metrics.avg_generation_time
            },
            'retrieval_metrics': {
                'total_chunks_retrieved': self.metrics.total_chunks_retrieved,
                'avg_chunks_per_request': self.metrics.avg_chunks_per_request,
                'avg_confidence_score': self.metrics.avg_confidence_score
            },
            'cache_metrics': {
                'cache_hits': self.metrics.cache_hits,
                'cache_misses': self.metrics.cache_misses,
                'cache_hit_rate': self.metrics.cache_hits / max(1, self.metrics.cache_hits + self.metrics.cache_misses)
            },
            'knowledge_base_metrics': self.knowledge_base.get_statistics()
        }
    
    async def clear_cache(self) -> None:
        """Clear response cache"""
        self.response_cache.clear()
        self.logger.info("RAG response cache cleared")
    
    async def rebuild_knowledge_base(self) -> None:
        """Rebuild knowledge base indices"""
        await self.knowledge_base.rebuild_indices()
        await self.clear_cache()  # Clear cache since knowledge base changed
        self.logger.info("Knowledge base rebuilt and cache cleared")


# Global RAG orchestrator instance
_rag_orchestrator: Optional[RAGOrchestrator] = None


def get_rag_orchestrator() -> RAGOrchestrator:
    """Get the global RAG orchestrator instance"""
    global _rag_orchestrator
    
    if _rag_orchestrator is None:
        config = RAGConfig()
        _rag_orchestrator = RAGOrchestrator(config)
    
    return _rag_orchestrator