"""
Platform Configuration Loader
Loads base Olorin platform configuration and merges with subplatform config.

Architecture:
- Base platform config: /olorin-infra/.env (shared resources)
- Subplatform config: /olorin-media/bayit-plus/backend/.env (Bayit+ specific)
- Merge order: Base first, then subplatform (subplatform overrides base)
"""

import os
from pathlib import Path
from dotenv import load_dotenv


def load_platform_config():
    """
    Load configuration from base platform + subplatform.

    Loading order:
    1. olorin-infra/.env (base platform resources)
    2. backend/.env (subplatform specific, overrides base)
    """
    # Find monorepo root
    backend_dir = Path(__file__).parent.parent.parent
    monorepo_root = backend_dir.parent.parent.parent

    # Load base platform config first
    base_platform_env = monorepo_root / "olorin-infra" / ".env"
    if base_platform_env.exists():
        print(f"✓ Loading base platform config: {base_platform_env}")
        load_dotenv(base_platform_env, override=False)
    else:
        print(f"⚠ Base platform config not found: {base_platform_env}")
        print("  Falling back to local config only")

    # Load subplatform config (overrides base if same variable)
    subplatform_env = backend_dir / ".env"
    if subplatform_env.exists():
        print(f"✓ Loading subplatform config: {subplatform_env}")
        load_dotenv(subplatform_env, override=True)
    else:
        raise FileNotFoundError(f"Subplatform config not found: {subplatform_env}")

    print("✓ Configuration loaded: Base platform + subplatform specific")


# Auto-load on import
load_platform_config()
