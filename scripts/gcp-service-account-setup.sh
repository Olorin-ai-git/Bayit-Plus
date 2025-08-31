#!/bin/bash

# Google Cloud Service Account Setup Script for Olorin Secret Manager
# This script creates and configures service accounts with proper IAM permissions

set -e

# Configuration
PROJECT_ID=${PROJECT_ID:-"olorin-ai"}
SERVICE_ACCOUNT_PREFIX="olorin"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if gcloud is installed
check_prerequisites() {
    if ! command -v gcloud &> /dev/null; then
        print_error "gcloud CLI is not installed. Please install Google Cloud SDK."
        echo "Visit: https://cloud.google.com/sdk/docs/install"
        exit 1
    fi
    
    # Check if user is authenticated
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &> /dev/null; then
        print_error "Not authenticated with Google Cloud"
        echo "Please run: gcloud auth login"
        exit 1
    fi
    
    # Set the project
    gcloud config set project "$PROJECT_ID" 2>/dev/null
    print_status "Using project: $PROJECT_ID"
}

# Enable required APIs
enable_apis() {
    print_info "Enabling required Google Cloud APIs..."
    
    apis=(
        "secretmanager.googleapis.com"
        "iam.googleapis.com"
        "cloudresourcemanager.googleapis.com"
    )
    
    for api in "${apis[@]}"; do
        if gcloud services list --enabled --filter="name:$api" --format="value(name)" | grep -q "$api"; then
            print_status "$api already enabled"
        else
            print_info "Enabling $api..."
            gcloud services enable "$api" --project="$PROJECT_ID"
            print_status "$api enabled"
        fi
    done
}

# Create service account for applications (read-only)
create_app_service_account() {
    local sa_name="${SERVICE_ACCOUNT_PREFIX}-secrets-reader"
    local sa_email="${sa_name}@${PROJECT_ID}.iam.gserviceaccount.com"
    
    print_info "Creating application service account: $sa_name"
    
    # Check if service account exists
    if gcloud iam service-accounts describe "$sa_email" --project="$PROJECT_ID" &> /dev/null; then
        print_warning "Service account $sa_name already exists"
    else
        gcloud iam service-accounts create "$sa_name" \
            --description="Service account for Olorin applications to read secrets" \
            --display-name="Olorin Secrets Reader" \
            --project="$PROJECT_ID"
        print_status "Service account $sa_name created"
    fi
    
    # Grant Secret Accessor role
    print_info "Granting Secret Accessor role..."
    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
        --member="serviceAccount:$sa_email" \
        --role="roles/secretmanager.secretAccessor" \
        --quiet 2>/dev/null || {
        print_warning "Role may already be assigned or needs manual configuration"
    }
    
    print_status "Secret Accessor role granted to $sa_name"
}

# Create service account for developers/admins (read-write)
create_admin_service_account() {
    local sa_name="${SERVICE_ACCOUNT_PREFIX}-secrets-admin"
    local sa_email="${sa_name}@${PROJECT_ID}.iam.gserviceaccount.com"
    
    print_info "Creating admin service account: $sa_name"
    
    # Check if service account exists
    if gcloud iam service-accounts describe "$sa_email" --project="$PROJECT_ID" &> /dev/null; then
        print_warning "Service account $sa_name already exists"
    else
        gcloud iam service-accounts create "$sa_name" \
            --description="Service account for Olorin developers to manage secrets" \
            --display-name="Olorin Secrets Admin" \
            --project="$PROJECT_ID"
        print_status "Service account $sa_name created"
    fi
    
    # Grant Secret Manager Admin role
    print_info "Granting Secret Manager Admin role..."
    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
        --member="serviceAccount:$sa_email" \
        --role="roles/secretmanager.admin" \
        --quiet 2>/dev/null || {
        print_warning "Role may already be assigned or needs manual configuration"
    }
    
    print_status "Secret Manager Admin role granted to $sa_name"
}

# Create service account for CI/CD
create_cicd_service_account() {
    local sa_name="${SERVICE_ACCOUNT_PREFIX}-cicd"
    local sa_email="${sa_name}@${PROJECT_ID}.iam.gserviceaccount.com"
    
    print_info "Creating CI/CD service account: $sa_name"
    
    # Check if service account exists
    if gcloud iam service-accounts describe "$sa_email" --project="$PROJECT_ID" &> /dev/null; then
        print_warning "Service account $sa_name already exists"
    else
        gcloud iam service-accounts create "$sa_name" \
            --description="Service account for CI/CD pipelines" \
            --display-name="Olorin CI/CD" \
            --project="$PROJECT_ID"
        print_status "Service account $sa_name created"
    fi
    
    # Grant necessary roles for CI/CD
    print_info "Granting CI/CD roles..."
    
    # Secret Accessor for reading secrets
    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
        --member="serviceAccount:$sa_email" \
        --role="roles/secretmanager.secretAccessor" \
        --quiet 2>/dev/null || {
        print_warning "Secret Accessor role may already be assigned"
    }
    
    # Secret Version Manager for updating non-production secrets
    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
        --member="serviceAccount:$sa_email" \
        --role="roles/secretmanager.secretVersionManager" \
        --condition='expression=resource.name.startsWith("projects/'$PROJECT_ID'/secrets/development/") || resource.name.startsWith("projects/'$PROJECT_ID'/secrets/staging/"),title=Non-Production Only,description=Can only manage development and staging secrets' \
        --quiet 2>/dev/null || print_warning "Conditional binding may need manual configuration"
    
    print_status "CI/CD roles granted to $sa_name"
}

# Download service account key
download_service_account_key() {
    local sa_name=$1
    local key_dir="./service-account-keys"
    local sa_email="${sa_name}@${PROJECT_ID}.iam.gserviceaccount.com"
    
    print_info "Generating key for service account: $sa_name"
    
    # Create directory for keys
    mkdir -p "$key_dir"
    chmod 700 "$key_dir"
    
    local key_file="$key_dir/${sa_name}-key.json"
    
    # Check if key already exists
    if [ -f "$key_file" ]; then
        print_warning "Key file already exists: $key_file"
        read -p "Overwrite? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            return
        fi
    fi
    
    # Create key
    gcloud iam service-accounts keys create "$key_file" \
        --iam-account="$sa_email" \
        --project="$PROJECT_ID"
    
    # Set secure permissions
    chmod 600 "$key_file"
    
    print_status "Key saved to: $key_file (permissions set to 600)"
    print_warning "Keep this key secure and never commit it to version control!"
}

# Create initial secrets
create_initial_secrets() {
    print_info "Creating initial health check secret..."
    
    # Create a health check secret
    echo -n "healthy" | gcloud secrets create "health-check" \
        --data-file=- \
        --replication-policy="automatic" \
        --project="$PROJECT_ID" 2>/dev/null || print_warning "health-check secret already exists"
    
    print_info "Creating environment-specific secret paths..."
    
    # Create placeholder secrets for each environment
    environments=("development" "staging" "production")
    
    for env in "${environments[@]}"; do
        secret_name="${env}/olorin/server/placeholder"
        echo -n "placeholder" | gcloud secrets create "$secret_name" \
            --data-file=- \
            --replication-policy="automatic" \
            --project="$PROJECT_ID" 2>/dev/null || print_warning "$secret_name already exists"
    done
    
    print_status "Initial secrets created"
}

# Setup secret access for specific user
grant_user_access() {
    local user_email=$1
    
    if [ -z "$user_email" ]; then
        read -p "Enter user email to grant secret access: " user_email
    fi
    
    print_info "Granting secret access to user: $user_email"
    
    # Grant Secret Accessor role to user
    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
        --member="user:$user_email" \
        --role="roles/secretmanager.secretAccessor" \
        --condition=None \
        --quiet
    
    print_status "Secret access granted to $user_email"
}

# Main menu
show_menu() {
    echo ""
    echo "🔐 Google Cloud Service Account Setup for Olorin"
    echo "================================================"
    echo ""
    echo "1) Complete setup (all service accounts)"
    echo "2) Create application service account (read-only)"
    echo "3) Create admin service account (read-write)"
    echo "4) Create CI/CD service account"
    echo "5) Download service account keys"
    echo "6) Grant user access to secrets"
    echo "7) Create initial secrets"
    echo "8) Enable APIs only"
    echo "9) Exit"
    echo ""
}

# Main execution
main() {
    check_prerequisites
    
    if [ "$1" == "--non-interactive" ]; then
        # Non-interactive mode - run complete setup
        enable_apis
        create_app_service_account
        create_admin_service_account
        create_cicd_service_account
        create_initial_secrets
        print_status "Complete setup finished!"
        exit 0
    fi
    
    while true; do
        show_menu
        read -p "Select option: " choice
        
        case $choice in
            1)
                enable_apis
                create_app_service_account
                create_admin_service_account
                create_cicd_service_account
                create_initial_secrets
                print_status "Complete setup finished!"
                ;;
            2)
                create_app_service_account
                ;;
            3)
                create_admin_service_account
                ;;
            4)
                create_cicd_service_account
                ;;
            5)
                echo "Available service accounts:"
                echo "1) ${SERVICE_ACCOUNT_PREFIX}-secrets-reader"
                echo "2) ${SERVICE_ACCOUNT_PREFIX}-secrets-admin"
                echo "3) ${SERVICE_ACCOUNT_PREFIX}-cicd"
                read -p "Select service account (1-3): " sa_choice
                case $sa_choice in
                    1) download_service_account_key "${SERVICE_ACCOUNT_PREFIX}-secrets-reader" ;;
                    2) download_service_account_key "${SERVICE_ACCOUNT_PREFIX}-secrets-admin" ;;
                    3) download_service_account_key "${SERVICE_ACCOUNT_PREFIX}-cicd" ;;
                    *) print_error "Invalid choice" ;;
                esac
                ;;
            6)
                grant_user_access
                ;;
            7)
                create_initial_secrets
                ;;
            8)
                enable_apis
                ;;
            9)
                echo "Exiting..."
                exit 0
                ;;
            *)
                print_error "Invalid option"
                ;;
        esac
        
        echo ""
        read -p "Press Enter to continue..."
    done
}

# Show help
if [ "$1" == "--help" ] || [ "$1" == "-h" ]; then
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --non-interactive    Run complete setup without prompts"
    echo "  --project PROJECT    Set the GCP project ID (default: olorin-ai)"
    echo "  --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                          # Interactive mode"
    echo "  $0 --non-interactive        # Automated setup"
    echo "  $0 --project my-project     # Use specific project"
    exit 0
fi

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --project)
            PROJECT_ID="$2"
            shift 2
            ;;
        --non-interactive)
            main --non-interactive
            exit 0
            ;;
        *)
            shift
            ;;
    esac
done

# Run main function
main