"""
AbuseIPDB Client

RESTful API client for AbuseIPDB threat intelligence service.
Provides comprehensive IP reputation checking, bulk analysis, and abuse reporting.
"""

import asyncio
import json
import time
from datetime import datetime
from typing import Dict, List, Optional, Union

import aiohttp
from aiohttp import ClientTimeout

from .models import (
    AbuseIPDBConfig,
    AbuseIPDBError,
    AbuseReportRequest,
    AbuseReportResponse,
    BulkAnalysisResponse,
    BulkIPData,
    CIDRAnalysisResponse,
    CIDRBlockInfo,
    InvalidAPIKeyError,
    IPInfo,
    IPNotFoundError,
    IPReputationResponse,
    RateLimitError,
)
from app.service.logging import get_bridge_logger
from app.utils.firebase_secrets import get_firebase_secret

logger = get_bridge_logger(__name__)


class AbuseIPDBClient:
    """
    Async client for AbuseIPDB API with enterprise-grade features.
    
    Features:
    - Firebase secrets integration
    - Comprehensive error handling
    - Request/response logging
    - Rate limit detection
    - Connection pooling
    """

    def __init__(self, config: AbuseIPDBConfig):
        """Initialize AbuseIPDB client."""
        self.config = config
        self._api_key: Optional[str] = None
        self._session: Optional[aiohttp.ClientSession] = None

    async def _get_api_key(self) -> str:
        """Get API key from Firebase secrets."""
        if self._api_key is None:
            self._api_key = get_firebase_secret(self.config.api_key_secret)
            if not self._api_key:
                raise InvalidAPIKeyError(
                    f"AbuseIPDB API key not found in Firebase secrets: {self.config.api_key_secret}"
                )
        return self._api_key

    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create HTTP session."""
        if self._session is None or self._session.closed:
            timeout = ClientTimeout(total=self.config.timeout)
            self._session = aiohttp.ClientSession(
                timeout=timeout,
                headers={"User-Agent": "Olorin-Fraud-Detection/1.0"}
            )
        return self._session

    async def _make_request(
        self,
        method: str,
        endpoint: str,
        params: Optional[Dict] = None,
        data: Optional[Dict] = None
    ) -> Dict:
        """Make HTTP request to AbuseIPDB API."""
        start_time = time.time()
        
        try:
            api_key = await self._get_api_key()
            session = await self._get_session()
            
            url = f"{self.config.base_url}/{endpoint}"
            headers = {
                "Key": api_key,
                "Accept": "application/json"
            }
            
            if data:
                headers["Content-Type"] = "application/x-www-form-urlencoded"
            
            logger.debug(f"Making {method} request to {url}")
            
            async with session.request(
                method=method,
                url=url,
                headers=headers,
                params=params,
                data=data
            ) as response:
                response_time = int((time.time() - start_time) * 1000)
                response_text = await response.text()
                
                # Handle different response status codes
                if response.status == 200:
                    return json.loads(response_text)
                elif response.status == 401:
                    raise InvalidAPIKeyError("Invalid API key")
                elif response.status == 429:
                    raise RateLimitError("Rate limit exceeded")
                elif response.status == 404:
                    raise IPNotFoundError("IP address not found")
                else:
                    raise AbuseIPDBError(
                        f"API request failed: {response.status} - {response_text}",
                        status_code=response.status
                    )
                    
        except aiohttp.ClientError as e:
            raise AbuseIPDBError(f"HTTP client error: {str(e)}")
        except json.JSONDecodeError as e:
            raise AbuseIPDBError(f"Invalid JSON response: {str(e)}")

    async def check_ip_reputation(
        self,
        ip_address: str,
        max_age_days: int = 90,
        verbose: bool = True
    ) -> IPReputationResponse:
        """
        Check IP address reputation.
        
        Args:
            ip_address: IP address to check
            max_age_days: Maximum age of reports to consider (1-365)
            verbose: Include verbose response data
            
        Returns:
            IPReputationResponse with reputation data
        """
        start_time = time.time()
        
        try:
            params = {
                "ipAddress": ip_address,
                "maxAgeInDays": min(max(max_age_days, 1), 365),
                "verbose": "true" if verbose else "false"
            }
            
            response_data = await self._make_request("GET", "check", params=params)
            response_time = int((time.time() - start_time) * 1000)
            
            # Parse response data
            ip_info = IPInfo(
                ip_address=response_data.get("ipAddress", ip_address),
                is_public=response_data.get("isPublic", False),
                ip_version=response_data.get("ipVersion", 4),
                is_whitelisted=response_data.get("isWhitelisted", False),
                abuse_confidence_percentage=response_data.get("abuseConfidencePercentage", 0),
                country_code=response_data.get("countryCode"),
                country_name=response_data.get("countryName"),
                usage_type=response_data.get("usageType"),
                isp=response_data.get("isp"),
                domain=response_data.get("domain"),
                total_reports=response_data.get("totalReports", 0),
                num_distinct_users=response_data.get("numDistinctUsers", 0),
                last_reported_at=datetime.fromisoformat(
                    response_data["lastReportedAt"].replace("Z", "+00:00")
                ) if response_data.get("lastReportedAt") else None
            )
            
            return IPReputationResponse(
                success=True,
                ip_info=ip_info,
                response_time_ms=response_time
            )
            
        except AbuseIPDBError:
            raise
        except Exception as e:
            logger.error(f"IP reputation check failed for {ip_address}: {e}")
            return IPReputationResponse(
                success=False,
                error=str(e),
                response_time_ms=int((time.time() - start_time) * 1000)
            )

    async def bulk_check_ips(
        self,
        ip_addresses: List[str],
        max_age_days: int = 90
    ) -> BulkAnalysisResponse:
        """
        Check multiple IP addresses in bulk.
        
        Args:
            ip_addresses: List of IP addresses (max 10000)
            max_age_days: Maximum age of reports to consider
            
        Returns:
            BulkAnalysisResponse with bulk analysis data
        """
        start_time = time.time()
        
        try:
            if len(ip_addresses) > 10000:
                raise ValueError("Maximum 10000 IP addresses allowed in bulk check")
            
            # Join IPs with newlines for bulk request
            ip_list = "\n".join(ip_addresses)
            
            params = {
                "maxAgeInDays": min(max(max_age_days, 1), 365)
            }
            
            data = {
                "networkList": ip_list
            }
            
            response_data = await self._make_request("POST", "check-block", params=params, data=data)
            response_time = int((time.time() - start_time) * 1000)
            
            # Parse bulk response
            ips_analyzed = []
            high_risk_ips = []
            
            for ip_data in response_data.get("data", []):
                bulk_ip = BulkIPData(
                    ip_address=ip_data.get("ipAddress", ""),
                    country_code=ip_data.get("countryCode"),
                    usage_type=ip_data.get("usageType"),
                    isp=ip_data.get("isp"),
                    domain=ip_data.get("domain"),
                    abuse_confidence_percentage=ip_data.get("abuseConfidencePercentage", 0),
                    last_reported_at=datetime.fromisoformat(
                        ip_data["lastReportedAt"].replace("Z", "+00:00")
                    ) if ip_data.get("lastReportedAt") else None
                )
                ips_analyzed.append(bulk_ip)
                
                # Flag high-risk IPs (>75% confidence)
                if bulk_ip.abuse_confidence_percentage >= 75:
                    high_risk_ips.append(bulk_ip.ip_address)
            
            return BulkAnalysisResponse(
                success=True,
                ips_analyzed=ips_analyzed,
                total_ips=len(ips_analyzed),
                high_risk_ips=high_risk_ips,
                response_time_ms=response_time
            )
            
        except AbuseIPDBError:
            raise
        except Exception as e:
            logger.error(f"Bulk IP check failed: {e}")
            return BulkAnalysisResponse(
                success=False,
                error=str(e),
                response_time_ms=int((time.time() - start_time) * 1000)
            )

    async def check_cidr_block(
        self,
        cidr_network: str,
        max_age_days: int = 90
    ) -> CIDRAnalysisResponse:
        """
        Check CIDR network block for reported IPs.
        
        Args:
            cidr_network: CIDR network (e.g., "192.168.1.0/24")
            max_age_days: Maximum age of reports to consider
            
        Returns:
            CIDRAnalysisResponse with network analysis
        """
        start_time = time.time()
        
        try:
            params = {
                "network": cidr_network,
                "maxAgeInDays": min(max(max_age_days, 1), 365)
            }
            
            response_data = await self._make_request("GET", "check-block", params=params)
            response_time = int((time.time() - start_time) * 1000)
            
            # Parse network info
            network_info = None
            if "networkAddress" in response_data:
                network_info = CIDRBlockInfo(
                    network_address=response_data.get("networkAddress", ""),
                    netmask=response_data.get("netmask", ""),
                    min_address=response_data.get("minAddress", ""),
                    max_address=response_data.get("maxAddress", ""),
                    num_possible_hosts=response_data.get("numPossibleHosts", 0),
                    address_space_desc=response_data.get("addressSpaceDesc", "")
                )
            
            # Parse reported IPs
            reported_ips = []
            for ip_data in response_data.get("reportedAddress", []):
                reported_ip = BulkIPData(
                    ip_address=ip_data.get("ipAddress", ""),
                    country_code=ip_data.get("countryCode"),
                    usage_type=ip_data.get("usageType"),
                    isp=ip_data.get("isp"),
                    domain=ip_data.get("domain"),
                    abuse_confidence_percentage=ip_data.get("abuseConfidencePercentage", 0),
                    last_reported_at=datetime.fromisoformat(
                        ip_data["lastReportedAt"].replace("Z", "+00:00")
                    ) if ip_data.get("lastReportedAt") else None
                )
                reported_ips.append(reported_ip)
            
            # Calculate risk percentage
            total_reported = len(reported_ips)
            high_risk_count = sum(1 for ip in reported_ips if ip.abuse_confidence_percentage >= 75)
            risk_percentage = (high_risk_count / max(total_reported, 1)) * 100 if total_reported > 0 else 0.0
            
            return CIDRAnalysisResponse(
                success=True,
                network_info=network_info,
                reported_ips=reported_ips,
                total_reported=total_reported,
                risk_percentage=risk_percentage,
                response_time_ms=response_time
            )
            
        except AbuseIPDBError:
            raise
        except Exception as e:
            logger.error(f"CIDR block check failed for {cidr_network}: {e}")
            return CIDRAnalysisResponse(
                success=False,
                error=str(e),
                response_time_ms=int((time.time() - start_time) * 1000)
            )

    async def report_ip_abuse(self, report_request: AbuseReportRequest) -> AbuseReportResponse:
        """
        Report IP address for abuse.
        
        Args:
            report_request: Abuse report details
            
        Returns:
            AbuseReportResponse with report status
        """
        start_time = time.time()
        
        try:
            # Prepare form data
            categories = ",".join([str(cat.value) for cat in report_request.categories])
            
            data = {
                "ip": report_request.ip,
                "categories": categories,
                "comment": report_request.comment
            }
            
            if report_request.timestamp:
                data["timestamp"] = report_request.timestamp.isoformat()
            
            response_data = await self._make_request("POST", "report", data=data)
            response_time = int((time.time() - start_time) * 1000)
            
            return AbuseReportResponse(
                success=True,
                report_id=response_data.get("reportId"),
                ip_address=report_request.ip,
                message=response_data.get("message"),
                response_time_ms=response_time
            )
            
        except AbuseIPDBError:
            raise
        except Exception as e:
            logger.error(f"IP abuse report failed for {report_request.ip}: {e}")
            return AbuseReportResponse(
                success=False,
                ip_address=report_request.ip,
                error=str(e),
                response_time_ms=int((time.time() - start_time) * 1000)
            )

    async def close(self):
        """Close HTTP session."""
        if self._session and not self._session.closed:
            await self._session.close()

    async def __aenter__(self):
        """Async context manager entry."""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.close()