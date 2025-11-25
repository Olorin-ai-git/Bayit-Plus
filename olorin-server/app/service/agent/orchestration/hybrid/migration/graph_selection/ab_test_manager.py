"""
A/B Testing Management for Graph Selection

Handles A/B test assignments and tracking for comparing
different graph implementations.
"""

from datetime import datetime
from typing import Any, Dict, Optional

from app.service.logging import get_bridge_logger

from ..feature_flags.flag_manager import FeatureFlags, GraphType

logger = get_bridge_logger(__name__)


class ABTestManager:
    """
    Manages A/B testing for graph selection.

    Provides deterministic assignment of investigations to test cohorts
    and tracks test performance metrics.
    """

    def __init__(self, feature_flags: FeatureFlags):
        self.feature_flags = feature_flags
        self.test_assignments = {}  # Cache for assignment tracking

    def get_ab_test_assignment(
        self, investigation_id: str, test_name: str = "hybrid_vs_clean"
    ) -> Optional[GraphType]:
        """
        Get A/B test assignment for an investigation.

        Args:
            investigation_id: Investigation identifier
            test_name: Name of the A/B test

        Returns:
            Assigned graph type, or None if A/B testing is disabled
        """

        # Check if A/B testing is enabled
        ab_flag_name = f"ab_test_{test_name}"
        if not self.feature_flags.is_enabled(ab_flag_name, investigation_id):
            logger.debug(f"🧪 A/B test disabled: {test_name}")
            return None

        # Calculate assignment
        assignment = self._calculate_assignment(investigation_id, test_name)

        # Cache assignment for tracking
        self._record_assignment(investigation_id, test_name, assignment)

        logger.info(f"🧪 A/B test assignment: {investigation_id} → {assignment.value}")
        logger.debug(f"   Test: {test_name}")

        return assignment

    def _calculate_assignment(self, investigation_id: str, test_name: str) -> GraphType:
        """
        Calculate A/B test assignment using hash-based splitting.

        Args:
            investigation_id: Investigation identifier
            test_name: Name of the A/B test

        Returns:
            Assigned graph type
        """

        # Get test configuration
        ab_flag_name = f"ab_test_{test_name}"
        flag_config = self.feature_flags.get_flag_status(ab_flag_name)
        test_split = flag_config.get("test_split", 50)

        # Calculate hash-based assignment
        hash_input = f"ab_test:{test_name}:{investigation_id}"
        hash_value = abs(hash(hash_input)) % 100

        # Assign based on split percentage
        if hash_value < test_split:
            assignment = GraphType.HYBRID
        else:
            assignment = GraphType.CLEAN

        logger.debug(f"🧪 A/B assignment calculation:")
        logger.debug(f"   Test: {test_name}")
        logger.debug(f"   Split: {test_split}% hybrid, {100-test_split}% clean")
        logger.debug(f"   Hash: {hash_value}")
        logger.debug(f"   Assignment: {assignment.value}")

        return assignment

    def _record_assignment(
        self, investigation_id: str, test_name: str, assignment: GraphType
    ):
        """
        Record A/B test assignment for tracking.

        Args:
            investigation_id: Investigation identifier
            test_name: Name of the A/B test
            assignment: Assigned graph type
        """

        assignment_record = {
            "investigation_id": investigation_id,
            "test_name": test_name,
            "assignment": assignment.value,
            "timestamp": datetime.now().isoformat(),
            "flag_config": self.feature_flags.get_flag_status(f"ab_test_{test_name}"),
        }

        # Cache assignment
        cache_key = f"{test_name}:{investigation_id}"
        self.test_assignments[cache_key] = assignment_record

        logger.debug(f"📊 A/B assignment recorded: {assignment.value}")

    def get_assignment_history(
        self, investigation_id: Optional[str] = None, test_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get A/B test assignment history.

        Args:
            investigation_id: Filter by investigation ID (optional)
            test_name: Filter by test name (optional)

        Returns:
            Dictionary of assignment records
        """

        if investigation_id and test_name:
            cache_key = f"{test_name}:{investigation_id}"
            record = self.test_assignments.get(cache_key)
            return {cache_key: record} if record else {}

        # Filter by criteria
        filtered_assignments = {}

        for key, record in self.test_assignments.items():
            if investigation_id and record["investigation_id"] != investigation_id:
                continue
            if test_name and record["test_name"] != test_name:
                continue

            filtered_assignments[key] = record

        return filtered_assignments

    def start_ab_test(self, test_name: str = "hybrid_vs_clean", test_split: int = 50):
        """
        Start an A/B test with specified parameters.

        Args:
            test_name: Name of the A/B test
            test_split: Percentage split for hybrid graph (0-100)
        """

        ab_flag_name = f"ab_test_{test_name}"

        # Update feature flag configuration
        if ab_flag_name in self.feature_flags.flags:
            self.feature_flags.flags[ab_flag_name].update(
                {
                    "enabled": True,
                    "rollout_percentage": 100,
                    "test_split": test_split,
                    "test_started": datetime.now().isoformat(),
                }
            )

        logger.info(f"🧪 A/B test started: {test_name}")
        logger.info(f"   Split: {test_split}% hybrid, {100-test_split}% clean")

    def stop_ab_test(self, test_name: str = "hybrid_vs_clean"):
        """
        Stop an A/B test.

        Args:
            test_name: Name of the A/B test to stop
        """

        ab_flag_name = f"ab_test_{test_name}"
        self.feature_flags.disable_flag(ab_flag_name, "ab_test_complete")

        logger.info(f"🧪 A/B test stopped: {test_name}")

    def is_in_test_cohort(
        self, investigation_id: str, test_name: str, target_cohort: GraphType
    ) -> bool:
        """
        Check if investigation is in a specific test cohort.

        Args:
            investigation_id: Investigation identifier
            test_name: Name of the A/B test
            target_cohort: Target graph type cohort

        Returns:
            True if investigation is in target cohort
        """

        assignment = self._calculate_assignment(investigation_id, test_name)
        return assignment == target_cohort
