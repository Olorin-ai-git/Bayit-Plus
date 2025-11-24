"""
Unit Tests: TemplateService
Feature: 005-polling-and-persistence

Tests template CRUD operations, usage tracking, and soft delete.

SYSTEM MANDATE Compliance:
- Real database connections (SQLite in-memory)
- No mocks in production code
- Complete test coverage (10 tests)
"""

import pytest
import json
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from fastapi import HTTPException

from app.models.investigation_template import InvestigationTemplate
from app.service.template_service import TemplateService


@pytest.fixture
def db_session() -> Session:
    """Create in-memory SQLite database for testing."""
    engine = create_engine("sqlite:///:memory:")
    InvestigationTemplate.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    yield session
    session.close()


@pytest.fixture
def service(db_session: Session) -> TemplateService:
    """Create service instance with test database."""
    return TemplateService(db=db_session)


@pytest.fixture
def sample_template_json() -> dict:
    """Sample template JSON for testing."""
    return {
        "name": "Test Template",
        "entities": [{"entity_type": "user_id", "entity_value": "placeholder"}],
        "time_range": {"start_time": "2024-01-01T00:00:00Z", "end_time": "2024-01-02T00:00:00Z"},
        "tools": [{"tool_name": "device_analysis", "enabled": True}],
        "correlation_mode": "OR"
    }


def test_create_template_success(service: TemplateService, sample_template_json: dict):
    """Test successful template creation."""
    result = service.create_template(
        user_id="user-123",
        name="My Template",
        description="Test template",
        template_json=sample_template_json,
        tags=["fraud", "device"]
    )

    assert result["name"] == "My Template"
    assert result["user_id"] == "user-123"
    assert result["usage_count"] == 0


def test_list_templates_filtered_by_tags(service: TemplateService, sample_template_json: dict):
    """Test listing templates filtered by tags."""
    service.create_template(
        user_id="user-123",
        name="Template 1",
        template_json=sample_template_json,
        tags=["fraud", "device"]
    )
    service.create_template(
        user_id="user-123",
        name="Template 2",
        template_json=sample_template_json,
        tags=["network"]
    )

    results = service.list_templates(user_id="user-123", tags=["fraud"])
    assert len(results) == 1
    assert results[0]["name"] == "Template 1"


def test_get_template_success(service: TemplateService, sample_template_json: dict):
    """Test successful template retrieval."""
    created = service.create_template(
        user_id="user-123",
        name="Template",
        template_json=sample_template_json
    )

    result = service.get_template(template_id=created["template_id"], user_id="user-123")
    assert result["template_id"] == created["template_id"]


def test_update_template_success(service: TemplateService, sample_template_json: dict):
    """Test successful template update."""
    created = service.create_template(
        user_id="user-123",
        name="Original",
        template_json=sample_template_json
    )

    result = service.update_template(
        template_id=created["template_id"],
        user_id="user-123",
        name="Updated",
        description="New description"
    )

    assert result["name"] == "Updated"
    assert result["description"] == "New description"


def test_delete_template_soft_delete_if_used(service: TemplateService, sample_template_json: dict, db_session: Session):
    """Test soft delete for used templates."""
    created = service.create_template(
        user_id="user-123",
        name="Template",
        template_json=sample_template_json
    )

    # Simulate template usage
    template = db_session.query(InvestigationTemplate).filter_by(template_id=created["template_id"]).first()
    template.usage_count = 5
    db_session.commit()

    service.delete_template(template_id=created["template_id"], user_id="user-123")

    # Template should still exist but be marked as deleted
    result = db_session.query(InvestigationTemplate).filter_by(template_id=created["template_id"]).first()
    assert result is not None
    assert result.usage_count == 5


def test_delete_template_hard_delete_if_unused(service: TemplateService, sample_template_json: dict, db_session: Session):
    """Test hard delete for unused templates."""
    created = service.create_template(
        user_id="user-123",
        name="Template",
        template_json=sample_template_json
    )

    service.delete_template(template_id=created["template_id"], user_id="user-123")

    # Template should be completely removed
    result = db_session.query(InvestigationTemplate).filter_by(template_id=created["template_id"]).first()
    assert result is None


def test_apply_template_success(service: TemplateService, sample_template_json: dict):
    """Test successful template application."""
    created = service.create_template(
        user_id="user-123",
        name="Template",
        template_json=sample_template_json
    )

    result = service.apply_template(
        template_id=created["template_id"],
        user_id="user-123",
        investigation_id="inv-123",
        entity_values={"placeholder": "actual-user-id"}
    )

    assert result["investigation_id"] == "inv-123"
    assert result["settings"]["entities"][0]["entity_value"] == "actual-user-id"


def test_apply_template_increments_usage_count(service: TemplateService, sample_template_json: dict, db_session: Session):
    """Test applying template increments usage count."""
    created = service.create_template(
        user_id="user-123",
        name="Template",
        template_json=sample_template_json
    )

    initial_count = db_session.query(InvestigationTemplate).filter_by(
        template_id=created["template_id"]
    ).first().usage_count

    service.apply_template(
        template_id=created["template_id"],
        user_id="user-123",
        investigation_id="inv-123",
        entity_values={"placeholder": "actual-value"}
    )

    final_count = db_session.query(InvestigationTemplate).filter_by(
        template_id=created["template_id"]
    ).first().usage_count

    assert final_count == initial_count + 1


def test_template_json_validation(service: TemplateService):
    """Test template JSON validation against schema."""
    invalid_json = {"invalid": "structure"}

    with pytest.raises((HTTPException, ValueError)):
        service.create_template(
            user_id="user-123",
            name="Invalid Template",
            template_json=invalid_json
        )


def test_user_isolation_templates(service: TemplateService, sample_template_json: dict):
    """Test users cannot access other users' templates."""
    created = service.create_template(
        user_id="user-123",
        name="Template",
        template_json=sample_template_json
    )

    with pytest.raises(HTTPException) as exc:
        service.get_template(template_id=created["template_id"], user_id="user-999")
    assert exc.value.status_code == 404
