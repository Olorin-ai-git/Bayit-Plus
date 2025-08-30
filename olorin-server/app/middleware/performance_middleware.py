"""
Performance Tracking Middleware for Olorin Investigation System

This middleware automatically tracks API request performance, integrates with the
performance optimization system, and provides real-time performance analytics.
"""

import logging
import time
from typing import Callable, Dict, Any, Optional
from datetime import datetime

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

logger = logging.getLogger(__name__)


class PerformanceTrackingMiddleware(BaseHTTPMiddleware):
    """
    Middleware to track API request performance and integrate with optimization system.
    
    Features:
    - Automatic request timing
    - Performance optimization system integration
    - Request/response size tracking
    - Error rate monitoring
    - Real-time performance alerts
    """
    
    def __init__(
        self,
        app,
        enable_detailed_logging: bool = False,
        enable_size_tracking: bool = True,
        alert_threshold_ms: float = 1000.0
    ):
        super().__init__(app)
        self.enable_detailed_logging = enable_detailed_logging
        self.enable_size_tracking = enable_size_tracking
        self.alert_threshold_ms = alert_threshold_ms
        
        # Request tracking
        self.active_requests: Dict[str, Dict[str, Any]] = {}
        
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Main middleware dispatch with performance tracking."""
        
        # Skip performance endpoints to avoid circular tracking
        if request.url.path.startswith("/performance"):
            return await call_next(request)
        
        # Generate request ID for tracking
        request_id = f"{id(request)}_{time.time()}"
        start_time = time.time()
        
        # Get performance manager
        perf_manager = self._get_performance_manager()
        
        # Track request start
        request_info = {
            "method": request.method,
            "path": request.url.path,
            "start_time": start_time,
            "client_host": request.client.host if request.client else "unknown",
            "user_agent": request.headers.get("user-agent", "unknown")
        }
        
        # Track request size if enabled
        if self.enable_size_tracking:
            content_length = request.headers.get("content-length")
            request_info["request_size_bytes"] = int(content_length) if content_length else 0
        
        self.active_requests[request_id] = request_info
        
        # Execute request with performance tracking
        response = None
        error_occurred = False
        
        try:
            if perf_manager:
                # Use performance manager's tracking
                async with perf_manager.track_request_performance(f"{request.method}:{request.url.path}"):
                    response = await call_next(request)
            else:
                # Direct execution without performance tracking
                response = await call_next(request)
                
        except Exception as e:
            error_occurred = True
            logger.error(f"Request error: {e}")
            
            # Return error response
            response = JSONResponse(
                status_code=500,
                content={"error": "Internal server error", "request_id": request_id}
            )
        
        finally:
            # Calculate request duration
            end_time = time.time()
            duration_ms = (end_time - start_time) * 1000
            
            # Update request info
            request_info.update({
                "end_time": end_time,
                "duration_ms": duration_ms,
                "status_code": response.status_code if response else 500,
                "error_occurred": error_occurred
            })
            
            # Track response size if enabled
            if self.enable_size_tracking and response:
                response_size = self._estimate_response_size(response)
                request_info["response_size_bytes"] = response_size
            
            # Log performance information
            await self._log_performance_info(request_info)
            
            # Check for performance alerts
            await self._check_performance_alerts(request_info, perf_manager)
            
            # Clean up request tracking
            self.active_requests.pop(request_id, None)
            
            # Add performance headers to response
            if response:
                response.headers["X-Response-Time"] = f"{duration_ms:.2f}ms"
                response.headers["X-Request-ID"] = request_id
        
        return response
    
    def _get_performance_manager(self):
        """Get performance optimization manager."""
        try:
            from ..service.performance_integration import get_performance_optimization_manager
            return get_performance_optimization_manager()
        except Exception as e:
            logger.debug(f"Performance manager not available: {e}")
            return None
    
    def _estimate_response_size(self, response: Response) -> int:
        """Estimate response size in bytes."""
        try:
            if hasattr(response, 'body') and response.body:
                return len(response.body)
            elif hasattr(response, 'content') and response.content:
                return len(response.content)
            else:
                # Estimate based on headers
                content_length = response.headers.get("content-length")
                return int(content_length) if content_length else 0
        except Exception:
            return 0
    
    async def _log_performance_info(self, request_info: Dict[str, Any]):
        """Log performance information based on configuration."""
        
        duration_ms = request_info["duration_ms"]
        status_code = request_info["status_code"]
        method = request_info["method"]
        path = request_info["path"]
        
        # Always log slow requests
        if duration_ms > self.alert_threshold_ms:
            logger.warning(
                f"Slow request: {method} {path} - "
                f"{duration_ms:.2f}ms (status: {status_code})"
            )
        
        # Log errors
        if request_info.get("error_occurred") or status_code >= 400:
            logger.error(
                f"Request error: {method} {path} - "
                f"{duration_ms:.2f}ms (status: {status_code})"
            )
        
        # Detailed logging if enabled
        if self.enable_detailed_logging:
            logger.info(
                f"Request: {method} {path} - "
                f"{duration_ms:.2f}ms (status: {status_code}) - "
                f"Client: {request_info.get('client_host', 'unknown')}"
            )
    
    async def _check_performance_alerts(
        self, 
        request_info: Dict[str, Any], 
        perf_manager: Optional[Any]
    ):
        """Check for performance alerts and notify if configured."""
        
        duration_ms = request_info["duration_ms"]
        
        # Alert on slow requests
        if duration_ms > self.alert_threshold_ms:
            alert_message = (
                f"Slow API response detected: {request_info['method']} "
                f"{request_info['path']} took {duration_ms:.2f}ms"
            )
            
            # Send alert to performance manager if available
            if perf_manager and hasattr(perf_manager, 'monitor'):
                for callback in perf_manager.monitor.alert_callbacks:
                    try:
                        await callback(alert_message, request_info)
                    except Exception as e:
                        logger.error(f"Performance alert callback error: {e}")
        
        # Alert on high error rates (simplified check)
        status_code = request_info["status_code"]
        if status_code >= 500:
            error_alert = (
                f"Server error detected: {request_info['method']} "
                f"{request_info['path']} returned {status_code}"
            )
            
            if perf_manager and hasattr(perf_manager, 'monitor'):
                for callback in perf_manager.monitor.alert_callbacks:
                    try:
                        await callback(error_alert, request_info)
                    except Exception as e:
                        logger.error(f"Error alert callback error: {e}")
    
    def get_active_requests(self) -> Dict[str, Dict[str, Any]]:
        """Get currently active requests for monitoring."""
        current_time = time.time()
        
        return {
            req_id: {
                **req_info,
                "active_duration_ms": (current_time - req_info["start_time"]) * 1000
            }
            for req_id, req_info in self.active_requests.items()
        }
    
    def get_performance_summary(self) -> Dict[str, Any]:
        """Get performance summary for active requests."""
        active_requests = self.get_active_requests()
        
        if not active_requests:
            return {
                "active_request_count": 0,
                "avg_active_duration_ms": 0,
                "max_active_duration_ms": 0,
                "slow_requests": 0
            }
        
        durations = [req["active_duration_ms"] for req in active_requests.values()]
        slow_count = sum(1 for d in durations if d > self.alert_threshold_ms)
        
        return {
            "active_request_count": len(active_requests),
            "avg_active_duration_ms": sum(durations) / len(durations),
            "max_active_duration_ms": max(durations),
            "slow_requests": slow_count,
            "requests_by_method": self._group_by_method(active_requests),
            "requests_by_path": self._group_by_path(active_requests)
        }
    
    def _group_by_method(self, requests: Dict[str, Dict[str, Any]]) -> Dict[str, int]:
        """Group active requests by HTTP method."""
        method_counts = {}
        for req_info in requests.values():
            method = req_info.get("method", "unknown")
            method_counts[method] = method_counts.get(method, 0) + 1
        return method_counts
    
    def _group_by_path(self, requests: Dict[str, Dict[str, Any]]) -> Dict[str, int]:
        """Group active requests by path."""
        path_counts = {}
        for req_info in requests.values():
            path = req_info.get("path", "unknown")
            path_counts[path] = path_counts.get(path, 0) + 1
        return path_counts


# Global middleware instance for access from routes
_performance_middleware: Optional[PerformanceTrackingMiddleware] = None


def get_performance_middleware() -> Optional[PerformanceTrackingMiddleware]:
    """Get the global performance middleware instance."""
    return _performance_middleware


def set_performance_middleware(middleware: PerformanceTrackingMiddleware):
    """Set the global performance middleware instance."""
    global _performance_middleware
    _performance_middleware = middleware