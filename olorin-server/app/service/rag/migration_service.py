"""
Migration service to move existing RAG data from SQLite to PostgreSQL + pgvector.
Handles data migration, embedding regeneration, and validation.
"""

import asyncio
import logging
import os
import sqlite3
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timezone
import uuid
import json
import hashlib

from sqlalchemy import create_engine, text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession

from app.service.database.vector_database_config import get_vector_db_config
from app.service.database.models import DocumentCollection, Document, DocumentChunk
from app.service.rag.vector_rag_service import get_rag_service
from app.service.rag.embedding_service import get_embedding_service

logger = logging.getLogger(__name__)


class RAGMigrationService:
    """
    Service to migrate RAG data from existing SQLite to PostgreSQL + pgvector.
    """
    
    def __init__(self, sqlite_db_path: Optional[str] = None):
        """
        Initialize migration service.
        
        Args:
            sqlite_db_path: Path to existing SQLite database
        """
        self.sqlite_db_path = sqlite_db_path or self._find_sqlite_database()
        self.vector_db_config = get_vector_db_config()
        self.rag_service = get_rag_service()
        self.embedding_service = get_embedding_service()
        
    def _find_sqlite_database(self) -> Optional[str]:
        """Try to find existing SQLite database in common locations."""
        possible_paths = [
            "fraud_detection.db",
            "olorin.db", 
            "database.db",
            "data/fraud_detection.db",
            "data/olorin.db",
            os.path.expanduser("~/fraud_detection.db")
        ]
        
        for path in possible_paths:
            if os.path.exists(path):
                logger.info(f"Found SQLite database: {path}")
                return path
        
        logger.warning("No SQLite database found in common locations")
        return None
    
    async def check_migration_status(self) -> Dict[str, Any]:
        """
        Check current migration status and existing data.
        
        Returns:
            Dictionary with migration status information
        """
        status = {
            "sqlite_available": False,
            "sqlite_path": self.sqlite_db_path,
            "sqlite_records": {},
            "postgres_available": False,
            "postgres_records": {},
            "migration_needed": False,
            "recommendations": []
        }
        
        # Check SQLite source
        if self.sqlite_db_path and os.path.exists(self.sqlite_db_path):
            status["sqlite_available"] = True
            status["sqlite_records"] = await self._analyze_sqlite_data()
        else:
            status["recommendations"].append("No SQLite database found - starting fresh")
        
        # Check PostgreSQL target
        try:
            await self.vector_db_config.initialize_engine()
            status["postgres_available"] = True
            status["postgres_records"] = await self._analyze_postgres_data()
        except Exception as e:
            logger.error(f"PostgreSQL not available: {e}")
            status["recommendations"].append("PostgreSQL database needs setup")
            return status
        
        # Determine if migration is needed
        if status["sqlite_available"] and status["postgres_records"]["total_documents"] == 0:
            status["migration_needed"] = True
            status["recommendations"].append("Migration from SQLite to PostgreSQL recommended")
        elif status["postgres_records"]["total_documents"] > 0:
            status["recommendations"].append("PostgreSQL already has data - migration may not be needed")
        
        return status
    
    async def _analyze_sqlite_data(self) -> Dict[str, Any]:
        """Analyze existing SQLite database structure and data."""
        if not self.sqlite_db_path or not os.path.exists(self.sqlite_db_path):
            return {}
        
        try:
            conn = sqlite3.connect(self.sqlite_db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            analysis = {
                "tables": [],
                "total_documents": 0,
                "total_chunks": 0,
                "embedding_info": {}
            }
            
            # Get table list
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = [row[0] for row in cursor.fetchall()]
            analysis["tables"] = tables
            
            # Analyze document-like tables
            document_tables = [t for t in tables if 'document' in t.lower() or 'chunk' in t.lower()]
            
            for table in document_tables:
                try:
                    cursor.execute(f"SELECT COUNT(*) FROM {table}")
                    count = cursor.fetchone()[0]
                    analysis[f"{table}_count"] = count
                    
                    if 'document' in table.lower() and 'chunk' not in table.lower():
                        analysis["total_documents"] += count
                    elif 'chunk' in table.lower():
                        analysis["total_chunks"] += count
                    
                    # Check for embedding columns
                    cursor.execute(f"PRAGMA table_info({table})")
                    columns = [col[1] for col in cursor.fetchall()]
                    embedding_cols = [col for col in columns if 'embedding' in col.lower() or 'vector' in col.lower()]
                    
                    if embedding_cols:
                        analysis["embedding_info"][table] = embedding_cols
                
                except Exception as e:
                    logger.warning(f"Could not analyze table {table}: {e}")
            
            conn.close()
            return analysis
            
        except Exception as e:
            logger.error(f"Failed to analyze SQLite database: {e}")
            return {}
    
    async def _analyze_postgres_data(self) -> Dict[str, Any]:
        """Analyze existing PostgreSQL data."""
        try:
            async with self.vector_db_config.session() as session:
                # Count collections
                result = await session.execute(text("SELECT COUNT(*) FROM document_collections WHERE is_active = true"))
                collections_count = result.scalar()
                
                # Count documents  
                result = await session.execute(text("SELECT COUNT(*) FROM documents WHERE is_active = true"))
                documents_count = result.scalar()
                
                # Count chunks
                result = await session.execute(text("SELECT COUNT(*) FROM document_chunks WHERE is_active = true"))
                chunks_count = result.scalar()
                
                # Count chunks with embeddings
                result = await session.execute(text("""
                    SELECT 
                        COUNT(CASE WHEN embedding_openai IS NOT NULL THEN 1 END) as openai_embeddings,
                        COUNT(CASE WHEN embedding_sentence IS NOT NULL THEN 1 END) as sentence_embeddings,
                        COUNT(CASE WHEN embedding_openai_large IS NOT NULL THEN 1 END) as openai_large_embeddings
                    FROM document_chunks WHERE is_active = true
                """))
                embedding_counts = result.fetchone()
                
                return {
                    "total_collections": collections_count,
                    "total_documents": documents_count,
                    "total_chunks": chunks_count,
                    "openai_embeddings": embedding_counts[0] if embedding_counts else 0,
                    "sentence_embeddings": embedding_counts[1] if embedding_counts else 0,
                    "openai_large_embeddings": embedding_counts[2] if embedding_counts else 0
                }
                
        except Exception as e:
            logger.error(f"Failed to analyze PostgreSQL data: {e}")
            return {}
    
    async def migrate_from_sqlite(
        self,
        create_collections: bool = True,
        regenerate_embeddings: bool = True,
        embedding_provider: str = "openai",
        batch_size: int = 100
    ) -> Dict[str, Any]:
        """
        Migrate data from SQLite to PostgreSQL + pgvector.
        
        Args:
            create_collections: Whether to create default collections
            regenerate_embeddings: Whether to regenerate embeddings with new service
            embedding_provider: Provider to use for new embeddings
            batch_size: Batch size for processing
            
        Returns:
            Migration result summary
        """
        if not self.sqlite_db_path or not os.path.exists(self.sqlite_db_path):
            return {"success": False, "error": "SQLite database not found"}
        
        logger.info(f"🚀 Starting migration from {self.sqlite_db_path}")
        
        result = {
            "success": False,
            "collections_created": 0,
            "documents_migrated": 0, 
            "chunks_migrated": 0,
            "embeddings_generated": 0,
            "processing_time_ms": 0,
            "errors": []
        }
        
        start_time = datetime.now()
        
        try:
            # Step 1: Analyze source data
            logger.info("📊 Analyzing source SQLite database...")
            sqlite_analysis = await self._analyze_sqlite_data()
            
            if not sqlite_analysis:
                result["errors"].append("Could not analyze source database")
                return result
            
            # Step 2: Create default collections
            collection_mapping = {}
            if create_collections:
                logger.info("📚 Creating default collections...")
                collection_mapping = await self._create_default_collections()
                result["collections_created"] = len(collection_mapping)
            
            # Step 3: Migrate documents and chunks
            logger.info("📄 Migrating documents and chunks...")
            migration_stats = await self._migrate_documents_and_chunks(
                collection_mapping, batch_size
            )
            result["documents_migrated"] = migration_stats["documents"]
            result["chunks_migrated"] = migration_stats["chunks"]
            
            # Step 4: Generate new embeddings if requested
            if regenerate_embeddings and migration_stats["chunks"] > 0:
                logger.info(f"🧠 Generating {embedding_provider} embeddings...")
                embedding_stats = await self._regenerate_all_embeddings(embedding_provider)
                result["embeddings_generated"] = embedding_stats["chunks_processed"]
            
            # Calculate processing time
            result["processing_time_ms"] = int(
                (datetime.now() - start_time).total_seconds() * 1000
            )
            result["success"] = True
            
            logger.info(f"✅ Migration completed successfully in {result['processing_time_ms']}ms")
            logger.info(f"   Collections: {result['collections_created']}")
            logger.info(f"   Documents: {result['documents_migrated']}")
            logger.info(f"   Chunks: {result['chunks_migrated']}")
            logger.info(f"   Embeddings: {result['embeddings_generated']}")
            
            return result
            
        except Exception as e:
            logger.error(f"Migration failed: {e}")
            result["errors"].append(str(e))
            result["processing_time_ms"] = int(
                (datetime.now() - start_time).total_seconds() * 1000
            )
            return result
    
    async def _create_default_collections(self) -> Dict[str, uuid.UUID]:
        """Create default document collections."""
        collections = [
            {
                "name": "fraud_patterns",
                "description": "Fraud detection patterns and case studies",
            },
            {
                "name": "investigation_templates", 
                "description": "Investigation workflow templates and procedures",
            },
            {
                "name": "regulatory_docs",
                "description": "Regulatory compliance documentation",
            },
            {
                "name": "knowledge_base",
                "description": "General fraud investigation knowledge base",
            }
        ]
        
        collection_mapping = {}
        
        for col_info in collections:
            try:
                collection_id = await self.rag_service.create_collection(
                    name=col_info["name"],
                    description=col_info["description"]
                )
                collection_mapping[col_info["name"]] = collection_id
                logger.debug(f"Created collection: {col_info['name']}")
                
            except Exception as e:
                logger.warning(f"Failed to create collection {col_info['name']}: {e}")
        
        return collection_mapping
    
    async def _migrate_documents_and_chunks(
        self, 
        collection_mapping: Dict[str, uuid.UUID],
        batch_size: int
    ) -> Dict[str, int]:
        """Migrate documents and chunks from SQLite."""
        if not self.sqlite_db_path:
            return {"documents": 0, "chunks": 0}
        
        stats = {"documents": 0, "chunks": 0}
        
        try:
            conn = sqlite3.connect(self.sqlite_db_path)
            conn.row_factory = sqlite3.Row
            
            # Try to find document-like data in SQLite
            cursor = conn.cursor()
            
            # Look for tables that might contain documents
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = [row[0] for row in cursor.fetchall()]
            
            # Try common table patterns
            doc_table_candidates = [
                "documents", "document", "knowledge_documents", "rag_documents"
            ]
            
            doc_table = None
            for candidate in doc_table_candidates:
                if candidate in tables:
                    doc_table = candidate
                    break
            
            if not doc_table:
                logger.warning("No document table found in SQLite database")
                conn.close()
                return stats
            
            # Get documents from SQLite
            cursor.execute(f"SELECT * FROM {doc_table}")
            documents = cursor.fetchall()
            
            # Default collection if no mapping provided
            default_collection_id = None
            if collection_mapping:
                default_collection_id = list(collection_mapping.values())[0]
            else:
                # Create a default collection
                default_collection_id = await self.rag_service.create_collection(
                    name="migrated_documents",
                    description="Documents migrated from SQLite"
                )
            
            # Process documents in batches
            for i in range(0, len(documents), batch_size):
                batch = documents[i:i + batch_size]
                
                for doc_row in batch:
                    try:
                        # Extract document data (adapt based on your SQLite schema)
                        doc_data = dict(doc_row)
                        
                        # Map SQLite columns to new schema
                        title = doc_data.get('title', doc_data.get('name', f'Document {stats["documents"] + 1}'))
                        content = doc_data.get('content', doc_data.get('text', ''))
                        
                        if not content:
                            logger.warning(f"Skipping document with no content: {title}")
                            continue
                        
                        # Determine collection
                        collection_id = default_collection_id
                        doc_type = doc_data.get('type', doc_data.get('category', 'knowledge_base'))
                        if doc_type in collection_mapping:
                            collection_id = collection_mapping[doc_type]
                        
                        # Migrate document
                        ingest_result = await self.rag_service.ingest_document(
                            collection_id=collection_id,
                            title=title,
                            content=content,
                            source_type="migrated",
                            metadata={
                                "migrated_from": "sqlite",
                                "original_id": doc_data.get('id'),
                                "migration_timestamp": datetime.now(timezone.utc).isoformat()
                            },
                            generate_embeddings=False  # Will do this separately
                        )
                        
                        if ingest_result.success:
                            stats["documents"] += 1
                            stats["chunks"] += ingest_result.chunk_count
                        else:
                            logger.warning(f"Failed to migrate document {title}: {ingest_result.error_message}")
                    
                    except Exception as e:
                        logger.error(f"Error migrating document: {e}")
                
                # Log progress
                logger.info(f"Migrated {min(i + batch_size, len(documents))}/{len(documents)} documents")
            
            conn.close()
            return stats
            
        except Exception as e:
            logger.error(f"Failed to migrate documents: {e}")
            return stats
    
    async def _regenerate_all_embeddings(self, provider: str = "openai") -> Dict[str, int]:
        """Regenerate embeddings for all documents."""
        try:
            processed_count = await self.rag_service.regenerate_embeddings(
                embedding_type=provider
            )
            
            return {"chunks_processed": processed_count}
            
        except Exception as e:
            logger.error(f"Failed to regenerate embeddings: {e}")
            return {"chunks_processed": 0}
    
    async def validate_migration(self) -> Dict[str, Any]:
        """
        Validate that migration completed successfully.
        
        Returns:
            Validation results
        """
        logger.info("🔍 Validating migration results...")
        
        validation = {
            "success": True,
            "issues": [],
            "stats": {},
            "recommendations": []
        }
        
        try:
            # Check PostgreSQL data
            postgres_stats = await self._analyze_postgres_data()
            validation["stats"] = postgres_stats
            
            # Basic validation checks
            if postgres_stats.get("total_documents", 0) == 0:
                validation["success"] = False
                validation["issues"].append("No documents found in PostgreSQL")
            
            if postgres_stats.get("total_chunks", 0) == 0:
                validation["success"] = False
                validation["issues"].append("No chunks found in PostgreSQL")
            
            # Check embedding coverage
            total_chunks = postgres_stats.get("total_chunks", 0)
            if total_chunks > 0:
                openai_coverage = postgres_stats.get("openai_embeddings", 0) / total_chunks
                sentence_coverage = postgres_stats.get("sentence_embeddings", 0) / total_chunks
                
                if openai_coverage < 0.8 and sentence_coverage < 0.8:
                    validation["issues"].append("Low embedding coverage - consider regenerating embeddings")
                
                validation["stats"]["embedding_coverage"] = {
                    "openai": f"{openai_coverage:.1%}",
                    "sentence": f"{sentence_coverage:.1%}"
                }
            
            # Performance recommendations
            if total_chunks > 1000:
                validation["recommendations"].append("Consider creating vector indexes for better search performance")
            
            if postgres_stats.get("total_collections", 0) == 1:
                validation["recommendations"].append("Consider organizing documents into multiple collections")
            
            logger.info(f"✅ Migration validation completed: {'PASSED' if validation['success'] else 'FAILED'}")
            
            return validation
            
        except Exception as e:
            logger.error(f"Migration validation failed: {e}")
            validation["success"] = False
            validation["issues"].append(f"Validation error: {str(e)}")
            return validation


# Global migration service instance
_migration_service: Optional[RAGMigrationService] = None


def get_migration_service(sqlite_db_path: Optional[str] = None) -> RAGMigrationService:
    """Get or create global migration service instance.""" 
    global _migration_service
    
    if _migration_service is None or sqlite_db_path:
        _migration_service = RAGMigrationService(sqlite_db_path)
    
    return _migration_service