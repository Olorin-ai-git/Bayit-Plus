"""Teacher-facing comprehension-report routes (training JWT, D-08/D-10/D-11).

GET /api/v1/training/comprehension-reports/ — list reports for org.
GET /api/v1/training/comprehension-reports/{session_id} — detail read.
POST /api/v1/training/comprehension-reports/{session_id}/turns/{i}/override —
     append a teacher override audit row (D-11, teacher/admin only).
"""
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.routes.training.dependencies import (
    require_training_teacher_or_admin,
)
from app.models.comprehension_report import ComprehensionReport
from app.models.comprehension_session import ComprehensionSession
from app.models.training_user import TrainingUser
from app.schemas.comprehension_report import (
    ComprehensionReportResponse,
    ComprehensionReportSummary,
    OverrideRequest,
    ReportTurnResponse,
)
from app.services.olorin.comprehension.override_service import append_override
from app.services.olorin.comprehension.report_generator import (
    build_report_from_session,
)

router = APIRouter(
    prefix="/comprehension-reports",
    tags=["training-comprehension"],
)


def _to_response(report: ComprehensionReport) -> ComprehensionReportResponse:
    turns = [
        ReportTurnResponse(**t.model_dump()) for t in report.turns
    ]
    return ComprehensionReportResponse(
        session_id=report.comprehension_session_id,
        comprehension_session_id=report.comprehension_session_id,
        partner_id=report.partner_id,
        user_id=report.user_id,
        profile_id=report.profile_id,
        content_id=report.content_id,
        character_name=report.character_name,
        turn_count=report.turn_count,
        avg_score=report.avg_score,
        high_count=report.high_count,
        med_count=report.med_count,
        low_count=report.low_count,
        turns=turns,
        status=report.status,
        generation_attempts=report.generation_attempts,
        last_error=report.last_error,
        generated_at=report.generated_at,
    )


async def _load_report_for_org(
    session_id: str, partner_id: str,
) -> ComprehensionReport:
    report = await ComprehensionReport.find_one(
        {"comprehension_session_id": session_id},
    )
    if report is None or report.partner_id != partner_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found",
        )
    return report


async def _upsert_report(report: ComprehensionReport) -> ComprehensionReport:
    existing = await ComprehensionReport.find_one(
        ComprehensionReport.comprehension_session_id
        == report.comprehension_session_id,
    )
    if existing is not None:
        existing.turn_count = report.turn_count
        existing.avg_score = report.avg_score
        existing.high_count = report.high_count
        existing.med_count = report.med_count
        existing.low_count = report.low_count
        existing.turns = report.turns
        existing.status = report.status
        await existing.save()
        return existing
    await report.insert()
    return report


@router.get(
    "/",
    response_model=List[ComprehensionReportSummary],
    summary="List comprehension reports for the teacher's org",
)
async def list_reports(
    user: TrainingUser = Depends(require_training_teacher_or_admin),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=25, ge=1, le=100),
) -> List[ComprehensionReportSummary]:
    reports = (
        await ComprehensionReport.find(
            {"partner_id": user.partner_id},
        )
        .sort("-generated_at")
        .skip(skip)
        .limit(limit)
        .to_list()
    )
    return [
        ComprehensionReportSummary(
            session_id=r.comprehension_session_id,
            partner_id=r.partner_id,
            user_id=r.user_id,
            profile_id=r.profile_id,
            content_id=r.content_id,
            character_name=r.character_name,
            turn_count=r.turn_count,
            avg_score=r.avg_score,
            high_count=r.high_count,
            med_count=r.med_count,
            low_count=r.low_count,
            status=r.status,
            generated_at=r.generated_at,
        )
        for r in reports
    ]


@router.get(
    "/{session_id}",
    response_model=ComprehensionReportResponse,
    summary="Read a single comprehension report (teacher/admin)",
)
async def get_report(
    session_id: str,
    user: TrainingUser = Depends(require_training_teacher_or_admin),
) -> ComprehensionReportResponse:
    report = await _load_report_for_org(session_id, user.partner_id)
    return _to_response(report)


@router.post(
    "/{session_id}/turns/{turn_index}/override",
    response_model=ComprehensionReportResponse,
    summary="Append a teacher override and re-aggregate report",
)
async def override_turn(
    session_id: str,
    turn_index: int,
    body: OverrideRequest,
    user: TrainingUser = Depends(require_training_teacher_or_admin),
) -> ComprehensionReportResponse:
    # Org scope check via the existing report doc.
    existing_report = await _load_report_for_org(session_id, user.partner_id)
    session = await ComprehensionSession.get(session_id)
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )
    try:
        await append_override(
            session=session,
            turn_index=turn_index,
            teacher_id=str(user.id),
            score_after=body.score_after,
            rationale_after=body.rationale_after,
            note=body.note,
        )
    except IndexError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc),
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc),
        ) from exc
    rebuilt = build_report_from_session(
        session, partner_id=existing_report.partner_id,
    )
    persisted = await _upsert_report(rebuilt)
    return _to_response(persisted)
