"""
Knowledge Base

Advanced knowledge management system for fraud investigation domain knowledge,
case histories, patterns, and contextual information retrieval.
"""

import asyncio
import hashlib
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional, Set, Union, Tuple
import uuid
import re
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class ChunkingStrategy(Enum):
    """Document chunking strategies"""
    
    FIXED_SIZE = "fixed_size"
    SEMANTIC_SPLIT = "semantic_split"
    PARAGRAPH_BASED = "paragraph_based"
    SENTENCE_BASED = "sentence_based"
    SLIDING_WINDOW = "sliding_window"
    HIERARCHICAL = "hierarchical"


@dataclass
class DocumentMetadata:
    """Document metadata for knowledge base entries"""
    
    document_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    title: str = ""
    source: str = ""
    author: str = ""
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    
    # Content classification
    document_type: str = "general"  # case, pattern, rule, guide, etc.
    domain: str = "fraud_investigation"
    category: str = "general"
    tags: Set[str] = field(default_factory=set)
    
    # Investigation context
    entity_types: Set[str] = field(default_factory=set)  # device, location, network, etc.
    investigation_types: Set[str] = field(default_factory=set)  # behavioral, device, etc.
    risk_levels: Set[str] = field(default_factory=set)  # low, medium, high, critical
    
    # Content properties
    language: str = "en"
    content_length: int = 0
    chunk_count: int = 0
    
    # Access control
    access_level: str = "public"  # public, internal, restricted, confidential
    created_by: str = "system"
    
    # Custom metadata
    custom_fields: Dict[str, Any] = field(default_factory=dict)
    
    def add_tag(self, tag: str) -> None:
        """Add tag to document"""
        self.tags.add(tag.lower())
    
    def has_tag(self, tag: str) -> bool:
        """Check if document has tag"""
        return tag.lower() in self.tags
    
    def is_relevant_for_entity(self, entity_type: str) -> bool:
        """Check if document is relevant for entity type"""
        return entity_type in self.entity_types or not self.entity_types
    
    def is_relevant_for_investigation(self, investigation_type: str) -> bool:
        """Check if document is relevant for investigation type"""
        return investigation_type in self.investigation_types or not self.investigation_types


@dataclass
class DocumentChunk:
    """Document chunk with embeddings and metadata"""
    
    chunk_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    document_id: str = ""
    chunk_index: int = 0
    
    # Content
    content: str = ""
    content_type: str = "text"
    content_hash: str = ""
    
    # Position in document
    start_position: int = 0
    end_position: int = 0
    
    # Embeddings
    embedding_vector: Optional[List[float]] = None
    embedding_model: str = ""
    embedding_dimensions: int = 0
    
    # Context
    preceding_context: str = ""
    following_context: str = ""
    
    # Chunk metadata
    chunk_type: str = "content"  # content, header, title, code, etc.
    importance_score: float = 0.0
    keyword_density: Dict[str, float] = field(default_factory=dict)
    
    # Processing metadata
    created_at: datetime = field(default_factory=datetime.now)
    processed_at: Optional[datetime] = None
    
    def __post_init__(self):
        """Initialize chunk after creation"""
        if not self.content_hash and self.content:
            self.content_hash = hashlib.sha256(self.content.encode()).hexdigest()[:16]
    
    def calculate_relevance_score(self, query_terms: Set[str]) -> float:
        """Calculate relevance score for query terms"""
        if not query_terms or not self.content:
            return 0.0
        
        content_lower = self.content.lower()
        total_score = 0.0
        
        for term in query_terms:
            term_lower = term.lower()
            
            # Exact matches
            exact_matches = content_lower.count(term_lower)
            total_score += exact_matches * 1.0
            
            # Partial matches (stemming-like)
            if len(term) > 3:
                partial_matches = sum(1 for word in content_lower.split() 
                                    if term_lower in word or word in term_lower)
                total_score += partial_matches * 0.5
        
        # Normalize by content length
        normalized_score = total_score / max(len(self.content.split()), 1)
        
        # Apply importance multiplier
        return normalized_score * (1.0 + self.importance_score)
    
    def get_context_window(self, window_size: int = 200) -> str:
        """Get content with context window"""
        context_parts = []
        
        if self.preceding_context:
            context_parts.append(self.preceding_context[-window_size:])
        
        context_parts.append(self.content)
        
        if self.following_context:
            context_parts.append(self.following_context[:window_size])
        
        return " ... ".join(context_parts)


@dataclass
class KnowledgeBaseConfig:
    """Configuration for knowledge base"""
    
    # Storage settings
    storage_backend: str = "memory"  # memory, sqlite, postgresql, elasticsearch
    storage_connection: str = ""
    
    # Chunking settings
    chunking_strategy: ChunkingStrategy = ChunkingStrategy.SEMANTIC_SPLIT
    chunk_size: int = 512
    chunk_overlap: int = 50
    max_chunk_size: int = 2048
    min_chunk_size: int = 100
    
    # Embedding settings
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    embedding_dimensions: int = 384
    enable_embeddings: bool = True
    batch_embedding_size: int = 32
    
    # Search settings
    max_search_results: int = 50
    similarity_threshold: float = 0.7
    enable_semantic_search: bool = True
    enable_keyword_search: bool = True
    
    # Content processing
    enable_preprocessing: bool = True
    remove_stopwords: bool = True
    normalize_text: bool = True
    extract_entities: bool = True
    
    # Caching
    enable_caching: bool = True
    cache_ttl_seconds: int = 3600
    max_cache_size: int = 10000
    
    # Performance
    max_concurrent_operations: int = 10
    embedding_cache_size: int = 5000


class KnowledgeBase:
    """
    Advanced knowledge base for fraud investigation domain knowledge.
    
    Features:
    - Multi-strategy document chunking
    - Semantic and keyword search
    - Vector embeddings for similarity search
    - Domain-specific metadata and categorization
    - Investigation context awareness
    - Performance optimization with caching
    - Concurrent processing support
    """
    
    def __init__(self, config: KnowledgeBaseConfig):
        """Initialize knowledge base"""
        self.config = config
        
        # Document and chunk storage
        self.documents: Dict[str, DocumentMetadata] = {}
        self.chunks: Dict[str, DocumentChunk] = {}
        self.document_chunks: Dict[str, List[str]] = {}  # document_id -> chunk_ids
        
        # Search indices
        self.content_index: Dict[str, Set[str]] = {}  # term -> chunk_ids
        self.tag_index: Dict[str, Set[str]] = {}  # tag -> document_ids
        self.category_index: Dict[str, Set[str]] = {}  # category -> document_ids
        self.entity_type_index: Dict[str, Set[str]] = {}  # entity_type -> document_ids
        
        # Embedding storage (in-memory for now)
        self.chunk_embeddings: Dict[str, List[float]] = {}
        self.embedding_model_name = config.embedding_model
        
        # Caching
        self.search_cache: Dict[str, Tuple[List[str], datetime]] = {}
        self.embedding_cache: Dict[str, List[float]] = {}
        
        # Statistics
        self.stats = {
            'documents_indexed': 0,
            'chunks_created': 0,
            'searches_performed': 0,
            'cache_hits': 0,
            'cache_misses': 0,
            'start_time': datetime.now()
        }
        
        self.logger = get_bridge_logger(f"{__name__}.knowledge_base")
        
        # Initialize embedding model (placeholder)
        self.embedding_model = None
        if config.enable_embeddings:
            self._initialize_embedding_model()
    
    def _initialize_embedding_model(self) -> None:
        """Initialize embedding model"""
        try:
            # Placeholder for actual embedding model initialization
            # In real implementation, would initialize sentence-transformers or similar
            self.logger.info(f"Initializing embedding model: {self.config.embedding_model}")
            self.embedding_model = "placeholder_model"
        except Exception as e:
            self.logger.error(f"Failed to initialize embedding model: {str(e)}")
            self.config.enable_embeddings = False
    
    async def add_document(
        self,
        content: str,
        metadata: Optional[DocumentMetadata] = None,
        process_immediately: bool = True
    ) -> str:
        """Add document to knowledge base"""
        
        try:
            # Create or use provided metadata
            if metadata is None:
                metadata = DocumentMetadata()
            
            # Update content properties
            metadata.content_length = len(content)
            metadata.updated_at = datetime.now()
            
            # Store document
            self.documents[metadata.document_id] = metadata
            
            # Process document into chunks
            if process_immediately:
                await self._process_document(metadata.document_id, content)
            
            # Update statistics
            self.stats['documents_indexed'] += 1
            
            # Update indices
            self._update_document_indices(metadata)
            
            self.logger.info(f"Added document {metadata.document_id} with {metadata.content_length} characters")
            return metadata.document_id
            
        except Exception as e:
            self.logger.error(f"Failed to add document: {str(e)}")
            raise
    
    async def _process_document(self, document_id: str, content: str) -> None:
        """Process document into chunks"""
        
        try:
            # Apply chunking strategy
            chunks = await self._chunk_content(content, document_id)
            
            # Store chunks
            chunk_ids = []
            for chunk in chunks:
                self.chunks[chunk.chunk_id] = chunk
                chunk_ids.append(chunk.chunk_id)
                
                # Generate embeddings if enabled
                if self.config.enable_embeddings:
                    await self._generate_chunk_embedding(chunk)
                
                # Update content index
                self._update_content_index(chunk)
            
            # Update document-chunk mapping
            self.document_chunks[document_id] = chunk_ids
            
            # Update document metadata
            if document_id in self.documents:
                self.documents[document_id].chunk_count = len(chunk_ids)
            
            self.stats['chunks_created'] += len(chunks)
            
        except Exception as e:
            self.logger.error(f"Failed to process document {document_id}: {str(e)}")
            raise
    
    async def _chunk_content(self, content: str, document_id: str) -> List[DocumentChunk]:
        """Chunk content based on strategy"""
        
        strategy = self.config.chunking_strategy
        
        if strategy == ChunkingStrategy.FIXED_SIZE:
            return await self._chunk_fixed_size(content, document_id)
        elif strategy == ChunkingStrategy.SEMANTIC_SPLIT:
            return await self._chunk_semantic_split(content, document_id)
        elif strategy == ChunkingStrategy.PARAGRAPH_BASED:
            return await self._chunk_paragraph_based(content, document_id)
        elif strategy == ChunkingStrategy.SENTENCE_BASED:
            return await self._chunk_sentence_based(content, document_id)
        elif strategy == ChunkingStrategy.SLIDING_WINDOW:
            return await self._chunk_sliding_window(content, document_id)
        else:
            # Default to fixed size
            return await self._chunk_fixed_size(content, document_id)
    
    async def _chunk_fixed_size(self, content: str, document_id: str) -> List[DocumentChunk]:
        """Fixed size chunking"""
        chunks = []
        chunk_size = self.config.chunk_size
        overlap = self.config.chunk_overlap
        
        for i in range(0, len(content), chunk_size - overlap):
            chunk_content = content[i:i + chunk_size]
            
            if len(chunk_content) < self.config.min_chunk_size and i > 0:
                # Merge small trailing chunk with previous
                if chunks:
                    chunks[-1].content += " " + chunk_content
                    chunks[-1].end_position = i + len(chunk_content)
                continue
            
            chunk = DocumentChunk(
                document_id=document_id,
                chunk_index=len(chunks),
                content=chunk_content,
                start_position=i,
                end_position=i + len(chunk_content)
            )
            
            chunks.append(chunk)
        
        return chunks
    
    async def _chunk_semantic_split(self, content: str, document_id: str) -> List[DocumentChunk]:
        """Semantic splitting based on natural breaks"""
        
        # Simple implementation - split on double newlines and long sentences
        paragraphs = re.split(r'\n\s*\n', content)
        chunks = []
        
        current_chunk = ""
        current_position = 0
        
        for paragraph in paragraphs:
            paragraph = paragraph.strip()
            if not paragraph:
                continue
            
            # If adding this paragraph exceeds chunk size, finalize current chunk
            if len(current_chunk) + len(paragraph) > self.config.chunk_size and current_chunk:
                chunk = DocumentChunk(
                    document_id=document_id,
                    chunk_index=len(chunks),
                    content=current_chunk.strip(),
                    start_position=current_position,
                    end_position=current_position + len(current_chunk)
                )
                chunks.append(chunk)
                
                current_position += len(current_chunk)
                current_chunk = paragraph
            else:
                if current_chunk:
                    current_chunk += "\n\n" + paragraph
                else:
                    current_chunk = paragraph
        
        # Add final chunk
        if current_chunk:
            chunk = DocumentChunk(
                document_id=document_id,
                chunk_index=len(chunks),
                content=current_chunk.strip(),
                start_position=current_position,
                end_position=current_position + len(current_chunk)
            )
            chunks.append(chunk)
        
        return chunks
    
    async def _chunk_paragraph_based(self, content: str, document_id: str) -> List[DocumentChunk]:
        """Paragraph-based chunking"""
        
        paragraphs = re.split(r'\n\s*\n', content)
        chunks = []
        position = 0
        
        for i, paragraph in enumerate(paragraphs):
            paragraph = paragraph.strip()
            if not paragraph:
                continue
            
            chunk = DocumentChunk(
                document_id=document_id,
                chunk_index=len(chunks),
                content=paragraph,
                start_position=position,
                end_position=position + len(paragraph),
                chunk_type="paragraph"
            )
            
            chunks.append(chunk)
            position += len(paragraph) + 2  # Account for paragraph breaks
        
        return chunks
    
    async def _chunk_sentence_based(self, content: str, document_id: str) -> List[DocumentChunk]:
        """Sentence-based chunking"""
        
        # Simple sentence splitting
        sentences = re.split(r'[.!?]+\s+', content)
        chunks = []
        position = 0
        
        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence or len(sentence) < self.config.min_chunk_size:
                continue
            
            chunk = DocumentChunk(
                document_id=document_id,
                chunk_index=len(chunks),
                content=sentence,
                start_position=position,
                end_position=position + len(sentence),
                chunk_type="sentence"
            )
            
            chunks.append(chunk)
            position += len(sentence) + 1
        
        return chunks
    
    async def _chunk_sliding_window(self, content: str, document_id: str) -> List[DocumentChunk]:
        """Sliding window chunking"""
        
        chunks = []
        chunk_size = self.config.chunk_size
        step_size = chunk_size // 2  # 50% overlap
        
        for i in range(0, len(content), step_size):
            chunk_content = content[i:i + chunk_size]
            
            if len(chunk_content) < self.config.min_chunk_size:
                break
            
            chunk = DocumentChunk(
                document_id=document_id,
                chunk_index=len(chunks),
                content=chunk_content,
                start_position=i,
                end_position=i + len(chunk_content)
            )
            
            chunks.append(chunk)
        
        return chunks
    
    async def _generate_chunk_embedding(self, chunk: DocumentChunk) -> None:
        """Generate embedding for chunk"""
        
        try:
            # Check cache first
            cache_key = f"{chunk.content_hash}_{self.embedding_model_name}"
            if cache_key in self.embedding_cache:
                chunk.embedding_vector = self.embedding_cache[cache_key]
                return
            
            # Generate embedding (placeholder implementation)
            if self.embedding_model:
                # In real implementation, would use actual embedding model
                # embedding = self.embedding_model.encode(chunk.content)
                
                # Placeholder: generate random embedding for demonstration
                import random
                embedding = [random.random() for _ in range(self.config.embedding_dimensions)]
                
                chunk.embedding_vector = embedding
                chunk.embedding_model = self.embedding_model_name
                chunk.embedding_dimensions = len(embedding)
                
                # Cache embedding
                self.embedding_cache[cache_key] = embedding
                
                # Store in chunk embeddings
                self.chunk_embeddings[chunk.chunk_id] = embedding
        
        except Exception as e:
            self.logger.error(f"Failed to generate embedding for chunk {chunk.chunk_id}: {str(e)}")
    
    def _update_content_index(self, chunk: DocumentChunk) -> None:
        """Update content search index"""
        
        # Simple tokenization and indexing
        content_lower = chunk.content.lower()
        
        # Extract words
        words = re.findall(r'\b\w+\b', content_lower)
        
        # Remove stopwords if enabled
        if self.config.remove_stopwords:
            stopwords = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'can', 'may', 'might', 'must'}
            words = [word for word in words if word not in stopwords]
        
        # Update index
        for word in set(words):  # Use set to avoid duplicates
            if word not in self.content_index:
                self.content_index[word] = set()
            self.content_index[word].add(chunk.chunk_id)
        
        # Calculate keyword density
        if words:
            word_counts = {}
            for word in words:
                word_counts[word] = word_counts.get(word, 0) + 1
            
            chunk.keyword_density = {
                word: count / len(words) for word, count in word_counts.items()
            }
    
    def _update_document_indices(self, metadata: DocumentMetadata) -> None:
        """Update document indices"""
        
        document_id = metadata.document_id
        
        # Tag index
        for tag in metadata.tags:
            if tag not in self.tag_index:
                self.tag_index[tag] = set()
            self.tag_index[tag].add(document_id)
        
        # Category index
        if metadata.category not in self.category_index:
            self.category_index[metadata.category] = set()
        self.category_index[metadata.category].add(document_id)
        
        # Entity type index
        for entity_type in metadata.entity_types:
            if entity_type not in self.entity_type_index:
                self.entity_type_index[entity_type] = set()
            self.entity_type_index[entity_type].add(document_id)
    
    async def search_chunks(
        self,
        query: str,
        max_results: int = None,
        entity_type: Optional[str] = None,
        investigation_type: Optional[str] = None,
        tags: Optional[Set[str]] = None,
        similarity_threshold: float = None
    ) -> List[DocumentChunk]:
        """Search for relevant chunks"""
        
        try:
            max_results = max_results or self.config.max_search_results
            similarity_threshold = similarity_threshold or self.config.similarity_threshold
            
            # Check cache
            cache_key = self._create_search_cache_key(query, entity_type, investigation_type, tags)
            if self.config.enable_caching and cache_key in self.search_cache:
                cached_results, timestamp = self.search_cache[cache_key]
                if datetime.now() - timestamp < timedelta(seconds=self.config.cache_ttl_seconds):
                    self.stats['cache_hits'] += 1
                    return [self.chunks[chunk_id] for chunk_id in cached_results if chunk_id in self.chunks]
            
            self.stats['cache_misses'] += 1
            
            # Combine search strategies
            chunk_scores = {}
            
            # Keyword search
            if self.config.enable_keyword_search:
                keyword_results = await self._keyword_search(query)
                for chunk_id, score in keyword_results.items():
                    chunk_scores[chunk_id] = chunk_scores.get(chunk_id, 0) + score
            
            # Semantic search
            if self.config.enable_semantic_search and self.config.enable_embeddings:
                semantic_results = await self._semantic_search(query, similarity_threshold)
                for chunk_id, score in semantic_results.items():
                    chunk_scores[chunk_id] = chunk_scores.get(chunk_id, 0) + score
            
            # Filter by metadata criteria
            filtered_chunks = self._filter_chunks_by_metadata(
                chunk_scores.keys(), entity_type, investigation_type, tags
            )
            
            # Sort by combined score and take top results
            sorted_chunks = sorted(
                [(chunk_id, chunk_scores[chunk_id]) for chunk_id in filtered_chunks],
                key=lambda x: x[1],
                reverse=True
            )[:max_results]
            
            # Get chunk objects
            result_chunks = [self.chunks[chunk_id] for chunk_id, _ in sorted_chunks]
            
            # Cache results
            if self.config.enable_caching:
                result_ids = [chunk.chunk_id for chunk in result_chunks]
                self.search_cache[cache_key] = (result_ids, datetime.now())
            
            # Update statistics
            self.stats['searches_performed'] += 1
            
            return result_chunks
            
        except Exception as e:
            self.logger.error(f"Search failed for query '{query}': {str(e)}")
            return []
    
    async def _keyword_search(self, query: str) -> Dict[str, float]:
        """Perform keyword-based search"""
        
        query_terms = set(re.findall(r'\b\w+\b', query.lower()))
        
        if self.config.remove_stopwords:
            stopwords = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'}
            query_terms = query_terms - stopwords
        
        chunk_scores = {}
        
        for term in query_terms:
            if term in self.content_index:
                for chunk_id in self.content_index[term]:
                    if chunk_id in self.chunks:
                        # Calculate relevance score
                        chunk = self.chunks[chunk_id]
                        score = chunk.calculate_relevance_score(query_terms)
                        chunk_scores[chunk_id] = chunk_scores.get(chunk_id, 0) + score
        
        return chunk_scores
    
    async def _semantic_search(self, query: str, threshold: float) -> Dict[str, float]:
        """Perform semantic similarity search"""
        
        try:
            # Generate query embedding
            query_embedding = await self._generate_query_embedding(query)
            if not query_embedding:
                return {}
            
            chunk_scores = {}
            
            # Calculate similarity with all chunk embeddings
            for chunk_id, chunk_embedding in self.chunk_embeddings.items():
                similarity = self._calculate_cosine_similarity(query_embedding, chunk_embedding)
                
                if similarity >= threshold:
                    chunk_scores[chunk_id] = similarity
            
            return chunk_scores
            
        except Exception as e:
            self.logger.error(f"Semantic search failed: {str(e)}")
            return {}
    
    async def _generate_query_embedding(self, query: str) -> Optional[List[float]]:
        """Generate embedding for search query"""
        
        try:
            # Check cache
            cache_key = f"query_{hashlib.sha256(query.encode()).hexdigest()[:16]}"
            if cache_key in self.embedding_cache:
                return self.embedding_cache[cache_key]
            
            # Generate embedding (placeholder)
            if self.embedding_model:
                # In real implementation: embedding = self.embedding_model.encode(query)
                
                # Placeholder: generate random embedding
                import random
                embedding = [random.random() for _ in range(self.config.embedding_dimensions)]
                
                # Cache embedding
                self.embedding_cache[cache_key] = embedding
                return embedding
            
            return None
            
        except Exception as e:
            self.logger.error(f"Failed to generate query embedding: {str(e)}")
            return None
    
    def _calculate_cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Calculate cosine similarity between vectors"""
        
        if len(vec1) != len(vec2):
            return 0.0
        
        import math
        
        dot_product = sum(a * b for a, b in zip(vec1, vec2))
        magnitude1 = math.sqrt(sum(a * a for a in vec1))
        magnitude2 = math.sqrt(sum(a * a for a in vec2))
        
        if magnitude1 == 0 or magnitude2 == 0:
            return 0.0
        
        return dot_product / (magnitude1 * magnitude2)
    
    def _filter_chunks_by_metadata(
        self,
        chunk_ids: List[str],
        entity_type: Optional[str] = None,
        investigation_type: Optional[str] = None,
        tags: Optional[Set[str]] = None
    ) -> List[str]:
        """Filter chunks by metadata criteria"""
        
        filtered_ids = []
        
        for chunk_id in chunk_ids:
            chunk = self.chunks.get(chunk_id)
            if not chunk:
                continue
            
            document = self.documents.get(chunk.document_id)
            if not document:
                continue
            
            # Check entity type
            if entity_type and not document.is_relevant_for_entity(entity_type):
                continue
            
            # Check investigation type
            if investigation_type and not document.is_relevant_for_investigation(investigation_type):
                continue
            
            # Check tags
            if tags and not any(document.has_tag(tag) for tag in tags):
                continue
            
            filtered_ids.append(chunk_id)
        
        return filtered_ids
    
    def _create_search_cache_key(
        self,
        query: str,
        entity_type: Optional[str] = None,
        investigation_type: Optional[str] = None,
        tags: Optional[Set[str]] = None
    ) -> str:
        """Create cache key for search"""
        
        key_parts = [query]
        
        if entity_type:
            key_parts.append(f"entity:{entity_type}")
        if investigation_type:
            key_parts.append(f"investigation:{investigation_type}")
        if tags:
            key_parts.append(f"tags:{','.join(sorted(tags))}")
        
        key_string = "|".join(key_parts)
        return hashlib.sha256(key_string.encode()).hexdigest()[:16]
    
    def get_document(self, document_id: str) -> Optional[DocumentMetadata]:
        """Get document metadata"""
        return self.documents.get(document_id)
    
    def get_chunk(self, chunk_id: str) -> Optional[DocumentChunk]:
        """Get chunk by ID"""
        return self.chunks.get(chunk_id)
    
    def get_document_chunks(self, document_id: str) -> List[DocumentChunk]:
        """Get all chunks for a document"""
        chunk_ids = self.document_chunks.get(document_id, [])
        return [self.chunks[chunk_id] for chunk_id in chunk_ids if chunk_id in self.chunks]
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get knowledge base statistics"""
        
        uptime = (datetime.now() - self.stats['start_time']).total_seconds()
        
        return {
            'knowledge_base_status': {
                'uptime_seconds': uptime,
                'documents_count': len(self.documents),
                'chunks_count': len(self.chunks),
                'embeddings_cached': len(self.embedding_cache),
                'search_cache_size': len(self.search_cache)
            },
            'processing_stats': {
                'documents_indexed': self.stats['documents_indexed'],
                'chunks_created': self.stats['chunks_created'],
                'searches_performed': self.stats['searches_performed'],
                'cache_hit_rate': self.stats['cache_hits'] / max(1, self.stats['cache_hits'] + self.stats['cache_misses'])
            },
            'index_stats': {
                'content_terms': len(self.content_index),
                'categories': len(self.category_index),
                'tags': len(self.tag_index),
                'entity_types': len(self.entity_type_index)
            },
            'configuration': {
                'chunking_strategy': self.config.chunking_strategy.value,
                'chunk_size': self.config.chunk_size,
                'embedding_model': self.config.embedding_model,
                'embeddings_enabled': self.config.enable_embeddings,
                'semantic_search_enabled': self.config.enable_semantic_search
            }
        }
    
    async def rebuild_indices(self) -> None:
        """Rebuild all search indices"""
        
        self.logger.info("Rebuilding knowledge base indices...")
        
        # Clear existing indices
        self.content_index.clear()
        self.tag_index.clear()
        self.category_index.clear()
        self.entity_type_index.clear()
        
        # Rebuild document indices
        for document in self.documents.values():
            self._update_document_indices(document)
        
        # Rebuild content indices
        for chunk in self.chunks.values():
            self._update_content_index(chunk)
        
        # Clear cache
        self.search_cache.clear()
        
        self.logger.info("Knowledge base indices rebuilt")