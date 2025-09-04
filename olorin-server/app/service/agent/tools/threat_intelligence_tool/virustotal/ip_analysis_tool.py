"""
VirusTotal IP Analysis Tool

LangChain tool for IP address reputation analysis using VirusTotal API.
Provides comprehensive threat intelligence for IP addresses in fraud investigations.
"""

import json
from typing import Any, Dict, List, Optional, Type
from datetime import datetime

from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field, validator

from .virustotal_client import VirusTotalClient
from .models import VirusTotalConfig
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class VirusTotalIPAnalysisInput(BaseModel):
    """Input schema for VirusTotal IP analysis."""
    
    ip_address: str = Field(
        ...,
        description="IP address to analyze for threat intelligence",
        examples=["192.168.1.1", "8.8.8.8", "1.1.1.1"]
    )
    include_vendor_details: bool = Field(
        default=False,
        description="Include detailed results from individual antivirus vendors"
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


class VirusTotalIPAnalysisTool(BaseTool):
    """Tool for IP address analysis using VirusTotal."""
    
    name: str = "virustotal_ip_analysis"
    description: str = (
        "Analyze IP address reputation using VirusTotal threat intelligence. "
        "Provides comprehensive analysis including detection statistics from "
        "multiple antivirus engines, ASN information, geolocation, and community "
        "reputation scores. Essential for investigating suspicious IP addresses in fraud cases."
    )
    args_schema: Type[BaseModel] = VirusTotalIPAnalysisInput

    def __init__(self, **kwargs):
        """Initialize VirusTotal IP analysis tool."""
        super().__init__(**kwargs)
        
        # Initialize VirusTotal client (lazy initialization)
        self._virustotal_config = None
        self._client = None

    def _get_client(self) -> VirusTotalClient:
        """Get VirusTotal client (lazy initialization)."""
        if self._client is None:
            self._virustotal_config = VirusTotalConfig()
            self._client = VirusTotalClient(self._virustotal_config)
        return self._client

    def _generate_ip_analysis(self, response, ip_address: str, include_vendor_details: bool) -> Dict[str, Any]:
        """Generate comprehensive IP analysis from VirusTotal response."""
        if not response.success:
            return {"error": response.error or "VirusTotal IP analysis failed"}
        
        # Risk assessment
        risk_level = "UNKNOWN"
        risk_score = 0.0
        
        if response.analysis_stats:
            stats = response.analysis_stats
            risk_level = stats.risk_level
            risk_score = stats.detection_rate / 100.0  # Normalize to 0-1
        
        # Generate threat summary
        threat_summary = {
            "ip_address": ip_address,
            "overall_risk_level": risk_level,
            "threat_score": risk_score,
            "detection_summary": {
                "total_engines": response.analysis_stats.total_engines if response.analysis_stats else 0,
                "malicious_detections": response.analysis_stats.malicious if response.analysis_stats else 0,
                "suspicious_detections": response.analysis_stats.suspicious if response.analysis_stats else 0,
                "detection_rate_percent": response.analysis_stats.detection_rate if response.analysis_stats else 0.0
            }
        }
        
        # Network and geographic information
        network_info = {
            "country": response.country,
            "asn": response.asn,
            "as_owner": response.as_owner,
            "is_malicious": risk_score > 0.1,  # 10% threshold
            "is_suspicious": risk_score > 0.05  # 5% threshold
        }
        
        # Community reputation
        community_assessment = {
            "reputation_score": response.reputation,
            "harmless_votes": response.harmless_votes,
            "malicious_votes": response.malicious_votes,
            "total_votes": response.harmless_votes + response.malicious_votes,
            "community_consensus": self._assess_community_consensus(response.harmless_votes, response.malicious_votes)
        }
        
        # Vendor analysis (if requested)
        vendor_analysis = None
        if include_vendor_details and response.vendor_results:
            vendor_analysis = self._analyze_vendor_results(response.vendor_results)
        
        # Generate recommendations
        recommendations = self._generate_ip_recommendations(
            risk_level, risk_score, network_info, community_assessment
        )
        
        analysis = {
            "threat_summary": threat_summary,
            "network_information": network_info,
            "community_assessment": community_assessment,
            "investigation_recommendations": recommendations,
            "metadata": {
                "analysis_timestamp": datetime.utcnow().isoformat(),
                "last_virustotal_analysis": response.last_analysis_date.isoformat() if response.last_analysis_date else None,
                "response_time_ms": response.response_time_ms,
                "source": "VirusTotal",
                "api_version": "v3"
            }
        }
        
        if vendor_analysis:
            analysis["vendor_analysis"] = vendor_analysis
        
        return analysis

    def _assess_community_consensus(self, harmless_votes: int, malicious_votes: int) -> str:
        """Assess community consensus on IP reputation."""
        total_votes = harmless_votes + malicious_votes
        
        if total_votes == 0:
            return "no_consensus"
        
        malicious_ratio = malicious_votes / total_votes
        
        if malicious_ratio >= 0.8:
            return "strongly_malicious"
        elif malicious_ratio >= 0.6:
            return "likely_malicious"
        elif malicious_ratio >= 0.4:
            return "mixed_reputation"
        elif malicious_ratio >= 0.2:
            return "likely_harmless"
        else:
            return "strongly_harmless"

    def _analyze_vendor_results(self, vendor_results: List) -> Dict[str, Any]:
        """Analyze individual vendor detection results."""
        if not vendor_results:
            return {"error": "No vendor results available"}
        
        # Categorize vendors by detection
        malicious_vendors = []
        suspicious_vendors = []
        harmless_vendors = []
        undetected_vendors = []
        
        for vendor in vendor_results:
            if vendor.category == "malicious":
                malicious_vendors.append({
                    "engine": vendor.engine_name,
                    "result": vendor.result,
                    "method": vendor.method
                })
            elif vendor.category == "suspicious":
                suspicious_vendors.append({
                    "engine": vendor.engine_name,
                    "result": vendor.result,
                    "method": vendor.method
                })
            elif vendor.category == "harmless":
                harmless_vendors.append(vendor.engine_name)
            else:
                undetected_vendors.append(vendor.engine_name)
        
        # Find consensus among malicious detections
        malicious_signatures = {}
        for vendor in malicious_vendors:
            if vendor["result"]:
                sig = vendor["result"].lower()
                malicious_signatures[sig] = malicious_signatures.get(sig, 0) + 1
        
        common_signatures = sorted(
            malicious_signatures.items(), 
            key=lambda x: x[1], 
            reverse=True
        )[:5]
        
        return {
            "detection_breakdown": {
                "malicious_engines": len(malicious_vendors),
                "suspicious_engines": len(suspicious_vendors),
                "harmless_engines": len(harmless_vendors),
                "undetected_engines": len(undetected_vendors)
            },
            "malicious_detections": malicious_vendors[:10],  # Limit for response size
            "suspicious_detections": suspicious_vendors[:5],
            "common_signatures": [{"signature": sig, "count": count} for sig, count in common_signatures],
            "vendor_consensus": self._calculate_vendor_consensus(vendor_results)
        }

    def _calculate_vendor_consensus(self, vendor_results: List) -> str:
        """Calculate consensus level among vendors."""
        if not vendor_results:
            return "unknown"
        
        total_vendors = len(vendor_results)
        threat_detections = len([v for v in vendor_results if v.category in ["malicious", "suspicious"]])
        
        threat_ratio = threat_detections / total_vendors
        
        if threat_ratio >= 0.7:
            return "high_consensus_threat"
        elif threat_ratio >= 0.3:
            return "moderate_consensus_threat"
        elif threat_ratio >= 0.1:
            return "low_consensus_threat"
        else:
            return "consensus_clean"

    def _generate_ip_recommendations(self, risk_level: str, risk_score: float, 
                                   network_info: Dict, community_assessment: Dict) -> List[str]:
        """Generate investigation recommendations based on IP analysis."""
        recommendations = []
        
        # Risk-based recommendations
        if risk_level == "CRITICAL":
            recommendations.extend([
                "🚨 CRITICAL THREAT: IP flagged as malicious by multiple security vendors",
                "🔒 IMMEDIATE BLOCK: Implement firewall rules to block this IP",
                "🔍 DEEP INVESTIGATION: Analyze all recent connections from this IP",
                "📋 INCIDENT RESPONSE: Escalate to security team immediately"
            ])
        elif risk_level == "HIGH":
            recommendations.extend([
                "⚠️ HIGH RISK: Significant threat indicators detected",
                "🛡️ ENHANCED MONITORING: Implement additional logging and monitoring",
                "🔍 INVESTIGATION: Review recent activity from this IP address",
                "📊 CORRELATE: Cross-reference with other security events"
            ])
        elif risk_level == "MEDIUM":
            recommendations.extend([
                "📈 MEDIUM RISK: Some threat indicators present",
                "👀 MONITOR: Watch for additional suspicious behavior",
                "🔍 VERIFY: Check against internal threat intelligence"
            ])
        elif risk_level == "LOW":
            recommendations.extend([
                "📊 LOW RISK: Minimal threat indicators detected",
                "🛡️ STANDARD: Apply standard security measures"
            ])
        else:
            recommendations.extend([
                "✅ CLEAN: No significant threat indicators found",
                "🔄 ROUTINE: Continue standard monitoring procedures"
            ])
        
        # Community consensus recommendations
        consensus = community_assessment.get("community_consensus", "no_consensus")
        if consensus in ["strongly_malicious", "likely_malicious"]:
            recommendations.append("👥 COMMUNITY: Strong community consensus indicates threat")
        elif consensus == "mixed_reputation":
            recommendations.append("⚖️ COMMUNITY: Mixed community opinions - investigate further")
        
        # Network-based recommendations
        if network_info.get("country"):
            recommendations.append(f"🌍 GEOLOCATION: IP located in {network_info['country']}")
        
        if network_info.get("as_owner"):
            recommendations.append(f"🏢 NETWORK: Hosted by {network_info['as_owner']}")
        
        # ASN-based recommendations
        if network_info.get("asn"):
            recommendations.append(f"🔢 ASN: Autonomous System {network_info['asn']}")
        
        return recommendations

    async def _arun(
        self,
        ip_address: str,
        include_vendor_details: bool = False,
        **kwargs
    ) -> str:
        """Execute VirusTotal IP analysis asynchronously."""
        try:
            logger.info(f"Starting VirusTotal IP analysis for: {ip_address}")
            
            # Query VirusTotal
            client = self._get_client()
            vt_response = await client.analyze_ip(ip_address)
            
            if vt_response.success:
                # Generate comprehensive analysis
                analysis_data = self._generate_ip_analysis(vt_response, ip_address, include_vendor_details)
                
                logger.info(f"VirusTotal IP analysis completed for {ip_address}")
                
                return json.dumps({
                    "success": True,
                    "data": analysis_data
                }, indent=2, default=str)
            else:
                return json.dumps({
                    "success": False,
                    "error": vt_response.error or "Unknown error",
                    "ip_address": ip_address,
                    "source": "VirusTotal"
                }, indent=2)
                
        except Exception as e:
            logger.error(f"VirusTotal IP analysis failed for {ip_address}: {e}")
            return json.dumps({
                "success": False,
                "error": str(e),
                "ip_address": ip_address,
                "source": "VirusTotal"
            }, indent=2)

    def _run(self, **kwargs) -> str:
        """Synchronous wrapper."""
        import asyncio
        return asyncio.run(self._arun(**kwargs))