#!/usr/bin/env python3
"""
Analytics Engine for Olorin Deployment Dashboard.

Provides deployment success rate analysis, performance impact analysis,
service reliability metrics, and automated report generation.
"""

import asyncio
import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from pathlib import Path
import statistics

logger = logging.getLogger(__name__)


@dataclass
class DeploymentAnalytics:
    """Analytics data for deployments."""
    total_deployments: int
    successful_deployments: int
    failed_deployments: int
    success_rate: float
    average_duration_minutes: float
    median_duration_minutes: float
    rollback_count: int
    rollback_rate: float


@dataclass
class ServiceReliability:
    """Reliability metrics for a service."""
    service_name: str
    deployment_count: int
    success_count: int
    failure_count: int
    success_rate: float
    average_deployment_time: float
    average_recovery_time: float
    uptime_percentage: float


@dataclass
class PerformanceMetrics:
    """Performance impact metrics."""
    deployment_id: str
    before_metrics: Dict[str, float]
    after_metrics: Dict[str, float]
    performance_impact: Dict[str, float]
    regression_detected: bool


class AnalyticsEngine:
    """
    Analytics engine for deployment metrics and reporting.
    
    Analyzes deployment patterns, service reliability, performance impacts,
    and generates automated reports for stakeholders.
    """
    
    def __init__(self, data_dir: str = "/tmp/olorin_analytics"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        # Analytics cache
        self.deployment_cache: List[Dict[str, Any]] = []
        self.service_metrics_cache: Dict[str, List[Dict[str, Any]]] = {}
        self.performance_cache: Dict[str, PerformanceMetrics] = {}
        
        # Analysis configuration
        self.analysis_window_days = 30
        self.performance_threshold_percent = 10  # 10% degradation threshold
        
        # Load historical data
        asyncio.create_task(self._load_historical_data())
    
    async def analyze_deployment_trends(
        self, 
        days: int = 30,
        environment: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Analyze deployment trends over specified period.
        
        Args:
            days: Number of days to analyze
            environment: Filter by environment (optional)
            
        Returns:
            Deployment trends analysis
        """
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
        
        # Filter deployments
        deployments = [
            d for d in self.deployment_cache
            if self._parse_timestamp(d.get('started_at', '')) >= cutoff_date
        ]
        
        if environment:
            deployments = [d for d in deployments if d.get('environment') == environment]
        
        if not deployments:
            return self._empty_trends_result()
        
        # Calculate basic metrics
        total = len(deployments)
        successful = len([d for d in deployments if d.get('status') == 'success'])
        failed = len([d for d in deployments if d.get('status') == 'failed'])
        rolled_back = len([d for d in deployments if d.get('status') == 'rolled_back'])
        
        success_rate = (successful / total * 100) if total > 0 else 0
        rollback_rate = (rolled_back / total * 100) if total > 0 else 0
        
        # Calculate durations
        durations = []
        for deployment in deployments:
            duration = self._calculate_deployment_duration(deployment)
            if duration is not None:
                durations.append(duration)
        
        avg_duration = statistics.mean(durations) if durations else 0
        median_duration = statistics.median(durations) if durations else 0
        
        # Daily breakdown
        daily_stats = self._calculate_daily_statistics(deployments, days)
        
        # Service breakdown
        service_stats = self._calculate_service_statistics(deployments)
        
        return {
            "period": {
                "days": days,
                "start_date": cutoff_date.isoformat(),
                "end_date": datetime.now(timezone.utc).isoformat(),
                "environment": environment
            },
            "overview": {
                "total_deployments": total,
                "successful_deployments": successful,
                "failed_deployments": failed,
                "rolled_back_deployments": rolled_back,
                "success_rate": round(success_rate, 2),
                "rollback_rate": round(rollback_rate, 2),
                "average_duration_minutes": round(avg_duration, 2),
                "median_duration_minutes": round(median_duration, 2)
            },
            "daily_statistics": daily_stats,
            "service_statistics": service_stats,
            "trend_analysis": self._analyze_trends(daily_stats)
        }
    
    async def analyze_service_reliability(
        self,
        service: str,
        days: int = 30
    ) -> ServiceReliability:
        """
        Analyze reliability metrics for a specific service.
        
        Args:
            service: Service name to analyze
            days: Analysis period in days
            
        Returns:
            Service reliability metrics
        """
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
        
        # Filter deployments for this service
        service_deployments = [
            d for d in self.deployment_cache
            if service in d.get('services', []) and
            self._parse_timestamp(d.get('started_at', '')) >= cutoff_date
        ]
        
        if not service_deployments:
            return ServiceReliability(
                service_name=service,
                deployment_count=0,
                success_count=0,
                failure_count=0,
                success_rate=0.0,
                average_deployment_time=0.0,
                average_recovery_time=0.0,
                uptime_percentage=100.0
            )
        
        # Calculate metrics
        total_deployments = len(service_deployments)
        successful = len([d for d in service_deployments if d.get('status') == 'success'])
        failed = len([d for d in service_deployments if d.get('status') in ['failed', 'rolled_back']])
        
        success_rate = (successful / total_deployments * 100) if total_deployments > 0 else 0
        
        # Calculate deployment times
        deployment_times = []
        recovery_times = []
        
        for deployment in service_deployments:
            duration = self._calculate_deployment_duration(deployment)
            if duration is not None:
                deployment_times.append(duration)
            
            if deployment.get('status') == 'rolled_back':
                recovery_time = self._calculate_recovery_time(deployment)
                if recovery_time is not None:
                    recovery_times.append(recovery_time)
        
        avg_deployment_time = statistics.mean(deployment_times) if deployment_times else 0
        avg_recovery_time = statistics.mean(recovery_times) if recovery_times else 0
        
        # Calculate uptime (simplified - based on successful deployments)
        uptime_percentage = success_rate
        
        return ServiceReliability(
            service_name=service,
            deployment_count=total_deployments,
            success_count=successful,
            failure_count=failed,
            success_rate=round(success_rate, 2),
            average_deployment_time=round(avg_deployment_time, 2),
            average_recovery_time=round(avg_recovery_time, 2),
            uptime_percentage=round(uptime_percentage, 2)
        )
    
    async def analyze_performance_impact(
        self,
        deployment_id: str,
        before_metrics: Dict[str, float],
        after_metrics: Dict[str, float]
    ) -> PerformanceMetrics:
        """
        Analyze performance impact of a deployment.
        
        Args:
            deployment_id: Unique identifier for the deployment
            before_metrics: Performance metrics before deployment
            after_metrics: Performance metrics after deployment
            
        Returns:
            Performance impact analysis
        """
        performance_impact = {}
        regression_detected = False
        
        # Calculate impact for each metric
        for metric, after_value in after_metrics.items():
            if metric in before_metrics:
                before_value = before_metrics[metric]
                
                if before_value > 0:
                    # Calculate percentage change
                    change_percent = ((after_value - before_value) / before_value) * 100
                    performance_impact[metric] = round(change_percent, 2)
                    
                    # Check for regression (performance degradation)
                    if self._is_regression_metric(metric) and change_percent > self.performance_threshold_percent:
                        regression_detected = True
                    elif not self._is_regression_metric(metric) and change_percent < -self.performance_threshold_percent:
                        regression_detected = True
        
        performance_metrics = PerformanceMetrics(
            deployment_id=deployment_id,
            before_metrics=before_metrics,
            after_metrics=after_metrics,
            performance_impact=performance_impact,
            regression_detected=regression_detected
        )
        
        # Cache the analysis
        self.performance_cache[deployment_id] = performance_metrics
        
        return performance_metrics
    
    async def generate_deployment_report(
        self,
        environment: Optional[str] = None,
        days: int = 7
    ) -> Dict[str, Any]:
        """
        Generate comprehensive deployment report.
        
        Args:
            environment: Environment to analyze (optional)
            days: Report period in days
            
        Returns:
            Comprehensive deployment report
        """
        logger.info(f"Generating deployment report for {days} days")
        
        # Get deployment trends
        trends = await self.analyze_deployment_trends(days, environment)
        
        # Get service reliability for all services
        services = self._get_unique_services()
        service_reliability = {}
        for service in services:
            reliability = await self.analyze_service_reliability(service, days)
            service_reliability[service] = {
                "deployment_count": reliability.deployment_count,
                "success_rate": reliability.success_rate,
                "average_deployment_time": reliability.average_deployment_time,
                "uptime_percentage": reliability.uptime_percentage
            }
        
        # Get performance regressions
        recent_regressions = [
            {
                "deployment_id": pm.deployment_id,
                "performance_impact": pm.performance_impact,
                "regression_severity": self._calculate_regression_severity(pm.performance_impact)
            }
            for pm in self.performance_cache.values()
            if pm.regression_detected
        ]
        
        # Generate recommendations
        recommendations = self._generate_recommendations(trends, service_reliability, recent_regressions)
        
        return {
            "report_metadata": {
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "period_days": days,
                "environment": environment or "all",
                "report_type": "deployment_summary"
            },
            "deployment_trends": trends,
            "service_reliability": service_reliability,
            "performance_regressions": recent_regressions,
            "recommendations": recommendations,
            "summary": {
                "overall_health": self._calculate_overall_health(trends, service_reliability),
                "key_metrics": {
                    "success_rate": trends["overview"]["success_rate"],
                    "average_deployment_time": trends["overview"]["average_duration_minutes"],
                    "services_monitored": len(services),
                    "performance_regressions": len(recent_regressions)
                }
            }
        }
    
    def _empty_trends_result(self) -> Dict[str, Any]:
        """Return empty trends result for no data."""
        return {
            "overview": {
                "total_deployments": 0,
                "successful_deployments": 0,
                "failed_deployments": 0,
                "success_rate": 0.0,
                "average_duration_minutes": 0.0
            },
            "daily_statistics": [],
            "service_statistics": {},
            "trend_analysis": {}
        }
    
    def _parse_timestamp(self, timestamp_str: str) -> datetime:
        """Parse timestamp string to datetime."""
        try:
            return datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
        except:
            return datetime.min.replace(tzinfo=timezone.utc)
    
    def _calculate_deployment_duration(self, deployment: Dict[str, Any]) -> Optional[float]:
        """Calculate deployment duration in minutes."""
        started_at = deployment.get('started_at')
        completed_at = deployment.get('completed_at')
        
        if not started_at or not completed_at:
            return None
        
        try:
            start_time = self._parse_timestamp(started_at)
            end_time = self._parse_timestamp(completed_at)
            duration = (end_time - start_time).total_seconds() / 60
            return duration if duration > 0 else None
        except:
            return None
    
    def _calculate_recovery_time(self, deployment: Dict[str, Any]) -> Optional[float]:
        """Calculate recovery time for rolled back deployment."""
        failed_at = deployment.get('failed_at')
        recovered_at = deployment.get('completed_at')
        
        if not failed_at or not recovered_at:
            return None
        
        try:
            fail_time = self._parse_timestamp(failed_at)
            recovery_time = self._parse_timestamp(recovered_at)
            duration = (recovery_time - fail_time).total_seconds() / 60
            return duration if duration > 0 else None
        except:
            return None
    
    def _calculate_daily_statistics(self, deployments: List[Dict[str, Any]], days: int) -> List[Dict[str, Any]]:
        """Calculate daily deployment statistics."""
        daily_stats = []
        
        for i in range(days):
            date = datetime.now(timezone.utc) - timedelta(days=i)
            day_start = date.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)
            
            day_deployments = [
                d for d in deployments
                if day_start <= self._parse_timestamp(d.get('started_at', '')) < day_end
            ]
            
            total = len(day_deployments)
            successful = len([d for d in day_deployments if d.get('status') == 'success'])
            failed = len([d for d in day_deployments if d.get('status') == 'failed'])
            
            daily_stats.append({
                "date": day_start.date().isoformat(),
                "total_deployments": total,
                "successful_deployments": successful,
                "failed_deployments": failed,
                "success_rate": (successful / total * 100) if total > 0 else 0
            })
        
        return sorted(daily_stats, key=lambda x: x['date'])
    
    def _calculate_service_statistics(self, deployments: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
        """Calculate per-service statistics."""
        service_stats = {}
        
        for service in self._get_unique_services():
            service_deployments = [
                d for d in deployments
                if service in d.get('services', [])
            ]
            
            total = len(service_deployments)
            successful = len([d for d in service_deployments if d.get('status') == 'success'])
            failed = len([d for d in service_deployments if d.get('status') == 'failed'])
            
            service_stats[service] = {
                "total_deployments": total,
                "successful_deployments": successful,
                "failed_deployments": failed,
                "success_rate": (successful / total * 100) if total > 0 else 0
            }
        
        return service_stats
    
    def _analyze_trends(self, daily_stats: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze trends from daily statistics."""
        if len(daily_stats) < 7:
            return {"trend": "insufficient_data"}
        
        recent_week = daily_stats[-7:]
        previous_week = daily_stats[-14:-7] if len(daily_stats) >= 14 else []
        
        recent_success_rate = statistics.mean([day['success_rate'] for day in recent_week])
        recent_deployment_count = sum([day['total_deployments'] for day in recent_week])
        
        if previous_week:
            previous_success_rate = statistics.mean([day['success_rate'] for day in previous_week])
            previous_deployment_count = sum([day['total_deployments'] for day in previous_week])
            
            success_rate_trend = "improving" if recent_success_rate > previous_success_rate else "declining"
            deployment_volume_trend = "increasing" if recent_deployment_count > previous_deployment_count else "decreasing"
        else:
            success_rate_trend = "stable"
            deployment_volume_trend = "stable"
        
        return {
            "success_rate_trend": success_rate_trend,
            "deployment_volume_trend": deployment_volume_trend,
            "recent_week_success_rate": round(recent_success_rate, 2),
            "recent_week_deployment_count": recent_deployment_count
        }
    
    def _get_unique_services(self) -> List[str]:
        """Get list of unique services from deployment cache."""
        services = set()
        for deployment in self.deployment_cache:
            services.update(deployment.get('services', []))
        return sorted(list(services))
    
    def _is_regression_metric(self, metric: str) -> bool:
        """Check if higher values for this metric indicate regression."""
        regression_metrics = ['response_time_ms', 'error_rate', 'cpu_usage', 'memory_usage']
        return metric in regression_metrics
    
    def _calculate_regression_severity(self, performance_impact: Dict[str, float]) -> str:
        """Calculate severity of performance regression."""
        max_impact = max([abs(impact) for impact in performance_impact.values()], default=0)
        
        if max_impact >= 50:
            return "critical"
        elif max_impact >= 25:
            return "high"
        elif max_impact >= 10:
            return "medium"
        else:
            return "low"
    
    def _generate_recommendations(
        self,
        trends: Dict[str, Any],
        service_reliability: Dict[str, Dict[str, Any]],
        regressions: List[Dict[str, Any]]
    ) -> List[str]:
        """Generate actionable recommendations."""
        recommendations = []
        
        # Success rate recommendations
        success_rate = trends["overview"]["success_rate"]
        if success_rate < 95:
            recommendations.append(f"Success rate is {success_rate:.1f}%. Consider improving testing coverage and deployment validation.")
        
        # Service reliability recommendations
        for service, metrics in service_reliability.items():
            if metrics["success_rate"] < 90:
                recommendations.append(f"Service '{service}' has low success rate ({metrics['success_rate']:.1f}%). Review deployment process.")
        
        # Performance regression recommendations
        if len(regressions) > 0:
            critical_regressions = [r for r in regressions if r["regression_severity"] == "critical"]
            if critical_regressions:
                recommendations.append(f"Found {len(critical_regressions)} critical performance regressions. Immediate attention required.")
        
        return recommendations
    
    def _calculate_overall_health(
        self,
        trends: Dict[str, Any],
        service_reliability: Dict[str, Dict[str, Any]]
    ) -> str:
        """Calculate overall system health score."""
        success_rate = trends["overview"]["success_rate"]
        avg_service_reliability = statistics.mean([
            metrics["success_rate"] for metrics in service_reliability.values()
        ]) if service_reliability else 100
        
        overall_score = (success_rate + avg_service_reliability) / 2
        
        if overall_score >= 95:
            return "excellent"
        elif overall_score >= 90:
            return "good"
        elif overall_score >= 80:
            return "fair"
        else:
            return "poor"
    
    async def _load_historical_data(self):
        """Load historical deployment data."""
        try:
            data_file = self.data_dir / "deployments.json"
            if data_file.exists():
                with open(data_file, 'r') as f:
                    self.deployment_cache = json.load(f)
                
                logger.info(f"Loaded {len(self.deployment_cache)} historical deployments")
        except Exception as e:
            logger.error(f"Error loading historical data: {e}")
            self.deployment_cache = []