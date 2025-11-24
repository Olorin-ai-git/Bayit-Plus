"""
Vector RAG Service
Core RAG functionality with vector similarity search.
Supports PostgreSQL pgvector and SQLite.
"""

import uuid
import hashlib
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import text, select, func
from sqlalchemy.orm import selectinload

from app.service.database.vector_database_config import get_vector_db_config
from app.service.database.models import (
    DocumentCollection, Document, DocumentChunk, VectorBase
)
from app.service.rag.embedding_service import get_embedding_service
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


@dataclass
class SearchResult:
    """Vector search result."""
    chunk_id: str
    document_id: str
    document_title: str
    content: str
    similarity_score: float
    chunk_index: int
    metadata: Optional[Dict[str, Any]] = None
    keywords: Optional[List[str]] = None


@dataclass
class DocumentIngestResult:
    """Document ingestion result."""
    success: bool
    document_id: str
    chunk_count: int
    error_message: Optional[str] = None


class VectorRAGService:
    """Vector-based RAG service."""
    
    def __init__(self, embedding_service=None):
        """Initialize RAG service."""
        self.db_config = get_vector_db_config()
        self.embedding_service = embedding_service or get_embedding_service()
    
    async def create_collection(
        self,
        name: str,
        description: Optional[str] = None,
        metadata_schema: Optional[Dict[str, Any]] = None
    ) -> str:
        """Create document collection."""
        collection_id = str(uuid.uuid4())
        async with self.db_config.session() as session:
            collection = DocumentCollection(
                id=collection_id,
                name=name,
                description=description,
                metadata_schema=metadata_schema
            )
            session.add(collection)
            await session.commit()
        return collection_id
    
    async def get_collections(self) -> List[Dict[str, Any]]:
        """Get all collections."""
        async with self.db_config.session() as session:
            if self.db_config.is_postgresql:
                result = await session.execute(
                    select(DocumentCollection).where(DocumentCollection.is_active == True)
                )
                collections = result.scalars().all()
            else:
                result = session.execute(
                    select(DocumentCollection).where(DocumentCollection.is_active == True)
                )
                collections = result.scalars().all()
            
            return [
                {
                    "id": c.id,
                    "name": c.name,
                    "description": c.description,
                    "document_count": await self._count_documents(c.id)
                }
                for c in collections
            ]
    
    async def _count_documents(self, collection_id: str) -> int:
        """Count documents in collection."""
        async with self.db_config.session() as session:
            if self.db_config.is_postgresql:
                result = await session.execute(
                    select(func.count(Document.id)).where(
                        Document.collection_id == collection_id,
                        Document.is_active == True
                    )
                )
                return result.scalar() or 0
            else:
                result = session.execute(
                    select(func.count(Document.id)).where(
                        Document.collection_id == collection_id,
                        Document.is_active == True
                    )
                )
                return result.scalar() or 0
    
    async def ingest_document(
        self,
        collection_id: str,
        title: str,
        content: str,
        source_type: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        generate_embeddings: bool = True,
        document_id: Optional[str] = None
    ) -> DocumentIngestResult:
        """Ingest document with chunking and embedding."""
        try:
            if document_id is None:
                document_id = str(uuid.uuid4())
            
            chunks = self._chunk_content(content)
            logger.info(f"Ingesting document {document_id}: {len(chunks)} chunks to create")
            
            async with self.db_config.session() as session:
                # Check if document already exists (when document_id is provided)
                existing_document = None
                if document_id:
                    existing_doc_query = select(Document).where(Document.id == document_id)
                    if self.db_config.is_postgresql:
                        existing_result = await session.execute(existing_doc_query)
                    else:
                        existing_result = session.execute(existing_doc_query)
                    existing_document = existing_result.scalar_one_or_none()
                
                if existing_document:
                    # Update existing document
                    existing_document.title = title
                    existing_document.content = content
                    existing_document.source_type = source_type
                    existing_document.meta_data = metadata
                    # Delete existing chunks to recreate them
                    delete_chunks_query = select(DocumentChunk).where(
                        DocumentChunk.document_id == document_id
                    )
                    if self.db_config.is_postgresql:
                        chunks_result = await session.execute(delete_chunks_query)
                    else:
                        chunks_result = session.execute(delete_chunks_query)
                    existing_chunks = chunks_result.scalars().all()
                    for chunk in existing_chunks:
                        session.delete(chunk)
                    # Set document reference for later use
                    document = existing_document
                else:
                    # Create new document
                    document = Document(
                        id=document_id,
                        collection_id=collection_id,
                        title=title,
                        content=content,
                        source_type=source_type,
                        meta_data=metadata
                    )
                    session.add(document)
                
                chunks_created = 0
                for idx, chunk_text in enumerate(chunks):
                    try:
                        chunk_id = str(uuid.uuid4())
                        content_hash = hashlib.sha256(chunk_text.encode()).hexdigest()[:16]
                    
                        chunk = DocumentChunk(
                        id=chunk_id,
                        document_id=document_id,
                        chunk_index=idx,
                        content=chunk_text,
                        content_hash=content_hash
                        )
                    
                        if generate_embeddings:
                            embedding_result = await self.embedding_service.generate_embeddings(
                            [chunk_text],
                            provider="openai"
                        )
                            if embedding_result.success and embedding_result.embeddings:
                                if self.db_config.is_postgresql:
                                    chunk.embedding_openai = embedding_result.embeddings[0]
                                else:
                                    chunk.embedding_openai = embedding_result.embeddings[0]
                            else:
                                logger.warning(f"Failed to generate embedding for chunk {idx}: {embedding_result.error_message if hasattr(embedding_result, 'error_message') else 'Unknown error'}")
                    
                        session.add(chunk)
                        chunks_created += 1
                    except Exception as e:
                        logger.error(f"Failed to create chunk {idx} for document {document_id}: {e}", exc_info=True)
                        raise
                
                logger.info(f"Created {chunks_created} chunks for document {document_id}")
                
                # Flush to ensure chunks are added before context commits
                if self.db_config.is_postgresql:
                    await session.flush()
                else:
                    session.flush()
                # Session will auto-commit when context exits
            
            return DocumentIngestResult(
                success=True,
                document_id=document_id,
                chunk_count=len(chunks)
            )
        except Exception as e:
            logger.error(f"Document ingestion failed: {e}")
            return DocumentIngestResult(
                success=False,
                document_id="",
                chunk_count=0,
                error_message=str(e)
            )
    
    def _chunk_content(self, content: str, chunk_size: int = 512, overlap: int = 50) -> List[str]:
        """Chunk content into smaller pieces."""
        words = content.split()
        chunks = []
        current_chunk = []
        current_length = 0
        
        for word in words:
            word_length = len(word) + 1
            if current_length + word_length > chunk_size and current_chunk:
                chunks.append(" ".join(current_chunk))
                current_chunk = current_chunk[-overlap:] if overlap > 0 else []
                current_length = sum(len(w) + 1 for w in current_chunk)
            current_chunk.append(word)
            current_length += word_length
        
        if current_chunk:
            chunks.append(" ".join(current_chunk))
        
        return chunks if chunks else [content]
    
    async def search_similar(
        self,
        query: str,
        collection_ids: Optional[List[str]] = None,
        limit: int = 10,
        similarity_threshold: float = 0.7,
        embedding_type: str = "openai",
        user_id: Optional[str] = None,
        investigation_id: Optional[str] = None
    ) -> List[SearchResult]:
        """Search similar documents using vector similarity."""
        try:
            embedding_result = await self.embedding_service.generate_embeddings(
                [query],
                provider="openai" if embedding_type == "openai" else "huggingface"
            )
            
            if not embedding_result.success or not embedding_result.embeddings:
                logger.error("Failed to generate query embedding")
                return []
            
            query_embedding = embedding_result.embeddings[0]
            
            if self.db_config.is_postgresql:
                return await self._search_postgresql(
                    query_embedding, collection_ids, limit, similarity_threshold, embedding_type
                )
            else:
                return await self._search_sqlite(
                    query_embedding, collection_ids, limit, similarity_threshold
                )
        except Exception as e:
            logger.error(f"Vector search failed: {e}")
            return []
    
    async def _search_postgresql(
        self,
        query_embedding: List[float],
        collection_ids: Optional[List[str]],
        limit: int,
        threshold: float,
        embedding_type: str
    ) -> List[SearchResult]:
        """Search using PostgreSQL pgvector."""
        embedding_column = f"embedding_{embedding_type}"
        
        query_sql = f"""
            SELECT 
                dc.id as chunk_id,
                dc.document_id,
                d.title as document_title,
                dc.content,
                1 - (dc.{embedding_column} <=> :query_vec::vector) as similarity_score,
                dc.chunk_index,
                dc.meta_data
            FROM document_chunks dc
            JOIN documents d ON dc.document_id = d.id
            WHERE dc.is_active = true
            AND d.is_active = true
            AND dc.{embedding_column} IS NOT NULL
        """
        
        if collection_ids:
            query_sql += " AND d.collection_id = ANY(:collection_ids)"
        
        query_sql += f"""
            ORDER BY dc.{embedding_column} <=> :query_vec::vector
            LIMIT :limit
        """
        
        params = {
            "query_vec": str(query_embedding),
            "limit": limit
        }
        if collection_ids:
            params["collection_ids"] = collection_ids
        
        async with self.db_config.session() as session:
            result = await session.execute(text(query_sql), params)
            rows = result.fetchall()
            
            return [
                SearchResult(
                    chunk_id=str(row.chunk_id),
                    document_id=str(row.document_id),
                    document_title=row.document_title,
                    content=row.content,
                    similarity_score=float(row.similarity_score),
                    chunk_index=row.chunk_index,
                    metadata=row.meta_data
                )
                for row in rows
                if row.similarity_score >= threshold
            ]
    
    async def _search_sqlite(
        self,
        query_embedding: List[float],
        collection_ids: Optional[List[str]],
        limit: int,
        threshold: float
    ) -> List[SearchResult]:
        """Search using SQLite (cosine similarity calculation)."""
        import numpy as np
        
        query_vec = np.array(query_embedding)
        query_norm = np.linalg.norm(query_vec)
        
        async with self.db_config.session() as session:
            query = select(DocumentChunk, Document).join(
                Document, DocumentChunk.document_id == Document.id
            ).where(
                DocumentChunk.is_active == True,
                Document.is_active == True,
                DocumentChunk.embedding_openai.isnot(None)
            )
            
            if collection_ids:
                query = query.where(Document.collection_id.in_(collection_ids))
            
            if self.db_config.is_postgresql:
                result = await session.execute(query)
            else:
                result = session.execute(query)
            
            rows = result.all()
            results = []
            
            for chunk, doc in rows:
                chunk_vec = np.array(chunk.embedding_openai)
                chunk_norm = np.linalg.norm(chunk_vec)
                
                if chunk_norm == 0 or query_norm == 0:
                    continue
                
                similarity = np.dot(query_vec, chunk_vec) / (query_norm * chunk_norm)
                
                if similarity >= threshold:
                    results.append(SearchResult(
                        chunk_id=chunk.id,
                        document_id=chunk.document_id,
                        document_title=doc.title,
                        content=chunk.content,
                        similarity_score=float(similarity),
                        chunk_index=chunk.chunk_index,
                        metadata=chunk.meta_data
                    ))
            
            results.sort(key=lambda x: x.similarity_score, reverse=True)
            return results[:limit]
    
    async def regenerate_embeddings(self, embedding_type: str = "openai") -> int:
        """Regenerate embeddings for all chunks."""
        processed = 0
        async with self.db_config.session() as session:
            query = select(DocumentChunk).where(
                DocumentChunk.is_active == True
            ).limit(100)
            
            if self.db_config.is_postgresql:
                result = await session.execute(query)
            else:
                result = session.execute(query)
            
            chunks = result.scalars().all()
            
            for chunk in chunks:
                embedding_result = await self.embedding_service.generate_embeddings(
                    [chunk.content],
                    provider="openai" if embedding_type == "openai" else "huggingface"
                )
                
                if embedding_result.success and embedding_result.embeddings:
                    if self.db_config.is_postgresql:
                        chunk.embedding_openai = embedding_result.embeddings[0]
                    else:
                        chunk.embedding_openai = embedding_result.embeddings[0]
                    processed += 1
            
            await session.commit()
        
        return processed


_global_rag_service: Optional[VectorRAGService] = None


def get_rag_service(embedding_service=None) -> VectorRAGService:
    """Get global RAG service instance."""
    global _global_rag_service
    if _global_rag_service is None:
        _global_rag_service = VectorRAGService(embedding_service)
    return _global_rag_service

