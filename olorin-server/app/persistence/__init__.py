from collections import OrderedDict
from typing import List, Optional

from app.models.api_models import (
    Investigation,
    InvestigationCreate,
    InvestigationUpdate,
)

# In-memory investigation store (primary source, max 20)
IN_MEMORY_INVESTIGATIONS = OrderedDict()


# Purge cache at import to avoid stale dicts from previous runs
def _purge_on_import():
    IN_MEMORY_INVESTIGATIONS.clear()


_purge_on_import()

# Helper to enforce max 20 investigations in memory
MAX_IN_MEMORY_INVESTIGATIONS = 20


def _add_to_memory(investigation):
    if investigation.id in IN_MEMORY_INVESTIGATIONS:
        IN_MEMORY_INVESTIGATIONS.move_to_end(investigation.id)
    IN_MEMORY_INVESTIGATIONS[investigation.id] = investigation
    while len(IN_MEMORY_INVESTIGATIONS) > MAX_IN_MEMORY_INVESTIGATIONS:
        IN_MEMORY_INVESTIGATIONS.popitem(last=False)


def create_investigation(investigation_create):
    investigation = Investigation(
        id=investigation_create.id,
        entity_id=investigation_create.entity_id,
        entity_type=investigation_create.entity_type,
        user_id=investigation_create.entity_id,  # Deprecated, kept for backward compatibility
        status="IN_PROGRESS",
        policy_comments="",
        investigator_comments="",
        overall_risk_score=0.0,
        device_llm_thoughts="",
        location_llm_thoughts="",
        network_llm_thoughts="",
        logs_llm_thoughts="",
        device_risk_score=0.0,
        location_risk_score=0.0,
        network_risk_score=0.0,
        logs_risk_score=0.0,
    )
    IN_MEMORY_INVESTIGATIONS[investigation_create.id] = investigation
    return investigation


def get_investigation(investigation_id: str):
    # Only use in-memory investigations
    return IN_MEMORY_INVESTIGATIONS.get(investigation_id)


def update_investigation(investigation_id: str, update: InvestigationUpdate):
    inv = IN_MEMORY_INVESTIGATIONS.get(investigation_id)
    if inv and isinstance(inv, dict):
        inv = Investigation(**inv)
    if inv:
        if hasattr(update, "entity_id") and update.entity_id is not None:
            inv.entity_id = update.entity_id
            inv.user_id = update.entity_id
        if hasattr(update, "entity_type") and update.entity_type is not None:
            inv.entity_type = update.entity_type
        if update.status is not None:
            inv.status = update.status
        if update.policy_comments is not None:
            inv.policy_comments = update.policy_comments
        if update.investigator_comments is not None:
            inv.investigator_comments = update.investigator_comments
        _add_to_memory(inv)
    return inv


def delete_investigation(investigation_id: str):
    # Delete from in-memory
    inv = IN_MEMORY_INVESTIGATIONS.pop(investigation_id, None)
    return inv


def delete_investigations(investigation_ids: List[str]):
    # Delete from in-memory
    for iid in investigation_ids:
        IN_MEMORY_INVESTIGATIONS.pop(iid, None)


def purge_investigation_cache():
    IN_MEMORY_INVESTIGATIONS.clear()


def list_investigations() -> list:
    # Return all investigations from the in-memory store
    return list(IN_MEMORY_INVESTIGATIONS.values())


def update_investigation_llm_thoughts(
    investigation_id: str, domain: str, llm_thoughts: str
):
    inv = IN_MEMORY_INVESTIGATIONS.get(investigation_id)
    # If inv is a dict (legacy), convert to Investigation
    if inv and isinstance(inv, dict):
        inv = Investigation(**inv)
    if not inv:
        return None
    if domain == "device":
        inv.device_llm_thoughts = llm_thoughts
    elif domain == "location":
        inv.location_llm_thoughts = llm_thoughts
    elif domain == "network":
        inv.network_llm_thoughts = llm_thoughts
    _add_to_memory(inv)
    return inv


def ensure_investigation_exists(
    investigation_id: str, entity_id: str, entity_type: str = "user_id"
):
    investigation = get_investigation(investigation_id)
    if not investigation:
        from app.models.api_models import InvestigationCreate

        create_investigation(
            InvestigationCreate(
                id=investigation_id, entity_id=entity_id, entity_type=entity_type
            )
        )
