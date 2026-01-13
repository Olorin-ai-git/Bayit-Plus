#!/usr/bin/env python3
"""
Validation script for Librarian AI Agent
Checks code structure without requiring dependencies
"""
import ast
import sys
from pathlib import Path


def check_file_exists(filepath):
    """Check if file exists"""
    path = Path(filepath)
    if path.exists():
        print(f"   ✅ {filepath}")
        return True
    else:
        print(f"   ❌ {filepath} - NOT FOUND")
        return False


def validate_python_syntax(filepath):
    """Validate Python file syntax"""
    try:
        with open(filepath, 'r') as f:
            ast.parse(f.read())
        return True
    except SyntaxError as e:
        print(f"   ❌ Syntax error in {filepath}: {e}")
        return False


def check_imports_in_file(filepath, expected_imports):
    """Check if file contains expected imports"""
    try:
        with open(filepath, 'r') as f:
            content = f.read()
            tree = ast.parse(content)

        found_imports = set()
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    found_imports.add(alias.name)
            elif isinstance(node, ast.ImportFrom):
                if node.module:
                    found_imports.add(node.module)

        missing = set(expected_imports) - found_imports
        if missing:
            print(f"   ⚠️  Missing imports in {filepath}: {missing}")
        return len(missing) == 0

    except Exception as e:
        print(f"   ❌ Error checking imports in {filepath}: {e}")
        return False


def main():
    print("\n" + "=" * 80)
    print("LIBRARIAN AI AGENT - CODE VALIDATION")
    print("=" * 80)

    all_passed = True

    # 1. Check all required files exist
    print("\n1. Checking file structure...")
    files_to_check = [
        "app/models/librarian.py",
        "app/services/librarian_service.py",
        "app/services/content_auditor.py",
        "app/services/stream_validator.py",
        "app/services/auto_fixer.py",
        "app/services/database_maintenance.py",
        "app/services/report_generator.py",
        "app/services/email_service.py",
        "app/api/routes/librarian.py",
    ]

    files_exist = all(check_file_exists(f) for f in files_to_check)
    all_passed = all_passed and files_exist

    # 2. Validate Python syntax
    print("\n2. Validating Python syntax...")
    syntax_valid = True
    for filepath in files_to_check:
        if Path(filepath).exists():
            if validate_python_syntax(filepath):
                print(f"   ✅ {filepath} - Valid syntax")
            else:
                syntax_valid = False
                all_passed = False

    # 3. Check key imports
    print("\n3. Checking key dependencies...")

    # Check models file
    print("   Checking app/models/librarian.py...")
    with open("app/models/librarian.py", 'r') as f:
        content = f.read()
        checks = [
            ("Document" in content, "Beanie Document import"),
            ("class AuditReport" in content, "AuditReport model"),
            ("class LibrarianAction" in content, "LibrarianAction model"),
            ("class StreamValidationCache" in content, "StreamValidationCache model"),
            ("class ClassificationVerificationCache" in content, "ClassificationVerificationCache model"),
        ]
        for check, desc in checks:
            if check:
                print(f"      ✅ {desc}")
            else:
                print(f"      ❌ {desc}")
                all_passed = False

    # Check main service
    print("   Checking app/services/librarian_service.py...")
    with open("app/services/librarian_service.py", 'r') as f:
        content = f.read()
        checks = [
            ("async def run_daily_audit" in content, "run_daily_audit function"),
            ("async def determine_audit_scope" in content, "determine_audit_scope function"),
            ("AuditReport" in content, "AuditReport usage"),
            ("import asyncio" in content, "asyncio import"),
        ]
        for check, desc in checks:
            if check:
                print(f"      ✅ {desc}")
            else:
                print(f"      ❌ {desc}")
                all_passed = False

    # Check AI integration
    print("   Checking app/services/content_auditor.py...")
    with open("app/services/content_auditor.py", 'r') as f:
        content = f.read()
        checks = [
            ("import anthropic" in content, "Anthropic import"),
            ("async def audit_content_items" in content, "audit_content_items function"),
            ("async def verify_classifications" in content, "verify_classifications function"),
            ("claude-sonnet-4-20250514" in content, "Claude model"),
        ]
        for check, desc in checks:
            if check:
                print(f"      ✅ {desc}")
            else:
                print(f"      ❌ {desc}")
                all_passed = False

    # Check API routes
    print("   Checking app/api/routes/librarian.py...")
    with open("app/api/routes/librarian.py", 'r') as f:
        content = f.read()
        checks = [
            ("@router.post" in content, "POST endpoints"),
            ("@router.get" in content, "GET endpoints"),
            ("require_admin()" in content, "Admin authentication"),
            ("/admin/librarian/run-audit" in content, "run-audit endpoint"),
            ("/admin/librarian/reports" in content, "reports endpoint"),
        ]
        for check, desc in checks:
            if check:
                print(f"      ✅ {desc}")
            else:
                print(f"      ❌ {desc}")
                all_passed = False

    # 4. Check configuration updates
    print("\n4. Checking configuration files...")

    with open("app/core/config.py", 'r') as f:
        content = f.read()
        checks = [
            ("SENDGRID_API_KEY" in content, "SendGrid API key setting"),
            ("ADMIN_EMAIL_ADDRESSES" in content, "Admin email addresses setting"),
            ("TMDB_API_KEY" in content, "TMDB API key setting"),
        ]
        for check, desc in checks:
            if check:
                print(f"   ✅ {desc}")
            else:
                print(f"   ❌ {desc}")
                all_passed = False

    with open(".env.example", 'r') as f:
        content = f.read()
        checks = [
            ("SENDGRID_API_KEY" in content, "SendGrid in .env.example"),
            ("ADMIN_EMAIL_ADDRESSES" in content, "Admin emails in .env.example"),
            ("TMDB_API_KEY" in content, "TMDB in .env.example"),
        ]
        for check, desc in checks:
            if check:
                print(f"   ✅ {desc}")
            else:
                print(f"   ❌ {desc}")
                all_passed = False

    # 5. Check main.py integration
    print("\n5. Checking main.py integration...")
    with open("app/main.py", 'r') as f:
        content = f.read()
        checks = [
            ("librarian" in content, "Librarian import"),
            ("librarian.router" in content, "Librarian router registration"),
        ]
        for check, desc in checks:
            if check:
                print(f"   ✅ {desc}")
            else:
                print(f"   ❌ {desc}")
                all_passed = False

    # 6. Check database.py integration
    print("\n6. Checking database.py integration...")
    with open("app/core/database.py", 'r') as f:
        content = f.read()
        checks = [
            ("from app.models.librarian import" in content, "Librarian models import"),
            ("AuditReport" in content, "AuditReport in document_models"),
            ("LibrarianAction" in content, "LibrarianAction in document_models"),
            ("StreamValidationCache" in content, "StreamValidationCache in document_models"),
        ]
        for check, desc in checks:
            if check:
                print(f"   ✅ {desc}")
            else:
                print(f"   ❌ {desc}")
                all_passed = False

    # Summary
    print("\n" + "=" * 80)
    if all_passed:
        print("✅ ALL VALIDATION CHECKS PASSED!")
        print("\nLibrarian AI Agent implementation is structurally complete.")
        print("\nTo run the actual tests:")
        print("1. Install dependencies: pip install -r requirements.txt")
        print("2. Set up .env file with required API keys")
        print("3. Start the server: uvicorn app.main:app --reload")
        print("4. Test the endpoint: POST /api/v1/admin/librarian/run-audit")
        return 0
    else:
        print("❌ SOME VALIDATION CHECKS FAILED")
        print("\nPlease review the errors above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
