"""
Startup integration for PostgreSQL + pgvector RAG system.
Handles initialization and integration with existing Olorin services.
"""

import asyncio
import os
from typing import Optional

from app.service.rag import (
    initialize_vector_database,
    initialize_embedding_service,
    get_rag_service,
    initialize_enhanced_knowledge_base,
    cleanup_vector_database
)
from app.service.rag.investigation_indexing_background import get_investigation_indexing_background_service
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class RAGSystemStartup:
    """Manages RAG system startup and integration."""
    
    def __init__(self):
        """Initialize RAG startup manager."""
        self.initialized = False
        self.database_available = False
        self.embedding_service_available = False
        self.knowledge_base_ready = False
    
    async def initialize_rag_system(self, skip_on_failure: bool = True) -> bool:
        """
        Initialize the complete RAG system.
        
        Args:
            skip_on_failure: If True, continue server startup even if RAG fails to initialize
            
        Returns:
            True if initialization successful, False otherwise
        """
        # Check if RAG service is enabled
        use_rag_service = os.getenv("USE_RAG_SERVICE", "true").lower() == "true"
        if not use_rag_service:
            logger.info("⏭️  RAG service is disabled (USE_RAG_SERVICE=false) - skipping initialization")
            self.initialized = False
            self.database_available = False
            self.embedding_service_available = False
            self.knowledge_base_ready = False
            return False
        
        logger.info("🚀 Initializing PostgreSQL + pgvector RAG system...")
        
        try:
            # Step 1: Initialize vector database
            success = await self._initialize_database()
            if not success and not skip_on_failure:
                return False
            
            # Step 2: Initialize embedding service
            success = await self._initialize_embedding_service()
            if not success and not skip_on_failure:
                return False
            
            # Step 3: Initialize enhanced knowledge base
            success = await self._initialize_knowledge_base()
            if not success and not skip_on_failure:
                return False
            
            # Step 4: Check system health
            await self._perform_health_check()
            
            # Step 5: Start background investigation indexing
            await self._start_background_indexing()
            
            self.initialized = True
            logger.info("✅ RAG system initialization completed successfully")
            return True
            
        except Exception as e:
            logger.error(f"RAG system initialization failed: {e}")
            if not skip_on_failure:
                raise
            return False
    
    async def _initialize_database(self) -> bool:
        """Initialize PostgreSQL or SQLite vector database."""
        try:
            from app.service.database.vector_database_config import get_vector_db_config
            db_config = get_vector_db_config()
            
            # Check database type
            if db_config.is_postgresql:
                logger.info("📊 Initializing PostgreSQL + pgvector database...")
                # Check if PostgreSQL configuration is available
                if not self._check_database_config():
                    logger.warning("PostgreSQL configuration not found - RAG will use SQLite fallback")
                    # Fall through to SQLite initialization
                else:
                    # Initialize PostgreSQL database connection
                    await initialize_vector_database()
                    
                    # Create tables if they don't exist
                    try:
                        from app.service.database.models import VectorBase
                        async with db_config.session() as session:
                            async with session.bind.begin() as conn:
                                await conn.run_sync(VectorBase.metadata.create_all)
                        logger.info("✅ RAG database tables created/verified")
                    except Exception as table_error:
                        logger.warning(f"Table creation warning (may already exist): {table_error}")
                    
                    self.database_available = True
                    logger.info("✅ PostgreSQL vector database initialized successfully")
                    return True
            
            # Initialize SQLite (fallback or default)
            logger.info("📊 Initializing SQLite database for RAG...")
            await initialize_vector_database()
            
            # Create tables if they don't exist
            try:
                from app.service.database.models import VectorBase
                sync_engine = db_config._sync_engine
                if sync_engine:
                    VectorBase.metadata.create_all(sync_engine)
                    logger.info("✅ RAG database tables created/verified")
            except Exception as table_error:
                logger.warning(f"Table creation warning (may already exist): {table_error}")
            
            self.database_available = True
            logger.info("✅ SQLite vector database initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"Database initialization failed: {e}")
            logger.warning("RAG system will operate without persistent vector storage")
            return False
    
    async def _initialize_embedding_service(self) -> bool:
        """Initialize embedding generation service."""
        try:
            logger.info("🧠 Initializing embedding service...")
            
            embedding_service = await initialize_embedding_service()
            providers = embedding_service.get_available_providers()
            
            if not providers:
                logger.warning("No embedding providers available - RAG search will be limited")
                return False
            
            self.embedding_service_available = True
            logger.info(f"✅ Embedding service initialized with providers: {', '.join(providers)}")
            return True
            
        except Exception as e:
            logger.error(f"Embedding service initialization failed: {e}")
            return False
    
    async def _initialize_knowledge_base(self) -> bool:
        """Initialize enhanced knowledge base."""
        try:
            logger.info("📚 Initializing enhanced knowledge base...")
            
            # Only initialize if database and embeddings are available
            if not (self.database_available and self.embedding_service_available):
                logger.warning("Knowledge base requires database and embedding service - skipping")
                return False
            
            await initialize_enhanced_knowledge_base()
            self.knowledge_base_ready = True
            
            logger.info("✅ Enhanced knowledge base initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"Knowledge base initialization failed: {e}")
            return False
    
    async def _perform_health_check(self):
        """Perform basic health check of RAG system."""
        logger.info("🔍 Performing RAG system health check...")
        
        health_status = {
            "database": self.database_available,
            "embeddings": self.embedding_service_available,
            "knowledge_base": self.knowledge_base_ready,
            "overall": self.database_available and self.embedding_service_available
        }
        
        if health_status["overall"]:
            # Test basic operations
            try:
                rag_service = get_rag_service()
                collections = await rag_service.get_collections()
                logger.info(f"📈 RAG health check: {len(collections)} collections available")
                
                # Create default investigation_results data source if none exist
                await self._ensure_default_data_source()
                
            except Exception as e:
                logger.warning(f"RAG health check warning: {e}")
        
        logger.info(f"📊 RAG system status: {health_status}")
    
    async def _ensure_default_data_source(self):
        """Ensure default investigation_results data source exists."""
        try:
            from app.service.rag.data_source_service import get_data_source_service
            data_source_service = get_data_source_service()
            
            # Check if any data sources exist
            existing_sources = await data_source_service.get_all_data_sources()
            
            # Check if investigation_results source already exists
            has_investigation_source = any(
                s.source_type == "investigation_results" for s in existing_sources
            )
            
            if not has_investigation_source:
                # Create default investigation_results data source
                await data_source_service.create_data_source(
                    name="Investigation Results",
                    source_type="investigation_results",
                    connection_config={},
                    enabled=True
                )
                logger.info("✅ Created default 'Investigation Results' data source")
            else:
                logger.debug("Default investigation_results data source already exists")
                
        except Exception as e:
            logger.warning(f"Failed to create default data source: {e}")
    
    async def _start_background_indexing(self) -> None:
        """Start background investigation indexing service."""
        try:
            if not (self.database_available and self.embedding_service_available):
                logger.warning("Background indexing requires database and embedding service - skipping")
                return
            
            indexing_service = get_investigation_indexing_background_service()
            poll_interval = int(os.getenv("RAG_INVESTIGATION_INDEXING_INTERVAL", "60"))
            await indexing_service.start(poll_interval_seconds=poll_interval)
            logger.info("✅ Background investigation indexing started")
        except Exception as e:
            logger.warning(f"Failed to start background indexing: {e}")
    
    def _check_database_config(self) -> bool:
        """Check if PostgreSQL database configuration is available."""
        # Check for database URL or individual components
        if os.getenv("DATABASE_URL"):
            return True
        
        required_vars = ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"]
        return all(os.getenv(var) for var in required_vars)
    
    async def cleanup_rag_system(self):
        """Clean up RAG system resources."""
        logger.info("🧹 Cleaning up RAG system...")
        
        try:
            indexing_service = get_investigation_indexing_background_service()
            if indexing_service.is_running():
                await indexing_service.stop()
            
            await cleanup_vector_database()
            self.initialized = False
            self.database_available = False
            self.embedding_service_available = False
            self.knowledge_base_ready = False
            
            logger.info("✅ RAG system cleanup completed")
            
        except Exception as e:
            logger.error(f"RAG cleanup error: {e}")
    
    def get_status(self) -> dict:
        """Get current RAG system status."""
        return {
            "initialized": self.initialized,
            "database_available": self.database_available,
            "embedding_service_available": self.embedding_service_available,
            "knowledge_base_ready": self.knowledge_base_ready,
            "ready_for_queries": self.database_available and self.embedding_service_available
        }


# Global RAG startup manager
_rag_startup: Optional[RAGSystemStartup] = None


def get_rag_startup_manager() -> RAGSystemStartup:
    """Get or create global RAG startup manager."""
    global _rag_startup
    
    if _rag_startup is None:
        _rag_startup = RAGSystemStartup()
    
    return _rag_startup


async def initialize_rag_for_olorin(skip_on_failure: bool = True) -> bool:
    """
    Initialize RAG system for Olorin server startup.
    
    Args:
        skip_on_failure: Whether to continue server startup if RAG initialization fails
        
    Returns:
        True if successful, False otherwise
    """
    startup_manager = get_rag_startup_manager()
    return await startup_manager.initialize_rag_system(skip_on_failure)


async def cleanup_rag_for_olorin():
    """Clean up RAG system during Olorin server shutdown."""
    startup_manager = get_rag_startup_manager()
    await startup_manager.cleanup_rag_system()


def get_rag_status() -> dict:
    """Get current RAG system status for health checks."""
    startup_manager = get_rag_startup_manager()
    return startup_manager.get_status()