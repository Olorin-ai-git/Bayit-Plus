#!/bin/bash

# Start Olorin Server with Firebase Secrets
# This script handles secret retrieval and server startup

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="${FIREBASE_PROJECT_ID:-olorin-ai}"
PORT="${SERVER_PORT:-8000}"
LOG_LEVEL="${LOG_LEVEL:-info}"

# Function to print colored messages
print_status() {
    echo -e "${BLUE}[*]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Function to check if Firebase CLI is installed
check_firebase_cli() {
    if ! command -v firebase &> /dev/null; then
        print_error "Firebase CLI is not installed"
        print_status "Install it with: npm install -g firebase-tools"
        exit 1
    fi
    print_success "Firebase CLI found"
}

# Function to retrieve a secret from Firebase
get_secret() {
    local secret_name=$1
    local secret_value=$(firebase functions:secrets:access "$secret_name" --project "$PROJECT_ID" 2>/dev/null)
    echo "$secret_value"
}

# Function to retrieve all required secrets
retrieve_secrets() {
    print_status "Retrieving secrets from Firebase project: $PROJECT_ID"
    
    # Core secrets
    export JWT_SECRET_KEY=$(get_secret "JWT_SECRET_KEY")
    export ANTHROPIC_API_KEY=$(get_secret "ANTHROPIC_API_KEY")
    export OPENAI_API_KEY=$(get_secret "OPENAI_API_KEY")
    export OLORIN_API_KEY=$(get_secret "OLORIN_API_KEY")
    
    # Database secrets
    export DATABASE_PASSWORD=$(get_secret "DATABASE_PASSWORD")
    export REDIS_API_KEY=$(get_secret "REDIS_API_KEY")
    
    # Splunk secrets
    export SPLUNK_USERNAME=$(get_secret "SPLUNK_USERNAME")
    export SPLUNK_PASSWORD=$(get_secret "SPLUNK_PASSWORD")
    
    # Additional secrets (optional)
    export LANGFUSE_PUBLIC_KEY=$(get_secret "LANGFUSE_PUBLIC_KEY")
    export LANGFUSE_SECRET_KEY=$(get_secret "LANGFUSE_SECRET_KEY")
    export DATABRICKS_TOKEN=$(get_secret "DATABRICKS_TOKEN")
    
    # Validate critical secrets
    local missing_critical=false
    
    if [ -z "$JWT_SECRET_KEY" ]; then
        print_warning "JWT_SECRET_KEY not found, generating temporary key"
        export JWT_SECRET_KEY=$(openssl rand -base64 64)
    else
        print_success "JWT_SECRET_KEY retrieved"
    fi
    
    if [ -z "$ANTHROPIC_API_KEY" ]; then
        print_warning "ANTHROPIC_API_KEY not found - some features may not work"
    else
        print_success "ANTHROPIC_API_KEY retrieved"
    fi
    
    if [ -z "$OPENAI_API_KEY" ]; then
        print_warning "OPENAI_API_KEY not found - some features may not work"
    else
        print_success "OPENAI_API_KEY retrieved"
    fi
    
    print_success "Secrets loaded successfully"
}

# Function to check if server is already running
check_existing_server() {
    if lsof -i :$PORT > /dev/null 2>&1; then
        print_warning "Port $PORT is already in use"
        read -p "Kill existing process? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            local pid=$(lsof -t -i:$PORT)
            kill -9 $pid
            print_success "Killed process on port $PORT"
            sleep 2
        else
            print_error "Cannot start server - port is in use"
            exit 1
        fi
    fi
}

# Function to start the server
start_server() {
    print_status "Starting Olorin server on port $PORT with log level: $LOG_LEVEL"
    
    # Set additional environment variables
    export BACKEND_PORT=$PORT
    export LOG_LEVEL=$LOG_LEVEL
    export ENVIRONMENT="local"
    
    # Start the server
    print_success "Server starting..."
    echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}   Olorin Server - Running on http://localhost:$PORT${NC}"
    echo -e "${GREEN}   API Docs: http://localhost:$PORT/docs${NC}"
    echo -e "${GREEN}   Health: http://localhost:$PORT/health${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
    
    # Run the server
    poetry run python -m app.local_server
}

# Function to display usage
usage() {
    echo "Usage: $0 [options]"
    echo "Options:"
    echo "  -p, --port PORT          Server port (default: 8000)"
    echo "  -l, --log-level LEVEL    Log level (debug|info|warning|error) (default: info)"
    echo "  -s, --skip-secrets       Skip secret retrieval (use existing environment)"
    echo "  -h, --help              Show this help message"
    exit 0
}

# Parse command line arguments
SKIP_SECRETS=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--port)
            PORT="$2"
            shift 2
            ;;
        -l|--log-level)
            LOG_LEVEL="$2"
            shift 2
            ;;
        -s|--skip-secrets)
            SKIP_SECRETS=true
            shift
            ;;
        -h|--help)
            usage
            ;;
        *)
            print_error "Unknown option: $1"
            usage
            ;;
    esac
done

# Main execution
main() {
    print_status "Olorin Server Startup Script"
    echo "════════════════════════════════════════════"
    
    # Check Firebase CLI
    if [ "$SKIP_SECRETS" = false ]; then
        check_firebase_cli
        retrieve_secrets
    else
        print_warning "Skipping secret retrieval - using existing environment"
    fi
    
    # Check for existing server
    check_existing_server
    
    # Start the server
    start_server
}

# Run main function
main