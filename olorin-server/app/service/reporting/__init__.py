#!/usr/bin/env python3
"""
Olorin Investigation Reporting Module

This module provides comprehensive HTML report generation capabilities for
investigation folders created by the autonomous investigation system.

Main Components:
- EnhancedHTMLReportGenerator: Main class for generating interactive HTML reports
- InvestigationSummary: Data class for investigation statistics
- ComponentData: Container for processed component data

Key Features:
- Investigation folder discovery and validation
- Data extraction from all investigation file types
- Interactive visualizations with Chart.js and Mermaid.js
- Responsive HTML templates with professional styling
- Comprehensive error handling and performance optimization

Usage Examples:

Basic usage with convenience function:
    from app.service.reporting import generate_report_for_folder
    
    report_path = generate_report_for_folder(
        folder_path="/path/to/investigation/folder",
        title="Custom Investigation Report"
    )

Advanced usage with generator class:
    from app.service.reporting import EnhancedHTMLReportGenerator
    
    generator = EnhancedHTMLReportGenerator(base_logs_dir="/logs/investigations")
    folders = generator.discover_investigation_folders()
    
    for folder_path, metadata in folders:
        report_path = generator.generate_html_report(folder_path)
        print(f"Generated report: {report_path}")

Generated Report Components:
1. Executive Summary - Key metrics and statistics
2. LLM Interactions Timeline - Token usage and agent activity
3. Investigation Flow Graph - Phase transitions and workflow
4. Tools & Agents Analysis - Usage patterns and success rates
5. Risk Analysis Dashboard - Risk progression and categories
6. Investigation Explanations - Agent reasoning and decisions
7. Journey Visualization - Progress tracking and checkpoints
8. LangGraph Visualization - Node execution and flow

File Structure Support:
- metadata.json - Investigation configuration and metadata
- autonomous_activities.jsonl - Structured activity logs
- journey_tracking.json - Investigation progress data
- investigation.log - General investigation logs
"""

from .enhanced_html_generator import (
    EnhancedHTMLReportGenerator,
    ReportConfig,
    GeneratedReport
)

# For backward compatibility
InvestigationSummary = None  # Will be loaded from data_models when needed
ComponentData = None  # Will be loaded from data_models when needed

def create_report_generator(**kwargs):
    """Create a report generator with optional configuration."""
    config = ReportConfig(**kwargs) if kwargs else ReportConfig()
    return EnhancedHTMLReportGenerator(config)

def generate_report_for_folder(folder_path, output_path=None, title=None, **kwargs):
    """Generate a report for an investigation folder."""
    from pathlib import Path
    generator = create_report_generator(**kwargs)
    return generator.generate_report(Path(folder_path), Path(output_path) if output_path else None, title)

__all__ = [
    'EnhancedHTMLReportGenerator',
    'InvestigationSummary', 
    'ComponentData',
    'create_report_generator',
    'generate_report_for_folder'
]

__version__ = "1.0.0"
__author__ = "Olorin Investigation Platform"