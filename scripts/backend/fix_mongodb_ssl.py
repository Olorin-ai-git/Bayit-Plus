#!/usr/bin/env python3
"""
MongoDB SSL Connection Fix Script

Diagnoses and fixes MongoDB Atlas SSL connection issues on macOS with Python 3.13+.

Usage:
    poetry run python scripts/fix_mongodb_ssl.py

Checks:
1. Python SSL certificate installation
2. MongoDB connection string format
3. SSL library versions
4. Network connectivity to MongoDB Atlas
"""

import asyncio
import os
import ssl
import sys
from pathlib import Path

import certifi
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import ConfigurationError, ConnectionFailure

from app.core.logging_config import get_logger

logger = get_logger(__name__)


def check_ssl_certificates():
    """Check if Python SSL certificates are properly installed."""
    print("\n" + "=" * 70)
    print("SSL Certificate Check")
    print("=" * 70)

    try:
        # Check OpenSSL version
        print(f"OpenSSL version: {ssl.OPENSSL_VERSION}")
        print(f"OpenSSL version info: {ssl.OPENSSL_VERSION_INFO}")

        # Check default certificate location
        print(f"\nDefault SSL context CA certs: {ssl.get_default_verify_paths()}")

        # Check certifi bundle (used by pymongo/motor)
        print(f"\nCertifi bundle location: {certifi.where()}")
        certifi_bundle = Path(certifi.where())
        if certifi_bundle.exists():
            print(f"✅ Certifi bundle exists ({certifi_bundle.stat().st_size} bytes)")
        else:
            print(f"❌ Certifi bundle NOT found")
            return False

        return True

    except Exception as e:
        print(f"❌ SSL certificate check failed: {e}")
        return False


def check_mongodb_uri():
    """Check if MongoDB URI is properly configured."""
    print("\n" + "=" * 70)
    print("MongoDB URI Check")
    print("=" * 70)

    mongodb_uri = os.getenv("MONGODB_URI")

    if not mongodb_uri:
        print("❌ MONGODB_URI environment variable not set")
        return False

    # Mask credentials for display
    if "@" in mongodb_uri:
        parts = mongodb_uri.split("@")
        uri_display = f"{parts[0][:20]}***@{parts[1]}"
    else:
        uri_display = mongodb_uri[:50] + "..."

    print(f"MongoDB URI format: {uri_display}")

    # Check for common issues
    issues = []

    if not mongodb_uri.startswith(("mongodb://", "mongodb+srv://")):
        issues.append("URI must start with mongodb:// or mongodb+srv://")

    if "retryWrites" not in mongodb_uri:
        issues.append("Missing retryWrites parameter (recommended for reliability)")

    if "w=majority" not in mongodb_uri:
        issues.append("Missing w=majority parameter (recommended for consistency)")

    if issues:
        print("\n⚠️  URI format warnings:")
        for issue in issues:
            print(f"  - {issue}")
    else:
        print("✅ MongoDB URI format looks good")

    return len(issues) == 0


async def test_mongodb_connection():
    """Test MongoDB Atlas connection with proper SSL settings."""
    print("\n" + "=" * 70)
    print("MongoDB Connection Test")
    print("=" * 70)

    mongodb_uri = os.getenv("MONGODB_URI")
    mongodb_db_name = os.getenv("MONGODB_DB_NAME", "bayit_plus")

    if not mongodb_uri:
        print("❌ MONGODB_URI not configured")
        return False

    try:
        print(f"Attempting connection to database: {mongodb_db_name}")
        print("Using explicit TLS settings for Python 3.13+ compatibility...")

        # Test connection with explicit TLS settings (matches the fix)
        client = AsyncIOMotorClient(
            mongodb_uri,
            serverSelectionTimeoutMS=10000,  # 10 second timeout for testing
            tls=True,  # Force TLS/SSL connection
            tlsAllowInvalidCertificates=False,  # Verify certificates (security)
        )

        # Attempt to ping the database
        database = client[mongodb_db_name]
        await database.command("ping")

        print("✅ MongoDB connection successful!")

        # Get server info
        server_info = await client.server_info()
        print(f"\nServer info:")
        print(f"  MongoDB version: {server_info.get('version')}")
        print(f"  Server: {server_info.get('host', 'N/A')}")

        client.close()
        return True

    except ConnectionFailure as e:
        print(f"❌ MongoDB connection failed: {e}")
        print("\nPossible causes:")
        print("  1. Network connectivity issues")
        print("  2. MongoDB Atlas IP whitelist restrictions")
        print("  3. Invalid credentials")
        print("  4. SSL certificate verification failure")
        return False

    except ConfigurationError as e:
        print(f"❌ MongoDB configuration error: {e}")
        return False

    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        import traceback
        print("\nFull traceback:")
        traceback.print_exc()
        return False


def suggest_fixes():
    """Suggest fixes based on diagnostic results."""
    print("\n" + "=" * 70)
    print("Suggested Fixes")
    print("=" * 70)

    print("\n1. Install Python SSL certificates (macOS with Homebrew Python):")
    print("   Run the certificate installation script:")
    python_version = f"{sys.version_info.major}.{sys.version_info.minor}"
    print(f"   /opt/homebrew/opt/python@{python_version}/Frameworks/Python.framework/Versions/{python_version}/bin/Install\\ Certificates.command")

    print("\n2. Update pymongo and motor to latest versions:")
    print("   poetry add pymongo@latest motor@latest")

    print("\n3. Check MongoDB Atlas IP whitelist:")
    print("   - Log into MongoDB Atlas console")
    print("   - Navigate to Network Access")
    print("   - Add your current IP address or allow from anywhere (0.0.0.0/0) for testing")

    print("\n4. Verify MongoDB URI format:")
    print("   mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority")

    print("\n5. Check firewall/proxy settings:")
    print("   - Ensure outbound connections to MongoDB Atlas are allowed")
    print("   - Check corporate proxy settings if applicable")


async def main():
    """Run all diagnostic checks."""
    print("\n" + "=" * 70)
    print("MongoDB SSL Connection Diagnostic Tool")
    print("Bayit+ Backend - Python 3.13+ SSL Fix")
    print("=" * 70)

    # Run checks
    ssl_ok = check_ssl_certificates()
    uri_ok = check_mongodb_uri()
    connection_ok = await test_mongodb_connection()

    # Summary
    print("\n" + "=" * 70)
    print("Diagnostic Summary")
    print("=" * 70)
    print(f"SSL Certificates: {'✅ OK' if ssl_ok else '❌ FAILED'}")
    print(f"MongoDB URI: {'✅ OK' if uri_ok else '⚠️  WARNINGS'}")
    print(f"MongoDB Connection: {'✅ OK' if connection_ok else '❌ FAILED'}")

    if not connection_ok:
        suggest_fixes()
        return 1

    print("\n✅ All checks passed! MongoDB connection is working.")
    return 0


if __name__ == "__main__":
    try:
        exit_code = asyncio.run(main())
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\n\nDiagnostic interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Diagnostic tool failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
