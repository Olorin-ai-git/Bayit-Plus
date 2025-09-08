#!/usr/bin/env python3
"""
Base Visualization Component

Provides the abstract base class for all visualization components with common
functionality including error handling, data validation, theme support,
and accessibility features.
"""

import json
import logging
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Dict, List, Any, Optional, Union
from pathlib import Path
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)

class ComponentTheme(Enum):
    """Available component themes"""
    DEFAULT = "default"
    DARK = "dark"
    HIGH_CONTRAST = "high_contrast"
    COLORBLIND_FRIENDLY = "colorblind_friendly"

@dataclass
class ComponentConfig:
    """Configuration for visualization components"""
    theme: ComponentTheme = ComponentTheme.DEFAULT
    enable_animations: bool = True
    enable_tooltips: bool = True
    responsive: bool = True
    accessibility_enabled: bool = True
    max_data_points: int = 1000
    chart_height: int = 400
    enable_export: bool = True
    debug_mode: bool = False

class BaseVisualizationComponent(ABC):
    """
    Abstract base class for all visualization components.
    
    Provides common functionality:
    - Error handling and data validation
    - Theme and styling management
    - Accessibility features
    - Responsive design utilities
    - Performance optimization
    - Debug and logging capabilities
    """
    
    def __init__(self, config: Optional[ComponentConfig] = None):
        """
        Initialize base visualization component.
        
        Args:
            config: Component configuration settings
        """
        self.config = config or ComponentConfig()
        self.component_id = self._generate_component_id()
        self.errors: List[str] = []
        self.warnings: List[str] = []
        
    @property
    @abstractmethod
    def component_name(self) -> str:
        """Return the component name"""
        pass
        
    @property
    @abstractmethod 
    def component_title(self) -> str:
        """Return the component display title"""
        pass
        
    @property
    @abstractmethod
    def component_description(self) -> str:
        """Return the component description"""
        pass
    
    @abstractmethod
    def validate_data(self, data: Dict[str, Any]) -> bool:
        """
        Validate input data for the component.
        
        Args:
            data: Input data to validate
            
        Returns:
            True if data is valid, False otherwise
        """
        pass
        
    @abstractmethod
    def process_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process and transform input data for visualization.
        
        Args:
            data: Raw input data
            
        Returns:
            Processed data ready for visualization
        """
        pass
        
    @abstractmethod
    def generate_html(self, processed_data: Dict[str, Any]) -> str:
        """
        Generate HTML content for the component.
        
        Args:
            processed_data: Processed visualization data
            
        Returns:
            HTML string for the component
        """
        pass
        
    @abstractmethod
    def generate_javascript(self, processed_data: Dict[str, Any]) -> str:
        """
        Generate JavaScript code for the component.
        
        Args:
            processed_data: Processed visualization data
            
        Returns:
            JavaScript string for the component
        """
        pass
        
    def generate_css(self) -> str:
        """
        Generate CSS styles for the component.
        
        Returns:
            CSS string for the component
        """
        return self._get_base_css()
        
    def generate_component(self, data: Dict[str, Any]) -> Dict[str, str]:
        """
        Generate complete component (HTML, CSS, JavaScript).
        
        Args:
            data: Input data for the component
            
        Returns:
            Dictionary with 'html', 'css', 'javascript' keys
        """
        try:
            # Clear previous errors and warnings
            self.errors.clear()
            self.warnings.clear()
            
            # Validate input data
            if not self.validate_data(data):
                return self._generate_error_component("Invalid input data")
            
            # Process data
            processed_data = self.process_data(data)
            
            if not processed_data:
                return self._generate_empty_component()
                
            # Generate component parts
            html = self.generate_html(processed_data)
            css = self.generate_css()
            javascript = self.generate_javascript(processed_data)
            
            return {
                'html': html,
                'css': css,
                'javascript': javascript,
                'metadata': {
                    'component_id': self.component_id,
                    'component_name': self.component_name,
                    'generated_at': datetime.now().isoformat(),
                    'data_points': len(processed_data.get('data', [])),
                    'errors': self.errors.copy(),
                    'warnings': self.warnings.copy()
                }
            }
            
        except Exception as e:
            error_msg = f"Error generating {self.component_name}: {str(e)}"
            logger.error(error_msg)
            self.errors.append(error_msg)
            return self._generate_error_component(error_msg)
    
    def _generate_component_id(self) -> str:
        """Generate unique component ID"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        return f"{self.component_name}_{timestamp}"
    
    def _add_error(self, message: str) -> None:
        """Add error message"""
        self.errors.append(message)
        logger.error(f"{self.component_name}: {message}")
        
    def _add_warning(self, message: str) -> None:
        """Add warning message"""
        self.warnings.append(message)
        logger.warning(f"{self.component_name}: {message}")
        
    def _format_timestamp(self, timestamp_str: str) -> str:
        """Format timestamp for display"""
        if not timestamp_str:
            return "Unknown Time"
            
        try:
            if 'T' in timestamp_str:
                dt = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                return dt.strftime("%H:%M:%S")
            elif ',' in timestamp_str:
                parts = timestamp_str.split(',')[0]
                dt = datetime.strptime(parts, "%Y-%m-%d %H:%M:%S")
                return dt.strftime("%H:%M:%S")
            else:
                return timestamp_str[:20] if len(timestamp_str) > 20 else timestamp_str
        except (ValueError, AttributeError):
            return timestamp_str[:20] if len(timestamp_str) > 20 else timestamp_str
    
    def _sanitize_string(self, text: str, max_length: int = 1000) -> str:
        """Sanitize string for HTML output"""
        if not text:
            return ""
        
        # Truncate if too long
        if len(text) > max_length:
            text = text[:max_length] + "..."
            
        # Basic HTML escaping
        text = (text.replace('&', '&amp;')
                   .replace('<', '&lt;')
                   .replace('>', '&gt;')
                   .replace('"', '&quot;')
                   .replace("'", '&#39;'))
        
        return text
    
    def _get_theme_colors(self) -> Dict[str, str]:
        """Get color palette for current theme"""
        color_palettes = {
            ComponentTheme.DEFAULT: {
                'primary': '#667eea',
                'secondary': '#764ba2', 
                'success': '#28a745',
                'warning': '#fd7e14',
                'danger': '#dc3545',
                'info': '#17a2b8',
                'light': '#f8f9fa',
                'dark': '#343a40',
                'background': '#ffffff',
                'text': '#2c3e50',
                'border': '#dee2e6'
            },
            ComponentTheme.DARK: {
                'primary': '#7c3aed',
                'secondary': '#a855f7',
                'success': '#10b981', 
                'warning': '#f59e0b',
                'danger': '#ef4444',
                'info': '#06b6d4',
                'light': '#374151',
                'dark': '#111827',
                'background': '#1f2937',
                'text': '#f9fafb',
                'border': '#4b5563'
            },
            ComponentTheme.HIGH_CONTRAST: {
                'primary': '#000000',
                'secondary': '#ffffff',
                'success': '#008000',
                'warning': '#ff8800',
                'danger': '#ff0000', 
                'info': '#0066cc',
                'light': '#ffffff',
                'dark': '#000000',
                'background': '#ffffff',
                'text': '#000000',
                'border': '#000000'
            },
            ComponentTheme.COLORBLIND_FRIENDLY: {
                'primary': '#1f77b4',
                'secondary': '#ff7f0e',
                'success': '#2ca02c',
                'warning': '#d62728',
                'danger': '#9467bd',
                'info': '#8c564b',
                'light': '#f8f9fa',
                'dark': '#343a40', 
                'background': '#ffffff',
                'text': '#2c3e50',
                'border': '#dee2e6'
            }
        }
        
        return color_palettes.get(self.config.theme, color_palettes[ComponentTheme.DEFAULT])
    
    def _get_base_css(self) -> str:
        """Get base CSS styles for all components"""
        colors = self._get_theme_colors()
        
        return f"""
        .viz-component-{self.component_id} {{
            background: {colors['background']};
            color: {colors['text']};
            border: 1px solid {colors['border']};
            border-radius: 12px;
            margin: 20px 0;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            transition: all 0.3s ease;
        }}
        
        .viz-component-{self.component_id}:hover {{
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
            transform: translateY(-2px);
        }}
        
        .viz-header-{self.component_id} {{
            background: linear-gradient(135deg, {colors['primary']} 0%, {colors['secondary']} 100%);
            color: white;
            padding: 20px;
            font-weight: 600;
            font-size: 1.2em;
        }}
        
        .viz-content-{self.component_id} {{
            padding: 25px;
        }}
        
        .viz-chart-container-{self.component_id} {{
            position: relative;
            height: {self.config.chart_height}px;
            margin: 20px 0;
            background: {colors['light']};
            border-radius: 8px;
            padding: 15px;
        }}
        
        .viz-stats-grid-{self.component_id} {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }}
        
        .viz-stat-item-{self.component_id} {{
            text-align: center;
            padding: 15px;
            background: {colors['light']};
            border-radius: 8px;
            border: 1px solid {colors['border']};
            transition: all 0.3s ease;
        }}
        
        .viz-stat-item-{self.component_id}:hover {{
            transform: translateY(-3px);
            box-shadow: 0 6px 15px rgba(0, 0, 0, 0.1);
        }}
        
        .viz-stat-value-{self.component_id} {{
            font-size: 2em;
            font-weight: bold;
            color: {colors['primary']};
            margin-bottom: 5px;
        }}
        
        .viz-stat-label-{self.component_id} {{
            color: {colors['text']};
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }}
        
        .viz-error-{self.component_id} {{
            background: {colors['danger']};
            color: white;
            padding: 15px;
            border-radius: 8px;
            margin: 10px 0;
            text-align: center;
        }}
        
        .viz-empty-{self.component_id} {{
            text-align: center;
            padding: 40px;
            color: {colors['text']};
            opacity: 0.7;
        }}
        
        /* Responsive design */
        @media (max-width: 768px) {{
            .viz-component-{self.component_id} {{
                margin: 10px 0;
            }}
            
            .viz-header-{self.component_id}, .viz-content-{self.component_id} {{
                padding: 15px;
            }}
            
            .viz-chart-container-{self.component_id} {{
                height: 300px;
            }}
            
            .viz-stats-grid-{self.component_id} {{
                grid-template-columns: 1fr;
            }}
        }}
        
        /* Accessibility */
        .viz-component-{self.component_id} [role="button"],
        .viz-component-{self.component_id} button {{
            min-height: 44px;
            min-width: 44px;
        }}
        
        .viz-component-{self.component_id} :focus {{
            outline: 2px solid {colors['primary']};
            outline-offset: 2px;
        }}
        
        /* Animations */
        @keyframes viz-fade-in-{self.component_id} {{
            from {{ opacity: 0; transform: translateY(20px); }}
            to {{ opacity: 1; transform: translateY(0); }}
        }}
        
        .viz-animate-{self.component_id} {{
            animation: viz-fade-in-{self.component_id} 0.6s ease-out;
        }}
        """
    
    def _generate_error_component(self, error_message: str) -> Dict[str, str]:
        """Generate error component"""
        html = f"""
        <div class="viz-component-{self.component_id} viz-animate-{self.component_id}">
            <div class="viz-header-{self.component_id}">
                ⚠️ {self.component_title} - Error
            </div>
            <div class="viz-content-{self.component_id}">
                <div class="viz-error-{self.component_id}">
                    <strong>Error:</strong> {self._sanitize_string(error_message)}
                </div>
                <p>Unable to generate visualization due to data or processing issues.</p>
            </div>
        </div>
        """
        
        return {
            'html': html,
            'css': self._get_base_css(),
            'javascript': f'console.error("Component {self.component_name} failed to load: {error_message}");',
            'metadata': {
                'component_id': self.component_id,
                'component_name': self.component_name,
                'generated_at': datetime.now().isoformat(),
                'status': 'error',
                'error_message': error_message
            }
        }
    
    def _generate_empty_component(self) -> Dict[str, str]:
        """Generate empty state component"""
        html = f"""
        <div class="viz-component-{self.component_id} viz-animate-{self.component_id}">
            <div class="viz-header-{self.component_id}">
                📊 {self.component_title}
            </div>
            <div class="viz-content-{self.component_id}">
                <div class="viz-empty-{self.component_id}">
                    <p><strong>No data available</strong></p>
                    <p>{self.component_description}</p>
                    <p>This component will display when relevant data is available.</p>
                </div>
            </div>
        </div>
        """
        
        return {
            'html': html,
            'css': self._get_base_css(),
            'javascript': f'console.info("Component {self.component_name} has no data to display");',
            'metadata': {
                'component_id': self.component_id,
                'component_name': self.component_name,
                'generated_at': datetime.now().isoformat(),
                'status': 'empty'
            }
        }
