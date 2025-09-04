#!/usr/bin/env python3
"""
Setup script for PostgreSQL + pgvector RAG system.
Run this script to initialize the database and test the system.
"""

import asyncio
import os
import sys
import logging

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.service.rag.cli_manager import RAGCLIManager

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

async def main():
    """Main setup function."""
    print("🚀 Setting up PostgreSQL + pgvector RAG system for Olorin...")
    print()
    
    # Check environment variables
    print("📋 Checking environment configuration...")
    
    # Check database configuration
    db_configured = False
    if os.getenv("DATABASE_URL"):
        print("✅ DATABASE_URL found")
        db_configured = True
    elif all(os.getenv(var) for var in ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"]):
        print("✅ Database connection parameters found")
        db_configured = True
    else:
        print("❌ Database not configured")
        print("   Please set either:")
        print("   - DATABASE_URL environment variable, OR")
        print("   - DB_HOST, DB_USER, DB_PASSWORD, DB_NAME environment variables")
        print()
        print("Example for local PostgreSQL:")
        print("   export DB_HOST=localhost")
        print("   export DB_PORT=5432")
        print("   export DB_USER=postgres")
        print("   export DB_PASSWORD=your_password")
        print("   export DB_NAME=fraud_detection_vector")
        print()
        print("Or using DATABASE_URL:")
        print("   export DATABASE_URL=postgresql://postgres:password@localhost:5432/fraud_detection_vector")
        return
    
    # Check OpenAI API key (optional)
    if os.getenv("OPENAI_API_KEY"):
        print("✅ OpenAI API key found - will use OpenAI embeddings")
    else:
        print("⚠️  OpenAI API key not found - will use local embeddings only")
        print("   Set OPENAI_API_KEY for better embedding quality")
    
    print()
    
    # Initialize CLI manager and run setup
    cli = RAGCLIManager()
    
    try:
        print("🔧 Initializing services...")
        await cli.initialize_services()
        
        print("📊 Setting up database...")
        await cli.setup_database()
        await cli.run_migrations()
        
        print("📈 Checking system status...")
        await cli.check_status()
        
        print("📚 Adding sample documents...")
        await cli.add_sample_documents()
        
        print("🔍 Testing search functionality...")
        await cli.test_search("fraud detection", limit=3)
        
        print()
        print("✅ Setup completed successfully!")
        print()
        print("🎯 Next steps:")
        print("   1. Start the Olorin server: npm run olorin")
        print("   2. The RAG system will be available for fraud investigations")
        print("   3. Use the CLI manager for additional operations:")
        print(f"      python {__file__} --help")
        print()
        print("📖 Available CLI commands:")
        print("   python app/service/rag/cli_manager.py status")
        print("   python app/service/rag/cli_manager.py test-search 'your query'")
        print("   python app/service/rag/cli_manager.py migrate --sqlite-path /path/to/old.db")
        
    except Exception as e:
        print(f"❌ Setup failed: {e}")
        print()
        print("🔧 Troubleshooting:")
        print("   1. Make sure PostgreSQL is running and accessible")
        print("   2. Ensure the database user has CREATE privileges")
        print("   3. Install pgvector extension: CREATE EXTENSION vector;")
        print("   4. Check that all environment variables are set correctly")
        
        return
    
    finally:
        await cli.cleanup()

if __name__ == "__main__":
    asyncio.run(main())