"""Test fixtures for Olorin autonomous investigation system."""

from .real_investigation_scenarios import (
    RealInvestigationScenario,
    RealScenarioGenerator,
    get_test_scenarios,
    get_scenario_by_type,
)

__all__ = [
    "RealInvestigationScenario",
    "RealScenarioGenerator",
    "get_test_scenarios",
    "get_scenario_by_type",
]

__version__ = "1.0.0"