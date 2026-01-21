"""
Integration Tests for Support Service

Tests the SupportService functionality including ticket management,
voice chat, FAQ management, and analytics.
Uses real database operations with test collections.
"""

import asyncio
from datetime import datetime, timezone
from typing import List, Optional

import pytest
import pytest_asyncio
from beanie import init_beanie
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings


@pytest_asyncio.fixture
async def test_db_client():
    """Create test database client with required models."""
    from app.models.recording import RecordingQuota
    from app.models.support import SupportConversation, SupportTicket
    from app.models.user import User

    test_db_name = f"{settings.MONGODB_DB_NAME}_support_test"
    mongodb_url = settings.MONGODB_URL

    client = AsyncIOMotorClient(mongodb_url)

    await init_beanie(
        database=client[test_db_name],
        document_models=[
            SupportTicket,
            SupportConversation,
            User,
        ],
    )

    yield client

    # Cleanup - drop test database
    await client.drop_database(test_db_name)
    client.close()


@pytest_asyncio.fixture
async def sample_user(test_db_client):
    """Create a sample user for testing."""
    from app.models.user import User

    user = User(
        email="support_test@example.com",
        name="Support Test User",
        hashed_password="hashed_test_password",
        is_active=True,
        is_verified=True,
    )
    await user.insert()

    yield user

    # Cleanup
    try:
        await user.delete()
    except Exception:
        pass


@pytest_asyncio.fixture
async def sample_admin_user(test_db_client):
    """Create a sample admin user for testing."""
    from app.models.user import User

    admin = User(
        email="admin_test@example.com",
        name="Admin Test User",
        hashed_password="hashed_admin_password",
        is_active=True,
        is_verified=True,
        role="admin",
    )
    await admin.insert()

    yield admin

    # Cleanup
    try:
        await admin.delete()
    except Exception:
        pass


@pytest_asyncio.fixture
async def sample_ticket(test_db_client, sample_user):
    """Create a sample support ticket for testing."""
    from app.models.support import SupportTicket

    ticket = SupportTicket(
        user_id=sample_user.id,
        user_email=sample_user.email,
        user_name=sample_user.name,
        subject="Test Support Request",
        message="I need help with something.",
        category="general",
        status="open",
        priority="medium",
        language="en",
    )
    await ticket.insert()

    yield ticket

    # Cleanup
    try:
        await ticket.delete()
    except Exception:
        pass


class TestSupportServiceInit:
    """Tests for SupportService initialization."""

    def test_service_initialization(self):
        """Test service initializes correctly."""
        from app.services.support import SupportService

        service = SupportService()

        assert service is not None
        assert hasattr(service, "async_client")
        assert hasattr(service, "max_tokens")
        assert hasattr(service, "escalation_threshold")

    def test_service_singleton_exists(self):
        """Test singleton instance is available."""
        from app.services.support import support_service

        assert support_service is not None

    def test_service_has_required_methods(self):
        """Test service has all required methods."""
        from app.services.support import SupportService

        service = SupportService()

        # Ticket methods
        assert hasattr(service, "create_ticket")
        assert hasattr(service, "get_ticket")
        assert hasattr(service, "list_user_tickets")
        assert hasattr(service, "list_admin_tickets")
        assert hasattr(service, "update_ticket")
        assert hasattr(service, "add_ticket_message")
        assert hasattr(service, "add_ticket_note")

        # Voice chat methods
        assert hasattr(service, "chat")
        assert hasattr(service, "chat_streaming")
        assert hasattr(service, "rate_conversation")

        # FAQ methods
        assert hasattr(service, "get_faq_by_category")
        assert hasattr(service, "record_faq_view")
        assert hasattr(service, "record_faq_feedback")

        # Analytics methods
        assert hasattr(service, "get_analytics")


class TestSupportTicketModel:
    """Tests for SupportTicket model."""

    @pytest.mark.asyncio
    async def test_ticket_creation(self, test_db_client, sample_user):
        """Test creating a support ticket."""
        from app.models.support import SupportTicket

        ticket = SupportTicket(
            user_id=sample_user.id,
            user_email=sample_user.email,
            user_name=sample_user.name,
            subject="Test Ticket",
            message="Test message content",
            category="technical",
            priority="high",
        )
        await ticket.insert()

        assert ticket.id is not None
        assert ticket.status == "open"
        assert ticket.priority == "high"
        assert ticket.category == "technical"

        # Cleanup
        await ticket.delete()

    @pytest.mark.asyncio
    async def test_ticket_default_values(self, test_db_client, sample_user):
        """Test ticket has correct default values."""
        from app.models.support import SupportTicket

        ticket = SupportTicket(
            user_id=sample_user.id,
            user_email=sample_user.email,
            user_name=sample_user.name,
            subject="Test Subject",
            message="Test message",
        )
        await ticket.insert()

        assert ticket.status == "open"
        assert ticket.priority == "medium"
        assert ticket.category == "general"
        assert ticket.language == "en"
        assert len(ticket.messages) == 0
        assert len(ticket.notes) == 0
        assert len(ticket.tags) == 0

        # Cleanup
        await ticket.delete()

    @pytest.mark.asyncio
    async def test_ticket_fields(self, test_db_client, sample_ticket):
        """Test ticket has all expected fields."""
        assert hasattr(sample_ticket, "user_id")
        assert hasattr(sample_ticket, "user_email")
        assert hasattr(sample_ticket, "user_name")
        assert hasattr(sample_ticket, "subject")
        assert hasattr(sample_ticket, "message")
        assert hasattr(sample_ticket, "category")
        assert hasattr(sample_ticket, "status")
        assert hasattr(sample_ticket, "priority")
        assert hasattr(sample_ticket, "language")
        assert hasattr(sample_ticket, "messages")
        assert hasattr(sample_ticket, "notes")
        assert hasattr(sample_ticket, "assigned_to")
        assert hasattr(sample_ticket, "tags")
        assert hasattr(sample_ticket, "created_at")
        assert hasattr(sample_ticket, "updated_at")


class TestTicketMessage:
    """Tests for TicketMessage model."""

    def test_ticket_message_creation(self):
        """Test creating a ticket message."""
        from app.models.support import TicketMessage

        message = TicketMessage(
            author_id=str(ObjectId()),
            author_name="Test User",
            author_role="user",
            content="This is a test message.",
        )

        assert message.author_name == "Test User"
        assert message.author_role == "user"
        assert message.content == "This is a test message."
        assert message.created_at is not None

    def test_ticket_message_roles(self):
        """Test valid author roles for messages."""
        from app.models.support import TicketMessage

        # User role
        user_msg = TicketMessage(
            author_id=str(ObjectId()),
            author_name="User",
            author_role="user",
            content="User message",
        )
        assert user_msg.author_role == "user"

        # Support role
        support_msg = TicketMessage(
            author_id=str(ObjectId()),
            author_name="Support",
            author_role="support",
            content="Support response",
        )
        assert support_msg.author_role == "support"

        # System role
        system_msg = TicketMessage(
            author_id=str(ObjectId()),
            author_name="System",
            author_role="system",
            content="System notification",
        )
        assert system_msg.author_role == "system"


class TestTicketNote:
    """Tests for TicketNote model."""

    def test_ticket_note_creation(self):
        """Test creating an internal ticket note."""
        from app.models.support import TicketNote

        note = TicketNote(
            author_id=str(ObjectId()),
            author_name="Admin User",
            content="Internal note for the team.",
        )

        assert note.author_name == "Admin User"
        assert note.content == "Internal note for the team."
        assert note.is_internal is True
        assert note.created_at is not None


class TestCreateTicket:
    """Tests for creating tickets."""

    @pytest.mark.asyncio
    async def test_create_ticket(self, test_db_client, sample_user):
        """Test creating a ticket through service."""
        from app.services.support import SupportService

        service = SupportService()

        ticket = await service.create_ticket(
            user=sample_user,
            subject="New Test Ticket",
            message="I have a question about billing.",
            category="billing",
            priority="high",
            language="en",
        )

        assert ticket is not None
        assert ticket.subject == "New Test Ticket"
        assert ticket.category == "billing"
        assert ticket.priority == "high"
        assert ticket.user_id == sample_user.id

        # Cleanup
        await ticket.delete()

    @pytest.mark.asyncio
    async def test_create_ticket_default_priority(self, test_db_client, sample_user):
        """Test creating ticket with default priority."""
        from app.services.support import SupportService

        service = SupportService()

        ticket = await service.create_ticket(
            user=sample_user,
            subject="Default Priority Ticket",
            message="Just a question.",
            category="general",
        )

        assert ticket is not None
        assert ticket.priority == "medium"

        # Cleanup
        await ticket.delete()


class TestGetTicket:
    """Tests for getting tickets."""

    @pytest.mark.asyncio
    async def test_get_ticket_as_owner(self, test_db_client, sample_user, sample_ticket):
        """Test getting ticket as the owner."""
        from app.services.support import SupportService

        service = SupportService()

        ticket = await service.get_ticket(
            ticket_id=str(sample_ticket.id),
            user=sample_user,
        )

        assert ticket is not None
        assert str(ticket.id) == str(sample_ticket.id)

    @pytest.mark.asyncio
    async def test_get_ticket_as_admin(
        self, test_db_client, sample_admin_user, sample_ticket
    ):
        """Test getting ticket as admin."""
        from app.services.support import SupportService

        service = SupportService()

        ticket = await service.get_ticket(
            ticket_id=str(sample_ticket.id),
            is_admin=True,
        )

        assert ticket is not None

    @pytest.mark.asyncio
    async def test_get_ticket_not_found(self, test_db_client, sample_user):
        """Test getting non-existent ticket."""
        from app.services.support import SupportService

        service = SupportService()

        ticket = await service.get_ticket(
            ticket_id=str(ObjectId()),
            user=sample_user,
        )

        assert ticket is None


class TestListUserTickets:
    """Tests for listing user tickets."""

    @pytest.mark.asyncio
    async def test_list_user_tickets(self, test_db_client, sample_user, sample_ticket):
        """Test listing tickets for a user."""
        from app.services.support import SupportService

        service = SupportService()

        tickets, total = await service.list_user_tickets(
            user=sample_user,
            page=1,
            page_size=20,
        )

        assert isinstance(tickets, list)
        assert total >= 1
        assert any(str(t.id) == str(sample_ticket.id) for t in tickets)

    @pytest.mark.asyncio
    async def test_list_user_tickets_with_status_filter(
        self, test_db_client, sample_user, sample_ticket
    ):
        """Test listing tickets with status filter."""
        from app.services.support import SupportService

        service = SupportService()

        tickets, total = await service.list_user_tickets(
            user=sample_user,
            page=1,
            page_size=20,
            status="open",
        )

        assert isinstance(tickets, list)
        for ticket in tickets:
            assert ticket.status == "open"


class TestListAdminTickets:
    """Tests for listing admin tickets."""

    @pytest.mark.asyncio
    async def test_list_admin_tickets(self, test_db_client, sample_ticket):
        """Test listing all tickets as admin."""
        from app.services.support import SupportService

        service = SupportService()

        tickets, total, stats = await service.list_admin_tickets(
            page=1,
            page_size=20,
        )

        assert isinstance(tickets, list)
        assert isinstance(total, int)
        assert isinstance(stats, dict)

    @pytest.mark.asyncio
    async def test_list_admin_tickets_with_filters(
        self, test_db_client, sample_ticket
    ):
        """Test listing tickets with multiple filters."""
        from app.services.support import SupportService

        service = SupportService()

        tickets, total, stats = await service.list_admin_tickets(
            page=1,
            page_size=20,
            status="open",
            priority="medium",
            category="general",
        )

        assert isinstance(tickets, list)
        for ticket in tickets:
            assert ticket.status == "open"
            assert ticket.priority == "medium"


class TestUpdateTicket:
    """Tests for updating tickets."""

    @pytest.mark.asyncio
    async def test_update_ticket_status(
        self, test_db_client, sample_admin_user, sample_ticket
    ):
        """Test updating ticket status."""
        from app.services.support import SupportService

        service = SupportService()

        updated = await service.update_ticket(
            ticket_id=str(sample_ticket.id),
            admin=sample_admin_user,
            status="in_progress",
        )

        assert updated is not None
        assert updated.status == "in_progress"

    @pytest.mark.asyncio
    async def test_update_ticket_priority(
        self, test_db_client, sample_admin_user, sample_ticket
    ):
        """Test updating ticket priority."""
        from app.services.support import SupportService

        service = SupportService()

        updated = await service.update_ticket(
            ticket_id=str(sample_ticket.id),
            admin=sample_admin_user,
            priority="urgent",
        )

        assert updated is not None
        assert updated.priority == "urgent"

    @pytest.mark.asyncio
    async def test_update_ticket_assignment(
        self, test_db_client, sample_admin_user, sample_ticket
    ):
        """Test assigning ticket to admin."""
        from app.services.support import SupportService

        service = SupportService()

        updated = await service.update_ticket(
            ticket_id=str(sample_ticket.id),
            admin=sample_admin_user,
            assigned_to=str(sample_admin_user.id),
        )

        assert updated is not None
        assert updated.assigned_to == str(sample_admin_user.id)

    @pytest.mark.asyncio
    async def test_update_ticket_tags(
        self, test_db_client, sample_admin_user, sample_ticket
    ):
        """Test updating ticket tags."""
        from app.services.support import SupportService

        service = SupportService()

        updated = await service.update_ticket(
            ticket_id=str(sample_ticket.id),
            admin=sample_admin_user,
            tags=["important", "billing-issue"],
        )

        assert updated is not None
        assert "important" in updated.tags
        assert "billing-issue" in updated.tags


class TestAddTicketMessage:
    """Tests for adding messages to tickets."""

    @pytest.mark.asyncio
    async def test_add_ticket_message_as_user(
        self, test_db_client, sample_user, sample_ticket
    ):
        """Test user adding message to ticket."""
        from app.services.support import SupportService

        service = SupportService()

        updated = await service.add_ticket_message(
            ticket_id=str(sample_ticket.id),
            author=sample_user,
            content="This is my follow-up question.",
            is_support=False,
        )

        assert updated is not None
        assert len(updated.messages) >= 1
        last_message = updated.messages[-1]
        assert last_message.content == "This is my follow-up question."
        assert last_message.author_role == "user"

    @pytest.mark.asyncio
    async def test_add_ticket_message_as_support(
        self, test_db_client, sample_admin_user, sample_ticket
    ):
        """Test support adding message to ticket."""
        from app.services.support import SupportService

        service = SupportService()

        updated = await service.add_ticket_message(
            ticket_id=str(sample_ticket.id),
            author=sample_admin_user,
            content="Thank you for contacting us. Here is the answer.",
            is_support=True,
        )

        assert updated is not None
        assert len(updated.messages) >= 1
        last_message = updated.messages[-1]
        assert "Thank you" in last_message.content
        assert last_message.author_role == "support"


class TestAddTicketNote:
    """Tests for adding internal notes to tickets."""

    @pytest.mark.asyncio
    async def test_add_ticket_note(
        self, test_db_client, sample_admin_user, sample_ticket
    ):
        """Test adding internal note to ticket."""
        from app.services.support import SupportService

        service = SupportService()

        updated = await service.add_ticket_note(
            ticket_id=str(sample_ticket.id),
            admin=sample_admin_user,
            content="Internal: Customer has been a subscriber for 2 years.",
        )

        assert updated is not None
        assert len(updated.notes) >= 1
        last_note = updated.notes[-1]
        assert "Internal" in last_note.content
        assert last_note.is_internal is True


class TestFAQOperations:
    """Tests for FAQ operations."""

    @pytest.mark.asyncio
    async def test_get_faq_by_category(self, test_db_client):
        """Test getting FAQ entries by category."""
        from app.services.support import SupportService

        service = SupportService()

        faqs = await service.get_faq_by_category(
            category="billing",
            language="en",
        )

        assert isinstance(faqs, list)

    @pytest.mark.asyncio
    async def test_get_faq_all_categories(self, test_db_client):
        """Test getting all FAQ entries."""
        from app.services.support import SupportService

        service = SupportService()

        faqs = await service.get_faq_by_category(language="en")

        assert isinstance(faqs, list)


class TestAnalytics:
    """Tests for support analytics."""

    @pytest.mark.asyncio
    async def test_get_analytics(self, test_db_client, sample_ticket):
        """Test getting support analytics."""
        from app.services.support import SupportService

        service = SupportService()

        analytics = await service.get_analytics()

        assert isinstance(analytics, dict)

    @pytest.mark.asyncio
    async def test_get_analytics_with_date_range(self, test_db_client, sample_ticket):
        """Test getting analytics with date range."""
        from datetime import timedelta

        from app.services.support import SupportService

        service = SupportService()

        start_date = datetime.now(timezone.utc) - timedelta(days=30)
        end_date = datetime.now(timezone.utc)

        analytics = await service.get_analytics(
            start_date=start_date,
            end_date=end_date,
        )

        assert isinstance(analytics, dict)


class TestTicketStatusTransitions:
    """Tests for ticket status transitions."""

    @pytest.mark.asyncio
    async def test_valid_status_values(self, test_db_client, sample_ticket):
        """Test all valid status values can be set."""
        from app.models.support import SupportTicket

        valid_statuses = ["open", "in_progress", "resolved", "closed"]

        for status in valid_statuses:
            sample_ticket.status = status
            await sample_ticket.save()

            # Reload and verify
            ticket = await SupportTicket.get(sample_ticket.id)
            assert ticket.status == status

    @pytest.mark.asyncio
    async def test_status_to_resolved(
        self, test_db_client, sample_admin_user, sample_ticket
    ):
        """Test transitioning to resolved status."""
        from app.services.support import SupportService

        service = SupportService()

        updated = await service.update_ticket(
            ticket_id=str(sample_ticket.id),
            admin=sample_admin_user,
            status="resolved",
        )

        assert updated is not None
        assert updated.status == "resolved"

    @pytest.mark.asyncio
    async def test_status_to_closed(
        self, test_db_client, sample_admin_user, sample_ticket
    ):
        """Test transitioning to closed status."""
        from app.services.support import SupportService

        service = SupportService()

        updated = await service.update_ticket(
            ticket_id=str(sample_ticket.id),
            admin=sample_admin_user,
            status="closed",
        )

        assert updated is not None
        assert updated.status == "closed"


class TestTicketPriorities:
    """Tests for ticket priorities."""

    @pytest.mark.asyncio
    async def test_valid_priority_values(self, test_db_client, sample_ticket):
        """Test all valid priority values can be set."""
        from app.models.support import SupportTicket

        valid_priorities = ["low", "medium", "high", "urgent"]

        for priority in valid_priorities:
            sample_ticket.priority = priority
            await sample_ticket.save()

            # Reload and verify
            ticket = await SupportTicket.get(sample_ticket.id)
            assert ticket.priority == priority


class TestTicketCategories:
    """Tests for ticket categories."""

    @pytest.mark.asyncio
    async def test_valid_category_values(self, test_db_client, sample_ticket):
        """Test all valid category values can be set."""
        from app.models.support import SupportTicket

        valid_categories = ["billing", "technical", "feature", "general"]

        for category in valid_categories:
            sample_ticket.category = category
            await sample_ticket.save()

            # Reload and verify
            ticket = await SupportTicket.get(sample_ticket.id)
            assert ticket.category == category
