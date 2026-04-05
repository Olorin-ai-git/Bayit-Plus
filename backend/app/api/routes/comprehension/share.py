"""Public share-link route for comprehension reports (D-09, D-10).

GET /api/v1/comprehension/share/{share_token} — NO AUTH. The share_token is
a cryptographic capability URL generated via secrets.token_urlsafe. Returns
a sanitised PartnerReportDTO so numeric scores + rationale text remain
strictly band-only + 240-char summary. No override affordance here (D-10).
"""
from typing import Any

from fastapi import APIRouter, HTTPException, status

from app.models.comprehension_report import ComprehensionReport
from app.models.comprehension_session import ComprehensionSession
from app.services.olorin.comprehension.partner_dto import to_partner_report_dto

router = APIRouter(
    prefix="/comprehension/share",
    tags=["comprehension-share"],
)


@router.get("/{share_token}")
async def read_share_report(share_token: str) -> Any:
    if not share_token or len(share_token) < 16:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="share token not found",
        )
    session = await ComprehensionSession.find_one(
        {"share_token": share_token},
    )
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="share token not found",
        )
    report = await ComprehensionReport.find_one(
        {"comprehension_session_id": str(session.id)},
    )
    if report is None or report.status == "generation_failed":
        return {
            "status": "generating",
            "session_id": str(session.id),
        }
    return to_partner_report_dto(report)
