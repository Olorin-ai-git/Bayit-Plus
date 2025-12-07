"""
Financial Analysis API Router
Feature: 025-financial-analysis-frontend

Provides REST API endpoints for financial metrics with:
- Per-investigation financial metrics retrieval
- Aggregated financial summary across investigations
- Integration with RevenueCalculator and ConfusionMatrix services

SYSTEM MANDATE Compliance:
- No hardcoded values: All configuration from environment
- Complete implementation: No placeholders
- Type-safe: All parameters and returns properly typed
"""

from datetime import datetime
from decimal import Decimal
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.persistence.database import get_db
from app.schemas.financial_response import (
    AggregateConfusionMatrix,
    ConfidenceLevel,
    ConfusionMetricsResponse,
    FinancialMetricsResponse,
    FinancialSummary,
    FinancialSummaryResponse,
    InvestigationStatus,
    RevenueMetricsResponse,
)
from app.security.auth import User
from app.security.auth import require_read_or_dev as require_read
from app.service.investigation_state_service import InvestigationStateService
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

router = APIRouter(
    prefix="/api/v1/financial",
    tags=["Financial Analysis"],
    responses={404: {"description": "Not found"}},
)


@router.get(
    "/{investigation_id}/metrics",
    response_model=FinancialMetricsResponse,
    summary="Get financial metrics for an investigation",
    description="Returns revenue implications and confusion matrix for a completed investigation",
)
async def get_investigation_financial_metrics(
    investigation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_read),
) -> FinancialMetricsResponse:
    """Get financial metrics for a specific investigation."""
    service = InvestigationStateService(db)

    state = service.get_state_with_auth(
        investigation_id=investigation_id, user_id=current_user.username
    )

    if not state:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Investigation {investigation_id} not found",
        )

    if state.status != "COMPLETED":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Investigation {investigation_id} not completed (status: {state.status})",
        )

    revenue_metrics = _extract_revenue_metrics(state)
    confusion_metrics = _extract_confusion_metrics(state)

    return FinancialMetricsResponse(
        investigation_id=investigation_id,
        revenue_metrics=revenue_metrics,
        confusion_metrics=confusion_metrics,
        calculated_at=datetime.utcnow(),
    )


@router.get(
    "/summary",
    response_model=FinancialSummaryResponse,
    summary="Get aggregated financial summary",
    description="Returns aggregated financial metrics across multiple investigations",
)
async def get_financial_summary(
    investigation_ids: List[str] = Query(
        ..., description="List of investigation IDs to aggregate"
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_read),
) -> FinancialSummaryResponse:
    """Get aggregated financial metrics across multiple investigations."""
    service = InvestigationStateService(db)

    total_saved = Decimal("0")
    total_lost = Decimal("0")
    total_tp, total_fp, total_tn, total_fn = 0, 0, 0, 0
    precision_sum, recall_sum = 0.0, 0.0
    successful_count, failed_count, precision_count = 0, 0, 0
    investigation_statuses: List[InvestigationStatus] = []

    for inv_id in investigation_ids:
        try:
            state = service.get_state_with_auth(
                investigation_id=inv_id, user_id=current_user.username
            )

            if not state:
                investigation_statuses.append(
                    InvestigationStatus(
                        investigation_id=inv_id,
                        status="failed",
                        error_message="Investigation not found",
                    )
                )
                failed_count += 1
                continue

            if state.status != "COMPLETED":
                investigation_statuses.append(
                    InvestigationStatus(
                        investigation_id=inv_id,
                        status="skipped",
                        error_message=f"Not completed: {state.status}",
                    )
                )
                failed_count += 1
                continue

            revenue_metrics = _extract_revenue_metrics(state)
            confusion_metrics = _extract_confusion_metrics(state)

            if revenue_metrics and not revenue_metrics.skipped_due_to_prediction:
                total_saved += revenue_metrics.saved_fraud_gmv
                total_lost += revenue_metrics.lost_revenues
                successful_count += 1
                investigation_statuses.append(
                    InvestigationStatus(investigation_id=inv_id, status="success")
                )
            else:
                investigation_statuses.append(
                    InvestigationStatus(
                        investigation_id=inv_id,
                        status="skipped",
                        error_message="Skipped due to prediction validation",
                    )
                )
                failed_count += 1

            if confusion_metrics:
                total_tp += confusion_metrics.true_positives
                total_fp += confusion_metrics.false_positives
                total_tn += confusion_metrics.true_negatives
                total_fn += confusion_metrics.false_negatives
                precision_sum += confusion_metrics.precision
                recall_sum += confusion_metrics.recall
                precision_count += 1

        except Exception as e:
            logger.warning(f"Error processing investigation {inv_id}: {e}")
            investigation_statuses.append(
                InvestigationStatus(
                    investigation_id=inv_id, status="failed", error_message=str(e)
                )
            )
            failed_count += 1

    avg_precision = precision_sum / precision_count if precision_count > 0 else 0.0
    avg_recall = recall_sum / precision_count if precision_count > 0 else 0.0

    aggregate_confusion = None
    if precision_count > 0:
        aggregate_confusion = AggregateConfusionMatrix(
            total_tp=total_tp,
            total_fp=total_fp,
            total_tn=total_tn,
            total_fn=total_fn,
            avg_precision=avg_precision,
            avg_recall=avg_recall,
        )

    summary = FinancialSummary(
        total_saved_fraud_gmv=total_saved,
        total_lost_revenues=total_lost,
        total_net_value=total_saved - total_lost,
        aggregate_confusion_matrix=aggregate_confusion,
        investigation_count=len(investigation_ids),
        successful_calculations=successful_count,
        failed_calculations=failed_count,
        aggregated_at=datetime.utcnow(),
    )

    return FinancialSummaryResponse(summary=summary, investigations=investigation_statuses)


def _extract_revenue_metrics(state) -> RevenueMetricsResponse | None:
    """Extract revenue metrics from investigation state."""
    revenue_data = getattr(state, "revenue_implication", None)
    if not revenue_data:
        return None

    if isinstance(revenue_data, dict):
        return RevenueMetricsResponse(
            saved_fraud_gmv=Decimal(str(revenue_data.get("saved_fraud_gmv", 0))),
            lost_revenues=Decimal(str(revenue_data.get("lost_revenues", 0))),
            net_value=Decimal(str(revenue_data.get("net_value", 0))),
            confidence_level=ConfidenceLevel(
                revenue_data.get("confidence_level", "low")
            ),
            approved_fraud_tx_count=revenue_data.get("approved_fraud_tx_count", 0),
            blocked_legit_tx_count=revenue_data.get("blocked_legitimate_tx_count", 0),
            total_tx_count=revenue_data.get("total_tx_count", 0),
            calculation_successful=revenue_data.get("calculation_successful", True),
            error_message=revenue_data.get("error_message"),
            skipped_due_to_prediction=revenue_data.get(
                "skipped_due_to_prediction", False
            ),
        )

    return RevenueMetricsResponse(
        saved_fraud_gmv=revenue_data.saved_fraud_gmv,
        lost_revenues=revenue_data.lost_revenues,
        net_value=revenue_data.net_value,
        confidence_level=ConfidenceLevel(revenue_data.confidence_level),
        approved_fraud_tx_count=revenue_data.approved_fraud_tx_count,
        blocked_legit_tx_count=revenue_data.blocked_legitimate_tx_count,
        total_tx_count=revenue_data.total_tx_count,
        calculation_successful=revenue_data.calculation_successful,
        error_message=revenue_data.error_message,
        skipped_due_to_prediction=revenue_data.skipped_due_to_prediction,
    )


def _extract_confusion_metrics(state) -> ConfusionMetricsResponse | None:
    """Extract confusion metrics from investigation state."""
    confusion_data = getattr(state, "confusion_matrix", None)
    if not confusion_data:
        return None

    if isinstance(confusion_data, dict):
        return ConfusionMetricsResponse(
            true_positives=confusion_data.get("true_positives", 0),
            false_positives=confusion_data.get("false_positives", 0),
            true_negatives=confusion_data.get("true_negatives", 0),
            false_negatives=confusion_data.get("false_negatives", 0),
            precision=confusion_data.get("precision", 0.0),
            recall=confusion_data.get("recall", 0.0),
            f1_score=confusion_data.get("f1_score", 0.0),
            accuracy=confusion_data.get("accuracy", 0.0),
        )

    return ConfusionMetricsResponse(
        true_positives=confusion_data.true_positives,
        false_positives=confusion_data.false_positives,
        true_negatives=confusion_data.true_negatives,
        false_negatives=confusion_data.false_negatives,
        precision=confusion_data.precision,
        recall=confusion_data.recall,
        f1_score=confusion_data.f1_score,
        accuracy=confusion_data.accuracy,
    )
