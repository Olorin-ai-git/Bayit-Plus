#!/usr/bin/env python3
"""
Check if precision detection migrations have been run.

Usage:
    python scripts/check_precision_migrations.py
"""

import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import inspect, text

from app.persistence.database import get_db_session
from app.service.logging import configure_unified_logging, get_bridge_logger
from app.service.logging.unified_logging_core import LogFormat, LogOutput

logger = get_bridge_logger(__name__)


def check_precision_tables():
    """Check if precision detection tables exist."""
    try:
        with get_db_session() as db:
            inspector = inspect(db.bind)
            table_names = inspector.get_table_names()

            # Check for views (SQLite)
            view_names = []
            try:
                if "sqlite" in str(db.bind.url).lower():
                    result = db.execute(
                        text("SELECT name FROM sqlite_master WHERE type='view'")
                    )
                    view_names = [row[0] for row in result]
                elif hasattr(inspector, "get_view_names"):
                    view_names = inspector.get_view_names()
            except Exception:
                pass

            # Required precision detection tables
            required_tables = [
                "pg_transactions",
                "pg_merchants",
                "labels_truth",
                "pg_enrichment_scores",
                "pg_alerts",
            ]

            # Required views (from SQLite-compatible migrations)
            required_views = [
                "mv_features_txn",
                "mv_burst_flags",
                "mv_merchant_day",
                "mv_peer_stats",
                "mv_peer_flags",
                "mv_txn_feats_basic",
                "mv_txn_graph_feats",
                "mv_trailing_merchant",
            ]

            print("=" * 60)
            print("PRECISION DETECTION MIGRATION STATUS")
            print("=" * 60)
            print(f"\nDatabase: {db.bind.url}")
            print(f"Total tables: {len(table_names)}")
            print(f"Total views: {len(view_names)}")

            print("\n" + "-" * 60)
            print("REQUIRED TABLES:")
            print("-" * 60)
            missing_tables = []
            for table in required_tables:
                exists = table in table_names
                status = "✅" if exists else "❌"
                print(f"{status} {table}")
                if not exists:
                    missing_tables.append(table)

            print("\n" + "-" * 60)
            print("REQUIRED VIEWS:")
            print("-" * 60)
            missing_views = []
            for view in required_views:
                exists = view in view_names
                status = "✅" if exists else "❌"
                print(f"{status} {view}")
                if not exists:
                    missing_views.append(view)

            print("\n" + "=" * 60)
            if missing_tables or missing_views:
                print("❌ MIGRATION INCOMPLETE")
                if missing_tables:
                    print(f"\nMissing tables: {', '.join(missing_tables)}")
                if missing_views:
                    print(f"Missing views: {', '.join(missing_views)}")
                print("\nTo fix, run:")
                print("  python scripts/run_precision_migrations.py")
                return False
            else:
                print("✅ ALL PRECISION DETECTION TABLES AND VIEWS EXIST")
                return True

    except Exception as e:
        logger.error(f"Failed to check migrations: {e}", exc_info=True)
        print(f"\n❌ ERROR: {e}")
        return False


def main():
    """Main entry point."""
    configure_unified_logging(
        log_level="INFO",
        log_format=LogFormat.HUMAN,
        log_outputs=[LogOutput.CONSOLE],
        lazy_initialization=False,
        suppress_noisy_loggers=False,
    )

    success = check_precision_tables()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
