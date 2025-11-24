"""
Unified RAG Service
Multi-source RAG orchestration that queries across all enabled data sources.
All configuration from environment variables - no hardcoded values.
"""

import asyncio
from typing import List, Optional, Dict, Any
from dataclasses import dataclass, field
from datetime import datetime

from app.service.rag.data_source_service import get_data_source_service
from app.service.rag.vector_rag_service import get_rag_service, SearchResult
from app.service.rag.investigation_indexer import get_investigation_indexer
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


@dataclass
class UnifiedSearchResult:
    """Unified search result from multiple sources."""
    chunk_id: str
    content: str
    similarity_score: float
    source_type: str
    source_id: str
    source_name: str
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class UnifiedRAGResponse:
    """Unified RAG response with multi-source results."""
    answer: str
    sources: List[UnifiedSearchResult]
    confidence: float
    processing_time_ms: int
    citations: List[Dict[str, Any]] = field(default_factory=list)


class UnifiedRAGService:
    """Unified RAG service for multi-source queries."""
    
    def __init__(self):
        """Initialize unified RAG service."""
        self.data_source_service = get_data_source_service()
        self.rag_service = get_rag_service()
        self.investigation_indexer = get_investigation_indexer()
    
    async def query(
        self,
        query_text: str,
        data_source_ids: Optional[List[str]] = None,
        limit: int = 10,
        similarity_threshold: float = 0.7,
        investigation_id: Optional[str] = None,
        entity_id: Optional[str] = None
    ) -> UnifiedRAGResponse:
        """Query across all enabled data sources."""
        start_time = datetime.utcnow()
        
        enabled_sources = await self.data_source_service.get_enabled_data_sources()
        
        if data_source_ids:
            enabled_sources = [s for s in enabled_sources if s.id in data_source_ids]
        
        if not enabled_sources:
            return UnifiedRAGResponse(
                answer="No enabled data sources configured.",
                sources=[],
                confidence=0.0,
                processing_time_ms=0
            )
        
        all_results = await self._query_all_sources(
            query_text,
            enabled_sources,
            limit,
            similarity_threshold,
            investigation_id,
            entity_id
        )
        
        ranked_results = self._rank_and_deduplicate(all_results, limit)
        citations = self._generate_citations(ranked_results)
        
        answer = await self._generate_answer(query_text, ranked_results)
        
        processing_time = int((datetime.utcnow() - start_time).total_seconds() * 1000)
        confidence = self._calculate_confidence(ranked_results)
        
        return UnifiedRAGResponse(
            answer=answer,
            sources=ranked_results,
            confidence=confidence,
            processing_time_ms=processing_time,
            citations=citations
        )
    
    async def _query_all_sources(
        self,
        query_text: str,
        sources: List,
        limit: int,
        threshold: float,
        investigation_id: Optional[str],
        entity_id: Optional[str]
    ) -> List[UnifiedSearchResult]:
        """Query all sources in parallel."""
        tasks = []
        
        for source in sources:
            if source.source_type == "investigation_results":
                tasks.append(self._query_investigation_source(
                    query_text, source, limit, threshold, investigation_id, entity_id
                ))
            elif source.source_type in ["postgresql", "sqlite"]:
                tasks.append(self._query_database_source(
                    query_text, source, limit, threshold
                ))
            else:
                tasks.append(self._query_vector_source(
                    query_text, source, limit, threshold
                ))
        
        results_lists = await asyncio.gather(*tasks, return_exceptions=True)
        
        all_results = []
        for i, result in enumerate(results_lists):
            if isinstance(result, Exception):
                logger.error(f"Query failed for source {sources[i].id}: {result}")
                continue
            all_results.extend(result)
        
        return all_results
    
    async def _query_investigation_source(
        self,
        query_text: str,
        source,
        limit: int,
        threshold: float,
        investigation_id: Optional[str],
        entity_id: Optional[str]
    ) -> List[UnifiedSearchResult]:
        """Query investigation results source with optional filters."""
        try:
            collection_id = await self.investigation_indexer.ensure_investigation_collection()
            
            search_results = await self.rag_service.search_similar(
                query=query_text,
                collection_ids=[collection_id],
                limit=limit,
                similarity_threshold=threshold,
                investigation_id=investigation_id
            )
            
            results = []
            for r in search_results:
                metadata = r.metadata or {}
                
                if investigation_id and metadata.get("investigation_id") != investigation_id:
                    continue
                
                if entity_id:
                    entities = metadata.get("entities", [])
                    if isinstance(entities, list) and entity_id not in [str(e) for e in entities]:
                        continue
                    elif isinstance(entities, str) and entity_id not in entities:
                        continue
                
                results.append(UnifiedSearchResult(
                    chunk_id=r.chunk_id,
                    content=r.content,
                    similarity_score=r.similarity_score,
                    source_type="investigation_results",
                    source_id=source.id,
                    source_name=source.name,
                    metadata=metadata
                ))
            
            return results
        except Exception as e:
            logger.error(f"Investigation source query failed: {e}")
            return []
    
    async def _query_database_source(
        self,
        query_text: str,
        source,
        limit: int,
        threshold: float
    ) -> List[UnifiedSearchResult]:
        """Query external database source."""
        try:
            config = source.connection_config
            query_sql = config.get("query", "SELECT * FROM documents LIMIT 10")
            
            if source.source_type == "postgresql":
                import asyncpg
                conn = await asyncpg.connect(
                    host=config.get("host"),
                    port=config.get("port", 5432),
                    database=config.get("database"),
                    user=config.get("user"),
                    password=config.get("password")
                )
                rows = await conn.fetch(query_sql)
                await conn.close()
            else:
                import sqlite3
                conn = sqlite3.connect(config.get("file_path"))
                cursor = conn.execute(query_sql)
                rows = cursor.fetchall()
                conn.close()
            
            return [
                UnifiedSearchResult(
                    chunk_id=f"{source.id}_{i}",
                    content=str(row),
                    similarity_score=0.8,
                    source_type=source.source_type,
                    source_id=source.id,
                    source_name=source.name,
                    metadata={"row": dict(row) if hasattr(row, '_asdict') else {}}
                )
                for i, row in enumerate(rows[:limit])
            ]
        except Exception as e:
            logger.error(f"Database source query failed: {e}")
            return []
    
    async def _query_vector_source(
        self,
        query_text: str,
        source,
        limit: int,
        threshold: float
    ) -> List[UnifiedSearchResult]:
        """Query vector database source."""
        try:
            collection_id = source.connection_config.get("collection_id")
            search_results = await self.rag_service.search_similar(
                query=query_text,
                collection_ids=[collection_id] if collection_id else None,
                limit=limit,
                similarity_threshold=threshold
            )
            
            return [
                UnifiedSearchResult(
                    chunk_id=r.chunk_id,
                    content=r.content,
                    similarity_score=r.similarity_score,
                    source_type=source.source_type,
                    source_id=source.id,
                    source_name=source.name,
                    metadata=r.metadata or {}
                )
                for r in search_results
            ]
        except Exception as e:
            logger.error(f"Vector source query failed: {e}")
            return []
    
    def _rank_and_deduplicate(
        self,
        results: List[UnifiedSearchResult],
        limit: int
    ) -> List[UnifiedSearchResult]:
        """Rank results by similarity and deduplicate."""
        seen_content = set()
        unique_results = []
        
        sorted_results = sorted(results, key=lambda x: x.similarity_score, reverse=True)
        
        for result in sorted_results:
            content_hash = hash(result.content[:100])
            if content_hash not in seen_content:
                seen_content.add(content_hash)
                unique_results.append(result)
                if len(unique_results) >= limit:
                    break
        
        return unique_results
    
    def _generate_citations(self, results: List[UnifiedSearchResult]) -> List[Dict[str, Any]]:
        """Generate citations for search results."""
        citations = []
        for result in results:
            citation = {
                "chunk_id": result.chunk_id,
                "source_type": result.source_type,
                "source_name": result.source_name,
                "similarity_score": result.similarity_score,
                "metadata": result.metadata
            }
            if result.source_type == "investigation_results":
                citation["investigation_id"] = result.metadata.get("investigation_id")
            citations.append(citation)
        return citations
    
    async def _generate_answer(
        self,
        query_text: str,
        results: List[UnifiedSearchResult]
    ) -> str:
        """Generate answer from search results."""
        # If no results, return a helpful message
        if not results:
            logger.info(f"No search results found for query: {query_text}")
            return "I couldn't find any relevant information in the knowledge base for your query. The system may not have indexed relevant data yet, or your query may need to be more specific."
        
        # Log what we found
        logger.info(f"Found {len(results)} search results for query: {query_text}")
        for i, result in enumerate(results[:3], 1):
            logger.debug(f"Result {i} (score: {result.similarity_score:.3f}): {result.content[:200]}...")
        
        # If we have results, try to generate a meaningful answer
        try:
            from app.service.agent.rag.rag_orchestrator import RAGOrchestrator, RAGRequest, RAGConfig
        
            # Build context from top results - convert UnifiedSearchResult to DocumentChunk-like objects
            # The RAGOrchestrator expects DocumentChunk objects, but we can create a simple wrapper
            from app.service.agent.rag.knowledge_base import DocumentChunk
            
            chunks = []
            for i, r in enumerate(results[:5]):
                # Create a DocumentChunk object with the search result data
                chunk = DocumentChunk(
                    chunk_id=r.chunk_id,
                    document_id=r.source_id,
                    chunk_index=i,
                    content=r.content,
                    content_type="text"
                )
                chunks.append(chunk)
            
            config = RAGConfig()
            orchestrator = RAGOrchestrator(config=config)
            
            request = RAGRequest(
                query=query_text,
                context={"knowledge_context": "\n\n".join([r.content for r in results[:5]])}
            )
            
            # Pass chunks directly to generate_response
            response = await orchestrator._generate_response(request, chunks)
            
            if hasattr(response, 'generated_text') and response.generated_text:
                logger.info(f"Generated answer length: {len(response.generated_text)} chars")
                return response.generated_text
            elif hasattr(response, 'success') and not response.success:
                # If generation failed, return a summary based on results
                logger.warning(f"RAG generation failed: {response.error_message if hasattr(response, 'error_message') else 'Unknown error'}")
                return self._generate_simple_answer(query_text, results)
            else:
                return self._generate_simple_answer(query_text, results)
        except Exception as e:
            logger.warning(f"Answer generation failed, using simple summary: {e}", exc_info=True)
            # Fallback to simple answer generation
            return self._generate_simple_answer(query_text, results)
    
    def _generate_simple_answer(
        self,
        query_text: str,
        results: List[UnifiedSearchResult]
    ) -> str:
        """Generate a simple answer from search results without LLM."""
        if not results:
            return "No relevant information found for your query."
        
        # Create a simple summary from the top results
        top_results = results[:3]
        answer_parts = [f"Found {len(results)} relevant result(s) for your query:\n"]
        
        for i, result in enumerate(top_results, 1):
            answer_parts.append(f"\n{i}. From {result.source_name}:")
            # Truncate content if too long
            content = result.content[:300] + "..." if len(result.content) > 300 else result.content
            answer_parts.append(content)
            answer_parts.append(f"   (Similarity: {result.similarity_score:.2f})")
        
        if len(results) > 3:
            answer_parts.append(f"\n... and {len(results) - 3} more result(s)")
        
        return "\n".join(answer_parts)
    
    def _calculate_confidence(self, results: List[UnifiedSearchResult]) -> float:
        """Calculate confidence score from results."""
        if not results:
            return 0.0
        
        avg_score = sum(r.similarity_score for r in results) / len(results)
        return min(avg_score, 1.0)


_global_service: Optional[UnifiedRAGService] = None


def get_unified_rag_service() -> UnifiedRAGService:
    """Get global unified RAG service."""
    global _global_service
    if _global_service is None:
        _global_service = UnifiedRAGService()
    return _global_service

