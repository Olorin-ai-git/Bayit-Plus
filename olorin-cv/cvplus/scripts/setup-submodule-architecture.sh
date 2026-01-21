#!/bin/bash

# CVPlus Submodule Architecture Setup Script
# Author: Gil Klainert
# Date: 2025-08-29
# Purpose: Initialize and configure Git submodules with npm workspaces

set -e

echo "🚀 CVPlus Submodule Architecture Setup"
echo "======================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."
    
    # Check Node.js version
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 16 ]; then
        print_error "Node.js version 16+ required (found v$NODE_VERSION)"
        exit 1
    fi
    print_status "Node.js version check passed"
    
    # Check npm version
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    
    NPM_VERSION=$(npm -v | cut -d'.' -f1)
    if [ "$NPM_VERSION" -lt 7 ]; then
        print_error "npm version 7+ required for workspaces (found v$NPM_VERSION)"
        exit 1
    fi
    print_status "npm version check passed"
    
    # Check Git
    if ! command -v git &> /dev/null; then
        print_error "Git is not installed"
        exit 1
    fi
    print_status "Git check passed"
}

# Initialize npm workspaces if not already configured
setup_npm_workspaces() {
    print_info "Setting up npm workspaces..."
    
    if [ ! -f "package.json" ]; then
        print_error "package.json not found in current directory"
        exit 1
    fi
    
    # Check if workspaces already configured
    if grep -q '"workspaces"' package.json; then
        print_status "npm workspaces already configured"
    else
        print_warning "Adding workspaces configuration to package.json"
        # Backup package.json
        cp package.json package.json.backup
        
        # Add workspaces configuration using Node.js
        node -e "
        const fs = require('fs');
        const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        pkg.workspaces = ['packages/*', 'frontend', 'functions'];
        fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
        "
        print_status "Workspaces configuration added"
    fi
}

# Create build order configuration
create_build_order() {
    print_info "Creating build order configuration..."
    
    mkdir -p scripts
    
    cat > scripts/build-order.js << 'EOF'
/**
 * Build Order Configuration for CVPlus Submodules
 * Defines the dependency hierarchy and build sequence
 */

const buildOrder = {
  // Tier 1: No dependencies
  tier1: ['core'],
  
  // Tier 2: Depends only on core
  tier2: ['auth', 'i18n'],
  
  // Tier 3: Depends on core and/or tier 2 packages
  tier3: [
    'cv-processing',    // depends on core, auth
    'multimedia',       // depends on core
    'premium',          // depends on core, auth
    'recommendations',  // depends on core
    'workflow',         // depends on core
    'payments'          // depends on core, auth
  ],
  
  // Tier 4: Complex dependencies
  tier4: [
    'public-profiles',  // depends on core, auth, multimedia
    'analytics',        // depends on core, auth
    'admin'            // depends on core, auth
  ]
};

// Function to get all packages in build order
function getPackagesInOrder() {
  const packages = [];
  Object.values(buildOrder).forEach(tier => {
    packages.push(...tier);
  });
  return packages;
}

// Function to get tier for a package
function getTierForPackage(packageName) {
  for (const [tier, packages] of Object.entries(buildOrder)) {
    if (packages.includes(packageName)) {
      return tier;
    }
  }
  return null;
}

module.exports = {
  buildOrder,
  getPackagesInOrder,
  getTierForPackage
};
EOF
    
    print_status "Build order configuration created"
}

# Create build orchestrator
create_build_orchestrator() {
    print_info "Creating build orchestrator..."
    
    cat > scripts/build-orchestrator.js << 'EOF'
#!/usr/bin/env node

/**
 * Build Orchestrator for CVPlus Submodules
 * Handles building packages in correct dependency order
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const { buildOrder } = require('./build-order');
const execAsync = promisify(exec);

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function buildPackage(packageName) {
  log(`Building @cvplus/${packageName}...`, 'blue');
  
  try {
    const { stdout, stderr } = await execAsync(
      `npm run build --workspace=@cvplus/${packageName}`,
      { maxBuffer: 1024 * 1024 * 10 } // 10MB buffer
    );
    
    if (stderr && !stderr.includes('npm WARN')) {
      log(`Warnings for ${packageName}: ${stderr}`, 'yellow');
    }
    
    log(`✓ Successfully built @cvplus/${packageName}`, 'green');
    return true;
  } catch (error) {
    log(`✗ Failed to build @cvplus/${packageName}: ${error.message}`, 'red');
    throw error;
  }
}

async function buildTier(tierName, packages) {
  log(`\n🏗  Building ${tierName} packages...`, 'blue');
  
  // Build packages in parallel within the same tier
  const results = await Promise.allSettled(
    packages.map(pkg => buildPackage(pkg))
  );
  
  const failed = results.filter(r => r.status === 'rejected');
  if (failed.length > 0) {
    throw new Error(`Failed to build ${failed.length} packages in ${tierName}`);
  }
  
  log(`✓ All ${tierName} packages built successfully`, 'green');
}

async function buildAll() {
  log('🚀 Starting CVPlus submodule build process...', 'blue');
  const startTime = Date.now();
  
  try {
    // Build each tier sequentially
    for (const [tierName, packages] of Object.entries(buildOrder)) {
      await buildTier(tierName, packages);
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log(`\n✨ All packages built successfully in ${duration}s`, 'green');
  } catch (error) {
    log(`\n💥 Build failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Handle specific package build if provided
const args = process.argv.slice(2);
if (args.length > 0) {
  const packageName = args[0];
  buildPackage(packageName).catch(error => {
    process.exit(1);
  });
} else {
  buildAll();
}
EOF
    
    chmod +x scripts/build-orchestrator.js
    print_status "Build orchestrator created"
}

# Create version synchronization script
create_version_sync() {
    print_info "Creating version synchronization script..."
    
    cat > scripts/sync-versions.js << 'EOF'
#!/usr/bin/env node

/**
 * Version Synchronization Script for CVPlus Submodules
 * Ensures all internal dependencies use consistent versions
 */

const fs = require('fs');
const path = require('path');
const { getPackagesInOrder } = require('./build-order');

// Read the current version from the main package.json
const mainPkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const SYNC_VERSION = mainPkg.version || '1.0.0';

console.log(`📦 Synchronizing all packages to version ${SYNC_VERSION}`);

function updatePackageJson(packageName) {
  const pkgPath = path.join('packages', packageName, 'package.json');
  
  if (!fs.existsSync(pkgPath)) {
    console.warn(`⚠️  Package file not found: ${pkgPath}`);
    return;
  }
  
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  
  // Update package version
  pkg.version = SYNC_VERSION;
  
  // Update internal dependencies
  if (pkg.dependencies) {
    Object.keys(pkg.dependencies).forEach(dep => {
      if (dep.startsWith('@cvplus/') && pkg.dependencies[dep].startsWith('file:')) {
        // Keep file: protocol for local development
        console.log(`  Keeping local dependency: ${dep}`);
      } else if (dep.startsWith('@cvplus/')) {
        // Update version for published dependencies
        pkg.dependencies[dep] = `^${SYNC_VERSION}`;
        console.log(`  Updated ${dep} to ^${SYNC_VERSION}`);
      }
    });
  }
  
  // Update peer dependencies
  if (pkg.peerDependencies) {
    Object.keys(pkg.peerDependencies).forEach(dep => {
      if (dep.startsWith('@cvplus/')) {
        pkg.peerDependencies[dep] = `^${SYNC_VERSION}`;
        console.log(`  Updated peer dependency ${dep} to ^${SYNC_VERSION}`);
      }
    });
  }
  
  // Write updated package.json
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`✓ Updated ${packageName} to version ${SYNC_VERSION}`);
}

// Sync all packages
const packages = getPackagesInOrder();
packages.forEach(packageName => {
  console.log(`\nProcessing @cvplus/${packageName}...`);
  updatePackageJson(packageName);
});

console.log('\n✨ Version synchronization complete!');
EOF
    
    chmod +x scripts/sync-versions.js
    print_status "Version sync script created"
}

# Create dependency validator
create_dependency_validator() {
    print_info "Creating dependency validator..."
    
    cat > scripts/validate-dependencies.js << 'EOF'
#!/usr/bin/env node

/**
 * Dependency Validator for CVPlus Submodules
 * Checks for circular dependencies and validates dependency hierarchy
 */

const fs = require('fs');
const path = require('path');
const { buildOrder, getTierForPackage } = require('./build-order');

const errors = [];
const warnings = [];

function getPackageDependencies(packageName) {
  const pkgPath = path.join('packages', packageName, 'package.json');
  
  if (!fs.existsSync(pkgPath)) {
    return [];
  }
  
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const deps = [];
  
  if (pkg.dependencies) {
    Object.keys(pkg.dependencies).forEach(dep => {
      if (dep.startsWith('@cvplus/')) {
        deps.push(dep.replace('@cvplus/', ''));
      }
    });
  }
  
  return deps;
}

function validatePackageDependencies(packageName) {
  const tier = getTierForPackage(packageName);
  const deps = getPackageDependencies(packageName);
  
  deps.forEach(dep => {
    const depTier = getTierForPackage(dep);
    
    if (!depTier) {
      warnings.push(`${packageName} depends on unknown package: ${dep}`);
      return;
    }
    
    const tierNum = parseInt(tier.replace('tier', ''));
    const depTierNum = parseInt(depTier.replace('tier', ''));
    
    if (depTierNum >= tierNum) {
      errors.push(
        `Invalid dependency: ${packageName} (${tier}) depends on ${dep} (${depTier}). ` +
        `Packages can only depend on lower-tier packages.`
      );
    }
  });
}

console.log('🔍 Validating CVPlus submodule dependencies...\n');

// Validate all packages
Object.values(buildOrder).flat().forEach(packageName => {
  validatePackageDependencies(packageName);
});

// Report results
if (warnings.length > 0) {
  console.log('⚠️  Warnings:');
  warnings.forEach(w => console.log(`  - ${w}`));
  console.log();
}

if (errors.length > 0) {
  console.log('❌ Errors found:');
  errors.forEach(e => console.log(`  - ${e}`));
  console.log('\n💥 Dependency validation failed!');
  process.exit(1);
} else {
  console.log('✅ All dependencies are valid!');
}
EOF
    
    chmod +x scripts/validate-dependencies.js
    print_status "Dependency validator created"
}

# Create environment setup script
create_environment_setup() {
    print_info "Creating environment setup script..."
    
    cat > scripts/setup-dev-environment.sh << 'EOF'
#!/bin/bash

# Development Environment Setup for CVPlus
# Sets up the complete development environment with all submodules

echo "🔧 Setting up CVPlus development environment..."

# Update submodules
echo "📦 Updating Git submodules..."
git submodule update --init --recursive

# Install dependencies
echo "📥 Installing npm dependencies..."
npm install

# Build core first (no dependencies)
echo "🏗  Building @cvplus/core..."
npm run build --workspace=@cvplus/core

# Build all packages in order
echo "🏗  Building all packages..."
node scripts/build-orchestrator.js

# Validate dependencies
echo "🔍 Validating dependencies..."
node scripts/validate-dependencies.js

echo "✨ Development environment ready!"
EOF
    
    chmod +x scripts/setup-dev-environment.sh
    print_status "Environment setup script created"
}

# Main setup flow
main() {
    print_info "Starting CVPlus Submodule Architecture Setup"
    echo ""
    
    # Run all setup steps
    check_prerequisites
    setup_npm_workspaces
    create_build_order
    create_build_orchestrator
    create_version_sync
    create_dependency_validator
    create_environment_setup
    
    echo ""
    print_info "Setup complete! Next steps:"
    echo ""
    echo "  1. Run the development environment setup:"
    echo "     ./scripts/setup-dev-environment.sh"
    echo ""
    echo "  2. Build all packages:"
    echo "     node scripts/build-orchestrator.js"
    echo ""
    echo "  3. Validate dependencies:"
    echo "     node scripts/validate-dependencies.js"
    echo ""
    echo "  4. Sync versions when needed:"
    echo "     node scripts/sync-versions.js"
    echo ""
    print_status "CVPlus Submodule Architecture is ready!"
}

# Run main function
main