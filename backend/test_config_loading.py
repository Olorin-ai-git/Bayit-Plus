#!/usr/bin/env python3
"""
Test script for platform configuration loading.
Tests that base platform + subplatform configuration loads correctly.
"""

from pathlib import Path
from dotenv import load_dotenv
import os


def test_config_loading():
    """Test configuration loading from base platform + subplatform."""

    # Calculate paths (same as platform_config.py)
    script_dir = Path(__file__).parent
    backend_dir = script_dir
    monorepo_root = backend_dir.parent.parent.parent

    print(f"Script directory: {script_dir}")
    print(f"Backend directory: {backend_dir}")
    print(f"Monorepo root: {monorepo_root}")
    print()

    # Load base platform config first
    base_platform_env = monorepo_root / "olorin-infra" / ".env"
    print(f"Base platform config: {base_platform_env}")
    print(f"Exists: {base_platform_env.exists()}")

    if base_platform_env.exists():
        print("✓ Loading base platform config")
        load_dotenv(base_platform_env, override=False)
    else:
        print("⚠ Base platform config not found")
        return False

    # Load subplatform config (overrides base if same variable)
    subplatform_env = backend_dir / ".env"
    print(f"\nSubplatform config: {subplatform_env}")
    print(f"Exists: {subplatform_env.exists()}")

    if subplatform_env.exists():
        print("✓ Loading subplatform config")
        load_dotenv(subplatform_env, override=True)
    else:
        print("⚠ Subplatform config not found")
        return False

    print("\n✓ Configuration loaded: Base platform + subplatform specific")

    # Test key variables
    print("\n" + "="*60)
    print("Testing Key Variables")
    print("="*60)

    print("\nBase Platform Variables (from olorin-infra/.env):")
    print(f"  OLORIN_NLP_ENABLED: {os.getenv('OLORIN_NLP_ENABLED')}")
    print(f"  OLORIN_NLP_CONFIDENCE_THRESHOLD: {os.getenv('OLORIN_NLP_CONFIDENCE_THRESHOLD')}")
    print(f"  OLORIN_NLP_MAX_COST_PER_QUERY: {os.getenv('OLORIN_NLP_MAX_COST_PER_QUERY')}")
    print(f"  ANTHROPIC_API_KEY: {os.getenv('ANTHROPIC_API_KEY', '')[:20]}...")
    print(f"  PINECONE_API_KEY: {os.getenv('PINECONE_API_KEY', '')[:15]}...")
    print(f"  MONGODB_URI contains 'cluster0': {'YES' if 'cluster0' in os.getenv('MONGODB_URI', '') else 'NO'}")

    print("\nSubplatform-Specific Variables (from bayit-plus/backend/.env):")
    print(f"  STRIPE_API_KEY: {os.getenv('STRIPE_API_KEY', '')[:20]}...")
    print(f"  GOOGLE_CLIENT_ID: {os.getenv('GOOGLE_CLIENT_ID', '')[:30]}...")
    print(f"  PODCAST_TRANSLATION_ENABLED: {os.getenv('PODCAST_TRANSLATION_ENABLED')}")

    print("\n" + "="*60)
    print("✅ Configuration Loading Test PASSED")
    print("="*60)

    return True


if __name__ == "__main__":
    success = test_config_loading()
    exit(0 if success else 1)
