#!/usr/bin/env python3
"""
Investigation Validators for Enhanced HTML Report Generator.

Provides validation for investigation folder structure and metadata.
Focused on folder structure validation, naming patterns, and metadata integrity.
"""

import re
from pathlib import Path
from typing import Dict, List, Any, Tuple
import logging

logger = logging.getLogger(__name__)


class InvestigationValidator:
    """Validates investigation folder structure and data integrity."""

    REQUIRED_FILES = ["metadata.json"]
    OPTIONAL_FILES = [
        "structured_activities.jsonl",
        "journey_tracking.json",
        "investigation.log",
    ]
    FOLDER_NAME_PATTERN = r"^(LIVE|MOCK|DEMO)_.*_\d{8}_\d{6}$"

    @classmethod
    def validate_folder_structure(cls, folder_path: Path) -> Tuple[bool, List[str]]:
        """
        Validate investigation folder structure.

        Args:
            folder_path: Path to investigation folder

        Returns:
            Tuple of (is_valid, list_of_errors)
        """
        errors = []

        # Check if directory exists
        if not folder_path.exists():
            errors.append(f"Folder does not exist: {folder_path}")
            return False, errors

        if not folder_path.is_dir():
            errors.append(f"Path is not a directory: {folder_path}")
            return False, errors

        # Check folder naming pattern
        if not re.match(cls.FOLDER_NAME_PATTERN, folder_path.name):
            errors.append(f"Invalid folder name pattern: {folder_path.name}")

        # Check for required files
        for file_name in cls.REQUIRED_FILES:
            file_path = folder_path / file_name
            if not file_path.exists():
                errors.append(f"Missing required file: {file_name}")

        return len(errors) == 0, errors

    @classmethod
    def validate_metadata(cls, metadata: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """
        Validate metadata content.

        Args:
            metadata: Metadata dictionary

        Returns:
            Tuple of (is_valid, list_of_warnings)
        """
        warnings = []
        required_fields = ["investigation_id", "mode", "created_at"]

        for field in required_fields:
            if field not in metadata:
                warnings.append(f"Missing metadata field: {field}")

        # Validate mode
        valid_modes = ["LIVE", "MOCK", "DEMO"]
        mode = metadata.get("mode", "")
        if mode not in valid_modes:
            warnings.append(f"Invalid mode '{mode}', expected one of: {valid_modes}")

        return len(warnings) == 0, warnings
