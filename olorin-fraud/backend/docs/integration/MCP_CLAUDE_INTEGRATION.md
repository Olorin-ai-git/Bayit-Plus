# MCP Claude Desktop Integration

## Overview

The Olorin MCP (Model Context Protocol) integration allows investigators to interact with Claude Desktop using natural language while having access to all Olorin investigation tools. This creates a powerful AI-assisted investigation workflow where Claude can directly execute Splunk queries, analyze user data, search the web, and more.
?????against Splunk
- **SplunkQueryTool**: Execute SPL queries ?against Splunk
- **OIITool**: Query Olorin Identity Intelligence for user data
- **DITool**: Access Data Intelligence services

### General Investigation Tools
- **DatabaseQueryTool**: Execute SQL queries
- **DatabaseSchemaTool**: Explore database schemas
- **WebSearchTool**: Search the internet using multiple engines
- **WebScrapeTool**: Extract content from web pages
- **FileReadTool**: Read files from the file system
- **FileWriteTool**: Write files to the file system
- **DirectoryListTool**: List directory contents
- **FileSearchTool**: Search for files by name/pattern
- **HTTPRequestTool**: Make HTTP requests to APIs
- **JSONAPITool**: Interact with JSON APIs
- **VectorSearchTool**: Perform vector similarity searches

## Setup Instructions

### 1. Install Claude Desktop
- Download from https://claude.ai/download
- Install and create an account

### 2. Start Olorin MCP Server
```bash
cd olorin/back
poetry run python -m app.mcp_server.cli
```

### 3. Configure Claude Desktop
Add to Claude Desktop's MCP configuration:
```json
{
  "mcpServers": {
    "olorin": {
      "command": "poetry",
      "args": ["run", "python", "-m", "app.mcp_server.cli"],
      "cwd": "/absolute/path/to/olorin/back"
    }
  }
}
```

### 4. Restart Claude Desktop
- Close Claude Desktop completely
- Reopen Claude Desktop
- Verify tools are available by asking: "What tools do you have?"

## Usage Examples

### Log Analysis
```
Investigator: "Search Splunk logs for failed login attempts from IP 192.168.1.100 in the last 24 hours"

Claude: I'll search the Splunk logs for failed login attempts from that IP address.
[Executes SplunkQueryTool with appropriate SPL query]
[Returns results and analysis]
```

### User Investigation
```
Investigator: "Get detailed information about user ID 12345 including their recent activity"

Claude: I'll retrieve comprehensive user information for user ID 12345.
[Executes OIITool to get user identity data]
[May also execute DatabaseQueryTool for activity logs]
[Provides comprehensive user analysis]
```

### Threat Intelligence
```
Investigator: "Search for recent information about CVE-2024-1234 and check if we're vulnerable"

Claude: I'll search for information about this CVE and help assess your vulnerability.
[Executes WebSearchTool for CVE information]
[May execute DatabaseQueryTool to check system versions]
[Provides threat assessment and recommendations]
```

## Frontend Integration

The Olorin frontend includes an MCP integration page (`/mcp`) with:

- **Setup Guide**: Step-by-step instructions for configuring Claude Desktop
- **Chat Interface**: Simulated Claude Desktop interaction for testing
- **Tool Execution**: Direct tool testing and configuration
- **Execution History**: View past tool executions and results

## Security Considerations

### Tool Access Control
- Tools are configured with appropriate security restrictions
- File system tools are restricted to safe directories
- Database tools use read-only connections where possible
- Web tools respect rate limits and user agents

### Data Protection
- All tool executions are logged for audit purposes
- Sensitive data is handled according to security policies
- MCP communication uses secure protocols

### Environment Configuration
Configure security settings via environment variables:
```bash
MCP_ENABLE_WEB_TOOLS=true
MCP_ENABLE_FILE_TOOLS=false
MCP_FILE_SYSTEM_BASE_PATH=/safe/directory
MCP_DATABASE_READ_ONLY=true
```

## Troubleshooting

### Common Issues

1. **Claude Desktop doesn't see tools**
   - Verify MCP server is running
   - Check Claude Desktop configuration path
   - Restart Claude Desktop completely

2. **Tool execution fails**
   - Check tool-specific dependencies
   - Verify environment variables
   - Review MCP server logs

3. **Connection issues**
   - Ensure Poetry environment is activated
   - Check file permissions
   - Verify working directory path

### Debugging

Enable debug logging:
```bash
export MCP_LOG_LEVEL=DEBUG
poetry run python -m app.mcp_server.cli
```

Check MCP server health:
```bash
curl http://localhost:8001/health
```

## Development

### Adding New Tools
1. Create tool class inheriting from `BaseTool`
2. Register in `tool_registry.py`
3. Update MCP server configuration
4. Test with Claude Desktop

### Testing
- Use the frontend MCP page for tool testing
- Test individual tools via the tool execution interface
- Verify Claude Desktop integration end-to-end

## Best Practices

### For Investigators
- Be specific in your requests to Claude
- Review tool execution results carefully
- Use the execution history for audit trails
- Combine multiple tools for comprehensive analysis

### For Developers
- Follow security best practices for tool implementation
- Provide clear tool descriptions and schemas
- Handle errors gracefully
- Log all tool executions for debugging

## Future Enhancements

- Real-time collaboration between investigators and Claude
- Advanced tool chaining and workflow automation
- Integration with additional AI assistants
- Enhanced security and access control features
- Custom tool development framework 