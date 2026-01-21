#!/usr/bin/env python3
"""
Run a merchant investigation with a 90-day time window.

This script creates a NEW investigation (not a comparison) for a merchant
with a specified 90-day time window, ensuring ALL transactions are scored.
"""

import asyncio
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

# Add server root to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

import pytz

from app.router.models.autonomous_investigation_models import (
    StructuredInvestigationRequest,
    TimeRange,
)
from app.router.controllers.investigation_controller import (
    start_structured_investigation,
)
from app.router.controllers.investigation_executor import (
    execute_structured_investigation,
)
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


async def run_merchant_investigation(
    merchant_name: str,
    window_days: int = 90,
    max_transactions: int = 50000,
    months_ago: int = 8,
):
    """
    Run investigation for a merchant with custom time window.

    Args:
        merchant_name: Merchant name to investigate
        window_days: Length of investigation window in days (default: 90)
        max_transactions: Maximum transactions to fetch and score (default: 50000)
        months_ago: How many months ago to start the window (default: 8)
    """
    # Set environment variables
    os.environ["INVESTIGATION_MAX_TRANSACTIONS"] = str(max_transactions)

    # Calculate time window (90 days, 8 months ago)
    tz = pytz.timezone("America/New_York")
    now = datetime.now(tz)
    
    # Start 8 months ago
    window_end = now - timedelta(days=months_ago * 30)
    window_start = window_end - timedelta(days=window_days)

    logger.info(f"🚀 Starting {window_days}-day merchant investigation")
    logger.info(f"   Merchant: {merchant_name}")
    logger.info(f"   Time Window: {window_start.date()} to {window_end.date()}")
    logger.info(f"   Max Transactions: {max_transactions}")

    # Create investigation request
    request = StructuredInvestigationRequest(
        entity_id=merchant_name,
        entity_type="merchant",
        investigation_priority="high",
        time_range=TimeRange(
            start_time=window_start.isoformat(),
            end_time=window_end.isoformat(),
        ),
        metadata={
            "window_days": window_days,
            "max_transactions": max_transactions,
            "months_ago": months_ago,
            "purpose": "merchant_90day_full_scoring",
        },
    )

    # Start investigation
    logger.info("📋 Creating investigation...")
    response = await start_structured_investigation(
        request=request, execute_investigation_callback=execute_structured_investigation
    )

    logger.info(f"✅ Investigation started: {response.investigation_id}")
    logger.info(f"   Status: {response.status}")

    # Wait for completion
    from app.persistence.database import get_db
    from app.models.investigation_state import InvestigationState

    db_gen = get_db()
    db = next(db_gen)

    try:
        # Poll for completion
        max_wait_seconds = 600  # 10 minutes
        poll_interval = 5  # 5 seconds
        elapsed = 0

        while elapsed < max_wait_seconds:
            await asyncio.sleep(poll_interval)
            elapsed += poll_interval

            investigation = (
                db.query(InvestigationState)
                .filter(InvestigationState.investigation_id == response.investigation_id)
                .first()
            )

            if not investigation:
                logger.error(f"❌ Investigation {response.investigation_id} not found")
                break

            status = investigation.status
            logger.info(f"   [{elapsed}s] Status: {status}")

            if status in ["COMPLETED", "FAILED", "ERROR"]:
                logger.info(f"🏁 Investigation completed with status: {status}")

                # Get final state
                progress = investigation.progress_json or {}
                transaction_scores = progress.get("transaction_scores", {})
                overall_risk_score = investigation.overall_risk_score

                logger.info(f"   Overall Risk Score: {overall_risk_score}")
                logger.info(
                    f"   Transaction Scores Generated: {len(transaction_scores)}"
                )

                # Now generate confusion matrix
                logger.info("📊 Generating confusion matrix...")
                from app.service.investigation.post_investigation_packager import (
                    generate_post_investigation_package,
                )

                confusion_matrix_path = await generate_post_investigation_package(
                    investigation_id=response.investigation_id,
                    entity_type="merchant",
                    entity_value=merchant_name,
                    window_start=window_start,
                    window_end=window_end,
                    overall_risk_score=overall_risk_score,
                )

                if confusion_matrix_path:
                    logger.info(
                        f"✅ Confusion matrix generated: {confusion_matrix_path}"
                    )
                else:
                    logger.warning("⚠️ Confusion matrix generation failed")

                return {
                    "investigation_id": response.investigation_id,
                    "status": status,
                    "risk_score": overall_risk_score,
                    "transactions_scored": len(transaction_scores),
                    "confusion_matrix": str(confusion_matrix_path)
                    if confusion_matrix_path
                    else None,
                }

        logger.warning(
            f"⚠️ Investigation did not complete within {max_wait_seconds} seconds"
        )
        return {"investigation_id": response.investigation_id, "status": "TIMEOUT"}

    finally:
        db.close()


if __name__ == "__main__":
    result = asyncio.run(
        run_merchant_investigation(
            merchant_name="Coinflow",
            window_days=90,
            max_transactions=50000,
            months_ago=8,
        )
    )

    print()
    print("=" * 80)
    print("FINAL RESULT")
    print("=" * 80)
    print(f"Investigation ID: {result.get('investigation_id')}")
    print(f"Status: {result.get('status')}")
    print(f"Risk Score: {result.get('risk_score')}")
    print(f"Transactions Scored: {result.get('transactions_scored')}")
    print(f"Confusion Matrix: {result.get('confusion_matrix')}")
    print("=" * 80)

