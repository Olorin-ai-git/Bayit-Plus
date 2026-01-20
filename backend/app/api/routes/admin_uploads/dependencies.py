"""
Admin uploads dependencies and helper functions.
"""

from fastapi import Depends, HTTPException, status

from app.models.user import User
from app.models.admin import Permission
from app.models.upload import UploadJob, UploadJobResponse
from app.core.security import get_current_active_user


def job_to_response(job: UploadJob) -> UploadJobResponse:
    """Convert UploadJob to UploadJobResponse with current_stage and stages."""
    response = UploadJobResponse.from_orm(job)
    response.current_stage = job.get_current_stage()
    response.stages = job.stages or {}
    return response


def has_permission(required_permission: Permission):
    """Dependency to check if user has required permission."""

    async def permission_checker(
        current_user: User = Depends(get_current_active_user),
    ):
        role = current_user.role
        if role not in ["super_admin", "admin"]:
            if required_permission.value not in current_user.custom_permissions:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Permission denied: {required_permission.value} required",
                )
        return current_user

    return permission_checker
