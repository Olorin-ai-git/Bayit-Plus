#!/usr/bin/env python3
"""
Log Parsing Validators for Enhanced HTML Report Generator.

Provides utilities for parsing various log line formats.
Focused on log parsing, format detection, and timestamp extraction.
"""

import logging
import re
from datetime import datetime
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)


class LogLineParser:
    """Handles parsing of various log line formats."""

    # Log line patterns in order of preference
    LOG_PATTERNS = [
        # ISO timestamp pattern
        r"(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.?\d*Z?)\s+(\w+)\s+(.+)",
        # Standard timestamp pattern
        r"(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2},\d+)\s+(\w+)\s+(.+)",
        # Simple timestamp pattern
        r"(\d{2}:\d{2}:\d{2})\s+(\w+)\s+(.+)",
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
                    "timestamp": timestamp_str,
                    "level": level.upper(),
                    "message": message.strip(),
                    "raw_line": line,
                }

        # Fallback: return raw line with current timestamp
        return {
            "timestamp": datetime.now().isoformat(),
            "level": "INFO",
            "message": line,
            "raw_line": line,
        }
