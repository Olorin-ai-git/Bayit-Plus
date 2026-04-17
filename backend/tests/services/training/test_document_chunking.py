"""Sliding-window chunker: token counts (word-approx), overlap, heading preservation."""

from app.services.training.document_chunking import (
    chunk_markdown_sections,
    chunk_pdf_pages,
    sliding_window,
)


def test_sliding_window_produces_overlapping_chunks():
    words = ["w"] * 1200
    chunks = sliding_window(words, size=512, overlap=50)
    assert len(chunks) >= 2
    assert chunks[0][-50:] == chunks[1][:50]
    assert len(chunks[0]) == 512


def test_sliding_window_handles_short_input():
    words = ["short", "text"]
    chunks = sliding_window(words, size=512, overlap=50)
    assert len(chunks) == 1
    assert chunks[0] == ["short", "text"]


def test_chunk_pdf_pages_preserves_page_metadata():
    pages = [(1, "alpha " * 600), (2, "beta " * 100)]
    chunks = chunk_pdf_pages(pages, size=512, overlap=50)
    page_nums = {c["page_number"] for c in chunks}
    assert page_nums == {1, 2}
    assert all("text" in c and "chunk_index" in c for c in chunks)


def test_chunk_markdown_sections_preserves_headings():
    sections = [
        {"heading_path": ["A"], "text": "alpha " * 600},
        {"heading_path": ["A", "B"], "text": "beta " * 100},
    ]
    chunks = chunk_markdown_sections(sections, size=512, overlap=50)
    assert chunks[0]["heading_path"] == ["A"]
    assert chunks[-1]["heading_path"] == ["A", "B"]
    assert all("chunk_index" in c for c in chunks)


def test_chunk_indexes_are_sequential():
    sections = [{"heading_path": [], "text": "w " * 2000}]
    chunks = chunk_markdown_sections(sections, size=512, overlap=50)
    for i, c in enumerate(chunks):
        assert c["chunk_index"] == i
