"""
Comprehensive Error Handling and Recovery for Hybrid Intelligence System

Provides centralized error handling, recovery strategies, and
graceful degradation for the hybrid system components.
"""

import traceback
from datetime import datetime
from enum import Enum
from typing import Any, Callable, Dict, List, Optional

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class ErrorSeverity(Enum):
    """Error severity levels"""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ErrorCategory(Enum):
    """Error category classification"""

    GRAPH_SELECTION = "graph_selection"
    FEATURE_FLAG = "feature_flag"
    STATE_VALIDATION = "state_validation"
    ROLLBACK_SYSTEM = "rollback_system"
    INTEGRATION = "integration"
    CONFIGURATION = "configuration"
    EXTERNAL_SERVICE = "external_service"
    SYSTEM_RESOURCE = "system_resource"


class ErrorContext:
    """Context information for error handling"""

    def __init__(
        self,
        investigation_id: Optional[str] = None,
        component: Optional[str] = None,
        operation: Optional[str] = None,
        user_context: Optional[Dict[str, Any]] = None,
    ):
        self.investigation_id = investigation_id
        self.component = component
        self.operation = operation
        self.user_context = user_context or {}
        self.timestamp = datetime.now()


class ErrorHandler:
    """
    Comprehensive error handling system for hybrid intelligence.

    Provides centralized error handling, recovery strategies,
    and graceful degradation mechanisms.
    """

    def __init__(self):
        self.error_handlers = {}
        self.recovery_strategies = {}
        self.error_history = []
        self.circuit_breakers = {}
        self.max_error_history = 1000

    def handle_error(
        self,
        error: Exception,
        category: ErrorCategory,
        severity: ErrorSeverity,
        context: ErrorContext,
        recovery_data: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Handle an error with appropriate recovery strategy.

        Args:
            error: The exception that occurred
            category: Category of the error
            severity: Severity level
            context: Error context information
            recovery_data: Data needed for recovery

        Returns:
            Dictionary with error handling results
        """

        logger.error(f"🚨 Error occurred in {category.value}: {str(error)}")
        logger.error(f"   Severity: {severity.value}")
        logger.error(f"   Investigation: {context.investigation_id}")
        logger.error(f"   Component: {context.component}")
        logger.error(f"   Operation: {context.operation}")

        try:
            # Record error
            error_record = self._create_error_record(error, category, severity, context)
            self._record_error(error_record)

            # Check circuit breaker
            if self._is_circuit_breaker_open(category):
                logger.warning(
                    f"🔌 Circuit breaker open for {category.value}, applying fallback"
                )
                return self._apply_circuit_breaker_fallback(category, context)

            # Apply recovery strategy
            recovery_result = self._apply_recovery_strategy(
                error, category, severity, context, recovery_data
            )

            # Update circuit breaker
            self._update_circuit_breaker(category, recovery_result["success"])

            return recovery_result

        except Exception as handler_error:
            logger.critical(f"🚨 Error handler failed: {str(handler_error)}")
            logger.critical(traceback.format_exc())

            # Last resort fallback
            return self._emergency_fallback(error, category, context)

    def register_error_handler(
        self, category: ErrorCategory, handler_function: Callable
    ):
        """
        Register custom error handler for a category.

        Args:
            category: Error category
            handler_function: Function to handle errors of this category
        """

        self.error_handlers[category] = handler_function
        logger.debug(f"🔧 Error handler registered: {category.value}")

    def register_recovery_strategy(
        self, category: ErrorCategory, strategy_function: Callable
    ):
        """
        Register recovery strategy for error category.

        Args:
            category: Error category
            strategy_function: Function implementing recovery strategy
        """

        self.recovery_strategies[category] = strategy_function
        logger.debug(f"🔧 Recovery strategy registered: {category.value}")

    def _create_error_record(
        self,
        error: Exception,
        category: ErrorCategory,
        severity: ErrorSeverity,
        context: ErrorContext,
    ) -> Dict[str, Any]:
        """Create standardized error record"""

        return {
            "error_id": f"{category.value}_{context.timestamp.strftime('%Y%m%d_%H%M%S_%f')}",
            "timestamp": context.timestamp.isoformat(),
            "category": category.value,
            "severity": severity.value,
            "error_type": type(error).__name__,
            "error_message": str(error),
            "traceback": traceback.format_exc(),
            "investigation_id": context.investigation_id,
            "component": context.component,
            "operation": context.operation,
            "user_context": context.user_context,
        }

    def _record_error(self, error_record: Dict[str, Any]):
        """Record error in history"""

        self.error_history.append(error_record)

        # Maintain history size limit
        if len(self.error_history) > self.max_error_history:
            self.error_history = self.error_history[-self.max_error_history :]

    def _apply_recovery_strategy(
        self,
        error: Exception,
        category: ErrorCategory,
        severity: ErrorSeverity,
        context: ErrorContext,
        recovery_data: Optional[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Apply appropriate recovery strategy"""

        # Use custom recovery strategy if registered
        if category in self.recovery_strategies:
            try:
                return self.recovery_strategies[category](
                    error, severity, context, recovery_data
                )
            except Exception as strategy_error:
                logger.error(
                    f"❌ Custom recovery strategy failed: {str(strategy_error)}"
                )

        # Apply default recovery strategies
        if category == ErrorCategory.GRAPH_SELECTION:
            return self._recover_graph_selection_error(error, context, recovery_data)
        elif category == ErrorCategory.FEATURE_FLAG:
            return self._recover_feature_flag_error(error, context, recovery_data)
        elif category == ErrorCategory.STATE_VALIDATION:
            return self._recover_state_validation_error(error, context, recovery_data)
        elif category == ErrorCategory.ROLLBACK_SYSTEM:
            return self._recover_rollback_system_error(error, context, recovery_data)
        elif category == ErrorCategory.INTEGRATION:
            return self._recover_integration_error(error, context, recovery_data)
        else:
            return self._default_recovery_strategy(error, category, context)

    def _recover_graph_selection_error(
        self,
        error: Exception,
        context: ErrorContext,
        recovery_data: Optional[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Recovery strategy for graph selection errors"""

        logger.warning(f"🔧 Applying graph selection recovery")

        try:
            # Fallback to clean graph
            recovery_result = {
                "success": True,
                "action": "fallback_to_clean_graph",
                "message": "Fell back to clean graph due to selection error",
                "fallback_graph_type": "clean",
            }

            logger.info(f"✅ Graph selection recovery successful")
            return recovery_result

        except Exception as recovery_error:
            logger.error(f"❌ Graph selection recovery failed: {str(recovery_error)}")
            return {
                "success": False,
                "action": "recovery_failed",
                "error": str(recovery_error),
            }

    def _recover_feature_flag_error(
        self,
        error: Exception,
        context: ErrorContext,
        recovery_data: Optional[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Recovery strategy for feature flag errors"""

        logger.warning(f"🔧 Applying feature flag recovery")

        try:
            # Default to conservative flag states
            recovery_result = {
                "success": True,
                "action": "use_default_flags",
                "message": "Used default feature flag states",
                "default_flags": {
                    "hybrid_graph_v1": False,  # Conservative default
                    "ab_test_hybrid_vs_clean": False,
                },
            }

            logger.info(f"✅ Feature flag recovery successful")
            return recovery_result

        except Exception as recovery_error:
            logger.error(f"❌ Feature flag recovery failed: {str(recovery_error)}")
            return {
                "success": False,
                "action": "recovery_failed",
                "error": str(recovery_error),
            }

    def _recover_state_validation_error(
        self,
        error: Exception,
        context: ErrorContext,
        recovery_data: Optional[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Recovery strategy for state validation errors"""

        logger.warning(f"🔧 Applying state validation recovery")

        try:
            # Initialize minimal valid state
            recovery_result = {
                "success": True,
                "action": "initialize_minimal_state",
                "message": "Initialized minimal valid state",
                "minimal_state": {
                    "investigation_id": context.investigation_id or "unknown",
                    "entity_value": "unknown",
                    "entity_type": "ip",
                    "status": "initialized",
                    "tool_results": {},
                    "analysis_complete": False,
                },
            }

            logger.info(f"✅ State validation recovery successful")
            return recovery_result

        except Exception as recovery_error:
            logger.error(f"❌ State validation recovery failed: {str(recovery_error)}")
            return {
                "success": False,
                "action": "recovery_failed",
                "error": str(recovery_error),
            }

    def _recover_rollback_system_error(
        self,
        error: Exception,
        context: ErrorContext,
        recovery_data: Optional[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Recovery strategy for rollback system errors"""

        logger.warning(f"🔧 Applying rollback system recovery")

        try:
            # Activate emergency rollback
            recovery_result = {
                "success": True,
                "action": "emergency_rollback",
                "message": "Activated emergency rollback to clean graph",
                "rollback_reason": f"Rollback system error: {str(error)}",
            }

            logger.info(f"✅ Rollback system recovery successful")
            return recovery_result

        except Exception as recovery_error:
            logger.error(f"❌ Rollback system recovery failed: {str(recovery_error)}")
            return {
                "success": False,
                "action": "recovery_failed",
                "error": str(recovery_error),
            }

    def _recover_integration_error(
        self,
        error: Exception,
        context: ErrorContext,
        recovery_data: Optional[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Recovery strategy for integration errors"""

        logger.warning(f"🔧 Applying integration recovery")

        try:
            # Use degraded mode
            recovery_result = {
                "success": True,
                "action": "degraded_mode",
                "message": "Operating in degraded mode without full integration",
                "degraded_features": ["service_hooks", "advanced_metrics"],
            }

            logger.info(f"✅ Integration recovery successful")
            return recovery_result

        except Exception as recovery_error:
            logger.error(f"❌ Integration recovery failed: {str(recovery_error)}")
            return {
                "success": False,
                "action": "recovery_failed",
                "error": str(recovery_error),
            }

    def _default_recovery_strategy(
        self, error: Exception, category: ErrorCategory, context: ErrorContext
    ) -> Dict[str, Any]:
        """Default recovery strategy for uncategorized errors"""

        logger.warning(f"🔧 Applying default recovery strategy for {category.value}")

        return {
            "success": False,
            "action": "no_recovery_available",
            "message": f"No specific recovery strategy for {category.value}",
            "recommendation": "Check error logs and implement specific recovery strategy",
        }

    def _is_circuit_breaker_open(self, category: ErrorCategory) -> bool:
        """Check if circuit breaker is open for category"""

        if category not in self.circuit_breakers:
            self.circuit_breakers[category] = {
                "failure_count": 0,
                "last_failure_time": None,
                "state": "closed",  # closed, open, half_open
            }

        breaker = self.circuit_breakers[category]

        # Simple circuit breaker logic
        if breaker["state"] == "open":
            # Check if enough time has passed to try half-open
            if breaker["last_failure_time"]:
                time_since_failure = datetime.now() - breaker["last_failure_time"]
                if time_since_failure.total_seconds() > 300:  # 5 minutes
                    breaker["state"] = "half_open"
                    return False
            return True

        return False

    def _update_circuit_breaker(self, category: ErrorCategory, success: bool):
        """Update circuit breaker state based on operation result"""

        if category not in self.circuit_breakers:
            return

        breaker = self.circuit_breakers[category]

        if success:
            breaker["failure_count"] = 0
            breaker["state"] = "closed"
        else:
            breaker["failure_count"] += 1
            breaker["last_failure_time"] = datetime.now()

            # Open circuit breaker after 5 failures
            if breaker["failure_count"] >= 5:
                breaker["state"] = "open"
                logger.warning(f"🔌 Circuit breaker opened for {category.value}")

    def _apply_circuit_breaker_fallback(
        self, category: ErrorCategory, context: ErrorContext
    ) -> Dict[str, Any]:
        """Apply fallback when circuit breaker is open"""

        return {
            "success": True,
            "action": "circuit_breaker_fallback",
            "message": f"Circuit breaker open for {category.value}, using fallback",
            "fallback_active": True,
        }

    def _emergency_fallback(
        self, error: Exception, category: ErrorCategory, context: ErrorContext
    ) -> Dict[str, Any]:
        """Emergency fallback when all recovery fails"""

        logger.critical(f"🚨 Emergency fallback activated for {category.value}")

        return {
            "success": False,
            "action": "emergency_fallback",
            "message": "All recovery strategies failed, system in emergency fallback mode",
            "original_error": str(error),
            "emergency_mode": True,
        }

    def get_error_statistics(self) -> Dict[str, Any]:
        """Get error handling statistics"""

        total_errors = len(self.error_history)

        if total_errors == 0:
            return {"total_errors": 0}

        # Count by category and severity
        category_counts = {}
        severity_counts = {}

        for error_record in self.error_history:
            category = error_record["category"]
            severity = error_record["severity"]

            category_counts[category] = category_counts.get(category, 0) + 1
            severity_counts[severity] = severity_counts.get(severity, 0) + 1

        return {
            "total_errors": total_errors,
            "category_distribution": category_counts,
            "severity_distribution": severity_counts,
            "circuit_breaker_states": {
                cat.value: breaker["state"]
                for cat, breaker in self.circuit_breakers.items()
            },
        }

    def clear_error_history(self, older_than_hours: int = 24):
        """Clear old error records"""

        cutoff_time = datetime.now() - timedelta(hours=older_than_hours)

        self.error_history = [
            record
            for record in self.error_history
            if datetime.fromisoformat(record["timestamp"]) >= cutoff_time
        ]

        logger.debug(f"🗑️ Cleared error history older than {older_than_hours} hours")
