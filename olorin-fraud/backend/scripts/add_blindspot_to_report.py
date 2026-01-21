#!/usr/bin/env python3
"""
Add Blindspot Heatmap to Existing Daily Report.

Injects the blindspot analysis heatmap into an existing daily HTML report.

Usage:
    poetry run python scripts/add_blindspot_to_report.py --report artifacts/startup_analysis_DAILY_2024-12-15.html
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.service.analytics.model_blindspot_analyzer import ModelBlindspotAnalyzer
from app.service.logging import get_bridge_logger
from app.service.reporting.components.blindspot_heatmap import generate_blindspot_section

logger = get_bridge_logger(__name__)


async def add_blindspot_to_report(report_path: str) -> Path:
    """Add blindspot heatmap to an existing HTML report."""
    report_file = Path(report_path)
    if not report_file.exists():
        logger.error(f"Report not found: {report_file}")
        return None

    logger.info(f"{'='*60}")
    logger.info(f"ADDING BLINDSPOT HEATMAP TO: {report_file.name}")
    logger.info(f"{'='*60}")

    # Run blindspot analysis
    logger.info("\nRunning blindspot analysis...")
    try:
        analyzer = ModelBlindspotAnalyzer()
        blindspot_data = await analyzer.analyze_blindspots(export_csv=False)

        if blindspot_data.get("status") != "success":
            logger.error(f"Blindspot analysis failed: {blindspot_data.get('error')}")
            return None

        logger.info(
            f"Analysis complete: "
            f"{len(blindspot_data.get('matrix', {}).get('cells', []))} cells, "
            f"{len(blindspot_data.get('blindspots', []))} blindspots"
        )
    except Exception as e:
        logger.error(f"Failed to run blindspot analysis: {e}", exc_info=True)
        return None

    # Generate blindspot section HTML
    blindspot_html = generate_blindspot_section(blindspot_data, include_placeholder=False)

    # Read existing report
    content = report_file.read_text(encoding="utf-8")

    # Check if blindspot section already exists
    if "nSure Model Blindspot Analysis" in content:
        logger.info("Blindspot section already exists, replacing...")
        # Find and replace existing section
        import re
        pattern = r'<section id="blindspot-analysis"[^>]*>.*?</section>'
        if re.search(pattern, content, re.DOTALL):
            content = re.sub(pattern, blindspot_html, content, flags=re.DOTALL)
        else:
            # Try finding by header
            pattern = r'<h2[^>]*>.*?nSure Model Blindspot Analysis.*?</section>'
            if re.search(pattern, content, re.DOTALL):
                content = re.sub(pattern, blindspot_html, content, flags=re.DOTALL)
    else:
        # Insert before closing </body> tag
        insert_marker = "</body>"
        if insert_marker in content:
            # Wrap in a section
            section_html = f'''
    <!-- Blindspot Analysis Section -->
    <section id="blindspot-analysis" style="margin-top: 40px;">
        {blindspot_html}
    </section>

'''
            content = content.replace(insert_marker, section_html + insert_marker)
            logger.info("Inserted blindspot section before </body>")
        else:
            logger.warning("Could not find </body> tag, appending to end")
            content += f"\n{blindspot_html}\n"

    # Write updated report
    report_file.write_text(content, encoding="utf-8")
    logger.info(f"✅ Updated report: {report_file}")

    return report_file


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Add blindspot heatmap to existing report")
    parser.add_argument("--report", type=str, required=True, help="Path to HTML report")
    args = parser.parse_args()

    result = asyncio.run(add_blindspot_to_report(args.report))
    if result:
        print(f"\nSuccess: {result}")
    else:
        print("\nFailed to add blindspot heatmap")
        sys.exit(1)
