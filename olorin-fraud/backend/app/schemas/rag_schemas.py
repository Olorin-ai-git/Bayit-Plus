"""
RAG API Schemas
Pydantic models for RAG API request/response validation.
All configuration from environment variables - no hardcoded values.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class RAGQueryRequest(BaseModel):
    """RAG query request."""

    query_text: str = Field(..., description="Natural language query")
    data_source_ids: Optional[List[str]] = Field(
        None, description="Specific data sources to query"
    )
    limit: int = Field(10, ge=1, le=100, description="Maximum number of results")
    similarity_threshold: float = Field(
        0.7, ge=0.0, le=1.0, description="Similarity threshold"
    )
    investigation_id: Optional[str] = Field(
        None, description="Filter by investigation ID"
    )
    entity_id: Optional[str] = Field(None, description="Filter by entity ID")
    user_id: Optional[str] = Field(None, description="User ID for authorization")


class Citation(BaseModel):
    """Source citation."""

    chunk_id: str
    source_type: str
    source_name: str
    similarity_score: float
    investigation_id: Optional[str] = None
    document_id: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class RAGQueryResponse(BaseModel):
    """RAG query response."""

    answer: str
    sources: List[Dict[str, Any]] = Field(default_factory=list)
    citations: List[Citation] = Field(default_factory=list)
    confidence: float = Field(ge=0.0, le=1.0)
    processing_time_ms: int
    query_id: Optional[str] = None


class DataSourceCreate(BaseModel):
    """Create data source request."""

    name: str = Field(..., min_length=1, max_length=255)
    source_type: str = Field(
        ..., description="postgresql, sqlite, or investigation_results"
    )
    connection_config: Dict[str, Any] = Field(
        ..., description="Connection configuration"
    )
    enabled: bool = Field(True, description="Enable data source immediately")


class DataSourceUpdate(BaseModel):
    """Update data source request."""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    connection_config: Optional[Dict[str, Any]] = None
    enabled: Optional[bool] = None


class DataSourceResponse(BaseModel):
    """Data source response."""

    id: str
    name: str
    source_type: str
    connection_config: Dict[str, Any]
    enabled: bool
    status: str
    last_checked: Optional[datetime] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class DocumentUpload(BaseModel):
    """Document upload request."""

    title: str = Field(..., min_length=1)
    content: str = Field(..., min_length=1)
    collection_id: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class DocumentResponse(BaseModel):
    """Document response."""

    id: str
    collection_id: str
    title: str
    source_type: Optional[str] = None
    source_url: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    is_active: bool
    created_at: datetime
    updated_at: datetime


class RAGConfigResponse(BaseModel):
    """RAG configuration response."""

    default_model: str
    chunk_size: int
    chunk_overlap: int
    similarity_threshold: float
    max_results: int
    embedding_provider: str


class ChatMessageCreate(BaseModel):
    """Create chat message request."""

    session_id: Optional[str] = None
    sender: str = Field(..., description="'user', 'assistant', or 'system'")
    content: str = Field(..., min_length=1)
    natural_query: Optional[str] = None
    translated_query: Optional[str] = None
    query_metadata: Optional[Dict[str, Any]] = None
    structured_data: Optional[Dict[str, Any]] = None


class ChatMessageResponse(BaseModel):
    """Chat message response."""

    id: str
    session_id: str
    sender: str
    content: str
    natural_query: Optional[str] = None
    translated_query: Optional[str] = None
    query_metadata: Optional[Dict[str, Any]] = None
    structured_data: Optional[Dict[str, Any]] = None
    message_order: int
    created_at: datetime
    updated_at: datetime


class ChatSessionCreate(BaseModel):
    """Create chat session request."""

    title: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class ChatSessionUpdate(BaseModel):
    """Update chat session request."""

    title: Optional[str] = None
    is_active: Optional[bool] = None
    metadata: Optional[Dict[str, Any]] = None


class ChatSessionResponse(BaseModel):
    """Chat session response."""

    id: str
    user_id: str
    title: Optional[str] = None
    is_active: bool
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime
    message_count: Optional[int] = 0


class ChatSessionWithMessages(ChatSessionResponse):
    """Chat session with messages."""

    messages: List[ChatMessageResponse] = Field(default_factory=list)
