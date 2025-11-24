"""
RAG Chat Service
Manages chat sessions and messages for RAG system.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from sqlalchemy import select, update, delete, func, and_
from sqlalchemy.orm import Session

from app.service.database.vector_database_config import get_vector_db_config
from app.service.database.models import RAGChatSession, RAGChatMessage
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class ChatService:
    """Service for managing RAG chat sessions and messages."""
    
    def __init__(self):
        """Initialize chat service."""
        self.db_config = get_vector_db_config()
    
    async def create_session(
        self,
        user_id: str,
        title: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> RAGChatSession:
        """Create a new chat session."""
        try:
            await self.db_config.initialize_engine()
            
            async with self.db_config.session() as session:
                # Generate title from first message if not provided
                if not title:
                    title = f"Chat {datetime.now().strftime('%Y-%m-%d %H:%M')}"
                
                chat_session = RAGChatSession(
                    user_id=user_id,
                    title=title,
                    is_active=True,
                    meta_data=metadata or {}
                )
                
                session.add(chat_session)
                if self.db_config.is_postgresql:
                    await session.flush()  # Flush to assign ID and keep object in session
                    # Refresh is not needed after flush - object is already in session
                    # Session will auto-commit when context exits
                else:
                    session.flush()  # Flush to assign ID and keep object in session
                    # Refresh is not needed after flush - object is already in session
                    # Session will auto-commit when context exits
                
                logger.info(f"Created chat session: {chat_session.id} for user {user_id}")
                # Eagerly access attributes while session is still open
                # Store meta_data value before making transient (to avoid SQLAlchemy metadata conflict)
                meta_data_value = chat_session.meta_data if chat_session.meta_data is not None else {}
                _ = chat_session.id
                _ = chat_session.user_id
                _ = chat_session.title
                _ = chat_session.is_active
                _ = chat_session.created_at
                _ = chat_session.updated_at
                
                # Make transient so it can be used outside session context
                from sqlalchemy.orm import make_transient
                make_transient(chat_session)
                
                # Restore meta_data value after making transient
                # Use setattr to avoid SQLAlchemy metadata attribute conflict
                object.__setattr__(chat_session, 'meta_data', meta_data_value)
                
                return chat_session
        except Exception as e:
            logger.error(f"Failed to create chat session: {e}")
            raise
    
    async def get_session(self, session_id: str, user_id: str) -> Optional[RAGChatSession]:
        """Get a chat session by ID."""
        try:
            await self.db_config.initialize_engine()
            
            async with self.db_config.session() as session:
                query = select(RAGChatSession).where(
                    and_(
                        RAGChatSession.id == session_id,
                        RAGChatSession.user_id == user_id
                    )
                )
                
                if self.db_config.is_postgresql:
                    result = await session.execute(query)
                else:
                    result = session.execute(query)
                
                chat_session = result.scalar_one_or_none()
                if chat_session:
                    # Store meta_data value before making transient
                    meta_data_value = chat_session.meta_data if chat_session.meta_data is not None else {}
                    # Eagerly load attributes
                    _ = chat_session.id
                    _ = chat_session.user_id
                    _ = chat_session.title
                    _ = chat_session.is_active
                    _ = chat_session.created_at
                    _ = chat_session.updated_at
                    # Make transient
                    from sqlalchemy.orm import make_transient
                    make_transient(chat_session)
                    # Restore meta_data value
                    object.__setattr__(chat_session, 'meta_data', meta_data_value)
                
                return chat_session
        except Exception as e:
            logger.error(f"Failed to get chat session: {e}")
            return None
    
    async def list_sessions(
        self,
        user_id: str,
        include_inactive: bool = False,
        limit: int = 50
    ) -> List[RAGChatSession]:
        """List chat sessions for a user."""
        try:
            await self.db_config.initialize_engine()
            
            async with self.db_config.session() as session:
                query = select(RAGChatSession).where(
                    RAGChatSession.user_id == user_id
                )
                
                if not include_inactive:
                    query = query.where(RAGChatSession.is_active == True)
                
                query = query.order_by(RAGChatSession.updated_at.desc()).limit(limit)
                
                if self.db_config.is_postgresql:
                    result = await session.execute(query)
                else:
                    result = session.execute(query)
                
                sessions = list(result.scalars().all())
                
                # Eagerly load attributes and make transient
                for sess in sessions:
                    # Store meta_data value before making transient (to avoid SQLAlchemy metadata conflict)
                    meta_data_value = sess.meta_data if sess.meta_data is not None else {}
                    _ = sess.id
                    _ = sess.user_id
                    _ = sess.title
                    _ = sess.is_active
                    _ = sess.created_at
                    _ = sess.updated_at
                    from sqlalchemy.orm import make_transient
                    make_transient(sess)
                    # Restore meta_data value after making transient
                    # Use setattr to avoid SQLAlchemy metadata attribute conflict
                    object.__setattr__(sess, 'meta_data', meta_data_value)
                
                return sessions
        except Exception as e:
            logger.error(f"Failed to list chat sessions: {e}")
            return []
    
    async def update_session(
        self,
        session_id: str,
        user_id: str,
        title: Optional[str] = None,
        is_active: Optional[bool] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Optional[RAGChatSession]:
        """Update a chat session."""
        try:
            await self.db_config.initialize_engine()
            
            async with self.db_config.session() as session:
                query = select(RAGChatSession).where(
                    and_(
                        RAGChatSession.id == session_id,
                        RAGChatSession.user_id == user_id
                    )
                )
                
                if self.db_config.is_postgresql:
                    result = await session.execute(query)
                else:
                    result = session.execute(query)
                
                chat_session = result.scalar_one_or_none()
                if not chat_session:
                    return None
                
                if title is not None:
                    chat_session.title = title
                if is_active is not None:
                    chat_session.is_active = is_active
                if metadata is not None:
                    chat_session.meta_data = metadata
                
                if self.db_config.is_postgresql:
                    await session.flush()
                    # Session will auto-commit when context exits
                else:
                    session.flush()
                    # Session will auto-commit when context exits
                
                # Eagerly access attributes while session is still open
                # Store meta_data value before making transient (to avoid SQLAlchemy metadata conflict)
                meta_data_value = chat_session.meta_data if chat_session.meta_data is not None else {}
                _ = chat_session.id
                _ = chat_session.user_id
                _ = chat_session.title
                _ = chat_session.is_active
                _ = chat_session.created_at
                _ = chat_session.updated_at
                
                # Make transient so it can be used outside session context
                from sqlalchemy.orm import make_transient
                make_transient(chat_session)
                
                # Restore meta_data value after making transient
                # Use setattr to avoid SQLAlchemy metadata attribute conflict
                object.__setattr__(chat_session, 'meta_data', meta_data_value)
                
                logger.info(f"Updated chat session: {session_id}")
                return chat_session
        except Exception as e:
            logger.error(f"Failed to update chat session: {e}")
            return None
    
    async def delete_session(self, session_id: str, user_id: str) -> bool:
        """Delete a chat session and all its messages."""
        try:
            await self.db_config.initialize_engine()
            
            async with self.db_config.session() as session:
                # Delete messages first
                delete_messages = delete(RAGChatMessage).where(
                    RAGChatMessage.session_id == session_id
                )
                
                # Delete session
                delete_session = delete(RAGChatSession).where(
                    and_(
                        RAGChatSession.id == session_id,
                        RAGChatSession.user_id == user_id
                    )
                )
                
                if self.db_config.is_postgresql:
                    await session.execute(delete_messages)
                    await session.execute(delete_session)
                    await session.commit()
                else:
                    session.execute(delete_messages)
                    session.execute(delete_session)
                    session.commit()
                
                logger.info(f"Deleted chat session: {session_id}")
                return True
        except Exception as e:
            logger.error(f"Failed to delete chat session: {e}")
            return False
    
    async def add_message(
        self,
        session_id: str,
        sender: str,
        content: str,
        natural_query: Optional[str] = None,
        translated_query: Optional[str] = None,
        query_metadata: Optional[Dict[str, Any]] = None,
        structured_data: Optional[Dict[str, Any]] = None
    ) -> RAGChatMessage:
        """Add a message to a chat session."""
        try:
            await self.db_config.initialize_engine()
            
            async with self.db_config.session() as session:
                # Get current message count for ordering
                count_query = select(func.count(RAGChatMessage.id)).where(
                    RAGChatMessage.session_id == session_id
                )
                
                if self.db_config.is_postgresql:
                    count_result = await session.execute(count_query)
                else:
                    count_result = session.execute(count_query)
                
                message_order = count_result.scalar() or 0
                
                # Create message
                message = RAGChatMessage(
                    session_id=session_id,
                    sender=sender,
                    content=content,
                    natural_query=natural_query,
                    translated_query=translated_query,
                    query_metadata=query_metadata,
                    structured_data=structured_data,
                    message_order=message_order
                )
                
                session.add(message)
                
                # Update session updated_at timestamp
                update_session = update(RAGChatSession).where(
                    RAGChatSession.id == session_id
                ).values(updated_at=datetime.now())
                
                if self.db_config.is_postgresql:
                    await session.execute(update_session)
                    await session.commit()
                    await session.refresh(message)
                else:
                    session.execute(update_session)
                    session.commit()
                    session.refresh(message)
                
                logger.debug(f"Added message to session {session_id}")
                return message
        except Exception as e:
            logger.error(f"Failed to add message: {e}")
            raise
    
    async def get_messages(
        self,
        session_id: str,
        limit: Optional[int] = None
    ) -> List[RAGChatMessage]:
        """Get messages for a chat session."""
        try:
            await self.db_config.initialize_engine()
            
            async with self.db_config.session() as session:
                query = select(RAGChatMessage).where(
                    RAGChatMessage.session_id == session_id
                ).order_by(RAGChatMessage.message_order.asc())
                
                if limit:
                    query = query.limit(limit)
                
                if self.db_config.is_postgresql:
                    result = await session.execute(query)
                else:
                    result = session.execute(query)
                
                messages = list(result.scalars().all())
                
                # Eagerly load attributes and make transient
                for msg in messages:
                    _ = msg.id
                    _ = msg.session_id
                    _ = msg.sender
                    _ = msg.content
                    _ = msg.natural_query
                    _ = msg.translated_query
                    _ = msg.query_metadata
                    _ = msg.structured_data
                    _ = msg.message_order
                    _ = msg.created_at
                    _ = msg.updated_at
                    from sqlalchemy.orm import make_transient
                    make_transient(msg)
                
                return messages
        except Exception as e:
            logger.error(f"Failed to get messages: {e}")
            return []


_global_chat_service: Optional[ChatService] = None


def get_chat_service() -> ChatService:
    """Get global chat service instance."""
    global _global_chat_service
    if _global_chat_service is None:
        _global_chat_service = ChatService()
    return _global_chat_service

