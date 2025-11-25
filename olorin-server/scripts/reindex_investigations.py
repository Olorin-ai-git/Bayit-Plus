#!/usr/bin/env python3
"""Re-index completed investigations to pick up transaction data from progress_json."""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select

from app.models.investigation_state import InvestigationState
from app.persistence.database import get_db_session
from app.service.logging import get_bridge_logger
from app.service.rag.investigation_indexer import get_investigation_indexer

logger = get_bridge_logger(__name__)


async def reindex_investigations(force_all: bool = False):
    """Re-index completed investigations."""
    indexer = get_investigation_indexer()

    with get_db_session() as session:
        # Get all completed investigations
        query = select(InvestigationState).where(
            InvestigationState.status == "COMPLETED"
        )
        result = session.execute(query)
        investigations = result.scalars().all()

        print(f"Found {len(investigations)} completed investigations")

        if not force_all:
            # Check which ones are already indexed
            from app.service.database.models import Document
            from app.service.database.vector_database_config import get_vector_db_config

            db_config = get_vector_db_config()

            collection_id = await indexer.ensure_investigation_collection()

            indexed_ids = set()
            if db_config.is_postgresql:
                async with db_config.session() as vec_session:
                    query = select(Document).where(
                        Document.collection_id == collection_id
                    )
                    vec_result = await vec_session.execute(query)
                    for doc in vec_result.scalars().all():
                        if doc.meta_data and doc.meta_data.get("investigation_id"):
                            indexed_ids.add(doc.meta_data["investigation_id"])
            else:
                with db_config.session() as vec_session:
                    from sqlalchemy import text

                    query_text = text(
                        """
                        SELECT json_extract(meta_data, '$.investigation_id') as inv_id
                        FROM documents
                        WHERE collection_id = :collection_id
                    """
                    )
                    vec_result = vec_session.execute(
                        query_text, {"collection_id": collection_id}
                    )
                    for row in vec_result:
                        if row[0]:
                            indexed_ids.add(row[0])

            print(f"Found {len(indexed_ids)} already indexed investigations")

            # Filter to only unindexed or force re-index
            if not force_all:
                to_index = [
                    inv
                    for inv in investigations
                    if inv.investigation_id not in indexed_ids
                ]
                print(f"Will index {len(to_index)} new investigations")
            else:
                to_index = investigations
                print(f"Will re-index all {len(to_index)} investigations (force mode)")
        else:
            to_index = investigations

        # Index each investigation
        indexed_count = 0
        failed_count = 0

        for investigation in to_index:
            try:
                print(f"\nIndexing investigation: {investigation.investigation_id}")
                success = await indexer.index_investigation(
                    investigation.investigation_id
                )
                if success:
                    indexed_count += 1
                    print(f"  ✅ Successfully indexed")
                else:
                    failed_count += 1
                    print(f"  ❌ Failed to index")
            except Exception as e:
                failed_count += 1
                print(f"  ❌ Error: {e}")
                logger.error(
                    f"Failed to index {investigation.investigation_id}: {e}",
                    exc_info=True,
                )

        print(f"\n{'='*60}")
        print(f"Re-indexing complete!")
        print(f"  Successfully indexed: {indexed_count}")
        print(f"  Failed: {failed_count}")
        print(f"  Total processed: {indexed_count + failed_count}")
        print(f"{'='*60}")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Re-index completed investigations")
    parser.add_argument(
        "--force-all",
        action="store_true",
        help="Force re-indexing of all investigations (even if already indexed)",
    )

    args = parser.parse_args()

    asyncio.run(reindex_investigations(force_all=args.force_all))
