"""
VirusTotal API Models

Pydantic models for VirusTotal API integration including IP analysis,
domain analysis, file analysis, and URL scanning for threat intelligence.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional, Union

from pydantic import BaseModel, Field


class VirusTotalConfig(BaseModel):
    """Configuration for VirusTotal API integration."""

    api_key_secret: str = Field(
        default="VIRUSTOTAL_API_KEY",
        description="Firebase secret name for VirusTotal API key",
    )
    base_url: str = Field(
        default="https://www.virustotal.com/api/v3",
        description="VirusTotal API base URL",
    )
    timeout_seconds: int = Field(default=30, description="Request timeout in seconds")
    rate_limit_requests: int = Field(
        default=500, description="Requests per day (free tier)"
    )
    rate_limit_window: int = Field(
        default=86400, description="Rate limit window in seconds"
    )


class VirusTotalAnalysisStats(BaseModel):
    """VirusTotal analysis statistics."""

    harmless: int = Field(default=0, description="Harmless detections")
    malicious: int = Field(default=0, description="Malicious detections")
    suspicious: int = Field(default=0, description="Suspicious detections")
    undetected: int = Field(default=0, description="Undetected by engines")
    timeout: int = Field(default=0, description="Timeout detections")

    @property
    def total_engines(self) -> int:
        """Total number of engines that analyzed the item."""
        return (
            self.harmless
            + self.malicious
            + self.suspicious
            + self.undetected
            + self.timeout
        )

    @property
    def detection_rate(self) -> float:
        """Percentage of engines that detected threats."""
        total = self.total_engines
        if total == 0:
            return 0.0
        return (self.malicious + self.suspicious) / total * 100

    @property
    def risk_level(self) -> str:
        """Risk level based on detection statistics."""
        if self.malicious > 5:
            return "CRITICAL"
        elif self.malicious > 2 or self.suspicious > 5:
            return "HIGH"
        elif self.malicious > 0 or self.suspicious > 2:
            return "MEDIUM"
        elif self.suspicious > 0:
            return "LOW"
        else:
            return "MINIMAL"


class VirusTotalVendorResult(BaseModel):
    """Individual vendor/engine analysis result."""

    engine_name: str = Field(..., description="Name of the antivirus engine")
    category: str = Field(..., description="Detection category")
    result: Optional[str] = Field(None, description="Detection result/name")
    method: Optional[str] = Field(None, description="Detection method")
    engine_version: Optional[str] = Field(None, description="Engine version")
    engine_update: Optional[str] = Field(None, description="Engine update date")


class VirusTotalIPResponse(BaseModel):
    """VirusTotal IP analysis response."""

    success: bool = Field(..., description="Whether the query was successful")
    ip: str = Field(..., description="Analyzed IP address")

    # Analysis results
    analysis_stats: Optional[VirusTotalAnalysisStats] = Field(
        None, description="Analysis statistics"
    )
    vendor_results: List[VirusTotalVendorResult] = Field(
        default_factory=list, description="Individual vendor results"
    )

    # IP information
    country: Optional[str] = Field(None, description="Country code")
    asn: Optional[int] = Field(None, description="Structured System Number")
    as_owner: Optional[str] = Field(None, description="AS owner organization")

    # Reputation information
    reputation: Optional[int] = Field(None, description="Community reputation score")
    harmless_votes: int = Field(default=0, description="Harmless community votes")
    malicious_votes: int = Field(default=0, description="Malicious community votes")

    # Additional metadata
    whois_info: Optional[Union[Dict[str, Any], str]] = Field(
        None, description="WHOIS information"
    )
    last_analysis_date: Optional[datetime] = Field(
        None, description="Last analysis timestamp"
    )

    # API response metadata
    response_time_ms: int = Field(
        default=0, description="Response time in milliseconds"
    )
    error: Optional[str] = Field(None, description="Error message if any")


class VirusTotalDomainResponse(BaseModel):
    """VirusTotal domain analysis response."""

    success: bool = Field(..., description="Whether the query was successful")
    domain: str = Field(..., description="Analyzed domain")

    # Analysis results
    analysis_stats: Optional[VirusTotalAnalysisStats] = Field(
        None, description="Analysis statistics"
    )
    vendor_results: List[VirusTotalVendorResult] = Field(
        default_factory=list, description="Individual vendor results"
    )

    # Domain information
    registrar: Optional[str] = Field(None, description="Domain registrar")
    creation_date: Optional[datetime] = Field(None, description="Domain creation date")
    last_update_date: Optional[datetime] = Field(None, description="Last update date")

    # Categories and reputation
    categories: Dict[str, str] = Field(
        default_factory=dict, description="Domain categories from vendors"
    )
    reputation: Optional[int] = Field(None, description="Community reputation score")
    harmless_votes: int = Field(default=0, description="Harmless community votes")
    malicious_votes: int = Field(default=0, description="Malicious community votes")

    # DNS and network info
    dns_records: Dict[str, List[str]] = Field(
        default_factory=dict, description="DNS records"
    )
    subdomains: List[str] = Field(default_factory=list, description="Known subdomains")

    # Additional metadata
    whois_info: Optional[Union[Dict[str, Any], str]] = Field(
        None, description="WHOIS information"
    )
    last_analysis_date: Optional[datetime] = Field(
        None, description="Last analysis timestamp"
    )
    last_modification_date: Optional[datetime] = Field(
        None, description="Last modification timestamp"
    )
    last_analysis_stats: Optional[VirusTotalAnalysisStats] = Field(
        None, description="Last analysis statistics"
    )
    last_analysis_results: Dict[str, Dict[str, Any]] = Field(
        default_factory=dict, description="Detailed analysis results from vendors"
    )
    tags: List[str] = Field(
        default_factory=list, description="Tags associated with the domain"
    )
    popularity_ranks: Dict[str, int] = Field(
        default_factory=dict, description="Popularity rankings"
    )
    total_votes: Dict[str, int] = Field(
        default_factory=dict, description="Total community votes"
    )

    # API response metadata
    response_time_ms: int = Field(
        default=0, description="Response time in milliseconds"
    )
    error: Optional[str] = Field(None, description="Error message if any")


class VirusTotalFileResponse(BaseModel):
    """VirusTotal file analysis response."""

    success: bool = Field(..., description="Whether the query was successful")
    file_hash: str = Field(..., description="File hash (MD5/SHA1/SHA256)")
    hash_type: str = Field(..., description="Hash type")

    # Analysis results
    analysis_stats: Optional[VirusTotalAnalysisStats] = Field(
        None, description="Analysis statistics"
    )
    vendor_results: List[VirusTotalVendorResult] = Field(
        default_factory=list, description="Individual vendor results"
    )

    # File information
    file_names: List[str] = Field(default_factory=list, description="Known file names")
    file_size: Optional[int] = Field(None, description="File size in bytes")
    file_type: Optional[str] = Field(None, description="File type")
    file_type_extension: Optional[str] = Field(None, description="File extension")

    # Detection information
    magic_header: Optional[str] = Field(None, description="File magic header")
    md5: Optional[str] = Field(None, description="MD5 hash")
    sha1: Optional[str] = Field(None, description="SHA1 hash")
    sha256: Optional[str] = Field(None, description="SHA256 hash")

    # Reputation and community
    reputation: Optional[int] = Field(None, description="Community reputation score")
    harmless_votes: int = Field(default=0, description="Harmless community votes")
    malicious_votes: int = Field(default=0, description="Malicious community votes")

    # Timestamps
    first_submission_date: Optional[datetime] = Field(
        None, description="First submission date"
    )
    last_analysis_date: Optional[datetime] = Field(
        None, description="Last analysis timestamp"
    )
    last_submission_date: Optional[datetime] = Field(
        None, description="Last submission date"
    )

    # API response metadata
    response_time_ms: int = Field(
        default=0, description="Response time in milliseconds"
    )
    error: Optional[str] = Field(None, description="Error message if any")


class VirusTotalURLResponse(BaseModel):
    """VirusTotal URL analysis response."""

    success: bool = Field(..., description="Whether the query was successful")
    url: str = Field(..., description="Analyzed URL")
    url_id: str = Field(..., description="VirusTotal URL identifier")

    # Analysis results
    analysis_stats: Optional[VirusTotalAnalysisStats] = Field(
        None, description="Analysis statistics"
    )
    vendor_results: List[VirusTotalVendorResult] = Field(
        default_factory=list, description="Individual vendor results"
    )

    # URL information
    final_url: Optional[str] = Field(None, description="Final URL after redirects")
    redirect_chain: List[str] = Field(
        default_factory=list, description="Redirect chain"
    )

    # Categories and reputation
    categories: Dict[str, str] = Field(
        default_factory=dict, description="URL categories from vendors"
    )
    reputation: Optional[int] = Field(None, description="Community reputation score")
    harmless_votes: int = Field(default=0, description="Harmless community votes")
    malicious_votes: int = Field(default=0, description="Malicious community votes")

    # Technical information
    response_code: Optional[int] = Field(None, description="HTTP response code")
    title: Optional[str] = Field(None, description="Page title")

    # Timestamps
    first_submission_date: Optional[datetime] = Field(
        None, description="First submission date"
    )
    last_analysis_date: Optional[datetime] = Field(
        None, description="Last analysis timestamp"
    )
    last_submission_date: Optional[datetime] = Field(
        None, description="Last submission date"
    )

    # API response metadata
    response_time_ms: int = Field(
        default=0, description="Response time in milliseconds"
    )
    error: Optional[str] = Field(None, description="Error message if any")


# Error types for VirusTotal API
class VirusTotalError(Exception):
    """Base exception for VirusTotal API errors."""

    pass


class VirusTotalRateLimitError(VirusTotalError):
    """Raised when API rate limit is exceeded."""

    pass


class VirusTotalAuthError(VirusTotalError):
    """Raised when API authentication fails."""

    pass


class VirusTotalNotFoundError(VirusTotalError):
    """Raised when requested resource is not found."""

    pass


class VirusTotalQuotaError(VirusTotalError):
    """Raised when API quota is exceeded."""

    pass
