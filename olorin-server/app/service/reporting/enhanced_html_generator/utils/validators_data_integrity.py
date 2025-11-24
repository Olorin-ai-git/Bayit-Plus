#!/usr/bin/env python3
"""
Data Integrity Validators for Enhanced HTML Report Generator.

Provides validation for JSON/JSONL files and activity data consistency.
Focused on file format validation and data consistency checks.
"""

import json
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
import logging

logger = logging.getLogger(__name__)


class DataIntegrityChecker:
    """Checks data integrity and consistency."""

    @staticmethod
    def validate_jsonl_file(file_path: Path) -> Tuple[int, List[str]]:
        """
        Validate JSONL file format and content.

        Args:
            file_path: Path to JSONL file

        Returns:
            Tuple of (valid_lines_count, list_of_errors)
        """
        errors = []
        valid_count = 0

        if not file_path.exists():
            return 0, [f"File does not exist: {file_path}"]

        try:
            with open(file_path, "r", encoding="utf-8") as f:
                for line_no, line in enumerate(f, 1):
                    line = line.strip()
                    if not line:
                        continue

                    try:
                        json.loads(line)
                        valid_count += 1
                    except json.JSONDecodeError as e:
                        errors.append(f"Invalid JSON on line {line_no}: {e}")

        except Exception as e:
            errors.append(f"Error reading file {file_path}: {e}")

        return valid_count, errors

    @staticmethod
    def validate_json_file(file_path: Path) -> Tuple[bool, Optional[str]]:
        """
        Validate JSON file format.

        Args:
            file_path: Path to JSON file

        Returns:
            Tuple of (is_valid, error_message)
        """
        if not file_path.exists():
            return False, f"File does not exist: {file_path}"

        try:
            with open(file_path, "r", encoding="utf-8") as f:
                json.load(f)
            return True, None
        except json.JSONDecodeError as e:
            return False, f"Invalid JSON in {file_path}: {e}"
        except Exception as e:
            return False, f"Error reading {file_path}: {e}"

    @staticmethod
    def check_activity_consistency(activities: List[Dict[str, Any]]) -> List[str]:
        """
        Check consistency of structured activities data.

        Args:
            activities: List of activity entries

        Returns:
            List of consistency warnings
        """
        warnings = []
        interaction_types = set()
        agents_seen = set()
        tools_seen = set()

        for i, activity in enumerate(activities):
            # Check required fields
            if "interaction_type" not in activity:
                warnings.append(f"Activity {i}: Missing interaction_type")
                continue

            interaction_type = activity["interaction_type"]
            interaction_types.add(interaction_type)
            data = activity.get("data", {})

            # Check type-specific fields
            if interaction_type == "llm_call":
                if "agent_name" in data:
                    agents_seen.add(data["agent_name"])
                if "tokens_used" not in data:
                    warnings.append(f"Activity {i}: LLM call missing tokens_used")

            elif interaction_type == "tool_execution":
                if "tool_name" in data:
                    tools_seen.add(data["tool_name"])
                if "success" not in data:
                    warnings.append(
                        f"Activity {i}: Tool execution missing success field"
                    )

        # Summary checks
        if not interaction_types:
            warnings.append("No interaction types found in activities")

        return warnings
