"""xAPI statement generation from training progress data."""

import json
import uuid
from datetime import datetime, timezone
from hashlib import sha256
from types import SimpleNamespace
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse, StreamingResponse

from app.api.routes.training.dependencies import (
    require_training_admin,
    _parse_trial_config,
)
from app.models.content import Content
from app.models.integration_partner import IntegrationPartner
from app.models.training_progress import TrainingProgress
from app.models.training_user import TrainingUser
from app.services.training.trial_service import (
    check_trial_permits,
    decrement_trial_cap,
)

router = APIRouter(prefix="/xapi", tags=["training-xapi"])
XAPI_ALLOWED_TIERS = {"enterprise"}
_TRIAL_FEATURE = "xapi_exports"
ACTIVITY_BASE = "https://training.olorin.ai/content"

_ADL = "http://adlnet.gov/expapi/verbs"
_VERB_IDS = {v: f"{_ADL}/{v}" for v in (
    "launched", "progressed", "completed", "scored", "interacted", "commented"
)}


def _verb(name: str) -> dict:
    return {"id": _VERB_IDS[name], "display": {"en-US": name}}


def _det_id(partner_id: str, *parts: str) -> str:
    seed = f"{partner_id}:{'|'.join(parts)}"
    return str(uuid.UUID(sha256(seed.encode()).hexdigest()[:32]))


def _iso_dur(seconds: int) -> str:
    h, rem = divmod(seconds, 3600)
    m, s = divmod(rem, 60)
    parts = "PT" + (f"{h}H" if h else "") + (f"{m}M" if m else "")
    return parts + f"{s}S"


def _actor(u: TrainingUser) -> dict:
    return {"objectType": "Agent", "name": u.display_name,
            "mbox": f"mailto:{u.email}"}


def _object(c: Content) -> dict:
    return {"objectType": "Activity", "id": f"{ACTIVITY_BASE}/{c.id}",
            "definition": {"name": {"en-US": c.title},
                           "type": "http://adlnet.gov/expapi/activities/media"}}


def _s(sid: str, actor: dict, verb: dict, obj: dict, ts: str,
       result: dict | None = None) -> dict:
    st: dict = {"id": sid, "actor": actor, "verb": verb,
                "object": obj, "timestamp": ts, "stored": ts}
    if result:
        st["result"] = result
    return st


def _gen(p: TrainingProgress, u: TrainingUser,
         c: Content, pid: str) -> list[dict]:
    a, o, out = _actor(u), _object(c), []
    uid, cid = str(u.id), str(c.id)
    did = lambda *x: _det_id(pid, uid, cid, *x)  # noqa: E731
    if p.first_watched:
        out.append(_s(did("launched"), a, _verb("launched"), o,
                      p.first_watched.isoformat()))
    if p.watch_percentage > 0 and p.last_watched:
        out.append(_s(did("progressed"), a, _verb("progressed"), o,
                   p.last_watched.isoformat(),
                   {"extensions": {"https://olorin.ai/xapi/progress":
                                   round(p.watch_percentage, 3)}}))
    if p.completed and p.completed_at:
        out.append(_s(did("completed"), a, _verb("completed"), o,
                   p.completed_at.isoformat(), {"completion": True,
                   "duration": _iso_dur(p.total_watch_time_seconds)}))
    for i, qa in enumerate(p.quiz_scores):
        sc = qa.score / qa.max_score if qa.max_score > 0 else 0
        out.append(_s(did("scored", str(i)), a, _verb("scored"), o,
                   qa.completed_at.isoformat(), {"score": {"scaled": round(sc, 2),
                   "raw": qa.score, "max": qa.max_score}}))
    if p.pause_ask_count > 0 and p.last_watched:
        out.append(_s(did("interacted"), a, _verb("interacted"), o,
                   p.last_watched.isoformat(),
                   {"extensions": {"https://olorin.ai/xapi/pause-ask-count":
                                   p.pause_ask_count}}))
    if p.companion_queries > 0 and p.last_watched:
        out.append(_s(did("commented"), a, _verb("commented"), o,
                   p.last_watched.isoformat(),
                   {"extensions": {"https://olorin.ai/xapi/companion-queries":
                                   p.companion_queries}}))
    return out


def _resolve_tier(partner: IntegrationPartner) -> str:
    if partner.billing_tier == "training":
        return (partner.training_config or {}).get("tier", "team")
    return partner.billing_tier


@router.get("/statements")
async def get_xapi_statements(
    admin: TrainingUser = Depends(require_training_admin),
    since: Optional[datetime] = Query(default=None),
    until: Optional[datetime] = Query(default=None),
    agent: Optional[str] = Query(default=None),
    activity: Optional[str] = Query(default=None),
    format: str = Query(default="json", pattern="^(json|file)$"),
):
    """Generate xAPI 1.0.3 statements from training progress.

    ?since/until -- date range.  ?agent -- filter by email.
    ?activity -- filter by content_id.  ?format=file -- download.
    """
    partner = await IntegrationPartner.find_one(
        IntegrationPartner.partner_id == admin.partner_id,
    )
    if not partner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )
    tc = _parse_trial_config(partner)
    if tc is not None and tc.state in {"active", "grace"}:
        wrapper = SimpleNamespace(
            training_config=SimpleNamespace(trial_config=tc),
        )
        await check_trial_permits(wrapper, _TRIAL_FEATURE)
    elif _resolve_tier(partner) not in XAPI_ALLOWED_TIERS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="xAPI requires Enterprise tier",
        )

    query: dict = {"partner_id": admin.partner_id}
    if since:
        query.setdefault("last_watched", {})["$gte"] = since
    if until:
        query.setdefault("last_watched", {})["$lte"] = until
    if activity:
        query["content_id"] = activity

    progress_list = await TrainingProgress.find(query).to_list()

    users = await TrainingUser.find(
        {"partner_id": admin.partner_id, "status": "active"}
    ).to_list()
    user_map = {str(u.id): u for u in users}

    if agent:
        uid = next((k for k, u in user_map.items() if u.email == agent), None)
        progress_list = [p for p in progress_list if p.user_id == uid] if uid else []

    contents = await Content.find({"partner_id": admin.partner_id}).to_list()
    content_map = {str(c.id): c for c in contents}

    statements: list[dict] = []
    for p in progress_list:
        u = user_map.get(p.user_id)
        c = content_map.get(p.content_id)
        if u and c:
            statements.extend(_gen(p, u, c, admin.partner_id))

    statements.sort(key=lambda s: s["timestamp"])

    # Decrement trial cap after successful generation
    if tc is not None and tc.state == "active":
        ok = await decrement_trial_cap(partner.id, _TRIAL_FEATURE)
        if not ok:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"Trial preview cap reached for {_TRIAL_FEATURE}. Upgrade.",
            )
    payload = {"statements": statements, "more": ""}
    if format == "file":
        body = json.dumps(payload, indent=2, ensure_ascii=False)
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        return StreamingResponse(
            iter([body]), media_type="application/json",
            headers={"Content-Disposition":
                      f"attachment; filename=xapi-{today}.json"})
    return JSONResponse(payload)
