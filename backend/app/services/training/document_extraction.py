"""Text extraction for PDF / markdown / URL sources."""

import io
import re

from pypdf import PdfReader

from app.core.logging_config import get_logger

logger = get_logger(__name__)


class PasswordProtectedError(Exception):
    """Raised when a PDF is encrypted / password-protected."""


def extract_pdf_pages(pdf_bytes: bytes) -> list[tuple[int, str]]:
    """Return [(page_number, text), ...] — skips pages whose extracted text is empty."""
    try:
        reader = PdfReader(io.BytesIO(pdf_bytes))
    except Exception as exc:
        raise ValueError(f"PDF parse error: {exc}") from exc

    if reader.is_encrypted:
        raise PasswordProtectedError("PDF is password-protected")

    pages: list[tuple[int, str]] = []
    for i, page in enumerate(reader.pages, start=1):
        try:
            text = (page.extract_text() or "").strip()
        except Exception as exc:
            logger.warning("Page extract failed", extra={"page": i, "error": str(exc)})
            continue
        if text:
            pages.append((i, text))
    return pages


_HEADING_RE = re.compile(r"^(#{1,6})\s+(.+?)\s*$", re.MULTILINE)


def extract_markdown_sections(text: str) -> list[dict]:
    """Split markdown on ATX headings; each section carries a heading_path ancestry."""
    text = text.strip()
    if not text:
        return []

    boundaries = [(m.start(), m.end(), len(m.group(1)), m.group(2).strip())
                  for m in _HEADING_RE.finditer(text)]
    if not boundaries:
        return [{"heading_path": [], "text": text}]

    sections: list[dict] = []
    # Prefix content (before first heading) becomes its own section if non-empty
    first_start = boundaries[0][0]
    prefix = text[:first_start].strip()
    if prefix:
        sections.append({"heading_path": [], "text": prefix})

    path: list[tuple[int, str]] = []  # (level, heading)
    for i, (start, end, level, title) in enumerate(boundaries):
        while path and path[-1][0] >= level:
            path.pop()
        path.append((level, title))

        body_start = end
        body_end = boundaries[i + 1][0] if i + 1 < len(boundaries) else len(text)
        body = text[body_start:body_end].strip()
        if body:
            sections.append({
                "heading_path": [h for _, h in path],
                "text": body,
            })
    return sections
