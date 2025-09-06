#!/bin/bash

# Deployment Validation Script for Enhanced Backend Infrastructure
# Validates Docker optimization, configuration templates, and health endpoints
# Author: Gil Klainert
# Date: 2025-09-06

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"

# Validation results
VALIDATION_RESULTS=()

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
    VALIDATION_RESULTS+=("✅ $1")
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
    VALIDATION_RESULTS+=("⚠️ $1")
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    VALIDATION_RESULTS+=("❌ $1")
}

print_header() {
    echo -e "\n${BLUE}================================${NC}"
    echo -e "${BLUE} $1 ${NC}"
    echo -e "${BLUE}================================${NC}\n"
}

# Validation functions
validate_docker_optimization() {
    print_header "DOCKER OPTIMIZATION VALIDATION"
    
    # Check Dockerfile exists and is optimized
    if [[ -f "$BACKEND_DIR/Dockerfile" ]]; then
        line_count=$(wc -l < "$BACKEND_DIR/Dockerfile")
        if [[ $line_count -lt 200 ]]; then
            print_success "Dockerfile is optimized ($line_count lines < 200 limit)"
        else
            print_error "Dockerfile exceeds 200 lines: $line_count"
        fi
        
        # Check for multi-stage build
        if grep -q "FROM.*AS.*" "$BACKEND_DIR/Dockerfile"; then
            print_success "Multi-stage build detected"
        else
            print_warning "Multi-stage build not detected"
        fi
        
        # Check for build arguments
        if grep -q "ARG " "$BACKEND_DIR/Dockerfile"; then
            print_success "Build arguments configured"
        else
            print_warning "No build arguments found"
        fi
    else
        print_error "Dockerfile not found"
    fi
    
    # Check .dockerignore exists and has content
    if [[ -f "$BACKEND_DIR/.dockerignore" ]]; then
        ignore_count=$(wc -l < "$BACKEND_DIR/.dockerignore")
        if [[ $ignore_count -gt 50 ]]; then
            print_success ".dockerignore comprehensive ($ignore_count exclusions)"
        else
            print_warning ".dockerignore exists but may need more exclusions ($ignore_count)"
        fi
    else
        print_error ".dockerignore not found - build context will be unoptimized"
    fi
}

validate_configuration_templates() {
    print_header "CONFIGURATION TEMPLATES VALIDATION"
    
    # Check deployment directory exists
    if [[ -d "$SCRIPT_DIR" ]]; then
        print_success "Deployment directory exists"
        
        # Check configuration files
        for env in staging production; do
            config_file="$SCRIPT_DIR/${env}.yaml"
            if [[ -f "$config_file" ]]; then
                print_success "$env configuration exists"
                
                # Validate YAML syntax
                if command -v yq &> /dev/null; then
                    if yq eval '.' "$config_file" > /dev/null 2>&1; then
                        print_success "$env YAML syntax valid"
                    else
                        print_error "$env YAML syntax invalid"
                    fi
                    
                    # Check required sections
                    sections=(env_vars service secrets health_check build)
                    for section in "${sections[@]}"; do
                        if yq eval ".$section" "$config_file" | grep -q .; then
                            print_success "$env has $section configuration"
                        else
                            print_warning "$env missing $section configuration"
                        fi
                    done
                else
                    print_warning "yq not available - cannot validate YAML syntax"
                fi
            else
                print_error "$env configuration not found: $config_file"
            fi
        done
        
        # Check enhanced deployment script
        deploy_script="$SCRIPT_DIR/deploy-enhanced.sh"
        if [[ -f "$deploy_script" ]]; then
            if [[ -x "$deploy_script" ]]; then
                print_success "Enhanced deployment script is executable"
            else
                print_warning "Enhanced deployment script not executable"
            fi
        else
            print_error "Enhanced deployment script not found"
        fi
    else
        print_error "Deployment directory not found: $SCRIPT_DIR"
    fi
}

validate_health_endpoints() {
    print_header "HEALTH ENDPOINTS VALIDATION"
    
    # Check health router exists
    health_router="$BACKEND_DIR/app/router/health_router.py"
    if [[ -f "$health_router" ]]; then
        print_success "Enhanced health router exists"
        
        # Check for comprehensive endpoints
        endpoints=("/health" "/health/live" "/health/ready" "/health/detailed")
        for endpoint in "${endpoints[@]}"; do
            if grep -q "$endpoint" "$health_router"; then
                print_success "Health endpoint configured: $endpoint"
            else
                print_warning "Health endpoint missing: $endpoint"
            fi
        done
        
        # Check for Kubernetes probe models
        if grep -q "LivenessProbe\|ReadinessProbe" "$health_router"; then
            print_success "Kubernetes probe models defined"
        else
            print_warning "Kubernetes probe models not found"
        fi
    else
        print_error "Enhanced health router not found"
    fi
    
    # Check router configuration integration
    router_config="$BACKEND_DIR/app/service/router/router_config.py"
    if [[ -f "$router_config" ]]; then
        if grep -q "health_router" "$router_config"; then
            print_success "Health router integrated into application"
        else
            print_warning "Health router not integrated into router configuration"
        fi
    else
        print_warning "Router configuration not found"
    fi
}

validate_environment_management() {
    print_header "ENVIRONMENT MANAGEMENT VALIDATION"
    
    # Check for environment-specific configurations
    if [[ -f "$SCRIPT_DIR/staging.yaml" && -f "$SCRIPT_DIR/production.yaml" ]]; then
        print_success "Environment-specific configurations exist"
        
        # Compare configurations for differences
        if ! diff "$SCRIPT_DIR/staging.yaml" "$SCRIPT_DIR/production.yaml" > /dev/null; then
            print_success "Environment configurations are differentiated"
        else
            print_warning "Environment configurations appear identical"
        fi
    else
        print_error "Missing environment-specific configurations"
    fi
    
    # Check for secrets management
    for env in staging production; do
        config_file="$SCRIPT_DIR/${env}.yaml"
        if [[ -f "$config_file" ]] && command -v yq &> /dev/null; then
            secret_count=$(yq eval '.secrets | length' "$config_file" 2>/dev/null || echo "0")
            if [[ "$secret_count" -gt 0 ]]; then
                print_success "$env has $secret_count secrets configured"
            else
                print_warning "$env has no secrets configured"
            fi
        fi
    done
}

validate_integration_with_existing() {
    print_header "INTEGRATION VALIDATION"
    
    # Check original deployment script still exists
    original_script="$BACKEND_DIR/../deploy-cloudrun-direct.sh"
    if [[ -f "$original_script" ]]; then
        print_success "Original proven deployment script preserved"
    else
        print_warning "Original deployment script not found - verify path"
    fi
    
    # Check pyproject.toml exists (Poetry integration)
    if [[ -f "$BACKEND_DIR/pyproject.toml" ]]; then
        print_success "Poetry configuration exists"
        
        # Check for dependencies that support the enhancements
        if grep -q "fastapi\|uvicorn\|pydantic" "$BACKEND_DIR/pyproject.toml"; then
            print_success "Core FastAPI dependencies present"
        else
            print_warning "FastAPI dependencies not clearly identified"
        fi
    else
        print_error "pyproject.toml not found - Poetry integration broken"
    fi
    
    # Check main application entry points
    app_files=("$BACKEND_DIR/main.py" "$BACKEND_DIR/app/main.py")
    app_found=false
    for app_file in "${app_files[@]}"; do
        if [[ -f "$app_file" ]]; then
            print_success "Application entry point exists: $(basename "$app_file")"
            app_found=true
            break
        fi
    done
    
    if [[ "$app_found" == false ]]; then
        print_error "No application entry point found"
    fi
}

# Run all validations
main() {
    print_header "PHASE 2 BACKEND ENHANCEMENT VALIDATION"
    print_status "Validating deployment infrastructure enhancements..."
    
    validate_docker_optimization
    validate_configuration_templates
    validate_health_endpoints
    validate_environment_management
    validate_integration_with_existing
    
    # Summary
    print_header "VALIDATION SUMMARY"
    
    success_count=0
    warning_count=0
    error_count=0
    
    for result in "${VALIDATION_RESULTS[@]}"; do
        echo "$result"
        if [[ "$result" == ✅* ]]; then
            ((success_count++))
        elif [[ "$result" == ⚠️* ]]; then
            ((warning_count++))
        elif [[ "$result" == ❌* ]]; then
            ((error_count++))
        fi
    done
    
    echo
    print_status "Validation Results:"
    echo "  ✅ Successful: $success_count"
    echo "  ⚠️  Warnings: $warning_count"
    echo "  ❌ Errors: $error_count"
    echo
    
    if [[ $error_count -eq 0 ]]; then
        if [[ $warning_count -eq 0 ]]; then
            print_success "🎉 All validations passed! Phase 2 enhancements are complete."
            exit 0
        else
            print_warning "⚠️ Validations passed with warnings. Review warnings above."
            exit 0
        fi
    else
        print_error "❌ Validation failed with $error_count errors. Address errors before deployment."
        exit 1
    fi
}

main "$@"