"""
Investigation Report Section Components.

Modular components for generating investigation report sections.
Each component handles a specific aspect of the investigation visualization.

Feature: unified-report-hierarchy
"""

from app.service.reporting.components.investigation.entity_section import (
    generate_entity_section,
)
from app.service.reporting.components.investigation.evidence_section import (
    generate_evidence_section,
)
from app.service.reporting.components.investigation.timeline_section import (
    generate_timeline_section,
)

__all__ = [
    "generate_entity_section",
    "generate_timeline_section",
    "generate_evidence_section",
]
