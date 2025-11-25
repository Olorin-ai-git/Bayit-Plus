#!/usr/bin/env python3
"""
Interactive JavaScript generation for Enhanced HTML Report Generator.

@deprecated This module is a legacy wrapper. Use the modular interaction generators directly:
- interactions_collapsible: CollapsibleSectionGenerator
- interactions_search: SearchFunctionalityGenerator
- interactions_tooltips: TooltipSystemGenerator
- interactions_theme: ThemeSwitcherGenerator
- interactions_progress: ProgressIndicatorGenerator
"""

from ..data_models import ReportConfig
from .interactions_collapsible import CollapsibleSectionGenerator
from .interactions_progress import ProgressIndicatorGenerator
from .interactions_search import SearchFunctionalityGenerator
from .interactions_theme import ThemeSwitcherGenerator
from .interactions_tooltips import TooltipSystemGenerator


class InteractionScriptGenerator:
    """
    Generates interactive JavaScript for reports.

    @deprecated Use the specialized generators directly for better modularity.
    """

    def __init__(self, config: ReportConfig):
        self.config = config

    def generate_interaction_scripts(self) -> str:
        """Generate all interaction scripts."""
        scripts = [
            CollapsibleSectionGenerator.generate_collapsible_sections(),
            SearchFunctionalityGenerator.generate_search_functionality(),
            TooltipSystemGenerator.generate_tooltip_system(),
            ThemeSwitcherGenerator.generate_theme_switcher(),
            ProgressIndicatorGenerator.generate_progress_indicators(),
        ]

        return "\n\n".join(scripts)

    # Legacy method wrappers for backwards compatibility
    def _generate_collapsible_sections(self) -> str:
        """@deprecated Use CollapsibleSectionGenerator.generate_collapsible_sections()"""
        return CollapsibleSectionGenerator.generate_collapsible_sections()

    def _generate_search_functionality(self) -> str:
        """@deprecated Use SearchFunctionalityGenerator.generate_search_functionality()"""
        return SearchFunctionalityGenerator.generate_search_functionality()

    def _generate_tooltip_system(self) -> str:
        """@deprecated Use TooltipSystemGenerator.generate_tooltip_system()"""
        return TooltipSystemGenerator.generate_tooltip_system()

    def _generate_theme_switcher(self) -> str:
        """@deprecated Use ThemeSwitcherGenerator.generate_theme_switcher()"""
        return ThemeSwitcherGenerator.generate_theme_switcher()

    def _generate_progress_indicators(self) -> str:
        """@deprecated Use ProgressIndicatorGenerator.generate_progress_indicators()"""
        return ProgressIndicatorGenerator.generate_progress_indicators()
