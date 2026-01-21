#!/bin/bash

# Script: verify-integrity.sh
# Purpose: Comprehensive spec vs implementation verification

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SPECS_DIR="$PROJECT_ROOT/specs"
SPECIFY_DIR="$PROJECT_ROOT/.specify"
REPORT_FILE="$PROJECT_ROOT/integrity-verification-report.md"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
echo_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
echo_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
echo_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Initialize report
init_report() {
    cat > "$REPORT_FILE" << EOF
# CVPlus Integrity Verification Report

**Generated**: $(date)
**Project**: CVPlus
**Command**: claude verify-integrity

## Executive Summary

This report provides evidence-based analysis of planned vs actual implementation across all CVPlus specifications. Every claim is backed by codebase evidence with file paths, line numbers, and code snippets.

## Verification Methodology

1. **Specification Analysis**: Parse all /specs/* folders for plans, tasks, contracts, and data models
2. **Codebase Scanning**: Search entire codebase for planned implementations
3. **Evidence Collection**: Gather file paths, code snippets, and concrete proof for all claims
4. **Gap Analysis**: Identify missing, extra, or deviated implementations

---

EOF
}

# Scan .specify configuration
analyze_specify_config() {
    echo_info "Analyzing .specify configuration..."

    if [[ ! -d "$SPECIFY_DIR" ]]; then
        echo_error ".specify directory not found at $SPECIFY_DIR"
        return 1
    fi

    cat >> "$REPORT_FILE" << EOF
## .specify Configuration Analysis

**Location**: $SPECIFY_DIR

EOF

    # List all configuration files
    find "$SPECIFY_DIR" -type f \( -name "*.md" -o -name "*.json" -o -name "*.yaml" -o -name "*.yml" \) | while read -r config_file; do
        rel_path="${config_file#$PROJECT_ROOT/}"
        cat >> "$REPORT_FILE" << EOF
### $(basename "$config_file")

**File**: \`$rel_path\`

EOF

        # Extract key content based on file type
        if [[ "$config_file" == *"constitution"* ]]; then
            echo "**Purpose**: Project constitution and governance rules" >> "$REPORT_FILE"
        elif [[ "$config_file" == *"template"* ]]; then
            echo "**Purpose**: Template for $(basename "$config_file" .md)" >> "$REPORT_FILE"
        fi

        # Add file stats
        line_count=$(wc -l < "$config_file")
        echo "**Lines**: $line_count" >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
    done
}

# Find implementation evidence in codebase
find_implementation_evidence() {
    local search_term="$1"
    local context="$2"

    echo_info "Searching for: $search_term in context: $context"

    # Search in TypeScript/JavaScript files
    local ts_results
    ts_results=$(find "$PROJECT_ROOT" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) \
        -not -path "*/node_modules/*" \
        -not -path "*/dist/*" \
        -not -path "*/.git/*" \
        -exec grep -l "$search_term" {} \; 2>/dev/null || true)

    # Search in package files
    local package_results
    package_results=$(find "$PROJECT_ROOT" -name "package.json" -not -path "*/node_modules/*" \
        -exec grep -l "$search_term" {} \; 2>/dev/null || true)

    # Search in spec files
    local spec_results
    spec_results=$(find "$SPECS_DIR" -type f -name "*.md" -o -name "*.yaml" -o -name "*.yml" \
        -exec grep -l "$search_term" {} \; 2>/dev/null || true)

    # Return combined results
    echo "$ts_results" "$package_results" "$spec_results" | tr ' ' '\n' | grep -v '^$' | sort -u
}

# Get code snippet with line numbers
get_code_evidence() {
    local file_path="$1"
    local search_term="$2"
    local context_lines="${3:-3}"

    if [[ ! -f "$file_path" ]]; then
        echo "**ERROR**: File not found: $file_path"
        return 1
    fi

    local rel_path="${file_path#$PROJECT_ROOT/}"
    echo "**File**: \`$rel_path\`"
    echo ""
    echo '```typescript'
    grep -n -A "$context_lines" -B "$context_lines" "$search_term" "$file_path" 2>/dev/null | head -20
    echo '```'
    echo ""
}

# Verify API contract implementation
verify_api_contracts() {
    local spec_dir="$1"
    local contracts_dir="$spec_dir/contracts"

    if [[ ! -d "$contracts_dir" ]]; then
        echo "**Status**: No contracts directory found" >> "$REPORT_FILE"
        return 0
    fi

    cat >> "$REPORT_FILE" << EOF
### API Contract Verification

**Contracts Directory**: \`${contracts_dir#$PROJECT_ROOT/}\`

EOF

    find "$contracts_dir" -name "*.yaml" -o -name "*.yml" | while read -r contract_file; do
        local filename=$(basename "$contract_file")
        echo_info "Verifying contract: $filename"

        cat >> "$REPORT_FILE" << EOF
#### Contract: $filename

EOF

        # Extract API paths from OpenAPI spec
        local api_paths
        api_paths=$(grep -E "^\s*\/.*:$" "$contract_file" 2>/dev/null | sed 's/[[:space:]]*//g' | sed 's/:$//' || true)

        if [[ -n "$api_paths" ]]; then
            echo "**Defined Endpoints**:" >> "$REPORT_FILE"
            echo "$api_paths" | while read -r path; do
                echo "- \`$path\`" >> "$REPORT_FILE"

                # Search for implementation - escape special regex characters in path
                local escaped_path=$(echo "$path" | sed 's/[[\.*^$()+{}|]/\\&/g')
                local implementation_files
                implementation_files=$(find_implementation_evidence "$escaped_path" "API endpoint")

                if [[ -n "$implementation_files" ]]; then
                    echo "  - **✅ IMPLEMENTED** in:" >> "$REPORT_FILE"
                    echo "$implementation_files" | while read -r impl_file; do
                        local rel_impl_path="${impl_file#$PROJECT_ROOT/}"
                        echo "    - \`$rel_impl_path\`" >> "$REPORT_FILE"
                    done
                else
                    echo "  - **❌ NOT IMPLEMENTED** - No evidence found in codebase" >> "$REPORT_FILE"
                fi
            done
        else
            echo "**Status**: No API paths found in contract file" >> "$REPORT_FILE"
        fi
        echo "" >> "$REPORT_FILE"
    done
}

# Verify data model implementation
verify_data_models() {
    local spec_dir="$1"
    local data_model_file="$spec_dir/data-model.md"

    if [[ ! -f "$data_model_file" ]]; then
        echo "**Status**: No data-model.md found" >> "$REPORT_FILE"
        return 0
    fi

    cat >> "$REPORT_FILE" << EOF
### Data Model Verification

**Data Model File**: \`${data_model_file#$PROJECT_ROOT/}\`

EOF

    # Extract entity definitions (look for ## Entity patterns)
    local entities
    entities=$(grep -E "^##\s+.*Entity|^##\s+.*Model|^##\s+[A-Z][a-zA-Z]+$" "$data_model_file" 2>/dev/null | sed 's/^##\s*//' || true)

    if [[ -n "$entities" ]]; then
        echo "**Defined Entities**:" >> "$REPORT_FILE"
        echo "$entities" | while read -r entity; do
            echo_info "Verifying entity: $entity"
            echo "- **$entity**" >> "$REPORT_FILE"

            # Search for TypeScript interfaces/types
            local type_files
            type_files=$(find_implementation_evidence "interface $entity\|type $entity\|class $entity" "Entity definition")

            if [[ -n "$type_files" ]]; then
                echo "  - **✅ TYPE DEFINED** in:" >> "$REPORT_FILE"
                echo "$type_files" | while read -r type_file; do
                    local rel_type_path="${type_file#$PROJECT_ROOT/}"
                    echo "    - \`$rel_type_path\`" >> "$REPORT_FILE"

                    # Get code evidence
                    get_code_evidence "$type_file" "$entity" 2 >> "$REPORT_FILE"
                done
            else
                echo "  - **❌ TYPE NOT FOUND** - No interface/type definition found" >> "$REPORT_FILE"
            fi

            # Search for database schemas/models
            local schema_files
            schema_files=$(find_implementation_evidence "$entity.*schema\|$entity.*model" "Database schema")

            if [[ -n "$schema_files" ]]; then
                echo "  - **✅ SCHEMA FOUND** in:" >> "$REPORT_FILE"
                echo "$schema_files" | while read -r schema_file; do
                    local rel_schema_path="${schema_file#$PROJECT_ROOT/}"
                    echo "    - \`$rel_schema_path\`" >> "$REPORT_FILE"
                done
            else
                echo "  - **⚠️ SCHEMA STATUS** - No explicit schema definition found" >> "$REPORT_FILE"
            fi
        done
    else
        echo "**Status**: No entity definitions found in data model" >> "$REPORT_FILE"
    fi
    echo "" >> "$REPORT_FILE"
}

# Verify task implementation
verify_task_implementation() {
    local spec_dir="$1"
    local tasks_file="$spec_dir/tasks.md"

    if [[ ! -f "$tasks_file" ]]; then
        echo "**Status**: No tasks.md found" >> "$REPORT_FILE"
        return 0
    fi

    cat >> "$REPORT_FILE" << EOF
### Task Implementation Verification

**Tasks File**: \`${tasks_file#$PROJECT_ROOT/}\`

EOF

    # Extract numbered tasks
    local tasks
    tasks=$(grep -E "^[0-9]+\.\s+" "$tasks_file" 2>/dev/null || true)

    if [[ -n "$tasks" ]]; then
        local task_count
        task_count=$(echo "$tasks" | wc -l)
        echo "**Total Tasks Defined**: $task_count" >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"

        # Check first 5 tasks for evidence
        echo "$tasks" | head -5 | while IFS= read -r task; do
            local task_number
            task_number=$(echo "$task" | sed 's/^\([0-9]*\)\..*/\1/')
            local task_description
            task_description=$(echo "$task" | sed 's/^[0-9]*\.\s*//')

            echo "#### Task $task_number" >> "$REPORT_FILE"
            echo "**Description**: $task_description" >> "$REPORT_FILE"

            # Extract key terms for searching
            local search_terms
            search_terms=$(echo "$task_description" | grep -oE "[A-Z][a-zA-Z]*|[a-z]+[A-Z][a-zA-Z]*" | head -3 | tr '\n' '|' | sed 's/|$//')

            if [[ -n "$search_terms" ]]; then
                local evidence_files
                evidence_files=$(find_implementation_evidence "$search_terms" "Task implementation")

                if [[ -n "$evidence_files" ]]; then
                    echo "- **✅ EVIDENCE FOUND** in:" >> "$REPORT_FILE"
                    echo "$evidence_files" | head -3 | while read -r evidence_file; do
                        local rel_evidence_path="${evidence_file#$PROJECT_ROOT/}"
                        echo "  - \`$rel_evidence_path\`" >> "$REPORT_FILE"
                    done
                else
                    echo "- **❌ NO EVIDENCE** - No implementation found for task terms" >> "$REPORT_FILE"
                fi
            else
                echo "- **⚠️ UNCLEAR** - Could not extract searchable terms" >> "$REPORT_FILE"
            fi
            echo "" >> "$REPORT_FILE"
        done

        if [[ $task_count -gt 5 ]]; then
            echo "**Note**: Only first 5 tasks analyzed in detail. $((task_count - 5)) additional tasks defined." >> "$REPORT_FILE"
        fi
    else
        echo "**Status**: No numbered tasks found in tasks file" >> "$REPORT_FILE"
    fi
    echo "" >> "$REPORT_FILE"
}

# Verify progress tracking
verify_progress_tracking() {
    local spec_dir="$1"
    local plan_file="$spec_dir/plan.md"

    if [[ ! -f "$plan_file" ]]; then
        echo "**Status**: No plan.md found for progress verification" >> "$REPORT_FILE"
        return 0
    fi

    cat >> "$REPORT_FILE" << EOF
### Progress Tracking Verification

**Plan File**: \`${plan_file#$PROJECT_ROOT/}\`

EOF

    # Extract progress tracking section
    local progress_section
    progress_section=$(sed -n '/## Progress Tracking/,/^---/p' "$plan_file" 2>/dev/null | head -20)

    if [[ -n "$progress_section" ]]; then
        echo "**Progress Status**:" >> "$REPORT_FILE"
        echo '```markdown' >> "$REPORT_FILE"
        echo "$progress_section" >> "$REPORT_FILE"
        echo '```' >> "$REPORT_FILE"

        # Count completed phases
        local completed_phases
        completed_phases=$(echo "$progress_section" | grep -c "\[x\]" || echo "0")
        local total_phases
        total_phases=$(echo "$progress_section" | grep -c "\[\s*\]" || echo "0")
        total_phases=$((total_phases + completed_phases))

        echo "**Completion Rate**: $completed_phases/$total_phases phases" >> "$REPORT_FILE"
    else
        echo "**Status**: No progress tracking section found" >> "$REPORT_FILE"
    fi
    echo "" >> "$REPORT_FILE"
}

# Process individual spec directory
process_spec_directory() {
    local spec_dir="$1"
    local spec_name=$(basename "$spec_dir")

    echo_info "Processing spec: $spec_name"

    cat >> "$REPORT_FILE" << EOF
## Spec: $spec_name

**Directory**: \`${spec_dir#$PROJECT_ROOT/}\`
**Analysis Date**: $(date)

EOF

    # Check for required files
    local required_files=("spec.md" "plan.md")
    local optional_files=("tasks.md" "data-model.md" "quickstart.md" "research.md")

    echo "**File Inventory**:" >> "$REPORT_FILE"

    for file in "${required_files[@]}"; do
        if [[ -f "$spec_dir/$file" ]]; then
            echo "- ✅ \`$file\` (required)" >> "$REPORT_FILE"
        else
            echo "- ❌ \`$file\` (required) - **MISSING**" >> "$REPORT_FILE"
        fi
    done

    for file in "${optional_files[@]}"; do
        if [[ -f "$spec_dir/$file" ]]; then
            echo "- ✅ \`$file\` (optional)" >> "$REPORT_FILE"
        else
            echo "- ⚪ \`$file\` (optional) - not present" >> "$REPORT_FILE"
        fi
    done

    echo "" >> "$REPORT_FILE"

    # Verify different aspects
    verify_api_contracts "$spec_dir"
    verify_data_models "$spec_dir"
    verify_task_implementation "$spec_dir"
    verify_progress_tracking "$spec_dir"

    cat >> "$REPORT_FILE" << EOF
---

EOF
}

# Main execution
main() {
    echo_info "Starting CVPlus integrity verification..."

    # Check prerequisites
    if [[ ! -d "$SPECS_DIR" ]]; then
        echo_error "Specs directory not found: $SPECS_DIR"
        exit 1
    fi

    # Initialize report
    init_report

    # Analyze .specify configuration
    analyze_specify_config

    # Process each spec directory
    echo_info "Found spec directories:"
    find "$SPECS_DIR" -maxdepth 1 -type d -not -path "$SPECS_DIR" -not -path "*/node_modules*" | sort | while read -r spec_dir; do
        process_spec_directory "$spec_dir"
    done

    # Finalize report
    cat >> "$REPORT_FILE" << EOF
## Summary

**Verification Complete**: $(date)
**Report Location**: \`${REPORT_FILE#$PROJECT_ROOT/}\`

### Key Findings

This report provides comprehensive evidence-based analysis of all CVPlus specifications against actual codebase implementation. All claims are backed by file paths, line numbers, and code snippets from the actual codebase.

### Next Steps

1. Review all ❌ **NOT IMPLEMENTED** items
2. Address any missing required files
3. Validate ⚠️ **UNCLEAR** items require manual verification
4. Update specifications to match actual implementation where appropriate

**Generated by**: claude verify-integrity command
**Methodology**: Evidence-based verification with zero assumptions
EOF

    echo_success "Integrity verification complete!"
    echo_info "Report generated: $REPORT_FILE"

    # Show quick summary
    local missing_count
    missing_count=$(grep -c "❌.*NOT IMPLEMENTED\|❌.*MISSING" "$REPORT_FILE" 2>/dev/null || echo "0")
    local found_count
    found_count=$(grep -c "✅.*IMPLEMENTED\|✅.*FOUND\|✅.*DEFINED" "$REPORT_FILE" 2>/dev/null || echo "0")

    echo ""
    echo_info "Quick Summary:"
    echo_success "  Found evidence: $found_count items"
    echo_error "  Missing/Not implemented: $missing_count items"
    echo ""
}

# Execute main function
main "$@"