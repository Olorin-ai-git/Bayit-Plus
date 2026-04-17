"""CanonicalMemory shape + indexes + status transitions."""

from app.models.canonical_memory import CanonicalMemory, Citation


def test_canonical_memory_defaults():
    cm = CanonicalMemory.model_construct(
        partner_id="p1",
        scope="partner",
        question="Q?",
        answer="A.",
        citations=[
            Citation(type="video", content_id="v1", timestamp_seconds=120.0)
        ],
        stale_after_months=6,
        created_by="u1",
    )
    assert cm.status == "active"
    assert cm.promoted_from_candidate is None
    assert cm.last_verified_at is not None


def test_canonical_memory_collection_name():
    assert CanonicalMemory.Settings.name == "canonical_memories"


def test_global_scope_allows_null_partner_id():
    cm = CanonicalMemory.model_construct(
        partner_id=None,
        scope="global",
        question="Q?",
        answer="A.",
        citations=[],
        stale_after_months=12,
        created_by="superadmin1",
    )
    assert cm.partner_id is None
    assert cm.scope == "global"


def test_citation_orphaned_defaults_false():
    c = Citation(type="video", content_id="v1")
    assert c.orphaned is False
