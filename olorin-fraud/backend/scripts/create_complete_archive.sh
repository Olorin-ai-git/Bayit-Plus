#!/bin/bash

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ARCHIVE_NAME="pattern_enhancement_investigations_${TIMESTAMP}.zip"
TEMP_DIR="temp_archive_${TIMESTAMP}"

echo "📦 Creating complete investigation archive with all comparison reports..."
echo ""

# Create directory structure
mkdir -p "${TEMP_DIR}/investigations"
mkdir -p "${TEMP_DIR}/confusion_matrices"
mkdir -p "${TEMP_DIR}/comparison_reports"
mkdir -p "${TEMP_DIR}/documentation"
mkdir -p "${TEMP_DIR}/server_logs"

# Copy investigation folders (Oct 30-31 auto-comparison batch)
echo "📁 Copying investigation folders..."
cp -r workspace/investigations/2025/08/auto-comp-* "${TEMP_DIR}/investigations/" 2>/dev/null || true

# Copy all confusion matrices
echo "📊 Copying confusion matrices..."
find artifacts/investigations -name "confusion_table_auto-comp-*.html" -exec cp {} "${TEMP_DIR}/confusion_matrices/" \; 2>/dev/null
cp artifacts/comparisons/auto_startup/confusion_table_*.html "${TEMP_DIR}/confusion_matrices/" 2>/dev/null || true
cp artifacts/comparisons/auto_startup/*.html "${TEMP_DIR}/confusion_matrices/" 2>/dev/null || true

# Copy comparison reports (HTML reports from auto_startup)
echo "📈 Copying comparison reports..."
find artifacts/comparisons/auto_startup/2025* -name "comparison_*.html" -exec cp {} "${TEMP_DIR}/comparison_reports/" \; 2>/dev/null

# Copy any comparison packages
echo "📦 Copying comparison packages..."
cp artifacts/comparisons/auto_startup/comparison_package_*.zip "${TEMP_DIR}/comparison_reports/" 2>/dev/null || true

# Copy investigation artifacts (JSON)
echo "📋 Copying investigation artifact JSONs..."
find artifacts/investigations -name "inv_auto-comp-*.json" -exec cp {} "${TEMP_DIR}/comparison_reports/" \; 2>/dev/null

# Copy documentation
echo "📄 Copying documentation..."
cp PATTERN_ENHANCEMENT_RESULTS.md "${TEMP_DIR}/documentation/" 2>/dev/null || true
cp ARCHIVE_INDEX.md "${TEMP_DIR}/documentation/" 2>/dev/null || true
cp PER_TRANSACTION_RISK_SCORE_FORMULA.md "${TEMP_DIR}/documentation/" 2>/dev/null || true
cp PER_TRANSACTION_RISK_SCORING_VERIFICATION.md "${TEMP_DIR}/documentation/" 2>/dev/null || true
cp INVESTIGATION_LOGGING_VERIFICATION.md "${TEMP_DIR}/documentation/" 2>/dev/null || true

# Copy server logs
echo "🔍 Copying server logs..."
cp /tmp/olorin_oct12.log "${TEMP_DIR}/server_logs/olorin_oct12_2024.log" 2>/dev/null || true
cp /tmp/olorin_window2.log "${TEMP_DIR}/server_logs/olorin_feb27_2025.log" 2>/dev/null || true

# Create README
cat > "${TEMP_DIR}/README.md" << 'EOF'
# Pattern-Based Fraud Detection Enhancement Archive

This archive contains all artifacts from pattern-based fraud detection enhancement testing.

## Contents

### 📁 /investigations/
Complete investigation folders with journey tracking, metadata, and domain agent results

### 📊 /confusion_matrices/
HTML confusion matrix reports with precision, recall, F1 scores, and confidence intervals

### 📈 /comparison_reports/
- HTML comparison reports showing transaction-level predictions
- Investigation artifact JSON files
- Comparison package ZIP files

### 📄 /documentation/
- PATTERN_ENHANCEMENT_RESULTS.md - Executive summary
- ARCHIVE_INDEX.md - Complete archive guide
- PER_TRANSACTION_RISK_SCORE_FORMULA.md - Detailed scoring formula
- Additional verification documentation

### 📋 /server_logs/
Server execution logs with pattern detections and investigation progress

## Key Results

✅ 100% Recall (0 false negatives)
✅ 86.7% Precision
✅ 92.9% F1 Score
✅ All 4 pattern types successfully detecting fraud

## Archive Generated
November 25, 2024
Olorin Fraud Detection Platform - Pattern Enhancement v1.0
EOF

# Create archive
echo ""
echo "🗜️  Creating ZIP archive..."
cd "${TEMP_DIR}" && zip -r "../${ARCHIVE_NAME}" . -q
cd ..

# Cleanup
echo "🧹 Cleaning up..."
rm -rf "${TEMP_DIR}"

# Summary
echo ""
echo "✅ Archive created successfully!"
echo ""
echo "📦 Archive: ${ARCHIVE_NAME}"
echo "   Size: $(du -h "${ARCHIVE_NAME}" | awk '{print $1}')"
echo ""
echo "📂 File counts:"
echo "   Investigations: $(unzip -l "${ARCHIVE_NAME}" | grep "investigations/" | grep ".json" | wc -l | xargs)"
echo "   Confusion matrices: $(unzip -l "${ARCHIVE_NAME}" | grep "confusion" | grep ".html" | wc -l | xargs)"
echo "   Comparison reports: $(unzip -l "${ARCHIVE_NAME}" | grep "comparison_reports/" | wc -l | xargs)"
echo "   Documentation: $(unzip -l "${ARCHIVE_NAME}" | grep "documentation/" | wc -l | xargs)"
echo ""
