#!/usr/bin/env python3
"""
Simple script to regenerate comparison report for an entity.
Uses direct API calls to avoid dependency issues.
"""
import sys
import os
import requests
import json
from pathlib import Path

# Configuration
BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")
ENTITY_EMAIL = sys.argv[1] if len(sys.argv) > 1 else "moeller2media@gmail.com"
ENTITY_TYPE = sys.argv[2] if len(sys.argv) > 2 else "email"

def regenerate_comparison(entity_value: str, entity_type: str):
    """Regenerate comparison report via API."""
    print(f"🔄 Regenerating comparison for {entity_type}:{entity_value}")
    print(f"   API Base URL: {BASE_URL}\n")
    
    # Create comparison request
    from datetime import datetime, timedelta
    import pytz
    
    now = datetime.now(pytz.timezone("America/New_York"))
    
    # Window A: Historical (6 months ago, 14 days)
    window_a_end = now - timedelta(days=180)
    window_a_start = window_a_end - timedelta(days=14)
    
    # Window B: Validation (recent, 4 days)
    window_b_end = now
    window_b_start = window_b_end - timedelta(days=4)
    
    request_data = {
        "entity": {
            "type": entity_type,
            "value": entity_value
        },
        "windowA": {
            "preset": "CUSTOM",
            "start": window_a_start.isoformat(),
            "end": window_a_end.isoformat()
        },
        "windowB": {
            "preset": "CUSTOM",
            "start": window_b_start.isoformat(),
            "end": window_b_end.isoformat()
        },
        "risk_threshold": 0.7,
        "options": {
            "include_histograms": True,
            "include_timeseries": True
        }
    }
    
    try:
        # Call comparison API
        print(f"📊 Calling comparison API...")
        print(f"   Window A: {window_a_start.date()} to {window_a_end.date()}")
        print(f"   Window B: {window_b_start.date()} to {window_b_end.date()}\n")
        
        response = requests.post(
            f"{BASE_URL}/api/v1/investigations/compare/html",
            json=request_data,
            headers={"Content-Type": "application/json"},
            timeout=300
        )
        
        if response.status_code == 200:
            # Get report path from headers
            report_path = response.headers.get("X-Report-Path")
            if report_path:
                print(f"✅ Comparison report generated successfully!")
                print(f"   Report path: {report_path}")
            else:
                print(f"✅ Comparison report generated successfully!")
                print(f"   Report content length: {len(response.content)} bytes")
            
            # Save report to file
            output_dir = Path("artifacts/comparisons/regenerated")
            output_dir.mkdir(parents=True, exist_ok=True)
            
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_file = output_dir / f"comparison_{entity_type}_{entity_value.replace('@', '-at-')}_{timestamp}.html"
            
            with open(output_file, 'wb') as f:
                f.write(response.content)
            
            print(f"   Saved to: {output_file}")
            return True
        else:
            print(f"❌ Comparison failed: {response.status_code}")
            print(f"   Error: {response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ API request failed: {e}")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    regenerate_comparison(ENTITY_EMAIL, ENTITY_TYPE)

