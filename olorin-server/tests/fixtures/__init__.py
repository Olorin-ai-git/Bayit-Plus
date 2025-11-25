"""Test fixtures for Olorin structured investigation system."""

from .real_investigation_scenarios import (
    RealInvestigationScenario,
    RealScenarioGenerator,
    get_scenario_by_type,
    get_test_scenarios,
)

__all__ = [
    "RealInvestigationScenario",
    "RealScenarioGenerator",
    "get_test_scenarios",
    "get_scenario_by_type",
]

__version__ = "1.0.0"
