"""
Demo Portal Admin Routes

Admin-only endpoints for managing private demo codes.

Routes:
  POST   /api/v1/demo/admin/codes         — create a demo code
  GET    /api/v1/demo/admin/codes         — list existing codes
  DELETE /api/v1/demo/admin/codes/{code}  — revoke a demo code
"""

import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.routes.demo_proxy_schemas import (
    CreateDemoCodeRequest,
    DemoCodeItem,
    ListDemoCodesResponse,
)
from app.core.logging_config import get_logger
from app.core.security import get_current_admin_user
from app.models.demo_code import DemoCode
from app.models.user import User

logger = get_logger(__name__)

router = APIRouter(prefix="/demo/admin", tags=["demo", "admin"])

CODE_BYTES = 9  # ~12 URL-safe chars
CODE_PREFIX = "private-"


def _generate_code() -> str:
    """Return a URL-safe demo code like 'private-aB3xZ_qf9P-w'."""
    return CODE_PREFIX + secrets.token_urlsafe(CODE_BYTES)


def _to_item(doc: DemoCode) -> DemoCodeItem:
    expires = doc.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    return DemoCodeItem(
        code=doc.code,
        content_ids=doc.content_ids,
        expires_at=expires.isoformat(),
        max_uses=doc.max_uses,
        use_count=doc.use_count,
    )


@router.post(
    "/codes",
    response_model=DemoCodeItem,
    summary="Create a private demo code (admin)",
    status_code=status.HTTP_201_CREATED,
)
async def create_demo_code(
    request: CreateDemoCodeRequest,
    admin: User = Depends(get_current_admin_user),
) -> DemoCodeItem:
    """Create a new demo code. If `code` omitted, one is generated."""
    code = (request.code or _generate_code()).strip()
    if not code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Code must be non-empty.",
        )

    existing = await DemoCode.find_one({"code": code})
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A code with that value already exists.",
        )

    expires_at = datetime.now(timezone.utc) + timedelta(
        days=request.expires_in_days
    )
    doc = DemoCode(
        code=code,
        content_ids=request.content_ids,
        expires_at=expires_at,
        max_uses=request.max_uses,
        use_count=0,
    )
    await doc.insert()
    logger.info(
        "Demo code created",
        extra={
            "code": code,
            "content_ids": request.content_ids,
            "admin_email": admin.email,
        },
    )
    return _to_item(doc)


@router.get(
    "/codes",
    response_model=ListDemoCodesResponse,
    summary="List demo codes (admin)",
)
async def list_demo_codes(
    _admin: User = Depends(get_current_admin_user),
) -> ListDemoCodesResponse:
    """Return all demo codes, newest expiry first."""
    docs = await DemoCode.find_all().sort("-expires_at").to_list()
    return ListDemoCodesResponse(
        codes=[_to_item(d) for d in docs],
        total=len(docs),
    )


@router.delete(
    "/codes/{code}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Revoke (delete) a demo code (admin)",
)
async def delete_demo_code(
    code: str,
    admin: User = Depends(get_current_admin_user),
) -> None:
    """Permanently delete a demo code."""
    doc = await DemoCode.find_one({"code": code})
    if doc is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Code not found.",
        )
    await doc.delete()
    logger.info(
        "Demo code revoked",
        extra={"code": code, "admin_email": admin.email},
    )
