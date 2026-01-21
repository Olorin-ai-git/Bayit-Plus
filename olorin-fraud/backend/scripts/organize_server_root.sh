#!/bin/bash

echo "📁 Organizing server root directory..."
echo ""

# Create necessary directories
mkdir -p docs/implementation
mkdir -p docs/analysis
mkdir -p docs/debugging
mkdir -p docs/testing
mkdir -p docs/verification
mkdir -p scripts/monitoring
mkdir -p artifacts/reports

# Move implementation/status documents
echo "📋 Moving implementation documents..."
mv COMPOSIO_* docs/implementation/ 2>/dev/null
mv PHASE10_COMPLETION_SUMMARY.md docs/implementation/ 2>/dev/null
mv PRIVATE_KEY_AUTH_SUMMARY.md docs/implementation/ 2>/dev/null
mv CONFUSION_MATRIX_IMPLEMENTATION_REPORT.md docs/implementation/ 2>/dev/null

# Move analysis documents
echo "🔍 Moving analysis documents..."
mv FRAUD_DETECTION_PIPELINE_EXPLAINED.md docs/analysis/ 2>/dev/null
mv FRAUD_INVESTIGATION_ANALYSIS.md docs/analysis/ 2>/dev/null
mv INVESTIGATION_ANALYSIS_SUMMARY.md docs/analysis/ 2>/dev/null
mv LIVE_INVESTIGATION_ANALYSIS.md docs/analysis/ 2>/dev/null
mv FALSE_NEGATIVES_ANALYSIS.md docs/analysis/ 2>/dev/null
mv investigation_flow_analysis.md docs/analysis/ 2>/dev/null
mv snowflake_data_logging_scan.md docs/analysis/ 2>/dev/null

# Move debugging/fixing documents  
echo "🐛 Moving debugging documents..."
mv confirmed_fraud_fixes_debug_report.md docs/debugging/ 2>/dev/null
mv confirmed_fraud_fixes_summary.md docs/debugging/ 2>/dev/null
mv debug_execution_trace.md docs/debugging/ 2>/dev/null
mv domain_regression_fixes_summary.md docs/debugging/ 2>/dev/null
mv DATABASE_QUERY_CONTEXT_FIX.md docs/debugging/ 2>/dev/null

# Move testing/verification documents
echo "✅ Moving verification documents..."
mv INVESTIGATION_LOGGING_VERIFICATION.md docs/verification/ 2>/dev/null
mv PER_TRANSACTION_RISK_SCORING_VERIFICATION.md docs/verification/ 2>/dev/null
mv IS_FRAUD_TX_VERIFICATION.md docs/verification/ 2>/dev/null
mv final_validation_report.md docs/verification/ 2>/dev/null
mv pipeline_verification_report.md docs/verification/ 2>/dev/null

# Move testing documents
echo "🧪 Moving testing documents..."
mv RISK_ANALYZER_TEST_SUMMARY.md docs/testing/ 2>/dev/null
mv ENHANCED_FRAUD_DETECTION_RESULTS.md docs/testing/ 2>/dev/null
mv FINAL_OPTIMIZATION_RESULTS.md docs/testing/ 2>/dev/null
mv SYSTEMATIC_TESTING_OPTIMIZATION_SUMMARY.md docs/testing/ 2>/dev/null

# Move investigation documents
echo "📊 Moving investigation documents..."
mv IS_FRAUD_TX_INVESTIGATION.md docs/analysis/ 2>/dev/null
mv RISK_ANALYZER_14D_UPDATE.md docs/implementation/ 2>/dev/null
mv SCAN_RESULTS.md docs/verification/ 2>/dev/null

# Move formula/reference documents to docs/technical
mkdir -p docs/technical
echo "📐 Moving technical documents..."
mv PER_TRANSACTION_RISK_SCORE_FORMULA.md docs/technical/ 2>/dev/null

# Move monitoring scripts
echo "🔧 Moving scripts..."
mv analyze_results.sh scripts/monitoring/ 2>/dev/null
mv monitor_pipeline.sh scripts/monitoring/ 2>/dev/null

# Move HTML reports
echo "📄 Moving HTML reports..."
mv olorin_fraud_report_with_logo.html artifacts/reports/ 2>/dev/null

echo ""
echo "✅ Organization complete!"
echo ""
echo "📂 Summary:"
echo "   docs/implementation/  - Implementation and status documents"
echo "   docs/analysis/        - Analysis and investigation documents"
echo "   docs/debugging/       - Debugging and fix documents"
echo "   docs/testing/         - Testing and optimization documents"
echo "   docs/verification/    - Verification and validation documents"
echo "   docs/technical/       - Technical formulas and references"
echo "   scripts/monitoring/   - Monitoring and analysis scripts"
echo "   artifacts/reports/    - HTML reports and artifacts"
echo ""
echo "📋 Files remaining in root:"
ls -1 *.md 2>/dev/null | wc -l | xargs echo "   Markdown files:"
echo ""
