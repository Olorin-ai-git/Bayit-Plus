#!/bin/bash

# CVPlus Level 2 Recovery System - Dependency Validation Script
# Validates module dependencies and layer architecture compliance

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." &> /dev/null && pwd)"
LOG_DIR="$ROOT_DIR/logs/recovery"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="$LOG_DIR/dependency-validation-$TIMESTAMP.log"

# CVPlus Level 2 modules by layer
declare -A MODULE_LAYERS=(
    ["auth"]="1"
    ["i18n"]="1"
    ["processing"]="2"
    ["multimedia"]="2"
    ["analytics"]="2"
    ["premium"]="3"
    ["public-profiles"]="3"
    ["recommendations"]="3"
    ["admin"]="4"
    ["workflow"]="4"
    ["payments"]="4"
)

# Layer dependencies (what each layer can depend on)
declare -A LAYER_DEPENDENCIES=(
    ["1"]="0"           # Layer 1 can depend on Layer 0 (core)
    ["2"]="0,1"         # Layer 2 can depend on Layers 0,1
    ["3"]="0,1,2"       # Layer 3 can depend on Layers 0,1,2
    ["4"]="0,1,2,3"     # Layer 4 can depend on Layers 0,1,2,3
)

# Expected dependencies for each module
declare -A MODULE_EXPECTED_DEPS=(
    ["auth"]="@cvplus/core"
    ["i18n"]="@cvplus/core,@cvplus/auth"
    ["processing"]="@cvplus/core,@cvplus/auth,@cvplus/i18n"
    ["multimedia"]="@cvplus/core,@cvplus/auth,@cvplus/i18n"
    ["analytics"]="@cvplus/core,@cvplus/auth,@cvplus/i18n"
    ["premium"]="@cvplus/core,@cvplus/auth,@cvplus/i18n,@cvplus/processing,@cvplus/multimedia,@cvplus/analytics"
    ["public-profiles"]="@cvplus/core,@cvplus/auth,@cvplus/i18n,@cvplus/processing,@cvplus/multimedia,@cvplus/analytics"
    ["recommendations"]="@cvplus/core,@cvplus/auth,@cvplus/i18n,@cvplus/processing,@cvplus/multimedia,@cvplus/analytics"
    ["admin"]="@cvplus/core,@cvplus/auth,@cvplus/i18n,@cvplus/processing,@cvplus/multimedia,@cvplus/analytics,@cvplus/premium,@cvplus/public-profiles,@cvplus/recommendations"
    ["workflow"]="@cvplus/core,@cvplus/auth,@cvplus/i18n,@cvplus/processing,@cvplus/multimedia,@cvplus/analytics,@cvplus/premium,@cvplus/public-profiles,@cvplus/recommendations"
    ["payments"]="@cvplus/core,@cvplus/auth,@cvplus/i18n,@cvplus/processing,@cvplus/multimedia,@cvplus/analytics,@cvplus/premium,@cvplus/public-profiles,@cvplus/recommendations"
)

# Validation options
FIX_VIOLATIONS=false
REPORT_ONLY=false
TARGET_MODULES=()
SEVERITY_LEVEL="warning"  # error, warning, info
OUTPUT_FORMAT="text"      # text, json, markdown

# Validation counters
TOTAL_MODULES=0
VALID_MODULES=0
INVALID_MODULES=0
TOTAL_VIOLATIONS=0
CRITICAL_VIOLATIONS=0
WARNING_VIOLATIONS=0

# Function to print formatted output
print_status() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    case $level in
        "INFO")
            echo -e "${BLUE}[INFO]${NC} $timestamp - $message" | tee -a "$LOG_FILE"
            ;;
        "SUCCESS")
            echo -e "${GREEN}[SUCCESS]${NC} $timestamp - $message" | tee -a "$LOG_FILE"
            ;;
        "WARNING")
            echo -e "${YELLOW}[WARNING]${NC} $timestamp - $message" | tee -a "$LOG_FILE"
            ;;
        "ERROR")
            echo -e "${RED}[ERROR]${NC} $timestamp - $message" | tee -a "$LOG_FILE"
            ;;
        "CRITICAL")
            echo -e "${RED}[CRITICAL]${NC} $timestamp - $message" | tee -a "$LOG_FILE"
            ;;
        "LAYER")
            echo -e "${PURPLE}[LAYER]${NC} $timestamp - $message" | tee -a "$LOG_FILE"
            ;;
    esac
}

# Function to show usage
show_usage() {
    cat << EOF
CVPlus Level 2 Recovery System - Dependency Validation Script

Usage: $0 [OPTIONS] [MODULES...]

OPTIONS:
    -f, --fix             Fix dependency violations automatically
    -r, --report-only     Generate report without fixing violations
    -s, --severity LEVEL  Severity level: error, warning, info (default: warning)
    -o, --output FORMAT   Output format: text, json, markdown (default: text)
    -h, --help            Show this help message

MODULES:
    If no modules specified, all modules will be validated.
    Valid modules: ${!MODULE_LAYERS[*]}

EXAMPLES:
    $0                                # Validate all modules
    $0 auth i18n                     # Validate specific modules
    $0 --fix --severity error        # Fix critical dependency violations
    $0 --report-only --output json   # Generate JSON report

LAYER ARCHITECTURE:
    Layer 1: auth, i18n (Base Services)
    Layer 2: processing, multimedia, analytics (Domain Services)
    Layer 3: premium, public-profiles, recommendations (Business Services)
    Layer 4: admin, workflow, payments (Orchestration Services)

DEPENDENCY RULES:
    - Layer 1 can depend on: Core only
    - Layer 2 can depend on: Core, Layer 1
    - Layer 3 can depend on: Core, Layers 1-2
    - Layer 4 can depend on: Core, Layers 1-3
    - No circular dependencies allowed
    - No peer dependencies within same layer

EOF
}

# Function to parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -f|--fix)
                FIX_VIOLATIONS=true
                shift
                ;;
            -r|--report-only)
                REPORT_ONLY=true
                shift
                ;;
            -s|--severity)
                SEVERITY_LEVEL="$2"
                if [[ ! "$SEVERITY_LEVEL" =~ ^(error|warning|info)$ ]]; then
                    print_status "ERROR" "Invalid severity level: $SEVERITY_LEVEL"
                    exit 1
                fi
                shift 2
                ;;
            -o|--output)
                OUTPUT_FORMAT="$2"
                if [[ ! "$OUTPUT_FORMAT" =~ ^(text|json|markdown)$ ]]; then
                    print_status "ERROR" "Invalid output format: $OUTPUT_FORMAT"
                    exit 1
                fi
                shift 2
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            -*)
                print_status "ERROR" "Unknown option: $1"
                show_usage
                exit 1
                ;;
            *)
                # Validate module name
                if [[ -n "${MODULE_LAYERS[$1]:-}" ]]; then
                    TARGET_MODULES+=("$1")
                else
                    print_status "ERROR" "Invalid module: $1"
                    print_status "INFO" "Valid modules: ${!MODULE_LAYERS[*]}"
                    exit 1
                fi
                shift
                ;;
        esac
    done

    # If no modules specified, use all modules
    if [[ ${#TARGET_MODULES[@]} -eq 0 ]]; then
        TARGET_MODULES=($(echo "${!MODULE_LAYERS[@]}" | tr ' ' '\n' | sort))
    fi
}

# Function to setup logging
setup_logging() {
    mkdir -p "$LOG_DIR"

    print_status "INFO" "Starting CVPlus Level 2 Dependency Validation"
    print_status "INFO" "Log file: $LOG_FILE"
    print_status "INFO" "Target modules: ${TARGET_MODULES[*]}"
    print_status "INFO" "Options: Fix=$FIX_VIOLATIONS, ReportOnly=$REPORT_ONLY, Severity=$SEVERITY_LEVEL, Format=$OUTPUT_FORMAT"
}

# Function to check if module exists
check_module_exists() {
    local module=$1
    local module_path="$ROOT_DIR/packages/$module"

    if [[ ! -d "$module_path" ]]; then
        print_status "ERROR" "Module directory not found: $module_path"
        return 1
    fi

    if [[ ! -f "$module_path/package.json" ]]; then
        print_status "ERROR" "package.json not found in module: $module"
        return 1
    fi

    return 0
}

# Function to get module dependencies from package.json
get_module_dependencies() {
    local module=$1
    local module_path="$ROOT_DIR/packages/$module"
    local package_json="$module_path/package.json"

    # Extract dependencies and devDependencies that start with @cvplus/
    local deps=""

    if jq -e '.dependencies' "$package_json" >/dev/null 2>&1; then
        deps+=$(jq -r '.dependencies | keys[] | select(startswith("@cvplus/"))' "$package_json" 2>/dev/null | tr '\n' ',' | sed 's/,$//')
    fi

    if jq -e '.devDependencies' "$package_json" >/dev/null 2>&1; then
        local dev_deps=$(jq -r '.devDependencies | keys[] | select(startswith("@cvplus/"))' "$package_json" 2>/dev/null | tr '\n' ',' | sed 's/,$//')
        if [[ -n "$dev_deps" ]] && [[ -n "$deps" ]]; then
            deps+=","
        fi
        deps+="$dev_deps"
    fi

    echo "$deps"
}

# Function to validate layer compliance
validate_layer_compliance() {
    local module=$1
    local dependencies=$2
    local violations=()

    local module_layer=${MODULE_LAYERS[$module]}
    local allowed_layers=${LAYER_DEPENDENCIES[$module_layer]}

    IFS=',' read -ra DEPS <<< "$dependencies"
    IFS=',' read -ra ALLOWED <<< "$allowed_layers"

    for dep in "${DEPS[@]}"; do
        if [[ -z "$dep" ]]; then
            continue
        fi

        # Extract module name from @cvplus/module-name
        local dep_module_name=$(echo "$dep" | sed 's/@cvplus\///')

        # Handle special case for core
        if [[ "$dep_module_name" == "core" ]]; then
            continue  # Core is always allowed
        fi

        # Check if dependency module exists in our module layers
        if [[ -n "${MODULE_LAYERS[$dep_module_name]:-}" ]]; then
            local dep_layer=${MODULE_LAYERS[$dep_module_name]}

            # Check if dependency layer is allowed
            local layer_allowed=false
            for allowed_layer in "${ALLOWED[@]}"; do
                if [[ "$dep_layer" == "$allowed_layer" ]]; then
                    layer_allowed=true
                    break
                fi
            done

            if [[ "$layer_allowed" != true ]]; then
                violations+=("LAYER_VIOLATION: Module $module (Layer $module_layer) cannot depend on $dep (Layer $dep_layer)")
                CRITICAL_VIOLATIONS=$((CRITICAL_VIOLATIONS + 1))
            fi

            # Check for peer dependencies (same layer)
            if [[ "$dep_layer" == "$module_layer" ]]; then
                violations+=("PEER_DEPENDENCY: Module $module cannot depend on peer module $dep_module_name (both in Layer $module_layer)")
                CRITICAL_VIOLATIONS=$((CRITICAL_VIOLATIONS + 1))
            fi
        fi
    done

    if [[ ${#violations[@]} -gt 0 ]]; then
        for violation in "${violations[@]}"; do
            print_status "CRITICAL" "$violation"
        done
    fi

    echo "${violations[@]}"
}

# Function to validate expected dependencies
validate_expected_dependencies() {
    local module=$1
    local actual_deps=$2
    local violations=()

    local expected_deps=${MODULE_EXPECTED_DEPS[$module]}

    # Convert to arrays
    IFS=',' read -ra EXPECTED <<< "$expected_deps"
    IFS=',' read -ra ACTUAL <<< "$actual_deps"

    # Check for missing dependencies
    for expected in "${EXPECTED[@]}"; do
        if [[ -z "$expected" ]]; then
            continue
        fi

        local found=false
        for actual in "${ACTUAL[@]}"; do
            if [[ "$actual" == "$expected" ]]; then
                found=true
                break
            fi
        done

        if [[ "$found" != true ]]; then
            violations+=("MISSING_DEPENDENCY: Module $module is missing expected dependency: $expected")
            WARNING_VIOLATIONS=$((WARNING_VIOLATIONS + 1))
        fi
    done

    # Check for unexpected dependencies (only @cvplus dependencies)
    for actual in "${ACTUAL[@]}"; do
        if [[ -z "$actual" ]] || [[ ! "$actual" =~ ^@cvplus/ ]]; then
            continue
        fi

        local found=false
        for expected in "${EXPECTED[@]}"; do
            if [[ "$actual" == "$expected" ]]; then
                found=true
                break
            fi
        done

        if [[ "$found" != true ]]; then
            violations+=("UNEXPECTED_DEPENDENCY: Module $module has unexpected dependency: $actual")
            WARNING_VIOLATIONS=$((WARNING_VIOLATIONS + 1))
        fi
    done

    if [[ ${#violations[@]} -gt 0 ]]; then
        for violation in "${violations[@]}"; do
            print_status "WARNING" "$violation"
        done
    fi

    echo "${violations[@]}"
}

# Function to check for circular dependencies
check_circular_dependencies() {
    local module=$1
    local dependencies=$2
    local visited_path=("$module")
    local violations=()

    # This is a simplified circular dependency check
    # In a full implementation, this would use a proper graph traversal algorithm

    IFS=',' read -ra DEPS <<< "$dependencies"

    for dep in "${DEPS[@]}"; do
        if [[ -z "$dep" ]]; then
            continue
        fi

        local dep_module_name=$(echo "$dep" | sed 's/@cvplus\///')

        # Skip core as it doesn't have dependencies back to modules
        if [[ "$dep_module_name" == "core" ]]; then
            continue
        fi

        # Check if this dependency is in our visited path (simple circular check)
        for visited in "${visited_path[@]}"; do
            if [[ "$dep_module_name" == "$visited" ]]; then
                violations+=("CIRCULAR_DEPENDENCY: Circular dependency detected: $module -> $dep_module_name")
                CRITICAL_VIOLATIONS=$((CRITICAL_VIOLATIONS + 1))
            fi
        done
    done

    if [[ ${#violations[@]} -gt 0 ]]; then
        for violation in "${violations[@]}"; do
            print_status "CRITICAL" "$violation"
        done
    fi

    echo "${violations[@]}"
}

# Function to validate single module
validate_module() {
    local module=$1
    local validation_result="VALID"
    local module_violations=()

    print_status "INFO" "Validating module: $module (Layer ${MODULE_LAYERS[$module]})"

    # Check if module exists
    if ! check_module_exists "$module"; then
        print_status "ERROR" "Module $module does not exist"
        INVALID_MODULES=$((INVALID_MODULES + 1))
        return 1
    fi

    # Get module dependencies
    local dependencies=$(get_module_dependencies "$module")
    print_status "INFO" "Module $module dependencies: $dependencies"

    # Validate layer compliance
    local layer_violations=($(validate_layer_compliance "$module" "$dependencies"))
    if [[ ${#layer_violations[@]} -gt 0 ]]; then
        module_violations+=("${layer_violations[@]}")
        validation_result="INVALID"
    fi

    # Validate expected dependencies
    local expected_violations=($(validate_expected_dependencies "$module" "$dependencies"))
    if [[ ${#expected_violations[@]} -gt 0 ]]; then
        module_violations+=("${expected_violations[@]}")
        if [[ "$SEVERITY_LEVEL" == "error" ]]; then
            validation_result="INVALID"
        fi
    fi

    # Check for circular dependencies
    local circular_violations=($(check_circular_dependencies "$module" "$dependencies"))
    if [[ ${#circular_violations[@]} -gt 0 ]]; then
        module_violations+=("${circular_violations[@]}")
        validation_result="INVALID"
    fi

    # Update counters
    TOTAL_VIOLATIONS=$((TOTAL_VIOLATIONS + ${#module_violations[@]}))

    if [[ "$validation_result" == "VALID" ]]; then
        print_status "SUCCESS" "Module $module validation PASSED"
        VALID_MODULES=$((VALID_MODULES + 1))
    else
        print_status "ERROR" "Module $module validation FAILED (${#module_violations[@]} violations)"
        INVALID_MODULES=$((INVALID_MODULES + 1))

        # Attempt to fix violations if requested
        if [[ "$FIX_VIOLATIONS" == true ]] && [[ "$REPORT_ONLY" != true ]]; then
            fix_module_violations "$module" "${module_violations[@]}"
        fi
    fi

    return $([[ "$validation_result" == "VALID" ]] && echo 0 || echo 1)
}

# Function to fix module violations
fix_module_violations() {
    local module=$1
    shift
    local violations=("$@")

    print_status "INFO" "Attempting to fix violations for module $module"

    local module_path="$ROOT_DIR/packages/$module"
    local package_json="$module_path/package.json"
    local backup_file="$package_json.backup-$TIMESTAMP"

    # Create backup
    cp "$package_json" "$backup_file"
    print_status "INFO" "Created backup: $backup_file"

    local fixed_count=0

    for violation in "${violations[@]}"; do
        if [[ "$violation" =~ MISSING_DEPENDENCY:.*dependency:\ (.*) ]]; then
            local missing_dep="${BASH_REMATCH[1]}"
            print_status "INFO" "Adding missing dependency: $missing_dep"

            # Add dependency to package.json
            local temp_file=$(mktemp)
            jq --arg dep "$missing_dep" '.dependencies[$dep] = "file:../" + ($dep | split("/")[1])' "$package_json" > "$temp_file"
            mv "$temp_file" "$package_json"

            fixed_count=$((fixed_count + 1))
            print_status "SUCCESS" "Added dependency: $missing_dep"

        elif [[ "$violation" =~ UNEXPECTED_DEPENDENCY:.*dependency:\ (.*) ]]; then
            local unexpected_dep="${BASH_REMATCH[1]}"
            print_status "WARNING" "Cannot automatically remove unexpected dependency: $unexpected_dep"
            print_status "INFO" "Manual review required for: $unexpected_dep"

        elif [[ "$violation" =~ LAYER_VIOLATION ]]; then
            print_status "ERROR" "Cannot automatically fix layer violation: $violation"
            print_status "INFO" "Manual architecture review required"

        elif [[ "$violation" =~ PEER_DEPENDENCY ]]; then
            print_status "ERROR" "Cannot automatically fix peer dependency: $violation"
            print_status "INFO" "Manual architecture review required"

        elif [[ "$violation" =~ CIRCULAR_DEPENDENCY ]]; then
            print_status "ERROR" "Cannot automatically fix circular dependency: $violation"
            print_status "INFO" "Manual architecture redesign required"
        fi
    done

    if [[ $fixed_count -gt 0 ]]; then
        print_status "SUCCESS" "Fixed $fixed_count violations for module $module"
        print_status "INFO" "Backup available at: $backup_file"
    else
        print_status "WARNING" "No violations could be automatically fixed for module $module"
        rm "$backup_file"  # Remove unnecessary backup
    fi
}

# Function to generate validation report
generate_report() {
    local report_file_base="$LOG_DIR/dependency-validation-report-$TIMESTAMP"

    case $OUTPUT_FORMAT in
        "json")
            generate_json_report "$report_file_base.json"
            ;;
        "markdown")
            generate_markdown_report "$report_file_base.md"
            ;;
        *)
            generate_text_report "$report_file_base.txt"
            ;;
    esac
}

# Function to generate JSON report
generate_json_report() {
    local report_file=$1

    cat > "$report_file" << EOF
{
  "timestamp": "$TIMESTAMP",
  "validation_summary": {
    "total_modules": $TOTAL_MODULES,
    "valid_modules": $VALID_MODULES,
    "invalid_modules": $INVALID_MODULES,
    "total_violations": $TOTAL_VIOLATIONS,
    "critical_violations": $CRITICAL_VIOLATIONS,
    "warning_violations": $WARNING_VIOLATIONS,
    "success_rate": $(echo "scale=2; $VALID_MODULES * 100 / $TOTAL_MODULES" | bc -l 2>/dev/null || echo "0")
  },
  "configuration": {
    "fix_violations": $FIX_VIOLATIONS,
    "report_only": $REPORT_ONLY,
    "severity_level": "$SEVERITY_LEVEL",
    "target_modules": [$(printf '"%s",' "${TARGET_MODULES[@]}" | sed 's/,$//')],
    "layer_architecture": {
      "layer_1": ["auth", "i18n"],
      "layer_2": ["processing", "multimedia", "analytics"],
      "layer_3": ["premium", "public-profiles", "recommendations"],
      "layer_4": ["admin", "workflow", "payments"]
    }
  },
  "log_file": "$LOG_FILE"
}
EOF

    print_status "INFO" "JSON report generated: $report_file"
}

# Function to generate markdown report
generate_markdown_report() {
    local report_file=$1

    cat > "$report_file" << EOF
# CVPlus Level 2 Dependency Validation Report

**Timestamp:** $TIMESTAMP
**Severity Level:** $SEVERITY_LEVEL
**Target Modules:** ${TARGET_MODULES[*]}

## Summary

| Metric | Value |
|--------|-------|
| Total Modules | $TOTAL_MODULES |
| Valid Modules | $VALID_MODULES |
| Invalid Modules | $INVALID_MODULES |
| Total Violations | $TOTAL_VIOLATIONS |
| Critical Violations | $CRITICAL_VIOLATIONS |
| Warning Violations | $WARNING_VIOLATIONS |
| Success Rate | $(echo "scale=1; $VALID_MODULES * 100 / $TOTAL_MODULES" | bc -l 2>/dev/null || echo "0")% |

## Layer Architecture

### Layer 1 (Base Services)
- auth
- i18n

### Layer 2 (Domain Services)
- processing
- multimedia
- analytics

### Layer 3 (Business Services)
- premium
- public-profiles
- recommendations

### Layer 4 (Orchestration Services)
- admin
- workflow
- payments

## Configuration

- **Fix Violations:** $FIX_VIOLATIONS
- **Report Only:** $REPORT_ONLY
- **Log File:** $LOG_FILE

EOF

    print_status "INFO" "Markdown report generated: $report_file"
}

# Function to generate text report
generate_text_report() {
    local report_file=$1

    cat > "$report_file" << EOF
CVPlus Level 2 Dependency Validation Report
==========================================

Timestamp: $TIMESTAMP
Severity Level: $SEVERITY_LEVEL
Target Modules: ${TARGET_MODULES[*]}

SUMMARY
-------
Total Modules: $TOTAL_MODULES
Valid Modules: $VALID_MODULES
Invalid Modules: $INVALID_MODULES
Total Violations: $TOTAL_VIOLATIONS
Critical Violations: $CRITICAL_VIOLATIONS
Warning Violations: $WARNING_VIOLATIONS
Success Rate: $(echo "scale=1; $VALID_MODULES * 100 / $TOTAL_MODULES" | bc -l 2>/dev/null || echo "0")%

CONFIGURATION
-------------
Fix Violations: $FIX_VIOLATIONS
Report Only: $REPORT_ONLY
Log File: $LOG_FILE

LAYER ARCHITECTURE
------------------
Layer 1 (Base Services): auth, i18n
Layer 2 (Domain Services): processing, multimedia, analytics
Layer 3 (Business Services): premium, public-profiles, recommendations
Layer 4 (Orchestration Services): admin, workflow, payments

EOF

    print_status "INFO" "Text report generated: $report_file"
}

# Main execution
main() {
    # Parse command line arguments
    parse_args "$@"

    # Setup logging
    setup_logging

    # Initialize counters
    TOTAL_MODULES=${#TARGET_MODULES[@]}

    # Print validation info
    print_status "INFO" "Node.js version: $(node --version 2>/dev/null || echo "Not available")"
    print_status "INFO" "jq version: $(jq --version 2>/dev/null || echo "Not available")"
    print_status "INFO" "Working directory: $ROOT_DIR"

    # Validate each module
    for module in "${TARGET_MODULES[@]}"; do
        print_status "LAYER" "Validating $module (Layer ${MODULE_LAYERS[$module]})"
        validate_module "$module" || true  # Continue on failures
    done

    # Generate report
    if [[ "$REPORT_ONLY" == true ]] || [[ $INVALID_MODULES -gt 0 ]]; then
        generate_report
    fi

    # Print final summary
    print_status "INFO" "Validation Summary:"
    print_status "INFO" "  Total modules: $TOTAL_MODULES"
    print_status "INFO" "  Valid modules: $VALID_MODULES"
    print_status "INFO" "  Invalid modules: $INVALID_MODULES"
    print_status "INFO" "  Total violations: $TOTAL_VIOLATIONS"
    print_status "INFO" "  Critical violations: $CRITICAL_VIOLATIONS"
    print_status "INFO" "  Warning violations: $WARNING_VIOLATIONS"

    local success_rate=0
    if [[ $TOTAL_MODULES -gt 0 ]]; then
        success_rate=$(echo "scale=1; $VALID_MODULES * 100 / $TOTAL_MODULES" | bc -l 2>/dev/null || echo "0")
    fi
    print_status "INFO" "  Success rate: ${success_rate}%"

    if [[ $INVALID_MODULES -eq 0 ]]; then
        print_status "SUCCESS" "All modules passed dependency validation"
        exit 0
    else
        print_status "ERROR" "$INVALID_MODULES modules failed dependency validation"
        print_status "INFO" "See log file for details: $LOG_FILE"
        exit 1
    fi
}

# Check if script is being sourced or executed
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi