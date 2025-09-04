"""
Production Error Response Sanitization Middleware

This middleware provides production-grade error handling by sanitizing error responses
to prevent information disclosure while maintaining proper logging for debugging.
"""

import logging
from app.service.logging import get_bridge_logger
import traceback
from typing import Dict, Any, Optional
from fastapi import Request, Response, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import os

logger = get_bridge_logger(__name__)

class ProductionErrorMiddleware(BaseHTTPMiddleware):
    """
    Middleware that sanitizes error responses for production environments.
    
    In production:
    - Hides internal error details from users
    - Logs full error information server-side
    - Returns generic error messages for security
    
    In development:
    - Passes through detailed error information
    - Maintains debugging capabilities
    """
    
    def __init__(self, app, environment: str = None):
        super().__init__(app)
        self.environment = environment or os.getenv("APP_ENV", "local")
        self.is_production = self.environment in ["prd", "production", "prod"]
        
    async def dispatch(self, request: Request, call_next):
        """Process request and sanitize error responses."""
        try:
            response = await call_next(request)
            return response
            
        except HTTPException as e:
            # Handle FastAPI HTTPExceptions
            return await self._handle_http_exception(request, e)
            
        except Exception as e:
            # Handle unexpected exceptions
            return await self._handle_generic_exception(request, e)
    
    async def _handle_http_exception(self, request: Request, exc: HTTPException) -> JSONResponse:
        """Handle FastAPI HTTP exceptions with sanitization."""
        
        # Log full exception details server-side
        logger.error(
            f"HTTP Exception: {exc.status_code} - {exc.detail}",
            extra={
                "path": str(request.url),
                "method": request.method,
                "status_code": exc.status_code,
                "client_ip": request.client.host if request.client else "unknown",
                "user_agent": request.headers.get("user-agent", "unknown")
            }
        )
        
        if self.is_production:
            # Sanitize error response for production
            sanitized_detail = self._sanitize_error_message(exc.detail, exc.status_code)
            return JSONResponse(
                status_code=exc.status_code,
                content={
                    "error": sanitized_detail,
                    "status_code": exc.status_code,
                    "path": str(request.url.path)
                }
            )
        else:
            # Return original error in development
            return JSONResponse(
                status_code=exc.status_code,
                content={
                    "error": exc.detail,
                    "status_code": exc.status_code,
                    "path": str(request.url.path)
                }
            )
    
    async def _handle_generic_exception(self, request: Request, exc: Exception) -> JSONResponse:
        """Handle unexpected exceptions with sanitization."""
        
        # Log full exception details server-side
        logger.error(
            f"Unhandled Exception: {type(exc).__name__}: {str(exc)}",
            extra={
                "path": str(request.url),
                "method": request.method,
                "client_ip": request.client.host if request.client else "unknown",
                "user_agent": request.headers.get("user-agent", "unknown"),
                "traceback": traceback.format_exc()
            }
        )
        
        if self.is_production:
            # Return generic error message in production
            return JSONResponse(
                status_code=500,
                content={
                    "error": "Internal server error. Please try again later.",
                    "status_code": 500,
                    "path": str(request.url.path)
                }
            )
        else:
            # Return detailed error in development
            return JSONResponse(
                status_code=500,
                content={
                    "error": f"{type(exc).__name__}: {str(exc)}",
                    "status_code": 500,
                    "path": str(request.url.path),
                    "traceback": traceback.format_exc().split('\n') if logger.isEnabledFor(logging.DEBUG) else None
                }
            )
    
    def _sanitize_error_message(self, detail: Any, status_code: int) -> str:
        """Sanitize error messages for production environments."""
        
        # Convert detail to string if it's not already
        if not isinstance(detail, str):
            detail = str(detail)
        
        # Generic error messages by status code
        generic_messages = {
            400: "Bad request. Please check your input and try again.",
            401: "Authentication required. Please log in and try again.", 
            403: "Access denied. You don't have permission to access this resource.",
            404: "The requested resource was not found.",
            405: "Method not allowed for this endpoint.",
            422: "Invalid input data. Please check your request format.",
            429: "Too many requests. Please try again later.",
            500: "Internal server error. Please try again later.",
            502: "Service temporarily unavailable. Please try again later.",
            503: "Service temporarily unavailable. Please try again later.",
        }
        
        # Use generic message if available
        if status_code in generic_messages:
            return generic_messages[status_code]
        
        # For other status codes, check if the detail contains sensitive information
        sensitive_keywords = [
            "database", "sql", "connection", "password", "token", "secret",
            "key", "traceback", "stack", "file", "path", "config", 
            "internal", "server", "host", "port", "admin", "root"
        ]
        
        detail_lower = detail.lower()
        if any(keyword in detail_lower for keyword in sensitive_keywords):
            # Return generic message if sensitive information detected
            return "An error occurred. Please contact support if the problem persists."
        
        # Return sanitized version of the original message
        return self._sanitize_text(detail)
    
    def _sanitize_text(self, text: str) -> str:
        """Remove potentially sensitive information from error text."""
        
        # Remove file paths
        import re
        text = re.sub(r'["\']?/[/\w\.-]+["\']?', '[REDACTED_PATH]', text)
        text = re.sub(r'["\']?[A-Z]:\\[\\w\.-]+["\']?', '[REDACTED_PATH]', text)
        
        # Remove what looks like connection strings
        text = re.sub(r'[a-zA-Z]+://[^\s]+', '[REDACTED_CONNECTION]', text)
        
        # Remove potential tokens/keys (long alphanumeric strings)
        text = re.sub(r'\b[A-Za-z0-9]{20,}\b', '[REDACTED_TOKEN]', text)
        
        # Remove IP addresses
        text = re.sub(r'\b(?:\d{1,3}\.){3}\d{1,3}\b', '[REDACTED_IP]', text)
        
        return text