"""Document ingestion state machine: pending → ready | failed."""

import asyncio
from datetime import datetime, timezone

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.document import Document as _Document
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

# Retain references to in-flight ingestion tasks so they are not garbage
# collected mid-flight (asyncio only holds a weak reference to running tasks).
_INGEST_TASKS: set[asyncio.Task] = set()

# Document statuses that are not terminal — a document in one of these states
# has unfinished ingestion work and should be re-enqueued on startup. Terminal
# states are "ready", "failed", and "stale".
_NON_TERMINAL_STATUSES = ("pending",)


def enqueue_ingest(doc) -> asyncio.Task:
    """Schedule ingestion for a Document and retain a strong task reference.

    The task removes itself from the retention set on completion via a
    done callback, so the set never grows unbounded.
    """
    task = asyncio.create_task(ingest_document(doc))
    _INGEST_TASKS.add(task)
    task.add_done_callback(_INGEST_TASKS.discard)
    return task


async def reap_pending_documents() -> int:
    """Re-enqueue Documents stranded in a non-terminal state on startup.

    Documents stuck in ``pending`` (e.g. due to a process restart while an
    ingestion task was in flight) have no completion record. Re-enqueue them
    so ingestion eventually finishes. Returns the count re-enqueued.
    """
    stranded = await _Document.find(
        {"status": {"$in": list(_NON_TERMINAL_STATUSES)}},
    ).to_list()

    for doc in stranded:
        enqueue_ingest(doc)

    if stranded:
        logger.info(
            "Re-enqueued stranded documents on startup",
            extra={"count": len(stranded)},
        )
    return len(stranded)


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
