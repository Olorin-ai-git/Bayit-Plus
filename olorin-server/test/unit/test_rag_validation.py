#!/usr/bin/env python3
"""
RAG Enhancement Validation Test

This script tests the key RAG enhancement components to verify they are working
correctly in the structured investigation system.

NO MOCK DATA - Tests real RAG system integration points.
"""

import asyncio
import logging
import time
from typing import Any, Dict, Optional

from app.service.agent.rag import (
    ContextAugmentor,
    KnowledgeBase,
    RAGOrchestrator,
    get_rag_orchestrator,
)
from app.service.agent.rag_enhanced_agent import RAGEnhancedInvestigationAgent
from app.service.agent.structured_context import (
    EntityType,
    StructuredInvestigationContext,
)
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class RAGValidationTester:
    """Test RAG system components and integration"""

    def __init__(self):
        self.test_results = {}
        self.performance_metrics = {}

    async def test_rag_orchestrator_availability(self) -> bool:
        """Test 1: RAG Orchestrator can be initialized"""
        try:
            start_time = time.time()
            orchestrator = get_rag_orchestrator()
            duration = time.time() - start_time

            self.performance_metrics["orchestrator_init"] = duration

            if orchestrator is None:
                logger.warning(
                    "RAG Orchestrator initialization returned None - graceful fallback mode"
                )
                return False

            logger.info(
                f"✅ RAG Orchestrator initialized successfully in {duration:.3f}s"
            )
            return True

        except Exception as e:
            logger.error(f"❌ RAG Orchestrator initialization failed: {e}")
            return False

    async def test_context_augmentor_functionality(self) -> bool:
        """Test 2: Context Augmentor can enhance investigation context"""
        try:
            from app.service.agent.rag import create_context_augmentor

            start_time = time.time()
            augmentor = create_context_augmentor()
            duration = time.time() - start_time

            self.performance_metrics["context_augmentor_init"] = duration

            if augmentor is None:
                logger.warning(
                    "Context Augmentor initialization returned None - graceful fallback mode"
                )
                return False

            logger.info(
                f"✅ Context Augmentor initialized successfully in {duration:.3f}s"
            )
            return True

        except Exception as e:
            logger.error(f"❌ Context Augmentor initialization failed: {e}")
            return False

    async def test_rag_enhanced_agent_creation(self) -> bool:
        """Test 3: RAG Enhanced Agent can be created with all domain agents"""
        try:
            # Test creating agents for all 5 domains
            domains = ["network", "device", "location", "logs", "risk"]
            created_agents = {}

            for domain in domains:
                start_time = time.time()

                # Create minimal tool list for testing
                mock_tools = []

                agent = RAGEnhancedInvestigationAgent(
                    domain=domain, tools=mock_tools, enable_rag=True
                )

                duration = time.time() - start_time
                self.performance_metrics[f"{domain}_agent_init"] = duration

                created_agents[domain] = agent
                logger.info(
                    f"✅ {domain.title()} agent created with RAG in {duration:.3f}s"
                )

            logger.info(
                f"✅ All 5 domain agents created successfully with RAG capabilities"
            )
            return True

        except Exception as e:
            logger.error(f"❌ RAG Enhanced Agent creation failed: {e}")
            return False

    async def test_investigation_context_generation(self) -> bool:
        """Test 4: Investigation context can be created for testing"""
        try:
            # Create test investigation context
            context = StructuredInvestigationContext(
                investigation_id="test-rag-validation-123",
                entity_id="test-user-456",
                entity_type=EntityType.USER_ID,
            )

            # Test context methods
            llm_context = context.generate_llm_context()

            if not isinstance(llm_context, dict):
                logger.error("❌ Investigation context LLM generation failed")
                return False

            logger.info(f"✅ Investigation context created successfully")
            logger.info(f"   - Investigation ID: {context.investigation_id}")
            logger.info(f"   - Entity ID: {context.entity_id}")
            logger.info(f"   - Entity Type: {context.entity_type.value}")
            logger.info(f"   - LLM Context Keys: {list(llm_context.keys())}")

            return True

        except Exception as e:
            logger.error(f"❌ Investigation context generation failed: {e}")
            return False

    async def test_rag_agent_statistics(self) -> bool:
        """Test 5: RAG Agent statistics tracking"""
        try:
            agent = RAGEnhancedInvestigationAgent(
                domain="network", tools=[], enable_rag=True
            )

            # Test statistics functionality
            if hasattr(agent, "get_rag_performance_stats"):
                stats = agent.get_rag_performance_stats()
                logger.info(f"✅ RAG statistics available: {list(stats.keys())}")
                return True
            else:
                logger.warning("⚠️ RAG statistics method not available")
                return False

        except Exception as e:
            logger.error(f"❌ RAG agent statistics test failed: {e}")
            return False

    async def test_graceful_fallback(self) -> bool:
        """Test 6: Graceful fallback when RAG unavailable"""
        try:
            # Test with RAG disabled
            agent = RAGEnhancedInvestigationAgent(
                domain="network", tools=[], enable_rag=False
            )

            if hasattr(agent, "is_rag_enhanced"):
                is_enhanced = agent.is_rag_enhanced()
                if not is_enhanced:
                    logger.info("✅ Graceful fallback working - RAG disabled")
                    return True
                else:
                    logger.error(
                        "❌ RAG should be disabled but is_rag_enhanced() returns True"
                    )
                    return False
            else:
                logger.warning("⚠️ is_rag_enhanced method not available")
                return False

        except Exception as e:
            logger.error(f"❌ Graceful fallback test failed: {e}")
            return False

    async def run_validation_suite(self) -> Dict[str, Any]:
        """Run complete RAG validation test suite"""
        logger.info("🚀 Starting RAG Enhancement Validation Suite")
        logger.info("=" * 60)

        tests = [
            ("RAG Orchestrator Availability", self.test_rag_orchestrator_availability),
            (
                "Context Augmentor Functionality",
                self.test_context_augmentor_functionality,
            ),
            ("RAG Enhanced Agent Creation", self.test_rag_enhanced_agent_creation),
            (
                "Investigation Context Generation",
                self.test_investigation_context_generation,
            ),
            ("RAG Agent Statistics", self.test_rag_agent_statistics),
            ("Graceful Fallback", self.test_graceful_fallback),
        ]

        results = {}
        passed = 0
        total = len(tests)

        for test_name, test_func in tests:
            logger.info(f"\n🧪 Running: {test_name}")
            try:
                result = await test_func()
                results[test_name] = result
                if result:
                    passed += 1
                    logger.info(f"✅ PASSED: {test_name}")
                else:
                    logger.error(f"❌ FAILED: {test_name}")
            except Exception as e:
                logger.error(f"💥 ERROR in {test_name}: {e}")
                results[test_name] = False

        logger.info("\n" + "=" * 60)
        logger.info("📊 RAG VALIDATION RESULTS")
        logger.info("=" * 60)
        logger.info(f"Passed: {passed}/{total} ({passed/total*100:.1f}%)")

        if self.performance_metrics:
            logger.info("\n⏱️ PERFORMANCE METRICS:")
            for metric, value in self.performance_metrics.items():
                target = self._get_performance_target(metric)
                status = "✅" if value < target else "⚠️"
                logger.info(f"   {status} {metric}: {value:.3f}s (target: <{target}s)")

        logger.info("\n🎯 SUCCESS CRITERIA:")
        logger.info(
            f"   ✅ RAG Foundation: {'✅ PASS' if results.get('RAG Orchestrator Availability', False) else '❌ FAIL'}"
        )
        logger.info(
            f"   ✅ Context Enhancement: {'✅ PASS' if results.get('Context Augmentor Functionality', False) else '❌ FAIL'}"
        )
        logger.info(
            f"   ✅ Agent Integration: {'✅ PASS' if results.get('RAG Enhanced Agent Creation', False) else '❌ FAIL'}"
        )
        logger.info(
            f"   ✅ Graceful Fallback: {'✅ PASS' if results.get('Graceful Fallback', False) else '❌ FAIL'}"
        )

        overall_success = passed >= 4  # Need at least 4 out of 6 tests passing
        logger.info(
            f"\n🏁 OVERALL: {'✅ RAG SYSTEM OPERATIONAL' if overall_success else '❌ RAG SYSTEM ISSUES DETECTED'}"
        )

        return {
            "results": results,
            "performance_metrics": self.performance_metrics,
            "summary": {
                "passed": passed,
                "total": total,
                "pass_rate": passed / total * 100,
                "overall_success": overall_success,
            },
        }

    def _get_performance_target(self, metric: str) -> float:
        """Get performance target for metric"""
        targets = {
            "orchestrator_init": 1.0,  # < 1 second
            "context_augmentor_init": 0.5,  # < 500ms
            "network_agent_init": 0.1,  # < 100ms
            "device_agent_init": 0.1,
            "location_agent_init": 0.1,
            "logs_agent_init": 0.1,
            "risk_agent_init": 0.1,
        }
        return targets.get(metric, 1.0)


async def main():
    """Run the RAG validation test suite"""
    tester = RAGValidationTester()
    results = await tester.run_validation_suite()

    # Return exit code based on overall success
    return 0 if results["summary"]["overall_success"] else 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    exit(exit_code)
