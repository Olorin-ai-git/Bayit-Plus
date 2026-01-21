"""
Entity Type Conversion Module
Feature: 001-investigation-state-management

Handles conversion between InvestigationSettings and StructuredInvestigationRequest
entity type formats.
"""

# Mapping from InvestigationSettings entity types to StructuredInvestigationRequest entity types
ENTITY_TYPE_MAPPING = {
    "ip_address": "ip",
    "user_id": "user",
    "email": "email",
    "device_id": "device",
    "session_id": "session",
}


def convert_entity_type(investigation_entity_type: str) -> str:
    """
    Convert entity type from InvestigationSettings format to StructuredInvestigationRequest format.

    Args:
        investigation_entity_type: Entity type from InvestigationSettings

    Returns:
        Entity type compatible with StructuredInvestigationRequest
    """
    return ENTITY_TYPE_MAPPING.get(investigation_entity_type, investigation_entity_type)
