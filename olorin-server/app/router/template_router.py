"""
Template API Router
Feature: 005-polling-and-persistence

Provides REST API endpoints for template management with:
- CRUD operations for investigation templates
- Template application to create new investigations
- Tag-based filtering and pagination
- JWT authentication with scope-based authorization

SYSTEM MANDATE Compliance:
- No hardcoded values: All configuration from environment
- Complete implementation: No placeholders or TODOs
- Type-safe: All parameters and returns properly typed
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.persistence.database import get_db
from app.service.template_service import TemplateService
from app.security.auth import User, require_read, require_write

router = APIRouter(
    prefix="/api/v1/templates",
    tags=["Templates"],
    responses={404: {"description": "Not found"}},
)


@router.get(
    "/",
    response_model=List[Dict[str, Any]],
    summary="List templates",
    description="List user templates with optional tag filtering and pagination",
)
async def list_templates(
    tags: Optional[List[str]] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_read),
) -> List[Dict[str, Any]]:
    """List user templates with filtering."""
    service = TemplateService(db)
    return service.list_templates(
        user_id=current_user.username, tags=tags, limit=limit, offset=offset
    )


@router.post(
    "/",
    response_model=Dict[str, Any],
    status_code=status.HTTP_201_CREATED,
    summary="Create template",
    description="Create new investigation template with settings validation",
)
async def create_template(
    name: str,
    description: str,
    template_json: Dict[str, Any],
    tags: List[str] = [],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_write),
) -> Dict[str, Any]:
    """Create template. Validates template JSON against InvestigationSettings schema."""
    service = TemplateService(db)
    return service.create_template(
        user_id=current_user.username,
        name=name,
        description=description,
        template_json=template_json,
        tags=tags,
    )


@router.get(
    "/{template_id}",
    response_model=Dict[str, Any],
    summary="Get template",
    description="Retrieve template by ID",
)
async def get_template(
    template_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_read),
) -> Dict[str, Any]:
    """Get template. Raises 404 if not found or not owned."""
    service = TemplateService(db)
    return service.get_template(template_id=template_id, user_id=current_user.username)


@router.put(
    "/{template_id}",
    response_model=Dict[str, Any],
    summary="Update template",
    description="Update template fields with validation",
)
async def update_template(
    template_id: str,
    name: Optional[str] = None,
    description: Optional[str] = None,
    template_json: Optional[Dict[str, Any]] = None,
    tags: Optional[List[str]] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_write),
) -> Dict[str, Any]:
    """Update template. Increments version if template JSON changed."""
    service = TemplateService(db)
    return service.update_template(
        template_id=template_id,
        user_id=current_user.username,
        name=name,
        description=description,
        template_json=template_json,
        tags=tags,
    )


@router.delete(
    "/{template_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete template",
    description="Delete investigation template",
)
async def delete_template(
    template_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_write),
) -> None:
    """Delete template. Raises 404 if not found."""
    service = TemplateService(db)
    service.delete_template(template_id=template_id, user_id=current_user.username)


@router.post(
    "/{template_id}/apply",
    response_model=Dict[str, Any],
    status_code=status.HTTP_201_CREATED,
    summary="Apply template",
    description="Apply template to create new investigation with placeholder replacement",
)
async def apply_template(
    template_id: str,
    investigation_id: str,
    entity_values: Dict[str, str],
    overrides: Optional[Dict[str, Any]] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_write),
) -> Dict[str, Any]:
    """Apply template to create investigation. Replaces placeholders and increments usage."""
    service = TemplateService(db)
    return service.apply_template(
        template_id=template_id,
        user_id=current_user.username,
        investigation_id=investigation_id,
        entity_values=entity_values,
        overrides=overrides,
    )
