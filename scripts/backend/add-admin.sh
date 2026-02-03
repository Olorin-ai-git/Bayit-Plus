#!/bin/bash
#
# Add Admin User - Bayit+ User Management
# Creates a new admin user or upgrades an existing user to admin role
#
# Usage:
#   ./add-admin.sh <email> [name]
#   ./add-admin.sh --list
#   ./add-admin.sh --help
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Print colored message
print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Validate email format
validate_email() {
    local email=$1
    if [[ ! "$email" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
        print_error "Invalid email format: $email"
        exit 1
    fi
}

# Show help message
show_help() {
    cat << EOF
${GREEN}Bayit+ Admin User Management${NC}

${BLUE}USAGE:${NC}
    ./add-admin.sh <email> [name]    Create/upgrade user to admin
    ./add-admin.sh --list            List all users
    ./add-admin.sh --help            Show this help message

${BLUE}EXAMPLES:${NC}
    # Create admin with auto-generated name
    ./add-admin.sh user@example.com

    # Create admin with custom name
    ./add-admin.sh user@example.com "John Doe"

    # List all users
    ./add-admin.sh --list

${BLUE}DESCRIPTION:${NC}
    This script manages admin users in the Bayit+ platform.

    - If the user exists, they will be upgraded to admin role
    - If the user doesn't exist, a new admin user will be created
    - Admin users bypass email/phone verification
    - Admin users can access all platform features

${BLUE}ROLES:${NC}
    super_admin      Full platform access (highest privilege)
    admin            Platform administration
    content_manager  Content management
    billing_admin    Billing and subscriptions
    support          Customer support
    user             Regular user (default)
    viewer           View-only access

${BLUE}REQUIREMENTS:${NC}
    - Poetry environment must be set up
    - MongoDB connection must be configured
    - Must be run from the backend/scripts directory

EOF
}

# List all users
list_users() {
    print_info "Listing all users in the database..."
    echo ""

    cd "$BACKEND_DIR"
    poetry run python scripts/add_admin_user.py --list

    if [ $? -eq 0 ]; then
        print_success "User list retrieved successfully"
    else
        print_error "Failed to retrieve user list"
        exit 1
    fi
}

# Add admin user
add_admin() {
    local email=$1
    local name=$2

    # Validate email
    validate_email "$email"

    print_info "Adding admin user: $email"
    if [ -n "$name" ]; then
        print_info "Name: $name"
    fi
    echo ""

    cd "$BACKEND_DIR"

    if [ -n "$name" ]; then
        poetry run python scripts/add_admin_user.py "$email" "$name"
    else
        poetry run python scripts/add_admin_user.py "$email"
    fi

    if [ $? -eq 0 ]; then
        echo ""
        print_success "Admin user successfully configured!"
        print_info "The user can now sign in with Google OAuth using: $email"
    else
        print_error "Failed to add admin user"
        exit 1
    fi
}

# Main script logic
main() {
    # Check if we're in the right directory
    if [ ! -f "$BACKEND_DIR/pyproject.toml" ]; then
        print_error "This script must be run from the backend/scripts directory"
        print_info "Current directory: $(pwd)"
        print_info "Expected backend directory: $BACKEND_DIR"
        exit 1
    fi

    # Parse arguments
    case "${1:-}" in
        --help|-h|help)
            show_help
            exit 0
            ;;
        --list|-l|list)
            list_users
            exit 0
            ;;
        "")
            print_error "No arguments provided"
            echo ""
            show_help
            exit 1
            ;;
        *)
            if [[ "$1" == --* ]]; then
                print_error "Unknown option: $1"
                echo ""
                show_help
                exit 1
            else
                add_admin "$1" "${2:-}"
            fi
            ;;
    esac
}

# Run main function
main "$@"
