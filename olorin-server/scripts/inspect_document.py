#!/usr/bin/env python3
"""Inspect a specific document to see its content and chunks."""

import asyncio
import sys
import json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.service.database.vector_database_config import get_vector_db_config
from app.service.database.models import Document, DocumentChunk
from sqlalchemy import select

async def inspect_document(doc_id: str = None):
    """Inspect a document."""
    db_config = get_vector_db_config()
    await db_config.initialize_engine()
    
    async with db_config.session() as session:
        if doc_id:
            query = select(Document).where(Document.id == doc_id)
        else:
            # Get first document
            query = select(Document).limit(1)
        
        if db_config.is_postgresql:
            result = await session.execute(query)
        else:
            result = session.execute(query)
        
        doc = result.scalar_one_or_none()
        
        if not doc:
            print("No document found")
            return
        
        print(f"Document ID: {doc.id}")
        print(f"Title: {doc.title}")
        print(f"Content length: {len(doc.content)} chars")
        print(f"\nContent preview (first 500 chars):")
        print("-" * 80)
        print(doc.content[:500])
        print("-" * 80)
        print(f"\nMetadata:")
        print(json.dumps(doc.meta_data, indent=2))
        
        # Check for chunks
        chunks_query = select(DocumentChunk).where(DocumentChunk.document_id == doc.id)
        if db_config.is_postgresql:
            chunks_result = await session.execute(chunks_query)
        else:
            chunks_result = session.execute(chunks_query)
        
        chunks = chunks_result.scalars().all()
        print(f"\nChunks: {len(chunks)}")
        for i, chunk in enumerate(chunks[:5]):
            print(f"\nChunk {i+1}:")
            print(f"  Index: {chunk.chunk_index}")
            print(f"  Content length: {len(chunk.content)}")
            print(f"  Has embedding: {chunk.embedding_openai is not None}")
            print(f"  Content preview: {chunk.content[:100]}...")

if __name__ == "__main__":
    doc_id = sys.argv[1] if len(sys.argv) > 1 else None
    asyncio.run(inspect_document(doc_id))

