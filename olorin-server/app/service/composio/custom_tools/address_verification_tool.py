"""
Address Verification Tool

Provides address verification and standardization via Lob Address Verification API
or Melissa Global Address API for billing/shipping mismatch detection and fraud rings.
"""

import os
import httpx
from typing import Dict, Any, Optional
from app.service.logging import get_bridge_logger
from app.service.config_loader import get_config_loader

logger = get_bridge_logger(__name__)


class AddressVerificationTool:
    """
    Address verification tool supporting Lob AV and Melissa APIs.
    
    Provides:
    - Address standardization
    - Address validity
    - Billing/shipping mismatch detection
    - Fraud ring signals
    """
    
    def __init__(self):
        """Initialize address verification tool."""
        self.config_loader = get_config_loader()
        self.provider = self._get_provider()
        self.api_key = self._load_api_key()
        self.base_url = self._get_base_url()
    
    def _get_provider(self) -> str:
        """Get address verification provider (lob or melissa)."""
        provider = os.getenv("ADDRESS_VERIFICATION_PROVIDER", "lob").lower()
        return provider
    
    def _load_api_key(self) -> Optional[str]:
        """Load API key for address verification provider."""
        if self.provider == "lob":
            api_key = self.config_loader.load_secret("LOB_API_KEY")
            if not api_key:
                api_key = os.getenv("LOB_API_KEY")
        else:  # melissa
            api_key = self.config_loader.load_secret("MELISSA_API_KEY")
            if not api_key:
                api_key = os.getenv("MELISSA_API_KEY")
        
        return api_key
    
    def _get_base_url(self) -> str:
        """Get base URL for address verification provider."""
        if self.provider == "lob":
            return "https://api.lob.com/v1/us_verifications"
        else:  # melissa
            return "https://address.melissadata.net/v3/WEB/GlobalAddress/doGlobalAddress"
    
    def verify_address(
        self,
        line1: str,
        city: Optional[str] = None,
        state: Optional[str] = None,
        zip_code: Optional[str] = None,
        country: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Verify and standardize address.
        
        Args:
            line1: Street address line 1
            city: City name
            state: State/province code
            zip_code: ZIP/postal code
            country: Country code (default: US)
            
        Returns:
            Dictionary with standardized address, validity, or None if not found
            
        Raises:
            ValueError: If address is invalid
            Exception: If API call fails
        """
        if not line1:
            raise ValueError("Address line1 is required")
        
        if not self.api_key:
            logger.warning("Address verification API key not configured")
            return None
        
        try:
            if self.provider == "lob":
                return self._verify_lob(line1, city, state, zip_code, country)
            else:
                return self._verify_melissa(line1, city, state, zip_code, country)
        except Exception as e:
            logger.error(f"Address verification failed: {e}", exc_info=True)
            return None
    
    def _verify_lob(
        self,
        line1: str,
        city: Optional[str],
        state: Optional[str],
        zip_code: Optional[str],
        country: Optional[str]
    ) -> Optional[Dict[str, Any]]:
        """Verify address using Lob AV API."""
        auth = (self.api_key, "")
        data = {
            "primary_line": line1,
            "city": city,
            "state": state,
            "zip_code": zip_code,
            "country": country or "US"
        }
        
        with httpx.Client(timeout=30.0, auth=auth) as client:
            response = client.post(self.base_url, json=data)
            
            if response.status_code == 200:
                result = response.json()
                components = result.get("components", {})
                deliverability = result.get("deliverability")
                
                return {
                    "address_valid": deliverability in ["deliverable", "deliverable_unnecessary_unit"],
                    "standardized_address": {
                        "line1": f"{components.get('primary_number', '')} {components.get('street_name', '')}".strip(),
                        "city": components.get("city"),
                        "state": components.get("state"),
                        "zip_code": components.get("zip_code"),
                        "country": components.get("country")
                    },
                    "deliverability": deliverability,
                    "provider": "lob"
                }
            elif response.status_code == 422:
                logger.debug(f"Address validation failed: {response.json()}")
                return {
                    "address_valid": False,
                    "standardized_address": None,
                    "deliverability": "undeliverable",
                    "provider": "lob"
                }
            else:
                logger.error(f"Lob address verification failed: {response.status_code}")
                return None
    
    def _verify_melissa(
        self,
        line1: str,
        city: Optional[str],
        state: Optional[str],
        zip_code: Optional[str],
        country: Optional[str]
    ) -> Optional[Dict[str, Any]]:
        """Verify address using Melissa Global Address API."""
        params = {
            "id": self.api_key,
            "format": "json",
            "a1": line1,
            "loc": city or "",
            "admarea": state or "",
            "postal": zip_code or "",
            "ctry": country or "US"
        }
        
        with httpx.Client(timeout=30.0) as client:
            response = client.get(self.base_url, params=params)
            
            if response.status_code == 200:
                data = response.json()
                records = data.get("Records", [])
                
                if records:
                    record = records[0]
                    return {
                        "address_valid": record.get("Results") == "AS01",
                        "standardized_address": {
                            "line1": record.get("AddressLine1"),
                            "city": record.get("Locality"),
                            "state": record.get("AdministrativeArea"),
                            "zip_code": record.get("PostalCode"),
                            "country": record.get("CountryISO3166_1_Alpha2")
                        },
                        "deliverability": record.get("Results"),
                        "provider": "melissa"
                    }
                else:
                    return {
                        "address_valid": False,
                        "standardized_address": None,
                        "deliverability": "not_found",
                        "provider": "melissa"
                    }
            else:
                logger.error(f"Melissa address verification failed: {response.status_code}")
                return None
