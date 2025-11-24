#!/usr/bin/env python3
"""
Tooltip System JavaScript for Enhanced HTML Report Generator.

Provides tooltip functionality for interactive elements in reports.
"""


class TooltipSystemGenerator:
    """Generates tooltip system JavaScript."""

    @staticmethod
    def generate_tooltip_system() -> str:
        """Generate tooltip system for interactive elements."""
        return """
        // Tooltip System
        function initializeTooltips() {
            const tooltipElements = document.querySelectorAll('[data-tooltip]');

            tooltipElements.forEach(function(element) {
                element.addEventListener('mouseenter', function() {
                    const tooltip = document.createElement('div');
                    tooltip.className = 'tooltip';
                    tooltip.textContent = this.dataset.tooltip;
                    tooltip.style.cssText = `
                        position: absolute;
                        background: #333;
                        color: white;
                        padding: 8px 12px;
                        border-radius: 4px;
                        font-size: 12px;
                        white-space: nowrap;
                        z-index: 1000;
                        pointer-events: none;
                    `;

                    document.body.appendChild(tooltip);

                    const rect = this.getBoundingClientRect();
                    tooltip.style.left = rect.left + 'px';
                    tooltip.style.top = (rect.top - tooltip.offsetHeight - 5) + 'px';

                    this._tooltip = tooltip;
                });

                element.addEventListener('mouseleave', function() {
                    if (this._tooltip) {
                        document.body.removeChild(this._tooltip);
                        this._tooltip = null;
                    }
                });
            });
        }

        document.addEventListener('DOMContentLoaded', initializeTooltips);
        """
