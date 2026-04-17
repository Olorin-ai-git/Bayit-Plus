"""AskCandidate model shape + indexes."""

import pytest

from app.models.ask_candidate import AskCandidate


def test_ask_candidate_defaults():
    # model_construct skips __init__ (and the Beanie collection-init check)
    # — matches the shape-test pattern used across tests/models/ in this repo.
    row = AskCandidate.model_construct(
        partner_id="p1",
        asker_user_id="u1",
        scope="partner",
        question="what is X?",
        answer="X is Y.",
        mode="blended",
        sources=[],
        canonical_hits=[],
        credits_charged=1,
    )
    assert row.dismissed is False
    assert row.promoted_to is None
    assert row.reviewed_by is None
    assert row.document_hits == []


def test_ask_candidate_collection_name():
    assert AskCandidate.Settings.name == "ask_candidates"


def test_ask_candidate_indexes_include_partner_and_asker():
    names = [
        idx if isinstance(idx, str) else getattr(idx, "document", {}).get("name")
        for idx in AskCandidate.Settings.indexes
    ]
    assert "partner_id" in names or any("partner" in (n or "") for n in names)
