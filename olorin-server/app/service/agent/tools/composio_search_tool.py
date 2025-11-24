"""
Composio Search Tool for LangChain Agents

Provides web search capabilities via Composio MCP integration.
Uses COMPOSIO_SEARCH_API_URL for search functionality.
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


class ComposioSearchInput(BaseModel):
    """Input schema for Composio search."""
    query: str = Field(..., description="Search query to find information on the web")
    max_results: int = Field(default=10, description="Maximum number of results to return (1-20)")
    entity_id: Optional[str] = Field(None, description="Entity ID being investigated (for context)")


class ComposioSearchTool(BaseTool):
    """
    Tool for executing web searches via Composio Search API.
    
    Provides:
    - Web search capabilities
    - Entity-specific search context
    - Structured search results
    """
    
    name: str = "composio_search"
    description: str = """
    Search the web for information using Composio Search API.
    
    Use this tool to:
    - Search for information about entities (IPs, emails, user IDs, etc.)
    - Find threat intelligence and reputation data
    - Research suspicious entities online
    - Gather OSINT (Open Source Intelligence) data
    
    Input: query (required), max_results (optional, default 10), entity_id (optional)
    Output: Search results with titles, URLs, snippets, and relevance scores
    """
    args_schema: type[BaseModel] = ComposioSearchInput
    
    def __init__(self, **kwargs):
        """Initialize Composio Search tool."""
        super().__init__(**kwargs)
        # Try multiple possible environment variable names
        self._mcp_url = (
            os.getenv("COMPOSIO_SEARCH_API_URL") or 
            os.getenv("COMPOSIO_SEARCH_URL") or
            os.getenv("COMPOSIO_SEARCH_MCP_URL")
        )
        if not self._mcp_url:
            logger.warning("COMPOSIO_SEARCH_API_URL not set - Composio Search tool will use fallback search")
        self._timeout = 30.0
    
    def _make_mcp_request(self, method: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Make JSON-RPC 2.0 request to Composio MCP endpoint."""
        if not self._mcp_url:
            return {
                "success": False,
                "error": "COMPOSIO_SEARCH_API_URL not configured"
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
                                    logger.error(f"Composio Search MCP error: {result['error']}")
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
                        logger.error(f"Composio Search MCP error: {result['error']}")
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
            logger.error(f"Composio Search request timeout: {self._mcp_url}")
            return {
                "success": False,
                "error": "Request timeout"
            }
        except httpx.RequestError as e:
            logger.error(f"Composio Search request error: {e}")
            return {
                "success": False,
                "error": f"Request error: {str(e)}"
            }
        except Exception as e:
            logger.error(f"Composio Search unexpected error: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e)
            }
    
    def _run(
        self,
        query: str,
        max_results: int = 10,
        entity_id: Optional[str] = None
    ) -> str:
        """
        Execute web search via Composio.
        
        Args:
            query: Search query
            max_results: Maximum number of results (1-20)
            entity_id: Optional entity ID for context
            
        Returns:
            JSON string with search results
        """
        import json
        
        # Validate max_results
        max_results = max(1, min(max_results, 20))
        
        # If no MCP URL configured, use fallback to existing web search tool
        if not self._mcp_url:
            logger.info("Composio Search MCP URL not configured, using fallback web search")
            try:
                from .web_search_tool.web_search_tool import WebSearchTool
                fallback_tool = WebSearchTool()
                fallback_result = fallback_tool._run(query, max_results, "duckduckgo")
                if isinstance(fallback_result, dict):
                    return json.dumps({
                        "success": True,
                        "query": query,
                        "num_results": fallback_result.get("num_results", 0),
                        "results": fallback_result.get("results", []),
                        "entity_id": entity_id,
                        "source": "fallback_web_search"
                    }, indent=2)
            except Exception as e:
                logger.warning(f"Fallback web search failed: {e}")
                return json.dumps({
                    "success": False,
                    "error": f"Composio Search not configured and fallback failed: {str(e)}",
                    "query": query
                }, indent=2)
        
        # Build search parameters
        search_params = {
            "query": query,
            "max_results": max_results
        }
        
        if entity_id:
            search_params["entity_id"] = entity_id
        
        # Make MCP request - use tools/call with the correct tool name
        # Available tools: COMPOSIO_SEARCH_WEB, COMPOSIO_SEARCH_DUCK_DUCK_GO, COMPOSIO_SEARCH_NEWS, etc.
        # Try COMPOSIO_SEARCH_WEB first (general web search)
        result = self._make_mcp_request("tools/call", {
            "name": "COMPOSIO_SEARCH_WEB",
            "arguments": {
                "query": query
            }
        })
        
        # If that fails, try COMPOSIO_SEARCH_DUCK_DUCK_GO
        if not result.get("success"):
            result = self._make_mcp_request("tools/call", {
                "name": "COMPOSIO_SEARCH_DUCK_DUCK_GO",
                "arguments": {
                    "query": query
                }
            })
        
        # Format response
        if result.get("success"):
            mcp_result = result.get("result", {})
            
            # Extract search results from MCP response
            # MCP responses use content[0].text format with nested JSON
            results = []
            
            if isinstance(mcp_result, dict):
                # Check for MCP content format (content array with text field)
                if "content" in mcp_result:
                    content = mcp_result["content"]
                    if isinstance(content, list) and len(content) > 0:
                        text_content = content[0].get("text", "")
                        try:
                            # Parse the JSON string in text_content
                            parsed = json.loads(text_content)
                            
                            # Extract results from nested structure
                            # Structure: parsed.data.results.organic_results
                            if isinstance(parsed, dict):
                                data = parsed.get("data", {})
                                if isinstance(data, dict):
                                    results_data = data.get("results", {})
                                    if isinstance(results_data, dict):
                                        # Extract organic_results, ads, etc.
                                        organic_results = results_data.get("organic_results", [])
                                        if organic_results:
                                            # Format organic results
                                            for item in organic_results[:max_results]:
                                                results.append({
                                                    "title": item.get("title", ""),
                                                    "url": item.get("link", ""),
                                                    "snippet": item.get("snippet", ""),
                                                    "source": item.get("source", ""),
                                                    "position": item.get("position", 0)
                                                })
                                        
                                        # Also include AI overview if available
                                        ai_overview = results_data.get("ai_overview", {})
                                        if ai_overview:
                                            text_blocks = ai_overview.get("text_blocks", [])
                                            for block in text_blocks:
                                                if block.get("type") == "paragraph":
                                                    results.append({
                                                        "title": "AI Overview",
                                                        "snippet": block.get("snippet", ""),
                                                        "type": "ai_overview"
                                                    })
                                    
                                    # If no organic_results, try direct results key
                                    if not results and "organic_results" in results_data:
                                        results = results_data["organic_results"][:max_results]
                        except json.JSONDecodeError as e:
                            logger.debug(f"Failed to parse JSON from text_content: {e}")
                            results = [{"text": text_content[:500]}]
                
                # Fallback: check for direct results key
                if not results and "results" in mcp_result:
                    results = mcp_result["results"]
                elif not results and "data" in mcp_result:
                    results = mcp_result["data"]
            
            # If still no results, use the whole result as a single result
            if not results:
                results = [{"text": str(mcp_result)[:500]}]
            
            response = {
                "success": True,
                "query": query,
                "num_results": len(results),
                "results": results[:max_results],
                "entity_id": entity_id
            }
            
            logger.info(f"✅ Composio Search completed: query='{query}', results={len(results)}")
            return json.dumps(response, indent=2)
        else:
            error_msg = result.get("error", "Unknown error")
            logger.warning(f"Composio Search failed: {error_msg}")
            return json.dumps({
                "success": False,
                "error": error_msg,
                "query": query
            }, indent=2)
    
    async def _arun(
        self,
        query: str,
        max_results: int = 10,
        entity_id: Optional[str] = None
    ) -> str:
        """Async version of Composio search."""
        # For now, use sync version in executor
        import asyncio
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None,
            self._run,
            query,
            max_results,
            entity_id
        )

