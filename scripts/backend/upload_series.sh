#!/usr/bin/env bash

################################################################################
# upload_series.sh
#
# Purpose:
#   Easy-to-use wrapper for uploading TV series from external drives to GCS and
#   MongoDB Atlas. Handles environment setup, drive detection, and series upload.
#
# Usage:
#   ./upload_series.sh [OPTIONS]
#
# Options:
#   --source PATH         Source directory (default: auto-detect external drive)
#   --url URL            Download episode from URL instead of local source
#   --dry-run            Show what would be done without uploading
#   --limit N            Process only first N series (for testing)
#   --series NAME        Filter to specific series name (partial match)
#   --save-hash          Save computed hashes to MongoDB (useful with --dry-run)
#   --drive-name NAME    External drive volume name (default: auto-detect)
#   --help               Show this help message
#
# Examples:
#   # Dry run to see what would be uploaded
#   ./upload_series.sh --dry-run
#
#   # Upload from URL
#   ./upload_series.sh --url https://example.com/episode.mkv
#
#   # Upload first 2 series (testing)
#   ./upload_series.sh --limit 2
#
#   # Upload specific series only
#   ./upload_series.sh --series "Game of Thrones"
#
#   # Specify custom source directory
#   ./upload_series.sh --source /Volumes/MyDrive/Series
#
#   # Dry run with limit
#   ./upload_series.sh --dry-run --limit 3
#
# Expected Directory Structure:
#   /Volumes/USB Drive/Series/
#     ├── Game of Thrones/
#     │   ├── Season 1/
#     │   │   ├── Game.of.Thrones.S01E01.mkv
#     │   │   └── Game.of.Thrones.S01E02.mkv
#     │   └── Season 2/
#     │       └── ...
#     └── Breaking Bad/
#         └── ...
#
# Prerequisites:
#   - MongoDB Atlas connection string in MONGODB_URI environment variable
#   - Google Cloud credentials configured (gcloud auth or service account)
#   - Python 3.11+ with Poetry
#   - Backend dependencies installed (poetry install)
#
# Environment Variables:
#   MONGODB_URI           MongoDB Atlas connection string (REQUIRED)
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
PYTHON_SCRIPT="${SCRIPT_DIR}/upload_series.py"

# Load backend .env if it exists (safe parsing)
if [[ -f "${BACKEND_DIR}/.env" ]]; then
    while IFS='=' read -r key value; do
        # Skip comments and empty lines
        [[ -z "$key" || "$key" =~ ^[[:space:]]*# ]] && continue
        # Remove leading/trailing whitespace from key
        key=$(echo "$key" | xargs)
        # Export only if key is a valid variable name
        if [[ "$key" =~ ^[a-zA-Z_][a-zA-Z0-9_]*$ ]]; then
            export "$key=$value"
        fi
    done < "${BACKEND_DIR}/.env"
fi

# Default values
SOURCE_DIR=""
SOURCE_URL=""
DRY_RUN=false
LIMIT=""
SERIES_FILTER=""
SAVE_HASH=false
DRIVE_NAME=""
SHOW_HELP=false

################################################################################
# Functions
################################################################################

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}  Series Upload Script${NC}"
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
    if [[ "$OSTYPE" == "darwin"* ]]; then
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
    local drives=()
    local drive_output

    drive_output=$(detect_external_drives 2>/dev/null) || {
        print_error "No external drives found. Please mount your drive or specify --source manually."
        exit 1
    }

    # Read drives into array (bash 3.x compatible)
    while IFS= read -r line; do
        [[ -n "$line" ]] && drives+=("$line")
    done <<< "$drive_output"

    if [[ ${#drives[@]} -eq 0 ]]; then
        print_error "No external drives found. Please mount your drive or specify --source manually."
        exit 1
    fi

    if [[ ${#drives[@]} -eq 1 ]]; then
        echo "${drives[0]}"
        return 0
    fi

    # Multiple drives - let user select
    print_info "Multiple external drives detected:" >&2
    local i=1
    for drive in "${drives[@]}"; do
        echo "  $i) $drive" >&2
        ((i++))
    done

    echo -n "Select drive number (1-${#drives[@]}): " >&2
    read -r selection

    if [[ ! "$selection" =~ ^[0-9]+$ ]] || [[ "$selection" -lt 1 ]] || [[ "$selection" -gt ${#drives[@]} ]]; then
        print_error "Invalid selection"
        exit 1
    fi

    echo "${drives[$((selection-1))]}"
}

find_series_directory() {
    local drive_path="$1"

    local series_dirs=("Series" "SERIES" "series" "TV Shows" "TV" "Shows")

    for dir_name in "${series_dirs[@]}"; do
        local full_path="${drive_path}/${dir_name}"
        if [[ -d "$full_path" ]]; then
            echo "$full_path"
            return 0
        fi
    done

    echo "$drive_path"
}

check_prerequisites() {
    print_info "Checking prerequisites..."

    if [[ ! -f "$PYTHON_SCRIPT" ]]; then
        print_error "Python script not found: $PYTHON_SCRIPT"
        exit 1
    fi
    print_success "Python script found"

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

    if ! command -v poetry &> /dev/null; then
        print_error "Poetry not found. Please install Poetry"
        exit 1
    fi
    print_success "Poetry found"

    if [[ -z "${MONGODB_URI:-}" ]]; then
        print_error "MONGODB_URI environment variable not set"
        print_info "Please set MongoDB Atlas connection string"
        exit 1
    fi

    if [[ "$MONGODB_URI" == *"localhost"* ]]; then
        print_error "Cannot use localhost for production uploads"
        exit 1
    fi
    print_success "MongoDB Atlas connection configured"

    if [[ -z "${GOOGLE_APPLICATION_CREDENTIALS:-}" ]]; then
        if ! gcloud auth application-default print-access-token &> /dev/null; then
            print_warning "No Google Cloud credentials found"
            print_info "Please authenticate: gcloud auth application-default login"
            exit 1
        fi
        print_success "Google Cloud credentials (gcloud auth)"
    else
        if [[ ! -f "$GOOGLE_APPLICATION_CREDENTIALS" ]]; then
            print_error "GOOGLE_APPLICATION_CREDENTIALS file not found"
            exit 1
        fi
        print_success "Google Cloud credentials (service account)"
    fi

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
        --series)
            SERIES_FILTER="$2"
            shift 2
            ;;
        --save-hash)
            SAVE_HASH=true
            shift
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

        if [[ -n "$SERIES_FILTER" ]]; then
            python_cmd+=" --series \"${SERIES_FILTER}\""
        fi

        cd "$BACKEND_DIR"
        eval "$python_cmd"

        echo ""
        print_success "Upload complete!"
        return 0
    fi

    if [[ -z "$SOURCE_DIR" ]]; then
        print_info "Auto-detecting external drive..."

        if [[ -n "$DRIVE_NAME" ]]; then
            if [[ -d "/Volumes/$DRIVE_NAME" ]]; then
                local drive_path="/Volumes/$DRIVE_NAME"
                SOURCE_DIR=$(find_series_directory "$drive_path")
                print_success "Using drive: $DRIVE_NAME"
            else
                print_error "Drive not found: /Volumes/$DRIVE_NAME"
                exit 1
            fi
        else
            local selected_drive
            selected_drive=$(select_drive)
            local drive_path="/Volumes/$selected_drive"
            SOURCE_DIR=$(find_series_directory "$drive_path")
            print_success "Selected drive: $selected_drive"
        fi

        print_info "Series directory: $SOURCE_DIR"
        echo ""
    fi

    if [[ ! -d "$SOURCE_DIR" ]]; then
        print_error "Source directory not found: $SOURCE_DIR"
        exit 1
    fi

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
        print_info "Limiting to first ${LIMIT} series"
        echo ""
    fi

    if [[ -n "$SERIES_FILTER" ]]; then
        python_cmd+=" --series \"${SERIES_FILTER}\""
        print_info "Filtering to series: ${SERIES_FILTER}"
        echo ""
    fi

    if [[ "$SAVE_HASH" == true ]]; then
        python_cmd+=" --save-hash"
        print_info "Will save computed hashes to MongoDB"
        echo ""
    fi

    print_info "Configuration:"
    echo "  Source:      $SOURCE_DIR"
    echo "  Dry Run:     $DRY_RUN"
    echo "  Save Hash:   $SAVE_HASH"
    [[ -n "$LIMIT" ]] && echo "  Limit:       $LIMIT series"
    [[ -n "$SERIES_FILTER" ]] && echo "  Filter:      $SERIES_FILTER"
    echo ""

    if [[ "$DRY_RUN" != true ]]; then
        print_warning "This will upload series to production GCS and MongoDB Atlas"
        echo -n "Continue? (y/N): "
        read -r confirm

        if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
            print_info "Aborted by user"
            exit 0
        fi
        echo ""
    fi

    print_info "Starting series upload..."
    echo ""

    cd "$BACKEND_DIR"
    eval "$python_cmd"

    echo ""
    print_success "Upload complete!"
}

main
