"""
Transaction Key Normalizer

Deterministic mapping layer for transaction IDs to ensure consistent joins.
Normalizes transaction keys upfront: transaction_id := COALESCE(TX_ID_KEY, TRANSACTION_ID, tx_id)

Constitutional Compliance:
- Deterministic mapping - same input always produces same output
- Handles all key variations (case, aliasing)
- No hardcoded business logic
"""

from typing import Any, Dict, List, Optional

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def normalize_transaction_id(tx: Dict[str, Any]) -> Optional[str]:
    """
    Normalize transaction ID from transaction dict using deterministic mapping.

    Mapping order (COALESCE logic):
    1. TX_ID_KEY (Snowflake primary key)
    2. TRANSACTION_ID (alternative key)
    3. tx_id_key (lowercase variant)
    4. transaction_id (lowercase variant)
    5. tx_id (short variant)

    Args:
        tx: Transaction dictionary

    Returns:
        Normalized transaction ID as string, or None if not found
    """
    # Try uppercase first (Snowflake default)
    tx_id = tx.get("TX_ID_KEY") or tx.get("TRANSACTION_ID")
    if tx_id:
        return str(tx_id)

    # Try lowercase variants
    tx_id = tx.get("tx_id_key") or tx.get("transaction_id") or tx.get("tx_id")
    if tx_id:
        return str(tx_id)

    # Try any key containing 'transaction' or 'tx_id'
    for key, value in tx.items():
        if value and ("transaction" in key.lower() or "tx_id" in key.lower()):
            return str(value)

    return None


def normalize_transaction_keys(
    transactions: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """
    Normalize transaction keys for all transactions in a list.

    Adds a normalized 'transaction_id' field to each transaction dict.

    Args:
        transactions: List of transaction dictionaries

    Returns:
        List of transactions with normalized 'transaction_id' field added
    """
    normalized = []
    missing_keys = 0

    for tx in transactions:
        normalized_id = normalize_transaction_id(tx)

        if normalized_id:
            # Add normalized transaction_id field
            tx_normalized = {**tx, "transaction_id": normalized_id}
            normalized.append(tx_normalized)
        else:
            missing_keys += 1
            logger.debug(
                f"Transaction missing transaction ID: {list(tx.keys())[:5]}..."
            )

    if missing_keys > 0:
        logger.warning(
            f"⚠️ {missing_keys} transactions missing transaction ID (out of {len(transactions)})"
        )

    return normalized


def extract_transaction_ids(transactions: List[Dict[str, Any]]) -> List[str]:
    """
    Extract normalized transaction IDs from a list of transactions.

    Args:
        transactions: List of transaction dictionaries

    Returns:
        List of normalized transaction ID strings
    """
    tx_ids = []
    for tx in transactions:
        tx_id = normalize_transaction_id(tx)
        if tx_id:
            tx_ids.append(tx_id)
    return tx_ids
