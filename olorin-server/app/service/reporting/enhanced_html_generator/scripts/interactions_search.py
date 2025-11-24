#!/usr/bin/env python3
"""
Search Functionality JavaScript for Enhanced HTML Report Generator.

Provides search and text highlighting functionality for reports.
"""


class SearchFunctionalityGenerator:
    """Generates search and highlighting JavaScript."""

    @staticmethod
    def generate_search_functionality() -> str:
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
