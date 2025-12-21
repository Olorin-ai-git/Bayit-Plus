"""
Auto Comparison Service (Refactored)

Automatically runs comparisons for top riskiest entities (Emails) grouped by Merchant.
Now includes revenue implication tracking (Feature 024).
"""

import asyncio
import os
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from app.config.revenue_config import get_revenue_config
from app.schemas.revenue_implication import RevenueCalculationRequest
from app.service.investigation.comparison_modules.comparison_data_loader import (
    ComparisonDataLoader,
)
from app.service.investigation.comparison_modules.comparison_executor import (
    ComparisonExecutor,
)
from app.service.investigation.comparison_modules.comparison_reporter import (
    ComparisonReporter,
)
from scripts.generate_confusion_table_for_investigation import (
    generate_confusion_table,
)
from app.service.investigation.revenue_calculator import RevenueCalculator
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

# Constants
ARTIFACTS_DIR = Path("artifacts")


async def run_auto_comparisons_for_top_entities(
    top_percentage: float = 0.1,
    time_window_hours: int = 24,
    force_refresh: bool = False,
    unconditional_execution: bool = False,
    reference_date: Optional[datetime] = None,
    **kwargs: Any,  # Accept extra arguments like risk_analyzer_results
) -> List[Dict[str, Any]]:
    """
    Run investigations for top-risk emails grouped by merchant.

    NEW LOGIC (Feature 024 - Revenue Implication Tracking):
    1. Find emails with fraud in configurable historical window (default 12+ months ago).
    2. Investigate each email using configurable investigation window (default 18-12 months ago).
    3. Generate confusion matrix for each.
    4. Calculate revenue implications (Saved Fraud GMV, Lost Revenues, Net Value).
    5. Group reports by merchant.
    """
    logger.info("🚀 Starting Fraudulent Email Investigation Flow (with Revenue Tracking)")

    # 1. Set Environment Configuration
    os.environ["INVESTIGATION_MAX_TRANSACTIONS"] = "20000"
    logger.info("🔧 Configured INVESTIGATION_MAX_TRANSACTIONS = 20000")

    # Load revenue configuration for time windows
    revenue_config = get_revenue_config()
    
    # Configuration: Maximum entities to investigate (default: 2000)
    max_entities = int(os.getenv("MAX_ENTITIES_TO_INVESTIGATE", "2000"))
    max_entities = max(1, max_entities)  # Ensure at least 1
    logger.info(f"🔧 MAX_ENTITIES_TO_INVESTIGATE = {max_entities}")
    
    loader = ComparisonDataLoader()
    executor = ComparisonExecutor()
    reporter = ComparisonReporter()
    revenue_calculator = RevenueCalculator(revenue_config)

    # 2. Get top-risk entities (either single EMAIL or compound EMAIL+DEVICE+PMT)
    # Feature: Compound entity mode for reduced FP rates
    import random

    # Check if compound entity mode is enabled
    compound_entity_enabled = os.getenv("COMPOUND_ENTITY_ENABLED", "false").lower() == "true"
    if compound_entity_enabled:
        logger.info("🔗 COMPOUND ENTITY MODE enabled (EMAIL + DEVICE_ID + PAYMENT_METHOD_TOKEN)")
    else:
        logger.info("📧 SINGLE ENTITY MODE (EMAIL only)")

    # Calculate analyzer reference time based on config or use provided reference_date
    now = datetime.now()

    if reference_date is not None:
        # Use the explicitly provided reference date (for monthly analysis mode)
        reference_time = reference_date
        logger.info(
            f"📅 Analyzer reference time: {reference_time} "
            f"(explicitly provided for monthly analysis)"
        )
    else:
        # Default behavior: random timestamp within historical offset range
        offset_months = revenue_config.analyzer_historical_offset_months

        # Create a range around the offset (±1 month for variability)
        offset_days_min = (offset_months + 1) * 30  # e.g., 13 months = 390 days
        offset_days_max = offset_months * 30  # e.g., 12 months = 360 days

        start_range = now - timedelta(days=offset_days_min)
        end_range = now - timedelta(days=offset_days_max)

        # Pick a random timestamp within this range
        time_delta = end_range - start_range
        if time_delta.total_seconds() > 0:
            random_seconds = random.randint(0, int(time_delta.total_seconds()))
            reference_time = start_range + timedelta(seconds=random_seconds)
        else:
            reference_time = end_range

        logger.info(
            f"📅 Analyzer reference time: {reference_time} "
            f"(configured offset: {offset_months} months)"
        )

    # Calculate analyzer window
    analyzer_start_time = reference_time - timedelta(hours=time_window_hours)
    analyzer_end_time = reference_time

    # Fetch entities based on mode
    if compound_entity_enabled:
        # COMPOUND MODE: Get EMAIL + DEVICE_ID + PAYMENT_METHOD_TOKEN combinations
        # Selected based on MODEL_SCORE risk signal, NOT confirmed fraud
        high_risk_entities = await loader.get_high_risk_compound_entities(
            lookback_hours=time_window_hours,
            limit=max_entities,
            reference_time=reference_time,
        )
        fraud_pairs = high_risk_entities  # Keep variable name for compatibility
        entity_mode = "compound"
    else:
        # SINGLE MODE: Get EMAIL only (original behavior)
        fraud_pairs = await loader.get_fraudulent_emails_grouped_by_merchant(
            lookback_hours=time_window_hours,
            min_fraud_tx=1,
            limit=max_entities,
            reference_time=reference_time,
        )
        entity_mode = "single"

    if not fraud_pairs:
        logger.warning(f"⚠️ No top-risk entities found in the window ending {reference_time}")
        return []

    entity_desc = "compound entities (EMAIL+DEVICE+PMT)" if compound_entity_enabled else "email-merchant pairs"
    logger.info(
        f"📊 Found {len(fraud_pairs)} top-risk {entity_desc} to investigate"
    )
    
    # Store analyzer metadata for reporting
    analyzer_metadata = {
        "start_time": analyzer_start_time,
        "end_time": analyzer_end_time,
        "time_window_hours": time_window_hours,
        "entities": fraud_pairs,
        "entity_mode": entity_mode,  # "single" or "compound"
    }

    # 3. Run investigations (Parallel with Semaphore)
    semaphore = asyncio.Semaphore(5)  # Limit concurrency to 5
    results = []

    # Feature 024: Use configurable investigation window
    # investigation_window_start_months = 18 (default)
    # investigation_window_end_months = 12 (default)
    inv_start_offset = revenue_config.investigation_window_start_months
    inv_end_offset = revenue_config.investigation_window_end_months

    # When reference_date is provided (for monthly analysis), use it as the base time
    # for window calculations. This ensures historical analysis looks at the correct
    # time periods relative to the analysis date, not relative to current date.
    base_time = reference_time if reference_date is not None else now

    window_end = base_time - timedelta(days=inv_end_offset * 30)
    window_start = base_time - timedelta(days=inv_start_offset * 30)

    # Feature 024: GMV window is SEPARATE from investigation window
    # Investigation Window: When fraud was analyzed (24-12 months ago from reference_date)
    # GMV Window: PAST period showing what fraud occurred AFTER investigation
    # This demonstrates: "If Olorin had blocked this entity at investigation time,
    # these losses would have been prevented"
    gmv_start_offset = revenue_config.saved_fraud_gmv_start_months  # Default: 12
    gmv_end_offset = revenue_config.saved_fraud_gmv_end_months      # Default: 6

    # CRITICAL: GMV window is ALWAYS calculated as PAST relative to reference_date/now
    # For Dec 4, 2024 reference_date:
    #   Investigation: Dec 4, 2022 - Dec 4, 2023 (24-12 months ago)
    #   GMV Window: Dec 4, 2023 - June 4, 2024 (12-6 months ago)
    # This queries HISTORICAL data that actually exists in the database
    gmv_window_start = base_time - timedelta(days=gmv_start_offset * 30)  # 12 months ago
    gmv_window_end = base_time - timedelta(days=gmv_end_offset * 30)      # 6 months ago

    base_time_desc = "reference_date" if reference_date is not None else "now"
    logger.info(
        f"📅 Investigation window: {window_start.date()} to {window_end.date()} "
        f"({inv_start_offset}-{inv_end_offset} months before {base_time_desc}={base_time.date()})"
    )
    logger.info(
        f"💰 GMV calculation window: {gmv_window_start.date()} to {gmv_window_end.date()} "
        f"({gmv_start_offset}-{gmv_end_offset} months before {base_time_desc}={base_time.date()})"
    )
    logger.info(
        "💡 Methodology: If Olorin had blocked this entity at end of investigation, "
        "fraud in the GMV window would have been prevented"
    )

    async def process_single_comparison(i: int, pair: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        async with semaphore:
            # Extract fields based on entity mode
            email = pair["email"]
            merchant = pair["merchant"]
            fraud_count = pair.get("fraud_count", 0)
            total_count = pair.get("total_count", 0)

            # Compound mode has additional entity fields
            device_id = pair.get("device_id")
            pmt_token = pair.get("pmt_token")

            if compound_entity_enabled and device_id and pmt_token:
                # COMPOUND MODE: Log all three entity components
                logger.info(
                    f"🔍 [{i+1}/{len(fraud_pairs)}] Investigating compound entity: "
                    f"EMAIL={email[:20]}..., DEVICE={device_id[:15]}..., PMT={pmt_token[:15]}... "
                    f"(Merchant: {merchant}, Fraud: {fraud_count}/{total_count})"
                )
            else:
                # SINGLE MODE: Log email only
                logger.info(
                    f"🔍 [{i+1}/{len(fraud_pairs)}] Investigating {email} "
                    f"(Merchant: {merchant}, Fraud Tx: {fraud_count}/{total_count})"
                )

            try:
                # Create investigation with single or compound entities
                if compound_entity_enabled and device_id and pmt_token:
                    # COMPOUND MODE: Create investigation with multiple entities
                    result = await executor.create_and_wait_for_compound_investigation(
                        entities=[
                            {"entity_type": "email", "entity_value": email},
                            {"entity_type": "device_id", "entity_value": device_id},
                            {"entity_type": "payment_method_token", "entity_value": pmt_token},
                        ],
                        window_start=window_start,
                        window_end=window_end,
                        merchant_name=merchant,
                        fraud_tx_count=fraud_count,
                        total_tx_count=total_count,
                        analyzer_metadata=analyzer_metadata,
                    )
                else:
                    # SINGLE MODE: Original single-entity investigation
                    result = await executor.create_and_wait_for_investigation(
                        entity_type="email",
                        entity_value=email,
                        window_start=window_start,
                        window_end=window_end,
                        merchant_name=merchant,
                        fraud_tx_count=fraud_count,
                        total_tx_count=total_count,
                        analyzer_metadata=analyzer_metadata,
                    )

                if result:
                    # Generate confusion matrix and get TP/FP/TN/FN data for monthly aggregation
                    inv_id = result["investigation_id"]
                    try:
                        cm_result = await generate_confusion_table(inv_id)
                        if cm_result and cm_result.get("aggregated_matrix"):
                            agg = cm_result["aggregated_matrix"]
                            # AggregatedConfusionMatrix uses total_TP, total_FP, etc.
                            result["confusion_matrix"] = {
                                "TP": getattr(agg, "total_TP", 0) if hasattr(agg, "total_TP") else agg.get("total_TP", 0),
                                "FP": getattr(agg, "total_FP", 0) if hasattr(agg, "total_FP") else agg.get("total_FP", 0),
                                "TN": getattr(agg, "total_TN", 0) if hasattr(agg, "total_TN") else agg.get("total_TN", 0),
                                "FN": getattr(agg, "total_FN", 0) if hasattr(agg, "total_FN") else agg.get("total_FN", 0),
                            }
                            logger.info(f"📊 [{i+1}] Confusion matrix: TP={result['confusion_matrix']['TP']}, FP={result['confusion_matrix']['FP']}")
                        else:
                            logger.warning(f"⚠️ [{i+1}] No confusion matrix data returned")
                            result["confusion_matrix"] = {"TP": 0, "FP": 0, "TN": 0, "FN": 0}
                    except Exception as cm_err:
                        logger.warning(f"⚠️ [{i+1}] Could not generate confusion matrix: {cm_err}")
                        result["confusion_matrix"] = {"TP": 0, "FP": 0, "TN": 0, "FN": 0}

                    # Enrich result with metadata
                    result["merchant_name"] = merchant
                    result["email"] = email
                    result["fraud_tx_count"] = fraud_count
                    result["total_tx_count"] = total_count

                    # Add compound entity fields if present
                    if compound_entity_enabled and device_id and pmt_token:
                        result["device_id"] = device_id
                        result["pmt_token"] = pmt_token
                        result["entity_mode"] = "compound"
                        result["entity_type"] = "compound"
                        result["entity_value"] = f"{email}|{device_id}|{pmt_token}"
                    else:
                        result["entity_mode"] = "single"
                        result["entity_type"] = "email"
                        result["entity_value"] = email
                    
                    # Feature 024: Calculate revenue implications with DETAILED REASONING
                    try:
                        revenue_request = RevenueCalculationRequest(
                            investigation_id=inv_id,
                            entity_type="email",
                            entity_value=email,
                            # Pass investigation window for methodology context in reports
                            investigation_window_start=window_start,
                            investigation_window_end=window_end,
                            # GMV window is separate - shows FUTURE period
                            gmv_window_start=gmv_window_start,
                            gmv_window_end=gmv_window_end,
                        )
                        revenue_implication = await revenue_calculator.calculate_revenue_implication(
                            revenue_request,
                            merchant_name=merchant,  # Pass merchant for context
                        )
                        
                        # Build detailed revenue data with full reasoning
                        revenue_data = {
                            # Core metrics
                            "saved_fraud_gmv": float(revenue_implication.saved_fraud_gmv),
                            "lost_revenues": float(revenue_implication.lost_revenues),
                            "net_value": float(revenue_implication.net_value),
                            # Transaction counts
                            "approved_fraud_tx_count": revenue_implication.approved_fraud_tx_count,
                            "blocked_legitimate_tx_count": revenue_implication.blocked_legitimate_tx_count,
                            "total_tx_count": revenue_implication.total_tx_count,
                            # Configuration used
                            "confidence_level": revenue_implication.confidence_level,
                            "take_rate_used": float(revenue_implication.take_rate_used),
                            "lifetime_multiplier_used": float(revenue_implication.lifetime_multiplier_used),
                            # Time windows for methodology explanation
                            "investigation_window_start": window_start.isoformat(),
                            "investigation_window_end": window_end.isoformat(),
                            "gmv_window_start": gmv_window_start.isoformat(),
                            "gmv_window_end": gmv_window_end.isoformat(),
                            # Merchant context
                            "merchant_name": merchant,
                            # Prediction validation (Feature 024 fix)
                            "skipped_due_to_prediction": revenue_implication.skipped_due_to_prediction,
                            "calculation_successful": revenue_implication.calculation_successful,
                        }

                        # Add prediction validation info if available
                        if revenue_implication.prediction_validation:
                            pv = revenue_implication.prediction_validation
                            revenue_data["prediction_validation"] = {
                                "entity_predicted_as_fraud": pv.entity_predicted_as_fraud,
                                "prediction_count": pv.prediction_count,
                                "avg_predicted_risk": pv.avg_predicted_risk,
                                "risk_threshold_used": pv.risk_threshold_used,
                                "validation_message": pv.validation_message,
                            }
                        
                        # Add detailed breakdowns with reasoning if available
                        if revenue_implication.saved_fraud_breakdown:
                            breakdown = revenue_implication.saved_fraud_breakdown
                            revenue_data["saved_fraud_breakdown"] = {
                                "reasoning": breakdown.reasoning,
                                "methodology": breakdown.methodology,
                                "avg_tx_value": float(breakdown.avg_fraud_tx_value),
                                "min_tx_value": float(breakdown.min_tx_value),
                                "max_tx_value": float(breakdown.max_tx_value),
                                "sample_transactions": [
                                    {
                                        "tx_id": tx.tx_id,
                                        "gmv": float(tx.gmv),
                                        "decision": tx.decision,
                                        "is_fraud": tx.is_fraud,
                                        "tx_datetime": tx.tx_datetime.isoformat(),
                                        "merchant": tx.merchant,
                                    }
                                    for tx in breakdown.sample_transactions
                                ],
                            }
                        
                        if revenue_implication.lost_revenues_breakdown:
                            breakdown = revenue_implication.lost_revenues_breakdown
                            revenue_data["lost_revenues_breakdown"] = {
                                "reasoning": breakdown.reasoning,
                                "methodology": breakdown.methodology,
                                "formula_applied": breakdown.formula_applied,
                                "blocked_gmv_total": float(breakdown.blocked_gmv_total),
                                "avg_blocked_tx_value": float(breakdown.avg_blocked_tx_value),
                                "sample_transactions": [
                                    {
                                        "tx_id": tx.tx_id,
                                        "gmv": float(tx.gmv),
                                        "decision": tx.decision,
                                        "is_fraud": tx.is_fraud,
                                        "tx_datetime": tx.tx_datetime.isoformat(),
                                        "merchant": tx.merchant,
                                    }
                                    for tx in breakdown.sample_transactions
                                ],
                            }
                        
                        if revenue_implication.net_value_breakdown:
                            breakdown = revenue_implication.net_value_breakdown
                            revenue_data["net_value_breakdown"] = {
                                "reasoning": breakdown.reasoning,
                                "formula": breakdown.formula,
                                "is_positive": breakdown.is_positive,
                                "roi_percentage": float(breakdown.roi_percentage) if breakdown.roi_percentage else None,
                            }
                        
                        result["revenue_data"] = revenue_data

                        if revenue_implication.skipped_due_to_prediction:
                            logger.warning(
                                f"⚠️ [{i+1}] Revenue SKIPPED for {email} ({merchant}): "
                                f"Olorin did not predict this entity as fraud. "
                                f"{revenue_implication.prediction_validation.validation_message if revenue_implication.prediction_validation else ''}"
                            )
                        else:
                            logger.info(
                                f"💰 [{i+1}] Revenue for {email} ({merchant}): "
                                f"Saved=${revenue_implication.saved_fraud_gmv:,.2f}, "
                                f"Lost=${revenue_implication.lost_revenues:,.2f}, "
                                f"Net=${revenue_implication.net_value:,.2f} "
                                f"({revenue_implication.confidence_level} confidence)"
                            )
                    except Exception as rev_err:
                        logger.warning(f"⚠️ [{i+1}] Revenue calculation failed for {email}: {rev_err}")
                        result["revenue_data"] = {"error": str(rev_err), "calculation_successful": False}
                    
                    return result
                else:
                    logger.error(f"❌ Investigation failed for {email}")
                    return None
            except Exception as e:
                logger.error(f"❌ Exception processing {email}: {e}")
                return None

    tasks = [process_single_comparison(i, pair) for i, pair in enumerate(fraud_pairs)]
    results_with_none = await asyncio.gather(*tasks)
    results = [r for r in results_with_none if r is not None]
    
    logger.info(f"✅ {len(results)} investigations completed (incremental reports generated along the way)")

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

    # Add analyzer metadata to each result for reporting
    for result in results:
        result["analyzer_metadata"] = analyzer_metadata
    
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
    max_wait_seconds: int = 6000,
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
