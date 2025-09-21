"""Shodan Infrastructure Analysis Tool for comprehensive infrastructure intelligence."""

import json
from datetime import datetime
from typing import Any, Dict, List, Optional

from langchain.tools import BaseTool
from pydantic import BaseModel, Field, validator

from .models import ShodanHostResponse
from .shodan_client import ShodanClient
from app.service.logging import get_bridge_logger


logger = get_bridge_logger(__name__)


class InfrastructureAnalysisInput(BaseModel):
    """Input schema for infrastructure analysis."""
    
    ip: str = Field(..., description="IP address to analyze")
    include_history: bool = Field(
        default=False,
        description="Include historical scan data"
    )
    include_vulnerabilities: bool = Field(
        default=True,
        description="Include vulnerability analysis"
    )
    include_services: bool = Field(
        default=True,
        description="Include detailed service information"
    )
    
    @validator('ip')
    def validate_ip(cls, v):
        """Validate IP address format."""
        import ipaddress
        import re
        
        # Check for common entity ID patterns that might be passed incorrectly
        entity_patterns = [
            r'^[A-Z0-9]{16}$',  # 16-character alphanumeric (like K1F6HIIGBVHH20TX)
            r'^[a-f0-9\-]{36}$',  # UUID format
            r'^[a-zA-Z0-9_\-]+::[a-f0-9\-]{36}$',  # Entity ID with UUID
        ]
        
        for pattern in entity_patterns:
            if re.match(pattern, v):
                raise ValueError(f"Entity ID detected where IP address expected: {v}. Please extract actual IP addresses from the investigation context data sources.")
        
        try:
            ipaddress.ip_address(v)
            return v
        except ValueError:
            raise ValueError(f"Invalid IP address format: {v}. Expected IPv4 (e.g., 192.168.1.1) or IPv6 (e.g., 2001:db8::1) address.")


class ShodanInfrastructureAnalysisTool(BaseTool):
    """Shodan infrastructure analysis tool for comprehensive host intelligence."""
    
    name: str = "shodan_infrastructure_analysis"
    description: str = (
        "Analyze infrastructure and host information using Shodan. "
        "Provides comprehensive data about open ports, services, vulnerabilities, "
        "SSL certificates, and infrastructure configuration. Use this for "
        "investigating suspicious IP addresses, understanding attack surface, "
        "and identifying potential security risks in fraud investigations."
    )
    args_schema: type = InfrastructureAnalysisInput
    
    def __init__(self):
        """Initialize the Shodan infrastructure analysis tool."""
        super().__init__()
        self._client: Optional[ShodanClient] = None
    
    @property
    def client(self) -> ShodanClient:
        """Get or create Shodan client instance."""
        if self._client is None:
            self._client = ShodanClient()
        return self._client
    
    def _run(self, **kwargs) -> str:
        """Execute infrastructure analysis synchronously."""
        import asyncio
        return asyncio.run(self._arun(**kwargs))
    
    async def _arun(
        self,
        ip: str,
        include_history: bool = False,
        include_vulnerabilities: bool = True,
        include_services: bool = True,
        **kwargs
    ) -> str:
        """Execute infrastructure analysis asynchronously."""
        try:
            # Query Shodan for host information
            host_data = await self.client.host_info(
                ip=ip,
                history=include_history,
                minify=False
            )
            
            # Build comprehensive analysis result
            analysis_result = await self._build_infrastructure_analysis(
                host_data=host_data,
                ip=ip,
                include_vulnerabilities=include_vulnerabilities,
                include_services=include_services
            )
            
            return json.dumps(analysis_result, indent=2, default=str)
            
        except ValueError as e:
            # Handle specific known errors gracefully (like subscription requirements)
            if "paid subscription" in str(e).lower():
                logger.debug(f"Shodan analysis skipped for {ip}: paid subscription required")
                return json.dumps({
                    "status": "skipped",
                    "reason": "Shodan requires paid subscription for this endpoint",
                    "ip": ip,
                    "timestamp": datetime.now().isoformat(),
                    "source": "Shodan"
                }, indent=2)
            else:
                # Other ValueError cases
                logger.warning(f"Shodan analysis failed for {ip}: {str(e)}")
                return json.dumps({
                    "status": "failed",
                    "error": str(e),
                    "ip": ip,
                    "timestamp": datetime.now().isoformat(),
                    "source": "Shodan"
                }, indent=2)
        except Exception as e:
            # Handle all other exceptions gracefully
            logger.warning(f"Shodan analysis unavailable for {ip}: {type(e).__name__}")
            return json.dumps({
                "status": "unavailable",
                "reason": f"Service temporarily unavailable ({type(e).__name__})",
                "ip": ip,
                "timestamp": datetime.now().isoformat(),
                "source": "Shodan"
            }, indent=2)
    
    async def _build_infrastructure_analysis(
        self,
        host_data: ShodanHostResponse,
        ip: str,
        include_vulnerabilities: bool,
        include_services: bool
    ) -> Dict[str, Any]:
        """Build comprehensive infrastructure analysis result."""
        
        # Basic host information
        host_info = {
            "ip": ip,
            "analysis_timestamp": datetime.now().isoformat(),
            "source": "Shodan",
            "last_scan": str(host_data.last_update) if host_data.last_update else None
        }
        
        # Organization and network information
        host_info["network_info"] = {
            "asn": host_data.asn,
            "isp": host_data.isp,
            "organization": host_data.org,
            "hostnames": host_data.hostnames,
            "domains": host_data.domains
        }
        
        # Geographic location
        if host_data.location:
            host_info["location"] = {
                "country": host_data.country_name or host_data.country_code,
                "city": host_data.city,
                "coordinates": host_data.location.coordinates,
                "region": host_data.location.region_code
            }
        
        # Operating system and infrastructure type
        host_info["system_info"] = {
            "os": host_data.os,
            "infrastructure_type": host_data.infrastructure_type,
            "tags": host_data.tags
        }
        
        # Port and service analysis
        if include_services:
            host_info["services"] = self._analyze_services(host_data)
        
        # Open ports summary
        host_info["ports_summary"] = {
            "total_open_ports": len(host_data.ports),
            "open_ports": sorted(host_data.ports),
            "has_critical_ports": host_data.has_critical_ports,
            "critical_services": self._identify_critical_services(host_data)
        }
        
        # Vulnerability analysis
        if include_vulnerabilities:
            host_info["vulnerability_analysis"] = self._analyze_vulnerabilities(host_data)
        
        # Risk assessment
        host_info["risk_assessment"] = self._assess_infrastructure_risk(host_data)
        
        # Security recommendations
        host_info["investigation_recommendations"] = self._generate_recommendations(host_data)
        
        # SSL/TLS analysis
        ssl_info = self._analyze_ssl(host_data)
        if ssl_info:
            host_info["ssl_analysis"] = ssl_info
        
        return {"infrastructure_analysis": host_info}
    
    def _analyze_services(self, host_data: ShodanHostResponse) -> List[Dict[str, Any]]:
        """Analyze services running on the host."""
        services = []
        
        for service in host_data.data[:20]:  # Limit to 20 services
            service_info = {
                "port": service.port,
                "protocol": service.transport,
                "service": service.product,
                "version": service.version,
                "encrypted": service.is_encrypted
            }
            
            # Add banner info if available
            if service.banner:
                # Truncate banner to reasonable length
                service_info["banner_excerpt"] = service.banner[:200]
            
            # Add vulnerability info
            if service.vulns:
                service_info["vulnerabilities"] = service.vulns[:5]  # Limit to 5 CVEs
            
            # Add CPE info for software identification
            if service.cpe:
                service_info["cpe"] = service.cpe[:3]  # Limit to 3 CPEs
            
            services.append(service_info)
        
        return services
    
    def _analyze_vulnerabilities(self, host_data: ShodanHostResponse) -> Dict[str, Any]:
        """Analyze vulnerabilities found on the host."""
        all_vulns = set(host_data.vulns)
        
        # Collect vulnerabilities from services
        for service in host_data.data:
            all_vulns.update(service.vulns)
        
        vuln_list = list(all_vulns)
        
        # Categorize by severity (simplified - would need CVE database for accurate scoring)
        critical_keywords = ['RCE', 'remote code', 'privilege', 'bypass', 'overflow']
        high_keywords = ['injection', 'XSS', 'CSRF', 'authentication']
        
        critical_vulns = []
        high_vulns = []
        other_vulns = []
        
        for vuln in vuln_list:
            vuln_upper = vuln.upper()
            if any(keyword.upper() in vuln_upper for keyword in critical_keywords):
                critical_vulns.append(vuln)
            elif any(keyword.upper() in vuln_upper for keyword in high_keywords):
                high_vulns.append(vuln)
            else:
                other_vulns.append(vuln)
        
        return {
            "total_vulnerabilities": len(vuln_list),
            "critical": critical_vulns[:5],  # Top 5 critical
            "high": high_vulns[:5],  # Top 5 high
            "other": other_vulns[:5],  # Top 5 other
            "vulnerability_summary": {
                "critical_count": len(critical_vulns),
                "high_count": len(high_vulns),
                "other_count": len(other_vulns)
            },
            "requires_immediate_attention": len(critical_vulns) > 0
        }
    
    def _identify_critical_services(self, host_data: ShodanHostResponse) -> List[str]:
        """Identify critical services that pose security risks."""
        critical_services = []
        
        critical_ports_map = {
            21: "FTP (unencrypted file transfer)",
            22: "SSH (remote access)",
            23: "Telnet (unencrypted remote access)",
            25: "SMTP (email server)",
            135: "RPC (Windows remote procedures)",
            139: "NetBIOS (Windows networking)",
            445: "SMB (file sharing)",
            1433: "MSSQL (database)",
            3306: "MySQL (database)",
            3389: "RDP (Windows remote desktop)",
            5432: "PostgreSQL (database)",
            5900: "VNC (remote desktop)",
            6379: "Redis (in-memory database)",
            27017: "MongoDB (database)"
        }
        
        for port in host_data.ports:
            if port in critical_ports_map:
                critical_services.append(f"Port {port}: {critical_ports_map[port]}")
        
        return critical_services[:10]  # Limit to top 10
    
    def _analyze_ssl(self, host_data: ShodanHostResponse) -> Optional[Dict[str, Any]]:
        """Analyze SSL/TLS configuration."""
        ssl_services = []
        
        for service in host_data.data:
            if service.ssl and isinstance(service.ssl, dict):
                ssl_info = {
                    "port": service.port,
                    "cert_expired": service.ssl.get("cert", {}).get("expired", False),
                    "cert_issuer": service.ssl.get("cert", {}).get("issuer", {}).get("O"),
                    "cipher": service.ssl.get("cipher", {}).get("name"),
                    "version": service.ssl.get("cipher", {}).get("version")
                }
                ssl_services.append(ssl_info)
        
        if not ssl_services:
            return None
        
        return {
            "ssl_enabled_services": len(ssl_services),
            "services": ssl_services[:5],  # Top 5 SSL services
            "has_expired_certs": any(s.get("cert_expired") for s in ssl_services)
        }
    
    def _assess_infrastructure_risk(self, host_data: ShodanHostResponse) -> Dict[str, Any]:
        """Assess overall infrastructure risk level."""
        risk_factors = []
        risk_score = 0
        
        # Vulnerability-based risk
        vuln_count = host_data.total_vulnerabilities
        if vuln_count > 10:
            risk_score += 40
            risk_factors.append(f"High vulnerability count: {vuln_count}")
        elif vuln_count > 5:
            risk_score += 25
            risk_factors.append(f"Multiple vulnerabilities: {vuln_count}")
        elif vuln_count > 0:
            risk_score += 15
            risk_factors.append(f"Known vulnerabilities: {vuln_count}")
        
        # Open ports risk
        open_ports = len(host_data.ports)
        if open_ports > 50:
            risk_score += 30
            risk_factors.append(f"Excessive open ports: {open_ports}")
        elif open_ports > 20:
            risk_score += 20
            risk_factors.append(f"Many open ports: {open_ports}")
        elif open_ports > 10:
            risk_score += 10
            risk_factors.append(f"Multiple open ports: {open_ports}")
        
        # Critical ports risk
        if host_data.has_critical_ports:
            risk_score += 25
            risk_factors.append("Critical services exposed")
        
        # Unencrypted services
        unencrypted_critical = []
        for service in host_data.data:
            if service.port in [21, 23, 25, 110, 143] and not service.is_encrypted:
                unencrypted_critical.append(service.port)
        
        if unencrypted_critical:
            risk_score += 20
            risk_factors.append(f"Unencrypted critical services: {unencrypted_critical[:3]}")
        
        # Infrastructure type risk
        if host_data.infrastructure_type in ["iot_device", "network_device"]:
            risk_score += 15
            risk_factors.append(f"Sensitive device type: {host_data.infrastructure_type}")
        
        # Determine risk level
        if risk_score >= 80:
            risk_level = "critical"
        elif risk_score >= 60:
            risk_level = "high"
        elif risk_score >= 40:
            risk_level = "medium"
        elif risk_score >= 20:
            risk_level = "low"
        else:
            risk_level = "minimal"
        
        return {
            "risk_level": risk_level,
            "risk_score": risk_score,
            "risk_factors": risk_factors[:5],  # Top 5 factors
            "infrastructure_classification": host_data.infrastructure_type
        }
    
    def _generate_recommendations(self, host_data: ShodanHostResponse) -> List[str]:
        """Generate investigation recommendations based on analysis."""
        recommendations = []
        
        # Vulnerability-based recommendations
        if host_data.total_vulnerabilities > 5:
            recommendations.append("CRITICAL: Multiple vulnerabilities detected - investigate exploitation attempts")
            recommendations.append("Review access logs for suspicious activity targeting vulnerable services")
        elif host_data.total_vulnerabilities > 0:
            recommendations.append("Known vulnerabilities present - check for exploitation indicators")
        
        # Critical services recommendations
        if host_data.has_critical_ports:
            recommendations.append("Critical services exposed - verify legitimate business purpose")
            recommendations.append("Check for unauthorized access to exposed services")
        
        # Database exposure
        db_ports = set(host_data.ports) & {1433, 3306, 5432, 27017, 6379}
        if db_ports:
            recommendations.append(f"Database services exposed on ports {list(db_ports)} - high risk for data breach")
        
        # Remote access
        remote_ports = set(host_data.ports) & {22, 23, 3389, 5900}
        if remote_ports:
            recommendations.append(f"Remote access services on ports {list(remote_ports)} - verify authorized usage")
        
        # Infrastructure type specific
        if host_data.infrastructure_type == "iot_device":
            recommendations.append("IoT device detected - often vulnerable and rarely updated")
        elif host_data.infrastructure_type == "network_device":
            recommendations.append("Network infrastructure device - critical for network security")
        
        # General recommendations
        recommendations.extend([
            "Cross-reference with internal asset inventory",
            "Check for anomalous traffic patterns from this host",
            "Verify if this infrastructure is authorized for the associated account"
        ])
        
        return recommendations[:7]  # Limit to 7 recommendations