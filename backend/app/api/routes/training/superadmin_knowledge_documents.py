"""Super-admin document ingestion — scope=global, no tier quotas, superadmin-only."""

from datetime import datetime
from typing import Optional

from bson import ObjectId
from fastapi import (
    APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status,
)
from pydantic import BaseModel, Field

from app.api.routes.training.dependencies import require_superadmin
from app.core.logging_config import get_logger
from app.models.document import Document
from app.models.training_user import TrainingUser
from app.services.olorin.search.client import client_manager
from app.services.training.document_embedding import delete_document_vectors
from app.services.training.document_orchestrator import enqueue_ingest
from app.services.training.document_storage import (
    build_document_gcs_path,
    delete_document_blob,
    upload_document_bytes,
)

logger = get_logger(__name__)
router = APIRouter(
    prefix="/superadmin/knowledge",
    tags=["training-superadmin-knowledge"],
)


class PasteInput(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    text: str = Field(..., min_length=1, max_length=500_000)


class UrlInput(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    url: str = Field(..., pattern=r"^https?://.+")


class IngestResponse(BaseModel):
    document_id: str
    status: str


class DocumentItem(BaseModel):
    id: str
    title: str
    source_format: str
    status: str
    word_count: int
    chunk_count: int
    created_at: datetime
    source_url: Optional[str] = None
    last_reindexed_at: Optional[datetime] = None
    error: Optional[str] = None


class DocumentListResponse(BaseModel):
    items: list[DocumentItem]
    total: int


async def _create_global_document(
    *, partner_id: None, scope: str, title: str, source_format: str,
    created_by: str, gcs_path: str | None = None, source_url: str | None = None,
) -> Document:
    d = Document(
        partner_id=partner_id, scope=scope, title=title,
        source_format=source_format, created_by=created_by,
        gcs_path=gcs_path, source_url=source_url,
    )
    await d.insert()
    return d


async def _enqueue_ingest(doc: Document) -> None:
    enqueue_ingest(doc)


async def _fetch_global_documents(
    *, limit: int, skip: int,
) -> tuple[list[dict], int]:
    coll = Document.get_motor_collection()
    query = {"scope": "global", "partner_id": None}
    cursor = coll.find(query).sort("created_at", -1).skip(skip).limit(limit)
    rows = await cursor.to_list(length=limit)
    total = await coll.count_documents(query)
    return rows, total


async def _load_global_document(doc_id: str):
    try:
        oid = ObjectId(doc_id)
    except Exception:
        return None
    d = await Document.get(oid)
    if d is None or d.scope != "global" or d.partner_id is not None:
        return None
    return d


async def _get_index():
    if not client_manager.is_initialized:
        await client_manager.initialize()
    return client_manager.pinecone_index


def _to_item(row: dict) -> DocumentItem:
    return DocumentItem(
        id=str(row["_id"]),
        title=row["title"],
        source_format=row["source_format"],
        status=row["status"],
        word_count=int(row.get("word_count") or 0),
        chunk_count=int(row.get("chunk_count") or 0),
        created_at=row["created_at"],
        source_url=row.get("source_url"),
        last_reindexed_at=row.get("last_reindexed_at"),
        error=row.get("error"),
    )


@router.post("/documents/upload", response_model=IngestResponse)
async def upload_global_pdf(
    title: str = Form(..., min_length=1, max_length=200),
    file: UploadFile = File(...),
    user: TrainingUser = Depends(require_superadmin),
):
    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only application/pdf is accepted",
        )
    data = await file.read()
    doc = await _create_global_document(
        partner_id=None, scope="global", title=title,
        source_format="pdf", created_by=str(user.id),
    )
    gcs_path = build_document_gcs_path(
        partner_id=None, document_id=str(doc.id), filename=file.filename or "upload.pdf",
    )
    doc.gcs_path = gcs_path
    await doc.save()
    await upload_document_bytes(data, gcs_path, "application/pdf")
    await _enqueue_ingest(doc)
    logger.info("Global PDF upload accepted", extra={
        "super_admin_id": str(user.id), "doc_id": str(doc.id), "bytes": len(data),
    })
    return IngestResponse(document_id=str(doc.id), status=doc.status)


@router.post("/documents/paste", response_model=IngestResponse)
async def paste_global_markdown(
    body: PasteInput,
    user: TrainingUser = Depends(require_superadmin),
):
    doc = await _create_global_document(
        partner_id=None, scope="global", title=body.title,
        source_format="markdown", created_by=str(user.id),
    )
    gcs_path = build_document_gcs_path(
        partner_id=None, document_id=str(doc.id), filename=f"{body.title}.md",
    )
    doc.gcs_path = gcs_path
    await doc.save()
    await upload_document_bytes(body.text.encode("utf-8"), gcs_path, "text/markdown")
    await _enqueue_ingest(doc)
    return IngestResponse(document_id=str(doc.id), status=doc.status)


@router.post("/documents/url", response_model=IngestResponse)
async def ingest_global_url(
    body: UrlInput,
    user: TrainingUser = Depends(require_superadmin),
):
    doc = await _create_global_document(
        partner_id=None, scope="global",
        title=body.title or body.url, source_format="url",
        created_by=str(user.id), source_url=body.url,
    )
    await _enqueue_ingest(doc)
    return IngestResponse(document_id=str(doc.id), status=doc.status)


@router.get("/documents", response_model=DocumentListResponse)
async def list_global_documents(
    limit: int = Query(default=50, ge=1, le=200),
    skip: int = Query(default=0, ge=0),
    user: TrainingUser = Depends(require_superadmin),
):
    rows, total = await _fetch_global_documents(limit=limit, skip=skip)
    return DocumentListResponse(items=[_to_item(r) for r in rows], total=total)


@router.delete("/documents/{document_id}")
async def delete_global_document(
    document_id: str,
    user: TrainingUser = Depends(require_superadmin),
):
    d = await _load_global_document(document_id)
    if d is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    if d.chunk_count > 0:
        idx = await _get_index()
        if idx is not None:
            await delete_document_vectors(idx, document_id=document_id, chunk_count=d.chunk_count)
    if d.gcs_path:
        await delete_document_blob(d.gcs_path)
    await d.delete()
    logger.info("Global document deleted", extra={
        "super_admin_id": str(user.id), "doc_id": document_id,
    })
    return {"ok": True}


@router.post("/documents/{document_id}/reingest", response_model=IngestResponse)
async def reingest_global_document(
    document_id: str,
    user: TrainingUser = Depends(require_superadmin),
):
    d = await _load_global_document(document_id)
    if d is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    if d.chunk_count > 0:
        idx = await _get_index()
        if idx is not None:
            await delete_document_vectors(idx, document_id=document_id, chunk_count=d.chunk_count)
    d.status = "pending"
    d.error = None
    d.chunk_count = 0
    d.chunks = []
    await d.save()
    await _enqueue_ingest(d)
    return IngestResponse(document_id=document_id, status="pending")
