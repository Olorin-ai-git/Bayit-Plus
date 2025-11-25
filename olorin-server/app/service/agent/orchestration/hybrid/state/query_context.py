"""
Query Context Object

Ensures entity consistency across all tool queries and prevents entity drift.
"""

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any, Dict, Optional


@dataclass
class QueryContext:
    """
    Centralized query context to prevent entity drift.

    All tool queries must be generated through this context to ensure
    the correct entity is used consistently throughout the investigation.
    """

    investigation_id: str
    entity_id: str
    entity_type: str
    date_range_days: int = 7
    created_at: datetime = None

    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now()

    @property
    def start_date(self) -> datetime:
        """Get start date for queries based on date range."""
        return self.created_at - timedelta(days=self.date_range_days)

    @property
    def end_date(self) -> datetime:
        """Get end date for queries (now)."""
        return self.created_at

    def get_query_parameters(self) -> Dict[str, Any]:
        """
        Get standardized query parameters for tool execution.

        Returns:
            Dictionary with required query parameters
        """
        return {
            "investigation_id": self.investigation_id,
            "entity_id": self.entity_id,
            "entity_type": self.entity_type,
            "start_date": self.start_date.isoformat(),
            "end_date": self.end_date.isoformat(),
            "date_range_days": self.date_range_days,
        }

    def create_tool_context(self, tool_name: str) -> Dict[str, Any]:
        """
        Create tool-specific context with entity information.

        Args:
            tool_name: Name of the tool being executed

        Returns:
            Tool execution context with entity details
        """
        return {
            "tool_name": tool_name,
            "investigation_context": {
                "investigation_id": self.investigation_id,
                "entity_id": self.entity_id,
                "entity_type": self.entity_type,
                "date_range_days": self.date_range_days,
            },
            "query_parameters": self.get_query_parameters(),
            "execution_timestamp": datetime.now().isoformat(),
        }

    def validate_entity_consistency(self, used_entity: str) -> bool:
        """
        Validate that the entity being used matches the investigation entity.

        Args:
            used_entity: Entity found in query or tool execution

        Returns:
            True if entities match, False if drift detected
        """
        if not used_entity:
            return False

        # Normalize entities for comparison
        original = str(self.entity_id).strip().lower()
        used = str(used_entity).strip().lower()

        return original == used

    def format_entity_for_query(self, query_type: str = "sql") -> str:
        """
        Format entity for use in queries with proper escaping.

        Args:
            query_type: Type of query (sql, api, etc.)

        Returns:
            Properly formatted entity string
        """
        if query_type.lower() == "sql":
            # Escape single quotes for SQL
            return str(self.entity_id).replace("'", "''")
        elif query_type.lower() == "api":
            # URL encode for API calls
            import urllib.parse

            return urllib.parse.quote(str(self.entity_id))
        else:
            # Default: return as string
            return str(self.entity_id)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "investigation_id": self.investigation_id,
            "entity_id": self.entity_id,
            "entity_type": self.entity_type,
            "date_range_days": self.date_range_days,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "start_date": self.start_date.isoformat(),
            "end_date": self.end_date.isoformat(),
        }

    @classmethod
    def from_state(cls, state: Dict[str, Any]) -> "QueryContext":
        """
        Create QueryContext from investigation state.

        Args:
            state: Investigation state dictionary

        Returns:
            QueryContext object with entity information
        """
        return cls(
            investigation_id=state.get("investigation_id", "unknown"),
            entity_id=state.get("entity_id", "unknown"),
            entity_type=state.get("entity_type", "unknown"),
            date_range_days=state.get("date_range_days", 7),
        )

    def __str__(self) -> str:
        """String representation for logging."""
        return f"QueryContext(investigation={self.investigation_id}, entity={self.entity_type}:{self.entity_id})"


def create_query_context(
    investigation_id: str, entity_id: str, entity_type: str, date_range_days: int = 7
) -> QueryContext:
    """
    Create a new QueryContext object.

    Args:
        investigation_id: Unique investigation identifier
        entity_id: Entity being investigated
        entity_type: Type of entity (ip, user_id, etc.)
        date_range_days: Number of days to look back for data

    Returns:
        QueryContext object
    """
    return QueryContext(
        investigation_id=investigation_id,
        entity_id=entity_id,
        entity_type=entity_type,
        date_range_days=date_range_days,
    )


def validate_tool_context(tool_context: Dict[str, Any]) -> bool:
    """
    Validate that tool context contains required entity information.

    Args:
        tool_context: Tool execution context

    Returns:
        True if context is valid, False otherwise
    """
    required_fields = ["investigation_id", "entity_id", "entity_type"]

    if "investigation_context" not in tool_context:
        return False

    context = tool_context["investigation_context"]

    for field in required_fields:
        if field not in context or not context[field]:
            return False

    return True
