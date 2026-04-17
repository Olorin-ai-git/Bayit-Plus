"""Document ingestion routes — upload/paste/url/list/delete/reingest. Admin-only."""

import asyncio

from fastapi import (
    APIRouter, Depends, File, Form, HTTPException, UploadFile, status,
)
from pydantic import BaseModel, Field

from app.api.routes.training.dependencies import require_training_admin
from app.api.routes.training.knowledge import _get_tier
from app.core.logging_config import get_logger
from app.models.document import Document
from app.models.training_user import TrainingUser
from app.services.training.document_orchestrator import ingest_document
from app.services.training.document_quota import (
    QuotaExceededError,
    check_per_file_size,
    check_total_storage,
    check_url_rate,
)
from app.services.training.document_storage import (
    build_document_gcs_path,
    upload_document_bytes,
)

logger = get_logger(__name__)
router = APIRouter(prefix="/knowledge", tags=["training-knowledge"])


class PasteInput(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    text: str = Field(..., min_length=1, max_length=500_000)


class UrlInput(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    url: str = Field(..., pattern=r"^https?://.+")


class IngestResponse(BaseModel):
    document_id: str
    status: str


async def _create_document(
    *, partner_id: str, scope: str, title: str, source_format: str,
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
    asyncio.create_task(ingest_document(doc))


def _quota_error(exc: QuotaExceededError) -> HTTPException:
    msg = str(exc)
    if "tier" in msg or "cannot" in msg:
        return HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=msg)
    if "rate" in msg:
        return HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=msg)
    return HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail=msg)


@router.post("/documents/upload", response_model=IngestResponse)
async def upload_pdf(
    title: str = Form(..., min_length=1, max_length=200),
    file: UploadFile = File(...),
    user: TrainingUser = Depends(require_training_admin),
):
    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only application/pdf is accepted",
        )

    data = await file.read()
    tier = await _get_tier(user.partner_id)

    try:
        check_per_file_size(size_bytes=len(data), tier=tier)
        await check_total_storage(
            partner_id=user.partner_id, tier=tier, additional_bytes=len(data),
        )
    except QuotaExceededError as exc:
        raise _quota_error(exc)

    doc = await _create_document(
        partner_id=user.partner_id, scope="partner", title=title,
        source_format="pdf", created_by=str(user.id),
    )
    gcs_path = build_document_gcs_path(
        partner_id=user.partner_id, document_id=str(doc.id), filename=file.filename or "upload.pdf",
    )
    doc.gcs_path = gcs_path
    await doc.save()

    await upload_document_bytes(data, gcs_path, "application/pdf")
    await _enqueue_ingest(doc)

    logger.info("PDF upload accepted", extra={
        "partner_id": user.partner_id, "doc_id": str(doc.id), "bytes": len(data),
    })
    return IngestResponse(document_id=str(doc.id), status=doc.status)


@router.post("/documents/paste", response_model=IngestResponse)
async def paste_markdown(
    body: PasteInput,
    user: TrainingUser = Depends(require_training_admin),
):
    data = body.text.encode("utf-8")
    tier = await _get_tier(user.partner_id)

    try:
        check_per_file_size(size_bytes=len(data), tier=tier)
        await check_total_storage(
            partner_id=user.partner_id, tier=tier, additional_bytes=len(data),
        )
    except QuotaExceededError as exc:
        raise _quota_error(exc)

    doc = await _create_document(
        partner_id=user.partner_id, scope="partner", title=body.title,
        source_format="markdown", created_by=str(user.id),
    )
    gcs_path = build_document_gcs_path(
        partner_id=user.partner_id, document_id=str(doc.id), filename=f"{body.title}.md",
    )
    doc.gcs_path = gcs_path
    await doc.save()

    await upload_document_bytes(data, gcs_path, "text/markdown")
    await _enqueue_ingest(doc)
    return IngestResponse(document_id=str(doc.id), status=doc.status)


@router.post("/documents/url", response_model=IngestResponse)
async def ingest_url(
    body: UrlInput,
    user: TrainingUser = Depends(require_training_admin),
):
    tier = await _get_tier(user.partner_id)
    try:
        await check_url_rate(partner_id=user.partner_id, tier=tier)
    except QuotaExceededError as exc:
        raise _quota_error(exc)

    doc = await _create_document(
        partner_id=user.partner_id, scope="partner",
        title=body.title or body.url, source_format="url",
        created_by=str(user.id), source_url=body.url,
    )
    await _enqueue_ingest(doc)
    return IngestResponse(document_id=str(doc.id), status=doc.status)
