"""
Anthropic API Credit Monitoring Service

Provides real-time monitoring of Anthropic API credit balance and usage tracking
with integration to the Olorin investigation system.

Author: Gil Klainert
Date: 2025-09-07
Plan: /docs/plans/2025-09-07-api-cost-management-system-plan.md
"""

import asyncio
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, Optional, List, Tuple
from dataclasses import dataclass, asdict
from enum import Enum

import httpx
from fastapi import HTTPException

from ..config import get_settings_for_env
from ..logging.integration_bridge import get_bridge_logger


class CreditStatus(Enum):
    """API credit status levels"""
    HEALTHY = "healthy"
    WARNING = "warning"
    CRITICAL = "critical"
    EXHAUSTED = "exhausted"


@dataclass
class CreditBalance:
    """API credit balance information"""
    balance: float
    currency: str
    last_updated: datetime
    status: CreditStatus
    daily_usage: float
    weekly_usage: float
    monthly_usage: float


@dataclass
class CostEstimate:
    """Cost estimation for API requests"""
    input_tokens: int
    output_tokens: int
    model: str
    estimated_cost: float
    timestamp: datetime


class AnthropicCreditMonitor:
    """
    Monitors Anthropic API credit balance and tracks usage patterns
    for the Olorin investigation system.
    """
    
    # Model cost per 1K tokens (input, output)
    MODEL_COSTS = {
        "claude-opus-4-1-20250805": (0.015, 0.075),
        "claude-3-opus-20240229": (0.015, 0.075),
        "claude-3-sonnet-20240229": (0.003, 0.015),
        "claude-3-haiku-20240307": (0.00025, 0.00125),
    }
    
    # Budget thresholds
    DEFAULT_THRESHOLDS = {
        "daily_budget": 500.0,
        "weekly_budget": 2000.0,
        "monthly_budget": 8000.0,
        "warning_threshold": 0.8,  # 80% of budget
        "critical_threshold": 0.95,  # 95% of budget
        "minimum_balance": 50.0  # Minimum balance to continue operations
    }
    
    def __init__(self):
        self.config = get_settings_for_env()
        self.logger = get_bridge_logger("anthropic_credit_monitor", structured=True)
        self.api_key = self._get_api_key()
        
        # Configuration
        self.thresholds = self.DEFAULT_THRESHOLDS.copy()
        
        # Cache for balance information
        self._balance_cache: Optional[CreditBalance] = None
        self._cache_expiry: Optional[datetime] = None
        self._cache_duration = timedelta(minutes=5)  # 5-minute cache
        
        # Usage tracking
        self._daily_usage = 0.0
        self._weekly_usage = 0.0
        self._monthly_usage = 0.0
        self._usage_reset_dates = {
            "daily": datetime.now().date(),
            "weekly": datetime.now().date(),
            "monthly": datetime.now().date()
        }
        
        # HTTP client for API calls
        self._client = httpx.AsyncClient(
            timeout=httpx.Timeout(30.0),
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
                "x-api-key": self.api_key
            }
        )
        
        self.logger.info("Anthropic Credit Monitor initialized")
    
    def _get_api_key(self) -> str:
        """Get Anthropic API key from environment configuration"""
        api_key = getattr(self.config, 'anthropic_api_key_secret', None)
        if not api_key:
            # Try environment variable as fallback
            import os
            api_key = os.getenv('ANTHROPIC_API_KEY')
        
        if not api_key:
            raise ValueError("Anthropic API key not found in configuration or environment")
        
        return api_key
    
    async def get_credit_balance(self, force_refresh: bool = False) -> CreditBalance:
        """
        Get current API credit balance with caching
        
        Args:
            force_refresh: If True, bypass cache and fetch fresh data
            
        Returns:
            CreditBalance object with current balance information
        """
        # Check cache validity
        if not force_refresh and self._balance_cache and self._cache_expiry:
            if datetime.now() < self._cache_expiry:
                return self._balance_cache
        
        try:
            # Note: Anthropic doesn't have a direct balance API endpoint yet
            # This is a placeholder for when they add it, or we can implement
            # usage tracking based on rate limiting headers
            balance_data = await self._fetch_balance_from_api()
            
            # Update usage tracking
            self._update_usage_periods()
            
            # Determine status based on balance and usage
            status = self._determine_credit_status(balance_data["balance"])
            
            balance = CreditBalance(
                balance=balance_data["balance"],
                currency=balance_data.get("currency", "USD"),
                last_updated=datetime.now(),
                status=status,
                daily_usage=self._daily_usage,
                weekly_usage=self._weekly_usage,
                monthly_usage=self._monthly_usage
            )
            
            # Update cache
            self._balance_cache = balance
            self._cache_expiry = datetime.now() + self._cache_duration
            
            self.logger.info(
                "Credit balance updated",
                extra={
                    "balance": balance.balance,
                    "status": balance.status.value,
                    "daily_usage": balance.daily_usage,
                    "weekly_usage": balance.weekly_usage,
                    "monthly_usage": balance.monthly_usage
                }
            )
            
            return balance
            
        except Exception as e:
            self.logger.error(f"Failed to fetch credit balance: {e}")
            
            # Return cached data if available, otherwise estimate
            if self._balance_cache:
                return self._balance_cache
            
            # Return conservative estimate
            return CreditBalance(
                balance=0.0,
                currency="USD",
                last_updated=datetime.now(),
                status=CreditStatus.EXHAUSTED,
                daily_usage=self._daily_usage,
                weekly_usage=self._weekly_usage,
                monthly_usage=self._monthly_usage
            )
    
    async def _fetch_balance_from_api(self) -> Dict:
        """
        Fetch balance from Anthropic API
        
        Note: This is a placeholder implementation as Anthropic doesn't
        currently provide a balance endpoint. In practice, we track usage
        based on response headers and maintain estimates.
        """
        # Placeholder implementation - in reality we would:
        # 1. Track usage from response headers
        # 2. Maintain running balance estimates
        # 3. Use rate limit headers to infer remaining capacity
        
        # For now, return a mock response that would come from tracking
        return {
            "balance": 100.0,  # This would be calculated from usage tracking
            "currency": "USD"
        }
    
    def _determine_credit_status(self, balance: float) -> CreditStatus:
        """Determine credit status based on balance and thresholds"""
        if balance <= self.thresholds["minimum_balance"]:
            return CreditStatus.EXHAUSTED
        
        daily_budget = self.thresholds["daily_budget"]
        if self._daily_usage >= daily_budget * self.thresholds["critical_threshold"]:
            return CreditStatus.CRITICAL
        elif self._daily_usage >= daily_budget * self.thresholds["warning_threshold"]:
            return CreditStatus.WARNING
        
        return CreditStatus.HEALTHY
    
    def _update_usage_periods(self):
        """Update usage tracking periods (daily/weekly/monthly resets)"""
        now = datetime.now().date()
        
        # Reset daily usage
        if now > self._usage_reset_dates["daily"]:
            self._daily_usage = 0.0
            self._usage_reset_dates["daily"] = now
        
        # Reset weekly usage (assuming week starts on Monday)
        week_start = now - timedelta(days=now.weekday())
        if week_start > self._usage_reset_dates["weekly"]:
            self._weekly_usage = 0.0
            self._usage_reset_dates["weekly"] = week_start
        
        # Reset monthly usage
        month_start = now.replace(day=1)
        if month_start > self._usage_reset_dates["monthly"]:
            self._monthly_usage = 0.0
            self._usage_reset_dates["monthly"] = month_start
    
    async def estimate_request_cost(self, model: str, input_tokens: int, 
                                  output_tokens: int) -> CostEstimate:
        """
        Estimate cost for an API request
        
        Args:
            model: Model name
            input_tokens: Number of input tokens
            output_tokens: Number of output tokens (estimated)
            
        Returns:
            CostEstimate object with cost breakdown
        """
        if model not in self.MODEL_COSTS:
            # Use most expensive model as fallback
            model = "claude-opus-4-1-20250805"
            self.logger.warning(f"Unknown model, using fallback: {model}")
        
        input_cost_per_1k, output_cost_per_1k = self.MODEL_COSTS[model]
        
        input_cost = (input_tokens / 1000) * input_cost_per_1k
        output_cost = (output_tokens / 1000) * output_cost_per_1k
        total_cost = input_cost + output_cost
        
        estimate = CostEstimate(
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            model=model,
            estimated_cost=total_cost,
            timestamp=datetime.now()
        )
        
        self.logger.debug(
            "Cost estimated",
            extra={
                "model": model,
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "estimated_cost": total_cost
            }
        )
        
        return estimate
    
    async def validate_request_affordability(self, cost_estimate: CostEstimate) -> Tuple[bool, str]:
        """
        Validate if a request can be afforded within budget constraints
        
        Args:
            cost_estimate: Estimated cost for the request
            
        Returns:
            Tuple of (is_affordable, reason)
        """
        balance = await self.get_credit_balance()
        
        # Check absolute balance
        if balance.balance < cost_estimate.estimated_cost:
            return False, f"Insufficient balance: ${balance.balance:.4f} < ${cost_estimate.estimated_cost:.4f}"
        
        # Check minimum balance buffer
        if (balance.balance - cost_estimate.estimated_cost) < self.thresholds["minimum_balance"]:
            return False, f"Request would leave balance below minimum threshold: ${self.thresholds['minimum_balance']}"
        
        # Check daily budget
        if (self._daily_usage + cost_estimate.estimated_cost) > self.thresholds["daily_budget"]:
            return False, f"Request would exceed daily budget: ${self.thresholds['daily_budget']}"
        
        # Check weekly budget
        if (self._weekly_usage + cost_estimate.estimated_cost) > self.thresholds["weekly_budget"]:
            return False, f"Request would exceed weekly budget: ${self.thresholds['weekly_budget']}"
        
        # Check monthly budget
        if (self._monthly_usage + cost_estimate.estimated_cost) > self.thresholds["monthly_budget"]:
            return False, f"Request would exceed monthly budget: ${self.thresholds['monthly_budget']}"
        
        return True, "Request approved"
    
    async def track_request_usage(self, cost_estimate: CostEstimate, actual_tokens: Optional[Dict] = None):
        """
        Track actual usage after API request completion
        
        Args:
            cost_estimate: Original cost estimate
            actual_tokens: Actual token counts from API response (if available)
        """
        # Use actual tokens if provided, otherwise use estimate
        if actual_tokens:
            actual_cost = await self.estimate_request_cost(
                cost_estimate.model,
                actual_tokens.get("input_tokens", cost_estimate.input_tokens),
                actual_tokens.get("output_tokens", cost_estimate.output_tokens)
            )
            cost = actual_cost.estimated_cost
        else:
            cost = cost_estimate.estimated_cost
        
        # Update usage tracking
        self._daily_usage += cost
        self._weekly_usage += cost
        self._monthly_usage += cost
        
        self.logger.info(
            "API usage tracked",
            extra={
                "model": cost_estimate.model,
                "cost": cost,
                "daily_usage": self._daily_usage,
                "weekly_usage": self._weekly_usage,
                "monthly_usage": self._monthly_usage
            }
        )
        
        # Invalidate balance cache to force refresh
        self._cache_expiry = None
    
    async def get_usage_summary(self) -> Dict:
        """Get comprehensive usage summary"""
        balance = await self.get_credit_balance()
        
        return {
            "balance": asdict(balance),
            "thresholds": self.thresholds,
            "usage_percentages": {
                "daily": (self._daily_usage / self.thresholds["daily_budget"]) * 100,
                "weekly": (self._weekly_usage / self.thresholds["weekly_budget"]) * 100,
                "monthly": (self._monthly_usage / self.thresholds["monthly_budget"]) * 100,
            },
            "recommendations": self._generate_recommendations(balance)
        }
    
    def _generate_recommendations(self, balance: CreditBalance) -> List[str]:
        """Generate cost optimization recommendations"""
        recommendations = []
        
        if balance.status == CreditStatus.CRITICAL:
            recommendations.append("URGENT: Credit balance critically low - consider adding funds")
            recommendations.append("Enable emergency cost optimization mode")
            recommendations.append("Prioritize only critical investigations")
        
        elif balance.status == CreditStatus.WARNING:
            recommendations.append("WARNING: Approaching daily budget limit")
            recommendations.append("Consider using lower-cost models for non-critical tasks")
            recommendations.append("Review token usage patterns")
        
        daily_pct = (self._daily_usage / self.thresholds["daily_budget"]) * 100
        if daily_pct > 70:
            recommendations.append(f"Daily usage at {daily_pct:.1f}% - monitor closely")
        
        weekly_pct = (self._weekly_usage / self.thresholds["weekly_budget"]) * 100
        if weekly_pct > 80:
            recommendations.append(f"Weekly usage at {weekly_pct:.1f}% - consider budget increase")
        
        return recommendations
    
    def update_thresholds(self, **kwargs):
        """Update budget thresholds"""
        for key, value in kwargs.items():
            if key in self.thresholds:
                self.thresholds[key] = value
                self.logger.info(f"Updated threshold {key} to {value}")
    
    async def health_check(self) -> Dict:
        """Perform health check of the credit monitoring system"""
        try:
            balance = await self.get_credit_balance()
            
            return {
                "status": "healthy",
                "balance_status": balance.status.value,
                "balance": balance.balance,
                "last_updated": balance.last_updated.isoformat(),
                "cache_valid": self._cache_expiry and datetime.now() < self._cache_expiry
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "cache_valid": False
            }
    
    async def shutdown(self):
        """Cleanup resources"""
        if self._client:
            await self._client.aclose()
        
        self.logger.info("Anthropic Credit Monitor shutdown")


# Global instance
_credit_monitor: Optional[AnthropicCreditMonitor] = None


def get_credit_monitor() -> AnthropicCreditMonitor:
    """Get global credit monitor instance"""
    global _credit_monitor
    if _credit_monitor is None:
        _credit_monitor = AnthropicCreditMonitor()
    return _credit_monitor


async def shutdown_credit_monitor():
    """Shutdown global credit monitor"""
    global _credit_monitor
    if _credit_monitor:
        await _credit_monitor.shutdown()
        _credit_monitor = None