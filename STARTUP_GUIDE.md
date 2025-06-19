# Olorin Startup Guide

This guide explains how to use the startup scripts to launch all Olorin services (frontend, backend, and MCP server) with a single command.

## Available Scripts

### 1. Shell Script (start_olorin.sh)
- **Platform**: Linux, macOS, WSL
- **Requirements**: Bash shell, Poetry, Node.js/npm
- **Best for**: Unix-like systems

### 2. Python Script (start_olorin.py)
- **Platform**: Cross-platform (Windows, Linux, macOS)
- **Requirements**: Python 3.7+, Poetry, Node.js/npm
- **Best for**: Windows or when you prefer Python

## Quick Start

### Using Shell Script (Recommended for macOS/Linux)
```bash
# Make executable (first time only)
chmod +x start_olorin.sh

# Start all services
./start_olorin.sh

# Or with specific command
./start_olorin.sh start
```

### Using Python Script (Cross-platform)
```bash
# Start all services
python3 start_olorin.py

# Or make executable and run directly
chmod +x start_olorin.py
./start_olorin.py
```

## Commands

Both scripts support the same commands:

| Command | Description |
|---------|-------------|
| `start` | Start all services (default) |
| `stop` | Stop all services |
| `restart` | Restart all services |
| `status` | Check service status |
| `logs` | Show recent logs from all services |
| `config` | Generate Claude Desktop configuration (Python script only) |

### Examples

```bash
# Start all services
./start_olorin.sh start

# Check status
./start_olorin.sh status

# View logs
./start_olorin.sh logs

# Stop all services
./start_olorin.sh stop

# Restart all services
./start_olorin.sh restart
```

## Service Details

### Backend Server
- **Port**: 8000 (configurable via `BACKEND_PORT` env var)
- **URL**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Technology**: FastAPI with Uvicorn
- **Log File**: `logs/backend.log`

### Frontend Server
- **Port**: 3000 (configurable via `FRONTEND_PORT` env var)
- **URL**: http://localhost:3000
- **Technology**: React with Create React App
- **Log File**: `logs/frontend.log`

### MCP Server
- **Protocol**: stdio (for Claude Desktop integration)
- **Purpose**: Exposes Olorin tools to AI assistants
- **Log File**: `logs/mcp.log`

## Environment Variables

You can customize ports and other settings using environment variables:

```bash
# Custom ports
export BACKEND_PORT=8080
export FRONTEND_PORT=3001
export MCP_PORT=8002

# Start with custom ports
./start_olorin.sh start
```

## Prerequisites

### 1. Python Dependencies (Backend)
```bash
cd back
poetry install
```

### 2. Node.js Dependencies (Frontend)
```bash
cd front
npm install
```

### 3. System Requirements
- **Poetry**: For Python dependency management
- **Node.js & npm**: For frontend development
- **Python 3.7+**: For the Python startup script

## Process Management

### PID Files
The scripts create PID files in the `logs/` directory:
- `logs/backend.pid`
- `logs/frontend.pid`
- `logs/mcp.pid`

### Log Files
All service logs are stored in the `logs/` directory:
- `logs/backend.log`
- `logs/frontend.log`
- `logs/mcp.log`

### Graceful Shutdown
- Press `Ctrl+C` to stop all services gracefully
- The scripts handle SIGINT and SIGTERM signals
- Services are stopped in the correct order

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```
   Port 8000 is already in use. Skipping backend startup.
   ```
   **Solution**: Stop the existing service or use a different port
   ```bash
   export BACKEND_PORT=8080
   ./start_olorin.sh start
   ```

2. **Poetry Not Found**
   ```
   Poetry not found. Please install Poetry first.
   ```
   **Solution**: Install Poetry
   ```bash
   curl -sSL https://install.python-poetry.org | python3 -
   ```

3. **npm Not Found**
   ```
   npm not found. Please install Node.js and npm first.
   ```
   **Solution**: Install Node.js from https://nodejs.org/

4. **Service Failed to Start**
   ```
   Backend server failed to start. Check logs: logs/backend.log
   ```
   **Solution**: Check the log file for specific error messages
   ```bash
   ./start_olorin.sh logs
   ```

### Debugging

1. **Check Service Status**
   ```bash
   ./start_olorin.sh status
   ```

2. **View Recent Logs**
   ```bash
   ./start_olorin.sh logs
   ```

3. **View Specific Service Logs**
   ```bash
   tail -f logs/backend.log
   tail -f logs/frontend.log
   tail -f logs/mcp.log
   ```

4. **Check Port Usage**
   ```bash
   # Check if port is in use
   lsof -i :8000  # Backend
   lsof -i :3000  # Frontend
   ```

## Claude Desktop Integration

### Generate Configuration
The Python script can generate a Claude Desktop configuration file:

```bash
python3 start_olorin.py config
```

This creates `claude_desktop_config.json` with the correct paths.

### Manual Configuration
Add this to your Claude Desktop settings:

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

## Development Workflow

### 1. Initial Setup
```bash
# Clone repository
git clone <repository-url>
cd olorin

# Install dependencies
cd back && poetry install && cd ..
cd front && npm install && cd ..

# Make scripts executable
chmod +x start_olorin.sh start_olorin.py
```

### 2. Daily Development
```bash
# Start all services
./start_olorin.sh start

# Work on your code...
# Services will auto-reload on changes

# Stop when done
./start_olorin.sh stop
```

### 3. Testing
```bash
# Check if everything is running
./start_olorin.sh status

# View logs for debugging
./start_olorin.sh logs
```

## Advanced Usage

### Running Individual Services

If you need to run services individually:

```bash
# Backend only
cd back
poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Frontend only
cd front
npm start

# MCP server only
cd back
poetry run python -m app.mcp_server.cli
```

### Custom Configuration

Create a `.env` file in the project root:
```bash
BACKEND_PORT=8080
FRONTEND_PORT=3001
MCP_PORT=8002
```

### Production Deployment

For production, you might want to:
1. Use `--no-reload` for the backend
2. Build the frontend with `npm run build`
3. Use a process manager like PM2 or systemd

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review the log files in the `logs/` directory
3. Ensure all prerequisites are installed
4. Check that ports are not in use by other services

## Script Features

### Shell Script Features
- ✅ Colored output with timestamps
- ✅ Process management with PID files
- ✅ Port conflict detection
- ✅ Graceful shutdown handling
- ✅ Log file management
- ✅ Service status checking
- ✅ Automatic dependency installation

### Python Script Features
- ✅ All shell script features
- ✅ Cross-platform compatibility
- ✅ Better error handling
- ✅ Claude Desktop config generation
- ✅ Process monitoring
- ✅ Automatic service restart on failure

Choose the script that best fits your platform and preferences! 