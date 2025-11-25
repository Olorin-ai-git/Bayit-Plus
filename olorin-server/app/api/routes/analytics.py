"""
API endpoints for risk analytics powered by Snowflake.
Extended with fraud detection analytics endpoints.
NO HARDCODED VALUES - All configuration from environment variables.
"""

import asyncio
import os
import time
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    HTTPException,
    Query,
    Request,
    WebSocket,
    WebSocketDisconnect,
)
from pydantic import BaseModel, Field

from app.models.analytics import (
    AnalyticsDashboardResponse,
    FraudMetrics,
    PrecisionRecallResponse,
)
from app.security.auth import User, require_write_or_dev
from app.service.analytics.cohort_analyzer import CohortAnalyzer
from app.service.analytics.dashboard_service import DashboardService
from app.service.analytics.drift_detector import DriftDetector
from app.service.analytics.experiment_manager import ExperimentManager
from app.service.analytics.explainer import Explainer
from app.service.analytics.metrics_calculator import MetricsCalculator
from app.service.analytics.pipeline_monitor import PipelineMonitor
from app.service.analytics.replay_engine import ReplayEngine
from app.service.analytics.risk_analyzer import get_risk_analyzer
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

router = APIRouter(prefix="/analytics", tags=["analytics"])

# Initialize services
dashboard_service = DashboardService()
metrics_calculator = MetricsCalculator()
cohort_analyzer = CohortAnalyzer()
experiment_manager = ExperimentManager()
drift_detector = DriftDetector()
replay_engine = ReplayEngine()
explainer = Explainer()
pipeline_monitor = PipelineMonitor()


class RiskAnalyticsRequest(BaseModel):
    """Request model for risk analytics."""

    time_window: Optional[str] = Field(
        None, description="Time window for analysis (e.g., '24h', '7d', '30d')"
    )
    group_by: Optional[str] = Field(
        None, description="Field to group by (e.g., 'EMAIL', 'DEVICE_ID', 'IP')"
    )
    top_percentage: Optional[float] = Field(
        None,
        description="Top percentage to return (e.g., 10 for top 10%)",
        ge=1,
        le=100,
    )
    force_refresh: bool = Field(False, description="Force refresh bypassing cache")


class EntityAnalysisRequest(BaseModel):
    """Request model for entity analysis."""

    entity_value: str = Field(..., description="The entity value to analyze")
    entity_type: str = Field(
        "email", description="Type of entity (email, device_id, ip, etc.)"
    )
    time_window: str = Field("30d", description="Time window for analysis")


@router.get("/health")
async def analytics_health(request: Request):
    """Check if analytics service is available."""
    snowflake_enabled = os.getenv("USE_SNOWFLAKE", "false").lower() == "true"

    # Check scheduler status if available
    scheduler_status = None
    if (
        hasattr(request.app.state, "detection_scheduler")
        and request.app.state.detection_scheduler
    ):
        scheduler = request.app.state.detection_scheduler
        scheduler_status = {
            "running": (
                scheduler.scheduler.running
                if hasattr(scheduler, "scheduler")
                else False
            ),
            "enabled": getattr(scheduler, "enabled", True),
        }

    return {
        "status": "healthy",
        "snowflake_enabled": snowflake_enabled,
        "scheduler": scheduler_status,
        "message": (
            "Analytics service is operational"
            if snowflake_enabled
            else "Analytics disabled (USE_SNOWFLAKE=false)"
        ),
    }


@router.get("/risk/top-entities")
async def get_top_risk_entities(
    request: Request,
    time_window: Optional[str] = Query(
        None, description="Time window (e.g., '24h', '7d')"
    ),
    group_by: Optional[str] = Query(
        None, description="Group by field (e.g., 'EMAIL', 'DEVICE_ID', 'IP')"
    ),
    top_percentage: Optional[float] = Query(None, description="Top percentage (1-100)"),
    force_refresh: bool = Query(False, description="Force refresh cache"),
):
    """
    Get top risk entities based on risk-weighted transaction value.

    Returns entities with highest risk_score × transaction_amount values.
    """
    # Check if Snowflake is enabled
    if os.getenv("USE_SNOWFLAKE", "false").lower() != "true":
        raise HTTPException(
            status_code=503,
            detail="Analytics service unavailable. Snowflake is disabled (USE_SNOWFLAKE=false)",
        )

    # Check for cached results in app state (loaded on startup)
    if not force_refresh and hasattr(request.app.state, "top_risk_entities"):
        cached = request.app.state.top_risk_entities
        if cached and not time_window and not group_by and not top_percentage:
            logger.info("Returning startup-cached risk entities")
            return cached

    try:
        analyzer = get_risk_analyzer()
        results = await analyzer.get_top_risk_entities(
            time_window=time_window,
            group_by=group_by,
            top_percentage=top_percentage,
            force_refresh=force_refresh,
        )

        if results.get("status") == "failed":
            raise HTTPException(
                status_code=500,
                detail=f"Analysis failed: {results.get('error', 'Unknown error')}",
            )

        return results

    except Exception as e:
        logger.error(f"Risk analysis endpoint error: {e}")
        raise HTTPException(status_code=500, detail=f"Risk analysis failed: {str(e)}")


@router.post("/risk/top-entities")
async def post_top_risk_entities(request: Request, body: RiskAnalyticsRequest):
    """
    Get top risk entities with POST request for complex parameters.
    """
    # Check if Snowflake is enabled
    if os.getenv("USE_SNOWFLAKE", "false").lower() != "true":
        raise HTTPException(
            status_code=503,
            detail="Analytics service unavailable. Snowflake is disabled",
        )

    try:
        analyzer = get_risk_analyzer()
        results = await analyzer.get_top_risk_entities(
            time_window=body.time_window,
            group_by=body.group_by,
            top_percentage=body.top_percentage,
            force_refresh=body.force_refresh,
        )

        if results.get("status") == "failed":
            raise HTTPException(
                status_code=500,
                detail=f"Analysis failed: {results.get('error', 'Unknown error')}",
            )

        return results

    except Exception as e:
        logger.error(f"Risk analysis endpoint error: {e}")
        raise HTTPException(status_code=500, detail=f"Risk analysis failed: {str(e)}")


@router.post("/entity/analyze")
async def analyze_entity(body: EntityAnalysisRequest):
    """
    Analyze a specific entity's risk profile.

    Provides detailed risk assessment for a single entity (email, device, IP, etc.)
    """
    # Check if Snowflake is enabled
    if os.getenv("USE_SNOWFLAKE", "false").lower() != "true":
        raise HTTPException(
            status_code=503,
            detail="Analytics service unavailable. Snowflake is disabled",
        )

    try:
        analyzer = get_risk_analyzer()
        results = await analyzer.analyze_entity(
            entity_value=body.entity_value,
            entity_type=body.entity_type,
            time_window=body.time_window,
        )

        if results.get("status") == "failed":
            raise HTTPException(
                status_code=500,
                detail=f"Entity analysis failed: {results.get('error', 'Unknown error')}",
            )

        return results

    except Exception as e:
        logger.error(f"Entity analysis endpoint error: {e}")
        raise HTTPException(status_code=500, detail=f"Entity analysis failed: {str(e)}")


@router.get("/config")
async def get_analytics_config():
    """
    Get current analytics configuration.
    """
    # Read analyzer time window configuration
    analyzer_hours = int(os.getenv("ANALYZER_TIME_WINDOW_HOURS", "24"))
    default_time_window = f"{analyzer_hours}h"

    return {
        "snowflake_enabled": os.getenv("USE_SNOWFLAKE", "false").lower() == "true",
        "default_time_window": default_time_window,
        "default_group_by": os.getenv("ANALYTICS_DEFAULT_GROUP_BY", "email").upper(),
        "default_top_percentage": float(
            os.getenv("ANALYTICS_DEFAULT_TOP_PERCENTAGE", "10")
        ),
        "cache_ttl": int(os.getenv("ANALYTICS_CACHE_TTL", "300")),
        "available_groupings": ["EMAIL", "DEVICE_ID", "IP", "BIN", "MERCHANT_NAME"],
        "available_time_windows": ["1h", "6h", "12h", "24h", "7d", "30d"],
    }


@router.get("/dashboard")
async def get_dashboard(
    start_date: Optional[str] = Query(None, description="Start date (ISO 8601)"),
    end_date: Optional[str] = Query(None, description="End date (ISO 8601)"),
    time_window: Optional[str] = Query(
        None, description="Time window (1h, 24h, 7d, 30d, 90d, all)"
    ),
    investigation_id: Optional[str] = Query(
        None, description="Filter by investigation ID"
    ),
):
    """
    Get analytics dashboard data including KPIs and trends.
    """
    try:
        start_dt = datetime.fromisoformat(start_date) if start_date else None
        end_dt = datetime.fromisoformat(end_date) if end_date else None

        result = await dashboard_service.get_dashboard_data(
            start_date=start_dt,
            end_date=end_dt,
            time_window=time_window,
            investigation_id=investigation_id,
        )
        return result
    except Exception as e:
        logger.error(f"Dashboard endpoint error: {e}")
        raise HTTPException(status_code=500, detail=f"Dashboard data failed: {str(e)}")


@router.get("/metrics")
async def get_metrics(
    start_date: str = Query(..., description="Start date (ISO 8601)"),
    end_date: str = Query(..., description="End date (ISO 8601)"),
    include_latency: bool = Query(True, description="Include latency metrics"),
    include_throughput: bool = Query(True, description="Include throughput metrics"),
):
    """
    Get fraud detection metrics for a time period.
    """
    try:
        start_dt = datetime.fromisoformat(start_date)
        end_dt = datetime.fromisoformat(end_date)

        result = await metrics_calculator.calculate_metrics(start_dt, end_dt)
        return result
    except Exception as e:
        logger.error(f"Metrics endpoint error: {e}")
        raise HTTPException(
            status_code=500, detail=f"Metrics calculation failed: {str(e)}"
        )


@router.get("/metrics/precision-recall")
async def get_precision_recall(
    start_date: str = Query(..., description="Start date (ISO 8601)"),
    end_date: str = Query(..., description="End date (ISO 8601)"),
):
    """
    Get precision, recall, and F1 score.
    """
    try:
        start_dt = datetime.fromisoformat(start_date)
        end_dt = datetime.fromisoformat(end_date)

        metrics = await metrics_calculator.calculate_metrics(start_dt, end_dt)
        return PrecisionRecallResponse(
            precision=metrics.precision,
            recall=metrics.recall,
            f1_score=metrics.f1_score,
            true_positives=metrics.true_positives,
            false_positives=metrics.false_positives,
            true_negatives=metrics.true_negatives,
            false_negatives=metrics.false_negatives,
        )
    except Exception as e:
        logger.error(f"Precision-recall endpoint error: {e}")
        raise HTTPException(
            status_code=500, detail=f"Precision-recall calculation failed: {str(e)}"
        )


@router.get("/cohorts")
async def get_cohorts(
    dimension: str = Query(..., description="Dimension to segment by"),
    start_date: str = Query(..., description="Start date (ISO 8601)"),
    end_date: str = Query(..., description="End date (ISO 8601)"),
    min_count: int = Query(100, description="Minimum transactions per cohort"),
):
    """
    Get cohort analysis for a dimension.
    """
    try:
        start_dt = datetime.fromisoformat(start_date)
        end_dt = datetime.fromisoformat(end_date)

        result = await cohort_analyzer.analyze_cohorts(
            dimension, start_dt, end_dt, min_count
        )
        return result
    except Exception as e:
        logger.error(f"Cohorts endpoint error: {e}")
        raise HTTPException(status_code=500, detail=f"Cohort analysis failed: {str(e)}")


@router.get("/cohorts/compare")
async def compare_cohorts(
    cohort_ids: str = Query(..., description="Comma-separated cohort IDs"),
    metrics: Optional[str] = Query(None, description="Comma-separated metric names"),
):
    """
    Compare multiple cohorts side-by-side.
    """
    try:
        cohort_id_list = [id.strip() for id in cohort_ids.split(",")]
        metric_list = metrics.split(",") if metrics else None

        # Simplified comparison - would fetch actual cohort data
        return {
            "cohorts": [],
            "comparison": {"bestPerformer": None, "worstPerformer": None},
        }
    except Exception as e:
        logger.error(f"Cohort comparison endpoint error: {e}")
        raise HTTPException(
            status_code=500, detail=f"Cohort comparison failed: {str(e)}"
        )


@router.get("/experiments")
async def list_experiments(
    status: Optional[str] = Query(None, description="Filter by status")
):
    """List all experiments."""
    try:
        experiments = await experiment_manager.list_experiments(status)
        return experiments
    except Exception as e:
        logger.error(f"List experiments endpoint error: {e}")
        raise HTTPException(
            status_code=500, detail=f"List experiments failed: {str(e)}"
        )


@router.post("/experiments")
async def create_experiment(experiment_data: dict):
    """Create a new experiment."""
    try:
        experiment = await experiment_manager.create_experiment(experiment_data)
        return experiment
    except Exception as e:
        logger.error(f"Create experiment endpoint error: {e}")
        raise HTTPException(
            status_code=500, detail=f"Create experiment failed: {str(e)}"
        )


@router.get("/experiments/{experiment_id}")
async def get_experiment(experiment_id: str):
    """Get experiment by ID."""
    try:
        experiment = await experiment_manager.get_experiment(experiment_id)
        if not experiment:
            raise HTTPException(status_code=404, detail="Experiment not found")
        return experiment
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get experiment endpoint error: {e}")
        raise HTTPException(status_code=500, detail=f"Get experiment failed: {str(e)}")


@router.put("/experiments/{experiment_id}")
async def update_experiment(experiment_id: str, updates: dict):
    """Update experiment."""
    try:
        experiment = await experiment_manager.update_experiment(experiment_id, updates)
        return experiment
    except Exception as e:
        logger.error(f"Update experiment endpoint error: {e}")
        raise HTTPException(
            status_code=500, detail=f"Update experiment failed: {str(e)}"
        )


@router.post("/experiments/{experiment_id}/promote")
async def promote_experiment(
    experiment_id: str, variant_id: str = Query(..., description="Winning variant ID")
):
    """Promote winning variant to production."""
    try:
        experiment = await experiment_manager.promote_experiment(
            experiment_id, variant_id
        )
        return experiment
    except Exception as e:
        logger.error(f"Promote experiment endpoint error: {e}")
        raise HTTPException(
            status_code=500, detail=f"Promote experiment failed: {str(e)}"
        )


@router.get("/experiments/{experiment_id}/results")
async def get_experiment_results(
    experiment_id: str,
    start_date: str = Query(..., description="Start date (ISO 8601)"),
    end_date: str = Query(..., description="End date (ISO 8601)"),
):
    """Get experiment results."""
    try:
        start_dt = datetime.fromisoformat(start_date)
        end_dt = datetime.fromisoformat(end_date)
        return await experiment_manager.get_experiment_results(
            experiment_id, start_dt, end_dt
        )
    except Exception as e:
        logger.error(f"Experiment results endpoint error: {e}")
        raise HTTPException(
            status_code=500, detail=f"Experiment results failed: {str(e)}"
        )


@router.get("/experiments/{experiment_id}/guardrails")
async def check_experiment_guardrails(experiment_id: str):
    """Check guardrail violations for an experiment."""
    try:
        guardrails = await experiment_manager.check_guardrails(experiment_id)
        return guardrails
    except Exception as e:
        logger.error(f"Check guardrails endpoint error: {e}")
        raise HTTPException(
            status_code=500, detail=f"Check guardrails failed: {str(e)}"
        )


@router.get("/drift/detect")
async def detect_drift(
    feature: str = Query(..., description="Feature name"),
    reference_start: str = Query(..., description="Reference period start (ISO 8601)"),
    reference_end: str = Query(..., description="Reference period end (ISO 8601)"),
    current_start: str = Query(..., description="Current period start (ISO 8601)"),
    current_end: str = Query(..., description="Current period end (ISO 8601)"),
):
    """Detect feature drift."""
    try:
        ref_start = datetime.fromisoformat(reference_start)
        ref_end = datetime.fromisoformat(reference_end)
        curr_start = datetime.fromisoformat(current_start)
        curr_end = datetime.fromisoformat(current_end)
        return await drift_detector.detect_drift(
            feature, ref_start, ref_end, curr_start, curr_end
        )
    except Exception as e:
        logger.error(f"Drift detection endpoint error: {e}")
        raise HTTPException(status_code=500, detail=f"Drift detection failed: {str(e)}")


@router.get("/drift/quality")
async def check_data_quality(
    start_date: str = Query(..., description="Start date (ISO 8601)"),
    end_date: str = Query(..., description="End date (ISO 8601)"),
):
    """Check data quality."""
    try:
        start_dt = datetime.fromisoformat(start_date)
        end_dt = datetime.fromisoformat(end_date)
        return await drift_detector.check_data_quality(start_dt, end_dt)
    except Exception as e:
        logger.error(f"Data quality endpoint error: {e}")
        raise HTTPException(
            status_code=500, detail=f"Data quality check failed: {str(e)}"
        )


@router.get("/replay/scenarios")
async def list_replay_scenarios(
    status: Optional[str] = Query(None, description="Filter by status")
):
    """List all replay scenarios."""
    try:
        scenarios = await replay_engine.list_scenarios(status)
        return scenarios
    except Exception as e:
        logger.error(f"List replay scenarios endpoint error: {e}")
        raise HTTPException(
            status_code=500, detail=f"List replay scenarios failed: {str(e)}"
        )


@router.post("/replay/scenarios")
async def create_replay_scenario(request: Request):
    """Create a new replay scenario."""
    try:
        body = await request.json()
        scenario = await replay_engine.create_scenario(
            name=body["name"],
            description=body.get("description"),
            start_date=datetime.fromisoformat(body["startDate"]),
            end_date=datetime.fromisoformat(body["endDate"]),
            configuration=body.get("configuration", {}),
            created_by=body.get("createdBy", "system"),
        )
        return scenario
    except Exception as e:
        logger.error(f"Create replay scenario endpoint error: {e}")
        raise HTTPException(
            status_code=500, detail=f"Create replay scenario failed: {str(e)}"
        )


@router.get("/replay/scenarios/{scenario_id}")
async def get_replay_scenario(scenario_id: str):
    """Get replay scenario by ID."""
    try:
        scenario = await replay_engine.get_scenario(scenario_id)
        if not scenario:
            raise HTTPException(status_code=404, detail="Replay scenario not found")
        return scenario
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get replay scenario endpoint error: {e}")
        raise HTTPException(
            status_code=500, detail=f"Get replay scenario failed: {str(e)}"
        )


@router.post("/replay/scenarios/{scenario_id}/run")
async def run_replay_scenario(scenario_id: str):
    """Run a replay scenario."""
    try:
        results = await replay_engine.run_scenario(scenario_id)
        return results
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Run replay scenario endpoint error: {e}")
        raise HTTPException(
            status_code=500, detail=f"Run replay scenario failed: {str(e)}"
        )


@router.get("/replay/scenarios/{scenario_id}/results")
async def get_replay_scenario_results(scenario_id: str):
    """Get results for a replay scenario."""
    try:
        results = await replay_engine.get_scenario_results(scenario_id)
        if not results:
            raise HTTPException(
                status_code=404, detail="Replay scenario results not found"
            )
        return results
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get replay scenario results endpoint error: {e}")
        raise HTTPException(
            status_code=500, detail=f"Get replay scenario results failed: {str(e)}"
        )


@router.get("/explain/{decision_id}")
async def explain_decision(decision_id: str):
    """Get decision explanation with feature attributions."""
    try:
        return await explainer.get_feature_attributions(decision_id)
    except Exception as e:
        logger.error(f"Explain endpoint error: {e}")
        raise HTTPException(status_code=500, detail=f"Explanation failed: {str(e)}")


@router.get("/explain/cohort/{cohort_id}/top-drivers")
async def get_cohort_top_drivers(
    cohort_id: str,
    start_date: str = Query(..., description="Start date (ISO 8601)"),
    end_date: str = Query(..., description="End date (ISO 8601)"),
):
    """Get top drivers for a cohort."""
    try:
        start_dt = datetime.fromisoformat(start_date)
        end_dt = datetime.fromisoformat(end_date)
        return await explainer.get_cohort_drivers(cohort_id, start_dt, end_dt)
    except Exception as e:
        logger.error(f"Cohort top drivers endpoint error: {e}")
        raise HTTPException(
            status_code=500, detail=f"Cohort top drivers failed: {str(e)}"
        )


@router.get("/explain/confusion-matrix")
async def get_confusion_matrix(
    start_date: str = Query(..., description="Start date (ISO 8601)"),
    end_date: str = Query(..., description="End date (ISO 8601)"),
    time_bucket: str = Query("day", description="Time bucket: hour, day, week"),
):
    """Get confusion matrix over time."""
    try:
        start_dt = datetime.fromisoformat(start_date)
        end_dt = datetime.fromisoformat(end_date)
        return await explainer.get_confusion_matrix(start_dt, end_dt, time_bucket)
    except Exception as e:
        logger.error(f"Confusion matrix endpoint error: {e}")
        raise HTTPException(
            status_code=500, detail=f"Confusion matrix failed: {str(e)}"
        )


@router.get("/pipeline/health")
async def get_pipeline_health():
    """Get comprehensive pipeline health status."""
    try:
        return await pipeline_monitor.get_pipeline_health()
    except Exception as e:
        logger.error(f"Pipeline health endpoint error: {e}")
        raise HTTPException(
            status_code=500, detail=f"Pipeline health check failed: {str(e)}"
        )


@router.get("/pipeline/freshness")
async def check_pipeline_freshness():
    """Check pipeline freshness."""
    try:
        return await pipeline_monitor.check_freshness()
    except Exception as e:
        logger.error(f"Pipeline freshness endpoint error: {e}")
        raise HTTPException(status_code=500, detail=f"Freshness check failed: {str(e)}")


@router.get("/pipeline/completeness")
async def check_pipeline_completeness(
    start_date: str = Query(..., description="Start date (ISO 8601)"),
    end_date: str = Query(..., description="End date (ISO 8601)"),
):
    """Check pipeline completeness."""
    try:
        start_dt = datetime.fromisoformat(start_date)
        end_dt = datetime.fromisoformat(end_date)
        return await pipeline_monitor.check_completeness(start_dt, end_dt)
    except Exception as e:
        logger.error(f"Pipeline completeness endpoint error: {e}")
        raise HTTPException(
            status_code=500, detail=f"Completeness check failed: {str(e)}"
        )


@router.get("/pipeline/slo-violations")
async def check_slo_violations():
    """Check for SLO violations."""
    try:
        violations = await pipeline_monitor.check_slo_violations()
        return {"violations": violations, "count": len(violations)}
    except Exception as e:
        logger.error(f"SLO violations endpoint error: {e}")
        raise HTTPException(
            status_code=500, detail=f"SLO violations check failed: {str(e)}"
        )


@router.get("/audit/logs")
async def get_audit_logs(
    start_date: Optional[str] = Query(None, description="Start date (ISO 8601)"),
    end_date: Optional[str] = Query(None, description="End date (ISO 8601)"),
    action_type: Optional[str] = Query(None, description="Filter by action type"),
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    limit: int = Query(100, description="Maximum number of logs"),
):
    """Get audit logs."""
    try:
        start_dt = datetime.fromisoformat(start_date) if start_date else None
        end_dt = datetime.fromisoformat(end_date) if end_date else None
        logs = await pipeline_monitor.get_audit_logs(
            start_dt, end_dt, action_type, user_id, limit
        )
        return {"logs": logs, "count": len(logs)}
    except Exception as e:
        logger.error(f"Audit logs endpoint error: {e}")
        raise HTTPException(status_code=500, detail=f"Audit logs failed: {str(e)}")


@router.post("/export")
async def export_data(request: Request):
    """
    Export analytics data in CSV, JSON, or PDF format.
    """
    try:
        body = await request.json()
        # Export implementation would go here
        # For now, return placeholder
        return {
            "message": "Export functionality coming soon",
            "format": body.get("format"),
        }
    except Exception as e:
        logger.error(f"Export endpoint error: {e}")
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")


# ============================================================================
# Anomaly Detection Endpoints
# ============================================================================

import uuid

from pydantic import BaseModel as PydanticBaseModel

from app.models.anomaly import AnomalyEvent, DetectionRun, Detector
from app.persistence.database import get_db
from app.service.anomaly.detection_job import DetectionJob


class DetectRequest(PydanticBaseModel):
    """Request model for anomaly detection."""

    detector_id: str
    window_from: datetime
    window_to: datetime


class DetectResponse(PydanticBaseModel):
    """Response model for detection run."""

    run_id: str
    status: str


@router.post("/anomalies/detect", status_code=202)
async def detect_anomalies(request: DetectRequest):
    """
    Run anomaly detection for a detector on a time window.

    Returns immediately with run_id. Detection runs asynchronously.
    """
    # Validate detector_id format
    try:
        detector_id = uuid.UUID(request.detector_id)
    except ValueError as e:
        logger.warning(f"Invalid detector_id format: {request.detector_id}")
        raise HTTPException(
            status_code=400,
            detail=f"Invalid detector_id format: {str(e)}. Expected UUID format.",
        )

    # Validate time window
    if request.window_from >= request.window_to:
        raise HTTPException(
            status_code=400, detail="window_from must be before window_to"
        )

    # Check window size (prevent excessive ranges)
    window_duration = (request.window_to - request.window_from).total_seconds()
    max_window_seconds = int(
        os.getenv("ANOMALY_DETECTION_MAX_WINDOW_SECONDS", "2592000")
    )  # 30 days default
    if window_duration > max_window_seconds:
        raise HTTPException(
            status_code=400,
            detail=f"Time window exceeds maximum allowed duration ({max_window_seconds / 86400:.0f} days)",
        )

    db = next(get_db())
    try:
        # Fetch detector
        detector = db.query(Detector).filter(Detector.id == detector_id).first()
        if not detector:
            logger.warning(f"Detector {detector_id} not found")
            raise HTTPException(
                status_code=404, detail=f"Detector {detector_id} not found"
            )

        if not detector.enabled:
            logger.warning(f"Detector {detector_id} is disabled")
            raise HTTPException(
                status_code=400,
                detail=f"Detector {detector_id} is disabled. Enable the detector before running detection.",
            )

        # Validate detector configuration
        if not detector.metrics or len(detector.metrics) == 0:
            raise HTTPException(
                status_code=400,
                detail=f"Detector {detector_id} has no metrics configured",
            )

        if not detector.cohort_by or len(detector.cohort_by) == 0:
            raise HTTPException(
                status_code=400,
                detail=f"Detector {detector_id} has no cohort_by dimensions configured",
            )

        # Run detection
        try:
            detection_job = DetectionJob()
            detection_run = detection_job.run_detection(
                detector=detector,
                window_from=request.window_from,
                window_to=request.window_to,
            )
        except ConnectionError as e:
            logger.error(
                f"Snowflake connection error during detection: {e}", exc_info=True
            )
            raise HTTPException(
                status_code=503, detail=f"Data source unavailable: {str(e)}"
            )
        except ValueError as e:
            logger.warning(f"Detection validation error: {e}")
            raise HTTPException(status_code=400, detail=str(e))

        logger.info(
            f"Detection run {detection_run.id} initiated for detector {detector_id} "
            f"on window {request.window_from} to {request.window_to}"
        )

        return DetectResponse(run_id=str(detection_run.id), status=detection_run.status)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Detection endpoint error: {e}", exc_info=True)
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Detection failed: {str(e)}")
    finally:
        db.close()


@router.get("/anomalies")
async def list_anomalies(
    severity: Optional[str] = Query(None, description="Filter by severity"),
    metric: Optional[str] = Query(None, description="Filter by metric"),
    detector_id: Optional[str] = Query(None, description="Filter by detector ID"),
    status: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
):
    """
    List anomalies with filtering and pagination.
    """
    db = next(get_db())
    try:
        query = db.query(AnomalyEvent)

        if severity:
            query = query.filter(AnomalyEvent.severity == severity)
        if metric:
            query = query.filter(AnomalyEvent.metric == metric)
        if detector_id:
            query = query.filter(AnomalyEvent.detector_id == uuid.UUID(detector_id))
        if status:
            query = query.filter(AnomalyEvent.status == status)

        total = query.count()
        anomalies = (
            query.order_by(AnomalyEvent.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )

        return {
            "anomalies": [anomaly.to_dict() for anomaly in anomalies],
            "total": total,
            "limit": limit,
            "offset": offset,
        }
    finally:
        db.close()


@router.get("/anomalies/{anomaly_id}")
async def get_anomaly(anomaly_id: str):
    """
    Get a specific anomaly by ID.
    """
    db = next(get_db())
    try:
        # Validate UUID format
        try:
            anomaly_uuid = uuid.UUID(anomaly_id)
        except ValueError:
            logger.warning(f"Invalid anomaly_id format: {anomaly_id}")
            raise HTTPException(
                status_code=400,
                detail=f"Invalid anomaly_id format: {anomaly_id}. Expected UUID format.",
            )

        anomaly = db.query(AnomalyEvent).filter(AnomalyEvent.id == anomaly_uuid).first()
        if not anomaly:
            logger.debug(f"Anomaly {anomaly_id} not found")
            raise HTTPException(
                status_code=404, detail=f"Anomaly {anomaly_id} not found"
            )

        return anomaly.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting anomaly {anomaly_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get anomaly: {str(e)}")
    finally:
        db.close()


@router.websocket("/stream/anomalies")
async def stream_anomalies(websocket: WebSocket):
    """
    WebSocket endpoint for real-time anomaly event streaming.

    Supports query parameters for filtering:
    - severity: Filter by severity (info, warn, critical)
    - metric: Filter by metric name
    - detector_id: Filter by detector ID
    - status: Filter by status (new, triaged, closed)

    Example:
    ws://localhost:8090/v1/analytics/stream/anomalies?severity=critical
    """
    await websocket.accept()

    # Structured logging for WebSocket connection
    query_params = dict(websocket.query_params)
    logger.info(
        "WebSocket connection established for anomaly streaming",
        extra={
            "event_type": "websocket_connection",
            "endpoint": "/v1/analytics/stream/anomalies",
            "client_host": websocket.client.host if websocket.client else "unknown",
            "query_params": query_params,
        },
    )

    try:
        # Parse query parameters from WebSocket URL
        severity_filter = query_params.get("severity")
        metric_filter = query_params.get("metric")
        detector_id_filter = query_params.get("detector_id")
        status_filter = query_params.get("status")

        # Convert detector_id to UUID if provided
        detector_uuid = None
        if detector_id_filter:
            try:
                detector_uuid = uuid.UUID(detector_id_filter)
            except ValueError:
                await websocket.send_json(
                    {"error": "Invalid detector_id format", "type": "error"}
                )
                await websocket.close()
                return

        # Poll for new anomalies and send them
        last_anomaly_time = None

        while True:
            try:
                db = next(get_db())
                try:
                    query = db.query(AnomalyEvent)

                    # Apply filters
                    if severity_filter:
                        query = query.filter(AnomalyEvent.severity == severity_filter)
                    if metric_filter:
                        query = query.filter(AnomalyEvent.metric == metric_filter)
                    if detector_uuid:
                        query = query.filter(AnomalyEvent.detector_id == detector_uuid)
                    if status_filter:
                        query = query.filter(AnomalyEvent.status == status_filter)

                    # Only get anomalies created after the last one we sent
                    if last_anomaly_time:
                        query = query.filter(
                            AnomalyEvent.created_at > last_anomaly_time
                        )

                    # Get new anomalies, ordered by creation time
                    new_anomalies = (
                        query.order_by(AnomalyEvent.created_at.asc()).limit(100).all()
                    )

                    # Send each new anomaly
                    for anomaly in new_anomalies:
                        send_start = time.time()
                        await websocket.send_json(
                            {"type": "anomaly", "data": anomaly.to_dict()}
                        )
                        send_duration_ms = (time.time() - send_start) * 1000
                        last_anomaly_time = anomaly.created_at

                        # Structured logging for WebSocket message
                        logger.debug(
                            f"Sent anomaly {anomaly.id} via WebSocket",
                            extra={
                                "event_type": "websocket_message_sent",
                                "anomaly_id": str(anomaly.id),
                                "message_type": "anomaly",
                                "send_duration_ms": send_duration_ms,
                                "severity": anomaly.severity,
                                "metric": anomaly.metric,
                            },
                        )

                finally:
                    db.close()

                # Wait before next poll (throttle to avoid excessive DB queries)
                await asyncio.sleep(2)  # Poll every 2 seconds

            except WebSocketDisconnect:
                logger.info(
                    "WebSocket client disconnected",
                    extra={
                        "event_type": "websocket_disconnect",
                        "endpoint": "/v1/analytics/stream/anomalies",
                        "disconnect_type": "client_disconnect",
                    },
                )
                break
            except Exception as e:
                logger.error(
                    f"Error in WebSocket anomaly stream: {e}",
                    extra={
                        "event_type": "websocket_error",
                        "endpoint": "/v1/analytics/stream/anomalies",
                        "error_type": type(e).__name__,
                        "error_message": str(e),
                    },
                    exc_info=True,
                )
                await websocket.send_json({"type": "error", "error": str(e)})
                # Continue polling despite errors
                await asyncio.sleep(5)  # Wait longer on error

    except WebSocketDisconnect:
        logger.info(
            "WebSocket connection closed by client",
            extra={
                "event_type": "websocket_disconnect",
                "endpoint": "/v1/analytics/stream/anomalies",
                "disconnect_type": "client_disconnect",
            },
        )
    except Exception as e:
        logger.error(
            f"WebSocket stream error: {e}",
            extra={
                "event_type": "websocket_error",
                "endpoint": "/v1/analytics/stream/anomalies",
                "error_type": type(e).__name__,
                "error_message": str(e),
            },
            exc_info=True,
        )
        try:
            await websocket.close()
        except:
            pass


# ============================================================================
# Detector Management Endpoints
# ============================================================================


class DetectorCreateRequest(PydanticBaseModel):
    """Request model for creating a detector."""

    name: str
    type: str
    cohort_by: List[str]
    metrics: List[str]
    params: Dict[str, Any]
    enabled: bool = True


class DetectorUpdateRequest(PydanticBaseModel):
    """Request model for updating a detector."""

    name: Optional[str] = None
    cohort_by: Optional[List[str]] = None
    metrics: Optional[List[str]] = None
    params: Optional[Dict[str, Any]] = None
    enabled: Optional[bool] = None


@router.get("/detectors")
async def list_detectors(
    type: Optional[str] = Query(None, description="Filter by detector type"),
    enabled: Optional[bool] = Query(None, description="Filter by enabled status"),
):
    """
    List all detectors with optional filtering.
    """
    db = next(get_db())
    try:
        query = db.query(Detector)

        if type:
            query = query.filter(Detector.type == type)
        if enabled is not None:
            query = query.filter(Detector.enabled == enabled)

        detectors = query.order_by(Detector.created_at.desc()).all()
        return [detector.to_dict() for detector in detectors]
    except Exception as e:
        logger.error(f"Error listing detectors: {e}", exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Failed to list detectors: {str(e)}"
        )
    finally:
        db.close()


@router.post("/detectors", status_code=201)
async def create_detector(request: DetectorCreateRequest):
    """
    Create a new detector.
    """
    db = next(get_db())
    try:
        # Validate detector type
        valid_types = ["stl_mad", "cusum", "isoforest", "rcf", "matrix_profile"]
        if request.type not in valid_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid detector type. Must be one of: {', '.join(valid_types)}",
            )

        # Validate cohort_by and metrics are not empty
        if not request.cohort_by or len(request.cohort_by) == 0:
            raise HTTPException(status_code=400, detail="cohort_by must not be empty")
        if not request.metrics or len(request.metrics) == 0:
            raise HTTPException(status_code=400, detail="metrics must not be empty")

        detector = Detector(
            name=request.name,
            type=request.type,
            cohort_by=request.cohort_by,
            metrics=request.metrics,
            params=request.params,
            enabled=request.enabled,
        )

        db.add(detector)
        db.commit()
        db.refresh(detector)

        logger.info(f"Created detector {detector.id} ({detector.name})")
        return detector.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating detector: {e}", exc_info=True)
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Failed to create detector: {str(e)}"
        )
    finally:
        db.close()


@router.post("/investigations/{investigation_id}/create-detector", status_code=201)
async def create_detector_from_investigation(
    investigation_id: str, current_user: User = Depends(require_write_or_dev)
):
    """
    Create detector(s) from investigation findings.

    Analyzes investigation data to suggest detector configurations and creates them.
    """
    db = next(get_db())
    try:
        # Get investigation state
        from app.models.investigation_state import InvestigationState

        investigation_state = (
            db.query(InvestigationState)
            .filter(InvestigationState.investigation_id == investigation_id)
            .first()
        )

        if not investigation_state:
            raise HTTPException(
                status_code=404, detail=f"Investigation {investigation_id} not found"
            )

        settings = investigation_state.settings or {}
        progress = investigation_state.get_progress_data()

        # Extract metrics and cohorts from investigation
        # Check if investigation was created from an anomaly
        metadata = settings.get("metadata", {})
        anomaly_metric = metadata.get("metric")
        anomaly_cohort = metadata.get("cohort", {})

        # Determine metrics to monitor
        metrics = []
        if anomaly_metric:
            metrics.append(anomaly_metric)
        else:
            # Default metrics based on common fraud indicators
            metrics = ["tx_count", "decline_rate"]

        # Determine cohort dimensions and extract actual values
        cohorts = []
        cohort_values = {}  # Store actual values for form auto-population

        if anomaly_cohort:
            # Map cohort keys to detector cohort_by values and extract values
            cohort_mapping = {
                "geo": "geo",
                "merchant_id": "merchant_id",
                "channel": "channel",
                "store_id": "merchant_id",  # Map store_id to merchant_id
                "device_type": "channel",  # Map device_type to channel
                "ip_country_code": "geo",  # Map ip_country_code to geo
            }
            for key, value in anomaly_cohort.items():
                mapped = cohort_mapping.get(key)
                if mapped and mapped not in cohorts:
                    cohorts.append(mapped)
                    # Store the actual value for this dimension
                    if value:
                        cohort_values[mapped] = str(value)

        # If no cohorts from anomaly, try to infer from entity type
        if not cohorts:
            entities = settings.get("entities", [])
            if entities:
                entity_type = entities[0].get("entity_type", "")
                entity_value = entities[0].get("entity_value") or entities[0].get(
                    "entityValue"
                )

                if entity_type in ["ip"]:
                    cohorts = ["geo"]
                    # Try to extract geo from IP if possible
                    if entity_value:
                        # Could try to extract country code, but for now leave empty
                        pass
                elif entity_type in ["device_id"]:
                    cohorts = ["channel", "geo"]
                else:
                    cohorts = ["geo", "merchant_id"]
                    # If entity_value looks like a merchant_id, use it
                    if entity_value and entity_type == "merchant_id":
                        cohort_values["merchant_id"] = str(entity_value)

        # Default to geo if still no cohorts
        if not cohorts:
            cohorts = ["geo"]

        # Get investigation name for detector name
        investigation_name = settings.get("name", investigation_id[:8])

        # Extract time range from investigation settings
        time_range = settings.get("time_range") or settings.get("timeRange")
        investigation_window_from = None
        investigation_window_to = None

        if time_range:
            # Handle both formats: start_time/end_time and start_date/end_date
            if isinstance(time_range, dict):
                start_time = (
                    time_range.get("start_time")
                    or time_range.get("start_date")
                    or time_range.get("startTime")
                    or time_range.get("startDate")
                )
                end_time = (
                    time_range.get("end_time")
                    or time_range.get("end_date")
                    or time_range.get("endTime")
                    or time_range.get("endDate")
                )

                if start_time:
                    # Parse ISO format string to datetime
                    if isinstance(start_time, str):
                        from datetime import datetime

                        try:
                            investigation_window_from = datetime.fromisoformat(
                                start_time.replace("Z", "+00:00")
                            )
                        except (ValueError, AttributeError):
                            logger.warning(f"Could not parse start_time: {start_time}")
                    else:
                        investigation_window_from = start_time

                if end_time:
                    if isinstance(end_time, str):
                        from datetime import datetime

                        try:
                            investigation_window_to = datetime.fromisoformat(
                                end_time.replace("Z", "+00:00")
                            )
                        except (ValueError, AttributeError):
                            logger.warning(f"Could not parse end_time: {end_time}")
                    else:
                        investigation_window_to = end_time

        # Create detector with investigation context
        detector_params = {
            "k": 3.5,
            "persistence": 2,
            "min_support": 50,
            "severity_thresholds": {
                "info_max": 3.0,
                "warn_max": 4.5,
                "critical_min": 4.5,
            },
            # Store investigation_id in params for tracking
            "derived_from_investigation_id": investigation_id,
            # Store cohort values for form auto-population
            "cohort_values": cohort_values,
            # Store investigation time window for preview
            "investigation_window_from": (
                investigation_window_from.isoformat()
                if investigation_window_from
                else None
            ),
            "investigation_window_to": (
                investigation_window_to.isoformat() if investigation_window_to else None
            ),
        }

        detector = Detector(
            name=f"Detector: {investigation_name}",
            type="stl_mad",  # Default detector type
            cohort_by=cohorts,
            metrics=metrics,
            params=detector_params,
            enabled=True,
        )

        db.add(detector)
        db.commit()
        db.refresh(detector)

        logger.info(
            f"Created detector {detector.id} from investigation {investigation_id} "
            f"(metrics={metrics}, cohorts={cohorts}, cohort_values={cohort_values})"
        )

        return {
            "detector": detector.to_dict(),
            "investigation_id": investigation_id,
            "cohort_values": cohort_values,  # Include for frontend auto-population
            "message": f"Detector created successfully from investigation {investigation_id[:8]}",
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating detector from investigation: {e}", exc_info=True)
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create detector from investigation: {str(e)}",
        )
    finally:
        db.close()


@router.get("/detectors/{detector_id}")
async def get_detector(detector_id: str):
    """
    Get a specific detector by ID.
    """
    db = next(get_db())
    try:
        try:
            detector_uuid = uuid.UUID(detector_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid detector_id format")

        detector = db.query(Detector).filter(Detector.id == detector_uuid).first()
        if not detector:
            raise HTTPException(
                status_code=404, detail=f"Detector {detector_id} not found"
            )
        return detector.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting detector: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get detector: {str(e)}")
    finally:
        db.close()


@router.put("/detectors/{detector_id}")
async def update_detector(detector_id: str, request: DetectorUpdateRequest):
    """
    Update a detector.
    """
    db = next(get_db())
    try:
        try:
            detector_uuid = uuid.UUID(detector_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid detector_id format")

        detector = db.query(Detector).filter(Detector.id == detector_uuid).first()
        if not detector:
            raise HTTPException(
                status_code=404, detail=f"Detector {detector_id} not found"
            )

        # Update fields if provided
        if request.name is not None:
            detector.name = request.name
        if request.cohort_by is not None:
            if len(request.cohort_by) == 0:
                raise HTTPException(
                    status_code=400, detail="cohort_by must not be empty"
                )
            detector.cohort_by = request.cohort_by
        if request.metrics is not None:
            if len(request.metrics) == 0:
                raise HTTPException(status_code=400, detail="metrics must not be empty")
            detector.metrics = request.metrics
        if request.params is not None:
            detector.params = request.params
        if request.enabled is not None:
            detector.enabled = request.enabled

        db.commit()
        db.refresh(detector)

        logger.info(f"Updated detector {detector_id}")
        return detector.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating detector: {e}", exc_info=True)
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Failed to update detector: {str(e)}"
        )
    finally:
        db.close()


@router.delete("/detectors/{detector_id}", status_code=204)
async def delete_detector(detector_id: str):
    """
    Delete a detector.
    """
    db = next(get_db())
    try:
        try:
            detector_uuid = uuid.UUID(detector_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid detector_id format")

        detector = db.query(Detector).filter(Detector.id == detector_uuid).first()
        if not detector:
            raise HTTPException(
                status_code=404, detail=f"Detector {detector_id} not found"
            )

        db.delete(detector)
        db.commit()

        logger.info(f"Deleted detector {detector_id}")
        return None
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting detector: {e}", exc_info=True)
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Failed to delete detector: {str(e)}"
        )
    finally:
        db.close()


class BulkDeleteRequest(PydanticBaseModel):
    """Request model for bulk delete."""

    detector_ids: List[str]


@router.post("/detectors/bulk-delete", status_code=200)
async def bulk_delete_detectors(request: BulkDeleteRequest):
    """
    Delete multiple detectors.
    """
    db = next(get_db())
    try:
        if not request.detector_ids or len(request.detector_ids) == 0:
            raise HTTPException(
                status_code=400, detail="detector_ids list cannot be empty"
            )

        deleted_count = 0
        not_found_ids = []

        for detector_id in request.detector_ids:
            try:
                detector_uuid = uuid.UUID(detector_id)
            except ValueError:
                logger.warning(f"Invalid detector_id format: {detector_id}")
                not_found_ids.append(detector_id)
                continue

            detector = db.query(Detector).filter(Detector.id == detector_uuid).first()
            if detector:
                db.delete(detector)
                deleted_count += 1
            else:
                not_found_ids.append(detector_id)

        db.commit()

        logger.info(
            f"Bulk deleted {deleted_count} detectors. Not found: {len(not_found_ids)}"
        )

        return {
            "deleted_count": deleted_count,
            "not_found_ids": not_found_ids,
            "message": f"Successfully deleted {deleted_count} detector(s)",
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error bulk deleting detectors: {e}", exc_info=True)
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Failed to bulk delete detectors: {str(e)}"
        )
    finally:
        db.close()


class PreviewRequest(PydanticBaseModel):
    """Request model for detector preview."""

    window_from: datetime
    window_to: datetime


@router.post("/detectors/{detector_id}/preview")
async def preview_detector(detector_id: str, request: PreviewRequest):
    """
    Preview detector on historical data without persisting results.

    Returns preview scores and anomalies for the specified time window.
    """
    db = next(get_db())
    try:
        try:
            detector_uuid = uuid.UUID(detector_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid detector_id format")

        detector = db.query(Detector).filter(Detector.id == detector_uuid).first()
        if not detector:
            raise HTTPException(
                status_code=404, detail=f"Detector {detector_id} not found"
            )

        # Run detection but don't persist anomalies (preview mode)
        detection_job = DetectionJob()
        detection_run = detection_job.run_detection(
            detector=detector,
            window_from=request.window_from,
            window_to=request.window_to,
        )

        # Extract run_id - detection_run is expunged from its session
        # Access ID directly from object's __dict__ to avoid SQLAlchemy lazy loading
        # The ID is set during object creation, so it should be in __dict__
        try:
            # Try accessing via __dict__ first (avoids SQLAlchemy attribute access)
            if hasattr(detection_run, "__dict__") and "id" in detection_run.__dict__:
                run_id = detection_run.__dict__["id"]
            else:
                # Fallback to attribute access (might trigger lazy loading but should work if expunged properly)
                run_id = detection_run.id
        except Exception:
            # Final fallback: query for the run_id using the detector and window
            detection_run_found = (
                db.query(DetectionRun)
                .filter(
                    DetectionRun.detector_id == detector.id,
                    DetectionRun.window_from == request.window_from,
                    DetectionRun.window_to == request.window_to,
                )
                .order_by(DetectionRun.started_at.desc())
                .first()
            )
            if detection_run_found:
                run_id = detection_run_found.id
            else:
                raise HTTPException(
                    status_code=500, detail="Failed to retrieve detection run ID"
                )

        # Fetch preview anomalies (from the run we just created)
        preview_anomalies = (
            db.query(AnomalyEvent).filter(AnomalyEvent.run_id == run_id).all()
        )

        # Convert to dict format before cleanup
        anomalies_data = [anomaly.to_dict() for anomaly in preview_anomalies]

        # Delete the preview run and its anomalies (cleanup)
        # Query for detection_run in current session for deletion
        detection_run_to_delete = (
            db.query(DetectionRun).filter(DetectionRun.id == run_id).first()
        )

        if detection_run_to_delete:
            db.query(AnomalyEvent).filter(AnomalyEvent.run_id == run_id).delete()
            db.delete(detection_run_to_delete)
            db.commit()

        return {"detector_id": detector_id, "anomalies": anomalies_data}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error previewing detector: {e}", exc_info=True)
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Failed to preview detector: {str(e)}"
        )
    finally:
        db.close()


class SeriesRequest(PydanticBaseModel):
    """Request model for fetching time series data."""

    cohort: Dict[str, str]
    metric: str
    window_from: datetime
    window_to: datetime
    granularity: Optional[str] = "15m"


@router.get("/series")
async def get_series(
    cohort: str = Query(..., description="Cohort dimensions as JSON string"),
    metric: str = Query(..., description="Metric name"),
    window_from: datetime = Query(..., description="Start of time window"),
    window_to: datetime = Query(..., description="End of time window"),
    granularity: Optional[str] = Query("15m", description="Time granularity"),
):
    """
    Fetch time series data for a specific cohort and metric (GET version).

    Returns aggregated time series data from Snowflake.
    """
    try:
        import json

        cohort_dict = json.loads(cohort)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid cohort JSON format")

    try:
        from app.service.anomaly.data.windows import fetch_windows_snowflake

        df = await fetch_windows_snowflake(
            window_from=window_from,
            window_to=window_to,
            cohort_by=list(cohort_dict.keys()),
            metrics=[metric],
            cohort_filters=cohort_dict,
        )

        if df.empty:
            return {"series": [], "cohort": cohort_dict, "metric": metric}

        # Convert DataFrame to series format
        series = []
        for idx, row in df.iterrows():
            timestamp = row["window_start"] if "window_start" in df.columns else idx
            value = row[metric]
            series.append(
                {
                    "timestamp": (
                        timestamp.isoformat()
                        if hasattr(timestamp, "isoformat")
                        else str(timestamp)
                    ),
                    "value": float(value),
                }
            )

        return {"series": series, "cohort": cohort_dict, "metric": metric}
    except ConnectionError as e:
        logger.error(f"Snowflake connection error: {e}", exc_info=True)
        raise HTTPException(
            status_code=503, detail=f"Data source unavailable: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Error fetching series: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch series: {str(e)}")


@router.post("/series")
async def get_series_post(request: SeriesRequest):
    """
    Fetch time series data for a specific cohort and metric.

    Returns aggregated time series data from Snowflake.
    """
    try:
        from app.service.anomaly.data.windows import fetch_windows_snowflake

        df = await fetch_windows_snowflake(
            window_from=request.window_from,
            window_to=request.window_to,
            cohort_by=list(request.cohort.keys()),
            metrics=[request.metric],
            cohort_filters=request.cohort,
        )

        if df.empty:
            return {"series": [], "cohort": request.cohort, "metric": request.metric}

        # Convert DataFrame to series format
        series = []
        for idx, row in df.iterrows():
            timestamp = row["window_start"] if "window_start" in df.columns else idx
            value = row[request.metric]
            series.append(
                {
                    "timestamp": (
                        timestamp.isoformat()
                        if hasattr(timestamp, "isoformat")
                        else str(timestamp)
                    ),
                    "value": float(value),
                }
            )

        return {"series": series, "cohort": request.cohort, "metric": request.metric}
    except ConnectionError as e:
        logger.error(f"Snowflake connection error: {e}", exc_info=True)
        raise HTTPException(
            status_code=503, detail=f"Data source unavailable: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Error fetching series: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch series: {str(e)}")


# ============================================================================
# Sample Data Endpoints
# ============================================================================


@router.get("/cohorts/sample")
async def get_sample_cohort_values(
    dimension: str = Query(
        ..., description="Cohort dimension name (e.g., merchant_id, channel, geo)"
    ),
    limit: int = Query(
        10, description="Number of sample values to return", ge=1, le=100
    ),
):
    """
    Get sample values for a cohort dimension from the data.

    Useful for discovering what values are available when creating detectors.
    Returns empty array if data source is unavailable (graceful degradation).
    """
    try:
        import os
        from datetime import datetime, timedelta

        from app.service.agent.tools.database_tool import get_database_provider

        # Analytics queries ALWAYS use PostgreSQL because transaction_windows is an Olorin-managed table in PostgreSQL
        # DATABASE_PROVIDER is only for the raw transactions table, not for analytics
        database_provider = "postgresql"

        # Map dimension names to PostgreSQL transaction_windows view column names
        dimension_column_map = {
            "merchant_id": "store_id",  # transaction_windows uses store_id
            "channel": "device_type",  # transaction_windows uses device_type
            "geo": "ip_country_code",  # transaction_windows uses ip_country_code
        }

        # Get the actual column name
        actual_column = dimension_column_map.get(dimension.lower())
        if not actual_column:
            logger.warning(f"Unknown dimension: {dimension}")
            return {"dimension": dimension, "values": [], "count": 0}

        # Always use PostgreSQL for analytics
        provider = get_database_provider("postgresql")
        table_name = "transaction_windows"  # Olorin-managed view in PostgreSQL
        time_column = "window_start"
        try:
            provider.connect()
        except Exception as e:
            logger.warning(f"PostgreSQL unavailable for sample values: {e}")
            return {"dimension": dimension, "values": [], "count": 0}

        try:
            # Query for distinct values of the dimension from recent data
            # Use last 30 days to get current/relevant values
            window_to = datetime.now()
            window_from = window_to - timedelta(days=30)

            # PostgreSQL query with named parameters (:param_name)
            # The postgres_client will convert these to positional parameters ($1, $2, $3)
            query = f"""
                SELECT DISTINCT {actual_column} as value
                FROM {table_name}
                WHERE {time_column} >= :window_from
                  AND {time_column} <= :window_to
                  AND {actual_column} IS NOT NULL
                  AND {actual_column} != ''
                ORDER BY {actual_column}
                LIMIT :limit
            """
            # Convert datetime to timezone-naive for PostgreSQL TIMESTAMP WITHOUT TIME ZONE
            from datetime import timezone

            if window_from.tzinfo is not None:
                window_from_naive = window_from.astimezone(timezone.utc).replace(
                    tzinfo=None
                )
            else:
                window_from_naive = window_from

            if window_to.tzinfo is not None:
                window_to_naive = window_to.astimezone(timezone.utc).replace(
                    tzinfo=None
                )
            else:
                window_to_naive = window_to

            params = {
                "window_from": window_from_naive,
                "window_to": window_to_naive,
                "limit": limit,
            }

            # Execute query - PostgreSQL provider uses async
            results = await provider.execute_query(query, params)

            values = [str(row["value"]) for row in results if row.get("value")]

            logger.info(
                f"Found {len(values)} sample values for dimension '{dimension}' (column: {actual_column})"
            )

            return {"dimension": dimension, "values": values, "count": len(values)}

        except Exception as e:
            # Gracefully return empty array on query errors
            logger.warning(
                f"Failed to query sample cohort values for {dimension}: {e}",
                exc_info=True,
            )
            return {"dimension": dimension, "values": [], "count": 0}
        finally:
            try:
                # PostgreSQL provider uses async disconnect
                await provider.disconnect()
            except Exception as e:
                logger.debug(f"Error disconnecting from database: {e}")

    except Exception as e:
        # Catch-all: return empty array instead of failing
        logger.warning(
            f"Unexpected error fetching sample cohort values: {e}", exc_info=True
        )
        return {"dimension": dimension, "values": [], "count": 0}


# ============================================================================
# Replay Detection Endpoints
# ============================================================================


class ReplayRequest(PydanticBaseModel):
    """Request model for replay detection."""

    detector_config: Dict[
        str, Any
    ]  # Detector configuration (without id, created_at, updated_at)
    window_from: datetime
    window_to: datetime
    production_detector_id: Optional[str] = (
        None  # Optional: compare against specific production detector
    )


class ReplayResponse(PydanticBaseModel):
    """Response model for replay detection."""

    run_id: str
    comparison: Dict[str, Any]


@router.post("/replay", status_code=202)
async def replay_detection(request: ReplayRequest):
    """
    Run replay detection on historical data and compare against production.

    Returns comparison results showing new-only, missing, and overlapping anomalies.
    """
    try:
        from app.service.anomaly.replay_comparison import ReplayComparisonService

        # Validate time window
        if request.window_from >= request.window_to:
            raise HTTPException(
                status_code=400, detail="window_from must be before window_to"
            )

        # Check window size
        window_duration = (request.window_to - request.window_from).total_seconds()
        max_window_seconds = int(
            os.getenv("ANOMALY_DETECTION_MAX_WINDOW_SECONDS", "2592000")
        )  # 30 days default
        if window_duration > max_window_seconds:
            raise HTTPException(
                status_code=400,
                detail=f"Time window exceeds maximum allowed duration ({max_window_seconds / 86400:.0f} days)",
            )

        # Validate detector_config
        detector_config_dict = request.detector_config
        if not detector_config_dict:
            raise HTTPException(status_code=400, detail="detector_config is required")

        # Validate detector type
        valid_types = ["stl_mad", "cusum", "isoforest", "rcf", "matrix_profile"]
        detector_type = detector_config_dict.get("type")
        if not detector_type or detector_type not in valid_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid detector type. Must be one of: {', '.join(valid_types)}",
            )

        # Validate cohort_by and metrics
        cohort_by = detector_config_dict.get("cohort_by", [])
        metrics = detector_config_dict.get("metrics", [])
        if not cohort_by or len(cohort_by) == 0:
            raise HTTPException(status_code=400, detail="cohort_by must not be empty")
        if not metrics or len(metrics) == 0:
            raise HTTPException(status_code=400, detail="metrics must not be empty")

        # Convert detector_config dict to Detector object
        detector_config = Detector(
            name=detector_config_dict.get("name", "Replay Detector"),
            type=detector_type,
            cohort_by=cohort_by,
            metrics=metrics,
            params=detector_config_dict.get("params", {}),
            enabled=True,
        )

        # Get production detector ID (use first enabled detector of same type if not specified)
        production_detector_id = None
        if request.production_detector_id:
            try:
                production_detector_id = uuid.UUID(request.production_detector_id)
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid production_detector_id format: {request.production_detector_id}. Expected UUID format.",
                )
        else:
            # Find production detector of same type
            db = next(get_db())
            try:
                production_detector = (
                    db.query(Detector)
                    .filter(
                        Detector.type == detector_config.type, Detector.enabled == True
                    )
                    .first()
                )
                if production_detector:
                    production_detector_id = production_detector.id
                else:
                    raise HTTPException(
                        status_code=404,
                        detail=f"No enabled production detector found for type {detector_config.type}",
                    )
            finally:
                db.close()

        # Run comparison
        try:
            comparison_service = ReplayComparisonService()
            result = comparison_service.compare_replay(
                detector_config=detector_config,
                window_from=request.window_from,
                window_to=request.window_to,
                production_detector_id=production_detector_id,
            )
        except ConnectionError as e:
            logger.error(
                f"Snowflake connection error during replay: {e}", exc_info=True
            )
            raise HTTPException(
                status_code=503, detail=f"Data source unavailable: {str(e)}"
            )
        except ValueError as e:
            logger.warning(f"Replay validation error: {e}")
            raise HTTPException(status_code=400, detail=str(e))

        return ReplayResponse(run_id=result["run_id"], comparison=result["comparison"])
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in replay detection: {e}", exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Replay detection failed: {str(e)}"
        )


@router.post("/detectors/{detector_id}/promote", status_code=200)
async def promote_detector(detector_id: str):
    """
    Promote a detector configuration from replay/testing to production.

    This updates the detector's enabled status and marks it as production-ready.
    """
    db = next(get_db())
    try:
        try:
            detector_uuid = uuid.UUID(detector_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid detector_id format")

        detector = db.query(Detector).filter(Detector.id == detector_uuid).first()
        if not detector:
            raise HTTPException(
                status_code=404, detail=f"Detector {detector_id} not found"
            )

        # Enable detector (promote to production)
        detector.enabled = True
        db.commit()
        db.refresh(detector)

        logger.info(f"Promoted detector {detector_id} to production")
        return detector.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error promoting detector: {e}", exc_info=True)
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Failed to promote detector: {str(e)}"
        )
    finally:
        db.close()


# ============================================================================
# Investigation Endpoints
# ============================================================================


class InvestigateResponse(PydanticBaseModel):
    """Response model for investigation creation."""

    investigation_id: str
    anomaly_id: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None


@router.post("/anomalies/{anomaly_id}/investigate", status_code=201)
async def investigate_anomaly(
    anomaly_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_write_or_dev),
):
    """
    Create an investigation from an anomaly.

    Creates a fraud investigation with anomaly context (cohort, metric, window, evidence)
    pre-populated. Uses the primary entity from the anomaly's cohort.
    """
    db = next(get_db())
    try:
        try:
            anomaly_uuid = uuid.UUID(anomaly_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid anomaly_id format")

        anomaly = db.query(AnomalyEvent).filter(AnomalyEvent.id == anomaly_uuid).first()
        if not anomaly:
            raise HTTPException(
                status_code=404, detail=f"Anomaly {anomaly_id} not found"
            )

        # Extract entity from cohort - map to valid entity types
        cohort = anomaly.cohort

        # Mapping from cohort dimensions to valid EntityType values
        # Valid entity types: user_id, email, ip, device_id, session_id
        entity_type_mapping = {
            "user_id": "user_id",
            "email": "email",
            "ip": "ip",
            "device_id": "device_id",
            "session_id": "session_id",
        }

        entity_type = None
        entity_id = None

        # Try to find a valid entity type in the cohort
        for cohort_key, cohort_value in cohort.items():
            if cohort_key in entity_type_mapping and cohort_value:
                entity_type = entity_type_mapping[cohort_key]
                entity_id = cohort_value
                break

        # Build investigation metadata with anomaly context
        from datetime import datetime, timezone

        from app.schemas.investigation_state import (
            CorrelationMode,
            Entity,
            InvestigationMode,
            InvestigationSettings,
            InvestigationStateCreate,
            InvestigationType,
            TimeRange,
        )

        investigation_metadata = {
            "anomaly_id": str(anomaly.id),
            "detector_id": str(anomaly.detector_id),
            "cohort": cohort,
            "metric": anomaly.metric,
            "score": float(anomaly.score),
            "severity": anomaly.severity,
            "window_start": anomaly.window_start.isoformat(),
            "window_end": anomaly.window_end.isoformat(),
            "evidence": anomaly.evidence,
        }

        # Create investigation state
        from app.service.investigation_state_service import InvestigationStateService

        investigation_service = InvestigationStateService(db)

        # Build investigation name
        cohort_str = ", ".join(f"{k}:{v}" for k, v in cohort.items())
        investigation_name = f"Anomaly Investigation: {anomaly.metric}"
        if entity_id:
            investigation_name += f" - {entity_id}"
        else:
            investigation_name += f" - {cohort_str}"

        # Build investigation settings
        # Always use HYBRID type for anomaly-based investigations
        # If we have a valid entity, use ENTITY mode, otherwise use RISK mode
        # Note: HYBRID investigations use OR correlation mode (not SINGLE_ENTITY)
        if entity_type and entity_id:
            investigation_settings = InvestigationSettings(
                name=investigation_name,
                entities=[Entity(entity_type=entity_type, entity_value=entity_id)],
                time_range=TimeRange(
                    start_time=anomaly.window_start.isoformat(),
                    end_time=anomaly.window_end.isoformat(),
                ),
                investigation_type=InvestigationType.HYBRID,  # Always HYBRID for anomaly investigations
                investigation_mode=InvestigationMode.ENTITY,
                correlation_mode=CorrelationMode.OR,  # HYBRID investigations use OR, not SINGLE_ENTITY
            )
        else:
            # No valid entity type found - create risk-based investigation
            # Use HYBRID type to allow empty tools (entityless workflow will handle tools)
            investigation_settings = InvestigationSettings(
                name=investigation_name,
                entities=[],  # Empty entities for risk-based mode
                time_range=TimeRange(
                    start_time=anomaly.window_start.isoformat(),
                    end_time=anomaly.window_end.isoformat(),
                ),
                investigation_type=InvestigationType.HYBRID,  # Always HYBRID for anomaly investigations
                investigation_mode=InvestigationMode.RISK,
                correlation_mode=CorrelationMode.OR,
                auto_select_entities=True,  # Let the system auto-select entities
            )

        # Build investigation state create request
        # Set status to IN_PROGRESS immediately for anomaly-based investigations
        from app.schemas.investigation_state import InvestigationStatus, LifecycleStage

        investigation_data = InvestigationStateCreate(
            settings=investigation_settings,
            lifecycle_stage=LifecycleStage.IN_PROGRESS,
            status=InvestigationStatus.IN_PROGRESS,
        )

        # Create investigation (this will trigger background execution)
        # background_tasks is injected by FastAPI as a dependency parameter

        # Store anomaly context in investigation metadata for entityless investigations
        is_entityless = not (entity_type and entity_id)
        if is_entityless:
            # Add anomaly context to investigation settings for entityless workflow
            # Store in investigation name or create a custom metadata field
            investigation_metadata["is_entityless"] = True
            investigation_metadata["entityless_workflow"] = True

        investigation_state = await investigation_service.create_state(
            user_id=current_user.username,  # Use the authenticated user who created the investigation
            data=investigation_data,
            background_tasks=background_tasks,
        )

        # Update anomaly with investigation_id
        anomaly.investigation_id = uuid.UUID(investigation_state.investigation_id)
        db.commit()
        db.refresh(anomaly)

        # For entityless/risk-based investigations, ensure status is IN_PROGRESS and progress_json is initialized
        if is_entityless:
            from app.models.investigation_state import (
                InvestigationState as InvestigationStateModel,
            )
            from app.service.investigation_trigger_service import (
                InvestigationTriggerService,
            )

            # Refresh the state from database to get the latest version
            db_state = (
                db.query(InvestigationStateModel)
                .filter(
                    InvestigationStateModel.investigation_id
                    == investigation_state.investigation_id
                )
                .first()
            )

            if db_state:
                # Update status to IN_PROGRESS and initialize progress_json immediately
                trigger_service = InvestigationTriggerService(db)
                trigger_service.update_state_to_in_progress(
                    investigation_id=investigation_state.investigation_id,
                    state=db_state,
                    user_id=current_user.username,
                )
                logger.info(
                    f"✅ Set entityless investigation {investigation_state.investigation_id} "
                    f"to IN_PROGRESS immediately after creation"
                )

        # Queue entityless investigation executor if no valid entity
        if is_entityless:
            from app.router.controllers.entityless_investigation_executor import (
                execute_entityless_investigation,
            )

            # Queue entityless investigation execution
            background_tasks.add_task(
                execute_entityless_investigation,
                investigation_state.investigation_id,
                anomaly_id,
                {
                    "anomaly_id": anomaly_id,
                    "cohort": cohort,
                    "metric": anomaly.metric,
                    "window_start": anomaly.window_start.isoformat(),
                    "window_end": anomaly.window_end.isoformat(),
                },
            )

            logger.info(
                f"Created entityless investigation {investigation_state.investigation_id} "
                f"from anomaly {anomaly_id} - queued for entityless workflow execution"
            )
        elif entity_type and entity_id:
            logger.info(
                f"Created investigation {investigation_state.investigation_id} "
                f"from anomaly {anomaly_id} for entity {entity_type}={entity_id}"
            )
        else:
            logger.info(
                f"Created investigation {investigation_state.investigation_id} "
                f"from anomaly {anomaly_id} in RISK mode (no valid entity type in cohort: {cohort})"
            )

        return InvestigateResponse(
            investigation_id=investigation_state.investigation_id,
            anomaly_id=anomaly_id,
            entity_type=entity_type,
            entity_id=entity_id,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating investigation from anomaly: {e}", exc_info=True)
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Failed to create investigation: {str(e)}"
        )
    finally:
        db.close()


@router.post("/startup-analysis/trigger", status_code=202)
async def trigger_startup_analysis(
    request: Request,
    background_tasks: BackgroundTasks,
    top_n: int = Query(3, ge=1, le=10, description="Number of top entities to process"),
    force_refresh: bool = Query(False, description="Force refresh risk entities"),
    current_user: User = Depends(require_write_or_dev),
):
    """
    Manually trigger the startup analysis flow.

    This endpoint runs the same analysis flow that runs automatically on server startup
    (if AUTO_RUN_STARTUP_ANALYSIS=true). It loads top risk entities from Snowflake
    and runs fraud investigations for the top N riskiest entities.

    Args:
        top_n: Number of top entities to process (default: 3, max: 10)
        force_refresh: If True, force refresh risk entities even if cached

    Returns:
        Response with status and investigation IDs
    """
    # Check if Snowflake is enabled
    if os.getenv("USE_SNOWFLAKE", "false").lower() != "true":
        raise HTTPException(
            status_code=503,
            detail="Startup analysis unavailable. Snowflake is disabled (USE_SNOWFLAKE=false)",
        )

    try:
        from app.service import run_startup_analysis_flow

        # Run the startup analysis flow in background
        logger.info(
            f"🚀 Triggering startup analysis flow for top {top_n} entities (manual trigger)..."
        )

        # Run in background task to avoid blocking the request
        async def run_analysis():
            try:
                comparison_results = await run_startup_analysis_flow(
                    app=request.app,
                    risk_analyzer_results=None,
                    top_n=top_n,
                    force_refresh=force_refresh,
                )
                logger.info(
                    f"✅ Startup analysis flow completed: {len(comparison_results)} investigations"
                )
            except Exception as e:
                logger.error(f"❌ Startup analysis flow failed: {e}", exc_info=True)

        background_tasks.add_task(run_analysis)

        return {
            "status": "accepted",
            "message": f"Startup analysis flow triggered for top {top_n} entities",
            "top_n": top_n,
            "force_refresh": force_refresh,
            "note": "Analysis is running in background. Check logs for progress.",
        }

    except Exception as e:
        logger.error(f"Error triggering startup analysis: {e}", exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Failed to trigger startup analysis: {str(e)}"
        )
