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


import httpx  # noqa: E402  (appended block)
from bs4 import BeautifulSoup


class AuthWallError(Exception):
    """Raised when URL requires authentication."""


_URL_TIMEOUT_SECONDS = 15
_HTML_TAGS_TO_REMOVE = {"script", "style", "nav", "aside", "footer", "header", "form"}


async def fetch_url_content(url: str) -> dict:
    """Fetch a single URL, extract main article text + title. No depth crawl."""
    async with httpx.AsyncClient(follow_redirects=True, timeout=_URL_TIMEOUT_SECONDS) as c:
        resp = await c.get(url, headers={"User-Agent": "OlorinBot/1.0 (+https://olorin.ai)"})

    if resp.status_code in (401, 403):
        raise AuthWallError(f"URL requires auth: HTTP {resp.status_code}")
    if resp.status_code >= 400:
        raise ValueError(f"URL fetch failed: HTTP {resp.status_code}")

    content_type = resp.headers.get("content-type", "")
    if "html" not in content_type.lower():
        raise ValueError(f"Non-HTML content type: {content_type}")

    soup = BeautifulSoup(resp.text, "lxml")
    for tag_name in _HTML_TAGS_TO_REMOVE:
        for t in soup.find_all(tag_name):
            t.decompose()

    title_tag = soup.find("h1") or soup.find("title")
    title = title_tag.get_text(strip=True) if title_tag else url

    main = soup.find("article") or soup.find("main") or soup.find("body") or soup
    text = "\n\n".join(
        line for line in (p.strip() for p in main.get_text("\n").splitlines()) if line
    )

    return {"text": text, "title": title, "source_url": url}
