"""Document ingestion state machine: pending → ready | failed."""

import asyncio
from datetime import datetime, timezone

from app.core.config import settings
from app.core.logging_config import get_logger
from app.services.olorin.search.client import client_manager
from app.services.training.document_chunking import (
    chunk_markdown_sections,
    chunk_pdf_pages,
)
from app.services.training.document_embedding import embed_and_upsert_chunks
from app.services.training.document_extraction import (
    AuthWallError,
    PasswordProtectedError,
    extract_markdown_sections,
    extract_pdf_pages,
    fetch_url_content,
)

logger = get_logger(__name__)


async def _get_index():
    if not client_manager.is_initialized:
        await client_manager.initialize()
    return client_manager.pinecone_index


async def _load_document_bytes(gcs_path: str) -> bytes:
    from google.cloud import storage

    def _sync():
        client = storage.Client()
        bucket = client.bucket(settings.GCS_BUCKET_NAME)
        return bucket.blob(gcs_path).download_as_bytes()

    return await asyncio.to_thread(_sync)


async def ingest_document(doc) -> None:
    """Run full extraction → chunking → embedding for a Document row."""
    try:
        chunks = []
        if doc.source_format == "pdf":
            if not doc.gcs_path:
                raise ValueError("PDF ingest missing gcs_path")
            pdf_bytes = await _load_document_bytes(doc.gcs_path)
            pages = extract_pdf_pages(pdf_bytes)
            chunks = chunk_pdf_pages(
                pages,
                size=settings.KNOWLEDGE_DOC_CHUNK_TOKENS,
                overlap=settings.KNOWLEDGE_DOC_CHUNK_OVERLAP,
            )
            doc.word_count = sum(len(text.split()) for _, text in pages)
        elif doc.source_format == "markdown":
            if not doc.gcs_path:
                raise ValueError("Markdown ingest missing gcs_path")
            md_bytes = await _load_document_bytes(doc.gcs_path)
            md_text = md_bytes.decode("utf-8", errors="replace")
            sections = extract_markdown_sections(md_text)
            chunks = chunk_markdown_sections(
                sections,
                size=settings.KNOWLEDGE_DOC_CHUNK_TOKENS,
                overlap=settings.KNOWLEDGE_DOC_CHUNK_OVERLAP,
            )
            doc.word_count = sum(len(s["text"].split()) for s in sections)
        elif doc.source_format == "url":
            if not doc.source_url:
                raise ValueError("URL ingest missing source_url")
            fetched = await fetch_url_content(doc.source_url)
            sections = extract_markdown_sections(fetched["text"])
            chunks = chunk_markdown_sections(
                sections,
                size=settings.KNOWLEDGE_DOC_CHUNK_TOKENS,
                overlap=settings.KNOWLEDGE_DOC_CHUNK_OVERLAP,
            )
            doc.word_count = len(fetched["text"].split())
            if not doc.title or doc.title == doc.source_url:
                doc.title = fetched["title"]
        else:
            raise ValueError(f"Unsupported source format: {doc.source_format}")

        if chunks:
            idx = await _get_index()
            await embed_and_upsert_chunks(
                index=idx,
                document_id=str(doc.id),
                partner_id=doc.partner_id,
                scope=doc.scope,
                title=doc.title,
                chunks=chunks,
            )

        doc.chunks = chunks
        doc.chunk_count = len(chunks)
        doc.status = "ready"
        doc.error = None
        doc.last_reindexed_at = datetime.now(timezone.utc)
    except PasswordProtectedError as exc:
        doc.status = "failed"
        doc.error = f"password-protected PDF: {exc}"
    except AuthWallError as exc:
        doc.status = "failed"
        doc.error = f"auth-walled URL: {exc}"
    except Exception as exc:
        doc.status = "failed"
        doc.error = str(exc)
        logger.error(
            "Document ingest failed",
            extra={"doc_id": str(getattr(doc, "id", "?")), "error": str(exc)},
        )

    await doc.save()
    logger.info(
        "Document ingest finished",
        extra={
            "doc_id": str(getattr(doc, "id", "?")),
            "status": doc.status,
            "chunk_count": doc.chunk_count,
        },
    )
