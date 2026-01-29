"""Prometheus metrics for payment flow monitoring.

This module defines Prometheus metrics for tracking:
- Signup flow metrics
- Payment conversion rates
- Payment pending queue size
- Webhook processing performance
"""
from prometheus_client import Counter, Gauge, Histogram

# ==========================================
# SIGNUP METRICS
# ==========================================

signup_started = Counter(
    "bayit_signup_started_total",
    "Total signup attempts",
    ["method"]  # local, google
)

signup_payment_required = Counter(
    "bayit_signup_payment_required_total",
    "Users directed to payment flow",
    ["plan_tier"]  # basic, premium, family
)

signup_payment_completed = Counter(
    "bayit_signup_payment_completed_total",
    "Users who completed payment",
    ["plan_tier"]  # basic, premium, family
)

signup_payment_abandoned = Counter(
    "bayit_signup_payment_abandoned_total",
    "Users who abandoned payment",
    ["plan_tier"]  # basic, premium, family
)

# ==========================================
# PAYMENT QUEUE METRICS
# ==========================================

payment_pending_queue_size = Gauge(
    "bayit_payment_pending_users",
    "Current number of users with payment_pending=True"
)

payment_pending_age_seconds = Histogram(
    "bayit_payment_pending_age_seconds",
    "Time users spend in payment_pending state",
    buckets=[60, 300, 600, 1800, 3600, 7200, 14400, 28800, 86400]  # 1m to 24h
)

# ==========================================
# WEBHOOK METRICS
# ==========================================

webhook_received = Counter(
    "bayit_webhook_received_total",
    "Total webhooks received from Stripe",
    ["event_type"]  # checkout.session.completed, etc.
)

webhook_processed = Counter(
    "bayit_webhook_processed_total",
    "Webhooks processed successfully",
    ["event_type"]
)

webhook_failed = Counter(
    "bayit_webhook_failed_total",
    "Webhooks that failed processing",
    ["event_type", "error_type"]
)

webhook_duplicate = Counter(
    "bayit_webhook_duplicate_total",
    "Duplicate webhooks rejected (idempotency)",
    ["event_type"]
)

webhook_processing_duration = Histogram(
    "bayit_webhook_processing_seconds",
    "Time to process Stripe webhook",
    ["event_type"],
    buckets=[0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0]  # 100ms to 30s
)

# ==========================================
# CHECKOUT SESSION METRICS
# ==========================================

checkout_session_created = Counter(
    "bayit_checkout_session_created_total",
    "Checkout sessions created",
    ["plan_tier"]
)

checkout_session_failed = Counter(
    "bayit_checkout_session_failed_total",
    "Checkout session creation failures",
    ["plan_tier", "error_type"]
)

# ==========================================
# CONVERSION METRICS
# ==========================================

payment_conversion_rate = Gauge(
    "bayit_payment_conversion_rate",
    "Payment conversion rate (completed / required)",
    ["time_window"]  # 1h, 6h, 24h
)

payment_time_to_complete_seconds = Histogram(
    "bayit_payment_time_to_complete_seconds",
    "Time from signup to payment completion",
    buckets=[60, 300, 600, 1800, 3600, 7200, 14400, 28800, 86400, 604800]  # 1m to 7d
)

# ==========================================
# ACCESS CONTROL METRICS
# ==========================================

payment_pending_blocks = Counter(
    "bayit_payment_pending_blocks_total",
    "Content access attempts blocked by payment_pending",
    ["endpoint"]
)

payment_pending_polls = Counter(
    "bayit_payment_status_polls_total",
    "Payment status polling requests"
)


def record_signup_started(method: str = "local"):
    """Record a signup attempt."""
    signup_started.labels(method=method).inc()


def record_payment_required(plan_tier: str):
    """Record user directed to payment flow."""
    signup_payment_required.labels(plan_tier=plan_tier).inc()


def record_payment_completed(plan_tier: str, time_to_complete_seconds: float):
    """Record successful payment completion."""
    signup_payment_completed.labels(plan_tier=plan_tier).inc()
    payment_time_to_complete_seconds.observe(time_to_complete_seconds)


def record_payment_abandoned(plan_tier: str):
    """Record abandoned payment."""
    signup_payment_abandoned.labels(plan_tier=plan_tier).inc()


def record_webhook_received(event_type: str):
    """Record webhook received."""
    webhook_received.labels(event_type=event_type).inc()


def record_webhook_processed(event_type: str, duration_seconds: float):
    """Record successful webhook processing."""
    webhook_processed.labels(event_type=event_type).inc()
    webhook_processing_duration.labels(event_type=event_type).observe(duration_seconds)


def record_webhook_failed(event_type: str, error_type: str):
    """Record webhook processing failure."""
    webhook_failed.labels(event_type=event_type, error_type=error_type).inc()


def record_webhook_duplicate(event_type: str):
    """Record duplicate webhook (idempotency)."""
    webhook_duplicate.labels(event_type=event_type).inc()


def record_checkout_session_created(plan_tier: str):
    """Record checkout session created."""
    checkout_session_created.labels(plan_tier=plan_tier).inc()


def record_checkout_session_failed(plan_tier: str, error_type: str):
    """Record checkout session failure."""
    checkout_session_failed.labels(plan_tier=plan_tier, error_type=error_type).inc()


def record_payment_pending_block(endpoint: str):
    """Record content access blocked by payment_pending."""
    payment_pending_blocks.labels(endpoint=endpoint).inc()


def record_payment_status_poll():
    """Record payment status polling request."""
    payment_pending_polls.inc()
