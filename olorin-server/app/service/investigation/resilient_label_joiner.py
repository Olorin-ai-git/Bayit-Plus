"""
Resilient Label Joiner

Makes the "actuals" join resilient by allowing secondary label sources.
If IS_FRAUD_TX is sparse or late-arriving, uses fallback sources:
- CASE_OUTCOME
- CHARGEBACK_FLAG
- Other fraud indicators

Constitutional Compliance:
- Uses existing database provider infrastructure
- All configuration from environment variables
- No hardcoded business logic
"""

import os
from typing import Dict, List, Any, Optional, Set
from app.service.logging import get_bridge_logger
from app.service.agent.tools.database_tool import get_database_provider
from app.service.investigation.transaction_key_normalizer import extract_transaction_ids

logger = get_bridge_logger(__name__)


async def join_actual_labels_resilient_async(
    transaction_ids: List[str],
    use_secondary_sources: bool = True
) -> Dict[str, Optional[int]]:
    """
    Async version of join_actual_labels_resilient.
    
    Use this from async code.
    """
    return await _join_actual_labels_resilient_impl(transaction_ids, use_secondary_sources, is_async=True)


def join_actual_labels_resilient(
    transaction_ids: List[str],
    use_secondary_sources: bool = True
) -> Dict[str, Optional[int]]:
    """
    Join actual fraud labels from Snowflake with resilient fallback sources (sync version).
    
    Primary source: IS_FRAUD_TX
    Secondary sources (if primary is sparse):
    - CASE_OUTCOME (if available)
    - CHARGEBACK_FLAG (if available)
    - Other fraud indicators
    
    Args:
        transaction_ids: List of normalized transaction IDs
        use_secondary_sources: If True, use secondary sources when IS_FRAUD_TX is sparse
    
    Returns:
        Dict mapping transaction_id -> is_fraud (0, 1, or None)
    """
    import asyncio
    try:
        # Try to get running event loop
        loop = asyncio.get_running_loop()
        # We're in an async context but this is a sync function
        # Create a new event loop for this sync call
        return asyncio.run(_join_actual_labels_resilient_impl(transaction_ids, use_secondary_sources, is_async=True))
    except RuntimeError:
        # No event loop - create one
        return asyncio.run(_join_actual_labels_resilient_impl(transaction_ids, use_secondary_sources, is_async=True))


async def _join_actual_labels_resilient_impl(
    transaction_ids: List[str],
    use_secondary_sources: bool,
    is_async: bool
) -> Dict[str, Optional[int]]:
    """
    Internal implementation of resilient label join (supports both sync and async).
    """
    if not transaction_ids:
        logger.warning("No transaction IDs provided for label join")
        return {}
    
    db_provider = get_database_provider()
    db_provider.connect()
    is_snowflake = os.getenv("DATABASE_PROVIDER", "snowflake").lower() == "snowflake"
    
    table_name = db_provider.get_full_table_name()
    
    # Build transaction ID list for IN clause
    tx_id_list = "', '".join(str(tid) for tid in transaction_ids)
    
    # Primary query: IS_FRAUD_TX
    if is_snowflake:
        primary_query = f"""
            SELECT 
                TX_ID_KEY as transaction_id,
                IS_FRAUD_TX as is_fraud
            FROM {table_name}
            WHERE TX_ID_KEY IN ('{tx_id_list}')
        """
    else:
        primary_query = f"""
            SELECT 
                tx_id_key as transaction_id,
                is_fraud_tx as is_fraud
            FROM {table_name}
            WHERE tx_id_key IN ('{tx_id_list}')
        """
    
    # Execute primary query
    if is_async:
        primary_result = await db_provider.execute_query_async(primary_query)
    else:
        primary_result = db_provider.execute_query(primary_query)
    
    # Build primary labels map
    labels_map = {}
    labeled_count = 0
    
    for row in primary_result:
        tx_id = str(row.get("transaction_id") or row.get("TRANSACTION_ID"))
        is_fraud = row.get("is_fraud") or row.get("IS_FRAUD_TX")
        
        if tx_id:
            # Normalize is_fraud to 0 or 1
            if is_fraud in (1, True, "1", "FRAUD"):
                labels_map[tx_id] = 1
                labeled_count += 1
            elif is_fraud in (0, False, "0", "NOT_FRAUD"):
                labels_map[tx_id] = 0
                labeled_count += 1
            else:
                labels_map[tx_id] = None  # Unknown/pending
    
    logger.info(f"📊 Primary label source (IS_FRAUD_TX): {labeled_count}/{len(transaction_ids)} transactions labeled")
    
    # If primary source is sparse and secondary sources enabled, try fallbacks
    if use_secondary_sources and labeled_count < len(transaction_ids) * 0.5:  # Less than 50% labeled
        logger.info(f"⚠️ Primary label source sparse ({labeled_count}/{len(transaction_ids)}) - trying secondary sources...")
        
        # Find unlabeled transaction IDs
        unlabeled_ids = [tx_id for tx_id in transaction_ids if tx_id not in labels_map or labels_map[tx_id] is None]
        
        if unlabeled_ids:
            unlabeled_list = "', '".join(str(tid) for tid in unlabeled_ids)
            
            # Secondary query: Try CASE_OUTCOME, CHARGEBACK_FLAG, etc.
            if is_snowflake:
                secondary_query = f"""
                    SELECT 
                        TX_ID_KEY as transaction_id,
                        CASE_OUTCOME,
                        HAS_CHARGEBACK as chargeback_flag,
                        CHARGEBACK_FLAG,
                        FRAUD_TYPE,
                        MANUAL_REVIEW_DECISION
                    FROM {table_name}
                    WHERE TX_ID_KEY IN ('{unlabeled_list}')
                """
            else:
                secondary_query = f"""
                    SELECT 
                        tx_id_key as transaction_id,
                        case_outcome,
                        has_chargeback as chargeback_flag,
                        chargeback_flag,
                        fraud_type,
                        manual_review_decision
                    FROM {table_name}
                    WHERE tx_id_key IN ('{unlabeled_list}')
                """
            
            # Execute secondary query
            if is_async:
                secondary_result = await db_provider.execute_query_async(secondary_query)
            else:
                secondary_result = db_provider.execute_query(secondary_query)
            
            # Process secondary sources
            secondary_labeled = 0
            for row in secondary_result:
                tx_id = str(row.get("transaction_id") or row.get("TRANSACTION_ID"))
                if not tx_id:
                    continue
                
                # Skip if already labeled from primary source
                if tx_id in labels_map and labels_map[tx_id] is not None:
                    continue
                
                # Try CASE_OUTCOME
                case_outcome = row.get("CASE_OUTCOME") or row.get("case_outcome")
                if case_outcome:
                    case_upper = str(case_outcome).upper()
                    if "FRAUD" in case_upper or case_upper == "FRAUDULENT":
                        labels_map[tx_id] = 1
                        secondary_labeled += 1
                        continue
                    elif "NOT_FRAUD" in case_upper or "LEGITIMATE" in case_upper or "APPROVED" in case_upper:
                        labels_map[tx_id] = 0
                        secondary_labeled += 1
                        continue
                
                # Try CHARGEBACK_FLAG
                chargeback = row.get("chargeback_flag") or row.get("CHARGEBACK_FLAG") or row.get("HAS_CHARGEBACK") or row.get("has_chargeback")
                if chargeback in (1, True, "1", "YES", "TRUE"):
                    labels_map[tx_id] = 1
                    secondary_labeled += 1
                    continue
                elif chargeback in (0, False, "0", "NO", "FALSE"):
                    labels_map[tx_id] = 0
                    secondary_labeled += 1
                    continue
                
                # Try FRAUD_TYPE
                fraud_type = row.get("FRAUD_TYPE") or row.get("fraud_type")
                if fraud_type:
                    labels_map[tx_id] = 1
                    secondary_labeled += 1
                    continue
                
                # Try MANUAL_REVIEW_DECISION
                manual_decision = row.get("MANUAL_REVIEW_DECISION") or row.get("manual_review_decision")
                if manual_decision:
                    decision_upper = str(manual_decision).upper()
                    if "FRAUD" in decision_upper:
                        labels_map[tx_id] = 1
                        secondary_labeled += 1
                        continue
                    elif "APPROVED" in decision_upper or "LEGITIMATE" in decision_upper:
                        labels_map[tx_id] = 0
                        secondary_labeled += 1
                        continue
                
                # Still unlabeled
                if tx_id not in labels_map:
                    labels_map[tx_id] = None
            
            logger.info(f"📊 Secondary label sources: {secondary_labeled} additional transactions labeled")
            logger.info(f"📊 Total labeled: {labeled_count + secondary_labeled}/{len(transaction_ids)} transactions")
    
    return labels_map

