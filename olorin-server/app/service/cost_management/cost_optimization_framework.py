"""
Cost Optimization Framework

Provides comprehensive cost optimization strategies including request batching,
token usage optimization, intelligent caching, and budget management for the
Olorin investigation system.

Author: Gil Klainert
Date: 2025-09-07  
Plan: /docs/plans/2025-09-07-api-cost-management-system-plan.md
"""

import asyncio
import hashlib
import json
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple, Callable
from dataclasses import dataclass, asdict
from enum import Enum
import logging

from .anthropic_credit_monitor import get_credit_monitor, CostEstimate
from .model_tier_fallback import get_model_fallback, ModelSelection
from .api_circuit_breaker import get_circuit_breaker, CircuitBreakerConfig
from ..logging.integration_bridge import get_bridge_logger


class OptimizationStrategy(Enum):
    """Available optimization strategies"""
    BATCH_REQUESTS = "batch_requests"
    CACHE_RESPONSES = "cache_responses"
    TOKEN_COMPRESSION = "token_compression"
    MODEL_DOWNGRADE = "model_downgrade"
    REQUEST_DEDUPLICATION = "request_deduplication"
    PARALLEL_PROCESSING = "parallel_processing"
    LAZY_EVALUATION = "lazy_evaluation"


class BudgetPeriod(Enum):
    """Budget tracking periods"""
    HOURLY = "hourly"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"


@dataclass
class OptimizationResult:
    """Result of optimization process"""
    original_cost: float
    optimized_cost: float
    savings: float
    strategies_applied: List[OptimizationStrategy]
    quality_impact: float = 0.0  # 0.0 = no impact, 1.0 = major impact
    performance_impact: float = 0.0  # Positive = slower, negative = faster
    metadata: Dict[str, Any] = None


@dataclass
class BudgetAlert:
    """Budget threshold alert"""
    period: BudgetPeriod
    threshold_type: str  # 'warning', 'critical', 'exceeded'
    current_usage: float
    budget_limit: float
    percentage_used: float
    time_remaining: timedelta
    recommended_actions: List[str]


@dataclass
class CacheEntry:
    """Cache entry for request results"""
    key: str
    result: Any
    cost: float
    timestamp: datetime
    hits: int = 0
    model_used: str = ""
    ttl_seconds: float = 3600.0  # 1 hour default TTL


class CostOptimizationFramework:
    """
    Comprehensive cost optimization framework that applies various strategies
    to minimize API costs while maintaining investigation quality.
    """
    
    def __init__(self):
        self.logger = get_bridge_logger("cost_optimization", structured=True)
        self.credit_monitor = get_credit_monitor()
        self.model_fallback = get_model_fallback()
        
        # Optimization configuration
        self.optimization_enabled = True
        self.active_strategies = set(OptimizationStrategy)
        self.cache_enabled = True
        self.batch_enabled = True
        self.max_batch_size = 5
        self.cache_ttl_seconds = 3600  # 1 hour
        
        # Budget configuration
        self.budget_limits = {
            BudgetPeriod.HOURLY: 25.0,    # $25/hour
            BudgetPeriod.DAILY: 500.0,    # $500/day  
            BudgetPeriod.WEEKLY: 2000.0,  # $2000/week
            BudgetPeriod.MONTHLY: 8000.0  # $8000/month
        }
        
        self.budget_thresholds = {
            'warning': 0.8,   # 80%
            'critical': 0.95  # 95%
        }
        
        # Cache management
        self.request_cache: Dict[str, CacheEntry] = {}
        self.cache_stats = {
            'hits': 0,
            'misses': 0,
            'evictions': 0,
            'savings': 0.0
        }
        
        # Batch processing
        self.batch_queue: List[Tuple[str, Callable, tuple, dict]] = []
        self.batch_processing = False
        
        # Usage tracking
        self.usage_by_period = {period: 0.0 for period in BudgetPeriod}
        self.usage_reset_times = {
            period: self._get_next_reset_time(period) for period in BudgetPeriod
        }
        
        # Optimization statistics
        self.optimization_stats = {
            'total_requests': 0,
            'optimized_requests': 0,
            'total_savings': 0.0,
            'strategies_used': {strategy: 0 for strategy in OptimizationStrategy}
        }
        
        self.logger.info("Cost Optimization Framework initialized")
    
    async def optimize_request(self, 
                              task_type: str,
                              prompt: str,
                              preferred_model: str,
                              max_tokens: int = 4096,
                              metadata: Optional[Dict] = None) -> Tuple[ModelSelection, OptimizationResult]:
        """
        Optimize an API request using available strategies
        
        Args:
            task_type: Type of task for complexity analysis
            prompt: Input prompt text
            preferred_model: Preferred model name
            max_tokens: Maximum tokens for response
            metadata: Additional request metadata
            
        Returns:
            Tuple of (ModelSelection, OptimizationResult)
        """
        self.optimization_stats['total_requests'] += 1
        original_cost = await self._estimate_original_cost(preferred_model, prompt, max_tokens)
        
        # Check budget constraints first
        await self._check_budget_constraints(original_cost)
        
        # Apply optimization strategies
        optimization_result = OptimizationResult(
            original_cost=original_cost,
            optimized_cost=original_cost,
            savings=0.0,
            strategies_applied=[],
            metadata=metadata or {}
        )
        
        # Strategy 1: Check cache for deduplication
        if OptimizationStrategy.REQUEST_DEDUPLICATION in self.active_strategies:
            cached_result = await self._check_request_cache(prompt, task_type)
            if cached_result:
                optimization_result.optimized_cost = 0.0  # Cache hit costs nothing
                optimization_result.savings = original_cost
                optimization_result.strategies_applied.append(OptimizationStrategy.REQUEST_DEDUPLICATION)
                self.cache_stats['hits'] += 1
                self.cache_stats['savings'] += original_cost
                
                self.logger.info("Request served from cache", extra={
                    'task_type': task_type,
                    'savings': original_cost,
                    'cache_key': cached_result.key[:32]
                })
                
                # Return cached model selection
                model_selection = ModelSelection(
                    selected_model=cached_result.model_used,
                    tier=self.model_fallback.MODEL_CONFIGS[cached_result.model_used].tier,
                    max_tokens=max_tokens,
                    estimated_cost=0.0,
                    fallback_reason="Served from cache"
                )
                
                return model_selection, optimization_result
        
        # Strategy 2: Token compression
        if OptimizationStrategy.TOKEN_COMPRESSION in self.active_strategies:
            compressed_prompt, compression_ratio = await self._compress_prompt(prompt)
            if compression_ratio > 0.1:  # At least 10% reduction
                prompt = compressed_prompt
                optimization_result.strategies_applied.append(OptimizationStrategy.TOKEN_COMPRESSION)
                self.logger.debug(f"Prompt compressed by {compression_ratio:.1%}")
        
        # Strategy 3: Model selection optimization
        estimated_tokens = len(prompt.split()) * 1.3  # Rough token estimation
        model_selection = await self.model_fallback.select_model(
            task_type, int(estimated_tokens), preferred_model
        )
        
        if model_selection.selected_model != preferred_model:
            optimization_result.strategies_applied.append(OptimizationStrategy.MODEL_DOWNGRADE)
            cost_difference = original_cost - model_selection.estimated_cost
            optimization_result.savings += cost_difference
            optimization_result.quality_impact = model_selection.quality_impact
        
        optimization_result.optimized_cost = model_selection.estimated_cost
        optimization_result.savings = optimization_result.original_cost - optimization_result.optimized_cost
        
        # Update statistics
        if optimization_result.savings > 0:
            self.optimization_stats['optimized_requests'] += 1
            self.optimization_stats['total_savings'] += optimization_result.savings
            
            for strategy in optimization_result.strategies_applied:
                self.optimization_stats['strategies_used'][strategy] += 1
        
        self.logger.info("Request optimized", extra={
            'task_type': task_type,
            'original_cost': original_cost,
            'optimized_cost': optimization_result.optimized_cost,
            'savings': optimization_result.savings,
            'strategies': [s.value for s in optimization_result.strategies_applied]
        })
        
        return model_selection, optimization_result
    
    async def _estimate_original_cost(self, model: str, prompt: str, max_tokens: int) -> float:
        """Estimate cost for original unoptimized request"""
        input_tokens = len(prompt.split()) * 1.3  # Rough estimation
        cost_estimate = await self.credit_monitor.estimate_request_cost(
            model, int(input_tokens), max_tokens
        )
        return cost_estimate.estimated_cost
    
    async def _check_request_cache(self, prompt: str, task_type: str) -> Optional[CacheEntry]:
        """Check if request result is cached"""
        if not self.cache_enabled:
            return None
        
        # Create cache key from prompt and task type
        cache_key = self._generate_cache_key(prompt, task_type)
        
        # Check if entry exists and is not expired
        if cache_key in self.request_cache:
            entry = self.request_cache[cache_key]
            age = (datetime.now() - entry.timestamp).total_seconds()
            
            if age <= entry.ttl_seconds:
                entry.hits += 1
                return entry
            else:
                # Remove expired entry
                del self.request_cache[cache_key]
                self.cache_stats['evictions'] += 1
        
        self.cache_stats['misses'] += 1
        return None
    
    def _generate_cache_key(self, prompt: str, task_type: str) -> str:
        """Generate cache key for request"""
        content = f"{task_type}:{prompt}"
        return hashlib.sha256(content.encode()).hexdigest()
    
    async def _compress_prompt(self, prompt: str) -> Tuple[str, float]:
        """
        Compress prompt by removing redundant information
        
        Returns:
            Tuple of (compressed_prompt, compression_ratio)
        """
        original_length = len(prompt)
        
        # Simple compression strategies
        compressed = prompt
        
        # Remove extra whitespace
        compressed = ' '.join(compressed.split())
        
        # Remove common filler words in technical contexts
        filler_words = [
            'please', 'kindly', 'could you', 'would you',
            'I would like', 'I need you to', 'Can you'
        ]
        
        for filler in filler_words:
            compressed = compressed.replace(filler, '')
        
        # Clean up double spaces
        while '  ' in compressed:
            compressed = compressed.replace('  ', ' ')
        
        compressed = compressed.strip()
        
        if len(compressed) < original_length * 0.5:
            # Compression too aggressive, might lose meaning
            compression_ratio = 0.0
            return prompt, compression_ratio
        
        compression_ratio = 1.0 - (len(compressed) / original_length)
        return compressed, compression_ratio
    
    async def _check_budget_constraints(self, estimated_cost: float):
        """Check if request fits within budget constraints"""
        await self._update_usage_tracking()
        
        alerts = []
        
        for period in BudgetPeriod:
            current_usage = self.usage_by_period[period]
            budget_limit = self.budget_limits[period]
            
            if current_usage + estimated_cost > budget_limit:
                # Would exceed budget
                percentage = ((current_usage + estimated_cost) / budget_limit) * 100
                
                alert = BudgetAlert(
                    period=period,
                    threshold_type='exceeded',
                    current_usage=current_usage,
                    budget_limit=budget_limit,
                    percentage_used=percentage,
                    time_remaining=self._get_time_until_reset(period),
                    recommended_actions=[
                        f"Request would exceed {period.value} budget",
                        "Consider using a lower-cost model",
                        "Batch with other requests",
                        "Defer non-critical requests"
                    ]
                )
                alerts.append(alert)
            
            elif current_usage / budget_limit >= self.budget_thresholds['critical']:
                # Critical threshold
                alert = BudgetAlert(
                    period=period,
                    threshold_type='critical',
                    current_usage=current_usage,
                    budget_limit=budget_limit,
                    percentage_used=(current_usage / budget_limit) * 100,
                    time_remaining=self._get_time_until_reset(period),
                    recommended_actions=[
                        f"{period.value.title()} budget at critical level",
                        "Enable economy mode",
                        "Prioritize essential requests only"
                    ]
                )
                alerts.append(alert)
            
            elif current_usage / budget_limit >= self.budget_thresholds['warning']:
                # Warning threshold
                alert = BudgetAlert(
                    period=period,
                    threshold_type='warning',
                    current_usage=current_usage,
                    budget_limit=budget_limit,
                    percentage_used=(current_usage / budget_limit) * 100,
                    time_remaining=self._get_time_until_reset(period),
                    recommended_actions=[
                        f"{period.value.title()} budget approaching limit",
                        "Monitor usage closely",
                        "Consider cost optimization"
                    ]
                )
                alerts.append(alert)
        
        # Log alerts
        for alert in alerts:
            if alert.threshold_type == 'exceeded':
                self.logger.error("Budget exceeded", extra=asdict(alert))
            elif alert.threshold_type == 'critical':
                self.logger.warning("Budget critical", extra=asdict(alert))
            else:
                self.logger.info("Budget warning", extra=asdict(alert))
        
        return alerts
    
    async def _update_usage_tracking(self):
        """Update usage tracking for all periods"""
        now = datetime.now()
        
        for period in BudgetPeriod:
            if now >= self.usage_reset_times[period]:
                # Reset usage for this period
                self.usage_by_period[period] = 0.0
                self.usage_reset_times[period] = self._get_next_reset_time(period)
                
                self.logger.info(f"{period.value.title()} usage reset")
    
    def _get_next_reset_time(self, period: BudgetPeriod) -> datetime:
        """Get next reset time for a budget period"""
        now = datetime.now()
        
        if period == BudgetPeriod.HOURLY:
            return now.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
        elif period == BudgetPeriod.DAILY:
            return now.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
        elif period == BudgetPeriod.WEEKLY:
            days_until_monday = (7 - now.weekday()) % 7
            if days_until_monday == 0:
                days_until_monday = 7
            return now.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=days_until_monday)
        elif period == BudgetPeriod.MONTHLY:
            if now.month == 12:
                return now.replace(year=now.year + 1, month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
            else:
                return now.replace(month=now.month + 1, day=1, hour=0, minute=0, second=0, microsecond=0)
        
        return now + timedelta(days=1)  # Default fallback
    
    def _get_time_until_reset(self, period: BudgetPeriod) -> timedelta:
        """Get time until next budget reset"""
        return self.usage_reset_times[period] - datetime.now()
    
    async def track_actual_usage(self, cost: float):
        """Track actual API usage cost"""
        await self._update_usage_tracking()
        
        for period in BudgetPeriod:
            self.usage_by_period[period] += cost
        
        self.logger.debug(f"Tracked usage: ${cost:.4f}")
    
    def cache_response(self, prompt: str, task_type: str, result: Any, 
                      cost: float, model_used: str, ttl_seconds: Optional[float] = None):
        """Cache a response for future use"""
        if not self.cache_enabled:
            return
        
        cache_key = self._generate_cache_key(prompt, task_type)
        
        entry = CacheEntry(
            key=cache_key,
            result=result,
            cost=cost,
            timestamp=datetime.now(),
            model_used=model_used,
            ttl_seconds=ttl_seconds or self.cache_ttl_seconds
        )
        
        self.request_cache[cache_key] = entry
        
        # Cleanup old entries if cache is too large - non-async cleanup
        if len(self.request_cache) > 1000:  # Max cache size
            self._cleanup_cache_sync()
    
    def _cleanup_cache_sync(self):
        """Clean up expired cache entries (synchronous version)"""
        now = datetime.now()
        expired_keys = []
        
        for key, entry in self.request_cache.items():
            age = (now - entry.timestamp).total_seconds()
            if age > entry.ttl_seconds:
                expired_keys.append(key)
        
        for key in expired_keys:
            del self.request_cache[key]
            self.cache_stats['evictions'] += 1
        
        self.logger.debug(f"Cleaned up {len(expired_keys)} expired cache entries")

    async def _cleanup_cache(self):
        """Clean up expired cache entries"""
        now = datetime.now()
        expired_keys = []
        
        for key, entry in self.request_cache.items():
            age = (now - entry.timestamp).total_seconds()
            if age > entry.ttl_seconds:
                expired_keys.append(key)
        
        for key in expired_keys:
            del self.request_cache[key]
            self.cache_stats['evictions'] += 1
        
        self.logger.debug(f"Cleaned up {len(expired_keys)} expired cache entries")
    
    def get_optimization_stats(self) -> Dict[str, Any]:
        """Get comprehensive optimization statistics"""
        total_requests = self.optimization_stats['total_requests']
        optimization_rate = (
            self.optimization_stats['optimized_requests'] / total_requests * 100
            if total_requests > 0 else 0
        )
        
        cache_hit_rate = (
            self.cache_stats['hits'] / (self.cache_stats['hits'] + self.cache_stats['misses']) * 100
            if (self.cache_stats['hits'] + self.cache_stats['misses']) > 0 else 0
        )
        
        return {
            'optimization': {
                'total_requests': total_requests,
                'optimized_requests': self.optimization_stats['optimized_requests'],
                'optimization_rate_percent': optimization_rate,
                'total_savings': self.optimization_stats['total_savings'],
                'average_savings_per_request': (
                    self.optimization_stats['total_savings'] / total_requests
                    if total_requests > 0 else 0
                ),
                'strategies_used': self.optimization_stats['strategies_used']
            },
            'cache': {
                'enabled': self.cache_enabled,
                'entries': len(self.request_cache),
                'hits': self.cache_stats['hits'],
                'misses': self.cache_stats['misses'],
                'hit_rate_percent': cache_hit_rate,
                'evictions': self.cache_stats['evictions'],
                'total_savings': self.cache_stats['savings']
            },
            'budget': {
                'limits': {period.value: limit for period, limit in self.budget_limits.items()},
                'current_usage': {period.value: usage for period, usage in self.usage_by_period.items()},
                'utilization_percent': {
                    period.value: (usage / self.budget_limits[period] * 100)
                    for period, usage in self.usage_by_period.items()
                }
            }
        }
    
    def configure_budgets(self, **kwargs):
        """Update budget limits"""
        for period_name, limit in kwargs.items():
            try:
                period = BudgetPeriod(period_name)
                self.budget_limits[period] = float(limit)
                self.logger.info(f"Updated {period.value} budget to ${limit}")
            except (ValueError, KeyError):
                self.logger.warning(f"Invalid budget period: {period_name}")
    
    def enable_strategy(self, strategy: OptimizationStrategy):
        """Enable an optimization strategy"""
        self.active_strategies.add(strategy)
        self.logger.info(f"Enabled optimization strategy: {strategy.value}")
    
    def disable_strategy(self, strategy: OptimizationStrategy):
        """Disable an optimization strategy"""
        self.active_strategies.discard(strategy)
        self.logger.info(f"Disabled optimization strategy: {strategy.value}")
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform health check of optimization framework"""
        try:
            stats = self.get_optimization_stats()
            
            return {
                'status': 'healthy',
                'optimization_enabled': self.optimization_enabled,
                'active_strategies': [s.value for s in self.active_strategies],
                'cache_enabled': self.cache_enabled,
                'cache_size': len(self.request_cache),
                'recent_stats': stats
            }
        except Exception as e:
            return {
                'status': 'unhealthy',
                'error': str(e),
                'optimization_enabled': self.optimization_enabled
            }


# Global instance
_cost_optimization: Optional[CostOptimizationFramework] = None


def get_cost_optimization() -> CostOptimizationFramework:
    """Get global cost optimization framework instance"""
    global _cost_optimization
    if _cost_optimization is None:
        _cost_optimization = CostOptimizationFramework()
    return _cost_optimization