"""
Test Langfuse integration without OpenAI API calls.

This script demonstrates Langfuse tracing for the Olorin system without requiring OpenAI API access.
"""

import asyncio
import logging
import random
from datetime import datetime
from typing import Any, Dict, List

from langfuse import Langfuse

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class MockFraudAgent:
    """Mock fraud detection agent for testing."""

    def __init__(self, name: str, langfuse: Langfuse):
        self.name = name
        self.langfuse = langfuse

    async def analyze(self, data: Dict[str, Any], trace_id: str) -> Dict[str, Any]:
        """Simulate agent analysis with Langfuse tracing."""
        # Create span for this agent
        span = self.langfuse.span(
            trace_id=trace_id,
            name=f"{self.name}_analysis",
            metadata={"agent": self.name, "data_size": len(str(data))},
        )

        # Simulate processing time
        processing_time = random.uniform(0.5, 2.0)
        await asyncio.sleep(processing_time)

        # Generate mock results
        risk_score = random.uniform(0.0, 1.0)
        is_suspicious = risk_score > 0.7

        result = {
            "agent": self.name,
            "risk_score": risk_score,
            "is_suspicious": is_suspicious,
            "processing_time": processing_time,
            "findings": self._generate_findings(is_suspicious),
        }

        # Update span with results
        span.update(output=result, level="DEFAULT")
        span.end()

        return result

    def _generate_findings(self, is_suspicious: bool) -> List[str]:
        """Generate mock findings based on suspicion level."""
        if is_suspicious:
            return [
                "Unusual transaction pattern detected",
                "Geographic anomaly identified",
                "Device fingerprint mismatch",
            ]
        else:
            return [
                "Transaction pattern normal",
                "Location verified",
                "Device fingerprint matches",
            ]


async def test_multi_agent_investigation():
    """Test a multi-agent fraud investigation with Langfuse tracing."""
    logger.info("Starting multi-agent investigation test")

    # Initialize Langfuse
    langfuse = Langfuse(
        secret_key="sk-lf-dae99134-c97c-41ef-b98a-b88861d66fdd",
        public_key="pk-lf-0c1b17de-e7c1-43a1-bc05-e15231c5d00a",
        host="https://us.cloud.langfuse.com",
        release="olorin-1.0.0",
    )

    # Create investigation trace
    investigation_id = f"inv_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    trace = langfuse.trace(
        name=f"investigation_{investigation_id}",
        user_id="test_user",
        metadata={
            "investigation_id": investigation_id,
            "entity_type": "transaction",
            "entity_id": "tx_12345",
        },
        tags=["multi_agent", "fraud_detection", "test"],
    )

    logger.info(f"Created investigation trace: {trace.id}")

    # Create mock agents
    agents = [
        MockFraudAgent("network_agent", langfuse),
        MockFraudAgent("device_agent", langfuse),
        MockFraudAgent("location_agent", langfuse),
        MockFraudAgent("logs_agent", langfuse),
        MockFraudAgent("risk_agent", langfuse),
    ]

    # Test data
    test_data = {
        "transaction_id": "tx_12345",
        "amount": 5000.00,
        "merchant": "Online Store XYZ",
        "timestamp": datetime.now().isoformat(),
        "ip": "192.168.1.100",
        "device_id": "device_abc123",
    }

    # Run agents in parallel
    logger.info("Running agents in parallel...")
    agent_tasks = [agent.analyze(test_data, trace.id) for agent in agents]

    results = await asyncio.gather(*agent_tasks)

    # Aggregate results
    total_risk = sum(r["risk_score"] for r in results) / len(results)
    suspicious_count = sum(1 for r in results if r["is_suspicious"])

    investigation_result = {
        "investigation_id": investigation_id,
        "total_risk_score": total_risk,
        "suspicious_agents": suspicious_count,
        "agent_results": results,
        "final_verdict": "FRAUD" if total_risk > 0.6 else "LEGITIMATE",
    }

    # Log investigation summary
    logger.info(f"Investigation complete:")
    logger.info(f"  - Total risk score: {total_risk:.2f}")
    logger.info(f"  - Suspicious agents: {suspicious_count}/{len(agents)}")
    logger.info(f"  - Final verdict: {investigation_result['final_verdict']}")

    # Update trace with final results
    trace.update(output=investigation_result, level="DEFAULT")

    # Add scores
    langfuse.score(
        trace_id=trace.id,
        name="investigation_confidence",
        value=abs(total_risk - 0.5) * 2,  # Confidence based on distance from 0.5
        comment="Confidence in the investigation result",
    )

    langfuse.score(
        trace_id=trace.id,
        name="agent_consensus",
        value=(
            1.0 - (suspicious_count / len(agents) - 0.5) * 2
            if suspicious_count != len(agents) / 2
            else 0
        ),
        comment="Level of agreement among agents",
    )

    # Flush traces
    langfuse.flush()

    logger.info(f"✅ Investigation completed. Trace ID: {trace.id}")
    return trace.id


async def test_error_recovery():
    """Test error handling and recovery with Langfuse tracing."""
    logger.info("Starting error recovery test")

    langfuse = Langfuse(
        secret_key="sk-lf-dae99134-c97c-41ef-b98a-b88861d66fdd",
        public_key="pk-lf-0c1b17de-e7c1-43a1-bc05-e15231c5d00a",
        host="https://us.cloud.langfuse.com",
    )

    trace = langfuse.trace(
        name="error_recovery_test", metadata={"test_type": "error_handling"}
    )

    # Simulate operations with potential failures
    operations = ["data_fetch", "validation", "analysis", "reporting"]

    for operation in operations:
        span = langfuse.span(trace_id=trace.id, name=operation)

        try:
            # Simulate random failures
            if random.random() < 0.3:  # 30% chance of failure
                raise Exception(f"Simulated failure in {operation}")

            # Simulate successful operation
            await asyncio.sleep(0.5)
            span.update(
                output={"status": "success", "operation": operation}, level="DEFAULT"
            )
            logger.info(f"✅ {operation} completed successfully")

        except Exception as e:
            # Handle and trace the error
            span.update(output={"status": "error", "error": str(e)}, level="ERROR")
            logger.error(f"❌ {operation} failed: {e}")

            # Attempt recovery
            recovery_span = langfuse.span(
                trace_id=trace.id, name=f"{operation}_recovery"
            )

            await asyncio.sleep(0.3)  # Simulate recovery attempt

            recovery_span.update(
                output={"status": "recovered", "operation": operation}, level="WARNING"
            )
            recovery_span.end()
            logger.info(f"🔄 {operation} recovered")

        finally:
            span.end()

    trace.update(output={"status": "completed_with_recovery"}, level="DEFAULT")

    langfuse.flush()
    logger.info(f"✅ Error recovery test completed. Trace ID: {trace.id}")
    return trace.id


async def test_performance_monitoring():
    """Test performance monitoring with Langfuse."""
    logger.info("Starting performance monitoring test")

    langfuse = Langfuse(
        secret_key="sk-lf-dae99134-c97c-41ef-b98a-b88861d66fdd",
        public_key="pk-lf-0c1b17de-e7c1-43a1-bc05-e15231c5d00a",
        host="https://us.cloud.langfuse.com",
    )

    trace = langfuse.trace(
        name="performance_monitoring", metadata={"test_type": "performance"}
    )

    # Simulate different performance scenarios
    scenarios = [
        ("fast_operation", 0.1, 0.2),
        ("normal_operation", 0.5, 0.7),
        ("slow_operation", 1.0, 2.0),
        ("variable_operation", 0.1, 3.0),
    ]

    for name, min_time, max_time in scenarios:
        span = langfuse.span(
            trace_id=trace.id,
            name=name,
            metadata={"expected_range": f"{min_time}-{max_time}s"},
        )

        # Simulate variable processing time
        processing_time = random.uniform(min_time, max_time)
        await asyncio.sleep(processing_time)

        # Determine performance level
        if processing_time < 0.5:
            performance = "excellent"
        elif processing_time < 1.0:
            performance = "good"
        elif processing_time < 2.0:
            performance = "acceptable"
        else:
            performance = "poor"

        span.update(
            output={"processing_time": processing_time, "performance": performance},
            level="DEFAULT",
        )
        span.end()

        logger.info(f"  {name}: {processing_time:.2f}s ({performance})")

    trace.update(output={"status": "performance_analysis_complete"}, level="DEFAULT")

    langfuse.flush()
    logger.info(f"✅ Performance monitoring completed. Trace ID: {trace.id}")
    return trace.id


async def main():
    """Main test function."""
    logger.info("=" * 60)
    logger.info("Langfuse Integration Tests for Olorin (No OpenAI)")
    logger.info("=" * 60)

    trace_ids = []

    # Test 1: Multi-agent investigation
    logger.info("\n📝 Test 1: Multi-Agent Investigation")
    trace_id = await test_multi_agent_investigation()
    trace_ids.append(trace_id)

    # Test 2: Error recovery
    logger.info("\n📝 Test 2: Error Recovery")
    trace_id = await test_error_recovery()
    trace_ids.append(trace_id)

    # Test 3: Performance monitoring
    logger.info("\n📝 Test 3: Performance Monitoring")
    trace_id = await test_performance_monitoring()
    trace_ids.append(trace_id)

    logger.info("\n" + "=" * 60)
    logger.info("All tests completed successfully!")
    logger.info("\nView your traces in Langfuse:")
    logger.info("https://us.cloud.langfuse.com")
    logger.info("\nTrace IDs:")
    for trace_id in trace_ids:
        logger.info(f"  - {trace_id}")
    logger.info("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
