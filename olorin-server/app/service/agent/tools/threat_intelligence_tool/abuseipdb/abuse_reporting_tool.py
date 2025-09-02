"""
AbuseIPDB Abuse Reporting Tool

LangChain tool for reporting IP abuse to AbuseIPDB.
Enables fraud investigators to report malicious IPs discovered during investigations.

TODO: Full implementation in Phase 2
"""

from typing import Type
from pydantic import BaseModel, Field
from ..base_threat_tool import BaseThreatIntelligenceTool, ThreatIntelligenceConfig


class AbuseReportInput(BaseModel):
    """Input schema for abuse reporting."""
    ip_address: str = Field(..., description="IP address to report")
    categories: str = Field(..., description="Comma-separated abuse categories (3-23)")
    comment: str = Field(..., description="Detailed comment about the abuse")


class AbuseReportingTool(BaseThreatIntelligenceTool):
    """Tool for reporting IP abuse to AbuseIPDB."""
    
    name = "abuseipdb_report_abuse"
    description = "Report IP addresses for abuse to AbuseIPDB with detailed incident information."
    args_schema: Type[BaseModel] = AbuseReportInput

    def __init__(self, **kwargs):
        threat_config = ThreatIntelligenceConfig(
            api_key_secret_name="ABUSEIPDB_API_KEY",
            cache_ttl_seconds=0,  # No caching for reports
            rate_limit_requests=100,  # Lower limit for reports
            timeout_seconds=30,
            enable_caching=False
        )
        
        super().__init__(
            name=self.name,
            description=self.description,
            config=threat_config,
            **kwargs
        )

    async def _execute_threat_query(self, query_type: str, query_data: dict):
        # TODO: Implement abuse reporting
        raise NotImplementedError("Abuse reporting will be implemented in Phase 2")

    async def _arun(self, ip_address: str, categories: str, comment: str, **kwargs) -> str:
        return '{"success": false, "error": "Abuse reporting not yet implemented", "status": "Phase 2 TODO"}'

    def _run(self, **kwargs) -> str:
        import asyncio
        return asyncio.run(self._arun(**kwargs))