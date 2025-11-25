#!/usr/bin/env python3
"""
CLI script to migrate RAG database columns from metadata to meta_data.
Run this script after updating the code to rename the column.
"""

import asyncio
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from app.persistence.migrations.rag_column_migration import (
    run_rag_column_migration,
    verify_rag_column_migration,
)
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


async def main():
    """Run the RAG column migration."""
    print("🔄 RAG Column Migration Tool")
    print("=" * 50)

    # Step 1: Verify current state
    print("\n📊 Step 1: Checking current database state...")
    verification = await verify_rag_column_migration()

    if verification["all_migrated"]:
        print("✅ Migration already completed - columns are already renamed")
        return 0

    # Step 2: Run migration
    print("\n🔄 Step 2: Running migration...")
    success = await run_rag_column_migration()

    if not success:
        print("❌ Migration failed - please check logs for details")
        return 1

    # Step 3: Verify migration
    print("\n🔍 Step 3: Verifying migration...")
    verification = await verify_rag_column_migration()

    if verification["all_migrated"]:
        print("✅ Migration completed and verified successfully!")
        print("\n📋 Summary:")
        print(
            f"   Documents table: {'✅ Migrated' if verification['documents_table']['migrated'] else '❌ Failed'}"
        )
        print(
            f"   Document chunks table: {'✅ Migrated' if verification['document_chunks_table']['migrated'] else '❌ Failed'}"
        )
        return 0
    else:
        print("⚠️ Migration completed but verification found issues")
        print("\n📋 Details:")
        print(f"   Documents table: {verification['documents_table']}")
        print(f"   Document chunks table: {verification['document_chunks_table']}")
        return 1


if __name__ == "__main__":
    try:
        exit_code = asyncio.run(main())
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\n\n⚠️ Migration interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Migration failed with error: {e}")
        logger.exception("Migration script failed")
        sys.exit(1)
