"""
Rate limiting middleware for API protection
"""

import time
from typing import Dict, Optional
from collections import defaultdict, deque
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
import asyncio


class RateLimiter:
    """Simple in-memory rate limiter using sliding window."""
    
    def __init__(self, max_requests: int = 100, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: Dict[str, deque] = defaultdict(deque)
        self._lock = asyncio.Lock()
    
    async def is_allowed(self, key: str) -> bool:
        """Check if request is allowed for given key."""
        async with self._lock:
            now = time.time()
            requests = self.requests[key]
            
            # Remove old requests outside the window
            while requests and requests[0] <= now - self.window_seconds:
                requests.popleft()
            
            # Check if we're within the limit
            if len(requests) >= self.max_requests:
                return False
            
            # Add current request
            requests.append(now)
            return True


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Rate limiting middleware."""
    
    def __init__(self, app, calls: int = 100, period: int = 60):
        super().__init__(app)
        self.limiter = RateLimiter(max_requests=calls, window_seconds=period)
    
    def get_client_ip(self, request: Request) -> str:
        """Get client IP address."""
        # Check for forwarded headers first (for proxy setups)
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        # Fall back to direct client IP
        return request.client.host if request.client else "unknown"
    
    async def dispatch(self, request: Request, call_next) -> Response:
        """Process request with rate limiting."""
        # Skip rate limiting for health checks and auth endpoints
        if request.url.path in ["/health", "/", "/docs", "/redoc", "/openapi.json"]:
            return await call_next(request)
        
        # Skip rate limiting for auth endpoints to allow login attempts
        if request.url.path.startswith("/auth/"):
            return await call_next(request)
        
        client_ip = self.get_client_ip(request)
        
        # Create a key for rate limiting (IP + endpoint for more granular control)
        rate_limit_key = f"{client_ip}:{request.method}:{request.url.path}"
        
        # Check if request is allowed
        if not await self.limiter.is_allowed(rate_limit_key):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded. Please try again later.",
                headers={
                    "Retry-After": "60",
                    "X-RateLimit-Limit": str(self.limiter.max_requests),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(int(time.time()) + self.limiter.window_seconds)
                }
            )
        
        response = await call_next(request)
        
        # Add rate limit headers to response
        remaining = max(0, self.limiter.max_requests - len(self.limiter.requests[rate_limit_key]))
        response.headers["X-RateLimit-Limit"] = str(self.limiter.max_requests)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(int(time.time()) + self.limiter.window_seconds)
        
        return response


# Different rate limit configurations for different endpoint types
class EndpointRateLimits:
    """Rate limit configurations for different endpoint types."""
    
    # Standard API endpoints
    STANDARD = {"calls": 60, "period": 60}  # 60 requests per minute
    
    # Heavy computation endpoints (like analysis)
    ANALYSIS = {"calls": 10, "period": 60}  # 10 requests per minute
    
    # Authentication endpoints
    AUTH = {"calls": 5, "period": 300}  # 5 login attempts per 5 minutes
    
    # Public/health endpoints
    PUBLIC = {"calls": 200, "period": 60}  # 200 requests per minute