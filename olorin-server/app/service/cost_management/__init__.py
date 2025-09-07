"""
Cost Management Package

Provides comprehensive API cost management including credit monitoring,
model tier fallback, circuit breaker patterns, cost optimization,
and real-time tracking for the Olorin investigation system.

Author: Gil Klainert
Date: 2025-09-07
Plan: /docs/plans/2025-09-07-api-cost-management-system-plan.md
"""

from .anthropic_credit_monitor import (
    AnthropicCreditMonitor,
    CreditStatus,
    CreditBalance,
    CostEstimate,
    get_credit_monitor,
    shutdown_credit_monitor
)

from .model_tier_fallback import (
    ModelTierFallback,
    TaskComplexity,
    ModelTier,
    ModelSelection,
    get_model_fallback
)

from .api_circuit_breaker import (
    APICircuitBreaker,
    CircuitBreakerConfig,
    CircuitState,
    CircuitBreakerStats,
    APICircuitBreakerError,
    CircuitBreakerRegistry,
    get_circuit_breaker_registry,
    get_circuit_breaker
)

from .cost_optimization_framework import (
    CostOptimizationFramework,
    OptimizationStrategy,
    OptimizationResult,
    BudgetPeriod,
    BudgetAlert,
    get_cost_optimization
)

from .real_time_cost_tracker import (
    RealTimeCostTracker,
    AlertSeverity,
    MetricType,
    CostAlert,
    CostMetric,
    PerformanceSummary,
    get_cost_tracker,
    start_cost_tracking,
    stop_cost_tracking
)

__all__ = [
    # Credit Monitor
    'AnthropicCreditMonitor',
    'CreditStatus',
    'CreditBalance', 
    'CostEstimate',
    'get_credit_monitor',
    'shutdown_credit_monitor',
    
    # Model Fallback
    'ModelTierFallback',
    'TaskComplexity',
    'ModelTier',
    'ModelSelection',
    'get_model_fallback',
    
    # Circuit Breaker
    'APICircuitBreaker',
    'CircuitBreakerConfig',
    'CircuitState',
    'CircuitBreakerStats',
    'APICircuitBreakerError',
    'CircuitBreakerRegistry',
    'get_circuit_breaker_registry',
    'get_circuit_breaker',
    
    # Cost Optimization
    'CostOptimizationFramework',
    'OptimizationStrategy',
    'OptimizationResult',
    'BudgetPeriod',
    'BudgetAlert',
    'get_cost_optimization',
    
    # Real-time Tracking
    'RealTimeCostTracker',
    'AlertSeverity',
    'MetricType',
    'CostAlert',
    'CostMetric',
    'PerformanceSummary',
    'get_cost_tracker',
    'start_cost_tracking',
    'stop_cost_tracking'
]