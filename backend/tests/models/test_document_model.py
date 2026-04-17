"""Document model shape + defaults + indexes."""

from app.models.document import Document, DocumentChunk


def test_document_defaults():
    d = Document.model_construct(
        partner_id="p1",
        scope="partner",
        source_format="pdf",
        title="Handbook.pdf",
        created_by="adm1",
    )
    assert d.status == "pending"
    assert d.word_count == 0
    assert d.chunk_count == 0
    assert d.chunks == []
    assert d.last_reindexed_at is None
    assert d.error is None


def test_document_chunk_defaults():
    c = DocumentChunk(index=0, text="hello")
    assert c.page_number is None
    assert c.heading_path == []
    assert c.char_offset is None


def test_document_collection_name():
    assert Document.Settings.name == "documents"


def test_document_indexes_cover_partner_and_status():
    indexes = Document.Settings.indexes
    names = [
        idx if isinstance(idx, str) else getattr(idx, "document", {}).get("name")
        for idx in indexes
    ]
    assert "partner_id" in names or any("partner" in (n or "") for n in names)
    assert "status" in names or any("status" in (n or "") for n in names)
