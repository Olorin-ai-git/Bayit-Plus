"""
RAG API Router
FastAPI router for RAG endpoints.
All configuration from environment variables - no hardcoded values.
"""

import os
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.persistence.database import get_db
from app.schemas.rag_schemas import (
    ChatMessageCreate,
    ChatMessageResponse,
    ChatSessionCreate,
    ChatSessionResponse,
    ChatSessionUpdate,
    ChatSessionWithMessages,
    DataSourceCreate,
    DataSourceResponse,
    DataSourceUpdate,
    DocumentResponse,
    DocumentUpload,
    RAGQueryRequest,
    RAGQueryResponse,
)
from app.service.database.models import RAGDataSource
from app.service.logging import get_bridge_logger
from app.service.rag.chat_service import get_chat_service
from app.service.rag.data_source_service import get_data_source_service
from app.service.rag.unified_rag_service import get_unified_rag_service
from app.service.rag.vector_rag_service import get_rag_service

logger = get_bridge_logger(__name__)

router = APIRouter(prefix="/v1/rag", tags=["rag"])


def _check_rag_enabled():
    """Check if RAG service is enabled."""
    use_rag_service = os.getenv("USE_RAG_SERVICE", "true").lower() == "true"
    if not use_rag_service:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="RAG service is disabled (USE_RAG_SERVICE=false)",
        )


@router.post("/query", response_model=RAGQueryResponse)
async def query_rag(request: RAGQueryRequest):
    """Query RAG system across all enabled data sources."""
    _check_rag_enabled()
    try:
        # Ensure database is initialized
        from app.service.database.vector_database_config import get_vector_db_config

        db_config = get_vector_db_config()
        try:
            await db_config.initialize_engine()
        except Exception as db_error:
            logger.warning(f"Database initialization warning: {db_error}")

        unified_service = get_unified_rag_service()

        response = await unified_service.query(
            query_text=request.query_text,
            data_source_ids=request.data_source_ids,
            limit=request.limit,
            similarity_threshold=request.similarity_threshold,
            investigation_id=request.investigation_id,
            entity_id=request.entity_id,
        )

        sources_data = [
            {
                "chunk_id": s.chunk_id,
                "content": (
                    s.content[:200] + "..." if len(s.content) > 200 else s.content
                ),
                "similarity_score": s.similarity_score,
                "source_type": s.source_type,
                "source_name": s.source_name,
                "metadata": s.metadata,
            }
            for s in response.sources
        ]

        return RAGQueryResponse(
            answer=response.answer,
            sources=sources_data,
            citations=response.citations,
            confidence=response.confidence,
            processing_time_ms=response.processing_time_ms,
        )
    except Exception as e:
        logger.error(f"RAG query failed: {e}", exc_info=True)
        import traceback

        logger.debug(f"RAG query traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"RAG query failed: {str(e)}",
        )


@router.get("/data-sources", response_model=List[DataSourceResponse])
async def list_data_sources():
    """List all data sources."""
    _check_rag_enabled()
    try:
        service = get_data_source_service()
        sources = await service.get_all_data_sources()

        return [
            DataSourceResponse(
                id=s.id,
                name=s.name,
                source_type=s.source_type,
                connection_config=s.connection_config,
                enabled=s.enabled,
                status=s.status,
                last_checked=s.last_checked,
                error_message=s.error_message,
                created_at=s.created_at,
                updated_at=s.updated_at,
            )
            for s in sources
        ]
    except Exception as e:
        logger.error(f"Failed to list data sources: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list data sources: {str(e)}",
        )


@router.post(
    "/data-sources",
    response_model=DataSourceResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_data_source(data_source: DataSourceCreate):
    """Create a new data source."""
    _check_rag_enabled()
    try:
        service = get_data_source_service()

        source = await service.create_data_source(
            name=data_source.name,
            source_type=data_source.source_type,
            connection_config=data_source.connection_config,
            enabled=data_source.enabled,
        )

        return DataSourceResponse(
            id=source.id,
            name=source.name,
            source_type=source.source_type,
            connection_config=source.connection_config,
            enabled=source.enabled,
            status=source.status,
            last_checked=source.last_checked,
            error_message=source.error_message,
            created_at=source.created_at,
            updated_at=source.updated_at,
        )
    except Exception as e:
        logger.error(f"Failed to create data source: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create data source: {str(e)}",
        )


@router.put("/data-sources/{source_id}", response_model=DataSourceResponse)
async def update_data_source(source_id: str, data_source: DataSourceUpdate):
    """Update a data source."""
    _check_rag_enabled()
    try:
        service = get_data_source_service()

        updated = await service.update_data_source(
            source_id=source_id,
            name=data_source.name,
            connection_config=data_source.connection_config,
            enabled=data_source.enabled,
        )

        if not updated:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Data source {source_id} not found",
            )

        return DataSourceResponse(
            id=updated.id,
            name=updated.name,
            source_type=updated.source_type,
            connection_config=updated.connection_config,
            enabled=updated.enabled,
            status=updated.status,
            last_checked=updated.last_checked,
            error_message=updated.error_message,
            created_at=updated.created_at,
            updated_at=updated.updated_at,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update data source: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update data source: {str(e)}",
        )


@router.delete("/data-sources/{source_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_data_source(source_id: str):
    """Delete a data source."""
    _check_rag_enabled()
    try:
        service = get_data_source_service()
        deleted = await service.delete_data_source(source_id)

        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Data source {source_id} not found",
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete data source: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete data source: {str(e)}",
        )


@router.get("/status")
async def get_rag_status():
    """Get RAG system status."""
    # Status endpoint should work even if RAG is disabled, to show the disabled state
    # No _check_rag_enabled() call here
    try:
        from app.service.rag.startup_integration import get_rag_status as get_status

        status_info = get_status()

        # Also check database connectivity
        from app.service.database.vector_database_config import get_vector_db_config

        db_config = get_vector_db_config()
        db_initialized = False
        try:
            await db_config.initialize_engine()
            db_initialized = True
        except Exception as e:
            logger.debug(f"Database initialization check failed: {e}")

        # Check if tables exist
        tables_exist = False
        if db_initialized:
            try:
                from app.service.database.models import VectorBase

                if db_config.is_postgresql:
                    async with db_config.session() as session:
                        from sqlalchemy import text

                        result = await session.execute(
                            text(
                                """
                            SELECT EXISTS (
                                SELECT 1 FROM information_schema.tables 
                                WHERE table_name = 'rag_data_sources'
                            )
                        """
                            )
                        )
                        tables_exist = result.scalar()
                else:
                    sync_engine = db_config._sync_engine
                    with sync_engine.connect() as conn:
                        result = conn.execute(
                            text(
                                "SELECT name FROM sqlite_master WHERE type='table' AND name='rag_data_sources'"
                            )
                        )
                        tables_exist = result.fetchone() is not None
            except Exception as e:
                logger.debug(f"Table existence check failed: {e}")

        return {
            **status_info,
            "database_initialized": db_initialized,
            "tables_exist": tables_exist,
            "ready": status_info.get("ready_for_queries", False)
            and db_initialized
            and tables_exist,
        }
    except Exception as e:
        logger.error(f"Failed to get RAG status: {e}")
        return {
            "initialized": False,
            "database_available": False,
            "embedding_service_available": False,
            "knowledge_base_ready": False,
            "ready_for_queries": False,
            "database_initialized": False,
            "tables_exist": False,
            "ready": False,
            "error": str(e),
        }


@router.post("/data-sources/{source_id}/test")
async def test_data_source_connection(source_id: str):
    """Test connection to a data source."""
    _check_rag_enabled()
    try:
        service = get_data_source_service()
        result = await service.test_connection(source_id)

        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get("error", "Connection test failed"),
            )

        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Connection test failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Connection test failed: {str(e)}",
        )


@router.get("/documents", response_model=List[DocumentResponse])
async def list_documents(collection_id: Optional[str] = None):
    """List documents."""
    _check_rag_enabled()
    try:
        rag_service = get_rag_service()
        # Implementation would query documents from vector database
        return []
    except Exception as e:
        logger.error(f"Failed to list documents: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list documents: {str(e)}",
        )


@router.post(
    "/documents/upload",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_document(document: DocumentUpload):
    """Upload a document for indexing."""
    _check_rag_enabled()
    try:
        rag_service = get_rag_service()
        collection_id = document.collection_id or "default"

        result = await rag_service.ingest_document(
            collection_id=collection_id,
            title=document.title,
            content=document.content,
            metadata=document.metadata,
        )

        return DocumentResponse(
            id=result.document_id,
            collection_id=collection_id,
            title=document.title,
            metadata=document.metadata,
            is_active=True,
            created_at=result.created_at if hasattr(result, "created_at") else None,
            updated_at=result.created_at if hasattr(result, "created_at") else None,
        )
    except Exception as e:
        logger.error(f"Failed to upload document: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to upload document: {str(e)}",
        )


# Chat Session Endpoints
@router.post(
    "/chats", response_model=ChatSessionResponse, status_code=status.HTTP_201_CREATED
)
async def create_chat_session(
    session_data: ChatSessionCreate,
    user_id: str = "demo-user",  # TODO: Get from auth context
):
    """Create a new chat session."""
    _check_rag_enabled()
    try:
        chat_service = get_chat_service()
        chat_session = await chat_service.create_session(
            user_id=user_id, title=session_data.title, metadata=session_data.metadata
        )

        return ChatSessionResponse(
            id=chat_session.id,
            user_id=chat_session.user_id,
            title=chat_session.title,
            is_active=chat_session.is_active,
            metadata=chat_session.meta_data or {},
            created_at=chat_session.created_at,
            updated_at=chat_session.updated_at,
            message_count=0,
        )
    except Exception as e:
        logger.error(f"Failed to create chat session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create chat session: {str(e)}",
        )


@router.get("/chats", response_model=List[ChatSessionResponse])
async def list_chat_sessions(
    user_id: str = "demo-user",  # TODO: Get from auth context
    include_inactive: bool = False,
):
    """List chat sessions for a user."""
    _check_rag_enabled()
    try:
        chat_service = get_chat_service()
        sessions = await chat_service.list_sessions(
            user_id=user_id, include_inactive=include_inactive
        )

        # Get message counts for each session
        result = []
        for session in sessions:
            messages = await chat_service.get_messages(session.id)
            result.append(
                ChatSessionResponse(
                    id=session.id,
                    user_id=session.user_id,
                    title=session.title,
                    is_active=session.is_active,
                    metadata=session.meta_data or {},
                    created_at=session.created_at,
                    updated_at=session.updated_at,
                    message_count=len(messages),
                )
            )

        return result
    except Exception as e:
        logger.error(f"Failed to list chat sessions: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list chat sessions: {str(e)}",
        )


@router.get("/chats/{session_id}", response_model=ChatSessionWithMessages)
async def get_chat_session(
    session_id: str, user_id: str = "demo-user"  # TODO: Get from auth context
):
    """Get a chat session with all messages."""
    _check_rag_enabled()
    try:
        chat_service = get_chat_service()
        session = await chat_service.get_session(session_id, user_id)

        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Chat session not found"
            )

        messages = await chat_service.get_messages(session_id)

        return ChatSessionWithMessages(
            id=session.id,
            user_id=session.user_id,
            title=session.title,
            is_active=session.is_active,
            metadata=session.meta_data or {},
            created_at=session.created_at,
            updated_at=session.updated_at,
            message_count=len(messages),
            messages=[
                ChatMessageResponse(
                    id=msg.id,
                    session_id=msg.session_id,
                    sender=msg.sender,
                    content=msg.content,
                    natural_query=msg.natural_query,
                    translated_query=msg.translated_query,
                    query_metadata=msg.query_metadata,
                    structured_data=msg.structured_data,
                    message_order=msg.message_order,
                    created_at=msg.created_at,
                    updated_at=msg.updated_at,
                )
                for msg in messages
            ],
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get chat session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get chat session: {str(e)}",
        )


@router.put("/chats/{session_id}", response_model=ChatSessionResponse)
async def update_chat_session(
    session_id: str,
    session_data: ChatSessionUpdate,
    user_id: str = "demo-user",  # TODO: Get from auth context
):
    """Update a chat session."""
    _check_rag_enabled()
    try:
        chat_service = get_chat_service()
        session = await chat_service.update_session(
            session_id=session_id,
            user_id=user_id,
            title=session_data.title,
            is_active=session_data.is_active,
            metadata=session_data.metadata,
        )

        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Chat session not found"
            )

        messages = await chat_service.get_messages(session_id)

        # Get meta_data value before it becomes inaccessible
        meta_data_value = (
            session.meta_data
            if hasattr(session, "meta_data") and isinstance(session.meta_data, dict)
            else {}
        )

        return ChatSessionResponse(
            id=session.id,
            user_id=session.user_id,
            title=session.title,
            is_active=session.is_active,
            metadata=meta_data_value or {},
            created_at=session.created_at,
            updated_at=session.updated_at,
            message_count=len(messages),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update chat session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update chat session: {str(e)}",
        )


@router.delete("/chats/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chat_session(
    session_id: str, user_id: str = "demo-user"  # TODO: Get from auth context
):
    """Delete a chat session."""
    _check_rag_enabled()
    try:
        chat_service = get_chat_service()
        success = await chat_service.delete_session(session_id, user_id)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Chat session not found"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete chat session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete chat session: {str(e)}",
        )


@router.post(
    "/chats/{session_id}/messages",
    response_model=ChatMessageResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_chat_message(
    session_id: str,
    message_data: ChatMessageCreate,
    user_id: str = "demo-user",  # TODO: Get from auth context
):
    """Add a message to a chat session."""
    _check_rag_enabled()
    try:
        chat_service = get_chat_service()

        # Verify session belongs to user
        session = await chat_service.get_session(session_id, user_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Chat session not found"
            )

        message = await chat_service.add_message(
            session_id=session_id,
            sender=message_data.sender,
            content=message_data.content,
            natural_query=message_data.natural_query,
            translated_query=message_data.translated_query,
            query_metadata=message_data.query_metadata,
            structured_data=message_data.structured_data,
        )

        return ChatMessageResponse(
            id=message.id,
            session_id=message.session_id,
            sender=message.sender,
            content=message.content,
            natural_query=message.natural_query,
            translated_query=message.translated_query,
            query_metadata=message.query_metadata,
            structured_data=message.structured_data,
            message_order=message.message_order,
            created_at=message.created_at,
            updated_at=message.updated_at,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to add chat message: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add chat message: {str(e)}",
        )
