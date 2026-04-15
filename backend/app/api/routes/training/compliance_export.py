"""Training compliance report: per-employee, per-assignment data."""

import csv
import io
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse, StreamingResponse

from app.api.routes.training.dependencies import require_training_admin
from app.models.content import Content
from app.models.training_assignment import TrainingAssignment
from app.models.training_progress import TrainingProgress
from app.models.training_user import TrainingUser

router = APIRouter(prefix="/progress", tags=["training-compliance"])

CSV_HEADERS = [
    "Employee Name",
    "Employee Email",
    "Department",
    "Content Title",
    "Required",
    "Due Date",
    "Status",
    "Completed Date",
    "Watch %",
    "Watch Time (min)",
    "Quiz Score",
    "Quiz Attempts",
    "Pause & Ask Count",
    "AI Companion Queries",
    "First Watched",
    "Last Watched",
    "Assigned By",
    "Assigned Date",
]


def _fmt_dt(dt: datetime | None) -> str:
    return dt.isoformat() if dt else ""


def _avg_quiz_pct(progress: TrainingProgress) -> str:
    scores = [
        s.score / s.max_score
        for s in progress.quiz_scores
        if s.max_score > 0
    ]
    if not scores:
        return ""
    return f"{round(sum(scores) / len(scores) * 100)}%"


def _status(
    progress: TrainingProgress | None,
    due_date: datetime | None,
) -> str:
    if progress and progress.completed:
        return "Complete"
    if due_date and due_date < datetime.now(timezone.utc):
        return "Overdue"
    return "Incomplete"


async def _build_compliance_rows(
    admin: TrainingUser,
) -> list[dict]:
    assignments = await TrainingAssignment.find(
        {"partner_id": admin.partner_id, "required": True}
    ).to_list()

    all_progress = await TrainingProgress.find(
        {"partner_id": admin.partner_id}
    ).to_list()

    users = await TrainingUser.find(
        {"partner_id": admin.partner_id, "status": "active"}
    ).to_list()

    contents = await Content.find(
        {"partner_id": admin.partner_id}
    ).to_list()

    user_map = {str(u.id): u for u in users}
    content_map = {str(c.id): c for c in contents}
    progress_key = {
        (p.user_id, p.content_id): p for p in all_progress
    }

    admin_cache: dict[str, str] = {}

    rows: list[dict] = []
    for a in assignments:
        content = content_map.get(a.content_id)
        title = content.title if content else a.content_id

        if a.assigned_to == "all":
            targets = list(user_map.values())
        else:
            targets = [
                user_map[uid]
                for uid in a.assigned_to
                if uid in user_map
            ]

        if a.created_by not in admin_cache:
            creator = user_map.get(a.created_by)
            admin_cache[a.created_by] = (
                creator.email if creator else a.created_by
            )

        for u in targets:
            uid = str(u.id)
            p = progress_key.get((uid, a.content_id))
            status = _status(p, a.due_date)

            rows.append({
                "employee_name": u.display_name,
                "employee_email": u.email,
                "department": u.department or "",
                "content_title": title,
                "required": "Yes",
                "due_date": _fmt_dt(a.due_date),
                "status": status,
                "completed_date": _fmt_dt(p.completed_at) if p else "",
                "watch_pct": (
                    f"{round(p.watch_percentage * 100)}%" if p else ""
                ),
                "watch_time_min": (
                    round(p.total_watch_time_seconds / 60, 1) if p else ""
                ),
                "quiz_score": _avg_quiz_pct(p) if p else "",
                "quiz_attempts": len(p.quiz_scores) if p else 0,
                "pause_ask_count": p.pause_ask_count if p else 0,
                "companion_queries": p.companion_queries if p else 0,
                "first_watched": _fmt_dt(p.first_watched) if p else "",
                "last_watched": _fmt_dt(p.last_watched) if p else "",
                "assigned_by": admin_cache[a.created_by],
                "assigned_date": _fmt_dt(a.created_at),
            })

    return rows


@router.get("/compliance")
async def get_compliance_data(
    admin: TrainingUser = Depends(require_training_admin),
    format: str = Query(default="json", regex="^(json|csv)$"),
):
    """Compliance data: per-employee, per-required-assignment rows.

    ?format=json (default) — JSON array for the ComplianceTab.
    ?format=csv — downloadable CSV for HR/auditors.
    """
    rows = await _build_compliance_rows(admin)

    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(CSV_HEADERS)
        for r in rows:
            writer.writerow([
                r["employee_name"],
                r["employee_email"],
                r["department"],
                r["content_title"],
                r["required"],
                r["due_date"],
                r["status"],
                r["completed_date"],
                r["watch_pct"],
                r["watch_time_min"],
                r["quiz_score"],
                r["quiz_attempts"],
                r["pause_ask_count"],
                r["companion_queries"],
                r["first_watched"],
                r["last_watched"],
                r["assigned_by"],
                r["assigned_date"],
            ])
        output.seek(0)
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        fname = f"compliance-report-{admin.partner_id}-{today}.csv"
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={fname}"},
        )

    return JSONResponse({"rows": rows})
