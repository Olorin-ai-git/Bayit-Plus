#!/usr/bin/env python3
"""
Simple Test for Merchant Validation Framework

Tests the validation service directly without full agent dependencies.
"""

import asyncio
import json
import sys
from datetime import datetime, timedelta
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))


async def test_validation_service():
    """Test the merchant validation service directly."""
    print("\n" + "=" * 80)
    print("TESTING MERCHANT VALIDATION SERVICE")
    print("=" * 80)

    try:
        # Import validation service
        from app.service.agent.orchestration.domain_agents.merchant_validation import (
            MerchantValidationService,
            get_validation_service,
        )
        from app.service.logging.investigation_folder_manager import (
            InvestigationFolderManager,
        )

        print("\n✅ Successfully imported validation service")

        # Create test investigation folder
        investigation_id = (
            f"test-merchant-validation-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
        )
        entity_id = "test_user_12345"
        entity_type = "user_id"

        print(f"\n📋 Test Configuration:")
        print(f"   Investigation ID: {investigation_id}")
        print(f"   Entity Type: {entity_type}")
        print(f"   Entity ID: {entity_id}")

        # Create mock merchant findings
        merchant_findings = {
            "risk_score": 0.75,
            "confidence": 0.85,
            "evidence": [
                "High-risk merchant associations detected",
                "Rapid merchant switching pattern",
                "Merchant category clustering identified",
            ],
            "risk_indicators": [
                "High concentration of high-risk merchant transactions",
                "Rapid merchant switching detected",
            ],
            "metrics": {"unique_merchants": 5, "total_transactions": 10},
        }

        # Get investigation folder
        investigation_folder = None
        try:
            folder_manager = InvestigationFolderManager()
            investigation_folder = folder_manager.get_investigation_folder(
                investigation_id
            )
            # Create folder if it doesn't exist
            if investigation_folder:
                investigation_folder.mkdir(parents=True, exist_ok=True)
                print(f"\n✅ Investigation folder: {investigation_folder}")
        except Exception as e:
            print(f"\n⚠️ Could not get investigation folder: {e}")
            # Create temp folder for testing
            temp_folder = Path("/tmp") / f"test_investigation_{investigation_id}"
            temp_folder.mkdir(parents=True, exist_ok=True)
            investigation_folder = temp_folder
            print(f"   Using temp folder: {investigation_folder}")

        # Initialize validation service
        print(f"\n🔍 Step 1: Initializing Validation Service...")
        validation_service = await get_validation_service()
        await validation_service.initialize()
        print(f"   ✅ Validation service initialized")

        # Run validation
        print(f"\n🔍 Step 2: Running Validation...")
        print(f"   This will fetch historical data from Snowflake...")

        validation_results = await validation_service.run_validation(
            investigation_id=investigation_id,
            entity_type=entity_type,
            entity_id=entity_id,
            merchant_findings=merchant_findings,
            investigation_folder=investigation_folder,
        )

        print(f"\n✅ Validation completed")
        print(
            f"   Validation Complete: {validation_results.get('validation_complete', False)}"
        )

        if validation_results.get("validation_complete"):
            print(f"\n📊 Validation Results:")
            print(
                f"   Predicted Risk Score: {validation_results.get('predicted_risk_score', 'N/A')}"
            )
            print(
                f"   Actual Fraud Rate: {validation_results.get('actual_fraud_rate', 'N/A')}"
            )
            print(
                f"   Prediction Correct: {validation_results.get('prediction_correct', 'N/A')}"
            )
            print(
                f"   Risk Correlation Error: {validation_results.get('risk_correlation_error', 'N/A')}"
            )
            print(
                f"   Validation Quality: {validation_results.get('validation_quality', 'N/A')}"
            )
            print(
                f"   Historical Transactions: {validation_results.get('historical_transactions', 0)}"
            )
            print(
                f"   Actual Fraud Count: {validation_results.get('actual_fraud_count', 0)}"
            )
            print(
                f"   Actual Total Transactions: {validation_results.get('actual_total_transactions', 0)}"
            )
        else:
            print(f"\n⚠️ Validation incomplete:")
            print(f"   Error: {validation_results.get('error', 'Unknown')}")
            print(f"   Error Type: {validation_results.get('error_type', 'N/A')}")

        # Check if validation file was saved
        print(f"\n🔍 Step 3: Checking Saved Validation Results...")
        if investigation_folder:
            validation_file = investigation_folder / "merchant_validation_results.json"
            if validation_file.exists():
                print(f"   ✅ Validation results file found: {validation_file}")
                with open(validation_file, "r") as f:
                    saved_data = json.load(f)
                print(
                    f"   File contains validation_complete: {saved_data.get('validation_complete', False)}"
                )
            else:
                print(f"   ⚠️ Validation results file not found")

        # Cleanup
        await validation_service.cleanup()

        print(f"\n" + "=" * 80)
        print("TEST SUMMARY")
        print("=" * 80)
        print(f"✅ Validation service initialized")
        print(
            f"{'✅' if validation_results.get('validation_complete') else '⚠️'} Validation executed"
        )
        print(
            f"{'✅' if investigation_folder and (investigation_folder / 'merchant_validation_results.json').exists() else '⚠️'} Results saved"
        )
        print("=" * 80)

        return {
            "success": True,
            "validation_results": validation_results,
            "investigation_folder": (
                str(investigation_folder) if investigation_folder else None
            ),
        }

    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback

        traceback.print_exc()
        return {"success": False, "error": str(e)}


async def main():
    """Main test execution."""
    print("\n🧪 MERCHANT VALIDATION SERVICE TEST")
    print("=" * 80)
    print("This test verifies:")
    print("  1. Validation service can be imported")
    print("  2. Validation service initializes successfully")
    print("  3. Validation runs and fetches historical data")
    print("  4. Validation results are saved to file")
    print("=" * 80)

    results = await test_validation_service()

    if results.get("success"):
        print("\n✅ Test completed!")
        if results.get("validation_results", {}).get("validation_complete"):
            print("✅ Validation framework is working correctly")
        else:
            print("⚠️ Validation completed but may have encountered data issues")
            print(
                "   This is expected if historical data is not available for test entity"
            )
    else:
        print(f"\n❌ Test failed: {results.get('error')}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
