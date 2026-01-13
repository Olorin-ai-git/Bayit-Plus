#!/usr/bin/env python3
"""
Test script for Librarian AI Agent
Tests the implementation without requiring a running server
"""
import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))


async def test_imports():
    """Test that all modules import correctly"""
    print("=" * 80)
    print("Testing Librarian AI Agent Imports")
    print("=" * 80)

    try:
        print("\n1. Testing model imports...")
        from app.models.librarian import (
            AuditReport,
            LibrarianAction,
            StreamValidationCache,
            ClassificationVerificationCache
        )
        print("   ✅ All models imported successfully")

        print("\n2. Testing service imports...")
        from app.services.librarian_service import run_daily_audit, determine_audit_scope
        print("   ✅ Librarian service imported")

        from app.services.content_auditor import audit_content_items, verify_classifications
        print("   ✅ Content auditor imported")

        from app.services.stream_validator import validate_content_streams, validate_stream_url
        print("   ✅ Stream validator imported")

        from app.services.auto_fixer import fix_content_issues, rollback_action
        print("   ✅ Auto-fixer imported")

        from app.services.database_maintenance import perform_database_maintenance
        print("   ✅ Database maintenance imported")

        from app.services.report_generator import send_audit_report, generate_html_report
        print("   ✅ Report generator imported")

        from app.services.email_service import send_email
        print("   ✅ Email service imported")

        print("\n3. Testing API route imports...")
        from app.api.routes.librarian import router
        print("   ✅ Librarian API routes imported")
        print(f"   📍 Routes registered: {len(router.routes)} endpoints")

        # List routes
        for route in router.routes:
            if hasattr(route, 'path') and hasattr(route, 'methods'):
                methods = ', '.join(route.methods)
                print(f"      {methods:6} {route.path}")

        print("\n" + "=" * 80)
        print("✅ ALL IMPORTS SUCCESSFUL!")
        print("=" * 80)

        return True

    except ImportError as e:
        print(f"\n❌ Import failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_model_creation():
    """Test creating model instances"""
    print("\n" + "=" * 80)
    print("Testing Model Creation")
    print("=" * 80)

    try:
        from app.models.librarian import AuditReport, LibrarianAction
        from datetime import datetime

        print("\n1. Creating AuditReport instance...")
        report = AuditReport(
            audit_type="manual",
            audit_date=datetime.utcnow(),
            status="in_progress",
        )
        print(f"   ✅ AuditReport created with ID: {report.audit_id}")
        print(f"      Type: {report.audit_type}")
        print(f"      Status: {report.status}")

        print("\n2. Creating LibrarianAction instance...")
        action = LibrarianAction(
            audit_id=report.audit_id,
            action_type="update_metadata",
            content_id="test_content_123",
            content_type="content",
            issue_type="missing_thumbnail",
            auto_approved=True,
        )
        print(f"   ✅ LibrarianAction created with ID: {action.action_id}")
        print(f"      Action type: {action.action_type}")
        print(f"      Auto-approved: {action.auto_approved}")

        print("\n" + "=" * 80)
        print("✅ MODEL CREATION SUCCESSFUL!")
        print("=" * 80)

        return True

    except Exception as e:
        print(f"\n❌ Model creation failed: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_configuration():
    """Test configuration settings"""
    print("\n" + "=" * 80)
    print("Testing Configuration")
    print("=" * 80)

    try:
        from app.core.config import settings

        print("\n1. Checking MongoDB configuration...")
        print(f"   MongoDB URL: {settings.MONGODB_URL[:50]}...")
        print(f"   Database: {settings.MONGODB_DB_NAME}")

        print("\n2. Checking Anthropic API configuration...")
        if settings.ANTHROPIC_API_KEY:
            print(f"   ✅ Anthropic API key configured")
        else:
            print(f"   ⚠️  Anthropic API key not configured (required for AI features)")

        print("\n3. Checking Email configuration...")
        if hasattr(settings, 'SENDGRID_API_KEY') and settings.SENDGRID_API_KEY:
            print(f"   ✅ SendGrid API key configured")
        else:
            print(f"   ℹ️  SendGrid API key not configured (email notifications disabled)")

        if hasattr(settings, 'ADMIN_EMAIL_ADDRESSES') and settings.ADMIN_EMAIL_ADDRESSES:
            emails = settings.ADMIN_EMAIL_ADDRESSES.split(',')
            print(f"   ✅ Admin emails configured: {len(emails)} recipient(s)")
        else:
            print(f"   ℹ️  Admin emails not configured")

        print("\n4. Checking TMDB configuration...")
        if hasattr(settings, 'TMDB_API_KEY') and settings.TMDB_API_KEY:
            print(f"   ✅ TMDB API key configured")
        else:
            print(f"   ⚠️  TMDB API key not configured (metadata enrichment disabled)")

        print("\n" + "=" * 80)
        print("✅ CONFIGURATION CHECK COMPLETE!")
        print("=" * 80)

        return True

    except Exception as e:
        print(f"\n❌ Configuration check failed: {e}")
        import traceback
        traceback.print_exc()
        return False


async def main():
    """Run all tests"""
    print("\n")
    print("╔" + "=" * 78 + "╗")
    print("║" + " " * 20 + "LIBRARIAN AI AGENT TEST SUITE" + " " * 29 + "║")
    print("╚" + "=" * 78 + "╝")

    results = []

    # Test imports
    results.append(await test_imports())

    # Test model creation
    results.append(await test_model_creation())

    # Test configuration
    results.append(await test_configuration())

    # Summary
    print("\n")
    print("╔" + "=" * 78 + "╗")
    print("║" + " " * 32 + "TEST SUMMARY" + " " * 34 + "║")
    print("╚" + "=" * 78 + "╝")

    passed = sum(results)
    total = len(results)

    print(f"\nTests passed: {passed}/{total}")

    if all(results):
        print("\n🎉 ALL TESTS PASSED! Librarian AI Agent is ready to use.")
        print("\nNext steps:")
        print("1. Set up environment variables in .env:")
        print("   - SENDGRID_API_KEY (for email notifications)")
        print("   - ADMIN_EMAIL_ADDRESSES (comma-separated)")
        print("   - TMDB_API_KEY (for metadata enrichment)")
        print("\n2. Start the backend server:")
        print("   uvicorn app.main:app --reload")
        print("\n3. Test the API endpoint:")
        print("   POST /api/v1/admin/librarian/run-audit")
        print("\n4. Set up Google Cloud Scheduler for daily runs")
        return 0
    else:
        print("\n❌ Some tests failed. Please check the errors above.")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
