#!/usr/bin/env python3
"""
Report Validation Utilities for Enhanced HTML Report Generator.

Contains validation logic for report generation inputs and outputs.
Focused on folder structure validation and configuration validation.
"""

from pathlib import Path
from typing import List

from .data_models import ReportConfig, ReportTheme


class ReportValidator:
    """Validates report generation inputs and outputs."""

    @staticmethod
    def validate_folder_structure(folder_path: Path) -> tuple[bool, List[str]]:
        """
        Validate investigation folder structure.

        Args:
            folder_path: Path to investigation folder

        Returns:
            Tuple of (is_valid, list_of_errors)
        """
        from .utils import InvestigationValidator

        return InvestigationValidator.validate_folder_structure(folder_path)

    @staticmethod
    def validate_config(config: ReportConfig) -> tuple[bool, List[str]]:
        """
        Validate report configuration.

        Args:
            config: Report configuration to validate

        Returns:
            Tuple of (is_valid, list_of_errors)
        """
        errors = []

        if config.max_data_points < 10:
            errors.append("max_data_points must be at least 10")

        if config.chart_height < 100:
            errors.append("chart_height must be at least 100px")

        valid_themes = [theme.value for theme in ReportTheme]
        if config.theme.value not in valid_themes:
            errors.append(f"Invalid theme: {config.theme.value}")

        return len(errors) == 0, errors
