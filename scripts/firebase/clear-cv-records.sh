#!/bin/bash

# Clear CV Records Shell Script
# Wrapper script for the Node.js CV clearing script

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NODE_SCRIPT="$SCRIPT_DIR/clear-cv-records.js"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
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

show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Clear CV records and associated data from Firebase"
    echo ""
    echo "Options:"
    echo "  --dry-run           Show what would be deleted without actually deleting"
    echo "  --user-id <uid>     Only clear data for specific user ID"
    echo "  --confirm           Skip confirmation prompt (use with caution)"
    echo "  --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 --dry-run                    # Preview what would be deleted"
    echo "  $0 --user-id abc123 --dry-run   # Preview deletion for specific user"
    echo "  $0 --confirm                    # Delete all data without confirmation"
    echo "  $0 --user-id abc123             # Delete data for specific user (with confirmation)"
}

# Parse command line arguments
DRY_RUN=false
USER_ID=""
SKIP_CONFIRMATION=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --user-id)
            if [[ -z "$2" ]]; then
                print_error "User ID is required after --user-id"
                exit 1
            fi
            USER_ID="$2"
            shift 2
            ;;
        --confirm)
            SKIP_CONFIRMATION=true
            shift
            ;;
        --help)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Check if Node.js script exists
if [[ ! -f "$NODE_SCRIPT" ]]; then
    print_error "Node.js script not found at: $NODE_SCRIPT"
    exit 1
fi

# Check if we're in the right directory (should have firebase.json)
if [[ ! -f "firebase.json" ]]; then
    print_warning "firebase.json not found in current directory"
    print_info "Make sure you're running this script from your Firebase project root"
fi

print_info "CV Records Clearing Script"
print_info "=========================="

# Show what will be done
if [[ "$DRY_RUN" = true ]]; then
    print_info "Mode: DRY RUN (preview only - no data will be deleted)"
else
    print_warning "Mode: LIVE DELETION (data will be permanently deleted!)"
fi

if [[ -n "$USER_ID" ]]; then
    print_info "Target: User ID $USER_ID"
else
    print_warning "Target: ALL USERS"
fi

echo ""

# Confirmation prompt (unless skipped or dry run)
if [[ "$DRY_RUN" = false && "$SKIP_CONFIRMATION" = false ]]; then
    print_warning "⚠️  WARNING: This will permanently delete CV data!"
    print_warning "This action cannot be undone."
    echo ""
    echo -n "Are you sure you want to proceed? (type 'YES' to confirm): "
    read -r confirmation
    
    if [[ "$confirmation" != "YES" ]]; then
        print_info "Operation cancelled by user"
        exit 0
    fi
    echo ""
fi

# Build arguments for Node.js script
NODE_ARGS=()
if [[ "$DRY_RUN" = true ]]; then
    NODE_ARGS+=("--dry-run")
fi
if [[ -n "$USER_ID" ]]; then
    NODE_ARGS+=("--user-id" "$USER_ID")
fi

# Execute the Node.js script
print_info "Executing Node.js clearing script..."
print_info "Command: node $NODE_SCRIPT ${NODE_ARGS[*]}"
echo ""

if node "$NODE_SCRIPT" "${NODE_ARGS[@]}"; then
    echo ""
    print_success "CV records clearing completed successfully!"
    
    if [[ "$DRY_RUN" = true ]]; then
        print_info "This was a dry run - no data was actually deleted"
        print_info "Run without --dry-run to perform the actual deletion"
    else
        print_warning "Data has been permanently deleted from Firebase"
    fi
else
    echo ""
    print_error "CV records clearing failed!"
    exit 1
fi