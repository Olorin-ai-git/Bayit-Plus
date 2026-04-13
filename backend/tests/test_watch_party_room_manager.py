"""Tests for Watch Party RoomManager — room lifecycle, host transfer, sync."""

import string
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.room_manager import RoomManager, generate_room_code


def test_generate_room_code_default_length():
    code = generate_room_code()
    assert len(code) == 6


def test_generate_room_code_custom_length():
    code = generate_room_code(length=10)
    assert len(code) == 10


def test_generate_room_code_characters():
    code = generate_room_code()
    allowed = set(string.ascii_uppercase + string.digits)
    assert all(c in allowed for c in code)


def test_generate_room_code_uniqueness():
    codes = {generate_room_code() for _ in range(100)}
    assert len(codes) > 90, "Room codes should be highly unique"


@pytest.fixture
def manager():
    return RoomManager()


@pytest.fixture
def mock_party():
    party = MagicMock()
    party.id = "party-123"
    party.host_id = "user-host"
    party.host_name = "Host"
    party.room_code = "ABC123"
    party.is_active = True
    party.max_participants = 20
    party.sync_playback = True
    party.chat_enabled = True
    party.participants = [
        MagicMock(user_id="user-host", user_name="Host"),
    ]
    party.participant_count = 1
    party.insert = AsyncMock()
    party.save = AsyncMock()
    return party


@pytest.mark.asyncio
async def test_join_party_adds_participant(manager, mock_party):
    mock_party.participant_count = 1
    with patch.object(manager, "get_party", return_value=mock_party):
        with patch(
            "app.services.room_manager.connection_manager"
        ) as mock_cm:
            mock_cm.broadcast_to_party = AsyncMock()
            result = await manager.join_party("party-123", "user-2", "Viewer")

    assert result is not None
    assert len(mock_party.participants) == 2
    mock_party.save.assert_awaited_once()


@pytest.mark.asyncio
async def test_join_party_rejects_when_full(manager, mock_party):
    mock_party.max_participants = 1
    mock_party.participant_count = 1
    with patch.object(manager, "get_party", return_value=mock_party):
        result = await manager.join_party("party-123", "user-2", "Viewer")

    assert result is None


@pytest.mark.asyncio
async def test_join_party_idempotent_for_existing_participant(
    manager, mock_party
):
    with patch.object(manager, "get_party", return_value=mock_party):
        result = await manager.join_party(
            "party-123", "user-host", "Host"
        )

    assert result is mock_party
    assert len(mock_party.participants) == 1


@pytest.mark.asyncio
async def test_leave_party_removes_participant(manager, mock_party):
    mock_party.participants.append(
        MagicMock(user_id="user-2", user_name="Viewer")
    )
    with patch.object(manager, "get_party", return_value=mock_party):
        with patch(
            "app.services.room_manager.connection_manager"
        ) as mock_cm:
            mock_cm.broadcast_to_party = AsyncMock()
            result = await manager.leave_party("party-123", "user-2")

    assert result is not None
    user_ids = [p.user_id for p in mock_party.participants]
    assert "user-2" not in user_ids


@pytest.mark.asyncio
async def test_leave_party_transfers_host(manager, mock_party):
    viewer = MagicMock(user_id="user-2", user_name="Viewer")
    mock_party.participants.append(viewer)
    with patch.object(manager, "get_party", return_value=mock_party):
        with patch(
            "app.services.room_manager.connection_manager"
        ) as mock_cm:
            mock_cm.broadcast_to_party = AsyncMock()
            await manager.leave_party("party-123", "user-host")

    assert mock_party.host_id == "user-2"
    assert mock_party.host_name == "Viewer"


@pytest.mark.asyncio
async def test_leave_party_ends_when_empty(manager, mock_party):
    with patch.object(manager, "get_party", return_value=mock_party):
        with patch(
            "app.services.room_manager.connection_manager"
        ) as mock_cm:
            mock_cm.broadcast_to_party = AsyncMock()
            await manager.leave_party("party-123", "user-host")

    assert mock_party.ended_at is not None


@pytest.mark.asyncio
async def test_sync_playback_host_only(manager, mock_party):
    with patch.object(manager, "get_party", return_value=mock_party):
        with patch(
            "app.services.room_manager.connection_manager"
        ) as mock_cm:
            mock_cm.broadcast_to_party = AsyncMock()
            ok = await manager.sync_playback(
                "party-123", "user-host", 42.5, True
            )
            assert ok is True

            not_ok = await manager.sync_playback(
                "party-123", "user-other", 42.5, True
            )
            assert not_ok is False


@pytest.mark.asyncio
async def test_end_party_host_only(manager, mock_party):
    with patch.object(manager, "get_party", return_value=mock_party):
        with patch(
            "app.services.room_manager.connection_manager"
        ) as mock_cm:
            mock_cm.broadcast_to_party = AsyncMock()
            ok = await manager.end_party("party-123", "user-host")
            assert ok is True
            assert mock_party.ended_at is not None

            mock_party.ended_at = None
            not_ok = await manager.end_party("party-123", "user-other")
            assert not_ok is False


@pytest.mark.asyncio
async def test_join_inactive_party_returns_none(manager, mock_party):
    mock_party.is_active = False
    with patch.object(manager, "get_party", return_value=mock_party):
        result = await manager.join_party("party-123", "user-2", "Viewer")
    assert result is None
