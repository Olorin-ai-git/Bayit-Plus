"""Training platform progress tracking routes."""

import csv
import io
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.api.routes.training.dependencies import (
    get_current_training_user,
    require_training_admin,
)
from app.api.routes.olorin.webhooks import send_webhook_event
from app.models.integration_partner import IntegrationPartner
from app.models.content import Content
from app.models.training_progress import TrainingProgress
from app.models.training_user import TrainingUser

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/progress", tags=["training-progress"])


class HeartbeatRequest(BaseModel):
    position_seconds: int = Field(ge=0)
    total_duration_seconds: int = Field(ge=1)


@router.post("/{content_id}/heartbeat")
async def record_heartbeat(
    content_id: str,
    body: HeartbeatRequest,
    user: TrainingUser = Depends(get_current_training_user),
):
    """Record watch progress for a content item."""
    now = datetime.now(timezone.utc)
    watch_pct = min(body.position_seconds / body.total_duration_seconds, 1.0)

    record = await TrainingProgress.find_one(
        {"user_id": str(user.id), "content_id": content_id}
    )

    if not record:
        record = TrainingProgress(
            user_id=str(user.id),
            partner_id=user.partner_id,
            content_id=content_id,
            first_watched=now,
        )

    record.last_position_seconds = body.position_seconds
    record.watch_percentage = max(record.watch_percentage, watch_pct)
    record.total_watch_time_seconds += 10  # heartbeat interval
    record.last_watched = now

    if watch_pct >= 0.9 and not record.completed:
        record.completed = True
        record.completed_at = now
        partner = await IntegrationPartner.find_one(
            {"partner_id": user.partner_id}
        )
        if partner:
            await send_webhook_event(
                partner, "training.video_completed", {
                    "partner_id": user.partner_id,
                    "user_id": str(user.id),
                    "content_id": content_id,
                }
            )

    await record.save()
    return {"ok": True, "watch_percentage": record.watch_percentage}


@router.get("/me")
async def get_my_progress(
    user: TrainingUser = Depends(get_current_training_user),
):
    """Get current user's progress across all content."""
    records = await TrainingProgress.find(
        {"user_id": str(user.id)}
    ).to_list()
    return {
        "progress": [
            {
                "content_id": r.content_id,
                "watch_percentage": r.watch_percentage,
                "completed": r.completed,
                "quiz_count": len(r.quiz_scores),
                "avg_quiz_score": _avg_quiz(r),
                "pause_ask_count": r.pause_ask_count,
                "total_watch_time_seconds": r.total_watch_time_seconds,
                "last_watched": (
                    r.last_watched.isoformat() if r.last_watched else None
                ),
            }
            for r in records
        ],
    }


@router.get("/analytics")
async def get_analytics(
    admin: TrainingUser = Depends(require_training_admin),
):
    """Get org-level analytics for the admin dashboard."""
    users = await TrainingUser.find(
        {"partner_id": admin.partner_id, "status": "active"}
    ).to_list()

    all_progress = await TrainingProgress.find(
        {"partner_id": admin.partner_id}
    ).to_list()

    progress_by_user: dict[str, list[TrainingProgress]] = {}
    progress_by_content: dict[str, list[TrainingProgress]] = {}
    for p in all_progress:
        progress_by_user.setdefault(p.user_id, []).append(p)
        progress_by_content.setdefault(p.content_id, []).append(p)

    employees = []
    for u in users:
        uid = str(u.id)
        user_progress = progress_by_user.get(uid, [])
        completed = sum(1 for p in user_progress if p.completed)
        total_time = sum(p.total_watch_time_seconds for p in user_progress)
        quiz_scores = [
            s.score / s.max_score
            for p in user_progress
            for s in p.quiz_scores
            if s.max_score > 0
        ]
        employees.append({
            "user_id": uid,
            "display_name": u.display_name,
            "email": u.email,
            "department": u.department,
            "videos_started": len(user_progress),
            "videos_completed": completed,
            "avg_quiz_score": (
                round(sum(quiz_scores) / len(quiz_scores), 2)
                if quiz_scores else None
            ),
            "total_watch_time_seconds": total_time,
            "last_active_at": (
                u.last_login_at.isoformat() if u.last_login_at else None
            ),
        })

    contents = await Content.find(
        {"partner_id": admin.partner_id}
    ).to_list()

    videos = []
    for c in contents:
        cid = str(c.id)
        cp = progress_by_content.get(cid, [])
        avg_completion = (
            round(sum(p.watch_percentage for p in cp) / len(cp), 2)
            if cp else 0
        )
        videos.append({
            "content_id": cid,
            "title": c.title,
            "total_views": len(cp),
            "avg_completion": avg_completion,
            "completed_count": sum(1 for p in cp if p.completed),
        })

    return {"employees": employees, "videos": videos}


@router.get("/analytics/export")
async def export_analytics_csv(
    admin: TrainingUser = Depends(require_training_admin),
):
    """Export analytics as CSV."""
    analytics = await get_analytics(admin)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Name", "Email", "Department", "Videos Started",
        "Videos Completed", "Avg Quiz Score", "Watch Time (min)",
        "Last Active",
    ])
    for emp in analytics["employees"]:
        writer.writerow([
            emp["display_name"],
            emp["email"],
            emp["department"] or "",
            emp["videos_started"],
            emp["videos_completed"],
            emp["avg_quiz_score"] or "",
            round(emp["total_watch_time_seconds"] / 60, 1),
            emp["last_active_at"] or "",
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=training-analytics.csv"},
    )


def _avg_quiz(record: TrainingProgress) -> float | None:
    scores = [
        s.score / s.max_score
        for s in record.quiz_scores
        if s.max_score > 0
    ]
    return round(sum(scores) / len(scores), 2) if scores else None
