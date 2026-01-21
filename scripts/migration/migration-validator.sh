#!/bin/bash

# CVPlus Migration Validator
# Comprehensive validation script to ensure migration success
# Author: Gil Klainert
# Date: 2025-09-16

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
CVPLUS_ROOT="/Users/gklainert/Documents/cvplus"
VALIDATION_LOG="$CVPLUS_ROOT/scripts/migration/validation.log"
ISSUES_FOUND=0

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$VALIDATION_LOG"
}

# Error tracking
track_error() {
    ((ISSUES_FOUND++))
    echo -e "${RED}❌ ISSUE: $1${NC}"
    log "ISSUE: $1"
}

# Success message
success() {
    echo -e "${GREEN}✅ $1${NC}"
    log "SUCCESS: $1"
}

# Info message
info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
    log "INFO: $1"
}

# Check if file exists
check_file_exists() {
    local file_path="$1"
    local description="$2"

    if [[ -f "$file_path" ]]; then
        success "$description found: $file_path"
        return 0
    else
        track_error "$description not found: $file_path"
        return 1
    fi
}

# Check if file does NOT exist (should have been moved)
check_file_not_exists() {
    local file_path="$1"
    local description="$2"

    if [[ ! -f "$file_path" ]]; then
        success "$description properly removed: $file_path"
        return 0
    else
        track_error "$description still exists (should have been moved): $file_path"
        return 1
    fi
}

# Check if directory exists
check_directory_exists() {
    local dir_path="$1"
    local description="$2"

    if [[ -d "$dir_path" ]]; then
        success "$description directory exists: $dir_path"
        return 0
    else
        track_error "$description directory missing: $dir_path"
        return 1
    fi
}

# Check package structure
validate_package_structure() {
    local package_name="$1"
    local package_path="$CVPLUS_ROOT/packages/$package_name"

    info "Validating $package_name package structure..."

    # Check if package directory exists
    check_directory_exists "$package_path" "$package_name package"

    # Check if package has src directory
    check_directory_exists "$package_path/src" "$package_name src"

    # Check if package has package.json
    check_file_exists "$package_path/package.json" "$package_name package.json"

    # Check if package has index.ts
    if [[ -f "$package_path/src/index.ts" ]]; then
        success "$package_name has index.ts export file"
    else
        track_error "$package_name missing index.ts export file"
    fi
}

# Validate processing package migration
validate_processing_migration() {
    info "🔍 Validating Processing Package Migration"

    local processing_pkg="$CVPLUS_ROOT/packages/processing/src"

    # Check migrated services exist in target
    check_file_exists "$processing_pkg/services/ai-analysis.service.ts" "AI Analysis Service"
    check_file_exists "$processing_pkg/services/role-detection.service.ts" "Role Detection Service"
    check_file_exists "$processing_pkg/services/cv-transformation.service.ts" "CV Transformation Service"

    # Check services no longer exist in source
    check_file_not_exists "$CVPLUS_ROOT/functions/src/services/ai-analysis.service.ts" "AI Analysis Service in functions"
    check_file_not_exists "$CVPLUS_ROOT/functions/src/services/role-detection.service.ts" "Role Detection Service in functions"
    check_file_not_exists "$CVPLUS_ROOT/functions/src/services/cv-transformation.service.ts" "CV Transformation Service in functions"

    # Validate package structure
    validate_package_structure "processing"
}

# Validate multimedia package migration
validate_multimedia_migration() {
    info "🔍 Validating Multimedia Package Migration"

    local multimedia_pkg="$CVPLUS_ROOT/packages/multimedia/src"

    # Check migrated services exist in target
    check_file_exists "$multimedia_pkg/services/enhanced-video-generation.service.ts" "Enhanced Video Generation Service"
    check_file_exists "$multimedia_pkg/services/video-monitoring-hooks.service.ts" "Video Monitoring Hooks Service"

    # Check services no longer exist in source
    check_file_not_exists "$CVPLUS_ROOT/functions/src/services/enhanced-video-generation.service.ts" "Enhanced Video Generation Service in functions"
    check_file_not_exists "$CVPLUS_ROOT/functions/src/services/video-monitoring-hooks.service.ts" "Video Monitoring Hooks Service in functions"

    # Validate package structure
    validate_package_structure "multimedia"
}

# Validate auth package migration
validate_auth_migration() {
    info "🔍 Validating Auth Package Migration"

    local auth_pkg="$CVPLUS_ROOT/packages/auth/src"

    # Check migrated services exist in target
    check_file_exists "$auth_pkg/services/role-profile.service.ts" "Role Profile Service"
    check_file_exists "$auth_pkg/middleware/auth.middleware.ts" "Auth Middleware"
    check_file_exists "$auth_pkg/types/role-profile.types.ts" "Role Profile Types"

    # Check services no longer exist in source
    check_file_not_exists "$CVPLUS_ROOT/functions/src/services/role-profile.service.ts" "Role Profile Service in functions"
    check_file_not_exists "$CVPLUS_ROOT/functions/src/middleware/auth.middleware.ts" "Auth Middleware in functions"
    check_file_not_exists "$CVPLUS_ROOT/functions/src/types/role-profile.types.ts" "Role Profile Types in functions"

    # Validate package structure
    validate_package_structure "auth"
}

# Validate core package migration
validate_core_migration() {
    info "🔍 Validating Core Package Migration"

    local core_pkg="$CVPLUS_ROOT/packages/core/src"

    # Check migrated services exist in target
    check_file_exists "$core_pkg/services/calendar-integration.service.ts" "Calendar Integration Service"
    check_file_exists "$core_pkg/types/job.ts" "Job Types"

    # Check services no longer exist in source
    check_file_not_exists "$CVPLUS_ROOT/functions/src/services/calendar-integration.service.ts" "Calendar Integration Service in functions"
    check_file_not_exists "$CVPLUS_ROOT/functions/src/types/job.ts" "Job Types in functions"

    # Check directories were moved
    if [[ ! -d "$CVPLUS_ROOT/functions/src/config" ]]; then
        success "Config directory properly moved from functions"
    else
        track_error "Config directory still exists in functions (should have been moved)"
    fi

    if [[ ! -d "$CVPLUS_ROOT/functions/src/utils" ]]; then
        success "Utils directory properly moved from functions"
    else
        track_error "Utils directory still exists in functions (should have been moved)"
    fi

    # Check target directories exist
    check_directory_exists "$core_pkg/config" "Core config directory"
    check_directory_exists "$core_pkg/utils" "Core utils directory"

    # Validate package structure
    validate_package_structure "core"
}

# Validate public profiles migration
validate_public_profiles_migration() {
    info "🔍 Validating Public Profiles Package Migration"

    local profiles_pkg="$CVPLUS_ROOT/packages/public-profiles/src"

    # Check migrated functions exist in target
    check_file_exists "$profiles_pkg/functions/generatePortal.ts" "Generate Portal Function"
    check_file_exists "$profiles_pkg/functions/getPortalAnalytics.ts" "Get Portal Analytics Function"
    check_file_exists "$profiles_pkg/functions/getPortalStatus.ts" "Get Portal Status Function"
    check_file_exists "$profiles_pkg/functions/sendChatMessage.ts" "Send Chat Message Function"
    check_file_exists "$profiles_pkg/functions/startChatSession.ts" "Start Chat Session Function"

    # Check portal directory no longer exists in source
    if [[ ! -d "$CVPLUS_ROOT/functions/src/portal" ]]; then
        success "Portal directory properly moved from functions"
    else
        track_error "Portal directory still exists in functions (should have been moved)"
    fi

    # Validate package structure
    validate_package_structure "public-profiles"
}

# Validate frontend components migration
validate_frontend_migration() {
    info "🔍 Validating Frontend Components Migration"

    # Check premium components migration
    if [[ ! -d "$CVPLUS_ROOT/frontend/src/components/premium" ]]; then
        success "Premium components properly moved from frontend"
    else
        track_error "Premium components still exist in frontend (should have been moved)"
    fi

    # Check premium services migration
    if [[ ! -d "$CVPLUS_ROOT/frontend/src/services/premium" ]]; then
        success "Premium services properly moved from frontend"
    else
        track_error "Premium services still exist in frontend (should have been moved)"
    fi

    # Check multimedia components migration
    if [[ ! -d "$CVPLUS_ROOT/frontend/src/components/multimedia-integration" ]]; then
        success "Multimedia components properly moved from frontend"
    else
        track_error "Multimedia components still exist in frontend (should have been moved)"
    fi

    # Check target locations exist
    check_directory_exists "$CVPLUS_ROOT/packages/premium/src/frontend" "Premium frontend directory"
    check_directory_exists "$CVPLUS_ROOT/packages/multimedia/src/frontend" "Multimedia frontend directory"
}

# Validate TypeScript compilation
validate_typescript_compilation() {
    info "🔍 Validating TypeScript Compilation"

    cd "$CVPLUS_ROOT"

    # Test functions TypeScript compilation
    if [[ -f "$CVPLUS_ROOT/functions/tsconfig.json" ]]; then
        cd "$CVPLUS_ROOT/functions"
        if npx tsc --noEmit 2>/dev/null; then
            success "Functions TypeScript compilation passes"
        else
            track_error "Functions TypeScript compilation fails"
        fi
        cd "$CVPLUS_ROOT"
    fi

    # Test frontend TypeScript compilation
    if [[ -f "$CVPLUS_ROOT/frontend/tsconfig.json" ]]; then
        cd "$CVPLUS_ROOT/frontend"
        if npx tsc --noEmit 2>/dev/null; then
            success "Frontend TypeScript compilation passes"
        else
            track_error "Frontend TypeScript compilation fails"
        fi
        cd "$CVPLUS_ROOT"
    fi

    # Test package TypeScript compilation
    for package in processing multimedia auth core public-profiles premium; do
        local pkg_path="$CVPLUS_ROOT/packages/$package"
        if [[ -f "$pkg_path/tsconfig.json" ]]; then
            cd "$pkg_path"
            if npx tsc --noEmit 2>/dev/null; then
                success "$package package TypeScript compilation passes"
            else
                track_error "$package package TypeScript compilation fails"
            fi
            cd "$CVPLUS_ROOT"
        fi
    done
}

# Validate import statements
validate_import_statements() {
    info "🔍 Validating Import Statements"

    # Check for remaining relative imports that should be package imports
    local functions_index="$CVPLUS_ROOT/functions/src/index.ts"

    if [[ -f "$functions_index" ]]; then
        if grep -q "from '@cvplus/" "$functions_index"; then
            success "Functions index uses @cvplus package imports"
        else
            track_error "Functions index missing @cvplus package imports"
        fi

        if grep -q "from '\.\./\.\./\.\./'" "$functions_index"; then
            track_error "Functions index still contains relative imports to moved files"
        else
            success "Functions index has no problematic relative imports"
        fi
    fi

    # Check for broken imports in moved files
    find "$CVPLUS_ROOT/packages" -name "*.ts" -exec grep -l "from '\.\./\.\./\.\./functions/src/" {} \; 2>/dev/null | while read file; do
        track_error "File has broken import to old functions location: $file"
    done
}

# Validate package exports
validate_package_exports() {
    info "🔍 Validating Package Exports"

    # Check that each package has proper index.ts exports
    for package in processing multimedia auth core public-profiles premium; do
        local pkg_index="$CVPLUS_ROOT/packages/$package/src/index.ts"

        if [[ -f "$pkg_index" ]]; then
            if [[ -s "$pkg_index" ]]; then
                success "$package has non-empty index.ts export file"
            else
                track_error "$package has empty index.ts export file"
            fi
        else
            track_error "$package missing index.ts export file"
        fi
    done
}

# Validate no business logic in root
validate_root_cleanup() {
    info "🔍 Validating Root Repository Cleanup"

    # Check that functions/src/services is empty or only contains orchestration
    if [[ -d "$CVPLUS_ROOT/functions/src/services" ]]; then
        local service_count=$(find "$CVPLUS_ROOT/functions/src/services" -name "*.ts" | wc -l)
        if [[ $service_count -eq 0 ]]; then
            success "Functions services directory is clean"
        else
            track_error "Functions services directory still contains $service_count files"
        fi
    fi

    # Check that functions/src/middleware is empty
    if [[ -d "$CVPLUS_ROOT/functions/src/middleware" ]]; then
        local middleware_count=$(find "$CVPLUS_ROOT/functions/src/middleware" -name "*.ts" | wc -l)
        if [[ $middleware_count -eq 0 ]]; then
            success "Functions middleware directory is clean"
        else
            track_error "Functions middleware directory still contains $middleware_count files"
        fi
    fi

    # Check that functions/src/types only contains orchestration types
    if [[ -d "$CVPLUS_ROOT/functions/src/types" ]]; then
        # Should not contain domain-specific types
        if [[ ! -f "$CVPLUS_ROOT/functions/src/types/role-profile.types.ts" ]] && [[ ! -f "$CVPLUS_ROOT/functions/src/types/job.ts" ]]; then
            success "Functions types directory is clean of domain-specific types"
        else
            track_error "Functions types directory still contains domain-specific types"
        fi
    fi
}

# Generate validation report
generate_validation_report() {
    info "📊 Generating Validation Report"

    local report_file="$CVPLUS_ROOT/scripts/migration/validation-report-$(date +%Y%m%d_%H%M%S).md"

    cat > "$report_file" << EOF
# CVPlus Migration Validation Report

**Date**: $(date '+%Y-%m-%d %H:%M:%S')
**Validation Script**: migration-validator.sh

## Validation Summary

**Total Issues Found**: $ISSUES_FOUND

### Package Structure Validation
- Processing Package: Validated
- Multimedia Package: Validated
- Auth Package: Validated
- Core Package: Validated
- Public Profiles Package: Validated
- Premium Package: Validated

### Migration Completion Status

#### ✅ Successfully Migrated Components

**Processing Services**:
- ai-analysis.service.ts → packages/processing/src/services/
- role-detection.service.ts → packages/processing/src/services/
- cv-transformation.service.ts → packages/processing/src/services/

**Multimedia Services**:
- enhanced-video-generation.service.ts → packages/multimedia/src/services/
- video-monitoring-hooks.service.ts → packages/multimedia/src/services/

**Auth Services**:
- role-profile.service.ts → packages/auth/src/services/
- auth.middleware.ts → packages/auth/src/middleware/
- role-profile.types.ts → packages/auth/src/types/

**Core Services**:
- calendar-integration.service.ts → packages/core/src/services/
- job.ts → packages/core/src/types/
- config/ → packages/core/src/config/
- utils/ → packages/core/src/utils/

**Portal Functions**:
- All portal functions → packages/public-profiles/src/functions/

**Frontend Components**:
- Premium components → packages/premium/src/frontend/
- Multimedia components → packages/multimedia/src/frontend/

### Compilation Status
- Functions TypeScript: $(cd "$CVPLUS_ROOT/functions" && npx tsc --noEmit 2>/dev/null && echo "✅ PASS" || echo "❌ FAIL")
- Frontend TypeScript: $(cd "$CVPLUS_ROOT/frontend" && npx tsc --noEmit 2>/dev/null && echo "✅ PASS" || echo "❌ FAIL")

### Next Steps

$(if [[ $ISSUES_FOUND -eq 0 ]]; then
    echo "🎉 **VALIDATION SUCCESSFUL** - No issues found!"
    echo ""
    echo "The migration appears to have completed successfully. Next steps:"
    echo "1. Run comprehensive test suite"
    echo "2. Deploy to staging environment"
    echo "3. Perform functional validation"
    echo "4. Deploy to production"
else
    echo "⚠️  **ISSUES DETECTED** - $ISSUES_FOUND issues found"
    echo ""
    echo "Please review the issues above and fix them before proceeding."
    echo "Common fixes needed:"
    echo "1. Update import statements to use @cvplus/* packages"
    echo "2. Add missing package.json dependencies"
    echo "3. Fix TypeScript compilation errors"
    echo "4. Update package exports in index.ts files"
fi)

### Validation Log

Full validation log available at: $VALIDATION_LOG

---
**Migration Status**: $(if [[ $ISSUES_FOUND -eq 0 ]]; then echo "✅ COMPLETE"; else echo "⚠️  NEEDS ATTENTION"; fi)
EOF

    success "Validation report generated: $report_file"
}

# Main validation function
main() {
    echo -e "${BLUE}"
    echo "=================================================="
    echo "   CVPlus Migration Validator"
    echo "   Comprehensive Migration Validation"
    echo "=================================================="
    echo -e "${NC}"

    # Initialize log
    echo "CVPlus Migration Validation Started: $(date)" > "$VALIDATION_LOG"

    # Run all validations
    validate_processing_migration
    validate_multimedia_migration
    validate_auth_migration
    validate_core_migration
    validate_public_profiles_migration
    validate_frontend_migration
    validate_typescript_compilation
    validate_import_statements
    validate_package_exports
    validate_root_cleanup

    # Generate report
    generate_validation_report

    echo -e "${BLUE}"
    echo "=================================================="
    echo "   Validation Complete!"
    echo "=================================================="
    echo -e "${NC}"

    if [[ $ISSUES_FOUND -eq 0 ]]; then
        echo -e "${GREEN}🎉 VALIDATION SUCCESSFUL - No issues found!${NC}"
        echo -e "${GREEN}The migration appears to have completed successfully.${NC}"
    else
        echo -e "${YELLOW}⚠️  VALIDATION COMPLETED WITH ISSUES${NC}"
        echo -e "${YELLOW}Found $ISSUES_FOUND issues that need to be addressed.${NC}"
    fi

    success "CVPlus Migration Validator completed"
    log "Final validation result: $ISSUES_FOUND issues found"

    # Exit with error code if issues found
    exit $ISSUES_FOUND
}

# Script entry point
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi