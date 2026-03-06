"""Tests for /admin/costs/services endpoint."""

from datetime import UTC, datetime
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.api.routes.admin.cost_services import (
    _calc_trend,
    _classify_service,
    _sum_service_costs,
)
from app.api.routes.admin.cost_service_schemas import (
    CostCategoryEnum,
    DataSourceEnum,
    PlatformEnum,
    ServiceCostResponse,
    ServicesCostListResponse,
)


class TestCalcTrend:
    """Test trend calculation."""

    def test_positive_trend(self):
        assert _calc_trend(Decimal("200"), Decimal("100")) == 100.0

    def test_negative_trend(self):
        assert _calc_trend(Decimal("50"), Decimal("100")) == -50.0

    def test_zero_previous(self):
        assert _calc_trend(Decimal("100"), Decimal("0")) == 100.0

    def test_both_zero(self):
        assert _calc_trend(Decimal("0"), Decimal("0")) == 0.0

    def test_no_change(self):
        assert _calc_trend(Decimal("100"), Decimal("100")) == 0.0


class TestClassifyService:
    """Test service classification."""

    def test_gcp_is_infrastructure(self):
        cat, plat, src = _classify_service("GCP")
        assert cat == CostCategoryEnum.INFRASTRUCTURE
        assert plat == PlatformEnum.SHARED
        assert src == DataSourceEnum.API

    def test_openai_is_ai(self):
        cat, plat, src = _classify_service("OpenAI/LLM")
        assert cat == CostCategoryEnum.AI
        assert plat == PlatformEnum.SHARED
        assert src == DataSourceEnum.API

    def test_elevenlabs_is_bayit(self):
        cat, plat, src = _classify_service("ElevenLabs/TTS")
        assert cat == CostCategoryEnum.AI
        assert plat == PlatformEnum.BAYIT_PLUS
        assert src == DataSourceEnum.API

    def test_unknown_is_fixed(self):
        cat, plat, src = _classify_service("UnknownService")
        assert cat == CostCategoryEnum.FIXED
        assert plat == PlatformEnum.SHARED
        assert src == DataSourceEnum.CONFIG


class TestSumServiceCosts:
    """Test service cost summation."""

    def test_empty_docs(self):
        result = _sum_service_costs([])
        assert result == {}

    def test_single_doc_sums_correctly(self):
        doc = MagicMock()
        doc.ai_costs = MagicMock(
            llm_cost=Decimal("10"),
            tts_cost=Decimal("5"),
        )
        doc.infrastructure_costs = MagicMock(
            gcp_cost=Decimal("100"),
            mongodb_cost=Decimal("50"),
            firebase_cost=Decimal("25"),
        )
        doc.thirdparty_costs = MagicMock(
            stripe_fees=Decimal("8"),
            twilio_cost=Decimal("3"),
        )
        result = _sum_service_costs([doc])
        assert result["OpenAI/LLM"] == Decimal("10")
        assert result["GCP"] == Decimal("100")
        assert result["Stripe Fees"] == Decimal("8")


class TestServicesCostListResponse:
    """Test response schema validation."""

    def test_valid_response(self):
        now = datetime.now(UTC)
        month_start = now.replace(day=1, hour=0, minute=0, second=0)
        prev_start = datetime(now.year, now.month - 1 if now.month > 1 else 12, 1, tzinfo=UTC)
        response = ServicesCostListResponse(
            services=[
                ServiceCostResponse(
                    service_name="GCP",
                    category=CostCategoryEnum.INFRASTRUCTURE,
                    current_month_cost=Decimal("100"),
                    previous_month_cost=Decimal("90"),
                    trend_pct=11.1,
                    pct_of_total=50.0,
                    platform=PlatformEnum.SHARED,
                    data_source=DataSourceEnum.API,
                )
            ],
            total_current_month=Decimal("200"),
            total_previous_month=Decimal("180"),
            service_count=1,
            current_period_start=month_start,
            current_period_end=now,
            previous_period_start=prev_start,
            previous_period_end=month_start,
        )
        assert response.service_count == 1
        assert response.services[0].service_name == "GCP"
        assert response.current_period_start == month_start
        assert response.current_period_end == now
