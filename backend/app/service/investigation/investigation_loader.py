"""Investigation Loader - Loads investigation data from Postgres with JSON parsing."""

import json
from typing import Any, Dict, List, Optional

from app.models.investigation_state import InvestigationState
from app.persistence import list_investigations
from app.persistence.database import get_db_session
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def _parse_entity_from_settings(settings_json: Optional[str]) -> Dict[str, Any]:
    """Parse entity information from settings_json."""
    result = {"entity_id": None, "entity_type": None, "entity_list": []}

    if not settings_json:
        return result

    try:
        settings_data = json.loads(settings_json)
        entities = settings_data.get("entities", [])

        if not entities:
            return result

        # Extract all entities for compound mode support
        for e in entities:
            entity_dict = (
                e if isinstance(e, dict)
                else (e.__dict__ if hasattr(e, "__dict__") else {})
            )
            if entity_dict.get("entity_type") and entity_dict.get("entity_value"):
                result["entity_list"].append({
                    "entity_type": entity_dict.get("entity_type"),
                    "entity_value": (
                        entity_dict.get("entity_value") or entity_dict.get("entity_id")
                    ),
                })

        # For backward compatibility, set single entity from first
        entity = (
            entities[0] if isinstance(entities[0], dict)
            else (entities[0].__dict__ if hasattr(entities[0], "__dict__") else {})
        )
        result["entity_id"] = entity.get("entity_value") or entity.get("entity_id")
        result["entity_type"] = entity.get("entity_type")

    except (json.JSONDecodeError, AttributeError, KeyError, TypeError):
        pass

    return result


def _parse_progress_data(progress_json: Optional[str]) -> Dict[str, Any]:
    """Parse overall risk score and window dates from progress_json."""
    result = {"overall_risk_score": None, "from_date": None, "to_date": None}

    if not progress_json:
        return result

    try:
        progress_data = json.loads(progress_json)
        result["overall_risk_score"] = (
            progress_data.get("overall_risk_score") or progress_data.get("risk_score")
        )
        result["from_date"] = (
            progress_data.get("from_date") or progress_data.get("window_start")
        )
        result["to_date"] = (
            progress_data.get("to_date") or progress_data.get("window_end")
        )
    except json.JSONDecodeError:
        pass

    return result


def _parse_window_dates_from_settings(
    settings_json: Optional[str], from_date: Optional[str], to_date: Optional[str]
) -> Dict[str, Optional[str]]:
    """Parse window dates from settings_json as fallback."""
    result = {"from_date": from_date, "to_date": to_date}

    if (from_date and to_date) or not settings_json:
        return result

    try:
        settings_data = json.loads(settings_json)

        # Check time_range in settings (primary location for window dates)
        time_range = settings_data.get("time_range", {})
        if isinstance(time_range, dict):
            if not result["from_date"]:
                result["from_date"] = (
                    time_range.get("start_time") or time_range.get("start")
                )
            if not result["to_date"]:
                result["to_date"] = (
                    time_range.get("end_time") or time_range.get("end")
                )

        # Fallback to top-level settings
        if not result["from_date"]:
            result["from_date"] = (
                settings_data.get("from_date") or settings_data.get("window_start")
            )
        if not result["to_date"]:
            result["to_date"] = (
                settings_data.get("to_date") or settings_data.get("window_end")
            )
    except json.JSONDecodeError:
        pass

    return result


def _build_investigation_dict(
    db_inv: InvestigationState,
    entity_info: Dict[str, Any],
    progress_info: Dict[str, Any],
    window_dates: Dict[str, Optional[str]],
) -> Dict[str, Any]:
    """Build investigation dictionary from parsed components."""
    return {
        "id": db_inv.investigation_id,
        "investigation_id": db_inv.investigation_id,
        "entity_id": entity_info["entity_id"],
        "entity_type": entity_info["entity_type"],
        "entity_list": entity_info["entity_list"],
        "overall_risk_score": progress_info["overall_risk_score"],
        "from_date": window_dates["from_date"],
        "to_date": window_dates["to_date"],
        "progress_json": db_inv.progress_json,
        "status": db_inv.status,
        "created_at": db_inv.created_at.isoformat() if db_inv.created_at else None,
        "updated_at": db_inv.updated_at.isoformat() if db_inv.updated_at else None,
    }


def _fallback_lookup(investigation_id: str) -> Optional[Dict[str, Any]]:
    """Fallback to list_investigations when database query fails."""
    investigations = list_investigations()
    for inv in investigations:
        inv_dict = (
            inv if isinstance(inv, dict)
            else inv.__dict__ if hasattr(inv, "__dict__") else {}
        )
        inv_id = inv_dict.get("id") or inv_dict.get("investigation_id")
        if inv_id == investigation_id:
            return inv_dict
    return None


def get_investigation_by_id(investigation_id: str) -> Optional[Dict[str, Any]]:
    """
    Get investigation by ID from Postgres.

    Args:
        investigation_id: Investigation ID

    Returns:
        Investigation dict or None if not found
    """
    try:
        with get_db_session() as session:
            db_inv = (
                session.query(InvestigationState)
                .filter(InvestigationState.investigation_id == investigation_id)
                .first()
            )

            if not db_inv:
                return None

            # Parse entity info from settings_json
            entity_info = _parse_entity_from_settings(db_inv.settings_json)

            # Parse risk score and window dates from progress_json
            progress_info = _parse_progress_data(db_inv.progress_json)

            # Fallback window dates from settings_json
            window_dates = _parse_window_dates_from_settings(
                db_inv.settings_json,
                progress_info["from_date"],
                progress_info["to_date"],
            )

            return _build_investigation_dict(
                db_inv, entity_info, progress_info, window_dates
            )

    except Exception as e:
        logger.error(
            f"Failed to get investigation {investigation_id}: {e}", exc_info=True
        )
        return _fallback_lookup(investigation_id)
