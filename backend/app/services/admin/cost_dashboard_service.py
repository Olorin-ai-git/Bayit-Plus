"""Cost Dashboard Service - Beanie ODM queries for admin cost endpoints."""

from datetime import UTC, datetime
from decimal import Decimal

from app.core.logging_config import get_logger
from app.models.cost_breakdown import CostBreakdown
from app.models.live_feature_quota import LiveFeatureUsageSession
from app.api.routes.admin.cost_schemas import (
    BalanceSheetItem, CostBreakdownResponse, CostComparisonResponse,
    CostOverviewResponse, CostQueryParams, FinancialStatementResponse, TimelineDataPoint,
)
from app.services.admin.cost_user_service import get_top_spenders, get_user_breakdown  # noqa: F401

logger = get_logger(__name__)


def _sum_doc_costs(doc: CostBreakdown) -> Decimal:
    """Sum all cost leaf fields from a single CostBreakdown doc."""
    ai = doc.ai_costs
    inf = doc.infrastructure_costs
    tp = doc.thirdparty_costs
    return (
        ai.stt_cost + ai.tts_cost + ai.translation_cost
        + ai.llm_cost + ai.search_cost
        + inf.gcp_cost + inf.mongodb_cost + inf.firebase_cost
        + inf.sentry_cost + inf.cdn_cost
        + tp.stripe_fees + tp.elevenlabs_cost + tp.tmdb_cost
        + tp.twilio_cost + tp.sendgrid_cost + tp.other_api_cost
    )


def _sum_doc_ai(doc: CostBreakdown) -> Decimal:
    """Sum AI cost leaf fields."""
    ai = doc.ai_costs
    return (
        ai.stt_cost + ai.tts_cost + ai.translation_cost
        + ai.llm_cost + ai.search_cost
    )


def _sum_doc_infra(doc: CostBreakdown) -> Decimal:
    """Sum infrastructure cost leaf fields."""
    inf = doc.infrastructure_costs
    return (
        inf.gcp_cost + inf.mongodb_cost + inf.firebase_cost
        + inf.sentry_cost + inf.cdn_cost
    )


async def get_overview() -> CostOverviewResponse:
    """Get P&L summary by aggregating current-month hourly docs."""
    now = datetime.now(UTC)
    month_start = now.replace(
        day=1, hour=0, minute=0, second=0, microsecond=0,
    )

    hourly_docs = await CostBreakdown.find(
        CostBreakdown.period_type == "hourly",
        CostBreakdown.period_start >= month_start,
    ).to_list()

    logger.info(
        "Overview query",
        extra={"month_start": str(month_start), "doc_count": len(hourly_docs)},
    )

    if not hourly_docs:
        return CostOverviewResponse(
            period_start=month_start,
            period_end=now,
            revenue=Decimal("0"),
            total_costs=Decimal("0"),
            profit_loss=Decimal("0"),
            profit_margin=0.0,
            cost_per_minute=Decimal("0"),
            last_updated=now,
        )

    total_rev = sum(
        (d.revenue.net_revenue for d in hourly_docs), Decimal("0")
    )
    total_cost = sum(
        (_sum_doc_costs(d) for d in hourly_docs), Decimal("0")
    )
    pl = total_rev - total_cost
    margin = float(pl / total_rev * 100) if total_rev else 0.0
    latest = max(hourly_docs, key=lambda d: d.period_end)

    logger.info(
        "Overview result",
        extra={
            "revenue": str(total_rev),
            "total_cost": str(total_cost),
            "doc_count": len(hourly_docs),
        },
    )

    return CostOverviewResponse(
        period_start=month_start,
        period_end=now,
        revenue=total_rev,
        total_costs=total_cost,
        profit_loss=pl,
        profit_margin=margin,
        cost_per_minute=Decimal("0"),
        last_updated=latest.updated_at,
    )


async def get_timeline(params: CostQueryParams) -> list[TimelineDataPoint]:
    """Get cost time-series from hourly docs aggregated to daily."""
    docs = await CostBreakdown.find(
        CostBreakdown.period_type == "hourly",
        CostBreakdown.period_start >= params.start_date,
        CostBreakdown.period_end <= params.end_date,
    ).sort("period_start").to_list()

    return _aggregate_hourly_to_daily(docs)


def _aggregate_hourly_to_daily(
    docs: list[CostBreakdown],
) -> list[TimelineDataPoint]:
    """Group hourly CostBreakdown docs into daily timeline points."""
    daily: dict[datetime, list] = {}
    for doc in docs:
        day_key = doc.period_start.replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        daily.setdefault(day_key, []).append(doc)

    points = []
    for day in sorted(daily):
        group = daily[day]
        ai = sum((_sum_doc_ai(d) for d in group), Decimal("0"))
        infra = sum((_sum_doc_infra(d) for d in group), Decimal("0"))
        total = sum((_sum_doc_costs(d) for d in group), Decimal("0"))
        rev = sum((d.revenue.net_revenue for d in group), Decimal("0"))
        points.append(
            TimelineDataPoint(
                date=day,
                revenue=rev,
                total_cost=total,
                profit_loss=rev - total,
                ai_cost=ai,
                infrastructure_cost=infra,
            )
        )
    return points


async def _fetch_hourly_docs(params: CostQueryParams) -> list:
    """Fetch hourly docs in date range."""
    return await CostBreakdown.find(
        CostBreakdown.period_type == "hourly",
        CostBreakdown.period_start >= params.start_date,
        CostBreakdown.period_end <= params.end_date,
    ).to_list()


async def get_breakdown(params: CostQueryParams) -> CostBreakdownResponse:
    """Aggregate AI/infra/third-party costs for date range."""
    docs = await _fetch_hourly_docs(params)

    ai = {"stt": Decimal("0"), "tts": Decimal("0"), "translation": Decimal("0"),
          "llm": Decimal("0"), "search": Decimal("0")}
    infra = {"gcp": Decimal("0"), "mongodb": Decimal("0"), "firebase": Decimal("0"),
             "sentry": Decimal("0"), "cdn": Decimal("0")}
    third = {"stripe": Decimal("0"), "elevenlabs": Decimal("0"), "tmdb": Decimal("0"),
             "twilio": Decimal("0"), "sendgrid": Decimal("0"), "other": Decimal("0")}
    perm_total, trans_total = Decimal("0"), Decimal("0")

    for doc in docs:
        ai["stt"] += doc.ai_costs.stt_cost
        ai["tts"] += doc.ai_costs.tts_cost
        ai["translation"] += doc.ai_costs.translation_cost
        ai["llm"] += doc.ai_costs.llm_cost
        ai["search"] += doc.ai_costs.search_cost
        infra["gcp"] += doc.infrastructure_costs.gcp_cost
        infra["mongodb"] += doc.infrastructure_costs.mongodb_cost
        infra["firebase"] += doc.infrastructure_costs.firebase_cost
        infra["sentry"] += doc.infrastructure_costs.sentry_cost
        infra["cdn"] += doc.infrastructure_costs.cdn_cost
        third["stripe"] += doc.thirdparty_costs.stripe_fees
        third["elevenlabs"] += doc.thirdparty_costs.elevenlabs_cost
        third["tmdb"] += doc.thirdparty_costs.tmdb_cost
        third["twilio"] += doc.thirdparty_costs.twilio_cost
        third["sendgrid"] += doc.thirdparty_costs.sendgrid_cost
        third["other"] += doc.thirdparty_costs.other_api_cost
        perm_total += doc.totals.permanent_cost
        trans_total += doc.totals.transient_cost

    plat_total = sum((_sum_doc_costs(d) for d in docs), Decimal("0"))

    return CostBreakdownResponse(
        ai_costs={k: str(v) for k, v in ai.items()},
        infrastructure_costs={k: str(v) for k, v in infra.items()},
        thirdparty_costs={k: str(v) for k, v in third.items()},
        total_permanent=perm_total,
        total_transient=trans_total,
        total_platform=plat_total,
    )


async def get_balance_sheet(params: CostQueryParams) -> FinancialStatementResponse:
    """Build P&L statement from revenue + costs."""
    docs = await _fetch_hourly_docs(params)

    rev_sub = sum((d.revenue.subscription_revenue for d in docs), Decimal("0"))
    rev_one = sum((d.revenue.onetime_revenue for d in docs), Decimal("0"))
    refunds = sum((d.revenue.refunds for d in docs), Decimal("0"))
    ai_total = sum((_sum_doc_ai(d) for d in docs), Decimal("0"))
    infra_total = sum((_sum_doc_infra(d) for d in docs), Decimal("0"))
    third_total = sum(
        (
            d.thirdparty_costs.stripe_fees + d.thirdparty_costs.elevenlabs_cost
            + d.thirdparty_costs.tmdb_cost + d.thirdparty_costs.twilio_cost
            + d.thirdparty_costs.sendgrid_cost + d.thirdparty_costs.other_api_cost
            for d in docs
        ),
        Decimal("0"),
    )

    net_rev = rev_sub + rev_one - refunds
    total_costs = ai_total + infra_total + third_total
    net_pl = net_rev - total_costs
    margin = float(net_pl / net_rev * 100) if net_rev else 0.0

    items = [
        BalanceSheetItem(label="Subscription Revenue", amount=rev_sub, category="revenue"),
        BalanceSheetItem(label="One-Time Revenue", amount=rev_one, category="revenue"),
        BalanceSheetItem(label="Refunds", amount=-refunds, category="revenue"),
        BalanceSheetItem(label="AI Services", amount=-ai_total, category="ai_costs"),
        BalanceSheetItem(label="Infrastructure", amount=-infra_total, category="infrastructure"),
        BalanceSheetItem(label="Third Party", amount=-third_total, category="third_party"),
        BalanceSheetItem(label="Net Profit/Loss", amount=net_pl, category="total"),
    ]

    return FinancialStatementResponse(
        period="custom", items=items, net_profit_loss=net_pl, profit_margin=margin,
    )


async def get_cost_per_minute(params: CostQueryParams) -> dict:
    """Calculate total cost / total minutes from LiveFeatureUsageSession."""
    docs = await _fetch_hourly_docs(params)
    total_cost = sum((_sum_doc_costs(d) for d in docs), Decimal("0"))

    sessions = await LiveFeatureUsageSession.find(
        LiveFeatureUsageSession.started_at >= params.start_date,
        LiveFeatureUsageSession.started_at <= params.end_date,
    ).to_list()

    total_minutes = sum(s.duration_seconds / 60.0 for s in sessions)
    cpm = total_cost / Decimal(str(max(total_minutes, 0.01)))

    return {
        "period": "custom",
        "cost_per_minute": cpm,
        "total_cost": total_cost,
        "total_minutes": round(total_minutes, 2),
    }


async def get_comparison(params: CostQueryParams) -> CostComparisonResponse:
    """Permanent vs transient costs from CostBreakdown.totals."""
    docs = await _fetch_hourly_docs(params)

    perm = sum((d.totals.permanent_cost for d in docs), Decimal("0"))
    trans = sum((d.totals.transient_cost for d in docs), Decimal("0"))
    total = perm + trans

    return CostComparisonResponse(
        permanent_costs=perm,
        transient_costs=trans,
        total_costs=total,
        permanent_percentage=float(perm / total * 100) if total else 0.0,
        transient_percentage=float(trans / total * 100) if total else 0.0,
    )
