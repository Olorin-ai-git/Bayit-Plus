"""
Unit Tests for CV Service
Tests CV upload, analysis, and generation functionality
"""

import pytest
from unittest.mock import AsyncMock, Mock, patch
from io import BytesIO

from app.services.cv_service import CVService
from app.models import CV, User


@pytest.fixture
def cv_service():
    """Create CV service instance"""
    return CVService()


@pytest.mark.asyncio
async def test_extract_pdf_text(cv_service):
    """Test PDF text extraction"""
    # Create a simple PDF-like content
    pdf_content = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\n"

    with patch('app.services.cv_service.PyPDF2.PdfReader') as mock_reader:
        mock_page = Mock()
        mock_page.extract_text.return_value = "Test content"
        mock_reader.return_value.pages = [mock_page]

        result = cv_service._extract_pdf_text(pdf_content)

        assert result == "Test content"
        mock_reader.assert_called_once()


@pytest.mark.asyncio
async def test_extract_docx_text(cv_service):
    """Test DOCX text extraction"""
    docx_content = b"DOCX content"

    with patch('app.services.cv_service.docx.Document') as mock_doc:
        mock_paragraph = Mock()
        mock_paragraph.text = "Test paragraph"
        mock_doc.return_value.paragraphs = [mock_paragraph]

        result = cv_service._extract_docx_text(docx_content)

        assert result == "Test paragraph"
        mock_doc.assert_called_once()


@pytest.mark.asyncio
async def test_extract_text_unsupported_format(cv_service):
    """Test text extraction with unsupported format"""
    result = cv_service._extract_text(b"content", "xyz")
    assert result == ""


@pytest.mark.asyncio
async def test_upload_and_analyze_invalid_format(cv_service, test_user):
    """Test upload with invalid file format"""
    mock_file = AsyncMock()
    mock_file.filename = "test.xyz"
    mock_file.content_type = "application/octet-stream"
    mock_file.read = AsyncMock(return_value=b"content")

    with pytest.raises(ValueError, match="Unsupported file format"):
        await cv_service.upload_and_analyze(
            file=mock_file,
            user_id=str(test_user.id),
            language="en"
        )


@pytest.mark.asyncio
async def test_get_cv_ownership(cv_service, test_cv, test_user):
    """Test get CV with ownership verification"""
    cv = await cv_service.get_cv(str(test_cv.id), str(test_user.id))

    assert cv is not None
    assert cv.id == test_cv.id
    assert cv.user_id == str(test_user.id)


@pytest.mark.asyncio
async def test_get_cv_wrong_owner(cv_service, test_cv):
    """Test get CV with wrong owner"""
    with pytest.raises(PermissionError, match="Access denied"):
        await cv_service.get_cv(str(test_cv.id), "wrong_user_id")


@pytest.mark.asyncio
async def test_get_cv_not_found(cv_service):
    """Test get CV that doesn't exist"""
    cv = await cv_service.get_cv("000000000000000000000000", "user_id")
    assert cv is None


@pytest.mark.asyncio
async def test_get_analysis(cv_service, test_cv, test_user):
    """Test get analysis for CV"""
    # Create analysis
    from app.models import CVAnalysis
    analysis = CVAnalysis(
        cv_id=str(test_cv.id),
        user_id=str(test_user.id),
        skills=["Python", "FastAPI"],
        completeness_score=85,
        ats_score=78,
    )
    await analysis.save()

    # Update CV with analysis ID
    test_cv.analysis_id = str(analysis.id)
    await test_cv.save()

    # Get analysis
    result = await cv_service.get_analysis(str(test_cv.id), str(test_user.id))

    assert result is not None
    assert result.id == analysis.id
    assert result.skills == ["Python", "FastAPI"]


@pytest.mark.asyncio
async def test_generate_cv(cv_service, test_user):
    """Test CV generation"""
    user_data = {
        "name": "John Doe",
        "email": "john@example.com",
        "skills": ["Python", "FastAPI"],
    }

    with patch('app.services.cv_service.AIAgentService') as mock_ai:
        mock_ai.return_value.generate_cv_content = AsyncMock(
            return_value="Generated CV content"
        )

        with patch('app.services.cv_service.StorageService') as mock_storage:
            mock_storage.return_value.upload_text = AsyncMock(
                return_value="https://storage.googleapis.com/test/cv.txt"
            )

            cv = await cv_service.generate_cv(
                user_data=user_data,
                user_id=str(test_user.id),
                template="professional",
                language="en"
            )

            assert cv is not None
            assert cv.user_id == str(test_user.id)
            assert cv.status == "completed"
            assert cv.template == "professional"
            assert "Generated CV content" in cv.extracted_text
