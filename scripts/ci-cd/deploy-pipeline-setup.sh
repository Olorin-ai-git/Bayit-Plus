#!/bin/bash
# CVPlus CI/CD Pipeline Setup Script
# Author: Gil Klainert
# Date: 2025-08-27

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script configuration
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
WORKFLOWS_DIR="$PROJECT_ROOT/.github/workflows"

echo -e "${BLUE}🚀 CVPlus CI/CD Pipeline Setup${NC}"
echo "Project Root: $PROJECT_ROOT"
echo "Workflows Directory: $WORKFLOWS_DIR"
echo ""

# Function to print colored output
print_status() {
    case $1 in
        "INFO") echo -e "${BLUE}ℹ️  $2${NC}" ;;
        "SUCCESS") echo -e "${GREEN}✅ $2${NC}" ;;
        "WARNING") echo -e "${YELLOW}⚠️  $2${NC}" ;;
        "ERROR") echo -e "${RED}❌ $2${NC}" ;;
    esac
}

# Check prerequisites
check_prerequisites() {
    print_status "INFO" "Checking prerequisites..."
    
    # Check if we're in a git repository
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        print_status "ERROR" "Not in a git repository"
        exit 1
    fi
    
    # Check if GitHub workflows directory exists
    if [ ! -d "$WORKFLOWS_DIR" ]; then
        print_status "ERROR" "GitHub workflows directory not found"
        exit 1
    fi
    
    # Check Node.js version
    if ! command -v node &> /dev/null; then
        print_status "ERROR" "Node.js is required but not installed"
        exit 1
    fi
    
    NODE_VERSION=$(node --version)
    print_status "SUCCESS" "Node.js version: $NODE_VERSION"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_status "ERROR" "npm is required but not installed"
        exit 1
    fi
    
    NPM_VERSION=$(npm --version)
    print_status "SUCCESS" "npm version: $NPM_VERSION"
    
    # Check Firebase CLI
    if ! command -v firebase &> /dev/null; then
        print_status "WARNING" "Firebase CLI not installed. Installing globally..."
        npm install -g firebase-tools
    fi
    
    FIREBASE_VERSION=$(firebase --version)
    print_status "SUCCESS" "Firebase CLI version: $FIREBASE_VERSION"
    
    print_status "SUCCESS" "All prerequisites satisfied"
}

# Validate workflow files
validate_workflows() {
    print_status "INFO" "Validating GitHub workflow files..."
    
    WORKFLOW_FILES=(
        "ci-core.yml"
        "ci-auth.yml" 
        "ci-recommendations.yml"
        "ci-integration.yml"
        "deploy-functions.yml"
        "deploy-frontend.yml"
        "quality-gates.yml"
        "performance-monitoring.yml"
        "security-scanning.yml"
    )
    
    for workflow in "${WORKFLOW_FILES[@]}"; do
        if [ -f "$WORKFLOWS_DIR/$workflow" ]; then
            print_status "SUCCESS" "✓ $workflow"
        else
            print_status "ERROR" "✗ $workflow (missing)"
            exit 1
        fi
    done
    
    print_status "SUCCESS" "All workflow files validated"
}

# Check package.json configurations
validate_package_configs() {
    print_status "INFO" "Validating package configurations..."
    
    # Check root package.json
    if [ ! -f "$PROJECT_ROOT/package.json" ]; then
        print_status "ERROR" "Root package.json not found"
        exit 1
    fi
    
    # Validate workspaces configuration
    if ! jq -e '.workspaces' "$PROJECT_ROOT/package.json" > /dev/null 2>&1; then
        print_status "ERROR" "Workspaces not configured in root package.json"
        exit 1
    fi
    
    # Check individual package configurations
    PACKAGES=("packages/core" "packages/auth" "packages/recommendations" "frontend" "functions")
    
    for pkg in "${PACKAGES[@]}"; do
        PKG_PATH="$PROJECT_ROOT/$pkg"
        if [ -d "$PKG_PATH" ] && [ -f "$PKG_PATH/package.json" ]; then
            # Validate package.json structure
            if jq -e '.name' "$PKG_PATH/package.json" > /dev/null 2>&1; then
                PKG_NAME=$(jq -r '.name' "$PKG_PATH/package.json")
                print_status "SUCCESS" "✓ $pkg ($PKG_NAME)"
            else
                print_status "ERROR" "✗ $pkg (invalid package.json)"
                exit 1
            fi
        else
            print_status "WARNING" "⚠ $pkg (not found or no package.json)"
        fi
    done
    
    print_status "SUCCESS" "Package configurations validated"
}

# Setup Firebase configuration
setup_firebase_config() {
    print_status "INFO" "Setting up Firebase configuration..."
    
    # Check if firebase.json exists
    if [ ! -f "$PROJECT_ROOT/firebase.json" ]; then
        print_status "WARNING" "firebase.json not found. Creating basic configuration..."
        
        cat > "$PROJECT_ROOT/firebase.json" << 'EOF'
{
  "functions": {
    "source": "functions",
    "runtime": "nodejs20",
    "predeploy": [
      "npm --prefix functions run build"
    ]
  },
  "hosting": {
    "public": "frontend/dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  },
  "emulators": {
    "auth": {
      "port": 9099
    },
    "functions": {
      "port": 5001
    },
    "firestore": {
      "port": 8080
    },
    "hosting": {
      "port": 5000
    },
    "ui": {
      "enabled": true,
      "port": 4000
    }
  }
}
EOF
        print_status "SUCCESS" "Created basic firebase.json"
    else
        print_status "SUCCESS" "firebase.json already exists"
    fi
    
    # Check if .firebaserc exists
    if [ ! -f "$PROJECT_ROOT/.firebaserc" ]; then
        print_status "WARNING" ".firebaserc not found. You'll need to run 'firebase init' to configure projects"
    else
        print_status "SUCCESS" ".firebaserc exists"
    fi
}

# Create CI/CD documentation
create_documentation() {
    print_status "INFO" "Creating CI/CD documentation..."
    
    DOC_FILE="$PROJECT_ROOT/docs/ci-cd/pipeline-overview.md"
    mkdir -p "$(dirname "$DOC_FILE")"
    
    cat > "$DOC_FILE" << 'EOF'
# CVPlus CI/CD Pipeline Overview

## Pipeline Architecture

The CVPlus project uses a comprehensive CI/CD pipeline built with GitHub Actions, designed to support a modular monorepo architecture.

### Workflows

#### Module CI/CD Pipelines
- **ci-core.yml**: Core module testing, building, and validation
- **ci-auth.yml**: Authentication module with Firebase integration tests
- **ci-recommendations.yml**: AI recommendations module with mock API testing
- **ci-integration.yml**: Cross-module compatibility and integration testing

#### Deployment Pipelines  
- **deploy-functions.yml**: Firebase Functions deployment with firebase-deployment-specialist
- **deploy-frontend.yml**: Frontend deployment to Firebase Hosting

#### Quality Assurance
- **quality-gates.yml**: Code quality, linting, and coverage enforcement
- **performance-monitoring.yml**: Build performance and bundle size monitoring
- **security-scanning.yml**: Comprehensive security analysis (SAST, secrets, dependencies)

### Quality Standards

#### Test Coverage
- **Minimum Coverage**: 80% for all packages
- **Integration Tests**: Cross-module compatibility validation
- **End-to-End Tests**: Critical user workflows

#### Security Standards
- **Zero High/Critical Vulnerabilities**: Blocks deployment
- **Secret Scanning**: Prevents credential exposure
- **SAST Analysis**: Static security analysis
- **Dependency Auditing**: Regular vulnerability scanning

#### Performance Benchmarks
- **Build Time**: < 5 minutes for full monorepo
- **Test Execution**: < 3 minutes for all test suites
- **Bundle Sizes**: 
  - Core: < 50KB
  - Auth: < 100KB
  - Recommendations: < 200KB
  - Frontend: < 5MB

### Deployment Strategy

#### Environment Promotion
1. **Development**: Feature branch deployments
2. **Staging**: Main branch integration testing
3. **Production**: Tagged releases with manual approval

#### Rollback Capabilities
- **Firebase Functions**: Automated rollback on failure
- **Frontend Hosting**: Version history with instant rollback
- **Package Versions**: Semantic versioning with dependency management

### Monitoring and Alerting

#### Success Metrics
- **Build Success Rate**: 95%+ target
- **Deployment Success**: 99%+ target
- **Security Scan Pass**: 100% requirement

#### Alert Configuration
- **Slack Integration**: Immediate notifications for failures
- **Email Alerts**: Critical security issues
- **Dashboard Updates**: Performance trend monitoring

## Usage

### Manual Triggers
All workflows support manual triggering with configurable options:

```bash
# Trigger specific deployment
gh workflow run deploy-functions.yml -f deployment_mode=full -f environment=production

# Run security scan
gh workflow run security-scanning.yml -f scan_type=full

# Monitor performance
gh workflow run performance-monitoring.yml -f monitoring_scope=full
```

### Branch Protection
Recommended branch protection rules:
- Require pull request reviews
- Require status checks (quality gates)
- Restrict pushes to main branch
- Require branches to be up to date

## Maintenance

### Regular Tasks
- Monitor performance trends
- Review security scan results
- Update dependency versions
- Optimize build performance

### Quarterly Reviews
- Evaluate pipeline efficiency
- Update security policies
- Review quality thresholds
- Plan infrastructure improvements

EOF
    
    print_status "SUCCESS" "Created CI/CD documentation"
}

# Setup GitHub repository secrets (instructions only)
setup_secrets_instructions() {
    print_status "INFO" "Creating secrets setup instructions..."
    
    SECRETS_FILE="$PROJECT_ROOT/docs/ci-cd/required-secrets.md"
    mkdir -p "$(dirname "$SECRETS_FILE")"
    
    cat > "$SECRETS_FILE" << 'EOF'
# Required GitHub Repository Secrets

To enable the CI/CD pipelines, configure the following secrets in your GitHub repository settings:

## Firebase Secrets

### FIREBASE_SERVICE_ACCOUNT
Firebase service account JSON for deployment authentication.

```bash
# Generate service account key
firebase projects:list
firebase projects:addiamserviceaccount --project your-project-id

# Copy the JSON content to GitHub Secrets
```

## API Keys

### ANTHROPIC_API_KEY
Anthropic Claude API key for AI functionality.

```bash
# Get from Anthropic Console
# https://console.anthropic.com/
```

## Optional Secrets

### SLACK_WEBHOOK_URL (Variable)
Slack webhook URL for notifications.

### CODECOV_TOKEN (Optional)
Codecov token for coverage reporting.

## Environment Variables (Variables)

Set these as GitHub repository variables:

- **FIREBASE_PROJECT_ID**: Your Firebase project ID
- **STAGING_PROJECT_ID**: Staging Firebase project ID  
- **DEV_PROJECT_ID**: Development Firebase project ID

## Setup Instructions

1. Go to your GitHub repository
2. Navigate to Settings > Secrets and variables > Actions
3. Add each secret using the "New repository secret" button
4. Add variables using the "Variables" tab

## Security Notes

- Never commit secrets to the repository
- Rotate secrets regularly
- Use least-privilege access for service accounts
- Monitor secret usage in Actions logs
EOF
    
    print_status "SUCCESS" "Created secrets setup instructions"
}

# Run tests to validate setup
run_validation_tests() {
    print_status "INFO" "Running validation tests..."
    
    cd "$PROJECT_ROOT"
    
    # Install dependencies
    print_status "INFO" "Installing dependencies..."
    npm ci
    
    # Run type checking
    print_status "INFO" "Running type checks..."
    if npm run type-check; then
        print_status "SUCCESS" "Type checking passed"
    else
        print_status "ERROR" "Type checking failed"
        exit 1
    fi
    
    # Run linting
    print_status "INFO" "Running linting..."
    if npm run lint; then
        print_status "SUCCESS" "Linting passed"
    else
        print_status "WARNING" "Linting issues found (fixable)"
    fi
    
    # Build packages
    print_status "INFO" "Building packages..."
    if npm run build; then
        print_status "SUCCESS" "Build completed successfully"
    else
        print_status "ERROR" "Build failed"
        exit 1
    fi
    
    print_status "SUCCESS" "Validation tests completed"
}

# Main execution
main() {
    echo "Starting CI/CD pipeline setup..."
    echo ""
    
    check_prerequisites
    echo ""
    
    validate_workflows
    echo ""
    
    validate_package_configs  
    echo ""
    
    setup_firebase_config
    echo ""
    
    create_documentation
    echo ""
    
    setup_secrets_instructions
    echo ""
    
    # Ask user if they want to run validation tests
    read -p "Run validation tests? (y/N): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        run_validation_tests
        echo ""
    fi
    
    print_status "SUCCESS" "🎉 CI/CD Pipeline setup completed successfully!"
    echo ""
    echo "Next Steps:"
    echo "1. Configure GitHub repository secrets (see docs/ci-cd/required-secrets.md)"
    echo "2. Set up branch protection rules"
    echo "3. Test workflows with a pull request"
    echo "4. Monitor pipeline performance and adjust thresholds as needed"
    echo ""
    echo "Documentation available at:"
    echo "- docs/ci-cd/pipeline-overview.md"
    echo "- docs/ci-cd/required-secrets.md"
    echo ""
    print_status "INFO" "Happy coding! 🚀"
}

# Run main function
main "$@"