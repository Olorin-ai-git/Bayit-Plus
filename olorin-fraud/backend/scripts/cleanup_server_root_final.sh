#!/bin/bash

echo "🧹 Final cleanup of server root..."
echo ""

# Move test/validation Python scripts to scripts/validation/
mkdir -p scripts/validation
echo "✅ Moving validation scripts..."
mv test_*.py scripts/validation/ 2>/dev/null
mv verify_*.py scripts/validation/ 2>/dev/null
mv check_*.py scripts/validation/ 2>/dev/null
mv validate_*.py scripts/validation/ 2>/dev/null
mv end_to_end_validation.py scripts/validation/ 2>/dev/null
mv comprehensive_validation_test.py scripts/validation/ 2>/dev/null
mv critical_issues_validator.py scripts/validation/ 2>/dev/null
mv import_validation.py scripts/validation/ 2>/dev/null
mv syntax_and_logic_validation.py scripts/validation/ 2>/dev/null

# Move investigation/diagnosis scripts to scripts/investigation/
mkdir -p scripts/investigation
echo "🔍 Moving investigation scripts..."
mv investigate_*.py scripts/investigation/ 2>/dev/null
mv diagnose_*.py scripts/investigation/ 2>/dev/null
mv monitor_investigation_state.py scripts/investigation/ 2>/dev/null
mv list_investigations.py scripts/investigation/ 2>/dev/null

# Move query scripts to scripts/queries/
mkdir -p scripts/queries
echo "📊 Moving query scripts..."
mv query_*.py scripts/queries/ 2>/dev/null
mv check_txs_dates.py scripts/queries/ 2>/dev/null

# Move fix scripts to scripts/fixes/
mkdir -p scripts/fixes
echo "🔧 Moving fix scripts..."
mv fix_*.py scripts/fixes/ 2>/dev/null

# Move analysis scripts to scripts/analysis/
mkdir -p scripts/analysis
echo "📈 Moving analysis scripts..."
mv analyze_*.py scripts/analysis/ 2>/dev/null

# Move test result JSON files to artifacts/test_results/
mkdir -p artifacts/test_results
echo "📋 Moving test results..."
mv systematic_test_results_*.json artifacts/test_results/ 2>/dev/null

# Move text files to docs/notes/
mkdir -p docs/notes
echo "📝 Moving notes..."
mv optimization_complete.txt docs/notes/ 2>/dev/null
mv optimization_progression.txt docs/notes/ 2>/dev/null
mv PACKAGE_READY.txt docs/notes/ 2>/dev/null
mv PIPELINE_QUICK_REFERENCE.txt docs/notes/ 2>/dev/null
mv postgres_actual_columns.txt docs/notes/ 2>/dev/null
mv remaining_null_fields.txt docs/notes/ 2>/dev/null

# Move RTF files to docs/notes/
mv inv4.rtf docs/notes/ 2>/dev/null

# Move organize script to scripts/
mv organize_server_root.sh scripts/ 2>/dev/null

echo ""
echo "✅ Final cleanup complete!"
echo ""
echo "📂 Files moved to:"
echo "   scripts/validation/     - Test and validation scripts"
echo "   scripts/investigation/  - Investigation and diagnosis scripts"
echo "   scripts/queries/        - Database query scripts"
echo "   scripts/fixes/          - Fix and repair scripts"
echo "   scripts/analysis/       - Analysis scripts"
echo "   artifacts/test_results/ - Test result JSON files"
echo "   docs/notes/             - Text notes and references"
echo ""
echo "📋 Files remaining in root:"
ls -1 | grep -E "\.py$|\.sh$|\.txt$|\.json$" | wc -l | xargs echo "   Miscellaneous files:"
echo ""
echo "✨ Core files that should remain in root:"
echo "   • CLAUDE.md"
echo "   • README.md"
echo "   • pyproject.toml"
echo "   • poetry.lock"
echo "   • pytest.ini"
echo "   • tox.ini"
echo "   • mypy.ini"
echo "   • Dockerfile"
echo "   • Jenkinsfile"
echo "   • Configuration files"
echo ""
