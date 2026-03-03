"""Tests for fixed costs provider."""

from datetime import date
from decimal import Decimal
from unittest.mock import patch

import pytest

from app.core.fixed_costs_config import (
    BillingCycle,
    CostCategory,
    FixedCostEntry,
    FixedCostsConfig,
    Platform,
)
from app.services.olorin.cost.providers.fixed_costs import (
    FixedCostsProvider,
)


class TestFixedCostsConfig:
    """Test fixed costs configuration."""

    def test_default_entries_exist(self):
        config = FixedCostsConfig()
        assert len(config.entries) > 0

    def test_claude_code_entry(self):
        config = FixedCostsConfig()
        claude = [e for e in config.entries if "Claude" in e.service_name]
        assert len(claude) == 1
        assert claude[0].monthly_cost == Decimal("200")
        assert claude[0].category == CostCategory.AI

    def test_yearly_prorates_to_monthly(self):
        config = FixedCostsConfig()
        apple = [e for e in config.entries if "Apple" in e.service_name]
        assert len(apple) == 1
        assert apple[0].billing_cycle == BillingCycle.YEARLY
        assert apple[0].monthly_cost < Decimal("10")


class TestFixedCostsProvider:
    """Test fixed costs provider."""

    @pytest.mark.asyncio
    async def test_prorates_for_period(self):
        provider = FixedCostsProvider()
        result = await provider.get_costs(date(2026, 3, 1), date(2026, 3, 31))
        assert result.amount > Decimal("0")
        assert result.breakdown is not None
        assert len(result.breakdown) > 0

    @pytest.mark.asyncio
    async def test_single_day_is_fraction(self):
        provider = FixedCostsProvider()
        one_day = await provider.get_costs(date(2026, 3, 1), date(2026, 3, 2))
        full_month = await provider.get_costs(date(2026, 3, 1), date(2026, 3, 31))
        assert one_day.amount < full_month.amount

    @pytest.mark.asyncio
    async def test_health_always_true(self):
        provider = FixedCostsProvider()
        assert await provider.health_check() is True

    @pytest.mark.asyncio
    async def test_breakdown_keys_match_entries(self):
        provider = FixedCostsProvider()
        result = await provider.get_costs(date(2026, 3, 1), date(2026, 3, 2))
        config = FixedCostsConfig()
        for entry in config.entries:
            assert entry.service_name in result.breakdown
