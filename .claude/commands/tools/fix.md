# /fix - Automatic Error Resolution Command

**Description**: Automatically fix all TypeScript, lint errors, and failing tests in the current project using orchestrated subagents. Also provides codebase organization functionality to move loose documents and scripts to proper folders.

**Usage**: 
- `/fix` - Fix TypeScript, lint errors, and failing tests only
- `/fix --organize` - Fix all errors/tests AND organize loose documents/scripts
- `/fix --tests-only` - Fix only failing tests

**What it does**:
- Scans the project for TypeScript compilation errors
- Identifies ESLint and other linting issues
- **[NEW]** Scans for and fixes failing tests across the codebase
- Uses orchestrator subagent to create a comprehensive fix plan
- Executes the plan automatically using specialized subagents
- Continues until all errors and tests are resolved
- **[NEW]** With --organize flag: Scans for loose documents and scripts, moves them to appropriate /docs and /scripts subfolders

**Key Features**:
- ✅ **Automatic Plan Creation**: Uses orchestrator subagent for systematic error resolution
- ✅ **Multi-Agent Execution**: Leverages specialized subagents (typescript-pro, error-detective, test-writer-fixer, etc.)
- ✅ **Continuous Iteration**: Keeps fixing until no errors or test failures remain
- ✅ **No Manual Approval**: Executes plan immediately for rapid development
- ✅ **Comprehensive Coverage**: Handles TypeScript, ESLint, test failures, and other code quality issues
- ✅ **[NEW] Test Failure Resolution**: Automatically detects and fixes failing tests using test-writer-fixer subagent
- ✅ **[NEW] Test Error Handling**: Fixes test compilation errors, runtime errors, and assertion failures
- ✅ **[NEW] Document Organization**: Scans for loose .md files and moves them to appropriate /docs subfolders
- ✅ **[NEW] Script Organization**: Scans for loose scripts and moves them to appropriate /scripts subfolders
- ✅ **[NEW] Duplicate Detection**: Identifies and handles redundant documentation
- ✅ **[NEW] Safe File Operations**: Never deletes files without explicit user approval

**Implementation**:

```typescript
// /fix command implementation
async function executeFixCommand(args?: string[]) {
  const organizeFlag = args && args.includes('--organize');
  const testsOnlyFlag = args && args.includes('--tests-only');
  
  console.log('🔧 Starting automatic error resolution...');
  if (organizeFlag) {
    console.log('📁 Organization mode enabled - will also organize loose documents and scripts');
  }
  if (testsOnlyFlag) {
    console.log('🧪 Tests-only mode - focusing on test failures');
  }
  
  // Step 1: Scan for errors and test failures
  const errors = testsOnlyFlag ? [] : await scanForAllErrors();
  const testFailures = await scanForTestFailures();
  
  // Step 2: If organize flag, scan for loose documents and scripts
  let organizationItems = [];
  if (organizeFlag) {
    organizationItems = await scanForOrganizationItems();
  }
  
  if (errors.length === 0 && testFailures.length === 0 && organizationItems.length === 0) {
    console.log('✅ No errors, test failures, or organization issues found! Everything is clean.');
    return;
  }
  
  // Step 3: Use orchestrator subagent to create comprehensive plan
  let taskType = 'comprehensive-error-fixing';
  if (testsOnlyFlag) taskType = 'test-fixing-only';
  else if (organizeFlag) taskType = 'comprehensive-error-fixing-tests-and-organization';
  
  await useOrchestratorAgent({
    task: taskType,
    errors: errors,
    testFailures: testFailures,
    organizationItems: organizationItems,
    autoExecute: true,
    iterateUntilClean: true
  });
}

async function scanForAllErrors() {
  const errors = [];
  
  // TypeScript errors
  try {
    await execCommand('npx tsc --noEmit');
  } catch (tscError) {
    errors.push({
      type: 'typescript',
      source: tscError.toString(),
      severity: 'high'
    });
  }
  
  // ESLint errors
  try {
    await execCommand('npx eslint . --format json');
  } catch (eslintError) {
    errors.push({
      type: 'eslint',
      source: eslintError.toString(),
      severity: 'medium'
    });
  }
  
  // Functions TypeScript errors
  try {
    await execCommand('cd functions && npm run build');
  } catch (functionsError) {
    errors.push({
      type: 'functions-typescript',
      source: functionsError.toString(),
      severity: 'high'
    });
  }
  
  return errors;
}

async function scanForTestFailures() {
  const testFailures = [];
  
  console.log('🧪 Scanning for test failures...');
  
  // Frontend tests (Jest/Vitest)
  try {
    await execCommand('cd frontend && npm test -- --run');
  } catch (frontendTestError) {
    testFailures.push({
      type: 'frontend-tests',
      source: frontendTestError.toString(),
      location: 'frontend',
      framework: 'vitest',
      severity: 'high'
    });
  }
  
  // Functions tests
  try {
    await execCommand('cd functions && npm test');
  } catch (functionsTestError) {
    testFailures.push({
      type: 'functions-tests',
      source: functionsTestError.toString(),
      location: 'functions',
      framework: 'jest',
      severity: 'high'
    });
  }
  
  // E2E tests if they exist
  try {
    const e2eExists = await execCommand('test -d e2e && echo "exists"');
    if (e2eExists.includes('exists')) {
      await execCommand('cd e2e && npm test');
    }
  } catch (e2eTestError) {
    testFailures.push({
      type: 'e2e-tests',
      source: e2eTestError.toString(),
      location: 'e2e',
      framework: 'playwright/cypress',
      severity: 'medium'
    });
  }
  
  // Integration tests if they exist
  try {
    const integrationExists = await execCommand('test -d integration && echo "exists"');
    if (integrationExists.includes('exists')) {
      await execCommand('cd integration && npm test');
    }
  } catch (integrationTestError) {
    testFailures.push({
      type: 'integration-tests',
      source: integrationTestError.toString(),
      location: 'integration',
      framework: 'jest',
      severity: 'medium'
    });
  }
  
  console.log(`📊 Found ${testFailures.length} test suite(s) with failures`);
  
  return testFailures;
}

async function scanForOrganizationItems() {
  const items = [];
  
  console.log('📁 Scanning for loose documents and scripts...');
  
  // Scan for loose markdown files outside /docs
  try {
    const looseDocsResult = await execCommand(`find . -name "*.md" -not -path "./docs/*" -not -path "./node_modules/*" -not -path "./.git/*" -not -path "./frontend/node_modules/*" -not -path "./functions/node_modules/*" -not -path "./klainert-web-portal/node_modules/*" -not -path "./cvplus-html/*" | grep -v "node_modules"`);
    const looseDocs = looseDocsResult.split('\n').filter(Boolean);
    
    if (looseDocs.length > 0) {
      items.push({
        type: 'loose-documents',
        files: looseDocs,
        severity: 'medium',
        count: looseDocs.length
      });
    }
  } catch (error) {
    console.log('⚠️ Error scanning for loose documents:', error.message);
  }
  
  // Scan for loose scripts outside /scripts
  try {
    const looseScriptsResult = await execCommand(`find . \\( -name "debug-*.js" -o -name "test-*.js" -o -name "validate-*.js" -o -name "*.test.js" -o -name "*.sh" \\) -not -path "./scripts/*" -not -path "./node_modules/*" -not -path "./.git/*" -not -path "./frontend/node_modules/*" -not -path "./functions/node_modules/*" -not -path "./frontend/src/*" | grep -v "node_modules"`);
    const looseScripts = looseScriptsResult.split('\n').filter(Boolean);
    
    if (looseScripts.length > 0) {
      items.push({
        type: 'loose-scripts',
        files: looseScripts,
        severity: 'medium',
        count: looseScripts.length
      });
    }
  } catch (error) {
    console.log('⚠️ Error scanning for loose scripts:', error.message);
  }
  
  // Scan for duplicate documentation
  try {
    const duplicatesResult = await execCommand(`find . -name "*.md" -not -path "./node_modules/*" -not -path "./.git/*" | xargs basename -s .md | sort | uniq -d`);
    const duplicates = duplicatesResult.split('\n').filter(Boolean);
    
    if (duplicates.length > 0) {
      items.push({
        type: 'duplicate-documents',
        files: duplicates,
        severity: 'low',
        count: duplicates.length
      });
    }
  } catch (error) {
    console.log('⚠️ Error scanning for duplicates:', error.message);
  }
  
  console.log(`📊 Found ${items.reduce((sum, item) => sum + item.count, 0)} organization items`);
  
  return items;
}
```

**Orchestrator Agent Configuration**:

```json
{
  "agent": "orchestrator",
  "task": "comprehensive-error-fixing-tests-and-organization",
  "subagents": [
    {
      "name": "error-detective",
      "purpose": "Analyze and categorize all errors and test failures",
      "priority": "high"
    },
    {
      "name": "typescript-pro", 
      "purpose": "Fix TypeScript compilation errors",
      "priority": "high"
    },
    {
      "name": "test-writer-fixer",
      "purpose": "Fix failing tests, test compilation errors, and assertion failures",
      "priority": "high"
    },
    {
      "name": "code-reviewer",
      "purpose": "Fix ESLint and code quality issues", 
      "priority": "medium"
    },
    {
      "name": "debugger",
      "purpose": "Handle complex debugging scenarios",
      "priority": "medium"
    },
    {
      "name": "backend-test-engineer",
      "purpose": "Fix backend test coverage and testing infrastructure",
      "priority": "medium",
      "condition": "hasBackendTests"
    },
    {
      "name": "frontend-coverage-engineer",
      "purpose": "Fix frontend test coverage and React testing issues",
      "priority": "medium",
      "condition": "hasFrontendTests"
    },
    {
      "name": "refactoring-architect",
      "purpose": "Refactor problematic code patterns",
      "priority": "low"
    },
    {
      "name": "documentation-specialist",
      "purpose": "Organize and categorize loose documents",
      "priority": "medium",
      "condition": "organizationMode"
    },
    {
      "name": "system-architect",
      "purpose": "Organize and categorize loose scripts",
      "priority": "medium", 
      "condition": "organizationMode"
    },
    {
      "name": "security-specialist",
      "purpose": "Validate file operations for safety",
      "priority": "high",
      "condition": "organizationMode"
    }
  ],
  "workflow": [
    {
      "step": 1,
      "agent": "error-detective",
      "action": "Scan and categorize all errors and test failures in the codebase"
    },
    {
      "step": 2, 
      "agent": "typescript-pro",
      "action": "Fix all TypeScript compilation errors"
    },
    {
      "step": 3,
      "agent": "test-writer-fixer",
      "action": "Fix all failing tests, test compilation errors, and assertion failures"
    },
    {
      "step": 4,
      "agent": "backend-test-engineer",
      "action": "Fix backend test coverage issues and testing infrastructure",
      "condition": "hasBackendTests"
    },
    {
      "step": 5,
      "agent": "frontend-coverage-engineer",
      "action": "Fix frontend test coverage and React testing issues",
      "condition": "hasFrontendTests"
    },
    {
      "step": 6,
      "agent": "code-reviewer", 
      "action": "Fix ESLint and linting errors"
    },
    {
      "step": 7,
      "agent": "debugger",
      "action": "Handle any remaining complex issues"
    },
    {
      "step": 8,
      "agent": "security-specialist",
      "action": "Validate all planned file operations for safety",
      "condition": "organizationMode"
    },
    {
      "step": 9,
      "agent": "documentation-specialist", 
      "action": "Organize loose documents into appropriate /docs subfolders",
      "condition": "organizationMode"
    },
    {
      "step": 10,
      "agent": "system-architect",
      "action": "Organize loose scripts into appropriate /scripts subfolders",
      "condition": "organizationMode"
    },
    {
      "step": 11,
      "agent": "documentation-specialist",
      "action": "Identify and handle duplicate documentation",
      "condition": "organizationMode"
    },
    {
      "step": 12,
      "agent": "orchestrator",
      "action": "Verify all errors, tests are resolved and files are organized, repeat if needed"
    }
  ],
  "successCriteria": [
    "npx tsc --noEmit passes with no errors",
    "npx eslint . passes with no errors", 
    "cd functions && npm run build passes with no errors",
    "All test suites pass without failures",
    "Frontend tests (npm test) pass successfully",
    "Backend/Functions tests pass successfully",
    "All code quality checks pass",
    "Test coverage meets minimum thresholds",
    "All loose documents moved to /docs subfolders (organization mode only)",
    "All loose scripts moved to /scripts subfolders (organization mode only)",
    "Duplicate documentation identified and handled (organization mode only)"
  ],
  "autoExecute": true,
  "maxIterations": 10
}
```

**Error Categories Handled**:

1. **TypeScript Errors**:
   - Type mismatches
   - Missing imports
   - Interface/type definition issues
   - Generic constraints
   - Module resolution errors

2. **ESLint Errors**:
   - Unused variables
   - Code style violations
   - React hooks rules
   - Accessibility issues
   - Security warnings

3. **Build Errors**:
   - Compilation failures
   - Dependency issues
   - Configuration problems
   - Asset resolution errors

4. **Test Failures** (NEW):
   - **Test Compilation Errors**: TypeScript/JavaScript errors in test files
   - **Assertion Failures**: Incorrect expectations or test logic
   - **Runtime Errors**: Unhandled exceptions during test execution
   - **Setup/Teardown Issues**: Problems with test environment configuration
   - **Mock/Stub Failures**: Issues with test doubles and mocked dependencies
   - **Async Test Issues**: Timeout errors, unhandled promise rejections
   - **Coverage Gaps**: Missing tests for critical code paths
   - **Test Framework Errors**: Jest, Vitest, Mocha configuration issues

5. **Code Quality Issues**:
   - Dead code elimination
   - Performance anti-patterns
   - Security vulnerabilities
   - Best practice violations

**Organization Categories (--organize mode only)**:

1. **Document Organization**:
   - **Loose Documents**: .md files outside /docs folder
   - **Target Subfolders**: 
     - `/docs/plans/` - Planning and specification documents
     - `/docs/implementation/` - Implementation summaries and reports
     - `/docs/architecture/` - System design and architecture docs
     - `/docs/deployment/` - Deployment guides and procedures
     - `/docs/fixes/` - Bug fix documentation and analysis
     - `/docs/testing/` - Test reports and validation docs
     - `/docs/security/` - Security audits and compliance docs
   - **Duplicate Handling**: Identifies duplicate documents for user review

2. **Script Organization**:
   - **Loose Scripts**: .sh, debug-*.js, test-*.js, validate-*.js files outside /scripts folder
   - **Target Subfolders**:
     - `/scripts/testing/` - Test scripts and validation tools
     - `/scripts/deployment/` - Deployment and release scripts
     - `/scripts/debugging/` - Debug and diagnostic scripts
     - `/scripts/utilities/` - General utility scripts
     - `/scripts/performance/` - Performance analysis scripts
     - `/scripts/security/` - Security and audit scripts
   - **Permission Preservation**: Maintains executable permissions for shell scripts

3. **Safety Protocols**:
   - **Never Delete**: Files are moved, never deleted
   - **User Approval**: Requests confirmation for duplicate handling
   - **Backup Creation**: Creates backup copies before moving files
   - **Rollback Support**: Maintains operation log for rollback if needed

**Example Usage**:

```bash
# Fix all errors and test failures
/fix

# Output:
🔧 Starting automatic error resolution...
🧪 Scanning for test failures...
📊 Found 23 TypeScript errors, 15 ESLint warnings, 8 test failures
🎯 Orchestrator creating comprehensive fix plan...
🤖 Deploying typescript-pro agent for compilation errors...
✅ Fixed 23 TypeScript errors
🤖 Deploying test-writer-fixer agent for test failures...
✅ Fixed 8 failing tests (5 frontend, 3 backend)
🤖 Deploying code-reviewer agent for linting issues...  
✅ Fixed 15 ESLint warnings
🔍 Running final verification...
✅ All errors and tests resolved! Codebase is now clean.

# Fix only test failures
/fix --tests-only

# Output:
🔧 Starting automatic error resolution...
🧪 Tests-only mode - focusing on test failures
🧪 Scanning for test failures...
📊 Found 12 test failures across frontend and functions
🎯 Orchestrator creating test fix plan...
🤖 Deploying test-writer-fixer agent...
✅ Fixed 7 frontend test failures
✅ Fixed 5 functions test failures
🤖 Deploying backend-test-engineer for coverage issues...
✅ Improved test coverage to 87%
🔍 Running final test verification...
✅ All tests passing! Test suite is healthy.

# Fix errors, tests AND organize files
/fix --organize

# Output:
🔧 Starting automatic error resolution...
📁 Organization mode enabled - will also organize loose documents and scripts
🧪 Scanning for test failures...
📊 Found 23 TypeScript errors, 15 ESLint warnings, 8 test failures
📁 Scanning for loose documents and scripts...
📊 Found 45 organization items
🎯 Orchestrator creating comprehensive fix and organization plan...
🤖 Deploying typescript-pro agent for compilation errors...
✅ Fixed 23 TypeScript errors
🤖 Deploying test-writer-fixer agent for test failures...
✅ Fixed 8 failing tests
🤖 Deploying code-reviewer agent for linting issues...  
✅ Fixed 15 ESLint warnings
🔒 Deploying security-specialist agent for file operation validation...
✅ All file operations validated as safe
📄 Deploying documentation-specialist agent for document organization...
✅ Moved 32 loose documents to appropriate /docs subfolders
🗂️ Deploying system-architect agent for script organization...
✅ Moved 13 loose scripts to appropriate /scripts subfolders
🔍 Running final verification...
✅ All errors, tests resolved and codebase is fully organized!
```

**Integration with Development Workflow**:

- **Pre-commit Hook**: Can be integrated to run before commits
- **CI/CD Pipeline**: Can be used in automated builds
- **Development Workflow**: Quick error resolution during active development
- **Code Review**: Ensure clean code before PR submission

**Benefits**:

1. **Rapid Development**: Fix errors and test failures instantly without manual intervention
2. **Consistent Quality**: Automated application of best practices across code and tests
3. **Learning Tool**: See how different types of errors and test failures are resolved
4. **Productivity Boost**: Spend time on features, not fixing errors or debugging tests
5. **Code Health**: Maintain high code quality standards and test coverage automatically
6. **[NEW] Test Reliability**: Automatically fix failing tests to maintain CI/CD pipeline health
7. **[NEW] Coverage Improvement**: Ensure minimum test coverage thresholds are met
8. **[NEW] Test Maintenance**: Keep test suites up-to-date with code changes
9. **[NEW] Organized Codebase**: Automatically organize loose documents and scripts into proper folder structure
10. **[NEW] Documentation Standards**: Ensure all documentation follows consistent organization patterns
11. **[NEW] Script Management**: Keep utility scripts properly categorized and easily discoverable
12. **[NEW] Reduced Technical Debt**: Prevent accumulation of broken tests and disorganized files
13. **[NEW] Team Collaboration**: Maintain consistent code quality and test standards across all team members

This enhanced command transforms error resolution, test maintenance, AND codebase organization from manual, time-consuming processes into an automated, intelligent workflow that keeps the codebase clean, tests passing, and development velocity high.