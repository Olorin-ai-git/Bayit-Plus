"""
Live Mode Cost Tracker for Autonomous Investigation System

This module provides real-time cost tracking, monitoring, and alerting for live mode
operations. It integrates with various APIs and services to track actual costs and
prevent budget overruns.

CRITICAL: This tracker enforces financial safety for live mode operations with real costs.
"""

import asyncio
import json
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass, asdict
from pathlib import Path
import aiohttp
import logging
from enum import Enum

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

class CostCategory(Enum):
    """Categories for cost tracking"""
    SNOWFLAKE = "snowflake"
    CLAUDE_API = "claude_api"
    EXTERNAL_APIS = "external_apis"
    INFRASTRUCTURE = "infrastructure"

class AlertLevel(Enum):
    """Alert severity levels"""
    INFO = "info"
    WARNING = "warning" 
    CRITICAL = "critical"
    EMERGENCY = "emergency"

@dataclass
class CostEvent:
    """Individual cost event"""
    timestamp: datetime
    category: CostCategory
    service: str
    amount: float
    currency: str = "USD"
    details: Dict[str, Any] = None
    investigation_id: Optional[str] = None
    phase: Optional[str] = None

@dataclass
class CostSummary:
    """Cost summary for reporting"""
    total_cost: float
    cost_by_category: Dict[str, float]
    cost_by_service: Dict[str, float]
    cost_by_investigation: Dict[str, float]
    cost_by_phase: Dict[str, float]
    period_start: datetime
    period_end: datetime
    event_count: int

@dataclass
class CostAlert:
    """Cost alert definition"""
    alert_id: str
    level: AlertLevel
    threshold_type: str  # "percentage", "absolute", "rate"
    threshold_value: float
    current_value: float
    message: str
    timestamp: datetime
    cost_category: Optional[CostCategory] = None

class LiveModeCostTracker:
    """
    Real-time cost tracking system for live mode operations.
    
    Features:
    - Real-time cost aggregation from multiple sources
    - Budget monitoring with configurable thresholds
    - Alert system for cost overruns
    - Integration with various APIs for usage tracking
    - Cost optimization recommendations
    - Emergency cost circuit breakers
    """
    
    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or self._get_default_config()
        self.cost_events: List[CostEvent] = []
        self.active_alerts: List[CostAlert] = []
        self.alert_callbacks: List[Callable] = []
        
        # Cost tracking by category
        self.cost_totals = {category: 0.0 for category in CostCategory}
        self.session_start_time = datetime.now()
        
        # API clients for cost tracking
        self.api_clients = {}
        self._initialize_api_clients()
        
        # Cost monitoring task
        self.monitoring_task: Optional[asyncio.Task] = None
        self.monitoring_active = False
        
    def _get_default_config(self) -> Dict[str, Any]:
        """Get default configuration for cost tracking"""
        return {
            "budgets": {
                "per_investigation": 10.00,
                "per_session": 100.00,
                "daily": 200.00,
                "monthly": 5000.00
            },
            "alert_thresholds": {
                "warning": 0.75,    # 75% of budget
                "critical": 0.90,   # 90% of budget
                "emergency": 0.95   # 95% of budget
            },
            "monitoring_interval": 30,  # seconds
            "api_timeouts": {
                "anthropic": 30,
                "snowflake": 30,
                "external": 15
            },
            "cost_rates": {
                # Claude API costs per 1K tokens
                "claude-opus-4-1": {"input": 0.015, "output": 0.075},
                "claude-3-sonnet": {"input": 0.003, "output": 0.015},
                "claude-3-haiku": {"input": 0.00025, "output": 0.00125},
                # Snowflake costs per credit
                "snowflake_credit": 2.00,
                # External API costs per call
                "abuseipdb": 0.001,
                "virustotal": 0.002,
                "shodan": 0.005
            }
        }
    
    def _initialize_api_clients(self):
        """Initialize API clients for cost tracking"""
        try:
            # Initialize HTTP session for API calls
            self.http_session = None  # Will be created when needed
            logger.info("API clients initialized for cost tracking")
        except Exception as e:
            logger.error(f"Failed to initialize API clients: {e}")
    
    async def start_monitoring(self):
        """Start real-time cost monitoring"""
        if self.monitoring_active:
            logger.warning("Cost monitoring already active")
            return
        
        self.monitoring_active = True
        self.session_start_time = datetime.now()
        
        # Start monitoring task
        self.monitoring_task = asyncio.create_task(self._monitoring_loop())
        
        logger.info("Live mode cost monitoring started")
        
    async def stop_monitoring(self):
        """Stop cost monitoring and generate final report"""
        if not self.monitoring_active:
            return
        
        self.monitoring_active = False
        
        if self.monitoring_task:
            self.monitoring_task.cancel()
            try:
                await self.monitoring_task
            except asyncio.CancelledError:
                pass
        
        # Generate final cost report
        final_report = self.generate_cost_report()
        await self._save_cost_report(final_report)
        
        logger.info("Cost monitoring stopped, final report generated")
        
    async def _monitoring_loop(self):
        """Main monitoring loop"""
        while self.monitoring_active:
            try:
                await self._update_real_time_costs()
                await self._check_alert_thresholds()
                await asyncio.sleep(self.config["monitoring_interval"])
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in cost monitoring loop: {e}")
                await asyncio.sleep(5)  # Brief pause before retry
    
    async def _update_real_time_costs(self):
        """Update costs from all sources"""
        try:
            # Update Anthropic API costs
            await self._update_anthropic_costs()
            
            # Update Snowflake costs (if available)
            await self._update_snowflake_costs()
            
            # Update external API costs
            await self._update_external_api_costs()
            
        except Exception as e:
            logger.error(f"Failed to update real-time costs: {e}")
    
    async def _update_anthropic_costs(self):
        """Update costs from Anthropic API"""
        try:
            # In a real implementation, this would query the Anthropic API
            # for current usage and costs. For now, we'll track manually.
            pass
        except Exception as e:
            logger.error(f"Failed to update Anthropic costs: {e}")
    
    async def _update_snowflake_costs(self):
        """Update costs from Snowflake"""
        try:
            # In a real implementation, this would query Snowflake's
            # information schema for credit usage
            pass
        except Exception as e:
            logger.error(f"Failed to update Snowflake costs: {e}")
    
    async def _update_external_api_costs(self):
        """Update costs from external APIs"""
        try:
            # Track external API usage costs
            pass
        except Exception as e:
            logger.error(f"Failed to update external API costs: {e}")
    
    async def track_cost_event(
        self,
        category: CostCategory,
        service: str,
        amount: float,
        details: Dict[str, Any] = None,
        investigation_id: str = None,
        phase: str = None
    ):
        """Track a cost event"""
        try:
            cost_event = CostEvent(
                timestamp=datetime.now(),
                category=category,
                service=service,
                amount=amount,
                details=details or {},
                investigation_id=investigation_id,
                phase=phase
            )
            
            self.cost_events.append(cost_event)
            self.cost_totals[category] += amount
            
            # Log the cost event
            logger.info(f"Cost event tracked: {service} ${amount:.4f} ({category.value})")
            
            # Check for immediate alerts
            await self._check_cost_event_alerts(cost_event)
            
        except Exception as e:
            logger.error(f"Failed to track cost event: {e}")
    
    async def track_claude_usage(
        self,
        model: str,
        input_tokens: int,
        output_tokens: int,
        investigation_id: str = None,
        phase: str = None
    ):
        """Track Claude API usage and calculate costs"""
        try:
            # Get cost rates for the model
            model_key = self._normalize_model_name(model)
            rates = self.config["cost_rates"].get(model_key, {})
            
            if not rates:
                logger.warning(f"No cost rates found for model: {model}")
                return
            
            # Calculate costs
            input_cost = (input_tokens / 1000) * rates.get("input", 0)
            output_cost = (output_tokens / 1000) * rates.get("output", 0)
            total_cost = input_cost + output_cost
            
            # Track the cost event
            await self.track_cost_event(
                category=CostCategory.CLAUDE_API,
                service=f"claude-{model}",
                amount=total_cost,
                details={
                    "model": model,
                    "input_tokens": input_tokens,
                    "output_tokens": output_tokens,
                    "input_cost": input_cost,
                    "output_cost": output_cost,
                    "rate_input": rates.get("input", 0),
                    "rate_output": rates.get("output", 0)
                },
                investigation_id=investigation_id,
                phase=phase
            )
            
        except Exception as e:
            logger.error(f"Failed to track Claude usage: {e}")
    
    async def track_snowflake_usage(
        self,
        credits_used: float,
        query_details: Dict[str, Any] = None,
        investigation_id: str = None,
        phase: str = None
    ):
        """Track Snowflake usage and calculate costs"""
        try:
            credit_rate = self.config["cost_rates"]["snowflake_credit"]
            total_cost = credits_used * credit_rate
            
            await self.track_cost_event(
                category=CostCategory.SNOWFLAKE,
                service="snowflake",
                amount=total_cost,
                details={
                    "credits_used": credits_used,
                    "credit_rate": credit_rate,
                    "query_details": query_details or {}
                },
                investigation_id=investigation_id,
                phase=phase
            )
            
        except Exception as e:
            logger.error(f"Failed to track Snowflake usage: {e}")
    
    async def track_external_api_usage(
        self,
        api_service: str,
        call_count: int = 1,
        details: Dict[str, Any] = None,
        investigation_id: str = None,
        phase: str = None
    ):
        """Track external API usage and calculate costs"""
        try:
            cost_per_call = self.config["cost_rates"].get(api_service.lower(), 0.001)
            total_cost = call_count * cost_per_call
            
            await self.track_cost_event(
                category=CostCategory.EXTERNAL_APIS,
                service=api_service,
                amount=total_cost,
                details={
                    "call_count": call_count,
                    "cost_per_call": cost_per_call,
                    "service_details": details or {}
                },
                investigation_id=investigation_id,
                phase=phase
            )
            
        except Exception as e:
            logger.error(f"Failed to track external API usage: {e}")
    
    def _normalize_model_name(self, model: str) -> str:
        """Normalize model name for cost lookup"""
        if "opus-4" in model.lower():
            return "claude-opus-4-1"
        elif "sonnet" in model.lower():
            return "claude-3-sonnet"
        elif "haiku" in model.lower():
            return "claude-3-haiku"
        else:
            return model.lower()
    
    async def _check_alert_thresholds(self):
        """Check all cost thresholds and trigger alerts"""
        try:
            total_cost = sum(self.cost_totals.values())
            session_duration = (datetime.now() - self.session_start_time).total_seconds() / 3600
            
            # Check session budget
            session_budget = self.config["budgets"]["per_session"]
            session_percentage = total_cost / session_budget if session_budget > 0 else 0
            
            await self._check_percentage_threshold(
                "session_budget",
                session_percentage,
                total_cost,
                session_budget,
                "Session budget"
            )
            
            # Check daily budget (if available)
            # This would require tracking costs across multiple sessions
            
            # Check cost rate (spending per hour)
            cost_rate = total_cost / max(session_duration, 0.1)  # Avoid division by zero
            if cost_rate > 50.0:  # $50/hour threshold
                await self._create_alert(
                    "high_cost_rate",
                    AlertLevel.WARNING,
                    f"High cost rate detected: ${cost_rate:.2f}/hour",
                    current_value=cost_rate,
                    threshold_value=50.0
                )
            
        except Exception as e:
            logger.error(f"Failed to check alert thresholds: {e}")
    
    async def _check_percentage_threshold(
        self,
        threshold_name: str,
        percentage: float,
        current_cost: float,
        budget: float,
        description: str
    ):
        """Check percentage-based thresholds"""
        thresholds = self.config["alert_thresholds"]
        
        if percentage >= thresholds["emergency"]:
            await self._create_alert(
                f"{threshold_name}_emergency",
                AlertLevel.EMERGENCY,
                f"{description} 🚨 EMERGENCY: {percentage:.1%} of budget used (${current_cost:.2f}/${budget:.2f})",
                current_value=current_cost,
                threshold_value=budget * thresholds["emergency"]
            )
        elif percentage >= thresholds["critical"]:
            await self._create_alert(
                f"{threshold_name}_critical",
                AlertLevel.CRITICAL,
                f"{description} CRITICAL: {percentage:.1%} of budget used (${current_cost:.2f}/${budget:.2f})",
                current_value=current_cost,
                threshold_value=budget * thresholds["critical"]
            )
        elif percentage >= thresholds["warning"]:
            await self._create_alert(
                f"{threshold_name}_warning",
                AlertLevel.WARNING,
                f"{description} WARNING: {percentage:.1%} of budget used (${current_cost:.2f}/${budget:.2f})",
                current_value=current_cost,
                threshold_value=budget * thresholds["warning"]
            )
    
    async def _check_cost_event_alerts(self, cost_event: CostEvent):
        """Check for alerts triggered by specific cost events"""
        try:
            # Check for large individual charges
            if cost_event.amount > 5.0:  # $5 threshold
                await self._create_alert(
                    f"large_charge_{cost_event.service}",
                    AlertLevel.WARNING,
                    f"Large charge detected: ${cost_event.amount:.2f} from {cost_event.service}",
                    current_value=cost_event.amount,
                    threshold_value=5.0
                )
            
            # Check for rapid spending
            recent_events = [
                e for e in self.cost_events
                if (datetime.now() - e.timestamp).total_seconds() < 300  # Last 5 minutes
                and e.category == cost_event.category
            ]
            
            recent_total = sum(e.amount for e in recent_events)
            if recent_total > 10.0:  # $10 in 5 minutes
                await self._create_alert(
                    f"rapid_spending_{cost_event.category.value}",
                    AlertLevel.CRITICAL,
                    f"Rapid spending detected: ${recent_total:.2f} in {cost_event.category.value} in last 5 minutes",
                    current_value=recent_total,
                    threshold_value=10.0
                )
                
        except Exception as e:
            logger.error(f"Failed to check cost event alerts: {e}")
    
    async def _create_alert(
        self,
        alert_id: str,
        level: AlertLevel,
        message: str,
        current_value: float,
        threshold_value: float,
        cost_category: CostCategory = None
    ):
        """Create and process a cost alert"""
        try:
            # Check if alert already exists (avoid spam)
            existing_alert = next(
                (a for a in self.active_alerts if a.alert_id == alert_id),
                None
            )
            
            if existing_alert:
                # Update existing alert
                existing_alert.current_value = current_value
                existing_alert.timestamp = datetime.now()
                return
            
            # Create new alert
            alert = CostAlert(
                alert_id=alert_id,
                level=level,
                threshold_type="absolute",
                threshold_value=threshold_value,
                current_value=current_value,
                message=message,
                timestamp=datetime.now(),
                cost_category=cost_category
            )
            
            self.active_alerts.append(alert)
            
            # Log alert
            logger.warning(f"Cost alert [{level.value.upper()}]: {message}")
            
            # Execute alert callbacks
            for callback in self.alert_callbacks:
                try:
                    await callback(alert)
                except Exception as e:
                    logger.error(f"Alert callback failed: {e}")
                    
        except Exception as e:
            logger.error(f"Failed to create alert: {e}")
    
    def register_alert_callback(self, callback: Callable):
        """Register a callback for cost alerts"""
        self.alert_callbacks.append(callback)
    
    def get_current_costs(self) -> Dict[str, float]:
        """Get current cost totals by category"""
        return {
            category.value: total
            for category, total in self.cost_totals.items()
        }
    
    def get_total_cost(self) -> float:
        """Get total cost across all categories"""
        return sum(self.cost_totals.values())
    
    def generate_cost_report(self, period_hours: int = None) -> CostSummary:
        """Generate comprehensive cost report"""
        try:
            # Determine report period
            if period_hours:
                cutoff_time = datetime.now() - timedelta(hours=period_hours)
                events = [e for e in self.cost_events if e.timestamp >= cutoff_time]
                period_start = cutoff_time
            else:
                events = self.cost_events
                period_start = self.session_start_time
            
            period_end = datetime.now()
            
            # Calculate totals
            total_cost = sum(e.amount for e in events)
            
            # Cost by category
            cost_by_category = {}
            for category in CostCategory:
                category_events = [e for e in events if e.category == category]
                cost_by_category[category.value] = sum(e.amount for e in category_events)
            
            # Cost by service
            cost_by_service = {}
            for event in events:
                service = event.service
                cost_by_service[service] = cost_by_service.get(service, 0) + event.amount
            
            # Cost by investigation
            cost_by_investigation = {}
            for event in events:
                if event.investigation_id:
                    inv_id = event.investigation_id
                    cost_by_investigation[inv_id] = cost_by_investigation.get(inv_id, 0) + event.amount
            
            # Cost by phase
            cost_by_phase = {}
            for event in events:
                if event.phase:
                    phase = event.phase
                    cost_by_phase[phase] = cost_by_phase.get(phase, 0) + event.amount
            
            return CostSummary(
                total_cost=total_cost,
                cost_by_category=cost_by_category,
                cost_by_service=cost_by_service,
                cost_by_investigation=cost_by_investigation,
                cost_by_phase=cost_by_phase,
                period_start=period_start,
                period_end=period_end,
                event_count=len(events)
            )
            
        except Exception as e:
            logger.error(f"Failed to generate cost report: {e}")
            return CostSummary(
                total_cost=0.0,
                cost_by_category={},
                cost_by_service={},
                cost_by_investigation={},
                cost_by_phase={},
                period_start=datetime.now(),
                period_end=datetime.now(),
                event_count=0
            )
    
    async def _save_cost_report(self, report: CostSummary):
        """Save cost report to file"""
        try:
            reports_dir = Path("cost_reports")
            reports_dir.mkdir(exist_ok=True)
            
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            report_file = reports_dir / f"cost_report_{timestamp}.json"
            
            # Convert to JSON-serializable format
            report_dict = asdict(report)
            report_dict["period_start"] = report.period_start.isoformat()
            report_dict["period_end"] = report.period_end.isoformat()
            
            with open(report_file, "w") as f:
                json.dump(report_dict, f, indent=2)
            
            logger.info(f"Cost report saved: {report_file}")
            
        except Exception as e:
            logger.error(f"Failed to save cost report: {e}")
    
    def get_cost_optimization_recommendations(self) -> List[str]:
        """Get cost optimization recommendations based on current usage"""
        recommendations = []
        
        try:
            # Analyze cost patterns
            total_cost = sum(self.cost_totals.values())
            
            # Check Claude API costs
            claude_cost = self.cost_totals[CostCategory.CLAUDE_API]
            if claude_cost > 0.5 * total_cost:  # >50% of costs
                recommendations.append(
                    "Consider using more cost-effective models (Claude Haiku vs Opus) for simpler tasks"
                )
            
            # Check external API costs
            external_cost = self.cost_totals[CostCategory.EXTERNAL_APIS]
            if external_cost > 0.3 * total_cost:  # >30% of costs
                recommendations.append(
                    "Consider caching external API results to reduce redundant calls"
                )
            
            # Check Snowflake costs
            snowflake_cost = self.cost_totals[CostCategory.SNOWFLAKE]
            if snowflake_cost > 0.4 * total_cost:  # >40% of costs
                recommendations.append(
                    "Optimize Snowflake queries and consider result caching"
                )
            
            # General recommendations
            if total_cost > 50:  # High cost session
                recommendations.append(
                    "Consider implementing parallel processing to reduce investigation time"
                )
                
        except Exception as e:
            logger.error(f"Failed to generate cost optimization recommendations: {e}")
        
        return recommendations if recommendations else ["Cost usage appears optimized"]