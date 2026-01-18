"""
Support System API Schemas
Request/Response models for support endpoints
"""

from datetime import datetime
from typing import Optional, List, Literal
from pydantic import BaseModel, Field, EmailStr


# Type aliases
TicketStatus = Literal['open', 'in_progress', 'resolved', 'closed']
TicketPriority = Literal['low', 'medium', 'high', 'urgent']
TicketCategory = Literal['billing', 'technical', 'feature', 'general']


# ============================================================================
# Support Chat Schemas
# ============================================================================

class SupportChatRequest(BaseModel):
    """Request for voice support chat"""
    message: str
    conversation_id: Optional[str] = None
    language: Optional[str] = 'en'
    app_context: Optional[dict] = None  # Current screen, recent actions, etc.


class SupportChatResponse(BaseModel):
    """Response from voice support chat"""
    message: str
    conversation_id: str
    language: str = 'en'

    # Voice-optimized response
    spoken_response: Optional[str] = None

    # Docs referenced for transparency
    docs_referenced: List[str] = Field(default_factory=list)

    # Escalation indicator
    escalation_needed: bool = False
    escalation_reason: Optional[str] = None

    # Suggested actions
    suggested_action: Optional[dict] = None  # {type, payload}

    # Confidence score
    confidence: float = 0.8


# ============================================================================
# Documentation Schemas
# ============================================================================

class DocCategory(BaseModel):
    """Documentation category"""
    id: str
    title: str
    title_key: str
    icon: str
    article_count: int


class DocArticle(BaseModel):
    """Documentation article metadata"""
    id: str
    slug: str
    title: str
    title_key: str
    category: str
    language: str
    excerpt: Optional[str] = None
    last_updated: Optional[datetime] = None


class DocContent(BaseModel):
    """Documentation article content"""
    id: str
    slug: str
    title: str
    content: str  # Markdown content
    category: str
    language: str
    related_articles: List[str] = Field(default_factory=list)
    last_updated: Optional[datetime] = None


class DocsListResponse(BaseModel):
    """Response for listing documentation"""
    categories: List[DocCategory]
    articles: List[DocArticle]
    total_articles: int


class DocSearchRequest(BaseModel):
    """Request for searching documentation"""
    query: str
    language: Optional[str] = 'en'
    category: Optional[str] = None
    limit: int = Field(default=10, le=50)


class DocSearchResult(BaseModel):
    """Single search result"""
    article: DocArticle
    snippet: str
    score: float


class DocSearchResponse(BaseModel):
    """Response for documentation search"""
    results: List[DocSearchResult]
    total: int
    query: str


# ============================================================================
# FAQ Schemas
# ============================================================================

class FAQItem(BaseModel):
    """FAQ item"""
    id: str
    question: str
    answer: str
    category: str
    views: int = 0
    helpful_yes: int = 0
    helpful_no: int = 0


class FAQListResponse(BaseModel):
    """Response for listing FAQs"""
    items: List[FAQItem]
    total: int


class FAQFeedbackRequest(BaseModel):
    """Request for FAQ feedback"""
    faq_id: str
    helpful: bool


# ============================================================================
# Ticket Schemas
# ============================================================================

class TicketCreateRequest(BaseModel):
    """Request to create a support ticket"""
    subject: str = Field(..., min_length=5, max_length=200)
    message: str = Field(..., min_length=10, max_length=5000)
    category: TicketCategory = 'general'
    priority: Optional[TicketPriority] = None  # Auto-detected if not provided
    language: Optional[str] = 'en'
    voice_conversation_id: Optional[str] = None


class TicketMessageRequest(BaseModel):
    """Request to add a message to a ticket"""
    content: str = Field(..., min_length=1, max_length=5000)
    attachments: List[str] = Field(default_factory=list)


class TicketNoteRequest(BaseModel):
    """Request to add an admin note (admin only)"""
    content: str = Field(..., min_length=1, max_length=2000)


class TicketUpdateRequest(BaseModel):
    """Request to update ticket status/priority (admin only)"""
    status: Optional[TicketStatus] = None
    priority: Optional[TicketPriority] = None
    assigned_to: Optional[str] = None
    tags: Optional[List[str]] = None


class TicketMessageResponse(BaseModel):
    """Ticket message in response"""
    author_id: str
    author_name: str
    author_role: str
    content: str
    created_at: datetime
    attachments: List[str] = Field(default_factory=list)


class TicketNoteResponse(BaseModel):
    """Ticket note in response (admin only)"""
    author_id: str
    author_name: str
    content: str
    created_at: datetime


class TicketResponse(BaseModel):
    """Support ticket response"""
    id: str
    subject: str
    message: str
    category: TicketCategory
    status: TicketStatus
    priority: TicketPriority
    language: str

    # User info
    user_id: str
    user_email: str
    user_name: str

    # Assignment
    assigned_to: Optional[str] = None
    assigned_at: Optional[datetime] = None

    # Thread
    messages: List[TicketMessageResponse] = Field(default_factory=list)

    # Timestamps
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None

    # Tags
    tags: List[str] = Field(default_factory=list)

    class Config:
        from_attributes = True


class TicketAdminResponse(TicketResponse):
    """Support ticket response with admin-only fields"""
    notes: List[TicketNoteResponse] = Field(default_factory=list)
    first_response_at: Optional[datetime] = None
    resolution_time_minutes: Optional[int] = None
    voice_conversation_id: Optional[str] = None


class TicketListResponse(BaseModel):
    """Response for listing tickets"""
    tickets: List[TicketResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class TicketAdminListResponse(BaseModel):
    """Response for admin ticket listing"""
    tickets: List[TicketAdminResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

    # Aggregate stats
    by_status: dict = Field(default_factory=dict)
    by_priority: dict = Field(default_factory=dict)
    by_category: dict = Field(default_factory=dict)


# ============================================================================
# Conversation Rating Schemas
# ============================================================================

class ConversationRatingRequest(BaseModel):
    """Request to rate a voice support conversation"""
    conversation_id: str
    rating: int = Field(..., ge=1, le=5)
    feedback: Optional[str] = Field(None, max_length=500)


class ConversationRatingResponse(BaseModel):
    """Response for conversation rating"""
    conversation_id: str
    rating: int
    feedback: Optional[str] = None
    thanked: bool = True


# ============================================================================
# Analytics Schemas (Admin)
# ============================================================================

class SupportAnalyticsRequest(BaseModel):
    """Request for support analytics"""
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class SupportAnalyticsResponse(BaseModel):
    """Response for support analytics"""
    period_start: datetime
    period_end: datetime

    # Ticket metrics
    tickets_created: int
    tickets_resolved: int
    tickets_open: int

    # By category
    tickets_by_category: dict

    # By priority
    tickets_by_priority: dict

    # Voice metrics
    voice_conversations: int
    voice_escalations: int
    escalation_rate: float

    # Performance
    avg_first_response_minutes: Optional[float] = None
    avg_resolution_minutes: Optional[float] = None

    # Satisfaction
    avg_rating: Optional[float] = None
    ratings_count: int

    # Common topics
    common_topics: List[str] = Field(default_factory=list)
