"""Threat Intelligence Tool Configuration and Mode Management."""

import os
from enum import Enum
from typing import Dict, Any
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class ThreatIntelMode(Enum):
    """Threat intelligence operation modes."""
    LIVE = "live"        # Use real APIs
    MOCK = "mock"        # Use mock responses  
    HYBRID = "hybrid"    # Try live, fallback to mock
    FREE_TIER = "free"   # Only use free tier features


class ThreatIntelConfig:
    """Configuration manager for threat intelligence tools."""
    
    def __init__(self):
        """Initialize threat intelligence configuration."""
        self.mode = ThreatIntelMode(os.getenv('THREAT_INTEL_MODE', 'hybrid'))
        
        # API Plan Configuration
        self.shodan_paid_plan = os.getenv('SHODAN_PAID_PLAN', 'false').lower() == 'true'
        self.virustotal_paid_plan = os.getenv('VIRUSTOTAL_PAID_PLAN', 'false').lower() == 'true'
        self.abuseipdb_paid_plan = os.getenv('ABUSEIPDB_PAID_PLAN', 'false').lower() == 'true'
        
        # API Keys
        self.shodan_api_key = os.getenv('SHODAN_API_KEY')
        self.virustotal_api_key = os.getenv('VIRUSTOTAL_API_KEY')
        self.abuseipdb_api_key = os.getenv('ABUSEIPDB_API_KEY')
        
        # Rate Limiting
        self.enable_rate_limiting = os.getenv('THREAT_INTEL_RATE_LIMITING', 'true').lower() == 'true'
        
        logger.info(f"Threat Intelligence Configuration initialized:")
        logger.info(f"  Mode: {self.mode.value}")
        logger.info(f"  Shodan Paid Plan: {self.shodan_paid_plan}")
        logger.info(f"  VirusTotal Paid Plan: {self.virustotal_paid_plan}")
        logger.info(f"  AbuseIPDB Paid Plan: {self.abuseipdb_paid_plan}")
        
    def should_use_live_api(self) -> bool:
        """Check if live APIs should be used."""
        return self.mode in [ThreatIntelMode.LIVE, ThreatIntelMode.HYBRID]
        
    def should_use_mock_fallback(self) -> bool:
        """Check if mock fallback should be used."""
        return self.mode in [ThreatIntelMode.MOCK, ThreatIntelMode.HYBRID]
        
    def is_free_tier_only(self) -> bool:
        """Check if only free tier features should be used."""
        return self.mode == ThreatIntelMode.FREE_TIER
        
    def get_api_plan_status(self, provider: str) -> bool:
        """Get paid plan status for specific provider."""
        return {
            'shodan': self.shodan_paid_plan,
            'virustotal': self.virustotal_paid_plan,
            'abuseipdb': self.abuseipdb_paid_plan
        }.get(provider.lower(), False)
        
    def sanitize_params(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Sanitize parameters for HTTP requests."""
        sanitized = {}
        
        for key, value in params.items():
            if value is None:
                continue
                
            if isinstance(value, bool):
                # Convert boolean to string for HTTP params
                sanitized[key] = str(value).lower()
            elif isinstance(value, bytes):
                # Convert bytes to string
                sanitized[key] = value.decode('utf-8', errors='ignore')
            elif isinstance(value, (list, dict)):
                # Convert complex types to JSON strings
                import json
                sanitized[key] = json.dumps(value)
            else:
                sanitized[key] = str(value)
                
        return sanitized
        
    def get_mock_response(self, provider: str, endpoint: str, entity: str) -> Dict[str, Any]:
        """Generate mock response for testing."""
        return {
            "provider": provider,
            "endpoint": endpoint,
            "entity": entity,
            "mock": True,
            "status": "success",
            "message": f"Mock response for {provider} {endpoint} analysis of {entity}",
            "risk_score": 0.5,
            "confidence": 0.8,
            "details": f"Mock threat intelligence analysis for {entity}",
            "timestamp": "2025-09-07T10:00:00Z"
        }


# Global configuration instance
threat_intel_config = ThreatIntelConfig()