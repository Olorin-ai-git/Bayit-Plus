"""
Enrichment Pipeline Orchestration

Orchestrates all enrichment steps (graph, BIN, IP, email, phone) for batch processing.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import text

from app.config.snowflake_config import SnowflakeConfig
from app.persistence.database import get_db_session
from app.service.graph.neo4j_client import Neo4jClient
from app.service.logging import get_bridge_logger
from app.service.precision_detection.performance_monitor import track_pipeline_metrics
from app.service.snowflake_service import (
    SnowflakeConnectionFactory,
    SnowflakeQueryService,
)
from scripts.enrichment.bin_enrichment import enrich_transactions_bin
from scripts.enrichment.email_phone_enrichment import enrich_transactions_email_phone
from scripts.enrichment.graph_analytics_export import (
    graph_analytics_export,
    load_graph_features_to_postgres,
)
from scripts.enrichment.ip_enrichment import enrich_transactions_ip_sync

logger = get_bridge_logger(__name__)


def get_transactions_to_enrich(
    limit: Optional[int] = None, min_age_days: int = 14
) -> List[Dict[str, Any]]:
    """Get transactions that need enrichment."""
    with get_db_session() as db:
        query = text(
            """
            SELECT t.txn_id, t.txn_ts, t.merchant_id, t.card_id, t.amount, t.currency,
                   t.country, t.mcc, t.region, t.ip_address, t.email, t.phone_number
            FROM pg_transactions t
            LEFT JOIN pg_enrichment_scores e ON e.txn_id = t.txn_id
            WHERE t.txn_ts <= NOW() - INTERVAL :min_age_days || ' days' AND e.txn_id IS NULL
            ORDER BY t.txn_ts DESC LIMIT :limit
        """
        )
        results = db.execute(
            query, {"min_age_days": min_age_days, "limit": limit or 10000}
        ).fetchall()
        transactions = [
            {
                "txn_id": r.txn_id,
                "txn_ts": r.txn_ts,
                "merchant_id": r.merchant_id,
                "card_id": r.card_id,
                "amount": float(r.amount) if r.amount else None,
                "currency": r.currency,
                "country": r.country,
                "mcc": r.mcc,
                "region": r.region,
                "ip_address": getattr(r, "ip_address", None),
                "ip": getattr(r, "ip_address", None),
                "email": getattr(r, "email", None),
                "billing_email": getattr(r, "email", None),
                "phone": getattr(r, "phone_number", None),
                "customer_phone": getattr(r, "phone_number", None),
                "phone_number": getattr(r, "phone_number", None),
            }
            for r in results
        ]
        logger.info(f"Retrieved {len(transactions)} transactions for enrichment")
        return transactions


def run_enrichment_pipeline(
    transactions: Optional[List[Dict[str, Any]]] = None,
    steps: Optional[List[str]] = None,
    limit: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Orchestrate all enrichment steps (graph, BIN, IP, email, phone).

    Args:
        transactions: Optional list of transactions to enrich (if None, fetches from DB)
        steps: Optional list of enrichment steps to run (if None, runs all)
        limit: Maximum number of transactions to process

    Returns:
        Dictionary with enrichment statistics
    """
    if steps is None:
        steps = ["bin", "ip", "email_phone", "graph"]  # Graph enrichment included

    if transactions is None:
        transactions = get_transactions_to_enrich(limit=limit)

    if not transactions:
        logger.warning("No transactions to enrich")
        return {"total": 0, "enriched": 0, "steps_completed": []}

    stats = {
        "total": len(transactions),
        "enriched": 0,
        "steps_completed": [],
        "start_time": datetime.now(),
    }

    try:
        # BIN enrichment
        if "bin" in steps:
            logger.info("Starting BIN enrichment...")
            enrich_transactions_bin(transactions)
            stats["steps_completed"].append("bin")
            logger.info("BIN enrichment complete")

        # IP enrichment
        if "ip" in steps:
            logger.info("Starting IP enrichment...")
            enrich_transactions_ip_sync(transactions)
            stats["steps_completed"].append("ip")
            logger.info("IP enrichment complete")

        # Email/Phone enrichment
        if "email_phone" in steps:
            logger.info("Starting email/phone enrichment...")
            enrich_transactions_email_phone(transactions)
            stats["steps_completed"].append("email_phone")
            logger.info("Email/phone enrichment complete")

        # Graph enrichment (exports from Snowflake to Neo4j, then loads features to PostgreSQL)
        if "graph" in steps:
            logger.info("Starting graph analytics export...")
            config = SnowflakeConfig()
            connection_factory = SnowflakeConnectionFactory(config)
            sf_service = SnowflakeQueryService(connection_factory)
            neo4j_client = Neo4jClient()

            export_stats = graph_analytics_export(sf_service, neo4j_client, limit=limit)
            if export_stats.get("status") != "skipped":
                feature_stats = load_graph_features_to_postgres(
                    neo4j_client, limit=limit
                )
                stats["steps_completed"].append("graph")
                logger.info("Graph analytics enrichment complete")

        # Count enriched transactions
        with get_db_session() as db:
            count_query = text(
                """
                SELECT COUNT(DISTINCT txn_id) as enriched_count
                FROM pg_enrichment_scores
                WHERE txn_id = ANY(:txn_ids)
            """
            )

            txn_ids = [t["txn_id"] for t in transactions]
            result = db.execute(count_query, {"txn_ids": txn_ids}).fetchone()
            stats["enriched"] = result.enriched_count if result else 0

        stats["end_time"] = datetime.now()
        stats["duration_seconds"] = (
            stats["end_time"] - stats["start_time"]
        ).total_seconds()

        track_pipeline_metrics(
            "Enrichment Pipeline",
            {
                "transactions_processed": stats["total"],
                "transactions_enriched": stats["enriched"],
                "execution_time_seconds": stats["duration_seconds"],
                "steps_completed": stats["steps_completed"],
            },
        )

        logger.info(
            f"Enrichment pipeline complete: {stats['enriched']}/{stats['total']} transactions enriched "
            f"in {stats['duration_seconds']:.2f} seconds"
        )

        return stats

    except Exception as e:
        logger.error(f"Enrichment pipeline failed: {e}", exc_info=True)
        stats["error"] = str(e)
        stats["end_time"] = datetime.now()
        raise


def main():
    """Main enrichment pipeline entry point."""
    import argparse

    parser = argparse.ArgumentParser(description="Run enrichment pipeline")
    parser.add_argument(
        "--limit", type=int, help="Maximum number of transactions to process"
    )
    parser.add_argument(
        "--steps",
        nargs="+",
        choices=["bin", "ip", "email_phone", "graph"],
        help="Enrichment steps to run (default: all)",
    )
    parser.add_argument(
        "--min-age-days",
        type=int,
        default=14,
        help="Minimum age in days for transactions to enrich",
    )

    args = parser.parse_args()

    stats = run_enrichment_pipeline(steps=args.steps, limit=args.limit)

    print(
        f"Enrichment complete: {stats['enriched']}/{stats['total']} transactions enriched"
    )
    print(f"Steps completed: {', '.join(stats['steps_completed'])}")
    print(f"Duration: {stats.get('duration_seconds', 0):.2f} seconds")


if __name__ == "__main__":
    main()
