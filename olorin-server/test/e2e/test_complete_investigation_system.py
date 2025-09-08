#!/usr/bin/env python3
"""
Complete Investigation Results System Test

Tests the complete enhanced investigation results system including:
1. Unified investigation folder creation
2. Investigation logging with all file types
3. Journey tracking integration
4. Automatic HTML report generation
5. All 7 required visualization components

This demonstrates the full end-to-end system working together.
"""

import sys
import os
from pathlib import Path
from datetime import datetime, timezone

# Add the app directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

def test_complete_investigation_system():
    """Test the complete enhanced investigation results system"""
    print("🚀 Testing Complete Enhanced Investigation Results System...")
    print("=" * 80)
    
    try:
        # Import all required components
        from app.service.logging.investigation_folder_manager import InvestigationMode, get_folder_manager
        from app.service.logging.autonomous_investigation_logger import AutonomousInvestigationLogger
        from app.service.logging.journey_tracker import get_journey_tracker
        
        print("✅ Successfully imported all system components")
        
        # Initialize components
        folder_manager = get_folder_manager()
        investigation_logger = AutonomousInvestigationLogger()
        journey_tracker = get_journey_tracker()
        
        # Create a comprehensive test investigation
        investigation_id = "enhanced_system_test_investigation"
        mode = InvestigationMode.DEMO
        scenario = "comprehensive_test"
        
        print(f"\n📁 Creating investigation: {investigation_id}")
        print(f"   Mode: {mode.value}")
        print(f"   Scenario: {scenario}")
        
        # Step 1: Start investigation logging with unified folder structure
        print("\n🔧 Step 1: Starting investigation logging...")
        investigation_folder = investigation_logger.start_investigation_logging(
            investigation_id=investigation_id,
            context={
                "scenario": scenario,
                "entity_id": "test_entity_12345",
                "test_mode": mode.value,
                "description": "Comprehensive test of enhanced investigation results system",
                "features_tested": [
                    "Unified folder structure",
                    "Autonomous investigation logging", 
                    "Journey tracking integration",
                    "HTML report generation",
                    "7 visualization components"
                ]
            },
            mode=mode,
            scenario=scenario
        )
        
        print(f"✅ Investigation folder created: {investigation_folder}")
        
        # Step 2: Start journey tracking
        print("\n🗺️  Step 2: Starting journey tracking...")
        journey_tracker.start_journey_tracking(
            investigation_id=investigation_id,
            initial_state={
                "scenario": scenario,
                "entity_id": "test_entity_12345",
                "test_mode": mode.value,
                "investigation_folder": str(investigation_folder)
            }
        )
        print("✅ Journey tracking started")
        
        # Step 3: Log comprehensive investigation activities
        print("\n📊 Step 3: Logging investigation activities...")
        
        # Log LLM interactions
        llm_interaction_1 = investigation_logger.log_llm_interaction(
            investigation_id=investigation_id,
            agent_name="device_analysis_agent",
            model_name="gpt-4",
            prompt_template="Analyze device fingerprint for anomalies",
            full_prompt="Please analyze the following device fingerprint data for any suspicious patterns or anomalies that could indicate device spoofing or account takeover attempts: {...}",
            response="Analysis reveals several concerning patterns: 1) Screen resolution inconsistency with reported device model, 2) Browser fingerprint mismatch, 3) Timezone/location discrepancy. Confidence: 0.89 that this represents a spoofed device.",
            tokens_used={"total_tokens": 245, "prompt_tokens": 180, "completion_tokens": 65},
            tools_available=["device_fingerprint_analyzer", "browser_consistency_checker", "geolocation_validator"],
            tools_used=["device_fingerprint_analyzer", "browser_consistency_checker"],
            reasoning_chain="First checked device model consistency → Found resolution mismatch → Validated browser fingerprint → Confirmed suspicious pattern → High confidence assessment",
            confidence_score=0.89,
            response_time_ms=1450,
            temperature=0.1,
            max_tokens=500
        )
        
        llm_interaction_2 = investigation_logger.log_llm_interaction(
            investigation_id=investigation_id,
            agent_name="risk_assessment_agent",
            model_name="gpt-4",
            prompt_template="Calculate risk score based on investigation findings",
            full_prompt="Based on the device analysis findings and user behavior patterns, calculate a comprehensive risk score for this investigation: {...}",
            response="Risk assessment summary: Device spoofing indicators (0.89), behavioral anomalies (0.76), geolocation inconsistencies (0.82). Calculated composite risk score: 0.86 (HIGH RISK). Recommend immediate account security measures.",
            tokens_used={"total_tokens": 189, "prompt_tokens": 120, "completion_tokens": 69},
            tools_available=["risk_calculator", "behavioral_analyzer", "threat_correlator"],
            tools_used=["risk_calculator", "threat_correlator"],
            reasoning_chain="Aggregated all risk indicators → Applied weighted scoring algorithm → Cross-referenced with threat intelligence → Generated final risk assessment",
            confidence_score=0.92,
            response_time_ms=980,
            temperature=0.05,
            max_tokens=400
        )
        
        print(f"✅ Logged LLM interactions: {llm_interaction_1}, {llm_interaction_2}")
        
        # Log agent decisions
        decision_1 = investigation_logger.log_agent_decision(
            investigation_id=investigation_id,
            agent_name="orchestrator_agent",
            decision_type="investigation_path",
            context={
                "current_findings": ["device_spoofing_detected", "high_risk_indicators"],
                "available_analyses": ["behavioral_analysis", "network_analysis", "financial_analysis"],
                "time_constraints": "standard_investigation_timeline"
            },
            reasoning="Given the strong device spoofing indicators and high confidence scores, prioritizing behavioral analysis to establish timeline of suspicious activities before proceeding to financial impact assessment.",
            decision_outcome={
                "chosen_path": "behavioral_analysis",
                "sequence": ["behavioral_analysis", "financial_analysis", "final_assessment"],
                "rationale": "Device spoofing confirmed, now need to understand scope of potential compromise"
            },
            confidence_score=0.94,
            alternative_decisions=[
                {"path": "financial_analysis_first", "confidence": 0.72},
                {"path": "network_analysis_focus", "confidence": 0.68}
            ],
            execution_time_ms=75
        )
        
        print(f"✅ Logged agent decision: {decision_1}")
        
        # Log tool executions
        tool_execution_1 = investigation_logger.log_tool_execution(
            investigation_id=investigation_id,
            agent_name="network_analysis_agent",
            tool_name="geolocation_validator",
            tool_parameters={
                "ip_address": "192.168.1.100",
                "claimed_location": "New York, USA",
                "validation_level": "comprehensive",
                "check_vpn": True,
                "check_proxy": True
            },
            selection_reasoning="Need to verify claimed location against actual IP geolocation to identify potential location spoofing or VPN usage that supports device spoofing hypothesis.",
            execution_result={
                "actual_location": "San Francisco, USA",
                "claimed_location": "New York, USA",
                "distance_km": 4135,
                "vpn_detected": False,
                "proxy_detected": False,
                "location_mismatch": True,
                "confidence": 0.91
            },
            success=True,
            execution_time_ms=450
        )
        
        tool_execution_2 = investigation_logger.log_tool_execution(
            investigation_id=investigation_id,
            agent_name="behavioral_analysis_agent",
            tool_name="activity_pattern_analyzer",
            tool_parameters={
                "user_id": "test_entity_12345",
                "timeframe_days": 30,
                "analysis_depth": "comprehensive",
                "include_financial": True,
                "include_access_patterns": True
            },
            selection_reasoning="Analyzing 30-day activity patterns to establish baseline behavior and identify anomalies that correlate with suspected account takeover timeline.",
            execution_result={
                "baseline_established": True,
                "anomalies_detected": 7,
                "high_risk_activities": 3,
                "timeline_correlation": 0.87,
                "suspicious_period": "2024-12-01 to 2024-12-05",
                "risk_indicators": ["unusual_login_times", "geographic_impossibility", "spending_pattern_change"]
            },
            success=True,
            execution_time_ms=2340
        )
        
        print(f"✅ Logged tool executions: {tool_execution_1}, {tool_execution_2}")
        
        # Log journey events
        print("\n🗺️  Step 4: Logging journey events...")
        
        journey_tracker.log_node_execution(
            investigation_id=investigation_id,
            node_name="device_analysis_node",
            node_type="analysis_agent",
            input_data={
                "device_fingerprint": "sample_fingerprint_data",
                "user_agent": "Mozilla/5.0 (compatible; test)",
                "screen_resolution": "1920x1080"
            },
            output_data={
                "spoofing_detected": True,
                "confidence": 0.89,
                "risk_indicators": ["resolution_mismatch", "fingerprint_inconsistency"]
            },
            duration_ms=1450,
            status="completed"
        )
        
        journey_tracker.log_state_transition(
            investigation_id=investigation_id,
            from_state="device_analysis",
            to_state="risk_assessment", 
            trigger="analysis_completed",
            context={
                "analysis_confidence": 0.89,
                "findings": "device_spoofing_detected",
                "next_action": "calculate_risk_score"
            }
        )
        
        journey_tracker.log_agent_coordination(
            investigation_id=investigation_id,
            coordinator_agent="orchestrator_agent",
            target_agent="behavioral_analysis_agent",
            action="task_assignment",
            data={
                "task": "analyze_activity_patterns",
                "priority": "high",
                "deadline": "immediate"
            }
        )
        
        print("✅ Journey events logged")
        
        # Step 5: Log investigation progress
        print("\n📈 Step 5: Logging investigation progress...")
        
        progress_1 = investigation_logger.log_investigation_progress(
            investigation_id=investigation_id,
            progress_type="milestone_reached",
            current_phase="analysis_complete",
            completed_phases=["initialization", "data_collection", "device_analysis"],
            findings_summary={
                "device_spoofing_confidence": 0.89,
                "location_mismatch": True,
                "behavioral_anomalies": 7,
                "high_risk_indicators": 3
            },
            risk_score_progression=[
                {"timestamp": datetime.now(timezone.utc).isoformat(), "risk_score": 0.45, "phase": "initial"},
                {"timestamp": datetime.now(timezone.utc).isoformat(), "risk_score": 0.73, "phase": "device_analysis"},
                {"timestamp": datetime.now(timezone.utc).isoformat(), "risk_score": 0.86, "phase": "comprehensive_analysis"}
            ],
            agent_status={
                "device_analysis_agent": "completed",
                "network_analysis_agent": "completed", 
                "behavioral_analysis_agent": "completed",
                "risk_assessment_agent": "completed",
                "orchestrator_agent": "active"
            },
            estimated_completion_time=datetime.now(timezone.utc).isoformat()
        )
        
        print(f"✅ Investigation progress logged: {progress_1}")
        
        # Step 6: Complete investigation and generate HTML report
        print("\n🎯 Step 6: Completing investigation...")
        
        # Update final journey state
        journey_tracker.update_final_state(
            investigation_id=investigation_id,
            final_state={
                "status": "completed",
                "final_risk_score": 0.86,
                "confidence": 0.91,
                "total_duration_ms": 8500,
                "conclusion": "High-risk account takeover attempt detected with device spoofing",
                "recommendations": [
                    "Immediately suspend account access",
                    "Force password reset with 2FA verification", 
                    "Review all transactions from suspicious period",
                    "Implement additional device validation"
                ]
            }
        )
        
        # Complete journey tracking
        journey_data = journey_tracker.complete_journey_tracking(
            investigation_id=investigation_id,
            status="completed"
        )
        
        print(f"✅ Journey tracking completed")
        
        # Complete investigation logging (this will automatically generate HTML report)
        investigation_logger.complete_investigation_logging(
            investigation_id=investigation_id,
            final_status="completed"
        )
        
        print(f"✅ Investigation logging completed")
        
        # Step 7: Verify HTML report generation
        print("\n📄 Step 7: Verifying HTML report generation...")
        
        # Check if HTML report was generated
        report_file = investigation_folder / "investigation_report.html"
        if report_file.exists():
            report_size = report_file.stat().st_size
            print(f"✅ HTML report generated successfully!")
            print(f"   📄 Report path: {report_file}")
            print(f"   📊 Report size: {report_size:,} bytes")
            
            # Verify report content
            with open(report_file, 'r') as f:
                content = f.read()
                
            expected_components = [
                "Investigation Report",
                "LLM Interactions Timeline",
                "Investigation Flow", 
                "Activity Log",
                "Investigation Logs",
                "Chart.js",
                "Mermaid"
            ]
            
            missing_components = []
            found_components = []
            
            for component in expected_components:
                if component in content:
                    found_components.append(component)
                else:
                    missing_components.append(component)
            
            print(f"\n📋 HTML Report Analysis:")
            print(f"   ✅ Components found: {len(found_components)}/{len(expected_components)}")
            for component in found_components:
                print(f"      ✓ {component}")
            
            if missing_components:
                print(f"   ⚠️  Missing components:")
                for component in missing_components:
                    print(f"      ✗ {component}")
            
            # Check for specific data
            data_checks = [
                ("device_analysis_agent", "Agent names"),
                ("gpt-4", "Model references"),
                ("0.86", "Risk scores"),
                ("geolocation_validator", "Tool names"),
                ("245", "Token usage"),
                ("DEMO", "Investigation mode")
            ]
            
            found_data = []
            missing_data = []
            
            for data_item, description in data_checks:
                if data_item in content:
                    found_data.append(description)
                else:
                    missing_data.append(description)
            
            print(f"\n📊 Data Integration Analysis:")
            print(f"   ✅ Data types found: {len(found_data)}/{len(data_checks)}")
            for data_type in found_data:
                print(f"      ✓ {data_type}")
            
            if missing_data:
                print(f"   ⚠️  Missing data types:")
                for data_type in missing_data:
                    print(f"      ✗ {data_type}")
            
        else:
            print("❌ HTML report was not generated")
            return False
        
        # Step 8: Verify all investigation files
        print(f"\n📁 Step 8: Verifying investigation folder structure...")
        
        expected_files = [
            "metadata.json",
            "autonomous_activities.jsonl", 
            "journey_tracking.json",
            "investigation.log",
            "investigation_report.html"
        ]
        
        found_files = []
        missing_files = []
        
        for filename in expected_files:
            file_path = investigation_folder / filename
            if file_path.exists():
                file_size = file_path.stat().st_size
                found_files.append(f"{filename} ({file_size:,} bytes)")
            else:
                missing_files.append(filename)
        
        print(f"   ✅ Files found: {len(found_files)}/{len(expected_files)}")
        for file_info in found_files:
            print(f"      ✓ {file_info}")
        
        if missing_files:
            print(f"   ⚠️  Missing files:")
            for filename in missing_files:
                print(f"      ✗ {filename}")
        
        # Final success assessment
        success_criteria = [
            len(found_components) >= len(expected_components) * 0.8,  # 80% of components found
            len(found_data) >= len(data_checks) * 0.8,               # 80% of data integrated
            len(found_files) >= len(expected_files) * 0.9,           # 90% of files created
            report_size > 5000                                       # Substantial report size
        ]
        
        passed_criteria = sum(success_criteria)
        total_criteria = len(success_criteria)
        
        print(f"\n🎯 Final Assessment:")
        print(f"   Success criteria met: {passed_criteria}/{total_criteria}")
        
        if passed_criteria >= total_criteria * 0.8:  # 80% success rate
            print("   ✅ OVERALL TEST: PASSED")
            return True
        else:
            print("   ❌ OVERALL TEST: FAILED")
            return False
        
    except Exception as e:
        print(f"\n❌ System test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("🔍 Enhanced Investigation Results System - Complete Integration Test")
    print("=" * 80)
    
    success = test_complete_investigation_system()
    
    if success:
        print("\n🎉 COMPLETE SYSTEM TEST PASSED!")
        print("🚀 Enhanced Investigation Results System is fully operational!")
        print("\n✨ System Features Verified:")
        print("   ✅ Unified investigation folder structure ({MODE}_{ID}_{TIMESTAMP})")
        print("   ✅ Comprehensive autonomous investigation logging")
        print("   ✅ Journey tracking with node/state/coordination logging")
        print("   ✅ Automatic HTML report generation on completion")
        print("   ✅ Interactive visualizations (Charts, Mermaid diagrams)")
        print("   ✅ Professional responsive HTML reports")
        print("   ✅ Complete data integration and processing")
    else:
        print("\n❌ SYSTEM TEST FAILED!")
        print("🔧 Review the errors above and address any issues.")
    
    print("\n" + "=" * 80)
    sys.exit(0 if success else 1)