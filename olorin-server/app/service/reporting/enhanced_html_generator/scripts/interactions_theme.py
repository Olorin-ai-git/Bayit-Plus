#!/usr/bin/env python3
"""
Theme Switcher JavaScript for Enhanced HTML Report Generator.

Provides dark/light theme switching functionality for reports.
"""


class ThemeSwitcherGenerator:
    """Generates theme switching JavaScript."""

    @staticmethod
    def generate_theme_switcher() -> str:
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
