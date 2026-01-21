#!/bin/bash

################################################################################
# CVPlus Enhanced Dependency Validation System
# Comprehensive dependency analysis and compliance enforcement
# Author: Gil Klainert
# Date: 2025-08-30
################################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Project directories
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPTS_DIR="${PROJECT_ROOT}/scripts"
DEPS_DIR="${SCRIPTS_DIR}/dependencies"
REPORTS_DIR="${PROJECT_ROOT}/reports"
PACKAGES_DIR="${PROJECT_ROOT}/packages"

# Configuration
TARGET_COMPLIANCE=99
FAIL_ON_CRITICAL=true
GENERATE_REPORTS=true
VERBOSE=false
FIX_MODE=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --fix)
            FIX_MODE=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --no-fail)
            FAIL_ON_CRITICAL=false
            shift
            ;;
        --no-reports)
            GENERATE_REPORTS=false
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --fix          Attempt to fix violations automatically"
            echo "  --verbose      Show detailed violation information"
            echo "  --no-fail      Don't exit with error on violations"
            echo "  --no-reports   Skip report generation"
            echo "  --help         Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

################################################################################
# Functions
################################################################################

print_header() {
    echo ""
    echo -e "${CYAN}════════════════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}                     CVPlus Enhanced Dependency Validation                         ${NC}"
    echo -e "${CYAN}════════════════════════════════════════════════════════════════════════════════${NC}"
    echo ""
}

print_section() {
    echo ""
    echo -e "${BLUE}▶ $1${NC}"
    echo -e "${BLUE}$(printf '─%.0s' {1..80})${NC}"
}

check_prerequisites() {
    print_section "Checking Prerequisites"
    
    local missing_deps=()
    
    # Check for Node.js
    if ! command -v node &> /dev/null; then
        missing_deps+=("node")
    fi
    
    # Check for npm
    if ! command -v npm &> /dev/null; then
        missing_deps+=("npm")
    fi
    
    # Check for TypeScript
    if ! command -v npx tsc &> /dev/null; then
        echo -e "${YELLOW}TypeScript not found globally, will use npx${NC}"
    fi
    
    # Check if TypeScript is installed in project
    if [ ! -f "${PROJECT_ROOT}/node_modules/typescript/lib/tsc.js" ]; then
        echo -e "${YELLOW}Installing TypeScript locally...${NC}"
        npm install --save-dev typescript @types/node glob
    fi
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        echo -e "${RED}❌ Missing required dependencies: ${missing_deps[*]}${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ All prerequisites satisfied${NC}"
}

compile_tools() {
    print_section "Compiling Dependency Analysis Tools"
    
    # Create tsconfig if it doesn't exist
    if [ ! -f "${DEPS_DIR}/tsconfig.json" ]; then
        cat > "${DEPS_DIR}/tsconfig.json" << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": ".",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "types": ["node"]
  },
  "include": ["*.ts"],
  "exclude": ["node_modules", "dist"]
}
EOF
    fi
    
    # Compile TypeScript files
    echo "Compiling scanner.ts..."
    npx tsc -p "${DEPS_DIR}" || {
        echo -e "${RED}❌ Failed to compile TypeScript tools${NC}"
        exit 1
    }
    
    echo -e "${GREEN}✅ Tools compiled successfully${NC}"
}

run_dependency_scan() {
    print_section "Running Comprehensive Dependency Scan"
    
    # Create reports directory if it doesn't exist
    mkdir -p "${REPORTS_DIR}"
    
    # Run the scanner
    local scan_output="${REPORTS_DIR}/dependency-scan-$(date +%Y%m%d-%H%M%S).json"
    
    echo "Scanning all modules..."
    node "${DEPS_DIR}/dist/scanner.js" > "${scan_output}" 2>&1 || {
        local exit_code=$?
        if [ $exit_code -eq 1 ]; then
            echo -e "${YELLOW}⚠️  Violations detected (see report for details)${NC}"
        else
            echo -e "${RED}❌ Scanner failed with error code $exit_code${NC}"
            cat "${scan_output}"
            exit 1
        fi
    }
    
    echo -e "${GREEN}✅ Scan completed${NC}"
    echo "Results saved to: ${scan_output}"
}

analyze_compliance() {
    print_section "Analyzing Compliance Score"
    
    # Create a temporary JS file for compliance analysis
    cat > "${DEPS_DIR}/analyze-compliance.js" << EOF
const DependencyScanner = require('./dist/scanner.js').default;
const DependencyRuleEngine = require('./dist/rule-engine.js').default;
const ViolationReporter = require('./dist/reporter.js').default;

const scanner = new DependencyScanner('${PROJECT_ROOT}');
const ruleEngine = new DependencyRuleEngine();
const reporter = new ViolationReporter('${PROJECT_ROOT}');

scanner.scanAllModules().then(moduleDeps => {
    const score = ruleEngine.calculateComplianceScore(moduleDeps);
    
    // Generate reports
    if (${GENERATE_REPORTS}) {
        reporter.generateReport(moduleDeps, score, {
            format: 'markdown',
            outputPath: '${REPORTS_DIR}/dependency-report.md',
            includeGraphs: true,
            verbose: ${VERBOSE}
        });
        
        reporter.generateReport(moduleDeps, score, {
            format: 'html',
            outputPath: '${REPORTS_DIR}/dependency-report.html',
            includeGraphs: true,
            verbose: ${VERBOSE}
        });
    }
    
    // Console output
    reporter.generateReport(moduleDeps, score, {
        format: 'console',
        verbose: ${VERBOSE}
    });
    
    // Check compliance threshold
    if (score.overall < ${TARGET_COMPLIANCE}) {
        console.error('\\n❌ Compliance score ' + score.overall.toFixed(2) + '% is below target ${TARGET_COMPLIANCE}%');
        process.exit(1);
    } else {
        console.log('\\n✅ Compliance target achieved: ' + score.overall.toFixed(2) + '%');
    }
}).catch(err => {
    console.error('Error during analysis:', err);
    process.exit(1);
});
EOF
    
    # Run the analysis
    node "${DEPS_DIR}/analyze-compliance.js" || {
        local exit_code=$?
        if [ "$FAIL_ON_CRITICAL" = true ]; then
            exit $exit_code
        fi
    }
    
    # Clean up temporary file
    rm -f "${DEPS_DIR}/analyze-compliance.js"
}

fix_violations() {
    print_section "Attempting to Fix Violations"
    
    echo -e "${YELLOW}⚠️  Automatic fixing is limited to certain violation types${NC}"
    
    # Fix commented violations in core module
    echo "Removing commented forbidden imports..."
    find "${PACKAGES_DIR}/core" -name "*.ts" -o -name "*.tsx" | while read -r file; do
        # Remove lines with commented @cvplus imports in core
        sed -i.bak '/^[[:space:]]*\/\/.*@cvplus\//d' "$file"
        
        # Check if file was modified
        if ! diff -q "$file" "$file.bak" > /dev/null 2>&1; then
            echo "  Fixed: $(basename "$file")"
            rm "$file.bak"
        else
            rm "$file.bak"
        fi
    done
    
    echo -e "${GREEN}✅ Automatic fixes applied${NC}"
    echo -e "${YELLOW}Note: Complex violations require manual refactoring${NC}"
}

generate_ci_workflow() {
    print_section "Generating CI/CD Workflow"
    
    local workflow_dir="${PROJECT_ROOT}/.github/workflows"
    mkdir -p "${workflow_dir}"
    
    cat > "${workflow_dir}/dependency-validation.yml" << 'EOF'
name: Dependency Validation

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]
  schedule:
    - cron: '0 9 * * 1' # Weekly on Monday at 9am

jobs:
  validate-dependencies:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
      with:
        submodules: recursive
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run dependency validation
      run: ./scripts/validate-dependencies-enhanced.sh --no-fix
    
    - name: Upload reports
      if: always()
      uses: actions/upload-artifact@v3
      with:
        name: dependency-reports
        path: reports/
    
    - name: Comment PR
      if: failure() && github.event_name == 'pull_request'
      uses: actions/github-script@v6
      with:
        script: |
          const fs = require('fs');
          const report = fs.readFileSync('reports/dependency-report.md', 'utf8');
          github.rest.issues.createComment({
            issue_number: context.issue.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            body: '## ⚠️ Dependency Validation Failed\n\n' + report
          });
EOF
    
    echo -e "${GREEN}✅ CI/CD workflow generated at ${workflow_dir}/dependency-validation.yml${NC}"
}

print_summary() {
    print_section "Validation Summary"
    
    echo -e "${CYAN}📊 Reports generated:${NC}"
    if [ "$GENERATE_REPORTS" = true ]; then
        echo "  • Markdown: ${REPORTS_DIR}/dependency-report.md"
        echo "  • HTML: ${REPORTS_DIR}/dependency-report.html"
        echo "  • JSON: ${REPORTS_DIR}/dependency-scan-*.json"
    fi
    
    echo ""
    echo -e "${CYAN}📋 Next steps:${NC}"
    echo "  1. Review the detailed reports in ${REPORTS_DIR}/"
    echo "  2. Fix critical violations immediately"
    echo "  3. Plan refactoring for major violations"
    echo "  4. Set up pre-commit hooks for continuous validation"
    echo "  5. Monitor compliance trends over time"
    
    echo ""
    echo -e "${GREEN}════════════════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}                        Dependency Validation Complete                           ${NC}"
    echo -e "${GREEN}════════════════════════════════════════════════════════════════════════════════${NC}"
}

################################################################################
# Main Execution
################################################################################

main() {
    print_header
    
    # Step 1: Check prerequisites
    check_prerequisites
    
    # Step 2: Compile tools
    compile_tools
    
    # Step 3: Run dependency scan
    run_dependency_scan
    
    # Step 4: Analyze compliance
    analyze_compliance
    
    # Step 5: Fix violations if requested
    if [ "$FIX_MODE" = true ]; then
        fix_violations
        # Re-run scan after fixes
        echo ""
        echo -e "${CYAN}Re-running scan after fixes...${NC}"
        run_dependency_scan
        analyze_compliance
    fi
    
    # Step 6: Generate CI workflow
    if [ "$GENERATE_REPORTS" = true ]; then
        generate_ci_workflow
    fi
    
    # Step 7: Print summary
    print_summary
}

# Run main function
main "$@"