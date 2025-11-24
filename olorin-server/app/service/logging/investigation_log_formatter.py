"""
Investigation Log Formatter

Custom formatter that adds [investigation_id] prefix to log messages.
Checks contextvars for investigation_id and adds prefix if present.

Author: Implementation for 001-custom-investigation-log
Date: 2025-01-11
"""

import logging
import json
from typing import Optional

from .investigation_log_context import get_investigation_id


class InvestigationLogFormatter(logging.Formatter):
    """
    Custom formatter that adds [investigation_id] prefix to log messages.
    
    Checks contextvars for investigation_id and adds prefix if present.
    Works with base formatters from UnifiedLoggingCore.
    """
    
    def __init__(
        self,
        base_formatter: logging.Formatter,
        include_prefix: bool = True
    ):
        """
        Initialize investigation log formatter.
        
        Args:
            base_formatter: Base formatter (from UnifiedLoggingCore)
            include_prefix: Whether to include [investigation_id] prefix
        """
        super().__init__()
        self.base_formatter = base_formatter
        self.include_prefix = include_prefix
    
    def format(self, record: logging.LogRecord) -> str:
        """
        Format log record with investigation_id prefix.
        
        Args:
            record: Log record to format
            
        Returns:
            Formatted log message with [investigation_id] prefix if context is set
        """
        # Get investigation_id from context
        investigation_id = None
        if self.include_prefix:
            investigation_id = get_investigation_id()
        
        # Format using base formatter first
        formatted = self.base_formatter.format(record)
        
        # Add prefix if investigation_id is present
        if investigation_id:
            formatted = self._add_investigation_id_prefix(formatted, investigation_id)
        
        return formatted
    
    def _add_investigation_id_prefix(self, formatted: str, investigation_id: str) -> str:
        """
        Add investigation_id prefix to formatted log entry.
        Handles HUMAN, JSON, and STRUCTURED formats.
        
        Args:
            formatted: Already formatted log entry
            investigation_id: Investigation ID to add
            
        Returns:
            Formatted log entry with investigation_id prefix/field
        """
        # Try to detect format type
        try:
            # Try parsing as JSON (JSON or STRUCTURED format)
            log_entry = json.loads(formatted)
            # Add investigation_id field
            log_entry['investigation_id'] = investigation_id
            return json.dumps(log_entry, default=str)
        except (json.JSONDecodeError, TypeError):
            # Not JSON - assume HUMAN format
            # Add [investigation_id] prefix at the beginning
            return f"[{investigation_id}] {formatted}"

