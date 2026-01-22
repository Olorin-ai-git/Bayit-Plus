"""
Unit Tests for CV Text Extraction
Tests PDF and DOCX text extraction functionality
"""

import pytest
from unittest.mock import MagicMock, patch
from io import BytesIO


@pytest.mark.asyncio
async def test_extract_pdf_text():
    """Test PDF text extraction"""
    with patch('app.services.cv_text_extraction.PyPDF2.PdfReader') as mock_reader:
        mock_page = MagicMock()
        mock_page.extract_text.return_value = "Test PDF content"
        mock_reader.return_value.pages = [mock_page]

        from app.services.cv_text_extraction import extract_pdf_text
        result = extract_pdf_text(b"fake pdf content")

        assert result == "Test PDF content"


@pytest.mark.asyncio
async def test_extract_pdf_text_multiple_pages():
    """Test PDF text extraction with multiple pages"""
    with patch('app.services.cv_text_extraction.PyPDF2.PdfReader') as mock_reader:
        mock_page1 = MagicMock()
        mock_page1.extract_text.return_value = "Page 1 content"
        mock_page2 = MagicMock()
        mock_page2.extract_text.return_value = "Page 2 content"
        mock_reader.return_value.pages = [mock_page1, mock_page2]

        from app.services.cv_text_extraction import extract_pdf_text
        result = extract_pdf_text(b"fake pdf content")

        assert "Page 1 content" in result
        assert "Page 2 content" in result


@pytest.mark.asyncio
async def test_extract_docx_text():
    """Test DOCX text extraction"""
    with patch('app.services.cv_text_extraction.docx.Document') as mock_doc:
        mock_para1 = MagicMock()
        mock_para1.text = "Paragraph 1"
        mock_para2 = MagicMock()
        mock_para2.text = "Paragraph 2"
        mock_doc.return_value.paragraphs = [mock_para1, mock_para2]

        from app.services.cv_text_extraction import extract_docx_text
        result = extract_docx_text(b"fake docx content")

        assert "Paragraph 1" in result
        assert "Paragraph 2" in result


@pytest.mark.asyncio
async def test_extract_text_txt_format():
    """Test plain text extraction"""
    from app.services.cv_text_extraction import extract_text

    result = await extract_text(b"Plain text content", "txt")

    assert result == "Plain text content"


@pytest.mark.asyncio
async def test_extract_text_pdf_format():
    """Test extract_text function with PDF format"""
    with patch('app.services.cv_text_extraction.extract_pdf_text') as mock_extract:
        mock_extract.return_value = "PDF content"

        from app.services.cv_text_extraction import extract_text
        result = await extract_text(b"fake pdf", "pdf")

        assert result == "PDF content"


@pytest.mark.asyncio
async def test_extract_text_docx_format():
    """Test extract_text function with DOCX format"""
    with patch('app.services.cv_text_extraction.extract_docx_text') as mock_extract:
        mock_extract.return_value = "DOCX content"

        from app.services.cv_text_extraction import extract_text
        result = await extract_text(b"fake docx", "docx")

        assert result == "DOCX content"


@pytest.mark.asyncio
async def test_extract_text_doc_format():
    """Test extract_text function with DOC format"""
    with patch('app.services.cv_text_extraction.extract_docx_text') as mock_extract:
        mock_extract.return_value = "DOC content"

        from app.services.cv_text_extraction import extract_text
        result = await extract_text(b"fake doc", "doc")

        assert result == "DOC content"


@pytest.mark.asyncio
async def test_extract_text_unsupported_format():
    """Test extract_text with unsupported format returns empty string"""
    from app.services.cv_text_extraction import extract_text
    result = await extract_text(b"some content", "xyz")

    assert result == ""
