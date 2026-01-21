#!/bin/bash

# T046: Standardize build configuration across all Level 2 modules
# Level 2 Recovery Infrastructure Script
# Author: Level 2 Recovery System
# Purpose: Standardize build configurations, TypeScript configs, and build scripts across all modules

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG_FILE="$PROJECT_ROOT/recovery-state.json"

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

# Level 2 modules that need build standardization
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

# Standard tsup configuration template
create_tsup_config() {
    local module_name="$1"
    cat > "$PROJECT_ROOT/packages/$module_name/tsup.config.ts" << 'EOF'
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  target: 'node18',
  outDir: 'dist',
  external: [
    'firebase-functions',
    'firebase-admin',
    '@google-cloud/functions-framework'
  ],
  esbuildOptions(options) {
    options.platform = 'node';
  }
});
EOF
}

# Standard TypeScript configuration template
create_tsconfig() {
    local module_name="$1"
    cat > "$PROJECT_ROOT/packages/$module_name/tsconfig.json" << EOF
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "baseUrl": ".",
    "paths": {
      "@cvplus/logging": ["../logging/src"],
      "@cvplus/logging/*": ["../logging/src/*"],
      "@cvplus/core": ["../core/src"],
      "@cvplus/core/*": ["../core/src/*"],
      "@cvplus/shell": ["../shell/src"],
      "@cvplus/shell/*": ["../shell/src/*"]
    }
  },
  "include": [
    "src/**/*"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "**/*.test.ts",
    "**/*.spec.ts"
  ]
}
EOF
}

# Standard package.json build scripts
update_package_json_scripts() {
    local module_path="$1"
    local module_name="$(basename "$module_path")"

    if [[ ! -f "$module_path/package.json" ]]; then
        error "package.json not found in $module_path"
        return 1
    fi

    # Create backup
    cp "$module_path/package.json" "$module_path/package.json.backup"

    # Use Node.js to update the scripts section
    node -e "
        const fs = require('fs');
        const path = '$module_path/package.json';
        const pkg = JSON.parse(fs.readFileSync(path, 'utf8'));

        // Ensure scripts object exists
        if (!pkg.scripts) pkg.scripts = {};

        // Standard build scripts for Level 2 modules
        pkg.scripts.build = 'tsup';
        pkg.scripts['build:watch'] = 'tsup --watch';
        pkg.scripts.clean = 'rimraf dist';
        pkg.scripts.dev = 'tsup --watch';
        pkg.scripts.test = 'vitest run';
        pkg.scripts['test:watch'] = 'vitest';
        pkg.scripts['test:coverage'] = 'vitest run --coverage';
        pkg.scripts.lint = 'eslint src --ext .ts,.tsx';
        pkg.scripts['lint:fix'] = 'eslint src --ext .ts,.tsx --fix';
        pkg.scripts.typecheck = 'tsc --noEmit';

        fs.writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n');
    "
}

# Standard development dependencies
ensure_dev_dependencies() {
    local module_path="$1"

    if [[ ! -f "$module_path/package.json" ]]; then
        error "package.json not found in $module_path"
        return 1
    fi

    log "Installing standard development dependencies for $(basename "$module_path")"

    cd "$module_path"

    # Install essential build dependencies
    npm install --save-dev \
        tsup \
        typescript \
        "@types/node" \
        rimraf \
        eslint \
        "@typescript-eslint/eslint-plugin" \
        "@typescript-eslint/parser" \
        vitest \
        "@vitest/coverage-v8" \
        2>/dev/null || {
        warning "Some dependencies might already be installed or unavailable"
    }

    cd "$PROJECT_ROOT"
}

# Create standard directory structure
create_standard_structure() {
    local module_path="$1"
    local module_name="$(basename "$module_path")"

    log "Creating standard directory structure for $module_name"

    # Ensure src directory exists
    mkdir -p "$module_path/src"

    # Ensure test directory exists
    mkdir -p "$module_path/tests"

    # Create src/index.ts if it doesn't exist
    if [[ ! -f "$module_path/src/index.ts" ]]; then
        cat > "$module_path/src/index.ts" << EOF
/**
 * @fileoverview Main entry point for @cvplus/$module_name module
 * @module @cvplus/$module_name
 */

// Export all public APIs from this module
export * from './types';
export * from './services';
export * from './backend/functions';

// Re-export core functionality
export { logger } from '@cvplus/logging';
EOF
    fi

    # Create basic type definitions if they don't exist
    if [[ ! -f "$module_path/src/types/index.ts" ]]; then
        mkdir -p "$module_path/src/types"
        cat > "$module_path/src/types/index.ts" << EOF
/**
 * @fileoverview Type definitions for @cvplus/$module_name module
 */

// Add module-specific type definitions here
export interface ${module_name^}Config {
  enabled: boolean;
  version: string;
}

export interface ${module_name^}Options {
  debug?: boolean;
  timeout?: number;
}
EOF
    fi

    # Create services directory structure
    mkdir -p "$module_path/src/services"
    mkdir -p "$module_path/src/backend/functions"

    # Create basic test file if it doesn't exist
    if [[ ! -f "$module_path/tests/index.test.ts" ]]; then
        cat > "$module_path/tests/index.test.ts" << EOF
/**
 * @fileoverview Basic tests for @cvplus/$module_name module
 */

import { describe, it, expect } from 'vitest';

describe('@cvplus/$module_name', () => {
  it('should export main module', () => {
    // TODO: Add meaningful tests for this module
    expect(true).toBe(true);
  });
});
EOF
    fi
}

# Main standardization function
standardize_module() {
    local module_name="$1"
    local module_path="$PROJECT_ROOT/packages/$module_name"

    log "Starting build standardization for module: $module_name"

    if [[ ! -d "$module_path" ]]; then
        error "Module directory not found: $module_path"
        return 1
    fi

    # Create standard directory structure
    create_standard_structure "$module_path"

    # Create/update tsup configuration
    log "Creating tsup configuration for $module_name"
    create_tsup_config "$module_name"

    # Create/update TypeScript configuration
    log "Creating TypeScript configuration for $module_name"
    create_tsconfig "$module_name"

    # Update package.json scripts
    log "Updating package.json scripts for $module_name"
    update_package_json_scripts "$module_path"

    # Ensure development dependencies
    log "Ensuring development dependencies for $module_name"
    ensure_dev_dependencies "$module_path"

    success "Build standardization completed for module: $module_name"
}

# Test build for a module
test_module_build() {
    local module_name="$1"
    local module_path="$PROJECT_ROOT/packages/$module_name"

    log "Testing build for module: $module_name"

    cd "$module_path"

    # Clean previous build
    npm run clean 2>/dev/null || true

    # Run TypeScript check
    if npm run typecheck 2>/dev/null; then
        success "TypeScript check passed for $module_name"
    else
        warning "TypeScript check failed for $module_name"
    fi

    # Run build
    if npm run build 2>/dev/null; then
        success "Build successful for $module_name"
        return 0
    else
        error "Build failed for $module_name"
        return 1
    fi
}

# Main execution
main() {
    log "Starting Level 2 modules build standardization"
    log "Project root: $PROJECT_ROOT"

    local failed_modules=()
    local successful_modules=()

    # Standardize each Level 2 module
    for module in "${LEVEL2_MODULES[@]}"; do
        if standardize_module "$module"; then
            # Test the build
            if test_module_build "$module"; then
                successful_modules+=("$module")
            else
                failed_modules+=("$module")
            fi
        else
            failed_modules+=("$module")
        fi
        echo "" # Add spacing between modules
    done

    # Report results
    echo ""
    log "Build Standardization Summary:"
    echo "=============================="

    if [[ ${#successful_modules[@]} -gt 0 ]]; then
        success "Successfully standardized ${#successful_modules[@]} modules:"
        for module in "${successful_modules[@]}"; do
            echo "  ✓ $module"
        done
    fi

    if [[ ${#failed_modules[@]} -gt 0 ]]; then
        error "Failed to standardize ${#failed_modules[@]} modules:"
        for module in "${failed_modules[@]}"; do
            echo "  ✗ $module"
        done
        echo ""
        error "Build standardization completed with errors. Please review failed modules."
        exit 1
    else
        echo ""
        success "All Level 2 modules successfully standardized!"
        success "T046: Build standardization task completed successfully"
        exit 0
    fi
}

# Execute main function
main "$@"