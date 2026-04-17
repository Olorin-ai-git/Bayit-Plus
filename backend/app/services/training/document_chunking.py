"""Sliding-window chunker with heading and page metadata preservation."""

from typing import Iterable


def sliding_window(tokens: list[str], *, size: int, overlap: int) -> list[list[str]]:
    """Non-overlapping step = size - overlap. Returns list of token lists."""
    if not tokens:
        return []
    if len(tokens) <= size:
        return [tokens]
    step = max(1, size - overlap)
    chunks: list[list[str]] = []
    start = 0
    while start < len(tokens):
        end = start + size
        chunks.append(tokens[start:end])
        if end >= len(tokens):
            break
        start += step
    return chunks


def _tokenize(text: str) -> list[str]:
    return text.split()


def chunk_pdf_pages(
    pages: list[tuple[int, str]], *, size: int, overlap: int,
) -> list[dict]:
    out: list[dict] = []
    idx = 0
    for page_num, text in pages:
        tokens = _tokenize(text)
        for window in sliding_window(tokens, size=size, overlap=overlap):
            out.append({
                "chunk_index": idx,
                "page_number": page_num,
                "text": " ".join(window),
                "heading_path": [],
            })
            idx += 1
    return out


def chunk_markdown_sections(
    sections: Iterable[dict], *, size: int, overlap: int,
) -> list[dict]:
    out: list[dict] = []
    idx = 0
    for section in sections:
        tokens = _tokenize(section.get("text", ""))
        heading_path = section.get("heading_path") or []
        for window in sliding_window(tokens, size=size, overlap=overlap):
            out.append({
                "chunk_index": idx,
                "page_number": None,
                "text": " ".join(window),
                "heading_path": list(heading_path),
            })
            idx += 1
    return out
