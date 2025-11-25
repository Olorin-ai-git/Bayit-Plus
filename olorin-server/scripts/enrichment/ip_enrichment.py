"""
IP Enrichment Script

Batch enriches transactions with IP risk scores using extended MaxMind client.
"""

import asyncio
from typing import Any, Dict, List

from sqlalchemy import text

from app.persistence.database import get_db_session
from app.service.ip_risk.maxmind_client import MaxMindClient
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


async def enrich_transactions_ip(transactions: List[Dict[str, Any]]) -> None:
    """
    Batch enrich transactions with IP risk scores using extended MaxMind client.

    Args:
        transactions: List of transaction dictionaries with IP addresses
    """
    if not transactions:
        logger.warning("No transactions to enrich with IP data")
        return

    # Filter transactions with IP addresses
    transactions_with_ip = [
        txn for txn in transactions if txn.get("ip_address") or txn.get("ip")
    ]

    if not transactions_with_ip:
        logger.info("No transactions with IP addresses to enrich")
        return

    maxmind_client = MaxMindClient()

    try:
        # Extract unique IP addresses
        ip_addresses = list(
            set(
                txn.get("ip_address") or txn.get("ip")
                for txn in transactions_with_ip
                if txn.get("ip_address") or txn.get("ip")
            )
        )

        # Batch score IPs
        ip_scores = await maxmind_client.batch_score_ips(ip_addresses)

        # Update enrichment scores
        with get_db_session() as db:
            enriched_count = 0

            for txn in transactions_with_ip:
                txn_id = txn.get("txn_id")
                ip_address = txn.get("ip_address") or txn.get("ip")

                if not txn_id or not ip_address:
                    continue

                score_data = ip_scores.get(ip_address)

                if score_data:
                    update_query = text(
                        """
                        INSERT INTO pg_enrichment_scores (
                            txn_id, ip_proxy_detected, ip_vpn_detected, ip_tor_detected,
                            ip_datacenter, ip_risk_score, ip_geo_risk
                        ) VALUES (
                            :txn_id, :ip_proxy_detected, :ip_vpn_detected, :ip_tor_detected,
                            :ip_datacenter, :ip_risk_score, :ip_geo_risk
                        )
                        ON CONFLICT (txn_id) DO UPDATE SET
                            ip_proxy_detected = EXCLUDED.ip_proxy_detected,
                            ip_vpn_detected = EXCLUDED.ip_vpn_detected,
                            ip_tor_detected = EXCLUDED.ip_tor_detected,
                            ip_datacenter = EXCLUDED.ip_datacenter,
                            ip_risk_score = EXCLUDED.ip_risk_score,
                            ip_geo_risk = EXCLUDED.ip_geo_risk,
                            enriched_at = NOW()
                    """
                    )

                    # Check geo risk (IP country != merchant country)
                    merchant_country = txn.get("country")
                    ip_country = (
                        score_data.get("geolocation", {}).get("country", {}).get("code")
                    )
                    ip_geo_risk = (
                        merchant_country
                        and ip_country
                        and merchant_country != ip_country
                    )

                    params = {
                        "txn_id": txn_id,
                        "ip_proxy_detected": score_data.get("is_proxy", False),
                        "ip_vpn_detected": score_data.get("is_vpn", False),
                        "ip_tor_detected": score_data.get("is_tor", False),
                        "ip_datacenter": False,  # TODO: Extract from MaxMind response if available
                        "ip_risk_score": score_data.get("risk_score"),
                        "ip_geo_risk": ip_geo_risk,
                    }

                    db.execute(update_query, params)
                    enriched_count += 1
                else:
                    logger.debug(f"IP scoring returned no data for {txn_id}")

            db.commit()
            logger.info(
                f"IP enrichment complete: {enriched_count}/{len(transactions_with_ip)} transactions enriched"
            )

    finally:
        await maxmind_client.close()


def enrich_transactions_ip_sync(transactions: List[Dict[str, Any]]) -> None:
    """
    Synchronous wrapper for IP enrichment.

    Args:
        transactions: List of transaction dictionaries
    """
    asyncio.run(enrich_transactions_ip(transactions))
