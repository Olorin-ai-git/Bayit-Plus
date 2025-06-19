#!/bin/bash

# Olorin Service Startup Script
# This script starts the frontend, backend, and MCP server

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/back"
FRONTEND_DIR="$SCRIPT_DIR/front"
LOG_DIR="$SCRIPT_DIR/logs"

# Default ports
BACKEND_PORT=8000
FRONTEND_PORT=3000
MCP_PORT=8001

# PID files for process management
BACKEND_PID_FILE="$LOG_DIR/backend.pid"
FRONTEND_PID_FILE="$LOG_DIR/frontend.pid"
MCP_PID_FILE="$LOG_DIR/mcp.pid"

# Log files
BACKEND_LOG="$LOG_DIR/backend.log"
FRONTEND_LOG="$LOG_DIR/frontend.log"
MCP_LOG="$LOG_DIR/mcp.log"

# Create logs directory
mkdir -p "$LOG_DIR"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} ✅ $1"
}

print_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} ❌ $1"
}

print_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} ⚠️  $1"
}

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to kill process by PID file
kill_by_pid_file() {
    local pid_file=$1
    local service_name=$2
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            print_status "Stopping $service_name (PID: $pid)..."
            kill "$pid"
            sleep 2
            if kill -0 "$pid" 2>/dev/null; then
                print_warning "Force killing $service_name..."
                kill -9 "$pid"
            fi
        fi
        rm -f "$pid_file"
    fi
}

# Function to cleanup on exit
cleanup() {
    print_status "Shutting down services..."
    kill_by_pid_file "$BACKEND_PID_FILE" "Backend"
    kill_by_pid_file "$FRONTEND_PID_FILE" "Frontend"
    kill_by_pid_file "$MCP_PID_FILE" "MCP Server"
    print_success "All services stopped"
    exit 0
}

# Function to start backend
start_backend() {
    print_status "Starting Backend server..."
    
    if check_port $BACKEND_PORT; then
        print_warning "Port $BACKEND_PORT is already in use. Skipping backend startup."
        return 1
    fi
    
    if [ ! -d "$BACKEND_DIR" ]; then
        print_error "Backend directory not found: $BACKEND_DIR"
        return 1
    fi
    
    cd "$BACKEND_DIR"
    
    # Check if poetry is available
    if ! command -v poetry &> /dev/null; then
        print_error "Poetry not found. Please install Poetry first."
        return 1
    fi
    
    # Check if pyproject.toml exists
    if [ ! -f "pyproject.toml" ]; then
        print_error "pyproject.toml not found in $BACKEND_DIR"
        return 1
    fi
    
    # Start backend server with console output
    print_status "Backend output (log level: ERROR):"
    poetry run uvicorn app.main:app --host 0.0.0.0 --port $BACKEND_PORT --reload --log-level error 2>&1 | sed "s/^/$(printf '\033[0;34m')[BACKEND] /" | sed "s/$/$(printf '\033[0m')/" &
    local backend_pid=$!
    echo $backend_pid > "$BACKEND_PID_FILE"
    
    # Wait a moment and check if the process is still running
    sleep 3
    if kill -0 $backend_pid 2>/dev/null; then
        print_success "Backend server started (PID: $backend_pid, Port: $BACKEND_PORT)"
        return 0
    else
        print_error "Backend server failed to start."
        return 1
    fi
}

# Function to start MCP server
start_mcp() {
    print_status "Starting MCP server..."
    
    if [ ! -d "$BACKEND_DIR" ]; then
        print_error "Backend directory not found: $BACKEND_DIR"
        return 1
    fi
    
    cd "$BACKEND_DIR"
    
    # Start MCP server with console output
    print_status "MCP server output (log level: ERROR):"
    LOG_LEVEL=ERROR poetry run python -m app.mcp_server.cli 2>&1 | sed "s/^/$(printf '\033[0;32m')[MCP] /" | sed "s/$/$(printf '\033[0m')/" &
    local mcp_pid=$!
    echo $mcp_pid > "$MCP_PID_FILE"
    
    # Wait a moment and check if the process is still running
    sleep 3
    if kill -0 $mcp_pid 2>/dev/null; then
        print_success "MCP server started (PID: $mcp_pid)"
        return 0
    else
        print_error "MCP server failed to start."
        return 1
    fi
}

# Function to start frontend
start_frontend() {
    print_status "Starting Frontend server..."
    
    if check_port $FRONTEND_PORT; then
        print_warning "Port $FRONTEND_PORT is already in use. Skipping frontend startup."
        return 1
    fi
    
    if [ ! -d "$FRONTEND_DIR" ]; then
        print_error "Frontend directory not found: $FRONTEND_DIR"
        return 1
    fi
    
    cd "$FRONTEND_DIR"
    
    # Check if npm is available
    if ! command -v npm &> /dev/null; then
        print_error "npm not found. Please install Node.js and npm first."
        return 1
    fi
    
    # Check if package.json exists
    if [ ! -f "package.json" ]; then
        print_error "package.json not found in $FRONTEND_DIR"
        return 1
    fi
    
    # Install dependencies if node_modules doesn't exist
    if [ ! -d "node_modules" ]; then
        print_status "Installing frontend dependencies..."
        npm install
    fi
    
    # Start frontend server with console output
    print_status "Frontend output (showing errors and warnings):"
    # Filter npm output to show only errors and warnings
    npm start 2>&1 | grep -E "(ERROR|WARNING|Failed|Error|error|warn|Warning)" | sed "s/^/$(printf '\033[0;36m')[FRONTEND] /" | sed "s/$/$(printf '\033[0m')/" &
    local frontend_pid=$!
    echo $frontend_pid > "$FRONTEND_PID_FILE"
    
    # Wait a moment and check if the process is still running
    sleep 5
    if kill -0 $frontend_pid 2>/dev/null; then
        print_success "Frontend server started (PID: $frontend_pid, Port: $FRONTEND_PORT)"
        return 0
    else
        print_error "Frontend server failed to start."
        return 1
    fi
}

# Function to check service status
check_status() {
    print_status "Checking service status..."
    
    # Check backend
    if [ -f "$BACKEND_PID_FILE" ]; then
        local backend_pid=$(cat "$BACKEND_PID_FILE")
        if kill -0 "$backend_pid" 2>/dev/null; then
            print_success "Backend running (PID: $backend_pid, Port: $BACKEND_PORT)"
        else
            print_error "Backend not running"
        fi
    else
        print_error "Backend not started"
    fi
    
    # Check MCP
    if [ -f "$MCP_PID_FILE" ]; then
        local mcp_pid=$(cat "$MCP_PID_FILE")
        if kill -0 "$mcp_pid" 2>/dev/null; then
            print_success "MCP server running (PID: $mcp_pid)"
        else
            print_error "MCP server not running"
        fi
    else
        print_error "MCP server not started"
    fi
    
    # Check frontend
    if [ -f "$FRONTEND_PID_FILE" ]; then
        local frontend_pid=$(cat "$FRONTEND_PID_FILE")
        if kill -0 "$frontend_pid" 2>/dev/null; then
            print_success "Frontend running (PID: $frontend_pid, Port: $FRONTEND_PORT)"
        else
            print_error "Frontend not running"
        fi
    else
        print_error "Frontend not started"
    fi
}

# Function to show usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo "       npm run olorin"
    echo ""
    echo "Options:"
    echo "  start     Start all services (default)"
    echo "  stop      Stop all services"
    echo "  restart   Restart all services"
    echo "  status    Check service status"
    echo "  logs      Show logs info"
    echo "  --help    Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  BACKEND_PORT   Backend server port (default: 8000)"
    echo "  FRONTEND_PORT  Frontend server port (default: 3000)"
    echo ""
    echo "Note: Console output shows ERROR level logs from all services"
    echo "      Backend logs in Blue, MCP logs in Green, Frontend logs in Cyan"
}

# Function to show logs
show_logs() {
    print_status "Logs are displayed in the console during service execution."
    print_status "To see logs, run: npm run olorin"
    print_status "Console shows ERROR level logs from all services:"
    echo -e "  - ${BLUE}Backend server${NC} (uvicorn) with --log-level error"
    echo -e "  - ${GREEN}MCP server${NC} with LOG_LEVEL=ERROR"
    echo -e "  - ${CYAN}Frontend server${NC} filtered for errors and warnings"
}

# Main execution
main() {
    local command=${1:-start}
    
    case $command in
        start)
            print_status "Starting Olorin services..."
            print_status "Console output will show ERROR level logs from all services"
            echo -e "  ${BLUE}■ Backend${NC} (Blue) - ${GREEN}■ MCP${NC} (Green) - ${CYAN}■ Frontend${NC} (Cyan)"
            echo ""
            
            # Set up signal handlers
            trap cleanup SIGINT SIGTERM
            
            # Start services (continue even if one fails)
            start_backend || true
            start_mcp || true
            start_frontend || true
            
            print_success "All services started successfully!"
            print_status "URLs:"
            print_status "  Frontend: http://localhost:$FRONTEND_PORT"
            print_status "  Backend:  http://localhost:$BACKEND_PORT"
            print_status "  API Docs: http://localhost:$BACKEND_PORT/docs"
            print_status ""
            print_status "Press Ctrl+C to stop all services"
            
            # Wait for interrupt
            while true; do
                sleep 1
            done
            ;;
        stop)
            cleanup
            ;;
        restart)
            cleanup
            sleep 2
            main start
            ;;
        status)
            check_status
            ;;
        logs)
            show_logs
            ;;
        --help|-h)
            usage
            ;;
        *)
            print_error "Unknown command: $command"
            usage
            exit 1
            ;;
    esac
}

# Check if script is being sourced or executed
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi 