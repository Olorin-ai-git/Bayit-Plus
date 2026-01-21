#!/usr/bin/env python3
"""
Verification Logger

Specialized logging system for LLM verification with structured logging,
audit trails, and performance tracking.

Author: Gil Klainert
Date: 2025-01-10
"""

import json
import logging
import time
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.service.logging import get_bridge_logger

from .verification_config import VerificationConfig, get_verification_config

# Get the bridge logger for consistent formatting
base_logger = get_bridge_logger(__name__)


@dataclass
class VerificationLogEntry:
    """Structured log entry for verification events."""

    timestamp: str
    event_type: str
    verification_id: str
    model_used: str
    original_request_hash: str
    response_hash: str
    verification_result: str
    confidence_score: float
    response_time_ms: int
    retry_count: int
    context: Dict[str, Any]
    error: Optional[str] = None


class VerificationLogger:
    """
    Specialized logger for verification system with audit capabilities.

    Features:
    - Structured logging with consistent format
    - Audit trail for compliance
    - Performance metrics logging
    - Error tracking and analysis
    - Cache hit/miss logging
    - Model usage statistics
    """

    def __init__(self, config: Optional[VerificationConfig] = None):
        """Initialize verification logger."""
        self.config = config or get_verification_config()
        self.logger = base_logger

        # Set logging level based on configuration
        log_level = getattr(logging, self.config.log_level.upper(), logging.INFO)
        self.logger.setLevel(log_level)

        # Audit log entries for potential file output
        self.audit_entries: List[VerificationLogEntry] = []
        self.max_audit_entries = 1000  # Keep last 1000 entries in memory

        # Performance tracking
        self.performance_stats = {
            "total_verifications": 0,
            "successful_verifications": 0,
            "failed_verifications": 0,
            "total_response_time_ms": 0,
            "total_retries": 0,
            "model_usage": {},
            "error_types": {},
        }

        self.logger.info("📝 Verification logger initialized")

    def log_verification_start(
        self,
        verification_id: str,
        model_used: str,
        original_request_hash: str,
        response_hash: str,
        context: Dict[str, Any] = None,
    ):
        """Log the start of a verification process."""
        self.logger.info(
            f"🔍 Starting verification {verification_id[:8]} with {model_used}",
            extra={
                "verification_id": verification_id,
                "model_used": model_used,
                "event_type": "verification_start",
                "request_hash": original_request_hash[:16],
                "response_hash": response_hash[:16],
                "context": context or {},
            },
        )

    def log_verification_success(
        self,
        verification_id: str,
        model_used: str,
        original_request_hash: str,
        response_hash: str,
        confidence_score: float,
        response_time_ms: int,
        retry_count: int = 0,
        context: Dict[str, Any] = None,
    ):
        """Log successful verification."""
        self.performance_stats["total_verifications"] += 1
        self.performance_stats["successful_verifications"] += 1
        self.performance_stats["total_response_time_ms"] += response_time_ms
        self.performance_stats["total_retries"] += retry_count
        self._update_model_usage(model_used)

        # Create audit entry
        audit_entry = VerificationLogEntry(
            timestamp=datetime.utcnow().isoformat(),
            event_type="verification_success",
            verification_id=verification_id,
            model_used=model_used,
            original_request_hash=original_request_hash,
            response_hash=response_hash,
            verification_result="valid",
            confidence_score=confidence_score,
            response_time_ms=response_time_ms,
            retry_count=retry_count,
            context=context or {},
        )
        self._add_audit_entry(audit_entry)

        self.logger.info(
            f"✅ Verification {verification_id[:8]} succeeded - "
            f"Confidence: {confidence_score:.2f}, Time: {response_time_ms}ms, Retries: {retry_count}",
            extra={
                "verification_id": verification_id,
                "model_used": model_used,
                "event_type": "verification_success",
                "confidence_score": confidence_score,
                "response_time_ms": response_time_ms,
                "retry_count": retry_count,
                "context": context or {},
            },
        )

    def log_verification_failure(
        self,
        verification_id: str,
        model_used: str,
        original_request_hash: str,
        response_hash: str,
        error: str,
        response_time_ms: int,
        retry_count: int = 0,
        context: Dict[str, Any] = None,
    ):
        """Log failed verification."""
        self.performance_stats["total_verifications"] += 1
        self.performance_stats["failed_verifications"] += 1
        self.performance_stats["total_response_time_ms"] += response_time_ms
        self.performance_stats["total_retries"] += retry_count
        self._update_model_usage(model_used)
        self._update_error_stats(error)

        # Create audit entry
        audit_entry = VerificationLogEntry(
            timestamp=datetime.utcnow().isoformat(),
            event_type="verification_failure",
            verification_id=verification_id,
            model_used=model_used,
            original_request_hash=original_request_hash,
            response_hash=response_hash,
            verification_result="failed",
            confidence_score=0.0,
            response_time_ms=response_time_ms,
            retry_count=retry_count,
            context=context or {},
            error=error,
        )
        self._add_audit_entry(audit_entry)

        self.logger.error(
            f"❌ Verification {verification_id[:8]} failed - "
            f"Error: {error}, Time: {response_time_ms}ms, Retries: {retry_count}",
            extra={
                "verification_id": verification_id,
                "model_used": model_used,
                "event_type": "verification_failure",
                "error": error,
                "response_time_ms": response_time_ms,
                "retry_count": retry_count,
                "context": context or {},
            },
        )

    def log_verification_retry(
        self,
        verification_id: str,
        attempt_number: int,
        reason: str,
        model_used: str,
        confidence_score: float = 0.0,
    ):
        """Log verification retry attempt."""
        self.logger.warning(
            f"🔄 Verification {verification_id[:8]} retry #{attempt_number} - "
            f"Reason: {reason} (confidence: {confidence_score:.2f})",
            extra={
                "verification_id": verification_id,
                "event_type": "verification_retry",
                "attempt_number": attempt_number,
                "reason": reason,
                "model_used": model_used,
                "confidence_score": confidence_score,
            },
        )

    def log_cache_hit(self, cache_key: str, source: str = "memory"):
        """Log cache hit event."""
        self.logger.debug(
            f"🎯 Cache hit ({source}): {cache_key[:16]}...",
            extra={
                "event_type": "cache_hit",
                "cache_key": cache_key[:16],
                "cache_source": source,
            },
        )

    def log_cache_miss(self, cache_key: str):
        """Log cache miss event."""
        self.logger.debug(
            f"💭 Cache miss: {cache_key[:16]}...",
            extra={"event_type": "cache_miss", "cache_key": cache_key[:16]},
        )

    def log_model_health_change(self, model: str, is_healthy: bool, reason: str = ""):
        """Log model health status changes."""
        status = "healthy" if is_healthy else "unhealthy"
        emoji = "✅" if is_healthy else "❌"

        self.logger.info(
            f"{emoji} Model {model} marked as {status}"
            + (f": {reason}" if reason else ""),
            extra={
                "event_type": "model_health_change",
                "model": model,
                "is_healthy": is_healthy,
                "reason": reason,
            },
        )

    def log_performance_metrics(self, metrics: Dict[str, Any]):
        """Log performance metrics."""
        self.logger.info(
            f"📊 Performance metrics - "
            f"Success rate: {metrics.get('success_rate', 0):.1%}, "
            f"Avg time: {metrics.get('avg_response_time_ms', 0):.0f}ms, "
            f"Cache hit rate: {metrics.get('cache_hit_rate', 0):.1%}",
            extra={"event_type": "performance_metrics", "metrics": metrics},
        )

    def log_configuration_change(self, setting: str, old_value: Any, new_value: Any):
        """Log configuration changes."""
        self.logger.info(
            f"⚙️  Configuration changed - {setting}: {old_value} → {new_value}",
            extra={
                "event_type": "configuration_change",
                "setting": setting,
                "old_value": old_value,
                "new_value": new_value,
            },
        )

    def log_system_event(self, event: str, details: Dict[str, Any] = None):
        """Log general system events."""
        self.logger.info(
            f"🔧 System event: {event}",
            extra={
                "event_type": "system_event",
                "event": event,
                "details": details or {},
            },
        )

    def log_security_event(self, event: str, details: Dict[str, Any] = None):
        """Log security-related events."""
        self.logger.warning(
            f"🔒 Security event: {event}",
            extra={
                "event_type": "security_event",
                "event": event,
                "details": details or {},
            },
        )

    def _update_model_usage(self, model: str):
        """Update model usage statistics."""
        if model not in self.performance_stats["model_usage"]:
            self.performance_stats["model_usage"][model] = 0
        self.performance_stats["model_usage"][model] += 1

    def _update_error_stats(self, error: str):
        """Update error type statistics."""
        # Categorize error types
        error_lower = error.lower()
        if "timeout" in error_lower:
            error_type = "timeout"
        elif "rate limit" in error_lower:
            error_type = "rate_limit"
        elif "api" in error_lower:
            error_type = "api_error"
        elif "parse" in error_lower or "json" in error_lower:
            error_type = "parsing_error"
        else:
            error_type = "unknown"

        if error_type not in self.performance_stats["error_types"]:
            self.performance_stats["error_types"][error_type] = 0
        self.performance_stats["error_types"][error_type] += 1

    def _add_audit_entry(self, entry: VerificationLogEntry):
        """Add entry to audit log."""
        self.audit_entries.append(entry)

        # Keep only last N entries to prevent memory issues
        if len(self.audit_entries) > self.max_audit_entries:
            self.audit_entries = self.audit_entries[-self.max_audit_entries :]

    def get_performance_summary(self) -> Dict[str, Any]:
        """Get performance statistics summary."""
        total = self.performance_stats["total_verifications"]
        if total == 0:
            return {"message": "No verifications performed yet"}

        success_rate = self.performance_stats["successful_verifications"] / total
        avg_response_time = self.performance_stats["total_response_time_ms"] / total
        avg_retries = self.performance_stats["total_retries"] / total

        return {
            "total_verifications": total,
            "success_rate": round(success_rate, 3),
            "failure_rate": round(1 - success_rate, 3),
            "avg_response_time_ms": round(avg_response_time, 1),
            "avg_retries": round(avg_retries, 2),
            "model_usage": dict(self.performance_stats["model_usage"]),
            "error_types": dict(self.performance_stats["error_types"]),
        }

    def get_recent_audit_entries(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get recent audit entries."""
        recent_entries = (
            self.audit_entries[-limit:]
            if limit < len(self.audit_entries)
            else self.audit_entries
        )
        return [asdict(entry) for entry in reversed(recent_entries)]

    def export_audit_log(self, file_path: Optional[str] = None) -> str:
        """Export audit log to JSON file."""
        if file_path is None:
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            file_path = f"verification_audit_{timestamp}.json"

        audit_data = {
            "export_timestamp": datetime.utcnow().isoformat(),
            "total_entries": len(self.audit_entries),
            "performance_summary": self.get_performance_summary(),
            "entries": [asdict(entry) for entry in self.audit_entries],
        }

        try:
            with open(file_path, "w") as f:
                json.dump(audit_data, f, indent=2)

            self.logger.info(f"📋 Audit log exported to: {file_path}")
            return file_path

        except Exception as e:
            self.logger.error(f"Failed to export audit log: {str(e)}")
            raise

    def health_check(self) -> Dict[str, Any]:
        """Perform health check on logging system."""
        return {
            "logger_healthy": True,
            "log_level": self.config.log_level,
            "audit_entries_count": len(self.audit_entries),
            "performance_stats_available": bool(self.performance_stats),
            "total_verifications_logged": self.performance_stats["total_verifications"],
        }

    def reset_performance_stats(self):
        """Reset performance statistics (useful for testing)."""
        self.performance_stats = {
            "total_verifications": 0,
            "successful_verifications": 0,
            "failed_verifications": 0,
            "total_response_time_ms": 0,
            "total_retries": 0,
            "model_usage": {},
            "error_types": {},
        }
        self.logger.info("🔄 Performance statistics reset")
