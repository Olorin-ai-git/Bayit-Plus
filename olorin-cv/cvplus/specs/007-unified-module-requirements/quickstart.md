# Quickstart: Unified Module Requirements

**Date**: 2025-09-13
**Feature**: 007-unified-module-requirements
**Prerequisites**: CVPlus development environment, Node.js 18+

## Quick Start Scenarios

### Scenario 1: Validate Existing Module
**Goal**: Check if an existing CVPlus submodule meets unified requirements

```bash
# Validate a specific module
npx cvplus-validator validate --path packages/cv-processing

# Validate with specific rules only
npx cvplus-validator validate --path packages/multimedia --rules STRUCTURE,DOCUMENTATION

# Generate detailed report
npx cvplus-validator validate --path packages/auth --format json --output validation-report.json
```

**Expected Output**:
```json
{
  "moduleId": "cv-processing",
  "overallScore": 85,
  "status": "WARNING",
  "results": [
    {
      "ruleId": "README_REQUIRED",
      "status": "PASS",
      "severity": "ERROR"
    },
    {
      "ruleId": "TESTS_COVERAGE",
      "status": "WARNING",
      "severity": "WARNING",
      "message": "Test coverage is 78%, should be 80%+"
    }
  ],
  "recommendations": [
    "Increase test coverage to meet 80% minimum",
    "Add API documentation section to README.md"
  ]
}
```

### Scenario 2: Create New Compliant Module
**Goal**: Generate a new CVPlus submodule from standardized template

```bash
# List available templates
npx cvplus-generator list-templates

# Create new backend API module
npx cvplus-generator create \
  --template backend-api \
  --name user-management \
  --path packages/user-management \
  --author "CVPlus Team"

# Create utility library module
npx cvplus-generator create \
  --template utility-lib \
  --name data-utils \
  --path packages/data-utils \
  --description "Common data manipulation utilities"
```

**Expected Directory Structure**:
```
packages/user-management/
├── README.md                 # Standardized documentation
├── package.json             # With unified scripts
├── tsconfig.json            # Unified TypeScript config
├── src/
│   ├── index.ts            # Clear entry point
│   ├── types/              # Type definitions
│   ├── services/           # Business logic
│   └── utils/              # Helper functions
├── tests/
│   ├── unit/               # Unit tests
│   ├── integration/        # Integration tests
│   └── __fixtures__/       # Test data
├── docs/
│   ├── API.md              # API documentation
│   └── CHANGELOG.md        # Version history
└── dist/                   # Built output (generated)
```

### Scenario 3: Batch Validate All Modules
**Goal**: Check compliance across entire CVPlus ecosystem

```bash
# Validate all submodules
npx cvplus-validator validate-all \
  --path packages/ \
  --parallel 4 \
  --format html \
  --output compliance-report.html

# Validate with filtering
npx cvplus-validator validate-all \
  --path packages/ \
  --severity ERROR \
  --category STRUCTURE,TESTING
```

**Expected HTML Report**:
- **Overall Compliance**: 87% across 18 modules
- **Modules by Status**:
  - ✅ Pass: 12 modules (67%)
  - ⚠️ Warning: 5 modules (28%)
  - ❌ Fail: 1 module (5%)
- **Top Violations**:
  1. Missing CHANGELOG.md (6 modules)
  2. Test coverage below 80% (4 modules)
  3. Inconsistent package.json scripts (3 modules)

### Scenario 4: Fix Common Violations
**Goal**: Automatically remediate fixable compliance issues

```bash
# Auto-fix all fixable violations in a module
npx cvplus-validator fix --path packages/analytics --dry-run

# Apply auto-fixes
npx cvplus-validator fix --path packages/analytics

# Fix specific rule violations
npx cvplus-validator fix --path packages/public-profiles --rules PACKAGE_SCRIPTS,README_STRUCTURE
```

**Expected Auto-fixes**:
- ✅ Added missing package.json scripts (build, test, lint, dev)
- ✅ Created standardized README.md structure
- ✅ Generated basic tsconfig.json with unified settings
- ✅ Created missing directories (tests/, docs/)
- ⚠️ Manual fixes needed: API documentation, test coverage

### Scenario 5: Monitor Compliance Over Time
**Goal**: Track ecosystem compliance trends and health

```bash
# Generate ecosystem overview
npx cvplus-validator ecosystem --format json

# Track trends over time (requires historical data)
npx cvplus-validator trends --since 30days --format chart

# Set up automated monitoring
npx cvplus-validator setup-monitoring \
  --schedule daily \
  --webhook https://slack.cvplus.dev/compliance
```

**Expected Ecosystem Overview**:
```json
{
  "totalModules": 18,
  "averageScore": 87.3,
  "statusDistribution": {
    "pass": 12,
    "warning": 5,
    "fail": 1
  },
  "trends": {
    "scoreChange": +3.2,
    "newViolations": 2,
    "resolvedViolations": 8
  },
  "topViolations": [
    {"ruleId": "CHANGELOG_MISSING", "count": 6, "percentage": 33.3},
    {"ruleId": "TEST_COVERAGE_LOW", "count": 4, "percentage": 22.2}
  ]
}
```

### Scenario 6: Migrate Legacy Module
**Goal**: Upgrade existing non-compliant module to meet standards

```bash
# Analyze migration requirements
npx cvplus-migrator analyze --path packages/legacy-module

# Generate migration plan
npx cvplus-migrator plan --path packages/legacy-module --output migration-plan.md

# Execute migration with backup
npx cvplus-migrator migrate \
  --path packages/legacy-module \
  --backup \
  --dry-run

# Apply migration
npx cvplus-migrator migrate --path packages/legacy-module
```

**Expected Migration Steps**:
1. **Backup**: Create backup of existing module
2. **Structure**: Reorganize files to standard directories
3. **Configuration**: Update package.json, tsconfig.json
4. **Documentation**: Standardize README.md format
5. **Testing**: Set up test framework and basic tests
6. **Validation**: Verify final compliance score

## Integration Testing Scenarios

### Test 1: Module Validation Pipeline
```bash
# Simulate CI/CD validation
git checkout -b test-validation
echo "test" > packages/cv-processing/invalid-file.txt
git add packages/cv-processing/invalid-file.txt
git commit -m "Add invalid file"

# Pre-commit hook should trigger validation
# Expected: Warning about non-standard file in module root
```

### Test 2: Template Generation Pipeline
```bash
# Test template customization
npx cvplus-generator create \
  --template backend-api \
  --name test-module \
  --path /tmp/test-module \
  --options '{"database": "postgresql", "auth": "jwt"}'

# Validate generated module
npx cvplus-validator validate --path /tmp/test-module
# Expected: 100% compliance score
```

### Test 3: Ecosystem Health Monitoring
```bash
# Simulate ecosystem scan
npx cvplus-validator validate-all --path packages/ --format json | \
  jq '.[] | select(.overallScore < 80) | .moduleId'

# Expected: List of modules needing attention
```

## Success Criteria

### ✅ Validation Success Indicators
- Module validation completes in < 30 seconds
- Compliance score accurately reflects module health
- Detailed remediation guidance provided for all violations
- Support for both individual and batch validation

### ✅ Template Generation Success Indicators
- New modules achieve 95%+ initial compliance score
- All generated files follow unified standards
- Templates support customization without breaking compliance
- Generated modules integrate seamlessly with CVPlus ecosystem

### ✅ Ecosystem Monitoring Success Indicators
- Real-time compliance tracking across 18+ modules
- Trend analysis shows improvement over time
- Automated alerts for critical compliance violations
- Integration with existing CVPlus development workflows

## Troubleshooting Common Issues

### Issue: Validation Fails on Module Path
```bash
# Check if path exists and is a valid module
ls -la packages/module-name/
npx cvplus-validator validate --path packages/module-name --debug
```

### Issue: Template Generation Permissions Error
```bash
# Ensure output directory is writable
mkdir -p packages/new-module
chmod 755 packages/new-module
npx cvplus-generator create --template utility --name new-module --path packages/new-module
```

### Issue: Compliance Score Inconsistency
```bash
# Clear validation cache and re-run
npx cvplus-validator clear-cache
npx cvplus-validator validate --path packages/module-name --no-cache
```

## Next Steps After Quickstart

1. **Set up automated validation** in CI/CD pipeline
2. **Configure pre-commit hooks** for compliance checking
3. **Schedule regular ecosystem health reports**
4. **Customize compliance rules** for specific CVPlus requirements
5. **Train team** on unified module standards and tooling