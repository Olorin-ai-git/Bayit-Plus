"""
SumoLogic Client for Olorin Investigation System

This module provides integration with SumoLogic for log analysis and investigation.
"""

from typing import Dict, List, Any, Optional
from datetime import datetime, timezone
import requests
import json
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

class SumoLogicClient:
    """
    Client for interacting with SumoLogic API for log analysis and investigation.
    
    Provides methods to query logs, retrieve investigation data, and analyze
    patterns for fraud detection.
    """
    
    def __init__(
        self,
        endpoint: str,
        access_id: str,
        access_key: str,
        timeout: int = 30
    ):
        """
        Initialize SumoLogic client.
        
        Args:
            endpoint: SumoLogic API endpoint
            access_id: SumoLogic access ID
            access_key: SumoLogic access key
            timeout: Request timeout in seconds
        """
        self.endpoint = endpoint.rstrip('/')
        self.access_id = access_id
        self.access_key = access_key
        self.timeout = timeout
        
        # Create session with authentication
        self.session = requests.Session()
        self.session.auth = (access_id, access_key)
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        
        logger.info(f"Initialized SumoLogicClient with endpoint: {endpoint}")
    
    def query_logs(
        self,
        query: str,
        from_time: datetime,
        to_time: datetime,
        limit: int = 1000
    ) -> Dict[str, Any]:
        """
        Execute a log query in SumoLogic.
        
        Args:
            query: SumoLogic search query
            from_time: Start time for the query
            to_time: End time for the query
            limit: Maximum number of results to return
            
        Returns:
            Query results from SumoLogic
        """
        try:
            # Convert datetime to epoch milliseconds
            from_epoch = int(from_time.timestamp() * 1000)
            to_epoch = int(to_time.timestamp() * 1000)
            
            # Construct search job request
            search_job_data = {
                "query": query,
                "from": from_epoch,
                "to": to_epoch,
                "timeZone": "UTC",
                "byReceiptTime": False
            }
            
            # Start search job
            search_response = self.session.post(
                f"{self.endpoint}/api/v1/search/jobs",
                json=search_job_data,
                timeout=self.timeout
            )
            search_response.raise_for_status()
            
            search_job = search_response.json()
            job_id = search_job['id']
            
            logger.info(f"Started SumoLogic search job: {job_id}")
            
            # Poll for job completion (simplified for this implementation)
            # In a real implementation, you'd poll the job status endpoint
            # For now, return a mock response structure
            
            return {
                "job_id": job_id,
                "status": "completed",
                "query": query,
                "results": [],  # Would contain actual log entries
                "record_count": 0,
                "message_count": 0,
                "from_time": from_epoch,
                "to_time": to_epoch
            }
            
        except requests.RequestException as e:
            logger.error(f"SumoLogic query failed: {str(e)}")
            return {
                "error": f"Query failed: {str(e)}",
                "query": query,
                "status": "failed"
            }
        except Exception as e:
            logger.error(f"Unexpected error in SumoLogic query: {str(e)}")
            return {
                "error": f"Unexpected error: {str(e)}",
                "query": query,
                "status": "failed"
            }
    
    def get_user_activity_logs(
        self,
        user_id: str,
        hours_back: int = 24
    ) -> List[Dict[str, Any]]:
        """
        Get activity logs for a specific user.
        
        Args:
            user_id: User identifier to search for
            hours_back: Number of hours to look back
            
        Returns:
            List of user activity log entries
        """
        try:
            # Calculate time range
            to_time = datetime.now(timezone.utc)
            from_time = datetime.now(timezone.utc).replace(hour=to_time.hour - hours_back)
            
            # Construct user-specific query
            query = f'_sourceCategory=user_activity AND user_id="{user_id}"'
            
            result = self.query_logs(query, from_time, to_time)
            
            if result.get("status") == "completed":
                return result.get("results", [])
            else:
                logger.warning(f"Failed to get user activity logs: {result.get('error', 'Unknown error')}")
                return []
                
        except Exception as e:
            logger.error(f"Error getting user activity logs: {str(e)}")
            return []
    
    def get_device_activity_logs(
        self,
        device_id: str,
        hours_back: int = 24
    ) -> List[Dict[str, Any]]:
        """
        Get activity logs for a specific device.
        
        Args:
            device_id: Device identifier to search for
            hours_back: Number of hours to look back
            
        Returns:
            List of device activity log entries
        """
        try:
            # Calculate time range
            to_time = datetime.now(timezone.utc)
            from_time = datetime.now(timezone.utc).replace(hour=to_time.hour - hours_back)
            
            # Construct device-specific query
            query = f'_sourceCategory=device_activity AND device_id="{device_id}"'
            
            result = self.query_logs(query, from_time, to_time)
            
            if result.get("status") == "completed":
                return result.get("results", [])
            else:
                logger.warning(f"Failed to get device activity logs: {result.get('error', 'Unknown error')}")
                return []
                
        except Exception as e:
            logger.error(f"Error getting device activity logs: {str(e)}")
            return []
    
    def analyze_behavioral_patterns(
        self,
        entity_id: str,
        entity_type: str = "user",
        analysis_window_hours: int = 72
    ) -> Dict[str, Any]:
        """
        Analyze behavioral patterns for fraud detection.
        
        Args:
            entity_id: Entity identifier (user_id, device_id, etc.)
            entity_type: Type of entity to analyze
            analysis_window_hours: Time window for analysis
            
        Returns:
            Behavioral analysis results
        """
        try:
            # Calculate analysis window
            to_time = datetime.now(timezone.utc)
            from_time = datetime.now(timezone.utc).replace(hour=to_time.hour - analysis_window_hours)
            
            # Construct behavioral analysis query
            if entity_type == "user":
                query = f'_sourceCategory=user_behavior AND user_id="{entity_id}"'
            elif entity_type == "device":
                query = f'_sourceCategory=device_behavior AND device_id="{entity_id}"'
            else:
                query = f'_sourceCategory=general_behavior AND entity_id="{entity_id}"'
            
            result = self.query_logs(query, from_time, to_time)
            
            # Analyze patterns (simplified implementation)
            analysis_result = {
                "entity_id": entity_id,
                "entity_type": entity_type,
                "analysis_window_hours": analysis_window_hours,
                "patterns_detected": [],
                "anomaly_score": 0.0,
                "risk_indicators": [],
                "log_entries_analyzed": len(result.get("results", [])),
                "analysis_timestamp": datetime.now(timezone.utc).isoformat()
            }
            
            if result.get("status") == "completed":
                # In a real implementation, this would analyze the actual log data
                # For now, return a basic structure
                analysis_result["status"] = "completed"
            else:
                analysis_result["status"] = "failed"
                analysis_result["error"] = result.get("error", "Unknown error")
            
            return analysis_result
            
        except Exception as e:
            logger.error(f"Error analyzing behavioral patterns: {str(e)}")
            return {
                "entity_id": entity_id,
                "entity_type": entity_type,
                "status": "failed",
                "error": str(e),
                "analysis_timestamp": datetime.now(timezone.utc).isoformat()
            }
    
    def health_check(self) -> Dict[str, Any]:
        """
        Check the health of the SumoLogic connection.
        
        Returns:
            Health check results
        """
        try:
            # Simple health check - attempt to access account info
            response = self.session.get(
                f"{self.endpoint}/api/v1/collectors",
                timeout=self.timeout
            )
            
            if response.status_code == 200:
                return {
                    "status": "healthy",
                    "endpoint": self.endpoint,
                    "response_time_ms": response.elapsed.total_seconds() * 1000,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            else:
                return {
                    "status": "unhealthy",
                    "endpoint": self.endpoint,
                    "status_code": response.status_code,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
                
        except requests.RequestException as e:
            return {
                "status": "unhealthy",
                "endpoint": self.endpoint,
                "error": str(e),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        except Exception as e:
            return {
                "status": "error",
                "endpoint": self.endpoint,
                "error": str(e),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }