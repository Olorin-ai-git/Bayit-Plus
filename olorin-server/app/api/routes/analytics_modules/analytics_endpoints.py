"""
Analytics API Endpoints Module

Extracted endpoint handlers from analytics.py
"""

import os
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException, Query, Request

from app.service.logging import get_bridge_logger
from app.service.analytics.risk_analyzer import get_risk_analyzer
from app.service.analytics.dashboard_service import DashboardService
from app.service.analytics.metrics_calculator import MetricsCalculator
from app.service.analytics.cohort_analyzer import CohortAnalyzer
from app.service.analytics.experiment_manager import ExperimentManager
from app.models.analytics import PrecisionRecallResponse
from .analytics_models import RiskAnalyticsRequest, EntityAnalysisRequest

logger = get_bridge_logger(__name__)

# Initialize services
dashboard_service = DashboardService()
metrics_calculator = MetricsCalculator()
cohort_analyzer = CohortAnalyzer()
experiment_manager = ExperimentManager()


class AnalyticsEndpoints:
    """Analytics API endpoint handlers"""
    
    def __init__(self, router: APIRouter):
        self.router = router
        self._register_endpoints()
    
    def _register_endpoints(self):
        """Register all analytics endpoints"""
        self.router.get("/health")(self.analytics_health)
        self.router.get("/risk/top-entities")(self.get_top_risk_entities)
        self.router.post("/risk/top-entities")(self.post_top_risk_entities)
        self.router.post("/entity/analyze")(self.analyze_entity)
        self.router.get("/config")(self.get_analytics_config)
        self.router.get("/dashboard")(self.get_dashboard)
        self.router.get("/metrics")(self.get_metrics)
        self.router.get("/metrics/precision-recall")(self.get_precision_recall)
        self.router.get("/cohorts")(self.get_cohorts)
    
    async def analytics_health(self, request: Request):
        """Check if analytics service is available."""
        snowflake_enabled = os.getenv('USE_SNOWFLAKE', 'false').lower() == 'true'
        
        scheduler_status = None
        if hasattr(request.app.state, 'detection_scheduler') and request.app.state.detection_scheduler:
            scheduler = request.app.state.detection_scheduler
            scheduler_status = {
                "running": scheduler.scheduler.running if hasattr(scheduler, 'scheduler') else False,
                "enabled": getattr(scheduler, 'enabled', True)
            }
        
        return {
            "status": "healthy",
            "snowflake_enabled": snowflake_enabled,
            "scheduler": scheduler_status,
            "message": "Analytics service is operational" if snowflake_enabled else "Analytics disabled (USE_SNOWFLAKE=false)"
        }
    
    async def get_top_risk_entities(
        self,
        request: Request,
        time_window: Optional[str] = Query(None, description="Time window (e.g., '24h', '7d')"),
        group_by: Optional[str] = Query(None, description="Group by field (e.g., 'EMAIL', 'DEVICE_ID', 'IP')"),
        top_percentage: Optional[float] = Query(None, description="Top percentage (1-100)"),
        force_refresh: bool = Query(False, description="Force refresh cache")
    ):
        """Get top risk entities based on risk-weighted transaction value."""
        if os.getenv('USE_SNOWFLAKE', 'false').lower() != 'true':
            raise HTTPException(
                status_code=503,
                detail="Analytics service unavailable. Snowflake is disabled (USE_SNOWFLAKE=false)"
            )
        
        # Check for cached results
        if not force_refresh and hasattr(request.app.state, 'top_risk_entities'):
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
                force_refresh=force_refresh
            )
            
            if results.get('status') == 'failed':
                raise HTTPException(
                    status_code=500,
                    detail=f"Analysis failed: {results.get('error', 'Unknown error')}"
                )
            
            return results
            
        except Exception as e:
            logger.error(f"Risk analysis endpoint error: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Risk analysis failed: {str(e)}"
            )
    
    async def post_top_risk_entities(
        self,
        request: Request,
        body: RiskAnalyticsRequest
    ):
        """Get top risk entities with POST request for complex parameters."""
        if os.getenv('USE_SNOWFLAKE', 'false').lower() != 'true':
            raise HTTPException(
                status_code=503,
                detail="Analytics service unavailable. Snowflake is disabled"
            )
        
        try:
            analyzer = get_risk_analyzer()
            results = await analyzer.get_top_risk_entities(
                time_window=body.time_window,
                group_by=body.group_by,
                top_percentage=body.top_percentage,
                force_refresh=body.force_refresh
            )
            
            if results.get('status') == 'failed':
                raise HTTPException(
                    status_code=500,
                    detail=f"Analysis failed: {results.get('error', 'Unknown error')}"
                )
            
            return results
            
        except Exception as e:
            logger.error(f"Risk analysis endpoint error: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Risk analysis failed: {str(e)}"
            )
    
    async def analyze_entity(self, body: EntityAnalysisRequest):
        """Analyze a specific entity's risk profile."""
        if os.getenv('USE_SNOWFLAKE', 'false').lower() != 'true':
            raise HTTPException(
                status_code=503,
                detail="Analytics service unavailable. Snowflake is disabled"
            )
        
        try:
            analyzer = get_risk_analyzer()
            results = await analyzer.analyze_entity(
                entity_value=body.entity_value,
                entity_type=body.entity_type,
                time_window=body.time_window
            )
            
            if results.get('status') == 'failed':
                raise HTTPException(
                    status_code=500,
                    detail=f"Entity analysis failed: {results.get('error', 'Unknown error')}"
                )
            
            return results
            
        except Exception as e:
            logger.error(f"Entity analysis endpoint error: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Entity analysis failed: {str(e)}"
            )
    
    async def get_analytics_config(self):
        """Get current analytics configuration."""
        # Read analyzer time window configuration
        analyzer_hours = int(os.getenv('ANALYZER_TIME_WINDOW_HOURS', '24'))
        default_time_window = f"{analyzer_hours}h"
        
        return {
            "snowflake_enabled": os.getenv('USE_SNOWFLAKE', 'false').lower() == 'true',
            "default_time_window": default_time_window,
            "default_group_by": os.getenv('ANALYTICS_DEFAULT_GROUP_BY', 'email').upper(),
            "default_top_percentage": float(os.getenv('ANALYTICS_DEFAULT_TOP_PERCENTAGE', '10')),
            "cache_ttl": int(os.getenv('ANALYTICS_CACHE_TTL', '300')),
            "available_groupings": ["EMAIL", "DEVICE_ID", "IP", "BIN", "MERCHANT_NAME"],
            "available_time_windows": ["1h", "6h", "12h", "24h", "7d", "30d"]
        }
    
    async def get_dashboard(
        self,
        start_date: Optional[str] = Query(None, description="Start date (ISO 8601)"),
        end_date: Optional[str] = Query(None, description="End date (ISO 8601)"),
        time_window: Optional[str] = Query(None, description="Time window (1h, 24h, 7d, 30d, 90d, all)"),
        investigation_id: Optional[str] = Query(None, description="Filter by investigation ID")
    ):
        """Get analytics dashboard data including KPIs and trends."""
        try:
            start_dt = datetime.fromisoformat(start_date) if start_date else None
            end_dt = datetime.fromisoformat(end_date) if end_date else None

            result = await dashboard_service.get_dashboard_data(
                start_date=start_dt,
                end_date=end_dt,
                time_window=time_window,
                investigation_id=investigation_id
            )
            return result
        except Exception as e:
            logger.error(f"Dashboard endpoint error: {e}")
            raise HTTPException(status_code=500, detail=f"Dashboard data failed: {str(e)}")
    
    async def get_metrics(
        self,
        start_date: str = Query(..., description="Start date (ISO 8601)"),
        end_date: str = Query(..., description="End date (ISO 8601)"),
        include_latency: bool = Query(True, description="Include latency metrics"),
        include_throughput: bool = Query(True, description="Include throughput metrics")
    ):
        """Get fraud detection metrics for a time period."""
        try:
            start_dt = datetime.fromisoformat(start_date)
            end_dt = datetime.fromisoformat(end_date)

            result = await metrics_calculator.calculate_metrics(start_dt, end_dt)
            return result
        except Exception as e:
            logger.error(f"Metrics endpoint error: {e}")
            raise HTTPException(status_code=500, detail=f"Metrics calculation failed: {str(e)}")
    
    async def get_precision_recall(
        self,
        start_date: str = Query(..., description="Start date (ISO 8601)"),
        end_date: str = Query(..., description="End date (ISO 8601)")
    ):
        """Get precision, recall, and F1 score."""
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
                false_negatives=metrics.false_negatives
            )
        except Exception as e:
            logger.error(f"Precision-recall endpoint error: {e}")
            raise HTTPException(status_code=500, detail=f"Precision-recall calculation failed: {str(e)}")
    
    async def get_cohorts(
        self,
        dimension: str = Query(..., description="Dimension to segment by"),
        start_date: str = Query(..., description="Start date (ISO 8601)"),
        end_date: str = Query(..., description="End date (ISO 8601)"),
        min_count: int = Query(100, description="Minimum transactions per cohort")
    ):
        """Get cohort analysis for a dimension."""
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

