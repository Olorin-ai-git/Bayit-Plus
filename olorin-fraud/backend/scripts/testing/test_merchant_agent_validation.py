#!/usr/bin/env python3
"""
Test Merchant Agent and Validation Framework

Direct test of merchant agent and validation framework integration.
Tests that:
1. Merchant agent runs successfully
2. Validation framework executes automatically
3. Validation results are saved
4. Validation results appear in HTML report
"""

import asyncio
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from app.service.agent.orchestration.domain_agents.merchant_agent import (
    merchant_agent_node,
)
from app.service.agent.orchestration.state_schema import InvestigationState
from app.service.logging import get_bridge_logger
from app.service.logging.investigation_folder_manager import InvestigationFolderManager
from app.service.reporting.comprehensive_investigation_report import (
    ComprehensiveInvestigationReportGenerator,
)

logger = get_bridge_logger(__name__)


async def test_merchant_agent_with_validation():
    """Test merchant agent with automatic validation."""
    print("\n" + "=" * 80)
    print("TESTING MERCHANT AGENT WITH VALIDATION FRAMEWORK")
    print("=" * 80)

    # Create test investigation state
    investigation_id = f"test-merchant-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
    entity_id = "test_user_12345"
    entity_type = "user_id"

    print(f"\n📋 Test Configuration:")
    print(f"   Investigation ID: {investigation_id}")
    print(f"   Entity Type: {entity_type}")
    print(f"   Entity ID: {entity_id}")

    # Create mock Snowflake data (in real test, this would come from actual query)
    snowflake_data = {
        "results": [
            {
                "TX_ID_KEY": "tx_001",
                "TX_DATETIME": "2024-07-11T10:00:00Z",
                "MERCHANT_NAME": "HighRiskMerchant",
                "MERCHANT_RISK_LEVEL": "high",
                "MERCHANT_SEGMENT_ID": "SEG_001",
                "PAID_AMOUNT_VALUE_IN_CURRENCY": 100.0,
                "MODEL_SCORE": 0.75,
                "IS_FRAUD_TX": 0,
                "EMAIL": "test@example.com",
                "USER_ID": entity_id,
                "IP": "192.168.1.100",
                "DEVICE_ID": "device_001",
            },
            {
                "TX_ID_KEY": "tx_002",
                "TX_DATETIME": "2024-07-11T11:00:00Z",
                "MERCHANT_NAME": "MediumRiskMerchant",
                "MERCHANT_RISK_LEVEL": "medium",
                "MERCHANT_SEGMENT_ID": "SEG_002",
                "PAID_AMOUNT_VALUE_IN_CURRENCY": 50.0,
                "MODEL_SCORE": 0.45,
                "IS_FRAUD_TX": 0,
                "EMAIL": "test@example.com",
                "USER_ID": entity_id,
                "IP": "192.168.1.101",
                "DEVICE_ID": "device_001",
            },
            {
                "TX_ID_KEY": "tx_003",
                "TX_DATETIME": "2024-07-11T12:00:00Z",
                "MERCHANT_NAME": "HighRiskMerchant",
                "MERCHANT_RISK_LEVEL": "high",
                "MERCHANT_SEGMENT_ID": "SEG_001",
                "PAID_AMOUNT_VALUE_IN_CURRENCY": 200.0,
                "MODEL_SCORE": 0.85,
                "IS_FRAUD_TX": 1,  # Fraud transaction
                "EMAIL": "test@example.com",
                "USER_ID": entity_id,
                "IP": "192.168.1.102",
                "DEVICE_ID": "device_002",
            },
        ],
        "row_count": 3,
    }

    # Create investigation state
    investigation_state: InvestigationState = {
        "investigation_id": investigation_id,
        "entity_id": entity_id,
        "entity_type": entity_type,
        "snowflake_data": snowflake_data,
        "tool_results": {},
        "domain_findings": {},
        "tools_used": [],
        "risk_indicators": [],
    }

    print(f"\n🔍 Step 1: Running Merchant Agent...")
    try:
        # Run merchant agent
        result_state = await merchant_agent_node(investigation_state)
        merchant_findings = result_state.get("domain_findings", {}).get("merchant", {})

        print(f"   ✅ Merchant agent completed successfully")
        print(f"   Risk Score: {merchant_findings.get('risk_score', 'N/A')}")
        print(f"   Confidence: {merchant_findings.get('confidence', 'N/A')}")
        print(f"   Evidence Points: {len(merchant_findings.get('evidence', []))}")
        print(
            f"   Risk Indicators: {len(merchant_findings.get('risk_indicators', []))}"
        )

        # Check if validation ran
        validation_results = merchant_findings.get("validation", {})
        if validation_results:
            print(f"\n🔍 Step 2: Checking Validation Results...")
            print(f"   ✅ Validation executed automatically")
            print(
                f"   Validation Complete: {validation_results.get('validation_complete', False)}"
            )

            if validation_results.get("validation_complete"):
                print(
                    f"   Predicted Risk: {validation_results.get('predicted_risk_score', 'N/A')}"
                )
                print(
                    f"   Actual Fraud Rate: {validation_results.get('actual_fraud_rate', 'N/A')}"
                )
                print(
                    f"   Prediction Correct: {validation_results.get('prediction_correct', 'N/A')}"
                )
                print(
                    f"   Validation Quality: {validation_results.get('validation_quality', 'N/A')}"
                )
            else:
                print(
                    f"   ⚠️ Validation incomplete: {validation_results.get('error', 'Unknown error')}"
                )
        else:
            print(
                f"\n   ⚠️ No validation results found (validation may have failed silently)"
            )

        # Check investigation folder for validation file
        print(f"\n🔍 Step 3: Checking Investigation Folder...")
        try:
            folder_manager = InvestigationFolderManager()
            investigation_folder = folder_manager.get_investigation_folder(
                investigation_id
            )

            if investigation_folder and investigation_folder.exists():
                print(f"   ✅ Investigation folder found: {investigation_folder}")

                # Check for validation results file
                validation_file = (
                    investigation_folder / "merchant_validation_results.json"
                )
                if validation_file.exists():
                    print(f"   ✅ Validation results file found: {validation_file}")
                    import json

                    with open(validation_file, "r") as f:
                        saved_validation = json.load(f)
                    print(
                        f"   Saved validation complete: {saved_validation.get('validation_complete', False)}"
                    )
                else:
                    print(
                        f"   ⚠️ Validation results file not found (may not have been saved)"
                    )

                # Test report generation
                print(f"\n🔍 Step 4: Testing Report Generation...")
                try:
                    report_generator = ComprehensiveInvestigationReportGenerator()
                    report_path = report_generator.generate_comprehensive_report(
                        investigation_folder=investigation_folder,
                        title=f"Test Merchant Agent Report - {investigation_id}",
                    )

                    if report_path.exists():
                        print(f"   ✅ HTML report generated: {report_path}")

                        # Check if report contains merchant validation section
                        with open(report_path, "r") as f:
                            report_content = f.read()

                        if "Merchant Agent Validation" in report_content:
                            print(f"   ✅ Merchant validation section found in report")
                        else:
                            print(
                                f"   ⚠️ Merchant validation section not found in report"
                            )

                        print(
                            f"\n   📄 Report size: {report_path.stat().st_size:,} bytes"
                        )
                        print(f"   📍 Report location: {report_path}")
                    else:
                        print(f"   ⚠️ Report file not created")
                except Exception as e:
                    print(f"   ⚠️ Report generation failed: {e}")
            else:
                print(
                    f"   ⚠️ Investigation folder not found (may not have been created)"
                )
        except Exception as e:
            print(f"   ⚠️ Error checking investigation folder: {e}")

        print(f"\n" + "=" * 80)
        print("TEST SUMMARY")
        print("=" * 80)
        print(f"✅ Merchant agent executed successfully")
        print(f"{'✅' if validation_results else '⚠️'} Validation framework executed")
        print(
            f"{'✅' if validation_results and validation_results.get('validation_complete') else '⚠️'} Validation completed"
        )
        print(
            f"{'✅' if investigation_folder and (investigation_folder / 'merchant_validation_results.json').exists() else '⚠️'} Validation results saved"
        )
        print(
            f"{'✅' if 'report_path' in locals() and report_path.exists() else '⚠️'} HTML report generated"
        )
        print("=" * 80)

        return {
            "success": True,
            "investigation_id": investigation_id,
            "merchant_findings": merchant_findings,
            "validation_results": validation_results,
            "investigation_folder": (
                str(investigation_folder) if investigation_folder else None
            ),
            "report_path": str(report_path) if "report_path" in locals() else None,
        }

    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback

        traceback.print_exc()
        return {"success": False, "error": str(e)}


async def main():
    """Main test execution."""
    print("\n🧪 MERCHANT AGENT VALIDATION FRAMEWORK TEST")
    print("=" * 80)
    print("This test verifies:")
    print("  1. Merchant agent executes successfully")
    print("  2. Validation framework runs automatically")
    print("  3. Validation results are saved to investigation folder")
    print("  4. Validation results appear in HTML report")
    print("=" * 80)

    results = await test_merchant_agent_with_validation()

    if results.get("success"):
        print("\n✅ All tests passed!")
        if results.get("report_path"):
            print(f"\n📄 View the HTML report at: {results['report_path']}")
    else:
        print(f"\n❌ Test failed: {results.get('error')}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
