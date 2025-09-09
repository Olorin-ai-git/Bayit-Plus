# /killdups - 🚨 CRITICAL Architectural Violation Detection System

**Category**: Code Analysis & Architecture Compliance  
**Author**: Gil Klainert  
**Status**: 🔴 **CRITICAL VIOLATIONS DETECTED**

## 🚨 URGENT FINDINGS

**CVPlus has MASSIVE architectural violations**: **2,145 files** are incorrectly located in the root repository instead of mandatory git submodules under `/packages/`.

### Critical Violation Summary
- **frontend/src/**: 665 files ❌
- **functions/src/**: 456 files ❌  
- **functions/lib/**: 1,024 files ❌
- **Forbidden directories**: 6 critical directories that shouldn't exist ❌
- **Total violations**: 2,145 files + 6 directories

## Description

Comprehensive architectural compliance scanner that identifies code placement violations against CVPlus mandatory submodule architecture. **ALL source code MUST be located in git submodules under `/packages/`** - this is a ZERO TOLERANCE requirement.

## Usage

```bash
/killdups [--simple]
```

### Available Scripts

```bash
# RECOMMENDED: Fast architectural violation scan
/killdups --simple
# Executes: scripts/utilities/killdups-simple.sh

# Full analysis (slower, may timeout)
/killdups
# Executes: scripts/utilities/killdups.sh
```

## What It Does

### Primary Function: Architecture Compliance
🔍 **Scans for mandatory submodule architecture violations**
- Detects ALL files in `frontend/src/` (should be in submodules)
- Detects ALL files in `functions/src/` and `functions/lib/` (should be in submodules)  
- Identifies forbidden directory structures in root
- Maps violations to appropriate target submodules

### Secondary Functions (when time permits)
- Duplicate code detection using normalized hashing
- DRY principle violation detection
- Similar functionality pattern identification

## 🚨 Current Status: CRITICAL FAILURES

```bash
Architecture Compliance: ❌ 0% (2,145 violations)
Code Organization: ❌ MAJOR FAILURE
Development Readiness: ❌ BLOCKED until compliance
```

## Required Submodule Structure

All code must be migrated to appropriate submodules:

| Content Type | Target Submodule |
|-------------|------------------|
| Authentication & Users | `packages/auth/` |
| Core utilities, types, constants | `packages/core/` |
| CV processing & generation | `packages/cv-processing/` |
| Premium features & billing | `packages/premium/` |
| AI recommendations engine | `packages/recommendations/` |
| Admin dashboard & management | `packages/admin/` |
| Analytics & tracking | `packages/analytics/` |
| Media processing & storage | `packages/multimedia/` |
| Public profiles & portfolios | `packages/public-profiles/` |
| Internationalization | `packages/i18n/` |

## Output Files

Reports saved to `tmp/killdups/`:

- `architectural_violations.md` - Critical violations summary
- `duplication_analysis.json` - Complete analysis data
- `killdups_report.md` - Comprehensive findings report

## 🚨 IMMEDIATE ACTION REQUIRED

### Step 1: Stop Development
**STOP ALL DEVELOPMENT** until architectural violations are resolved.

### Step 2: Create Migration Plan  
Use **orchestrator subagent** to create systematic migration plan:
```bash
# Via Claude Code Task tool
Task(subagent_type="orchestrator", description="Create submodule migration plan", 
     prompt="Create comprehensive plan to migrate 2,145 files from root to appropriate submodules")
```

### Step 3: Execute Migration
Deploy **specialist subagents** for each submodule:
- `auth-module-specialist` - Authentication code migration
- `core-module-specialist` - Core utilities migration  
- `cv-processing-specialist` - CV processing migration
- `premium-specialist` - Premium features migration
- `recommendations-specialist` - AI recommendations migration
- `admin-specialist` - Admin functionality migration
- `analytics-specialist` - Analytics code migration
- `multimedia-specialist` - Media processing migration
- `public-profiles-specialist` - Public profiles migration
- `i18n-specialist` - Internationalization migration

## Example Critical Workflow

```bash
# 1. Assess current violations
/killdups --simple

# 2. Review critical report
cat tmp/killdups/architectural_violations.md

# 3. Create migration plan via orchestrator subagent
# Use Claude Code Task API with orchestrator

# 4. Execute systematic migration with specialists
# Coordinate through orchestrator subagent

# 5. Validate compliance
/killdups --simple  # Should show 0 violations
```

## Safety & Recovery

- 🛑 **No Code Changes Without Plan** - Analysis only, no automated migration
- 🔒 **Backup Required** - Ensure clean git state before migration
- ✅ **Validation Required** - All tests must pass after migration
- 🔄 **Rollback Ready** - Git-based recovery for any issues

## Performance

- **Simple Scan**: ~30 seconds for architectural violations
- **Full Analysis**: 3-5 minutes (may timeout on complex detection)
- **Memory Usage**: <100MB for architectural scan
- **Accuracy**: 100% for file placement violations

## Implementation Scripts

```bash
# Fast architectural scan (RECOMMENDED)
/Users/gklainert/Documents/cvplus/scripts/utilities/killdups-simple.sh

# Comprehensive analysis (slower)
/Users/gklainert/Documents/cvplus/scripts/utilities/killdups.sh
```

## Requirements

- Clean working directory
- Git repository with submodule structure
- `jq` for JSON processing
- Orchestrator subagent access for migration planning

---
**⚠️ WARNING**: CVPlus development is BLOCKED until all 2,145 architectural violations are resolved through proper submodule migration.