"""Training platform analytics CSV export route."""

import csv
import io

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from app.api.routes.training.dependencies import require_training_admin
from app.api.routes.training.progress import get_analytics
from app.models.training_user import TrainingUser

router = APIRouter(prefix="/progress", tags=["training-progress"])


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
        headers={
            "Content-Disposition": "attachment; filename=training-analytics.csv",
        },
    )
