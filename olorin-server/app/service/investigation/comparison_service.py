"""
Comparison Orchestration Service

Orchestrates window computation, entity filtering, metrics calculation,
and delta computation for investigation comparison.

Constitutional Compliance:
- Uses existing database provider infrastructure
- All configuration from environment variables
- No hardcoded business logic
"""

import asyncio
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import pytz

from app.config.eval import EVAL_DEFAULTS
from app.router.models.investigation_comparison_models import (
    AggregatedConfusionMatrix,
    ComparisonRequest,
    ComparisonResponse,
    ConfusionMatrix,
    DeltaMetrics,
    WindowInfo,
    WindowMetrics,
)
from app.service.agent.tools.database_tool import get_database_provider
from app.service.logging import get_bridge_logger

from .artifact_persistence import persist_artifact
from .auto_expand import expand_window_until_support
from .calibration_metrics import calculate_brier_score, calculate_log_loss
from .distribution_statistics import compute_ks_statistic, compute_psi
from .entity_filtering import build_entity_where_clause, build_merchant_where_clause
from .html_report_generator import generate_html_report
from .investigation_transaction_mapper import (
    get_investigation_by_id,
    get_investigations_for_time_window,
    map_investigation_to_transactions,
    select_best_investigation,
)
from .metrics_calculation import (
    compute_confusion_matrix,
    compute_derived_metrics,
    compute_histogram,
)
from .per_merchant_metrics import compute_per_merchant_metrics
from .posthoc_detectors import run_all_posthoc_detectors
from .prediction_storage import compute_confusion_matrix_with_join
from .query_builder import build_transaction_query
from .summary_generator import generate_investigation_summary
from .threshold_curves import calculate_threshold_curve
from .timeseries_calculation import compute_timeseries_daily
from .window_computation import compute_windows_from_specs
from .workload_metrics import (
    calculate_precision_at_k,
    calculate_recall_at_budget,
    calculate_workload_metrics,
)

logger = get_bridge_logger(__name__)


async def compare_windows(request: ComparisonRequest) -> ComparisonResponse:
    """
    Compare two time windows and return metrics + deltas.

    Args:
        request: Comparison request with windows, entity, options

    Returns:
        ComparisonResponse with metrics for both windows and deltas
    """
    logger.info("Starting window comparison")
    risk_threshold = float(
        os.getenv("RISK_THRESHOLD_DEFAULT", "0.3")
    )  # Default changed from 0.7 to 0.3
    if request.risk_threshold:
        risk_threshold = request.risk_threshold

    window_a_tuple, window_b_tuple = compute_windows_from_specs(
        request.windowA, request.windowB
    )
    window_a_start, window_a_end, window_a_label = window_a_tuple
    window_b_start, window_b_end, window_b_label = window_b_tuple
    logger.info(f"Window A: {window_a_label} ({window_a_start} to {window_a_end})")
    logger.info(f"Window B: {window_b_label} ({window_b_start} to {window_b_end})")

    db_provider = get_database_provider()
    db_provider.connect()
    is_snowflake = os.getenv("DATABASE_PROVIDER", "snowflake").lower() == "snowflake"
    import inspect

    is_async = hasattr(db_provider, "execute_query_async")

    entity_clause, _ = build_entity_where_clause(
        request.entity.get("type") if request.entity else None,
        request.entity.get("value") if request.entity else None,
        is_snowflake,
    )
    merchant_clause, _ = build_merchant_where_clause(request.merchant_ids, is_snowflake)

    # Find investigations for each window (if entity provided)
    investigation_a = None
    investigation_b = None
    source_a = "fallback"
    source_b = "fallback"
    predicted_risk_a = None
    predicted_risk_b = None

    if request.entity:
        entity_type = request.entity.get("type")
        entity_id = request.entity.get("value")

        # Find overlapping investigations
        investigations_a = get_investigations_for_time_window(
            entity_type=entity_type,
            entity_id=entity_id,
            window_start=window_a_start,
            window_end=window_a_end,
        )
        investigations_b = get_investigations_for_time_window(
            entity_type=entity_type,
            entity_id=entity_id,
            window_start=window_b_start,
            window_end=window_b_end,
        )

        # Select best investigation for each window using deterministic rules
        investigation_a = select_best_investigation(
            investigations_a, window_a_start, window_a_end
        )
        investigation_b = select_best_investigation(
            investigations_b, window_b_start, window_b_end
        )

        if investigation_a:
            source_a = investigation_a.get("id", "unknown")
            predicted_risk_a = investigation_a.get("overall_risk_score")
            logger.info(
                f"Window A: Using investigation {source_a} with risk_score={predicted_risk_a}"
            )
        else:
            logger.info(f"Window A: No investigation found, using fallback")

        if investigation_b:
            source_b = investigation_b.get("id", "unknown")
            predicted_risk_b = investigation_b.get("overall_risk_score")
            logger.info(
                f"Window B: Using investigation {source_b} with risk_score={predicted_risk_b}"
            )
        else:
            logger.info(f"Window B: No investigation found, using fallback")

    # Auto-expand windows if enabled (before fetching transactions)
    auto_expand_enabled = EVAL_DEFAULTS["auto_expand"]["enabled"]
    window_a_effective_start = window_a_start
    window_a_effective_end = window_a_end
    window_b_effective_start = window_b_start
    window_b_effective_end = window_b_end
    expand_meta_a: Optional[Dict[str, Any]] = None
    expand_meta_b: Optional[Dict[str, Any]] = None

    if auto_expand_enabled and request.entity:
        # Create lightweight count-only function for expansion
        async def count_only_a(start: datetime, end: datetime) -> Dict[str, int]:
            """Lightweight count query for window A."""
            test_tx, _, _ = await map_investigation_to_transactions(
                investigation_a,
                start,
                end,
                entity_type=request.entity.get("type"),
                entity_id=request.entity.get("value"),
            )
            known = [
                tx
                for tx in test_tx
                if tx.get("actual_outcome") in (0, 1, True, False, "FRAUD", "NOT_FRAUD")
            ]
            actual_frauds = sum(
                1 for tx in known if tx.get("actual_outcome") in (1, True, "FRAUD")
            )
            predicted_positives = (
                len(test_tx)
                if predicted_risk_a and predicted_risk_a >= risk_threshold
                else 0
            )
            return {
                "known_transactions": len(known),
                "actual_frauds": actual_frauds,
                "predicted_positives": predicted_positives,
            }

        async def count_only_b(start: datetime, end: datetime) -> Dict[str, int]:
            """Lightweight count query for window B."""
            test_tx, _, _ = await map_investigation_to_transactions(
                investigation_b,
                start,
                end,
                entity_type=request.entity.get("type"),
                entity_id=request.entity.get("value"),
            )
            known = [
                tx
                for tx in test_tx
                if tx.get("actual_outcome") in (0, 1, True, False, "FRAUD", "NOT_FRAUD")
            ]
            actual_frauds = sum(
                1 for tx in known if tx.get("actual_outcome") in (1, True, "FRAUD")
            )
            predicted_positives = (
                len(test_tx)
                if predicted_risk_b and predicted_risk_b >= risk_threshold
                else 0
            )
            return {
                "known_transactions": len(known),
                "actual_frauds": actual_frauds,
                "predicted_positives": predicted_positives,
            }

        # Check if windows need expansion
        is_retro_a = "retro" in window_a_label.lower()
        is_retro_b = "retro" in window_b_label.lower()

        today = datetime.now(pytz.timezone("America/New_York"))

        # Expand windows
        window_a_effective_start, window_a_effective_end, expand_meta_a = (
            await expand_window_until_support(
                count_only_a, window_a_start, window_a_end, is_retro_a, today
            )
        )
        window_b_effective_start, window_b_effective_end, expand_meta_b = (
            await expand_window_until_support(
                count_only_b, window_b_start, window_b_end, is_retro_b, today
            )
        )

        # Update labels if expanded
        if expand_meta_a.get("expanded"):
            window_a_label = f"{window_a_label} · expanded"
        if expand_meta_b.get("expanded"):
            window_b_label = f"{window_b_label} · expanded"

    # Map investigations to transactions using effective windows
    transactions_a, source_a, predicted_risk_a = (
        await map_investigation_to_transactions(
            investigation_a,
            window_a_effective_start,
            window_a_effective_end,
            entity_type=request.entity.get("type") if request.entity else None,
            entity_id=request.entity.get("value") if request.entity else None,
        )
    )
    transactions_b, source_b, predicted_risk_b = (
        await map_investigation_to_transactions(
            investigation_b,
            window_b_effective_start,
            window_b_effective_end,
            entity_type=request.entity.get("type") if request.entity else None,
            entity_id=request.entity.get("value") if request.entity else None,
        )
    )

    logger.info(
        f"Fetched {len(transactions_a)} transactions for Window A (source={source_a}), {len(transactions_b)} for Window B (source={source_b})"
    )

    # Run post-hoc detectors on transaction data (high-precision patterns)
    posthoc_results_a = None
    posthoc_results_b = None

    if len(transactions_a) > 0:
        try:
            logger.info("🔍 Running post-hoc detectors on Window A transactions...")
            # Extract merchant_id if available (for merchant-local anomaly detection)
            merchant_ids = set()
            for tx in transactions_a[:10]:  # Sample first 10 to find merchant
                merchant_id = (
                    tx.get("merchant_id")
                    or tx.get("MERCHANT_ID")
                    or tx.get("STORE_ID")
                    or tx.get("store_id")
                )
                if merchant_id:
                    merchant_ids.add(merchant_id)

            merchant_id = list(merchant_ids)[0] if merchant_ids else None
            posthoc_results_a = run_all_posthoc_detectors(
                transactions_a, merchant_id=merchant_id
            )

            if posthoc_results_a.get("high_precision"):
                logger.info(
                    f"✅ Post-hoc detectors flagged high-precision patterns in Window A: {posthoc_results_a.get('risk_factors', [])}"
                )
        except Exception as e:
            logger.warning(f"⚠️ Post-hoc detector analysis failed for Window A: {e}")

    if len(transactions_b) > 0:
        try:
            logger.info("🔍 Running post-hoc detectors on Window B transactions...")
            # Extract merchant_id if available
            merchant_ids = set()
            for tx in transactions_b[:10]:
                merchant_id = (
                    tx.get("merchant_id")
                    or tx.get("MERCHANT_ID")
                    or tx.get("STORE_ID")
                    or tx.get("store_id")
                )
                if merchant_id:
                    merchant_ids.add(merchant_id)

            merchant_id = list(merchant_ids)[0] if merchant_ids else None
            posthoc_results_b = run_all_posthoc_detectors(
                transactions_b, merchant_id=merchant_id
            )

            if posthoc_results_b.get("high_precision"):
                logger.info(
                    f"✅ Post-hoc detectors flagged high-precision patterns in Window B: {posthoc_results_b.get('risk_factors', [])}"
                )
        except Exception as e:
            logger.warning(f"⚠️ Post-hoc detector analysis failed for Window B: {e}")

    # Validate that both windows have data
    if len(transactions_a) == 0 and len(transactions_b) == 0:
        entity_info = "all entities"
        if request.entity:
            entity_info = f"{request.entity.get('type', 'unknown')}:{request.entity.get('value', '')}"
        error_msg = (
            f"No transaction data found for {entity_info} in either time window. "
            f"Window A ({window_a_label}): {window_a_start} to {window_a_end}, "
            f"Window B ({window_b_label}): {window_b_start} to {window_b_end}. "
            "Comparison requires data in both windows to be meaningful."
        )
        logger.warning(error_msg)
        raise ValueError(error_msg)

    if len(transactions_a) == 0:
        entity_info = "all entities"
        if request.entity:
            entity_info = f"{request.entity.get('type', 'unknown')}:{request.entity.get('value', '')}"
        error_msg = (
            f"No transaction data found for {entity_info} in Window A ({window_a_label}: "
            f"{window_a_start} to {window_a_end}). "
            "Comparison requires data in both windows to be meaningful."
        )
        logger.warning(error_msg)
        raise ValueError(error_msg)

    if len(transactions_b) == 0:
        entity_info = "all entities"
        if request.entity:
            entity_info = f"{request.entity.get('type', 'unknown')}:{request.entity.get('value', '')}"
        warning_msg = (
            f"No transaction data found for {entity_info} in Window B ({window_b_label}: "
            f"{window_b_start} to {window_b_end}). "
            "Comparison requires data in both windows to be meaningful. "
            "Returning partial results with Window A metrics only."
        )
        logger.warning(warning_msg)
        # CRITICAL FIX: Instead of raising ValueError, return partial results
        # This allows the comparison to continue with Window A data only
        # Window B metrics will be zero/empty, but comparison can still proceed
        window_b_empty = True
    else:
        window_b_empty = False

    # Compute metrics for Window A
    tp_a, fp_a, tn_a, fn_a, excluded_a = compute_confusion_matrix(
        transactions_a, risk_threshold
    )
    (
        precision_a,
        recall_a,
        f1_a,
        accuracy_a,
        fraud_rate_a,
        pending_a,
        ci_a,
        support_a,
        power_a,
    ) = compute_derived_metrics(
        tp_a,
        fp_a,
        tn_a,
        fn_a,
        transactions_a,
        ci_confidence=EVAL_DEFAULTS["ci_confidence"],
    )
    over_threshold_a = sum(
        1
        for tx in transactions_a
        if tx.get("predicted_risk") and tx.get("predicted_risk") >= risk_threshold
    )

    # Calculate calibration metrics
    brier_a = calculate_brier_score(transactions_a, predicted_risk_a)
    log_loss_a = calculate_log_loss(transactions_a, predicted_risk_a)

    from app.router.models.investigation_comparison_models import (
        PowerAssessment,
        SupportMetrics,
    )

    metrics_a = WindowMetrics(
        total_transactions=len(transactions_a),
        over_threshold=over_threshold_a,
        TP=tp_a,
        FP=fp_a,
        TN=tn_a,
        FN=fn_a,
        precision=precision_a,
        recall=recall_a,
        f1=f1_a,
        accuracy=accuracy_a,
        fraud_rate=fraud_rate_a,
        pending_label_count=pending_a if pending_a > 0 else None,
        brier=brier_a,
        log_loss=log_loss_a,
        source=source_a,
        ci=ci_a if ci_a else None,
        support=SupportMetrics(**support_a) if support_a else None,
        power=PowerAssessment(**power_a) if power_a else None,
    )

    # Compute metrics for Window B (only if not empty)
    if window_b_empty:
        # Window B is empty - create zero-filled metrics
        tp_b, fp_b, tn_b, fn_b, excluded_b = 0, 0, 0, 0, 0
        (
            precision_b,
            recall_b,
            f1_b,
            accuracy_b,
            fraud_rate_b,
            pending_b,
            ci_b,
            support_b,
            power_b,
        ) = (0.0, 0.0, 0.0, 0.0, 0.0, 0, None, 0, 0.0)
        over_threshold_b = 0
        brier_b = None
        log_loss_b = None
    else:
        tp_b, fp_b, tn_b, fn_b, excluded_b = compute_confusion_matrix(
            transactions_b, risk_threshold
        )
        (
            precision_b,
            recall_b,
            f1_b,
            accuracy_b,
            fraud_rate_b,
            pending_b,
            ci_b,
            support_b,
            power_b,
        ) = compute_derived_metrics(
            tp_b,
            fp_b,
            tn_b,
            fn_b,
            transactions_b,
            ci_confidence=EVAL_DEFAULTS["ci_confidence"],
        )
        over_threshold_b = sum(
            1
            for tx in transactions_b
            if tx.get("predicted_risk") and tx.get("predicted_risk") >= risk_threshold
        )

        # Calculate calibration metrics
        brier_b = calculate_brier_score(transactions_b, predicted_risk_b)
        log_loss_b = calculate_log_loss(transactions_b, predicted_risk_b)

    metrics_b = WindowMetrics(
        total_transactions=len(transactions_b),
        over_threshold=over_threshold_b,
        TP=tp_b,
        FP=fp_b,
        TN=tn_b,
        FN=fn_b,
        precision=precision_b,
        recall=recall_b,
        f1=f1_b,
        accuracy=accuracy_b,
        fraud_rate=fraud_rate_b,
        pending_label_count=pending_b if pending_b > 0 else None,
        brier=brier_b,
        log_loss=log_loss_b,
        source=source_b,
        ci=ci_b if ci_b else None,
        support=SupportMetrics(**support_b) if support_b else None,
        power=PowerAssessment(**power_b) if power_b else None,
    )

    # Calculate workload metrics
    workload_a = calculate_workload_metrics(
        transactions_a, window_a_start, window_a_end, risk_threshold
    )
    if window_b_empty:
        # Window B is empty - create empty workload metrics
        workload_b = {"total_alerts": 0, "alerts_per_day": 0.0, "workload_score": 0.0}
    else:
        workload_b = calculate_workload_metrics(
            transactions_b, window_b_start, window_b_end, risk_threshold
        )

    # Calculate precision@k (top 100, 500, 1000 anomalies)
    precision_at_k_a = {}
    precision_at_k_b = {}
    for k in [100, 500, 1000]:
        precision_at_k_a[k] = calculate_precision_at_k(
            transactions_a, k, risk_threshold
        )
        if window_b_empty:
            precision_at_k_b[k] = None  # No data for Window B
        else:
            precision_at_k_b[k] = calculate_precision_at_k(
                transactions_b, k, risk_threshold
            )

    # Calculate recall at fixed alert budgets (50, 100, 150 alerts/day)
    recall_at_budget_a = {}
    recall_at_budget_b = {}
    for daily_budget in [50, 100, 150]:
        recall_at_budget_a[daily_budget] = calculate_recall_at_budget(
            transactions_a, daily_budget, window_a_start, window_a_end
        )
        if window_b_empty:
            recall_at_budget_b[daily_budget] = None  # No data for Window B
        else:
            recall_at_budget_b[daily_budget] = calculate_recall_at_budget(
                transactions_b, daily_budget, window_b_start, window_b_end
            )

    # Calculate threshold curves for threshold tuning
    threshold_curve_a = None
    threshold_curve_b = None
    options = request.options
    if options and options.include_histograms:
        # Calculate threshold curve (precision-recall at different thresholds)
        threshold_curve_a = calculate_threshold_curve(transactions_a)
        if not window_b_empty:
            threshold_curve_b = calculate_threshold_curve(transactions_b)

        metrics_a.risk_histogram = compute_histogram(transactions_a)
        if not window_b_empty:
            metrics_b.risk_histogram = compute_histogram(transactions_b)
        else:
            metrics_b.risk_histogram = None  # No data for Window B
    if options and options.include_timeseries:
        metrics_a.timeseries_daily = compute_timeseries_daily(
            transactions_a, window_a_start, window_a_end, risk_threshold
        )
        if not window_b_empty:
            metrics_b.timeseries_daily = compute_timeseries_daily(
                transactions_b, window_b_start, window_b_end, risk_threshold
            )
        else:
            metrics_b.timeseries_daily = None  # No data for Window B

    # Compute deltas
    # Extract predicted_risk values for PSI/KS calculation
    risks_a = [
        tx.get("predicted_risk")
        for tx in transactions_a
        if tx.get("predicted_risk") is not None
    ]
    risks_b = [
        tx.get("predicted_risk")
        for tx in transactions_b
        if tx.get("predicted_risk") is not None
    ]

    psi_value = (
        compute_psi(risks_a, risks_b)
        if len(risks_a) >= 10 and len(risks_b) >= 10
        else None
    )
    ks_value = (
        compute_ks_statistic(risks_a, risks_b)
        if len(risks_a) >= 10 and len(risks_b) >= 10
        else None
    )

    delta = DeltaMetrics(
        precision=precision_b - precision_a,
        recall=recall_b - recall_a,
        f1=f1_b - f1_a,
        accuracy=accuracy_b - accuracy_a,
        fraud_rate=fraud_rate_b - fraud_rate_a,
        psi_predicted_risk=psi_value,
        ks_stat_predicted_risk=ks_value,
    )

    # Compute per-merchant breakdown if requested
    per_merchant = None
    options = request.options
    if options and options.include_per_merchant:
        per_merchant = compute_per_merchant_metrics(
            transactions_a, transactions_b, risk_threshold, options.max_merchants
        )

    # Generate summary
    summary = generate_investigation_summary(
        request.entity, metrics_a, metrics_b, delta, window_a_label, window_b_label
    )

    # Build response with effective windows
    from app.router.models.investigation_comparison_models import AutoExpandMetadata

    response = ComparisonResponse(
        entity=request.entity,
        threshold=risk_threshold,
        windowA=WindowInfo(
            label=window_a_label,
            start=window_a_effective_start.isoformat(),
            end=window_a_effective_end.isoformat(),
            auto_expand_meta=(
                AutoExpandMetadata(**expand_meta_a) if expand_meta_a else None
            ),
        ),
        windowB=WindowInfo(
            label=window_b_label,
            start=window_b_effective_start.isoformat(),
            end=window_b_effective_end.isoformat(),
            auto_expand_meta=(
                AutoExpandMetadata(**expand_meta_b) if expand_meta_b else None
            ),
        ),
        A=metrics_a,
        B=metrics_b,
        delta=delta,
        per_merchant=per_merchant,
        excluded_missing_predicted_risk=(
            excluded_a + excluded_b if (excluded_a + excluded_b) > 0 else None
        ),
        investigation_summary=summary,
    )

    # Additional metrics will be passed to HTML generator separately
    # (not stored in Pydantic model to avoid schema changes)

    # Persist JSON artifact
    # Use investigation_a ID if available, otherwise investigation_b, otherwise None
    # This ensures artifacts have proper investigation IDs instead of "unknown"
    artifact_investigation_id = None
    if investigation_a:
        artifact_investigation_id = investigation_a.get("id")
    elif investigation_b:
        artifact_investigation_id = investigation_b.get("id")

    # Use window_b_end as created_at timestamp (most recent date)
    artifact_path = persist_artifact(
        response,
        request.entity.get("type") if request.entity else None,
        request.entity.get("value") if request.entity else None,
        window_a_start,
        window_b_end,
        investigation_id=artifact_investigation_id,
        created_at=window_b_end,
    )
    logger.info(
        f"JSON artifact saved: {artifact_path} (investigation_id={artifact_investigation_id or 'None'})"
    )

    # Prepare additional metrics for HTML report
    additional_metrics = {
        "workload_metrics_a": workload_a,
        "workload_metrics_b": workload_b,
        "precision_at_k_a": precision_at_k_a,
        "precision_at_k_b": precision_at_k_b,
        "recall_at_budget_a": recall_at_budget_a,
        "recall_at_budget_b": recall_at_budget_b,
        "threshold_curve_a": threshold_curve_a,
        "threshold_curve_b": threshold_curve_b,
    }

    # Generate HTML report
    html_output_path = Path(artifact_path).parent / f"{Path(artifact_path).stem}.html"
    try:
        html_content = generate_html_report(
            response, html_output_path, additional_metrics
        )
        logger.info(f"HTML report saved: {html_output_path}")
    except Exception as e:
        logger.warning(f"Failed to generate HTML report: {e}")

    logger.info(f"Comparison completed successfully. Artifact: {artifact_path}")
    return response


def calculate_confusion_matrix(
    transactions: List[Dict[str, Any]],
    risk_threshold: float,
    entity_type: str,
    entity_id: str,
    investigation_id: Optional[str],
    window_start: datetime,
    window_end: datetime,
    investigation_risk_score: Optional[float],
) -> ConfusionMatrix:
    """
    Calculate confusion matrix metrics for a single entity investigation.

    Uses existing compute_confusion_matrix() and compute_derived_metrics() functions.
    Only includes APPROVED transactions (filtered in map_investigation_to_transactions).

    Args:
        transactions: List of transactions with predicted_risk and actual_outcome
        risk_threshold: Threshold used for classification (RISK_THRESHOLD_DEFAULT)
        entity_type: Entity type (e.g., 'email', 'device_id')
        entity_id: Entity identifier
        investigation_id: Investigation ID if available
        window_start: Investigation window start time
        window_end: Investigation window end time
        investigation_risk_score: Risk score from investigation

    Returns:
        ConfusionMatrix object with TP, FP, TN, FN, precision, recall, F1, accuracy
    """
    # Use existing compute_confusion_matrix function
    tp, fp, tn, fn, excluded_missing_predicted_risk = compute_confusion_matrix(
        transactions, risk_threshold
    )

    # Count transactions with missing actual_outcome (excluded from confusion matrix)
    # Note: IS_FRAUD_TX is never NULL in the database (verified: all rows have 0 or 1)
    # actual_outcome is None only if predicted_risk is missing (transaction excluded before IS_FRAUD_TX query)
    excluded_missing_actual_outcome = sum(
        1 for tx in transactions if tx.get("actual_outcome") is None
    )

    excluded_count = excluded_missing_actual_outcome + excluded_missing_predicted_risk

    # Use existing compute_derived_metrics function
    (
        precision,
        recall,
        f1,
        accuracy,
        fraud_rate,
        pending_count,
        ci_dict,
        support_dict,
        power_dict,
    ) = compute_derived_metrics(tp, fp, tn, fn, transactions)

    # Validation: Sum check - TP+FP+TN+FN+excluded should equal total_transactions
    total_calculated = tp + fp + tn + fn + excluded_count
    total_expected = len(transactions)

    if total_calculated != total_expected:
        logger.warning(
            f"⚠️ Confusion matrix sum mismatch for {entity_type}:{entity_id}: "
            f"TP+FP+TN+FN+excluded={total_calculated} != total_transactions={total_expected}"
        )

    # Create ConfusionMatrix object
    confusion_matrix = ConfusionMatrix(
        entity_type=entity_type,
        entity_id=entity_id,
        investigation_id=investigation_id,
        TP=tp,
        FP=fp,
        TN=tn,
        FN=fn,
        excluded_count=excluded_count,
        precision=precision,
        recall=recall,
        f1_score=f1,
        accuracy=accuracy,
        investigation_risk_score=investigation_risk_score,
        risk_threshold=risk_threshold,
        total_transactions=len(transactions),
        window_start=window_start,
        window_end=window_end,
    )

    logger.info(
        f"📊 Calculated confusion matrix for {entity_type}:{entity_id}: "
        f"TP={tp}, FP={fp}, TN={tn}, FN={fn}, excluded={excluded_count}, "
        f"precision={precision:.3f}, recall={recall:.3f}, f1={f1:.3f}, accuracy={accuracy:.3f}, "
        f"total_transactions={total_expected} (sum check: {total_calculated})"
    )

    return confusion_matrix


def aggregate_confusion_matrices(
    matrices: List[ConfusionMatrix], risk_threshold: float
) -> AggregatedConfusionMatrix:
    """
    Aggregate confusion matrices across multiple entities.

    Args:
        matrices: List of ConfusionMatrix objects for individual entities
        risk_threshold: Threshold used for classification

    Returns:
        AggregatedConfusionMatrix object with aggregated metrics
    """
    logger.info(f"📊 Aggregating confusion matrices for {len(matrices)} entities...")

    if not matrices:
        # Return empty aggregated matrix if no matrices provided
        return AggregatedConfusionMatrix(
            total_TP=0,
            total_FP=0,
            total_TN=0,
            total_FN=0,
            total_excluded=0,
            aggregated_precision=0.0,
            aggregated_recall=0.0,
            aggregated_f1_score=0.0,
            aggregated_accuracy=0.0,
            entity_matrices=[],
            entity_count=0,
            risk_threshold=risk_threshold,
            calculation_timestamp=datetime.now(pytz.UTC),
        )

    # Aggregate counts
    total_tp = sum(m.TP for m in matrices)
    total_fp = sum(m.FP for m in matrices)
    total_tn = sum(m.TN for m in matrices)
    total_fn = sum(m.FN for m in matrices)
    total_excluded = sum(m.excluded_count for m in matrices)
    total_transactions = sum(m.total_transactions for m in matrices)

    # Validation: Sum check - TP+FP+TN+FN+excluded should equal total_transactions
    total_calculated = total_tp + total_fp + total_tn + total_fn + total_excluded
    if total_calculated != total_transactions:
        logger.warning(
            f"⚠️ Aggregated confusion matrix sum mismatch: "
            f"TP+FP+TN+FN+excluded={total_calculated} != total_transactions={total_transactions}"
        )

    # Calculate aggregated derived metrics with divide-by-zero guards
    # Precision: total_TP / (total_TP + total_FP)
    aggregated_precision = (
        total_tp / (total_tp + total_fp) if (total_tp + total_fp) > 0 else 0.0
    )
    if (total_tp + total_fp) == 0:
        logger.debug(
            "Divide-by-zero in aggregated precision calculation: TP+FP=0 (no positive predictions)"
        )

    # Recall: total_TP / (total_TP + total_FN)
    aggregated_recall = (
        total_tp / (total_tp + total_fn) if (total_tp + total_fn) > 0 else 0.0
    )
    if (total_tp + total_fn) == 0:
        logger.debug(
            "Divide-by-zero in aggregated recall calculation: TP+FN=0 (no actual fraud cases)"
        )

    # F1: 2 * (precision * recall) / (precision + recall)
    aggregated_f1 = (
        2
        * (aggregated_precision * aggregated_recall)
        / (aggregated_precision + aggregated_recall)
        if (aggregated_precision + aggregated_recall) > 0
        else 0.0
    )
    if (aggregated_precision + aggregated_recall) == 0:
        logger.debug("Divide-by-zero in aggregated F1 calculation: precision+recall=0")

    # Accuracy: (total_TP + total_TN) / (total_TP + total_FP + total_TN + total_FN)
    total_known = total_tp + total_fp + total_tn + total_fn
    aggregated_accuracy = (
        (total_tp + total_tn) / total_known if total_known > 0 else 0.0
    )
    if total_known == 0:
        logger.debug(
            "Divide-by-zero in aggregated accuracy calculation: no known labels"
        )

    aggregated_matrix = AggregatedConfusionMatrix(
        total_TP=total_tp,
        total_FP=total_fp,
        total_TN=total_tn,
        total_FN=total_fn,
        total_excluded=total_excluded,
        aggregated_precision=aggregated_precision,
        aggregated_recall=aggregated_recall,
        aggregated_f1_score=aggregated_f1,
        aggregated_accuracy=aggregated_accuracy,
        entity_matrices=matrices,
        entity_count=len(matrices),
        risk_threshold=risk_threshold,
        calculation_timestamp=datetime.now(pytz.UTC),
    )

    logger.info(
        f"📊 Aggregated confusion matrices across {len(matrices)} entities: "
        f"Total TP={total_tp}, FP={total_fp}, TN={total_tn}, FN={total_fn}, "
        f"Precision={aggregated_precision:.3f}, Recall={aggregated_recall:.3f}, "
        f"F1={aggregated_f1:.3f}, Accuracy={aggregated_accuracy:.3f}"
    )

    return aggregated_matrix
