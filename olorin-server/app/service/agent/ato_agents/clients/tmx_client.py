"""TMX Client for ThreatMetrix fraud detection services."""

import asyncio
import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import aiohttp
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class TMXClient:
    """Client for interacting with TMX ThreatMetrix services."""

    def __init__(
        self,
        base_url: Optional[str] = None,
        api_key: Optional[str] = None,
        timeout: int = 30
    ):
        """Initialize TMX client.
        
        Args:
            base_url: TMX API base URL
            api_key: TMX API key
            timeout: Request timeout in seconds
        """
        self.base_url = base_url or "https://api.threatmetrix.com/v1"
        self.api_key = api_key
        self.timeout = timeout
        self.session: Optional[aiohttp.ClientSession] = None
        
        logger.info(f"Initialized TMXClient with base_url: {self.base_url}")

    async def connect(self) -> None:
        """Initialize HTTP client session."""
        if not self.session:
            headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
            
            if self.api_key:
                headers['Authorization'] = f'Bearer {self.api_key}'
                
            self.session = aiohttp.ClientSession(
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=self.timeout)
            )
            
            logger.info("TMX client session initialized")

    async def disconnect(self) -> None:
        """Clean up HTTP client session."""
        if self.session:
            await self.session.close()
            self.session = None
            logger.info("TMX client session closed")

    async def _make_request(
        self, 
        endpoint: str, 
        payload: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Make HTTP request to TMX API.
        
        Args:
            endpoint: API endpoint
            payload: Request payload
            
        Returns:
            Response data or error information
        """
        if not self.session:
            await self.connect()
        
        url = f"{self.base_url}/{endpoint}"
        
        try:
            async with self.session.post(url, json=payload) as response:
                response_data = await response.json()
                
                if response.status == 200:
                    logger.debug(f"TMX API request successful: {endpoint}")
                    return response_data
                else:
                    logger.warning(f"TMX API error {response.status}: {response_data}")
                    return {
                        "error": f"HTTP {response.status}",
                        "message": response_data.get("message", "Unknown error"),
                        "status": "failed"
                    }
                    
        except asyncio.TimeoutError:
            logger.error(f"TMX API timeout for endpoint: {endpoint}")
            return {
                "error": "timeout",
                "message": "Request timed out",
                "status": "failed"
            }
        except Exception as e:
            logger.error(f"TMX API request failed: {str(e)}")
            return {
                "error": "request_failed",
                "message": str(e),
                "status": "failed"
            }

    async def get_network_analysis(self, user_id: str, session_id: Optional[str] = None) -> Dict[str, Any]:
        """Get network analysis data for a user.
        
        Args:
            user_id: User identifier
            session_id: Session identifier
            
        Returns:
            Network analysis results
        """
        try:
            payload = {
                "user_id": user_id,
                "session_id": session_id or f"session_{user_id}_{int(datetime.now(timezone.utc).timestamp())}",
                "analysis_type": "network",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
            result = await self._make_request("network/analysis", payload)
            
            if result.get("status") == "failed":
                # Return safe default values on failure
                logger.debug(f"TMX network analysis failed for {user_id}: {result.get('error')}")
                return {
                    "user_id": user_id,
                    "is_vpn": False,
                    "is_proxy": False,
                    "risk_score": 0.0,
                    "confidence": 0.0,
                    "status": "unavailable",
                    "error": result.get("error"),
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            
            # Process successful response
            analysis_data = result.get("data", {})
            
            # Calculate confidence based on data completeness
            data_points = sum([
                1 if analysis_data.get("vpn_detected") is not None else 0,
                1 if analysis_data.get("proxy_detected") is not None else 0,
                1 if analysis_data.get("ip_reputation") is not None else 0,
                1 if analysis_data.get("geo_location") is not None else 0
            ])
            confidence = min(0.95, 0.4 + (data_points / 4.0 * 0.55))
            
            return {
                "user_id": user_id,
                "is_vpn": analysis_data.get("vpn_detected", False),
                "is_proxy": analysis_data.get("proxy_detected", False),
                "risk_score": analysis_data.get("network_risk_score", 0.0),
                "confidence": confidence,
                "ip_reputation": analysis_data.get("ip_reputation"),
                "geo_location": analysis_data.get("geo_location"),
                "status": "completed",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error in TMX network analysis: {str(e)}")
            return {
                "user_id": user_id,
                "is_vpn": False,
                "is_proxy": False,
                "risk_score": 0.0,
                "confidence": 0.0,
                "status": "error",
                "error": str(e),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }

    async def get_device_analysis(self, user_id: str, device_id: Optional[str] = None) -> Dict[str, Any]:
        """Get device analysis data for a user.
        
        Args:
            user_id: User identifier
            device_id: Device identifier
            
        Returns:
            Device analysis results
        """
        try:
            payload = {
                "user_id": user_id,
                "device_id": device_id,
                "analysis_type": "device",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
            result = await self._make_request("device/analysis", payload)
            
            if result.get("status") == "failed":
                # Return safe default values on failure
                logger.debug(f"TMX device analysis failed for {user_id}: {result.get('error')}")
                return {
                    "user_id": user_id,
                    "device_risk_score": 0.0,
                    "is_emulator": False,
                    "is_rooted": False,
                    "confidence": 0.0,
                    "status": "unavailable",
                    "error": result.get("error"),
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            
            # Process successful response
            analysis_data = result.get("data", {})
            
            # Calculate confidence based on data completeness
            data_points = sum([
                1 if analysis_data.get("emulator_detected") is not None else 0,
                1 if analysis_data.get("root_detected") is not None else 0,
                1 if analysis_data.get("device_fingerprint") is not None else 0,
                1 if analysis_data.get("malware_detected") is not None else 0
            ])
            confidence = min(0.95, 0.4 + (data_points / 4.0 * 0.55))
            
            return {
                "user_id": user_id,
                "device_risk_score": analysis_data.get("device_risk_score", 0.0),
                "is_emulator": analysis_data.get("emulator_detected", False),
                "is_rooted": analysis_data.get("root_detected", False),
                "malware_detected": analysis_data.get("malware_detected", False),
                "device_fingerprint": analysis_data.get("device_fingerprint"),
                "confidence": confidence,
                "status": "completed",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error in TMX device analysis: {str(e)}")
            return {
                "user_id": user_id,
                "device_risk_score": 0.0,
                "is_emulator": False,
                "is_rooted": False,
                "confidence": 0.0,
                "status": "error",
                "error": str(e),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }

    async def get_device_info(self, user_id: str, device_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get device information for a user.
        
        Args:
            user_id: User identifier
            device_id: Device identifier
            
        Returns:
            List of device information records
        """
        try:
            payload = {
                "user_id": user_id,
                "device_id": device_id,
                "info_type": "device_profile",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
            result = await self._make_request("device/info", payload)
            
            if result.get("status") == "failed":
                # Return empty list on failure
                logger.debug(f"TMX device info failed for {user_id}: {result.get('error')}")
                return []
            
            # Process successful response
            devices_data = result.get("data", {}).get("devices", [])
            
            if not devices_data:
                return []
            
            device_info_list = []
            for device_data in devices_data:
                device_info = {
                    "user_id": user_id,
                    "device_type": device_data.get("device_type"),
                    "os_type": device_data.get("operating_system"),
                    "browser": device_data.get("browser_name"),
                    "language": device_data.get("language"),
                    "timezone": device_data.get("timezone"),
                    "screen_resolution": device_data.get("screen_resolution"),
                    "smart_id": device_data.get("device_fingerprint_id"),
                    "first_seen": device_data.get("first_seen"),
                    "last_seen": device_data.get("last_seen"),
                    "total_sessions": device_data.get("session_count", 0),
                    "status": "active" if device_data.get("is_active") else "inactive",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
                device_info_list.append(device_info)
            
            return device_info_list
            
        except Exception as e:
            logger.error(f"Error getting TMX device info: {str(e)}")
            return []
    
    async def health_check(self) -> Dict[str, Any]:
        """Check the health of the TMX service connection.
        
        Returns:
            Health check results
        """
        try:
            if not self.session:
                await self.connect()
            
            # Simple health check payload
            payload = {
                "check_type": "health",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
            result = await self._make_request("health", payload)
            
            if result.get("status") != "failed":
                return {
                    "status": "healthy",
                    "service": "TMX ThreatMetrix",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            else:
                return {
                    "status": "unhealthy",
                    "service": "TMX ThreatMetrix",
                    "error": result.get("error"),
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
                
        except Exception as e:
            return {
                "status": "error",
                "service": "TMX ThreatMetrix",
                "error": str(e),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }