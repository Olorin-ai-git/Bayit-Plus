#!/usr/bin/env bash

################################################################################
# upload_movies.sh
#
# Purpose:
#   Easy-to-use wrapper for uploading movies from external drives to GCS and
#   MongoDB Atlas. Handles environment setup, drive detection, and common
#   upload scenarios.
#
# Usage:
#   ./upload_movies.sh [OPTIONS]
#
# Options:
#   --source PATH         Source directory (default: auto-detect external drive)
#   --url URL            Download movie from URL instead of local source
#   --dry-run            Show what would be done without uploading
#   --limit N            Process only first N movies (for testing)
#   --start-from LETTER  Start from movies beginning with letter (e.g., "T")
#   --drive-name NAME    External drive volume name (default: auto-detect)
#   --help               Show this help message
#
# Examples:
#   # Dry run to see what would be uploaded
#   ./upload_movies.sh --dry-run
#
#   # Upload from URL
#   ./upload_movies.sh --url https://example.com/movie.mp4
#
#   # Upload first 5 movies (testing)
#   ./upload_movies.sh --limit 5
#
#   # Upload movies starting from letter "T"
#   ./upload_movies.sh --start-from T
#
#   # Specify custom source directory
#   ./upload_movies.sh --source /Volumes/MyDrive/Movies
#
#   # Dry run with limit
#   ./upload_movies.sh --dry-run --limit 10
#
# Prerequisites:
#   - MongoDB Atlas connection string in MONGODB_URL environment variable
#   - Google Cloud credentials configured (gcloud auth or service account)
#   - Python 3.11+ with Poetry
#   - Backend dependencies installed (poetry install)
#
# Environment Variables:
#   MONGODB_URL           MongoDB Atlas connection string (REQUIRED)
#   GCS_BUCKET_NAME       Google Cloud Storage bucket name
#   TMDB_API_KEY          TMDB API key for metadata (optional)
#   GOOGLE_APPLICATION_CREDENTIALS  Path to GCS service account key (optional)
#
################################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BACKEND_DIR="${PROJECT_ROOT}/backend"
PYTHON_SCRIPT="${SCRIPT_DIR}/upload_real_movies.py"

# Default values (configuration-driven)
SOURCE_DIR=""
SOURCE_URL=""
DRY_RUN=false
LIMIT=""
START_FROM=""
DRIVE_NAME=""
SHOW_HELP=false

################################################################################
# Functions
################################################################################

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}  Movie Upload Script${NC}"
    echo -e "${BLUE}================================${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1" >&2
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

show_help() {
    grep "^#" "$0" | grep -v "^#!/" | sed 's/^# \?//'
    exit 0
}

detect_external_drives() {
    # Detect mounted external drives (macOS)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # List all volumes except Macintosh HD
        local drives=()
        while IFS= read -r volume; do
            drives+=("$volume")
        done < <(ls -1 /Volumes | grep -v "^Macintosh HD$" || true)

        if [[ ${#drives[@]} -eq 0 ]]; then
            print_warning "No external drives detected"
            return 1
        fi

        echo "${drives[@]}"
        return 0
    else
        print_warning "Auto-detection only supported on macOS"
        return 1
    fi
}

select_drive() {
    local drives
    mapfile -t drives < <(detect_external_drives)

    if [[ ${#drives[@]} -eq 0 ]]; then
        print_error "No external drives found. Please mount your drive or specify --source manually."
        exit 1
    fi

    if [[ ${#drives[@]} -eq 1 ]]; then
        echo "${drives[0]}"
        return 0
    fi

    # Multiple drives - let user select
    print_info "Multiple external drives detected:"
    local i=1
    for drive in "${drives[@]}"; do
        echo "  $i) $drive"
        ((i++))
    done

    echo -n "Select drive number (1-${#drives[@]}): "
    read -r selection

    if [[ ! "$selection" =~ ^[0-9]+$ ]] || [[ "$selection" -lt 1 ]] || [[ "$selection" -gt ${#drives[@]} ]]; then
        print_error "Invalid selection"
        exit 1
    fi

    echo "${drives[$((selection-1))]}"
}

find_movies_directory() {
    local drive_path="$1"

    # Common movie directory names
    local movie_dirs=("Movies" "MOVIES" "movies" "Films" "FILMS" "films" "Video" "VIDEO" "video")

    for dir_name in "${movie_dirs[@]}"; do
        local full_path="${drive_path}/${dir_name}"
        if [[ -d "$full_path" ]]; then
            echo "$full_path"
            return 0
        fi
    done

    # No standard directory found - use drive root
    echo "$drive_path"
}

check_prerequisites() {
    print_info "Checking prerequisites..."

    # Check Python script exists
    if [[ ! -f "$PYTHON_SCRIPT" ]]; then
        print_error "Python script not found: $PYTHON_SCRIPT"
        exit 1
    fi
    print_success "Python script found"

    # Check Python version
    if ! command -v python3 &> /dev/null; then
        print_error "Python 3 not found. Please install Python 3.11+"
        exit 1
    fi

    local python_version
    python_version=$(python3 --version 2>&1 | awk '{print $2}' | cut -d. -f1,2)
    if [[ $(echo "$python_version < 3.11" | bc) -eq 1 ]]; then
        print_error "Python 3.11+ required (found: $python_version)"
        exit 1
    fi
    print_success "Python $python_version detected"

    # Check Poetry
    if ! command -v poetry &> /dev/null; then
        print_error "Poetry not found. Please install Poetry: https://python-poetry.org/docs/"
        exit 1
    fi
    print_success "Poetry found"

    # Check MongoDB URL
    if [[ -z "${MONGODB_URL:-}" ]]; then
        print_error "MONGODB_URL environment variable not set"
        print_info "Please set MongoDB Atlas connection string:"
        print_info "  export MONGODB_URL='mongodb+srv://user:pass@cluster.mongodb.net'"
        exit 1
    fi

    # Verify it's not localhost
    if [[ "$MONGODB_URL" == *"localhost"* ]]; then
        print_error "Cannot use localhost for production uploads"
        print_info "Please set MONGODB_URL to MongoDB Atlas connection string"
        exit 1
    fi
    print_success "MongoDB Atlas connection configured"

    # Check GCS credentials
    if [[ -z "${GOOGLE_APPLICATION_CREDENTIALS:-}" ]]; then
        # Try gcloud auth
        if ! gcloud auth application-default print-access-token &> /dev/null; then
            print_warning "No Google Cloud credentials found"
            print_info "Please authenticate:"
            print_info "  gcloud auth application-default login"
            print_info "Or set GOOGLE_APPLICATION_CREDENTIALS to service account key path"
            exit 1
        fi
        print_success "Google Cloud credentials (gcloud auth)"
    else
        if [[ ! -f "$GOOGLE_APPLICATION_CREDENTIALS" ]]; then
            print_error "GOOGLE_APPLICATION_CREDENTIALS file not found: $GOOGLE_APPLICATION_CREDENTIALS"
            exit 1
        fi
        print_success "Google Cloud credentials (service account)"
    fi

    # Check backend dependencies
    print_info "Checking backend dependencies..."
    cd "$BACKEND_DIR"
    if ! poetry check --quiet 2>/dev/null; then
        print_warning "Backend dependencies may need updating"
        print_info "Run: cd backend && poetry install"
    else
        print_success "Backend dependencies ready"
    fi

    echo ""
}

################################################################################
# Parse Arguments
################################################################################

while [[ $# -gt 0 ]]; do
    case $1 in
        --source)
            SOURCE_DIR="$2"
            shift 2
            ;;
        --url)
            SOURCE_URL="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --limit)
            LIMIT="$2"
            shift 2
            ;;
        --start-from)
            START_FROM="$2"
            shift 2
            ;;
        --drive-name)
            DRIVE_NAME="$2"
            shift 2
            ;;
        --help|-h)
            SHOW_HELP=true
            shift
            ;;
        *)
            print_error "Unknown option: $1"
            echo ""
            show_help
            ;;
    esac
done

################################################################################
# Main
################################################################################

main() {
    if [[ "$SHOW_HELP" == true ]]; then
        show_help
    fi

    print_header

    # Check for conflicting options
    if [[ -n "$SOURCE_URL" && -n "$SOURCE_DIR" ]]; then
        print_error "Cannot specify both --source and --url"
        exit 1
    fi

    # Handle URL source
    if [[ -n "$SOURCE_URL" ]]; then
        print_info "URL source: $SOURCE_URL"
        echo ""
        check_prerequisites

        local python_cmd="poetry run python ${PYTHON_SCRIPT}"
        python_cmd+=" --url \"${SOURCE_URL}\""

        if [[ "$DRY_RUN" == true ]]; then
            python_cmd+=" --dry-run"
        fi

        cd "$BACKEND_DIR"
        eval "$python_cmd"

        echo ""
        print_success "Upload complete!"
        return 0
    fi

    # Auto-detect source directory if not specified
    if [[ -z "$SOURCE_DIR" ]]; then
        print_info "Auto-detecting external drive..."

        if [[ -n "$DRIVE_NAME" ]]; then
            # Use specified drive name
            if [[ -d "/Volumes/$DRIVE_NAME" ]]; then
                local drive_path="/Volumes/$DRIVE_NAME"
                SOURCE_DIR=$(find_movies_directory "$drive_path")
                print_success "Using drive: $DRIVE_NAME"
            else
                print_error "Drive not found: /Volumes/$DRIVE_NAME"
                exit 1
            fi
        else
            # Auto-select drive
            local selected_drive
            selected_drive=$(select_drive)
            local drive_path="/Volumes/$selected_drive"
            SOURCE_DIR=$(find_movies_directory "$drive_path")
            print_success "Selected drive: $selected_drive"
        fi

        print_info "Movies directory: $SOURCE_DIR"
        echo ""
    fi

    # Verify source directory exists
    if [[ ! -d "$SOURCE_DIR" ]]; then
        print_error "Source directory not found: $SOURCE_DIR"
        exit 1
    fi

    # Check prerequisites
    check_prerequisites

    # Build Python command
    local python_cmd="poetry run python ${PYTHON_SCRIPT}"
    python_cmd+=" --source \"${SOURCE_DIR}\""

    if [[ "$DRY_RUN" == true ]]; then
        python_cmd+=" --dry-run"
        print_warning "DRY RUN MODE - No files will be uploaded"
        echo ""
    fi

    if [[ -n "$LIMIT" ]]; then
        python_cmd+=" --limit ${LIMIT}"
        print_info "Limiting to first ${LIMIT} movies"
        echo ""
    fi

    if [[ -n "$START_FROM" ]]; then
        python_cmd+=" --start-from ${START_FROM}"
        print_info "Starting from movies beginning with '${START_FROM}'"
        echo ""
    fi

    # Show summary
    print_info "Configuration:"
    echo "  Source:      $SOURCE_DIR"
    echo "  Dry Run:     $DRY_RUN"
    [[ -n "$LIMIT" ]] && echo "  Limit:       $LIMIT movies"
    [[ -n "$START_FROM" ]] && echo "  Start From:  $START_FROM"
    echo ""

    # Confirm if not dry-run
    if [[ "$DRY_RUN" != true ]]; then
        print_warning "This will upload movies to production GCS and MongoDB Atlas"
        echo -n "Continue? (y/N): "
        read -r confirm

        if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
            print_info "Aborted by user"
            exit 0
        fi
        echo ""
    fi

    # Run upload
    print_info "Starting movie upload..."
    echo ""

    cd "$BACKEND_DIR"
    eval "$python_cmd"

    echo ""
    print_success "Upload complete!"
}

# Run main function
main
