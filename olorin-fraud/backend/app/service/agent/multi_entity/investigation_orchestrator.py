"""
Investigation Orchestrator - Compatibility wrapper for multi-entity investigation orchestration.

This module provides compatibility wrapper functions for the multi-entity investigation
system, maintaining backward compatibility with existing router imports.
"""

from app.service.agent.multi_entity.multi_investigation_coordinator import (
    get_multi_entity_coordinator,
)


def get_multi_entity_orchestrator():
    """
    Get multi-entity investigation orchestrator.

    This is a compatibility wrapper that returns the multi-entity coordinator
    instance to maintain backward compatibility with existing imports.

    Returns:
        MultiEntityInvestigationCoordinator: The coordinator instance
    """
    return get_multi_entity_coordinator()
