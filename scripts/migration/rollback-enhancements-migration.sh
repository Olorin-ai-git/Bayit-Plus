#!/bin/bash

# CVPlus Enhancements Module Migration Rollback Script
#
# This script provides comprehensive rollback capabilities for the enhancements
# module integration migration (T001-T037). It validates the current state
# and provides options for selective or complete rollback.
#
# Author: Gil Klainert
# Date: 2025-01-16
# Migration: 010-enhancements-module-integration

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKUP_DIR="$PROJECT_ROOT/.migration-backups/$(date +%Y%m%d_%H%M%S)"
LOG_FILE="$PROJECT_ROOT/logs/migration-rollback-$(date +%Y%m%d_%H%M%S).log"

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"
mkdir -p "$BACKUP_DIR"

# Logging function
log() {
    echo -e "$1" | tee -a "$LOG_FILE"
}

# Header
log "${BLUE}====================================================================${NC}"
log "${BLUE}    CVPlus Enhancements Module Migration Rollback Script${NC}"
log "${BLUE}====================================================================${NC}"
log "${BLUE}Migration: 010-enhancements-module-integration${NC}"
log "${BLUE}Backup Directory: $BACKUP_DIR${NC}"
log "${BLUE}Log File: $LOG_FILE${NC}"
log "${BLUE}====================================================================${NC}"

# Validation function
validate_git_status() {
    log "${YELLOW}📋 Validating Git repository status...${NC}"

    cd "$PROJECT_ROOT"

    if ! git status --porcelain | grep -q .; then
        log "${GREEN}✅ Git repository is clean${NC}"
        return 0
    else
        log "${RED}❌ Git repository has uncommitted changes${NC}"
        log "${YELLOW}Uncommitted files:${NC}"
        git status --porcelain | sed 's/^/  /'

        read -p "Continue with rollback anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log "${YELLOW}⚠️ Rollback cancelled by user${NC}"
            exit 1
        fi
    fi
}

# Backup current state
backup_current_state() {
    log "${YELLOW}💾 Creating backup of current state...${NC}"

    # Backup enhancements module
    if [[ -d "$PROJECT_ROOT/packages/enhancements" ]]; then
        cp -r "$PROJECT_ROOT/packages/enhancements" "$BACKUP_DIR/enhancements-current"
        log "${GREEN}✅ Backed up enhancements module${NC}"
    fi

    # Backup modified package.json files
    mkdir -p "$BACKUP_DIR/package-json-backups"
    find "$PROJECT_ROOT" -name "package.json" -path "*/packages/*" -exec cp {} "$BACKUP_DIR/package-json-backups/{}.backup" \;
    cp "$PROJECT_ROOT/functions/package.json" "$BACKUP_DIR/package-json-backups/functions-package.json.backup"

    # Backup modified tsconfig.json files
    mkdir -p "$BACKUP_DIR/tsconfig-backups"
    find "$PROJECT_ROOT" -name "tsconfig.json" -path "*/packages/*" -exec cp {} "$BACKUP_DIR/tsconfig-backups/{}.backup" \;
    cp "$PROJECT_ROOT/functions/tsconfig.json" "$BACKUP_DIR/tsconfig-backups/functions-tsconfig.json.backup"

    # Backup modified functions index.ts
    cp "$PROJECT_ROOT/functions/src/index.ts" "$BACKUP_DIR/functions-index.ts.backup"

    log "${GREEN}✅ Current state backed up to: $BACKUP_DIR${NC}"
}

# Rollback options
show_rollback_menu() {
    log "${YELLOW}🔄 Rollback Options:${NC}"
    echo "1. Complete rollback (remove enhancements module, restore all changes)"
    echo "2. Remove enhancements module only (keep dependency updates)"
    echo "3. Restore original imports only (keep enhancements module)"
    echo "4. Validate rollback feasibility only (no changes)"
    echo "5. Cancel rollback"
    echo
}

# Remove enhancements module
remove_enhancements_module() {
    log "${YELLOW}🗑️ Removing enhancements module...${NC}"

    if [[ -d "$PROJECT_ROOT/packages/enhancements" ]]; then
        # Move to backup instead of deleting
        mv "$PROJECT_ROOT/packages/enhancements" "$BACKUP_DIR/enhancements-removed"
        log "${GREEN}✅ Enhancements module moved to backup${NC}"
    else
        log "${YELLOW}⚠️ Enhancements module not found${NC}"
    fi
}

# Restore package.json dependencies
restore_package_dependencies() {
    log "${YELLOW}📦 Restoring package.json dependencies...${NC}"

    # Remove enhancements dependency from functions package.json
    if [[ -f "$PROJECT_ROOT/functions/package.json" ]]; then
        sed -i '' '/"@cvplus\/enhancements":/d' "$PROJECT_ROOT/functions/package.json"
        log "${GREEN}✅ Removed enhancements dependency from functions${NC}"
    fi

    # Remove enhancements dependency from processing package.json
    if [[ -f "$PROJECT_ROOT/packages/processing/package.json" ]]; then
        sed -i '' '/"@cvplus\/enhancements":/d' "$PROJECT_ROOT/packages/processing/package.json"
        log "${GREEN}✅ Removed enhancements dependency from processing${NC}"
    fi

    # Restore original package.json files if backups exist
    if [[ -d "$PROJECT_ROOT/.migration-backups" ]]; then
        local latest_backup=$(find "$PROJECT_ROOT/.migration-backups" -name "package-json-backups" -type d | head -1)
        if [[ -n "$latest_backup" ]]; then
            log "${YELLOW}📋 Found previous package.json backups${NC}"
            # Restore logic would go here if we had pre-migration backups
        fi
    fi
}

# Restore tsconfig.json files
restore_tsconfig_files() {
    log "${YELLOW}⚙️ Restoring tsconfig.json files...${NC}"

    # Remove enhancements paths from functions tsconfig.json
    if [[ -f "$PROJECT_ROOT/functions/tsconfig.json" ]]; then
        sed -i '' '/"@cvplus\/enhancements"/d' "$PROJECT_ROOT/functions/tsconfig.json"
        sed -i '' '/"@cvplus\/enhancements\/\*"/d' "$PROJECT_ROOT/functions/tsconfig.json"
        log "${GREEN}✅ Removed enhancements paths from functions tsconfig${NC}"
    fi
}

# Restore functions index.ts
restore_functions_index() {
    log "${YELLOW}🔧 Restoring functions index.ts...${NC}"

    if [[ -f "$PROJECT_ROOT/functions/src/index.ts" ]]; then
        # Remove enhancements exports section
        sed -i '' '/ENHANCEMENTS FUNCTIONS/,/PAYMENTS FUNCTIONS/c\
// ============================================================================\
// PAYMENTS FUNCTIONS\
// ============================================================================' "$PROJECT_ROOT/functions/src/index.ts"

        log "${GREEN}✅ Removed enhancements exports from functions index${NC}"
    fi
}

# Restore dependency configurations
restore_dependency_configs() {
    log "${YELLOW}🔗 Restoring dependency configurations...${NC}"

    # Remove enhancements from module dependency mappings
    local files=(
        "$PROJECT_ROOT/functions/src/api/modules/index.ts"
        "$PROJECT_ROOT/functions/src/recovery/services/ValidationService.ts"
        "$PROJECT_ROOT/functions/src/recovery/services/ModuleRecoveryService.ts"
    )

    for file in "${files[@]}"; do
        if [[ -f "$file" ]]; then
            sed -i '' '/enhancements.*@cvplus\/core.*@cvplus\/auth.*@cvplus\/i18n.*@cvplus\/processing.*@cvplus\/multimedia.*@cvplus\/analytics/d' "$file"
            sed -i '' 's/@cvplus\/enhancements, //g' "$file"
            sed -i '' 's/, @cvplus\/enhancements//g' "$file"
            log "${GREEN}✅ Cleaned enhancements from $(basename "$file")${NC}"
        fi
    done
}

# Restore original enhancement imports
restore_original_imports() {
    log "${YELLOW}↩️ Restoring original enhancement imports...${NC}"

    # Find and restore imports in processing module
    local processing_files=(
        "$PROJECT_ROOT/packages/processing/src/frontend/components/enhancement/ProgressVisualization.tsx"
        "$PROJECT_ROOT/packages/processing/src/frontend/components/enhancement/CVPreviewPanel.tsx"
    )

    for file in "${processing_files[@]}"; do
        if [[ -f "$file" ]]; then
            # Restore original relative imports
            sed -i '' 's|@cvplus/enhancements/frontend|../../services/enhancement|g' "$file"
            log "${GREEN}✅ Restored imports in $(basename "$file")${NC}"
        fi
    done
}

# Validate rollback feasibility
validate_rollback_feasibility() {
    log "${YELLOW}🔍 Validating rollback feasibility...${NC}"

    local issues=0

    # Check if enhancements module exists
    if [[ ! -d "$PROJECT_ROOT/packages/enhancements" ]]; then
        log "${YELLOW}⚠️ Enhancements module not found - may already be rolled back${NC}"
        ((issues++))
    fi

    # Check for uncommitted git changes
    cd "$PROJECT_ROOT"
    if git status --porcelain | grep -q .; then
        log "${YELLOW}⚠️ Uncommitted changes detected - backup recommended before rollback${NC}"
        ((issues++))
    fi

    # Check for dependencies on enhancements module
    local deps_count=$(grep -r "@cvplus/enhancements" "$PROJECT_ROOT/packages" "$PROJECT_ROOT/functions" 2>/dev/null | wc -l)
    if [[ $deps_count -gt 0 ]]; then
        log "${YELLOW}⚠️ Found $deps_count references to @cvplus/enhancements${NC}"
        log "${YELLOW}   These will need to be updated during rollback${NC}"
    fi

    if [[ $issues -eq 0 ]]; then
        log "${GREEN}✅ Rollback appears feasible${NC}"
        return 0
    else
        log "${YELLOW}⚠️ $issues potential issues identified${NC}"
        return 1
    fi
}

# Complete rollback
perform_complete_rollback() {
    log "${YELLOW}🔄 Performing complete rollback...${NC}"

    backup_current_state
    remove_enhancements_module
    restore_package_dependencies
    restore_tsconfig_files
    restore_functions_index
    restore_dependency_configs
    restore_original_imports

    log "${GREEN}✅ Complete rollback finished${NC}"
    log "${BLUE}📋 Next steps:${NC}"
    log "   1. Run 'npm install' in affected packages"
    log "   2. Run TypeScript compilation to verify"
    log "   3. Run tests to ensure functionality"
    log "   4. Review and commit changes"
}

# Selective rollback - module only
perform_module_rollback() {
    log "${YELLOW}🔄 Performing module-only rollback...${NC}"

    backup_current_state
    remove_enhancements_module
    restore_package_dependencies
    restore_tsconfig_files
    restore_functions_index

    log "${GREEN}✅ Module rollback finished${NC}"
    log "${BLUE}📋 Note: Dependency configurations preserved${NC}"
}

# Selective rollback - imports only
perform_imports_rollback() {
    log "${YELLOW}🔄 Performing imports-only rollback...${NC}"

    backup_current_state
    restore_original_imports

    log "${GREEN}✅ Imports rollback finished${NC}"
    log "${BLUE}📋 Note: Enhancements module preserved${NC}"
}

# Generate rollback report
generate_rollback_report() {
    local report_file="$PROJECT_ROOT/docs/migration/rollback-report-$(date +%Y%m%d_%H%M%S).md"
    mkdir -p "$(dirname "$report_file")"

    cat > "$report_file" << EOF
# Enhancements Module Migration Rollback Report

**Date**: $(date)
**Migration**: 010-enhancements-module-integration
**Rollback Type**: $1
**Backup Location**: $BACKUP_DIR

## Pre-Rollback State

- Enhancements module: $(test -d "$PROJECT_ROOT/packages/enhancements" && echo "Present" || echo "Not present")
- Git status: $(cd "$PROJECT_ROOT" && git status --porcelain | wc -l) uncommitted files
- Dependencies: $(grep -r "@cvplus/enhancements" "$PROJECT_ROOT/packages" "$PROJECT_ROOT/functions" 2>/dev/null | wc -l) references found

## Rollback Actions Performed

### Files Modified
$(if [[ -f "$LOG_FILE" ]]; then grep "✅" "$LOG_FILE" | sed 's/^/- /'; fi)

### Files Backed Up
- Current enhancements module
- All package.json files
- All tsconfig.json files
- Functions index.ts

## Post-Rollback Validation

### Required Manual Steps
1. Run \`npm install\` in affected packages
2. Run TypeScript compilation validation
3. Execute comprehensive testing
4. Review and commit changes

### Verification Commands
\`\`\`bash
# Type checking
npm run type-check

# Build validation
npm run build

# Test execution
npm test

# Dependency validation
./scripts/validate-dependencies.sh
\`\`\`

## Recovery Information

### To Restore Migration
If you need to restore the migration, the backup contains:
- Complete enhancements module: \`$BACKUP_DIR/enhancements-current/\`
- Configuration backups: \`$BACKUP_DIR/package-json-backups/\`
- TypeScript configs: \`$BACKUP_DIR/tsconfig-backups/\`

### Emergency Restoration
\`\`\`bash
# Restore enhancements module
cp -r "$BACKUP_DIR/enhancements-current" "$PROJECT_ROOT/packages/enhancements"

# Restore configurations (manual review recommended)
# Review files in $BACKUP_DIR/ and restore as needed
\`\`\`

## Support Information

For issues with rollback or restoration:
1. Review this report and backup directory
2. Check log file: \`$LOG_FILE\`
3. Validate git history for recent changes
4. Run comprehensive testing after any restoration

EOF

    log "${GREEN}📊 Rollback report generated: $report_file${NC}"
}

# Main execution
main() {
    validate_git_status

    while true; do
        show_rollback_menu
        read -p "Select option (1-5): " choice

        case $choice in
            1)
                echo
                log "${RED}⚠️ This will completely remove the enhancements module and restore all original configurations.${NC}"
                read -p "Are you sure? Type 'YES' to continue: " confirm
                if [[ "$confirm" == "YES" ]]; then
                    perform_complete_rollback
                    generate_rollback_report "Complete"
                    break
                else
                    log "${YELLOW}Operation cancelled${NC}"
                fi
                ;;
            2)
                echo
                log "${YELLOW}This will remove the enhancements module but keep dependency updates.${NC}"
                read -p "Continue? (y/N): " -n 1 -r
                echo
                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    perform_module_rollback
                    generate_rollback_report "Module Only"
                    break
                fi
                ;;
            3)
                echo
                log "${YELLOW}This will restore original imports but keep the enhancements module.${NC}"
                read -p "Continue? (y/N): " -n 1 -r
                echo
                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    perform_imports_rollback
                    generate_rollback_report "Imports Only"
                    break
                fi
                ;;
            4)
                echo
                validate_rollback_feasibility
                ;;
            5)
                log "${YELLOW}Rollback cancelled${NC}"
                exit 0
                ;;
            *)
                echo "Invalid option. Please select 1-5."
                ;;
        esac
        echo
    done

    log "${GREEN}🎉 Rollback process completed successfully!${NC}"
    log "${BLUE}📋 Check the generated report and follow the post-rollback validation steps.${NC}"
}

# Execute main function
main "$@"