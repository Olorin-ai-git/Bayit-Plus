"""
Template engine for HTML report generation.

This module handles HTML template management, compilation, and rendering
for the unified HTML report generator system.
"""

import re
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.service.reporting.olorin_logo import OLORIN_FOOTER, get_olorin_header


class TemplateEngine:
    """
    Template engine for compiling and rendering HTML reports.

    This class manages HTML templates, handles variable substitution,
    and provides utilities for generating complete HTML documents.
    """

    def __init__(self, template_dir: Optional[Path] = None):
        """
        Initialize the template engine.

        Args:
            template_dir: Directory containing template files.
                         Uses default templates if None.
        """
        if template_dir is None:
            # Use default templates in the unified package
            current_dir = Path(__file__).parent.parent
            template_dir = current_dir / "templates"

        self.template_dir = Path(template_dir)
        self._template_cache: Dict[str, str] = {}
        self._ensure_template_dir()

    def _ensure_template_dir(self) -> None:
        """Ensure template directory exists and create default templates if needed."""
        self.template_dir.mkdir(parents=True, exist_ok=True)

        # Create default base template if it doesn't exist
        base_template_path = self.template_dir / "base_template.html"
        if not base_template_path.exists():
            self._create_default_base_template(base_template_path)

    def render_report(
        self,
        components_html: List[str],
        title: str = "Investigation Report",
        theme: str = "professional",
        js_dependencies: List[str] = None,
        css_dependencies: List[str] = None,
        custom_css: str = "",
        custom_js: str = "",
    ) -> str:
        """
        Render complete HTML report with components.

        Args:
            components_html: List of HTML content from components
            title: Report title
            theme: Theme name for styling
            js_dependencies: JavaScript library dependencies
            css_dependencies: CSS library dependencies
            custom_css: Custom CSS to include
            custom_js: Custom JavaScript to include

        Returns:
            str: Complete HTML document
        """
        base_template = self.load_template("base_template.html")

        # Generate header with logo
        header_html = get_olorin_header(title)

        # Prepare template variables
        template_vars = {
            "title": title,
            "generated_timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "header_html": header_html,
            "footer_html": OLORIN_FOOTER,
            "components_content": "\n".join(components_html),
            "theme_css": self._get_theme_css(theme),
            "dependencies_css": self._get_css_links(css_dependencies or []),
            "dependencies_js": self._get_js_links(js_dependencies or []),
            "custom_css": custom_css,
            "custom_js": custom_js,
            "interactive_js": self._get_interactive_js(),
        }

        return self.substitute_variables(base_template, template_vars)

    def load_template(self, template_name: str) -> str:
        """
        Load template from file with caching.

        Args:
            template_name: Name of the template file

        Returns:
            str: Template content

        Raises:
            FileNotFoundError: If template file doesn't exist
        """
        if template_name in self._template_cache:
            return self._template_cache[template_name]

        template_path = self.template_dir / template_name
        if not template_path.exists():
            raise FileNotFoundError(f"Template not found: {template_path}")

        try:
            with open(template_path, "r", encoding="utf-8") as f:
                content = f.read()

            self._template_cache[template_name] = content
            return content

        except Exception as e:
            raise IOError(f"Error reading template {template_name}: {str(e)}")

    def substitute_variables(self, template: str, variables: Dict[str, Any]) -> str:
        """
        Substitute variables in template using {{variable}} syntax.

        Args:
            template: Template string with variables
            variables: Dictionary of variable name -> value mappings

        Returns:
            str: Template with variables substituted
        """

        def replace_var(match):
            var_name = match.group(1).strip()
            return str(variables.get(var_name, f"{{{{Missing: {var_name}}}}}"))

        # Replace {{variable}} with values
        return re.sub(r"\{\{(.+?)\}\}", replace_var, template)

    def clear_cache(self) -> None:
        """Clear the template cache."""
        self._template_cache.clear()

    def _get_theme_css(self, theme: str) -> str:
        """
        Get CSS content for a specific theme.

        Args:
            theme: Theme name

        Returns:
            str: CSS content for the theme
        """
        theme_path = self.template_dir / "styles" / "themes" / f"{theme}.css"

        if theme_path.exists():
            try:
                with open(theme_path, "r", encoding="utf-8") as f:
                    return f.read()
            except Exception:
                pass  # Fall back to default theme

        # Return default professional theme CSS
        return self._get_default_theme_css()

    def _get_css_links(self, dependencies: List[str]) -> str:
        """Generate CSS link tags for dependencies."""
        links = []
        for dep in dependencies:
            if dep.startswith("http"):
                links.append(f'<link rel="stylesheet" href="{dep}">')
            else:
                # Map common library names to CDN URLs
                cdn_url = self._get_css_cdn_url(dep)
                if cdn_url:
                    links.append(f'<link rel="stylesheet" href="{cdn_url}">')

        return "\n".join(links)

    def _get_js_links(self, dependencies: List[str]) -> str:
        """Generate JavaScript script tags for dependencies."""
        scripts = []
        for dep in dependencies:
            if dep.startswith("http"):
                scripts.append(f'<script src="{dep}"></script>')
            else:
                # Map common library names to CDN URLs
                cdn_url = self._get_js_cdn_url(dep)
                if cdn_url:
                    scripts.append(f'<script src="{cdn_url}"></script>')

        return "\n".join(scripts)

    def _get_css_cdn_url(self, library: str) -> Optional[str]:
        """Map CSS library names to CDN URLs."""
        css_cdns = {
            "chart.js": "https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.min.css",
            "bootstrap": "https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css",
        }
        return css_cdns.get(library.lower())

    def _get_js_cdn_url(self, library: str) -> Optional[str]:
        """Map JavaScript library names to CDN URLs."""
        js_cdns = {
            "chart.js": "https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js",
            "mermaid": "https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js",
            "d3": "https://d3js.org/d3.v7.min.js",
        }
        return js_cdns.get(library.lower())

    def _get_interactive_js(self) -> str:
        """Get JavaScript for interactive functionality."""
        return """
        // Toggle collapsible sections
        function toggleSection(sectionId) {
            const content = document.querySelector('#' + sectionId + ' .component-content');
            const icon = document.querySelector('#' + sectionId + ' .toggle-icon');
            
            if (content.classList.contains('collapsed')) {
                content.classList.remove('collapsed');
                icon.textContent = '▼';
            } else {
                content.classList.add('collapsed');
                icon.textContent = '▶';
            }
        }
        
        // Initialize interactive features when DOM loads
        document.addEventListener('DOMContentLoaded', function() {
            // Initialize any chart libraries that need setup
            if (typeof mermaid !== 'undefined') {
                mermaid.initialize({
                    startOnLoad: true,
                    theme: 'default',
                    flowchart: {
                        useMaxWidth: true,
                        htmlLabels: true
                    }
                });
            }
        });
        """

    def _create_default_base_template(self, template_path: Path) -> None:
        """Create default base template file."""
        default_template = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{title}}</title>
    {{dependencies_css}}
    <style>
        {{theme_css}}
        {{custom_css}}
    </style>
</head>
<body>
    <div class="report-container">
        {{header_html}}
        
        <main class="report-content">
            {{components_content}}
        </main>
        
        {{footer_html}}
    </div>
    
    {{dependencies_js}}
    <script>
        {{interactive_js}}
        {{custom_js}}
    </script>
</body>
</html>"""

        with open(template_path, "w", encoding="utf-8") as f:
            f.write(default_template)

    def _get_default_theme_css(self) -> str:
        """Get default professional theme CSS."""
        return """
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f5f5f5;
        }
        
        .report-container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            min-height: 100vh;
        }
        
        .report-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 2rem;
            text-align: center;
        }
        
        .report-title {
            font-size: 2.5rem;
            margin-bottom: 0.5rem;
            font-weight: 300;
        }
        
        .report-meta {
            opacity: 0.9;
            font-size: 1.1rem;
        }
        
        .report-content {
            padding: 2rem;
        }
        
        .report-component {
            margin-bottom: 2rem;
            background: white;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .component-title {
            background: #f8f9fa;
            padding: 1rem 1.5rem;
            margin: 0;
            color: #495057;
            border-bottom: 2px solid #e9ecef;
            font-size: 1.4rem;
        }
        
        .component-title.collapsible {
            cursor: pointer;
            user-select: none;
        }
        
        .component-title.collapsible:hover {
            background: #e9ecef;
        }
        
        .toggle-icon {
            float: right;
            font-size: 1rem;
        }
        
        .component-content {
            padding: 1.5rem;
        }
        
        .component-content.collapsed {
            display: none;
        }
        
        .error-component {
            border-left: 5px solid #dc3545;
        }
        
        .error-title {
            background: #f8d7da;
            color: #721c24;
        }
        
        .error-message {
            color: #721c24;
            background: #f8d7da;
            padding: 1rem;
            margin: 1rem;
            border-radius: 5px;
        }
        
        .report-footer {
            background: #f8f9fa;
            padding: 1rem;
            text-align: center;
            color: #6c757d;
            font-size: 0.9rem;
        }
        
        @media (max-width: 768px) {
            .report-header {
                padding: 1rem;
            }
            
            .report-title {
                font-size: 1.8rem;
            }
            
            .report-content {
                padding: 1rem;
            }
            
            .component-content {
                padding: 1rem;
            }
        }
        """
