from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

"""
CLI management tool for PostgreSQL + pgvector RAG system.
Provides commands for migration, maintenance, and administration.
"""

import argparse
import asyncio
import json
import logging
import os
import sys
from datetime import datetime
from typing import Optional

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../.."))

from app.service.database.vector_database_config import (
    get_vector_db_config,
    initialize_vector_database,
)
from app.service.rag.embedding_service import (
    get_embedding_service,
    initialize_embedding_service,
)
from app.service.rag.migration_service import get_migration_service
from app.service.rag.vector_rag_service import get_rag_service

# Set up logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class RAGCLIManager:
    """Command-line interface for RAG system management."""

    def __init__(self):
        """Initialize CLI manager."""
        self.db_config = None
        self.migration_service = None
        self.rag_service = None
        self.embedding_service = None

    async def initialize_services(self):
        """Initialize all required services."""
        logger.info("🚀 Initializing RAG system services...")

        try:
            # Initialize database
            self.db_config = get_vector_db_config()
            await initialize_vector_database()

            # Initialize embedding service
            self.embedding_service = await initialize_embedding_service()

            # Initialize RAG service
            self.rag_service = get_rag_service(self.embedding_service)

            # Initialize migration service
            self.migration_service = get_migration_service()

            logger.info("✅ All services initialized successfully")

        except Exception as e:
            logger.error(f"Failed to initialize services: {e}")
            raise

    async def setup_database(self):
        """Set up PostgreSQL database with pgvector extension."""
        logger.info("🔧 Setting up PostgreSQL database...")

        try:
            # Test connection and setup extensions
            await self.db_config.initialize_engine()
            logger.info("✅ Database setup completed successfully")

        except Exception as e:
            logger.error(f"Database setup failed: {e}")
            logger.error(
                "Make sure PostgreSQL is running and pgvector extension is available"
            )
            raise

    async def run_migrations(self):
        """Run database migrations to create schema."""
        logger.info("📋 Running database migrations...")

        try:
            # This would typically run alembic migrations
            # For now, we'll create tables programmatically
            from app.service.database.models import VectorBase

            async with self.db_config.session() as session:
                # Create all tables
                async with session.bind.begin() as conn:
                    await conn.run_sync(VectorBase.metadata.create_all)

                logger.info("✅ Database migrations completed")

                # Create vector indexes
                await self._create_vector_indexes()

        except Exception as e:
            logger.error(f"Migration failed: {e}")
            raise

    async def _create_vector_indexes(self):
        """Create vector similarity indexes."""
        logger.info("🔍 Creating vector similarity indexes...")

        try:
            # Create indexes for better performance
            await self.db_config.create_vector_index(
                "document_chunks",
                "embedding_openai",
                "ivfflat",
                100,
                "vector_cosine_ops",
            )
            await self.db_config.create_vector_index(
                "document_chunks",
                "embedding_sentence",
                "ivfflat",
                50,
                "vector_cosine_ops",
            )

            logger.info("✅ Vector indexes created successfully")

        except Exception as e:
            logger.warning(f"Failed to create some vector indexes: {e}")

    async def check_status(self):
        """Check system status and configuration."""
        logger.info("📊 Checking RAG system status...")

        try:
            # Check database connection
            async with self.db_config.session() as session:
                await session.execute("SELECT 1")
            logger.info("✅ Database: Connected")

            # Check pgvector extension
            result = await self.db_config.execute_raw_query(
                "SELECT extversion FROM pg_extension WHERE extname = 'vector'"
            )
            if result:
                logger.info(f"✅ pgvector: Version {result[0]['extversion']}")
            else:
                logger.info("❌ pgvector: Not installed")

            # Check embedding service
            providers = self.embedding_service.get_available_providers()
            logger.info(f"✅ Embedding providers: {', '.join(providers)}")

            # Check data statistics
            stats = await self._get_data_statistics()
            logger.info("\n📈 Data Statistics:")
            for key, value in stats.items():
                logger.info(f"   {key}: {value}")

        except Exception as e:
            logger.error(f"Status check failed: {e}")
            raise

    async def _get_data_statistics(self) -> dict:
        """Get current data statistics."""
        try:
            async with self.db_config.session() as session:
                # Collections
                result = await session.execute(
                    "SELECT COUNT(*) FROM document_collections WHERE is_active = true"
                )
                collections = result.scalar()

                # Documents
                result = await session.execute(
                    "SELECT COUNT(*) FROM documents WHERE is_active = true"
                )
                documents = result.scalar()

                # Chunks
                result = await session.execute(
                    "SELECT COUNT(*) FROM document_chunks WHERE is_active = true"
                )
                chunks = result.scalar()

                # Embeddings
                result = await session.execute(
                    """
                    SELECT 
                        COUNT(CASE WHEN embedding_openai IS NOT NULL THEN 1 END) as openai,
                        COUNT(CASE WHEN embedding_sentence IS NOT NULL THEN 1 END) as sentence,
                        COUNT(CASE WHEN embedding_openai_large IS NOT NULL THEN 1 END) as openai_large
                    FROM document_chunks WHERE is_active = true
                """
                )
                embeddings = result.fetchone()

                return {
                    "Collections": collections,
                    "Documents": documents,
                    "Chunks": chunks,
                    "OpenAI Embeddings": embeddings[0] if embeddings else 0,
                    "Sentence Embeddings": embeddings[1] if embeddings else 0,
                    "OpenAI Large Embeddings": embeddings[2] if embeddings else 0,
                }

        except Exception as e:
            logger.error(f"Failed to get statistics: {e}")
            return {}

    async def migrate_from_sqlite(self, sqlite_path: Optional[str] = None):
        """Migrate data from SQLite to PostgreSQL."""
        logger.info("🔄 Starting migration from SQLite...")

        try:
            migration_service = get_migration_service(sqlite_path)

            # Check migration status
            status = await migration_service.check_migration_status()
            logger.info("📋 Migration Status:")
            logger.info(f"   SQLite available: {status['sqlite_available']}")
            logger.info(f"   SQLite path: {status['sqlite_path']}")
            logger.info(f"   PostgreSQL available: {status['postgres_available']}")
            logger.info(f"   Migration needed: {status['migration_needed']}")

            if status["recommendations"]:
                logger.info("💡 Recommendations:")
                for rec in status["recommendations"]:
                    logger.info(f"   - {rec}")

            if not status["migration_needed"]:
                logger.info("ℹ️  No migration needed")
                return

            # Perform migration
            result = await migration_service.migrate_from_sqlite(
                create_collections=True,
                regenerate_embeddings=True,
                embedding_provider="openai",
            )

            logger.info("\n📊 Migration Results:")
            logger.info(f"   Success: {result['success']}")
            logger.info(f"   Collections created: {result['collections_created']}")
            logger.info(f"   Documents migrated: {result['documents_migrated']}")
            logger.info(f"   Chunks migrated: {result['chunks_migrated']}")
            logger.info(f"   Embeddings generated: {result['embeddings_generated']}")
            logger.info(f"   Processing time: {result['processing_time_ms']}ms")

            if result["errors"]:
                logger.error("❌ Errors:")
                for error in result["errors"]:
                    logger.error(f"   - {error}")

            # Validate migration
            if result["success"]:
                logger.info("🔍 Validating migration...")
                validation = await migration_service.validate_migration()

                logger.info("\n✅ Migration Validation:")
                logger.info(f"   Success: {validation['success']}")

                if validation["issues"]:
                    logger.info("   Issues:")
                    for issue in validation["issues"]:
                        logger.info(f"     - {issue}")

                if validation["recommendations"]:
                    logger.info("   Recommendations:")
                    for rec in validation["recommendations"]:
                        logger.info(f"     - {rec}")

        except Exception as e:
            logger.error(f"Migration failed: {e}")
            raise

    async def test_search(self, query: str, limit: int = 5):
        """Test similarity search functionality."""
        logger.info(f"🔍 Testing search with query: '{query}'")

        try:
            # Perform search
            results = await self.rag_service.search_similar(
                query=query,
                limit=limit,
                similarity_threshold=0.5,
                embedding_type="openai",
            )

            logger.info(f"\n📋 Search Results ({len(results)} found):")

            for i, result in enumerate(results, 1):
                logger.info(f"\n{i}. Document: {result.document_title}")
                logger.info(f"   Similarity: {result.similarity_score:.3f}")
                logger.info(f"   Content: {result.content[:200]}...")
                if result.keywords:
                    logger.info(f"   Keywords: {', '.join(result.keywords[:5])}")

            if not results:
                logger.info(
                    "   No results found. Make sure documents are ingested and have embeddings."
                )

        except Exception as e:
            logger.error(f"Search test failed: {e}")
            raise

    async def add_sample_documents(self):
        """Add sample documents for testing."""
        logger.info("📚 Adding sample documents...")

        try:
            # Create a test collection
            collection_id = await self.rag_service.create_collection(
                name="test_documents", description="Sample documents for testing"
            )

            sample_docs = [
                {
                    "title": "Credit Card Fraud Detection Basics",
                    "content": """
                    Credit card fraud detection involves monitoring transaction patterns to identify
                    potentially fraudulent activities. Key indicators include unusual spending patterns,
                    transactions in foreign countries, and purchases that don't match the cardholder's
                    typical behavior. Machine learning algorithms can be trained to detect these patterns
                    and flag suspicious transactions for review.
                    """,
                },
                {
                    "title": "Money Laundering Investigation Techniques",
                    "content": """
                    Money laundering investigations require careful analysis of financial flows and
                    transaction patterns. Investigators look for structuring (breaking large transactions
                    into smaller ones), unusual cash deposits, and complex transaction chains designed
                    to obscure the source of funds. Documentation and audit trails are crucial for
                    building a case.
                    """,
                },
                {
                    "title": "Identity Theft Prevention Methods",
                    "content": """
                    Identity theft prevention involves protecting personal information and monitoring
                    for unauthorized use. Common prevention methods include regular credit report checks,
                    using strong passwords, avoiding phishing scams, and securing sensitive documents.
                    Organizations should implement multi-factor authentication and regular security
                    awareness training.
                    """,
                },
            ]

            for doc in sample_docs:
                result = await self.rag_service.ingest_document(
                    collection_id=collection_id,
                    title=doc["title"],
                    content=doc["content"].strip(),
                    source_type="sample",
                    generate_embeddings=True,
                )

                if result.success:
                    logger.info(
                        f"✅ Added: {doc['title']} ({result.chunk_count} chunks)"
                    )
                else:
                    logger.error(
                        f"❌ Failed to add: {doc['title']} - {result.error_message}"
                    )

            logger.info("✅ Sample documents added successfully")

        except Exception as e:
            logger.error(f"Failed to add sample documents: {e}")
            raise

    async def cleanup(self):
        """Cleanup resources."""
        if self.db_config:
            await self.db_config.close()
        logger.info("🧹 Cleanup completed")


async def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="RAG System Management CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python cli_manager.py setup                    # Initial database setup
  python cli_manager.py migrate --sqlite-path /path/to/db.sqlite
  python cli_manager.py status                   # Check system status
  python cli_manager.py test-search "fraud detection"
  python cli_manager.py add-samples              # Add sample documents
        """,
    )

    parser.add_argument(
        "command",
        choices=["setup", "migrate", "status", "test-search", "add-samples"],
        help="Command to execute",
    )

    parser.add_argument("--sqlite-path", help="Path to SQLite database for migration")

    parser.add_argument("--query", help="Search query for test-search command")

    parser.add_argument(
        "--limit", type=int, default=5, help="Number of search results to return"
    )

    args = parser.parse_args()

    # Initialize CLI manager
    cli = RAGCLIManager()

    try:
        await cli.initialize_services()

        if args.command == "setup":
            await cli.setup_database()
            await cli.run_migrations()

        elif args.command == "migrate":
            await cli.migrate_from_sqlite(args.sqlite_path)

        elif args.command == "status":
            await cli.check_status()

        elif args.command == "test-search":
            query = args.query or "fraud detection"
            await cli.test_search(query, args.limit)

        elif args.command == "add-samples":
            await cli.add_sample_documents()

    except KeyboardInterrupt:
        logger.info("Operation cancelled by user")

    except Exception as e:
        logger.error(f"Command failed: {e}")
        sys.exit(1)

    finally:
        await cli.cleanup()


if __name__ == "__main__":
    asyncio.run(main())
