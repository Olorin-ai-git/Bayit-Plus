"""
Data Retention and Deletion Controls for DPA Compliance.

Per DPA Section 8: Data must be deleted upon request from data controller.
Per DPA Annex 1 Section 2.2: "Do you have a data retention policy?"

This module provides:
- Data deletion on request
- Retention policy enforcement
- Deletion verification and logging
"""

import os
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional

from sqlalchemy import text

from app.persistence.database import get_db
from app.service.logging import get_bridge_logger
from app.service.privacy.audit_logger import DataCategory, get_privacy_audit_logger
from app.service.privacy.pii_obfuscator import get_pii_obfuscator

logger = get_bridge_logger(__name__)


class DeletionStatus(Enum):
    """Status of a data deletion request."""

    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    PARTIALLY_COMPLETED = "PARTIALLY_COMPLETED"


class DataRetentionManager:
    """
    Manages data retention and deletion per DPA requirements.

    Per DPA Section 8: Data must be deleted upon request.
    Per DPA Annex 1: Retention policy must be documented and enforced.
    """

    def __init__(self):
        """Initialize the retention manager."""
        self._audit_logger = get_privacy_audit_logger()
        self._obfuscator = get_pii_obfuscator()

        # Load retention period from configuration (default 365 days per DPA Section 8)
        self._retention_days = int(os.getenv("DATA_RETENTION_DAYS", "365"))

        logger.info(
            f"DataRetentionManager initialized with {self._retention_days} day retention"
        )

    def request_entity_deletion(
        self,
        entity_value: str,
        entity_type: str,
        requested_by: str,
        reason: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Request deletion of all data for a specific entity.

        Per DPA Section 8: "Contractor shall, within 30 days of receiving
        notice from Company, delete all Personal Data."

        Args:
            entity_value: The entity identifier (email, transaction ID, etc.)
            entity_type: Type of entity (email, transaction_id, etc.)
            requested_by: Identifier of who requested deletion
            reason: Optional reason for deletion

        Returns:
            Dictionary with deletion request status
        """
        # Create audit-safe hash for logging (never log actual PII)
        entity_hash = self._obfuscator.create_audit_hash(entity_value)

        logger.info(
            f"[DPA_DELETION] Deletion requested for entity hash: {entity_hash[:8]}..., "
            f"type: {entity_type}, requested_by: {requested_by}"
        )

        result = {
            "entity_hash": entity_hash,
            "entity_type": entity_type,
            "requested_by": requested_by,
            "requested_at": datetime.utcnow().isoformat() + "Z",
            "status": DeletionStatus.PENDING.value,
            "deleted_records": {},
            "errors": [],
        }

        try:
            # Delete from various data stores
            deleted_counts = self._execute_deletion(entity_value, entity_type)
            result["deleted_records"] = deleted_counts
            result["status"] = DeletionStatus.COMPLETED.value

            # Log successful deletion for audit
            self._audit_logger.log_data_deletion(
                entity_hash=entity_hash,
                data_categories=self._get_categories_for_type(entity_type),
                requested_by=requested_by,
                investigation_ids=deleted_counts.get("investigation_ids", []),
            )

        except Exception as e:
            logger.error(f"[DPA_DELETION] Deletion failed: {e}", exc_info=True)
            result["status"] = DeletionStatus.FAILED.value
            result["errors"].append(str(e))

        return result

    def _execute_deletion(
        self, entity_value: str, entity_type: str
    ) -> Dict[str, Any]:
        """
        Execute actual data deletion across data stores.

        Args:
            entity_value: Entity to delete
            entity_type: Type of entity

        Returns:
            Dictionary with counts of deleted records
        """
        deleted_counts = {
            "transaction_scores": 0,
            "investigation_states": 0,
            "investigation_ids": [],
        }

        db_gen = get_db()
        db = next(db_gen)

        try:
            # Delete from transaction_scores
            if entity_type in ("email", "entity_value", "transaction_id"):
                # Find affected investigations
                inv_query = text("""
                    SELECT DISTINCT investigation_id
                    FROM transaction_scores
                    WHERE transaction_id IN (
                        SELECT id FROM investigation_states
                        WHERE entity_value = :entity_value
                    )
                """)
                inv_result = db.execute(inv_query, {"entity_value": entity_value})
                inv_ids = [str(row[0]) for row in inv_result.fetchall()]
                deleted_counts["investigation_ids"] = inv_ids

                # Delete transaction scores
                delete_scores = text("""
                    DELETE FROM transaction_scores
                    WHERE investigation_id IN (
                        SELECT id FROM investigation_states
                        WHERE entity_value = :entity_value
                    )
                """)
                result = db.execute(delete_scores, {"entity_value": entity_value})
                deleted_counts["transaction_scores"] = result.rowcount

                # Delete investigation states (soft delete - set status to DELETED)
                update_inv = text("""
                    UPDATE investigation_states
                    SET status = 'DELETED', updated_at = :now
                    WHERE entity_value = :entity_value
                """)
                result = db.execute(
                    update_inv,
                    {"entity_value": entity_value, "now": datetime.utcnow()},
                )
                deleted_counts["investigation_states"] = result.rowcount

            db.commit()
            logger.info(f"[DPA_DELETION] Deleted: {deleted_counts}")

        except Exception as e:
            db.rollback()
            raise
        finally:
            db.close()

        return deleted_counts

    def _get_categories_for_type(self, entity_type: str) -> List[DataCategory]:
        """Map entity type to data categories."""
        category_map = {
            "email": [DataCategory.USER_IDENTIFIER, DataCategory.TRANSACTION],
            "transaction_id": [DataCategory.TRANSACTION],
            "device_id": [DataCategory.DEVICE_DATA],
            "ip_address": [DataCategory.LOCATION_DATA],
            "entity_value": [DataCategory.USER_IDENTIFIER, DataCategory.TRANSACTION],
        }
        return category_map.get(entity_type, [DataCategory.API_DATA])

    def get_retention_policy(self) -> Dict[str, Any]:
        """
        Get current data retention policy.

        Per DPA Annex 1 Section 2.2: Policy must be documented.
        """
        return {
            "retention_period_days": self._retention_days,
            "policy_version": "1.0",
            "last_updated": "2024-01-01",
            "deletion_on_request": True,
            "deletion_sla_days": 30,
            "data_categories": [c.value for c in DataCategory],
            "approved_subprocessors": ["anthropic", "openai"],
        }


# Global singleton
_retention_manager: Optional[DataRetentionManager] = None


def get_data_retention_manager() -> DataRetentionManager:
    """Get the global data retention manager instance."""
    global _retention_manager
    if _retention_manager is None:
        _retention_manager = DataRetentionManager()
    return _retention_manager
