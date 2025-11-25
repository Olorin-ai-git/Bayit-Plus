#!/usr/bin/env python3
"""
Enhanced HTML Report Generator - Modular Report Generation System.

Main facade providing backward compatibility with the original EnhancedHTMLReportGenerator.
"""

import logging
from pathlib import Path
from typing import Optional

from .core import ReportCore
from .data_models import GeneratedReport, ReportConfig

logger = logging.getLogger(__name__)


class EnhancedHTMLReportGenerator:
    """
    Main facade class for Enhanced HTML Report Generator.

    Provides backward compatibility with the original implementation while
    leveraging the new modular architecture.
    """

    def __init__(self, config: Optional[ReportConfig] = None):
        """
        Initialize the Enhanced HTML Report Generator.

        Args:
            config: Optional report configuration. Defaults to standard config.
        """
        self.config = config or ReportConfig()
        self.report_core = ReportCore(self.config)

    def generate_report(
        self,
        folder_path: Path,
        output_path: Optional[Path] = None,
        title: Optional[str] = None,
    ) -> GeneratedReport:
        """
        Generate complete HTML report for an investigation folder.

        Args:
            folder_path: Path to investigation folder
            output_path: Optional custom output path for report
            title: Optional custom report title

        Returns:
            GeneratedReport with generation details
        """
        return self.report_core.generate_report(folder_path, output_path, title)

    def validate_folder(self, folder_path: Path) -> tuple[bool, list[str]]:
        """
        Validate investigation folder structure.

        Args:
            folder_path: Path to investigation folder

        Returns:
            Tuple of (is_valid, error_messages)
        """
        from .core import ReportValidator

        return ReportValidator.validate_folder_structure(folder_path)

    def set_config(self, config: ReportConfig) -> None:
        """
        Update report configuration.

        Args:
            config: New report configuration
        """
        self.config = config
        self.report_core = ReportCore(self.config)


# Backward compatibility alias
HTMLReportGenerator = EnhancedHTMLReportGenerator


__all__ = [
    "EnhancedHTMLReportGenerator",
    "HTMLReportGenerator",
    "ReportConfig",
    "GeneratedReport",
]
