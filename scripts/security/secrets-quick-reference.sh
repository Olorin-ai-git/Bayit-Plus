#!/bin/bash

# Firebase Secrets Quick Reference for Olorin Production
# This script provides quick commands for secret management operations
# Author: Gil Klainert
# Date: 2025-08-31

PROJECT_ID="olorin-ai"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🔐 Firebase Secrets Quick Reference - Olorin Production"
echo "Project: $PROJECT_ID"
echo

# Function to show usage
show_help() {
    echo "Usage: $0 [command]"
    echo
    echo "Commands:"
    echo "  validate     - Validate all secrets configuration"
    echo "  test         - Test SecretManagerClient functionality"  
    echo "  list         - List all secrets in Firebase Secret Manager"
    echo "  create       - Interactive secret creation"
    echo "  status       - Show current secret status"
    echo "  missing      - Show commands to create missing secrets"
    echo "  help         - Show this help message"
    echo
    echo "Examples:"
    echo "  $0 validate"
    echo "  $0 create"
    echo "  $0 status"
}

# Function to validate secrets
validate_secrets() {
    echo "🔍 Validating Firebase secrets configuration..."
    cd "$SCRIPT_DIR/../../olorin-server"
    poetry run python ../scripts/security/firebase-secrets-validator.py --project "$PROJECT_ID"
}

# Function to test SecretManagerClient
test_client() {
    echo "🧪 Testing SecretManagerClient functionality..."
    cd "$SCRIPT_DIR/../../olorin-server" 
    poetry run python ../scripts/security/test-secret-manager-client.py --project "$PROJECT_ID"
}

# Function to list secrets
list_secrets() {
    echo "📋 Firebase Secret Manager secrets:"
    gcloud secrets list --project="$PROJECT_ID" --format="table(name,createTime,labels)"
}

# Function to create secrets interactively
create_secrets() {
    echo "🛠️  Starting interactive secret creation..."
    "$SCRIPT_DIR/create-production-secrets.sh"
}

# Function to show current status
show_status() {
    echo "📊 Current Secret Status:"
    echo
    list_secrets
    echo
    echo "🔍 Validation Results:"
    validate_secrets
}

# Function to show missing secrets commands
show_missing() {
    echo "🛠️  Commands to create missing secrets:"
    cd "$SCRIPT_DIR/../../olorin-server"
    poetry run python ../scripts/security/firebase-secrets-validator.py --project "$PROJECT_ID" --create-commands
}

# Main script logic
case "${1:-help}" in
    validate)
        validate_secrets
        ;;
    test)
        test_client
        ;;
    list)
        list_secrets
        ;;
    create) 
        create_secrets
        ;;
    status)
        show_status
        ;;
    missing)
        show_missing
        ;;
    help|*)
        show_help
        ;;
esac