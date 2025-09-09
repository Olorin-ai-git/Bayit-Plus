# CVPlus System Verification Tool

**Execute comprehensive system health checks and verification across CVPlus infrastructure and codebase.**

## Command

Run the CVPlus verification system with options based on user input:

```bash
# Execute the CVPlus verification script with user arguments
/Users/gklainert/.claude/commands/verify.sh $ARGUMENTS
```

## Available Options

- `--quick` or `-q`: Run quick verification (essential systems only)
- `--detailed` or `-d`: Run detailed verification with performance metrics
- `--parallel` or `-p`: Run tests in parallel for faster execution
- `--json`: Output results in JSON format
- `--html`: Generate HTML report
- `--help` or `-h`: Show help message

## What This Command Verifies

### 🔍 System Components
- **Firebase Configuration**: Project settings, authentication, and deployment readiness
- **Functions Directory**: Node.js dependencies, TypeScript compilation status
- **Frontend Directory**: React application setup and build status
- **Environment Configuration**: API keys, secrets, and environment variables
- **Git Repository**: Branch status, recent changes, and repository health
- **Recent Errors**: Log analysis for recent error patterns

### 🚀 CVPlus-Specific Checks
- **CV Processing Pipeline**: Core CV parsing and analysis services
- **AI Integration**: Anthropic Claude API and OpenAI API connectivity
- **Database Connectivity**: Firestore collections and data integrity
- **File Upload System**: Storage bucket configuration and access
- **Authentication Flow**: User authentication and session management
- **API Endpoints**: Function deployment and health status

### 📊 Implementation Verification
- **Code Structure**: Required files and proper implementation patterns
- **Dependencies**: Package installations and version compatibility
- **Test Coverage**: Test suite completeness and execution status
- **Build Process**: TypeScript compilation and deployment readiness

## Usage Examples

```bash
# Quick health check
/verify --quick

# Comprehensive verification with detailed metrics
/verify --detailed

# Generate JSON report for CI/CD integration
/verify --detailed --json

# Parallel execution for faster results
/verify --parallel

# Generate HTML report for stakeholders
/verify --html
```

## Integration with CVPlus

This command integrates with:
- **CVPlus main verification script**: `/Users/gklainert/.claude/commands/verify.sh`
- **Project verification scripts**: `/Users/gklainert/Documents/cvplus/scripts/testing/verify-*.js`
- **Firebase emulator**: Local testing environment checks
- **Production environment**: Health checks and deployment status

## Output Formats

### Console Output
- Color-coded status indicators (✅ ❌ ⚠️)
- Progress indicators and timing information
- Detailed error messages and recommendations

### JSON Output
- Machine-readable format for CI/CD integration
- Structured error reporting
- Metrics and performance data

### HTML Output
- Formatted reports for stakeholders
- Visual dashboards and charts
- Shareable verification results

## Error Handling

The command includes multiple fallback mechanisms:
1. **Primary**: Compiled verification script with comprehensive checks
2. **Secondary**: Node.js implementation verification script
3. **Fallback**: Inline system checks for basic functionality
4. **Emergency**: Manual verification steps and troubleshooting guide

## Integration Notes

- **Permissions**: Requires access to Firebase project and local development environment
- **Dependencies**: Node.js, Firebase CLI, and project-specific dependencies
- **Network**: May require internet access for API connectivity tests
- **Credentials**: Uses existing Firebase authentication and API keys

Use `/verify` to ensure your CVPlus development environment is healthy and all systems are functioning correctly before development, testing, or deployment activities.