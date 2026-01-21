#!/bin/bash

# Clear CV Data using Firebase CLI
# This script uses Firebase CLI commands to clear CV-related data

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    print_error "Firebase CLI is not installed. Please install it first:"
    print_info "npm install -g firebase-tools"
    exit 1
fi

# Parse command line arguments
DRY_RUN=false
SKIP_CONFIRMATION=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --confirm)
            SKIP_CONFIRMATION=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Clear CV records from Firebase Firestore"
            echo ""
            echo "Options:"
            echo "  --dry-run    Show what would be deleted (preview mode)"
            echo "  --confirm    Skip confirmation prompt"
            echo "  --help       Show this help message"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

print_info "🔥 Firebase CV Data Clearing Script"
print_info "===================================="

if [[ "$DRY_RUN" = true ]]; then
    print_info "Mode: DRY RUN (preview only)"
else
    print_warning "Mode: LIVE DELETION (data will be permanently deleted!)"
fi

echo ""

# Collections that contain CV data
COLLECTIONS=(
    "jobs"
    "publicProfiles" 
    "chatSessions"
    "qrCodes"
    "portfolios"
    "testimonials"
    "achievements"
    "personalityInsights"
    "skillsData"
    "languageProficiency"
    "socialProfiles"
    "timelineEvents"
    "mediaContent"
    "contactForms"
    "scanAnalytics"
)

# Function to delete a collection
delete_collection() {
    local collection=$1
    print_info "Processing collection: $collection"
    
    if [[ "$DRY_RUN" = true ]]; then
        print_info "[DRY RUN] Would delete all documents in collection: $collection"
        return
    fi
    
    # Use Firebase CLI to delete collection
    if firebase firestore:delete "$collection" --recursive --yes --project getmycv-ai; then
        print_success "Deleted collection: $collection"
    else
        print_warning "Collection $collection may not exist or is already empty"
    fi
}

# Confirmation prompt
if [[ "$DRY_RUN" = false && "$SKIP_CONFIRMATION" = false ]]; then
    print_warning "⚠️  WARNING: This will permanently delete ALL CV data from Firestore!"
    print_warning "This includes all user CVs, profiles, analytics, and associated data."
    print_warning "This action cannot be undone."
    echo ""
    echo -n "Are you absolutely sure you want to proceed? (type 'DELETE_ALL_CVS' to confirm): "
    read -r confirmation
    
    if [[ "$confirmation" != "DELETE_ALL_CVS" ]]; then
        print_info "Operation cancelled by user"
        exit 0
    fi
    echo ""
fi

# Process each collection
print_info "Starting data deletion process..."
echo ""

for collection in "${COLLECTIONS[@]}"; do
    delete_collection "$collection"
done

echo ""

if [[ "$DRY_RUN" = true ]]; then
    print_info "🎯 DRY RUN COMPLETED"
    print_info "====================="
    print_info "This was a preview - no data was actually deleted"
    print_info "Run without --dry-run to perform the actual deletion"
else
    print_success "🎉 DATA CLEARING COMPLETED"
    print_success "=========================="
    print_warning "All CV data has been permanently deleted from Firestore!"
    print_info "Storage files (uploaded CVs, generated files) still exist and need to be cleared manually"
fi

print_info ""
print_info "📋 Collections processed: ${#COLLECTIONS[@]}"
print_info "💾 Note: Firebase Storage files are not deleted by this script"
print_info "   To clear storage, use the Firebase Console or firebase storage commands"