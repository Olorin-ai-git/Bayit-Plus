"""Tests for multi-turn conversation context resolution."""

import time

import pytest

from app.services.voice.models import ConversationTurns, TurnContext


def _make_turn(
    transcript: str = "test",
    intent: str = "CHAT",
    action_type: str | None = None,
    entity: str | None = None,
) -> TurnContext:
    return TurnContext(
        transcript=transcript,
        intent=intent,
        action_type=action_type,
        entity=entity,
        timestamp=time.time(),
    )


class TestAddTurn:
    def test_add_turn_trims_to_max(self) -> None:
        conv = ConversationTurns()
        for i in range(7):
            conv.add_turn(_make_turn(transcript=f"turn {i}", entity=f"e{i}"))
        assert len(conv.turns) == 5
        assert conv.turns[0].transcript == "turn 2"
        assert conv.turns[-1].transcript == "turn 6"


class TestGetContextSummary:
    def test_get_context_summary_format(self) -> None:
        conv = ConversationTurns()
        conv.add_turn(_make_turn(intent="PLAYBACK", entity="channel 13"))
        conv.add_turn(_make_turn(intent="CHAT", entity="what is this show?"))
        result = conv.get_context_summary()
        assert result == (
            "[Turn 1: PLAYBACK 'channel 13'] "
            "[Turn 2: CHAT 'what is this show?']"
        )

    def test_get_context_summary_empty(self) -> None:
        conv = ConversationTurns()
        assert conv.get_context_summary() == ""


class TestResolveReference:
    def test_resolve_reference_the_other_one(self) -> None:
        conv = ConversationTurns()
        conv.add_turn(_make_turn(entity="channel 11", action_type="channel"))
        conv.add_turn(_make_turn(entity="channel 13", action_type="channel"))
        conv.add_turn(_make_turn(entity="channel 14", action_type="channel"))
        assert conv.resolve_reference("play the other one") == "channel 13"

    def test_resolve_reference_that_channel(self) -> None:
        conv = ConversationTurns()
        conv.add_turn(_make_turn(entity="news show", action_type="show"))
        conv.add_turn(_make_turn(entity="channel 12", action_type="channel"))
        conv.add_turn(_make_turn(transcript="volume up"))
        assert conv.resolve_reference("go to that channel") == "channel 12"

    def test_resolve_reference_it(self) -> None:
        conv = ConversationTurns()
        conv.add_turn(_make_turn(entity="Fauda"))
        conv.add_turn(_make_turn())
        assert conv.resolve_reference("it") == "Fauda"

    def test_resolve_reference_back(self) -> None:
        conv = ConversationTurns()
        conv.add_turn(_make_turn(entity="channel 11", action_type="channel"))
        conv.add_turn(_make_turn(entity="channel 13", action_type="channel"))
        assert conv.resolve_reference("go back") == "channel 11"

    def test_resolve_reference_previous(self) -> None:
        conv = ConversationTurns()
        conv.add_turn(_make_turn(entity="channel 11", action_type="channel"))
        conv.add_turn(_make_turn(entity="channel 13", action_type="channel"))
        assert conv.resolve_reference("previous") == "channel 11"

    def test_resolve_reference_no_context(self) -> None:
        conv = ConversationTurns()
        assert conv.resolve_reference("play that channel") is None

    def test_resolve_reference_no_entity(self) -> None:
        conv = ConversationTurns()
        conv.add_turn(_make_turn(transcript="hello"))
        conv.add_turn(_make_turn(transcript="how are you"))
        assert conv.resolve_reference("it") is None

    def test_resolve_reference_hebrew(self) -> None:
        conv = ConversationTurns()
        conv.add_turn(_make_turn(entity="ערוץ 12", action_type="channel"))
        conv.add_turn(_make_turn(entity="ערוץ 13", action_type="channel"))
        assert conv.resolve_reference("תעבור לערוץ הקודם") == "ערוץ 12"

    def test_resolve_reference_hebrew_pronoun(self) -> None:
        conv = ConversationTurns()
        conv.add_turn(_make_turn(entity="פאודה", action_type="show"))
        assert conv.resolve_reference("זה") == "פאודה"

    def test_resolve_reference_hebrew_the_other(self) -> None:
        conv = ConversationTurns()
        conv.add_turn(_make_turn(entity="ערוץ 11", action_type="channel"))
        conv.add_turn(_make_turn(entity="ערוץ 12", action_type="channel"))
        conv.add_turn(_make_turn(entity="ערוץ 13", action_type="channel"))
        assert conv.resolve_reference("תשים את האחר") == "ערוץ 12"
