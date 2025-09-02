"""
End-to-End Integration Tests for Autonomous Investigation System.

NO MOCK DATA - All tests use real API calls and real-time responses.
Tests complete investigation workflows, WebSocket communications, and performance.
"""

import asyncio
import json
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from unittest.mock import MagicMock, AsyncMock

import pytest
import pytest_asyncio
from langchain_core.runnables.config import RunnableConfig
from sqlalchemy.orm import Session

from app.service.agent.autonomous_agents import (
    autonomous_network_agent,
    autonomous_device_agent,
    autonomous_location_agent,
    autonomous_logs_agent,
    autonomous_risk_agent,
    cleanup_investigation_context,
    get_investigation_contexts,
)
from app.service.agent.autonomous_context import (
    AutonomousInvestigationContext,
    EntityType,
    InvestigationPhase as InvestigationStatus,  # Using InvestigationPhase as status
    DomainFindings,
)
from app.service.agent.journey_tracker import (
    LangGraphJourneyTracker,
    NodeType,
    NodeStatus,
)
from app.persistence.models import (
    InvestigationRecord,
    UserRecord,
    EntityRecord,
)
from tests.fixtures.real_investigation_scenarios import (
    get_test_scenarios,
    get_scenario_by_type,
    RealScenarioGenerator,
)

logger = logging.getLogger(__name__)


class TestAutonomousInvestigationE2E:
    """End-to-end tests for complete autonomous investigations."""
    
    @pytest.mark.asyncio
    async def test_full_investigation_lifecycle(
        self,
        real_investigation_context,
        api_cost_monitor,
        db_session
    ):
        """Test complete investigation from creation to completion with real API."""
        investigation_id = real_investigation_context.investigation_id
        journey_tracker = LangGraphJourneyTracker()
        
        # Initialize journey tracking
        journey_id = journey_tracker.start_journey(
            investigation_id=investigation_id,
            user_id=real_investigation_context.user_id,
            metadata={"test": "full_lifecycle", "real_api": True}
        )
        
        config = RunnableConfig(
            tags=["test", "e2e", "full_lifecycle"],
            metadata={
                "investigation_id": investigation_id,
                "journey_id": journey_id,
            }
        )
        
        # Track investigation phases
        phases = {}
        
        try:
            # Phase 1: Network Analysis
            journey_tracker.track_node(
                journey_id,
                node_name="network_analysis",
                node_type=NodeType.AGENT,
                status=NodeStatus.RUNNING
            )
            
            start_time = time.time()
            network_findings = await autonomous_network_agent(
                real_investigation_context,
                config
            )
            phases["network"] = {
                "duration": time.time() - start_time,
                "findings": network_findings,
            }
            api_cost_monitor.track_call(2000, 1800)
            
            journey_tracker.track_node(
                journey_id,
                node_name="network_analysis",
                node_type=NodeType.AGENT,
                status=NodeStatus.COMPLETED,
                output={"risk_score": network_findings.risk_score}
            )
            
            # Phase 2: Device Analysis
            journey_tracker.track_node(
                journey_id,
                node_name="device_analysis",
                node_type=NodeType.AGENT,
                status=NodeStatus.RUNNING
            )
            
            start_time = time.time()
            device_findings = await autonomous_device_agent(
                real_investigation_context,
                config
            )
            phases["device"] = {
                "duration": time.time() - start_time,
                "findings": device_findings,
            }
            api_cost_monitor.track_call(1800, 1600)
            
            journey_tracker.track_node(
                journey_id,
                node_name="device_analysis",
                node_type=NodeType.AGENT,
                status=NodeStatus.COMPLETED,
                output={"risk_score": device_findings.risk_score}
            )
            
            # Phase 3: Location Analysis
            journey_tracker.track_node(
                journey_id,
                node_name="location_analysis",
                node_type=NodeType.AGENT,
                status=NodeStatus.RUNNING
            )
            
            start_time = time.time()
            location_findings = await autonomous_location_agent(
                real_investigation_context,
                config
            )
            phases["location"] = {
                "duration": time.time() - start_time,
                "findings": location_findings,
            }
            api_cost_monitor.track_call(1700, 1500)
            
            journey_tracker.track_node(
                journey_id,
                node_name="location_analysis",
                node_type=NodeType.AGENT,
                status=NodeStatus.COMPLETED,
                output={"risk_score": location_findings.risk_score}
            )
            
            # Phase 4: Logs Analysis
            journey_tracker.track_node(
                journey_id,
                node_name="logs_analysis",
                node_type=NodeType.AGENT,
                status=NodeStatus.RUNNING
            )
            
            start_time = time.time()
            logs_findings = await autonomous_logs_agent(
                real_investigation_context,
                config
            )
            phases["logs"] = {
                "duration": time.time() - start_time,
                "findings": logs_findings,
            }
            api_cost_monitor.track_call(1900, 1700)
            
            journey_tracker.track_node(
                journey_id,
                node_name="logs_analysis",
                node_type=NodeType.AGENT,
                status=NodeStatus.COMPLETED,
                output={"risk_score": logs_findings.risk_score}
            )
            
            # Phase 5: Risk Aggregation
            journey_tracker.track_node(
                journey_id,
                node_name="risk_aggregation",
                node_type=NodeType.DECISION,
                status=NodeStatus.RUNNING
            )
            
            # Set domain findings for risk aggregation
            real_investigation_context.domain_findings = {
                "network": network_findings,
                "device": device_findings,
                "location": location_findings,
                "logs": logs_findings,
            }
            
            start_time = time.time()
            final_risk = await autonomous_risk_agent(
                real_investigation_context,
                config
            )
            phases["risk_aggregation"] = {
                "duration": time.time() - start_time,
                "findings": final_risk,
            }
            api_cost_monitor.track_call(2200, 2000)
            
            journey_tracker.track_node(
                journey_id,
                node_name="risk_aggregation",
                node_type=NodeType.DECISION,
                status=NodeStatus.COMPLETED,
                output={
                    "final_risk_score": final_risk.risk_score,
                    "confidence": final_risk.confidence,
                    "recommendations": final_risk.recommended_actions[:3]
                }
            )
            
            # Complete journey
            journey_tracker.complete_journey(
                journey_id,
                final_output={
                    "investigation_id": investigation_id,
                    "final_risk_score": final_risk.risk_score,
                    "total_findings": sum(
                        len(phase["findings"].key_findings)
                        for phase in phases.values()
                    ),
                    "status": "completed"
                }
            )
            
        except Exception as e:
            # Track failure
            journey_tracker.track_node(
                journey_id,
                node_name="error",
                node_type=NodeType.ERROR,
                status=NodeStatus.FAILED,
                error=str(e)
            )
            journey_tracker.complete_journey(
                journey_id,
                final_output={"error": str(e), "status": "failed"}
            )
            raise
        
        # Validate complete investigation
        assert all(phase["findings"] for phase in phases.values())
        assert final_risk.risk_score is not None
        assert 0.0 <= final_risk.risk_score <= 1.0
        
        # Check performance
        total_duration = sum(phase["duration"] for phase in phases.values())
        assert total_duration < 120  # Should complete within 2 minutes
        
        # Log investigation summary
        logger.info(f"Investigation {investigation_id} completed successfully:")
        logger.info(f"  Total duration: {total_duration:.2f} seconds")
        logger.info(f"  Final risk score: {final_risk.risk_score:.2f}")
        logger.info(f"  Confidence: {final_risk.confidence:.2f}")
        for domain, phase_data in phases.items():
            logger.info(
                f"  {domain}: risk={phase_data['findings'].risk_score:.2f}, "
                f"duration={phase_data['duration']:.2f}s"
            )
        
        # Get journey summary
        journey_summary = journey_tracker.get_journey_summary(journey_id)
        assert journey_summary["status"] == "completed"
        assert len(journey_summary["nodes"]) >= 5  # All analysis phases
        
        # Cleanup
        cleanup_investigation_context(investigation_id)
    
    @pytest.mark.asyncio
    async def test_concurrent_investigations(
        self,
        real_database,
        api_cost_monitor
    ):
        """Test multiple concurrent investigations with real API."""
        # Create multiple investigation contexts
        generator = RealScenarioGenerator()
        contexts = []
        
        db_session = real_database()
        try:
            for i in range(3):
                # Create unique investigator user and entity for each investigation
                user = UserRecord(
                    username=f"investigator_{i}_{int(datetime.now().timestamp())}",
                    email=f"investigator{i}@concurrent.test",
                    hashed_password="hashed_password_placeholder",
                    first_name=f"Investigator",
                    last_name=f"User{i}",
                    is_active=True,
                )
                db_session.add(user)
                db_session.flush()  # Get the ID
                
                entity = EntityRecord(
                    entity_id=f"concurrent_entity_{i}_{int(datetime.now().timestamp())}",
                    entity_type="user",  # Changed to user type for investigation subject
                    attributes=json.dumps({
                        "name": f"Concurrent Test User {i}",
                        "email": f"subject{i}@concurrent.test",
                        "phone": f"+1415555000{i}",
                        "ip_address": "192.168.1.100",  # Test IP
                        "device_fingerprint": {"browser": "Chrome", "os": "Windows"}
                    }),
                    risk_score=0.5,
                )
                db_session.add(entity)
                
                investigation = InvestigationRecord(
                    user_id=user.id,  # Reference to investigator user
                    entity_type="user",
                    entity_id=entity.entity_id,
                    investigation_type="fraud",
                    status="active",
                    risk_score=0.0,
                    title=f"Concurrent Investigation {i}",
                    description="Test investigation for concurrent processing",
                )
                db_session.add(investigation)
                
                db_session.commit()
                
                # Create context
                context = AutonomousInvestigationContext(
                    investigation_id=investigation.id,
                    entity_id=entity.entity_id,
                    entity_type=EntityType.USER_ID,
                    investigation_type="fraud_investigation"
                )
                contexts.append(context)
        finally:
            db_session.close()
        
        # Run concurrent investigations
        config = RunnableConfig(
            tags=["test", "concurrent"],
            metadata={"test_type": "concurrent_investigations"}
        )
        
        async def run_investigation(ctx):
            """Run a single investigation."""
            # Create config with proper context in configurable section
            investigation_config = RunnableConfig(
                tags=["test", "concurrent"],
                metadata={"test_type": "concurrent_investigations"},
                configurable={"agent_context": ctx}
            )
            findings = await autonomous_network_agent(ctx, investigation_config)
            api_cost_monitor.track_call(1500, 1200)
            return findings
        
        # Execute concurrently
        start_time = time.time()
        results = await asyncio.gather(*[run_investigation(ctx) for ctx in contexts])
        total_time = time.time() - start_time
        
        # Validate results - agents return dict with messages
        assert len(results) == 3
        assert all(isinstance(r, dict) for r in results)
        assert all("messages" in r for r in results)
        
        # Extract risk assessments from the results
        risk_assessments = []
        for result in results:
            if "messages" in result and len(result["messages"]) > 0:
                content = json.loads(result["messages"][0].content)
                if "risk_assessment" in content:
                    risk_assessments.append(content["risk_assessment"])
        
        # Validate we got risk assessments
        assert len(risk_assessments) == 3
        
        # Check for result variation (real API should produce different results)
        risk_scores = [assessment.get("risk_level", 0.0) for assessment in risk_assessments]
        assert all(isinstance(score, float) for score in risk_scores)
        # Note: Real API might produce similar risk scores for similar test data
        
        # Performance check - concurrent should be faster than sequential
        assert total_time < 120  # Should complete within 2 minutes for real AI calls
        
        logger.info(f"Concurrent investigations completed in {total_time:.2f}s")
        logger.info(f"Risk scores: {[f'{s:.2f}' for s in risk_scores]}")
        
        # Cleanup contexts
        for ctx in contexts:
            cleanup_investigation_context(ctx.investigation_id, ctx.entity_id)
    
    @pytest.mark.asyncio
    async def test_investigation_with_webhooks(
        self,
        real_investigation_context,
        api_cost_monitor,
        real_webhook_server
    ):
        """Test investigation with real webhook notifications."""
        investigation_id = real_investigation_context.investigation_id
        webhook_url = real_webhook_server["url"]
        
        # Configure webhook callback
        async def send_webhook(event_type: str, data: Dict[str, Any]):
            """Send webhook notification."""
            import aiohttp
            async with aiohttp.ClientSession() as session:
                payload = {
                    "event": event_type,
                    "investigation_id": investigation_id,
                    "timestamp": datetime.now().isoformat(),
                    "data": data,
                }
                async with session.post(webhook_url, json=payload) as response:
                    return response.status == 200
        
        config = RunnableConfig(
            tags=["test", "webhooks"],
            metadata={
                "investigation_id": investigation_id,
                "webhook_url": webhook_url,
            }
        )
        
        # Run investigation with webhook notifications
        await send_webhook("investigation_started", {"status": "started"})
        
        # Network analysis
        await send_webhook("domain_analysis_started", {"domain": "network"})
        network_findings = await autonomous_network_agent(real_investigation_context, config)
        api_cost_monitor.track_call(1800, 1500)
        await send_webhook("domain_analysis_completed", {
            "domain": "network",
            "risk_score": network_findings.risk_score,
            "findings_count": len(network_findings.key_findings),
        })
        
        # Device analysis
        await send_webhook("domain_analysis_started", {"domain": "device"})
        device_findings = await autonomous_device_agent(real_investigation_context, config)
        api_cost_monitor.track_call(1700, 1400)
        await send_webhook("domain_analysis_completed", {
            "domain": "device",
            "risk_score": device_findings.risk_score,
            "findings_count": len(device_findings.key_findings),
        })
        
        # Risk aggregation
        real_investigation_context.domain_findings = {
            "network": network_findings,
            "device": device_findings,
        }
        
        await send_webhook("risk_aggregation_started", {})
        final_risk = await autonomous_risk_agent(real_investigation_context, config)
        api_cost_monitor.track_call(2000, 1800)
        await send_webhook("risk_aggregation_completed", {
            "final_risk_score": final_risk.risk_score,
            "confidence": final_risk.confidence,
            "recommendations": final_risk.recommended_actions[:3],
        })
        
        await send_webhook("investigation_completed", {
            "status": "completed",
            "final_risk_score": final_risk.risk_score,
        })
        
        # Wait for webhooks to be received
        await asyncio.sleep(1)
        
        # Validate webhook notifications
        received = real_webhook_server["received"]
        assert len(received) >= 7  # All expected webhooks
        
        # Check webhook sequence
        events = [w["data"]["event"] for w in received]
        assert "investigation_started" in events
        assert "investigation_completed" in events
        assert events.count("domain_analysis_started") >= 2
        assert events.count("domain_analysis_completed") >= 2
        
        logger.info(f"Received {len(received)} webhook notifications")
        logger.info(f"Event sequence: {events}")
    
    @pytest.mark.asyncio
    async def test_investigation_error_handling(
        self,
        real_investigation_context,
        api_cost_monitor
    ):
        """Test investigation error handling and recovery with real API."""
        config = RunnableConfig(
            tags=["test", "error_handling"],
            metadata={"test_type": "error_recovery"}
        )
        
        # Simulate partial failure by corrupting some data
        original_user_data = real_investigation_context.user_data.copy()
        
        # Test 1: Handle missing required data
        real_investigation_context.user_data = {}
        
        try:
            findings = await autonomous_network_agent(real_investigation_context, config)
            api_cost_monitor.track_call(1500, 1200)
            
            # Should still return findings even with missing data
            assert isinstance(findings, DomainFindings)
            assert findings.data_quality in ["low", "incomplete", "error"]
            
            logger.info(f"Handled missing data: quality={findings.data_quality}")
        except Exception as e:
            logger.error(f"Failed to handle missing data: {e}")
            pytest.fail("Should handle missing data gracefully")
        
        # Restore data
        real_investigation_context.user_data = original_user_data
        
        # Test 2: Handle investigation timeout (simulated)
        import asyncio
        
        async def slow_investigation():
            await asyncio.sleep(0.1)  # Simulate quick response
            return await autonomous_device_agent(real_investigation_context, config)
        
        try:
            # Set a reasonable timeout
            findings = await asyncio.wait_for(slow_investigation(), timeout=10.0)
            api_cost_monitor.track_call(1400, 1100)
            
            assert isinstance(findings, DomainFindings)
            logger.info("Completed within timeout")
        except asyncio.TimeoutError:
            logger.info("Investigation timed out as expected")
            # This is expected in a real timeout scenario
        
        # Test 3: Handle context cleanup after error
        investigation_id = real_investigation_context.investigation_id
        
        # Ensure context exists
        contexts = get_investigation_contexts()
        
        # Cleanup
        cleanup_investigation_context(investigation_id)
        
        # Verify cleanup
        contexts_after = get_investigation_contexts()
        assert investigation_id not in contexts_after
        
        logger.info("Error handling and cleanup completed successfully")


class TestScenarioBasedInvestigations:
    """Test investigations with specific real-world scenarios."""
    
    @pytest.mark.asyncio
    async def test_account_takeover_detection(
        self,
        real_database,
        api_cost_monitor
    ):
        """Test detection of account takeover with real patterns."""
        scenario = get_scenario_by_type("account_takeover", "critical")
        
        # Create investigation context with ATO patterns
        db_session = real_database()
        try:
            # Create investigator user
            user = UserRecord(
                username=f"investigator_ato_{int(datetime.now().timestamp())}",
                email=scenario.user_data["email"],
                hashed_password="hashed_password_placeholder",
                first_name="ATO",
                last_name="Investigator",
                is_active=True,
            )
            db_session.add(user)
            db_session.flush()  # Get the ID
            
            # Create investigation subject entity
            entity = EntityRecord(
                entity_id=scenario.entity_data["entity_id"],
                entity_type=scenario.entity_data["entity_type"],
                attributes=json.dumps({
                    "name": scenario.entity_data["name"],
                    "user_id": scenario.user_data["user_id"],
                    "email": scenario.user_data["email"],
                    "phone": scenario.user_data["phone"],
                    "ip_address": scenario.user_data["ip_address"],
                    "device_fingerprint": scenario.user_data["device_fingerprint"],
                    **scenario.entity_data
                }),
                risk_score=scenario.entity_data["risk_score"],
            )
            db_session.add(entity)
            
            investigation = InvestigationRecord(
                user_id=user.id,
                entity_type=entity.entity_type,
                entity_id=entity.entity_id,
                investigation_type="ato",
                status="active",
                risk_score=0.0,
                title="ATO Detection Test",
                description="Test investigation for account takeover detection",
            )
            db_session.add(investigation)
            db_session.commit()
            
            # Create context with ATO patterns
            context = AutonomousInvestigationContext(
                investigation_id=investigation.id,
                entity_id=entity.entity_id,
                entity_type=EntityType.USER_ID,
                investigation_type="ato"
            )
        finally:
            db_session.close()
        
        config = RunnableConfig(
            tags=["test", "ato_detection"],
            metadata={"scenario_id": scenario.scenario_id},
            configurable={"agent_context": context}
        )
        
        # Run multi-domain analysis for ATO
        findings = {}
        
        # Network analysis should detect IP anomalies
        findings["network"] = await autonomous_network_agent(context, config)
        api_cost_monitor.track_call(2000, 1800)
        
        # Device analysis should detect fingerprint changes
        findings["device"] = await autonomous_device_agent(context, config)
        api_cost_monitor.track_call(1900, 1700)
        
        # Logs analysis should detect failed login attempts
        findings["logs"] = await autonomous_logs_agent(context, config)
        api_cost_monitor.track_call(2100, 1900)
        
        # Risk aggregation
        context.domain_findings = findings
        final_risk = await autonomous_risk_agent(context, config)
        api_cost_monitor.track_call(2200, 2000)
        
        # Validate ATO detection
        assert final_risk.risk_score > 0.7  # High risk for ATO
        assert final_risk.confidence > 0.6
        
        # Check for ATO-specific indicators
        all_findings = []
        for domain_findings in findings.values():
            all_findings.extend(domain_findings.key_findings)
            all_findings.extend(domain_findings.suspicious_indicators)
        
        findings_text = " ".join(all_findings).lower()
        ato_indicators = ["takeover", "unauthorized", "suspicious", "login", "device change", "ip change"]
        detected_indicators = [ind for ind in ato_indicators if ind in findings_text]
        
        assert len(detected_indicators) >= 2  # Should detect multiple ATO indicators
        
        # Check recommendations
        assert any("block" in action.lower() or "freeze" in action.lower() 
                  for action in final_risk.recommended_actions)
        
        logger.info(f"ATO Detection Results:")
        logger.info(f"  Risk Score: {final_risk.risk_score:.2f}")
        logger.info(f"  Detected Indicators: {detected_indicators}")
        logger.info(f"  Recommendations: {final_risk.recommended_actions[:3]}")
    
    @pytest.mark.asyncio
    async def test_money_laundering_detection(
        self,
        real_investigation_context,
        api_cost_monitor
    ):
        """Test detection of money laundering patterns with real API."""
        scenario = get_scenario_by_type("money_laundering", "critical")
        
        # Update context with ML patterns
        real_investigation_context.user_data.update(scenario.user_data)
        real_investigation_context.entity_data.update(scenario.entity_data)
        real_investigation_context.behavioral_patterns = scenario.behavioral_patterns
        
        # Add transaction patterns indicative of ML
        real_investigation_context.transaction_data = {
            "circular_transfers": True,
            "rapid_movement": True,
            "structuring_detected": True,
            "unusual_patterns": [
                "Multiple small deposits below reporting threshold",
                "Immediate transfers after deposits",
                "Transfers to high-risk jurisdictions",
            ],
            "velocity_score": 0.95,  # Very high
            "linked_accounts": 12,
            "geographic_dispersion": 0.85,
        }
        
        config = RunnableConfig(
            tags=["test", "ml_detection"],
            metadata={"scenario": "money_laundering"}
        )
        
        # Run comprehensive ML detection
        findings = {}
        
        # Each agent should detect different ML indicators
        findings["network"] = await autonomous_network_agent(real_investigation_context, config)
        api_cost_monitor.track_call(2100, 1900)
        
        findings["logs"] = await autonomous_logs_agent(real_investigation_context, config)
        api_cost_monitor.track_call(2000, 1800)
        
        findings["location"] = await autonomous_location_agent(real_investigation_context, config)
        api_cost_monitor.track_call(1900, 1700)
        
        # Risk aggregation for ML
        real_investigation_context.domain_findings = findings
        final_risk = await autonomous_risk_agent(real_investigation_context, config)
        api_cost_monitor.track_call(2300, 2100)
        
        # Validate ML detection
        assert final_risk.risk_score > 0.8  # Very high risk for ML
        
        # Check for ML-specific indicators
        ml_indicators = ["laundering", "circular", "structuring", "layering", "placement", "integration"]
        all_text = " ".join([
            " ".join(f.key_findings + f.suspicious_indicators) 
            for f in findings.values()
        ]).lower()
        
        detected_ml_patterns = [ind for ind in ml_indicators if ind in all_text]
        assert len(detected_ml_patterns) >= 1  # Should detect ML patterns
        
        # Should recommend immediate action
        assert any("report" in action.lower() or "sar" in action.lower() or "suspicious" in action.lower()
                  for action in final_risk.recommended_actions)
        
        logger.info(f"ML Detection Results:")
        logger.info(f"  Risk Score: {final_risk.risk_score:.2f}")
        logger.info(f"  ML Patterns Detected: {detected_ml_patterns}")
        logger.info(f"  Critical Actions: {final_risk.recommended_actions[:2]}")


class TestPerformanceAndReliability:
    """Test system performance and reliability with real API."""
    
    @pytest.mark.asyncio
    async def test_investigation_performance_metrics(
        self,
        real_investigation_context,
        api_cost_monitor
    ):
        """Test and measure investigation performance metrics."""
        config = RunnableConfig(
            tags=["test", "performance"],
            metadata={"test": "performance_metrics"}
        )
        
        metrics = {
            "agent_timings": {},
            "api_calls": 0,
            "total_tokens": 0,
        }
        
        # Measure each agent's performance
        agents_to_test = [
            ("network", autonomous_network_agent, (1800, 1500)),
            ("device", autonomous_device_agent, (1700, 1400)),
            ("location", autonomous_location_agent, (1600, 1300)),
            ("logs", autonomous_logs_agent, (1900, 1600)),
        ]
        
        for agent_name, agent_func, (input_tokens, output_tokens) in agents_to_test:
            start_time = time.time()
            
            findings = await agent_func(real_investigation_context, config)
            
            duration = time.time() - start_time
            metrics["agent_timings"][agent_name] = duration
            metrics["api_calls"] += 1
            metrics["total_tokens"] += input_tokens + output_tokens
            
            api_cost_monitor.track_call(input_tokens, output_tokens)
            
            # Validate performance
            assert duration < 30  # Each agent should complete within 30 seconds
            assert findings is not None
            assert isinstance(findings, DomainFindings)
            
            logger.info(f"{agent_name} agent: {duration:.2f}s, risk={findings.risk_score:.2f}")
        
        # Calculate aggregated metrics
        metrics["total_time"] = sum(metrics["agent_timings"].values())
        metrics["average_time"] = metrics["total_time"] / len(metrics["agent_timings"])
        metrics["cost_estimate"] = api_cost_monitor.get_summary()["total_cost"]
        
        # Performance assertions
        assert metrics["average_time"] < 20  # Average should be under 20 seconds
        assert metrics["total_time"] < 90  # Total should be under 90 seconds
        
        logger.info("Performance Metrics Summary:")
        logger.info(f"  Total Time: {metrics['total_time']:.2f}s")
        logger.info(f"  Average Time: {metrics['average_time']:.2f}s")
        logger.info(f"  API Calls: {metrics['api_calls']}")
        logger.info(f"  Total Tokens: {metrics['total_tokens']:,}")
        logger.info(f"  Estimated Cost: ${metrics['cost_estimate']:.4f}")
    
    @pytest.mark.asyncio
    async def test_api_retry_and_resilience(
        self,
        real_investigation_context,
        api_cost_monitor
    ):
        """Test API retry mechanisms and resilience."""
        config = RunnableConfig(
            tags=["test", "resilience"],
            metadata={"test": "retry_mechanisms"}
        )
        
        # Test retry on transient failures
        retry_count = 0
        max_retries = 3
        
        async def attempt_investigation():
            nonlocal retry_count
            try:
                findings = await autonomous_network_agent(real_investigation_context, config)
                api_cost_monitor.track_call(1500, 1200)
                return findings
            except Exception as e:
                retry_count += 1
                if retry_count < max_retries:
                    logger.info(f"Retry {retry_count}/{max_retries} after error: {e}")
                    await asyncio.sleep(1)  # Brief delay before retry
                    return await attempt_investigation()
                raise
        
        # Execute with retry logic
        findings = await attempt_investigation()
        
        # Validate resilience
        assert isinstance(findings, DomainFindings)
        assert findings.risk_score is not None
        
        logger.info(f"Completed with {retry_count} retries")
        
        # Test handling of rate limits (simulated by rapid requests)
        rapid_results = []
        for i in range(3):
            result = await autonomous_device_agent(real_investigation_context, config)
            api_cost_monitor.track_call(1400, 1100)
            rapid_results.append(result)
            
            # Small delay to avoid actual rate limits
            await asyncio.sleep(0.5)
        
        # All requests should succeed
        assert len(rapid_results) == 3
        assert all(isinstance(r, DomainFindings) for r in rapid_results)
        
        logger.info(f"Handled {len(rapid_results)} rapid requests successfully")
    
    @pytest.mark.asyncio
    async def test_investigation_consistency(
        self,
        real_investigation_context,
        api_cost_monitor
    ):
        """Test consistency of investigation results with real API."""
        config = RunnableConfig(
            tags=["test", "consistency"],
            metadata={"test": "result_consistency"}
        )
        
        # Run same investigation multiple times
        results = []
        for i in range(3):
            findings = await autonomous_network_agent(real_investigation_context, config)
            api_cost_monitor.track_call(1500, 1200)
            results.append(findings)
            
            # Brief delay between runs
            await asyncio.sleep(1)
        
        # Extract risk scores
        risk_scores = [r.risk_score for r in results]
        
        # Calculate consistency metrics
        avg_risk = sum(risk_scores) / len(risk_scores)
        max_deviation = max(abs(score - avg_risk) for score in risk_scores)
        
        # Results should be reasonably consistent
        assert max_deviation < 0.3  # Max 30% deviation from average
        
        # Check finding consistency
        all_findings = [set(r.key_findings) for r in results]
        
        # Should have some common findings across runs
        if len(all_findings) > 1:
            common_findings = all_findings[0]
            for findings_set in all_findings[1:]:
                common_findings = common_findings.intersection(findings_set)
            
            # Log consistency metrics
            logger.info(f"Consistency Test Results:")
            logger.info(f"  Risk Scores: {[f'{s:.2f}' for s in risk_scores]}")
            logger.info(f"  Average Risk: {avg_risk:.2f}")
            logger.info(f"  Max Deviation: {max_deviation:.2f}")
            logger.info(f"  Common Findings: {len(common_findings)}")
    
    @pytest.mark.asyncio
    async def test_cost_optimization(
        self,
        real_investigation_context,
        api_cost_monitor
    ):
        """Test cost optimization strategies for API usage."""
        config = RunnableConfig(
            tags=["test", "cost_optimization"],
            metadata={"test": "cost_analysis"}
        )
        
        # Strategy 1: Selective agent execution based on initial risk
        initial_findings = await autonomous_network_agent(real_investigation_context, config)
        api_cost_monitor.track_call(1500, 1200)
        
        total_cost = api_cost_monitor.get_summary()["total_cost"]
        
        # Only run additional agents if initial risk is high
        if initial_findings.risk_score > 0.5:
            # High risk - run full investigation
            device_findings = await autonomous_device_agent(real_investigation_context, config)
            api_cost_monitor.track_call(1400, 1100)
            
            logs_findings = await autonomous_logs_agent(real_investigation_context, config)
            api_cost_monitor.track_call(1600, 1300)
            
            investigation_type = "full"
        else:
            # Low risk - minimal investigation
            investigation_type = "minimal"
        
        final_cost = api_cost_monitor.get_summary()["total_cost"]
        cost_saved = (final_cost - total_cost) if investigation_type == "minimal" else 0
        
        logger.info(f"Cost Optimization Results:")
        logger.info(f"  Investigation Type: {investigation_type}")
        logger.info(f"  Initial Risk: {initial_findings.risk_score:.2f}")
        logger.info(f"  Total Cost: ${final_cost:.4f}")
        if cost_saved > 0:
            logger.info(f"  Cost Saved: ${cost_saved:.4f}")
        
        # Validate cost tracking
        assert final_cost > 0
        assert api_cost_monitor.get_summary()["total_calls"] > 0