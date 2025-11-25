"""
SDK Manager for device fingerprinting with multi-SDK support.

Manages tenant configuration for device fingerprint SDK selection
and provides SDK-specific integration logic.
"""

import logging
from enum import Enum
from typing import Any, Dict, Optional

from app.service.config_loader import get_config_loader
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class SDKProvider(str, Enum):
    """Supported device fingerprint SDK providers."""

    FINGERPRINT_PRO = "fingerprint_pro"
    SEON = "seon"
    IPQS = "ipqs"


class SDKManager:
    """
    Manages device fingerprint SDK selection and configuration.

    Supports multiple SDKs (Fingerprint Pro, SEON, IPQS) with
    tenant-configurable selection.
    """

    def __init__(self):
        """Initialize SDK manager."""
        self.config_loader = get_config_loader()
        # Cache for tenant SDK configurations
        self._tenant_sdk_cache: Dict[str, SDKProvider] = {}

    def get_tenant_sdk_provider(self, tenant_id: str) -> SDKProvider:
        """
        Get configured SDK provider for a tenant.

        Args:
            tenant_id: Tenant ID

        Returns:
            SDKProvider enum value

        Defaults to Fingerprint Pro if not configured.
        """
        # Check cache first
        if tenant_id in self._tenant_sdk_cache:
            return self._tenant_sdk_cache[tenant_id]

        # Load from tenant configuration API or database
        try:
            # Try to load from environment/config first (for backward compatibility)
            config_key = f"TENANT_{tenant_id}_DEVICE_SDK"
            sdk_provider_str = self.config_loader.load_secret(config_key)

            # If not in config, use default
            if not sdk_provider_str:
                sdk_provider_str = "fingerprint_pro"  # Default

            # In production, this would call tenant_config_router API or query database
            # For now, fallback to config/environment variable approach

            # Validate and convert to enum
            try:
                sdk_provider = SDKProvider(sdk_provider_str.lower())
            except ValueError:
                logger.warning(
                    f"Invalid SDK provider '{sdk_provider_str}' for tenant {tenant_id}, "
                    f"defaulting to fingerprint_pro"
                )
                sdk_provider = SDKProvider.FINGERPRINT_PRO

            # Cache result
            self._tenant_sdk_cache[tenant_id] = sdk_provider

            return sdk_provider

        except Exception as e:
            logger.warning(
                f"Failed to load SDK config for tenant {tenant_id}: {e}, using default"
            )
            return SDKProvider.FINGERPRINT_PRO

    def get_sdk_config(self, tenant_id: str) -> Dict[str, Any]:
        """
        Get SDK-specific configuration for a tenant.

        Args:
            tenant_id: Tenant ID

        Returns:
            Dictionary with SDK configuration (API keys, etc.)
        """
        sdk_provider = self.get_tenant_sdk_provider(tenant_id)

        config = {
            "sdk_provider": sdk_provider.value,
            "api_key": None,
            "endpoint": None,
        }

        # Load SDK-specific API keys
        if sdk_provider == SDKProvider.FINGERPRINT_PRO:
            config["api_key"] = self.config_loader.load_secret(
                "FINGERPRINT_PRO_API_KEY"
            )
            config["endpoint"] = "https://api.fpjs.io"
        elif sdk_provider == SDKProvider.SEON:
            config["api_key"] = self.config_loader.load_secret("SEON_API_KEY")
            config["endpoint"] = "https://api.seon.io"
        elif sdk_provider == SDKProvider.IPQS:
            config["api_key"] = self.config_loader.load_secret("IPQS_API_KEY")
            config["endpoint"] = "https://ipqualityscore.com/api"

        return config

    def validate_device_signal(
        self, device_signal: Dict[str, Any], tenant_id: str
    ) -> bool:
        """
        Validate device signal matches tenant's configured SDK.

        Args:
            device_signal: Device signal data
            tenant_id: Tenant ID

        Returns:
            True if signal is valid for tenant's SDK
        """
        expected_sdk = self.get_tenant_sdk_provider(tenant_id)
        signal_sdk = device_signal.get("sdk_provider", "").lower()

        try:
            signal_sdk_enum = SDKProvider(signal_sdk)
            return signal_sdk_enum == expected_sdk
        except ValueError:
            logger.warning(f"Unknown SDK provider in signal: {signal_sdk}")
            return False
