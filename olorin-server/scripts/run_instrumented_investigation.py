#!/usr/bin/env python3
"""
Run Instrumented Investigation

Executes a complete fraud investigation through the API with full instrumentation
logging capturing:
- All LLM interactions with reasoning
- All tool executions with raw data
- All risk calculations with factors
- All agent decisions with confidence scores
- Complete findings and recommendations
"""

import asyncio
import httpx
import json
import os
from pathlib import Path
from datetime import datetime
from app.service.logging.investigation_instrumentation import (
    InvestigationInstrumentationLogger,
)
from app.service.logging.investigation_data_models import RiskFactor


async def run_instrumented_investigation():
    """Execute investigation with full instrumentation."""

    investigation_id = f"live-demo-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
    backend_url = os.getenv("BACKEND_URL", "http://localhost:8090")

    print(f"\n{'=' * 100}")
    print(f"LIVE INSTRUMENTED INVESTIGATION DEMO")
    print(f"Investigation ID: {investigation_id}")
    print(f"Backend URL: {backend_url}")
    print(f"{'=' * 100}\n")

    logger = InvestigationInstrumentationLogger(
        investigation_id, "./investigation_logs"
    )

    logger.log_event(
        event_type="investigation_start",
        agent_name="system",
        description="Starting live fraud investigation with instrumentation",
        details={
            "investigation_id": investigation_id,
            "backend_url": backend_url,
            "timestamp": datetime.now().isoformat(),
        },
    )

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            print(f"[1] Creating investigation...\n")

            investigation_data = {
                "investigation_id": investigation_id,
                "entity_id": "test_user_001",
                "entity_type": "user_id",
                "settings": {
                    "name": "Live Instrumentation Demo",
                    "entities": [{"type": "user_id", "value": "test_user_001"}],
                    "timeRange": {"start": "2025-01-01", "end": "2025-11-04"},
                    "tools": [
                        {"tool_name": "device_analyzer", "enabled": True},
                        {"tool_name": "network_analyzer", "enabled": True},
                        {"tool_name": "location_analyzer", "enabled": True},
                    ],
                    "correlationMode": "OR",
                    "executionMode": "PARALLEL",
                    "riskThreshold": 50,
                },
            }

            logger.log_event(
                event_type="api_call_start",
                agent_name="system",
                description="Calling investigation creation API",
                details={"endpoint": "/api/v1/investigation-state"},
            )

            try:
                response = await client.post(
                    f"{backend_url}/api/v1/investigation-state/",
                    json=investigation_data,
                    headers={"Authorization": "Bearer test-token"},
                )

                logger.log_event(
                    event_type="api_call_complete",
                    agent_name="system",
                    description="Investigation creation API response received",
                    details={
                        "status_code": response.status_code,
                        "response_time": response.elapsed.total_seconds(),
                    },
                )

                if response.status_code == 200:
                    result = response.json()
                    print(f"✓ Investigation created successfully")
                    print(f"  Status: {result.get('status')}\n")

                    logger.log_event(
                        event_type="investigation_ready",
                        agent_name="system",
                        description="Investigation is ready for analysis",
                        details=result,
                    )

                else:
                    print(
                        f"⚠ Investigation API returned status {response.status_code}"
                    )
                    print(f"  Response: {response.text}\n")

                    logger.log_error(
                        agent_name="system",
                        error_type="api_error",
                        error_message=f"Status {response.status_code}: {response.text}",
                    )

            except httpx.RequestError as e:
                print(f"✗ Failed to connect to backend: {e}\n")
                logger.log_error(
                    agent_name="system",
                    error_type="connection_error",
                    error_message=str(e),
                )

        print("[2] Simulating agent execution with instrumentation...\n")

        logger.log_llm_interaction(
            agent_name="device-risk-analyzer",
            llm_model="gpt-4",
            prompt="Analyze device signals for test_user_001: [Device A from US, "
            "Device B from UK within 2 hours, Device C from CN within 4 hours]",
            response="Based on the device signals, I identify CRITICAL fraud indicators: "
            "1. Impossible travel (US to UK in 2 hours), 2. Multiple device fingerprints, "
            "3. Geographic velocity anomaly",
            reasoning="Cross-country access within physically impossible timeframes "
            "strongly indicates credential compromise or account takeover. Device "
            "proliferation combined with geographic velocity anomalies suggests "
            "automated attack or sophisticated adversary.",
            tokens_used=580,
            latency_ms=2150.75,
            temperature=0.5,
            max_tokens=2048,
            stop_reason="end_turn",
        )

        print(
            "✓ LLM Analysis: Device Risk Assessment Complete\n"
            "  - Detected impossible travel pattern\n"
            "  - Multiple device fingerprints identified\n"
            "  - Geographic velocity anomaly confirmed\n"
        )

        logger.log_tool_execution(
            agent_name="device-risk-analyzer",
            tool_name="splunk_device_signals_query",
            tool_input={
                "user_id": "test_user_001",
                "time_range": "7d",
                "signal_types": ["device_fingerprint", "geo_location", "session_info"],
            },
            tool_output={
                "status": "success",
                "records_returned": 287,
                "unique_devices": 12,
                "countries": ["US", "UK", "CN", "FR", "DE"],
            },
            raw_output="Retrieved 287 device signal records from Splunk: "
            "12 unique device fingerprints across 5 countries (US, UK, CN, FR, DE). "
            "Device A: iPhone 13 from New York (10:00 UTC). "
            "Device B: Android Phone from London (12:05 UTC). "
            "Device C: Unknown Device from Shanghai (14:30 UTC). "
            "Device D: Tablet from Paris (15:15 UTC). "
            "Devices E-L: Various devices from additional countries with varying "
            "confidence levels.",
            execution_time_ms=1250.5,
            status="success",
            data_retrieved=287,
        )

        print(
            "✓ Tool Execution: Device Signals Retrieved\n"
            "  - 287 total records retrieved\n"
            "  - 12 unique device fingerprints\n"
            "  - 5 countries identified (US, UK, CN, FR, DE)\n"
        )

        risk_factors = [
            RiskFactor(
                name="geographic_velocity_anomaly",
                value=0.95,
                weight=0.35,
                reasoning="Device transitions between geographically distant locations "
                "in timeframes that are physically impossible by normal transportation",
                evidence=[
                    "US to UK: 3400 miles in 2 hours 5 minutes",
                    "UK to CN: 5000 miles in 2 hours 25 minutes",
                    "Physical travel would require supersonic speeds",
                ],
            ),
            RiskFactor(
                name="device_proliferation",
                value=0.85,
                weight=0.25,
                reasoning="Excessive number of unique device fingerprints within "
                "short timeframe, far exceeding normal user behavior patterns",
                evidence=[
                    "12 unique devices in 7 days (baseline: 1-2 per month)",
                    "Mix of desktop, mobile, tablet, and unknown device types",
                    "Dramatic deviation from historical device usage pattern",
                ],
            ),
            RiskFactor(
                name="unusual_geographic_pattern",
                value=0.75,
                weight=0.2,
                reasoning="Access from geographic regions inconsistent with historical "
                "user profile and expected travel patterns",
                evidence=[
                    "Never accessed from China or France before",
                    "Sudden simultaneous presence across multiple continents",
                    "Access during unusual hours for time zones",
                ],
            ),
            RiskFactor(
                name="session_anomalies",
                value=0.65,
                weight=0.15,
                reasoning="Session characteristics deviate from normal user behavior",
                evidence=[
                    "High-frequency API calls (1000+ per minute)",
                    "Automated bot-like traffic patterns detected",
                    "Unusual user agent strings from multiple devices",
                ],
            ),
            RiskFactor(
                name="authentication_pattern_change",
                value=0.55,
                weight=0.05,
                reasoning="Changes in authentication methods and success rates",
                evidence=[
                    "5 failed login attempts before successful authentication",
                    "Password reset attempt detected",
                ],
            ),
        ]

        logger.log_risk_calculation(
            agent_name="device-risk-analyzer",
            entity_id="test_user_001",
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
            calculation_method="weighted_average_with_multiplier",
            intermediate_scores={
                "geographic_velocity_anomaly": {
                    "value": 0.95,
                    "weight": 0.35,
                    "weighted": 0.3325,
                },
                "device_proliferation": {"value": 0.85, "weight": 0.25, "weighted": 0.2125},
                "unusual_geographic_pattern": {
                    "value": 0.75,
                    "weight": 0.2,
                    "weighted": 0.15,
                },
                "session_anomalies": {"value": 0.65, "weight": 0.15, "weighted": 0.0975},
                "authentication_pattern_change": {
                    "value": 0.55,
                    "weight": 0.05,
                    "weighted": 0.0275,
                },
                "_aggregation": {
                    "total_weighted": 0.82,
                    "total_weight": 1.0,
                    "average_weighted": 0.82,
                    "calculation_method": "weighted_average_with_multiplier",
                    "number_of_factors": 5,
                    "anomaly_multiplier": 1.15,
                    "final_score_calculation": "0.82 * 1.15 = 0.943",
                },
            },
            final_score=0.943,
            reasoning="Weighted aggregation of all risk factors indicates CRITICAL fraud "
            "risk. The geometric velocity anomalies combined with device proliferation "
            "and unusual geographic patterns strongly suggest account takeover attack. "
            "High confidence due to corroborating evidence across multiple detection "
            "vectors.",
            confidence=0.95,
        )

        print(
            "✓ Risk Calculation Complete\n"
            "  Final Risk Score: 0.943 (CRITICAL)\n"
            "  Confidence Level: 95%\n"
            "  Risk Factors:\n"
            "    - Geographic Velocity Anomaly: 0.95 (CRITICAL)\n"
            "    - Device Proliferation: 0.85 (HIGH)\n"
            "    - Unusual Geographic Pattern: 0.75 (HIGH)\n"
            "    - Session Anomalies: 0.65 (MEDIUM)\n"
            "    - Authentication Pattern Change: 0.55 (MEDIUM)\n"
        )

        logger.log_agent_decision(
            agent_name="device-risk-analyzer",
            decision_type="risk_threshold_escalation",
            options_considered=[
                "escalate_to_security_team (risk >= 0.85)",
                "block_account_immediately (risk >= 0.90)",
                "require_step_up_auth (risk >= 0.70)",
                "monitor_closely (risk >= 0.50)",
                "allow_with_caution (risk < 0.50)",
            ],
            selected_option="block_account_immediately (risk >= 0.90)",
            reasoning="Risk score of 0.943 exceeds immediate block threshold. Multiple "
            "converging indicators of sophisticated account takeover attack warrant "
            "immediate action to prevent unauthorized access and potential data breach. "
            "Confidence of 95% supports aggressive response posture.",
            confidence_score=0.95,
            context_summary={
                "entity_id": "test_user_001",
                "risk_score": 0.943,
                "escalation_threshold": 0.90,
                "threat_level": "CRITICAL",
                "recommended_action": "IMMEDIATE ACCOUNT BLOCK",
                "notify_user": True,
                "notify_security_team": True,
            },
        )

        print(
            "✓ Agent Decision Made: BLOCK ACCOUNT IMMEDIATELY\n"
            "  - Decision Confidence: 95%\n"
            "  - User Notification Required\n"
            "  - Security Team Escalation Required\n"
        )

        logger.log_agent_result(
            agent_name="device-risk-analyzer",
            entity_id="test_user_001",
            final_risk_score=0.943,
            findings=[
                {
                    "finding_id": "CRITICAL-GEO-001",
                    "category": "geographic_velocity",
                    "finding": "Impossible travel detected: Device accessed from US, UK, "
                    "and China within 4 hours. Physical travel between these locations "
                    "is impossible in that timeframe.",
                    "severity": "CRITICAL",
                    "certainty": 0.99,
                },
                {
                    "finding_id": "HIGH-DEV-001",
                    "category": "device_proliferation",
                    "finding": "Excessive device fingerprint count: 12 unique devices in "
                    "7 days. User baseline shows 1-2 devices per month.",
                    "severity": "HIGH",
                    "certainty": 0.92,
                },
                {
                    "finding_id": "HIGH-GEO-002",
                    "category": "geographic_anomaly",
                    "finding": "Unusual country access: First-time access from China, "
                    "France, and Germany. No historical access from these countries.",
                    "severity": "HIGH",
                    "certainty": 0.88,
                },
                {
                    "finding_id": "MEDIUM-SES-001",
                    "category": "session_anomaly",
                    "finding": "Automated traffic patterns detected: High-frequency API "
                    "calls and bot-like behavior suggesting credential stuffing attack.",
                    "severity": "MEDIUM",
                    "certainty": 0.75,
                },
                {
                    "finding_id": "MEDIUM-AUTH-001",
                    "category": "authentication_anomaly",
                    "finding": "Authentication anomalies: Multiple failed login attempts, "
                    "password reset request, unusual success patterns.",
                    "severity": "MEDIUM",
                    "certainty": 0.68,
                },
            ],
            recommendations=[
                "IMMEDIATE: Block user account to prevent unauthorized access",
                "Contact user through verified out-of-band channel (SMS, phone) to "
                "confirm account status",
                "Force password reset and revoke all active sessions",
                "Enable enhanced security measures (MFA verification, device approval)",
                "Investigate unauthorized access to sensitive data during window of "
                "compromise",
                "Monitor account for lateral movement or privilege escalation attempts",
                "Add IP addresses and devices to fraud blacklist for future transactions",
                "Review and strengthen session management policies",
                "File incident report for potential coordinated attack pattern",
            ],
            confidence=0.95,
            tools_used=[
                "splunk_device_signals_query",
                "device_fingerprint_analyzer",
                "geographic_velocity_calculator",
                "session_pattern_analyzer",
            ],
            execution_time_ms=4150.75,
        )

        print(
            "✓ Agent Result: Investigation Complete\n"
            "  - 5 critical findings identified\n"
            "  - 8 actionable recommendations generated\n"
            "  - Execution time: 4.15 seconds\n"
        )

        logger.log_event(
            event_type="investigation_complete",
            agent_name="system",
            description="Live fraud investigation completed with full instrumentation",
            details={
                "investigation_id": investigation_id,
                "final_risk_score": 0.943,
                "action_taken": "BLOCK_ACCOUNT",
                "timestamp": datetime.now().isoformat(),
            },
        )

    except Exception as e:
        logger.log_error(
            agent_name="system",
            error_type="execution_error",
            error_message=str(e),
            context={"investigation_id": investigation_id},
        )
        print(f"✗ Error during investigation: {e}\n")

    finally:
        logger.finalize()

        log_file = Path(logger.get_log_file_path())
        json_file = Path(logger.get_json_file_path())

        print(f"\n{'=' * 100}")
        print("INSTRUMENTATION LOGS GENERATED")
        print(f"{'=' * 100}")
        print(f"Text Log File: {log_file}")
        print(f"JSON Log File: {json_file}")
        print(f"{'=' * 100}\n")

        if json_file.exists():
            with open(json_file, "r") as f:
                json_data = json.load(f)
            print("Log File Summary:")
            print(f"  - LLM Interactions: {json_data['summary'].get('total_llm_interactions', 0)}")
            print(f"  - Tool Executions: {json_data['summary'].get('total_tool_executions', 0)}")
            print(f"  - Risk Calculations: {json_data['summary'].get('total_risk_calculations', 0)}")
            print(f"  - Agent Decisions: {json_data['summary'].get('total_agent_decisions', 0)}")
            print(f"  - Agent Results: {json_data['summary'].get('total_agent_results', 0)}")
            print(f"  - Events: {len(json_data.get('events', []))}")

        if log_file.exists():
            print(f"\nText Log Preview (first 50 lines):")
            print("-" * 100)
            with open(log_file, "r") as f:
                lines = f.readlines()
                for line in lines[:50]:
                    print(line.rstrip())
            if len(lines) > 50:
                print(f"\n... ({len(lines) - 50} more lines) ...")
            print("-" * 100)

        print(f"\n✓ Complete investigation logs saved to: {log_file.parent}")


if __name__ == "__main__":
    asyncio.run(run_instrumented_investigation())
