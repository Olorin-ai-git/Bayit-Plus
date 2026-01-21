#!/bin/bash

# CVPlus Architectural Violation Detection (Fast Version)
# Focus only on architectural compliance - skip duplicate detection for speed
# Author: Gil Klainert
# Generated: 2025-08-28

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TEMP_DIR="$PROJECT_ROOT/tmp/killdups"
ANALYSIS_FILE="$TEMP_DIR/duplication_analysis.json"
REPORT_FILE="$TEMP_DIR/killdups_report.md"

# Ensure temp directory exists
mkdir -p "$TEMP_DIR"

echo -e "${RED}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${RED}║              🚨 ARCHITECTURAL VIOLATION DETECTOR 🚨              ║${NC}"
echo -e "${RED}║                   Fast Compliance Analysis                       ║${NC}"
echo -e "${RED}╚══════════════════════════════════════════════════════════════════╝${NC}"

# Initialize analysis results
cat > "$ANALYSIS_FILE" <<EOF
{
  "analysis_timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "project_root": "$PROJECT_ROOT",
  "duplicate_code_blocks": [],
  "similar_functionality": [],
  "dry_violations": [],
  "misplaced_code": [],
  "recommendations": [],
  "stats": {
    "total_files_scanned": 0,
    "duplicate_blocks_found": 0,
    "similar_functions_found": 0,
    "dry_violations_found": 0,
    "misplaced_files_found": 0
  }
}
EOF

# Helper function to add finding to analysis
add_finding() {
    local category=$1
    local finding_json=$2
    jq --arg category "$category" --argjson finding "$finding_json" '.[$category] += [$finding]' "$ANALYSIS_FILE" > "$TEMP_DIR/temp.json" && mv "$TEMP_DIR/temp.json" "$ANALYSIS_FILE"
}

echo -e "${YELLOW}[FAST SCAN]${NC} Detecting CRITICAL architectural violations..."

MISPLACED_COUNT=0

# MANDATORY CVPlus Architecture: ALL CODE MUST BE IN SUBMODULES UNDER /packages/
echo -e "${RED}🚨 SCANNING FOR ARCHITECTURAL VIOLATIONS 🚨${NC}"

# Define file patterns to include
INCLUDE_PATTERNS=("*.ts" "*.tsx" "*.js" "*.jsx" "*.vue" "*.py")

# Define root directories that violate architecture
ROOT_CODE_DIRS=(
    "frontend/src"
    "functions/src" 
    "functions/lib"
)

# Define submodule mapping 
declare -A SUBMODULE_MAPPING
SUBMODULE_MAPPING["auth"]="auth|login|signin|signup|token|session|permission|user|credential|Auth|User|Session"
SUBMODULE_MAPPING["core"]="constant|util|helper|type|interface|enum|common|types/|utils/|config/|Core|Utils|Types|Constants"
SUBMODULE_MAPPING["i18n"]="translation|locale|language|i18n|intl|Translation|Language|Locale"
SUBMODULE_MAPPING["multimedia"]="media|audio|video|image|upload|storage|cdn|Media|Video|Audio|Image|Upload"
SUBMODULE_MAPPING["premium"]="premium|subscription|billing|payment|stripe|paypal|Premium|Subscription|Payment|Billing"
SUBMODULE_MAPPING["public-profiles"]="profile|portfolio|public|share|networking|Profile|Portfolio|Public"
SUBMODULE_MAPPING["recommendations"]="recommend|suggest|ai|ml|llm|claude|analysis|Recommend|Analysis|AI"
SUBMODULE_MAPPING["admin"]="admin|dashboard|manage|control|monitor|stats|Admin|Dashboard|Manage"
SUBMODULE_MAPPING["analytics"]="analytic|metric|track|event|report|insight|Analytics|Metric|Track"
SUBMODULE_MAPPING["cv-processing"]="cv|resume|pdf|document|process|parse|generate|CV|Resume|Document|Process"

# Fast file discovery for root violations
for root_dir in "${ROOT_CODE_DIRS[@]}"; do
    if [[ -d "$PROJECT_ROOT/$root_dir" ]]; then
        echo -e "${BLUE}→ Scanning $root_dir for violations...${NC}"
        
        for pattern in "${INCLUDE_PATTERNS[@]}"; do
            while IFS= read -r -d $'\0' file; do
                # This file violates architecture - it's in root instead of submodule
                MISPLACED_COUNT=$((MISPLACED_COUNT + 1))
                
                # Determine suggested submodule
                suggested_module="core"  # Default
                confidence="medium"
                file_path_lower=$(echo "$file" | tr '[:upper:]' '[:lower:]')
                
                highest_score=0
                for module in "${!SUBMODULE_MAPPING[@]}"; do
                    indicators="${SUBMODULE_MAPPING[$module]}"
                    score=0
                    
                    # Score based on file path
                    if echo "$file_path_lower" | grep -qE "($indicators)"; then
                        score=$((score + 5))
                    fi
                    
                    # Quick content check (first 20 lines for speed)
                    if [[ -f "$file" ]]; then
                        content_matches=$(head -20 "$file" 2>/dev/null | tr '[:upper:]' '[:lower:]' | grep -cE "($indicators)" 2>/dev/null || echo "0")
                        score=$((score + content_matches))
                    fi
                    
                    if [[ $score -gt $highest_score ]]; then
                        highest_score=$score
                        suggested_module="$module"
                        if [[ $score -gt 3 ]]; then
                            confidence="high"
                        elif [[ $score -gt 1 ]]; then
                            confidence="medium"
                        else
                            confidence="low"
                        fi
                    fi
                done
                
                # Create violation finding
                misplaced_finding=$(jq -n \
                    --arg file "$file" \
                    --arg module "$suggested_module" \
                    --arg confidence "$confidence" \
                    --arg score "$highest_score" \
                    '{
                        type: "critical_architectural_violation",
                        violation_type: "code_in_root_repository", 
                        file: $file,
                        suggested_module: $module,
                        confidence: $confidence,
                        analysis_score: ($score | tonumber),
                        severity: "critical",
                        description: "CRITICAL: Code exists in root repository instead of mandatory git submodules under /packages/",
                        required_action: "IMMEDIATE: Move to appropriate submodule under /packages/",
                        compliance_status: "VIOLATION"
                    }')
                
                add_finding "misplaced_code" "$misplaced_finding"
                
                if [[ $((MISPLACED_COUNT % 50)) -eq 0 ]]; then
                    echo -e "${RED}✗ Found $MISPLACED_COUNT violations so far...${NC}"
                fi
                
            done < <(find "$PROJECT_ROOT/$root_dir" -name "$pattern" -type f -print0 2>/dev/null)
        done
    fi
done

# Check for forbidden directories
FORBIDDEN_DIRS=(
    "$PROJECT_ROOT/frontend/src/components"
    "$PROJECT_ROOT/frontend/src/services" 
    "$PROJECT_ROOT/frontend/src/hooks"
    "$PROJECT_ROOT/frontend/src/utils"
    "$PROJECT_ROOT/functions/src/functions"
    "$PROJECT_ROOT/functions/src/services"
    "$PROJECT_ROOT/functions/lib/functions"
    "$PROJECT_ROOT/functions/lib/services"
)

for dir in "${FORBIDDEN_DIRS[@]}"; do
    if [[ -d "$dir" ]]; then
        MISPLACED_COUNT=$((MISPLACED_COUNT + 10))  # Heavy penalty for entire directories
        
        dir_violation=$(jq -n \
            --arg dir "$dir" \
            '{
                type: "critical_architectural_violation",
                violation_type: "forbidden_directory_in_root",
                directory: $dir,
                severity: "critical", 
                description: "CRITICAL: Entire directory structure exists in root - violates mandatory submodule architecture",
                required_action: "IMMEDIATE: Migrate entire directory to appropriate submodule",
                compliance_status: "MAJOR_VIOLATION"
            }')
        
        add_finding "misplaced_code" "$dir_violation"
        
        echo -e "${RED}✗ MAJOR VIOLATION: Directory $(basename "$dir") should not exist in root${NC}"
    fi
done

# Update stats
jq --arg count "$MISPLACED_COUNT" '.stats.misplaced_files_found = ($count | tonumber)' "$ANALYSIS_FILE" > "$TEMP_DIR/temp.json" && mv "$TEMP_DIR/temp.json" "$ANALYSIS_FILE"

# Generate critical violations report
cat > "$REPORT_FILE" <<EOF
# 🚨 CVPlus CRITICAL Architectural Violation Report 🚨

**Generated**: $(date -u +"%Y-%m-%d %H:%M:%S UTC")  
**Author**: Gil Klainert  
**Tool**: /killdups - Fast Architectural Compliance Scanner
**Status**: 🔴 **CRITICAL VIOLATIONS DETECTED** 

## 🚨 URGENT: CRITICAL ARCHITECTURAL VIOLATIONS FOUND 🚨

**MANDATORY CVPlus ARCHITECTURE VIOLATION**: This codebase has **$MISPLACED_COUNT** files in the root repository that **MUST** be located in git submodules under \`/packages/\`.

### ⚠️ Analysis Statistics
- **🔴 CRITICAL VIOLATIONS - Files in Root**: $MISPLACED_COUNT
- **Architecture Compliance**: ❌ **MAJOR FAILURE**

### 🚨 SEVERITY ASSESSMENT: CRITICAL

**COMPLIANCE STATUS**: ❌ **MAJOR NON-COMPLIANCE**
- **Architecture Requirement**: ALL source code MUST be in git submodules under \`/packages/\`
- **Current Status**: $MISPLACED_COUNT source files in root repository
- **Required Action**: IMMEDIATE migration to appropriate submodules

## 🔴 CRITICAL FINDINGS - IMMEDIATE ACTION REQUIRED

### 1. 🚨 CRITICAL ARCHITECTURAL VIOLATIONS

**ZERO TOLERANCE VIOLATIONS** - The following code MUST be moved to submodules immediately:

EOF

# Group violations by suggested module for better organization
for module in "auth" "core" "i18n" "multimedia" "premium" "public-profiles" "recommendations" "admin" "analytics" "cv-processing"; do
    violations_count=$(jq -r --arg module "$module" '.misplaced_code[] | select(.suggested_module == $module) | .file' "$ANALYSIS_FILE" 2>/dev/null | wc -l || echo "0")
    
    if [[ $violations_count -gt 0 ]]; then
        echo "#### 📦 **packages/$module/** Violations ($violations_count files):" >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
        
        # Show first 10 violations for this module
        jq -r --arg module "$module" '.misplaced_code[] | select(.suggested_module == $module) | "- **" + (.file | split("/") | last) + "** → `packages/" + .suggested_module + "/`\n  📁 **Full Path**: " + .file + "\n  🎯 **Confidence**: " + .confidence + " (" + (.analysis_score | tostring) + " points)\n  ⚠️  **Status**: " + .compliance_status' "$ANALYSIS_FILE" 2>/dev/null | head -30 >> "$REPORT_FILE"
        
        if [[ $violations_count -gt 10 ]]; then
            echo "  ... and $((violations_count - 10)) more files" >> "$REPORT_FILE"
        fi
        echo "" >> "$REPORT_FILE"
    fi
done

cat >> "$REPORT_FILE" <<EOF

### 2. Directory Structure Violations

EOF

jq -r '.misplaced_code[] | select(.violation_type == "forbidden_directory_in_root") | "- 🚫 **FORBIDDEN DIRECTORY**: " + (.directory | split("/") | last) + "\n  📁 **Full Path**: " + .directory + "\n  ⚠️ **Action Required**: Migrate entire directory to appropriate submodule\n  🔴 **Status**: " + .compliance_status' "$ANALYSIS_FILE" >> "$REPORT_FILE" 2>/dev/null || echo "No forbidden directories found." >> "$REPORT_FILE"

cat >> "$REPORT_FILE" <<EOF

## 🚨 IMMEDIATE ACTION PLAN - CRITICAL VIOLATIONS

### ⚠️  PRIORITY 1: ARCHITECTURAL COMPLIANCE (CRITICAL)

**IMMEDIATE ACTIONS REQUIRED:**

1. **🚨 STOP ALL DEVELOPMENT** until architectural violations are resolved
2. **📋 CREATE MIGRATION PLAN** using orchestrator subagent for systematic code migration
3. **🔧 EXECUTE MIGRATION** using specialized submodule subagents

### 🔧 AUTOMATED REMEDIATION AVAILABLE

To proceed with **AUTOMATED ARCHITECTURAL COMPLIANCE**:

\`\`\`bash
# Use orchestrator subagent via Claude Code Task tool for systematic migration
# The orchestrator will coordinate specialist subagents for each module migration
\`\`\`

## ⚠️  RISK ASSESSMENT

**Current Risk Level**: 🔴 **CRITICAL**
- **Compliance**: Major architectural violation ($MISPLACED_COUNT files)
- **Maintainability**: Severely compromised by scattered code
- **Development Velocity**: Blocked until compliance achieved

## 📊 COMPLIANCE SCORECARD

- ❌ **Architecture Compliance**: 0% (Critical Failure - $MISPLACED_COUNT violations)

**Overall Compliance**: 🔴 **CRITICAL FAILURE** - Requires immediate remediation

---
*Generated by CVPlus KILLDUPS v2.0 - Fast Architectural Compliance Scanner*
*🚨 $MISPLACED_COUNT CRITICAL VIOLATIONS DETECTED - IMMEDIATE ACTION REQUIRED 🚨*
EOF

# Display critical summary
echo -e "\n${RED}╔════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${RED}║                    🚨 CRITICAL VIOLATIONS DETECTED 🚨               ║${NC}"
echo -e "${RED}╠════════════════════════════════════════════════════════════════════╣${NC}"
echo -e "${RED}║${NC} 🔴 CRITICAL VIOLATIONS:   ${RED}$MISPLACED_COUNT${NC} ${RED}files in root (MUST move to submodules)${NC}"
echo -e "${RED}╠════════════════════════════════════════════════════════════════════╣${NC}"
echo -e "${RED}║${NC} STATUS: ${RED}CRITICAL ARCHITECTURAL VIOLATIONS${NC} - Immediate action required"
echo -e "${RED}╚════════════════════════════════════════════════════════════════════╝${NC}"

echo -e "\n${RED}🚨 URGENT: $MISPLACED_COUNT files violate mandatory submodule architecture!${NC}"
echo -e "${RED}→ ALL code must be in git submodules under /packages/${NC}"
echo -e "${RED}→ Use orchestrator subagent for systematic migration${NC}"

echo -e "\n${GREEN}✓${NC} FAST architectural analysis completed!"
echo -e "${BLUE}→${NC} Analysis data: $ANALYSIS_FILE"
echo -e "${BLUE}→${NC} Critical report: $REPORT_FILE"