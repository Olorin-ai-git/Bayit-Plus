"""
Support System Models
MongoDB models for support tickets, conversations, and analytics
"""

from datetime import datetime, timezone
from typing import List, Literal, Optional

from beanie import Document, PydanticObjectId
from pydantic import BaseModel, Field

# Type definitions
TicketStatus = Literal["open", "in_progress", "resolved", "closed"]
TicketPriority = Literal["low", "medium", "high", "urgent"]
TicketCategory = Literal["billing", "technical", "feature", "general"]


class TicketNote(BaseModel):
    """Internal note on a support ticket (for admins)"""

    author_id: str
    author_name: str
    content: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_internal: bool = True  # Internal notes are not visible to users


class TicketMessage(BaseModel):
    """Message in a support ticket thread"""

    author_id: str
    author_name: str
    author_role: Literal["user", "support", "system"]
    content: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    attachments: List[str] = Field(default_factory=list)


class SupportTicket(Document):
    """Support ticket document"""

    # User information
    user_id: PydanticObjectId
    user_email: str
    user_name: str

    # Ticket details
    subject: str
    message: str
    category: TicketCategory = "general"
    status: TicketStatus = "open"
    priority: TicketPriority = "medium"
    language: str = "en"

    # Voice chat context (if ticket created from voice support)
    voice_conversation_id: Optional[str] = None

    # Thread messages
    messages: List[TicketMessage] = Field(default_factory=list)

    # Admin notes (not visible to user)
    notes: List[TicketNote] = Field(default_factory=list)

    # Assignment
    assigned_to: Optional[str] = None  # Admin user ID
    assigned_at: Optional[datetime] = None

    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    resolved_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None

    # Analytics
    first_response_at: Optional[datetime] = None
    resolution_time_minutes: Optional[int] = None

    # Tags for categorization
    tags: List[str] = Field(default_factory=list)

    class Settings:
        name = "support_tickets"
        indexes = [
            "user_id",
            "status",
            "priority",
            "category",
            "assigned_to",
            "created_at",
            [("status", 1), ("priority", -1), ("created_at", -1)],
        ]


class SupportConversation(Document):
    """Voice support conversation for context building"""

    user_id: PydanticObjectId
    language: str = "en"

    # Conversation messages
    messages: List[dict] = Field(default_factory=list)  # role, content, timestamp

    # Context
    app_context: Optional[dict] = None  # Current screen, recent actions, etc.
    docs_referenced: List[str] = Field(
        default_factory=list
    )  # Doc paths used in context

    # Status
    escalated: bool = False
    escalation_reason: Optional[str] = None
    ticket_id: Optional[PydanticObjectId] = None  # If escalated to ticket

    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # Satisfaction
    rating: Optional[int] = None  # 1-5 stars
    feedback: Optional[str] = None

    class Settings:
        name = "support_conversations"
        indexes = [
            "user_id",
            "created_at",
        ]


class SupportAnalytics(Document):
    """Daily support analytics snapshot"""

    date: datetime  # Date of the snapshot (day granularity)

    # Ticket metrics
    tickets_created: int = 0
    tickets_resolved: int = 0
    tickets_closed: int = 0

    # By category
    tickets_by_category: dict = Field(default_factory=dict)

    # By priority
    tickets_by_priority: dict = Field(default_factory=dict)

    # Voice support metrics
    voice_conversations: int = 0
    voice_escalations: int = 0

    # Performance metrics
    avg_first_response_minutes: Optional[float] = None
    avg_resolution_minutes: Optional[float] = None

    # Satisfaction
    avg_rating: Optional[float] = None
    ratings_count: int = 0

    # Common issues (top keywords/topics)
    common_topics: List[str] = Field(default_factory=list)

    class Settings:
        name = "support_analytics"
        indexes = [
            "date",
        ]


class FAQEntry(Document):
    """FAQ entry for support knowledge base"""

    question_key: str  # i18n key for question
    answer_key: str  # i18n key for answer
    category: str  # general, billing, technical, features

    # Translations (cached)
    translations: dict = Field(default_factory=dict)  # {lang: {question, answer}}

    # Metrics
    views: int = 0
    helpful_yes: int = 0
    helpful_no: int = 0

    # Ordering
    order: int = 0
    is_featured: bool = False

    # Status
    is_active: bool = True

    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "faq_entries"
        indexes = [
            "category",
            "is_active",
            "order",
        ]
