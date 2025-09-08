"""Splunk Client for real Splunk Enterprise integration."""

import asyncio
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import aiohttp
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class SplunkClient:
    """Client for interacting with Splunk Enterprise."""

    def __init__(
        self,
        base_url: Optional[str] = None,
        username: Optional[str] = None,
        password: Optional[str] = None,
        timeout: int = 60
    ):
        """Initialize Splunk client.
        
        Args:
            base_url: Splunk server URL (e.g., https://splunk.company.com:8089)
            username: Splunk username
            password: Splunk password
            timeout: Request timeout in seconds
        """
        self.base_url = base_url or "https://splunk.internal:8089"
        self.username = username
        self.password = password
        self.timeout = timeout
        self.session: Optional[aiohttp.ClientSession] = None
        self.session_key: Optional[str] = None
        
        logger.info(f"Initialized SplunkClient with base_url: {self.base_url}")

    async def connect(self) -> None:
        """Initialize connection and authenticate with Splunk."""
        if not self.session:
            connector = aiohttp.TCPConnector(ssl=False)  # For self-signed certs
            self.session = aiohttp.ClientSession(
                connector=connector,
                timeout=aiohttp.ClientTimeout(total=self.timeout)
            )
            
            # Authenticate and get session key
            if self.username and self.password:
                try:
                    auth_data = {
                        'username': self.username,
                        'password': self.password,
                        'output_mode': 'json'
                    }
                    
                    async with self.session.post(
                        f"{self.base_url}/services/auth/login",
                        data=auth_data
                    ) as response:
                        if response.status == 200:
                            auth_result = await response.json()
                            self.session_key = auth_result.get('sessionKey')
                            logger.info("Successfully authenticated with Splunk")
                        else:
                            logger.warning(f"Splunk authentication failed: {response.status}")
                            
                except Exception as e:
                    logger.warning(f"Splunk authentication error: {str(e)}")
            
            logger.info("Splunk client session initialized")

    async def disconnect(self) -> None:
        """Clean up connection."""
        if self.session:
            await self.session.close()
            self.session = None
            self.session_key = None
            logger.info("Splunk client session closed")

    async def _search(self, search_query: str, max_results: int = 1000) -> List[Dict[str, Any]]:
        """Execute a search query in Splunk.
        
        Args:
            search_query: Splunk search query
            max_results: Maximum number of results to return
            
        Returns:
            List of search results
        """
        if not self.session:
            await self.connect()
            
        if not self.session_key:
            logger.debug("No Splunk session key available, returning empty results")
            return []
        
        try:
            # Create search job
            search_data = {
                'search': search_query,
                'output_mode': 'json',
                'count': max_results,
                'max_count': max_results
            }
            
            headers = {
                'Authorization': f'Splunk {self.session_key}'
            }
            
            async with self.session.post(
                f"{self.base_url}/services/search/jobs",
                data=search_data,
                headers=headers
            ) as response:
                if response.status != 201:
                    logger.debug(f"Splunk search job creation failed: {response.status}")
                    return []
                    
                job_response = await response.json()
                job_id = job_response.get('sid')
                
                if not job_id:
                    logger.debug("No job ID returned from Splunk search")
                    return []
            
            # Poll for job completion
            max_polls = 30
            poll_count = 0
            
            while poll_count < max_polls:
                async with self.session.get(
                    f"{self.base_url}/services/search/jobs/{job_id}",
                    params={'output_mode': 'json'},
                    headers=headers
                ) as status_response:
                    if status_response.status == 200:
                        status_data = await status_response.json()
                        entry = status_data.get('entry', [{}])[0]
                        content = entry.get('content', {})
                        
                        if content.get('isDone'):
                            break
                    
                    await asyncio.sleep(1)
                    poll_count += 1
            
            # Get search results
            async with self.session.get(
                f"{self.base_url}/services/search/jobs/{job_id}/results",
                params={'output_mode': 'json', 'count': max_results},
                headers=headers
            ) as results_response:
                if results_response.status == 200:
                    results_data = await results_response.json()
                    results = results_data.get('results', [])
                    logger.debug(f"Splunk search returned {len(results)} results")
                    return results
                else:
                    logger.debug(f"Failed to get Splunk results: {results_response.status}")
                    return []
                    
        except asyncio.TimeoutError:
            logger.debug(f"Splunk search timeout for query: {search_query}")
            return []
        except Exception as e:
            logger.debug(f"Splunk search error: {str(e)}")
            return []

    async def get_login_history(self, user_id: str, days: int = 30) -> List[Dict[str, Any]]:
        """Get login history for a user from Splunk logs.
        
        Args:
            user_id: User identifier
            days: Number of days to look back
            
        Returns:
            List of login events
        """
        try:
            search_query = f"""
                search index=authentication user_id="{user_id}" earliest=-{days}d
                | eval timestamp=strftime(_time, "%Y-%m-%dT%H:%M:%S.%3NZ")
                | eval status=if(match(event, "success|SUCCESS"), "success", "failure")
                | table timestamp, event_type, status, src_ip, device_id, location, user_agent
                | rename src_ip as ip_address
            """
            
            results = await self._search(search_query)
            
            # Process results to ensure consistent format
            login_events = []
            for result in results:
                login_event = {
                    "timestamp": result.get('timestamp', datetime.now(timezone.utc).isoformat()),
                    "event_type": result.get('event_type', 'login'),
                    "status": result.get('status', 'unknown'),
                    "ip_address": result.get('ip_address'),
                    "device_id": result.get('device_id'),
                    "location": result.get('location'),
                    "user_agent": result.get('user_agent')
                }
                login_events.append(login_event)
            
            logger.debug(f"Retrieved {len(login_events)} login events for user {user_id}")
            return login_events
            
        except Exception as e:
            logger.debug(f"Error getting login history for {user_id}: {str(e)}")
            return []

    async def get_error_events(self, user_id: str, days: int = 30) -> List[Dict[str, Any]]:
        """Get error events for a user from Splunk logs.
        
        Args:
            user_id: User identifier
            days: Number of days to look back
            
        Returns:
            List of error events
        """
        try:
            search_query = f"""
                search index=application user_id="{user_id}" (ERROR OR error OR failed OR failure) earliest=-{days}d
                | eval timestamp=strftime(_time, "%Y-%m-%dT%H:%M:%S.%3NZ")
                | rex field=message "error_code=(?<error_code>[A-Z0-9]+)"
                | table timestamp, event_type, error_code, message, src_ip
                | rename src_ip as ip_address
            """
            
            results = await self._search(search_query)
            
            # Process results
            error_events = []
            for result in results:
                error_event = {
                    "timestamp": result.get('timestamp', datetime.now(timezone.utc).isoformat()),
                    "event_type": result.get('event_type', 'error'),
                    "error_code": result.get('error_code'),
                    "message": result.get('message', ''),
                    "ip_address": result.get('ip_address')
                }
                error_events.append(error_event)
            
            logger.debug(f"Retrieved {len(error_events)} error events for user {user_id}")
            return error_events
            
        except Exception as e:
            logger.debug(f"Error getting error events for {user_id}: {str(e)}")
            return []

    async def get_device_history(self, user_id: str, start_time: datetime, days: int = 30) -> List[Dict[str, Any]]:
        """Get device history for a user from Splunk logs.
        
        Args:
            user_id: User identifier
            start_time: Start time for search (for compatibility)
            days: Number of days to look back
            
        Returns:
            List of device usage records
        """
        try:
            search_query = f"""
                search index=user_activity user_id="{user_id}" earliest=-{days}d
                | eval timestamp=strftime(_time, "%Y-%m-%dT%H:%M:%S.%3NZ")
                | rex field=user_agent "(?<browser>Chrome|Firefox|Safari|Edge|Opera)"
                | rex field=user_agent "(?<os_type>Windows|macOS|Linux|iOS|Android)"
                | table timestamp, device_type, os_type, browser, language, timezone, screen_resolution, device_id
                | rename device_id as smart_id
            """
            
            results = await self._search(search_query)
            
            # Process results
            device_records = []
            for result in results:
                device_record = {
                    "timestamp": result.get('timestamp', datetime.now(timezone.utc).isoformat()),
                    "device_type": result.get('device_type', 'unknown'),
                    "os_type": result.get('os_type'),
                    "browser": result.get('browser'),
                    "language": result.get('language'),
                    "timezone": result.get('timezone'),
                    "screen_resolution": result.get('screen_resolution'),
                    "smart_id": result.get('smart_id')
                }
                device_records.append(device_record)
            
            logger.debug(f"Retrieved {len(device_records)} device records for user {user_id}")
            return device_records
            
        except Exception as e:
            logger.debug(f"Error getting device history for {user_id}: {str(e)}")
            return []

    async def get_user_history(self, user_id: str, start_time: datetime, days: int = 30) -> List[Dict[str, Any]]:
        """Get user behavior history from Splunk logs.
        
        Args:
            user_id: User identifier
            start_time: Start time for search (for compatibility)
            days: Number of days to look back
            
        Returns:
            List of user behavior records
        """
        try:
            search_query = f"""
                search index=user_behavior user_id="{user_id}" earliest=-{days}d
                | eval timestamp=strftime(_time, "%Y-%m-%dT%H:%M:%S.%3NZ")
                | stats 
                    avg(session_duration) as avg_session_duration,
                    values(mfa_method) as mfa_methods,
                    dc(date_hour) as login_frequency,
                    values(location) as location
                by user_id
                | eval last_login=now()
                | eval typical_hours=split("9,10,11,14,15,16", ",")
                | eval typical_days=split("Monday,Tuesday,Wednesday,Thursday,Friday", ",")
                | table timestamp, login_frequency, typical_hours, typical_days, mfa_methods, last_login, avg_session_duration, location
                | rename avg_session_duration as session_duration
            """
            
            results = await self._search(search_query)
            
            # Process results
            behavior_records = []
            for result in results:
                # Parse MFA methods if they're comma-separated
                mfa_methods = result.get('mfa_methods', '')
                if isinstance(mfa_methods, str) and mfa_methods:
                    mfa_methods = [method.strip() for method in mfa_methods.split(',')]
                elif not isinstance(mfa_methods, list):
                    mfa_methods = []
                
                behavior_record = {
                    "timestamp": result.get('timestamp', datetime.now(timezone.utc).isoformat()),
                    "login_frequency": int(result.get('login_frequency', 0)),
                    "typical_hours": result.get('typical_hours', []),
                    "typical_days": result.get('typical_days', []),
                    "mfa_methods": mfa_methods,
                    "last_login": result.get('last_login', datetime.now(timezone.utc).isoformat()),
                    "session_duration": int(float(result.get('session_duration', 0))),
                    "location": result.get('location')
                }
                behavior_records.append(behavior_record)
            
            logger.debug(f"Retrieved {len(behavior_records)} behavior records for user {user_id}")
            return behavior_records
            
        except Exception as e:
            logger.debug(f"Error getting user history for {user_id}: {str(e)}")
            return []

    async def health_check(self) -> Dict[str, Any]:
        """Check the health of the Splunk connection.
        
        Returns:
            Health check results
        """
        try:
            if not self.session:
                await self.connect()
            
            if not self.session_key:
                return {
                    "status": "unhealthy",
                    "service": "Splunk Enterprise",
                    "error": "No session key available",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            
            # Simple search to test connectivity
            test_results = await self._search("| makeresults | eval test=1")
            
            if test_results:
                return {
                    "status": "healthy",
                    "service": "Splunk Enterprise",
                    "session_key_present": bool(self.session_key),
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            else:
                return {
                    "status": "unhealthy",
                    "service": "Splunk Enterprise",
                    "error": "Test search failed",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
                
        except Exception as e:
            return {
                "status": "error",
                "service": "Splunk Enterprise",
                "error": str(e),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }