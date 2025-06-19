"""
HTTP MCP Router - Exposes MCP functionality via REST API for browser clients
"""

import json
import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.service.agent.tools.tool_registry import ToolRegistry

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/mcp", tags=["mcp"])

# Global tool registry instance
tool_registry = ToolRegistry()

# Request/Response models
class MCPInitializeRequest(BaseModel):
    protocolVersion: str
    capabilities: Dict[str, Any]
    clientInfo: Dict[str, str]

class MCPToolCallRequest(BaseModel):
    name: str
    arguments: Dict[str, Any]

class MCPResourceReadRequest(BaseModel):
    uri: str

class MCPToolResponse(BaseModel):
    content: List[Dict[str, Any]]
    isError: Optional[bool] = False

@router.post("/initialize")
async def initialize_mcp(request: MCPInitializeRequest):
    """Initialize MCP connection and return server capabilities"""
    try:
        server_info = {
            "name": "olorin-mcp-server",
            "version": "1.0.0",
            "description": "Olorin Investigation Tools MCP Server",
            "capabilities": {
                "tools": {"listChanged": True},
                "resources": {"subscribe": True, "listChanged": True},
                "prompts": {"listChanged": True}
            }
        }
        
        return {
            "protocolVersion": "2024-11-05",
            "capabilities": {
                "tools": {"listChanged": True},
                "resources": {"subscribe": True, "listChanged": True},
                "prompts": {"listChanged": True}
            },
            "serverInfo": server_info
        }
    except Exception as e:
        logger.error(f"MCP initialization failed: {e}")
        raise HTTPException(status_code=500, detail=f"Initialization failed: {e}")

@router.post("/tools/list")
async def list_tools():
    """List all available tools"""
    try:
        tools = []
        
        # Get tools from registry
        all_tools = tool_registry.get_all_tools()
        for tool_instance in all_tools:
                try:
                    # Tool instance is already available
                    tool_name = tool_instance.name
                    
                    # Get tool schema
                    schema = getattr(tool_instance, 'args_schema', None)
                    if schema:
                        # Convert Pydantic schema to MCP format
                        tool_schema = {
                            "type": "object",
                            "properties": {},
                            "required": []
                        }
                        
                        if hasattr(schema, 'model_fields'):
                            for field_name, field_info in schema.model_fields.items():
                                tool_schema["properties"][field_name] = {
                                    "type": "string",  # Simplified for now
                                    "description": getattr(field_info, 'description', '')
                                }
                                if getattr(field_info, 'is_required', lambda: False)():
                                    tool_schema["required"].append(field_name)
                    else:
                        tool_schema = {
                            "type": "object",
                            "properties": {},
                            "required": []
                        }
                    
                    tools.append({
                        "name": tool_name,
                        "description": getattr(tool_instance, 'description', f"{tool_name} - Investigation tool"),
                        "inputSchema": tool_schema
                    })
                except Exception as tool_error:
                    logger.warning(f"Failed to load tool {tool_name}: {tool_error}")
                    continue
        
        return {"tools": tools}
    except Exception as e:
        logger.error(f"Failed to list tools: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list tools: {e}")

@router.post("/tools/call")
async def call_tool(request: MCPToolCallRequest):
    """Execute a tool with given arguments"""
    try:
        tool_name = request.name
        arguments = request.arguments
        
        # Find tool in registry
        tool_instance = None
        all_tools = tool_registry.get_all_tools()
        for tool in all_tools:
            if tool.name == tool_name:
                tool_instance = tool
                break
        
        if not tool_instance:
            raise HTTPException(status_code=404, detail=f"Tool '{tool_name}' not found")
        
        try:
            # Execute tool
            if hasattr(tool_instance, '_arun'):
                result = await tool_instance._arun(**arguments)
            elif hasattr(tool_instance, '_run'):
                result = tool_instance._run(**arguments)
            else:
                result = await tool_instance.ainvoke(arguments)
            
            # Format result for MCP
            if isinstance(result, str):
                content = [{"type": "text", "text": result}]
            elif isinstance(result, dict):
                content = [{"type": "text", "text": json.dumps(result, indent=2)}]
            else:
                content = [{"type": "text", "text": str(result)}]
            
            return MCPToolResponse(content=content, isError=False)
            
        except Exception as execution_error:
            logger.error(f"Tool execution failed for {tool_name}: {execution_error}")
            return MCPToolResponse(
                content=[{"type": "text", "text": f"Tool execution failed: {execution_error}"}],
                isError=True
            )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Tool call failed: {e}")
        raise HTTPException(status_code=500, detail=f"Tool call failed: {e}")

@router.post("/resources/list")
async def list_resources():
    """List available resources"""
    try:
        # For now, return investigation-related resources
        resources = [
            {
                "uri": "investigation://templates/fraud",
                "name": "Fraud Investigation Template",
                "description": "Template for fraud investigation workflow",
                "mimeType": "application/json"
            },
            {
                "uri": "investigation://guides/splunk",
                "name": "Splunk Query Guide",
                "description": "Guide for effective Splunk queries",
                "mimeType": "text/markdown"
            },
            {
                "uri": "investigation://schemas/user",
                "name": "User Data Schema",
                "description": "Schema for user investigation data",
                "mimeType": "application/json"
            }
        ]
        
        return {"resources": resources}
    except Exception as e:
        logger.error(f"Failed to list resources: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list resources: {e}")

@router.post("/resources/read")
async def read_resource(request: MCPResourceReadRequest):
    """Read a specific resource"""
    try:
        uri = request.uri
        
        # Mock resource content based on URI
        if uri == "investigation://templates/fraud":
            content = {
                "steps": [
                    "1. Identify suspicious user/device",
                    "2. Search logs with SplunkQueryTool",
                    "3. Get user identity with OIITool",
                    "4. Analyze device patterns with DITool",
                    "5. Cross-reference with external sources",
                    "6. Document findings"
                ],
                "tools": ["SplunkQueryTool", "OIITool", "DITool", "WebSearchTool"]
            }
        elif uri == "investigation://guides/splunk":
            content = """
# Splunk Query Guide

## Common Investigation Queries

### Failed Login Attempts
```spl
index=auth_logs action=login result=failure
| stats count by user, src_ip
| where count > 5
```

### Device Analysis
```spl
index=device_logs
| stats values(user) as users by device_id
| where mvcount(users) > 1
```
"""
        elif uri == "investigation://schemas/user":
            content = {
                "user_id": "string",
                "email": "string",
                "last_login": "datetime",
                "device_count": "number",
                "risk_score": "number"
            }
        else:
            raise HTTPException(status_code=404, detail=f"Resource not found: {uri}")
        
        return {
            "contents": [{
                "uri": uri,
                "mimeType": "application/json" if isinstance(content, dict) else "text/plain",
                "text": json.dumps(content, indent=2) if isinstance(content, dict) else content
            }]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to read resource: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to read resource: {e}")

@router.get("/resources/subscribe")
async def subscribe_to_resources():
    """Subscribe to resource changes via Server-Sent Events"""
    async def event_stream():
        try:
            # Send initial connection event
            yield f"data: {json.dumps({'type': 'connected', 'message': 'Connected to resource updates'})}\n\n"
            
            # In a real implementation, you would:
            # 1. Watch for file system changes
            # 2. Monitor database updates
            # 3. Listen for tool registry changes
            # For now, send periodic heartbeat
            import asyncio
            while True:
                await asyncio.sleep(30)
                yield f"data: {json.dumps({'type': 'heartbeat', 'timestamp': str(asyncio.get_event_loop().time())})}\n\n"
                
        except Exception as e:
            logger.error(f"SSE stream error: {e}")
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
    
    return StreamingResponse(
        event_stream(),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream"
        }
    )

@router.get("/status")
async def get_status():
    """Get MCP server status"""
    try:
        tool_count = len(tool_registry.get_all_tools())
        
        return {
            "status": "running",
            "version": "1.0.0",
            "tools_available": tool_count,
            "capabilities": ["tools", "resources", "server-sent-events"]
        }
    except Exception as e:
        logger.error(f"Failed to get status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get status: {e}") 