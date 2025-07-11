"""
HTTP MCP Router - Exposes MCP functionality via REST API for browser clients
"""

import json
import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.service.agent.tools.tool_registry import initialize_tools, tool_registry

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/mcp", tags=["mcp"])


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
                "prompts": {"listChanged": True},
            },
        }

        return {
            "protocolVersion": "2024-11-05",
            "capabilities": {
                "tools": {"listChanged": True},
                "resources": {"subscribe": True, "listChanged": True},
                "prompts": {"listChanged": True},
            },
            "serverInfo": server_info,
        }
    except Exception as e:
        logger.error(f"MCP initialization failed: {e}")
        raise HTTPException(status_code=500, detail=f"Initialization failed: {e}")


@router.post("/tools/list")
async def list_tools():
    """List all available tools"""
    try:
        # Ensure the global tool registry is initialized
        if not tool_registry.is_initialized():
            initialize_tools()
        tools = []

        # Get tools from registry
        all_tools = tool_registry.get_all_tools()
        for tool_instance in all_tools:
            try:
                # Tool instance is already available
                tool_name = tool_instance.name

                # Get tool schema
                schema = getattr(tool_instance, "args_schema", None)
                if schema:
                    # Convert Pydantic schema to MCP format
                    tool_schema = {"type": "object", "properties": {}, "required": []}

                    if hasattr(schema, "model_fields"):
                        for field_name, field_info in schema.model_fields.items():
                            tool_schema["properties"][field_name] = {
                                "type": "string",  # Simplified for now
                                "description": getattr(field_info, "description", ""),
                            }
                            if getattr(field_info, "is_required", lambda: False)():
                                tool_schema["required"].append(field_name)
                else:
                    tool_schema = {"type": "object", "properties": {}, "required": []}

                tools.append(
                    {
                        "name": tool_name,
                        "description": getattr(
                            tool_instance,
                            "description",
                            f"{tool_name} - Investigation tool",
                        ),
                        "inputSchema": tool_schema,
                    }
                )
            except Exception as e:
                logger.error(f"Error processing tool {tool_instance}: {e}")
        return {"tools": tools}
    except Exception as e:
        logger.error(f"Failed to list tools: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list tools: {e}")


@router.post("/tools/call")
async def call_tool(request: Dict[str, Any]):
    """Execute a tool with given arguments"""
    try:
        # Ensure the global tool registry is initialized
        if not tool_registry.is_initialized():
            initialize_tools()
        tool_name = request["name"]
        arguments = request["arguments"]

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
            if hasattr(tool_instance, "_arun"):
                result = await tool_instance._arun(**arguments)
            elif hasattr(tool_instance, "_run"):
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

            return {"content": content, "isError": False}

        except Exception as execution_error:
            logger.error(f"Tool execution failed for {tool_name}: {execution_error}")
            return {
                "content": [
                    {
                        "type": "text",
                        "text": f"Tool execution failed: {execution_error}",
                    }
                ],
                "isError": True,
            }

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
                "mimeType": "application/json",
            },
            {
                "uri": "investigation://guides/splunk",
                "name": "Splunk Query Guide",
                "description": "Guide for effective Splunk queries",
                "mimeType": "text/markdown",
            },
            {
                "uri": "investigation://schemas/user",
                "name": "User Data Schema",
                "description": "Schema for user investigation data",
                "mimeType": "application/json",
            },
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
                    "6. Document findings",
                ],
                "tools": ["SplunkQueryTool", "OIITool", "DITool", "WebSearchTool"],
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
                "risk_score": "number",
            }
        else:
            raise HTTPException(status_code=404, detail=f"Resource not found: {uri}")

        return {
            "contents": [
                {
                    "uri": uri,
                    "mimeType": (
                        "application/json"
                        if isinstance(content, dict)
                        else "text/plain"
                    ),
                    "text": (
                        json.dumps(content, indent=2)
                        if isinstance(content, dict)
                        else content
                    ),
                }
            ]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to read resource: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to read resource: {e}")


@router.post("/prompts/list")
async def list_prompts():
    """List available prompts"""
    try:
        # Enhanced investigation-related prompts
        prompts = [
            {
                "name": "fraud_investigation",
                "description": "Comprehensive fraud investigation prompt for analyzing user behavior patterns",
                "arguments": {
                    "type": "object",
                    "properties": {
                        "user_id": {
                            "type": "string",
                            "description": "User ID to investigate",
                        },
                        "investigation_type": {
                            "type": "string",
                            "enum": ["full", "quick", "deep"],
                            "description": "Type of investigation to perform - full: comprehensive analysis, quick: rapid assessment, deep: detailed forensic analysis",
                        },
                        "time_range": {
                            "type": "string",
                            "description": "Time range for investigation (e.g., '24h', '7d', '30d')",
                            "default": "7d",
                        },
                        "include_historical": {
                            "type": "boolean",
                            "description": "Include historical data analysis",
                            "default": True,
                        },
                    },
                    "required": ["user_id"],
                },
            },
            {
                "name": "risk_assessment",
                "description": "Risk assessment prompt for analyzing investigation data and providing risk scores",
                "arguments": {
                    "type": "object",
                    "properties": {
                        "data": {
                            "type": "object",
                            "description": "Investigation data to assess",
                        },
                        "assessment_type": {
                            "type": "string",
                            "enum": ["comprehensive", "focused", "summary"],
                            "description": "Type of risk assessment to perform",
                            "default": "comprehensive",
                        },
                        "include_recommendations": {
                            "type": "boolean",
                            "description": "Include actionable recommendations",
                            "default": True,
                        },
                    },
                    "required": ["data"],
                },
            },
            {
                "name": "device_analysis",
                "description": "Specialized prompt for device fingerprinting and anomaly detection",
                "arguments": {
                    "type": "object",
                    "properties": {
                        "device_id": {
                            "type": "string",
                            "description": "Device ID to analyze",
                        },
                        "user_id": {
                            "type": "string",
                            "description": "Associated user ID (optional)",
                        },
                        "analysis_depth": {
                            "type": "string",
                            "enum": ["basic", "detailed", "forensic"],
                            "description": "Depth of device analysis",
                            "default": "detailed",
                        },
                    },
                    "required": ["device_id"],
                },
            },
            {
                "name": "location_analysis",
                "description": "Geographic location analysis for detecting travel anomalies and suspicious patterns",
                "arguments": {
                    "type": "object",
                    "properties": {
                        "entity_id": {
                            "type": "string",
                            "description": "User ID or device ID to analyze",
                        },
                        "entity_type": {
                            "type": "string",
                            "enum": ["user_id", "device_id"],
                            "description": "Type of entity being analyzed",
                            "default": "user_id",
                        },
                        "include_vector_search": {
                            "type": "boolean",
                            "description": "Include vector search analysis for similar patterns",
                            "default": True,
                        },
                    },
                    "required": ["entity_id"],
                },
            },
            {
                "name": "network_analysis",
                "description": "Network traffic and connection pattern analysis for security assessment",
                "arguments": {
                    "type": "object",
                    "properties": {
                        "entity_id": {
                            "type": "string",
                            "description": "User ID or device ID to analyze",
                        },
                        "entity_type": {
                            "type": "string",
                            "enum": ["user_id", "device_id"],
                            "description": "Type of entity being analyzed",
                            "default": "user_id",
                        },
                        "include_isp_analysis": {
                            "type": "boolean",
                            "description": "Include ISP and network provider analysis",
                            "default": True,
                        },
                    },
                    "required": ["entity_id"],
                },
            },
            {
                "name": "authentication_analysis",
                "description": "Authentication log analysis for detecting suspicious login patterns",
                "arguments": {
                    "type": "object",
                    "properties": {
                        "entity_id": {
                            "type": "string",
                            "description": "User ID or device ID to analyze",
                        },
                        "entity_type": {
                            "type": "string",
                            "enum": ["user_id", "device_id"],
                            "description": "Type of entity being analyzed",
                            "default": "user_id",
                        },
                        "include_failed_attempts": {
                            "type": "boolean",
                            "description": "Include analysis of failed authentication attempts",
                            "default": True,
                        },
                    },
                    "required": ["entity_id"],
                },
            },
        ]

        return {"prompts": prompts}
    except Exception as e:
        logger.error(f"Failed to list prompts: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list prompts: {e}")


@router.post("/prompts/get")
async def get_prompt(request: Dict[str, Any]):
    """Get a specific prompt with arguments"""
    try:
        prompt_name = request.get("name")
        arguments = request.get("arguments", {})

        if prompt_name == "fraud_investigation":
            user_id = arguments.get("user_id", "unknown")
            investigation_type = arguments.get("investigation_type", "full")
            time_range = arguments.get("time_range", "7d")
            include_historical = arguments.get("include_historical", True)

            prompt_text = f"""
You are a senior fraud investigation analyst conducting a {investigation_type} investigation for user {user_id}.

Investigation Parameters:
- Time Range: {time_range}
- Include Historical Data: {include_historical}
- Investigation Type: {investigation_type}

Please conduct a comprehensive analysis covering:

1. **Authentication Patterns**
   - Login frequency and timing
   - Failed login attempts
   - Multi-factor authentication usage
   - Session duration patterns

2. **Device Usage Analysis**
   - Device fingerprinting
   - Device switching patterns
   - New device registrations
   - Device location consistency

3. **Geographic Analysis**
   - Location-based access patterns
   - Travel time anomalies
   - VPN/proxy usage detection
   - International access patterns

4. **Network Behavior**
   - IP address patterns
   - ISP analysis
   - Connection timing
   - Network infrastructure changes

5. **Transaction Patterns**
   - Transaction frequency and amounts
   - Unusual transaction types
   - Time-based transaction patterns
   - Geographic transaction patterns

6. **Account Activity**
   - Password changes
   - Profile modifications
   - Permission changes
   - Account linking/unlinking

Provide a detailed risk assessment with:
- Overall risk score (0-100)
- Specific risk factors identified
- Confidence level in assessment
- Recommended actions
- Timeline of suspicious activities
"""
            return {
                "messages": [
                    {
                        "role": "system",
                        "content": "You are an expert fraud investigation analyst with 15+ years of experience in financial crime detection and cybersecurity.",
                    },
                    {"role": "user", "content": prompt_text},
                ]
            }

        elif prompt_name == "risk_assessment":
            data = arguments.get("data", {})
            assessment_type = arguments.get("assessment_type", "comprehensive")
            include_recommendations = arguments.get("include_recommendations", True)

            # Build the recommendations section
            recommendations_section = ""
            if include_recommendations:
                recommendations_section = """
6. **Recommendations**
   - Immediate actions
   - Short-term measures
   - Long-term strategies
   - Monitoring recommendations"""

            prompt_text = f"""
You are a risk assessment expert analyzing investigation data for security threats.

Assessment Type: {assessment_type}
Include Recommendations: {include_recommendations}

Investigation Data:
{json.dumps(data, indent=2)}

Please provide a {assessment_type} risk assessment including:

1. **Risk Scoring**
   - Overall risk score (0-100)
   - Individual domain risk scores
   - Risk trend analysis
   - Confidence level in assessment

2. **Risk Factor Analysis**
   - Primary risk factors
   - Secondary risk factors
   - Risk factor correlations
   - Temporal risk patterns

3. **Threat Assessment**
   - Identified threats
   - Threat severity levels
   - Threat likelihood
   - Potential impact assessment

4. **Anomaly Detection**
   - Behavioral anomalies
   - Technical anomalies
   - Geographic anomalies
   - Temporal anomalies

5. **Context Analysis**
   - Historical context
   - Industry benchmarks
   - Peer comparison
   - Baseline deviation
{recommendations_section}

Provide detailed reasoning for all assessments and ensure all scores are well-justified.
"""
            return {
                "messages": [
                    {
                        "role": "system",
                        "content": "You are a senior risk assessment specialist with expertise in cybersecurity, fraud detection, and threat analysis.",
                    },
                    {"role": "user", "content": prompt_text},
                ]
            }

        elif prompt_name == "device_analysis":
            device_id = arguments.get("device_id", "unknown")
            user_id = arguments.get("user_id", "unknown")
            analysis_depth = arguments.get("analysis_depth", "detailed")

            prompt_text = f"""
You are a device forensics expert conducting {analysis_depth} analysis of device {device_id}.

Device Analysis Parameters:
- Device ID: {device_id}
- Associated User: {user_id if user_id != "unknown" else "Not specified"}
- Analysis Depth: {analysis_depth}

Please conduct a {analysis_depth} device analysis covering:

1. **Device Fingerprinting**
   - Hardware characteristics
   - Software configuration
   - Browser fingerprinting
   - Device capabilities

2. **Usage Patterns**
   - Login patterns
   - Activity timing
   - Feature usage
   - Application access

3. **Security Assessment**
   - Security posture
   - Vulnerability assessment
   - Malware indicators
   - Compromise indicators

4. **Behavioral Analysis**
   - User interaction patterns
   - Typing patterns
   - Navigation patterns
   - Session behaviors

5. **Network Analysis**
   - Connection patterns
   - IP address history
   - Network changes
   - Proxy/VPN usage

6. **Anomaly Detection**
   - Unusual behaviors
   - Suspicious activities
   - Pattern deviations
   - Risk indicators

Provide detailed findings with risk scores and confidence levels.
"""
            return {
                "messages": [
                    {
                        "role": "system",
                        "content": "You are a device forensics expert specializing in device fingerprinting, behavioral analysis, and security assessment.",
                    },
                    {"role": "user", "content": prompt_text},
                ]
            }

        elif prompt_name == "location_analysis":
            entity_id = arguments.get("entity_id", "unknown")
            entity_type = arguments.get("entity_type", "user_id")
            include_vector_search = arguments.get("include_vector_search", True)

            # Build the vector search section
            vector_search_section = ""
            if include_vector_search:
                vector_search_section = """
6. **Vector Search Analysis**
   - Similar location patterns
   - Peer comparison
   - Pattern matching
   - Anomaly correlation"""

            prompt_text = f"""
You are a geographic intelligence analyst conducting location analysis for {entity_type} {entity_id}.

Location Analysis Parameters:
- Entity ID: {entity_id}
- Entity Type: {entity_type}
- Include Vector Search: {include_vector_search}

Please conduct comprehensive location analysis covering:

1. **Geographic Patterns**
   - Location history
   - Travel patterns
   - Geographic clustering
   - Location stability

2. **Anomaly Detection**
   - Impossible travel
   - Rapid location changes
   - Unusual locations
   - Geographic inconsistencies

3. **Risk Assessment**
   - High-risk locations
   - Geographic risk factors
   - Location-based threats
   - Regional risk patterns

4. **Behavioral Analysis**
   - Location preferences
   - Travel timing
   - Location frequency
   - Geographic habits

5. **Context Analysis**
   - Business travel patterns
   - Personal travel patterns
   - Expected locations
   - Geographic baseline
{vector_search_section}

Provide detailed geographic risk assessment with confidence levels.
"""
            return {
                "messages": [
                    {
                        "role": "system",
                        "content": "You are a geographic intelligence expert specializing in location-based security analysis and travel anomaly detection.",
                    },
                    {"role": "user", "content": prompt_text},
                ]
            }

        elif prompt_name == "network_analysis":
            entity_id = arguments.get("entity_id", "unknown")
            entity_type = arguments.get("entity_type", "user_id")
            include_isp_analysis = arguments.get("include_isp_analysis", True)

            # Build the ISP analysis section
            isp_analysis_section = ""
            if include_isp_analysis:
                isp_analysis_section = """
6. **ISP Analysis**
   - ISP reputation
   - ISP changes
   - ISP risk assessment
   - ISP correlation analysis"""

            prompt_text = f"""
You are a network security analyst conducting network analysis for {entity_type} {entity_id}.

Network Analysis Parameters:
- Entity ID: {entity_id}
- Entity Type: {entity_type}
- Include ISP Analysis: {include_isp_analysis}

Please conduct comprehensive network analysis covering:

1. **IP Address Analysis**
   - IP address history
   - IP address changes
   - Geographic IP mapping
   - IP reputation analysis

2. **Connection Patterns**
   - Connection timing
   - Connection frequency
   - Connection duration
   - Connection stability

3. **Network Infrastructure**
   - ISP identification
   - Network type analysis
   - Infrastructure changes
   - Network quality assessment

4. **Security Assessment**
   - VPN/proxy detection
   - Tor usage detection
   - Network security posture
   - Threat indicators

5. **Anomaly Detection**
   - Unusual connections
   - Suspicious IP addresses
   - Network behavior changes
   - Connection anomalies
{isp_analysis_section}

Provide detailed network security assessment with risk scores.
"""
            return {
                "messages": [
                    {
                        "role": "system",
                        "content": "You are a network security expert specializing in IP analysis, connection pattern analysis, and network threat detection.",
                    },
                    {"role": "user", "content": prompt_text},
                ]
            }

        elif prompt_name == "authentication_analysis":
            entity_id = arguments.get("entity_id", "unknown")
            entity_type = arguments.get("entity_type", "user_id")
            include_failed_attempts = arguments.get("include_failed_attempts", True)

            # Build the failed authentication section
            failed_auth_section = ""
            if include_failed_attempts:
                failed_auth_section = """
5. **Failed Authentication Analysis**
   - Failed login attempts
   - Brute force indicators
   - Credential stuffing
   - Account lockout patterns
"""

            prompt_text = f"""
You are an authentication security analyst conducting login analysis for {entity_type} {entity_id}.

Authentication Analysis Parameters:
- Entity ID: {entity_id}
- Entity Type: {entity_type}
- Include Failed Attempts: {include_failed_attempts}

Please conduct comprehensive authentication analysis covering:

1. **Login Patterns**
   - Login frequency
   - Login timing
   - Login locations
   - Login devices

2. **Session Analysis**
   - Session duration
   - Session patterns
   - Session anomalies
   - Session security

3. **Authentication Methods**
   - Password usage
   - Multi-factor authentication
   - Biometric authentication
   - Token-based authentication

4. **Security Assessment**
   - Authentication strength
   - Security posture
   - Vulnerability assessment
   - Risk indicators
{failed_auth_section}
6. **Anomaly Detection**
   - Unusual login patterns
   - Suspicious authentication
   - Login anomalies
   - Security incidents

Provide detailed authentication security assessment with risk scores.
"""
            return {
                "messages": [
                    {
                        "role": "system",
                        "content": "You are an authentication security expert specializing in login pattern analysis, session security, and authentication threat detection.",
                    },
                    {"role": "user", "content": prompt_text},
                ]
            }

        else:
            raise HTTPException(
                status_code=404, detail=f"Prompt '{prompt_name}' not found"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get prompt: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get prompt: {e}")


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
            "Content-Type": "text/event-stream",
        },
    )


@router.get("/status")
async def get_status():
    """Get MCP server status"""
    try:
        # Ensure the global tool registry is initialized
        if not tool_registry.is_initialized():
            initialize_tools()
        tool_count = len(tool_registry.get_all_tools())

        return {
            "status": "running",
            "version": "1.0.0",
            "tools_available": tool_count,
            "capabilities": ["tools", "resources", "server-sent-events"],
        }
    except Exception as e:
        logger.error(f"Failed to get status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get status: {e}")
