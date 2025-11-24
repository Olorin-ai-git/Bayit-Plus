#!/usr/bin/env python3
"""
Progress Indicators JavaScript for Enhanced HTML Report Generator.

Provides animated progress bar functionality for reports.
"""


class ProgressIndicatorGenerator:
    """Generates progress indicator JavaScript."""

    @staticmethod
    def generate_progress_indicators() -> str:
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
