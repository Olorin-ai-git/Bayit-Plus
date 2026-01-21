"""
Demo Scenarios for Marketing Portal

Pre-built fraud scenarios for the marketing portal's interactive demo.
These scenarios showcase Olorin's AI agent capabilities to enterprise prospects.
"""

import os
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class DemoScenarioType(str, Enum):
    """Types of demo scenarios available for marketing portal."""

    DEVICE_SPOOFING = "device_spoofing"
    IMPOSSIBLE_TRAVEL = "impossible_travel"
    ACCOUNT_TAKEOVER = "account_takeover"
    PAYMENT_FRAUD = "payment_fraud"


@dataclass
class DemoScenario:
    """Marketing demo scenario definition."""

    id: str
    type: DemoScenarioType
    title: str
    description: str
    risk_level: str
    entity_type: str
    entity_id: str
    showcase_agents: List[str]
    expected_findings: Dict[str, Any]
    display_data: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API response."""
        return {
            "id": self.id,
            "type": self.type.value,
            "title": self.title,
            "description": self.description,
            "risk_level": self.risk_level,
            "entity_type": self.entity_type,
            "entity_id": self.entity_id,
            "showcase_agents": self.showcase_agents,
            "display_data": self.display_data,
        }


# Pre-defined demo scenarios for marketing portal
DEMO_SCENARIOS: Dict[str, DemoScenario] = {
    "demo_device_spoofing": DemoScenario(
        id="demo_device_spoofing",
        type=DemoScenarioType.DEVICE_SPOOFING,
        title="Device Spoofing Detection",
        description="Multiple device fingerprints and browser inconsistencies detected",
        risk_level="HIGH",
        entity_type="user_id",
        entity_id="DEMO_USER_DS001",
        showcase_agents=["Device Agent", "Network Agent"],
        expected_findings={
            "device_agent": {"risk_level": "HIGH", "confidence": 0.92},
            "network_agent": {"risk_level": "MEDIUM", "confidence": 0.85},
        },
        display_data={
            "device_changes": 5,
            "browser_inconsistencies": 3,
            "fingerprint_anomalies": 7,
            "time_window": "24 hours",
        },
    ),
    "demo_impossible_travel": DemoScenario(
        id="demo_impossible_travel",
        type=DemoScenarioType.IMPOSSIBLE_TRAVEL,
        title="Impossible Travel Detection",
        description="Geographic anomalies with rapid location changes across continents",
        risk_level="CRITICAL",
        entity_type="user_id",
        entity_id="DEMO_USER_IT001",
        showcase_agents=["Location Agent", "Device Agent", "Network Agent"],
        expected_findings={
            "location_agent": {"risk_level": "CRITICAL", "confidence": 0.98},
            "device_agent": {"risk_level": "HIGH", "confidence": 0.88},
            "network_agent": {"risk_level": "HIGH", "confidence": 0.91},
        },
        display_data={
            "locations": ["New York, USA", "Tokyo, Japan", "London, UK"],
            "travel_speed": "15,000 km/h (impossible)",
            "time_between_logins": "2 hours",
            "countries_count": 3,
        },
    ),
    "demo_account_takeover": DemoScenario(
        id="demo_account_takeover",
        type=DemoScenarioType.ACCOUNT_TAKEOVER,
        title="Account Takeover Detection",
        description="Login pattern anomalies and authentication failures detected",
        risk_level="HIGH",
        entity_type="email",
        entity_id="demo.user@example.com",
        showcase_agents=["Logs Agent", "Authentication Agent", "Device Agent"],
        expected_findings={
            "logs_agent": {"risk_level": "HIGH", "confidence": 0.94},
            "authentication_agent": {"risk_level": "HIGH", "confidence": 0.91},
            "device_agent": {"risk_level": "MEDIUM", "confidence": 0.79},
        },
        display_data={
            "failed_logins": 12,
            "password_resets": 3,
            "new_device_login": True,
            "mfa_bypassed": True,
            "time_window": "6 hours",
        },
    ),
    "demo_payment_fraud": DemoScenario(
        id="demo_payment_fraud",
        type=DemoScenarioType.PAYMENT_FRAUD,
        title="Payment Fraud Detection",
        description="Multi-entity transaction analysis reveals suspicious patterns",
        risk_level="MEDIUM-HIGH",
        entity_type="transaction_id",
        entity_id="DEMO_TXN_PF001",
        showcase_agents=[
            "Device Agent",
            "Location Agent",
            "Network Agent",
            "Logs Agent",
        ],
        expected_findings={
            "device_agent": {"risk_level": "MEDIUM", "confidence": 0.82},
            "location_agent": {"risk_level": "HIGH", "confidence": 0.87},
            "network_agent": {"risk_level": "MEDIUM", "confidence": 0.78},
            "logs_agent": {"risk_level": "MEDIUM", "confidence": 0.81},
        },
        display_data={
            "transaction_amount": "$2,499.00",
            "velocity_score": "HIGH",
            "merchant_risk": "MEDIUM",
            "card_not_present": True,
            "first_time_merchant": True,
        },
    ),
}


def get_demo_scenarios() -> List[Dict[str, Any]]:
    """Get all available demo scenarios for marketing portal."""
    return [scenario.to_dict() for scenario in DEMO_SCENARIOS.values()]


def get_demo_scenario(scenario_id: str) -> Optional[DemoScenario]:
    """Get specific demo scenario by ID."""
    return DEMO_SCENARIOS.get(scenario_id)


def get_scenario_for_investigation(scenario_id: str) -> Optional[Dict[str, Any]]:
    """Get scenario data formatted for investigation system."""
    scenario = get_demo_scenario(scenario_id)
    if not scenario:
        return None

    return {
        "entity_id": scenario.entity_id,
        "entity_type": scenario.entity_type,
        "scenario": scenario.type.value,
        "enable_verbose_logging": True,
        "enable_journey_tracking": True,
        "enable_chain_of_thought": True,
        "metadata": {
            "source": "marketing_demo",
            "scenario_id": scenario.id,
            "scenario_title": scenario.title,
        },
    }
