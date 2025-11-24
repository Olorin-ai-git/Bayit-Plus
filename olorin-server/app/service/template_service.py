"""
Template Service
Feature: 005-polling-and-persistence

Provides CRUD operations and template application for investigation templates.
Supports template management, usage tracking, and placeholder replacement.

SYSTEM MANDATE Compliance:
- No hardcoded values: All configuration from environment
- Complete implementation: No placeholders or TODOs
- Type-safe: All parameters and returns properly typed
"""

from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from fastapi import HTTPException
from datetime import datetime
import json

from app.models.investigation_template import InvestigationTemplate
from app.models.investigation_state import InvestigationState
from app.schemas.investigation_state import InvestigationSettings
from app.service.template_helper import replace_placeholders, apply_overrides


class TemplateService:
    """Service for template CRUD operations and application."""

    def __init__(self, db: Session):
        self.db = db

    def list_templates(
        self,
        user_id: str,
        tags: Optional[List[str]] = None,
        limit: int = 20,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """List user templates with filtering and pagination."""
        query = self.db.query(InvestigationTemplate).filter(
            InvestigationTemplate.user_id == user_id
        )

        if tags:
            for tag in tags:
                query = query.filter(InvestigationTemplate.tags.contains([tag]))

        templates = (
            query.order_by(InvestigationTemplate.last_used.desc())
            .limit(limit)
            .offset(offset)
            .all()
        )

        return [template.to_dict() for template in templates]

    def create_template(
        self,
        user_id: str,
        name: str,
        description: str,
        template_json: Dict[str, Any],
        tags: List[str],
    ) -> Dict[str, Any]:
        """Create template with settings validation."""
        InvestigationSettings(**template_json)

        template = InvestigationTemplate(
            user_id=user_id,
            name=name,
            description=description,
            template_json=json.dumps(template_json),
            tags=json.dumps(tags),
            usage_count=0,
            version=1,
        )

        self.db.add(template)
        self.db.commit()
        self.db.refresh(template)

        return template.to_dict()

    def get_template(self, template_id: str, user_id: str) -> Dict[str, Any]:
        """Get template by ID."""
        template = (
            self.db.query(InvestigationTemplate)
            .filter(
                InvestigationTemplate.template_id == template_id,
                InvestigationTemplate.user_id == user_id,
            )
            .first()
        )

        if not template:
            raise HTTPException(
                status_code=404, detail=f"Template {template_id} not found"
            )

        return template.to_dict()

    def update_template(
        self,
        template_id: str,
        user_id: str,
        name: Optional[str] = None,
        description: Optional[str] = None,
        template_json: Optional[Dict[str, Any]] = None,
        tags: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Update template. Increments version if JSON changed."""
        template = (
            self.db.query(InvestigationTemplate)
            .filter(
                InvestigationTemplate.template_id == template_id,
                InvestigationTemplate.user_id == user_id,
            )
            .first()
        )

        if not template:
            raise HTTPException(
                status_code=404, detail=f"Template {template_id} not found"
            )

        if name:
            template.name = name
        if description:
            template.description = description
        if template_json:
            InvestigationSettings(**template_json)
            template.template_json = json.dumps(template_json)
            template.version += 1
        if tags is not None:
            template.tags = json.dumps(tags)

        template.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(template)

        return template.to_dict()

    def delete_template(self, template_id: str, user_id: str) -> None:
        """Delete template."""
        template = (
            self.db.query(InvestigationTemplate)
            .filter(
                InvestigationTemplate.template_id == template_id,
                InvestigationTemplate.user_id == user_id,
            )
            .first()
        )

        if not template:
            raise HTTPException(
                status_code=404, detail=f"Template {template_id} not found"
            )

        self.db.delete(template)
        self.db.commit()

    def apply_template(
        self,
        template_id: str,
        user_id: str,
        investigation_id: str,
        entity_values: Dict[str, str],
        overrides: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Apply template, replace placeholders, create investigation."""
        template = (
            self.db.query(InvestigationTemplate)
            .filter(InvestigationTemplate.template_id == template_id)
            .first()
        )

        if not template:
            raise HTTPException(
                status_code=404, detail=f"Template {template_id} not found"
            )

        settings_str = replace_placeholders(template.template_json, entity_values)
        settings_json = json.loads(settings_str)

        if overrides:
            settings_json = apply_overrides(settings_json, overrides)

        InvestigationSettings(**settings_json)

        state = InvestigationState(
            investigation_id=investigation_id,
            user_id=user_id,
            lifecycle_stage="CREATED",
            settings_json=json.dumps(settings_json),
            progress_json=None,
            status="PENDING",
            version=1,
        )

        template.usage_count += 1
        template.last_used = datetime.utcnow()

        self.db.add(state)
        self.db.commit()
        self.db.refresh(state)

        return state.to_dict()
