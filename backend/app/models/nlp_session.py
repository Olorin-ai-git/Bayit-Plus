"""
NLP Conversation Session Models

MongoDB models for storing NLP conversation sessions with:
- Message history and tool calls
- Cost tracking across session
- TTL-based automatic cleanup
- User association for authenticated sessions
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Literal, Optional
from uuid import uuid4

from beanie import Document
from pydantic import BaseModel, Field
from pymongo import IndexModel

from app.core.config import settings


class SessionMessage(BaseModel):
    """A message in the conversation session."""

    role: Literal["user", "assistant", "system"]
    content: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ToolCallRecord(BaseModel):
    """Record of a tool call within a session."""

    tool: str
    input: Dict[str, Any]
    output: str
    duration_ms: Optional[int] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class PendingAction(BaseModel):
    """Pending destructive action awaiting confirmation."""

    action_id: str = Field(default_factory=lambda: str(uuid4()))
    action_type: str
    description: str
    parameters: Dict[str, Any]
    context_snapshot: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
        + timedelta(seconds=settings.NLP_ACTION_TOKEN_TTL_SECONDS)
    )


class NLPConversationSession(Document):
    """
    NLP conversation session document.

    Stores conversation history, tool calls, costs, and pending actions
    for interactive CLI sessions. Sessions are automatically cleaned up
    via MongoDB TTL index after expiration.
    """

    session_id: str = Field(default_factory=lambda: str(uuid4()))
    user_id: Optional[str] = None
    platform: str = "bayit"

    messages: List[SessionMessage] = Field(default_factory=list)
    tool_calls: List[ToolCallRecord] = Field(default_factory=list)
    pending_actions: List[PendingAction] = Field(default_factory=list)

    total_cost: float = 0.0
    total_iterations: int = 0

    action_mode: Literal["smart", "confirm_all"] = "smart"
    metadata: Dict[str, Any] = Field(default_factory=dict)

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_activity: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
        + timedelta(minutes=settings.NLP_SESSION_TTL_MINUTES)
    )

    class Settings:
        name = "nlp_conversation_sessions"
        indexes = [
            IndexModel([("session_id", 1)], unique=True),
            IndexModel([("expires_at", 1)], expireAfterSeconds=0),
            IndexModel([("user_id", 1), ("created_at", -1)]),
            IndexModel([("platform", 1), ("created_at", -1)]),
        ]

    def add_message(self, role: Literal["user", "assistant", "system"], content: str) -> None:
        """Add a message to the session history."""
        self.messages.append(SessionMessage(role=role, content=content))
        self.last_activity = datetime.now(timezone.utc)
        self._extend_expiry()

    def add_tool_call(
        self,
        tool: str,
        tool_input: Dict[str, Any],
        output: str,
        duration_ms: Optional[int] = None,
    ) -> None:
        """Record a tool call in the session."""
        self.tool_calls.append(
            ToolCallRecord(tool=tool, input=tool_input, output=output, duration_ms=duration_ms)
        )
        self.last_activity = datetime.now(timezone.utc)
        self._extend_expiry()

    def add_pending_action(
        self,
        action_type: str,
        description: str,
        parameters: Dict[str, Any],
        context_snapshot: str,
    ) -> PendingAction:
        """Add a pending action awaiting confirmation."""
        action = PendingAction(
            action_type=action_type,
            description=description,
            parameters=parameters,
            context_snapshot=context_snapshot,
        )
        self.pending_actions.append(action)
        self.last_activity = datetime.now(timezone.utc)
        self._extend_expiry()
        return action

    def get_pending_action(self, action_id: str) -> Optional[PendingAction]:
        """Get a pending action by ID."""
        for action in self.pending_actions:
            if action.action_id == action_id:
                return action
        return None

    def remove_pending_action(self, action_id: str) -> bool:
        """Remove a pending action after confirmation or expiration."""
        for i, action in enumerate(self.pending_actions):
            if action.action_id == action_id:
                self.pending_actions.pop(i)
                return True
        return False

    def update_cost(self, cost: float, iterations: int = 0) -> None:
        """Update session cost tracking."""
        self.total_cost += cost
        self.total_iterations += iterations
        self.last_activity = datetime.now(timezone.utc)
        self._extend_expiry()

    def get_conversation_history(self, max_messages: Optional[int] = None) -> List[Dict[str, Any]]:
        """Get conversation history for agent context."""
        messages = self.messages
        if max_messages and len(messages) > max_messages:
            messages = messages[-max_messages:]
        return [{"role": m.role, "content": m.content} for m in messages]

    def _extend_expiry(self) -> None:
        """Extend session expiry on activity."""
        self.expires_at = datetime.now(timezone.utc) + timedelta(
            minutes=settings.NLP_SESSION_TTL_MINUTES
        )

    def is_expired(self) -> bool:
        """Check if session has expired."""
        return datetime.now(timezone.utc) > self.expires_at
