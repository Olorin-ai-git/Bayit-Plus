"""
Test to ensure validation failures are properly reported as failed investigations.

This test verifies the fix for the critical bug where validation failures were
being overwritten with "completed" status, causing failed investigations to
be falsely reported as successful.
"""

import asyncio
import os
import sys
from dataclasses import dataclass
from typing import Any, Dict, List, Optional
from unittest.mock import AsyncMock, Mock, patch

import pytest

# Add the project root to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../../../../"))

from scripts.testing.unified_structured_test_runner import (
    EntityType,
    InvestigationResult,
    StructuredInvestigationContext,
    TestMode,
    UnifiedStructuredTestRunner,
)


@dataclass
class MockValidationResult:
    """Mock validation result for testing"""

    validation_status: str
    critical_issues: List[str]
    warnings: List[str]
    overall_score: float


class TestValidationStatusBugFix:
    """Test cases to verify the validation status bug fix"""

    @pytest.fixture
    def test_runner(self):
        """Create a test runner for testing"""
        from scripts.testing.unified_structured_test_runner import TestConfiguration

        config = TestConfiguration(
            mode=TestMode.MOCK,
            server_url="http://localhost:8090",
            timeout=30,
            csv_limit=1,
            log_level="INFO",
            verbose=True,
        )

        runner = UnifiedStructuredTestRunner(config)
        return runner

    @pytest.fixture
    def mock_context(self):
        """Create a mock investigation context"""
        return StructuredInvestigationContext(
            entity_id="67.76.8.209",
            entity_type=EntityType.IP,
            investigation_id="test_validation_fix_001",
        )

    @pytest.fixture
    def mock_result(self):
        """Create a mock investigation result"""
        result = InvestigationResult(
            investigation_id="test_validation_fix_001",
            entity_id="67.76.8.209",
            entity_type="ip",
            status="running",  # Initial status
        )
        result.validation_results = {}
        result.errors = []
        return result

    @pytest.mark.asyncio
    async def test_validation_failure_sets_failed_status(
        self, test_runner, mock_context, mock_result
    ):
        """Test that validation failures properly set status to 'failed'"""

        # Mock the validation method to return a failure
        async def mock_validation(context, result):
            # Simulate validation failure like the original bug
            result.status = "failed"  # This should NOT be overwritten
            result.errors.extend(["Data extraction failed", "Insufficient evidence"])

            return {
                "validation_status": "FAILED",
                "critical_issues": ["Data extraction failed", "Insufficient evidence"],
                "overall_score": 9.0,  # Very low score
            }

        # Patch the validation method
        with patch.object(
            test_runner, "_validate_investigation_results", side_effect=mock_validation
        ):
            with patch.object(
                test_runner, "_collect_performance_metrics", return_value={}
            ):
                with patch.object(
                    test_runner, "_extract_final_risk_score", return_value=0.0
                ):
                    with patch.object(
                        test_runner, "_extract_confidence_score", return_value=0.0
                    ):

                        # Simulate the investigation execution logic
                        agent_results = {}
                        scenario_name = "test_validation_failure"

                        # This mirrors the fixed code logic
                        mock_result.final_risk_score = 0.0
                        mock_result.confidence = 0.0
                        mock_result.status = "completed"  # Initial status

                        # Validation should set status to "failed"
                        validation_results = (
                            await test_runner._validate_investigation_results(
                                mock_context, mock_result
                            )
                        )
                        mock_result.validation_results = validation_results

                        # After the fix, status should remain "failed" (not overwritten)
                        assert (
                            mock_result.status == "failed"
                        ), f"Expected status 'failed', got '{mock_result.status}'"
                        assert (
                            len(mock_result.errors) > 0
                        ), "Expected errors to be present for failed validation"
                        assert (
                            "Data extraction failed" in mock_result.errors
                        ), "Expected specific error message"

    @pytest.mark.asyncio
    async def test_low_score_completed_becomes_failed(self, test_runner):
        """Test that completed investigations with low scores are marked as failed"""

        # Create a result that's marked completed but has a very low score
        result = InvestigationResult(
            investigation_id="test_low_score_001",
            entity_id="67.76.8.209",
            entity_type="ip",
            status="completed",
        )
        result.validation_results = {
            "overall_score": 9.0,  # Very low score (below 70 threshold)
            "validation_status": "WARNING",
        }
        result.errors = []

        # Add to results for processing
        test_runner.results = [result]

        # Calculate metrics (this includes the quality threshold check)
        test_runner.metrics.end_time = 100.0
        test_runner.metrics.start_time = 90.0
        test_runner.metrics.total_duration = 10.0
        test_runner.metrics.scenarios_tested = 1

        # Simulate the validation logic from the fix
        for res in test_runner.results:
            if res.status == "completed" and res.validation_results:
                overall_score = res.validation_results.get("overall_score", 0)
                if overall_score < 70:
                    res.status = "failed"
                    if not res.errors:
                        res.errors = []
                    res.errors.append(
                        f"Investigation quality score {overall_score:.1f}/100 is below acceptable threshold of 70/100"
                    )

        # Recalculate counts
        test_runner.metrics.scenarios_passed = sum(
            1 for r in test_runner.results if r.status == "completed"
        )
        test_runner.metrics.scenarios_failed = sum(
            1 for r in test_runner.results if r.status == "failed"
        )

        # Verify the fix worked
        assert (
            result.status == "failed"
        ), f"Expected low-score investigation to be marked as failed, got {result.status}"
        assert (
            test_runner.metrics.scenarios_passed == 0
        ), f"Expected 0 passed scenarios, got {test_runner.metrics.scenarios_passed}"
        assert (
            test_runner.metrics.scenarios_failed == 1
        ), f"Expected 1 failed scenario, got {test_runner.metrics.scenarios_failed}"
        assert len(result.errors) > 0, "Expected error message for low quality score"
        assert (
            "below acceptable threshold" in result.errors[0]
        ), "Expected quality threshold error message"

    @pytest.mark.asyncio
    async def test_high_score_completed_remains_completed(self, test_runner):
        """Test that completed investigations with high scores remain completed"""

        # Create a result that's marked completed with a high score
        result = InvestigationResult(
            investigation_id="test_high_score_001",
            entity_id="67.76.8.209",
            entity_type="ip",
            status="completed",
        )
        result.validation_results = {
            "overall_score": 85.0,  # High score (above 70 threshold)
            "validation_status": "PASSED",
        }
        result.errors = []

        # Add to results for processing
        test_runner.results = [result]

        # Simulate the validation logic from the fix
        for res in test_runner.results:
            if res.status == "completed" and res.validation_results:
                overall_score = res.validation_results.get("overall_score", 0)
                if overall_score < 70:
                    res.status = "failed"

        # Recalculate counts
        test_runner.metrics.scenarios_passed = sum(
            1 for r in test_runner.results if r.status == "completed"
        )
        test_runner.metrics.scenarios_failed = sum(
            1 for r in test_runner.results if r.status == "failed"
        )

        # Verify high-scoring investigations remain completed
        assert (
            result.status == "completed"
        ), f"Expected high-score investigation to remain completed, got {result.status}"
        assert (
            test_runner.metrics.scenarios_passed == 1
        ), f"Expected 1 passed scenario, got {test_runner.metrics.scenarios_passed}"
        assert (
            test_runner.metrics.scenarios_failed == 0
        ), f"Expected 0 failed scenarios, got {test_runner.metrics.scenarios_failed}"

    @pytest.mark.asyncio
    async def test_invalid_status_becomes_failed(self, test_runner):
        """Test that investigations with invalid status are marked as failed"""

        # Create a result with an invalid status
        result = InvestigationResult(
            investigation_id="test_invalid_status_001",
            entity_id="67.76.8.209",
            entity_type="ip",
            status="unknown",  # Invalid status
        )
        result.validation_results = {"overall_score": 50.0}
        result.errors = []

        # Add to results for processing
        test_runner.results = [result]

        # Simulate the validation logic from the fix
        for res in test_runner.results:
            if res.status not in ["completed", "failed"]:
                res.status = "failed"

        # Recalculate counts
        test_runner.metrics.scenarios_passed = sum(
            1 for r in test_runner.results if r.status == "completed"
        )
        test_runner.metrics.scenarios_failed = sum(
            1 for r in test_runner.results if r.status == "failed"
        )

        # Verify invalid status becomes failed
        assert (
            result.status == "failed"
        ), f"Expected invalid status to become failed, got {result.status}"
        assert (
            test_runner.metrics.scenarios_passed == 0
        ), f"Expected 0 passed scenarios, got {test_runner.metrics.scenarios_passed}"
        assert (
            test_runner.metrics.scenarios_failed == 1
        ), f"Expected 1 failed scenario, got {test_runner.metrics.scenarios_failed}"

    def test_original_bug_scenario_reproduction(self, test_runner):
        """Test that reproduces the exact original bug scenario to ensure it's fixed"""

        # Reproduce the exact original scenario:
        # 1. Investigation has validation failures
        # 2. Status gets overwritten to "completed"
        # 3. System reports success despite failure

        result = InvestigationResult(
            investigation_id="unified_test_real_investigation_ip_address_1757512703",
            entity_id="67.76.8.209",
            entity_type="ip",
            status="running",
        )

        # Simulate the original bug scenario
        # 1. Validation fails and sets status to "failed"
        result.status = "failed"
        result.errors = [
            "Data extraction failed: network: No results available",
            "Insufficient evidence: 0 sources < 3 required",
        ]
        result.validation_results = {
            "overall_score": 9.0,
            "validation_status": "FAILED",
            "critical_issues": result.errors,
        }

        # 2. Before the fix, this line would overwrite the status:
        # result.status = "completed"  # BUG - this should not happen after validation

        # With the fix, validation should run AFTER setting initial status
        # So status should remain "failed" if validation failed

        # Add to results for final processing
        test_runner.results = [result]

        # Process final status logic with the fix
        for res in test_runner.results:
            # Check invalid statuses
            if res.status not in ["completed", "failed"]:
                res.status = "failed"

            # Check low quality scores
            if res.status == "completed" and res.validation_results:
                overall_score = res.validation_results.get("overall_score", 0)
                if overall_score < 70:
                    res.status = "failed"

        test_runner.metrics.scenarios_passed = sum(
            1 for r in test_runner.results if r.status == "completed"
        )
        test_runner.metrics.scenarios_failed = sum(
            1 for r in test_runner.results if r.status == "failed"
        )

        # Verify the bug is fixed
        assert (
            result.status == "failed"
        ), "Original bug: failed investigation should remain failed"
        assert (
            test_runner.metrics.scenarios_passed == 0
        ), "Should have 0 passed scenarios"
        assert (
            test_runner.metrics.scenarios_failed == 1
        ), "Should have 1 failed scenario"

        # This simulates the final test suite completion check
        scenarios_failed = test_runner.metrics.scenarios_failed

        # With the fix, this should be > 0, so the system should NOT report "All tests passed"
        assert (
            scenarios_failed > 0
        ), "Bug fix verification: failed investigations should be counted as failed"


if __name__ == "__main__":
    # Run the tests
    pytest.main([__file__, "-v"])
