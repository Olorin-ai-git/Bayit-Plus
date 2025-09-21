#!/usr/bin/env python3
"""
Interactive JavaScript generation for Enhanced HTML Report Generator.

Provides user interaction scripts for reports including collapsible sections,
search functionality, and dynamic content loading.
"""

from ..data_models import ReportConfig


class InteractionScriptGenerator:
    """Generates interactive JavaScript for reports."""

    def __init__(self, config: ReportConfig):
        self.config = config

    def generate_interaction_scripts(self) -> str:
        """Generate all interaction scripts."""
        scripts = [
            self._generate_collapsible_sections(),
            self._generate_search_functionality(),
            self._generate_tooltip_system(),
            self._generate_theme_switcher(),
            self._generate_progress_indicators()
        ]

        return "\n\n".join(scripts)

    def _generate_collapsible_sections(self) -> str:
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

    def _generate_search_functionality(self) -> str:
        """Generate search functionality for reports."""
        return """
        // Search Functionality
        function initializeSearch() {
            const searchInput = document.getElementById('reportSearch');
            if (!searchInput) return;

            searchInput.addEventListener('input', function() {
                const searchTerm = this.value.toLowerCase();
                const sections = document.querySelectorAll('.section');

                sections.forEach(function(section) {
                    const text = section.textContent.toLowerCase();
                    if (text.includes(searchTerm) || searchTerm === '') {
                        section.style.display = 'block';
                        highlightText(section, searchTerm);
                    } else {
                        section.style.display = 'none';
                    }
                });
            });
        }

        function highlightText(element, term) {
            if (!term) return;

            const walker = document.createTreeWalker(
                element,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );

            const textNodes = [];
            let node;
            while (node = walker.nextNode()) {
                textNodes.push(node);
            }

            textNodes.forEach(function(node) {
                const text = node.textContent;
                const regex = new RegExp(`(${term})`, 'gi');
                if (regex.test(text)) {
                    const highlightedText = text.replace(regex, '<mark>$1</mark>');
                    const span = document.createElement('span');
                    span.innerHTML = highlightedText;
                    node.parentNode.replaceChild(span, node);
                }
            });
        }

        document.addEventListener('DOMContentLoaded', initializeSearch);
        """

    def _generate_tooltip_system(self) -> str:
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

    def _generate_theme_switcher(self) -> str:
        """Generate theme switching functionality."""
        return """
        // Theme Switcher
        function initializeThemeSwitcher() {
            const themeButton = document.getElementById('themeToggle');
            if (!themeButton) return;

            themeButton.addEventListener('click', function() {
                document.body.classList.toggle('dark-theme');
                const isDark = document.body.classList.contains('dark-theme');
                localStorage.setItem('reportTheme', isDark ? 'dark' : 'light');
                this.textContent = isDark ? '☀️' : '🌙';
            });

            // Load saved theme
            const savedTheme = localStorage.getItem('reportTheme');
            if (savedTheme === 'dark') {
                document.body.classList.add('dark-theme');
                if (themeButton) themeButton.textContent = '☀️';
            }
        }

        document.addEventListener('DOMContentLoaded', initializeThemeSwitcher);
        """

    def _generate_progress_indicators(self) -> str:
        """Generate progress indicator animations."""
        return """
        // Progress Indicators
        function initializeProgressBars() {
            const progressBars = document.querySelectorAll('.progress-bar');

            const observer = new IntersectionObserver(function(entries) {
                entries.forEach(function(entry) {
                    if (entry.isIntersecting) {
                        const progressBar = entry.target;
                        const targetWidth = progressBar.dataset.progress || '0%';

                        progressBar.style.width = '0%';
                        progressBar.style.transition = 'width 1.5s ease-in-out';

                        setTimeout(function() {
                            progressBar.style.width = targetWidth;
                        }, 100);

                        observer.unobserve(progressBar);
                    }
                });
            });

            progressBars.forEach(function(bar) {
                observer.observe(bar);
            });
        }

        document.addEventListener('DOMContentLoaded', initializeProgressBars);
        """