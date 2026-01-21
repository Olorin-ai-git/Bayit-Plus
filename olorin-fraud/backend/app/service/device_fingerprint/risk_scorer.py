"""
Device Risk Scorer Service

Computes device risk scores based on device features (shared_device_count, device_age).
"""

import logging
from typing import Any, Dict, Optional

from sqlalchemy import text

from app.persistence.database import get_db_session
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class DeviceRiskScorer:
    """
    Computes device risk scores from device features.

    Features:
    - shared_device_count: Number of unique users sharing the device
    - device_age: Time since device was first seen
    - device_risk_score: Computed risk score (0.0-1.0)
    """

    def __init__(self):
        """
        Initialize device risk scorer.
        """
        pass

    def compute_device_risk_score(self, device_id: str) -> Dict[str, Any]:
        """
        Compute device risk score from device features.

        Args:
            device_id: Device ID to analyze

        Returns:
            Dictionary with risk_score, shared_device_count, device_age_days, risk_factors
        """
        try:
            # Query device features from Snowflake views
            # For now, return placeholder - actual implementation would query Snowflake

            # Placeholder logic:
            # 1. Query device_features_shared_count view for shared_device_count
            # 2. Query device_features_age view for device_age_days
            # 3. Compute risk_score using logic:
            #    - High risk (0.9): shared_device_count > 10
            #    - Medium-high (0.7): shared_device_count > 5
            #    - Medium (0.5): shared_device_count > 2
            #    - Medium (0.6): device_age_days < 1 (new device)
            #    - Medium-low (0.4): device_age_days < 7
            #    - Low (0.2): established device with single user

            logger.info(f"Computing device risk score for device_id: {device_id}")

            # Query device features from Snowflake views
            features = self.get_device_features(device_id)
            shared_device_count = features.get("shared_device_count", 0)
            device_age_days = features.get("device_age_days", 0)

            # Compute risk score based on features
            risk_score = 0.2  # Default low risk
            risk_factors = []

            # High risk: device shared across many accounts
            if shared_device_count > 10:
                risk_score = 0.9
                risk_factors.append(
                    f"Device shared across {shared_device_count} accounts"
                )
            elif shared_device_count > 5:
                risk_score = 0.7
                risk_factors.append(
                    f"Device shared across {shared_device_count} accounts"
                )
            elif shared_device_count > 2:
                risk_score = 0.5
                risk_factors.append(
                    f"Device shared across {shared_device_count} accounts"
                )

            # Medium risk: new device (potential fraud)
            if device_age_days < 1:
                risk_score = max(risk_score, 0.6)
                risk_factors.append("New device (first seen < 1 day ago)")
            elif device_age_days < 7:
                risk_score = max(risk_score, 0.4)
                risk_factors.append("Recent device (first seen < 7 days ago)")

            from datetime import datetime

            return {
                "device_id": device_id,
                "risk_score": risk_score,
                "shared_device_count": shared_device_count,
                "device_age_days": device_age_days,
                "risk_factors": risk_factors,
                "computed_at": datetime.utcnow().isoformat(),
            }

        except Exception as e:
            logger.error(f"Failed to compute device risk score: {e}", exc_info=True)
            return {
                "device_id": device_id,
                "risk_score": 0.5,  # Default to medium risk on error
                "error": str(e),
            }

    def get_device_features(self, device_id: str) -> Dict[str, Any]:
        """
        Get device features (shared_device_count, device_age).

        Args:
            device_id: Device ID

        Returns:
            Dictionary with device features
        """
        try:
            # Query device_features_shared_count and device_features_age views
            # For now, return placeholder

            logger.info(f"Getting device features for device_id: {device_id}")

            # Query device_features_shared_count view from PostgreSQL
            with get_db_session() as db:
                # Query shared device count
                shared_count_query = text(
                    """
                    SELECT shared_device_count, transaction_count, first_seen, last_seen
                    FROM device_features_shared_count
                    WHERE device_id = :device_id
                    LIMIT 1
                """
                )
                shared_result = db.execute(
                    shared_count_query, {"device_id": device_id}
                ).fetchone()

                # Query device age
                age_query = text(
                    """
                    SELECT device_age_days, device_age_hours, first_seen
                    FROM device_features_age
                    WHERE device_id = :device_id
                    LIMIT 1
                """
                )
                age_result = db.execute(age_query, {"device_id": device_id}).fetchone()

                # Extract results
                shared_data = dict(shared_result._mapping) if shared_result else {}
                age_data = dict(age_result._mapping) if age_result else {}

            return {
                "device_id": device_id,
                "shared_device_count": shared_data.get("shared_device_count", 0),
                "device_age_days": age_data.get("device_age_days", 0),
                "first_seen": shared_data.get("first_seen")
                or age_data.get("first_seen"),
                "last_seen": shared_data.get("last_seen"),
            }

        except Exception as e:
            logger.error(f"Failed to get device features: {e}", exc_info=True)
            raise
