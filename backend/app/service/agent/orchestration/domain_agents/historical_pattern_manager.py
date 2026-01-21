"""
Historical Pattern Manager for Pattern Recognition.

Provides persistent storage and retrieval of historical patterns to improve
pattern recognition accuracy over time through learned patterns.
"""

import json
import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class HistoricalPatternManager:
    """Manages historical pattern storage and retrieval for pattern learning."""

    def __init__(self, storage_path: Optional[str] = None):
        """
        Initialize historical pattern manager.

        Args:
            storage_path: Path to pattern storage directory
        """
        if storage_path is None:
            storage_path = os.getenv(
                "HISTORICAL_PATTERNS_PATH", "/tmp/olorin/historical_patterns"
            )

        self.storage_path = Path(storage_path)
        self.storage_path.mkdir(parents=True, exist_ok=True)

        self.pattern_file = self.storage_path / "patterns.json"
        self.metadata_file = self.storage_path / "metadata.json"

        logger.info(
            f"📚 Historical Pattern Manager initialized (storage: {self.storage_path})"
        )

    def load_historical_patterns(
        self, entity_type: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Load historical patterns from storage.

        Args:
            entity_type: Optional entity type filter (email, device_id, ip)

        Returns:
            Dictionary of historical patterns or None if not available
        """
        try:
            if not self.pattern_file.exists():
                logger.debug("No historical patterns file found")
                return None

            with open(self.pattern_file, "r") as f:
                all_patterns = json.load(f)

            # Filter by entity type if specified
            if entity_type:
                filtered_patterns = {
                    k: v
                    for k, v in all_patterns.items()
                    if v.get("entity_type") == entity_type
                }
                logger.info(
                    f"📚 Loaded {len(filtered_patterns)} historical patterns for entity_type={entity_type}"
                )
                return filtered_patterns if filtered_patterns else None

            logger.info(f"📚 Loaded {len(all_patterns)} historical patterns")
            return all_patterns

        except Exception as e:
            logger.error(f"Failed to load historical patterns: {e}", exc_info=True)
            return None

    def save_patterns(
        self,
        patterns: List[Dict[str, Any]],
        entity_type: str,
        entity_value: str,
        investigation_id: str,
    ) -> bool:
        """
        Save patterns from current investigation to historical storage.

        Args:
            patterns: List of detected patterns
            entity_type: Entity type (email, device_id, ip)
            entity_value: Entity value
            investigation_id: Investigation ID for tracking

        Returns:
            True if save successful, False otherwise
        """
        if not patterns:
            logger.debug("No patterns to save")
            return True

        try:
            # Load existing patterns
            existing_patterns = {}
            if self.pattern_file.exists():
                with open(self.pattern_file, "r") as f:
                    existing_patterns = json.load(f)

            # Create pattern entries
            timestamp = datetime.utcnow().isoformat()

            for pattern in patterns:
                pattern_key = self._generate_pattern_key(pattern)

                if pattern_key not in existing_patterns:
                    # New pattern
                    existing_patterns[pattern_key] = {
                        "pattern_type": pattern.get("pattern_type"),
                        "pattern_name": pattern.get("pattern_name"),
                        "entity_type": entity_type,
                        "first_seen": timestamp,
                        "last_seen": timestamp,
                        "occurrence_count": 1,
                        "investigations": [investigation_id],
                        "avg_confidence": pattern.get("confidence", 0.0),
                        "avg_risk_adjustment": pattern.get("risk_adjustment", 0.0),
                        "pattern_signature": pattern.get("signature", ""),
                        "description": pattern.get("description", ""),
                    }
                else:
                    # Update existing pattern
                    existing_pattern = existing_patterns[pattern_key]
                    existing_pattern["last_seen"] = timestamp
                    existing_pattern["occurrence_count"] += 1

                    # Update investigations list (keep last 100)
                    if investigation_id not in existing_pattern["investigations"]:
                        existing_pattern["investigations"].append(investigation_id)
                        existing_pattern["investigations"] = existing_pattern[
                            "investigations"
                        ][-100:]

                    # Update averages
                    count = existing_pattern["occurrence_count"]
                    old_conf = existing_pattern["avg_confidence"]
                    new_conf = pattern.get("confidence", 0.0)
                    existing_pattern["avg_confidence"] = (
                        old_conf * (count - 1) + new_conf
                    ) / count

                    old_risk = existing_pattern["avg_risk_adjustment"]
                    new_risk = pattern.get("risk_adjustment", 0.0)
                    existing_pattern["avg_risk_adjustment"] = (
                        old_risk * (count - 1) + new_risk
                    ) / count

            # Save updated patterns
            with open(self.pattern_file, "w") as f:
                json.dump(existing_patterns, f, indent=2)

            # Update metadata
            self._update_metadata(len(patterns), entity_type, investigation_id)

            logger.info(
                f"💾 Saved {len(patterns)} patterns to historical storage "
                f"(total patterns: {len(existing_patterns)})"
            )
            return True

        except Exception as e:
            logger.error(f"Failed to save historical patterns: {e}", exc_info=True)
            return False

    def get_pattern_evolution(self, pattern_key: str) -> Optional[Dict[str, Any]]:
        """
        Get evolution data for a specific pattern.

        Args:
            pattern_key: Pattern identifier

        Returns:
            Pattern evolution data or None
        """
        try:
            if not self.pattern_file.exists():
                return None

            with open(self.pattern_file, "r") as f:
                all_patterns = json.load(f)

            return all_patterns.get(pattern_key)

        except Exception as e:
            logger.error(f"Failed to get pattern evolution: {e}")
            return None

    def get_statistics(self) -> Dict[str, Any]:
        """
        Get historical pattern statistics.

        Returns:
            Dictionary with statistics
        """
        try:
            if not self.pattern_file.exists():
                return {
                    "total_patterns": 0,
                    "storage_path": str(self.storage_path),
                    "storage_exists": False,
                }

            with open(self.pattern_file, "r") as f:
                all_patterns = json.load(f)

            # Calculate statistics
            pattern_types = {}
            total_occurrences = 0

            for pattern_data in all_patterns.values():
                p_type = pattern_data.get("pattern_type", "unknown")
                pattern_types[p_type] = pattern_types.get(p_type, 0) + 1
                total_occurrences += pattern_data.get("occurrence_count", 0)

            metadata = {}
            if self.metadata_file.exists():
                with open(self.metadata_file, "r") as f:
                    metadata = json.load(f)

            return {
                "total_patterns": len(all_patterns),
                "pattern_types": pattern_types,
                "total_occurrences": total_occurrences,
                "storage_path": str(self.storage_path),
                "storage_exists": True,
                "last_updated": metadata.get("last_updated"),
                "total_investigations": metadata.get("total_investigations", 0),
            }

        except Exception as e:
            logger.error(f"Failed to get statistics: {e}")
            return {"total_patterns": 0, "storage_exists": False, "error": str(e)}

    def _generate_pattern_key(self, pattern: Dict[str, Any]) -> str:
        """Generate unique key for pattern storage."""
        pattern_type = pattern.get("pattern_type", "unknown")
        pattern_name = pattern.get("pattern_name", "unnamed")
        signature = pattern.get("signature", "")

        if signature:
            return f"{pattern_type}:{signature}"
        else:
            return f"{pattern_type}:{pattern_name}"

    def _update_metadata(
        self, patterns_added: int, entity_type: str, investigation_id: str
    ) -> None:
        """Update metadata file with latest save information."""
        try:
            metadata = {}
            if self.metadata_file.exists():
                with open(self.metadata_file, "r") as f:
                    metadata = json.load(f)

            metadata["last_updated"] = datetime.utcnow().isoformat()
            metadata["last_investigation_id"] = investigation_id
            metadata["total_investigations"] = (
                metadata.get("total_investigations", 0) + 1
            )
            metadata["total_patterns_added"] = (
                metadata.get("total_patterns_added", 0) + patterns_added
            )

            with open(self.metadata_file, "w") as f:
                json.dump(metadata, f, indent=2)

        except Exception as e:
            logger.debug(f"Failed to update metadata: {e}")
