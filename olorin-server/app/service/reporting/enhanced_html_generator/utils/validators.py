#!/usr/bin/env python3
"""
Data Validation Utilities - Legacy Wrapper.

This file maintains backwards compatibility by delegating to the modular implementation.
All validation utilities have been refactored into focused modules.

@deprecated Import directly from specific validator modules for better clarity
@see validators_log_parsing.py for log line parsing utilities
@see validators_investigation.py for investigation folder and metadata validation
@see validators_data_integrity.py for JSON/JSONL file validation and data consistency
"""

from .validators_log_parsing import LogLineParser
from .validators_investigation import InvestigationValidator
from .validators_data_integrity import DataIntegrityChecker

# Re-export all classes for backwards compatibility
__all__ = ["LogLineParser", "InvestigationValidator", "DataIntegrityChecker"]
