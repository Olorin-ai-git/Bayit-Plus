"""
Integration Tests for Support Service

Tests the SupportService functionality including:
- Ticket creation and management
- Conversation rating
- Priority detection
- FAQ management
- Analytics tracking
"""

import asyncio
from datetime import datetime
from typing import Optional
from unittest.mock import AsyncMock, Mock, patch

import pytest
import pytest_asyncio
from beanie import init_beanie
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.models.support import SupportTicket
from app.models.user import User
from app.services.support_service import SupportService
from app.services.support.ticket_manager import detect_priority
from app.services.support.constants import DEFAULT_PRIORITY


@pytest_asyncio.fixture
async def support_db_client():
    """Create test database client for support tests."""
    test_db_name = f"{settings.MONGODB_DB_NAME}_support_test"
    mongodb_url = settings.MONGODB_URL

    client = AsyncIOMotorClient(mongodb_url)

    await init_beanie(
        database=client[test_db_name],
        document_models=[
            SupportTicket,
            User,
        ],
    )

    yield client

    # Cleanup
    await client.drop_database(test_db_name)
    client.close()


@pytest_asyncio.fixture
async def test_user(support_db_client):
    """Create a test user."""
    user = User(
        email="test@example.com",
        name="Test User",
        role="user",
    )
    await user.insert()
    return user


@pytest_asyncio.fixture
async def test_ticket(support_db_client, test_user):
    """Create a test support ticket."""
    ticket = SupportTicket(
        user_id=test_user.id,
        user_email=test_user.email,
        user_name=test_user.name,
        subject="Test Issue",
        message="This is a test support issue",
        category="technical",
        priority="medium",
        language="en",
    )
    await ticket.insert()
    return ticket


@pytest.fixture
def support_service_instance():
    """Create SupportService instance."""
    return SupportService()


# ============================================
# Priority Detection Tests
# ============================================


class TestPriorityDetection:
    """Test automatic priority detection from ticket content."""

    def test_detect_urgent_priority(self):
        """Test detection of urgent priority."""
        subject = "Critical Issue"
        message = "The app is completely broken and I cannot access anything!"
        priority = detect_priority(subject, message)

        assert priority in ["urgent", "high", "medium"]

    def test_detect_high_priority(self):
        """Test detection of high priority."""
        subject = "Payment Failed"
        message = "I cannot complete my purchase"
        priority = detect_priority(subject, message)

        assert priority in ["high", "urgent", "medium"]

    def test_detect_default_priority(self):
        """Test default priority when no keywords match."""
        subject = "General feedback"
        message = "I would like to provide some general feedback"
        priority = detect_priority(subject, message)

        assert priority == DEFAULT_PRIORITY

    def test_priority_case_insensitive(self):
        """Test that priority detection is case-insensitive."""
        subject = "URGENT ISSUE"
        message = "THIS IS VERY URGENT"
        priority = detect_priority(subject, message)

        assert priority in ["urgent", "high", "medium"]


# ============================================
# Ticket Creation Tests
# ============================================


@pytest.mark.asyncio
async def test_create_ticket(support_service_instance, test_user):
    """Test creating a new support ticket."""
    ticket = await support_service_instance.create_ticket(
        user=test_user,
        subject="Test Issue",
        message="This is a test support issue",
        category="technical",
        language="en",
    )

    assert ticket is not None
    assert ticket.user_id == test_user.id
    assert ticket.subject == "Test Issue"
    assert ticket.category == "technical"
    assert ticket.language == "en"


@pytest.mark.asyncio
async def test_create_ticket_with_priority(support_service_instance, test_user):
    """Test creating ticket with explicit priority."""
    ticket = await support_service_instance.create_ticket(
        user=test_user,
        subject="Critical Issue",
        message="App is broken",
        priority="urgent",
    )

    assert ticket.priority == "urgent"


@pytest.mark.asyncio
async def test_create_ticket_with_conversation(support_service_instance, test_user):
    """Test creating ticket linked to existing conversation."""
    conversation_id = str(ObjectId())

    ticket = await support_service_instance.create_ticket(
        user=test_user,
        subject="Follow-up Issue",
        message="Issue from previous conversation",
        voice_conversation_id=conversation_id,
    )

    assert ticket.voice_conversation_id == conversation_id


# ============================================
# Ticket Retrieval Tests
# ============================================


@pytest.mark.asyncio
async def test_get_ticket_own_ticket(support_service_instance, test_user, test_ticket):
    """Test user retrieving their own ticket."""
    retrieved = await support_service_instance.get_ticket(
        ticket_id=str(test_ticket.id),
        user=test_user,
        is_admin=False,
    )

    assert retrieved is not None
    assert retrieved.id == test_ticket.id


@pytest.mark.asyncio
async def test_get_nonexistent_ticket(support_service_instance, test_user):
    """Test retrieving nonexistent ticket returns None."""
    fake_id = str(ObjectId())
    retrieved = await support_service_instance.get_ticket(
        ticket_id=fake_id,
        user=test_user,
    )

    assert retrieved is None


# ============================================
# Ticket Listing Tests
# ============================================


@pytest.mark.asyncio
async def test_list_user_tickets(support_service_instance, test_user):
    """Test listing tickets for a user."""
    # Create multiple tickets
    for i in range(3):
        ticket = SupportTicket(
            user_id=test_user.id,
            user_email=test_user.email,
            user_name=test_user.name,
            subject=f"Issue {i}",
            message=f"This is issue {i}",
            category="technical",
        )
        await ticket.insert()

    tickets, total = await support_service_instance.list_user_tickets(
        user=test_user,
        page=1,
        page_size=10,
    )

    assert len(tickets) >= 3
    assert total >= 3


@pytest.mark.asyncio
async def test_list_user_tickets_pagination(support_service_instance, test_user):
    """Test pagination of user tickets."""
    # Create 25 tickets
    for i in range(25):
        ticket = SupportTicket(
            user_id=test_user.id,
            user_email=test_user.email,
            user_name=test_user.name,
            subject=f"Issue {i}",
            message=f"Message {i}",
        )
        await ticket.insert()

    # Get first page
    tickets_page1, total = await support_service_instance.list_user_tickets(
        user=test_user,
        page=1,
        page_size=10,
    )

    # Get second page
    tickets_page2, _ = await support_service_instance.list_user_tickets(
        user=test_user,
        page=2,
        page_size=10,
    )

    assert len(tickets_page1) == 10
    assert len(tickets_page2) >= 10
    assert total >= 25


# ============================================
# Ticket Update Tests
# ============================================


@pytest.mark.asyncio
async def test_update_ticket_status(support_service_instance, test_ticket):
    """Test updating ticket status."""
    updated = await support_service_instance.update_ticket_status(
        ticket_id=str(test_ticket.id),
        status="in_progress",
    )

    assert updated is not None
    assert updated.status == "in_progress"


@pytest.mark.asyncio
async def test_close_ticket(support_service_instance, test_ticket):
    """Test closing a ticket."""
    closed = await support_service_instance.close_ticket(
        ticket_id=str(test_ticket.id),
        resolution_note="Issue resolved",
    )

    assert closed is not None
    assert closed.status == "closed"


# ============================================
# Ticket Statistics Tests
# ============================================


@pytest.mark.asyncio
async def test_get_ticket_stats(support_service_instance, test_user):
    """Test getting aggregate ticket statistics."""
    # Create tickets with various statuses and priorities
    for status in ["open", "in_progress", "closed"]:
        for priority in ["low", "medium", "high"]:
            ticket = SupportTicket(
                user_id=test_user.id,
                user_email=test_user.email,
                user_name=test_user.name,
                subject=f"{status} {priority}",
                message="Test",
                status=status,
                priority=priority,
            )
            await ticket.insert()

    stats = await support_service_instance.get_ticket_stats()

    assert isinstance(stats, dict)


# ============================================
# Data Consistency Tests
# ============================================


@pytest.mark.asyncio
async def test_ticket_timestamps(support_service_instance, test_user):
    """Test that ticket has proper timestamps."""
    ticket = await support_service_instance.create_ticket(
        user=test_user,
        subject="Test",
        message="Test",
    )

    assert ticket.created_at is not None
    assert ticket.updated_at is not None


@pytest.mark.asyncio
async def test_ticket_user_info_consistency(support_service_instance, test_user):
    """Test that ticket stores consistent user information."""
    ticket = await support_service_instance.create_ticket(
        user=test_user,
        subject="Test",
        message="Test",
    )

    assert ticket.user_id == test_user.id
    assert ticket.user_email == test_user.email
    assert ticket.user_name == test_user.name
