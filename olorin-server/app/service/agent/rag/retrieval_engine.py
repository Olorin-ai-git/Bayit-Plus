"""
Retrieval Engine for RAG System

Enhanced knowledge retrieval with vector similarity search, semantic search,
and optimized query processing for real-time investigation support.
"""

import asyncio
import logging
import time
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional, Set, Tuple, Union

from .knowledge_base import DocumentChunk, KnowledgeBase
from ..communication.ice_events import ICEEventBus, get_event_bus

logger = logging.getLogger(__name__)


class SearchStrategy(Enum):
    """Search strategy options"""
    VECTOR_SIMILARITY = "vector_similarity"
    SEMANTIC_SEARCH = "semantic_search"
    HYBRID_SEARCH = "hybrid_search"
    KEYWORD_SEARCH = "keyword_search"
    FUZZY_SEARCH = "fuzzy_search"


class QueryExpansionMethod(Enum):
    """Query expansion methods"""
    NONE = "none"
    SYNONYMS = "synonyms"
    RELATED_TERMS = "related_terms"
    DOMAIN_SPECIFIC = "domain_specific"
    CONTEXTUAL = "contextual"


@dataclass
class SearchQuery:
    """Enhanced search query with metadata"""
    
    query_id: str = field(default_factory=lambda: f"query_{int(time.time() * 1000)}")
    original_query: str = ""
    expanded_queries: List[str] = field(default_factory=list)
    
    # Search parameters
    strategy: SearchStrategy = SearchStrategy.HYBRID_SEARCH
    max_results: int = 10
    similarity_threshold: float = 0.7
    
    # Filtering criteria
    domain_filters: Set[str] = field(default_factory=set)
    entity_type_filters: Set[str] = field(default_factory=set)
    tag_filters: Set[str] = field(default_factory=set)
    date_range_filter: Optional[Tuple[datetime, datetime]] = None
    
    # Investigation context
    investigation_id: str = ""
    domain: str = ""
    
    # Query processing metadata
    created_at: datetime = field(default_factory=datetime.now)
    expansion_method: QueryExpansionMethod = QueryExpansionMethod.DOMAIN_SPECIFIC


@dataclass
class SearchResult:
    """Search result with enhanced metadata"""
    
    query_id: str = ""
    chunks: List[DocumentChunk] = field(default_factory=list)
    
    # Performance metrics
    search_time_ms: float = 0.0
    total_candidates: int = 0
    filtered_count: int = 0
    
    # Quality metrics
    avg_relevance_score: float = 0.0
    min_relevance_score: float = 0.0
    max_relevance_score: float = 0.0
    
    # Search metadata
    strategy_used: SearchStrategy = SearchStrategy.HYBRID_SEARCH
    query_expansion_applied: bool = False
    cache_hit: bool = False
    
    # Results categorization
    high_relevance_count: int = 0
    medium_relevance_count: int = 0
    low_relevance_count: int = 0
    
    created_at: datetime = field(default_factory=datetime.now)


@dataclass
class RetrievalEngineConfig:
    """Configuration for retrieval engine"""
    
    # Search settings
    default_strategy: SearchStrategy = SearchStrategy.HYBRID_SEARCH
    enable_query_expansion: bool = True
    default_expansion_method: QueryExpansionMethod = QueryExpansionMethod.DOMAIN_SPECIFIC
    
    # Performance settings
    max_concurrent_searches: int = 5
    search_timeout_seconds: int = 30
    enable_result_caching: bool = True
    cache_ttl_seconds: int = 300  # 5 minutes
    max_cache_entries: int = 200
    
    # Quality thresholds
    min_chunk_relevance: float = 0.3
    high_relevance_threshold: float = 0.8
    medium_relevance_threshold: float = 0.6
    
    # Vector search settings
    vector_similarity_top_k: int = 50
    semantic_search_top_k: int = 30
    
    # Query processing
    max_query_length: int = 1000
    enable_query_preprocessing: bool = True
    enable_fuzzy_matching: bool = True
    
    # Domain-specific settings
    domain_weight_multiplier: float = 1.5
    entity_type_weight_multiplier: float = 1.3
    recency_weight_multiplier: float = 1.2


class RetrievalEngine:
    """
    Enhanced Retrieval Engine for RAG System
    
    Features:
    - Vector similarity search with optimized indexing
    - Semantic search with contextual understanding
    - Hybrid search combining multiple strategies
    - Intelligent query expansion and preprocessing
    - Real-time search with <500ms latency target
    - Results caching and performance optimization
    - Domain-aware filtering and ranking
    - Search analytics and performance monitoring
    """
    
    def __init__(
        self,
        knowledge_base: KnowledgeBase,
        config: Optional[RetrievalEngineConfig] = None,
        event_bus: Optional[ICEEventBus] = None
    ):
        """Initialize retrieval engine"""
        self.knowledge_base = knowledge_base
        self.config = config or RetrievalEngineConfig()
        self.event_bus = event_bus or get_event_bus()
        
        # Search performance tracking
        self.search_stats = {
            "total_searches": 0,
            "cache_hits": 0,
            "cache_misses": 0,
            "avg_search_time_ms": 0.0,
            "successful_searches": 0,
            "failed_searches": 0
        }
        
        # Results cache
        self.results_cache: Dict[str, Tuple[SearchResult, datetime]] = {}
        
        # Concurrent search management
        self.search_semaphore = asyncio.Semaphore(config.max_concurrent_searches if config else 5)
        
        # Domain-specific query patterns
        self.domain_query_patterns = self._initialize_domain_patterns()
        
        # Query expansion dictionaries
        self.synonym_dict = self._initialize_synonym_dict()
        self.domain_terms_dict = self._initialize_domain_terms()
        
        self.logger = logging.getLogger(f"{__name__}.retrieval_engine")
        self.logger.info("Enhanced retrieval engine initialized")
    
    async def search(
        self,
        query: Union[str, SearchQuery],
        investigation_id: str = "",
        domain: str = "",
        **kwargs
    ) -> SearchResult:
        """
        Perform enhanced knowledge retrieval
        
        Args:
            query: Search query (string or SearchQuery object)
            investigation_id: Investigation context
            domain: Investigation domain
            **kwargs: Additional search parameters
            
        Returns:
            SearchResult with retrieved knowledge chunks
        """
        start_time = time.time()
        search_query = self._prepare_search_query(query, investigation_id, domain, **kwargs)
        
        try:
            async with self.search_semaphore:
                self.search_stats["total_searches"] += 1
                
                # Check cache first
                if self.config.enable_result_caching:
                    cached_result = self._get_cached_result(search_query)
                    if cached_result:
                        self.search_stats["cache_hits"] += 1
                        cached_result.search_time_ms = (time.time() - start_time) * 1000
                        return cached_result
                
                self.search_stats["cache_misses"] += 1
                
                # Publish search start event
                await self.event_bus.publish(
                    "custom_event",
                    {
                        "event_type": "knowledge_search_started",
                        "query_id": search_query.query_id,
                        "domain": domain,
                        "strategy": search_query.strategy.value
                    },
                    investigation_id=investigation_id
                )
                
                # Preprocess query
                if self.config.enable_query_preprocessing:
                    search_query = await self._preprocess_query(search_query)
                
                # Expand query if enabled
                if self.config.enable_query_expansion:
                    search_query = await self._expand_query(search_query)
                
                # Execute search based on strategy
                result = await self._execute_search_strategy(search_query)
                
                # Post-process results
                result = await self._post_process_results(result, search_query)
                
                # Cache result
                if self.config.enable_result_caching:
                    self._cache_result(search_query, result)
                
                # Update statistics
                search_time_ms = (time.time() - start_time) * 1000
                result.search_time_ms = search_time_ms
                self._update_search_stats(search_time_ms, True)
                
                # Publish search completion event
                await self.event_bus.publish(
                    "custom_event",
                    {
                        "event_type": "knowledge_search_completed",
                        "query_id": search_query.query_id,
                        "results_count": len(result.chunks),
                        "search_time_ms": search_time_ms,
                        "strategy": result.strategy_used.value
                    },
                    investigation_id=investigation_id
                )
                
                self.logger.debug(
                    f"Search completed: {len(result.chunks)} results in {search_time_ms:.1f}ms "
                    f"(strategy: {result.strategy_used.value})"
                )
                
                return result
                
        except Exception as e:
            self.logger.error(f"Search failed for query '{search_query.original_query}': {str(e)}")
            self._update_search_stats((time.time() - start_time) * 1000, False)
            
            # Return empty result on failure
            return SearchResult(
                query_id=search_query.query_id,
                search_time_ms=(time.time() - start_time) * 1000,
                strategy_used=search_query.strategy
            )
    
    async def batch_search(
        self,
        queries: List[Union[str, SearchQuery]],
        investigation_id: str = "",
        domain: str = ""
    ) -> List[SearchResult]:
        """
        Perform batch search for multiple queries
        
        Args:
            queries: List of search queries
            investigation_id: Investigation context
            domain: Investigation domain
            
        Returns:
            List of search results
        """
        self.logger.info(f"Starting batch search for {len(queries)} queries")
        
        # Create search tasks
        search_tasks = []
        for query in queries:
            task = self.search(query, investigation_id, domain)
            search_tasks.append(task)
        
        # Execute searches concurrently
        results = await asyncio.gather(*search_tasks, return_exceptions=True)
        
        # Handle any exceptions
        processed_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                self.logger.error(f"Batch search query {i} failed: {str(result)}")
                processed_results.append(SearchResult())
            else:
                processed_results.append(result)
        
        self.logger.info(f"Batch search completed: {len(processed_results)} results")
        return processed_results
    
    def _prepare_search_query(
        self,
        query: Union[str, SearchQuery],
        investigation_id: str,
        domain: str,
        **kwargs
    ) -> SearchQuery:
        """Prepare search query object"""
        
        if isinstance(query, str):
            search_query = SearchQuery(
                original_query=query,
                investigation_id=investigation_id,
                domain=domain,
                strategy=self.config.default_strategy,
                expansion_method=self.config.default_expansion_method
            )
            
            # Apply kwargs to search query
            for key, value in kwargs.items():
                if hasattr(search_query, key):
                    setattr(search_query, key, value)
        else:
            search_query = query
            if not search_query.investigation_id:
                search_query.investigation_id = investigation_id
            if not search_query.domain:
                search_query.domain = domain
        
        return search_query
    
    async def _preprocess_query(self, query: SearchQuery) -> SearchQuery:
        """Preprocess search query for better results"""
        
        original = query.original_query.strip()
        
        # Basic text cleaning
        processed = original.lower()
        
        # Remove special characters that might interfere with search
        processed = ''.join(c for c in processed if c.isalnum() or c.isspace())
        
        # Normalize whitespace
        processed = ' '.join(processed.split())
        
        # Limit query length
        if len(processed) > self.config.max_query_length:
            processed = processed[:self.config.max_query_length]
            self.logger.warning(f"Query truncated to {self.config.max_query_length} characters")
        
        # Store preprocessed query
        if processed != original.lower():
            query.expanded_queries.insert(0, processed)
        
        return query
    
    async def _expand_query(self, query: SearchQuery) -> SearchQuery:
        """Expand query with relevant terms"""
        
        if query.expansion_method == QueryExpansionMethod.NONE:
            return query
        
        expanded_queries = []
        
        if query.expansion_method == QueryExpansionMethod.SYNONYMS:
            expanded_queries.extend(self._expand_with_synonyms(query.original_query))
            
        elif query.expansion_method == QueryExpansionMethod.DOMAIN_SPECIFIC:
            expanded_queries.extend(self._expand_with_domain_terms(query.original_query, query.domain))
            
        elif query.expansion_method == QueryExpansionMethod.RELATED_TERMS:
            expanded_queries.extend(self._expand_with_related_terms(query.original_query))
            
        elif query.expansion_method == QueryExpansionMethod.CONTEXTUAL:
            expanded_queries.extend(self._expand_with_context(query.original_query, query.investigation_id))
        
        if expanded_queries:
            query.expanded_queries.extend(expanded_queries[:3])  # Limit expansions
            query.query_expansion_applied = True
            self.logger.debug(f"Query expanded with {len(expanded_queries)} additional terms")
        
        return query
    
    async def _execute_search_strategy(self, query: SearchQuery) -> SearchResult:
        """Execute search based on selected strategy"""
        
        if query.strategy == SearchStrategy.VECTOR_SIMILARITY:
            return await self._vector_similarity_search(query)
        elif query.strategy == SearchStrategy.SEMANTIC_SEARCH:
            return await self._semantic_search(query)
        elif query.strategy == SearchStrategy.HYBRID_SEARCH:
            return await self._hybrid_search(query)
        elif query.strategy == SearchStrategy.KEYWORD_SEARCH:
            return await self._keyword_search(query)
        elif query.strategy == SearchStrategy.FUZZY_SEARCH:
            return await self._fuzzy_search(query)
        else:
            # Fallback to hybrid search
            return await self._hybrid_search(query)
    
    async def _vector_similarity_search(self, query: SearchQuery) -> SearchResult:
        """Perform vector similarity search"""
        
        all_chunks = []
        
        # Search for original query
        chunks = await self.knowledge_base.search_chunks(
            query=query.original_query,
            max_results=self.config.vector_similarity_top_k,
            entity_type=list(query.entity_type_filters)[0] if query.entity_type_filters else None,
            tags=query.tag_filters,
            similarity_threshold=query.similarity_threshold
        )
        all_chunks.extend(chunks)
        
        # Search for expanded queries
        for expanded_query in query.expanded_queries[:2]:  # Limit expanded searches
            expanded_chunks = await self.knowledge_base.search_chunks(
                query=expanded_query,
                max_results=10,  # Fewer results for expanded queries
                entity_type=list(query.entity_type_filters)[0] if query.entity_type_filters else None,
                tags=query.tag_filters,
                similarity_threshold=query.similarity_threshold
            )
            all_chunks.extend(expanded_chunks)
        
        # Remove duplicates and apply filters
        unique_chunks = self._deduplicate_chunks(all_chunks)
        filtered_chunks = await self._apply_search_filters(unique_chunks, query)
        
        return SearchResult(
            query_id=query.query_id,
            chunks=filtered_chunks[:query.max_results],
            total_candidates=len(all_chunks),
            filtered_count=len(filtered_chunks),
            strategy_used=SearchStrategy.VECTOR_SIMILARITY,
            query_expansion_applied=query.query_expansion_applied
        )
    
    async def _semantic_search(self, query: SearchQuery) -> SearchResult:
        """Perform semantic search with contextual understanding"""
        
        # For now, use vector similarity as semantic search base
        # In a full implementation, this would use more advanced NLP models
        result = await self._vector_similarity_search(query)
        result.strategy_used = SearchStrategy.SEMANTIC_SEARCH
        
        # Apply semantic reranking (placeholder for advanced implementation)
        result.chunks = await self._semantic_rerank(result.chunks, query)
        
        return result
    
    async def _hybrid_search(self, query: SearchQuery) -> SearchResult:
        """Perform hybrid search combining multiple strategies"""
        
        # Execute multiple search strategies
        vector_task = self._vector_similarity_search(query)
        keyword_task = self._keyword_search(query)
        
        vector_result, keyword_result = await asyncio.gather(vector_task, keyword_task)
        
        # Combine results with scoring
        combined_chunks = []
        
        # Add vector results with weight
        for chunk in vector_result.chunks:
            chunk.hybrid_score = getattr(chunk, 'similarity_score', 0.7) * 0.7  # Vector weight
            combined_chunks.append(chunk)
        
        # Add keyword results with weight
        for chunk in keyword_result.chunks:
            existing_chunk = next((c for c in combined_chunks if c.chunk_id == chunk.chunk_id), None)
            if existing_chunk:
                # Boost score for chunks found in both searches
                existing_chunk.hybrid_score += getattr(chunk, 'similarity_score', 0.6) * 0.3
            else:
                chunk.hybrid_score = getattr(chunk, 'similarity_score', 0.6) * 0.5  # Keyword weight
                combined_chunks.append(chunk)
        
        # Sort by hybrid score and select top results
        combined_chunks.sort(key=lambda c: getattr(c, 'hybrid_score', 0), reverse=True)
        
        return SearchResult(
            query_id=query.query_id,
            chunks=combined_chunks[:query.max_results],
            total_candidates=vector_result.total_candidates + keyword_result.total_candidates,
            filtered_count=len(combined_chunks),
            strategy_used=SearchStrategy.HYBRID_SEARCH,
            query_expansion_applied=query.query_expansion_applied
        )
    
    async def _keyword_search(self, query: SearchQuery) -> SearchResult:
        """Perform keyword-based search"""
        
        # Simple keyword matching implementation
        # In production, would use more sophisticated text matching
        
        query_terms = query.original_query.lower().split()
        if query.expanded_queries:
            for expanded in query.expanded_queries:
                query_terms.extend(expanded.lower().split())
        
        # Remove duplicates
        query_terms = list(set(query_terms))
        
        # Search using knowledge base with keyword matching
        chunks = await self.knowledge_base.search_chunks(
            query=query.original_query,
            max_results=query.max_results * 2,  # Get more for filtering
            entity_type=list(query.entity_type_filters)[0] if query.entity_type_filters else None,
            tags=query.tag_filters,
            similarity_threshold=0.3  # Lower threshold for keyword search
        )
        
        # Score chunks based on keyword matching
        scored_chunks = []
        for chunk in chunks:
            keyword_score = self._calculate_keyword_score(chunk.content, query_terms)
            chunk.keyword_score = keyword_score
            if keyword_score >= self.config.min_chunk_relevance:
                scored_chunks.append(chunk)
        
        # Sort by keyword score
        scored_chunks.sort(key=lambda c: c.keyword_score, reverse=True)
        
        return SearchResult(
            query_id=query.query_id,
            chunks=scored_chunks[:query.max_results],
            total_candidates=len(chunks),
            filtered_count=len(scored_chunks),
            strategy_used=SearchStrategy.KEYWORD_SEARCH,
            query_expansion_applied=query.query_expansion_applied
        )
    
    async def _fuzzy_search(self, query: SearchQuery) -> SearchResult:
        """Perform fuzzy search for approximate matching"""
        
        # Placeholder for fuzzy search implementation
        # Would use techniques like Levenshtein distance, n-grams, etc.
        
        # For now, fall back to keyword search with lower thresholds
        fuzzy_query = SearchQuery(
            query_id=query.query_id,
            original_query=query.original_query,
            expanded_queries=query.expanded_queries,
            strategy=SearchStrategy.KEYWORD_SEARCH,
            similarity_threshold=0.2,  # Much lower threshold
            max_results=query.max_results,
            domain_filters=query.domain_filters,
            entity_type_filters=query.entity_type_filters,
            tag_filters=query.tag_filters
        )
        
        result = await self._keyword_search(fuzzy_query)
        result.strategy_used = SearchStrategy.FUZZY_SEARCH
        
        return result
    
    async def _apply_search_filters(
        self,
        chunks: List[DocumentChunk],
        query: SearchQuery
    ) -> List[DocumentChunk]:
        """Apply search filters to chunk list"""
        
        filtered_chunks = []
        
        for chunk in chunks:
            # Domain filter
            if query.domain_filters and not any(domain in chunk.metadata.tags for domain in query.domain_filters):
                continue
            
            # Entity type filter
            if query.entity_type_filters and not query.entity_type_filters.intersection(chunk.metadata.entity_types):
                continue
            
            # Date range filter
            if query.date_range_filter and hasattr(chunk.metadata, 'creation_date'):
                start_date, end_date = query.date_range_filter
                if chunk.metadata.creation_date < start_date or chunk.metadata.creation_date > end_date:
                    continue
            
            # Relevance threshold filter
            relevance_score = getattr(chunk, 'similarity_score', 0.5)
            if relevance_score < self.config.min_chunk_relevance:
                continue
            
            filtered_chunks.append(chunk)
        
        return filtered_chunks
    
    async def _post_process_results(self, result: SearchResult, query: SearchQuery) -> SearchResult:
        """Post-process search results"""
        
        if not result.chunks:
            return result
        
        # Calculate quality metrics
        relevance_scores = []
        for chunk in result.chunks:
            score = getattr(chunk, 'similarity_score', 0.5)
            relevance_scores.append(score)
            
            # Categorize by relevance
            if score >= self.config.high_relevance_threshold:
                result.high_relevance_count += 1
            elif score >= self.config.medium_relevance_threshold:
                result.medium_relevance_count += 1
            else:
                result.low_relevance_count += 1
        
        if relevance_scores:
            result.avg_relevance_score = sum(relevance_scores) / len(relevance_scores)
            result.min_relevance_score = min(relevance_scores)
            result.max_relevance_score = max(relevance_scores)
        
        # Apply domain-specific boosting
        if query.domain:
            result.chunks = await self._apply_domain_boosting(result.chunks, query.domain)
        
        return result
    
    async def _semantic_rerank(self, chunks: List[DocumentChunk], query: SearchQuery) -> List[DocumentChunk]:
        """Rerank chunks using semantic analysis"""
        
        # Placeholder for semantic reranking
        # In production, would use transformer models for contextual reranking
        
        return chunks  # Return as-is for now
    
    async def _apply_domain_boosting(self, chunks: List[DocumentChunk], domain: str) -> List[DocumentChunk]:
        """Apply domain-specific score boosting"""
        
        for chunk in chunks:
            if domain in chunk.metadata.tags:
                # Boost chunks with matching domain tags
                original_score = getattr(chunk, 'similarity_score', 0.5)
                chunk.similarity_score = min(1.0, original_score * self.config.domain_weight_multiplier)
        
        # Re-sort by updated scores
        chunks.sort(key=lambda c: getattr(c, 'similarity_score', 0), reverse=True)
        
        return chunks
    
    def _deduplicate_chunks(self, chunks: List[DocumentChunk]) -> List[DocumentChunk]:
        """Remove duplicate chunks"""
        seen_ids = set()
        unique_chunks = []
        
        for chunk in chunks:
            if chunk.chunk_id not in seen_ids:
                seen_ids.add(chunk.chunk_id)
                unique_chunks.append(chunk)
        
        return unique_chunks
    
    def _calculate_keyword_score(self, content: str, query_terms: List[str]) -> float:
        """Calculate keyword matching score"""
        
        content_lower = content.lower()
        matches = 0
        
        for term in query_terms:
            if term in content_lower:
                matches += 1
        
        return matches / len(query_terms) if query_terms else 0.0
    
    def _expand_with_synonyms(self, query: str) -> List[str]:
        """Expand query with synonyms"""
        expanded = []
        for word in query.lower().split():
            if word in self.synonym_dict:
                expanded.extend(self.synonym_dict[word][:2])  # Limit synonyms
        return expanded
    
    def _expand_with_domain_terms(self, query: str, domain: str) -> List[str]:
        """Expand query with domain-specific terms"""
        if domain in self.domain_terms_dict:
            return self.domain_terms_dict[domain][:3]  # Limit domain terms
        return []
    
    def _expand_with_related_terms(self, query: str) -> List[str]:
        """Expand query with related terms"""
        # Placeholder for related terms expansion
        # Would use word embeddings or knowledge graphs
        return []
    
    def _expand_with_context(self, query: str, investigation_id: str) -> List[str]:
        """Expand query with contextual terms"""
        # Placeholder for contextual expansion
        # Would analyze investigation context for relevant terms
        return []
    
    def _initialize_domain_patterns(self) -> Dict[str, List[str]]:
        """Initialize domain-specific query patterns"""
        return {
            "network": ["IP address", "network traffic", "connection pattern", "routing", "DNS"],
            "device": ["device fingerprint", "user agent", "hardware", "mobile device", "browser"],
            "location": ["geographic", "GPS", "travel pattern", "location data", "coordinates"],
            "logs": ["activity log", "session", "user behavior", "event log", "audit trail"],
            "risk": ["fraud detection", "risk score", "anomaly", "suspicious", "threat"]
        }
    
    def _initialize_synonym_dict(self) -> Dict[str, List[str]]:
        """Initialize synonym dictionary"""
        return {
            "fraud": ["scam", "deception", "cheating"],
            "suspicious": ["anomalous", "unusual", "questionable"],
            "network": ["connection", "communication", "traffic"],
            "device": ["equipment", "hardware", "gadget"],
            "location": ["place", "position", "coordinates"]
        }
    
    def _initialize_domain_terms(self) -> Dict[str, List[str]]:
        """Initialize domain-specific terms"""
        return {
            "network": ["protocol", "routing", "firewall", "proxy", "VPN"],
            "device": ["fingerprinting", "spoofing", "emulation", "identification"],
            "location": ["geolocation", "coordinates", "travel", "distance"],
            "logs": ["events", "sessions", "activities", "traces"],
            "risk": ["scoring", "assessment", "prediction", "classification"]
        }
    
    def _get_cached_result(self, query: SearchQuery) -> Optional[SearchResult]:
        """Get cached search result"""
        cache_key = self._create_cache_key(query)
        
        if cache_key in self.results_cache:
            result, timestamp = self.results_cache[cache_key]
            if (datetime.now() - timestamp).total_seconds() < self.config.cache_ttl_seconds:
                result.cache_hit = True
                return result
            else:
                del self.results_cache[cache_key]
        
        return None
    
    def _cache_result(self, query: SearchQuery, result: SearchResult) -> None:
        """Cache search result"""
        if len(self.results_cache) >= self.config.max_cache_entries:
            # Remove oldest entry
            oldest_key = min(self.results_cache.keys(),
                           key=lambda k: self.results_cache[k][1])
            del self.results_cache[oldest_key]
        
        cache_key = self._create_cache_key(query)
        self.results_cache[cache_key] = (result, datetime.now())
    
    def _create_cache_key(self, query: SearchQuery) -> str:
        """Create cache key for query"""
        import hashlib
        
        key_parts = [
            query.original_query,
            str(sorted(query.expanded_queries)),
            query.strategy.value,
            str(query.max_results),
            str(query.similarity_threshold),
            str(sorted(query.domain_filters)),
            str(sorted(query.entity_type_filters)),
            str(sorted(query.tag_filters))
        ]
        
        key_string = "|".join(key_parts)
        return hashlib.sha256(key_string.encode()).hexdigest()[:16]
    
    def _update_search_stats(self, search_time_ms: float, success: bool) -> None:
        """Update search performance statistics"""
        if success:
            self.search_stats["successful_searches"] += 1
        else:
            self.search_stats["failed_searches"] += 1
        
        # Update average search time (simplified running average)
        current_avg = self.search_stats["avg_search_time_ms"]
        new_avg = ((current_avg * (self.search_stats["total_searches"] - 1)) + search_time_ms) / self.search_stats["total_searches"]
        self.search_stats["avg_search_time_ms"] = new_avg
    
    async def clear_cache(self) -> None:
        """Clear results cache"""
        self.results_cache.clear()
        self.logger.info("Retrieval engine cache cleared")
    
    def get_performance_stats(self) -> Dict[str, Any]:
        """Get retrieval engine performance statistics"""
        cache_hit_rate = 0.0
        if self.search_stats["cache_hits"] + self.search_stats["cache_misses"] > 0:
            cache_hit_rate = self.search_stats["cache_hits"] / (self.search_stats["cache_hits"] + self.search_stats["cache_misses"])
        
        return {
            "search_statistics": self.search_stats.copy(),
            "cache_statistics": {
                "cached_results": len(self.results_cache),
                "cache_hit_rate": cache_hit_rate,
                "max_cache_entries": self.config.max_cache_entries
            },
            "configuration": {
                "default_strategy": self.config.default_strategy.value,
                "search_timeout_seconds": self.config.search_timeout_seconds,
                "max_concurrent_searches": self.config.max_concurrent_searches
            }
        }


# Factory function for easy initialization
def create_retrieval_engine(
    knowledge_base: KnowledgeBase,
    config: Optional[RetrievalEngineConfig] = None
) -> RetrievalEngine:
    """Create retrieval engine instance"""
    return RetrievalEngine(knowledge_base, config)