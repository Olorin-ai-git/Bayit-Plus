#!/usr/bin/env python3
"""
Query Vector Database
Display contents of RAG vector database (documents, chunks, sessions, etc.)
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.service.database.vector_database_config import get_vector_db_config
from app.service.database.models import (
    DocumentCollection, Document, DocumentChunk, 
    RAGChatSession, RAGChatMessage, RAGDataSource
)
from sqlalchemy import select, func, text
from datetime import datetime


async def query_vector_db():
    """Query and display vector database contents."""
    db_config = get_vector_db_config()
    await db_config.initialize_engine()
    
    print("=" * 80)
    print("VECTOR DATABASE CONTENTS")
    print("=" * 80)
    print()
    
    async with db_config.session() as session:
        # Collections
        print("📚 DOCUMENT COLLECTIONS")
        print("-" * 80)
        if db_config.is_postgresql:
            collections_result = await session.execute(
                select(DocumentCollection).where(DocumentCollection.is_active == True)
            )
        else:
            collections_result = session.execute(
                select(DocumentCollection).where(DocumentCollection.is_active == True)
            )
        collections = collections_result.scalars().all()
        
        if collections:
            for coll in collections:
                print(f"  • {coll.name} (ID: {coll.id})")
                if coll.description:
                    print(f"    Description: {coll.description}")
        else:
            print("  No collections found")
        print()
        
        # Documents
        print("📄 DOCUMENTS")
        print("-" * 80)
        if db_config.is_postgresql:
            docs_result = await session.execute(
                select(Document).where(Document.is_active == True)
                .order_by(Document.created_at.desc())
                .limit(20)
            )
        else:
            docs_result = session.execute(
                select(Document).where(Document.is_active == True)
                .order_by(Document.created_at.desc())
                .limit(20)
            )
        documents = docs_result.scalars().all()
        
        if documents:
            print(f"  Found {len(documents)} documents (showing up to 20):")
            for doc in documents:
                meta_data = doc.meta_data or {}
                investigation_id = meta_data.get("investigation_id", "N/A")
                print(f"  • {doc.title[:60]}")
                print(f"    ID: {doc.id}")
                print(f"    Collection: {doc.collection_id}")
                print(f"    Source: {doc.source_type or 'N/A'}")
                print(f"    Investigation ID: {investigation_id}")
                print(f"    Content length: {len(doc.content)} chars")
                print(f"    Created: {doc.created_at}")
                print()
        else:
            print("  No documents found")
        print()
        
        # Document Chunks
        print("🧩 DOCUMENT CHUNKS")
        print("-" * 80)
        if db_config.is_postgresql:
            chunks_result = await session.execute(
                select(func.count(DocumentChunk.id)).where(DocumentChunk.is_active == True)
            )
            total_chunks = chunks_result.scalar() or 0
            
            # Get chunks by document
            chunks_by_doc_result = await session.execute(
                select(
                    DocumentChunk.document_id,
                    func.count(DocumentChunk.id).label('chunk_count')
                )
                .where(DocumentChunk.is_active == True)
                .group_by(DocumentChunk.document_id)
                .limit(10)
            )
        else:
            chunks_result = session.execute(
                select(func.count(DocumentChunk.id)).where(DocumentChunk.is_active == True)
            )
            total_chunks = chunks_result.scalar() or 0
            
            chunks_by_doc_result = session.execute(
                select(
                    DocumentChunk.document_id,
                    func.count(DocumentChunk.id).label('chunk_count')
                )
                .where(DocumentChunk.is_active == True)
                .group_by(DocumentChunk.document_id)
                .limit(10)
            )
        
        print(f"  Total chunks: {total_chunks}")
        chunks_by_doc = chunks_by_doc_result.fetchall()
        if chunks_by_doc:
            print("  Chunks per document (sample):")
            for row in chunks_by_doc:
                print(f"    Document {row[0][:36]}...: {row[1]} chunks")
        print()
        
        # Chat Sessions
        print("💬 CHAT SESSIONS")
        print("-" * 80)
        if db_config.is_postgresql:
            sessions_result = await session.execute(
                select(RAGChatSession)
                .order_by(RAGChatSession.updated_at.desc())
                .limit(10)
            )
        else:
            sessions_result = session.execute(
                select(RAGChatSession)
                .order_by(RAGChatSession.updated_at.desc())
                .limit(10)
            )
        sessions = sessions_result.scalars().all()
        
        if sessions:
            print(f"  Found {len(sessions)} sessions (showing up to 10):")
            for sess in sessions:
                # Get message count
                if db_config.is_postgresql:
                    msg_count_result = await session.execute(
                        select(func.count(RAGChatMessage.id))
                        .where(RAGChatMessage.session_id == sess.id)
                    )
                else:
                    msg_count_result = session.execute(
                        select(func.count(RAGChatMessage.id))
                        .where(RAGChatMessage.session_id == sess.id)
                    )
                msg_count = msg_count_result.scalar() or 0
                
                print(f"  • {sess.title or 'Untitled Chat'}")
                print(f"    ID: {sess.id}")
                print(f"    User: {sess.user_id}")
                print(f"    Messages: {msg_count}")
                print(f"    Active: {sess.is_active}")
                print(f"    Updated: {sess.updated_at}")
                print()
        else:
            print("  No chat sessions found")
        print()
        
        # Data Sources
        print("🔌 DATA SOURCES")
        print("-" * 80)
        if db_config.is_postgresql:
            sources_result = await session.execute(
                select(RAGDataSource).order_by(RAGDataSource.name)
            )
        else:
            sources_result = session.execute(
                select(RAGDataSource).order_by(RAGDataSource.name)
            )
        sources = sources_result.scalars().all()
        
        if sources:
            for source in sources:
                print(f"  • {source.name}")
                print(f"    Type: {source.source_type}")
                print(f"    Enabled: {source.enabled}")
                print(f"    Status: {source.status}")
                print()
        else:
            print("  No data sources found")
        print()
        
        # Summary
        print("=" * 80)
        print("SUMMARY")
        print("=" * 80)
        print(f"Database Type: {'PostgreSQL + pgvector' if db_config.is_postgresql else 'SQLite'}")
        print(f"Collections: {len(collections)}")
        print(f"Documents: {len(documents)}")
        print(f"Total Chunks: {total_chunks}")
        print(f"Chat Sessions: {len(sessions)}")
        print(f"Data Sources: {len(sources)}")
        print()


if __name__ == "__main__":
    asyncio.run(query_vector_db())

