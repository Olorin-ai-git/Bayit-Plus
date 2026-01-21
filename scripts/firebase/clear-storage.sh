#!/bin/bash

# Clear Firebase Storage files
# This script clears CV-related files from Firebase Storage

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

print_info "🗂️ Firebase Storage Clearing Script"
print_info "===================================="

# Check if gsutil is available (part of Google Cloud SDK)
if command -v gsutil &> /dev/null; then
    STORAGE_TOOL="gsutil"
    print_info "Using gsutil for storage operations"
elif command -v firebase &> /dev/null; then
    STORAGE_TOOL="firebase"
    print_info "Using firebase CLI for storage operations"
else
    print_error "Neither gsutil nor firebase CLI is available"
    print_info "Please install Google Cloud SDK or Firebase CLI"
    exit 1
fi

# Get project ID
PROJECT_ID="getmycv-ai"
BUCKET_NAME="${PROJECT_ID}.appspot.com"

print_info "Project: $PROJECT_ID"
print_info "Storage Bucket: $BUCKET_NAME"
echo ""

# Storage paths to clear
STORAGE_PATHS=(
    "users/"
    "generated/"
    "podcasts/"
    "videos/"
    "portfolios/"
    "qr-codes/"
    "certificates/"
    "audio/"
    "temp/"
)

# Confirmation
print_warning "⚠️  WARNING: This will permanently delete ALL files in Firebase Storage!"
print_warning "This includes uploaded CVs, generated files, media content, etc."
print_warning "This action cannot be undone."
echo ""
echo -n "Are you sure you want to clear Firebase Storage? (type 'CLEAR_STORAGE' to confirm): "
read -r confirmation

if [[ "$confirmation" != "CLEAR_STORAGE" ]]; then
    print_info "Operation cancelled by user"
    exit 0
fi

echo ""
print_info "Starting storage clearing process..."

if [[ "$STORAGE_TOOL" == "gsutil" ]]; then
    # Use gsutil to clear storage paths
    for path in "${STORAGE_PATHS[@]}"; do
        print_info "Clearing storage path: gs://$BUCKET_NAME/$path"
        
        if gsutil -m rm -r "gs://$BUCKET_NAME/$path" 2>/dev/null; then
            print_success "Cleared: $path"
        else
            print_warning "Path $path may not exist or is already empty"
        fi
    done
    
    # Clear any remaining files in root
    print_info "Clearing any remaining files in storage root..."
    if gsutil ls "gs://$BUCKET_NAME/" | grep -v "/$" | head -20 | while read file; do
        print_info "Deleting: $file"
        gsutil rm "$file" 2>/dev/null || true
    done; then
        print_info "Root files processed"
    else
        print_info "No additional files found in root"
    fi
    
else
    # Use firebase CLI (more limited)
    print_warning "Using Firebase CLI - clearing entire storage bucket..."
    print_info "Note: Firebase CLI doesn't support selective path deletion"
    
    # This will prompt for confirmation
    firebase storage:delete --remote-only --project "$PROJECT_ID" || {
        print_warning "Firebase storage clear command failed or was cancelled"
        print_info "You may need to clear storage manually through the Firebase Console"
    }
fi

echo ""
print_success "🎉 STORAGE CLEARING COMPLETED"
print_success "============================="
print_warning "All CV-related files have been permanently deleted from Firebase Storage!"

print_info ""
print_info "📁 Storage paths processed: ${#STORAGE_PATHS[@]}"
print_info "🌐 You can verify the clearing in the Firebase Console:"
print_info "   https://console.firebase.google.com/project/$PROJECT_ID/storage"