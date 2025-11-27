#!/usr/bin/env python3
"""
Create transaction_scores table.

This script creates the transaction_scores table in the database
to store per-transaction risk scores separately from investigation state.

Usage:
    poetry run python scripts/db/create_transaction_scores_table.py
"""

import sys
from pathlib import Path

# Add server root to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from sqlalchemy import create_engine, text
import os
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def create_transaction_scores_table():
    """Create transaction_scores table if it doesn't exist."""
    
    # Get database URL from environment or use default SQLite
    database_url = os.getenv("DATABASE_URL", "sqlite:///olorin.db")
    engine = create_engine(database_url)
    
    # DDL for transaction_scores table
    create_table_sql = """
    CREATE TABLE IF NOT EXISTS transaction_scores (
        investigation_id VARCHAR(255) NOT NULL,
        transaction_id VARCHAR(255) NOT NULL,
        risk_score FLOAT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (investigation_id, transaction_id)
    );
    """
    
    # Create indexes
    create_investigation_index_sql = """
    CREATE INDEX IF NOT EXISTS idx_investigation_scores 
    ON transaction_scores (investigation_id);
    """
    
    create_lookup_index_sql = """
    CREATE INDEX IF NOT EXISTS idx_transaction_lookup 
    ON transaction_scores (investigation_id, transaction_id);
    """
    
    try:
        with engine.connect() as conn:
            # Create table
            logger.info("Creating transaction_scores table...")
            conn.execute(text(create_table_sql))
            conn.commit()
            logger.info("✅ Table created successfully")
            
            # Create indexes
            logger.info("Creating indexes...")
            conn.execute(text(create_investigation_index_sql))
            conn.execute(text(create_lookup_index_sql))
            conn.commit()
            logger.info("✅ Indexes created successfully")
            
            # Verify table exists
            verify_sql = """
            SELECT COUNT(*) as count 
            FROM information_schema.tables 
            WHERE table_name = 'transaction_scores';
            """
            result = conn.execute(text(verify_sql))
            count = result.fetchone()[0]
            
            if count > 0:
                logger.info("✅ Verification: transaction_scores table exists")
                print("\n" + "="*80)
                print("SUCCESS: transaction_scores table created")
                print("="*80)
                print("\nTable: transaction_scores")
                print("Columns:")
                print("  - investigation_id VARCHAR(255) NOT NULL")
                print("  - transaction_id VARCHAR(255) NOT NULL")
                print("  - risk_score FLOAT NOT NULL")
                print("  - created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
                print("\nPrimary Key: (investigation_id, transaction_id)")
                print("\nIndexes:")
                print("  - idx_investigation_scores ON (investigation_id)")
                print("  - idx_transaction_lookup ON (investigation_id, transaction_id)")
                print("="*80 + "\n")
                return True
            else:
                logger.error("❌ Verification failed: table not found")
                return False
                
    except Exception as e:
        logger.error(f"❌ Failed to create transaction_scores table: {e}", exc_info=True)
        print(f"\nERROR: {e}\n")
        return False


if __name__ == "__main__":
    success = create_transaction_scores_table()
    sys.exit(0 if success else 1)

