"""
Flow Progression Router

Read-only endpoint for daily/monthly flow progression derived from investigation state.
"""

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.persistence.database import get_db
from app.schemas.flow_progression import FlowProgressionResponse
from app.security.auth import User, require_read_or_dev
from app.service.flow_progression_service import FlowProgressionQuery, get_flow_progression


router = APIRouter(
    prefix="/api/v1/investigation-state",
    tags=["Investigation State"],
)


@router.get(
    "/flow-progression",
    response_model=FlowProgressionResponse,
    summary="Get daily and monthly flow progression",
    description="Return daily and month-to-date flow progression derived from real investigation state rows.",
)
async def get_flow_progression_endpoint(
    day: date = Query(..., description="UTC day to summarize (YYYY-MM-DD)"),
    year: int = Query(..., ge=1970, le=2100, description="UTC year for month-to-date"),
    month: int = Query(..., ge=1, le=12, description="UTC month for month-to-date (1-12)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_read_or_dev),
) -> FlowProgressionResponse:
    _ = current_user  # explicit dependency: authorization enforced
    # region agent log
    import json, time
    with open('/Users/olorin/Documents/olorin/.cursor/debug.log','a') as f:f.write(json.dumps({'location':'flow_progression_router.py:39','message':'Endpoint called','data':{'day':str(day),'year':year,'month':month,'user':current_user.user_id if hasattr(current_user,'user_id') else 'unknown'},'timestamp':int(time.time()*1000),'sessionId':'debug-session','hypothesisId':'H2'})+'\n')
    # endregion
    result = get_flow_progression(
        db,
        FlowProgressionQuery(day=day, month_year=year, month_num=month),
    )
    # region agent log
    with open('/Users/olorin/Documents/olorin/.cursor/debug.log','a') as f:f.write(json.dumps({'location':'flow_progression_router.py:45','message':'Endpoint returning','data':{'hasDaily':result.daily is not None,'hasMonthly':result.monthly is not None,'dailyTotal':result.daily.total if result.daily else None,'monthlyTotal':result.monthly.total if result.monthly else None},'timestamp':int(time.time()*1000),'sessionId':'debug-session','hypothesisId':'H2'})+'\n')
    # endregion
    return result


