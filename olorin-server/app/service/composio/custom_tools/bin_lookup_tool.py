"""
BIN Lookup Tool

Provides BIN (Bank Identification Number) lookup via Mastercard BIN Lookup API
or Neutrino BIN Lookup API for issuer country, card type, and issuer information.
"""

import os
import httpx
from typing import Dict, Any, Optional
from app.service.logging import get_bridge_logger
from app.service.config_loader import get_config_loader

logger = get_bridge_logger(__name__)


class BINLookupTool:
    """
    BIN lookup tool supporting Mastercard and Neutrino APIs.
    
    Provides:
    - Issuer country
    - Card type (prepaid, commercial, debit, credit)
    - Issuer name
    - Card brand
    """
    
    def __init__(self):
        """Initialize BIN lookup tool."""
        self.config_loader = get_config_loader()
        self.provider = self._get_provider()
        self.api_key = self._load_api_key()
        self.base_url = self._get_base_url()
    
    def _get_provider(self) -> str:
        """Get BIN lookup provider (mastercard or neutrino)."""
        provider = os.getenv("BIN_LOOKUP_PROVIDER", "neutrino").lower()
        return provider
    
    def _load_api_key(self) -> Optional[str]:
        """Load API key for BIN lookup provider."""
        if self.provider == "mastercard":
            api_key = self.config_loader.load_secret("MASTERCARD_BIN_API_KEY")
            if not api_key:
                api_key = os.getenv("MASTERCARD_BIN_API_KEY")
        else:  # neutrino
            api_key = self.config_loader.load_secret("NEUTRINO_BIN_API_KEY")
            if not api_key:
                api_key = os.getenv("NEUTRINO_BIN_API_KEY")
        
        return api_key
    
    def _get_base_url(self) -> str:
        """Get base URL for BIN lookup provider."""
        if self.provider == "mastercard":
            return "https://api.mastercard.com/binlookup/v1"
        else:  # neutrino
            return "https://neutrinoapi.net/bin-lookup"
    
    def lookup_bin(self, bin_number: str) -> Optional[Dict[str, Any]]:
        """
        Lookup BIN information.
        
        Args:
            bin_number: First 6-8 digits of card number (BIN/IIN)
            
        Returns:
            Dictionary with issuer country, card type, issuer name, or None if not found
            
        Raises:
            ValueError: If bin_number is invalid
            Exception: If API call fails
        """
        if not bin_number or len(bin_number) < 6:
            raise ValueError("BIN number must be at least 6 digits")
        
        if not self.api_key:
            logger.warning("BIN lookup API key not configured")
            return None
        
        try:
            if self.provider == "mastercard":
                return self._lookup_mastercard(bin_number)
            else:
                return self._lookup_neutrino(bin_number)
        except Exception as e:
            logger.error(f"BIN lookup failed for {bin_number}: {e}", exc_info=True)
            return None
    
    def _lookup_mastercard(self, bin_number: str) -> Optional[Dict[str, Any]]:
        """Lookup BIN using Mastercard API."""
        url = f"{self.base_url}/bin/{bin_number}"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Accept": "application/json"
        }
        
        with httpx.Client(timeout=30.0) as client:
            response = client.get(url, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                return {
                    "issuer_country": data.get("country", {}).get("alpha2"),
                    "card_type": self._normalize_card_type(data.get("cardType")),
                    "issuer_name": data.get("issuer", {}).get("name"),
                    "card_brand": data.get("brand"),
                    "provider": "mastercard"
                }
            elif response.status_code == 404:
                logger.debug(f"BIN {bin_number} not found in Mastercard database")
                return None
            else:
                logger.error(f"Mastercard BIN lookup failed: {response.status_code}")
                return None
    
    def _lookup_neutrino(self, bin_number: str) -> Optional[Dict[str, Any]]:
        """Lookup BIN using Neutrino API."""
        url = f"{self.base_url}"
        params = {
            "bin-number": bin_number,
            "user-id": self.api_key.split(":")[0] if ":" in self.api_key else self.api_key,
            "api-key": self.api_key.split(":")[1] if ":" in self.api_key else self.api_key
        }
        
        with httpx.Client(timeout=30.0) as client:
            response = client.get(url, params=params)
            
            if response.status_code == 200:
                data = response.json()
                return {
                    "issuer_country": data.get("country-code"),
                    "card_type": self._normalize_card_type(data.get("card-type")),
                    "issuer_name": data.get("issuer"),
                    "card_brand": data.get("card-brand"),
                    "provider": "neutrino"
                }
            elif response.status_code == 404:
                logger.debug(f"BIN {bin_number} not found in Neutrino database")
                return None
            else:
                logger.error(f"Neutrino BIN lookup failed: {response.status_code}")
                return None
    
    def _normalize_card_type(self, card_type: Optional[str]) -> Optional[str]:
        """Normalize card type to standard values."""
        if not card_type:
            return None
        
        card_type_lower = card_type.lower()
        if "prepaid" in card_type_lower:
            return "prepaid"
        elif "commercial" in card_type_lower or "business" in card_type_lower:
            return "commercial"
        elif "debit" in card_type_lower:
            return "debit"
        elif "credit" in card_type_lower:
            return "credit"
        else:
            return card_type_lower

