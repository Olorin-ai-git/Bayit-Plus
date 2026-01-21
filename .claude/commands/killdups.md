# /killdups - CVPlus Code Deduplication System

**Project**: CVPlus  
**Author**: Gil Klainert  
**Version**: 1.0  

## Quick Start

```bash
# Run analysis on CVPlus codebase
/killdups

# Generate and execute plan
/killdups --execute-plan --auto-approve
```

## CVPlus-Specific Features

### Modular Architecture Support
- **10 Git Submodules**: Analyzes across all CVPlus modules
  - `packages/core` - Core types and utilities
  - `packages/auth` - Authentication system
  - `packages/i18n` - Internationalization
  - `packages/multimedia` - Media processing
  - `packages/premium` - Premium features  
  - `packages/public-profiles` - Public profiles
  - `packages/recommendations` - AI recommendations
  - `packages/admin` - Admin dashboard
  - `packages/analytics` - Analytics tracking
  - `packages/cv-processing` - CV generation

### CVPlus-Optimized Detection
- **Firebase Functions**: Identifies duplicate cloud function patterns
- **React Components**: Finds similar UI component implementations  
- **TypeScript Types**: Detects redundant type definitions
- **Configuration Files**: Consolidates repeated config patterns
- **Test Files**: Identifies duplicate test utilities and mocks

### Integration Points
- **Firebase Deployment**: Safe for production deployment cycles
- **CI/CD Pipeline**: Integrates with existing build processes
- **Git Submodules**: Respects module boundaries and dependencies
- **NPM Workspaces**: Maintains workspace configuration integrity

## CVPlus Workflow

### Pre-Analysis
1. Ensure all submodules are up to date
2. Run `git submodule update --recursive`
3. Verify clean working directory

### Analysis Results
Expected findings for CVPlus:
- **Duplicate Blocks**: 10-20 (utility functions, config patterns)
- **DRY Violations**: 15-25 (API endpoints, constants)
- **Similar Functions**: 5-15 (processing functions, validators)
- **Misplaced Code**: 5-10 (root files belonging in modules)

### Post-Analysis Actions
1. Review extraction suggestions for core utilities
2. Validate module boundary recommendations
3. Ensure Firebase function optimizations maintain cloud limits
4. Test across all environments (dev, staging, prod)

## CVPlus-Specific Safety
- **Production Functions**: Never modifies deployed Firebase functions without validation
- **Submodule History**: Preserves git history across all modules
- **Dependency Management**: Maintains npm workspace dependencies
- **Environment Configs**: Protects Firebase config and secrets

## Common CVPlus Patterns

### Expected Duplications
1. **Error Handling**: Similar try/catch patterns across modules
2. **Firebase Calls**: Repeated Firestore query patterns
3. **Type Guards**: Similar validation functions
4. **Constants**: API endpoints, error messages, feature flags

### Recommended Actions
1. **Extract to Core**: Common utilities and types
2. **Shared Services**: Firebase abstractions and API clients  
3. **Standard Configs**: ESLint, TypeScript, build configurations
4. **Test Utilities**: Shared mocks and test helpers

## Example CVPlus Results

```
╔══════════════════════════════════════════════════════════════════╗
║                    KILLDUPS ANALYSIS SUMMARY                    ║
╠══════════════════════════════════════════════════════════════════╣
║ Files Scanned:        2,316                                     ║
║ Duplicate Blocks:     18                                        ║ 
║ Similar Functions:    12                                        ║
║ DRY Violations:       23                                        ║
║ Misplaced Files:      8                                         ║
╚══════════════════════════════════════════════════════════════════╝

Next Steps:
→ Extract 5 utility functions to packages/core
→ Create 8 shared constants in core module  
→ Move 3 files from root to appropriate modules
→ Consolidate 4 similar validation functions
```

## Implementation

Executes: `./scripts/utilities/killdups.sh` from CVPlus root directory

Supporting files:
- `scripts/utilities/killdups-orchestrator.js`
- `scripts/utilities/killdups-subagent-executor.js`
- `docs/utilities/killdups-command-documentation.md`

---
*CVPlus Development Team - Modular Architecture Excellence*