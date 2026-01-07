"""
Olorin Score Fetcher - Retrieves actual Olorin-computed transaction scores from PostgreSQL.

Used by blindspot analysis to compare actual Olorin predictions vs nSure predictions.

Feature: blindspot-analysis
"""

from datetime import datetime
from typing import Dict, List, Optional, Tuple

from sqlalchemy import text

from app.persistence.database import get_db
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def fetch_olorin_transaction_scores(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    investigation_ids: Optional[List[str]] = None,
) -> Dict[str, float]:
    """
    Fetch all Olorin-computed transaction scores from PostgreSQL.

    Args:
        start_date: Optional start date filter (based on investigation created_at)
        end_date: Optional end date filter
        investigation_ids: Optional list of specific investigation IDs

    Returns:
        Dictionary mapping transaction_id -> olorin_risk_score
    """
    db_gen = get_db()
    db = next(db_gen)

    try:
        # Build query with optional filters
        query_parts = [
            """
            SELECT ts.transaction_id, ts.risk_score
            FROM transaction_scores ts
            """
        ]

        where_clauses = []
        params = {}

        if investigation_ids:
            where_clauses.append("ts.investigation_id IN :investigation_ids")
            params["investigation_ids"] = tuple(investigation_ids)

        if start_date or end_date:
            # Join with investigation_states to filter by date
            query_parts[0] = """
                SELECT ts.transaction_id, ts.risk_score
                FROM transaction_scores ts
                JOIN investigation_states inv ON ts.investigation_id = inv.id
            """
            if start_date:
                where_clauses.append("inv.created_at >= :start_date")
                params["start_date"] = start_date
            if end_date:
                where_clauses.append("inv.created_at < :end_date")
                params["end_date"] = end_date

        if where_clauses:
            query_parts.append("WHERE " + " AND ".join(where_clauses))

        query = "\n".join(query_parts)

        logger.info(f"Fetching Olorin transaction scores from PostgreSQL...")
        result = db.execute(text(query), params)
        rows = result.fetchall()

        # Build transaction_id -> score mapping
        # If same transaction scored multiple times, take the latest (highest risk)
        scores = {}
        for row in rows:
            tx_id = str(row[0])
            score = float(row[1])
            # Keep highest score if duplicate (conservative approach)
            if tx_id not in scores or score > scores[tx_id]:
                scores[tx_id] = score

        logger.info(f"Fetched {len(scores)} unique Olorin transaction scores")
        return scores

    except Exception as e:
        logger.error(f"Failed to fetch Olorin scores: {e}", exc_info=True)
        return {}
    finally:
        db.close()


def fetch_olorin_scores_with_metadata(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> Tuple[Dict[str, float], Dict[str, str]]:
    """
    Fetch Olorin scores along with investigation metadata.

    Returns:
        Tuple of (transaction_id -> score, transaction_id -> investigation_id)
    """
    db_gen = get_db()
    db = next(db_gen)

    try:
        query = """
            SELECT ts.transaction_id, ts.risk_score, ts.investigation_id
            FROM transaction_scores ts
            JOIN investigation_states inv ON ts.investigation_id = inv.id
            WHERE inv.status = 'COMPLETED'
        """
        params = {}

        if start_date:
            query += " AND inv.created_at >= :start_date"
            params["start_date"] = start_date
        if end_date:
            query += " AND inv.created_at < :end_date"
            params["end_date"] = end_date

        result = db.execute(text(query), params)
        rows = result.fetchall()

        scores = {}
        inv_mapping = {}
        for row in rows:
            tx_id = str(row[0])
            score = float(row[1])
            inv_id = str(row[2])
            if tx_id not in scores or score > scores[tx_id]:
                scores[tx_id] = score
                inv_mapping[tx_id] = inv_id

        logger.info(
            f"Fetched {len(scores)} Olorin scores from {len(set(inv_mapping.values()))} investigations"
        )
        return scores, inv_mapping

    except Exception as e:
        logger.error(f"Failed to fetch Olorin scores with metadata: {e}", exc_info=True)
        return {}, {}
    finally:
        db.close()


def get_scored_transaction_ids(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    limit: int = 100000,
) -> List[str]:
    """
    Get list of transaction IDs that have Olorin scores.

    Args:
        start_date: Optional start date filter
        end_date: Optional end date filter
        limit: Maximum number of transaction IDs to return

    Returns:
        List of transaction IDs
    """
    db_gen = get_db()
    db = next(db_gen)

    try:
        query = """
            SELECT DISTINCT ts.transaction_id
            FROM transaction_scores ts
            JOIN investigation_states inv ON ts.investigation_id = inv.id
            WHERE inv.status = 'COMPLETED'
        """
        params = {}

        if start_date:
            query += " AND inv.created_at >= :start_date"
            params["start_date"] = start_date
        if end_date:
            query += " AND inv.created_at < :end_date"
            params["end_date"] = end_date

        query += f" LIMIT {limit}"

        result = db.execute(text(query), params)
        tx_ids = [str(row[0]) for row in result.fetchall()]

        logger.info(f"Found {len(tx_ids)} scored transaction IDs")
        return tx_ids

    except Exception as e:
        logger.error(f"Failed to get scored transaction IDs: {e}", exc_info=True)
        return []
    finally:
        db.close()
