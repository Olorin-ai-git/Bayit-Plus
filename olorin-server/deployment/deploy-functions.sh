#!/bin/bash

# Deployment Functions Library - Enhanced Cloud Run Deployment
# Reusable functions for deployment script
# Author: Gil Klainert
# Date: 2025-09-06

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "\n${BLUE}================================${NC}"
    echo -e "${BLUE} $1 ${NC}"
    echo -e "${BLUE}================================${NC}\n"
}

# Load and validate configuration from YAML
load_configuration() {
    local config_file="$1"
    
    if [[ ! -f "$config_file" ]]; then
        print_error "Configuration file not found: $config_file"
        return 1
    fi
    
    if ! command -v yq &> /dev/null; then
        print_warning "yq not found. Installing yq for YAML parsing..."
        install_yq
    fi
    
    # Export configuration variables
    SERVICE_NAME=$(yq eval '.service.name' "$config_file")
    REGION=$(yq eval '.service.region' "$config_file")
    PROJECT_ID=$(yq eval '.env_vars.FIREBASE_PROJECT_ID' "$config_file")
    MEMORY=$(yq eval '.service.memory' "$config_file")
    CPU=$(yq eval '.service.cpu' "$config_file")
    MIN_INSTANCES=$(yq eval '.service.min_instances' "$config_file")
    MAX_INSTANCES=$(yq eval '.service.max_instances' "$config_file")
    
    print_status "Configuration loaded from: $config_file"
    return 0
}

# Install yq tool for YAML parsing
install_yq() {
    if command -v snap &> /dev/null; then
        sudo snap install yq
    elif command -v brew &> /dev/null; then
        brew install yq
    else
        print_error "Cannot install yq. Please install manually: https://github.com/mikefarah/yq"
        return 1
    fi
}

# Validate Docker setup
validate_docker_setup() {
    local backend_dir="$1"
    
    if [[ ! -f "$backend_dir/pyproject.toml" ]]; then
        print_error "Backend directory structure invalid: $backend_dir"
        return 1
    fi
    
    if [[ ! -f "$backend_dir/Dockerfile" ]]; then
        print_error "Dockerfile not found: $backend_dir/Dockerfile"
        return 1
    fi
    
    if [[ ! -f "$backend_dir/.dockerignore" ]]; then
        print_error ".dockerignore not found - build context will be unoptimized"
        return 1
    fi
    
    print_success "✓ Docker setup validated"
    return 0
}

# Create deployment tracking entry
create_deployment_tracking() {
    local deployment_id="$1"
    local environment="$2"
    local service_name="$3"
    local deployment_log="$4"
    
    echo "$(date -u +"%Y-%m-%dT%H:%M:%SZ") | START | $deployment_id | $environment | $service_name" >> "$deployment_log"
    print_success "✓ Deployment tracking initialized: $deployment_id"
}

# Build environment variables file from config
build_env_vars_file() {
    local config_file="$1"
    local env_vars_file="$2"
    
    yq eval '.env_vars | to_entries | .[] | .key + ": " + (.value | tostring)' "$config_file" > "$env_vars_file"
    print_status "Environment variables configured from config"
}

# Build secrets configuration command
build_secrets_command() {
    local config_file="$1"
    local secrets_cmd_var="$2"
    
    local secrets_cmd=""
    if yq eval '.secrets // empty' "$config_file" | grep -q .; then
        while read -r secret; do
            name=$(echo "$secret" | yq eval '.name' -)
            version=$(echo "$secret" | yq eval '.version // "latest"' -)
            secrets_cmd="$secrets_cmd --set-secrets $name=$name:$version"
        done < <(yq eval '.secrets[]' "$config_file" -o json)
    fi
    
    # Use eval to set the variable in the calling context
    eval "$secrets_cmd_var=\"$secrets_cmd\""
    print_success "✓ Secrets configuration prepared"
}

# Log deployment result
log_deployment_result() {
    local status="$1"
    local deployment_id="$2"  
    local environment="$3"
    local service_name="$4"
    local deployment_log="$5"
    
    echo "$(date -u +"%Y-%m-%dT%H:%M:%SZ") | $status | $deployment_id | $environment | $service_name" >> "$deployment_log"
}

# Validate health endpoints
validate_health_endpoints() {
    local service_url="$1"
    
    print_status "Waiting for service to be ready..."
    sleep 15
    
    local endpoints=("/health" "/health/live" "/health/ready")
    
    for endpoint in "${endpoints[@]}"; do
        print_status "Testing health endpoint: $endpoint"
        if curl -f -s "${service_url}${endpoint}" > /dev/null; then
            print_success "✓ Health endpoint responding: $endpoint"
        else
            print_warning "⚠ Health endpoint not responding: $endpoint"
        fi
    done
}