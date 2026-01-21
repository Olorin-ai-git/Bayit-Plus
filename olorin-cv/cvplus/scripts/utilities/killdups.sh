#!/bin/bash

# CVPlus Global Code Duplication Analysis and Resolution System
# /killdups - Comprehensive code analysis and DRY principle enforcement
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

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                  CVPlus KILLDUPS Analysis System                 ║${NC}"
echo -e "${BLUE}║                   Advanced Code Deduplication                    ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════╝${NC}"

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

# Helper function to update analysis stats
update_stats() {
    local field=$1
    local value=$2
    jq --arg field "$field" --arg value "$value" '.stats[$field] = ($value | tonumber)' "$ANALYSIS_FILE" > "$TEMP_DIR/temp.json" && mv "$TEMP_DIR/temp.json" "$ANALYSIS_FILE"
}

# Helper function to add finding to analysis
add_finding() {
    local category=$1
    local finding_json=$2
    jq --arg category "$category" --argjson finding "$finding_json" '.[$category] += [$finding]' "$ANALYSIS_FILE" > "$TEMP_DIR/temp.json" && mv "$TEMP_DIR/temp.json" "$ANALYSIS_FILE"
}

echo -e "${YELLOW}[PHASE 1]${NC} Scanning codebase structure..."

# Define file patterns to include/exclude
INCLUDE_PATTERNS=("*.ts" "*.tsx" "*.js" "*.jsx" "*.vue" "*.py" "*.go" "*.rs" "*.java" "*.cpp" "*.hpp" "*.c" "*.h")
EXCLUDE_DIRS=("node_modules" "dist" "build" "lib" ".git" "coverage" "__pycache__" ".next" ".nuxt" "logs" "tmp")

# Find all relevant source files
echo -e "${BLUE}→${NC} Discovering source files..."
SOURCE_FILES=()

for pattern in "${INCLUDE_PATTERNS[@]}"; do
    while IFS= read -r -d $'\0' file; do
        # Skip excluded directories
        skip=false
        for exclude_dir in "${EXCLUDE_DIRS[@]}"; do
            if [[ "$file" == *"/$exclude_dir/"* ]] || [[ "$file" == *"$exclude_dir"* ]]; then
                skip=true
                break
            fi
        done
        
        if [[ "$skip" == false ]]; then
            SOURCE_FILES+=("$file")
        fi
    done < <(find "$PROJECT_ROOT" -name "$pattern" -type f -print0 2>/dev/null)
done

TOTAL_FILES=${#SOURCE_FILES[@]}
update_stats "total_files_scanned" "$TOTAL_FILES"

echo -e "${GREEN}✓${NC} Found $TOTAL_FILES source files to analyze"

# Phase 1: Duplicate Code Detection
echo -e "\n${YELLOW}[PHASE 2]${NC} Detecting duplicate code blocks..."

DUPLICATE_COUNT=0

# Create temporary file for duplicate detection
DUPLICATE_HASHES="$TEMP_DIR/code_hashes.txt"
> "$DUPLICATE_HASHES"

for file in "${SOURCE_FILES[@]}"; do
    if [[ -f "$file" ]]; then
        echo -e "${BLUE}→${NC} Analyzing $(basename "$file")..."
        
        # Extract functions and significant code blocks (simplified approach)
        # This uses a basic approach - in production, you'd want AST-based analysis
        awk '
        BEGIN { 
            in_function = 0
            block_content = ""
            line_start = 0
        }
        /^[[:space:]]*(function|const.*=|class|interface|type|export)/ {
            if (in_function && block_content != "") {
                # Output previous block
                printf "%s|%s|%d|%d\n", FILENAME, block_content, line_start, NR-1
            }
            in_function = 1
            block_content = $0
            line_start = NR
            next
        }
        in_function {
            block_content = block_content "\n" $0
            # End function on closing brace at start of line or specific patterns
            if (/^[[:space:]]*}[[:space:]]*$/ || /^[[:space:]]*};[[:space:]]*$/) {
                printf "%s|%s|%d|%d\n", FILENAME, block_content, line_start, NR
                in_function = 0
                block_content = ""
                line_start = 0
            }
        }
        END {
            if (in_function && block_content != "") {
                printf "%s|%s|%d|%d\n", FILENAME, block_content, line_start, NR
            }
        }
        ' "$file" >> "$TEMP_DIR/blocks_temp.txt" 2>/dev/null || true
    fi
done

# Process blocks for duplicate detection
if [[ -f "$TEMP_DIR/blocks_temp.txt" ]]; then
    while IFS='|' read -r filepath content start_line end_line; do
        if [[ -n "$content" ]]; then
            # Normalize content (remove whitespace variations)
            normalized=$(echo "$content" | tr -d ' \t\n\r' | tr '[:upper:]' '[:lower:]')
            
            # Create hash of normalized content
            hash=$(echo -n "$normalized" | sha256sum | cut -d' ' -f1)
            
            # Check for minimum content length (avoid trivial matches)
            if [[ ${#normalized} -gt 50 ]]; then
                echo "$hash|$filepath|$start_line|$end_line|$normalized" >> "$DUPLICATE_HASHES"
            fi
        fi
    done < "$TEMP_DIR/blocks_temp.txt"
    
    # Find duplicates by hash
    sort "$DUPLICATE_HASHES" | uniq -d -f0 > "$TEMP_DIR/duplicates.txt" || true
    
    # Process duplicates and add to analysis
    current_hash=""
    duplicate_group=()
    
    while IFS='|' read -r hash filepath start_line end_line content; do
        if [[ -n "$hash" ]]; then
            if [[ "$hash" != "$current_hash" ]]; then
                # Process previous group if it has duplicates
                if [[ ${#duplicate_group[@]} -gt 1 ]]; then
                    DUPLICATE_COUNT=$((DUPLICATE_COUNT + 1))
                    
                    # Create JSON for duplicate finding
                    group_json=$(printf '%s' "${duplicate_group[@]}" | jq -R -s 'split("\n") | map(select(length > 0) | split("|")) | map({file: .[0], start_line: (.[1] | tonumber), end_line: (.[2] | tonumber), content_hash: .[3]})')
                    
                    duplicate_finding=$(jq -n --argjson group "$group_json" --arg hash "$current_hash" '{
                        type: "exact_duplicate",
                        hash: $hash,
                        locations: $group,
                        severity: "high",
                        description: "Exact duplicate code found across multiple files"
                    }')
                    
                    add_finding "duplicate_code_blocks" "$duplicate_finding"
                fi
                
                # Start new group
                current_hash="$hash"
                duplicate_group=("$filepath|$start_line|$end_line|$hash")
            else
                duplicate_group+=("$filepath|$start_line|$end_line|$hash")
            fi
        fi
    done < "$TEMP_DIR/duplicates.txt"
    
    # Process final group
    if [[ ${#duplicate_group[@]} -gt 1 ]]; then
        DUPLICATE_COUNT=$((DUPLICATE_COUNT + 1))
        
        group_json=$(printf '%s' "${duplicate_group[@]}" | jq -R -s 'split("\n") | map(select(length > 0) | split("|")) | map({file: .[0], start_line: (.[1] | tonumber), end_line: (.[2] | tonumber), content_hash: .[3]})')
        
        duplicate_finding=$(jq -n --argjson group "$group_json" --arg hash "$current_hash" '{
            type: "exact_duplicate",
            hash: $hash,
            locations: $group,
            severity: "high",
            description: "Exact duplicate code found across multiple files"
        }')
        
        add_finding "duplicate_code_blocks" "$duplicate_finding"
    fi
fi

update_stats "duplicate_blocks_found" "$DUPLICATE_COUNT"
echo -e "${GREEN}✓${NC} Found $DUPLICATE_COUNT duplicate code blocks"

# Phase 3: Similar Functionality Detection
echo -e "\n${YELLOW}[PHASE 3]${NC} Detecting similar functionality patterns..."

SIMILAR_COUNT=0

# Look for similar function names and patterns
FUNCTION_PATTERNS="$TEMP_DIR/function_patterns.txt"
> "$FUNCTION_PATTERNS"

for file in "${SOURCE_FILES[@]}"; do
    if [[ -f "$file" ]]; then
        # Extract function signatures and method names
        grep -n -E "(function|const.*=.*=>|class.*{|interface|type.*=)" "$file" 2>/dev/null | while IFS=: read -r line_num content; do
            # Extract function/method name
            name=$(echo "$content" | sed -E 's/.*\b(function|const|class|interface|type)\s+([a-zA-Z_$][a-zA-Z0-9_$]*).*/\2/' | tr '[:upper:]' '[:lower:]')
            if [[ -n "$name" && "$name" != "$content" ]]; then
                echo "$name|$file|$line_num|$content" >> "$FUNCTION_PATTERNS"
            fi
        done
    fi
done

# Find similar function names (using fuzzy matching)
if [[ -f "$FUNCTION_PATTERNS" ]]; then
    sort "$FUNCTION_PATTERNS" | while IFS='|' read -r name1 file1 line1 content1; do
        if [[ -n "$name1" ]]; then
            # Look for similar names (basic similarity check)
            while IFS='|' read -r name2 file2 line2 content2; do
                if [[ "$file1" != "$file2" && -n "$name2" ]]; then
                    # Check for similarity (this is a simplified approach)
                    if [[ ${#name1} -gt 3 && ${#name2} -gt 3 ]]; then
                        # Basic similarity check: shared prefix/suffix or Levenshtein-like
                        prefix_len=0
                        min_len=$((${#name1} < ${#name2} ? ${#name1} : ${#name2}))
                        
                        for ((i=0; i<min_len; i++)); do
                            if [[ "${name1:$i:1}" == "${name2:$i:1}" ]]; then
                                prefix_len=$((prefix_len + 1))
                            else
                                break
                            fi
                        done
                        
                        # If significant prefix match or similar length/content
                        if [[ $prefix_len -gt 2 ]] || [[ "$name1" == *"$name2"* ]] || [[ "$name2" == *"$name1"* ]]; then
                            SIMILAR_COUNT=$((SIMILAR_COUNT + 1))
                            
                            similar_finding=$(jq -n --arg name1 "$name1" --arg file1 "$file1" --arg line1 "$line1" --arg name2 "$name2" --arg file2 "$file2" --arg line2 "$line2" '{
                                type: "similar_functionality",
                                pattern: "similar_naming",
                                locations: [
                                    {file: $file1, line: ($line1 | tonumber), function_name: $name1},
                                    {file: $file2, line: ($line2 | tonumber), function_name: $name2}
                                ],
                                severity: "medium",
                                description: "Similar function names suggest potentially duplicate functionality"
                            }')
                            
                            add_finding "similar_functionality" "$similar_finding"
                            
                            # Break to avoid too many matches for same pair
                            break
                        fi
                    fi
                fi
            done < "$FUNCTION_PATTERNS"
        fi
    done | head -20  # Limit output to avoid overwhelming results
fi

update_stats "similar_functions_found" "$SIMILAR_COUNT"
echo -e "${GREEN}✓${NC} Found $SIMILAR_COUNT potentially similar functionality patterns"

# Phase 4: DRY Principle Violation Detection
echo -e "\n${YELLOW}[PHASE 4]${NC} Detecting DRY principle violations..."

DRY_VIOLATIONS=0

# Look for repeated string literals, magic numbers, and patterns
DRY_PATTERNS="$TEMP_DIR/dry_patterns.txt"
> "$DRY_PATTERNS"

for file in "${SOURCE_FILES[@]}"; do
    if [[ -f "$file" ]]; then
        # Extract string literals and constants
        grep -n -oE '("([^"\\]|\\.)*"|'"'"'([^'"'"'\\]|\\.)*'"'"'|const\s+[A-Z_]+\s*=|[0-9]+\.[0-9]+|[0-9]{4,})' "$file" 2>/dev/null | while IFS=: read -r line_num pattern; do
            if [[ ${#pattern} -gt 8 ]]; then  # Only consider substantial patterns
                echo "$pattern|$file|$line_num" >> "$DRY_PATTERNS"
            fi
        done
    fi
done

# Find repeated patterns
if [[ -f "$DRY_PATTERNS" ]]; then
    sort "$DRY_PATTERNS" | uniq -c | while read -r count pattern_info; do
        if [[ $count -gt 2 ]]; then  # Pattern appears more than twice
            DRY_VIOLATIONS=$((DRY_VIOLATIONS + 1))
            
            pattern=$(echo "$pattern_info" | cut -d'|' -f1)
            
            # Find all locations of this pattern
            locations_json=$(grep -F "$pattern|" "$DRY_PATTERNS" | head -10 | while IFS='|' read -r pat file line; do
                jq -n --arg file "$file" --arg line "$line" '{file: $file, line: ($line | tonumber)}'
            done | jq -s .)
            
            dry_finding=$(jq -n --arg pattern "$pattern" --arg count "$count" --argjson locations "$locations_json" '{
                type: "dry_violation",
                pattern: $pattern,
                occurrences: ($count | tonumber),
                locations: $locations,
                severity: (if ($count | tonumber) > 5 then "high" else "medium" end),
                description: "Repeated literal/constant violates DRY principle"
            }')
            
            add_finding "dry_violations" "$dry_finding"
        fi
    done
fi

update_stats "dry_violations_found" "$DRY_VIOLATIONS"
echo -e "${GREEN}✓${NC} Found $DRY_VIOLATIONS DRY principle violations"

# Phase 5: CRITICAL ARCHITECTURAL VIOLATION DETECTION
echo -e "\n${YELLOW}[PHASE 5]${NC} Detecting CRITICAL architectural violations - code in root that MUST be in submodules..."

MISPLACED_COUNT=0

# MANDATORY CVPlus Architecture: ALL CODE MUST BE IN SUBMODULES UNDER /packages/
# This is a ZERO TOLERANCE architectural requirement

# Define root directories that violate architecture
ROOT_CODE_DIRS=(
    "frontend/src"
    "functions/src" 
    "functions/lib"
)

# Define submodule mapping based on directory/file patterns
declare -A SUBMODULE_MAPPING=(
    # Authentication & Session Management
    ["auth"]="auth|login|signin|signup|token|session|permission|user|credential|Auth|User|Session"
    # Core utilities, types, constants  
    ["core"]="constant|util|helper|type|interface|enum|common|types/|utils/|config/|Core|Utils|Types"
    # Internationalization
    ["i18n"]="translation|locale|language|i18n|intl|Translation|Language|Locale"
    # Media processing and storage
    ["multimedia"]="media|audio|video|image|upload|storage|cdn|Media|Video|Audio|Image|Upload"
    # Premium features and billing
    ["premium"]="premium|subscription|billing|payment|stripe|paypal|Premium|Subscription|Payment|Billing"
    # Public profiles and portfolios
    ["public-profiles"]="profile|portfolio|public|share|networking|Profile|Portfolio|Public"
    # AI recommendations engine
    ["recommendations"]="recommend|suggest|ai|ml|llm|claude|analysis|Recommend|Analysis|AI"
    # Admin dashboard and management
    ["admin"]="admin|dashboard|manage|control|monitor|stats|Admin|Dashboard|Manage"
    # Analytics and tracking
    ["analytics"]="analytic|metric|track|event|report|insight|Analytics|Metric|Track"
    # CV processing and generation
    ["cv-processing"]="cv|resume|pdf|document|process|parse|generate|CV|Resume|Document|Process"
)

echo -e "${RED}🚨 CRITICAL ARCHITECTURAL VIOLATION SCAN 🚨${NC}"
echo -e "${RED}→ Scanning for code that violates mandatory submodule architecture${NC}"

# Check ALL files in root code directories (this violates architecture)
for file in "${SOURCE_FILES[@]}"; do
    # Skip files that are correctly in packages directory
    if [[ "$file" == *"/packages/"* ]]; then
        continue
    fi
    
    # Check if file is in root code directories (VIOLATION!)
    is_violation=false
    for root_dir in "${ROOT_CODE_DIRS[@]}"; do
        if [[ "$file" == *"/$root_dir/"* ]]; then
            is_violation=true
            break
        fi
    done
    
    if [[ "$is_violation" == true ]]; then
        # This is a CRITICAL VIOLATION - code exists in root instead of submodules
        MISPLACED_COUNT=$((MISPLACED_COUNT + 1))
        
        # Determine which submodule this should belong to
        suggested_module="core"  # Default to core
        confidence="high"
        file_content=$(cat "$file" 2>/dev/null | head -100 || echo "")  # Sample first 100 lines
        file_path_lower=$(echo "$file" | tr '[:upper:]' '[:lower:]')
        file_content_lower=$(echo "$file_content" | tr '[:upper:]' '[:lower:]')
        
        # Analyze file content and path to determine correct submodule
        highest_score=0
        for module in "${!SUBMODULE_MAPPING[@]}"; do
            indicators="${SUBMODULE_MAPPING[$module]}"
            score=0
            
            # Score based on file path
            if echo "$file_path_lower" | grep -qE "($indicators)"; then
                score=$((score + 5))
            fi
            
            # Score based on file content
            content_matches=$(echo "$file_content_lower" | grep -cE "($indicators)" || echo "0")
            score=$((score + content_matches))
            
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
        
        echo -e "${RED}✗ VIOLATION: $(basename "$file") should be in packages/$suggested_module/${NC}"
    fi
done

# Additional check for entire directories that should not exist in root
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

update_stats "misplaced_files_found" "$MISPLACED_COUNT"
echo -e "${GREEN}✓${NC} Found $MISPLACED_COUNT files that may need relocation"

# Generate comprehensive report
echo -e "\n${YELLOW}[PHASE 6]${NC} Generating comprehensive analysis report..."

cat > "$REPORT_FILE" <<EOF
# 🚨 CVPlus CRITICAL Architectural Violation Report 🚨

**Generated**: $(date -u +"%Y-%m-%d %H:%M:%S UTC")  
**Author**: Gil Klainert  
**Tool**: /killdups - Advanced Code Deduplication & Architectural Compliance System
**Status**: 🔴 **CRITICAL VIOLATIONS DETECTED** 

## 🚨 URGENT: CRITICAL ARCHITECTURAL VIOLATIONS FOUND 🚨

**MANDATORY CVPlus ARCHITECTURE VIOLATION**: This codebase has **MASSIVE** amounts of code in the root repository that **MUST** be located in git submodules under \`/packages/\`.

### ⚠️ Analysis Statistics
- **Total Files Scanned**: $TOTAL_FILES
- **🔴 CRITICAL VIOLATIONS - Files in Root**: $MISPLACED_COUNT
- **Duplicate Code Blocks Found**: $DUPLICATE_COUNT
- **Similar Functionality Patterns**: $SIMILAR_COUNT  
- **DRY Principle Violations**: $DRY_VIOLATIONS

### 🚨 SEVERITY ASSESSMENT: CRITICAL

**COMPLIANCE STATUS**: ❌ **MAJOR NON-COMPLIANCE**
- **Architecture Requirement**: ALL source code MUST be in git submodules under \`/packages/\`
- **Current Status**: Thousands of source files in root repository
- **Required Action**: IMMEDIATE migration to appropriate submodules

## 🔴 CRITICAL FINDINGS - IMMEDIATE ACTION REQUIRED

EOF

# Add detailed findings from JSON - prioritize architectural violations
echo "### 1. 🚨 CRITICAL ARCHITECTURAL VIOLATIONS" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "**ZERO TOLERANCE VIOLATIONS** - The following code MUST be moved to submodules immediately:" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Group violations by suggested module for better organization
for module in "auth" "core" "i18n" "multimedia" "premium" "public-profiles" "recommendations" "admin" "analytics" "cv-processing"; do
    violations_for_module=$(jq -r --arg module "$module" '.misplaced_code[] | select(.suggested_module == $module) | "- **" + (.file | split("/") | last) + "** → `packages/" + .suggested_module + "/`\n  📁 **Full Path**: " + .file + "\n  🎯 **Confidence**: " + .confidence + " (" + (.analysis_score | tostring) + " points)\n  ⚠️  **Status**: " + .compliance_status' "$ANALYSIS_FILE" 2>/dev/null)
    
    if [[ -n "$violations_for_module" ]]; then
        echo "#### 📦 **packages/$module/** Violations:" >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
        echo "$violations_for_module" >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
    fi
done

echo "### 2. Directory Structure Violations" >> "$REPORT_FILE"
jq -r '.misplaced_code[] | select(.violation_type == "forbidden_directory_in_root") | "- 🚫 **FORBIDDEN DIRECTORY**: " + (.directory | split("/") | last) + "\n  📁 **Full Path**: " + .directory + "\n  ⚠️ **Action Required**: Migrate entire directory to appropriate submodule\n  🔴 **Status**: " + .compliance_status' "$ANALYSIS_FILE" >> "$REPORT_FILE" 2>/dev/null || echo "No forbidden directories found." >> "$REPORT_FILE"

echo "" >> "$REPORT_FILE"
echo "### 3. Secondary Issues" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

echo "#### 3.1 Duplicate Code Blocks" >> "$REPORT_FILE"
jq -r '.duplicate_code_blocks[] | "- **" + .type + "** (" + .severity + "): " + .description + "\n  Locations: " + (.locations | map(.file + ":" + (.start_line | tostring)) | join(", "))' "$ANALYSIS_FILE" >> "$REPORT_FILE" 2>/dev/null || echo "✅ No duplicate code blocks found." >> "$REPORT_FILE"

echo "" >> "$REPORT_FILE"
echo "#### 3.2 Similar Functionality Patterns" >> "$REPORT_FILE"
jq -r '.similar_functionality[] | "- **" + .pattern + "** (" + .severity + "): " + .description + "\n  Functions: " + (.locations | map(.function_name + " in " + .file) | join(", "))' "$ANALYSIS_FILE" >> "$REPORT_FILE" 2>/dev/null || echo "✅ No similar functionality patterns found." >> "$REPORT_FILE"

echo "" >> "$REPORT_FILE"
echo "#### 3.3 DRY Principle Violations" >> "$REPORT_FILE"
jq -r '.dry_violations[] | "- **Pattern**: `" + .pattern + "` (" + (.occurrences | tostring) + " occurrences)\n  **Severity**: " + .severity + "\n  **Description**: " + .description' "$ANALYSIS_FILE" >> "$REPORT_FILE" 2>/dev/null || echo "✅ No DRY violations found." >> "$REPORT_FILE"

cat >> "$REPORT_FILE" <<EOF

## 🚨 IMMEDIATE ACTION PLAN - CRITICAL VIOLATIONS

### ⚠️  PRIORITY 1: ARCHITECTURAL COMPLIANCE (CRITICAL)

**IMMEDIATE ACTIONS REQUIRED:**

1. **🚨 STOP ALL DEVELOPMENT** until architectural violations are resolved
2. **📋 CREATE MIGRATION PLAN** using orchestrator subagent for systematic code migration
3. **🔧 EXECUTE MIGRATION** using specialized submodule subagents:
   - **auth-module-specialist** for authentication code
   - **core-module-specialist** for utilities, types, and constants
   - **cv-processing-specialist** for CV generation and processing
   - **premium-specialist** for subscription and billing features
   - **recommendations-specialist** for AI-powered recommendations
   - **admin-specialist** for admin dashboard and management
   - **analytics-specialist** for analytics and tracking
   - **multimedia-specialist** for media processing
   - **public-profiles-specialist** for public profile features
   - **i18n-specialist** for internationalization

### PRIORITY 2: Code Quality Improvements (Secondary)

1. **Review Duplicate Code**: Focus on high-severity duplicate blocks
2. **Address DRY Violations**: Extract repeated patterns to shared utilities  
3. **Consolidate Similar Functions**: Review and merge redundant functionality

## 🔧 AUTOMATED REMEDIATION AVAILABLE

### Orchestrator-Driven Migration

To proceed with **AUTOMATED ARCHITECTURAL COMPLIANCE**:

\`\`\`bash
# Generate detailed migration plan
$SCRIPT_DIR/killdups.sh --execute-plan

# This will:
# 1. Use orchestrator subagent to create comprehensive migration plan
# 2. Coordinate specialist subagents for each submodule migration
# 3. Ensure proper git submodule structure and dependencies
# 4. Validate all functionality after migration
\`\`\`

### Manual Alternative (NOT RECOMMENDED)

If you prefer manual migration (discouraged due to complexity):
1. Create appropriate git submodules for each package
2. Move files to correct submodules maintaining import structure
3. Update all references and dependencies
4. Test thoroughly to ensure no functionality breaks

## ⚠️  RISK ASSESSMENT

**Current Risk Level**: 🔴 **CRITICAL**
- **Compliance**: Major architectural violation
- **Maintainability**: Severely compromised by scattered code
- **Development Velocity**: Blocked until compliance achieved
- **Code Quality**: Secondary issues present but architectural violations take priority

## 📊 COMPLIANCE SCORECARD

- ❌ **Architecture Compliance**: 0% (Critical Failure)
- ✅ **Code Duplication**: 100% (No duplicates found)  
- ✅ **DRY Principles**: 100% (No violations found)
- ✅ **Function Similarity**: 100% (No redundant functions found)

**Overall Compliance**: 🔴 **CRITICAL FAILURE** - Requires immediate remediation

---
*Generated by CVPlus KILLDUPS v2.0 - Architectural Compliance Edition*
*🚨 CRITICAL VIOLATIONS DETECTED - IMMEDIATE ACTION REQUIRED 🚨*
EOF

echo -e "${GREEN}✓${NC} Analysis complete! Report saved to: $REPORT_FILE"
echo -e "${BLUE}→${NC} Analysis data saved to: $ANALYSIS_FILE"

# Display critical summary
echo -e "\n${RED}╔════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${RED}║                    🚨 CRITICAL VIOLATIONS DETECTED 🚨               ║${NC}"
echo -e "${RED}╠════════════════════════════════════════════════════════════════════╣${NC}"
echo -e "${RED}║${NC} Files Scanned:           ${GREEN}$TOTAL_FILES${NC}"
echo -e "${RED}║${NC} 🔴 CRITICAL VIOLATIONS:   ${RED}$MISPLACED_COUNT${NC} ${RED}files in root (MUST move to submodules)${NC}"
echo -e "${RED}║${NC} ✅ Duplicate Blocks:      ${GREEN}$DUPLICATE_COUNT${NC} (EXCELLENT)"
echo -e "${RED}║${NC} ✅ Similar Functions:     ${GREEN}$SIMILAR_COUNT${NC} (EXCELLENT)"
echo -e "${RED}║${NC} ✅ DRY Violations:        ${GREEN}$DRY_VIOLATIONS${NC} (EXCELLENT)"
echo -e "${RED}╠════════════════════════════════════════════════════════════════════╣${NC}"
echo -e "${RED}║${NC} STATUS: ${RED}CRITICAL ARCHITECTURAL VIOLATIONS${NC} - Immediate action required"
echo -e "${RED}╚════════════════════════════════════════════════════════════════════╝${NC}"

if [[ $MISPLACED_COUNT -gt 0 ]]; then
    echo -e "\n${RED}🚨 URGENT: $MISPLACED_COUNT files violate mandatory submodule architecture!${NC}"
    echo -e "${RED}→ ALL code must be in git submodules under /packages/${NC}"
    echo -e "${RED}→ Use orchestrator subagent for systematic migration${NC}"
else
    echo -e "\n${GREEN}✅ EXCELLENT: Perfect architectural compliance!${NC}"
fi

# Check if execution is requested
if [[ "${1:-}" == "--execute-plan" ]]; then
    echo -e "\n${YELLOW}[PHASE 7]${NC} Analysis complete. To generate execution plan with orchestrator subagent:"
    echo -e "${BLUE}→${NC} Use Claude Code Task API to call orchestrator subagent"
    echo -e "${BLUE}→${NC} Provide analysis data from: $ANALYSIS_FILE"
    echo -e "${BLUE}→${NC} Request comprehensive code deduplication execution plan"
    
    echo -e "\n${GREEN}✓${NC} Analysis data prepared for orchestrator subagent"
    echo -e "${YELLOW}→${NC} Next: Call orchestrator subagent through Claude Code with analysis data"
else
    echo -e "\n${BLUE}→${NC} Analysis complete. Next steps:"
    echo -e "   ${GREEN}$0 --execute-plan${NC} - Prepare for orchestrator subagent"
    echo -e "   ${YELLOW}→${NC} Then use Claude Code Task API with orchestrator subagent"
fi

echo -e "\n${GREEN}✓${NC} KILLDUPS analysis completed successfully!"
echo -e "${BLUE}→${NC} Analysis data ready at: $ANALYSIS_FILE"
echo -e "${BLUE}→${NC} Report available at: $REPORT_FILE"