"""
OPTIONS Request Handler Middleware

Handles CORS preflight OPTIONS requests by returning 200 OK
before any route validation occurs.
"""

from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware


class OptionsHandlerMiddleware(BaseHTTPMiddleware):
    """
    Middleware to handle OPTIONS requests for CORS preflight.
    
    Returns 200 OK for all OPTIONS requests, bypassing route validation
    and query parameter validation that can cause 400 errors.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Handle OPTIONS requests immediately."""

        # If this is an OPTIONS request, return 200 OK immediately
        if request.method == "OPTIONS":
            # Get the actual origin from the request
            origin = request.headers.get("origin", "*")

            return Response(
                status_code=200,
                headers={
                    "Access-Control-Allow-Origin": origin,
                    "Access-Control-Allow-Methods": "*",
                    "Access-Control-Allow-Headers": "*",
                    "Access-Control-Allow-Credentials": "true",
                    "Access-Control-Max-Age": "86400",
                    "Content-Length": "0",
                }
            )

        # For all other methods, continue with normal processing
        return await call_next(request)
