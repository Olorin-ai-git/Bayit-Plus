"""
BIN Enrichment Script

Batch enriches transactions with BIN lookup data (issuer country, card type, issuer name).
"""

from typing import List, Dict, Any
from sqlalchemy import text
from app.persistence.database import get_db_session
from app.service.logging import get_bridge_logger
from app.service.composio.custom_tools.bin_lookup_tool import BINLookupTool

logger = get_bridge_logger(__name__)


def enrich_transactions_bin(transactions: List[Dict[str, Any]]) -> None:
    """
    Batch enrich transactions with BIN lookup data.
    
    Args:
        transactions: List of transaction dictionaries with card_id or BIN
    """
    if not transactions:
        logger.warning("No transactions to enrich with BIN data")
        return
    
    bin_tool = BINLookupTool()
    enriched_count = 0
    
    with get_db_session() as db:
        for txn in transactions:
            txn_id = txn.get("txn_id")
            card_id = txn.get("card_id")
            
            if not txn_id or not card_id:
                continue
            
            # Extract BIN (first 6-8 digits)
            bin_number = str(card_id)[:8] if len(str(card_id)) >= 8 else str(card_id)[:6]
            
            # Lookup BIN
            bin_data = bin_tool.lookup_bin(bin_number)
            
            if bin_data:
                # Update enrichment scores
                update_query = text("""
                    INSERT INTO pg_enrichment_scores (
                        txn_id, issuer_country, card_type, issuer_name,
                        issuer_geo_mismatch, card_type_risk
                    ) VALUES (
                        :txn_id, :issuer_country, :card_type, :issuer_name,
                        :issuer_geo_mismatch, :card_type_risk
                    )
                    ON CONFLICT (txn_id) DO UPDATE SET
                        issuer_country = EXCLUDED.issuer_country,
                        card_type = EXCLUDED.card_type,
                        issuer_name = EXCLUDED.issuer_name,
                        issuer_geo_mismatch = EXCLUDED.issuer_geo_mismatch,
                        card_type_risk = EXCLUDED.card_type_risk,
                        enriched_at = NOW()
                """)
                
                # Get merchant country for mismatch check
                merchant_country = txn.get("country")
                issuer_country = bin_data.get("issuer_country")
                issuer_geo_mismatch = (
                    merchant_country and issuer_country and
                    merchant_country != issuer_country
                )
                
                # Card type risk: prepaid at high-risk merchant
                card_type = bin_data.get("card_type")
                card_type_risk = card_type == "prepaid"  # TODO: Add merchant risk check
                
                params = {
                    "txn_id": txn_id,
                    "issuer_country": issuer_country,
                    "card_type": card_type,
                    "issuer_name": bin_data.get("issuer_name"),
                    "issuer_geo_mismatch": issuer_geo_mismatch,
                    "card_type_risk": card_type_risk
                }
                
                db.execute(update_query, params)
                enriched_count += 1
            else:
                logger.debug(f"BIN lookup returned no data for {txn_id}")
        
        db.commit()
        logger.info(f"BIN enrichment complete: {enriched_count}/{len(transactions)} transactions enriched")

