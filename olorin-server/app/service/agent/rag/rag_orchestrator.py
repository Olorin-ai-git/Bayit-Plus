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
    temperature: float = 0.7
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
        
        # LLM client placeholder
        self.llm_client = None
        self._initialize_llm_client()
    
    def _initialize_llm_client(self) -> None:
        """Initialize LLM client"""
        try:
            # Placeholder for actual LLM client initialization
            # In real implementation, would initialize OpenAI, Anthropic, or other LLM client
            self.llm_client = "placeholder_llm_client"
            self.logger.info(f"Initialized LLM client: {self.config.llm_model}")
        except Exception as e:
            self.logger.error(f"Failed to initialize LLM client: {str(e)}")
    
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
        
        # Base system prompt
        system_prompt = """You are an expert fraud investigation assistant with access to comprehensive domain knowledge. 
Use the provided knowledge context to give accurate, detailed, and actionable responses to investigation queries."""
        
        # Add knowledge context
        knowledge_context = ""
        if chunks:
            knowledge_context = "\n\n=== RELEVANT KNOWLEDGE ===\n"
            for i, chunk in enumerate(chunks, 1):
                knowledge_context += f"\n[Source {i}] {chunk.content}\n"
            knowledge_context += "\n=== END KNOWLEDGE ===\n"
        
        # Add investigation context
        investigation_context = ""
        if request.investigation_id or request.entity_type:
            investigation_context = "\n=== INVESTIGATION CONTEXT ===\n"
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
            "\nPlease provide a comprehensive response based on the available knowledge and context."
        ]
        
        if request.include_sources and chunks:
            prompt_parts.append("\nInclude relevant source references in your response.")
        
        return "\n".join(prompt_parts)
    
    async def _call_llm(self, prompt: str, request: RAGRequest) -> tuple[str, float]:
        """Call LLM for text generation"""
        
        try:
            # Placeholder for actual LLM call
            # In real implementation, would call OpenAI, Anthropic, or other LLM API
            
            # Simulate LLM response
            await asyncio.sleep(0.1)  # Simulate processing time
            
            generated_text = f"""Based on the investigation context and available knowledge, here is my analysis:

The query "{request.query}" requires careful examination of the provided evidence and domain knowledge.

Key findings:
1. Investigation patterns suggest attention to {request.entity_type or 'entity'} characteristics
2. The investigation type of {request.investigation_type or 'general'} indicates specific analytical approaches
3. Available knowledge sources provide relevant context for decision-making

Recommendations:
- Continue monitoring for additional indicators
- Cross-reference findings with historical patterns
- Document all evidence for case progression

This analysis is based on current knowledge and should be validated against additional sources."""
            
            # Simple confidence calculation based on prompt length and chunk relevance
            confidence = min(0.9, 0.5 + (len(prompt) / 5000) + (len(request.query) / 1000))
            
            return generated_text, confidence
            
        except Exception as e:
            self.logger.error(f"LLM call failed: {str(e)}")
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