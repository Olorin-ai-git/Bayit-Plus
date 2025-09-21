"""
AbuseIPDB Bulk IP Analysis Tool

LangChain tool for bulk IP reputation checking using AbuseIPDB API.
Analyzes multiple IP addresses efficiently for fraud investigation workflows.
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


class BulkIPAnalysisInput(BaseModel):
    """Input schema for bulk IP analysis."""
    
    ip_addresses: str = Field(
        ...,
        description="Comma or newline-separated IP addresses to check (max 10,000)",
        examples=["[IP1],[IP2]", "[IP1]\n[IP2]\n[IP3]"]
    )
    max_age_days: int = Field(
        default=90,
        description="Maximum age of reports to consider (1-365 days)",
        ge=1,
        le=365
    )
    
    @validator('ip_addresses')
    def validate_ip_addresses(cls, v):
        """Validate and parse IP addresses."""
        # Split on comma or newline
        ips = []
        for line in v.replace(',', '\n').split('\n'):
            line = line.strip()
            if line:
                ips.append(line)
        
        if len(ips) == 0:
            raise ValueError("At least one IP address is required")
        if len(ips) > 10000:
            raise ValueError("Maximum 10,000 IP addresses allowed")
        
        # Validate each IP
        import ipaddress
        for ip in ips:
            try:
                ipaddress.ip_address(ip)
            except ValueError:
                raise ValueError(f"Invalid IP address format: {ip}")
        
        return '\n'.join(ips)  # Return normalized format


class BulkIPAnalysisTool(BaseTool):
    """Tool for bulk IP reputation analysis using AbuseIPDB."""
    
    name: str = "abuseipdb_bulk_ip_analysis"
    description: str = (
        "Analyze multiple IP addresses for threat intelligence using AbuseIPDB bulk API. "
        "Efficiently checks reputation for up to 10,000 IPs in a single request. "
        "Provides comprehensive risk assessment and identifies high-risk IPs for fraud investigation."
    )
    args_schema: Type[BaseModel] = BulkIPAnalysisInput

    def __init__(self, **kwargs):
        """Initialize bulk IP analysis tool."""
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

    def _generate_bulk_analysis(self, response) -> Dict[str, Any]:
        """Generate comprehensive bulk analysis from AbuseIPDB response."""
        if not response.success:
            return {"error": response.error or "Bulk analysis failed"}
        
        total_analyzed = response.total_ips
        high_risk_ips = response.high_risk_ips
        medium_risk_ips = []
        low_risk_ips = []
        clean_ips = []
        
        # Categorize IPs by risk level
        for ip_data in response.ips_analyzed:
            confidence = ip_data.abuse_confidence_percentage
            if confidence >= 75:
                # Already in high_risk_ips
                pass
            elif confidence >= 50:
                medium_risk_ips.append(ip_data.ip)
            elif confidence >= 25:
                low_risk_ips.append(ip_data.ip)
            else:
                clean_ips.append(ip_data.ip)
        
        # Generate risk summary
        risk_summary = {
            "total_analyzed": total_analyzed,
            "high_risk_count": len(high_risk_ips),
            "medium_risk_count": len(medium_risk_ips),
            "low_risk_count": len(low_risk_ips),
            "clean_count": len(clean_ips),
            "high_risk_percentage": (len(high_risk_ips) / max(total_analyzed, 1)) * 100,
            "overall_risk_level": self._determine_overall_risk(high_risk_ips, medium_risk_ips, total_analyzed)
        }
        
        # Detailed IP analysis
        detailed_analysis = []
        for ip_data in response.ips_analyzed:
            analysis = {
                "ip": ip_data.ip,
                "abuse_confidence": ip_data.abuse_confidence_percentage,
                "risk_level": self._get_risk_level(ip_data.abuse_confidence_percentage),
                "country_code": ip_data.country_code,
                "isp": ip_data.isp,
                "usage_type": ip_data.usage_type,
                "domain": ip_data.domain,
                "last_reported": ip_data.last_reported_at.isoformat() if ip_data.last_reported_at else None,
                "investigation_priority": self._get_investigation_priority(ip_data.abuse_confidence_percentage)
            }
            detailed_analysis.append(analysis)
        
        # Sort by risk level (highest first)
        detailed_analysis.sort(key=lambda x: x["abuse_confidence"], reverse=True)
        
        # Generate recommendations
        recommendations = self._generate_bulk_recommendations(risk_summary, high_risk_ips, medium_risk_ips)
        
        # Geographic analysis
        geographic_analysis = self._analyze_geographic_distribution(response.ips_analyzed)
        
        analysis = {
            "risk_summary": risk_summary,
            "high_risk_ips": high_risk_ips,
            "medium_risk_ips": medium_risk_ips,
            "low_risk_ips": low_risk_ips,
            "clean_ips": clean_ips,
            "detailed_analysis": detailed_analysis[:100],  # Limit for response size
            "geographic_analysis": geographic_analysis,
            "investigation_recommendations": recommendations,
            "metadata": {
                "response_time_ms": response.response_time_ms,
                "analysis_timestamp": datetime.utcnow().isoformat(),
                "source": "AbuseIPDB",
                "total_ips_processed": total_analyzed
            }
        }
        
        return analysis

    def _get_risk_level(self, confidence: int) -> str:
        """Get risk level from confidence score."""
        if confidence >= 75:
            return "HIGH"
        elif confidence >= 50:
            return "MEDIUM"
        elif confidence >= 25:
            return "LOW"
        else:
            return "MINIMAL"

    def _get_investigation_priority(self, confidence: int) -> str:
        """Get investigation priority from confidence score."""
        if confidence >= 90:
            return "IMMEDIATE"
        elif confidence >= 75:
            return "HIGH"
        elif confidence >= 50:
            return "MEDIUM"
        elif confidence >= 25:
            return "LOW"
        else:
            return "ROUTINE"

    def _determine_overall_risk(self, high_risk_ips: List[str], medium_risk_ips: List[str], total: int) -> str:
        """Determine overall risk level for the IP set."""
        if not total:
            return "UNKNOWN"
        
        high_percentage = (len(high_risk_ips) / total) * 100
        medium_percentage = (len(medium_risk_ips) / total) * 100
        
        if high_percentage >= 20:
            return "CRITICAL"
        elif high_percentage >= 10 or medium_percentage >= 30:
            return "HIGH"
        elif high_percentage >= 5 or medium_percentage >= 15:
            return "MEDIUM"
        elif high_percentage >= 1 or medium_percentage >= 5:
            return "LOW"
        else:
            return "MINIMAL"

    def _analyze_geographic_distribution(self, ips_analyzed) -> Dict[str, Any]:
        """Analyze geographic distribution of IPs."""
        country_counts = {}
        high_risk_countries = {}
        
        for ip_data in ips_analyzed:
            country = ip_data.country_code or "UNKNOWN"
            country_counts[country] = country_counts.get(country, 0) + 1
            
            if ip_data.abuse_confidence_percentage >= 75:
                high_risk_countries[country] = high_risk_countries.get(country, 0) + 1
        
        # Sort by count
        top_countries = sorted(country_counts.items(), key=lambda x: x[1], reverse=True)[:10]
        top_risk_countries = sorted(high_risk_countries.items(), key=lambda x: x[1], reverse=True)[:5]
        
        return {
            "total_countries": len(country_counts),
            "top_countries": [{"country": c, "count": count} for c, count in top_countries],
            "high_risk_countries": [{"country": c, "high_risk_count": count} for c, count in top_risk_countries],
            "geographic_diversity": "HIGH" if len(country_counts) > 10 else "MEDIUM" if len(country_counts) > 5 else "LOW"
        }

    def _generate_bulk_recommendations(self, risk_summary: Dict, high_risk_ips: List[str], medium_risk_ips: List[str]) -> List[str]:
        """Generate investigation recommendations for bulk analysis."""
        recommendations = []
        
        total = risk_summary["total_analyzed"]
        high_count = len(high_risk_ips)
        medium_count = len(medium_risk_ips)
        
        if high_count > 0:
            recommendations.append(f"🚨 CRITICAL: {high_count} high-risk IPs detected - immediate investigation required")
            recommendations.append("🔒 Consider blocking or restricting access from high-risk IPs")
            recommendations.append("📊 Cross-reference high-risk IPs with recent fraud incidents")
        
        if medium_count > 0:
            recommendations.append(f"⚠️ ATTENTION: {medium_count} medium-risk IPs require enhanced monitoring")
            recommendations.append("🔍 Apply additional verification for users from medium-risk IPs")
        
        overall_risk = risk_summary["overall_risk_level"]
        if overall_risk in ["CRITICAL", "HIGH"]:
            recommendations.append("🚨 URGENT: High concentration of malicious IPs suggests coordinated attack")
            recommendations.append("📋 Implement emergency security measures and alert security team")
            recommendations.append("🕐 Monitor for additional suspicious activity from related IP ranges")
        
        high_percentage = risk_summary["high_risk_percentage"]
        if high_percentage >= 50:
            recommendations.append("🔥 SEVERE: Over 50% of IPs are high-risk - possible botnet or fraud ring")
        elif high_percentage >= 25:
            recommendations.append("⚠️ WARNING: 25%+ of IPs are high-risk - investigate for patterns")
        
        if total >= 1000:
            recommendations.append("📈 Large-scale analysis complete - consider automated response rules")
        
        if not recommendations:
            recommendations.append("✅ Good news: No immediate security concerns detected")
            recommendations.append("🛡️ Continue standard monitoring procedures")
        
        return recommendations

    async def _arun(
        self,
        ip_addresses: str,
        max_age_days: int = 90,
        **kwargs
    ) -> str:
        """Execute bulk IP analysis asynchronously."""
        try:
            # Parse IP addresses
            ip_list = [ip.strip() for ip in ip_addresses.replace(',', '\n').split('\n') if ip.strip()]
            
            logger.info(f"Starting bulk analysis of {len(ip_list)} IP addresses")
            
            # Query AbuseIPDB
            client = self._get_client()
            bulk_response = await client.bulk_check_ips(
                ip_addresses=ip_list,
                max_age_days=max_age_days
            )
            
            if bulk_response.success:
                # Generate comprehensive analysis
                analysis_data = self._generate_bulk_analysis(bulk_response)
                
                logger.info(f"Bulk analysis completed: {analysis_data['risk_summary']['total_analyzed']} IPs processed")
                
                return json.dumps({
                    "success": True,
                    "data": analysis_data
                }, indent=2, default=str)
            else:
                return json.dumps({
                    "success": False,
                    "error": bulk_response.error or "Unknown error",
                    "total_ips": len(ip_list),
                    "source": "AbuseIPDB"
                }, indent=2)
                
        except Exception as e:
            logger.error(f"Bulk IP analysis failed: {e}")
            return json.dumps({
                "success": False,
                "error": str(e),
                "source": "AbuseIPDB"
            }, indent=2)

    def _run(self, **kwargs) -> str:
        """Synchronous wrapper."""
        import asyncio
        return asyncio.run(self._arun(**kwargs))