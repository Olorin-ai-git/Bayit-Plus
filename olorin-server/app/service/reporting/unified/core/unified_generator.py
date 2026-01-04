"""
Main unified HTML report generator.

This module contains the core UnifiedHTMLReportGenerator class that
orchestrates the entire report generation process.
"""

import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

from ..components.base_component import BaseComponent
from .component_registry import ComponentRegistry
from .data_adapter import AdapterRegistry, DataAdapter, DataSourceType
from .data_structures import UnifiedReportData
from .template_engine import TemplateEngine

logger = logging.getLogger(__name__)


class UnifiedHTMLReportGenerator:
    """
    Main orchestrator class for unified HTML report generation.

    This class coordinates data adaptation, component generation, and
    template rendering to produce comprehensive HTML reports from any
    supported data source type.
    """

    def __init__(self, base_logs_dir: Optional[Path] = None):
        """
        Initialize the unified HTML report generator.

        Args:
            base_logs_dir: Base directory for log files and outputs.
                          Uses current working directory if None.
        """
        self.base_logs_dir = Path(base_logs_dir) if base_logs_dir else Path.cwd()

        # Initialize core systems
        self.adapter_registry = AdapterRegistry()
        self.component_registry = ComponentRegistry()
        self.template_engine = TemplateEngine()

        # Register default adapters and components
        self._initialize_default_systems()

    def generate_report(
        self,
        data_source: Union[Dict[str, Any], Path, str],
        data_type: DataSourceType,
        output_path: Optional[Path] = None,
        title: Optional[str] = None,
        components: Optional[List[str]] = None,
        theme: str = "professional",
        custom_config: Optional[Dict[str, Any]] = None,
    ) -> Path:
        """
        Generate unified HTML report from any supported data source.

        Args:
            data_source: The source data (format depends on data_type)
            data_type: Type of data source being provided
            output_path: Path where HTML report should be saved
            title: Custom title for the report
            components: List of component IDs to include (None = all enabled)
            theme: Theme name for styling
            custom_config: Additional configuration options

        Returns:
            Path: Path to the generated HTML report

        Raises:
            ValueError: If data source is invalid or unsupported
            FileNotFoundError: If required files are missing
        """
        logger.info(f"Starting report generation for data type: {data_type.value}")

        try:
            # Step 1: Adapt data to unified format
            logger.debug("Adapting source data to unified format")
            unified_data = self._adapt_data(data_source, data_type)

            # Step 2: Generate title if not provided
            if title is None:
                title = self._generate_default_title(unified_data)

            # Step 3: Generate components
            logger.debug("Generating component HTML content")
            components_html = self._generate_components(unified_data, components)

            # Step 4: Get dependencies from components
            js_dependencies = self.component_registry.get_javascript_dependencies()
            css_dependencies = self.component_registry.get_css_dependencies()

            # Step 5: Render complete HTML report
            logger.debug("Rendering complete HTML report")
            html_content = self.template_engine.render_report(
                components_html=components_html,
                title=title,
                theme=theme,
                js_dependencies=js_dependencies,
                css_dependencies=css_dependencies,
                custom_css=self._get_custom_css(custom_config),
                custom_js=self._get_custom_js(custom_config),
            )

            # Step 6: Save report to file
            if output_path is None:
                output_path = self._generate_default_output_path(unified_data, title)

            output_path = Path(output_path)
            output_path.parent.mkdir(parents=True, exist_ok=True)

            with open(output_path, "w", encoding="utf-8") as f:
                f.write(html_content)

            logger.info(f"Report generated successfully: {output_path}")
            return output_path

        except Exception as e:
            logger.error(f"Error generating report: {str(e)}")
            raise

    def register_adapter(self, adapter: DataAdapter) -> None:
        """
        Register a custom data adapter.

        Args:
            adapter: The adapter instance to register
        """
        self.adapter_registry.register_adapter(adapter)

    def register_component(self, component: BaseComponent) -> None:
        """
        Register a custom component.

        Args:
            component: The component instance to register
        """
        self.component_registry.register_component(component)

    def get_supported_data_types(self) -> List[str]:
        """
        Get list of supported data source types.

        Returns:
            List[str]: List of supported data type names
        """
        return [
            adapter_info["data_type"]
            for adapter_info in self.adapter_registry.get_registered_adapters()
        ]

    def get_available_components(self) -> List[Dict[str, Any]]:
        """
        Get information about all available components.

        Returns:
            List[Dict]: List of component information dictionaries
        """
        return self.component_registry.get_registry_info()["components"]

    def validate_data_source(self, data_source: Any, data_type: DataSourceType) -> bool:
        """
        Validate that a data source is compatible with the specified type.

        Args:
            data_source: The source data to validate
            data_type: The expected data source type

        Returns:
            bool: True if data source is valid
        """
        try:
            adapter = self.adapter_registry.get_adapter(data_type)
            return adapter.validate_source(data_source)
        except ValueError:
            return False

    def _initialize_default_systems(self) -> None:
        """Initialize default adapters and components."""
        # Register default adapters
        try:
            from ..adapters.investigation_folder_adapter import (
                InvestigationFolderAdapter,
            )
            from ..adapters.test_results_adapter import TestResultsAdapter

            self.adapter_registry.register_adapter(TestResultsAdapter())
            self.adapter_registry.register_adapter(InvestigationFolderAdapter())
        except ImportError as e:
            logger.warning(f"Could not import default adapters: {e}")

        # Auto-discover and register components
        discovered_count = self.component_registry.auto_discover_components()
        logger.debug(f"Auto-discovered {discovered_count} components")

    def _adapt_data(
        self, data_source: Any, data_type: DataSourceType
    ) -> UnifiedReportData:
        """
        Adapt source data to unified format using appropriate adapter.

        Args:
            data_source: The source data
            data_type: The data source type

        Returns:
            UnifiedReportData: The adapted data

        Raises:
            ValueError: If no adapter is found or data is invalid
        """
        adapter = self.adapter_registry.get_adapter(data_type)

        if not adapter.validate_source(data_source):
            raise ValueError(f"Data source is not valid for type: {data_type.value}")

        return adapter.adapt_data(data_source)

    def _generate_components(
        self, data: UnifiedReportData, component_ids: Optional[List[str]] = None
    ) -> List[str]:
        """
        Generate HTML content for all requested components.

        Args:
            data: The unified report data
            component_ids: Specific components to include (None = all enabled)

        Returns:
            List[str]: List of HTML content strings from components
        """
        if component_ids is None:
            components = self.component_registry.get_enabled_components()
        else:
            components = []
            for component_id in component_ids:
                component = self.component_registry.get_component(component_id)
                if component and component.config.enabled:
                    components.append(component)

        components_html = []
        for component in components:
            try:
                html_content = component.render_with_wrapper(data)
                if html_content.strip():  # Only include non-empty content
                    components_html.append(html_content)
            except Exception as e:
                logger.error(
                    f"Error generating component {component.config.component_id}: {e}"
                )
                # Component will render its own error section
                continue

        return components_html

    def _generate_default_title(self, data: UnifiedReportData) -> str:
        """Generate default report title from data."""
        if data.summary.scenario_name:
            return f"Investigation Report - {data.summary.scenario_name}"
        elif data.summary.investigation_id:
            return f"Investigation Report - {data.summary.investigation_id}"
        else:
            return "Investigation Report"

    def _generate_default_output_path(
        self, data: UnifiedReportData, title: str
    ) -> Path:
        """Generate default output path for report."""
        # Use investigation folder if available
        if data.investigation_folder:
            folder_path = Path(data.investigation_folder)
            return folder_path / "unified_report.html"

        # Otherwise use base logs directory
        safe_title = "".join(
            c for c in title if c.isalnum() or c in (" ", "-", "_")
        ).strip()
        safe_title = safe_title.replace(" ", "_").lower()

        filename = f"{safe_title}_report.html"
        return self.base_logs_dir / "reports" / filename

    def _get_custom_css(self, custom_config: Optional[Dict[str, Any]]) -> str:
        """Extract custom CSS from configuration."""
        if not custom_config:
            return ""
        return custom_config.get("custom_css", "")

    def _get_custom_js(self, custom_config: Optional[Dict[str, Any]]) -> str:
        """Extract custom JavaScript from configuration."""
        if not custom_config:
            return ""
        return custom_config.get("custom_js", "")
