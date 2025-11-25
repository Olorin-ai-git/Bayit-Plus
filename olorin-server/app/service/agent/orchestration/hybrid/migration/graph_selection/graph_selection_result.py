"""
Graph Selection Result Types

Typed result objects for graph selection operations to prevent silent failures.
"""

from dataclasses import dataclass
from enum import Enum
from typing import Optional, Union

from langgraph.graph import StateGraph

from ..feature_flags.flag_manager import GraphType


class GraphSelectionError(Exception):
    """Typed exception for graph selection failures."""

    def __init__(self, message: str, investigation_id: str, context: dict = None):
        self.investigation_id = investigation_id
        self.context = context or {}
        super().__init__(message)


class SelectionReason(Enum):
    """Reasons for graph selection."""

    FORCED = "forced"
    ROLLBACK = "rollback"
    AB_TEST = "ab_test"
    FEATURE_FLAG = "feature_flag"
    DEFAULT = "default"
    EMERGENCY_FALLBACK = "emergency_fallback"


@dataclass
class GraphSelectionSpec:
    """Specification for a selected graph."""

    graph_type: GraphType
    selection_reason: SelectionReason
    investigation_id: str
    fallback_occurred: bool = False
    context: dict = None

    def __post_init__(self):
        if self.context is None:
            self.context = {}


@dataclass
class GraphSelectionSuccess:
    """Successful graph selection result."""

    graph: StateGraph
    spec: GraphSelectionSpec

    @property
    def graph_type(self) -> GraphType:
        return self.spec.graph_type

    @property
    def fallback_occurred(self) -> bool:
        return self.spec.fallback_occurred


@dataclass
class GraphSelectionFailure:
    """Failed graph selection result."""

    error: str
    investigation_id: str
    attempted_graph_type: Optional[GraphType]
    context: dict

    def to_exception(self) -> GraphSelectionError:
        return GraphSelectionError(
            self.error,
            self.investigation_id,
            {
                "attempted_graph_type": (
                    self.attempted_graph_type.value
                    if self.attempted_graph_type
                    else None
                ),
                **self.context,
            },
        )


# Union type for graph selection results
GraphSelectionResult = Union[GraphSelectionSuccess, GraphSelectionFailure]


def create_success_result(
    graph: StateGraph,
    graph_type: GraphType,
    reason: SelectionReason,
    investigation_id: str,
    fallback_occurred: bool = False,
    context: dict = None,
) -> GraphSelectionSuccess:
    """Create a successful graph selection result."""
    spec = GraphSelectionSpec(
        graph_type=graph_type,
        selection_reason=reason,
        investigation_id=investigation_id,
        fallback_occurred=fallback_occurred,
        context=context or {},
    )
    return GraphSelectionSuccess(graph=graph, spec=spec)


def create_failure_result(
    error: str,
    investigation_id: str,
    attempted_graph_type: Optional[GraphType] = None,
    context: dict = None,
) -> GraphSelectionFailure:
    """Create a failed graph selection result."""
    return GraphSelectionFailure(
        error=error,
        investigation_id=investigation_id,
        attempted_graph_type=attempted_graph_type,
        context=context or {},
    )


def is_success(result: GraphSelectionResult) -> bool:
    """Check if result is successful."""
    return isinstance(result, GraphSelectionSuccess)


def is_failure(result: GraphSelectionResult) -> bool:
    """Check if result is a failure."""
    return isinstance(result, GraphSelectionFailure)
