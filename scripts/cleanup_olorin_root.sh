#!/bin/bash

echo "📁 Organizing olorin root directory..."
echo ""

# Create organization directories
mkdir -p docs/implementation
mkdir -p docs/integration
mkdir -p docs/debugging
mkdir -p docs/architecture
mkdir -p docs/pull-requests
mkdir -p scripts/migration
mkdir -p scripts/testing
mkdir -p data/schemas

# Move implementation/completion documents
echo "📋 Moving implementation documents..."
mv IMPLEMENTATION_COMPLETE.md docs/implementation/ 2>/dev/null
mv IMPLEMENTATION_SUMMARY.md docs/implementation/ 2>/dev/null
mv STARTUP_ANALYSIS_VERIFICATION.md docs/implementation/ 2>/dev/null

# Move integration/guide documents
echo "🔗 Moving integration documents..."
mv INTEGRATION_GUIDE_CI_AUTOEXPAND.md docs/integration/ 2>/dev/null

# Move debugging documents
echo "🐛 Moving debugging documents..."
mv CRITICAL_VIOLATION_REMEDIATION_REPORT.md docs/debugging/ 2>/dev/null
mv DEVICE_ANALYSIS_EVIDENCE_QUALITY_FIX_SUMMARY.md docs/debugging/ 2>/dev/null
mv SUMMARY_CRASH_FIX_COMPLETE.md docs/debugging/ 2>/dev/null
mv debugging_plan_summary_crash.md docs/debugging/ 2>/dev/null

# Move architecture/design documents
echo "🏗️  Moving architecture documents..."
mv olorin_investigation_workspace_integrated_operating_model.md docs/architecture/ 2>/dev/null

# Move pull request documents
echo "📝 Moving pull request documents..."
mv PR_DESCRIPTION_POC.md docs/pull-requests/ 2>/dev/null
mv PULL_REQUEST_DESCRIPTION.md docs/pull-requests/ 2>/dev/null

# Move data files
echo "📊 Moving data files..."
mv "Tx Table Schema.csv" data/schemas/ 2>/dev/null

# Move scripts
echo "🔧 Moving scripts..."
mv logger_migration.py scripts/migration/ 2>/dev/null
mv test_refactored_html_generator.py scripts/testing/ 2>/dev/null

# Move batch_reports to appropriate location
echo "📈 Moving batch reports..."
if [ -d "batch_reports" ]; then
    mv batch_reports/* reports/ 2>/dev/null && rmdir batch_reports 2>/dev/null
fi

echo ""
echo "✅ Organization complete!"
echo ""
echo "📂 Summary:"
echo "   docs/implementation/   - Implementation completion docs"
echo "   docs/integration/      - Integration guides"
echo "   docs/debugging/        - Debug and fix reports"
echo "   docs/architecture/     - Architecture and design docs"
echo "   docs/pull-requests/    - PR descriptions"
echo "   data/schemas/          - Data schemas and CSVs"
echo "   scripts/migration/     - Migration scripts"
echo "   scripts/testing/       - Test scripts"
echo ""
echo "📋 Files remaining in root:"
ls -1 *.md 2>/dev/null | wc -l | xargs echo "   Markdown files:"
echo ""
