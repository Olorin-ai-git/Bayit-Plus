"""Additive back-compat tests for FilmMemoryExchange.exchange_type (D-02).

Phase 1 VODFilmMemory stays single-writer and pure-prose; this field is an
additive tag so the character LLM can project only CHARACTER_CHAT exchanges
when composing conversational memory. The grader NEVER reads this field.
"""
from app.models.film_memory import FilmMemoryExchange
from app.schemas.comprehension import ExchangeType


def test_exchange_type_defaults_to_character_chat():
    """Phase 1 back-compat: new field defaults so existing callers keep working."""
    exchange = FilmMemoryExchange(
        moment_timestamp=1.0,
        character_name="Walter Burns",
        user_message="hi",
        character_response="hello",
    )
    assert exchange.exchange_type == ExchangeType.CHARACTER_CHAT


def test_exchange_type_accepts_grader_tag():
    """Phase 2 grader-origin exchanges carry the grader tag per D-02."""
    exchange = FilmMemoryExchange(
        moment_timestamp=1.0,
        character_name="Walter Burns",
        user_message="what did the story expose?",
        character_response="corruption at city hall",
        exchange_type=ExchangeType.COMPREHENSION_GRADER,
    )
    assert exchange.exchange_type == ExchangeType.COMPREHENSION_GRADER


def test_exchange_type_back_compat_missing_field_in_dict():
    """Documents written before this field existed must still deserialize."""
    legacy_doc = {
        "moment_timestamp": 1.0,
        "character_name": "Walter Burns",
        "user_message": "hi",
        "character_response": "hello",
    }
    exchange = FilmMemoryExchange.model_validate(legacy_doc)
    assert exchange.exchange_type == ExchangeType.CHARACTER_CHAT
