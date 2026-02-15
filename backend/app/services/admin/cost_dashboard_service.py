"""Cost Dashboard Service - Beanie ODM queries for admin cost endpoints."""

from datetime import datetime
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


async def get_overview() -> CostOverviewResponse:
    """Get latest monthly CostBreakdown as P&L summary."""
    doc = await CostBreakdown.find(
        {"period_type": "monthly"}
).sort("-period_start").first_or_none()

    if not doc:
        return CostOverviewResponse(
            period_start=datetime.utcnow(),
            period_end=datetime.utcnow(),
            revenue=Decimal("0"),
            total_costs=Decimal("0"),
            profit_loss=Decimal("0"),
            profit_margin=0.0,
            cost_per_minute=Decimal("0"),
            last_updated=datetime.utcnow(),
        )

    return CostOverviewResponse(
        period_start=doc.period_start,
        period_end=doc.period_end,
        revenue=doc.revenue.net_revenue,
        total_costs=doc.totals.platform_cost,
        profit_loss=doc.metrics.profit_loss,
        profit_margin=float(doc.metrics.profit_margin),
        cost_per_minute=doc.metrics.cost_per_minute,
        last_updated=doc.updated_at,
    )


async def get_timeline(params: CostQueryParams) -> list[TimelineDataPoint]:
    """Get daily CostBreakdown docs in range as time-series."""
    docs = await CostBreakdown.find(
        {"period_type": "daily"}, 
        CostBreakdown.period_start >= params.start_date, 
        CostBreakdown.period_end <= params.end_date, 
    ).sort("period_start").to_list()

    return [
        TimelineDataPoint(
            date=doc.period_start,
            revenue=doc.revenue.net_revenue,
            total_cost=doc.totals.platform_cost,
            profit_loss=doc.metrics.profit_loss,
            ai_cost=doc.ai_costs.total,
            infrastructure_cost=doc.infrastructure_costs.total,
        )
        for doc in docs
    ]


async def _fetch_daily_docs(params: CostQueryParams) -> list:
    """Shared helper to fetch daily CostBreakdown docs in range."""
    return await CostBreakdown.find(
        {"period_type": "daily"}, 
        CostBreakdown.period_start >= params.start_date, 
        CostBreakdown.period_end <= params.end_date, 
    ).to_list()


async def get_breakdown(params: CostQueryParams) -> CostBreakdownResponse:
    """Aggregate AI/infra/third-party costs for date range."""
    docs = await _fetch_daily_docs(params)

    ai = {"stt": Decimal("0"), "tts": Decimal("0"), "translation": Decimal("0"),
          "llm": Decimal("0"), "search": Decimal("0")}
    infra = {"gcp": Decimal("0"), "mongodb": Decimal("0"), "firebase": Decimal("0"),
             "sentry": Decimal("0"), "cdn": Decimal("0")}
    third = {"stripe": Decimal("0"), "elevenlabs": Decimal("0"), "tmdb": Decimal("0"),
             "twilio": Decimal("0"), "sendgrid": Decimal("0"), "other": Decimal("0")}
    perm_total, trans_total, plat_total = Decimal("0"), Decimal("0"), Decimal("0")

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
        plat_total += doc.totals.platform_cost

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
    docs = await _fetch_daily_docs(params)

    rev_sub = sum((d.revenue.subscription_revenue for d in docs), Decimal("0"))
    rev_one = sum((d.revenue.onetime_revenue for d in docs), Decimal("0"))
    refunds = sum((d.revenue.refunds for d in docs), Decimal("0"))
    ai_total = sum((d.ai_costs.total for d in docs), Decimal("0"))
    infra_total = sum((d.infrastructure_costs.total for d in docs), Decimal("0"))
    third_total = sum((d.thirdparty_costs.total for d in docs), Decimal("0"))

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
    docs = await _fetch_daily_docs(params)
    total_cost = sum((d.totals.platform_cost for d in docs), Decimal("0"))

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
    docs = await _fetch_daily_docs(params)

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
