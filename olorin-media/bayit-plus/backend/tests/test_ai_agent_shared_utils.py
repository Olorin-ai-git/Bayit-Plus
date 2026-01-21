"""
Tests for AI Agent Shared Utilities

Ensures common patterns work correctly across all executor modules.
"""

from unittest.mock import AsyncMock, Mock, patch

import pytest
from app.services.ai_agent.executors._shared import (
    create_action_description,
    get_content_or_error,
    get_content_section_or_error,
    handle_dry_run,
    log_librarian_action,
    validate_content_exists,
    validate_content_section_exists,
)
from bson import ObjectId


class TestContentUtils:
    """Test content validation utilities."""

    @pytest.mark.asyncio
    async def test_get_content_or_error_success(self):
        """Test getting content successfully."""
        mock_content = Mock()
        mock_content.id = ObjectId()
        mock_content.title = "Test Movie"

        with patch(
            "app.services.ai_agent.executors._shared.content_utils.Content"
        ) as mock_content_class:
            mock_content_class.get = AsyncMock(return_value=mock_content)

            content, error = await get_content_or_error(str(mock_content.id))

            assert content is not None
            assert error is None
            assert content.title == "Test Movie"

    @pytest.mark.asyncio
    async def test_get_content_or_error_not_found(self):
        """Test getting content that doesn't exist."""
        with patch(
            "app.services.ai_agent.executors._shared.content_utils.Content"
        ) as mock_content_class:
            mock_content_class.get = AsyncMock(return_value=None)

            content, error = await get_content_or_error("nonexistent")

            assert content is None
            assert error is not None
            assert error["success"] is False
            assert "not found" in error["error"].lower()

    @pytest.mark.asyncio
    async def test_get_content_or_error_exception(self):
        """Test error handling when database fails."""
        with patch(
            "app.services.ai_agent.executors._shared.content_utils.Content"
        ) as mock_content_class:
            mock_content_class.get = AsyncMock(side_effect=Exception("Database error"))

            content, error = await get_content_or_error("test_id")

            assert content is None
            assert error is not None
            assert error["success"] is False
            assert "Database error" in error["error"]

    @pytest.mark.asyncio
    async def test_get_content_section_or_error_by_id(self):
        """Test getting content section by ID."""
        mock_section = Mock()
        mock_section.id = ObjectId()
        mock_section.name = "Movies"

        with patch(
            "app.services.ai_agent.executors._shared.content_utils.ContentSection"
        ) as mock_section_class:
            mock_section_class.get = AsyncMock(return_value=mock_section)

            section, error = await get_content_section_or_error(str(mock_section.id))

            assert section is not None
            assert error is None
            assert section.name == "Movies"

    @pytest.mark.asyncio
    async def test_get_content_section_or_error_by_slug(self):
        """Test getting content section by slug."""
        mock_section = Mock()
        mock_section.slug = "movies"
        mock_section.name = "Movies"

        with patch(
            "app.services.ai_agent.executors._shared.content_utils.ContentSection"
        ) as mock_section_class:
            mock_section_class.find_one = AsyncMock(return_value=mock_section)

            section, error = await get_content_section_or_error("movies", by_slug=True)

            assert section is not None
            assert error is None
            assert section.slug == "movies"

    @pytest.mark.asyncio
    async def test_validate_content_exists_found(self):
        """Test validating content that exists."""
        mock_content = Mock()
        with patch(
            "app.services.ai_agent.executors._shared.content_utils.Content"
        ) as mock_content_class:
            mock_content_class.get = AsyncMock(return_value=mock_content)

            error = await validate_content_exists("test_id")

            assert error is None

    @pytest.mark.asyncio
    async def test_validate_content_exists_not_found(self):
        """Test validating content that doesn't exist."""
        with patch(
            "app.services.ai_agent.executors._shared.content_utils.Content"
        ) as mock_content_class:
            mock_content_class.get = AsyncMock(return_value=None)

            error = await validate_content_exists("nonexistent")

            assert error is not None
            assert error["success"] is False

    @pytest.mark.asyncio
    async def test_validate_content_section_exists_found(self):
        """Test validating section that exists."""
        mock_section = Mock()
        with patch(
            "app.services.ai_agent.executors._shared.content_utils.ContentSection"
        ) as mock_section_class:
            mock_section_class.find_one = AsyncMock(return_value=mock_section)

            error = await validate_content_section_exists("movies", by_slug=True)

            assert error is None

    @pytest.mark.asyncio
    async def test_validate_content_section_exists_not_found(self):
        """Test validating section that doesn't exist."""
        with patch(
            "app.services.ai_agent.executors._shared.content_utils.ContentSection"
        ) as mock_section_class:
            mock_section_class.find_one = AsyncMock(return_value=None)

            error = await validate_content_section_exists("nonexistent", by_slug=True)

            assert error is not None
            assert error["success"] is False


class TestDryRunHandling:
    """Test dry-run mode handling."""

    def test_handle_dry_run_active(self):
        """Test dry-run returns message."""
        result = handle_dry_run(
            True, "fix missing poster for {content_id}", content_id="123"
        )

        assert result is not None
        assert result["success"] is True
        assert result["dry_run"] is True
        assert "[DRY RUN]" in result["message"]
        assert "123" in result["message"]

    def test_handle_dry_run_inactive(self):
        """Test dry-run disabled returns None."""
        result = handle_dry_run(False, "fix missing poster")

        assert result is None

    def test_handle_dry_run_no_formatting(self):
        """Test dry-run with no format variables."""
        result = handle_dry_run(True, "run audit process")

        assert result is not None
        assert "[DRY RUN]" in result["message"]
        assert "run audit process" in result["message"]


class TestActionLogging:
    """Test librarian action logging utilities."""

    @pytest.mark.asyncio
    async def test_log_librarian_action_basic(self):
        """Test basic librarian action logging."""
        with patch(
            "app.services.ai_agent.executors._shared.action_logging.LibrarianAction"
        ) as mock_action_class:
            mock_action = Mock()
            mock_action.insert = AsyncMock()
            mock_action_class.return_value = mock_action

            await log_librarian_action(
                audit_id="audit_123",
                action_type="poster_fix",
                content_id="content_456",
                description="Fixed missing poster",
            )

            mock_action_class.assert_called_once()
            mock_action.insert.assert_called_once()

    @pytest.mark.asyncio
    async def test_log_librarian_action_with_optional_fields(self):
        """Test logging with all optional fields."""
        with patch(
            "app.services.ai_agent.executors._shared.action_logging.LibrarianAction"
        ) as mock_action_class:
            mock_action = Mock()
            mock_action.insert = AsyncMock()
            mock_action_class.return_value = mock_action

            await log_librarian_action(
                audit_id="audit_123",
                action_type="recategorize",
                content_id="content_456",
                description="Recategorized content",
                issue_type="wrong_category",
                confidence=85,
                reason="Genre mismatch",
                before_state={"category": "old"},
                after_state={"category": "new"},
            )

            assert mock_action.issue_type == "wrong_category"
            assert mock_action.confidence == 85
            assert mock_action.reason == "Genre mismatch"
            assert mock_action.before_state == {"category": "old"}
            assert mock_action.after_state == {"category": "new"}
            mock_action.insert.assert_called_once()

    @pytest.mark.asyncio
    async def test_log_librarian_action_handles_error(self):
        """Test logging handles errors gracefully."""
        with patch(
            "app.services.ai_agent.executors._shared.action_logging.LibrarianAction"
        ) as mock_action_class:
            mock_action_class.side_effect = Exception("Database error")

            # Should not raise exception
            await log_librarian_action(
                audit_id="audit_123",
                action_type="poster_fix",
                content_id="content_456",
                description="Fixed poster",
            )

    def test_create_action_description_simple(self):
        """Test creating simple action description."""
        desc = create_action_description("Fixed missing poster", "The Matrix")

        assert "Fixed missing poster" in desc
        assert "The Matrix" in desc

    def test_create_action_description_with_change(self):
        """Test creating description with old/new values."""
        desc = create_action_description(
            "Recategorized", "The Matrix", old_value="Action", new_value="Sci-Fi"
        )

        assert "Recategorized" in desc
        assert "The Matrix" in desc
        assert "Action" in desc
        assert "Sci-Fi" in desc
        assert "from" in desc
        assert "to" in desc
