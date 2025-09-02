"""
Shodan API Response Models

Comprehensive Pydantic models for Shodan API responses including
host information, search results, and infrastructure data.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field, validator


class ShodanLocation(BaseModel):
    """Location information for a host."""
    
    city: Optional[str] = Field(None, description="City name")
    region_code: Optional[str] = Field(None, description="Region/state code")
    area_code: Optional[int] = Field(None, description="Area code")
    longitude: Optional[float] = Field(None, description="Longitude coordinate")
    latitude: Optional[float] = Field(None, description="Latitude coordinate")
    country_code: Optional[str] = Field(None, description="Country code (2 letters)")
    country_code3: Optional[str] = Field(None, description="Country code (3 letters)")
    country_name: Optional[str] = Field(None, description="Country name")
    postal_code: Optional[str] = Field(None, description="Postal/ZIP code")
    dma_code: Optional[int] = Field(None, description="DMA code")
    
    @property
    def coordinates(self) -> Optional[tuple]:
        """Get coordinates as tuple."""
        if self.latitude is not None and self.longitude is not None:
            return (self.latitude, self.longitude)
        return None


class ShodanVulnerability(BaseModel):
    """Vulnerability information."""
    
    cvss: Optional[float] = Field(None, description="CVSS score")
    references: List[str] = Field(default_factory=list, description="Reference URLs")
    summary: Optional[str] = Field(None, description="Vulnerability summary")
    verified: bool = Field(False, description="Whether verified")
    cve: Optional[str] = Field(None, description="CVE identifier")
    
    @property
    def severity(self) -> str:
        """Get severity level based on CVSS score."""
        if self.cvss is None:
            return "unknown"
        elif self.cvss >= 9.0:
            return "critical"
        elif self.cvss >= 7.0:
            return "high"
        elif self.cvss >= 4.0:
            return "medium"
        elif self.cvss >= 0.1:
            return "low"
        else:
            return "none"


class ShodanService(BaseModel):
    """Service/port information."""
    
    port: int = Field(..., description="Port number")
    transport: str = Field("tcp", description="Transport protocol (tcp/udp)")
    product: Optional[str] = Field(None, description="Product name")
    version: Optional[str] = Field(None, description="Product version")
    cpe: List[str] = Field(default_factory=list, description="CPE identifiers")
    info: Optional[str] = Field(None, description="Additional info")
    banner: Optional[str] = Field(None, description="Service banner")
    ssl: Optional[Dict[str, Any]] = Field(None, description="SSL/TLS information")
    vulns: List[str] = Field(default_factory=list, description="Vulnerability CVEs")
    timestamp: Optional[datetime] = Field(None, description="Scan timestamp")
    
    @property
    def is_encrypted(self) -> bool:
        """Check if service uses encryption."""
        return self.ssl is not None and len(self.ssl) > 0
    
    @property
    def has_vulnerabilities(self) -> bool:
        """Check if service has known vulnerabilities."""
        return len(self.vulns) > 0


class ShodanHostResponse(BaseModel):
    """Complete host information from Shodan."""
    
    ip_str: str = Field(..., description="IP address string")
    ip: Optional[int] = Field(None, description="IP address as integer")
    asn: Optional[str] = Field(None, description="Autonomous System Number")
    isp: Optional[str] = Field(None, description="Internet Service Provider")
    org: Optional[str] = Field(None, description="Organization")
    os: Optional[str] = Field(None, description="Operating system")
    hostnames: List[str] = Field(default_factory=list, description="Hostnames")
    domains: List[str] = Field(default_factory=list, description="Domains")
    country_code: Optional[str] = Field(None, description="Country code")
    country_name: Optional[str] = Field(None, description="Country name")
    city: Optional[str] = Field(None, description="City")
    latitude: Optional[float] = Field(None, description="Latitude")
    longitude: Optional[float] = Field(None, description="Longitude")
    last_update: Optional[datetime] = Field(None, description="Last scan date")
    ports: List[int] = Field(default_factory=list, description="Open ports")
    vulns: List[str] = Field(default_factory=list, description="Vulnerability CVEs")
    tags: List[str] = Field(default_factory=list, description="Tags")
    
    # Detailed data
    data: List[ShodanService] = Field(default_factory=list, description="Service data")
    location: Optional[ShodanLocation] = Field(None, description="Location details")
    
    @property
    def total_vulnerabilities(self) -> int:
        """Get total number of vulnerabilities."""
        vulns = set(self.vulns)
        for service in self.data:
            vulns.update(service.vulns)
        return len(vulns)
    
    @property
    def risk_level(self) -> str:
        """Assess overall risk level."""
        vuln_count = self.total_vulnerabilities
        open_ports = len(self.ports)
        
        if vuln_count > 10:
            return "critical"
        elif vuln_count > 5:
            return "high"
        elif vuln_count > 0:
            return "medium"
        elif open_ports > 20:
            return "medium"
        elif open_ports > 5:
            return "low"
        else:
            return "minimal"
    
    @property
    def has_critical_ports(self) -> bool:
        """Check for critical/dangerous open ports."""
        critical_ports = {
            21,    # FTP
            22,    # SSH
            23,    # Telnet
            25,    # SMTP
            135,   # RPC
            139,   # NetBIOS
            445,   # SMB
            1433,  # MSSQL
            3306,  # MySQL
            3389,  # RDP
            5432,  # PostgreSQL
            5900,  # VNC
            6379,  # Redis
            27017, # MongoDB
        }
        return bool(set(self.ports) & critical_ports)
    
    @property
    def infrastructure_type(self) -> str:
        """Determine infrastructure type based on services."""
        if not self.data:
            return "unknown"
        
        services = [s.product for s in self.data if s.product]
        banners = [s.banner for s in self.data if s.banner]
        all_text = " ".join(services + banners).lower()
        
        if "apache" in all_text or "nginx" in all_text or "iis" in all_text:
            return "web_server"
        elif "mysql" in all_text or "postgres" in all_text or "mongodb" in all_text:
            return "database_server"
        elif "smtp" in all_text or "postfix" in all_text or "exchange" in all_text:
            return "mail_server"
        elif "ssh" in all_text or "telnet" in all_text:
            return "remote_access"
        elif "camera" in all_text or "dvr" in all_text or "nvr" in all_text:
            return "iot_device"
        elif "router" in all_text or "switch" in all_text or "firewall" in all_text:
            return "network_device"
        else:
            return "general_server"


class ShodanSearchResult(BaseModel):
    """Individual search result."""
    
    ip_str: str = Field(..., description="IP address")
    port: int = Field(..., description="Port number")
    timestamp: datetime = Field(..., description="Scan timestamp")
    hostnames: List[str] = Field(default_factory=list, description="Hostnames")
    location: Optional[ShodanLocation] = Field(None, description="Location")
    org: Optional[str] = Field(None, description="Organization")
    data: Optional[str] = Field(None, description="Banner/data")
    asn: Optional[str] = Field(None, description="ASN")
    transport: str = Field("tcp", description="Transport protocol")
    product: Optional[str] = Field(None, description="Product")
    version: Optional[str] = Field(None, description="Version")
    
    @property
    def summary(self) -> str:
        """Get summary description."""
        parts = [self.ip_str]
        if self.org:
            parts.append(f"({self.org})")
        parts.append(f"port {self.port}")
        if self.product:
            parts.append(f"- {self.product}")
            if self.version:
                parts.append(f"v{self.version}")
        return " ".join(parts)


class ShodanSearchResponse(BaseModel):
    """Search response from Shodan."""
    
    matches: List[ShodanSearchResult] = Field(default_factory=list, description="Search results")
    total: int = Field(0, description="Total results available")
    facets: Dict[str, List[Dict[str, Any]]] = Field(default_factory=dict, description="Facet results")
    
    @property
    def unique_ips(self) -> List[str]:
        """Get unique IP addresses."""
        return list(set(match.ip_str for match in self.matches))
    
    @property
    def unique_organizations(self) -> List[str]:
        """Get unique organizations."""
        orgs = [match.org for match in self.matches if match.org]
        return list(set(orgs))
    
    @property
    def port_distribution(self) -> Dict[int, int]:
        """Get port distribution."""
        distribution = {}
        for match in self.matches:
            distribution[match.port] = distribution.get(match.port, 0) + 1
        return dict(sorted(distribution.items(), key=lambda x: x[1], reverse=True))
    
    @property
    def country_distribution(self) -> Dict[str, int]:
        """Get country distribution."""
        distribution = {}
        for match in self.matches:
            if match.location and match.location.country_code:
                cc = match.location.country_code
                distribution[cc] = distribution.get(cc, 0) + 1
        return dict(sorted(distribution.items(), key=lambda x: x[1], reverse=True))


class ShodanDNSResponse(BaseModel):
    """DNS lookup response."""
    
    domain: str = Field(..., description="Domain name")
    tags: List[str] = Field(default_factory=list, description="Tags")
    data: List[Dict[str, Any]] = Field(default_factory=list, description="DNS records")
    subdomains: List[str] = Field(default_factory=list, description="Subdomains")
    
    @property
    def a_records(self) -> List[str]:
        """Get A records (IPv4 addresses)."""
        records = []
        for item in self.data:
            if item.get("type") == "A":
                records.append(item.get("value"))
        return records
    
    @property
    def mx_records(self) -> List[str]:
        """Get MX records."""
        records = []
        for item in self.data:
            if item.get("type") == "MX":
                records.append(item.get("value"))
        return records


class ShodanExploitResult(BaseModel):
    """Exploit/vulnerability search result."""
    
    cve: Optional[str] = Field(None, description="CVE identifier")
    description: str = Field(..., description="Exploit description")
    author: Optional[str] = Field(None, description="Author")
    date: Optional[datetime] = Field(None, description="Publication date")
    type: Optional[str] = Field(None, description="Exploit type")
    platform: Optional[str] = Field(None, description="Platform")
    port: Optional[int] = Field(None, description="Affected port")
    
    @property
    def age_days(self) -> Optional[int]:
        """Get age in days."""
        if self.date:
            return (datetime.now() - self.date).days
        return None


class ShodanAPIInfo(BaseModel):
    """API information and limits."""
    
    scan_credits: int = Field(0, description="Scan credits remaining")
    usage_limits: Dict[str, int] = Field(default_factory=dict, description="Usage limits")
    plan: str = Field("unknown", description="API plan")
    query_credits: int = Field(0, description="Query credits remaining")