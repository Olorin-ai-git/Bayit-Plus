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

<<<<<<< HEAD
from .data_models import InvestigationSummary, ComponentData, ReportConfig, ReportTheme, GeneratedReport
from .data_processor import InvestigationDataExtractor, ComponentDataProcessor, SummaryGenerator
from .styles import StyleManager
from .scripts import JavaScriptManager
from .components import HeaderGenerator, SummaryGenerator as ComponentSummaryGenerator, FooterGenerator
from .utils import DateTimeFormatter
=======
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
>>>>>>> 001-modify-analyzer-method

logger = logging.getLogger(__name__)


class ReportCore:
    """Core report generation engine."""

    def __init__(self, config: Optional[ReportConfig] = None):
        """Initialize the report core with configuration."""
        self.config = config or ReportConfig()
        self.style_manager = StyleManager(self.config.theme)
        self.js_manager = JavaScriptManager(self.config)
<<<<<<< HEAD
=======
        self.html_builder = HTMLBuilder()
        self.component_manager = ComponentManager(self.config)
>>>>>>> 001-modify-analyzer-method

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
<<<<<<< HEAD
        title: Optional[str] = None
=======
        title: Optional[str] = None,
>>>>>>> 001-modify-analyzer-method
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
<<<<<<< HEAD
        errors = []
        warnings = []
=======
        errors: List[str] = []
        warnings: List[str] = []
>>>>>>> 001-modify-analyzer-method

        try:
            # Extract data
            extracted_data = self.data_extractor.extract_investigation_data(folder_path)

            # Process data for components
<<<<<<< HEAD
            component_data = self.component_processor.process_component_data(extracted_data)

            # Generate summary
            summary = self.summary_generator.generate_investigation_summary(extracted_data)
=======
            component_data = self.component_processor.process_component_data(
                extracted_data
            )

            # Generate summary
            summary = self.summary_generator.generate_investigation_summary(
                extracted_data
            )
>>>>>>> 001-modify-analyzer-method

            # Generate HTML content
            html_content = self._build_complete_html(summary, component_data, title)

            # Write report
            if output_path is None:
                output_path = self._generate_output_path(summary)

<<<<<<< HEAD
            with open(output_path, 'w', encoding='utf-8') as f:
=======
            with open(output_path, "w", encoding="utf-8") as f:
>>>>>>> 001-modify-analyzer-method
                f.write(html_content)

            # Calculate generation metrics
            generation_time = (datetime.now() - start_time).total_seconds()
            report_size = output_path.stat().st_size

            logger.info(f"Generated HTML report: {output_path}")
<<<<<<< HEAD
            logger.info(f"Generation time: {generation_time:.2f}s, Size: {report_size:,} bytes")
=======
            logger.info(
                f"Generation time: {generation_time:.2f}s, Size: {report_size:,} bytes"
            )
>>>>>>> 001-modify-analyzer-method

            return GeneratedReport(
                output_path=str(output_path),
                generation_time=generation_time,
                report_size_bytes=report_size,
<<<<<<< HEAD
                components_included=self.config.include_components or ['all'],
                errors=errors,
                warnings=warnings
=======
                components_included=self.config.include_components or ["all"],
                errors=errors,
                warnings=warnings,
>>>>>>> 001-modify-analyzer-method
            )

        except Exception as e:
            errors.append(f"Report generation failed: {str(e)}")
            logger.error(f"Failed to generate report: {e}")
            raise

    def _build_complete_html(
        self,
        summary: InvestigationSummary,
        component_data: ComponentData,
<<<<<<< HEAD
        title: Optional[str]
=======
        title: Optional[str],
>>>>>>> 001-modify-analyzer-method
    ) -> str:
        """Build the complete HTML report."""
        report_title = title or f"Investigation Report - {summary.investigation_id}"
        timestamp = DateTimeFormatter.get_current_timestamp()

<<<<<<< HEAD
        # Generate all HTML sections
        html_sections = [
            self._build_html_head(report_title),
            self._build_html_body_start(),
            self.header_generator.generate_header(summary, report_title, timestamp),
            self.component_summary_generator.generate_summary(summary),
            self._generate_investigation_components(component_data),
            self.footer_generator.generate_footer(),
            self._build_html_body_end(),
            self._build_html_scripts(summary, component_data),
            "</body>",
            "</html>"
=======
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
>>>>>>> 001-modify-analyzer-method
        ]

        return "\n".join(html_sections)

<<<<<<< HEAD
    def _build_html_head(self, title: str) -> str:
        """Build HTML head section."""
        return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <style>{self.style_manager.get_complete_css()}</style>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js"></script>
</head>"""

    def _build_html_body_start(self) -> str:
        """Build HTML body opening."""
        return """<body>
    <div class="container">"""

    def _build_html_body_end(self) -> str:
        """Build HTML body closing."""
        return """    </div>"""

    def _build_html_scripts(self, summary: InvestigationSummary, component_data: ComponentData) -> str:
        """Build JavaScript section."""
        return f"""    <script>
        {self.js_manager.generate_complete_javascript(summary, component_data)}
    </script>"""

    def _generate_investigation_components(self, component_data: ComponentData) -> str:
        """Generate all investigation component sections."""
        from .components import (
            TimelineGenerator,
            FlowGraphGenerator,
            ToolsAnalysisGenerator,
            RiskDashboardGenerator,
            ExplanationsGenerator,
            JourneyGenerator
        )

        components = []
        component_generators = {
            'timeline': TimelineGenerator(),
            'flow_graph': FlowGraphGenerator(),
            'tools_analysis': ToolsAnalysisGenerator(),
            'risk_dashboard': RiskDashboardGenerator(),
            'explanations': ExplanationsGenerator(),
            'journey': JourneyGenerator()
        }

        # Include only enabled components
        enabled_components = self.config.include_components or list(component_generators.keys())

        for component_name in enabled_components:
            if component_name in component_generators:
                try:
                    generator = component_generators[component_name]
                    component_html = generator.generate_component(component_data)
                    components.append(component_html)
                except Exception as e:
                    logger.warning(f"Failed to generate component {component_name}: {e}")
                    components.append(f'<div class="error">Failed to generate {component_name}: {str(e)}</div>')

        return "\n".join(components)

=======
>>>>>>> 001-modify-analyzer-method
    def _generate_output_path(self, summary: InvestigationSummary) -> Path:
        """Generate output path for the report."""
        reports_dir = Path("reports/generated")
        reports_dir.mkdir(parents=True, exist_ok=True)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"investigation_report_{summary.investigation_id}_{timestamp}.html"
        return reports_dir / filename


<<<<<<< HEAD
class ReportValidator:
    """Validates report generation inputs and outputs."""

    @staticmethod
    def validate_folder_structure(folder_path: Path) -> tuple[bool, List[str]]:
        """Validate investigation folder structure."""
        from .utils import InvestigationValidator
        return InvestigationValidator.validate_folder_structure(folder_path)

    @staticmethod
    def validate_config(config: ReportConfig) -> tuple[bool, List[str]]:
        """Validate report configuration."""
        errors = []

        if config.max_data_points < 10:
            errors.append("max_data_points must be at least 10")

        if config.chart_height < 100:
            errors.append("chart_height must be at least 100px")

        valid_themes = [theme.value for theme in ReportTheme]
        if config.theme.value not in valid_themes:
            errors.append(f"Invalid theme: {config.theme.value}")

        return len(errors) == 0, errors
=======
# Re-export ReportValidator for backwards compatibility
__all__ = ["ReportCore", "ReportValidator"]
>>>>>>> 001-modify-analyzer-method
