"""Tests for /admin/costs/platforms endpoint."""

from decimal import Decimal
from unittest.mock import MagicMock

import pytest

from app.api.routes.admin.cost_platforms import (
    _calc_trend,
    _group_by_platform,
)
from app.api.routes.admin.cost_service_schemas import (
    PlatformCostResponse,
    PlatformEnum,
    PlatformsCostListResponse,
    PlatformTopService,
)


class TestGroupByPlatform:
    """Test platform grouping logic."""

    def test_empty_docs(self):
        result = _group_by_platform([])
        assert result == {}

    def test_groups_infra_to_shared(self):
        doc = MagicMock()
        doc.infrastructure_costs = MagicMock(
            gcp_cost=Decimal("100"),
            mongodb_cost=Decimal("50"),
        )
        doc.ai_costs = MagicMock(
            tts_cost=Decimal("20"),
            llm_cost=Decimal("15"),
        )
        result = _group_by_platform([doc])
        assert PlatformEnum.SHARED in result
        shared = result[PlatformEnum.SHARED]
        assert shared["GCP"] == Decimal("100")
        assert shared["OpenAI"] == Decimal("15")

    def test_elevenlabs_grouped_to_bayit(self):
        doc = MagicMock()
        doc.infrastructure_costs = None
        doc.ai_costs = MagicMock(
            tts_cost=Decimal("30"),
            llm_cost=Decimal("0"),
        )
        result = _group_by_platform([doc])
        assert PlatformEnum.BAYIT_PLUS in result
        bp = result[PlatformEnum.BAYIT_PLUS]
        assert bp["ElevenLabs"] == Decimal("30")


class TestCalcTrend:
    """Test trend percentage calculation."""

    def test_increase(self):
        assert _calc_trend(Decimal("150"), Decimal("100")) == 50.0

    def test_decrease(self):
        assert _calc_trend(Decimal("75"), Decimal("100")) == -25.0

    def test_zero_previous_with_current(self):
        assert _calc_trend(Decimal("50"), Decimal("0")) == 100.0


class TestPlatformsCostListResponse:
    """Test response schema."""

    def test_valid_response(self):
        response = PlatformsCostListResponse(
            platforms=[
                PlatformCostResponse(
                    platform=PlatformEnum.SHARED,
                    total_cost=Decimal("500"),
                    service_count=3,
                    top_services=[
                        PlatformTopService(
                            service_name="GCP",
                            cost=Decimal("300"),
                        )
                    ],
                    trend_pct=5.5,
                )
            ],
            total_cost=Decimal("500"),
        )
        assert len(response.platforms) == 1
        assert response.total_cost == Decimal("500")
