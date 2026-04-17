"""URL fetch + readability extraction."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.training.document_extraction import (
    AuthWallError,
    fetch_url_content,
)


def _resp(status: int, text: str, headers: dict | None = None):
    r = MagicMock()
    r.status_code = status
    r.text = text
    r.headers = headers or {"content-type": "text/html; charset=utf-8"}
    return r


@pytest.mark.asyncio
async def test_extracts_main_article_text():
    html = """
    <html><body>
      <nav>ignore me</nav>
      <article><h1>Title</h1><p>Main article content paragraph one.</p>
      <p>And paragraph two.</p></article>
      <footer>copyright</footer>
    </body></html>
    """
    fake_client = AsyncMock()
    fake_client.get = AsyncMock(return_value=_resp(200, html))
    fake_client.__aenter__ = AsyncMock(return_value=fake_client)
    fake_client.__aexit__ = AsyncMock(return_value=None)
    with patch("app.services.training.document_extraction.httpx.AsyncClient", return_value=fake_client):
        result = await fetch_url_content("https://example.com/article")
    assert "Main article content" in result["text"]
    assert result["title"] == "Title"
    assert result["source_url"] == "https://example.com/article"


@pytest.mark.asyncio
async def test_401_or_403_raises_auth_wall():
    fake_client = AsyncMock()
    fake_client.get = AsyncMock(return_value=_resp(401, "not allowed"))
    fake_client.__aenter__ = AsyncMock(return_value=fake_client)
    fake_client.__aexit__ = AsyncMock(return_value=None)
    with patch("app.services.training.document_extraction.httpx.AsyncClient", return_value=fake_client):
        with pytest.raises(AuthWallError):
            await fetch_url_content("https://example.com/private")


@pytest.mark.asyncio
async def test_non_html_content_rejected():
    fake_client = AsyncMock()
    fake_client.get = AsyncMock(return_value=_resp(
        200, "binary",
        headers={"content-type": "application/octet-stream"},
    ))
    fake_client.__aenter__ = AsyncMock(return_value=fake_client)
    fake_client.__aexit__ = AsyncMock(return_value=None)
    with patch("app.services.training.document_extraction.httpx.AsyncClient", return_value=fake_client):
        with pytest.raises(ValueError):
            await fetch_url_content("https://example.com/blob.bin")
