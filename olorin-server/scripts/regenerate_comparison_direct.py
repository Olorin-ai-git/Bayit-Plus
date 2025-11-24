#!/usr/bin/env python3
"""
Direct script to regenerate comparison report without API dependencies.
Uses the comparison service directly.
"""
import sys
import os
import asyncio
from pathlib import Path
from datetime import datetime, timedelta, timezone

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

async def regenerate_comparison_direct(entity_value: str, entity_type: str = "email"):
    """Regenerate comparison report using comparison service directly."""
    print(f"🔄 Regenerating comparison for {entity_type}:{entity_value}\n")
    
    try:
        from app.service.investigation.comparison_service import compare_windows
        from app.router.models.investigation_comparison_models import (
            ComparisonRequest,
            WindowSpec,
            WindowPreset
        )
        from app.service.investigation.html_report_generator import generate_html_report
        from app.config.file_organization_config import FileOrganizationConfig
        from app.service.investigation.file_organization_service import FileOrganizationService
        
        # Set up time windows matching existing artifact dates
        # Window A: Historical (2025-10-28 to 2025-11-11)
        # Window B: Validation (2025-11-11 to 2025-11-15)
        from dateutil.parser import parse
        
        window_a_start = parse("2025-10-28T00:00:00-04:00")
        window_a_end = parse("2025-11-11T23:59:59-05:00")
        
        window_b_start = parse("2025-11-11T00:00:00-05:00")
        window_b_end = parse("2025-11-15T23:59:59-05:00")
        
        print(f"📊 Comparison Windows:")
        print(f"   Window A: {window_a_start.date()} to {window_a_end.date()}")
        print(f"   Window B: {window_b_start.date()} to {window_b_end.date()}\n")
        
        # Create comparison request
        request = ComparisonRequest(
            entity={"type": entity_type, "value": entity_value},
            windowA=WindowSpec(
                preset=WindowPreset.CUSTOM,
                start=window_a_start.isoformat(),
                end=window_a_end.isoformat()
            ),
            windowB=WindowSpec(
                preset=WindowPreset.CUSTOM,
                start=window_b_start.isoformat(),
                end=window_b_end.isoformat()
            ),
            risk_threshold=0.7,
            options={
                "include_histograms": True,
                "include_timeseries": True
            }
        )
        
        # Run comparison
        print("⚙️ Running comparison...")
        response = await compare_windows(request)
        
        print(f"✅ Comparison completed!")
        print(f"   Window A: {response.A.total_transactions} transactions")
        print(f"   Window B: {response.B.total_transactions} transactions")
        print(f"   Window A Precision: {response.A.precision:.2%}")
        print(f"   Window A Recall: {response.A.recall:.2%}")
        print(f"   Window B Precision: {response.B.precision:.2%}")
        print(f"   Window B Recall: {response.B.recall:.2%}\n")
        
        # Generate HTML report
        file_org_config = FileOrganizationConfig()
        file_org_service = FileOrganizationService(file_org_config)
        
        report_timestamp = datetime.now()
        report_path = file_org_service.resolve_comparison_report_path(
            source_type="manual",
            entity_type=entity_type,
            entity_id=entity_value,
            timestamp=report_timestamp
        )
        
        file_org_service.create_directory_structure(report_path.parent)
        
        print(f"📄 Generating HTML report...")
        html_content = generate_html_report(response, report_path)
        
        # Write report with file locking
        file_handle = None
        try:
            file_handle = file_org_service.lock_file_for_write(
                report_path, create_if_missing=True
            )
            
            with open(report_path, 'w', encoding='utf-8') as f:
                f.write(html_content)
            
            print(f"✅ Report generated: {report_path}")
            print(f"   File size: {len(html_content):,} bytes")
            
        finally:
            if file_handle is not None:
                file_org_service.unlock_file(file_handle)
        
        return {
            "status": "success",
            "report_path": str(report_path),
            "metrics": {
                "window_a_transactions": response.A.total_transactions,
                "window_b_transactions": response.B.total_transactions,
                "window_a_precision": response.A.precision,
                "window_a_recall": response.A.recall,
                "window_b_precision": response.B.precision,
                "window_b_recall": response.B.recall,
            }
        }
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return {"status": "error", "error": str(e)}

if __name__ == "__main__":
    entity_email = sys.argv[1] if len(sys.argv) > 1 else "moeller2media@gmail.com"
    entity_type = sys.argv[2] if len(sys.argv) > 2 else "email"
    
    result = asyncio.run(regenerate_comparison_direct(entity_email, entity_type))
    
    if result.get("status") == "success":
        print(f"\n✅ Success! Report available at: {result.get('report_path')}")
        metrics = result.get("metrics", {})
        print(f"\n📊 Metrics Summary:")
        print(f"   Window A: {metrics.get('window_a_transactions', 0)} transactions")
        print(f"   Window B: {metrics.get('window_b_transactions', 0)} transactions")
        print(f"   Window A Precision: {metrics.get('window_a_precision', 0):.2%}")
        print(f"   Window A Recall: {metrics.get('window_a_recall', 0):.2%}")
        print(f"   Window B Precision: {metrics.get('window_b_precision', 0):.2%}")
        print(f"   Window B Recall: {metrics.get('window_b_recall', 0):.2%}")
    else:
        print(f"\n❌ Failed: {result.get('error', 'Unknown error')}")
        sys.exit(1)

