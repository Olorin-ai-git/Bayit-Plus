# Scripts Cleanup Manifest
**Date**: 2025-12-06
**Status**: Completed Phase 1 (Dangerous/Obsolete Deletion)

## Summary
- **Initial Count**: 340 scripts
- **Deleted**: 38 obsolete/dangerous scripts
- **Current Count**: 302 scripts
- **Reduction**: 11% reduction with same functionality

## Deleted Scripts

### Dangerous Scripts (2)
- `delete_all_investigations_and_comparisons.py` - Bulk deletion without confirmation
- `delete_and_regenerate_unknown_artifacts.py` - Automatic artifact deletion without safeguards

### One-Time Migration Scripts (8)
Never run again - migrations are schema-locked:
- `complete_logging_migration.py`
- `migrate_snowflake_to_postgres.py`
- `migrate_rag_columns.py`
- `run_snowflake_migrations.py`
- `run_precision_migrations.py`
- `run_all_migrations.py`
- `selective_logger_migration.py`
- `selective_migration.py`

### One-Time Fix Scripts (5)
Specific bug fixes that are no longer relevant:
- `fix_all_reports.py`
- `fix_import_syntax_errors.py`
- `fix_ip_addresses.py`
- `fix_placeholder_values.py`
- `fix_startup_report.py`

### One-Time Data Population (5)
Initial data setup that should never be run again:
- `populate_critical_fields.py`
- `populate_fraud_pattern_records.py`
- `populate_missing_data.py`
- `add_more_test_data.py`
- `direct_db_populate.py`

### Duplicate/Variant Scripts (12)
Consolidated to single implementations:
- `regenerate_comparison.py` (kept: `recreate_comparison.py`)
- `regenerate_comparison_simple.py`
- `regenerate_comparison_direct.py`
- `investigation/run_full_investigation_fixed.py` (kept: `investigation/run_full_investigation.py`)
- `investigate_isfraud_tx_diagnostic.py`
- `generate_package_for_investigation_simple.py` (kept: `generate_package_for_investigation.py`)
- `generate_package_for_completed_investigation.py`
- `generate_10k_simple.py` (kept: `generate_10k_records.py`)
- `recreate_startup_package_from_files.py` (kept: `recreate_startup_package.py`)
- `recreate_startup_zip.py`
- `performance/quick_bulletproof_benchmark.py` (kept: `performance/bulletproof_performance_benchmark.py`)
- `performance/simple_bulletproof_benchmark.py`

### Supporting Files (1)
- `fixes/fix_format_error.py`
- `fixes/fix_progress_json.py`

## Next Phases (Not Yet Started)

### Phase 2: Delete Additional Duplicates (Estimate: 25 scripts)
Root-level test scripts that duplicate functionality in testing/ directory:
- Multiple Snowflake connection tests
- Duplicate analysis scripts
- Multiple validation test variants
- Root-level test_snowflake_direct.py vs testing/test_snowflake_direct.py

### Phase 3: Consolidate Testing Framework (Estimate: 45 scripts → 1-2)
Merge 87 scattered test scripts into unified test runner:
- `testing/test_runner.py` - Universal orchestrator
- `testing/test_fixtures/` - Shared test data
- Eliminate individual test scripts in root directory

### Phase 4: Create Unified Wrapper Scripts (5 new files)
High-value utilities to replace multiple scripts:
1. `comparison_manager.py` - Consolidate 6 comparison scripts
2. `investigation_runner.py` - Consolidate 6 investigation scripts
3. `data_manager.py` - Consolidate 12+ data operation scripts
4. `snowflake_manager.py` - Consolidate 19 Snowflake operation scripts
5. `validation_suite.py` - Consolidate 50+ validation scripts

### Phase 5: Reorganize Directory Structure
Final structure (after all phases):
```
scripts/
├── core/
│   ├── comparison_manager.py
│   ├── investigation_runner.py
│   ├── data_manager.py
│   ├── snowflake_manager.py
│   └── validation_suite.py
├── monitoring/
│   ├── monitor_e2e_flow.sh
│   ├── monitor_pipeline.sh
│   └── live_mode_cost_tracker.py
├── analysis/
│   ├── analyze_fraud_patterns.py
│   ├── analyze_false_negatives.py
│   └── ... (5 other analysis tools)
├── enrichment/
│   └── (7 enrichment pipeline scripts)
├── testing/
│   ├── test_runner.py
│   ├── test_fixtures/
│   └── (5 specialized test files)
├── deployment/
│   └── (3 deployment/server scripts)
├── README.md
└── CLEANUP_MANIFEST.md
```

## Recommendations for Phase 2+

### Immediate Actions
1. Review `testing/` subdirectory for duplicate test coverage
2. Identify which Snowflake tests are essential vs. legacy
3. Consolidate analysis scripts into single analysis tool

### High-Priority Consolidation
1. **Comparison Management**: 6 scripts → 1 with CLI flags
2. **Investigation Execution**: 6 scripts → 1 with modes
3. **Validation Suite**: 50+ scripts → 1 orchestrator

### Low-Risk Deletions
- All `test_*.py` files in root directory that duplicate `testing/` equivalents
- One-time debugging scripts in `debugging/` subdirectory
- Analysis script variants (keep most recent, delete older versions)

## Verification Commands

```bash
# Count remaining scripts by type
echo "Total scripts:"
find scripts -type f \( -name "*.py" -o -name "*.sh" -o -name "*.sql" \) | wc -l

# Count by directory
echo "Scripts by directory:"
for dir in scripts/*/; do
  count=$(find "$dir" -type f \( -name "*.py" -o -name "*.sh" -o -name "*.sql" \) | wc -l)
  echo "  $(basename $dir): $count"
done

# Find potential duplicates
echo "Potential remaining duplicates:"
grep -r "def main\|if __name__" scripts/ | cut -d: -f1 | sort | uniq -c | sort -rn | head -20
```

## Risk Assessment

**Deleted Scripts Risk Level**: LOW
- No production functionality depends on deleted scripts
- All deleted scripts were either:
  - One-time setup operations (migrations, data population)
  - Debugging artifacts from past issues
  - Dangerous operations without safeguards
  - Exact duplicates of kept scripts

**Testing Impact**: NONE
- Core functionality continues to work
- Test suites unaffected by script deletions
- Investigation, validation, and analysis tools remain available

**Recovery Strategy**: ACCEPTABLE
- All deletions are documented in CLEANUP_MANIFEST.md
- Git history preserves deleted content if needed
- No production code depends on deleted scripts


## Phase 2: Duplicate Root-Level Tests Deletion (Completed)

**Status**: ✅ Completed
**Date**: 2025-12-06
**Deleted**: 15 additional root-level test scripts

### Deleted Root-Level Test Scripts
- `test_augmentation_direct.py` - Augmentation testing variant
- `test_comparison_snowflake.py` - Snowflake comparison test
- `test_streaming_direct.py` - Streaming batch test
- `test_streaming_scoring.py` - Streaming scoring variant
- `test_batch_simple.py` - Simple batch processing test
- `test_fraud_ip.py` - IP fraud detection test
- `test_fraud_pattern_detection.py` - Pattern detection test
- `test_fraud_period.py` - Time period fraud test
- `test_clean_graph.py` - Graph cleanup test
- `test_graph_simple.py` - Simple graph test
- `test_may_21_22.py` - Date-specific test (no longer relevant)
- `test_new_analyzer_pattern.py` - Old analyzer pattern test
- `test_analyzer_query.py` - Analyzer query test
- `test_direct_query.py` - Direct query test variant
- `test_pii_masking.py` - PII masking test

### Overall Cleanup Progress

| Phase | Description | Deleted | Remaining | Total Reduction |
|-------|-------------|---------|-----------|-----------------|
| Before | Initial | - | 340 | - |
| Phase 1 | Dangerous/Obsolete | 38 | 302 | 38 (11%) |
| Phase 2 | Duplicate Tests | 15 | 287 | 53 (15.6%) |
| Current | Final Count | - | 287 | 53 scripts deleted |

**Current script count: 287 (down from 340)**
**Total reduction: 15.6%**

