"""PDF extraction: per-page text, password-protected rejection."""

from unittest.mock import MagicMock, patch

import pytest

from app.services.training.document_extraction import (
    PasswordProtectedError,
    extract_pdf_pages,
)


def _fake_pdf_reader(pages_texts: list[str], is_encrypted: bool = False):
    reader = MagicMock()
    reader.is_encrypted = is_encrypted
    reader.pages = [MagicMock(extract_text=lambda t=t: t) for t in pages_texts]
    return reader


def test_extract_returns_per_page_text():
    with patch(
        "app.services.training.document_extraction.PdfReader",
        return_value=_fake_pdf_reader(["page one", "page two"]),
    ):
        pages = extract_pdf_pages(b"%PDF-stub")
    assert pages == [(1, "page one"), (2, "page two")]


def test_extract_skips_empty_pages():
    with patch(
        "app.services.training.document_extraction.PdfReader",
        return_value=_fake_pdf_reader(["text", "", "more"]),
    ):
        pages = extract_pdf_pages(b"x")
    assert pages == [(1, "text"), (3, "more")]


def test_encrypted_pdf_raises_password_protected():
    with patch(
        "app.services.training.document_extraction.PdfReader",
        return_value=_fake_pdf_reader([], is_encrypted=True),
    ):
        with pytest.raises(PasswordProtectedError):
            extract_pdf_pages(b"encrypted")


def test_malformed_pdf_raises_value_error():
    def _raise(*_args, **_kwargs):
        raise Exception("broken")
    with patch(
        "app.services.training.document_extraction.PdfReader",
        side_effect=_raise,
    ):
        with pytest.raises(ValueError):
            extract_pdf_pages(b"garbage")
