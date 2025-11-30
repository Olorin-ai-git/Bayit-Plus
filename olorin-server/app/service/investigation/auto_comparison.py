"""
Auto Comparison Service (Refactored)

Automatically runs comparisons for top riskiest entities (Emails) grouped by Merchant.
"""

import asyncio
import os
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from app.service.investigation.comparison_modules.comparison_data_loader import (
    ComparisonDataLoader,
)
from app.service.investigation.comparison_modules.comparison_executor import (
    ComparisonExecutor,
)
from app.service.investigation.comparison_modules.comparison_reporter import (
    ComparisonReporter,
)
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

# Constants
ARTIFACTS_DIR = Path("artifacts")


async def run_auto_comparisons_for_top_entities(
    top_percentage: float = 0.1,
    time_window_hours: int = 24,
    force_refresh: bool = False,
    unconditional_execution: bool = False,
    **kwargs: Any,  # Accept extra arguments like risk_analyzer_results
) -> List[Dict[str, Any]]:
    """
    Run investigations for fraudulent emails grouped by merchant.

    NEW LOGIC:
    1. Find emails with fraud in last 24h (grouped by merchant).
    2. Investigate each email.
    3. Generate confusion matrix for each.
    4. Group reports by merchant.
    """
    logger.info("🚀 Starting Fraudulent Email Investigation Flow")

    # 1. Set Environment Configuration
    os.environ["INVESTIGATION_MAX_TRANSACTIONS"] = "20000"
    logger.info("🔧 Configured INVESTIGATION_MAX_TRANSACTIONS = 20000")

    loader = ComparisonDataLoader()
    executor = ComparisonExecutor()
    reporter = ComparisonReporter()

    # 2. Get fraudulent emails grouped by merchant
    # Using 24h lookback as requested
    fraud_pairs = await loader.get_fraudulent_emails_grouped_by_merchant(
        lookback_hours=time_window_hours, min_fraud_tx=1, limit=50  # Safety limit
    )

    if not fraud_pairs:
        logger.warning("⚠️ No fraudulent emails found in the last 24h")
        return []

    logger.info(
        f"📊 Found {len(fraud_pairs)} fraudulent email-merchant pairs to investigate"
    )

    # 3. Run investigations
    results = []

    # Prepare date window (6 months lookback for investigation)
    window_end = datetime.now()
    window_start = window_end - timedelta(days=180)

    for i, pair in enumerate(fraud_pairs):
        email = pair["email"]
        merchant = pair["merchant"]
        fraud_count = pair["fraud_count"]

        logger.info(
            f"🔍 [{i+1}/{len(fraud_pairs)}] Investigating {email} (Merchant: {merchant}, Fraud Tx: {fraud_count})"
        )

        # Create and wait for investigation
        result = await executor.create_and_wait_for_investigation(
            entity_type="email",
            entity_value=email,
            window_start=window_start,
            window_end=window_end,
            merchant_name=merchant,
        )

        if result:
            # Generate confusion matrix immediately
            inv_id = result["investigation_id"]
            await executor.generate_confusion_matrix(inv_id)

            # Enrich result with metadata
            result["merchant_name"] = merchant
            result["email"] = email
            result["fraud_tx_count"] = fraud_count
            
            # Map for reporter compatibility
            result["entity_type"] = "email"
            result["entity_value"] = email
            
            results.append(result)
        else:
            logger.error(f"❌ Investigation failed for {email}")

    # 4. Generate Reports
    # Ensure artifacts dir exists
    report_dir = ARTIFACTS_DIR / "comparisons" / "auto_startup"
    report_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_path = report_dir / f"startup_analysis_report_{timestamp}.html"

    # Generate HTML content
    html_content = reporter.generate_summary_html(results)
    report_path.write_text(html_content)
    logger.info(f"✅ Startup analysis report generated: {report_path}")

    # Also package results (zip)
    reporter.package_comparison_results(results, report_dir)

    return results


async def run_auto_comparison_for_entity(
    entity_type: str,
    entity_value: str,
    comparison_option: Optional[Any] = None,
    output_dir: Optional[Path] = None,
) -> Optional[Dict[str, Any]]:
    """
    Legacy compatibility wrapper for single entity comparison.
    Delegates to ComparisonExecutor.
    """
    logger.info(f"🔄 Running legacy auto-comparison for {entity_type}={entity_value}")
    
    executor = ComparisonExecutor()
    
    # Default window 6 months
    window_end = datetime.now()
    window_start = window_end - timedelta(days=180)
    
    result = await executor.create_and_wait_for_investigation(
        entity_type=entity_type,
        entity_value=entity_value,
        window_start=window_start,
        window_end=window_end
    )
    
    if result:
        await executor.generate_confusion_matrix(result["investigation_id"])
        
    return result

async def create_and_wait_for_investigation(
    entity_type: str,
    entity_value: str,
    window_start: datetime,
    window_end: datetime,
    max_wait_seconds: int = 600,
) -> Optional[Dict[str, Any]]:
    """
    Legacy compatibility wrapper.
    """
    executor = ComparisonExecutor()
    return await executor.create_and_wait_for_investigation(
        entity_type, entity_value, window_start, window_end, max_wait_seconds
    )

def package_comparison_results(
    results: List[Dict[str, Any]], output_dir: Path
) -> Path:
    """
    Wrapper for package_comparison_results to maintain backward compatibility.
    """
    reporter = ComparisonReporter()
    return reporter.package_comparison_results(results, output_dir)
