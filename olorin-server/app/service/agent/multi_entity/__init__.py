"""
Multi-Entity Investigation System

Advanced multi-entity investigation capabilities supporting complex fraud patterns,
cross-entity analysis, and coordinated investigation workflows.
"""

from .entity_manager import (
    Entity,
    EntityGraph,
    EntityManager,
    EntityRelationship,
    EntityType,
    get_entity_manager,
)
from .transaction_entity_factory import TransactionEntityFactory

__all__ = [
    # Entity Management
    "EntityManager",
    "Entity",
    "EntityType",
    "EntityRelationship",
    "EntityGraph",
    "get_entity_manager",
    # Transaction Entity Factory
    "TransactionEntityFactory",
]
