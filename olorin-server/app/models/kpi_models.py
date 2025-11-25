"""
KPI Dashboard Models
Feature: KPI Dashboard Microservice

Database models for fraud detection KPIs including:
- Daily metrics aggregation
- Threshold sweep analysis
- Model performance tracking
"""

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.persistence.database import Base
from app.persistence.models import TimestampMixin


class KPIDailyMetrics(Base, TimestampMixin):
    """
    Daily aggregated KPI metrics for fraud detection.

    Computed nightly from events, labels, and scores tables.
    """

    __tablename__ = "kpi_daily_metrics"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    pilot_id = Column(String, nullable=False, index=True)
    tenant_id = Column(String, nullable=False, index=True)
    metric_date = Column(DateTime(timezone=True), nullable=False, index=True)

    # Quality Metrics
    precision = Column(Float, nullable=True)
    recall = Column(Float, nullable=True)  # Also called capture rate
    fpr = Column(Float, nullable=True)  # False Positive Rate
    pr_auc = Column(Float, nullable=True)  # Precision-Recall AUC

    # Confusion Matrix Counts
    true_positives = Column(Integer, nullable=False, default=0)
    false_positives = Column(Integer, nullable=False, default=0)
    true_negatives = Column(Integer, nullable=False, default=0)
    false_negatives = Column(Integer, nullable=False, default=0)

    # Business Impact Metrics
    fraud_amount_avoided = Column(Float, nullable=True)  # $ fraud avoided
    false_positive_cost = Column(Float, nullable=True)  # $ cost of false positives
    net_savings = Column(Float, nullable=True)  # Net savings/ROI
    roi_percentage = Column(Float, nullable=True)

    # Operational Metrics
    approval_rate = Column(Float, nullable=True)
    review_rate = Column(Float, nullable=True)
    decline_rate = Column(Float, nullable=True)
    latency_p95 = Column(Float, nullable=True)  # p95 latency in ms
    error_rate = Column(Float, nullable=True)
    drift_psi = Column(Float, nullable=True)  # Population Stability Index

    # Model Version
    model_version = Column(String, nullable=True, index=True)

    # Label Maturity Window (days)
    label_maturity_days = Column(Integer, nullable=False, default=45)

    # Metadata
    total_events = Column(Integer, nullable=False, default=0)
    labeled_events = Column(Integer, nullable=False, default=0)

    __table_args__ = (
        Index("idx_kpi_daily_pilot_date", "pilot_id", "metric_date"),
        Index("idx_kpi_daily_tenant_date", "tenant_id", "metric_date"),
    )


class KPIThresholdSweep(Base, TimestampMixin):
    """
    Threshold sweep analysis for profit curve and PR curve.

    Computed for different threshold values to optimize decision thresholds.
    """

    __tablename__ = "kpi_threshold_sweep"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    pilot_id = Column(String, nullable=False, index=True)
    tenant_id = Column(String, nullable=False, index=True)
    sweep_date = Column(DateTime(timezone=True), nullable=False, index=True)
    model_version = Column(String, nullable=True, index=True)

    # Threshold Value
    threshold = Column(Float, nullable=False, index=True)

    # Metrics at this threshold
    precision = Column(Float, nullable=True)
    recall = Column(Float, nullable=True)
    fpr = Column(Float, nullable=True)

    # Business Metrics
    profit = Column(Float, nullable=True)  # Net profit at this threshold
    fraud_amount_avoided = Column(Float, nullable=True)
    false_positive_cost = Column(Float, nullable=True)

    # Counts
    true_positives = Column(Integer, nullable=False, default=0)
    false_positives = Column(Integer, nullable=False, default=0)
    true_negatives = Column(Integer, nullable=False, default=0)
    false_negatives = Column(Integer, nullable=False, default=0)

    __table_args__ = (
        Index("idx_kpi_sweep_pilot_threshold", "pilot_id", "threshold"),
        Index("idx_kpi_sweep_tenant_date", "tenant_id", "sweep_date"),
    )


class KPIBreakdown(Base, TimestampMixin):
    """
    KPI breakdowns by merchant, segment, method, or model version.
    """

    __tablename__ = "kpi_breakdown"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    pilot_id = Column(String, nullable=False, index=True)
    tenant_id = Column(String, nullable=False, index=True)
    breakdown_date = Column(DateTime(timezone=True), nullable=False, index=True)

    # Breakdown Dimensions
    breakdown_type = Column(
        String, nullable=False, index=True
    )  # merchant, segment, method, model_version
    breakdown_value = Column(
        String, nullable=False, index=True
    )  # e.g., merchant_id, segment_name

    # Aggregated Metrics
    precision = Column(Float, nullable=True)
    recall = Column(Float, nullable=True)
    fpr = Column(Float, nullable=True)
    total_events = Column(Integer, nullable=False, default=0)
    fraud_count = Column(Integer, nullable=False, default=0)
    fraud_amount = Column(Float, nullable=True)

    __table_args__ = (
        Index(
            "idx_kpi_breakdown_pilot_type",
            "pilot_id",
            "breakdown_type",
            "breakdown_value",
        ),
        Index("idx_kpi_breakdown_tenant_date", "tenant_id", "breakdown_date"),
    )
