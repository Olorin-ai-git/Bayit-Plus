"""
Base component interface for HTML report generation.

This module defines the abstract base class that all report components
must inherit from, ensuring consistent interface and behavior.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional
from pathlib import Path

from ..core.data_structures import UnifiedReportData


@dataclass
class ComponentConfig:
    """Configuration settings for report components."""
    
    # Component identification
    component_id: str
    title: str
    order: int = 0
    enabled: bool = True
    
    # Display settings
    show_title: bool = True
    collapsible: bool = False
    collapsed_by_default: bool = False
    
    # Styling
    css_classes: List[str] = field(default_factory=list)
    custom_styles: Dict[str, str] = field(default_factory=dict)
    
    # Data filtering
    data_filters: Dict[str, Any] = field(default_factory=dict)
    
    # Chart/visualization settings
    chart_config: Dict[str, Any] = field(default_factory=dict)
    
    # Component-specific settings
    custom_config: Dict[str, Any] = field(default_factory=dict)


class BaseComponent(ABC):
    """
    Abstract base class for all report components.
    
    Each component is responsible for generating a specific section of the
    HTML report from the unified data structure.
    """
    
    def __init__(self, config: Optional[ComponentConfig] = None):
        """
        Initialize the component.
        
        Args:
            config: Component configuration, uses defaults if None
        """
        self.config = config or ComponentConfig(
            component_id=self.__class__.__name__.lower(),
            title=self._get_default_title()
        )
    
    @abstractmethod
    def generate(self, data: UnifiedReportData) -> str:
        """
        Generate HTML content for this component.
        
        Args:
            data: The unified report data structure
            
        Returns:
            str: HTML content for this component
            
        Raises:
            ValueError: If required data is missing or invalid
        """
        pass
    
    @abstractmethod
    def get_required_data_fields(self) -> List[str]:
        """
        Return list of required data fields for this component.
        
        Returns:
            List[str]: List of field names from UnifiedReportData that
                      this component requires to function properly
        """
        pass
    
    @abstractmethod
    def _get_default_title(self) -> str:
        """
        Get the default title for this component.
        
        Returns:
            str: Default component title
        """
        pass
    
    def get_javascript_dependencies(self) -> List[str]:
        """
        Return JavaScript dependencies required by this component.
        
        Returns:
            List[str]: List of JavaScript library names or CDN URLs
        """
        return []
    
    def get_css_dependencies(self) -> List[str]:
        """
        Return CSS dependencies required by this component.
        
        Returns:
            List[str]: List of CSS library names or CDN URLs
        """
        return []
    
    def validate_data(self, data: UnifiedReportData) -> bool:
        """
        Validate that the data contains required fields for this component.
        
        Args:
            data: The unified report data to validate
            
        Returns:
            bool: True if data is valid for this component
        """
        required_fields = self.get_required_data_fields()
        
        for field_path in required_fields:
            if not self._check_field_exists(data, field_path):
                return False
                
        return True
    
    def _check_field_exists(self, data: UnifiedReportData, field_path: str) -> bool:
        """
        Check if a nested field exists in the data structure.
        
        Args:
            data: The unified report data
            field_path: Dot-separated field path (e.g., "summary.investigation_id")
            
        Returns:
            bool: True if field exists and is not None
        """
        try:
            current = data
            for field in field_path.split('.'):
                current = getattr(current, field)
            return current is not None
        except AttributeError:
            return False
    
    def get_component_info(self) -> Dict[str, Any]:
        """
        Get information about this component.
        
        Returns:
            Dict containing component metadata
        """
        return {
            "id": self.config.component_id,
            "name": self.__class__.__name__,
            "title": self.config.title,
            "order": self.config.order,
            "enabled": self.config.enabled,
            "required_fields": self.get_required_data_fields(),
            "js_dependencies": self.get_javascript_dependencies(),
            "css_dependencies": self.get_css_dependencies(),
            "description": self.__doc__ or "No description available"
        }
    
    def render_with_wrapper(self, data: UnifiedReportData) -> str:
        """
        Render the component with standard wrapper HTML.
        
        Args:
            data: The unified report data
            
        Returns:
            str: Complete HTML section with wrapper
        """
        if not self.config.enabled:
            return ""
        
        if not self.validate_data(data):
            return self._render_error_section("Required data is missing")
        
        try:
            content = self.generate(data)
            return self._wrap_content(content)
        except Exception as e:
            return self._render_error_section(f"Error generating component: {str(e)}")
    
    def _wrap_content(self, content: str) -> str:
        """
        Wrap component content in standard HTML structure.
        
        Args:
            content: The component HTML content
            
        Returns:
            str: Wrapped HTML content
        """
        css_classes = " ".join(["report-component"] + self.config.css_classes)
        
        wrapper_start = f'<div class="{css_classes}" id="{self.config.component_id}">'
        
        if self.config.show_title:
            if self.config.collapsible:
                title_html = f'''
                <h3 class="component-title collapsible" onclick="toggleSection('{self.config.component_id}')">
                    {self.config.title} 
                    <span class="toggle-icon">{'▼' if not self.config.collapsed_by_default else '▶'}</span>
                </h3>
                '''
                content_class = "component-content" + (" collapsed" if self.config.collapsed_by_default else "")
                content = f'<div class="{content_class}">{content}</div>'
            else:
                title_html = f'<h3 class="component-title">{self.config.title}</h3>'
        else:
            title_html = ""
        
        wrapper_end = '</div>'
        
        return f"{wrapper_start}{title_html}{content}{wrapper_end}"
    
    def _render_error_section(self, error_message: str) -> str:
        """
        Render an error section when component generation fails.
        
        Args:
            error_message: The error message to display
            
        Returns:
            str: HTML error section
        """
        return f'''
        <div class="report-component error-component" id="{self.config.component_id}">
            <h3 class="component-title error-title">{self.config.title} (Error)</h3>
            <div class="error-message">
                <p><strong>Error:</strong> {error_message}</p>
                <p><em>This section could not be generated due to missing or invalid data.</em></p>
            </div>
        </div>
        '''