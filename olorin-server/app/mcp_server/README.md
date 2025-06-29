# Olorin MCP Server

The Olorin MCP (Model Context Protocol) Server provides AI assistants and other MCP clients with access to LangGraph agents and a comprehensive set of LangChain tools.

## Features

### 🛠️ **Tools Available**
- **Database Tools**: Query and inspect SQL databases
- **Web Tools**: Search the web and scrape web pages
- **File System Tools**: Read, write, list, and search files
- **API Tools**: Make HTTP requests and interact with REST APIs
- **Search Tools**: Vector-based similarity search

### 🤖 **Agent Integration**
- Access to LangGraph agent capabilities
- Support for different agent types (research, API integration, data analysis)
- OpenAI and other LLM provider integration
- Langfuse tracing support

### 🔒 **Security Features**
- Configurable file system access restrictions
- Rate limiting
- CORS support
- Request size limits

## Installation

1. **Install Dependencies**:
   ```bash
   cd back
   poetry install
   ```

2. **Set Environment Variables** (optional):
   ```bash
   export OPENAI_API_KEY="your-openai-api-key"
   export MCP_ENABLE_DATABASE_TOOLS="true"
   export MCP_DATABASE_CONNECTION_STRING="sqlite:///./data.db"
   export MCP_FILE_SYSTEM_BASE_PATH="/safe/directory"
   ```

## Usage

### Running the Server

#### Option 1: Direct CLI
```bash
cd back
poetry run python -m app.mcp_server.cli --config-from-env
```

#### Option 2: With CLI Arguments
```bash
cd back
poetry run python -m app.mcp_server.cli \
  --enable-database-tools \
  --database-connection-string "sqlite:///./data.db" \
  --file-system-base-path "/safe/directory" \
  --log-level INFO
```

### Configuration with MCP Client

Add to your MCP client configuration (e.g., Claude Desktop, Continue, etc.):

```json
{
  "mcpServers": {
    "olorin": {
      "command": "python",
      "args": ["-m", "app.mcp_server.cli", "--config-from-env"],
      "cwd": "/path/to/olorin/back",
      "env": {
        "MCP_SERVER_NAME": "olorin-mcp-server",
        "MCP_ENABLE_WEB_TOOLS": "true",
        "MCP_ENABLE_FILE_SYSTEM_TOOLS": "true",
        "MCP_ENABLE_API_TOOLS": "true",
        "MCP_ENABLE_AGENTS": "true",
        "MCP_LOG_LEVEL": "INFO",
        "OPENAI_API_KEY": "your-openai-api-key-here"
      }
    }
  }
}
```

## Available Tools

### Database Tools
- `database_query`: Execute SQL queries with safety features
- `database_schema`: Inspect database structure and schemas

### Web Tools
- `web_search`: Search the web using multiple search engines
- `web_scrape`: Extract content from web pages

### File System Tools
- `file_read`: Read file contents with encoding support
- `file_write`: Write content to files
- `directory_list`: List directory contents with filtering
- `file_search`: Search for text within files

### API Tools
- `http_request`: Make generic HTTP requests
- `json_api`: Interact with JSON-based REST APIs

### Search Tools
- `vector_search`: Perform vector-based similarity search

## Available Resources

### Tool Registry Summary
- **URI**: `olorin://tools/summary`
- **Description**: Complete overview of all available tools organized by category

### Server Configuration
- **URI**: `olorin://config`
- **Description**: Current server configuration (sensitive data masked)

### Agent Capabilities
- **URI**: `olorin://agents/capabilities`
- **Description**: Available LangGraph agent types and capabilities

## Configuration Options

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MCP_SERVER_NAME` | Name of the MCP server | `olorin-mcp-server` |
| `MCP_SERVER_VERSION` | Server version | `1.0.0` |
| `MCP_ENABLE_DATABASE_TOOLS` | Enable database tools | `false` |
| `MCP_DATABASE_CONNECTION_STRING` | Database connection string | `None` |
| `MCP_ENABLE_WEB_TOOLS` | Enable web tools | `true` |
| `MCP_WEB_USER_AGENT` | User agent for web requests | `None` |
| `MCP_ENABLE_FILE_SYSTEM_TOOLS` | Enable file system tools | `true` |
| `MCP_FILE_SYSTEM_BASE_PATH` | Restrict file access to path | `None` |
| `MCP_ENABLE_API_TOOLS` | Enable API tools | `true` |
| `MCP_ENABLE_AGENTS` | Enable agent resources | `true` |
| `OPENAI_API_KEY` | OpenAI API key | `None` |
| `LANGFUSE_API_KEY` | Langfuse API key | `None` |
| `MCP_LOG_LEVEL` | Logging level | `INFO` |

### CLI Options

```bash
python -m app.mcp_server.cli --help
```

## Examples

### Using Tools via MCP Client

Once connected to an MCP client, you can use the tools:

```
# Search the web
Use the web_search tool to find information about "LangGraph tutorial"

# Read a file
Use the file_read tool to read the contents of "config.json"

# Query a database (if enabled)
Use the database_query tool to run "SELECT * FROM users LIMIT 5"

# Make an API request
Use the http_request tool to GET data from "https://api.github.com/repos/microsoft/vscode"

# List directory contents
Use the directory_list tool to list files in the current directory
```

### Accessing Resources

```
# Get tool summary
Read the resource "olorin://tools/summary" to see all available tools

# Check server configuration
Read the resource "olorin://config" to see current settings

# View agent capabilities
Read the resource "olorin://agents/capabilities" to see what agents are available
```

## Security Considerations

1. **File System Access**: Use `MCP_FILE_SYSTEM_BASE_PATH` to restrict file operations to a specific directory
2. **Database Access**: Only enable database tools when needed and use appropriate connection strings
3. **API Keys**: Store sensitive API keys in environment variables, not in configuration files
4. **Rate Limiting**: The server includes built-in rate limiting to prevent abuse

## Troubleshooting

### Common Issues

1. **Tool Not Found**: Check that the required tool category is enabled in configuration
2. **Database Connection Error**: Verify the database connection string and credentials
3. **File Access Denied**: Check file permissions and base path configuration
4. **API Rate Limits**: Monitor usage and adjust rate limiting settings

### Debugging

Enable debug logging:
```bash
export MCP_LOG_LEVEL="DEBUG"
```

Or use CLI:
```bash
python -m app.mcp_server.cli --log-level DEBUG
```

## Development

### Adding New Tools

1. Create your tool following the LangChain BaseTool interface
2. Add it to the appropriate tool category in `tool_registry.py`
3. The MCP server will automatically expose it

### Extending Resources

Add new resources by extending the `read_resource` handler in `server.py`

## Integration Examples

### Claude Desktop
Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "olorin": {
      "command": "python",
      "args": ["-m", "app.mcp_server.cli", "--config-from-env"],
      "cwd": "/path/to/olorin/back",
      "env": {
        "OPENAI_API_KEY": "your-key-here",
        "MCP_ENABLE_WEB_TOOLS": "true"
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
      "cwd": "/path/to/olorin/back"
    }
  }
}
```

## License

This MCP server is part of the Olorin project. See the main project license for details. 