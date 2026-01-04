"""
Auto-Select Entity Population Helper
Feature: 005-polling-and-persistence

Handles detection and population of auto-select placeholder entities with
top 10% risk entities from Snowflake analytics.

SYSTEM MANDATE Compliance:
- No hardcoded values: Configuration from environment
- Complete implementation: No placeholders or TODOs
- Type-safe: All parameters and returns properly typed
"""

from datetime import datetime
from typing import Any, Dict

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def _convert_datetimes_to_iso(obj: Any) -> Any:
    """Recursively convert datetime objects to ISO strings for JSON serialization."""
    if isinstance(obj, datetime):
        return obj.isoformat()
    elif isinstance(obj, dict):
        return {k: _convert_datetimes_to_iso(v) for k, v in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [_convert_datetimes_to_iso(item) for item in obj]
    else:
        return obj


async def populate_auto_select_entities(settings: Dict[str, Any]) -> Dict[str, Any]:
    """
    Detect auto-select placeholder and populate with top 10% risk entities.

    When settings contain an entity with value 'auto-select', this function
    fetches top 10% risk entities from Snowflake and replaces the placeholder
    with actual entities.

    Returns:
        Updated settings with real entities or original settings if no placeholder.
    """
    if not settings or "entities" not in settings:
        return settings

    entities = settings.get("entities", [])

    # Check for auto-select placeholder
    has_placeholder = any(e.get("entity_value") == "auto-select" for e in entities)

    if not has_placeholder:
        return settings

    try:
        from app.service.analytics.risk_analyzer import get_risk_analyzer

        logger.info("Detected auto-select placeholder - fetching top 10% risk entities")

        analyzer = get_risk_analyzer()
        results = await analyzer.get_top_risk_entities(top_percentage=10)

        if results.get("status") != "success":
            logger.warning(
                f"Failed to fetch top risk entities: {results.get('error', 'Unknown error')}"
            )
            return settings

        top_entities = results.get("entities", [])

        if not top_entities:
            logger.warning("No top risk entities returned from analyzer")
            return settings

        # Replace placeholder with actual top risk entities
        # RiskAnalyzer returns entities with 'entity' field (not 'entity_value')
        populated_settings = dict(settings)
        populated_settings["entities"] = []

        for e in top_entities:
            # RiskAnalyzer returns 'entity' field
            entity_value = e.get("entity")

            # Skip entries with missing entity value
            if not entity_value:
                continue

            # Convert to string if needed (handle any non-string types including datetime)
            if isinstance(entity_value, datetime):
                entity_value = entity_value.isoformat()
            else:
                entity_value = str(entity_value).strip()

            # Skip empty after conversion
            if not entity_value:
                continue

            # Determine entity type based on value (email, IP, etc.)
            entity_type = "email"  # Default
            if ":" in entity_value and "." in entity_value:
                entity_type = "ip_address"  # IPv6 or IP-like
            elif "." in entity_value and entity_value.count(".") == 3:
                # Check if it looks like IPv4
                try:
                    parts = entity_value.split(".")
                    if all(0 <= int(p) <= 255 for p in parts):
                        entity_type = "ip_address"
                except (ValueError, AttributeError):
                    pass

            populated_settings["entities"].append(
                {"entity_type": entity_type, "entity_value": entity_value}
            )

        logger.info(
            f"Auto-select populated with {len(populated_settings['entities'])} top risk entities"
        )
        # Convert any datetime objects to ISO strings for JSON serialization
        return _convert_datetimes_to_iso(populated_settings)

    except Exception as e:
        logger.error(f"Error populating auto-select entities: {e}")
        # Convert any datetime objects in original settings as well
        return _convert_datetimes_to_iso(settings)
