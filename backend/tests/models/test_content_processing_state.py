"""Tests for Content.processing_state gating field (Task 3)."""
import pytest
from app.models.content import Content, ProcessingState


def test_processing_state_enum_values():
    assert ProcessingState.PROCESSING == "processing"
    assert ProcessingState.READY == "ready"
    assert ProcessingState.FAILED == "failed"
    # Confirm enum has exactly these three values, no surprises
    assert {s.value for s in ProcessingState} == {"processing", "ready", "failed"}


def test_processing_state_defaults_to_ready_for_back_compat():
    """Back-compat: Content created without specifying processing_state
    must default to READY so existing published documents stay visible
    after the field is added. New ingest flow will explicitly set
    PROCESSING at pipeline start."""
    c = Content.model_construct(
        content_id="test-c1",
        title="test",
        description="d",
        partner_id="p",
        content_format="video",
    )
    assert c.processing_state == ProcessingState.READY


def test_processing_state_can_be_set_to_processing():
    c = Content.model_construct(
        content_id="test-c2",
        title="t",
        description="d",
        partner_id="p",
        content_format="video",
        processing_state=ProcessingState.PROCESSING,
    )
    assert c.processing_state == ProcessingState.PROCESSING


def test_processing_state_can_be_set_to_failed():
    c = Content.model_construct(
        content_id="test-c3",
        title="t",
        description="d",
        partner_id="p",
        content_format="video",
        processing_state=ProcessingState.FAILED,
    )
    assert c.processing_state == ProcessingState.FAILED
