"""
VirusTotal API Client

Async HTTP client for VirusTotal API v3 integration with comprehensive
threat intelligence analysis capabilities for IP addresses, domains, files, and URLs.
"""

import asyncio
import base64
import hashlib
from datetime import datetime
from typing import Optional
import urllib.parse

import aiohttp
from app.utils.firebase_secrets import get_firebase_secret

from .models import (
    VirusTotalConfig,
    VirusTotalIPResponse,
    VirusTotalDomainResponse, 
    VirusTotalFileResponse,
    VirusTotalURLResponse,
    VirusTotalAnalysisStats,
    VirusTotalVendorResult,
    VirusTotalError,
    VirusTotalRateLimitError,
    VirusTotalAuthError,
    VirusTotalNotFoundError,
    VirusTotalQuotaError
)
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class VirusTotalClient:
    """
    Async VirusTotal API client for threat intelligence analysis.
    
    Supports:
    - IP address reputation analysis
    - Domain and URL scanning
    - File hash analysis
    - Comprehensive threat intelligence reporting
    """
    
    def __init__(self, config: VirusTotalConfig):
        """Initialize VirusTotal API client."""
        self.config = config
        self._api_key: Optional[str] = None
        self._session: Optional[aiohttp.ClientSession] = None
    
    async def _get_api_key(self) -> str:
        """Get API key from Firebase secrets."""
        if self._api_key is None:
            try:
                self._api_key = get_firebase_secret(self.config.api_key_secret)
                if not self._api_key:
                    raise VirusTotalAuthError(f"VirusTotal API key not found: {self.config.api_key_secret}")
            except Exception as e:
                logger.error(f"Failed to retrieve VirusTotal API key: {e}")
                raise VirusTotalAuthError(f"API key retrieval failed: {str(e)}")
        
        return self._api_key
    
    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create HTTP session."""
        if self._session is None or self._session.closed:
            api_key = await self._get_api_key()
            headers = {
                'x-apikey': api_key,
                'User-Agent': 'Olorin-ThreatIntelligence/1.0',
                'Accept': 'application/json'
            }
            
            timeout = aiohttp.ClientTimeout(total=self.config.timeout_seconds)
            self._session = aiohttp.ClientSession(
                headers=headers,
                timeout=timeout,
                raise_for_status=False
            )
        
        return self._session
    
    async def _make_request(self, endpoint: str, method: str = "GET", **kwargs) -> dict:
        """Make HTTP request to VirusTotal API."""
        session = await self._get_session()
        url = f"{self.config.base_url}/{endpoint}"
        
        start_time = datetime.utcnow()
        
        try:
            async with session.request(method, url, **kwargs) as response:
                response_time_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
                
                # Handle different response codes
                if response.status == 200:
                    data = await response.json()
                    return {"success": True, "data": data, "response_time_ms": response_time_ms}
                
                elif response.status == 404:
                    raise VirusTotalNotFoundError("Resource not found in VirusTotal database")
                
                elif response.status == 401:
                    raise VirusTotalAuthError("VirusTotal API authentication failed")
                
                elif response.status == 429:
                    raise VirusTotalRateLimitError("VirusTotal API rate limit exceeded")
                
                elif response.status == 403:
                    raise VirusTotalQuotaError("VirusTotal API quota exceeded")
                
                else:
                    error_text = await response.text()
                    raise VirusTotalError(f"VirusTotal API error {response.status}: {error_text}")
        
        except asyncio.TimeoutError:
            raise VirusTotalError(f"Request timeout after {self.config.timeout_seconds} seconds")
    
    def _parse_analysis_stats(self, stats_data: dict) -> VirusTotalAnalysisStats:
        """Parse analysis statistics from API response."""
        return VirusTotalAnalysisStats(
            harmless=stats_data.get('harmless', 0),
            malicious=stats_data.get('malicious', 0),
            suspicious=stats_data.get('suspicious', 0),
            undetected=stats_data.get('undetected', 0),
            timeout=stats_data.get('timeout', 0)
        )
    
    def _parse_vendor_results(self, engines_data: dict) -> list:
        """Parse individual vendor/engine results."""
        vendors = []
        
        for engine_name, engine_data in engines_data.items():
            vendor = VirusTotalVendorResult(
                engine_name=engine_name,
                category=engine_data.get('category', 'unknown'),
                result=engine_data.get('result'),
                method=engine_data.get('method'),
                engine_version=engine_data.get('engine_version'),
                engine_update=engine_data.get('engine_update')
            )
            vendors.append(vendor)
        
        return vendors
    
    def _safe_get_datetime(self, timestamp: Optional[int]) -> Optional[datetime]:
        """Safely convert timestamp to datetime."""
        if timestamp:
            try:
                return datetime.fromtimestamp(timestamp)
            except (ValueError, OSError):
                return None
        return None
    
    async def analyze_ip(self, ip_address: str) -> VirusTotalIPResponse:
        """
        Analyze IP address reputation and threat intelligence.
        
        Args:
            ip_address: IP address to analyze
            
        Returns:
            VirusTotalIPResponse with analysis results
        """
        try:
            result = await self._make_request(f"ip_addresses/{ip_address}")
            
            if not result["success"]:
                return VirusTotalIPResponse(
                    success=False,
                    ip_address=ip_address,
                    error="Failed to retrieve data from VirusTotal",
                    response_time_ms=result.get("response_time_ms", 0)
                )
            
            data = result["data"]["data"]
            attributes = data.get("attributes", {})
            
            # Parse analysis stats
            analysis_stats = None
            if "last_analysis_stats" in attributes:
                analysis_stats = self._parse_analysis_stats(attributes["last_analysis_stats"])
            
            # Parse vendor results
            vendor_results = []
            if "last_analysis_results" in attributes:
                vendor_results = self._parse_vendor_results(attributes["last_analysis_results"])
            
            # Parse reputation votes
            reputation_data = attributes.get("reputation", 0)
            votes = attributes.get("total_votes", {})
            
            response = VirusTotalIPResponse(
                success=True,
                ip_address=ip_address,
                analysis_stats=analysis_stats,
                vendor_results=vendor_results,
                country=attributes.get("country"),
                asn=attributes.get("asn"),
                as_owner=attributes.get("as_owner"),
                reputation=reputation_data,
                harmless_votes=votes.get("harmless", 0),
                malicious_votes=votes.get("malicious", 0),
                whois_info=attributes.get("whois"),
                last_analysis_date=self._safe_get_datetime(attributes.get("last_analysis_date")),
                response_time_ms=result["response_time_ms"]
            )
            
            return response
            
        except (VirusTotalError, Exception) as e:
            logger.error(f"VirusTotal IP analysis failed for {ip_address}: {e}")
            return VirusTotalIPResponse(
                success=False,
                ip_address=ip_address,
                error=str(e)
            )
    
    async def analyze_domain(self, domain: str) -> VirusTotalDomainResponse:
        """
        Analyze domain reputation and threat intelligence.
        
        Args:
            domain: Domain to analyze
            
        Returns:
            VirusTotalDomainResponse with analysis results
        """
        try:
            # Ensure domain is properly encoded as string (handle bytes input)
            if isinstance(domain, bytes):
                domain = domain.decode('utf-8', errors='ignore')
            
            # URL encode the domain for safe API calls
            encoded_domain = urllib.parse.quote(domain, safe='')
            
            result = await self._make_request(f"domains/{encoded_domain}")
            
            if not result["success"]:
                return VirusTotalDomainResponse(
                    success=False,
                    domain=domain,
                    error="Failed to retrieve data from VirusTotal",
                    response_time_ms=result.get("response_time_ms", 0)
                )
            
            data = result["data"]["data"]
            attributes = data.get("attributes", {})
            
            # Parse analysis stats
            analysis_stats = None
            if "last_analysis_stats" in attributes:
                analysis_stats = self._parse_analysis_stats(attributes["last_analysis_stats"])
            
            # Parse vendor results
            vendor_results = []
            if "last_analysis_results" in attributes:
                vendor_results = self._parse_vendor_results(attributes["last_analysis_results"])
            
            # Parse reputation and votes
            reputation_data = attributes.get("reputation", 0)
            votes = attributes.get("total_votes", {})
            
            response = VirusTotalDomainResponse(
                success=True,
                domain=domain,
                analysis_stats=analysis_stats,
                vendor_results=vendor_results,
                registrar=attributes.get("registrar"),
                creation_date=self._safe_get_datetime(attributes.get("creation_date")),
                last_update_date=self._safe_get_datetime(attributes.get("last_update_date")),
                categories=attributes.get("categories", {}),
                reputation=reputation_data,
                harmless_votes=votes.get("harmless", 0),
                malicious_votes=votes.get("malicious", 0),
                dns_records=attributes.get("dns_records", {}),
                subdomains=list(attributes.get("subdomains", {}).keys())[:50],  # Limit for response size
                whois_info=attributes.get("whois"),
                last_analysis_date=self._safe_get_datetime(attributes.get("last_analysis_date")),
                response_time_ms=result["response_time_ms"]
            )
            
            return response
            
        except (VirusTotalError, Exception) as e:
            logger.error(f"VirusTotal domain analysis failed for {domain}: {e}")
            return VirusTotalDomainResponse(
                success=False,
                domain=domain,
                error=str(e)
            )
    
    async def analyze_file_hash(self, file_hash: str) -> VirusTotalFileResponse:
        """
        Analyze file hash reputation and threat intelligence.
        
        Args:
            file_hash: File hash (MD5, SHA1, or SHA256)
            
        Returns:
            VirusTotalFileResponse with analysis results
        """
        try:
            # Determine hash type
            hash_type = {32: "MD5", 40: "SHA1", 64: "SHA256"}.get(len(file_hash), "UNKNOWN")
            
            result = await self._make_request(f"files/{file_hash}")
            
            if not result["success"]:
                return VirusTotalFileResponse(
                    success=False,
                    file_hash=file_hash,
                    hash_type=hash_type,
                    error="Failed to retrieve data from VirusTotal",
                    response_time_ms=result.get("response_time_ms", 0)
                )
            
            data = result["data"]["data"]
            attributes = data.get("attributes", {})
            
            # Parse analysis stats
            analysis_stats = None
            if "last_analysis_stats" in attributes:
                analysis_stats = self._parse_analysis_stats(attributes["last_analysis_stats"])
            
            # Parse vendor results
            vendor_results = []
            if "last_analysis_results" in attributes:
                vendor_results = self._parse_vendor_results(attributes["last_analysis_results"])
            
            # Parse reputation and votes
            reputation_data = attributes.get("reputation", 0)
            votes = attributes.get("total_votes", {})
            
            response = VirusTotalFileResponse(
                success=True,
                file_hash=file_hash,
                hash_type=hash_type,
                analysis_stats=analysis_stats,
                vendor_results=vendor_results,
                file_names=attributes.get("names", [])[:10],  # Limit for response size
                file_size=attributes.get("size"),
                file_type=attributes.get("type_description"),
                file_type_extension=attributes.get("type_extension"),
                magic_header=attributes.get("magic"),
                md5=attributes.get("md5"),
                sha1=attributes.get("sha1"),
                sha256=attributes.get("sha256"),
                reputation=reputation_data,
                harmless_votes=votes.get("harmless", 0),
                malicious_votes=votes.get("malicious", 0),
                first_submission_date=self._safe_get_datetime(attributes.get("first_submission_date")),
                last_analysis_date=self._safe_get_datetime(attributes.get("last_analysis_date")),
                last_submission_date=self._safe_get_datetime(attributes.get("last_submission_date")),
                response_time_ms=result["response_time_ms"]
            )
            
            return response
            
        except (VirusTotalError, Exception) as e:
            logger.error(f"VirusTotal file analysis failed for {file_hash}: {e}")
            return VirusTotalFileResponse(
                success=False,
                file_hash=file_hash,
                hash_type=hash_type,
                error=str(e)
            )
    
    async def analyze_url(self, url: str) -> VirusTotalURLResponse:
        """
        Analyze URL reputation and threat intelligence.
        
        Args:
            url: URL to analyze
            
        Returns:
            VirusTotalURLResponse with analysis results
        """
        try:
            # URL needs to be base64 encoded for VirusTotal API
            url_encoded = base64.urlsafe_b64encode(url.encode()).decode().strip("=")
            
            result = await self._make_request(f"urls/{url_encoded}")
            
            if not result["success"]:
                return VirusTotalURLResponse(
                    success=False,
                    url=url,
                    url_id=url_encoded,
                    error="Failed to retrieve data from VirusTotal",
                    response_time_ms=result.get("response_time_ms", 0)
                )
            
            data = result["data"]["data"]
            attributes = data.get("attributes", {})
            
            # Parse analysis stats
            analysis_stats = None
            if "last_analysis_stats" in attributes:
                analysis_stats = self._parse_analysis_stats(attributes["last_analysis_stats"])
            
            # Parse vendor results
            vendor_results = []
            if "last_analysis_results" in attributes:
                vendor_results = self._parse_vendor_results(attributes["last_analysis_results"])
            
            # Parse reputation and votes
            reputation_data = attributes.get("reputation", 0)
            votes = attributes.get("total_votes", {})
            
            response = VirusTotalURLResponse(
                success=True,
                url=url,
                url_id=url_encoded,
                analysis_stats=analysis_stats,
                vendor_results=vendor_results,
                final_url=attributes.get("last_final_url"),
                redirect_chain=attributes.get("redirect_chain", []),
                categories=attributes.get("categories", {}),
                reputation=reputation_data,
                harmless_votes=votes.get("harmless", 0),
                malicious_votes=votes.get("malicious", 0),
                response_code=attributes.get("last_http_response_code"),
                title=attributes.get("title"),
                first_submission_date=self._safe_get_datetime(attributes.get("first_submission_date")),
                last_analysis_date=self._safe_get_datetime(attributes.get("last_analysis_date")),
                last_submission_date=self._safe_get_datetime(attributes.get("last_submission_date")),
                response_time_ms=result["response_time_ms"]
            )
            
            return response
            
        except (VirusTotalError, Exception) as e:
            logger.error(f"VirusTotal URL analysis failed for {url}: {e}")
            return VirusTotalURLResponse(
                success=False,
                url=url,
                url_id=url_encoded if 'url_encoded' in locals() else "",
                error=str(e)
            )
    
    async def close(self):
        """Close the HTTP session."""
        if self._session and not self._session.closed:
            await self._session.close()
    
    async def __aenter__(self):
        """Async context manager entry."""
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.close()