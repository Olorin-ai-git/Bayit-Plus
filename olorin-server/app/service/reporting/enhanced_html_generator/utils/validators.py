#!/usr/bin/env python3
"""
Data validation utilities for Enhanced HTML Report Generator.

Provides validation for investigation data, log parsing, and data integrity checks.
"""

import re
import json
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
import logging

logger = logging.getLogger(__name__)


class LogLineParser:
    """Handles parsing of various log line formats."""

    # Log line patterns in order of preference
    LOG_PATTERNS = [
        # ISO timestamp pattern
        r'(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.?\d*Z?)\s+(\w+)\s+(.+)',
        # Standard timestamp pattern
        r'(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2},\d+)\s+(\w+)\s+(.+)',
        # Simple timestamp pattern
        r'(\d{2}:\d{2}:\d{2})\s+(\w+)\s+(.+)'
    ]

    @classmethod
    def parse_log_line(cls, line: str) -> Optional[Dict[str, Any]]:
        """
        Parse a single log line into structured data.

        Args:
            line: Raw log line

        Returns:
            Parsed log entry or None if parsing fails
        """
        line = line.strip()
        if not line:
            return None

        for pattern in cls.LOG_PATTERNS:
            match = re.match(pattern, line)
            if match:
                timestamp_str, level, message = match.groups()
                return {
                    'timestamp': timestamp_str,
                    'level': level.upper(),
                    'message': message.strip(),
                    'raw_line': line
                }

        # Fallback: return raw line with current timestamp
        from datetime import datetime
        return {
            'timestamp': datetime.now().isoformat(),
            'level': 'INFO',
            'message': line,
            'raw_line': line
        }


class InvestigationValidator:
    """Validates investigation folder structure and data integrity."""

    REQUIRED_FILES = ['metadata.json']
    OPTIONAL_FILES = ['autonomous_activities.jsonl', 'journey_tracking.json', 'investigation.log']
    FOLDER_NAME_PATTERN = r'^(LIVE|MOCK|DEMO)_.*_\d{8}_\d{6}$'

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
        required_fields = ['investigation_id', 'mode', 'created_at']

        for field in required_fields:
            if field not in metadata:
                warnings.append(f"Missing metadata field: {field}")

        # Validate mode
        valid_modes = ['LIVE', 'MOCK', 'DEMO']
        mode = metadata.get('mode', '')
        if mode not in valid_modes:
            warnings.append(f"Invalid mode '{mode}', expected one of: {valid_modes}")

        return len(warnings) == 0, warnings


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
            with open(file_path, 'r', encoding='utf-8') as f:
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
            with open(file_path, 'r', encoding='utf-8') as f:
                json.load(f)
            return True, None
        except json.JSONDecodeError as e:
            return False, f"Invalid JSON in {file_path}: {e}"
        except Exception as e:
            return False, f"Error reading {file_path}: {e}"

    @staticmethod
    def check_activity_consistency(activities: List[Dict[str, Any]]) -> List[str]:
        """
        Check consistency of autonomous activities data.

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
            if 'interaction_type' not in activity:
                warnings.append(f"Activity {i}: Missing interaction_type")
                continue

            interaction_type = activity['interaction_type']
            interaction_types.add(interaction_type)
            data = activity.get('data', {})

            # Check type-specific fields
            if interaction_type == 'llm_call':
                if 'agent_name' in data:
                    agents_seen.add(data['agent_name'])
                if 'tokens_used' not in data:
                    warnings.append(f"Activity {i}: LLM call missing tokens_used")

            elif interaction_type == 'tool_execution':
                if 'tool_name' in data:
                    tools_seen.add(data['tool_name'])
                if 'success' not in data:
                    warnings.append(f"Activity {i}: Tool execution missing success field")

        # Summary checks
        if not interaction_types:
            warnings.append("No interaction types found in activities")

        return warnings