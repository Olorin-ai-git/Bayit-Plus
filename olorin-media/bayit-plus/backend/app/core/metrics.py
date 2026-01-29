"""
Prometheus Metrics for Beta 500 Program

This module defines all Prometheus metrics for monitoring the Beta 500 closed beta program.
Metrics are exposed via /metrics endpoint and scraped by Prometheus.

Categories:
- Business Metrics: User counts, credit usage, session tracking
- Performance Metrics: Request latency, throughput
- Error Metrics: Transaction failures, timeout rates
- System Metrics: Resource usage (provided by node-exporter)

Usage:
    from app.core.metrics import (
        beta_active_users,
        beta_credits_deducted_total,
        record_credit_deduction
    )

    # Update gauge
    beta_active_users.set(count)

    # Increment counter
    beta_credits_deducted_total.labels(feature="live_dubbing").inc(credit_cost)

    # Record histogram
    with beta_api_request_duration.labels(endpoint="/beta/credits").time():
        # ... operation ...
"""

from prometheus_client import (
    Counter,
    Gauge,
    Histogram,
    Info,
    Summary,
    generate_latest,
    CONTENT_TYPE_LATEST,
)
from fastapi import Response
from typing import Optional
from datetime import datetime
from app.core.logging_config import get_logger

logger = get_logger(__name__)

# ============================================================================
# BETA 500 BUSINESS METRICS
# ============================================================================

# User Metrics
beta_active_users = Gauge(
    'beta_active_users',
    'Total number of active beta users (verified and not expired)'
)

beta_verified_users = Gauge(
    'beta_verified_users',
    'Number of beta users who have verified their email'
)

beta_unverified_users = Gauge(
    'beta_unverified_users',
    'Number of beta users pending email verification'
)

beta_signups_total = Counter(
    'beta_signups_total',
    'Total beta program signups',
    ['status']  # approved, waitlist, rejected
)

# Credit Metrics
beta_credits_allocated_total = Gauge(
    'beta_credits_allocated_total',
    'Total AI credits allocated to all beta users'
)

beta_credits_used_total = Gauge(
    'beta_credits_used_total',
    'Total AI credits consumed by all beta users'
)

beta_credits_remaining_total = Gauge(
    'beta_credits_remaining_total',
    'Total AI credits remaining across all beta users'
)

beta_credits_deducted_total = Counter(
    'beta_credits_deducted_total',
    'Total credits deducted (incremental)',
    ['feature']  # live_dubbing, ai_search, ai_recommendations
)

beta_user_remaining_credits = Gauge(
    'beta_user_remaining_credits',
    'Remaining credits for individual users',
    ['user_id']
)

beta_credits_expired_total = Counter(
    'beta_credits_expired_total',
    'Total credits expired due to beta period ending'
)

# Session Metrics
beta_active_sessions = Gauge(
    'beta_active_sessions',
    'Number of active dubbing sessions',
    ['status']  # active, paused, ended
)

beta_sessions_started_total = Counter(
    'beta_sessions_started_total',
    'Total dubbing sessions started',
    ['feature']
)

beta_sessions_ended_total = Counter(
    'beta_sessions_ended_total',
    'Total dubbing sessions ended',
    ['reason']  # completed, insufficient_credits, timeout, user_stopped, error
)

beta_session_duration_seconds = Histogram(
    'beta_session_duration_seconds',
    'Distribution of dubbing session durations',
    buckets=[10, 30, 60, 120, 300, 600, 1800, 3600, 7200]  # 10s to 2 hours
)

beta_sessions_timeout_total = Counter(
    'beta_sessions_timeout_total',
    'Total sessions ended due to timeout'
)

# Transaction Metrics
beta_credit_transactions_total = Counter(
    'beta_credit_transactions_total',
    'Total credit transactions',
    ['transaction_type']  # debit, credit, refund, expired
)

beta_credit_transaction_errors_total = Counter(
    'beta_credit_transaction_errors_total',
    'Credit transaction errors',
    ['error_type']  # insufficient_credits, race_condition, database_error
)

beta_transaction_retries_total = Counter(
    'beta_transaction_retries_total',
    'Total transaction retry attempts'
)

# Checkpoint Metrics
beta_checkpoint_lag_seconds = Gauge(
    'beta_checkpoint_lag_seconds',
    'Time since last checkpoint for active sessions',
    ['session_id']
)

beta_checkpoints_completed_total = Counter(
    'beta_checkpoints_completed_total',
    'Total checkpoint operations completed successfully'
)

beta_checkpoints_failed_total = Counter(
    'beta_checkpoints_failed_total',
    'Total checkpoint operations that failed',
    ['error_type']
)

# ============================================================================
# API PERFORMANCE METRICS
# ============================================================================

beta_api_requests_total = Counter(
    'beta_api_requests_total',
    'Total API requests to beta endpoints',
    ['method', 'endpoint', 'status']
)

beta_api_request_duration_seconds = Histogram(
    'beta_api_request_duration_seconds',
    'API request latency for beta endpoints',
    ['method', 'endpoint'],
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]
)

beta_api_errors_total = Counter(
    'beta_api_errors_total',
    'Total API errors',
    ['endpoint', 'error_type']
)

# ============================================================================
# BACKGROUND WORKER METRICS
# ============================================================================

beta_worker_runs_total = Counter(
    'beta_worker_runs_total',
    'Total background worker executions',
    ['worker_name']
)

beta_worker_duration_seconds = Histogram(
    'beta_worker_duration_seconds',
    'Background worker execution duration',
    ['worker_name'],
    buckets=[1, 5, 10, 30, 60, 120, 300]
)

beta_worker_errors_total = Counter(
    'beta_worker_errors_total',
    'Background worker errors',
    ['worker_name', 'error_type']
)

# ============================================================================
# EMAIL VERIFICATION METRICS
# ============================================================================

beta_verification_emails_sent_total = Counter(
    'beta_verification_emails_sent_total',
    'Total verification emails sent'
)

beta_verification_emails_failed_total = Counter(
    'beta_verification_emails_failed_total',
    'Failed verification email sends'
)

beta_verifications_completed_total = Counter(
    'beta_verifications_completed_total',
    'Total successful email verifications'
)

beta_verification_tokens_expired_total = Counter(
    'beta_verification_tokens_expired_total',
    'Total expired verification tokens'
)

# ============================================================================
# SYSTEM INFO
# ============================================================================

beta_program_info = Info(
    'beta_program_info',
    'Beta 500 program metadata'
)

# Set program info (called once at startup)
beta_program_info.info({
    'max_users': '500',
    'credits_per_user': '5000',
    'duration_days': '90',
    'start_date': datetime.utcnow().isoformat()
})

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def record_credit_deduction(
    user_id: str,
    feature: str,
    credit_cost: int,
    success: bool,
    error_type: Optional[str] = None
) -> None:
    """
    Record credit deduction metrics.

    Args:
        user_id: User ID
        feature: Feature name (live_dubbing, ai_search, etc.)
        credit_cost: Number of credits deducted
        success: Whether deduction succeeded
        error_type: Error type if failed (insufficient_credits, race_condition, etc.)
    """
    if success:
        beta_credits_deducted_total.labels(feature=feature).inc(credit_cost)
        beta_credit_transactions_total.labels(transaction_type='debit').inc()
        logger.info(
            "Credit deduction recorded",
            extra={
                "user_id": user_id,
                "feature": feature,
                "credit_cost": credit_cost,
                "success": True
            }
        )
    else:
        beta_credit_transaction_errors_total.labels(error_type=error_type).inc()
        logger.warning(
            "Credit deduction failed",
            extra={
                "user_id": user_id,
                "feature": feature,
                "credit_cost": credit_cost,
                "error_type": error_type
            }
        )


def record_session_metrics(
    session_id: str,
    status: str,
    duration_seconds: Optional[float] = None,
    end_reason: Optional[str] = None
) -> None:
    """
    Record session lifecycle metrics.

    Args:
        session_id: Unique session ID
        status: Session status (active, ended)
        duration_seconds: Total session duration (when ending)
        end_reason: Reason for session end (completed, insufficient_credits, etc.)
    """
    if status == 'started':
        beta_sessions_started_total.labels(feature='live_dubbing').inc()
        beta_active_sessions.labels(status='active').inc()
        logger.info(
            "Session started",
            extra={"session_id": session_id}
        )

    elif status == 'ended' and duration_seconds is not None:
        beta_active_sessions.labels(status='active').dec()
        beta_sessions_ended_total.labels(reason=end_reason).inc()
        beta_session_duration_seconds.observe(duration_seconds)

        if end_reason == 'timeout':
            beta_sessions_timeout_total.inc()

        logger.info(
            "Session ended",
            extra={
                "session_id": session_id,
                "duration_seconds": duration_seconds,
                "end_reason": end_reason
            }
        )


def record_api_metrics(
    method: str,
    endpoint: str,
    status_code: int,
    duration_seconds: float,
    error_type: Optional[str] = None
) -> None:
    """
    Record API request metrics.

    Args:
        method: HTTP method (GET, POST, etc.)
        endpoint: API endpoint path
        status_code: HTTP status code
        duration_seconds: Request duration
        error_type: Error type if failed
    """
    beta_api_requests_total.labels(
        method=method,
        endpoint=endpoint,
        status=str(status_code)
    ).inc()

    beta_api_request_duration_seconds.labels(
        method=method,
        endpoint=endpoint
    ).observe(duration_seconds)

    if status_code >= 400:
        beta_api_errors_total.labels(
            endpoint=endpoint,
            error_type=error_type or f"http_{status_code}"
        ).inc()


def record_checkpoint(
    session_id: str,
    lag_seconds: float,
    success: bool,
    error_type: Optional[str] = None
) -> None:
    """
    Record checkpoint operation metrics.

    Args:
        session_id: Session ID
        lag_seconds: Time since last checkpoint
        success: Whether checkpoint succeeded
        error_type: Error type if failed
    """
    beta_checkpoint_lag_seconds.labels(session_id=session_id).set(lag_seconds)

    if success:
        beta_checkpoints_completed_total.inc()
    else:
        beta_checkpoints_failed_total.labels(error_type=error_type).inc()


def record_worker_execution(
    worker_name: str,
    duration_seconds: float,
    success: bool,
    error_type: Optional[str] = None
) -> None:
    """
    Record background worker execution metrics.

    Args:
        worker_name: Name of background worker
        duration_seconds: Execution duration
        success: Whether execution succeeded
        error_type: Error type if failed
    """
    beta_worker_runs_total.labels(worker_name=worker_name).inc()
    beta_worker_duration_seconds.labels(worker_name=worker_name).observe(duration_seconds)

    if not success:
        beta_worker_errors_total.labels(
            worker_name=worker_name,
            error_type=error_type
        ).inc()


def update_user_metrics(
    active_count: int,
    verified_count: int,
    unverified_count: int
) -> None:
    """
    Update user count metrics (called periodically by background worker).

    Args:
        active_count: Number of active beta users
        verified_count: Number of verified users
        unverified_count: Number of unverified users
    """
    beta_active_users.set(active_count)
    beta_verified_users.set(verified_count)
    beta_unverified_users.set(unverified_count)


def update_credit_metrics(
    total_allocated: int,
    total_used: int,
    total_remaining: int
) -> None:
    """
    Update aggregate credit metrics.

    Args:
        total_allocated: Total credits allocated
        total_used: Total credits consumed
        total_remaining: Total credits remaining
    """
    beta_credits_allocated_total.set(total_allocated)
    beta_credits_used_total.set(total_used)
    beta_credits_remaining_total.set(total_remaining)


# ============================================================================
# METRICS ENDPOINT
# ============================================================================

async def metrics_endpoint() -> Response:
    """
    FastAPI endpoint to expose Prometheus metrics.

    Usage:
        @app.get("/metrics")
        async def metrics():
            return await metrics_endpoint()
    """
    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST
    )


# ============================================================================
# MIDDLEWARE FOR AUTOMATIC API METRICS
# ============================================================================

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
import time

class MetricsMiddleware(BaseHTTPMiddleware):
    """
    Middleware to automatically record API metrics for all requests.

    Tracks:
    - Request count by method, endpoint, status
    - Request duration
    - Error rates

    Usage:
        from app.core.metrics import MetricsMiddleware
        app.add_middleware(MetricsMiddleware)
    """

    async def dispatch(self, request: Request, call_next):
        # Skip metrics endpoint itself
        if request.url.path == "/metrics":
            return await call_next(request)

        # Record start time
        start_time = time.time()

        # Process request
        try:
            response = await call_next(request)
            duration = time.time() - start_time

            # Record metrics
            record_api_metrics(
                method=request.method,
                endpoint=request.url.path,
                status_code=response.status_code,
                duration_seconds=duration
            )

            return response

        except Exception as e:
            duration = time.time() - start_time

            # Record error metrics
            record_api_metrics(
                method=request.method,
                endpoint=request.url.path,
                status_code=500,
                duration_seconds=duration,
                error_type=type(e).__name__
            )

            raise


# ============================================================================
# STARTUP METRICS INITIALIZATION
# ============================================================================

def initialize_metrics():
    """
    Initialize metrics at application startup.
    Sets default values for gauges to avoid 'no data' in Grafana.
    """
    logger.info("Initializing Prometheus metrics for Beta 500 program")

    # Initialize user metrics to 0
    beta_active_users.set(0)
    beta_verified_users.set(0)
    beta_unverified_users.set(0)

    # Initialize credit metrics to 0
    beta_credits_allocated_total.set(0)
    beta_credits_used_total.set(0)
    beta_credits_remaining_total.set(0)

    # Initialize session metrics to 0
    beta_active_sessions.labels(status='active').set(0)
    beta_active_sessions.labels(status='paused').set(0)
    beta_active_sessions.labels(status='ended').set(0)

    logger.info("Beta 500 metrics initialized successfully")
