"""
CV Text Extraction Utilities
Extracts text from various CV file formats
"""

import logging
import io
import PyPDF2
import docx

logger = logging.getLogger(__name__)


async def extract_text(content: bytes, file_format: str) -> str:
    """
    Extract text from uploaded file

    Args:
        content: File bytes
        file_format: File extension (pdf, docx, doc, txt)

    Returns:
        Extracted text content
    """
    try:
        if file_format == "pdf":
            return extract_pdf_text(content)
        elif file_format in ["docx", "doc"]:
            return extract_docx_text(content)
        elif file_format == "txt":
            return content.decode("utf-8")
        else:
            raise ValueError(f"Unsupported format: {file_format}")

    except Exception as e:
        logger.error(f"Text extraction failed: {e}", exc_info=True)
        return ""


def extract_pdf_text(content: bytes) -> str:
    """
    Extract text from PDF file

    Args:
        content: PDF file bytes

    Returns:
        Extracted text
    """
    pdf_file = io.BytesIO(content)
    pdf_reader = PyPDF2.PdfReader(pdf_file)

    text_parts = []
    for page in pdf_reader.pages:
        text_parts.append(page.extract_text())

    return "\n".join(text_parts)


def extract_docx_text(content: bytes) -> str:
    """
    Extract text from DOCX file

    Args:
        content: DOCX file bytes

    Returns:
        Extracted text
    """
    docx_file = io.BytesIO(content)
    doc = docx.Document(docx_file)

    text_parts = []
    for paragraph in doc.paragraphs:
        text_parts.append(paragraph.text)

    return "\n".join(text_parts)
