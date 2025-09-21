"""
AbuseIPDB Abuse Reporting Tool

LangChain tool for reporting malicious IP addresses to AbuseIPDB.
Enables fraud investigators to contribute threat intelligence by reporting
confirmed malicious IPs with detailed abuse categories and comments.
"""

import json
from typing import Any, Dict, List, Optional, Type
from datetime import datetime

from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field, validator

from .abuseipdb_client import AbuseIPDBClient
from .models import AbuseIPDBConfig
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class AbuseReportInput(BaseModel):
    """Input schema for abuse reporting."""
    
    ip: str = Field(
        ...,
        description="IP address to report for abuse",
        examples=["192.168.1.1", "10.0.0.1"]
    )
    categories: str = Field(
        ...,
        description="Comma-separated list of abuse category IDs (3=Fraud, 9=Hacking, 10=Spam, 11=Malware, 14=Port Scan, 18=Brute Force, 19=Botnet, 20=Exploited Host, 21=Web Spam, 22=Email Spam, 23=Blog Spam)",
        examples=["3,9", "10,11,19", "14,18"]
    )
    comment: str = Field(
        ...,
        description="Detailed description of the malicious activity (required, min 25 chars, max 1024 chars)",
        min_length=25,
        max_length=1024
    )
    
    @validator('ip')
    def validate_ip_address(cls, v):
        """Validate IP address format."""
        import ipaddress
        try:
            ipaddress.ip_address(v)
            return v
        except ValueError:
            raise ValueError(f"Invalid IP address format: {v}")
    
    @validator('categories')
    def validate_categories(cls, v):
        """Validate abuse category IDs."""
        # Valid AbuseIPDB category IDs
        valid_categories = {
            1: "DNS Compromise", 2: "DNS Poisoning", 3: "Fraud Orders", 
            4: "DDoS Attack", 5: "FTP Brute-Force", 6: "Ping of Death",
            7: "Phishing", 8: "Fraud VoIP", 9: "Open Proxy", 10: "Web Spam",
            11: "Email Spam", 12: "Blog Spam", 13: "VPN IP", 14: "Port Scan",
            15: "Hacking", 16: "SQL Injection", 17: "Spoofing", 18: "Brute-Force",
            19: "Bad Web Bot", 20: "Exploited Host", 21: "Web App Attack",
            22: "SSH", 23: "IoT Targeted"
        }
        
        try:
            category_ids = [int(cat.strip()) for cat in v.split(',')]
            for cat_id in category_ids:
                if cat_id not in valid_categories:
                    raise ValueError(f"Invalid category ID: {cat_id}")
            return ','.join(map(str, category_ids))
        except ValueError as e:
            if "invalid literal for int()" in str(e):
                raise ValueError(f"Category IDs must be integers: {v}")
            raise


class AbuseReportingTool(BaseTool):
    """Tool for reporting IP addresses to AbuseIPDB for abuse."""
    
    name: str = "abuseipdb_report_ip"
    description: str = (
        "Report malicious IP addresses to AbuseIPDB threat intelligence database. "
        "Use this tool to contribute threat intelligence by reporting confirmed "
        "malicious IPs with detailed abuse categories and evidence. Essential for "
        "building community-driven fraud prevention and threat intelligence sharing."
    )
    args_schema: Type[BaseModel] = AbuseReportInput

    def __init__(self, **kwargs):
        """Initialize abuse reporting tool."""
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

    def _get_category_names(self, category_ids: str) -> List[str]:
        """Get human-readable category names from IDs."""
        category_map = {
            1: "DNS Compromise", 2: "DNS Poisoning", 3: "Fraud Orders", 
            4: "DDoS Attack", 5: "FTP Brute-Force", 6: "Ping of Death",
            7: "Phishing", 8: "Fraud VoIP", 9: "Open Proxy", 10: "Web Spam",
            11: "Email Spam", 12: "Blog Spam", 13: "VPN IP", 14: "Port Scan",
            15: "Hacking", 16: "SQL Injection", 17: "Spoofing", 18: "Brute-Force",
            19: "Bad Web Bot", 20: "Exploited Host", 21: "Web App Attack",
            22: "SSH", 23: "IoT Targeted"
        }
        
        try:
            ids = [int(cat.strip()) for cat in category_ids.split(',')]
            return [category_map.get(cat_id, f"Unknown({cat_id})") for cat_id in ids]
        except ValueError:
            return ["Invalid Categories"]

    def _generate_report_analysis(self, response, ip: str, categories: str, comment: str) -> Dict[str, Any]:
        """Generate comprehensive analysis from AbuseIPDB report response."""
        if not response.success:
            return {"error": response.error or "Report submission failed"}
        
        category_names = self._get_category_names(categories)
        
        # Generate reporting recommendations
        recommendations = self._generate_reporting_recommendations(category_names)
        
        analysis = {
            "ip": ip,
            "report_status": "SUCCESS" if response.success else "FAILED",
            "submission_details": {
                "categories_reported": category_names,
                "category_ids": categories,
                "comment_length": len(comment),
                "submission_timestamp": datetime.utcnow().isoformat()
            },
            "abuseipdb_response": {
                "confidence_percentage": response.confidence_percentage if hasattr(response, 'confidence_percentage') else None,
                "country_code": response.country_code if hasattr(response, 'country_code') else None,
                "isp": response.isp if hasattr(response, 'isp') else None,
                "usage_type": response.usage_type if hasattr(response, 'usage_type') else None
            },
            "follow_up_recommendations": recommendations,
            "community_impact": {
                "contribution_type": "Threat Intelligence Sharing",
                "database_enhancement": "IP reputation data updated",
                "fraud_prevention": "Community protection improved",
                "investigation_value": "Evidence documented for future reference"
            },
            "metadata": {
                "response_time_ms": response.response_time_ms,
                "report_timestamp": datetime.utcnow().isoformat(),
                "source": "AbuseIPDB",
                "tool": "abuse_reporting"
            }
        }
        
        return analysis

    def _generate_reporting_recommendations(self, category_names: List[str]) -> List[str]:
        """Generate investigation recommendations based on reported categories."""
        recommendations = []
        
        # Category-specific recommendations
        if "Fraud Orders" in category_names:
            recommendations.extend([
                "🛡️ FRAUD: Monitor for related fraudulent transactions from same IP",
                "💳 PAYMENT: Review recent payment attempts from this IP address",
                "🔍 PATTERNS: Cross-reference with known fraud patterns and indicators"
            ])
        
        if "Hacking" in category_names or "Brute-Force" in category_names:
            recommendations.extend([
                "🔒 SECURITY: Implement enhanced monitoring for this IP range",
                "🚫 ACCESS: Consider blocking or restricting access from this IP",
                "📊 LOGS: Review access logs for additional compromised accounts"
            ])
        
        if "Bad Web Bot" in category_names or "Exploited Host" in category_names:
            recommendations.extend([
                "🤖 BOTNET: Monitor for coordinated attacks from related IPs",
                "🔍 NETWORK: Analyze network traffic for additional infected hosts",
                "⚠️ ALERT: Set up alerts for similar behavioral patterns"
            ])
        
        if "Phishing" in category_names or "Web Spam" in category_names:
            recommendations.extend([
                "📧 EMAIL: Review email security filters and phishing detection",
                "🌐 WEB: Monitor web traffic for suspicious redirect patterns",
                "👥 USERS: Educate users about potential phishing attempts"
            ])
        
        if "Port Scan" in category_names or "DDoS Attack" in category_names:
            recommendations.extend([
                "🔍 SCAN: Implement network scanning detection and prevention",
                "🛡️ FIREWALL: Review and strengthen firewall rules",
                "📈 MONITOR: Set up bandwidth and connection monitoring"
            ])
        
        # General recommendations
        recommendations.extend([
            "✅ DOCUMENTED: Malicious IP successfully reported to AbuseIPDB",
            "🤝 COMMUNITY: Contribution helps protect the entire internet community",
            "📋 EVIDENCE: Keep detailed logs for potential law enforcement collaboration",
            "🔄 FOLLOW-UP: Monitor AbuseIPDB for updates on this IP's reputation",
            "📊 ANALYTICS: Include this data in threat intelligence analytics"
        ])
        
        return recommendations

    async def _arun(
        self,
        ip: str,
        categories: str,
        comment: str,
        **kwargs
    ) -> str:
        """Execute IP abuse reporting asynchronously."""
        try:
            logger.info(f"Starting abuse report for IP: {ip}")
            
            # Parse category IDs
            category_ids = [int(cat.strip()) for cat in categories.split(',')]
            
            # Query AbuseIPDB
            client = self._get_client()
            report_response = await client.report_ip_abuse(
                ip=ip,
                categories=category_ids,
                comment=comment
            )
            
            if report_response.success:
                # Generate comprehensive analysis
                analysis_data = self._generate_report_analysis(report_response, ip, categories, comment)
                
                logger.info(f"Abuse report submitted successfully for IP: {ip}")
                
                return json.dumps({
                    "success": True,
                    "data": analysis_data
                }, indent=2, default=str)
            else:
                return json.dumps({
                    "success": False,
                    "error": report_response.error or "Unknown error",
                    "ip": ip,
                    "source": "AbuseIPDB"
                }, indent=2)
                
        except Exception as e:
            logger.error(f"Abuse reporting failed for {ip}: {e}")
            return json.dumps({
                "success": False,
                "error": str(e),
                "ip": ip,
                "source": "AbuseIPDB"
            }, indent=2)

    def _run(self, **kwargs) -> str:
        """Synchronous wrapper."""
        import asyncio
        return asyncio.run(self._arun(**kwargs))