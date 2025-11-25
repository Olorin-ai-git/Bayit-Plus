"""
Data preprocessing utilities for Pattern Recognition.

Handles data cleaning, transformation, and preparation for pattern analysis.
"""

import re
from collections import defaultdict
from datetime import datetime
from typing import Any, Dict, List

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class DataPreprocessor:
    """Preprocesses data for pattern recognition analysis."""

    def preprocess_for_patterns(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Preprocess data specifically for pattern recognition."""
        processed = {
            "sequences": [],
            "events": [],
            "behaviors": [],
            "temporal_data": [],
            "textual_data": [],
            "numerical_data": {},
            "categorical_data": {},
            "network_data": {},
        }

        for key, value in data.items():
            # Handle different data structures
            if isinstance(value, list):
                if all(isinstance(item, dict) for item in value):
                    # List of events/records
                    processed["events"].extend(value)
                    # Also treat as sequence
                    processed["sequences"].append(
                        {"name": key, "sequence": value, "length": len(value)}
                    )
                else:
                    # Simple list - treat as sequence
                    processed["sequences"].append(
                        {"name": key, "sequence": value, "length": len(value)}
                    )

            elif isinstance(value, str):
                # Check if timestamp
                if self._is_timestamp(value):
                    processed["temporal_data"].append(
                        {
                            "field": key,
                            "timestamp": value,
                            "parsed_time": self._safe_parse_timestamp(value),
                        }
                    )
                else:
                    # Textual data
                    processed["textual_data"].append(
                        {"field": key, "text": value, "length": len(value)}
                    )
                    processed["categorical_data"][key] = value

            elif isinstance(value, (int, float)):
                processed["numerical_data"][key] = float(value)

            elif isinstance(value, dict):
                # Network or behavioral data
                if any(
                    network_key in value
                    for network_key in ["ip", "port", "connection", "network"]
                ):
                    processed["network_data"][key] = value
                else:
                    processed["behaviors"].append({"name": key, "behavior_data": value})

        return processed

    def generate_data_summary(self, processed_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate summary statistics for preprocessed data."""
        summary = {
            "total_sequences": len(processed_data.get("sequences", [])),
            "total_events": len(processed_data.get("events", [])),
            "total_behaviors": len(processed_data.get("behaviors", [])),
            "temporal_fields": len(processed_data.get("temporal_data", [])),
            "textual_fields": len(processed_data.get("textual_data", [])),
            "numerical_fields": len(processed_data.get("numerical_data", {})),
            "categorical_fields": len(processed_data.get("categorical_data", {})),
            "network_fields": len(processed_data.get("network_data", {})),
        }

        # Add sequence statistics
        sequences = processed_data.get("sequences", [])
        if sequences:
            sequence_lengths = [seq.get("length", 0) for seq in sequences]
            summary["sequence_stats"] = {
                "min_length": min(sequence_lengths),
                "max_length": max(sequence_lengths),
                "avg_length": sum(sequence_lengths) / len(sequence_lengths),
            }

        # Add temporal data range
        temporal_data = processed_data.get("temporal_data", [])
        if temporal_data:
            timestamps = [
                t.get("parsed_time") for t in temporal_data if t.get("parsed_time")
            ]
            if timestamps:
                summary["temporal_range"] = {
                    "earliest": min(timestamps).isoformat() if timestamps else None,
                    "latest": max(timestamps).isoformat() if timestamps else None,
                    "span_hours": (
                        (max(timestamps) - min(timestamps)).total_seconds() / 3600
                        if len(timestamps) > 1
                        else 0
                    ),
                }

        return summary

    def _is_timestamp(self, value: str) -> bool:
        """Check if string value represents a timestamp."""
        timestamp_patterns = [
            r"\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}",  # ISO format
            r"\d{2}/\d{2}/\d{4}",  # US format
            r"\d{2}-\d{2}-\d{4}",  # European format
            r"\d{10}",  # Unix timestamp
            r"\d{13}",  # Unix timestamp with milliseconds
        ]

        return any(re.match(pattern, str(value)) for pattern in timestamp_patterns)

    def _safe_parse_timestamp(self, timestamp_str: str) -> datetime:
        """Safely parse timestamp string to datetime object."""
        try:
            # Try various formats
            formats = [
                "%Y-%m-%dT%H:%M:%S",
                "%Y-%m-%d %H:%M:%S",
                "%m/%d/%Y",
                "%d-%m-%Y",
                "%Y-%m-%d",
            ]

            for fmt in formats:
                try:
                    return datetime.strptime(timestamp_str, fmt)
                except ValueError:
                    continue

            # Try parsing as Unix timestamp
            if timestamp_str.isdigit():
                timestamp = int(timestamp_str)
                if len(timestamp_str) == 13:  # Milliseconds
                    timestamp = timestamp / 1000
                return datetime.fromtimestamp(timestamp)

        except Exception as e:
            logger.warning(f"Failed to parse timestamp '{timestamp_str}': {e}")

        return datetime.utcnow()  # Fallback
