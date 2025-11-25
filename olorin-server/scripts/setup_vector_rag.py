from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

#!/usr/bin/env python3
"""
Setup script for PostgreSQL + pgvector RAG system.
Run this script to initialize the database and test the system.
"""

import asyncio
import logging
import os
import sys

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.service.rag.cli_manager import RAGCLIManager

# Set up logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)


async def main():
    """Main setup function."""
    logger.info("🚀 Setting up PostgreSQL + pgvector RAG system for Olorin...")
    logger.info()

    # Check environment variables
    logger.info("📋 Checking environment configuration...")

    # Check database configuration
    db_configured = False
    if os.getenv("DATABASE_URL"):
        logger.info("✅ DATABASE_URL found")
        db_configured = True
    elif all(
        os.getenv(var) for var in ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"]
    ):
        logger.info("✅ Database connection parameters found")
        db_configured = True
    else:
        logger.info("❌ Database not configured")
        logger.info("   Please set either:")
        logger.info("   - DATABASE_URL environment variable, OR")
        logger.info("   - DB_HOST, DB_USER, DB_PASSWORD, DB_NAME environment variables")
        logger.info()
        logger.info("Example for local PostgreSQL:")
        logger.info("   export DB_HOST=localhost")
        logger.info("   export DB_PORT=5432")
        logger.info("   export DB_USER=postgres")
        logger.info("   export DB_PASSWORD=your_password")
        logger.info("   export DB_NAME=fraud_detection_vector")
        logger.info()
        logger.info("Or using DATABASE_URL:")
        logger.info(
            "   export DATABASE_URL=postgresql://postgres:password@localhost:5432/fraud_detection_vector"
        )
        return

    # Check OpenAI API key (optional)
    if os.getenv("OPENAI_API_KEY"):
        logger.info("✅ OpenAI API key found - will use OpenAI embeddings")
    else:
        logger.info("⚠️  OpenAI API key not found - will use local embeddings only")
        logger.info("   Set OPENAI_API_KEY for better embedding quality")

    logger.info()

    # Initialize CLI manager and run setup
    cli = RAGCLIManager()

    try:
        logger.info("🔧 Initializing services...")
        await cli.initialize_services()

        logger.info("📊 Setting up database...")
        await cli.setup_database()
        await cli.run_migrations()

        logger.info("📈 Checking system status...")
        await cli.check_status()

        logger.info("📚 Adding sample documents...")
        await cli.add_sample_documents()

        logger.info("🔍 Testing search functionality...")
        await cli.test_search("fraud detection", limit=3)

        logger.info()
        logger.info("✅ Setup completed successfully!")
        logger.info()
        logger.info("🎯 Next steps:")
        logger.info("   1. Start the Olorin server: npm run olorin")
        logger.info("   2. The RAG system will be available for fraud investigations")
        logger.info("   3. Use the CLI manager for additional operations:")
        logger.info(f"      python {__file__} --help")
        logger.info()
        logger.info("📖 Available CLI commands:")
        logger.info("   python app/service/rag/cli_manager.py status")
        logger.info("   python app/service/rag/cli_manager.py test-search 'your query'")
        logger.info(
            "   python app/service/rag/cli_manager.py migrate --sqlite-path /path/to/old.db"
        )

    except Exception as e:
        logger.error(f"❌ Setup failed: {e}")
        logger.info()
        logger.info("🔧 Troubleshooting:")
        logger.info("   1. Make sure PostgreSQL is running and accessible")
        logger.info("   2. Ensure the database user has CREATE privileges")
        logger.info("   3. Install pgvector extension: CREATE EXTENSION vector;")
        logger.info("   4. Check that all environment variables are set correctly")

        return

    finally:
        await cli.cleanup()


if __name__ == "__main__":
    asyncio.run(main())
