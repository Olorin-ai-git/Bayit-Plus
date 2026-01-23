# Quickstart Guide: Investigation Polling and Persistence

**Feature:** 005-polling-and-persistence
**Branch:** `005-polling-and-persistence`
**Author:** Implementation Team
**Date:** 2025-01-15

## Overview

This guide provides step-by-step instructions for implementing investigation wizard state polling and persistence. Follow this guide to build production-ready state management with adaptive polling, WebSocket real-time updates, and SQLite persistence.

**Implementation Time Estimate:** ~8-10 hours for core functionality

**Prerequisites:**
- Python 3.11+ with Poetry
- Node.js 18+ with npm
- SQLite 3.35+
- Familiarity with FastAPI and React
- Read `/specs/005-polling-and-persistence/spec.md`
- Review `/specs/005-polling-and-persistence/data-model.md`
- Review `/specs/005-polling-and-persistence/contracts/`

## Table of Contents

1. [Backend Implementation (Phase 1)](#backend-implementation-phase-1)
2. [Frontend Implementation (Phase 2)](#frontend-implementation-phase-2)
3. [Integration Testing (Phase 3)](#integration-testing-phase-3)
4. [Deployment (Phase 4)](#deployment-phase-4)
5. [Troubleshooting](#troubleshooting)

---

## Backend Implementation (Phase 1)

### Step 1.1: Database Schema Setup (30 minutes)

**Location:** `/olorin-server/app/persistence/`

**1. Create migration script (MANUAL - NO AUTO-MIGRATION):**

```bash
# Create migrations directory
mkdir -p /olorin-server/app/persistence/migrations
```

**2. Create migration SQL file:**

`/olorin-server/app/persistence/migrations/001_add_wizard_state_tables.sql`

```sql
-- Investigation Wizard State Table
CREATE TABLE IF NOT EXISTS investigation_states (
    investigation_id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    wizard_step VARCHAR(50) NOT NULL CHECK (wizard_step IN ('SETTINGS', 'PROGRESS', 'RESULTS')),
    settings_json TEXT,
    progress_json TEXT,
    results_json TEXT,
    status VARCHAR(50) NOT NULL CHECK (status IN ('IN_PROGRESS', 'COMPLETED', 'ERROR', 'CANCELLED')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_accessed TIMESTAMP,
    version INTEGER DEFAULT 1 NOT NULL,
    FOREIGN KEY (investigation_id) REFERENCES investigations(id) ON DELETE CASCADE
);

CREATE INDEX idx_investigation_states_user_id ON investigation_states(user_id);
CREATE INDEX idx_investigation_states_status ON investigation_states(status);
CREATE INDEX idx_investigation_states_wizard_step ON investigation_states(wizard_step);
CREATE INDEX idx_investigation_states_updated_at ON investigation_states(updated_at);

-- Investigation Templates Table
CREATE TABLE IF NOT EXISTS investigation_templates (
    template_id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template_json TEXT NOT NULL,
    tags TEXT,
    usage_count INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_used TIMESTAMP,
    UNIQUE(user_id, name)
);

CREATE INDEX idx_investigation_templates_user_id ON investigation_templates(user_id);
CREATE INDEX idx_investigation_templates_usage_count ON investigation_templates(usage_count);
CREATE INDEX idx_investigation_templates_last_used ON investigation_templates(last_used);

-- Investigation Audit Log Table
CREATE TABLE IF NOT EXISTS investigation_audit_log (
    entry_id VARCHAR(255) PRIMARY KEY,
    investigation_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    action_type VARCHAR(100) NOT NULL,
    wizard_step VARCHAR(50) NOT NULL,
    source VARCHAR(50) NOT NULL CHECK (source IN ('USER_ACTION', 'SYSTEM_UPDATE', 'WEBSOCKET_EVENT', 'POLLING_SYNC')),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    changes_json TEXT,
    state_snapshot_json TEXT,
    FOREIGN KEY (investigation_id) REFERENCES investigations(id) ON DELETE CASCADE
);

CREATE INDEX idx_audit_log_investigation_id ON investigation_audit_log(investigation_id);
CREATE INDEX idx_audit_log_user_id ON investigation_audit_log(user_id);
CREATE INDEX idx_audit_log_timestamp ON investigation_audit_log(timestamp);
CREATE INDEX idx_audit_log_action_type ON investigation_audit_log(action_type);
```

**3. Create migration runner:**

`/olorin-server/app/persistence/migrations/runner.py`

```python
"""
Database migration runner.

CRITICAL: This script applies migrations manually. No auto-migration allowed.
"""
import sqlite3
from pathlib import Path
from typing import List
import logging

logger = logging.getLogger(__name__)


class MigrationRunner:
    """Runs database migrations from SQL files."""

    def __init__(self, db_path: str):
        self.db_path = db_path
        self.migrations_dir = Path(__file__).parent

    def get_pending_migrations(self) -> List[Path]:
        """Get list of pending migration files in order."""
        migration_files = sorted(self.migrations_dir.glob("*.sql"))
        return migration_files

    def run_migrations(self) -> None:
        """Execute all pending migrations."""
        migrations = self.get_pending_migrations()

        if not migrations:
            logger.info("No migrations to run")
            return

        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        try:
            for migration_file in migrations:
                logger.info(f"Running migration: {migration_file.name}")

                with open(migration_file, 'r') as f:
                    migration_sql = f.read()

                # Execute migration
                cursor.executescript(migration_sql)
                conn.commit()

                logger.info(f"Migration {migration_file.name} completed successfully")

        except Exception as e:
            conn.rollback()
            logger.error(f"Migration failed: {e}")
            raise
        finally:
            cursor.close()
            conn.close()


def run_migrations(db_path: str) -> None:
    """Run all pending migrations."""
    runner = MigrationRunner(db_path)
    runner.run_migrations()
```

**4. Update database initialization:**

`/olorin-server/app/persistence/database.py` (add migration call)

```python
from app.persistence.migrations.runner import run_migrations

def init_database(config: DatabaseConfig) -> None:
    """Initialize database with migrations."""
    global _SessionLocal, _engine

    _engine = create_engine(
        config.url,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        pool_size=config.pool_size,
        max_overflow=config.max_overflow,
        pool_pre_ping=True
    )

    # Run migrations
    db_path = config.url.replace("sqlite:///", "")
    run_migrations(db_path)

    _SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_engine)
    logger.info("Database initialized successfully")
```

### Step 1.2: SQLAlchemy Models (45 minutes)

**Location:** `/olorin-server/app/persistence/models.py`

**Add these models to existing file:**

```python
from sqlalchemy import Column, String, Text, Integer, ForeignKey, CheckConstraint, Index
from sqlalchemy.ext.declarative import declarative_base
import json
from typing import Optional, Dict, Any
from datetime import datetime

Base = declarative_base()


class TimestampMixin:
    """Mixin for created_at and updated_at timestamps."""
    created_at = Column(String, nullable=False, default=lambda: datetime.utcnow().isoformat())
    updated_at = Column(String, nullable=False, default=lambda: datetime.utcnow().isoformat(),
                       onupdate=lambda: datetime.utcnow().isoformat())


class InvestigationState(Base, TimestampMixin):
    """Investigation wizard state persistence."""
    __tablename__ = "investigation_states"

    investigation_id = Column(String(255), primary_key=True)
    user_id = Column(String(255), nullable=False, index=True)
    wizard_step = Column(String(50), nullable=False)
    settings_json = Column(Text, nullable=True)
    progress_json = Column(Text, nullable=True)
    results_json = Column(Text, nullable=True)
    status = Column(String(50), nullable=False)
    last_accessed = Column(String, nullable=True)
    version = Column(Integer, nullable=False, default=1)

    __table_args__ = (
        CheckConstraint("wizard_step IN ('SETTINGS', 'PROGRESS', 'RESULTS')", name="check_wizard_step"),
        CheckConstraint("status IN ('IN_PROGRESS', 'COMPLETED', 'ERROR', 'CANCELLED')", name="check_status"),
        Index('idx_investigation_states_user_id', 'user_id'),
        Index('idx_investigation_states_status', 'status'),
        Index('idx_investigation_states_wizard_step', 'wizard_step'),
        Index('idx_investigation_states_updated_at', 'updated_at'),
    )

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary with JSON parsing."""
        return {
            "investigation_id": self.investigation_id,
            "user_id": self.user_id,
            "wizard_step": self.wizard_step,
            "settings": json.loads(self.settings_json) if self.settings_json else None,
            "progress": json.loads(self.progress_json) if self.progress_json else None,
            "results": json.loads(self.results_json) if self.results_json else None,
            "status": self.status,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "last_accessed": self.last_accessed,
            "version": self.version
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "InvestigationState":
        """Create instance from dictionary with JSON serialization."""
        return cls(
            investigation_id=data["investigation_id"],
            user_id=data["user_id"],
            wizard_step=data["wizard_step"],
            settings_json=json.dumps(data.get("settings")) if data.get("settings") else None,
            progress_json=json.dumps(data.get("progress")) if data.get("progress") else None,
            results_json=json.dumps(data.get("results")) if data.get("results") else None,
            status=data["status"],
            created_at=data.get("created_at", datetime.utcnow().isoformat()),
            updated_at=data.get("updated_at", datetime.utcnow().isoformat()),
            last_accessed=data.get("last_accessed"),
            version=data.get("version", 1)
        )


class InvestigationTemplate(Base, TimestampMixin):
    """Saved investigation configuration templates."""
    __tablename__ = "investigation_templates"

    template_id = Column(String(255), primary_key=True)
    user_id = Column(String(255), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    template_json = Column(Text, nullable=False)
    tags = Column(Text, nullable=True)  # JSON array
    usage_count = Column(Integer, nullable=False, default=0)
    last_used = Column(String, nullable=True)

    __table_args__ = (
        Index('idx_investigation_templates_user_id', 'user_id'),
        Index('idx_investigation_templates_usage_count', 'usage_count'),
        Index('idx_investigation_templates_last_used', 'last_used'),
    )

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary with JSON parsing."""
        return {
            "template_id": self.template_id,
            "user_id": self.user_id,
            "name": self.name,
            "description": self.description,
            "template_json": json.loads(self.template_json),
            "tags": json.loads(self.tags) if self.tags else [],
            "usage_count": self.usage_count,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "last_used": self.last_used
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "InvestigationTemplate":
        """Create instance from dictionary with JSON serialization."""
        return cls(
            template_id=data["template_id"],
            user_id=data["user_id"],
            name=data["name"],
            description=data.get("description"),
            template_json=json.dumps(data["template_json"]),
            tags=json.dumps(data.get("tags", [])),
            usage_count=data.get("usage_count", 0),
            created_at=data.get("created_at", datetime.utcnow().isoformat()),
            updated_at=data.get("updated_at", datetime.utcnow().isoformat()),
            last_used=data.get("last_used")
        )


class InvestigationAuditLog(Base):
    """Audit log for investigation state changes."""
    __tablename__ = "investigation_audit_log"

    entry_id = Column(String(255), primary_key=True)
    investigation_id = Column(String(255), nullable=False, index=True)
    user_id = Column(String(255), nullable=False, index=True)
    action_type = Column(String(100), nullable=False, index=True)
    wizard_step = Column(String(50), nullable=False)
    source = Column(String(50), nullable=False)
    timestamp = Column(String, nullable=False, default=lambda: datetime.utcnow().isoformat(), index=True)
    changes_json = Column(Text, nullable=True)
    state_snapshot_json = Column(Text, nullable=True)

    __table_args__ = (
        CheckConstraint("source IN ('USER_ACTION', 'SYSTEM_UPDATE', 'WEBSOCKET_EVENT', 'POLLING_SYNC')",
                       name="check_source"),
        Index('idx_audit_log_investigation_id', 'investigation_id'),
        Index('idx_audit_log_user_id', 'user_id'),
        Index('idx_audit_log_timestamp', 'timestamp'),
        Index('idx_audit_log_action_type', 'action_type'),
    )

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary with JSON parsing."""
        return {
            "entry_id": self.entry_id,
            "investigation_id": self.investigation_id,
            "user_id": self.user_id,
            "action_type": self.action_type,
            "wizard_step": self.wizard_step,
            "source": self.source,
            "timestamp": self.timestamp,
            "changes": json.loads(self.changes_json) if self.changes_json else None,
            "state_snapshot": json.loads(self.state_snapshot_json) if self.state_snapshot_json else None
        }
```

### Step 1.3: Pydantic Schemas (60 minutes)

**Location:** `/olorin-server/app/schemas/wizard_state.py` (NEW FILE)

```python
"""
Pydantic schemas for wizard state validation.

All schemas are configuration-driven with environment variable validation.
"""
from pydantic import BaseModel, Field, validator, root_validator
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime
from enum import Enum


# Enums
class WizardStep(str, Enum):
    """Wizard step enumeration."""
    SETTINGS = "SETTINGS"
    PROGRESS = "PROGRESS"
    RESULTS = "RESULTS"


class InvestigationStatus(str, Enum):
    """Investigation status enumeration."""
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    ERROR = "ERROR"
    CANCELLED = "CANCELLED"


class EntityType(str, Enum):
    """Entity type enumeration."""
    USER_ID = "user_id"
    EMAIL = "email"
    IP_ADDRESS = "ip_address"
    DEVICE_ID = "device_id"
    PHONE_NUMBER = "phone_number"
    CARD_NUMBER = "card_number"
    ACCOUNT_ID = "account_id"
    TRANSACTION_ID = "transaction_id"


class CorrelationMode(str, Enum):
    """Correlation mode enumeration."""
    OR = "OR"
    AND = "AND"


# Configuration Schemas
class DatabaseConfig(BaseModel):
    """Database configuration with validation."""
    url: str = Field(..., env="DATABASE_URL")
    pool_size: int = Field(5, ge=1, le=20, env="DB_POOL_SIZE")
    max_overflow: int = Field(10, ge=0, le=50, env="DB_MAX_OVERFLOW")

    @validator('url')
    def validate_database_url(cls, v):
        """Validate database URL is configured."""
        if not v or v == "<required>":
            raise ValueError("Database URL must be configured via DATABASE_URL environment variable")
        return v

    class Config:
        env_file = '.env'


class WizardPollingConfig(BaseModel):
    """Polling configuration with validation."""
    fast_interval_ms: int = Field(500, ge=100, le=5000, env="POLLING_FAST_INTERVAL_MS")
    normal_interval_ms: int = Field(2000, ge=500, le=10000, env="POLLING_NORMAL_INTERVAL_MS")
    slow_interval_ms: int = Field(5000, ge=1000, le=30000, env="POLLING_SLOW_INTERVAL_MS")
    max_backoff_ms: int = Field(30000, ge=5000, le=60000, env="POLLING_MAX_BACKOFF_MS")
    max_retries: int = Field(3, ge=1, le=10, env="POLLING_MAX_RETRIES")

    @root_validator
    def validate_intervals(cls, values):
        """Validate interval ordering: fast < normal < slow."""
        fast = values.get('fast_interval_ms')
        normal = values.get('normal_interval_ms')
        slow = values.get('slow_interval_ms')

        if fast and normal and fast >= normal:
            raise ValueError("fast_interval_ms must be less than normal_interval_ms")
        if normal and slow and normal >= slow:
            raise ValueError("normal_interval_ms must be less than slow_interval_ms")

        return values

    class Config:
        env_file = '.env'


# Request/Response Schemas
class Entity(BaseModel):
    """Investigation entity."""
    entity_type: EntityType
    entity_value: str = Field(..., min_length=1, max_length=255)


class TimeRange(BaseModel):
    """Investigation time range."""
    start_time: datetime
    end_time: datetime

    @validator('end_time')
    def validate_end_after_start(cls, v, values):
        """Validate end_time is after start_time."""
        if 'start_time' in values and v <= values['start_time']:
            raise ValueError("end_time must be after start_time")
        return v


class ToolSelection(BaseModel):
    """Investigation tool selection."""
    tool_name: str = Field(..., min_length=1, max_length=100)
    enabled: bool
    config: Optional[Dict[str, Any]] = Field(default_factory=dict)


class InvestigationSettings(BaseModel):
    """Investigation settings schema."""
    name: str = Field(..., min_length=1, max_length=255)
    entities: List[Entity] = Field(..., min_items=1, max_items=10)
    time_range: TimeRange
    tools: List[ToolSelection] = Field(..., min_items=1, max_items=20)
    correlation_mode: CorrelationMode


class InvestigationPhase(BaseModel):
    """Investigation phase status."""
    phase_name: Literal["PLANNING", "EXECUTION", "ANALYSIS", "FINALIZATION"]
    status: Literal["PENDING", "IN_PROGRESS", "COMPLETED", "ERROR"]
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class ToolExecution(BaseModel):
    """Tool execution status."""
    tool_name: str
    status: Literal["PENDING", "IN_PROGRESS", "COMPLETED", "ERROR", "SKIPPED"]
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    result_summary: Optional[str] = None


class InvestigationProgress(BaseModel):
    """Investigation progress."""
    current_phase: Literal["PLANNING", "EXECUTION", "ANALYSIS", "FINALIZATION"]
    phases: List[InvestigationPhase]
    tools_executed: List[ToolExecution]
    percent_complete: int = Field(..., ge=0, le=100)


class InvestigationResults(BaseModel):
    """Investigation results."""
    risk_score: float = Field(..., ge=0, le=100)
    findings: List[Dict[str, Any]]
    completed_at: datetime
    report_url: Optional[str] = None


class WizardStateCreate(BaseModel):
    """Create wizard state request."""
    investigation_id: str = Field(..., min_length=1, max_length=255, pattern=r'^[a-zA-Z0-9_-]+$')
    wizard_step: WizardStep
    settings: Optional[InvestigationSettings] = None
    status: InvestigationStatus


class WizardStateUpdate(BaseModel):
    """Update wizard state request."""
    wizard_step: Optional[WizardStep] = None
    settings: Optional[InvestigationSettings] = None
    progress: Optional[InvestigationProgress] = None
    results: Optional[InvestigationResults] = None
    status: Optional[InvestigationStatus] = None
    version: int = Field(..., ge=1)


class WizardStateResponse(BaseModel):
    """Wizard state response."""
    investigation_id: str
    user_id: str
    wizard_step: WizardStep
    settings: Optional[InvestigationSettings] = None
    progress: Optional[InvestigationProgress] = None
    results: Optional[InvestigationResults] = None
    status: InvestigationStatus
    created_at: datetime
    updated_at: datetime
    last_accessed: Optional[datetime] = None
    version: int

    class Config:
        orm_mode = True
```

### Step 1.4: Service Layer (90 minutes)

**Location:** `/olorin-server/app/service/wizard_state_service.py` (NEW FILE)

```python
"""
Wizard state service layer.

Handles business logic for wizard state persistence and retrieval.
"""
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid

from app.persistence.models import InvestigationState, InvestigationTemplate, InvestigationAuditLog
from app.schemas.wizard_state import (
    WizardStateCreate, WizardStateUpdate, WizardStateResponse,
    WizardStep, InvestigationStatus
)
from fastapi import HTTPException, status


class WizardStateService:
    """Service for managing wizard state."""

    def __init__(self, db: Session):
        self.db = db

    def create_state(self, user_id: str, data: WizardStateCreate) -> WizardStateResponse:
        """Create new wizard state."""
        # Check if state already exists
        existing = self.db.query(InvestigationState).filter(
            InvestigationState.investigation_id == data.investigation_id
        ).first()

        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Investigation state already exists: {data.investigation_id}"
            )

        # Create state
        state_dict = data.dict()
        state_dict['user_id'] = user_id
        state = InvestigationState.from_dict(state_dict)

        self.db.add(state)
        self.db.commit()
        self.db.refresh(state)

        # Create audit log entry
        self._create_audit_entry(
            investigation_id=state.investigation_id,
            user_id=user_id,
            action_type="STATE_CREATED",
            wizard_step=state.wizard_step,
            source="USER_ACTION",
            changes={"created": True}
        )

        return WizardStateResponse(**state.to_dict())

    def get_state(self, investigation_id: str, user_id: str) -> Optional[WizardStateResponse]:
        """Retrieve wizard state."""
        state = self.db.query(InvestigationState).filter(
            InvestigationState.investigation_id == investigation_id,
            InvestigationState.user_id == user_id
        ).first()

        if not state:
            return None

        # Update last accessed
        state.last_accessed = datetime.utcnow().isoformat()
        self.db.commit()

        return WizardStateResponse(**state.to_dict())

    def update_state(self, investigation_id: str, user_id: str,
                    data: WizardStateUpdate) -> WizardStateResponse:
        """Update wizard state with optimistic locking."""
        state = self.db.query(InvestigationState).filter(
            InvestigationState.investigation_id == investigation_id,
            InvestigationState.user_id == user_id
        ).first()

        if not state:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Investigation state not found: {investigation_id}"
            )

        # Optimistic locking check
        if state.version != data.version:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Version mismatch. Current: {state.version}, Provided: {data.version}"
            )

        # Track changes
        changes = {}
        updated_fields = []

        # Update fields
        if data.wizard_step is not None and data.wizard_step != state.wizard_step:
            changes['wizard_step'] = {'old': state.wizard_step, 'new': data.wizard_step}
            state.wizard_step = data.wizard_step
            updated_fields.append('wizard_step')

        if data.settings is not None:
            state.settings_json = data.settings.json()
            updated_fields.append('settings')

        if data.progress is not None:
            state.progress_json = data.progress.json()
            updated_fields.append('progress')

        if data.results is not None:
            state.results_json = data.results.json()
            updated_fields.append('results')

        if data.status is not None and data.status != state.status:
            changes['status'] = {'old': state.status, 'new': data.status}
            state.status = data.status
            updated_fields.append('status')

        # Increment version
        state.version += 1
        state.updated_at = datetime.utcnow().isoformat()

        self.db.commit()
        self.db.refresh(state)

        # Create audit log entry
        self._create_audit_entry(
            investigation_id=state.investigation_id,
            user_id=user_id,
            action_type="STATE_UPDATED",
            wizard_step=state.wizard_step,
            source="USER_ACTION",
            changes={"fields": updated_fields, "details": changes}
        )

        return WizardStateResponse(**state.to_dict())

    def delete_state(self, investigation_id: str, user_id: str) -> None:
        """Delete wizard state."""
        state = self.db.query(InvestigationState).filter(
            InvestigationState.investigation_id == investigation_id,
            InvestigationState.user_id == user_id
        ).first()

        if not state:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Investigation state not found: {investigation_id}"
            )

        # Create audit log entry before deletion
        self._create_audit_entry(
            investigation_id=state.investigation_id,
            user_id=user_id,
            action_type="STATE_DELETED",
            wizard_step=state.wizard_step,
            source="USER_ACTION",
            changes={"deleted": True}
        )

        self.db.delete(state)
        self.db.commit()

    def get_history(self, investigation_id: str, user_id: str,
                    limit: int = 20, offset: int = 0) -> Dict[str, Any]:
        """Retrieve audit log history."""
        # Verify user has access
        state = self.db.query(InvestigationState).filter(
            InvestigationState.investigation_id == investigation_id,
            InvestigationState.user_id == user_id
        ).first()

        if not state:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Investigation state not found: {investigation_id}"
            )

        # Get audit entries
        query = self.db.query(InvestigationAuditLog).filter(
            InvestigationAuditLog.investigation_id == investigation_id
        ).order_by(InvestigationAuditLog.timestamp.desc())

        total = query.count()
        entries = query.limit(limit).offset(offset).all()

        return {
            "entries": [entry.to_dict() for entry in entries],
            "total": total,
            "limit": limit,
            "offset": offset
        }

    def _create_audit_entry(self, investigation_id: str, user_id: str,
                           action_type: str, wizard_step: str,
                           source: str, changes: Dict[str, Any]) -> None:
        """Create audit log entry."""
        entry = InvestigationAuditLog(
            entry_id=str(uuid.uuid4()),
            investigation_id=investigation_id,
            user_id=user_id,
            action_type=action_type,
            wizard_step=wizard_step,
            source=source,
            timestamp=datetime.utcnow().isoformat(),
            changes_json=str(changes)
        )

        self.db.add(entry)
        # Note: commit happens in calling method
```

**Time Check:** Backend Phase 1 should take ~3.5 hours. Continue to Step 1.5 for API routes.

### Step 1.5: API Routes (60 minutes)

**Location:** `/olorin-server/app/router/wizard_state_router.py` (NEW FILE)

```python
"""
Wizard state API router.

Implements REST endpoints for wizard state management.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Header, Response
from sqlalchemy.orm import Session
from typing import Optional

from app.persistence.database import get_db
from app.service.wizard_state_service import WizardStateService
from app.schemas.wizard_state import WizardStateCreate, WizardStateUpdate, WizardStateResponse
from app.auth import require_read, require_write, User


router = APIRouter(prefix="/wizard-state", tags=["Wizard State"])


@router.post("", response_model=WizardStateResponse, status_code=status.HTTP_201_CREATED)
def create_wizard_state(
    data: WizardStateCreate,
    current_user: User = Depends(require_write),
    db: Session = Depends(get_db)
):
    """Create new investigation wizard state."""
    service = WizardStateService(db)
    return service.create_state(current_user.user_id, data)


@router.get("/{investigation_id}", response_model=WizardStateResponse)
def get_wizard_state(
    investigation_id: str,
    if_none_match: Optional[str] = Header(None),
    current_user: User = Depends(require_read),
    db: Session = Depends(get_db),
    response: Response = None
):
    """Retrieve investigation wizard state with conditional GET support."""
    service = WizardStateService(db)
    state = service.get_state(investigation_id, current_user.user_id)

    if not state:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Investigation state not found: {investigation_id}"
        )

    # Check ETag for 304 Not Modified
    current_etag = f'"version-{state.version}"'
    if if_none_match and if_none_match == current_etag:
        response.status_code = status.HTTP_304_NOT_MODIFIED
        return None

    # Set ETag header
    response.headers["ETag"] = current_etag
    response.headers["Cache-Control"] = "no-cache, must-revalidate"

    return state


@router.put("/{investigation_id}", response_model=WizardStateResponse)
def update_wizard_state(
    investigation_id: str,
    data: WizardStateUpdate,
    current_user: User = Depends(require_write),
    db: Session = Depends(get_db),
    response: Response = None
):
    """Update investigation wizard state with optimistic locking."""
    service = WizardStateService(db)
    state = service.update_state(investigation_id, current_user.user_id, data)

    # Set new ETag
    response.headers["ETag"] = f'"version-{state.version}"'

    return state


@router.delete("/{investigation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_wizard_state(
    investigation_id: str,
    current_user: User = Depends(require_write),
    db: Session = Depends(get_db)
):
    """Delete investigation wizard state."""
    service = WizardStateService(db)
    service.delete_state(investigation_id, current_user.user_id)
    return None


@router.get("/{investigation_id}/history")
def get_wizard_state_history(
    investigation_id: str,
    limit: int = 20,
    offset: int = 0,
    current_user: User = Depends(require_read),
    db: Session = Depends(get_db)
):
    """Retrieve wizard state change history."""
    service = WizardStateService(db)
    return service.get_history(investigation_id, current_user.user_id, limit, offset)
```

**Register router in `/olorin-server/app/main.py`:**

```python
from app.router.wizard_state_router import router as wizard_state_router

app.include_router(wizard_state_router, prefix="/api/v1")
```

---

## Frontend Implementation (Phase 2)

### Step 2.1: TypeScript Types (30 minutes)

**Location:** `/olorin-front/src/shared/types/wizardState.ts` (NEW FILE)

```typescript
/**
 * TypeScript type definitions for wizard state.
 *
 * Mirrors backend Pydantic schemas for type safety.
 */

export enum WizardStep {
  SETTINGS = 'SETTINGS',
  PROGRESS = 'PROGRESS',
  RESULTS = 'RESULTS'
}

export enum InvestigationStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
  CANCELLED = 'CANCELLED'
}

export enum EntityType {
  USER_ID = 'user_id',
  EMAIL = 'email',
  IP_ADDRESS = 'ip_address',
  DEVICE_ID = 'device_id',
  PHONE_NUMBER = 'phone_number',
  CARD_NUMBER = 'card_number',
  ACCOUNT_ID = 'account_id',
  TRANSACTION_ID = 'transaction_id'
}

export enum CorrelationMode {
  OR = 'OR',
  AND = 'AND'
}

export interface Entity {
  entity_type: EntityType;
  entity_value: string;
}

export interface TimeRange {
  start_time: string; // ISO 8601
  end_time: string;   // ISO 8601
}

export interface ToolSelection {
  tool_name: string;
  enabled: boolean;
  config?: Record<string, any>;
}

export interface InvestigationSettings {
  name: string;
  entities: Entity[];
  time_range: TimeRange;
  tools: ToolSelection[];
  correlation_mode: CorrelationMode;
}

export interface InvestigationPhase {
  phase_name: 'PLANNING' | 'EXECUTION' | 'ANALYSIS' | 'FINALIZATION';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'ERROR';
  started_at?: string;
  completed_at?: string;
}

export interface ToolExecution {
  tool_name: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'ERROR' | 'SKIPPED';
  started_at?: string;
  completed_at?: string;
  result_summary?: string;
}

export interface InvestigationProgress {
  current_phase: 'PLANNING' | 'EXECUTION' | 'ANALYSIS' | 'FINALIZATION';
  phases: InvestigationPhase[];
  tools_executed: ToolExecution[];
  percent_complete: number;
}

export interface InvestigationResults {
  risk_score: number;
  findings: Record<string, any>[];
  completed_at: string;
  report_url?: string;
}

export interface WizardState {
  investigation_id: string;
  user_id: string;
  wizard_step: WizardStep;
  settings?: InvestigationSettings;
  progress?: InvestigationProgress;
  results?: InvestigationResults;
  status: InvestigationStatus;
  created_at: string;
  updated_at: string;
  last_accessed?: string;
  version: number;
}

export interface WizardStateCreate {
  investigation_id: string;
  wizard_step: WizardStep;
  settings?: InvestigationSettings;
  status: InvestigationStatus;
}

export interface WizardStateUpdate {
  wizard_step?: WizardStep;
  settings?: InvestigationSettings;
  progress?: InvestigationProgress;
  results?: InvestigationResults;
  status?: InvestigationStatus;
  version: number;
}

// Polling types
export interface PollingConfig {
  baseInterval: number;        // 2000ms
  fastInterval: number;        // 500ms
  slowInterval: number;        // 5000ms
  maxRetries: number;          // 3
  backoffMultiplier: number;   // 2
  maxBackoff: number;          // 30000ms
}

export interface PollingState {
  isPolling: boolean;
  currentInterval: number;
  retryCount: number;
  lastPollTime: string | null;
  error: string | null;
}

// Store types
export interface WizardStoreState {
  // Wizard state
  wizardState: WizardState | null;
  serverState: WizardState | null;
  localChanges: Partial<WizardState> | null;

  // UI state
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;

  // Polling state
  polling: PollingState;

  // Actions
  createState: (data: WizardStateCreate) => Promise<void>;
  loadState: (investigationId: string) => Promise<void>;
  updateState: (updates: Partial<WizardState>) => Promise<void>;
  deleteState: (investigationId: string) => Promise<void>;
  startPolling: (investigationId: string) => void;
  stopPolling: () => void;
  syncWithServer: (investigationId: string) => Promise<void>;
}
```

### Step 2.2: API Service (45 minutes)

**Location:** `/olorin-front/src/shared/services/wizardStateService.ts` (NEW FILE)

```typescript
/**
 * Wizard State API Service.
 *
 * Configuration-driven service for wizard state management.
 */
import axios, { AxiosInstance, AxiosError } from 'axios';
import { z } from 'zod';
import {
  WizardState,
  WizardStateCreate,
  WizardStateUpdate
} from '../types/wizardState';

// Configuration schema
const ConfigSchema = z.object({
  apiBaseUrl: z.string().url(),
  requestTimeoutMs: z.number().int().positive(),
  authToken: z.string().min(1)
});

type Config = z.infer<typeof ConfigSchema>;

/**
 * Load and validate configuration from environment.
 */
function loadConfig(): Config {
  const config = {
    apiBaseUrl: process.env.REACT_APP_API_BASE_URL,
    requestTimeoutMs: parseInt(process.env.REACT_APP_REQUEST_TIMEOUT_MS || '30000'),
    authToken: localStorage.getItem('auth_token') || ''
  };

  const result = ConfigSchema.safeParse(config);
  if (!result.success) {
    console.error('Invalid configuration:', result.error.format());
    throw new Error('Invalid wizard state service configuration');
  }

  return result.data;
}

/**
 * Wizard State API Service.
 */
export class WizardStateService {
  private client: AxiosInstance;
  private config: Config;

  constructor() {
    this.config = loadConfig();
    this.client = axios.create({
      baseURL: `${this.config.apiBaseUrl}/api/v1`,
      timeout: this.config.requestTimeoutMs,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.authToken}`
      }
    });
  }

  /**
   * Create new wizard state.
   */
  async createState(data: WizardStateCreate): Promise<WizardState> {
    try {
      const response = await this.client.post<WizardState>('/wizard-state', data);
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError, 'Failed to create wizard state');
      throw error;
    }
  }

  /**
   * Get wizard state with conditional GET support.
   */
  async getState(investigationId: string, etag?: string): Promise<WizardState | null> {
    try {
      const headers: Record<string, string> = {};
      if (etag) {
        headers['If-None-Match'] = etag;
      }

      const response = await this.client.get<WizardState>(
        `/wizard-state/${investigationId}`,
        { headers }
      );

      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;

      // 304 Not Modified
      if (axiosError.response?.status === 304) {
        return null;
      }

      // 404 Not Found
      if (axiosError.response?.status === 404) {
        return null;
      }

      this.handleError(axiosError, 'Failed to get wizard state');
      throw error;
    }
  }

  /**
   * Update wizard state with optimistic locking.
   */
  async updateState(investigationId: string, data: WizardStateUpdate): Promise<WizardState> {
    try {
      const response = await this.client.put<WizardState>(
        `/wizard-state/${investigationId}`,
        data
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;

      // 409 Conflict (version mismatch)
      if (axiosError.response?.status === 409) {
        throw new Error('State was modified by another request. Please refresh and try again.');
      }

      this.handleError(axiosError, 'Failed to update wizard state');
      throw error;
    }
  }

  /**
   * Delete wizard state.
   */
  async deleteState(investigationId: string): Promise<void> {
    try {
      await this.client.delete(`/wizard-state/${investigationId}`);
    } catch (error) {
      this.handleError(error as AxiosError, 'Failed to delete wizard state');
      throw error;
    }
  }

  /**
   * Get wizard state history.
   */
  async getHistory(investigationId: string, limit: number = 20, offset: number = 0) {
    try {
      const response = await this.client.get(
        `/wizard-state/${investigationId}/history`,
        { params: { limit, offset } }
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError, 'Failed to get wizard state history');
      throw error;
    }
  }

  /**
   * Handle API errors.
   */
  private handleError(error: AxiosError, message: string): void {
    if (error.response) {
      const data = error.response.data as any;
      console.error(`${message}:`, {
        status: error.response.status,
        error: data.error,
        message: data.message,
        details: data.details
      });
    } else if (error.request) {
      console.error(`${message}: No response received`, error.request);
    } else {
      console.error(`${message}:`, error.message);
    }
  }
}

// Export singleton instance
export const wizardStateService = new WizardStateService();
```

**Continue in next response due to length...**