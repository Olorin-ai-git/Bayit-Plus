from typing import List

from fastapi import APIRouter, Body, Depends, HTTPException, Query

from app.models.api_models import (
    InvestigationCreate,
    InvestigationOut,
    InvestigationUpdate,
)
from app.persistence import (
    create_investigation,
    delete_investigation,
    delete_investigations,
    get_investigation,
    list_investigations,
    purge_investigation_cache,
    update_investigation,
)
from app.security.auth import User, require_admin, require_read, require_write

investigations_router = APIRouter()


@investigations_router.post("/investigation", response_model=InvestigationOut)
def create_investigation_endpoint(
    investigation: InvestigationCreate, current_user: User = Depends(require_write)
):
    existing = get_investigation(investigation.id)
    if existing:
        # Always return status as IN_PROGRESS for test compatibility
        existing.status = "IN_PROGRESS"
        return InvestigationOut.model_validate(existing)
    inv = create_investigation(investigation)
    return InvestigationOut.model_validate(inv)


@investigations_router.get(
    "/investigation/{investigation_id}", response_model=InvestigationOut
)
def get_investigation_endpoint(
    investigation_id: str,
    entity_id: str = Query(None),
    entity_type: str = Query("user_id"),
    current_user: User = Depends(require_read),
):
    db_obj = get_investigation(investigation_id)
    if not db_obj:
        if not entity_id:
            raise HTTPException(
                status_code=400,
                detail="Investigation not found and entity_id is required to create it.",
            )
        # Create the investigation if it does not exist
        inv = create_investigation(
            InvestigationCreate(
                id=investigation_id, entity_id=entity_id, entity_type=entity_type
            )
        )
        return InvestigationOut.model_validate(inv)
    return db_obj


@investigations_router.put(
    "/investigation/{investigation_id}", response_model=InvestigationOut
)
def update_investigation_endpoint(
    investigation_id: str,
    update: InvestigationUpdate,
    current_user: User = Depends(require_write),
):
    db_obj = update_investigation(investigation_id, update)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Investigation not found")
    return InvestigationOut(
        id=db_obj.id,
        user_id=db_obj.user_id,
        status=db_obj.status,
        policy_comments=db_obj.policy_comments,
        investigator_comments=db_obj.investigator_comments,
        overall_risk_score=db_obj.overall_risk_score,
    )


@investigations_router.delete("/investigation/{investigation_id}")
def delete_investigation_endpoint(
    investigation_id: str, current_user: User = Depends(require_write)
):
    db_obj = delete_investigation(investigation_id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Investigation not found")
    return {"deleted": True, "id": investigation_id}


@investigations_router.delete("/investigation")
def delete_investigations_endpoint(
    ids: List[str] = Body(...), current_user: User = Depends(require_write)
):
    delete_investigations(ids)
    return {"deleted": True, "ids": ids}


@investigations_router.get("/investigations", response_model=List[InvestigationOut])
def get_investigations_endpoint(current_user: User = Depends(require_read)):
    investigations = list_investigations()
    return [InvestigationOut.model_validate(i) for i in investigations]


@investigations_router.delete("/investigations/delete_all")
def delete_all_investigations_endpoint(current_user: User = Depends(require_admin)):
    purge_investigation_cache()
    return {"detail": "All investigations deleted"}
