"""
Email/Phone Enrichment Script

Batch enriches transactions with email and phone risk scores using existing IPQS Email and Veriphone tools.
"""

import json
from typing import Any, Dict, List

from sqlalchemy import text

from app.persistence.database import get_db_session
from app.service.agent.tools.ipqs_email_tool import IPQSEmailTool
from app.service.agent.tools.veriphone_tool import VeriphoneTool
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def enrich_transactions_email_phone(transactions: List[Dict[str, Any]]) -> None:
    """
    Batch enrich transactions with email and phone risk scores.

    Uses existing IPQSEmailTool and VeriphoneTool for enrichment.

    Args:
        transactions: List of transaction dictionaries with email and/or phone
    """
    if not transactions:
        logger.warning("No transactions to enrich with email/phone data")
        return

    email_tool = IPQSEmailTool()
    phone_tool = VeriphoneTool()

    enriched_count = 0

    with get_db_session() as db:
        for txn in transactions:
            txn_id = txn.get("txn_id")
            email = txn.get("email") or txn.get("billing_email")
            phone = (
                txn.get("phone") or txn.get("customer_phone") or txn.get("phone_number")
            )

            if not txn_id:
                continue

            # Enrich email if available
            email_risk_score = None
            email_domain_age = None
            email_valid = None

            if email:
                try:
                    email_result_str = email_tool._run(email, entity_id=txn_id)
                    email_result = json.loads(email_result_str)

                    if email_result.get("status") == "success":
                        verification = email_result.get("verification", {})
                        email_risk_score = verification.get("fraud_score")
                        email_valid = verification.get("valid")
                        # Extract domain age if available
                        email_domain_age = verification.get("domain_age_days")
                except Exception as e:
                    logger.debug(f"Email enrichment failed for {txn_id}: {e}")

            # Enrich phone if available
            phone_valid = None
            phone_risk_score = None

            if phone:
                try:
                    phone_result_str = phone_tool._run(phone, entity_id=txn_id)
                    phone_result = json.loads(phone_result_str)

                    if phone_result.get("status") == "success":
                        verification = phone_result.get("verification", {})
                        phone_valid = verification.get("valid")
                        # Phone risk score may not be available from Veriphone
                        # Set to None if not available (no fallback)
                        phone_risk_score = verification.get("risk_score")
                except Exception as e:
                    logger.debug(f"Phone enrichment failed for {txn_id}: {e}")

            # Update enrichment scores if we have any data
            if email_risk_score is not None or phone_valid is not None:
                update_query = text(
                    """
                    INSERT INTO pg_enrichment_scores (
                        txn_id, email_risk_score, email_domain_age, email_valid,
                        phone_valid, phone_risk_score
                    ) VALUES (
                        :txn_id, :email_risk_score, :email_domain_age, :email_valid,
                        :phone_valid, :phone_risk_score
                    )
                    ON CONFLICT (txn_id) DO UPDATE SET
                        email_risk_score = COALESCE(EXCLUDED.email_risk_score, pg_enrichment_scores.email_risk_score),
                        email_domain_age = COALESCE(EXCLUDED.email_domain_age, pg_enrichment_scores.email_domain_age),
                        email_valid = COALESCE(EXCLUDED.email_valid, pg_enrichment_scores.email_valid),
                        phone_valid = COALESCE(EXCLUDED.phone_valid, pg_enrichment_scores.phone_valid),
                        phone_risk_score = COALESCE(EXCLUDED.phone_risk_score, pg_enrichment_scores.phone_risk_score),
                        enriched_at = NOW()
                """
                )

                params = {
                    "txn_id": txn_id,
                    "email_risk_score": email_risk_score,
                    "email_domain_age": email_domain_age,
                    "email_valid": email_valid,
                    "phone_valid": phone_valid,
                    "phone_risk_score": phone_risk_score,
                }

                db.execute(update_query, params)
                enriched_count += 1

        db.commit()
        logger.info(
            f"Email/phone enrichment complete: {enriched_count}/{len(transactions)} transactions enriched"
        )
