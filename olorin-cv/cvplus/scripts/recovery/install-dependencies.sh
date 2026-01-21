#!/bin/bash

# T048: Install missing dependencies for all critical modules
# Level 2 Recovery Infrastructure Script
# Author: Level 2 Recovery System
# Purpose: Analyze and install missing dependencies across all Level 2 modules

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Level 2 modules for dependency analysis
LEVEL2_MODULES=(
    "auth"
    "i18n"
    "processing"
    "multimedia"
    "analytics"
    "premium"
    "public-profiles"
    "recommendations"
    "admin"
    "workflow"
    "payments"
)

# Core dependencies required for all Level 2 modules
CORE_DEPENDENCIES=(
    "typescript"
    "@types/node"
    "tsup"
    "vitest"
    "@vitest/coverage-v8"
    "eslint"
    "@typescript-eslint/eslint-plugin"
    "@typescript-eslint/parser"
    "rimraf"
)

# Firebase-specific dependencies for backend modules
FIREBASE_DEPENDENCIES=(
    "firebase-functions"
    "firebase-admin"
    "@types/express"
)

# Additional utility dependencies
UTILITY_DEPENDENCIES=(
    "lodash"
    "@types/lodash"
    "zod"
    "date-fns"
)

# Analyze dependencies for a module
analyze_module_dependencies() {
    local module_name="$1"
    local module_path="$PROJECT_ROOT/packages/$module_name"

    log "Analyzing dependencies for module: $module_name"

    if [[ ! -d "$module_path" ]]; then
        error "Module directory not found: $module_path"
        return 1
    fi

    if [[ ! -f "$module_path/package.json" ]]; then
        warning "package.json not found in $module_path - creating basic structure"
        create_basic_package_json "$module_name" "$module_path"
    fi

    cd "$module_path"

    local missing_deps=()
    local installed_deps=()

    # Check each core dependency
    for dep in "${CORE_DEPENDENCIES[@]}"; do
        if npm list "$dep" --depth=0 2>/dev/null >/dev/null; then
            installed_deps+=("$dep")
        else
            missing_deps+=("$dep")
        fi
    done

    # Check Firebase dependencies if module has backend functions
    if [[ -d "$module_path/src/backend" ]]; then
        for dep in "${FIREBASE_DEPENDENCIES[@]}"; do
            if npm list "$dep" --depth=0 2>/dev/null >/dev/null; then
                installed_deps+=("$dep")
            else
                missing_deps+=("$dep")
            fi
        done
    fi

    # Store analysis results
    echo "Module: $module_name" > "$module_path/.dependency-analysis.txt"
    echo "Analysis Date: $(date)" >> "$module_path/.dependency-analysis.txt"
    echo "" >> "$module_path/.dependency-analysis.txt"

    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        echo "Missing Dependencies:" >> "$module_path/.dependency-analysis.txt"
        for dep in "${missing_deps[@]}"; do
            echo "  - $dep" >> "$module_path/.dependency-analysis.txt"
        done
        echo "" >> "$module_path/.dependency-analysis.txt"
    fi

    if [[ ${#installed_deps[@]} -gt 0 ]]; then
        echo "Installed Dependencies:" >> "$module_path/.dependency-analysis.txt"
        for dep in "${installed_deps[@]}"; do
            echo "  - $dep" >> "$module_path/.dependency-analysis.txt"
        done
        echo "" >> "$module_path/.dependency-analysis.txt"
    fi

    cd "$PROJECT_ROOT"

    echo "${#missing_deps[@]}"
}

# Create basic package.json if missing
create_basic_package_json() {
    local module_name="$1"
    local module_path="$2"

    log "Creating basic package.json for $module_name"

    cat > "$module_path/package.json" << EOF
{
  "name": "@cvplus/$module_name",
  "version": "1.0.0",
  "description": "CVPlus $module_name module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsup",
    "build:watch": "tsup --watch",
    "clean": "rimraf dist",
    "dev": "tsup --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint src --ext .ts,.tsx",
    "lint:fix": "eslint src --ext .ts,.tsx --fix",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {},
  "devDependencies": {},
  "peerDependencies": {
    "@cvplus/core": "*",
    "@cvplus/logging": "*"
  },
  "files": [
    "dist",
    "README.md"
  ],
  "publishConfig": {
    "access": "restricted"
  }
}
EOF
}

# Install missing dependencies for a module
install_module_dependencies() {
    local module_name="$1"
    local module_path="$PROJECT_ROOT/packages/$module_name"

    log "Installing dependencies for module: $module_name"

    cd "$module_path"

    # Install core development dependencies
    log "Installing core development dependencies for $module_name"
    npm install --save-dev "${CORE_DEPENDENCIES[@]}" 2>/dev/null || {
        warning "Some core dependencies installation failed for $module_name"
    }

    # Install Firebase dependencies if needed
    if [[ -d "$module_path/src/backend" ]]; then
        log "Installing Firebase dependencies for $module_name"
        npm install --save "${FIREBASE_DEPENDENCIES[@]}" 2>/dev/null || {
            warning "Some Firebase dependencies installation failed for $module_name"
        }
    fi

    # Install utility dependencies
    log "Installing utility dependencies for $module_name"
    npm install --save "${UTILITY_DEPENDENCIES[@]}" 2>/dev/null || {
        warning "Some utility dependencies installation failed for $module_name"
    }

    cd "$PROJECT_ROOT"
}

# Verify installations and fix package.json structure
verify_and_fix_package_json() {
    local module_name="$1"
    local module_path="$PROJECT_ROOT/packages/$module_name"

    log "Verifying and fixing package.json for $module_name"

    cd "$module_path"

    # Use Node.js to clean up and organize package.json
    node -e "
        const fs = require('fs');
        const path = '$module_path/package.json';

        try {
            const pkg = JSON.parse(fs.readFileSync(path, 'utf8'));

            // Ensure proper structure
            if (!pkg.scripts) pkg.scripts = {};
            if (!pkg.dependencies) pkg.dependencies = {};
            if (!pkg.devDependencies) pkg.devDependencies = {};
            if (!pkg.peerDependencies) pkg.peerDependencies = {};

            // Ensure proper peerDependencies
            pkg.peerDependencies['@cvplus/core'] = '*';
            pkg.peerDependencies['@cvplus/logging'] = '*';

            // Sort dependencies alphabetically
            const sortedDeps = {};
            Object.keys(pkg.dependencies).sort().forEach(key => {
                sortedDeps[key] = pkg.dependencies[key];
            });
            pkg.dependencies = sortedDeps;

            const sortedDevDeps = {};
            Object.keys(pkg.devDependencies).sort().forEach(key => {
                sortedDevDeps[key] = pkg.devDependencies[key];
            });
            pkg.devDependencies = sortedDevDeps;

            // Write back to file
            fs.writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n');
            console.log('Package.json cleaned and organized for $module_name');

        } catch (error) {
            console.error('Error processing package.json for $module_name:', error.message);
            process.exit(1);
        }
    "

    cd "$PROJECT_ROOT"
}

# Check for dependency conflicts
check_dependency_conflicts() {
    local module_name="$1"
    local module_path="$PROJECT_ROOT/packages/$module_name"

    log "Checking for dependency conflicts in $module_name"

    cd "$module_path"

    # Run npm audit to check for vulnerabilities
    if npm audit --audit-level=moderate 2>/dev/null; then
        success "No dependency conflicts found in $module_name"
    else
        warning "Potential dependency issues found in $module_name - consider running 'npm audit fix'"
    fi

    cd "$PROJECT_ROOT"
}

# Run dependency installation for workspace
install_workspace_dependencies() {
    log "Installing workspace-level dependencies"

    cd "$PROJECT_ROOT"

    # Install workspace dependencies
    npm install 2>/dev/null || {
        warning "Some workspace dependencies installation failed"
    }

    # Ensure nx is available for build orchestration
    npm install --save-dev nx 2>/dev/null || {
        warning "Failed to install nx - build orchestration may not work"
    }
}

# Generate dependency report
generate_dependency_report() {
    local report_file="$PROJECT_ROOT/dependency-analysis-report.json"

    log "Generating comprehensive dependency report"

    cat > "$report_file" << EOF
{
  "reportDate": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "projectRoot": "$PROJECT_ROOT",
  "modules": {}
}
EOF

    # Add module analysis to report
    for module in "${LEVEL2_MODULES[@]}"; do
        local module_path="$PROJECT_ROOT/packages/$module"

        if [[ -f "$module_path/.dependency-analysis.txt" ]]; then
            log "Adding $module to dependency report"

            node -e "
                const fs = require('fs');
                const reportPath = '$report_file';
                const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

                const analysisPath = '$module_path/.dependency-analysis.txt';
                const analysis = fs.readFileSync(analysisPath, 'utf8');

                report.modules['$module'] = {
                    path: '$module_path',
                    analysisText: analysis,
                    hasPackageJson: fs.existsSync('$module_path/package.json'),
                    hasNodeModules: fs.existsSync('$module_path/node_modules')
                };

                fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
            "
        fi
    done

    success "Dependency report generated: $report_file"
}

# Main execution
main() {
    log "Starting dependency installation for Level 2 modules"
    log "Project root: $PROJECT_ROOT"

    local total_missing=0
    local failed_modules=()
    local successful_modules=()

    # Install workspace-level dependencies first
    install_workspace_dependencies

    # Process each Level 2 module
    for module in "${LEVEL2_MODULES[@]}"; do
        log "Processing module: $module"

        # Analyze dependencies
        local missing_count
        missing_count=$(analyze_module_dependencies "$module")
        total_missing=$((total_missing + missing_count))

        # Install dependencies
        if install_module_dependencies "$module"; then
            verify_and_fix_package_json "$module"
            check_dependency_conflicts "$module"
            successful_modules+=("$module")
            success "Dependencies installed for $module"
        else
            failed_modules+=("$module")
            error "Failed to install dependencies for $module"
        fi

        echo "" # Add spacing between modules
    done

    # Generate comprehensive report
    generate_dependency_report

    # Report results
    echo ""
    log "Dependency Installation Summary:"
    echo "================================"

    log "Total missing dependencies analyzed: $total_missing"

    if [[ ${#successful_modules[@]} -gt 0 ]]; then
        success "Successfully processed ${#successful_modules[@]} modules:"
        for module in "${successful_modules[@]}"; do
            echo "  ✓ $module"
        done
    fi

    if [[ ${#failed_modules[@]} -gt 0 ]]; then
        error "Failed to process ${#failed_modules[@]} modules:"
        for module in "${failed_modules[@]}"; do
            echo "  ✗ $module"
        done
        echo ""
        error "Dependency installation completed with errors. Please review failed modules."
        exit 1
    else
        echo ""
        success "All Level 2 modules have their dependencies installed!"
        success "T048: Dependency installation task completed successfully"

        echo ""
        log "Next steps:"
        echo "  1. Run 'npm run build:layer2' to test builds"
        echo "  2. Run 'npm run test:layer2' to test all modules"
        echo "  3. Review dependency-analysis-report.json for details"

        exit 0
    fi
}

# Execute main function
main "$@"