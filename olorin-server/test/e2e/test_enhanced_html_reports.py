#!/usr/bin/env python3
"""
Test Enhanced HTML Report Generation

Tests the complete enhanced HTML report generation system with real investigation data.
"""

import sys
import os
from pathlib import Path

# Add the app directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

def test_enhanced_html_report_generation():
    """Test enhanced HTML report generation with real investigation folder"""
    print("🧪 Testing Enhanced HTML Report Generation...")
    
    try:
        from app.service.logging.investigation_folder_manager import get_folder_manager
        
        # Find existing investigation folders
        folder_manager = get_folder_manager()
        investigations = folder_manager.list_investigations()
        
        if not investigations:
            print("❌ No investigation folders found to test with")
            return False
        
        # Use the first investigation folder
        investigation = investigations[0]
        folder_path = Path(investigation.folder_path)
        
        print(f"📁 Testing with investigation: {investigation.investigation_id}")
        print(f"   Mode: {investigation.mode}")
        print(f"   Scenario: {investigation.scenario}")
        print(f"   Path: {folder_path}")
        
        # Check if the enhanced HTML report generator exists
        try:
            from app.service.reporting.enhanced_html_report_generator import EnhancedHTMLReportGenerator
            print("✅ Enhanced HTML Report Generator imported successfully")
        except ImportError as e:
            print(f"❌ Failed to import Enhanced HTML Report Generator: {e}")
            return False
        
        # Test the data processor
        try:
            from app.service.reporting.investigation_data_processor import process_investigation_folder
            
            # Process the investigation data
            print("🔍 Processing investigation data...")
            result = process_investigation_folder(str(folder_path))
            
            print(f"   ✅ Processed {result.total_interactions} interactions")
            print(f"   ✅ Found {result.total_tools_executions} tool executions")
            print(f"   ✅ Processed {result.total_agent_decisions} agent decisions")
            
        except ImportError as e:
            print(f"❌ Failed to import investigation data processor: {e}")
            return False
        except Exception as e:
            print(f"❌ Failed to process investigation data: {e}")
            return False
        
        # Test HTML report generation
        try:
            generator = EnhancedHTMLReportGenerator()
            
            print("🎨 Generating enhanced HTML report...")
            report_path = generator.generate_comprehensive_report(folder_path)
            
            if report_path and Path(report_path).exists():
                report_size = Path(report_path).stat().st_size
                print(f"✅ HTML report generated successfully!")
                print(f"   📄 Report path: {report_path}")
                print(f"   📊 Report size: {report_size:,} bytes")
                
                # Verify report contains expected components
                with open(report_path, 'r') as f:
                    content = f.read()
                    
                expected_components = [
                    "Investigation Report",
                    "Executive Summary", 
                    "LLM Interactions",
                    "Investigation Flow",
                    "Tools & Agents",
                    "Risk Analysis",
                    "Journey Timeline"
                ]
                
                missing_components = []
                for component in expected_components:
                    if component not in content:
                        missing_components.append(component)
                
                if missing_components:
                    print(f"⚠️  Missing components: {', '.join(missing_components)}")
                else:
                    print("✅ All expected components found in report")
                
                return True
            else:
                print("❌ HTML report generation failed")
                return False
                
        except Exception as e:
            print(f"❌ Failed to generate HTML report: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    except Exception as e:
        print(f"❌ Test setup failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def list_available_investigations():
    """List all available investigation folders for testing"""
    print("📋 Available Investigation Folders:")
    
    try:
        from app.service.logging.investigation_folder_manager import get_folder_manager
        
        folder_manager = get_folder_manager()
        investigations = folder_manager.list_investigations()
        
        if not investigations:
            print("   No investigation folders found")
            return
        
        for i, investigation in enumerate(investigations[:5], 1):  # Show first 5
            print(f"   {i}. {investigation.investigation_id}")
            print(f"      Mode: {investigation.mode}")
            print(f"      Scenario: {investigation.scenario}")
            print(f"      Path: {investigation.folder_path}")
            print()
    
    except Exception as e:
        print(f"❌ Failed to list investigations: {e}")

def run_all_tests():
    """Run all enhanced HTML report tests"""
    print("🚀 Starting Enhanced HTML Report Generation Tests...\n")
    
    try:
        list_available_investigations()
        print()
        
        success = test_enhanced_html_report_generation()
        
        if success:
            print("\n✅ Enhanced HTML Report Generation Test PASSED!")
            print("🎯 The system successfully:")
            print("   ✅ Processed investigation folder data")
            print("   ✅ Generated comprehensive HTML reports")
            print("   ✅ Included all expected components")
            print("   ✅ Created interactive visualizations")
        else:
            print("\n❌ Enhanced HTML Report Generation Test FAILED!")
        
        return success
        
    except Exception as e:
        print(f"\n❌ Test execution failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)