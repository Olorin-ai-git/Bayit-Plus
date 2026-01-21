"""
Privacy Audit Logger for DPA Compliance.

Logs all personal data access and processing for audit trail requirements.

Per DPA Annex 1 Section 2.7: "Do you have access logging measures in place?"
"""

import json
import os
import threading
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class DataAccessType(Enum):
    """Types of data access operations."""
    READ = "READ"
    WRITE = "WRITE"
    DELETE = "DELETE"
    TRANSMIT_TO_LLM = "TRANSMIT_TO_LLM"
    OBFUSCATE = "OBFUSCATE"
    EXPORT = "EXPORT"


class DataCategory(Enum):
    """Categories of personal data per DPA Section 9.1."""
    TRANSACTION = "TRANSACTION"
    CHARGEBACK = "CHARGEBACK"
    FRAUD_ALERT = "FRAUD_ALERT"
    API_DATA = "API_DATA"
    USER_IDENTIFIER = "USER_IDENTIFIER"
    DEVICE_DATA = "DEVICE_DATA"
    LOCATION_DATA = "LOCATION_DATA"


class PrivacyAuditLogger:
    """
    Audit logger for personal data access.

    Maintains immutable audit trail of all PII access for compliance.
    """

    _instance: Optional["PrivacyAuditLogger"] = None
    _lock = threading.Lock()

    # Approved sub-processors per DPA Section 6
    APPROVED_SUBPROCESSORS = {"anthropic", "openai"}

    def __new__(cls) -> "PrivacyAuditLogger":
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self._audit_dir = Path(os.environ.get("PRIVACY_AUDIT_DIR", "logs/privacy_audit"))
        self._audit_dir.mkdir(parents=True, exist_ok=True)
        self._current_log_file = self._get_log_file_path()
        self._buffer: List[Dict[str, Any]] = []
        self._buffer_lock = threading.Lock()
        self._buffer_size = int(os.environ.get("PRIVACY_AUDIT_BUFFER_SIZE", "100"))
        logger.info(f"PrivacyAuditLogger initialized, logging to {self._audit_dir}")

    def _get_log_file_path(self) -> Path:
        """Get current audit log file path (daily rotation)."""
        date_str = datetime.utcnow().strftime("%Y-%m-%d")
        return self._audit_dir / f"privacy_audit_{date_str}.jsonl"

    def log_data_access(
        self,
        access_type: DataAccessType,
        data_category: DataCategory,
        entity_hash: str,
        source: str,
        destination: str,
        investigation_id: Optional[str] = None,
        pii_types_accessed: Optional[List[str]] = None,
        obfuscated: bool = False,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        """
        Log a data access event.

        Args:
            access_type: Type of access (READ, WRITE, TRANSMIT_TO_LLM, etc.)
            data_category: Category of data being accessed
            entity_hash: SHA256 hash of entity identifier (not the actual PII)
            source: Source system (e.g., "snowflake", "postgresql")
            destination: Destination (e.g., "anthropic", "openai", "internal")
            investigation_id: Optional investigation ID for correlation
            pii_types_accessed: List of PII types accessed (EMAIL, IP, etc.)
            obfuscated: Whether data was obfuscated before transmission
            metadata: Additional metadata
        """
        # Validate sub-processor if transmitting to LLM
        if access_type == DataAccessType.TRANSMIT_TO_LLM:
            dest_lower = destination.lower()
            if dest_lower not in self.APPROVED_SUBPROCESSORS:
                logger.error(
                    f"[PRIVACY_VIOLATION] Attempted transmission to unapproved "
                    f"sub-processor: {destination}. Approved: {self.APPROVED_SUBPROCESSORS}"
                )
                # Still log for audit trail
                self._log_violation(destination, entity_hash, investigation_id)

        audit_entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "access_type": access_type.value,
            "data_category": data_category.value,
            "entity_hash": entity_hash,
            "source": source,
            "destination": destination,
            "investigation_id": investigation_id,
            "pii_types": pii_types_accessed or [],
            "obfuscated": obfuscated,
            "metadata": metadata or {},
        }

        self._write_audit_entry(audit_entry)

    def log_llm_transmission(
        self,
        model_provider: str,
        model_name: str,
        investigation_id: Optional[str],
        pii_types_obfuscated: List[str],
        message_count: int,
        context_id: str,
    ) -> None:
        """
        Log transmission of data to LLM sub-processor.

        This is the critical audit point for DPA compliance.
        """
        if model_provider.lower() not in self.APPROVED_SUBPROCESSORS:
            logger.error(
                f"[DPA_VIOLATION] Transmitting to unapproved sub-processor: {model_provider}"
            )

        audit_entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "event_type": "LLM_TRANSMISSION",
            "model_provider": model_provider,
            "model_name": model_name,
            "investigation_id": investigation_id,
            "pii_types_obfuscated": pii_types_obfuscated,
            "message_count": message_count,
            "obfuscation_context_id": context_id,
            "compliant": model_provider.lower() in self.APPROVED_SUBPROCESSORS,
        }

        self._write_audit_entry(audit_entry)
        logger.info(
            f"[PRIVACY_AUDIT] LLM transmission: provider={model_provider}, "
            f"pii_types={pii_types_obfuscated}, context={context_id}"
        )

    def log_data_deletion(
        self,
        entity_hash: str,
        data_categories: List[DataCategory],
        requested_by: str,
        investigation_ids: Optional[List[str]] = None,
    ) -> None:
        """Log data deletion event per DPA Section 8."""
        audit_entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "event_type": "DATA_DELETION",
            "entity_hash": entity_hash,
            "data_categories": [c.value for c in data_categories],
            "requested_by": requested_by,
            "investigation_ids": investigation_ids or [],
        }

        self._write_audit_entry(audit_entry)
        logger.info(f"[PRIVACY_AUDIT] Data deletion logged for entity hash: {entity_hash[:8]}...")

    def log_breach_detection(
        self,
        breach_type: str,
        affected_entity_hashes: List[str],
        description: str,
        severity: str,
    ) -> None:
        """
        Log potential data breach per DPA Section 7.

        Note: DPA requires notification within 24 hours.
        """
        audit_entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "event_type": "BREACH_DETECTION",
            "breach_type": breach_type,
            "affected_count": len(affected_entity_hashes),
            "description": description,
            "severity": severity,
            "requires_notification": True,
            "notification_deadline_hours": 24,
        }

        self._write_audit_entry(audit_entry)
        logger.critical(
            f"[BREACH_DETECTED] Type: {breach_type}, Affected: {len(affected_entity_hashes)}, "
            f"Severity: {severity}. DPA requires notification within 24 hours!"
        )

    def _log_violation(
        self,
        destination: str,
        entity_hash: str,
        investigation_id: Optional[str],
    ) -> None:
        """Log a DPA compliance violation."""
        audit_entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "event_type": "COMPLIANCE_VIOLATION",
            "violation_type": "UNAPPROVED_SUBPROCESSOR",
            "destination": destination,
            "entity_hash": entity_hash,
            "investigation_id": investigation_id,
            "approved_subprocessors": list(self.APPROVED_SUBPROCESSORS),
        }

        self._write_audit_entry(audit_entry)

    def _write_audit_entry(self, entry: Dict[str, Any]) -> None:
        """Write audit entry to buffer and flush if needed."""
        with self._buffer_lock:
            self._buffer.append(entry)
            if len(self._buffer) >= self._buffer_size:
                self._flush_buffer()

    def _flush_buffer(self) -> None:
        """Flush buffer to audit log file."""
        if not self._buffer:
            return

        # Check for day rollover
        current_file = self._get_log_file_path()
        if current_file != self._current_log_file:
            self._current_log_file = current_file

        try:
            with open(self._current_log_file, "a") as f:
                for entry in self._buffer:
                    f.write(json.dumps(entry) + "\n")
            self._buffer.clear()
        except Exception as e:
            logger.error(f"Failed to flush privacy audit log: {e}")

    def flush(self) -> None:
        """Force flush the audit buffer."""
        with self._buffer_lock:
            self._flush_buffer()

    def get_audit_summary(self, date: Optional[str] = None) -> Dict[str, Any]:
        """Get summary of audit log for a given date."""
        if date is None:
            date = datetime.utcnow().strftime("%Y-%m-%d")

        log_file = self._audit_dir / f"privacy_audit_{date}.jsonl"
        if not log_file.exists():
            return {"date": date, "entries": 0, "summary": {}}

        summary = {
            "llm_transmissions": 0,
            "data_deletions": 0,
            "violations": 0,
            "by_provider": {},
            "by_pii_type": {},
        }

        entry_count = 0
        try:
            with open(log_file, "r") as f:
                for line in f:
                    entry = json.loads(line)
                    entry_count += 1

                    event_type = entry.get("event_type", entry.get("access_type"))
                    if event_type == "LLM_TRANSMISSION":
                        summary["llm_transmissions"] += 1
                        provider = entry.get("model_provider", "unknown")
                        summary["by_provider"][provider] = summary["by_provider"].get(provider, 0) + 1
                        for pii_type in entry.get("pii_types_obfuscated", []):
                            summary["by_pii_type"][pii_type] = summary["by_pii_type"].get(pii_type, 0) + 1
                    elif event_type == "DATA_DELETION":
                        summary["data_deletions"] += 1
                    elif event_type == "COMPLIANCE_VIOLATION":
                        summary["violations"] += 1

        except Exception as e:
            logger.error(f"Failed to read audit log: {e}")

        return {"date": date, "entries": entry_count, "summary": summary}


# Global singleton instance
_audit_logger: Optional[PrivacyAuditLogger] = None


def get_privacy_audit_logger() -> PrivacyAuditLogger:
    """Get the global privacy audit logger instance."""
    global _audit_logger
    if _audit_logger is None:
        _audit_logger = PrivacyAuditLogger()
    return _audit_logger
