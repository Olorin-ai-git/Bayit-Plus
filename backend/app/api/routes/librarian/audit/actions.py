"""Librarian actions management endpoints."""
import logging
from typing import List, Optional

from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.routes.admin import require_admin
from app.api.routes.librarian.models import ActionResponse
from app.models.librarian import LibrarianAction
from app.models.user import User
from app.services.auto_fixer import rollback_action

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/admin/librarian/actions", response_model=List[ActionResponse])
async def get_librarian_actions(
    audit_id: Optional[str] = None,
    action_type: Optional[str] = None,
    limit: int = 50,
    current_user: User = Depends(require_admin()),
):
    """Get librarian actions/fixes."""
    try:
        query = {}
        if audit_id:
            query["audit_id"] = audit_id
        if action_type:
            query["action_type"] = action_type

        actions = (
            await LibrarianAction.find(query)
            .sort([("timestamp", -1)])
            .limit(limit)
            .to_list()
        )

        content_ids = [action.content_id for action in actions]
        contents = await Content.find({"_id": {"$in": content_ids}}).to_list()
        content_title_map = {str(content.id): content.title for content in contents}

        return [
            ActionResponse(
                action_id=action.action_id,
                audit_id=action.audit_id,
                timestamp=action.timestamp,
                action_type=action.action_type,
                content_id=action.content_id,
                content_type=action.content_type,
                issue_type=action.issue_type,
                description=action.description,
                before_state=action.before_state or {},
                after_state=action.after_state or {},
                confidence_score=action.confidence_score,
                auto_approved=action.auto_approved,
                rolled_back=action.rolled_back,
                content_title=content_title_map.get(action.content_id),
            )
            for action in actions
        ]

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch actions: {str(e)}",
        )


@router.post("/admin/librarian/actions/{action_id}/rollback")
async def rollback_librarian_action(
    action_id: str, current_user: User = Depends(require_admin())
):
    """Rollback a specific librarian action."""
    try:
        result = await rollback_action(action_id)

        if result.success:
            return {"success": True, "message": "Action rolled back successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.error_message or "Rollback failed",
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to rollback action: {str(e)}",
        )


@router.post("/admin/librarian/audits/{audit_id}/pause")
