"""Base cost provider interface."""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal
from typing import Any


@dataclass
class CostData:
    """Cost data for a specific service."""

    service_name: str
    amount: Decimal
    currency: str = "USD"
    start_date: date = None
    end_date: date = None
    breakdown: dict[str, Decimal] | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


class CostProvider(ABC):
    """Abstract base class for cost data providers."""

    @abstractmethod
    async def get_costs(self, start_date: date, end_date: date) -> CostData:
        """
        Fetch cost data for a given period.

        Args:
            start_date: Start date (inclusive)
            end_date: End date (inclusive)

        Returns:
            CostData with amount and metadata

        Raises:
            ProviderError: If API call fails
        """

    @abstractmethod
    async def health_check(self) -> bool:
        """Check if provider is healthy and credentials are valid."""
