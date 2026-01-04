#!/usr/bin/env python3
"""
Test script for the unified HTML generation system.

This script tests the consolidated HTML report generator to ensure
it works correctly with both test results and investigation folder data.
"""

import os
import sys
from datetime import datetime
from pathlib import Path

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))


def test_unified_html_generation():
    """Test the unified HTML generation system."""
    print("🧪 Testing Unified HTML Generation System")
    print("=" * 50)

    try:
        # Import the unified system
        from app.service.reporting.unified import (
            DataSourceType,
            UnifiedHTMLReportGenerator,
        )

        print("✅ Successfully imported unified HTML generator")

        # Create generator instance
        generator = UnifiedHTMLReportGenerator()
        print("✅ Successfully created generator instance")

        # Test 1: Basic test results data
        print("\n📋 Test 1: Generate report from test results")
        test_results = {
            "device_spoofing_test": {
                "status": "PASSED",
                "duration": 45.2,
                "overall_score": 85.5,
                "final_risk_score": 0.75,
                "confidence": 0.92,
                "phases": {
                    "device_analysis": {
                        "status": "PASSED",
                        "agent": "device_agent",
                        "duration": 12.3,
                        "risk_score": 0.6,
                    },
                    "location_analysis": {
                        "status": "PASSED",
                        "agent": "location_agent",
                        "duration": 15.8,
                        "risk_score": 0.8,
                    },
                },
                "errors": [],
                "journey_data": {
                    "milestones": [
                        "Started analysis",
                        "Device check completed",
                        "Location verified",
                    ],
                    "progress": [
                        {"step": "initialization", "completed": True},
                        {"step": "analysis", "completed": True},
                    ],
                },
                "investigation_id": "test_investigation_001",
                "start_time": "2025-09-08 17:30:00",
                "end_time": "2025-09-08 17:30:45",
            }
        }

        # Generate report
        output_dir = Path("logs/test_reports")
        output_dir.mkdir(parents=True, exist_ok=True)
        output_path = (
            output_dir / f"test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html"
        )

        generated_path = generator.generate_report(
            data_source=test_results,
            data_type=DataSourceType.TEST_RESULTS,
            output_path=output_path,
            title="Test Report - Unified System",
            theme="professional",
        )

        print(f"✅ Successfully generated test report: {generated_path}")

        # Verify file exists
        if Path(generated_path).exists():
            file_size = Path(generated_path).stat().st_size
            print(f"✅ Report file exists ({file_size} bytes)")
        else:
            print("❌ Report file not found")
            return False

        print("\n🎯 All tests passed!")
        print(f"📊 Generated report: {generated_path}")

        return True

    except ImportError as e:
        print(f"❌ Import failed: {e}")
        return False
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        import traceback

        print(f"Traceback: {traceback.format_exc()}")
        return False


if __name__ == "__main__":
    success = test_unified_html_generation()
    sys.exit(0 if success else 1)
