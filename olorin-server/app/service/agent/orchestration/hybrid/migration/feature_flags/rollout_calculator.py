"""
Percentage-based Rollout Logic for Feature Flags

Provides deterministic, hash-based rollout calculations
for gradual feature deployments.
"""

from typing import Optional

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class RolloutCalculator:
    """
    Calculates whether a feature should be enabled based on rollout percentage.
    
    Uses deterministic hash-based calculation to ensure consistent assignments.
    """
    
    def __init__(self):
        self.hash_seed = "hybrid_intelligence_rollout"
    
    def should_enable(
        self, 
        rollout_percentage: int, 
        investigation_id: Optional[str] = None,
        flag_name: str = "unknown"
    ) -> bool:
        """
        Determine if feature should be enabled based on rollout percentage.
        
        Args:
            rollout_percentage: Percentage of users to enable feature for (0-100)
            investigation_id: Investigation ID for hash-based assignment
            flag_name: Name of the feature flag (for logging)
            
        Returns:
            True if feature should be enabled for this investigation
        """
        
        # Handle edge cases
        if rollout_percentage >= 100:
            logger.debug(f"🚩 Full rollout enabled for {flag_name}")
            return True
        
        if rollout_percentage <= 0:
            logger.debug(f"🚩 Feature disabled for {flag_name}")
            return False
        
        # Require investigation ID for percentage rollout
        if not investigation_id:
            logger.debug(f"🚩 No investigation ID - enabling {flag_name} by default")
            return True
        
        # Calculate hash-based assignment
        hash_value = self._calculate_hash(investigation_id, flag_name)
        is_enabled = hash_value < rollout_percentage
        
        logger.debug(f"🚩 {flag_name} rollout calculation:")
        logger.debug(f"   Rollout percentage: {rollout_percentage}%")
        logger.debug(f"   Investigation: {investigation_id}")
        logger.debug(f"   Hash value: {hash_value}")
        logger.debug(f"   Enabled: {is_enabled}")
        
        return is_enabled
    
    def _calculate_hash(self, investigation_id: str, flag_name: str) -> int:
        """
        Calculate deterministic hash value for rollout assignment.
        
        Args:
            investigation_id: Investigation identifier
            flag_name: Feature flag name
            
        Returns:
            Hash value between 0-99 (inclusive)
        """
        
        # Create stable hash input
        hash_input = f"{self.hash_seed}:{flag_name}:{investigation_id}"
        
        # Calculate hash and normalize to 0-99 range
        hash_value = abs(hash(hash_input)) % 100
        
        return hash_value
    
    def get_rollout_assignment(
        self, 
        investigation_id: str, 
        flag_name: str = "test"
    ) -> int:
        """
        Get rollout assignment hash for an investigation.
        
        Args:
            investigation_id: Investigation identifier
            flag_name: Feature flag name
            
        Returns:
            Hash value between 0-99 (for rollout assignment)
        """
        
        return self._calculate_hash(investigation_id, flag_name)
    
    def calculate_rollout_cohort(
        self, 
        investigation_id: str, 
        cohort_count: int = 10,
        flag_name: str = "cohort"
    ) -> int:
        """
        Calculate which rollout cohort an investigation belongs to.
        
        Args:
            investigation_id: Investigation identifier
            cohort_count: Number of cohorts (default 10)
            flag_name: Feature flag name
            
        Returns:
            Cohort number (0 to cohort_count-1)
        """
        
        hash_value = self._calculate_hash(investigation_id, flag_name)
        cohort = hash_value % cohort_count
        
        logger.debug(f"🚩 Cohort assignment for {flag_name}:")
        logger.debug(f"   Investigation: {investigation_id}")
        logger.debug(f"   Hash: {hash_value}")
        logger.debug(f"   Cohort: {cohort} (of {cohort_count})")
        
        return cohort
    
    def is_in_rollout_cohort(
        self,
        investigation_id: str,
        target_cohort: int,
        cohort_count: int = 10,
        flag_name: str = "cohort"
    ) -> bool:
        """
        Check if investigation is in a specific rollout cohort.
        
        Args:
            investigation_id: Investigation identifier
            target_cohort: Target cohort number
            cohort_count: Total number of cohorts
            flag_name: Feature flag name
            
        Returns:
            True if investigation is in target cohort
        """
        
        actual_cohort = self.calculate_rollout_cohort(
            investigation_id, cohort_count, flag_name
        )
        
        return actual_cohort == target_cohort