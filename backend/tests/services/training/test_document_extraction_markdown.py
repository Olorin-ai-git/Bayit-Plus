"""Markdown extraction — heading-aware section split."""

from app.services.training.document_extraction import extract_markdown_sections


def test_sections_split_on_headings():
    md = "# H1\n\ntext one\n\n## H2\n\ntext two\n\n### H3\n\ntext three"
    sections = extract_markdown_sections(md)
    assert len(sections) == 3
    assert sections[0]["heading_path"] == ["H1"]
    assert sections[1]["heading_path"] == ["H1", "H2"]
    assert sections[2]["heading_path"] == ["H1", "H2", "H3"]


def test_plain_text_becomes_single_section():
    md = "just plain text\n\nwith two paragraphs"
    sections = extract_markdown_sections(md)
    assert len(sections) == 1
    assert sections[0]["heading_path"] == []
    assert "two paragraphs" in sections[0]["text"]


def test_empty_input_yields_no_sections():
    assert extract_markdown_sections("") == []
    assert extract_markdown_sections("   \n\n\n") == []


def test_h2_before_h1_gives_shorter_path():
    md = "## Alpha\n\ntext\n\n## Beta\n\nmore"
    sections = extract_markdown_sections(md)
    assert sections[0]["heading_path"] == ["Alpha"]
    assert sections[1]["heading_path"] == ["Beta"]
