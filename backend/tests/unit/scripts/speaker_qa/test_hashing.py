"""Tests for content-hash idempotency helpers."""

import pytest

from app.scripts.speaker_qa.hashing import question_hash, asset_paths


def test_question_hash_is_deterministic():
    """Same speaker_id + text → same hash."""
    h1 = question_hash("jobs-stanford-2005", "What is success?")
    h2 = question_hash("jobs-stanford-2005", "What is success?")
    assert h1 == h2
    assert len(h1) == 12


def test_question_hash_differs_per_speaker():
    """Different speaker_id → different hash for same text."""
    h1 = question_hash("jobs-stanford-2005", "What is success?")
    h2 = question_hash("mlk-dream-1963", "What is success?")
    assert h1 != h2


def test_question_hash_differs_per_text():
    """Different text → different hash for same speaker."""
    h1 = question_hash("jobs-stanford-2005", "What is success?")
    h2 = question_hash("jobs-stanford-2005", "What is failure?")
    assert h1 != h2


def test_asset_paths_uses_prefix_and_hash():
    """Returns (mp3_path, mp4_path) within the given GCS prefix."""
    mp3, mp4 = asset_paths("demo/jobs/qa/", "abc123def456")
    assert mp3 == "demo/jobs/qa/abc123def456.mp3"
    assert mp4 == "demo/jobs/qa/abc123def456.mp4"


def test_asset_paths_normalizes_prefix_without_trailing_slash():
    """Missing trailing slash is added."""
    mp3, mp4 = asset_paths("demo/jobs/qa", "abc")
    assert mp3 == "demo/jobs/qa/abc.mp3"
    assert mp4 == "demo/jobs/qa/abc.mp4"
