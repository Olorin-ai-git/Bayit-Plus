#!/bin/bash

# Legacy Frontend Backup Script
# Creates comprehensive backup of src/js/ directory before migration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKUP_DIR="$PROJECT_ROOT/backups/legacy-frontend"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="legacy-backup-$TIMESTAMP"
SOURCE_DIR="$PROJECT_ROOT/src/js"

# Backup metadata
BACKUP_METADATA_FILE="$BACKUP_DIR/$BACKUP_NAME/metadata.json"

echo -e "${BLUE}🔄 Legacy Frontend Backup Utility${NC}"
echo -e "${BLUE}===================================${NC}\n"

# Function to print step headers
print_step() {
    echo -e "\n${BLUE}$1${NC}"
    echo -e "${BLUE}$(printf '=%.0s' $(seq 1 ${#1}))${NC}\n"
}

# Function to print success
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Function to print error
print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to print info
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Validate environment
validate_environment() {
    print_step "Validating Environment"

    # Check if we're in the correct directory
    if [ ! -f "$PROJECT_ROOT/package.json" ]; then
        print_error "Not in a valid project directory (package.json not found)"
        exit 1
    fi

    # Check if source directory exists
    if [ ! -d "$SOURCE_DIR" ]; then
        print_error "Source directory $SOURCE_DIR does not exist"
        exit 1
    fi

    # Check available disk space
    AVAILABLE_SPACE=$(df "$PROJECT_ROOT" | awk 'NR==2 {print $4}')
    SOURCE_SIZE=$(du -s "$SOURCE_DIR" | awk '{print $1}')
    REQUIRED_SPACE=$((SOURCE_SIZE * 3)) # 3x for safety

    if [ "$AVAILABLE_SPACE" -lt "$REQUIRED_SPACE" ]; then
        print_warning "Low disk space. Available: ${AVAILABLE_SPACE}KB, Required: ${REQUIRED_SPACE}KB"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "Backup cancelled by user"
            exit 0
        fi
    fi

    print_success "Environment validation passed"
}

# Create backup directory structure
create_backup_structure() {
    print_step "Creating Backup Structure"

    # Create main backup directory
    mkdir -p "$BACKUP_DIR/$BACKUP_NAME"

    # Create subdirectories
    mkdir -p "$BACKUP_DIR/$BACKUP_NAME/src/js"
    mkdir -p "$BACKUP_DIR/$BACKUP_NAME/packages"
    mkdir -p "$BACKUP_DIR/$BACKUP_NAME/configs"
    mkdir -p "$BACKUP_DIR/$BACKUP_NAME/docs"
    mkdir -p "$BACKUP_DIR/$BACKUP_NAME/git"

    print_success "Backup directory structure created: $BACKUP_DIR/$BACKUP_NAME"
}

# Backup source files
backup_source_files() {
    print_step "Backing Up Source Files"

    print_info "Copying src/js directory..."
    cp -r "$SOURCE_DIR" "$BACKUP_DIR/$BACKUP_NAME/src/"

    # Count files
    TOTAL_FILES=$(find "$BACKUP_DIR/$BACKUP_NAME/src/js" -type f | wc -l)
    TOTAL_SIZE=$(du -sh "$BACKUP_DIR/$BACKUP_NAME/src/js" | cut -f1)

    print_success "Copied $TOTAL_FILES files ($TOTAL_SIZE)"

    # Create file manifest
    print_info "Creating file manifest..."
    find "$BACKUP_DIR/$BACKUP_NAME/src/js" -type f -exec ls -la {} \; > "$BACKUP_DIR/$BACKUP_NAME/file-manifest.txt"

    print_success "File manifest created"
}

# Backup package dependencies
backup_package_dependencies() {
    print_step "Backing Up Package Dependencies"

    # Backup package.json
    if [ -f "$PROJECT_ROOT/package.json" ]; then
        cp "$PROJECT_ROOT/package.json" "$BACKUP_DIR/$BACKUP_NAME/packages/"
        print_success "package.json backed up"
    fi

    # Backup package-lock.json
    if [ -f "$PROJECT_ROOT/package-lock.json" ]; then
        cp "$PROJECT_ROOT/package-lock.json" "$BACKUP_DIR/$BACKUP_NAME/packages/"
        print_success "package-lock.json backed up"
    fi

    # Backup yarn.lock if exists
    if [ -f "$PROJECT_ROOT/yarn.lock" ]; then
        cp "$PROJECT_ROOT/yarn.lock" "$BACKUP_DIR/$BACKUP_NAME/packages/"
        print_success "yarn.lock backed up"
    fi

    # Extract Material-UI dependencies
    print_info "Extracting Material-UI dependencies..."
    if command -v jq &> /dev/null; then
        jq '{
            materialUiDependencies: {
                dependencies: (.dependencies // {} | to_entries | map(select(.key | contains("@mui") or contains("styled-components") or contains("@emotion"))) | from_entries),
                devDependencies: (.devDependencies // {} | to_entries | map(select(.key | contains("@mui") or contains("styled-components") or contains("@emotion"))) | from_entries)
            }
        }' "$PROJECT_ROOT/package.json" > "$BACKUP_DIR/$BACKUP_NAME/packages/material-ui-dependencies.json"
        print_success "Material-UI dependencies extracted"
    else
        print_warning "jq not available, skipping dependency extraction"
    fi
}

# Backup configuration files
backup_configuration_files() {
    print_step "Backing Up Configuration Files"

    # List of config files to backup
    CONFIG_FILES=(
        "tsconfig.json"
        "webpack.config.js"
        "webpack.prod.config.js"
        ".eslintrc.js"
        ".eslintrc.json"
        "prettier.config.js"
        ".prettierrc"
        "tailwind.config.js"
        "postcss.config.js"
        "craco.config.js"
        "vite.config.ts"
        "jest.config.js"
        "setupTests.ts"
    )

    for config_file in "${CONFIG_FILES[@]}"; do
        if [ -f "$PROJECT_ROOT/$config_file" ]; then
            cp "$PROJECT_ROOT/$config_file" "$BACKUP_DIR/$BACKUP_NAME/configs/"
            print_success "$config_file backed up"
        fi
    done

    # Backup src level configs
    if [ -d "$PROJECT_ROOT/src" ]; then
        find "$PROJECT_ROOT/src" -maxdepth 2 -name "*.config.*" -type f -exec cp {} "$BACKUP_DIR/$BACKUP_NAME/configs/" \;
    fi
}

# Backup git state
backup_git_state() {
    print_step "Backing Up Git State"

    # Check if we're in a git repository
    if [ ! -d "$PROJECT_ROOT/.git" ]; then
        print_warning "Not a git repository, skipping git backup"
        return
    fi

    cd "$PROJECT_ROOT"

    # Get current branch
    CURRENT_BRANCH=$(git branch --show-current)
    echo "$CURRENT_BRANCH" > "$BACKUP_DIR/$BACKUP_NAME/git/current-branch.txt"

    # Get git status
    git status --porcelain > "$BACKUP_DIR/$BACKUP_NAME/git/status.txt"

    # Get recent commits
    git log --oneline -10 > "$BACKUP_DIR/$BACKUP_NAME/git/recent-commits.txt"

    # Get git diff if there are changes
    if [ -s "$BACKUP_DIR/$BACKUP_NAME/git/status.txt" ]; then
        git diff > "$BACKUP_DIR/$BACKUP_NAME/git/working-changes.diff"
        git diff --staged > "$BACKUP_DIR/$BACKUP_NAME/git/staged-changes.diff"
    fi

    # Get current commit hash
    CURRENT_COMMIT=$(git rev-parse HEAD)
    echo "$CURRENT_COMMIT" > "$BACKUP_DIR/$BACKUP_NAME/git/current-commit.txt"

    print_success "Git state backed up (branch: $CURRENT_BRANCH, commit: ${CURRENT_COMMIT:0:8})"
}

# Create backup metadata
create_backup_metadata() {
    print_step "Creating Backup Metadata"

    # Get system information
    HOSTNAME=$(hostname)
    USERNAME=$(whoami)
    SYSTEM_INFO=$(uname -a)
    NODE_VERSION=$(node --version 2>/dev/null || echo "not available")
    NPM_VERSION=$(npm --version 2>/dev/null || echo "not available")

    # Count source files and calculate sizes
    TOTAL_FILES=$(find "$BACKUP_DIR/$BACKUP_NAME/src/js" -type f | wc -l)
    TOTAL_LINES=$(find "$BACKUP_DIR/$BACKUP_NAME/src/js" -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | xargs wc -l | tail -1 | awk '{print $1}')
    BACKUP_SIZE=$(du -sh "$BACKUP_DIR/$BACKUP_NAME" | cut -f1)

    # Count Material-UI files
    MUI_FILES=$(find "$BACKUP_DIR/$BACKUP_NAME/src/js" -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | xargs grep -l "@mui\|styled-components\|@emotion" | wc -l)

    # Create metadata JSON
    cat > "$BACKUP_METADATA_FILE" << EOF
{
  "backup": {
    "name": "$BACKUP_NAME",
    "timestamp": "$TIMESTAMP",
    "date": "$(date -Iseconds)",
    "purpose": "Legacy frontend backup before Material-UI to Tailwind migration"
  },
  "system": {
    "hostname": "$HOSTNAME",
    "username": "$USERNAME",
    "system": "$SYSTEM_INFO",
    "nodeVersion": "$NODE_VERSION",
    "npmVersion": "$NPM_VERSION"
  },
  "source": {
    "directory": "$SOURCE_DIR",
    "totalFiles": $TOTAL_FILES,
    "totalLines": $TOTAL_LINES,
    "materialUiFiles": $MUI_FILES,
    "backupSize": "$BACKUP_SIZE"
  },
  "git": {
    "branch": "$(cat "$BACKUP_DIR/$BACKUP_NAME/git/current-branch.txt" 2>/dev/null || echo "unknown")",
    "commit": "$(cat "$BACKUP_DIR/$BACKUP_NAME/git/current-commit.txt" 2>/dev/null || echo "unknown")",
    "hasChanges": $([ -s "$BACKUP_DIR/$BACKUP_NAME/git/status.txt" ] && echo "true" || echo "false")
  },
  "migration": {
    "phase": "pre-migration",
    "targetArchitecture": "Module Federation Microservices",
    "targetStyling": "Tailwind CSS + Headless UI",
    "estimatedFiles": $TOTAL_FILES,
    "estimatedLines": $TOTAL_LINES
  },
  "restore": {
    "instructions": "Run restore-legacy-backup.sh script",
    "command": "./scripts/migration/restore-legacy-backup.sh $BACKUP_NAME",
    "requirements": ["git", "node", "npm"]
  }
}
EOF

    print_success "Backup metadata created"
}

# Generate backup report
generate_backup_report() {
    print_step "Generating Backup Report"

    REPORT_FILE="$BACKUP_DIR/$BACKUP_NAME/BACKUP_REPORT.md"

    cat > "$REPORT_FILE" << EOF
# Legacy Frontend Backup Report

**Backup Name:** $BACKUP_NAME
**Created:** $(date)
**Purpose:** Pre-migration backup of legacy Material-UI frontend

## Summary

- **Total Files:** $TOTAL_FILES
- **Total Lines:** $TOTAL_LINES
- **Material-UI Files:** $MUI_FILES
- **Backup Size:** $BACKUP_SIZE
- **Git Branch:** $(cat "$BACKUP_DIR/$BACKUP_NAME/git/current-branch.txt" 2>/dev/null || echo "unknown")
- **Git Commit:** $(cat "$BACKUP_DIR/$BACKUP_NAME/git/current-commit.txt" 2>/dev/null || echo "unknown")

## Contents

### Source Files
- \`src/js/\` - Complete legacy source directory
- \`file-manifest.txt\` - Detailed file listing

### Dependencies
- \`packages/package.json\` - Original package.json
- \`packages/package-lock.json\` - Dependency lock file
- \`packages/material-ui-dependencies.json\` - Extracted Material-UI dependencies

### Configuration
- \`configs/\` - All configuration files (webpack, TypeScript, ESLint, etc.)

### Git State
- \`git/current-branch.txt\` - Current git branch
- \`git/current-commit.txt\` - Current commit hash
- \`git/status.txt\` - Git working directory status
- \`git/recent-commits.txt\` - Recent commit history
- \`git/working-changes.diff\` - Uncommitted changes (if any)
- \`git/staged-changes.diff\` - Staged changes (if any)

## Restore Instructions

To restore this backup:

\`\`\`bash
# Navigate to project root
cd /path/to/olorin-front

# Run restore script
./scripts/migration/restore-legacy-backup.sh $BACKUP_NAME

# Or restore manually:
# 1. Remove current src/js/
rm -rf src/js

# 2. Restore from backup
cp -r backups/legacy-frontend/$BACKUP_NAME/src/js src/

# 3. Restore package.json
cp backups/legacy-frontend/$BACKUP_NAME/packages/package.json .

# 4. Restore configuration files
cp backups/legacy-frontend/$BACKUP_NAME/configs/* .

# 5. Install dependencies
npm install

# 6. Restart development server
npm start
\`\`\`

## Verification

To verify the backup:

\`\`\`bash
# Check file count
find backups/legacy-frontend/$BACKUP_NAME/src/js -type f | wc -l

# Check backup integrity
./scripts/migration/verify-backup.sh $BACKUP_NAME
\`\`\`

---

**Backup created by:** $USERNAME@$HOSTNAME
**System:** $SYSTEM_INFO
**Node.js:** $NODE_VERSION
**npm:** $NPM_VERSION
EOF

    print_success "Backup report generated: $REPORT_FILE"
}

# Verify backup integrity
verify_backup_integrity() {
    print_step "Verifying Backup Integrity"

    # Check if all expected directories exist
    EXPECTED_DIRS=("src/js" "packages" "configs" "git")
    for dir in "${EXPECTED_DIRS[@]}"; do
        if [ ! -d "$BACKUP_DIR/$BACKUP_NAME/$dir" ]; then
            print_error "Missing directory: $dir"
            return 1
        fi
    done

    # Check if source files were copied correctly
    ORIGINAL_COUNT=$(find "$SOURCE_DIR" -type f | wc -l)
    BACKUP_COUNT=$(find "$BACKUP_DIR/$BACKUP_NAME/src/js" -type f | wc -l)

    if [ "$ORIGINAL_COUNT" -ne "$BACKUP_COUNT" ]; then
        print_error "File count mismatch. Original: $ORIGINAL_COUNT, Backup: $BACKUP_COUNT"
        return 1
    fi

    # Check if metadata file exists and is valid JSON
    if [ ! -f "$BACKUP_METADATA_FILE" ]; then
        print_error "Metadata file missing"
        return 1
    fi

    if command -v jq &> /dev/null; then
        if ! jq empty "$BACKUP_METADATA_FILE" 2>/dev/null; then
            print_error "Invalid metadata JSON"
            return 1
        fi
    fi

    print_success "Backup integrity verified"
    print_info "Original files: $ORIGINAL_COUNT, Backup files: $BACKUP_COUNT"
}

# Main execution
main() {
    print_info "Starting legacy frontend backup process..."
    print_info "Source: $SOURCE_DIR"
    print_info "Destination: $BACKUP_DIR/$BACKUP_NAME"

    validate_environment
    create_backup_structure
    backup_source_files
    backup_package_dependencies
    backup_configuration_files
    backup_git_state
    create_backup_metadata
    generate_backup_report
    verify_backup_integrity

    print_step "Backup Summary"
    print_success "Backup completed successfully!"
    print_info "Backup location: $BACKUP_DIR/$BACKUP_NAME"
    print_info "Backup size: $(du -sh "$BACKUP_DIR/$BACKUP_NAME" | cut -f1)"
    print_info "Files backed up: $(find "$BACKUP_DIR/$BACKUP_NAME/src/js" -type f | wc -l)"

    echo -e "\n${BLUE}📋 Next Steps:${NC}"
    echo -e "1. Review backup report: ${YELLOW}$BACKUP_DIR/$BACKUP_NAME/BACKUP_REPORT.md${NC}"
    echo -e "2. Tag git state: ${YELLOW}git tag legacy-frontend-backup${NC}"
    echo -e "3. Begin migration with confidence!"

    echo -e "\n${BLUE}💾 Restore Command:${NC}"
    echo -e "${YELLOW}./scripts/migration/restore-legacy-backup.sh $BACKUP_NAME${NC}"
}

# Check for help flag
if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    echo "Legacy Frontend Backup Script"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -h, --help    Show this help message"
    echo ""
    echo "This script creates a comprehensive backup of the legacy frontend"
    echo "before starting the Material-UI to Tailwind CSS migration."
    echo ""
    echo "The backup includes:"
    echo "  - Complete src/js/ directory"
    echo "  - Package dependencies (package.json, lock files)"
    echo "  - Configuration files (webpack, TypeScript, ESLint, etc.)"
    echo "  - Git state (branch, commit, changes)"
    echo "  - Metadata and restore instructions"
    exit 0
fi

# Run main function
main "$@"