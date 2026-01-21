# Intelligent CVPlus Migration Script Enhancement Plan

**Author**: Gil Klainert
**Date**: 2025-09-16
**Plan Type**: System Enhancement
**Target**: migrate.sh script intelligent analysis capabilities

## Executive Summary

Enhance the CVPlus migrate script (`~/.claude/commands/migrate.sh`) to support intelligent, automated file categorization and multi-destination migration planning. The current script requires manual specification of files and destination modules. The enhanced version will analyze all files in a source module and automatically determine optimal destination modules based on content analysis, architectural patterns, and CVPlus layer compliance.

## Current State Analysis

### Existing migrate.sh Capabilities
- Manual file-by-file migration: `migrate SOURCE_MODULE TARGET_MODULE FILES...`
- Layer architecture validation
- Dependency analysis for specified files
- Migration plan generation
- Build verification post-migration
- Backup and rollback capabilities

### Current Limitations
- Requires manual file selection and destination specification
- No intelligent content analysis for categorization
- Single destination module per migration operation
- No bulk analysis of entire modules
- Limited understanding of CVPlus architectural patterns

## Enhanced Architecture Design

### 1. Intelligent File Analysis Engine

#### Core Analysis Components

```bash
# File Content Analyzer
analyze_file_content() {
    local file_path=$1
    local analysis_results=()

    # Extract imports/exports patterns
    # Analyze function/class names and purposes
    # Identify domain-specific keywords
    # Detect architectural patterns
    # Classify by CVPlus layer compliance
}

# Module Classification Engine
classify_file_destination() {
    local file_path=$1
    local content_analysis=$2

    # Score against each target module
    # Apply CVPlus architectural rules
    # Consider dependencies and coupling
    # Return ranked destination recommendations
}
```

#### Analysis Criteria Matrix

| Criteria | Weight | Analysis Method |
|----------|--------|-----------------|
| **Import Patterns** | 30% | Analyze `from '@cvplus/auth'`, `from '@cvplus/multimedia'` etc. |
| **Function Names** | 25% | Detect auth*, multimedia*, analytics*, payment* patterns |
| **Type Definitions** | 20% | Analyze interface/type exports and their domains |
| **Content Keywords** | 15% | Scan for domain-specific terms (authentication, video, payment) |
| **Directory Structure** | 10% | Consider existing file location patterns |

### 2. Multi-Destination Migration Planner

#### Enhanced Command Interface

```bash
# New simplified syntax
migrate SOURCE_MODULE

# Enhanced options
migrate processing --analyze-only          # Analysis without execution
migrate processing --interactive           # Interactive mode with user approval
migrate processing --confidence-threshold 0.8  # Only auto-categorize high-confidence files
migrate processing --plan-file ./migration-plan.md  # Generate detailed plan
```

#### Migration Plan Generator

```bash
generate_intelligent_migration_plan() {
    local source_module=$1
    local plan_file=${2:-"migration-plan-$(date +%Y%m%d-%H%M%S).md"}

    # Analyze all files in source module
    # Generate destination recommendations
    # Group files by destination module
    # Calculate migration impact scores
    # Generate comprehensive execution plan
}
```

### 3. CVPlus Module Classification Rules

#### Layer-Based Classification Matrix

```bash
# Layer 0: logging
classify_as_logging() {
    # Files containing logging, monitoring, observability patterns
    grep -E "(logger|log|monitoring|observability|telemetry)" "$file"
}

# Layer 1: core, shell
classify_as_core() {
    # Utility functions, shared types, base classes
    grep -E "(utils|shared|common|base|helper)" "$file"
}

classify_as_shell() {
    # Main orchestration, routing, app-level coordination
    grep -E "(app|main|orchestrat|coordinat|router)" "$file"
}

# Layer 2: Domain Services
classify_as_auth() {
    # Authentication, authorization, user management
    grep -E "(auth|login|user|session|token|jwt|oauth)" "$file"
}

classify_as_multimedia() {
    # Video, audio, image, podcast processing
    grep -E "(video|audio|image|podcast|media|ffmpeg|processing)" "$file"
}

classify_as_analytics() {
    # Analytics, metrics, tracking, reporting
    grep -E "(analytic|metric|track|report|dashboard|chart)" "$file"
}

classify_as_payments() {
    # Payment processing, billing, subscriptions
    grep -E "(payment|billing|subscription|stripe|paypal|checkout)" "$file"
}

# Layer 3: Enhanced Services
classify_as_premium() {
    # Premium features, advanced capabilities
    grep -E "(premium|advanced|pro|enterprise)" "$file"
}

classify_as_recommendations() {
    # AI recommendations, ML models, suggestion engines
    grep -E "(recommend|suggestion|ml|model|ai|predict)" "$file"
}

classify_as_enhancements() {
    # CV enhancements, improvements, optimization
    grep -E "(enhance|improve|optimiz|upgrade|polish)" "$file"
}
```

## Implementation Phases

### Phase 1: Core Analysis Engine (⏳ PENDING)
- **Duration**: 2-3 days
- **Deliverables**:
  - File content analysis functions
  - CVPlus module classification rules
  - Confidence scoring system
  - Basic destination recommendation engine

### Phase 2: Multi-Destination Planning (⏳ PENDING)
- **Duration**: 2-3 days
- **Deliverables**:
  - Enhanced migration plan generator
  - Interactive approval workflow
  - Bulk file categorization
  - Migration impact analysis

### Phase 3: Intelligent Migration Execution (⏳ PENDING)
- **Duration**: 3-4 days
- **Deliverables**:
  - Automated multi-destination migration
  - Progressive migration with rollback
  - Enhanced validation and testing
  - Comprehensive reporting

### Phase 4: Advanced Features (⏳ PENDING)
- **Duration**: 2-3 days
- **Deliverables**:
  - Machine learning-based categorization
  - Historical migration pattern learning
  - Integration with CVPlus subagents
  - Performance optimization

## Technical Implementation Details

### 1. Enhanced File Analysis Functions

```bash
# Advanced content analysis
analyze_file_comprehensive() {
    local file_path=$1
    local analysis_file="$file_path.analysis"

    {
        echo "=== IMPORT ANALYSIS ==="
        grep -E "^import.*from|^import.*require" "$file_path" || true

        echo "=== EXPORT ANALYSIS ==="
        grep -E "^export|export.*=" "$file_path" || true

        echo "=== FUNCTION ANALYSIS ==="
        grep -E "function|const.*=|class.*{" "$file_path" || true

        echo "=== TYPE ANALYSIS ==="
        grep -E "interface|type.*=|enum" "$file_path" || true

        echo "=== DOMAIN KEYWORDS ==="
        grep -iE "(auth|multimedia|analytics|payment|premium|recommend)" "$file_path" || true

        echo "=== DEPENDENCY ANALYSIS ==="
        grep -E "@cvplus/|packages/" "$file_path" || true
    } > "$analysis_file"

    echo "$analysis_file"
}
```

### 2. Intelligent Destination Scoring

```bash
# Score file against potential destination modules
score_destination_match() {
    local file_path=$1
    local target_module=$2
    local analysis_file=$3

    local score=0
    local max_score=100

    # Import pattern scoring (30%)
    local import_matches=$(grep -c "@cvplus/$target_module" "$analysis_file" 2>/dev/null || echo 0)
    score=$((score + import_matches * 15))

    # Function name scoring (25%)
    local function_matches=$(grep -ci "$target_module" "$analysis_file" 2>/dev/null || echo 0)
    score=$((score + function_matches * 12))

    # Domain keyword scoring (20%)
    case "$target_module" in
        auth) keyword_matches=$(grep -ci "auth\|login\|user\|session" "$analysis_file" 2>/dev/null || echo 0) ;;
        multimedia) keyword_matches=$(grep -ci "video\|audio\|media\|podcast" "$analysis_file" 2>/dev/null || echo 0) ;;
        analytics) keyword_matches=$(grep -ci "analytic\|metric\|track\|report" "$analysis_file" 2>/dev/null || echo 0) ;;
        *) keyword_matches=0 ;;
    esac
    score=$((score + keyword_matches * 10))

    # Ensure score doesn't exceed maximum
    if [[ $score -gt $max_score ]]; then
        score=$max_score
    fi

    echo $score
}
```

### 3. Migration Plan Generation

```bash
# Generate comprehensive migration plan
generate_migration_plan() {
    local source_module=$1
    local plan_file=${2:-"migration-plan-$(date +%Y%m%d-%H%M%S).md"}

    log_info "Generating intelligent migration plan for '$source_module'"

    # Initialize plan file
    cat > "$plan_file" << EOF
# Intelligent CVPlus Migration Plan
**Author**: Gil Klainert
**Date**: $(date '+%Y-%m-%d %H:%M:%S')
**Source Module**: packages/$source_module
**Migration Type**: Intelligent Multi-Destination

## Analysis Summary

### Files Analyzed
EOF

    # Analyze all files in source module
    local all_files=($(find "packages/$source_module/src" -name "*.ts" -o -name "*.js" 2>/dev/null || true))
    local categorized_files=()
    local high_confidence_files=()
    local manual_review_files=()

    for file in "${all_files[@]}"; do
        if [[ -f "$file" ]]; then
            local relative_file=${file#packages/$source_module/}
            log_verbose "Analyzing: $relative_file"

            # Analyze file content
            local analysis_file=$(analyze_file_comprehensive "$file")

            # Score against all potential destinations
            local best_destination=""
            local best_score=0
            local all_scores=()

            for target_module in $(get_target_modules_for_layer "$(get_module_layer "$source_module")"); do
                if [[ "$target_module" != "$source_module" ]]; then
                    local score=$(score_destination_match "$file" "$target_module" "$analysis_file")
                    all_scores+=("$target_module:$score")

                    if [[ $score -gt $best_score ]]; then
                        best_score=$score
                        best_destination=$target_module
                    fi
                fi
            done

            # Categorize based on confidence
            if [[ $best_score -ge 70 ]]; then
                high_confidence_files+=("$relative_file:$best_destination:$best_score")
                categorized_files+=("$relative_file → packages/$best_destination (confidence: $best_score%)")
            elif [[ $best_score -ge 40 ]]; then
                manual_review_files+=("$relative_file:$best_destination:$best_score")
            else
                manual_review_files+=("$relative_file:UNKNOWN:$best_score")
            fi

            # Add to plan file
            cat >> "$plan_file" << EOF
- **$relative_file**
  - Best Destination: $best_destination (confidence: $best_score%)
  - All Scores: $(IFS=', '; echo "${all_scores[*]}")

EOF

            # Cleanup analysis file
            rm -f "$analysis_file"
        fi
    done

    # Add categorization results to plan
    cat >> "$plan_file" << EOF

## Migration Categories

### High Confidence Migrations (≥70%)
$(printf '%s\n' "${categorized_files[@]}")

### Manual Review Required (40-69% or Unknown)
$(printf '%s\n' "${manual_review_files[@]}")

## Execution Plan

### Phase 1: High Confidence Migrations
$(printf '%s\n' "${high_confidence_files[@]}" | while IFS=':' read -r file dest score; do
    echo "- Migrate \`$file\` → \`packages/$dest\`"
done)

### Phase 2: Manual Review and Approval
- Review files requiring manual categorization
- User approval for destination assignments
- Execute remaining migrations

## Migration Commands

### Automated High-Confidence Migrations
EOF

    # Generate migration commands for high confidence files
    local previous_dest=""
    printf '%s\n' "${high_confidence_files[@]}" | while IFS=':' read -r file dest score; do
        if [[ "$dest" != "$previous_dest" ]]; then
            echo "" >> "$plan_file"
            echo "# Migrate to $dest module" >> "$plan_file"
            previous_dest="$dest"
        fi
        echo "migrate $source_module $dest $file" >> "$plan_file"
    done

    cat >> "$plan_file" << EOF

### Manual Review Commands
# For files requiring manual review, use:
# migrate --interactive $source_module

## Risk Assessment
- **High Risk**: Files with low confidence scores
- **Medium Risk**: Cross-layer dependencies
- **Low Risk**: Well-categorized domain-specific files

## Rollback Plan
- Backup created in: ./backups/migrate-$(date +%Y%m%d-%H%M%S)
- Rollback command: restore-migration ./backups/migrate-$(date +%Y%m%d-%H%M%S)

EOF

    log_success "Migration plan generated: $plan_file"
    log_info "High confidence files: ${#high_confidence_files[@]}"
    log_info "Manual review required: ${#manual_review_files[@]}"

    return 0
}
```

## Success Criteria

### Phase 1 Success Metrics
- ✅ Analyze 100% of files in source module
- ✅ Generate confidence scores for all files
- ✅ Correctly categorize 80%+ of domain-specific files
- ✅ Produce comprehensive migration plans

### Phase 2 Success Metrics
- ✅ Support multi-destination migrations in single command
- ✅ Interactive approval workflow functioning
- ✅ Batch processing of categorized files
- ✅ Enhanced validation and rollback capabilities

### Phase 3 Success Metrics
- ✅ Automated execution of high-confidence migrations
- ✅ Progressive migration with intermediate validation
- ✅ Comprehensive migration reporting
- ✅ Integration with existing CVPlus build systems

## Risk Mitigation

### High Risk Areas
1. **Incorrect File Categorization**
   - Mitigation: Conservative confidence thresholds, manual review workflows
   - Fallback: Interactive mode for all uncertain classifications

2. **Breaking Dependencies**
   - Mitigation: Enhanced dependency analysis, progressive migration
   - Fallback: Comprehensive rollback with automatic restoration

3. **Layer Architecture Violations**
   - Mitigation: Strict layer validation, architectural compliance checking
   - Fallback: Migration blocking for invalid layer transitions

### Testing Strategy
- Unit tests for all analysis functions
- Integration tests with sample CVPlus modules
- End-to-end testing with processing module migration
- Performance testing with large file sets

## Implementation Timeline

| Phase | Duration | Start Date | Dependencies |
|-------|----------|------------|--------------|
| Phase 1: Analysis Engine | 2-3 days | 2025-09-16 | Current migrate.sh |
| Phase 2: Multi-Destination Planning | 2-3 days | Phase 1 Complete | Analysis Engine |
| Phase 3: Intelligent Execution | 3-4 days | Phase 2 Complete | Planning System |
| Phase 4: Advanced Features | 2-3 days | Phase 3 Complete | Core System |

**Total Estimated Duration**: 9-13 days
**Target Completion**: 2025-09-29

## Next Steps

1. **Immediate**: Create feature branch for implementation
2. **Phase 1**: Implement core analysis engine and classification rules
3. **Testing**: Validate analysis accuracy with processing module
4. **Phase 2**: Build multi-destination planning capabilities
5. **Integration**: Connect with existing CVPlus architecture
6. **Deployment**: Enhanced migrate script ready for production use

---

**Plan Status**: ⏳ PENDING
**Implementation Branch**: `feature/intelligent-migrate-enhancement`
**Related Documents**:
- `/docs/diagrams/intelligent-migrate-architecture.html`
- `~/.claude/commands/migrate.sh` (current implementation)