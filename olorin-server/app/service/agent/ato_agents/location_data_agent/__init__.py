"""
Location Data Agent package for gathering and analyzing user location information.
"""

from typing import Any, Dict

from app.service.agent.tools.oii_tool.oii_tool import OIITool

from .agent import LocationDataAgent

__all__ = ["LocationDataAgent"]


class LocationDataAgent:
    def __init__(self):
        self.oii_tool = OIITool()
