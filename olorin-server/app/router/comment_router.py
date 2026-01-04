from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException

from app.models.api_models import Investigation
from app.models.comment_message import CommentMessageCreate, CommentMessageRead
from app.security.auth import User, require_read, require_write

comment_router = APIRouter()

# In-memory comment/message store
IN_MEMORY_COMMENTS = []


@comment_router.get(
    "/investigation/{investigation_id}/comment",
    response_model=List[CommentMessageRead],
    summary="Get Comment Messages",
    description="Get all comment messages for an investigation.",
)
async def get_comment_messages(
    investigation_id: str,
    sender: Optional[str] = None,
    current_user: User = Depends(require_read),
):
    # Filter in-memory comments by investigation_id and sender
    results = [c for c in IN_MEMORY_COMMENTS if c.investigation_id == investigation_id]
    if sender:
        results = [c for c in results if c.sender == sender]
    # Sort by timestamp
    results.sort(key=lambda c: c.timestamp)
    return results


@comment_router.post(
    "/investigation/{investigation_id}/comment",
    response_model=CommentMessageRead,
    status_code=201,
    summary="Post Comment Message",
    description="Post a new comment message for an investigation.",
)
def post_comment_message(
    investigation_id: str,
    msg: CommentMessageCreate,
    current_user: User = Depends(require_write),
):
    # Check if investigation exists, create if not (in-memory only)
    from app.persistence import ensure_investigation_exists

    ensure_investigation_exists(investigation_id, msg.entity_id, msg.entity_type)
    # Use CommentMessageRead for the response
    comment_msg = CommentMessageRead(
        id=len(IN_MEMORY_COMMENTS) + 1,
        investigation_id=investigation_id,
        **msg.model_dump(),
    )
    IN_MEMORY_COMMENTS.append(comment_msg)
    return comment_msg
