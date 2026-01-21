"""
AbuseIPDB CIDR Block Analysis Tool

LangChain tool for CIDR network block analysis using AbuseIPDB API.
Analyzes network ranges for reported malicious IPs in fraud investigations.
"""

import ipaddress
import json
from datetime import datetime
from typing import Any, Dict, List, Optional, Type

from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field, validator

from app.service.logging import get_bridge_logger

from .abuseipdb_client import AbuseIPDBClient
from .models import AbuseIPDBConfig

logger = get_bridge_logger(__name__)


class CIDRAnalysisInput(BaseModel):
    """Input schema for CIDR block analysis."""

    cidr_network: str = Field(
        ...,
        description="CIDR network block to analyze (e.g., '[NETWORK]/24', '[NETWORK]/16')",
        examples=["[NETWORK]/24", "[NETWORK]/16", "[NETWORK]/12"],
    )
    max_age_days: int = Field(
        default=90,
        description="Maximum age of reports to consider (1-365 days)",
        ge=1,
        le=365,
    )

    @validator("cidr_network")
    def validate_cidr_network(cls, v):
        """Validate CIDR network format."""
        try:
            network = ipaddress.ip_network(v, strict=False)
            return str(network)
        except ValueError as e:
            raise ValueError(f"Invalid CIDR network format: {v} - {str(e)}")


class CIDRBlockAnalysisTool(BaseTool):
    """Tool for CIDR network block analysis using AbuseIPDB."""

    name: str = "abuseipdb_cidr_analysis"
    description: str = (
        "Analyze CIDR network blocks for reported malicious IPs using AbuseIPDB. "
        "Identifies threat density within network ranges, ISP analysis, and geographic distribution. "
        "Essential for investigating network-based fraud patterns and infrastructure abuse."
    )
    args_schema: Type[BaseModel] = CIDRAnalysisInput

    def __init__(self, **kwargs):
        """Initialize CIDR analysis tool."""
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

    def _calculate_network_stats(self, cidr_network: str) -> Dict[str, Any]:
        """Calculate network statistics from CIDR."""
        try:
            network = ipaddress.ip_network(cidr_network)
            return {
                "network_address": str(network.network_address),
                "broadcast_address": str(network.broadcast_address),
                "netmask": str(network.netmask),
                "prefix_length": network.prefixlen,
                "total_addresses": network.num_addresses,
                "usable_addresses": (
                    max(0, network.num_addresses - 2)
                    if network.prefixlen < 31
                    else network.num_addresses
                ),
                "address_type": "IPv4" if network.version == 4 else "IPv6",
                "is_private": network.is_private,
                "is_loopback": network.is_loopback,
                "is_multicast": network.is_multicast,
            }
        except Exception as e:
            logger.error(f"Error calculating network stats: {e}")
            return {"error": str(e)}

    def _generate_cidr_analysis(self, response, cidr_network: str) -> Dict[str, Any]:
        """Generate comprehensive CIDR analysis from AbuseIPDB response."""
        if not response.success:
            return {"error": response.error or "CIDR analysis failed"}

        network_stats = self._calculate_network_stats(cidr_network)
        reported_ips = response.reported_ips
        total_reported = response.total_reported

        # Risk analysis
        risk_percentage = response.risk_percentage
        threat_density = self._calculate_threat_density(
            total_reported, network_stats.get("usable_addresses", 1)
        )

        # Categorize reported IPs by threat level
        critical_ips = []  # 90%+ confidence
        high_risk_ips = []  # 75-89% confidence
        medium_risk_ips = []  # 50-74% confidence
        low_risk_ips = []  # 25-49% confidence

        for ip_data in reported_ips:
            confidence = ip_data.abuse_confidence_percentage
            ip_entry = {
                "ip": ip_data.ip,
                "confidence": confidence,
                "country": ip_data.country_code,
                "isp": ip_data.isp,
                "last_reported": (
                    ip_data.last_reported_at.isoformat()
                    if ip_data.last_reported_at
                    else None
                ),
            }

            if confidence >= 90:
                critical_ips.append(ip_entry)
            elif confidence >= 75:
                high_risk_ips.append(ip_entry)
            elif confidence >= 50:
                medium_risk_ips.append(ip_entry)
            else:
                low_risk_ips.append(ip_entry)

        # ISP and infrastructure analysis
        infrastructure_analysis = self._analyze_infrastructure(reported_ips)

        # Geographic distribution
        geographic_analysis = self._analyze_geographic_distribution(reported_ips)

        # Temporal analysis
        temporal_analysis = self._analyze_temporal_patterns(reported_ips)

        # Risk assessment
        overall_risk = self._assess_overall_risk(
            risk_percentage, threat_density, len(critical_ips), len(high_risk_ips)
        )

        # Generate recommendations
        recommendations = self._generate_cidr_recommendations(
            overall_risk,
            threat_density,
            critical_ips,
            high_risk_ips,
            infrastructure_analysis,
            network_stats,
        )

        analysis = {
            "cidr_network": cidr_network,
            "network_statistics": network_stats,
            "threat_summary": {
                "total_reported_ips": total_reported,
                "risk_percentage": risk_percentage,
                "threat_density": threat_density,
                "overall_risk_level": overall_risk,
                "critical_ips_count": len(critical_ips),
                "high_risk_ips_count": len(high_risk_ips),
                "medium_risk_ips_count": len(medium_risk_ips),
                "low_risk_ips_count": len(low_risk_ips),
            },
            "critical_ips": critical_ips[:20],  # Limit for response size
            "high_risk_ips": high_risk_ips[:20],
            "medium_risk_ips": medium_risk_ips[:10],
            "infrastructure_analysis": infrastructure_analysis,
            "geographic_analysis": geographic_analysis,
            "temporal_analysis": temporal_analysis,
            "investigation_recommendations": recommendations,
            "metadata": {
                "response_time_ms": response.response_time_ms,
                "analysis_timestamp": datetime.utcnow().isoformat(),
                "source": "AbuseIPDB",
                "network_info": (
                    response.network_info.model_dump()
                    if response.network_info
                    else None
                ),
            },
        }

        return analysis

    def _calculate_threat_density(
        self, reported_count: int, usable_addresses: int
    ) -> float:
        """Calculate threat density as percentage of network compromised."""
        if usable_addresses <= 0:
            return 0.0
        return (reported_count / usable_addresses) * 100

    def _analyze_infrastructure(self, reported_ips) -> Dict[str, Any]:
        """Analyze infrastructure patterns in reported IPs."""
        isp_counts = {}
        usage_types = {}
        domains = set()

        for ip_data in reported_ips:
            # ISP analysis
            isp = ip_data.isp or "Unknown"
            isp_counts[isp] = isp_counts.get(isp, 0) + 1

            # Usage type analysis
            usage_type = ip_data.usage_type or "Unknown"
            usage_types[usage_type] = usage_types.get(usage_type, 0) + 1

            # Domain analysis
            if ip_data.domain:
                domains.add(ip_data.domain)

        # Identify dominant ISP
        dominant_isp = (
            max(isp_counts.items(), key=lambda x: x[1])
            if isp_counts
            else ("Unknown", 0)
        )
        dominant_usage = (
            max(usage_types.items(), key=lambda x: x[1])
            if usage_types
            else ("Unknown", 0)
        )

        # Infrastructure risk assessment
        infrastructure_risk = "LOW"
        if len(isp_counts) == 1:
            infrastructure_risk = "HIGH"  # Single ISP suggests coordinated abuse
        elif len(isp_counts) <= 3 and len(reported_ips) > 10:
            infrastructure_risk = "MEDIUM"  # Few ISPs with many reports

        return {
            "dominant_isp": {"name": dominant_isp[0], "count": dominant_isp[1]},
            "total_isps": len(isp_counts),
            "isp_distribution": sorted(
                isp_counts.items(), key=lambda x: x[1], reverse=True
            )[:10],
            "dominant_usage_type": {
                "type": dominant_usage[0],
                "count": dominant_usage[1],
            },
            "usage_type_distribution": list(usage_types.items()),
            "associated_domains": list(domains)[:20],
            "infrastructure_risk_level": infrastructure_risk,
            "coordination_indicator": len(isp_counts) <= 2 and len(reported_ips) >= 5,
        }

    def _analyze_geographic_distribution(self, reported_ips) -> Dict[str, Any]:
        """Analyze geographic distribution of reported IPs."""
        country_counts = {}

        for ip_data in reported_ips:
            country = ip_data.country_code or "Unknown"
            country_counts[country] = country_counts.get(country, 0) + 1

        total_countries = len([c for c in country_counts.keys() if c != "Unknown"])
        dominant_country = (
            max(country_counts.items(), key=lambda x: x[1])
            if country_counts
            else ("Unknown", 0)
        )

        # Geographic risk assessment
        geographic_risk = "LOW"
        if total_countries == 1:
            geographic_risk = "MEDIUM"  # Single country concentration
        elif dominant_country[1] / len(reported_ips) > 0.8:
            geographic_risk = "MEDIUM"  # High concentration in one country

        return {
            "total_countries": total_countries,
            "dominant_country": {
                "country": dominant_country[0],
                "count": dominant_country[1],
            },
            "country_distribution": sorted(
                country_counts.items(), key=lambda x: x[1], reverse=True
            ),
            "geographic_diversity": (
                "HIGH"
                if total_countries > 5
                else "MEDIUM" if total_countries > 2 else "LOW"
            ),
            "geographic_risk_level": geographic_risk,
        }

    def _analyze_temporal_patterns(self, reported_ips) -> Dict[str, Any]:
        """Analyze temporal patterns in abuse reports."""
        recent_reports = 0  # Within last 30 days
        very_recent = 0  # Within last 7 days
        active_threat = 0  # Within last 24 hours

        now = datetime.utcnow()

        for ip_data in reported_ips:
            if ip_data.last_reported_at:
                days_ago = (now - ip_data.last_reported_at).days

                if days_ago <= 30:
                    recent_reports += 1
                if days_ago <= 7:
                    very_recent += 1
                if days_ago <= 1:
                    active_threat += 1

        # Temporal risk assessment
        temporal_risk = "LOW"
        if active_threat > 0:
            temporal_risk = "CRITICAL"
        elif very_recent >= len(reported_ips) * 0.5:
            temporal_risk = "HIGH"
        elif recent_reports >= len(reported_ips) * 0.7:
            temporal_risk = "MEDIUM"

        return {
            "recent_reports_30d": recent_reports,
            "very_recent_reports_7d": very_recent,
            "active_threats_24h": active_threat,
            "temporal_risk_level": temporal_risk,
            "activity_trend": (
                "INCREASING" if very_recent > recent_reports * 0.3 else "STABLE"
            ),
        }

    def _assess_overall_risk(
        self,
        risk_percentage: float,
        threat_density: float,
        critical_count: int,
        high_risk_count: int,
    ) -> str:
        """Assess overall risk level for the CIDR block."""
        if critical_count > 0 or risk_percentage >= 50:
            return "CRITICAL"
        elif high_risk_count >= 5 or risk_percentage >= 25 or threat_density >= 1.0:
            return "HIGH"
        elif high_risk_count >= 2 or risk_percentage >= 10 or threat_density >= 0.1:
            return "MEDIUM"
        elif risk_percentage >= 5 or threat_density >= 0.01:
            return "LOW"
        else:
            return "MINIMAL"

    def _generate_cidr_recommendations(
        self,
        overall_risk: str,
        threat_density: float,
        critical_ips: List,
        high_risk_ips: List,
        infrastructure_analysis: Dict,
        network_stats: Dict,
    ) -> List[str]:
        """Generate investigation recommendations for CIDR analysis."""
        recommendations = []

        # Risk-based recommendations
        if overall_risk == "CRITICAL":
            recommendations.extend(
                [
                    "🚨 CRITICAL THREAT: Network block shows severe compromise - immediate action required",
                    "🔒 EMERGENCY: Consider blocking entire CIDR block temporarily",
                    "📋 URGENT: Alert security operations center and network team",
                    "🕐 MONITOR: Set up real-time monitoring for this network range",
                ]
            )
        elif overall_risk == "HIGH":
            recommendations.extend(
                [
                    "⚠️ HIGH RISK: Network block requires immediate investigation",
                    "🔍 Enhanced monitoring and access controls recommended",
                    "📊 Cross-reference with recent security incidents",
                ]
            )

        # Threat density recommendations
        if threat_density >= 10.0:
            recommendations.append(
                "🔥 SEVERE: >10% of network compromised - likely coordinated attack"
            )
        elif threat_density >= 1.0:
            recommendations.append(
                "⚠️ WARNING: >1% of network showing malicious activity"
            )
        elif threat_density >= 0.1:
            recommendations.append(
                "📈 NOTABLE: Elevated threat activity within network"
            )

        # Infrastructure-based recommendations
        if infrastructure_analysis.get("coordination_indicator"):
            recommendations.append(
                "🎯 COORDINATED: Evidence suggests organized malicious infrastructure"
            )

        if infrastructure_analysis.get("infrastructure_risk_level") == "HIGH":
            recommendations.append(
                "🏢 ISP ALERT: Single ISP concentration suggests provider-level issue"
            )

        # Network type recommendations
        if network_stats.get("is_private"):
            recommendations.append(
                "🔐 INTERNAL: Private network range - check for insider threats or compromised systems"
            )
        else:
            recommendations.append(
                "🌐 PUBLIC: Internet-routable space - external threat focus"
            )

        # Specific IP recommendations
        if len(critical_ips) > 0:
            recommendations.append(
                f"🎯 IMMEDIATE: {len(critical_ips)} critical-threat IPs require instant blocking"
            )

        if len(high_risk_ips) > 5:
            recommendations.append(
                f"⚠️ PRIORITY: {len(high_risk_ips)} high-risk IPs need investigation"
            )

        # Network size considerations
        total_addresses = network_stats.get("usable_addresses", 0)
        if total_addresses > 1000000:  # Large networks
            recommendations.append(
                "📊 LARGE NETWORK: Consider subnet-level analysis for better granularity"
            )
        elif total_addresses < 256:  # Small networks
            recommendations.append(
                "🔍 SMALL NETWORK: Individual IP investigation recommended"
            )

        if not recommendations:
            recommendations.extend(
                [
                    "✅ GOOD: Network shows minimal threat activity",
                    "🛡️ MAINTAIN: Continue standard monitoring procedures",
                    "📊 BASELINE: Consider as clean baseline for comparison",
                ]
            )

        return recommendations

    async def _arun(self, cidr_network: str, max_age_days: int = 90, **kwargs) -> str:
        """Execute CIDR block analysis asynchronously."""
        try:
            logger.info(f"Starting CIDR analysis for network: {cidr_network}")

            # Query AbuseIPDB
            client = self._get_client()
            cidr_response = await client.check_cidr_block(
                cidr_network=cidr_network, max_age_days=max_age_days
            )

            if cidr_response.success:
                # Generate comprehensive analysis
                analysis_data = self._generate_cidr_analysis(
                    cidr_response, cidr_network
                )

                logger.info(
                    f"CIDR analysis completed: {analysis_data['threat_summary']['total_reported_ips']} reported IPs found"
                )

                return json.dumps(
                    {"success": True, "data": analysis_data}, indent=2, default=str
                )
            else:
                return json.dumps(
                    {
                        "success": False,
                        "error": cidr_response.error or "Unknown error",
                        "cidr_network": cidr_network,
                        "source": "AbuseIPDB",
                    },
                    indent=2,
                )

        except Exception as e:
            logger.error(f"CIDR analysis failed for {cidr_network}: {e}")
            return json.dumps(
                {
                    "success": False,
                    "error": str(e),
                    "cidr_network": cidr_network,
                    "source": "AbuseIPDB",
                },
                indent=2,
            )

    def _run(self, **kwargs) -> str:
        """Synchronous wrapper."""
        import asyncio

        return asyncio.run(self._arun(**kwargs))
