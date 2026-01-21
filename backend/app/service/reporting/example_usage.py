#!/usr/bin/env python3
"""
Example Usage of Enhanced HTML Report Generator

This script demonstrates how to use the EnhancedHTMLReportGenerator
to create comprehensive HTML reports from investigation folders.
"""

import os
import sys
from pathlib import Path

# Add the app directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

from app.service.logging.investigation_folder_manager import InvestigationMode
from app.service.reporting import (
    EnhancedHTMLReportGenerator,
    create_report_generator,
    generate_report_for_folder,
)


def example_basic_usage():
    """Example 1: Basic usage with convenience function"""
    print("=" * 60)
    print("Example 1: Basic Usage with Convenience Function")
    print("=" * 60)

    # Example folder path (replace with actual investigation folder)
    folder_path = "/Users/gklainert/Documents/olorin/olorin-server/logs/investigations/LIVE_example_investigation_20250908_120000"

    # Check if folder exists (for demo purposes)
    if not Path(folder_path).exists():
        print(f"⚠️  Example folder doesn't exist: {folder_path}")
        print("   Please replace with an actual investigation folder path.")
        return

    try:
        # Generate report using convenience function
        report_path = generate_report_for_folder(
            folder_path=folder_path, title="Example Investigation Report"
        )

        print(f"✅ Report generated successfully!")
        print(f"📄 Report location: {report_path}")
        print(f"🌐 Open in browser: file://{report_path.absolute()}")

    except Exception as e:
        print(f"❌ Error generating report: {e}")


def example_advanced_usage():
    """Example 2: Advanced usage with generator class"""
    print("\n" + "=" * 60)
    print("Example 2: Advanced Usage with Generator Class")
    print("=" * 60)

    # Create report generator
    base_logs_dir = Path(
        "/Users/gklainert/Documents/olorin/olorin-server/logs/investigations"
    )
    generator = create_report_generator(base_logs_dir=base_logs_dir)

    # Discover investigation folders
    print("🔍 Discovering investigation folders...")
    folders = generator.discover_investigation_folders()

    if not folders:
        print(f"⚠️  No investigation folders found in: {base_logs_dir}")
        print(
            "   Make sure investigation folders exist with the correct naming pattern."
        )
        return

    print(f"📁 Found {len(folders)} investigation folders:")

    # List discovered folders
    for i, (folder_path, metadata) in enumerate(folders[:5], 1):  # Limit to first 5
        investigation_id = metadata.get("investigation_id", "Unknown")
        mode = metadata.get("mode", "Unknown")
        scenario = metadata.get("scenario", "Unknown")

        print(f"   {i}. {folder_path.name}")
        print(f"      ID: {investigation_id}")
        print(f"      Mode: {mode}")
        print(f"      Scenario: {scenario}")
        print()

    # Generate reports for first 2 folders
    print("🔄 Generating reports for first 2 folders...")

    for i, (folder_path, metadata) in enumerate(folders[:2], 1):
        try:
            investigation_id = metadata.get("investigation_id", f"Investigation_{i}")

            print(
                f"   Generating report {i}/{min(2, len(folders))} for: {investigation_id}"
            )

            report_path = generator.generate_html_report(
                folder_path=folder_path,
                title=f"Investigation Report - {investigation_id}",
            )

            print(f"   ✅ Report {i} generated: {report_path.name}")

        except Exception as e:
            print(f"   ❌ Error generating report {i}: {e}")


def example_folder_filtering():
    """Example 3: Filter folders by investigation mode"""
    print("\n" + "=" * 60)
    print("Example 3: Filter Folders by Investigation Mode")
    print("=" * 60)

    generator = create_report_generator()

    # Filter by LIVE mode only
    print("🔍 Searching for LIVE mode investigations...")
    live_folders = generator.discover_investigation_folders(
        mode_filter=InvestigationMode.LIVE
    )

    print(f"📁 Found {len(live_folders)} LIVE investigation folders")

    for folder_path, metadata in live_folders[:3]:  # Show first 3
        print(f"   - {folder_path.name}")
        print(f"     Created: {metadata.get('created_at', 'Unknown')}")


def example_data_extraction():
    """Example 4: Extract and analyze data without generating report"""
    print("\n" + "=" * 60)
    print("Example 4: Data Extraction and Analysis")
    print("=" * 60)

    generator = create_report_generator()
    folders = generator.discover_investigation_folders()

    if not folders:
        print("⚠️  No folders found for analysis")
        return

    # Analyze first folder
    folder_path, metadata = folders[0]

    print(f"🔍 Analyzing folder: {folder_path.name}")

    try:
        # Extract data
        extracted_data = generator.extract_investigation_data(folder_path)

        # Generate summary
        summary = generator.generate_investigation_summary(extracted_data)

        # Display summary
        print(f"📊 Investigation Summary:")
        print(f"   ID: {summary.investigation_id}")
        print(f"   Mode: {summary.mode}")
        print(f"   Duration: {summary.duration_seconds:.1f}s")
        print(f"   Total Interactions: {summary.total_interactions}")
        print(f"   LLM Calls: {summary.llm_calls}")
        print(f"   Tool Executions: {summary.tool_executions}")
        print(f"   Total Tokens: {summary.total_tokens:,}")
        print(f"   Final Risk Score: {summary.final_risk_score or 'N/A'}")
        print(f"   Agents Used: {len(summary.agents_used)}")
        print(f"   Tools Used: {len(summary.tools_used)}")
        print(f"   Errors: {summary.error_count}")

    except Exception as e:
        print(f"❌ Error analyzing folder: {e}")


def main():
    """Run all examples"""
    print("🚀 Enhanced HTML Report Generator - Usage Examples")
    print("=" * 60)

    try:
        # Run examples
        example_basic_usage()
        example_advanced_usage()
        example_folder_filtering()
        example_data_extraction()

        print("\n" + "=" * 60)
        print("✅ All examples completed!")
        print("=" * 60)

    except KeyboardInterrupt:
        print("\n⚠️  Examples interrupted by user")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    main()
