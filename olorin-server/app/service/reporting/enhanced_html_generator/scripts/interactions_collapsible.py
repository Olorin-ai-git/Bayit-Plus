#!/usr/bin/env python3
"""
Collapsible Sections JavaScript for Enhanced HTML Report Generator.

Provides collapsible section functionality for reports.
"""


class CollapsibleSectionGenerator:
    """Generates collapsible section JavaScript."""

    @staticmethod
    def generate_collapsible_sections() -> str:
        """Generate collapsible section functionality."""
        return """
        // Collapsible Sections
        document.addEventListener('DOMContentLoaded', function() {
            const collapsibles = document.querySelectorAll('.collapsible-header');
            collapsibles.forEach(function(header) {
                header.addEventListener('click', function() {
                    const content = this.nextElementSibling;
                    const icon = this.querySelector('.toggle-icon');

                    if (content.style.display === 'none') {
                        content.style.display = 'block';
                        icon.textContent = '▼';
                        this.classList.add('active');
                    } else {
                        content.style.display = 'none';
                        icon.textContent = '▶';
                        this.classList.remove('active');
                    }
                });
            });
        });
        """
