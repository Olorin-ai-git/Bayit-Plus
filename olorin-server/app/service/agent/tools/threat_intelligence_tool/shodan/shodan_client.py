"""
Shodan API Client

Async HTTP client for interacting with Shodan API v1.
Provides infrastructure intelligence and internet-wide scanning data.
"""

import asyncio
from typing import Any, Dict, List, Optional, Union
from urllib.parse import quote

import aiohttp
from aiohttp import ClientError, ClientTimeout

from app.utils.firebase_secrets import get_firebase_secret
from .models import (
from app.service.logging import get_bridge_logger

    ShodanHostResponse,
    ShodanSearchResponse,
    ShodanSearchResult,
    ShodanService,
    ShodanLocation,
    ShodanDNSResponse,
    ShodanExploitResult,
    ShodanAPIInfo
)

logger = get_bridge_logger(__name__)


class ShodanClient:
    """Async client for Shodan API."""
    
    BASE_URL = "https://api.shodan.io"
    DEFAULT_TIMEOUT = 30
    MAX_RETRIES = 3
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize Shodan client.
        
        Args:
            api_key: Shodan API key (will fetch from Firebase if not provided)
        """
        self._api_key = api_key
        self._session: Optional[aiohttp.ClientSession] = None
        self._headers = {
            "Accept": "application/json",
            "User-Agent": "Olorin-Shodan-Client/1.0"
        }
    
    async def _get_api_key(self) -> str:
        """Get API key from Firebase secrets if not provided."""
        if self._api_key is None:
            try:
                self._api_key = await get_firebase_secret("SHODAN_API_KEY")
                if not self._api_key:
                    raise ValueError("Shodan API key not found in Firebase secrets")
            except Exception as e:
                logger.error(f"Failed to retrieve Shodan API key: {e}")
                raise
        return self._api_key
    
    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create aiohttp session."""
        if self._session is None or self._session.closed:
            timeout = ClientTimeout(total=self.DEFAULT_TIMEOUT)
            self._session = aiohttp.ClientSession(
                headers=self._headers,
                timeout=timeout
            )
        return self._session
    
    async def close(self):
        """Close the HTTP session."""
        if self._session and not self._session.closed:
            await self._session.close()
    
    async def _make_request(
        self,
        method: str,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
        retry_count: int = 0
    ) -> Dict[str, Any]:
        """
        Make API request with retry logic.
        
        Args:
            method: HTTP method
            endpoint: API endpoint
            params: Query parameters
            retry_count: Current retry attempt
            
        Returns:
            API response as dictionary
        """
        api_key = await self._get_api_key()
        session = await self._get_session()
        
        # Add API key to params
        if params is None:
            params = {}
        params["key"] = api_key
        
        url = f"{self.BASE_URL}{endpoint}"
        
        try:
            async with session.request(method, url, params=params) as response:
                if response.status == 200:
                    return await response.json()
                elif response.status == 401:
                    raise ValueError("Invalid API key or unauthorized access")
                elif response.status == 402:
                    raise ValueError("Insufficient credits for this request")
                elif response.status == 404:
                    return {}  # Return empty dict for not found
                elif response.status == 429:
                    # Rate limited - retry with exponential backoff
                    if retry_count < self.MAX_RETRIES:
                        wait_time = 2 ** retry_count
                        logger.warning(f"Rate limited, retrying in {wait_time}s")
                        await asyncio.sleep(wait_time)
                        return await self._make_request(
                            method, endpoint, params, retry_count + 1
                        )
                    raise ValueError("Rate limit exceeded")
                else:
                    error_text = await response.text()
                    raise ValueError(f"API error {response.status}: {error_text}")
                    
        except ClientError as e:
            if retry_count < self.MAX_RETRIES:
                wait_time = 2 ** retry_count
                logger.warning(f"Request failed, retrying in {wait_time}s: {e}")
                await asyncio.sleep(wait_time)
                return await self._make_request(
                    method, endpoint, params, retry_count + 1
                )
            raise
    
    async def host_info(self, ip: str, history: bool = False, minify: bool = False) -> ShodanHostResponse:
        """
        Get detailed information about a host.
        
        Args:
            ip: IP address to query
            history: Include historical banners
            minify: Minimize response size
            
        Returns:
            Host information
        """
        params = {
            "history": history,
            "minify": minify
        }
        
        data = await self._make_request("GET", f"/shodan/host/{ip}", params)
        
        # Parse services data
        services = []
        if "data" in data:
            for item in data["data"]:
                service = ShodanService(
                    port=item.get("port", 0),
                    transport=item.get("transport", "tcp"),
                    product=item.get("product"),
                    version=item.get("version"),
                    cpe=item.get("cpe", []),
                    info=item.get("info"),
                    banner=item.get("data"),
                    ssl=item.get("ssl"),
                    vulns=item.get("vulns", []),
                    timestamp=item.get("timestamp")
                )
                services.append(service)
        
        # Parse location data
        location = None
        if any(k in data for k in ["city", "country_code", "latitude", "longitude"]):
            location = ShodanLocation(
                city=data.get("city"),
                region_code=data.get("region_code"),
                area_code=data.get("area_code"),
                longitude=data.get("longitude"),
                latitude=data.get("latitude"),
                country_code=data.get("country_code"),
                country_code3=data.get("country_code3"),
                country_name=data.get("country_name"),
                postal_code=data.get("postal_code"),
                dma_code=data.get("dma_code")
            )
        
        return ShodanHostResponse(
            ip_str=data.get("ip_str", ip),
            ip=data.get("ip"),
            asn=data.get("asn"),
            isp=data.get("isp"),
            org=data.get("org"),
            os=data.get("os"),
            hostnames=data.get("hostnames", []),
            domains=data.get("domains", []),
            country_code=data.get("country_code"),
            country_name=data.get("country_name"),
            city=data.get("city"),
            latitude=data.get("latitude"),
            longitude=data.get("longitude"),
            last_update=data.get("last_update"),
            ports=data.get("ports", []),
            vulns=data.get("vulns", []),
            tags=data.get("tags", []),
            data=services,
            location=location
        )
    
    async def search(
        self,
        query: str,
        facets: Optional[str] = None,
        page: int = 1,
        minify: bool = True
    ) -> ShodanSearchResponse:
        """
        Search Shodan database.
        
        Args:
            query: Search query (Shodan query syntax)
            facets: Comma-separated list of facets to return
            page: Page number (for pagination)
            minify: Minimize response size
            
        Returns:
            Search results
        """
        params = {
            "query": query,
            "page": page,
            "minify": minify
        }
        
        if facets:
            params["facets"] = facets
        
        data = await self._make_request("GET", "/shodan/host/search", params)
        
        # Parse search results
        matches = []
        for item in data.get("matches", []):
            # Parse location for each result
            location = None
            if "location" in item:
                loc = item["location"]
                location = ShodanLocation(
                    city=loc.get("city"),
                    region_code=loc.get("region_code"),
                    area_code=loc.get("area_code"),
                    longitude=loc.get("longitude"),
                    latitude=loc.get("latitude"),
                    country_code=loc.get("country_code"),
                    country_code3=loc.get("country_code3"),
                    country_name=loc.get("country_name"),
                    postal_code=loc.get("postal_code"),
                    dma_code=loc.get("dma_code")
                )
            
            match = ShodanSearchResult(
                ip_str=item.get("ip_str", ""),
                port=item.get("port", 0),
                timestamp=item.get("timestamp"),
                hostnames=item.get("hostnames", []),
                location=location,
                org=item.get("org"),
                data=item.get("data"),
                asn=item.get("asn"),
                transport=item.get("transport", "tcp"),
                product=item.get("product"),
                version=item.get("version")
            )
            matches.append(match)
        
        return ShodanSearchResponse(
            matches=matches,
            total=data.get("total", 0),
            facets=data.get("facets", {})
        )
    
    async def search_exploits(
        self,
        query: str,
        facets: Optional[str] = None,
        page: int = 1
    ) -> List[ShodanExploitResult]:
        """
        Search for exploits.
        
        Args:
            query: Search query
            facets: Facets to return
            page: Page number
            
        Returns:
            List of exploit results
        """
        params = {
            "query": query,
            "page": page
        }
        
        if facets:
            params["facets"] = facets
        
        data = await self._make_request("GET", "/exploits/search", params)
        
        exploits = []
        for item in data.get("matches", []):
            exploit = ShodanExploitResult(
                cve=item.get("cve"),
                description=item.get("description", ""),
                author=item.get("author"),
                date=item.get("date"),
                type=item.get("type"),
                platform=item.get("platform"),
                port=item.get("port")
            )
            exploits.append(exploit)
        
        return exploits
    
    async def dns_lookup(self, domain: str) -> ShodanDNSResponse:
        """
        Perform DNS lookup.
        
        Args:
            domain: Domain to lookup
            
        Returns:
            DNS information
        """
        data = await self._make_request("GET", f"/dns/domain/{domain}")
        
        return ShodanDNSResponse(
            domain=data.get("domain", domain),
            tags=data.get("tags", []),
            data=data.get("data", []),
            subdomains=data.get("subdomains", [])
        )
    
    async def api_info(self) -> ShodanAPIInfo:
        """
        Get API plan and usage information.
        
        Returns:
            API information
        """
        data = await self._make_request("GET", "/api-info")
        
        return ShodanAPIInfo(
            scan_credits=data.get("scan_credits", 0),
            usage_limits=data.get("usage_limits", {}),
            plan=data.get("plan", "unknown"),
            query_credits=data.get("query_credits", 0)
        )
    
    async def search_count(self, query: str, facets: Optional[str] = None) -> Dict[str, Any]:
        """
        Get count of search results without returning data.
        
        Args:
            query: Search query
            facets: Facets to return
            
        Returns:
            Count and facet information
        """
        params = {"query": query}
        if facets:
            params["facets"] = facets
        
        return await self._make_request("GET", "/shodan/host/count", params)