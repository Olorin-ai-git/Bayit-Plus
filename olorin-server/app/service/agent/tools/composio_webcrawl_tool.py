"""
Composio WebCrawl Tool for LangChain Agents

Provides web crawling capabilities via Composio FireCrawl MCP integration.
Uses COMPOSIO_FIRECRAWL_CRAWL_URL for web crawling functionality.
"""

import os
import json
import uuid
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field

import httpx
from langchain_core.tools import BaseTool

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class ComposioWebCrawlInput(BaseModel):
    """Input schema for Composio web crawl."""
    url: str = Field(..., description="URL of the web page to crawl")
    max_depth: int = Field(default=1, description="Maximum crawl depth (1-3)")
    include_links: bool = Field(default=False, description="Whether to include links in results")
    entity_id: Optional[str] = Field(None, description="Entity ID being investigated (for context)")


class ComposioWebCrawlTool(BaseTool):
    """
    Tool for crawling web pages via Composio FireCrawl MCP integration.
    
    Provides:
    - Web page crawling and content extraction
    - Deep crawling with depth control
    - Link extraction
    - Structured content extraction
    """
    
    name: str = "composio_webcrawl"
    description: str = """
    Crawl and extract content from web pages using Composio FireCrawl API.
    
    Use this tool to:
    - Extract detailed content from specific URLs
    - Crawl websites related to suspicious entities
    - Gather comprehensive information from web pages
    - Extract structured data from HTML pages
    
    Input: url (required), max_depth (optional, default 1), include_links (optional), entity_id (optional)
    Output: Crawled content with text, metadata, and optionally links
    """
    args_schema: type[BaseModel] = ComposioWebCrawlInput
    
    def __init__(self, **kwargs):
        """Initialize Composio WebCrawl tool."""
        super().__init__(**kwargs)
        self._mcp_url = os.getenv("COMPOSIO_FIRECRAWL_CRAWL_URL")
        if not self._mcp_url:
            logger.warning("COMPOSIO_FIRECRAWL_CRAWL_URL not set - Composio WebCrawl tool will not work")
        self._timeout = 60.0  # Longer timeout for crawling
    
    def _make_mcp_request(self, method: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Make JSON-RPC 2.0 request to Composio MCP endpoint."""
        if not self._mcp_url:
            return {
                "success": False,
                "error": "COMPOSIO_FIRECRAWL_CRAWL_URL not configured"
            }
        
        request_data = {
            "jsonrpc": "2.0",
            "id": str(uuid.uuid4()),
            "method": method,
            "params": params
        }
        
        try:
            with httpx.Client(timeout=self._timeout) as client:
                response = client.post(
                    self._mcp_url,
                    json=request_data,
                    headers={
                        "Content-Type": "application/json",
                        "Accept": "application/json, text/event-stream"
                    }
                )
                response.raise_for_status()
                
                # Check if response is SSE stream
                content_type = response.headers.get("content-type", "")
                if "text/event-stream" in content_type:
                    # Parse SSE stream
                    lines = response.text.split('\n')
                    for line in lines:
                        if line.startswith('data: '):
                            data_str = line[6:]  # Remove 'data: ' prefix
                            try:
                                result = json.loads(data_str)
                                if "error" in result:
                                    logger.error(f"Composio WebCrawl MCP error: {result['error']}")
                                    return {
                                        "success": False,
                                        "error": result["error"].get("message", "Unknown MCP error"),
                                        "error_code": result["error"].get("code")
                                    }
                                return {
                                    "success": True,
                                    "result": result.get("result", {})
                                }
                            except json.JSONDecodeError:
                                continue
                    return {
                        "success": False,
                        "error": "Could not parse SSE stream response"
                    }
                else:
                    # Regular JSON response
                    result = response.json()
                    if "error" in result:
                        logger.error(f"Composio WebCrawl MCP error: {result['error']}")
                        return {
                            "success": False,
                            "error": result["error"].get("message", "Unknown MCP error"),
                            "error_code": result["error"].get("code")
                        }
                    
                    return {
                        "success": True,
                        "result": result.get("result", {})
                    }
                
        except httpx.TimeoutException:
            logger.error(f"Composio WebCrawl request timeout: {self._mcp_url}")
            return {
                "success": False,
                "error": "Request timeout"
            }
        except httpx.RequestError as e:
            logger.error(f"Composio WebCrawl request error: {e}")
            return {
                "success": False,
                "error": f"Request error: {str(e)}"
            }
        except Exception as e:
            logger.error(f"Composio WebCrawl unexpected error: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e)
            }
    
    def _run(
        self,
        url: str,
        max_depth: int = 1,
        include_links: bool = False,
        entity_id: Optional[str] = None
    ) -> str:
        """
        Execute web crawl via Composio FireCrawl.
        
        Args:
            url: URL to crawl
            max_depth: Maximum crawl depth (1-3)
            include_links: Whether to include links
            entity_id: Optional entity ID for context
            
        Returns:
            JSON string with crawled content
        """
        import json
        
        # Validate max_depth
        max_depth = max(1, min(max_depth, 3))
        
        # Build crawl parameters
        crawl_params = {
            "url": url,
            "max_depth": max_depth,
            "include_links": include_links
        }
        
        if entity_id:
            crawl_params["entity_id"] = entity_id
        
        # Make MCP request - use FIRECRAWL_EXTRACT for crawling and extracting content
        # Available tools: FIRECRAWL_EXTRACT, FIRECRAWL_MAP_MULTIPLE_URLS_BASED_ON_OPTIONS, etc.
        # Use FIRECRAWL_EXTRACT to crawl URL and extract content
        result = self._make_mcp_request("tools/call", {
            "name": "FIRECRAWL_EXTRACT",
            "arguments": {
                "urls": [url],
                "prompt": f"Extract the main content, text, and key information from this webpage. Include any relevant links if requested.",
                "enable_web_search": False
            }
        })
        
        # If that fails, try FIRECRAWL_MAP_MULTIPLE_URLS_BASED_ON_OPTIONS for URL mapping
        if not result.get("success"):
            result = self._make_mcp_request("tools/call", {
                "name": "FIRECRAWL_MAP_MULTIPLE_URLS_BASED_ON_OPTIONS",
                "arguments": {
                    "url": url,
                    "limit": 10 if max_depth > 1 else 1,
                    "includeSubdomains": False
                }
            })
        
        # Format response
        if result.get("success"):
            mcp_result = result.get("result", {})
            
            # Extract crawl results from MCP response
            # MCP responses can vary, so we handle multiple formats
            if isinstance(mcp_result, dict):
                # Check for common result structures
                if "content" in mcp_result:
                    content = mcp_result["content"]
                elif "data" in mcp_result:
                    content = mcp_result["data"]
                elif "text" in mcp_result:
                    content = mcp_result["text"]
                else:
                    # Try to extract from MCP content format
                    if "content" in mcp_result:
                        mcp_content = mcp_result["content"]
                        if isinstance(mcp_content, list) and len(mcp_content) > 0:
                            text_content = mcp_content[0].get("text", "")
                            try:
                                parsed = json.loads(text_content)
                                content = parsed.get("content", parsed.get("data", text_content))
                            except:
                                content = text_content
                        else:
                            content = str(mcp_result)
                    else:
                        content = str(mcp_result)
                
                # Extract metadata
                metadata = {
                    "url": url,
                    "max_depth": max_depth,
                    "crawled_at": mcp_result.get("crawled_at"),
                    "status": mcp_result.get("status", "success")
                }
                
                # Extract links if requested
                links = []
                if include_links:
                    links = mcp_result.get("links", [])
                
                response = {
                    "success": True,
                    "url": url,
                    "content": content,
                    "metadata": metadata,
                    "links": links if include_links else None,
                    "entity_id": entity_id
                }
            else:
                response = {
                    "success": True,
                    "url": url,
                    "content": str(mcp_result),
                    "metadata": {"url": url, "max_depth": max_depth},
                    "entity_id": entity_id
                }
            
            logger.info(f"Composio WebCrawl completed: url='{url}', depth={max_depth}")
            return json.dumps(response, indent=2)
        else:
            error_msg = result.get("error", "Unknown error")
            logger.warning(f"Composio WebCrawl failed: {error_msg}")
            return json.dumps({
                "success": False,
                "error": error_msg,
                "url": url
            }, indent=2)
    
    async def _arun(
        self,
        url: str,
        max_depth: int = 1,
        include_links: bool = False,
        entity_id: Optional[str] = None
    ) -> str:
        """Async version of Composio web crawl."""
        # For now, use sync version in executor
        import asyncio
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None,
            self._run,
            url,
            max_depth,
            include_links,
            entity_id
        )

