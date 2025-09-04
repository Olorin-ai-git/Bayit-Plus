"""API tools for LangGraph agents to interact with HTTP APIs and web services."""

import json
from typing import Any, Dict, List, Optional, Union
from urllib.parse import urljoin, urlparse

import requests
from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class _HTTPRequestArgs(BaseModel):
    """Arguments for the HTTP request tool."""

    url: str = Field(..., description="URL to make the request to")
    method: str = Field(
        default="GET", description="HTTP method (GET, POST, PUT, DELETE, PATCH, etc.)"
    )
    headers: Optional[Dict[str, str]] = Field(
        default=None, description="HTTP headers to include in the request"
    )
    params: Optional[Dict[str, Any]] = Field(
        default=None, description="URL parameters to include in the request"
    )
    data: Optional[Union[Dict[str, Any], str]] = Field(
        default=None,
        description="Data to send in the request body (for POST, PUT, etc.)",
    )
    json_data: Optional[Dict[str, Any]] = Field(
        default=None, description="JSON data to send in the request body"
    )
    timeout: int = Field(default=30, description="Request timeout in seconds")
    follow_redirects: bool = Field(
        default=True, description="Whether to follow HTTP redirects"
    )


class HTTPRequestTool(BaseTool):
    """
    LangChain tool for making HTTP requests to APIs and web services.

    Supports all HTTP methods and provides comprehensive response handling.
    """

    name: str = "http_request"
    description: str = (
        "Make HTTP requests to APIs and web services. "
        "Supports GET, POST, PUT, DELETE and other HTTP methods. "
        "Can send JSON data, form data, and custom headers. "
        "Returns response status, headers, and content."
    )
    args_schema: type[BaseModel] = _HTTPRequestArgs

    def __init__(
        self,
        user_agent: Optional[str] = None,
        default_headers: Optional[Dict[str, str]] = None,
        **kwargs,
    ):
        """Initialize with optional user agent and default headers."""
        super().__init__(**kwargs)
        self._user_agent = user_agent or "LangGraph Agent/1.0"
        self._default_headers = default_headers or {}
        self._session = requests.Session()

    def _prepare_headers(
        self, custom_headers: Optional[Dict[str, str]] = None
    ) -> Dict[str, str]:
        """Prepare headers for the request."""
        headers = {"User-Agent": self._user_agent, **self._default_headers}

        if custom_headers:
            headers.update(custom_headers)

        return headers

    def _run(
        self,
        url: str,
        method: str = "GET",
        headers: Optional[Dict[str, str]] = None,
        params: Optional[Dict[str, Any]] = None,
        data: Optional[Union[Dict[str, Any], str]] = None,
        json_data: Optional[Dict[str, Any]] = None,
        timeout: int = 30,
        follow_redirects: bool = True,
    ) -> Dict[str, Any]:
        """Make the HTTP request."""
        try:
            # Validate URL
            parsed_url = urlparse(url)
            if not parsed_url.scheme or not parsed_url.netloc:
                return {"success": False, "error": "Invalid URL format", "url": url}

            # Prepare headers
            request_headers = self._prepare_headers(headers)

            # Prepare request arguments
            request_kwargs = {
                "method": method.upper(),
                "url": url,
                "headers": request_headers,
                "timeout": timeout,
                "allow_redirects": follow_redirects,
            }

            # Add parameters if provided
            if params:
                request_kwargs["params"] = params

            # Add data if provided
            if json_data:
                request_kwargs["json"] = json_data
                if "Content-Type" not in request_headers:
                    request_headers["Content-Type"] = "application/json"
            elif data:
                if isinstance(data, dict):
                    request_kwargs["data"] = data
                else:
                    request_kwargs["data"] = data

            # Make the request
            response = self._session.request(**request_kwargs)

            # Parse response content
            content = None
            content_type = response.headers.get("content-type", "").lower()

            try:
                if "application/json" in content_type:
                    content = response.json()
                else:
                    content = response.text
            except (json.JSONDecodeError, UnicodeDecodeError):
                content = response.text if response.text else None

            return {
                "success": True,
                "status_code": response.status_code,
                "status_text": response.reason,
                "url": response.url,
                "headers": dict(response.headers),
                "content": content,
                "content_type": content_type,
                "content_length": len(response.content),
                "elapsed_seconds": response.elapsed.total_seconds(),
                "request": {
                    "method": method.upper(),
                    "url": url,
                    "headers": request_headers,
                    "params": params,
                    "has_data": bool(data or json_data),
                },
            }

        except requests.exceptions.Timeout:
            return {
                "success": False,
                "error": f"Request timeout after {timeout} seconds",
                "url": url,
                "timeout": timeout,
            }
        except requests.exceptions.ConnectionError as e:
            return {
                "success": False,
                "error": f"Connection error: {str(e)}",
                "url": url,
            }
        except requests.exceptions.RequestException as e:
            return {"success": False, "error": f"Request error: {str(e)}", "url": url}
        except Exception as e:
            logger.error(f"HTTP request error: {e}")
            return {"success": False, "error": str(e), "url": url}

    async def _arun(
        self,
        url: str,
        method: str = "GET",
        headers: Optional[Dict[str, str]] = None,
        params: Optional[Dict[str, Any]] = None,
        data: Optional[Union[Dict[str, Any], str]] = None,
        json_data: Optional[Dict[str, Any]] = None,
        timeout: int = 30,
        follow_redirects: bool = True,
    ) -> Dict[str, Any]:
        """Async version of HTTP request."""
        return self._run(
            url, method, headers, params, data, json_data, timeout, follow_redirects
        )


class _JSONAPIArgs(BaseModel):
    """Arguments for the JSON API tool."""

    url: str = Field(..., description="API endpoint URL")
    method: str = Field(
        default="GET", description="HTTP method (GET, POST, PUT, DELETE, PATCH)"
    )
    data: Optional[Dict[str, Any]] = Field(
        default=None, description="JSON data to send in the request body"
    )
    params: Optional[Dict[str, str]] = Field(
        default=None, description="URL parameters to include"
    )
    auth_token: Optional[str] = Field(
        default=None, description="Bearer token for authentication"
    )
    api_key: Optional[str] = Field(
        default=None, description="API key for authentication"
    )
    api_key_header: str = Field(
        default="X-API-Key", description="Header name for API key authentication"
    )
    timeout: int = Field(default=30, description="Request timeout in seconds")


class JSONAPITool(BaseTool):
    """
    LangChain tool for interacting with JSON-based REST APIs.

    Provides higher-level abstractions for common API patterns.
    """

    name: str = "json_api"
    description: str = (
        "Interact with JSON-based REST APIs. "
        "Supports common authentication methods (Bearer tokens, API keys). "
        "Automatically handles JSON serialization and parsing. "
        "Ideal for working with modern web APIs."
    )
    args_schema: type[BaseModel] = _JSONAPIArgs

    def __init__(self, default_headers: Optional[Dict[str, str]] = None, **kwargs):
        """Initialize with optional default headers."""
        super().__init__(**kwargs)
        self._default_headers = default_headers or {}
        self._session = requests.Session()

    def _prepare_headers(
        self,
        auth_token: Optional[str] = None,
        api_key: Optional[str] = None,
        api_key_header: str = "X-API-Key",
    ) -> Dict[str, str]:
        """Prepare headers including authentication."""
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            **self._default_headers,
        }

        # Add authentication
        if auth_token:
            headers["Authorization"] = f"Bearer {auth_token}"
        elif api_key:
            headers[api_key_header] = api_key

        return headers

    def _run(
        self,
        url: str,
        method: str = "GET",
        data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, str]] = None,
        auth_token: Optional[str] = None,
        api_key: Optional[str] = None,
        api_key_header: str = "X-API-Key",
        timeout: int = 30,
    ) -> Dict[str, Any]:
        """Make the JSON API request."""
        try:
            # Validate URL
            parsed_url = urlparse(url)
            if not parsed_url.scheme or not parsed_url.netloc:
                return {"success": False, "error": "Invalid URL format", "url": url}

            # Prepare headers
            headers = self._prepare_headers(auth_token, api_key, api_key_header)

            # Prepare request arguments
            request_kwargs = {
                "method": method.upper(),
                "url": url,
                "headers": headers,
                "timeout": timeout,
            }

            # Add parameters
            if params:
                request_kwargs["params"] = params

            # Add JSON data for non-GET requests
            if data and method.upper() != "GET":
                request_kwargs["json"] = data

            # Make the request
            response = self._session.request(**request_kwargs)

            # Parse JSON response
            try:
                response_data = response.json() if response.content else None
            except json.JSONDecodeError:
                response_data = {
                    "raw_content": response.text,
                    "note": "Response was not valid JSON",
                }

            # Check if request was successful
            is_success = 200 <= response.status_code < 300

            result = {
                "success": is_success,
                "status_code": response.status_code,
                "status_text": response.reason,
                "url": response.url,
                "data": response_data,
                "headers": dict(response.headers),
                "elapsed_seconds": response.elapsed.total_seconds(),
                "request": {
                    "method": method.upper(),
                    "url": url,
                    "params": params,
                    "has_data": bool(data),
                    "has_auth": bool(auth_token or api_key),
                },
            }

            # Add error details if not successful
            if not is_success:
                result["error"] = f"HTTP {response.status_code}: {response.reason}"
                if response_data and isinstance(response_data, dict):
                    # Try to extract error message from common API error formats
                    error_msg = (
                        response_data.get("error")
                        or response_data.get("message")
                        or response_data.get("detail")
                        or response_data.get("error_description")
                    )
                    if error_msg:
                        result["api_error"] = error_msg

            return result

        except requests.exceptions.Timeout:
            return {
                "success": False,
                "error": f"Request timeout after {timeout} seconds",
                "url": url,
                "timeout": timeout,
            }
        except requests.exceptions.ConnectionError as e:
            return {
                "success": False,
                "error": f"Connection error: {str(e)}",
                "url": url,
            }
        except requests.exceptions.RequestException as e:
            return {"success": False, "error": f"Request error: {str(e)}", "url": url}
        except Exception as e:
            logger.error(f"JSON API request error: {e}")
            return {"success": False, "error": str(e), "url": url}

    async def _arun(
        self,
        url: str,
        method: str = "GET",
        data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, str]] = None,
        auth_token: Optional[str] = None,
        api_key: Optional[str] = None,
        api_key_header: str = "X-API-Key",
        timeout: int = 30,
    ) -> Dict[str, Any]:
        """Async version of JSON API request."""
        return self._run(
            url, method, data, params, auth_token, api_key, api_key_header, timeout
        )
