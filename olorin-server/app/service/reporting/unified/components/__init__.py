"""
Component system for unified HTML report generation.

This module contains the component system that generates different sections
of HTML reports in a modular, extensible way.
"""

from .base_component import BaseComponent, ComponentConfig

__all__ = [
    "BaseComponent",
    "ComponentConfig"
]