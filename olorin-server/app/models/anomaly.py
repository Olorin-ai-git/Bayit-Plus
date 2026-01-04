"""
SQLAlchemy Models: Anomaly Detection
Feature: 001-fraud-anomaly-detection

Maps to anomaly detection tables in schema-locked database.
Implements detector configurations, detection runs, and anomaly events.

SYSTEM MANDATE Compliance:
- Schema-locked: Maps to existing tables, no DDL
- No hardcoded values: All enums match database constraints
- Complete implementation: No placeholders or TODOs
"""

import json
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.sql import func

from app.persistence.database import Base, JSONType, UUIDType


class Detector(Base):
    """
    Detector model for anomaly detection algorithm configurations.
    Schema: 005_add_anomaly_tables.sql | Table: detectors
    """

    __tablename__ = "detectors"

    id = Column(UUIDType(), primary_key=True, default=uuid.uuid4, nullable=False)
    name = Column(Text, nullable=False)
    type = Column(String(50), nullable=False, index=True)
    cohort_by = Column(JSONType, nullable=False)
    metrics = Column(JSONType, nullable=False)
    params = Column(JSONType, nullable=False)
    enabled = Column(Boolean, nullable=False, default=True, index=True)
    created_at = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
        index=True,
    )

    __table_args__ = (
        CheckConstraint(
            "type IN ('stl_mad', 'cusum', 'isoforest', 'rcf', 'matrix_profile')",
            name="chk_detector_type",
        ),
        Index("idx_detectors_type", "type"),
        Index("idx_detectors_enabled", "enabled"),
        Index("idx_detectors_updated", "updated_at"),
    )

    def __repr__(self) -> str:
        return f"<Detector(id={self.id!r}, name={self.name!r}, type={self.type!r}, enabled={self.enabled})>"

    def to_dict(self) -> dict:
        """Convert model to dictionary representation."""
        return {
            "id": str(self.id),
            "name": self.name,
            "type": self.type,
            "cohort_by": self.cohort_by,
            "metrics": self.metrics,
            "params": self.params,
            "enabled": self.enabled,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class DetectionRun(Base):
    """
    Detection run model for tracking detector executions.
    Schema: 005_add_anomaly_tables.sql | Table: detection_runs
    """

    __tablename__ = "detection_runs"

    id = Column(UUIDType(), primary_key=True, default=uuid.uuid4, nullable=False)
    detector_id = Column(
        UUIDType(),
        ForeignKey("detectors.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status = Column(String(50), nullable=False, index=True)
    started_at = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), index=True
    )
    finished_at = Column(DateTime(timezone=True), nullable=True)
    window_from = Column(DateTime(timezone=True), nullable=False)
    window_to = Column(DateTime(timezone=True), nullable=False)
    info = Column(JSONType, nullable=True)

    __table_args__ = (
        CheckConstraint(
            "status IN ('queued', 'running', 'success', 'failed')",
            name="chk_detection_run_status",
        ),
        CheckConstraint("window_to > window_from", name="chk_window_order"),
        Index("idx_detection_runs_detector", "detector_id"),
        Index("idx_detection_runs_status", "status"),
        Index("idx_detection_runs_window", "window_from", "window_to"),
        Index("idx_detection_runs_started", "started_at"),
    )

    def __repr__(self) -> str:
        return f"<DetectionRun(id={self.id!r}, detector_id={self.detector_id!r}, status={self.status!r})>"

    def to_dict(self) -> dict:
        """Convert model to dictionary representation."""
        return {
            "id": str(self.id),
            "detector_id": str(self.detector_id),
            "status": self.status,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "finished_at": self.finished_at.isoformat() if self.finished_at else None,
            "window_from": self.window_from.isoformat() if self.window_from else None,
            "window_to": self.window_to.isoformat() if self.window_to else None,
            "info": self.info,
        }


class AnomalyEvent(Base):
    """
    Anomaly event model for detected anomalies.
    Schema: 005_add_anomaly_tables.sql | Table: anomaly_events
    """

    __tablename__ = "anomaly_events"

    id = Column(UUIDType(), primary_key=True, default=uuid.uuid4, nullable=False)
    run_id = Column(
        UUIDType(),
        ForeignKey("detection_runs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    detector_id = Column(
        UUIDType(),
        ForeignKey("detectors.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    cohort = Column(JSONType, nullable=False)
    window_start = Column(DateTime(timezone=True), nullable=False)
    window_end = Column(DateTime(timezone=True), nullable=False)
    metric = Column(Text, nullable=False)
    observed = Column(Float, nullable=False)
    expected = Column(Float, nullable=False)
    score = Column(Float, nullable=False, index=True)
    severity = Column(String(50), nullable=True, index=True)
    persisted_n = Column(Integer, nullable=False, default=1)
    status = Column(String(50), nullable=False, default="new", index=True)
    evidence = Column(JSONType, nullable=True)
    investigation_id = Column(UUIDType(), nullable=True, index=True)
    created_at = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), index=True
    )

    __table_args__ = (
        CheckConstraint(
            "severity IN ('info', 'warn', 'critical') OR severity IS NULL",
            name="chk_anomaly_severity",
        ),
        CheckConstraint(
            "status IN ('new', 'triaged', 'closed')", name="chk_anomaly_status"
        ),
        CheckConstraint("window_end > window_start", name="chk_anomaly_window_order"),
        CheckConstraint("score >= 0", name="chk_anomaly_score"),
        CheckConstraint("persisted_n >= 1", name="chk_anomaly_persisted_n"),
        Index("idx_anomaly_events_run", "run_id"),
        Index("idx_anomaly_events_detector", "detector_id"),
        Index("idx_anomaly_events_severity", "severity"),
        Index("idx_anomaly_events_status", "status"),
        Index("idx_anomaly_events_score", "score"),
        Index("idx_anomaly_events_window", "window_start", "window_end"),
        Index("idx_anomaly_events_created", "created_at"),
        # GIN index for PostgreSQL only - SQLite will use regular index
        Index("idx_anomaly_events_cohort", "cohort", postgresql_using="gin"),
        Index("idx_anomaly_events_investigation", "investigation_id"),
    )

    def __repr__(self) -> str:
        return f"<AnomalyEvent(id={self.id!r}, detector_id={self.detector_id!r}, metric={self.metric!r}, score={self.score!r})>"

    def to_dict(self) -> dict:
        """Convert model to dictionary representation."""
        return {
            "id": str(self.id),
            "run_id": str(self.run_id),
            "detector_id": str(self.detector_id),
            "cohort": self.cohort,
            "window_start": (
                self.window_start.isoformat() if self.window_start else None
            ),
            "window_end": self.window_end.isoformat() if self.window_end else None,
            "metric": self.metric,
            "observed": self.observed,
            "expected": self.expected,
            "score": self.score,
            "severity": self.severity,
            "persisted_n": self.persisted_n,
            "status": self.status,
            "evidence": self.evidence,
            "investigation_id": (
                str(self.investigation_id) if self.investigation_id else None
            ),
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
