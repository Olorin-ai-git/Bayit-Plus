"""
Vector Database Models
SQLAlchemy models for RAG system with PostgreSQL pgvector and SQLite support.
"""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Column, String, Text, Integer, Float, Boolean, DateTime, JSON, Index
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.sql import func
from sqlalchemy.orm import declarative_base

try:
    from pgvector.sqlalchemy import Vector
    PGVECTOR_AVAILABLE = True
except ImportError:
    PGVECTOR_AVAILABLE = False
    Vector = None

VectorBase = declarative_base()


class TimestampMixin:
    """Mixin for created_at and updated_at timestamps."""
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)


class DocumentCollection(VectorBase, TimestampMixin):
    """Document collection/knowledge base."""
    __tablename__ = "document_collections"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    metadata_schema = Column(JSON, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    
    def __repr__(self):
        return f"<DocumentCollection(id={self.id}, name={self.name})>"


class Document(VectorBase, TimestampMixin):
    """Document in a collection."""
    __tablename__ = "documents"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    collection_id = Column(String, nullable=False, index=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    source_type = Column(String, nullable=True)
    source_url = Column(String, nullable=True)
    meta_data = Column(JSON, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    
    __table_args__ = (
        Index("idx_documents_collection", "collection_id", "is_active"),
    )
    
    def __repr__(self):
        return f"<Document(id={self.id}, title={self.title[:50]})>"


class DocumentChunk(VectorBase, TimestampMixin):
    """Document chunk with vector embeddings."""
    __tablename__ = "document_chunks"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String, nullable=False, index=True)
    chunk_index = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    content_hash = Column(String, nullable=True, index=True)
    
    if PGVECTOR_AVAILABLE:
        embedding_openai = Column(Vector(1536), nullable=True)
        embedding_sentence = Column(Vector(384), nullable=True)
        embedding_openai_large = Column(Vector(3072), nullable=True)
    else:
        embedding_openai = Column(JSON, nullable=True)
        embedding_sentence = Column(JSON, nullable=True)
        embedding_openai_large = Column(JSON, nullable=True)
    
    meta_data = Column(JSON, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    
    __table_args__ = (
        Index("idx_chunks_document", "document_id", "chunk_index"),
    )
    
    def __repr__(self):
        return f"<DocumentChunk(id={self.id}, document_id={self.document_id}, index={self.chunk_index})>"


class RAGDataSource(VectorBase, TimestampMixin):
    """RAG data source configuration."""
    __tablename__ = "rag_data_sources"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False, unique=True, index=True)
    source_type = Column(String, nullable=False, index=True)
    connection_config = Column(JSON, nullable=False)
    enabled = Column(Boolean, default=True, nullable=False, index=True)
    status = Column(String, default="disconnected", nullable=False)
    last_checked = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)
    
    def __repr__(self):
        return f"<RAGDataSource(id={self.id}, name={self.name}, type={self.source_type})>"


class RAGConfiguration(VectorBase, TimestampMixin):
    """RAG system configuration."""
    __tablename__ = "rag_configurations"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    config_key = Column(String, nullable=False, unique=True, index=True)
    config_value = Column(JSON, nullable=False)
    description = Column(Text, nullable=True)
    
    def __repr__(self):
        return f"<RAGConfiguration(id={self.id}, key={self.config_key})>"


class RAGQuery(VectorBase, TimestampMixin):
    """RAG query history."""
    __tablename__ = "rag_queries"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    query_text = Column(Text, nullable=False)
    user_id = Column(String, nullable=True, index=True)
    investigation_id = Column(String, nullable=True, index=True)
    data_sources = Column(JSON, nullable=True)
    retrieval_options = Column(JSON, nullable=True)
    generation_options = Column(JSON, nullable=True)
    
    __table_args__ = (
        Index("idx_queries_user", "user_id", "created_at"),
        Index("idx_queries_investigation", "investigation_id", "created_at"),
    )
    
    def __repr__(self):
        return f"<RAGQuery(id={self.id}, query={self.query_text[:50]})>"


class RAGResponse(VectorBase, TimestampMixin):
    """RAG response history."""
    __tablename__ = "rag_responses"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    query_id = Column(String, nullable=False, index=True)
    answer = Column(Text, nullable=False)
    confidence = Column(Float, nullable=True)
    sources = Column(JSON, nullable=True)
    processing_time_ms = Column(Integer, nullable=True)
    total_tokens = Column(Integer, nullable=True)
    
    def __repr__(self):
        return f"<RAGResponse(id={self.id}, query_id={self.query_id})>"


class RAGChatSession(VectorBase, TimestampMixin):
    """RAG chat session."""
    __tablename__ = "rag_chat_sessions"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False, index=True)
    title = Column(String, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    meta_data = Column(JSON, nullable=True)
    
    __table_args__ = (
        Index("idx_chat_sessions_user", "user_id", "created_at"),
        Index("idx_chat_sessions_active", "user_id", "is_active", "updated_at"),
    )
    
    def __repr__(self):
        return f"<RAGChatSession(id={self.id}, user_id={self.user_id}, title={self.title})>"


class RAGChatMessage(VectorBase, TimestampMixin):
    """RAG chat message."""
    __tablename__ = "rag_chat_messages"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String, nullable=False, index=True)
    sender = Column(String, nullable=False)  # 'user', 'assistant', 'system'
    content = Column(Text, nullable=False)
    natural_query = Column(Text, nullable=True)
    translated_query = Column(Text, nullable=True)
    query_metadata = Column(JSON, nullable=True)  # execution_time, result_count, sources, confidence, citations
    structured_data = Column(JSON, nullable=True)
    message_order = Column(Integer, nullable=False, default=0)
    
    __table_args__ = (
        Index("idx_chat_messages_session", "session_id", "message_order"),
    )
    
    def __repr__(self):
        return f"<RAGChatMessage(id={self.id}, session_id={self.session_id}, sender={self.sender})>"

