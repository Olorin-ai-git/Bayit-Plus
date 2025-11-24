#!/usr/bin/env python3
"""
Core HTML report generation module for Enhanced HTML Report Generator.

Contains the main report generation logic and orchestrates all components.
"""

import json
import logging
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional, Union

from .data_models import (
    InvestigationSummary,
    ComponentData,
    ReportConfig,
    ReportTheme,
    GeneratedReport,
)
from .data_processor import (
    InvestigationDataExtractor,
    ComponentDataProcessor,
    SummaryGenerator,
)
from .styles import StyleManager
from .scripts import JavaScriptManager
from .components import (
    HeaderGenerator,
    SummaryGenerator as ComponentSummaryGenerator,
    FooterGenerator,
)
from .utils import DateTimeFormatter
from .core_html_builder import HTMLBuilder
from .core_validator import ReportValidator
from .core_component_manager import ComponentManager

logger = logging.getLogger(__name__)


class ReportCore:
    """Core report generation engine."""

    def __init__(self, config: Optional[ReportConfig] = None):
        """Initialize the report core with configuration."""
        self.config = config or ReportConfig()
        self.style_manager = StyleManager(self.config.theme)
        self.js_manager = JavaScriptManager(self.config)
        self.html_builder = HTMLBuilder()
        self.component_manager = ComponentManager(self.config)

        # Initialize processors
        self.data_extractor = InvestigationDataExtractor()
        self.component_processor = ComponentDataProcessor()
        self.summary_generator = SummaryGenerator()

        # Initialize component generators
        self.header_generator = HeaderGenerator()
        self.component_summary_generator = ComponentSummaryGenerator()
        self.footer_generator = FooterGenerator()

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
        start_time = datetime.now()
        errors: List[str] = []
        warnings: List[str] = []

        try:
            # Extract data
            extracted_data = self.data_extractor.extract_investigation_data(folder_path)

            # Process data for components
            component_data = self.component_processor.process_component_data(
                extracted_data
            )

            # Generate summary
            summary = self.summary_generator.generate_investigation_summary(
                extracted_data
            )

            # Generate HTML content
            html_content = self._build_complete_html(summary, component_data, title)

            # Write report
            if output_path is None:
                output_path = self._generate_output_path(summary)

            with open(output_path, "w", encoding="utf-8") as f:
                f.write(html_content)

            # Calculate generation metrics
            generation_time = (datetime.now() - start_time).total_seconds()
            report_size = output_path.stat().st_size

            logger.info(f"Generated HTML report: {output_path}")
            logger.info(
                f"Generation time: {generation_time:.2f}s, Size: {report_size:,} bytes"
            )

            return GeneratedReport(
                output_path=str(output_path),
                generation_time=generation_time,
                report_size_bytes=report_size,
                components_included=self.config.include_components or ["all"],
                errors=errors,
                warnings=warnings,
            )

        except Exception as e:
            errors.append(f"Report generation failed: {str(e)}")
            logger.error(f"Failed to generate report: {e}")
            raise

    def _build_complete_html(
        self,
        summary: InvestigationSummary,
        component_data: ComponentData,
        title: Optional[str],
    ) -> str:
        """Build the complete HTML report."""
        report_title = title or f"Investigation Report - {summary.investigation_id}"
        timestamp = DateTimeFormatter.get_current_timestamp()

        # Generate all HTML sections using HTMLBuilder
        html_sections = [
            self.html_builder.build_html_head(report_title, self.style_manager),
            self.html_builder.build_html_body_start(),
            self.header_generator.generate_header(summary, report_title, timestamp),
            self.component_summary_generator.generate_summary(summary),
            self.component_manager.generate_investigation_components(component_data),
            self.footer_generator.generate_footer(),
            self.html_builder.build_html_body_end(),
            self.html_builder.build_html_scripts(
                summary, component_data, self.js_manager
            ),
            self.html_builder.build_html_closing(),
        ]

        return "\n".join(html_sections)

    def _generate_output_path(self, summary: InvestigationSummary) -> Path:
        """Generate output path for the report."""
        reports_dir = Path("reports/generated")
        reports_dir.mkdir(parents=True, exist_ok=True)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"investigation_report_{summary.investigation_id}_{timestamp}.html"
        return reports_dir / filename


# Re-export ReportValidator for backwards compatibility
__all__ = ["ReportCore", "ReportValidator"]
