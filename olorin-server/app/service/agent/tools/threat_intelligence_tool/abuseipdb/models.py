"""
AbuseIPDB Data Models

Pydantic models for AbuseIPDB API requests and responses.
Provides data validation, serialization, and type safety.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Union

from pydantic import BaseModel, Field, validator


class AbuseCategory(Enum):
    """AbuseIPDB abuse categories."""
    FRAUD_ORDERS = 3
    DDOS_ATTACK = 4
    FTP_BRUTE_FORCE = 5
    PING_OF_DEATH = 6
    PHISHING = 7
    FRAUD_VOIP = 8
    OPEN_PROXY = 9
    WEB_SPAM = 10
    EMAIL_SPAM = 11
    BLOG_SPAM = 12
    VPN_IP = 13
    PORT_SCAN = 14
    HACKING = 15
    SQL_INJECTION = 16
    SPOOFING = 17
    BRUTE_FORCE = 18
    BAD_WEB_BOT = 19
    EXPLOITED_HOST = 20
    WEB_APP_ATTACK = 21
    SSH = 22
    IOT_TARGETED = 23


class AbuseIPDBConfig(BaseModel):
    """Configuration for AbuseIPDB client."""
    
    api_key_secret: str = Field(default="ABUSEIPDB_API_KEY", description="Firebase secret name for API key")
    base_url: str = Field(default="https://api.abuseipdb.com/api/v2", description="AbuseIPDB API base URL")
    timeout: int = Field(default=30, description="Request timeout in seconds")
    max_retries: int = Field(default=3, description="Maximum retry attempts")
    rate_limit_requests: int = Field(default=1000, description="Daily request limit")
    cache_ttl: int = Field(default=3600, description="Cache TTL in seconds")


class IPInfo(BaseModel):
    """IP address information from AbuseIPDB."""
    
    ip_address: str = Field(..., description="IP address")
    is_public: bool = Field(..., description="Whether IP is public")
    ip_version: int = Field(..., description="IP version (4 or 6)")
    is_whitelisted: bool = Field(..., description="Whether IP is whitelisted")
    abuse_confidence_percentage: int = Field(..., description="Abuse confidence percentage")
    country_code: Optional[str] = Field(default=None, description="Country code")
    country_name: Optional[str] = Field(default=None, description="Country name")
    usage_type: Optional[str] = Field(default=None, description="IP usage type")
    isp: Optional[str] = Field(default=None, description="Internet Service Provider")
    domain: Optional[str] = Field(default=None, description="Associated domain")
    total_reports: int = Field(default=0, description="Total reports count")
    num_distinct_users: int = Field(default=0, description="Number of distinct reporting users")
    last_reported_at: Optional[datetime] = Field(default=None, description="Last report timestamp")


class IPReputationResponse(BaseModel):
    """Response from IP reputation check."""
    
    success: bool = Field(..., description="Whether request was successful")
    ip_info: Optional[IPInfo] = Field(default=None, description="IP information")
    error: Optional[str] = Field(default=None, description="Error message if any")
    response_time_ms: int = Field(..., description="Response time in milliseconds")
    cached: bool = Field(default=False, description="Whether response was cached")
    
    def get_risk_level(self) -> str:
        """Get human-readable risk level."""
        if not self.ip_info:
            return "unknown"
        
        confidence = self.ip_info.abuse_confidence_percentage
        
        if confidence >= 75:
            return "high"
        elif confidence >= 50:
            return "medium"
        elif confidence >= 25:
            return "low"
        else:
            return "very_low"


class BulkIPData(BaseModel):
    """Individual IP data in bulk response."""
    
    ip_address: str = Field(..., description="IP address")
    country_code: Optional[str] = Field(default=None, description="Country code")
    usage_type: Optional[str] = Field(default=None, description="Usage type")
    isp: Optional[str] = Field(default=None, description="ISP")
    domain: Optional[str] = Field(default=None, description="Domain")
    abuse_confidence_percentage: int = Field(..., description="Abuse confidence")
    last_reported_at: Optional[datetime] = Field(default=None, description="Last reported")


class BulkAnalysisResponse(BaseModel):
    """Response from bulk IP analysis."""
    
    success: bool = Field(..., description="Whether request was successful")
    ips_analyzed: List[BulkIPData] = Field(default_factory=list, description="Analyzed IP data")
    total_ips: int = Field(default=0, description="Total IPs analyzed")
    high_risk_ips: List[str] = Field(default_factory=list, description="High risk IP addresses")
    error: Optional[str] = Field(default=None, description="Error message if any")
    response_time_ms: int = Field(..., description="Response time in milliseconds")


class CIDRBlockInfo(BaseModel):
    """CIDR block information."""
    
    network_address: str = Field(..., description="Network address")
    netmask: str = Field(..., description="Network mask")
    min_address: str = Field(..., description="Minimum address")
    max_address: str = Field(..., description="Maximum address")
    num_possible_hosts: int = Field(..., description="Number of possible hosts")
    address_space_desc: str = Field(..., description="Address space description")


class CIDRAnalysisResponse(BaseModel):
    """Response from CIDR block analysis."""
    
    success: bool = Field(..., description="Whether request was successful")
    network_info: Optional[CIDRBlockInfo] = Field(default=None, description="Network information")
    reported_ips: List[BulkIPData] = Field(default_factory=list, description="Reported IPs in range")
    total_reported: int = Field(default=0, description="Total reported IPs")
    risk_percentage: float = Field(default=0.0, description="Risk percentage for block")
    error: Optional[str] = Field(default=None, description="Error message if any")
    response_time_ms: int = Field(..., description="Response time in milliseconds")


class AbuseReportRequest(BaseModel):
    """Request to report IP abuse."""
    
    ip: str = Field(..., description="IP address to report")
    categories: List[AbuseCategory] = Field(..., description="Abuse categories")
    comment: str = Field(..., description="Report comment", max_length=1024)
    timestamp: Optional[datetime] = Field(default=None, description="Incident timestamp")
    
    @validator('categories')
    def validate_categories(cls, v):
        if not v:
            raise ValueError("At least one abuse category is required")
        if len(v) > 5:
            raise ValueError("Maximum 5 abuse categories allowed")
        return v
    
    @validator('comment')
    def validate_comment(cls, v):
        if not v or len(v.strip()) < 5:
            raise ValueError("Comment must be at least 5 characters")
        return v.strip()


class AbuseReportResponse(BaseModel):
    """Response from abuse report submission."""
    
    success: bool = Field(..., description="Whether report was successful")
    report_id: Optional[str] = Field(default=None, description="Report ID if successful")
    ip_address: str = Field(..., description="Reported IP address")
    message: Optional[str] = Field(default=None, description="Response message")
    error: Optional[str] = Field(default=None, description="Error message if any")
    response_time_ms: int = Field(..., description="Response time in milliseconds")


class AbuseIPDBError(Exception):
    """AbuseIPDB API error."""
    
    def __init__(self, message: str, status_code: Optional[int] = None):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class RateLimitError(AbuseIPDBError):
    """Rate limit exceeded error."""
    pass


class InvalidAPIKeyError(AbuseIPDBError):
    """Invalid API key error."""
    pass


class IPNotFoundError(AbuseIPDBError):
    """IP not found error."""
    pass