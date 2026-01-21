#!/bin/bash

# Clear Firebase Storage Files - CVs and Media
# This script deletes all uploaded files from Firebase Storage

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
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

print_progress() {
    echo -e "${MAGENTA}[PROGRESS]${NC} $1"
}

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    print_error "Firebase CLI is not installed. Please install it first:"
    print_info "npm install -g firebase-tools"
    exit 1
fi

# Check if gsutil is installed (alternative method)
HAS_GSUTIL=false
if command -v gsutil &> /dev/null; then
    HAS_GSUTIL=true
    print_info "gsutil is available for enhanced operations"
fi

# Parse command line arguments
DRY_RUN=false
SKIP_CONFIRMATION=false
PROJECT="getmycv-ai"

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
        --project)
            PROJECT="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Clear all uploaded files from Firebase Storage"
            echo ""
            echo "Options:"
            echo "  --dry-run       List files that would be deleted (preview mode)"
            echo "  --confirm       Skip confirmation prompt"
            echo "  --project NAME  Specify Firebase project (default: getmycv-ai)"
            echo "  --help          Show this help message"
            echo ""
            echo "Common storage paths that will be cleared:"
            echo "  - /cvs/            Uploaded CV documents"
            echo "  - /generated/      Generated files (PDFs, etc.)"
            echo "  - /media/          Media files (videos, audio)"
            echo "  - /podcasts/       Generated podcasts"
            echo "  - /portfolios/     Portfolio images and files"
            echo "  - /qr-codes/       QR code images"
            echo "  - /profile-images/ User profile images"
            echo "  - /testimonials/   Testimonial media"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

print_info "📁 Firebase Storage Clearing Script"
print_info "===================================="
print_info "Project: $PROJECT"

if [[ "$DRY_RUN" = true ]]; then
    print_info "Mode: DRY RUN (preview only - no files will be deleted)"
else
    print_warning "Mode: LIVE DELETION (files will be permanently deleted!)"
fi

echo ""

# Storage paths to clear
STORAGE_PATHS=(
    "cvs/"
    "generated/"
    "media/"
    "podcasts/"
    "portfolios/"
    "qr-codes/"
    "profile-images/"
    "testimonials/"
    "uploads/"
    "videos/"
    "audio/"
    "images/"
    "documents/"
    "public/"
    "private/"
    "temp/"
    "cache/"
)

# Function to delete files from a storage path
delete_storage_path() {
    local path=$1
    print_progress "Processing path: /$path"
    
    if [[ "$DRY_RUN" = true ]]; then
        print_info "[DRY RUN] Would delete all files in: gs://${PROJECT}.firebasestorage.app/$path"
        
        # Try to list files in this path (if possible)
        if [[ "$HAS_GSUTIL" = true ]]; then
            local file_count=$(gsutil ls -r "gs://${PROJECT}.firebasestorage.app/$path" 2>/dev/null | wc -l || echo "0")
            if [[ "$file_count" -gt 0 ]]; then
                print_info "  Found approximately $file_count files/folders"
            fi
        fi
        return
    fi
    
    # Use gsutil if available (more reliable for large deletions)
    if [[ "$HAS_GSUTIL" = true ]]; then
        if gsutil -m rm -r "gs://${PROJECT}.firebasestorage.app/$path" 2>/dev/null; then
            print_success "Deleted all files in: /$path"
        else
            print_info "Path /$path is empty or doesn't exist"
        fi
    else
        # Fallback to Firebase CLI (might have limitations)
        # Note: Firebase CLI doesn't have a direct storage:delete command for paths
        # We'll use a workaround approach
        print_warning "Using Firebase CLI (limited functionality)"
        print_info "For complete deletion, consider installing gsutil:"
        print_info "  https://cloud.google.com/storage/docs/gsutil_install"
        
        # This is a placeholder as Firebase CLI doesn't directly support path deletion
        print_warning "Path /$path requires manual deletion or gsutil"
    fi
}

# Function to delete ALL storage (nuclear option)
delete_all_storage() {
    print_warning "🚨 DELETING ALL STORAGE CONTENTS"
    
    if [[ "$DRY_RUN" = true ]]; then
        print_info "[DRY RUN] Would delete ALL files in: gs://${PROJECT}.firebasestorage.app/"
        
        if [[ "$HAS_GSUTIL" = true ]]; then
            print_info "Analyzing storage contents..."
            local total_size=$(gsutil du -s "gs://${PROJECT}.firebasestorage.app/" 2>/dev/null | awk '{print $1}' || echo "0")
            if [[ "$total_size" != "0" ]]; then
                # Convert bytes to human readable
                local size_mb=$((total_size / 1024 / 1024))
                print_info "  Total storage size: ~${size_mb} MB"
            fi
        fi
        return
    fi
    
    if [[ "$HAS_GSUTIL" = true ]]; then
        print_progress "Deleting all storage contents..."
        if gsutil -m rm -r "gs://${PROJECT}.firebasestorage.app/**" 2>/dev/null; then
            print_success "All storage contents deleted successfully"
        else
            print_warning "Some paths may be empty or already deleted"
        fi
    else
        print_error "gsutil is required for complete storage deletion"
        print_info "Please install gsutil: https://cloud.google.com/storage/docs/gsutil_install"
        return 1
    fi
}

# Confirmation prompt
if [[ "$DRY_RUN" = false && "$SKIP_CONFIRMATION" = false ]]; then
    print_warning "⚠️  WARNING: This will permanently delete ALL files from Firebase Storage!"
    print_warning "This includes:"
    print_warning "  - All uploaded CV documents"
    print_warning "  - All generated media files (videos, podcasts, etc.)"
    print_warning "  - All user profile images"
    print_warning "  - All portfolio files"
    print_warning "  - ALL other stored files"
    print_warning ""
    print_warning "This action CANNOT be undone!"
    echo ""
    echo -n "Are you absolutely sure? (type 'DELETE_ALL_STORAGE' to confirm): "
    read -r confirmation
    
    if [[ "$confirmation" != "DELETE_ALL_STORAGE" ]]; then
        print_info "Operation cancelled by user"
        exit 0
    fi
    echo ""
fi

# Start deletion process
print_info "Starting storage deletion process..."
echo ""

# Check if we have gsutil for efficient deletion
if [[ "$HAS_GSUTIL" = true ]]; then
    # Use the nuclear option - delete everything at once
    delete_all_storage
else
    # Try to delete specific paths (limited without gsutil)
    print_warning "gsutil not found - attempting limited deletion"
    print_warning "For complete deletion, please install gsutil"
    echo ""
    
    SUCCESS_COUNT=0
    FAILED_COUNT=0
    
    for path in "${STORAGE_PATHS[@]}"; do
        if delete_storage_path "$path"; then
            ((SUCCESS_COUNT++))
        else
            ((FAILED_COUNT++))
        fi
    done
    
    echo ""
    if [[ "$SUCCESS_COUNT" -gt 0 ]]; then
        print_success "Processed $SUCCESS_COUNT paths"
    fi
    if [[ "$FAILED_COUNT" -gt 0 ]]; then
        print_warning "$FAILED_COUNT paths require manual deletion or gsutil"
    fi
fi

echo ""

if [[ "$DRY_RUN" = true ]]; then
    print_info "🎯 DRY RUN COMPLETED"
    print_info "====================="
    print_info "This was a preview - no files were actually deleted"
    print_info "Run without --dry-run to perform the actual deletion"
else
    print_success "🎉 STORAGE CLEARING COMPLETED"
    print_success "============================"
    print_warning "All accessible storage files have been deleted!"
    print_info ""
    print_info "Note: Some system files or active uploads might remain"
    print_info "Check the Firebase Console for verification:"
    print_info "  https://console.firebase.google.com/project/${PROJECT}/storage"
fi

# Additional cleanup suggestions
echo ""
print_info "💡 Additional Cleanup Tips:"
print_info "1. Clear Firestore data: ./scripts/firebase/clear-all-cv-data.sh"
print_info "2. Check Firebase Console for remaining files"
print_info "3. Review storage rules to prevent unauthorized uploads"
print_info "4. Consider setting up lifecycle rules for automatic cleanup"