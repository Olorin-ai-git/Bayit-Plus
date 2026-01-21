"""
E2E Test: Comprehensive Investigation Instrumentation

Demonstrates the complete instrumentation framework capturing:
- All LLM interactions with reasoning and decision-making
- All tool executions with raw data retrieved
- All agent decisions with confidence scores
- All risk calculations with factors and intermediate scores
- Complete investigation flow with JSON and text logs
"""

import json
import os
from pathlib import Path

import pytest

from app.service.logging.investigation_data_models import RiskFactor
from app.service.logging.investigation_instrumentation import (
    InvestigationInstrumentationLogger,
)


@pytest.fixture
def investigation_id():
    """Provide a unique investigation ID for testing."""
    return "test-instrumentation-demo-001"


@pytest.fixture
def logger(investigation_id):
    """Create an instrumentation logger for testing."""
    output_dir = os.getenv("INVESTIGATION_LOG_DIR", "./investigation_logs")
    return InvestigationInstrumentationLogger(investigation_id, output_dir)


def test_complete_instrumentation_flow(logger):
    """
    Demonstrate complete instrumentation capturing all interactions.

    This test simulates a full investigation cycle with:
    1. Agent initialization
    2. LLM interactions with reasoning
    3. Tool executions with raw data
    4. Risk calculations with factors
    5. Final results and recommendations
    """

    investigation_id = logger.investigation_id

    logger.log_event(
        event_type="investigation_start",
        agent_name="system",
        description="Starting comprehensive instrumentation demo",
        details={"investigation_id": investigation_id},
    )

    logger.log_llm_interaction(
        agent_name="device-risk-analyzer",
        llm_model="gpt-4",
        prompt="Analyze device signals for risk indicators...",
        response="Based on the device signals, I identify several risk patterns: "
        "1. Multiple countries, 2. Unusual device fingerprints, 3. Velocity anomalies",
        reasoning="Cross-country access within short timeframe indicates potential "
        "account takeover. Device fingerprint changes suggest credential compromise.",
        tokens_used=450,
        latency_ms=1250.5,
        temperature=0.7,
        max_tokens=2048,
        stop_reason="end_turn",
    )

    logger.log_tool_execution(
        agent_name="device-risk-analyzer",
        tool_name="splunk_query_device_signals",
        tool_input={"user_id": "user123", "time_range": "30d"},
        tool_output={"status": "success", "records_returned": 145},
        raw_output="Retrieved 145 device signal records including location, "
        "device ID, and session information",
        execution_time_ms=850.25,
        status="success",
        data_retrieved=145,
    )

    risk_factors = [
        RiskFactor(
            name="geographic_diversity",
            value=0.8,
            weight=0.3,
            reasoning="Multiple countries detected: US, UK, CN within 2 hours",
            evidence=[
                "IP_1.2.3.4 from US at 10:00 UTC",
                "IP_5.6.7.8 from UK at 10:15 UTC",
                "IP_9.10.11.12 from CN at 12:05 UTC",
            ],
        ),
        RiskFactor(
            name="device_proliferation",
            value=0.7,
            weight=0.25,
            reasoning="5 unique device fingerprints in 24-hour window",
            evidence=[
                "DeviceID_A created 2024-11-04 10:00",
                "DeviceID_B created 2024-11-04 10:15",
                "DeviceID_C created 2024-11-04 12:05",
            ],
        ),
        RiskFactor(
            name="velocity_anomaly",
            value=0.6,
            weight=0.2,
            reasoning="Travel time physically impossible between sessions",
            evidence=["6000km in 15 minutes (US to UK)"],
        ),
        RiskFactor(
            name="session_pattern_deviation",
            value=0.5,
            weight=0.15,
            reasoning="Activity pattern deviates from historical baseline",
            evidence=[
                "Peak usage normally 9-17 UTC, now 10-13 UTC",
                "Normal usage from 2-3 devices, now 5 devices",
            ],
        ),
        RiskFactor(
            name="authentication_anomaly",
            value=0.4,
            weight=0.1,
            reasoning="Multiple failed login attempts before success",
            evidence=["3 failed attempts before successful authentication"],
        ),
    ]

    logger.log_risk_calculation(
        agent_name="device-risk-analyzer",
        entity_id="user123",
        entity_type="user_id",
        risk_factors={
            factor.name: {
                "value": factor.value,
                "weight": factor.weight,
                "weighted_score": factor.weighted_score(),
                "reasoning": factor.reasoning,
                "evidence_count": len(factor.evidence),
            }
            for factor in risk_factors
        },
        calculation_method="weighted_average",
        intermediate_scores={
            "geographic_diversity": {"value": 0.8, "weight": 0.3, "weighted": 0.24},
            "device_proliferation": {"value": 0.7, "weight": 0.25, "weighted": 0.175},
            "velocity_anomaly": {"value": 0.6, "weight": 0.2, "weighted": 0.12},
            "session_pattern_deviation": {
                "value": 0.5,
                "weight": 0.15,
                "weighted": 0.075,
            },
            "authentication_anomaly": {"value": 0.4, "weight": 0.1, "weighted": 0.04},
            "_aggregation": {
                "total_weighted": 0.65,
                "total_weight": 1.0,
                "average_weighted": 0.65,
                "calculation_method": "weighted_average",
                "number_of_factors": 5,
            },
        },
        final_score=0.65,
        reasoning="Weighted aggregation of all risk factors indicates "
        "elevated fraud risk due to device proliferation and geographic anomalies",
        confidence=0.85,
    )

    logger.log_agent_decision(
        agent_name="device-risk-analyzer",
        decision_type="risk_threshold",
        options_considered=[
            "escalate (risk >= 0.7)",
            "investigate (risk >= 0.56)",
            "monitor (risk >= 0.35)",
            "clear (risk < 0.35)",
        ],
        selected_option="investigate (risk >= 0.56)",
        reasoning="Risk score of 0.65 exceeds investigation threshold. "
        "Multiple corroborating signals support elevated fraud risk.",
        confidence_score=0.85,
        context_summary={
            "entity_id": "user123",
            "risk_score": 0.65,
            "threshold": 0.56,
            "action_items": [
                "Review device activity in detail",
                "Check for credential compromise",
                "Verify recent authentication events",
            ],
        },
    )

    logger.log_agent_result(
        agent_name="device-risk-analyzer",
        entity_id="user123",
        final_risk_score=0.65,
        findings=[
            {
                "category": "device_proliferation",
                "finding": "5 unique device fingerprints detected in 24 hours",
                "severity": "high",
            },
            {
                "category": "geographic_anomaly",
                "finding": "Access from 3 countries (US, UK, CN) within 2 hours",
                "severity": "critical",
            },
            {
                "category": "velocity_anomaly",
                "finding": "Impossible travel detected between US and UK",
                "severity": "critical",
            },
            {
                "category": "session_pattern_deviation",
                "finding": "Activity pattern deviates significantly from baseline",
                "severity": "medium",
            },
        ],
        recommendations=[
            "Trigger step-up authentication (MFA challenge)",
            "Review recent account changes (password, email recovery)",
            "Check for unauthorized account access",
            "Notify user of suspicious activity",
            "Review and revoke compromised sessions",
        ],
        confidence=0.85,
        tools_used=["splunk_query_device_signals", "device_fingerprint_analyzer"],
        execution_time_ms=2500.75,
    )

    logger.log_event(
        event_type="investigation_complete",
        agent_name="system",
        description="Instrumentation demonstration completed successfully",
        details={
            "total_llm_calls": 1,
            "total_tool_executions": 1,
            "total_decisions": 1,
            "total_risk_calculations": 1,
        },
    )

    logger.finalize()

    log_file = Path(logger.get_log_file_path())
    json_file = Path(logger.get_json_file_path())

    assert log_file.exists(), f"Log file not created: {log_file}"
    assert json_file.exists(), f"JSON file not created: {json_file}"

    with open(json_file, "r") as f:
        json_data = json.load(f)

    assert json_data["investigation_id"] == investigation_id
    assert json_data["summary"]["total_llm_interactions"] == 1
    assert json_data["summary"]["total_tool_executions"] == 1
    assert json_data["summary"]["total_agent_decisions"] == 1
    assert json_data["summary"]["total_risk_calculations"] == 1

    with open(log_file, "r") as f:
        log_content = f.read()

    assert "llm_call" in log_content or "LLM" in log_content
    assert "tool_execution" in log_content or "splunk" in log_content
    assert "risk_calculation" in log_content
    assert "agent_decision" in log_content
    assert "agent_result" in log_content

    print("\n" + "=" * 100)
    print("INSTRUMENTATION DEMONSTRATION - JSON SUMMARY")
    print("=" * 100)
    print(json.dumps(json_data, indent=2))
    print("\n" + "=" * 100)
    print("INSTRUMENTATION DEMONSTRATION - TEXT LOG")
    print("=" * 100)
    print(log_content)
    print("=" * 100)
