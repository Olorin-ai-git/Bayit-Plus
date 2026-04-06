"""Unit tests for DialogueExchange vision-grounded fields."""
from datetime import datetime

from app.models.vod_interaction import DialogueExchange


def test_dialogue_exchange_defaults_no_vision():
    exchange = DialogueExchange(
        speaker="user",
        message_text="hello",
        timestamp=datetime.utcnow(),
    )
    assert exchange.tap_x is None
    assert exchange.tap_y is None
    assert exchange.is_vision_grounded is False


def test_dialogue_exchange_with_vision_fields():
    exchange = DialogueExchange(
        speaker="character",
        message_text="I see the phone on the desk.",
        timestamp=datetime.utcnow(),
        tap_x=0.6,
        tap_y=0.45,
        is_vision_grounded=True,
    )
    assert exchange.tap_x == 0.6
    assert exchange.tap_y == 0.45
    assert exchange.is_vision_grounded is True


def test_dialogue_exchange_tap_coordinates_boundary():
    exchange = DialogueExchange(
        speaker="user",
        message_text="what's this?",
        timestamp=datetime.utcnow(),
        tap_x=0.0,
        tap_y=1.0,
        is_vision_grounded=True,
    )
    assert exchange.tap_x == 0.0
    assert exchange.tap_y == 1.0
