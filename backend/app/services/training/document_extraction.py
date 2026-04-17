"""Text extraction for PDF / markdown / URL sources."""

import io

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
