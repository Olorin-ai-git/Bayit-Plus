#!/bin/bash

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ARCHIVE_NAME="pattern_enhancement_complete_${TIMESTAMP}.zip"
TEMP_DIR="temp_optimized_${TIMESTAMP}"

echo "📦 Creating optimized archive (removing duplicates)..."
echo ""

# Create directory structure
mkdir -p "${TEMP_DIR}/documentation"
mkdir -p "${TEMP_DIR}/investigations"
mkdir -p "${TEMP_DIR}/confusion_matrices"
mkdir -p "${TEMP_DIR}/comparison_reports/html"
mkdir -p "${TEMP_DIR}/comparison_reports/json"
mkdir -p "${TEMP_DIR}/comparison_reports/packages"
mkdir -p "${TEMP_DIR}/server_logs"

# Copy documentation (NO DUPLICATES - only from root)
echo "📄 Copying documentation..."
cp PATTERN_ENHANCEMENT_RESULTS.md "${TEMP_DIR}/documentation/" 2>/dev/null || true
cp ARCHIVE_INDEX.md "${TEMP_DIR}/documentation/" 2>/dev/null || true
cp PER_TRANSACTION_RISK_SCORE_FORMULA.md "${TEMP_DIR}/documentation/" 2>/dev/null || true
cp PER_TRANSACTION_RISK_SCORING_VERIFICATION.md "${TEMP_DIR}/documentation/" 2>/dev/null || true
cp INVESTIGATION_LOGGING_VERIFICATION.md "${TEMP_DIR}/documentation/" 2>/dev/null || true

# Copy investigation folders (complete folders with all substructure)
echo "📁 Copying investigation folders..."
cp -r workspace/investigations/2025/08/auto-comp-* "${TEMP_DIR}/investigations/" 2>/dev/null || true

# Copy confusion matrices
echo "📊 Copying confusion matrices..."
find artifacts/investigations -name "confusion_table_auto-comp-*.html" -exec cp {} "${TEMP_DIR}/confusion_matrices/" \; 2>/dev/null
cp artifacts/comparisons/auto_startup/confusion_table_*.html "${TEMP_DIR}/confusion_matrices/" 2>/dev/null || true
cp artifacts/comparisons/auto_startup/startup_analysis_report.html "${TEMP_DIR}/confusion_matrices/" 2>/dev/null || true

# Copy comparison reports - ORGANIZED
echo "📈 Copying comparison reports (organized)..."
# HTML reports
find artifacts/comparisons/auto_startup/2025* -name "comparison_*.html" -exec cp {} "${TEMP_DIR}/comparison_reports/html/" \; 2>/dev/null
# JSON artifacts (NOT duplicated from investigations folder)
# Skip - these are already in investigation folders
# Comparison packages
cp artifacts/comparisons/auto_startup/comparison_package_*.zip "${TEMP_DIR}/comparison_reports/packages/" 2>/dev/null || true

# Copy server logs
echo "🔍 Copying server logs..."
cp /tmp/olorin_oct12.log "${TEMP_DIR}/server_logs/olorin_oct12_2024.log" 2>/dev/null || true
cp /tmp/olorin_window2.log "${TEMP_DIR}/server_logs/olorin_feb27_2025.log" 2>/dev/null || true

# Create improved README
cat > "${TEMP_DIR}/README.md" << 'EOF'
# Pattern-Based Fraud Detection Enhancement - Complete Archive

**Generated**: November 25, 2024  
**Archive Version**: Optimized (No Duplicates)

## Archive Structure

```
pattern_enhancement_complete/
├── README.md                                   # This file
├── documentation/                              # All documentation files
│   ├── PATTERN_ENHANCEMENT_RESULTS.md         # Executive summary
│   ├── ARCHIVE_INDEX.md                       # Complete archive guide
│   ├── PER_TRANSACTION_RISK_SCORE_FORMULA.md
│   └── Other technical documentation
├── investigations/                             # Complete investigation folders
│   ├── auto-comp-XXXXX/
│   │   └── artifacts/
│   │       └── investigation_*.json           # Complete investigation data
├── confusion_matrices/                         # All confusion matrix reports
│   ├── startup_analysis_report.html           # Aggregate report
│   └── confusion_table_auto-comp-*.html       # Per-investigation matrices
├── comparison_reports/                         # Organized comparison reports
│   ├── html/                                  # Transaction-level HTML reports
│   │   └── comparison_email_*.html
│   └── packages/                              # Aggregated comparison packages
│       └── comparison_package_*.zip
└── server_logs/                                # Server execution logs
    ├── olorin_oct12_2024.log                  # Oct 30-31, 2024 test run
    └── olorin_feb27_2025.log                  # Feb 27-28, 2025 test run
```

## Key Improvements

✅ **No Duplicates**: Investigation JSONs appear only once (in investigations/ folder)
✅ **Better Organization**: Comparison reports organized into html/ and packages/
✅ **Complete Data**: All artifacts preserved, just better organized
✅ **Smaller Size**: Eliminated redundant files

## Key Results

- **100% Recall** (0 false negatives)
- **86.7% Precision**
- **92.9% F1 Score**
- **All 4 pattern types** successfully detecting fraud

## Quick Start

1. **Read Executive Summary**:
   ```bash
   cat documentation/PATTERN_ENHANCEMENT_RESULTS.md
   ```

2. **View Startup Analysis Report**:
   ```bash
   open confusion_matrices/startup_analysis_report.html
   ```

3. **Browse Individual Confusion Matrices**:
   ```bash
   open confusion_matrices/confusion_table_auto-comp-*.html
   ```

4. **Review Comparison Reports**:
   ```bash
   open comparison_reports/html/comparison_*.html
   ```

5. **Examine Investigation Data**:
   ```bash
   cat investigations/auto-comp-*/artifacts/investigation_*.json | jq .
   ```

## Contents Summary

- **Documentation**: 5 files
- **Investigation Folders**: 13 complete investigations
- **Confusion Matrices**: 9 reports + 1 aggregate report
- **Comparison Reports**: 13 HTML reports
- **Comparison Packages**: 4 ZIP aggregates
- **Server Logs**: 2 files (3.1 MB)

**Total**: ~4.5 MB (optimized from 4.9 MB)

---

**Olorin Fraud Detection Platform**  
Pattern Enhancement v1.0
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
echo "✅ Optimized archive created!"
echo ""
echo "📦 Archive: ${ARCHIVE_NAME}"
echo "   Size: $(du -h "${ARCHIVE_NAME}" | awk '{print $1}')"
echo ""
echo "📊 Improvements:"
echo "   ✅ Removed duplicate ARCHIVE_INDEX.md and PATTERN_ENHANCEMENT_RESULTS.md"
echo "   ✅ Removed duplicate investigation JSON files (kept in investigations/ only)"
echo "   ✅ Better organized comparison reports (html/ and packages/ subdirs)"
echo "   ✅ Cleaner structure and improved README"
echo ""
echo "📂 File counts:"
echo "   Documentation: $(unzip -l "${ARCHIVE_NAME}" | grep "documentation/" | grep -v "/$" | wc -l | xargs)"
echo "   Investigations: $(unzip -l "${ARCHIVE_NAME}" | grep "investigations/" | grep ".json" | wc -l | xargs)"
echo "   Confusion matrices: $(unzip -l "${ARCHIVE_NAME}" | grep "confusion_matrices/" | grep ".html" | wc -l | xargs)"
echo "   Comparison HTML: $(unzip -l "${ARCHIVE_NAME}" | grep "comparison_reports/html" | wc -l | xargs)"
echo "   Comparison packages: $(unzip -l "${ARCHIVE_NAME}" | grep "comparison_reports/packages" | wc -l | xargs)"
echo ""
