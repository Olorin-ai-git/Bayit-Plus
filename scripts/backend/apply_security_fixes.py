#!/usr/bin/env python3
"""
Security Fixes Auto-Applicator
Automatically applies security fixes identified in the audit
"""
import os
import re
from pathlib import Path


def apply_datetime_fix():
    """Fix deprecated datetime.utcnow() usage"""
    print("\n🔧 Fixing deprecated datetime.utcnow() usage...")

    files_to_fix = [
        "app/api/routes/auth.py",
        "app/models/user.py",
    ]

    fixes_applied = 0

    for file_path in files_to_fix:
        full_path = Path(__file__).parent.parent / file_path
        if not full_path.exists():
            print(f"   ⚠️  File not found: {file_path}")
            continue

        content = full_path.read_text()
        original = content

        # Replace datetime.utcnow()
        content = content.replace("datetime.utcnow()", "datetime.now(timezone.utc)")

        # Ensure timezone import exists
        if "from datetime import" in content and "timezone" not in content:
            content = re.sub(
                r"from datetime import (.+)",
                r"from datetime import \1, timezone",
                content,
            )

        if content != original:
            full_path.write_text(content)
            fixes_applied += 1
            print(f"   ✅ Fixed: {file_path}")

    print(f"   📊 Total files fixed: {fixes_applied}")
    return fixes_applied > 0


def add_password_validation():
    """Add password strength validation to User model"""
    print("\n🔧 Adding password strength validation...")

    user_model_path = Path(__file__).parent.parent / "app/models/user.py"

    if not user_model_path.exists():
        print("   ❌ User model not found")
        return False

    content = user_model_path.read_text()

    # Check if validation already exists
    if "@validator" in content and "validate_password" in content:
        print("   ℹ️  Password validation already exists")
        return False

    # Add import if needed
    if "from pydantic import validator" not in content:
        content = content.replace(
            "from pydantic import BaseModel,",
            "from pydantic import BaseModel, validator,",
        )

    if "import re" not in content:
        # Add re import at the top
        lines = content.split("\n")
        for i, line in enumerate(lines):
            if line.startswith("from typing"):
                lines.insert(i + 1, "import re")
                break
        content = "\n".join(lines)

    # Add password validation to UserCreate class
    validation_code = '''
    @validator('password')
    def validate_password(cls, v):
        """Enforce strong password requirements"""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'[0-9]', v):
            raise ValueError('Password must contain at least one digit')
        if not re.search(r'[!@#$%^&*(),.?":{}|<>_\\-+=\\[\\]\\\\|`~]', v):
            raise ValueError('Password must contain at least one special character')
        return v
'''

    # Find UserCreate class and add validation
    pattern = r"(class UserCreate\(BaseModel\):.*?password: str)"
    replacement = r"\1" + validation_code

    content = re.sub(pattern, replacement, content, flags=re.DOTALL)

    user_model_path.write_text(content)
    print("   ✅ Password validation added to UserCreate")
    return True


def create_rate_limiter_config():
    """Create a separate rate limiter configuration file"""
    print("\n🔧 Creating rate limiter configuration...")

    limiter_path = Path(__file__).parent.parent / "app/core/rate_limiter.py"

    if limiter_path.exists():
        print("   ℹ️  Rate limiter config already exists")
        return False

    limiter_code = '''"""
Rate Limiting Configuration
Protects authentication endpoints from brute force attacks
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)

# Rate limit configurations
RATE_LIMITS = {
    "login": "5/minute",          # 5 login attempts per minute
    "register": "3/hour",          # 3 registrations per hour
    "oauth_callback": "10/minute", # 10 OAuth attempts per minute
    "password_reset": "3/hour",    # 3 password reset requests per hour
}
'''

    limiter_path.write_text(limiter_code)
    print("   ✅ Rate limiter config created")
    print("   ℹ️  Remember to install: pip install slowapi")
    return True


def show_manual_fixes():
    """Show fixes that require manual intervention"""
    print("\n📋 Manual Fixes Required:")
    print(
        """
    The following fixes require manual code changes:

    1. ✅ Rate Limiting Implementation
       - Install: poetry add slowapi
       - Update auth.py to use @limiter.limit() decorators
       - See SECURITY_FIXES_IMPLEMENTATION.md for details

    2. ✅ OAuth CSRF Protection
       - Add state parameter to GoogleAuthCode model
       - Update get_google_auth_url() to generate state
       - Update google_callback() to validate state
       - Implement Redis for state storage (optional but recommended)

    3. ✅ Timing Attack Protection
       - Update login() function with constant-time checks
       - Add random delay after failed attempts
       - See full implementation in SECURITY_FIXES_IMPLEMENTATION.md

    4. ✅ Email Verification Enforcement
       - Add check in login() to verify email_verified
       - Return 403 for unverified non-admin users

    5. ✅ Account Enumeration Protection
       - Update register() to not reveal existing emails
       - Return generic message on duplicate registration

    📖 Full implementation guide:
       backend/SECURITY_FIXES_IMPLEMENTATION.md
    """
    )


def main():
    print("╔" + "=" * 78 + "╗")
    print("║" + " " * 20 + "Security Fixes Auto-Applicator" + " " * 28 + "║")
    print("╚" + "=" * 78 + "╝")
    print()
    print("This script applies automated security fixes from the audit.")
    print("Some fixes require manual intervention and will be noted.")
    print()

    # Check if we're in the right directory
    if not Path("app/models/user.py").exists():
        print("❌ Error: Please run this script from the backend directory:")
        print("   cd /Users/olorin/Documents/olorin/backend")
        print("   python scripts/apply_security_fixes.py")
        return

    print("🔍 Checking current directory...")
    print(f"   ✅ Working directory: {Path.cwd()}")
    print()

    input("Press ENTER to start applying fixes (Ctrl+C to cancel)... ")

    # Apply automated fixes
    fixes_applied = []

    if apply_datetime_fix():
        fixes_applied.append("datetime.utcnow() deprecation")

    if add_password_validation():
        fixes_applied.append("Password strength validation")

    if create_rate_limiter_config():
        fixes_applied.append("Rate limiter configuration")

    # Summary
    print()
    print("╔" + "=" * 78 + "╗")
    print("║" + " " * 30 + "SUMMARY" + " " * 41 + "║")
    print("╚" + "=" * 78 + "╝")
    print()

    if fixes_applied:
        print(f"✅ Automated fixes applied: {len(fixes_applied)}")
        for fix in fixes_applied:
            print(f"   • {fix}")
    else:
        print("ℹ️  No automated fixes needed (already applied?)")

    show_manual_fixes()

    print()
    print("🎯 Next Steps:")
    print("   1. Review changes: git diff")
    print("   2. Run tests: pytest tests/")
    print("   3. Apply manual fixes from guide")
    print("   4. Restart backend: uvicorn app.main:app --reload")
    print()
    print("📚 Documentation:")
    print("   • Full audit: SECURITY_AUDIT_AUTH.md")
    print("   • Implementation guide: SECURITY_FIXES_IMPLEMENTATION.md")
    print("   • Summary: SECURITY_AUDIT_SUMMARY.md")
    print()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n❌ Cancelled by user")
    except Exception as e:
        print(f"\n\n❌ Error: {e}")
        import traceback

        traceback.print_exc()
