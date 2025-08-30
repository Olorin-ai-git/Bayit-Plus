# /fix - Automatic Error Resolution Command (Enhanced for Olorin)

**Description**: Automatically fix all TypeScript, Python, lint errors, and failing tests in the Olorin project using orchestrated subagents. Enhanced with Python/Poetry support and comprehensive multi-language error detection. Also provides codebase organization functionality to move loose documents and scripts to proper folders.

**Usage**: 
- `/fix` - Fix TypeScript, Python, lint errors, and failing tests only
- `/fix --organize` - Fix all errors/tests AND organize loose documents/scripts
- `/fix --tests-only` - Fix only failing tests
- `/fix --python-only` - Fix only Python/Poetry errors
- `/fix --frontend-only` - Fix only frontend/TypeScript errors

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
// /fix command implementation (Enhanced for Olorin)
async function executeFixCommand(args?: string[]) {
  const organizeFlag = args && args.includes('--organize');
  const testsOnlyFlag = args && args.includes('--tests-only');
  const pythonOnlyFlag = args && args.includes('--python-only');
  const frontendOnlyFlag = args && args.includes('--frontend-only');
  
  console.log('🔧 Starting automatic error resolution...');
  if (organizeFlag) {
    console.log('📁 Organization mode enabled - will also organize loose documents and scripts');
  }
  if (testsOnlyFlag) {
    console.log('🧪 Tests-only mode - focusing on test failures');
  }
  if (pythonOnlyFlag) {
    console.log('🐍 Python-only mode - focusing on Python/Poetry errors');
  }
  if (frontendOnlyFlag) {
    console.log('⚛️ Frontend-only mode - focusing on TypeScript/React errors');
  }
  
  // Step 1: Scan for errors and test failures based on mode
  const errors = await scanForAllErrors(pythonOnlyFlag, frontendOnlyFlag, testsOnlyFlag);
  const testFailures = await scanForTestFailures(pythonOnlyFlag, frontendOnlyFlag);
  
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
  else if (pythonOnlyFlag) taskType = 'python-error-fixing-only';
  else if (frontendOnlyFlag) taskType = 'frontend-error-fixing-only';
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

async function scanForAllErrors(pythonOnly = false, frontendOnly = false, testsOnly = false) {
  if (testsOnly) return []; // Skip error scanning for tests-only mode
  
  const errors = [];
  
  // Python/Poetry errors (olorin-server)
  if (!frontendOnly) {
    console.log('🐍 Scanning Python/Poetry errors in olorin-server...');
    
    // Poetry dependency issues
    try {
      await execCommand('cd olorin-server && poetry check');
    } catch (poetryError) {
      errors.push({
        type: 'poetry-dependency',
        source: poetryError.toString(),
        severity: 'high',
        location: 'olorin-server'
      });
    }
    
    // Python type checking with mypy
    try {
      await execCommand('cd olorin-server && poetry run mypy .');
    } catch (mypyError) {
      errors.push({
        type: 'python-types',
        source: mypyError.toString(),
        severity: 'high',
        location: 'olorin-server'
      });
    }
    
    // Python formatting with black
    try {
      await execCommand('cd olorin-server && poetry run black . --check');
    } catch (blackError) {
      errors.push({
        type: 'python-formatting',
        source: blackError.toString(),
        severity: 'medium',
        location: 'olorin-server'
      });
    }
    
    // Python import sorting with isort
    try {
      await execCommand('cd olorin-server && poetry run isort . --check-only');
    } catch (isortError) {
      errors.push({
        type: 'python-imports',
        source: isortError.toString(),
        severity: 'medium',
        location: 'olorin-server'
      });
    }
    
    // Python syntax and runtime errors
    try {
      await execCommand('cd olorin-server && poetry run python -m py_compile app/**/*.py');
    } catch (syntaxError) {
      errors.push({
        type: 'python-syntax',
        source: syntaxError.toString(),
        severity: 'critical',
        location: 'olorin-server'
      });
    }
    
    // Python tox multi-environment testing
    try {
      await execCommand('cd olorin-server && poetry run tox --parallel auto');
    } catch (toxError) {
      errors.push({
        type: 'python-tox',
        source: toxError.toString(),
        severity: 'high',
        location: 'olorin-server'
      });
    }
  }
  
  // TypeScript errors (frontend components)
  if (!pythonOnly) {
    console.log('⚛️ Scanning TypeScript errors in frontend components...');
    
    // olorin-front TypeScript errors
    try {
      await execCommand('cd olorin-front && npx tsc --noEmit');
    } catch (tscError) {
      errors.push({
        type: 'typescript',
        source: tscError.toString(),
        severity: 'high',
        location: 'olorin-front'
      });
    }
    
    // olorin-web-portal TypeScript errors
    try {
      await execCommand('cd olorin-web-portal && npx tsc --noEmit');
    } catch (tscError) {
      errors.push({
        type: 'typescript',
        source: tscError.toString(),
        severity: 'high',
        location: 'olorin-web-portal'
      });
    }
    
    // ESLint errors across frontend components
    try {
      await execCommand('cd olorin-front && npx eslint . --format json');
    } catch (eslintError) {
      errors.push({
        type: 'eslint',
        source: eslintError.toString(),
        severity: 'medium',
        location: 'olorin-front'
      });
    }
    
    try {
      await execCommand('cd olorin-web-portal && npx eslint . --format json');
    } catch (eslintError) {
      errors.push({
        type: 'eslint',
        source: eslintError.toString(),
        severity: 'medium',
        location: 'olorin-web-portal'
      });
    }
    
    // Build errors
    try {
      await execCommand('cd olorin-front && npm run build');
    } catch (buildError) {
      errors.push({
        type: 'build-failure',
        source: buildError.toString(),
        severity: 'high',
        location: 'olorin-front'
      });
    }
    
    try {
      await execCommand('cd olorin-web-portal && npm run build');
    } catch (buildError) {
      errors.push({
        type: 'build-failure',
        source: buildError.toString(),
        severity: 'high',
        location: 'olorin-web-portal'
      });
    }
  }
  
  console.log(`📊 Found ${errors.length} error(s) across the codebase`);
  return errors;
}

async function scanForTestFailures(pythonOnly = false, frontendOnly = false) {
  const testFailures = [];
  
  console.log('🧪 Scanning for test failures...');
  
  // Python tests (olorin-server)
  if (!frontendOnly) {
    console.log('🐍 Checking Python tests with pytest...');
    try {
      await execCommand('cd olorin-server && poetry run pytest --tb=short');
    } catch (pytestError) {
      testFailures.push({
        type: 'python-tests',
        source: pytestError.toString(),
        location: 'olorin-server',
        framework: 'pytest',
        severity: 'high'
      });
    }
    
    // Python test coverage check
    try {
      await execCommand('cd olorin-server && poetry run pytest --cov --cov-fail-under=30');
    } catch (coverageError) {
      testFailures.push({
        type: 'python-coverage',
        source: coverageError.toString(),
        location: 'olorin-server',
        framework: 'pytest-cov',
        severity: 'medium'
      });
    }
  }
  
  // Frontend tests (JavaScript/TypeScript)
  if (!pythonOnly) {
    console.log('⚛️ Checking frontend tests...');
    
    // olorin-front tests
    try {
      await execCommand('cd olorin-front && npm test -- --run');
    } catch (frontendTestError) {
      testFailures.push({
        type: 'frontend-tests',
        source: frontendTestError.toString(),
        location: 'olorin-front',
        framework: 'jest/vitest',
        severity: 'high'
      });
    }
    
    // olorin-web-portal tests  
    try {
      await execCommand('cd olorin-web-portal && npm test -- --run');
    } catch (portalTestError) {
      testFailures.push({
        type: 'portal-tests',
        source: portalTestError.toString(),
        location: 'olorin-web-portal',
        framework: 'jest',
        severity: 'high'
      });
    }
  }
  
  console.log(`📊 Found ${testFailures.length} test suite(s) with failures`);
  
  return testFailures;
}

async function scanForOrganizationItems() {
  const items = [];
  
  console.log('📁 Scanning for loose documents and scripts...');
  
  // Scan for loose markdown files outside /docs
  try {
    const looseDocsResult = await execCommand(`find . -name "*.md" -not -path "./docs/*" -not -path "./node_modules/*" -not -path "./.git/*" -not -path "./olorin-front/node_modules/*" -not -path "./olorin-web-portal/node_modules/*" -not -path "./olorin-server/*" | grep -v "node_modules"`);
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
    const looseScriptsResult = await execCommand(`find . \\( -name "*.sh" -o -name "run-*.py" -o -name "start_*.py" -o -name "git_*.sh" \\) -not -path "./scripts/*" -not -path "./node_modules/*" -not -path "./.git/*" -not -path "./olorin-server/.venv/*" | grep -v "node_modules"`);
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
      "name": "python-pro",
      "purpose": "Fix Python/Poetry errors, type checking, and formatting issues",
      "priority": "high",
      "condition": "hasPythonErrors"
    },
    {
      "name": "java-pro",
      "purpose": "Fix Java compilation errors, Maven/Gradle build issues, and test failures",
      "priority": "high",
      "condition": "hasJavaErrors"
    },
    {
      "name": "typescript-pro", 
      "purpose": "Fix TypeScript compilation errors",
      "priority": "high",
      "condition": "hasTypeScriptErrors"
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
      "purpose": "Fix Python pytest coverage and testing infrastructure",
      "priority": "high",
      "condition": "hasPythonTests"
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
      "agent": "python-pro",
      "action": "Fix all Python/Poetry errors, type checking, and formatting issues",
      "condition": "hasPythonErrors"
    },
    {
      "step": 2.5, 
      "agent": "java-pro",
      "action": "Fix all Java compilation errors and Maven/Gradle build issues",
      "condition": "hasJavaErrors"
    },
    {
      "step": 3, 
      "agent": "typescript-pro",
      "action": "Fix all TypeScript compilation errors",
      "condition": "hasTypeScriptErrors"
    },
    {
      "step": 4,
      "agent": "test-writer-fixer",
      "action": "Fix all failing tests, test compilation errors, and assertion failures"
    },
    {
      "step": 5,
      "agent": "backend-test-engineer",
      "action": "Fix Python pytest coverage issues and testing infrastructure",
      "condition": "hasPythonTests"
    },
    {
      "step": 6,
      "agent": "frontend-coverage-engineer",
      "action": "Fix frontend test coverage and React testing issues",
      "condition": "hasFrontendTests"
    },
    {
      "step": 7,
      "agent": "code-reviewer", 
      "action": "Fix ESLint and linting errors"
    },
    {
      "step": 8,
      "agent": "debugger",
      "action": "Handle any remaining complex issues"
    },
    {
      "step": 9,
      "agent": "security-specialist",
      "action": "Validate all planned file operations for safety",
      "condition": "organizationMode"
    },
    {
      "step": 10,
      "agent": "documentation-specialist", 
      "action": "Organize loose documents into appropriate /docs subfolders",
      "condition": "organizationMode"
    },
    {
      "step": 11,
      "agent": "system-architect",
      "action": "Organize loose scripts into appropriate /scripts subfolders",
      "condition": "organizationMode"
    },
    {
      "step": 12,
      "agent": "orchestrator",
      "action": "Verify all errors, tests are resolved and files are organized, repeat if needed"
    }
  ],
  "successCriteria": [
    "cd olorin-server && poetry run mypy . passes with no errors",
    "cd olorin-server && poetry run black . --check passes with no errors",
    "cd olorin-server && poetry run isort . --check-only passes with no errors", 
    "cd olorin-server && poetry run pytest passes with no failures",
    "cd olorin-server && poetry run pytest --cov --cov-fail-under=30 passes",
    "cd olorin-server && poetry run tox passes with no errors",
    "mvn compile passes with no errors (if Java present)",
    "./gradlew compileJava passes with no errors (if Java present)",
    "mvn test passes with no failures (if Java present)",
    "./gradlew test passes with no failures (if Java present)",
    "cd olorin-front && npx tsc --noEmit passes with no errors",
    "cd olorin-web-portal && npx tsc --noEmit passes with no errors",
    "cd olorin-front && npx eslint . passes with no errors",
    "cd olorin-web-portal && npx eslint . passes with no errors", 
    "cd olorin-front && npm run build passes with no errors",
    "cd olorin-web-portal && npm run build passes with no errors",
    "All test suites pass without failures",
    "Frontend tests (npm test) pass successfully",
    "Python tests (poetry run pytest) pass successfully",
    "All code quality checks pass",
    "Test coverage meets minimum thresholds (30% for Python)",
    "All loose documents moved to /docs subfolders (organization mode only)",
    "All loose scripts moved to /scripts subfolders (organization mode only)"
  ],
  "autoExecute": true,
  "maxIterations": 15
}
```

**Error Categories Handled (Enhanced for Olorin)**:

1. **Python Errors (olorin-server)**:
   - **Poetry Dependency Issues**: Version conflicts, missing packages
   - **Type Checking Errors**: mypy type annotation issues
   - **Formatting Issues**: black code formatting violations
   - **Import Sorting**: isort import organization problems
   - **Syntax Errors**: Python compilation failures
   - **Runtime Errors**: Exception handling and logic errors
   - **Tox Multi-Environment**: Cross-environment compatibility issues

1.5. **Java Errors (if present)**:
   - **Maven Build Errors**: Dependency conflicts, compilation failures
   - **Gradle Build Errors**: Build script issues, dependency resolution
   - **Java Compilation Errors**: Syntax errors, type mismatches
   - **JUnit Test Failures**: Test assertion failures, setup issues

2. **TypeScript Errors (olorin-front, olorin-web-portal)**:
   - Type mismatches and interface issues
   - Missing imports and module resolution
   - Generic constraints and type definitions
   - React component type errors

3. **ESLint Errors**:
   - Unused variables
   - Code style violations
   - React hooks rules
   - Accessibility issues
   - Security warnings

4. **Build Errors**:
   - Compilation failures
   - Dependency issues
   - Configuration problems
   - Asset resolution errors

5. **Test Failures** (Multi-Language):
   - **Test Compilation Errors**: TypeScript/JavaScript errors in test files
   - **Assertion Failures**: Incorrect expectations or test logic
   - **Runtime Errors**: Unhandled exceptions during test execution
   - **Setup/Teardown Issues**: Problems with test environment configuration
   - **Mock/Stub Failures**: Issues with test doubles and mocked dependencies
   - **Async Test Issues**: Timeout errors, unhandled promise rejections
   - **Coverage Gaps**: Missing tests for critical code paths
   - **Test Framework Errors**: Jest, Vitest, Mocha configuration issues
   - **Python Test Failures (pytest)**: Assertion errors, test setup issues
   - **Java Test Failures (JUnit)**: Maven/Gradle test execution errors
   - **JavaScript/TypeScript Test Failures**: Jest/Vitest test errors
   - **Test Coverage Issues**: Below minimum thresholds
   - **Test Compilation Errors**: TypeScript/Java errors in test files
   - **Mock/Stub Failures**: Test double configuration issues
   - **Async Test Issues**: Promise handling and timeout errors

6. **Code Quality Issues**:
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

**Olorin-Specific Test Support**:

1. **Python Testing (olorin-server)**:
   - **pytest**: Unit and integration tests
   - **pytest-cov**: Code coverage analysis (30% minimum)
   - **pytest-asyncio**: Async test support
   - **pytest-mock**: Mocking and stubbing
   - **tox**: Multi-environment testing

2. **Frontend Testing**:
   - **Jest/Vitest**: Component and unit tests
   - **React Testing Library**: Component integration tests
   - **TypeScript Test Compilation**: Type-safe test code

**Example Usage (Olorin-Enhanced)**:

```bash
# Fix all errors and test failures (comprehensive)
/fix

# Output:
🔧 Starting automatic error resolution...
🐍 Scanning Python/Poetry errors in olorin-server...
⚛️ Scanning TypeScript errors in frontend components...
🧪 Scanning for test failures...
📊 Found 15 Python errors, 8 TypeScript errors, 12 test failures
🎯 Orchestrator creating comprehensive fix plan...
🤖 Deploying python-pro agent for Python/Poetry errors...
✅ Fixed 10 mypy type errors
✅ Fixed 3 black formatting issues  
✅ Fixed 2 isort import sorting issues
🤖 Deploying typescript-pro agent for TypeScript errors...
✅ Fixed 8 TypeScript compilation errors
🤖 Deploying test-writer-fixer agent for test failures...
✅ Fixed 7 Python pytest failures
✅ Fixed 5 frontend test failures
🤖 Deploying backend-test-engineer for Python coverage...
✅ Improved Python test coverage to 35%
🔍 Running final verification...
✅ All errors and tests resolved! Olorin codebase is now clean.

# Fix only Python errors
/fix --python-only

# Output:
🔧 Starting automatic error resolution...
🐍 Python-only mode - focusing on Python/Poetry errors
🐍 Scanning Python/Poetry errors in olorin-server...
📊 Found 12 Python errors
🎯 Orchestrator creating Python fix plan...
🤖 Deploying python-pro agent...
✅ Fixed all mypy type checking errors
✅ Applied black code formatting
✅ Organized imports with isort
✅ Resolved Poetry dependency conflicts
🔍 Running final verification...
✅ Python codebase is clean and properly formatted!

# Fix only frontend errors  
/fix --frontend-only

# Output:
🔧 Starting automatic error resolution...
⚛️ Frontend-only mode - focusing on TypeScript/React errors
⚛️ Scanning TypeScript errors in frontend components...
📊 Found 18 frontend errors
🎯 Orchestrator creating frontend fix plan...
🤖 Deploying typescript-pro agent...
✅ Fixed TypeScript errors in olorin-front
✅ Fixed TypeScript errors in olorin-web-portal
🤖 Deploying code-reviewer for ESLint issues...
✅ Fixed React hooks violations
✅ Fixed accessibility warnings
🔍 Running final verification...
✅ Frontend components are error-free and properly typed!
```

**Integration with Olorin Development Workflow**:

- **Poetry Integration**: Seamless use of `poetry run` for all Python commands
- **Multi-Component Support**: Handles olorin-server, olorin-front, and olorin-web-portal
- **Test Suite Management**: Maintains pytest and Jest/Vitest test suites
- **Code Quality**: Enforces black, isort, mypy, and ESLint standards
- **CI/CD Compatibility**: Ensures all checks pass for continuous integration

**Benefits for Olorin Development**:

1. **Rapid Multi-Language Development**: Fix Python and TypeScript errors instantly
2. **Consistent Code Quality**: Automated application of formatting and linting standards
3. **Test Reliability**: Keep all test suites passing across languages
4. **Productivity Boost**: Spend time on fraud detection features, not fixing errors
5. **Team Collaboration**: Maintain consistent standards across Python and TypeScript codebases
6. **CI/CD Pipeline Health**: Ensure all automated checks pass before deployment

This enhanced `/fix` command transforms Olorin's multi-language error resolution from manual, time-consuming processes into an automated, intelligent workflow that keeps both Python and TypeScript codebases clean, tests passing, and development velocity high.

