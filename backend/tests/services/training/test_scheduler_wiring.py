"""Scheduler driver invokes the canonical staleness sweep."""

from unittest.mock import AsyncMock, patch

import pytest

from app.services.training.canonical_staleness import run_canonical_staleness_sweep


@pytest.mark.asyncio
async def test_sweep_callable_is_importable():
    # Presence test: ensures scheduler wiring can import it.
    assert callable(run_canonical_staleness_sweep)


@pytest.mark.asyncio
async def test_sweep_can_be_called_standalone():
    async def _empty():
        if False:
            yield
    with patch(
        "app.services.training.canonical_staleness._iter_active_canonicals",
        return_value=_empty(),
    ):
        result = await run_canonical_staleness_sweep()
    assert result == {"flipped": 0}
