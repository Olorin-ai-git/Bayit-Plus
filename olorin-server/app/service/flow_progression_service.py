"""
Flow Progression Service

Derives daily/month-to-date flow progression from investigation state rows.
"""

from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from app.models.investigation_state import InvestigationState
from app.schemas.flow_progression import (
    DailyFlowProgression,
    FlowProgressionResponse,
    MonthlyDayProgression,
    MonthlyFlowProgression,
    StatusCounts,
)


@dataclass(frozen=True)
class FlowProgressionQuery:
    day: date
    month_year: int
    month_num: int


def _utc_day_bounds(d: date) -> Tuple[datetime, datetime]:
    start_utc = datetime(d.year, d.month, d.day, tzinfo=timezone.utc)
    end_utc = start_utc + timedelta(days=1)
    # DB columns for created_at are timezone-naive in this schema; compare using naive UTC boundaries.
    return start_utc.replace(tzinfo=None), end_utc.replace(tzinfo=None)


def _utc_month_bounds(year: int, month: int) -> Tuple[datetime, datetime]:
    start_utc = datetime(year, month, 1, tzinfo=timezone.utc)
    if month == 12:
        end_utc = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        end_utc = datetime(year, month + 1, 1, tzinfo=timezone.utc)
    # DB columns for created_at are timezone-naive in this schema; compare using naive UTC boundaries.
    return start_utc.replace(tzinfo=None), end_utc.replace(tzinfo=None)


def _status_counts(statuses: List[str]) -> StatusCounts:
    return StatusCounts(by_status=dict(Counter(statuses)))


def get_flow_progression(db: Session, query: FlowProgressionQuery) -> FlowProgressionResponse:
    as_of = datetime.now(tz=timezone.utc)

    daily = _get_daily(db, query.day)
    monthly = _get_monthly(db, query.month_year, query.month_num)

    return FlowProgressionResponse(as_of=as_of, daily=daily, monthly=monthly)


def _get_daily(db: Session, d: date) -> Optional[DailyFlowProgression]:
    start, end = _utc_day_bounds(d)
    # region agent log
    import json, time
    with open('/Users/olorin/Documents/olorin/.cursor/debug.log','a') as f:f.write(json.dumps({'location':'flow_progression_service.py:64','message':'Querying daily flow','data':{'date':str(d),'start':str(start),'end':str(end)},'timestamp':int(time.time()*1000),'sessionId':'debug-session','hypothesisId':'H3'})+'\n')
    # endregion
    rows = (
        db.query(InvestigationState.status)
        .filter(InvestigationState.created_at >= start)
        .filter(InvestigationState.created_at < end)
        .all()
    )
    # region agent log
    with open('/Users/olorin/Documents/olorin/.cursor/debug.log','a') as f:f.write(json.dumps({'location':'flow_progression_service.py:73','message':'Daily query result','data':{'rowCount':len(rows),'hasData':len(rows)>0},'timestamp':int(time.time()*1000),'sessionId':'debug-session','hypothesisId':'H3'})+'\n')
    # endregion
    if not rows:
        return None

    statuses = [r[0] for r in rows if r and r[0]]
    return DailyFlowProgression(
        date=d.isoformat(),
        total=len(rows),
        status_counts=_status_counts(statuses),
    )


def _get_monthly(db: Session, year: int, month: int) -> Optional[MonthlyFlowProgression]:
    start, end = _utc_month_bounds(year, month)
    rows = (
        db.query(InvestigationState.status, InvestigationState.created_at)
        .filter(InvestigationState.created_at >= start)
        .filter(InvestigationState.created_at < end)
        .all()
    )
    if not rows:
        return None

    statuses_all: List[str] = []
    by_day_statuses: Dict[str, List[str]] = defaultdict(list)

    for status_val, created_at in rows:
        if status_val:
            statuses_all.append(status_val)
        if created_at:
            day_key = created_at.date().isoformat()
            if status_val:
                by_day_statuses[day_key].append(status_val)

    by_day: List[MonthlyDayProgression] = []
    for day_key in sorted(by_day_statuses.keys()):
        day_statuses = by_day_statuses[day_key]
        by_day.append(
            MonthlyDayProgression(
                date=day_key,
                total=len(day_statuses),
                status_counts=_status_counts(day_statuses),
            )
        )

    return MonthlyFlowProgression(
        year=year,
        month=month,
        total=len(rows),
        status_counts=_status_counts(statuses_all),
        by_day=by_day,
    )


