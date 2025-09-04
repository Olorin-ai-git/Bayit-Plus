"""
AbuseIPDB IP Reputation Tool (Simplified)

Simple LangChain tool for IP reputation checking using AbuseIPDB API.
Follows the same patterns as existing Olorin tools for MCP compatibility.
"""

import json
from typing import Any, Dict, Optional, Type
from datetime import datetime

from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field, validator

from .abuseipdb_client import AbuseIPDBClient
from .models import AbuseIPDBConfig
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class IPReputationInput(BaseModel):
    """Input schema for IP reputation check."""
    
    ip_address: str = Field(
        ..., 
        description="IP address to check (IPv4 or IPv6)",
        examples=["192.168.1.1", "2001:db8::1"]
    )
    max_age_days: int = Field(
        default=90,
        description="Maximum age of reports to consider (1-365 days)",
        ge=1,
        le=365
    )
    
    @validator('ip_address')
    def validate_ip_address(cls, v):
        """Validate IP address format."""
        import ipaddress
        try:
            ipaddress.ip_address(v)
            return v
        except ValueError:
            raise ValueError(f"Invalid IP address format: {v}")


class SimpleIPReputationTool(BaseTool):
    """Simple tool for checking IP address reputation using AbuseIPDB."""
    
    name: str = "abuseipdb_ip_reputation"
    description: str = (
        "Check IP address reputation and threat intelligence using AbuseIPDB. "
        "Provides abuse confidence scores, geolocation data, ISP information, "
        "and detailed threat analysis for fraud investigation workflows."
    )
    args_schema: Type[BaseModel] = IPReputationInput

    def __init__(self, **kwargs):
        """Initialize IP reputation tool."""
        super().__init__(**kwargs)
        
        # Initialize AbuseIPDB client (lazy initialization)
        self._abuseipdb_config = None
        self._client = None

    def _get_client(self) -> AbuseIPDBClient:
        """Get AbuseIPDB client (lazy initialization)."""
        if self._client is None:
            self._abuseipdb_config = AbuseIPDBConfig()
            self._client = AbuseIPDBClient(self._abuseipdb_config)
        return self._client

    def _generate_threat_analysis(self, response) -> Dict[str, Any]:
        """Generate comprehensive threat analysis from AbuseIPDB response."""
        if not response.success or not response.ip_info:
            return {"error": "No IP information available"}
        
        ip_info = response.ip_info
        confidence = ip_info.abuse_confidence_percentage
        
        # Determine risk level
        if confidence >= 75:
            risk_level = "HIGH"
            threat_description = "High threat - likely malicious activity"
        elif confidence >= 50:
            risk_level = "MEDIUM"
            threat_description = "Medium threat - suspicious activity detected"
        elif confidence >= 25:
            risk_level = "LOW"
            threat_description = "Low threat - minimal suspicious activity"
        else:
            risk_level = "MINIMAL"
            threat_description = "Minimal threat - clean reputation"
        
        # Generate recommendations
        recommendations = []
        if confidence >= 75:
            recommendations.extend([
                "🚨 HIGH RISK: Consider blocking or restricting access",
                "📊 Perform comprehensive fraud risk assessment",
                "🔍 Cross-reference with known fraud patterns"
            ])
        elif confidence >= 50:
            recommendations.extend([
                "🔍 Monitor transactions and user behavior",
                "📋 Apply additional verification steps"
            ])
        else:
            recommendations.append("✅ Standard monitoring sufficient")
        
        analysis = {
            "ip_address": ip_info.ip_address,
            "reputation_summary": {
                "abuse_confidence": confidence,
                "risk_level": risk_level,
                "threat_description": threat_description,
                "is_whitelisted": ip_info.is_whitelisted,
                "total_reports": ip_info.total_reports,
                "distinct_reporters": ip_info.num_distinct_users,
                "last_reported": ip_info.last_reported_at.isoformat() if ip_info.last_reported_at else None
            },
            "network_information": {
                "ip_version": ip_info.ip_version,
                "is_public": ip_info.is_public,
                "usage_type": ip_info.usage_type,
                "isp": ip_info.isp,
                "domain": ip_info.domain
            },
            "geolocation": {
                "country_code": ip_info.country_code,
                "country_name": ip_info.country_name
            },
            "investigation_recommendations": recommendations,
            "metadata": {
                "response_time_ms": response.response_time_ms,
                "cached": response.cached,
                "analysis_timestamp": datetime.utcnow().isoformat(),
                "source": "AbuseIPDB"
            }
        }
        
        return analysis

    async def _arun(
        self,
        ip_address: str,
        max_age_days: int = 90,
        **kwargs
    ) -> str:
        """Execute IP reputation check asynchronously."""
        try:
            # Query AbuseIPDB
            client = self._get_client()
            reputation_response = await client.check_ip_reputation(
                ip_address=ip_address,
                max_age_days=max_age_days,
                verbose=True
            )
            
            if reputation_response.success:
                # Generate comprehensive analysis
                analysis_data = self._generate_threat_analysis(reputation_response)
                return json.dumps({
                    "success": True,
                    "data": analysis_data
                }, indent=2, default=str)
            else:
                return json.dumps({
                    "success": False,
                    "error": reputation_response.error or "Unknown error",
                    "ip_address": ip_address,
                    "source": "AbuseIPDB"
                }, indent=2)
                
        except Exception as e:
            logger.error(f"IP reputation check failed: {e}")
            return json.dumps({
                "success": False,
                "error": str(e),
                "ip_address": ip_address,
                "source": "AbuseIPDB"
            }, indent=2)

    def _run(self, **kwargs) -> str:
        """Synchronous wrapper."""
        import asyncio
        return asyncio.run(self._arun(**kwargs))