"""
Enhanced Security Middleware for Olorin API
Implements comprehensive security controls including rate limiting,
input validation, and threat detection.

Author: Claude Security Specialist
Date: 2025-08-29
"""

import hashlib
import json
import logging
import re
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Set

import redis
from fastapi import FastAPI, HTTPException, Request, Response, status
from fastapi.middleware.base import BaseHTTPMiddleware
from pydantic import BaseModel
from starlette.responses import JSONResponse

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class SecurityConfig(BaseModel):
    """Security middleware configuration."""

    # Rate limiting
    rate_limit_requests: int = 100
    rate_limit_window: int = 60  # seconds
    rate_limit_burst: int = 20

    # Request validation
    max_request_size: int = 10 * 1024 * 1024  # 10MB
    max_header_size: int = 8192  # 8KB
    max_url_length: int = 2048

    # Security scanning
    enable_threat_detection: bool = True
    enable_input_validation: bool = True
    enable_sql_injection_detection: bool = True
    enable_xss_detection: bool = True

    # IP blocking
    auto_block_suspicious_ips: bool = True
    block_duration_minutes: int = 60
    max_violations_per_hour: int = 10

    # Logging
    log_security_events: bool = True
    log_all_requests: bool = False


class ThreatDetector:
    """Advanced threat detection patterns."""

    def __init__(self):
        # SQL Injection patterns
        self.sql_injection_patterns = [
            r"(?i)\b(union\s+select|select\s+.*\s+from|insert\s+into|delete\s+from)",
            r"(?i)\b(drop\s+table|alter\s+table|create\s+table)",
            r"(?i)(';\s*--|--|\*|/\*.*\*/)",
            r"(?i)\b(or\s+1\s*=\s*1|and\s+1\s*=\s*1)",
            r"(?i)\b(exec\s*\(|execute\s*\(|sp_executesql)",
            r"(?i)\b(xp_cmdshell|sp_oacreate|sp_oamethod)",
        ]

        # XSS patterns
        self.xss_patterns = [
            r"(?i)<script[^>]*>.*?</script>",
            r"(?i)<iframe[^>]*>.*?</iframe>",
            r"(?i)javascript:[^\"']*",
            r"(?i)on\w+\s*=\s*[\"'][^\"']*[\"']",
            r"(?i)<img[^>]*src\s*=\s*[\"']javascript:",
            r"(?i)<svg[^>]*onload\s*=",
            r"(?i)vbscript:[^\"']*",
        ]

        # Path traversal patterns
        self.path_traversal_patterns = [
            r"\.\.[\\/]",
            r"[\\/]\.\.[\\/]",
            r"%2e%2e%2f",
            r"%2e%2e/",
            r"..%2f",
            r"%2e%2e%5c",
        ]

        # Command injection patterns
        self.command_injection_patterns = [
            r"(?i);\s*(cat|ls|pwd|id|whoami|uname)",
            r"(?i)\|\s*(cat|ls|pwd|id|whoami|uname)",
            r"(?i)`[^`]*`",
            r"(?i)\$\([^)]*\)",
            r"(?i)&&\s*(cat|ls|pwd|rm|mkdir)",
        ]

        # Suspicious user agents
        self.suspicious_user_agents = [
            r"(?i)(sqlmap|nmap|nikto|burpsuite|dirb|gobuster)",
            r"(?i)(python-requests|curl|wget|libwww)",
            r"(?i)(masscan|zmap|ncrack|hydra)",
            r"(?i)bot\b.*crawl",
            r"scanner",
        ]

    def detect_threats(
        self, request_data: str, headers: Dict[str, str]
    ) -> List[Dict[str, Any]]:
        """Detect security threats in request data and headers."""
        threats = []

        # Check for SQL injection
        for pattern in self.sql_injection_patterns:
            if re.search(pattern, request_data):
                threats.append(
                    {
                        "type": "sql_injection",
                        "pattern": pattern,
                        "severity": "high",
                        "description": "Potential SQL injection attempt detected",
                    }
                )

        # Check for XSS
        for pattern in self.xss_patterns:
            if re.search(pattern, request_data):
                threats.append(
                    {
                        "type": "xss",
                        "pattern": pattern,
                        "severity": "medium",
                        "description": "Potential XSS attempt detected",
                    }
                )

        # Check for path traversal
        for pattern in self.path_traversal_patterns:
            if re.search(pattern, request_data):
                threats.append(
                    {
                        "type": "path_traversal",
                        "pattern": pattern,
                        "severity": "high",
                        "description": "Potential path traversal attempt detected",
                    }
                )

        # Check for command injection
        for pattern in self.command_injection_patterns:
            if re.search(pattern, request_data):
                threats.append(
                    {
                        "type": "command_injection",
                        "pattern": pattern,
                        "severity": "critical",
                        "description": "Potential command injection attempt detected",
                    }
                )

        # Check user agent
        user_agent = headers.get("user-agent", "")
        for pattern in self.suspicious_user_agents:
            if re.search(pattern, user_agent):
                threats.append(
                    {
                        "type": "suspicious_user_agent",
                        "pattern": pattern,
                        "severity": "medium",
                        "description": "Suspicious user agent detected",
                    }
                )

        return threats


class RateLimiter:
    """Advanced rate limiting with multiple algorithms."""

    def __init__(self, redis_client: Optional[redis.Redis] = None):
        self.redis_client = redis_client
        self.memory_store = defaultdict(deque)
        self.blocked_ips = {}

    def is_rate_limited(
        self,
        identifier: str,
        limit: int,
        window: int,
        burst_limit: Optional[int] = None,
    ) -> tuple[bool, Dict[str, Any]]:
        """Check if request should be rate limited."""
        current_time = time.time()

        if self.redis_client:
            return self._redis_rate_limit(identifier, limit, window, current_time)
        else:
            return self._memory_rate_limit(
                identifier, limit, window, current_time, burst_limit
            )

    def _redis_rate_limit(
        self, identifier: str, limit: int, window: int, current_time: float
    ) -> tuple[bool, Dict[str, Any]]:
        """Redis-based sliding window rate limiting."""
        key = f"rate_limit:{identifier}"
        pipe = self.redis_client.pipeline()

        # Remove expired entries
        pipe.zremrangebyscore(key, 0, current_time - window)

        # Count current requests
        pipe.zcard(key)

        # Add current request
        pipe.zadd(key, {str(current_time): current_time})

        # Set expiration
        pipe.expire(key, window)

        results = pipe.execute()
        current_requests = results[1]

        info = {
            "current_requests": current_requests,
            "limit": limit,
            "window": window,
            "reset_time": int(current_time + window),
        }

        return current_requests >= limit, info

    def _memory_rate_limit(
        self,
        identifier: str,
        limit: int,
        window: int,
        current_time: float,
        burst_limit: Optional[int] = None,
    ) -> tuple[bool, Dict[str, Any]]:
        """Memory-based sliding window rate limiting."""
        requests = self.memory_store[identifier]

        # Remove expired requests
        while requests and requests[0] < current_time - window:
            requests.popleft()

        # Check burst limit first
        if burst_limit and len(requests) >= burst_limit:
            return True, {
                "current_requests": len(requests),
                "limit": burst_limit,
                "window": window,
                "reset_time": int(current_time + window),
                "type": "burst",
            }

        # Check normal limit
        if len(requests) >= limit:
            return True, {
                "current_requests": len(requests),
                "limit": limit,
                "window": window,
                "reset_time": int(current_time + window),
                "type": "normal",
            }

        # Add current request
        requests.append(current_time)

        return False, {
            "current_requests": len(requests),
            "limit": limit,
            "window": window,
            "reset_time": int(current_time + window),
        }

    def block_ip(self, ip: str, duration_minutes: int):
        """Block an IP address temporarily."""
        block_until = time.time() + (duration_minutes * 60)
        self.blocked_ips[ip] = block_until

        if self.redis_client:
            key = f"blocked_ip:{ip}"
            self.redis_client.setex(key, duration_minutes * 60, str(block_until))

    def is_ip_blocked(self, ip: str) -> bool:
        """Check if IP address is currently blocked."""
        current_time = time.time()

        # Check memory store
        if ip in self.blocked_ips:
            if self.blocked_ips[ip] > current_time:
                return True
            else:
                del self.blocked_ips[ip]

        # Check Redis
        if self.redis_client:
            key = f"blocked_ip:{ip}"
            blocked_until = self.redis_client.get(key)
            if blocked_until and float(blocked_until) > current_time:
                return True

        return False


class SecurityEventLogger:
    """Enhanced security event logging."""

    def __init__(self, redis_client: Optional[redis.Redis] = None):
        self.redis_client = redis_client

    def log_security_event(
        self,
        event_type: str,
        request: Request,
        details: Dict[str, Any],
        severity: str = "medium",
    ):
        """Log security event with structured data."""
        event = {
            "timestamp": datetime.utcnow().isoformat(),
            "event_type": event_type,
            "severity": severity,
            "ip": request.client.host,
            "user_agent": request.headers.get("user-agent", ""),
            "method": request.method,
            "url": str(request.url),
            "path": request.url.path,
            "query_params": dict(request.query_params),
            "headers": dict(request.headers),
            "details": details,
        }

        # Log to application logger
        logger.warning(
            f"SECURITY_EVENT: {json.dumps(event)}", extra={"security_event": True}
        )

        # Store in Redis for analysis
        if self.redis_client:
            event_key = f"security_event:{datetime.utcnow().strftime('%Y%m%d_%H')}:{time.time()}"
            self.redis_client.setex(
                event_key, 86400, json.dumps(event)
            )  # 24 hour retention


class EnhancedSecurityMiddleware(BaseHTTPMiddleware):
    """Comprehensive security middleware."""

    def __init__(
        self,
        app: FastAPI,
        config: SecurityConfig = None,
        redis_client: Optional[redis.Redis] = None,
    ):
        super().__init__(app)
        self.config = config or SecurityConfig()
        self.threat_detector = ThreatDetector()
        self.rate_limiter = RateLimiter(redis_client)
        self.security_logger = SecurityEventLogger(redis_client)

        # Track violation patterns
        self.violation_tracker = defaultdict(list)

    async def dispatch(self, request: Request, call_next) -> Response:
        """Main security middleware dispatch."""
        start_time = time.time()

        try:
            # Get client IP
            client_ip = self._get_client_ip(request)

            # Check if IP is blocked
            if self.rate_limiter.is_ip_blocked(client_ip):
                return JSONResponse(
                    status_code=429,
                    content={
                        "error": "IP temporarily blocked due to suspicious activity"
                    },
                    headers={"Retry-After": "3600"},
                )

            # Rate limiting
            rate_limited, rate_info = self.rate_limiter.is_rate_limited(
                client_ip,
                self.config.rate_limit_requests,
                self.config.rate_limit_window,
                self.config.rate_limit_burst,
            )

            if rate_limited:
                self._handle_rate_limit_violation(request, client_ip, rate_info)
                return JSONResponse(
                    status_code=429,
                    content={"error": "Rate limit exceeded", "details": rate_info},
                    headers={
                        "Retry-After": str(rate_info["reset_time"] - int(time.time())),
                        "X-RateLimit-Limit": str(rate_info["limit"]),
                        "X-RateLimit-Remaining": str(
                            max(0, rate_info["limit"] - rate_info["current_requests"])
                        ),
                        "X-RateLimit-Reset": str(rate_info["reset_time"]),
                    },
                )

            # Request validation
            validation_result = await self._validate_request(request)
            if validation_result:
                self._handle_validation_violation(request, client_ip, validation_result)
                return JSONResponse(
                    status_code=400,
                    content={"error": "Invalid request", "details": validation_result},
                )

            # Threat detection
            if self.config.enable_threat_detection:
                threats = await self._detect_threats(request)
                if threats:
                    self._handle_threat_detection(request, client_ip, threats)

                    # Block critical threats immediately
                    critical_threats = [
                        t for t in threats if t["severity"] == "critical"
                    ]
                    if critical_threats:
                        self.rate_limiter.block_ip(
                            client_ip, self.config.block_duration_minutes
                        )
                        return JSONResponse(
                            status_code=403,
                            content={
                                "error": "Request blocked due to security violation"
                            },
                        )

            # Process request
            response = await call_next(request)

            # Add security headers
            self._add_security_headers(response)

            # Log successful request if enabled
            if self.config.log_all_requests:
                self._log_request(request, response, time.time() - start_time)

            return response

        except Exception as e:
            logger.error(f"Security middleware error: {e}")

            # Log security middleware failure
            self.security_logger.log_security_event(
                "MIDDLEWARE_ERROR", request, {"error": str(e)}, "high"
            )

            # Return generic error to avoid information disclosure
            return JSONResponse(
                status_code=500, content={"error": "Internal server error"}
            )

    def _get_client_ip(self, request: Request) -> str:
        """Get client IP address considering proxies."""
        # Check for forwarded headers
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()

        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip

        return request.client.host

    async def _validate_request(self, request: Request) -> Optional[Dict[str, Any]]:
        """Validate request structure and size."""
        errors = []

        # Check URL length
        if len(str(request.url)) > self.config.max_url_length:
            errors.append(
                f"URL too long: {len(str(request.url))} > {self.config.max_url_length}"
            )

        # Check header size
        total_header_size = sum(len(k) + len(v) for k, v in request.headers.items())
        if total_header_size > self.config.max_header_size:
            errors.append(
                f"Headers too large: {total_header_size} > {self.config.max_header_size}"
            )

        # Check content length if present
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > self.config.max_request_size:
            errors.append(
                f"Request body too large: {content_length} > {self.config.max_request_size}"
            )

        # Validate content type for POST/PUT requests
        if request.method in ["POST", "PUT", "PATCH"]:
            content_type = request.headers.get("content-type", "")
            if content_type and not self._is_allowed_content_type(content_type):
                errors.append(f"Disallowed content type: {content_type}")

        return {"validation_errors": errors} if errors else None

    def _is_allowed_content_type(self, content_type: str) -> bool:
        """Check if content type is allowed."""
        allowed_types = [
            "application/json",
            "application/x-www-form-urlencoded",
            "multipart/form-data",
            "text/plain",
        ]

        return any(content_type.startswith(allowed) for allowed in allowed_types)

    async def _detect_threats(self, request: Request) -> List[Dict[str, Any]]:
        """Detect security threats in request."""
        # Collect request data for analysis
        request_data_parts = [
            str(request.url),
            str(request.query_params),
            str(dict(request.headers)),
        ]

        # Include body data if present and reasonable size
        if request.method in ["POST", "PUT", "PATCH"]:
            try:
                body = await request.body()
                if len(body) < 10000:  # Only analyze small bodies
                    request_data_parts.append(body.decode("utf-8", errors="ignore"))
            except Exception:
                pass

        request_data = " ".join(request_data_parts)
        return self.threat_detector.detect_threats(request_data, dict(request.headers))

    def _handle_rate_limit_violation(
        self, request: Request, client_ip: str, rate_info: Dict[str, Any]
    ):
        """Handle rate limit violations."""
        self.security_logger.log_security_event(
            "RATE_LIMIT_EXCEEDED", request, rate_info, "medium"
        )

        # Track violations for automatic blocking
        if self.config.auto_block_suspicious_ips:
            self._track_violation(client_ip, "rate_limit")

    def _handle_validation_violation(
        self, request: Request, client_ip: str, validation_result: Dict[str, Any]
    ):
        """Handle request validation violations."""
        self.security_logger.log_security_event(
            "REQUEST_VALIDATION_FAILED", request, validation_result, "medium"
        )

        self._track_violation(client_ip, "validation")

    def _handle_threat_detection(
        self, request: Request, client_ip: str, threats: List[Dict[str, Any]]
    ):
        """Handle detected security threats."""
        for threat in threats:
            self.security_logger.log_security_event(
                "THREAT_DETECTED", request, threat, threat["severity"]
            )

            self._track_violation(client_ip, threat["type"])

    def _track_violation(self, client_ip: str, violation_type: str):
        """Track violations for automatic IP blocking."""
        current_time = time.time()
        one_hour_ago = current_time - 3600

        # Clean old violations
        self.violation_tracker[client_ip] = [
            (timestamp, vtype)
            for timestamp, vtype in self.violation_tracker[client_ip]
            if timestamp > one_hour_ago
        ]

        # Add current violation
        self.violation_tracker[client_ip].append((current_time, violation_type))

        # Check if IP should be blocked
        if (
            len(self.violation_tracker[client_ip])
            >= self.config.max_violations_per_hour
        ):
            logger.warning(
                f"Auto-blocking IP {client_ip} due to {len(self.violation_tracker[client_ip])} violations"
            )
            self.rate_limiter.block_ip(client_ip, self.config.block_duration_minutes)

    def _add_security_headers(self, response: Response):
        """Add security headers to response."""
        security_headers = {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block",
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
            "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'",
        }

        for header, value in security_headers.items():
            response.headers[header] = value

    def _log_request(self, request: Request, response: Response, duration: float):
        """Log request details for monitoring."""
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "ip": self._get_client_ip(request),
            "method": request.method,
            "url": str(request.url),
            "status_code": response.status_code,
            "duration": duration,
            "user_agent": request.headers.get("user-agent", ""),
            "referer": request.headers.get("referer", ""),
        }

        logger.info(f"REQUEST_LOG: {json.dumps(log_data)}")


def setup_enhanced_security_middleware(
    app: FastAPI, config: SecurityConfig = None, redis_url: Optional[str] = None
) -> EnhancedSecurityMiddleware:
    """Setup enhanced security middleware with optional Redis backend."""

    # Initialize Redis client if URL provided
    redis_client = None
    if redis_url:
        try:
            redis_client = redis.from_url(
                redis_url, decode_responses=True, socket_connect_timeout=5
            )
            redis_client.ping()  # Test connection
            logger.info("Redis connected for security middleware")
        except Exception as e:
            logger.warning(
                f"Redis connection failed: {e}. Using memory-based security."
            )

    # Create and add middleware
    security_config = config or SecurityConfig()
    middleware = EnhancedSecurityMiddleware(app, security_config, redis_client)
    app.add_middleware(
        EnhancedSecurityMiddleware, config=security_config, redis_client=redis_client
    )

    return middleware
