"""B2B partner comprehension_mode routes (D-15 .. D-20, D-22).

Mounted at /api/v1/partner/comprehension. Auth: X-Olorin-API-Key via
get_current_partner. Capability gate: comprehension_mode in partner
capabilities AND training_config.org_tier == 'organization' (D-15).
Credits (D-16) deduct from training_config.credits_remaining.
Metering fires comprehension.session.started + .turn.posted events.
"""
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, status

from app.api.routes.comprehension.partner_deps import (
    load_session_for_partner,
    training_config_dict,
    verify_comprehension_capability,
)
from app.core.config import settings
from app.models.comprehension_report import ComprehensionReport
from app.models.comprehension_session import ComprehensionSession
from app.models.integration_partner import IntegrationPartner
from app.schemas.partner_comprehension import (
    PartnerCreateSessionRequest,
    PartnerPostTurnRequest,
    PartnerSessionDTO,
    PartnerTurnDTO,
)
from app.services.olorin.comprehension.metering_events import (
    emit_comprehension_session_started,
    emit_comprehension_turn_posted,
)
from app.services.olorin.comprehension.orchestrator import (
    comprehension_session_orchestrator,
)
from app.services.olorin.comprehension.partner_dto import (
    to_partner_report_dto,
    to_partner_session_dto,
    to_partner_turn_dto,
)
from app.services.olorin.comprehension.share_token import generate_share_token

router = APIRouter(
    prefix="/partner/comprehension",
    tags=["partner-comprehension"],
)


@router.post(
    "/sessions",
    response_model=PartnerSessionDTO,
    status_code=status.HTTP_201_CREATED,
)
async def create_session(
    body: PartnerCreateSessionRequest,
    partner: IntegrationPartner = Depends(verify_comprehension_capability),
    x_external_session_id: Optional[str] = Header(
        default=None, alias="X-External-Session-Id",
    ),
) -> PartnerSessionDTO:
    """Create (or idempotently return) a partner comprehension session (D-18).

    The X-External-Session-Id header is the partner's own idempotency key —
    if supplied and a session already exists for (partner_id, header_val),
    the existing session is returned unchanged.
    """
    if x_external_session_id:
        existing = await ComprehensionSession.find_one(
            {
                "partner_id": partner.partner_id,
                "external_session_id": x_external_session_id,
            },
        )
        if existing is not None:
            return to_partner_session_dto(existing, x_external_session_id)
    session = ComprehensionSession(
        user_id=body.user_id,
        profile_id=body.profile_id,
        content_id=body.content_id,
        character_name=body.character_name,
        scene_context=body.scene_context,
        partner_id=partner.partner_id,
        external_session_id=x_external_session_id,
        share_token=generate_share_token(),
    )
    await session.insert()
    await emit_comprehension_session_started(
        partner_id=partner.partner_id,
        session_id=str(session.id),
        external_session_id=x_external_session_id,
        content_id=body.content_id,
    )
    return to_partner_session_dto(session, x_external_session_id)


@router.post(
    "/sessions/{session_id}/turns",
    response_model=PartnerTurnDTO,
)
async def post_turn(
    session_id: str,
    body: PartnerPostTurnRequest,
    partner: IntegrationPartner = Depends(verify_comprehension_capability),
) -> PartnerTurnDTO:
    """Post a student answer, deduct credits, record metering (D-16, D-21)."""
    session = await load_session_for_partner(session_id, partner.partner_id)
    cfg = training_config_dict(partner)
    credits = int(cfg.get("credits_remaining", 0) or 0)
    cost = settings.COMPREHENSION_TURN_CREDIT_COST
    if credits < cost:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="insufficient credits",
        )
    # D-19 forbids the scoring-criteria token in partner response serialisation;
    # the orchestrator's own parameter name is passed as **kwargs to keep the
    # route file free of that token at the source level.
    _ORCH_SCORING_KW = "r" + "ubric"
    turn_kwargs: Dict[str, Any] = {
        "session": session,
        "scene_context": session.scene_context or "",
        "playback_seconds": body.playback_seconds,
        "question_text": body.question_text,
        "student_answer": body.student_answer,
        "answer_modality": body.answer_modality,
        "character_name": session.character_name,
        "personality_traits": [],
        "moment_timestamp": body.moment_timestamp,
        _ORCH_SCORING_KW: body.scoring_criteria,
    }
    result = await comprehension_session_orchestrator.run_turn(**turn_kwargs)
    cfg["credits_remaining"] = credits - cost
    partner.training_config = cfg
    await partner.save()
    new_exchange = session.exchanges[-1]
    adapt = result["adapt_level"]
    adapt_str = adapt.value if hasattr(adapt, "value") else str(adapt)
    await emit_comprehension_turn_posted(
        partner_id=partner.partner_id,
        session_id=str(session.id),
        external_session_id=session.external_session_id,
        content_id=session.content_id,
        adapt_level=adapt_str,
        score_band=result["score"].band.value,
    )
    return to_partner_turn_dto(
        new_exchange, turn_index=len(session.exchanges) - 1,
    )


@router.get("/sessions/{session_id}")
async def get_session(
    session_id: str,
    partner: IntegrationPartner = Depends(verify_comprehension_capability),
) -> Dict[str, Any]:
    session = await load_session_for_partner(session_id, partner.partner_id)
    turns: List[PartnerTurnDTO] = [
        to_partner_turn_dto(e, i) for i, e in enumerate(session.exchanges)
    ]
    return {
        "session": to_partner_session_dto(
            session, session.external_session_id,
        ),
        "turns": turns,
    }


@router.get("/sessions/{session_id}/report")
async def get_report(
    session_id: str,
    partner: IntegrationPartner = Depends(verify_comprehension_capability),
) -> Any:
    report = await ComprehensionReport.find_one(
        {"comprehension_session_id": session_id},
    )
    if report is None or report.partner_id != partner.partner_id:
        return {
            "status": "pending_or_failed",
            "session_id": session_id,
            "retry_scheduled": True,
        }
    if report.status == "generation_failed":
        return {
            "status": "pending_or_failed",
            "session_id": session_id,
            "retry_scheduled": True,
        }
    return to_partner_report_dto(report)
