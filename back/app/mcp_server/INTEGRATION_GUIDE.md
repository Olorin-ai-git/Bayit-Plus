# Olorin MCP Server Integration Guide

This guide shows you how to integrate the Olorin MCP Server with various AI assistants and development tools.

## Quick Start

### 1. Basic Usage
```bash
cd back
poetry run python -m app.mcp_server.cli
```

### 2. With Environment Configuration
```bash
export OPENAI_API_KEY="your-api-key"
export MCP_ENABLE_WEB_TOOLS="true"
export MCP_FILE_SYSTEM_BASE_PATH="/safe/directory"
poetry run python -m app.mcp_server.cli --config-from-env
```

## Client Integrations

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or equivalent:

```json
{
  "mcpServers": {
    "olorin": {
      "command": "python",
      "args": ["-m", "app.mcp_server.cli", "--config-from-env"],
      "cwd": "/path/to/olorin/back",
      "env": {
        "MCP_SERVER_NAME": "olorin-langraph-tools",
        "MCP_ENABLE_WEB_TOOLS": "true",
        "MCP_ENABLE_FILE_SYSTEM_TOOLS": "true",
        "MCP_ENABLE_API_TOOLS": "true",
        "MCP_FILE_SYSTEM_BASE_PATH": "/Users/yourname/Documents",
        "OPENAI_API_KEY": "your-openai-api-key-here"
      }
    }
  }
}
```

### Continue VSCode Extension

Add to your Continue configuration:

```json
{
  "mcpServers": {
    "olorin": {
      "command": "python",
      "args": ["-m", "app.mcp_server.cli"],
      "cwd": "/path/to/olorin/back",
      "env": {
        "MCP_ENABLE_WEB_TOOLS": "true",
        "MCP_ENABLE_API_TOOLS": "true"
      }
    }
  }
}
```

### Cursor IDE

Similar to Continue, add to Cursor's MCP configuration:

```json
{
  "mcpServers": {
    "olorin-tools": {
      "command": "python",
      "args": ["-m", "app.mcp_server.cli", "--log-level", "INFO"],
      "cwd": "/path/to/olorin/back"
    }
  }
}
```

### Cline (formerly Claude Dev)

Add to Cline's settings:

```json
{
  "mcpServers": {
    "olorin": {
      "command": "python",
      "args": ["-m", "app.mcp_server.cli"],
      "cwd": "/path/to/olorin/back"
    }
  }
}
```

## Available Tools

Once connected, you'll have access to these tools:

### Web Tools
- **web_search**: Search the web using DuckDuckGo and other engines
- **web_scrape**: Extract content from web pages

### File System Tools
- **file_read**: Read file contents with encoding support
- **file_write**: Write content to files with safety features
- **directory_list**: List directory contents with filtering
- **file_search**: Search for text within files

### API Tools
- **http_request**: Make generic HTTP requests
- **json_api**: Interact with JSON REST APIs with authentication

### Database Tools (when enabled)
- **database_query**: Execute SQL queries safely
- **database_schema**: Inspect database structure

### Search Tools
- **vector_search**: Perform vector similarity search

## Example Usage in AI Assistants

### Web Research
```
Use the web_search tool to find the latest information about "LangGraph 2024 updates"
```

### File Operations
```
Use the file_read tool to read the contents of "config.json" and then use the file_write tool to create a backup copy
```

### API Integration
```
Use the json_api tool to GET data from "https://api.github.com/repos/microsoft/vscode" and show me the repository information
```

### Directory Exploration
```
Use the directory_list tool to show me all Python files in the current directory recursively
```

### Text Search
```
Use the file_search tool to find all occurrences of "TODO" in Python files in the current directory
```

## Configuration Options

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MCP_SERVER_NAME` | Server name | `olorin-mcp-server` |
| `MCP_ENABLE_WEB_TOOLS` | Enable web tools | `true` |
| `MCP_ENABLE_FILE_SYSTEM_TOOLS` | Enable file tools | `true` |
| `MCP_ENABLE_API_TOOLS` | Enable API tools | `true` |
| `MCP_ENABLE_DATABASE_TOOLS` | Enable database tools | `false` |
| `MCP_FILE_SYSTEM_BASE_PATH` | Restrict file access | None |
| `MCP_DATABASE_CONNECTION_STRING` | Database connection | None |
| `OPENAI_API_KEY` | OpenAI API key | None |
| `MCP_LOG_LEVEL` | Logging level | `INFO` |

### Security Settings

1. **File System Security**: Set `MCP_FILE_SYSTEM_BASE_PATH` to restrict file operations to a specific directory
2. **Database Security**: Only enable database tools when needed
3. **API Keys**: Store in environment variables, never in config files

### Advanced Configuration

For production use:

```bash
export MCP_SERVER_NAME="production-olorin-mcp"
export MCP_ENABLE_DATABASE_TOOLS="true"
export MCP_DATABASE_CONNECTION_STRING="postgresql://user:pass@localhost/db"
export MCP_FILE_SYSTEM_BASE_PATH="/app/data"
export MCP_LOG_LEVEL="WARNING"
export MCP_RATE_LIMIT_REQUESTS="50"
```

## Troubleshooting

### Common Issues

1. **Server won't start**: Check Python path and dependencies
   ```bash
   cd back && poetry install
   ```

2. **Tools not available**: Verify environment variables and permissions
   ```bash
   poetry run python -c "from app.service.agent.tools.tool_registry import initialize_tools; initialize_tools(); print('✅ Tools OK')"
   ```

3. **File access denied**: Check base path configuration
   ```bash
   export MCP_FILE_SYSTEM_BASE_PATH="/safe/directory"
   ```

4. **Database connection failed**: Verify connection string
   ```bash
   export MCP_DATABASE_CONNECTION_STRING="sqlite:///./test.db"
   ```

### Debug Mode

Enable debug logging:
```bash
export MCP_LOG_LEVEL="DEBUG"
poetry run python -m app.mcp_server.cli --config-from-env
```

### Testing Connection

Test the server manually:
```bash
# In one terminal
poetry run python -m app.mcp_server.cli

# The server will start and wait for MCP client connections
```

## Integration Examples

### Research Assistant Setup
```json
{
  "mcpServers": {
    "olorin-research": {
      "command": "python",
      "args": ["-m", "app.mcp_server.cli"],
      "cwd": "/path/to/olorin/back",
      "env": {
        "MCP_SERVER_NAME": "research-assistant",
        "MCP_ENABLE_WEB_TOOLS": "true",
        "MCP_ENABLE_FILE_SYSTEM_TOOLS": "true",
        "MCP_FILE_SYSTEM_BASE_PATH": "/Users/researcher/documents"
      }
    }
  }
}
```

### Development Assistant Setup
```json
{
  "mcpServers": {
    "olorin-dev": {
      "command": "python",
      "args": ["-m", "app.mcp_server.cli"],
      "cwd": "/path/to/olorin/back",
      "env": {
        "MCP_SERVER_NAME": "dev-assistant",
        "MCP_ENABLE_API_TOOLS": "true",
        "MCP_ENABLE_FILE_SYSTEM_TOOLS": "true",
        "MCP_ENABLE_DATABASE_TOOLS": "true",
        "MCP_DATABASE_CONNECTION_STRING": "sqlite:///./dev.db"
      }
    }
  }
}
```

### Data Analysis Setup
```json
{
  "mcpServers": {
    "olorin-data": {
      "command": "python",
      "args": ["-m", "app.mcp_server.cli"],
      "cwd": "/path/to/olorin/back",
      "env": {
        "MCP_SERVER_NAME": "data-analyst",
        "MCP_ENABLE_DATABASE_TOOLS": "true",
        "MCP_ENABLE_API_TOOLS": "true",
        "MCP_DATABASE_CONNECTION_STRING": "postgresql://analyst:pass@localhost/analytics"
      }
    }
  }
}
```

## Resources Available

The MCP server also provides these resources:

- **olorin://tools/summary**: Complete tool overview
- **olorin://config**: Server configuration (sanitized)
- **olorin://agents/capabilities**: Available agent types

Access them by asking your AI assistant to "read the resource olorin://tools/summary"

## Performance Tips

1. **Selective Tool Loading**: Only enable tool categories you need
2. **File System Restrictions**: Use base path to limit file system access
3. **Connection Pooling**: The server reuses HTTP connections for better performance
4. **Logging**: Use INFO or WARNING level in production

## Next Steps

1. **Custom Tools**: Add your own tools to the tool registry
2. **Agent Integration**: Use with LangGraph agents for complex workflows
3. **Monitoring**: Set up logging and monitoring for production use
4. **Extensions**: Extend the server with additional resource types

For more information, see the main README.md file. 