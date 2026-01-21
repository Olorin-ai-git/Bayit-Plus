#!/bin/bash

# CVPlus Duplicate File Finder
# Systematically identifies all duplicate files across submodules

echo "========================================"
echo "CVPlus Duplicate File Analysis"
echo "========================================"
echo "$(date)"
echo ""

# Create output directory
mkdir -p /tmp/cvplus-duplicates
OUTPUT_DIR="/tmp/cvplus-duplicates"

echo "🔍 Phase 1: Finding all TypeScript/JavaScript files..."
find packages -name "*.ts" -o -name "*.js" | grep -v node_modules > "$OUTPUT_DIR/all-files.txt"
TOTAL_FILES=$(wc -l < "$OUTPUT_DIR/all-files.txt")
echo "Found $TOTAL_FILES total files"
echo ""

echo "🔍 Phase 2: Extracting file names and finding duplicates..."
# Extract just the filenames and count duplicates
sed 's|.*/||' "$OUTPUT_DIR/all-files.txt" | sort | uniq -c | sort -nr > "$OUTPUT_DIR/filename-counts.txt"

# Show files that appear more than once
echo "Files with duplicates (count > 1):"
awk '$1 > 1 { print $1 " duplicates: " $2 }' "$OUTPUT_DIR/filename-counts.txt" > "$OUTPUT_DIR/duplicates-summary.txt"
cat "$OUTPUT_DIR/duplicates-summary.txt"
echo ""

echo "🔍 Phase 3: Detailed duplicate analysis..."
# For each duplicate, show all locations
while read -r count filename; do
    if [ "$count" -gt 1 ] && [ "$filename" != "index.ts" ] && [ "$filename" != "types.ts" ]; then
        echo "=== $filename ($count duplicates) ===" >> "$OUTPUT_DIR/detailed-duplicates.txt"
        grep "/$filename$" "$OUTPUT_DIR/all-files.txt" >> "$OUTPUT_DIR/detailed-duplicates.txt"
        echo "" >> "$OUTPUT_DIR/detailed-duplicates.txt"
    fi
done < "$OUTPUT_DIR/filename-counts.txt"

echo "🔍 Phase 4: Critical service duplicates..."
echo "Critical duplicates found:"

# Rate limiting services
echo "Rate Limiting Services:" | tee "$OUTPUT_DIR/critical-services.txt"
find packages -name "*rate-limit*" -type f | grep -v node_modules | tee -a "$OUTPUT_DIR/critical-services.txt"
echo ""

# Cache services
echo "Cache Services:" | tee -a "$OUTPUT_DIR/critical-services.txt"
find packages -name "*cache*.service.ts" -type f | grep -v node_modules | tee -a "$OUTPUT_DIR/critical-services.txt"
echo ""

# Base services
echo "Base Services:" | tee -a "$OUTPUT_DIR/critical-services.txt"
find packages -name "*base-service*" -type f | grep -v node_modules | tee -a "$OUTPUT_DIR/critical-services.txt"
echo ""

# Service registries
echo "Service Registries:" | tee -a "$OUTPUT_DIR/critical-services.txt"
find packages -name "*service-registry*" -type f | grep -v node_modules | tee -a "$OUTPUT_DIR/critical-services.txt"
echo ""

# Validation services
echo "Validation Services:" | tee -a "$OUTPUT_DIR/critical-services.txt"
find packages -name "*validation*.service.ts" -type f | grep -v node_modules | tee -a "$OUTPUT_DIR/critical-services.txt"
echo ""

# Analytics services
echo "Analytics Services:" | tee -a "$OUTPUT_DIR/critical-services.txt"
find packages -name "*analytics*.service.ts" -type f | grep -v node_modules | tee -a "$OUTPUT_DIR/critical-services.txt"
echo ""

# Logger utilities
echo "Logger Utilities:" | tee -a "$OUTPUT_DIR/critical-services.txt"
find packages -name "logger.ts" -type f | grep -v node_modules | tee -a "$OUTPUT_DIR/critical-services.txt"
echo ""

echo "🔍 Phase 5: Security-related duplicates..."
echo "Security-related files:" | tee "$OUTPUT_DIR/security-files.txt"
find packages -path "*/security/*" -name "*.ts" | grep -v node_modules | tee -a "$OUTPUT_DIR/security-files.txt"
find packages -name "*security*" -name "*.ts" | grep -v node_modules | tee -a "$OUTPUT_DIR/security-files.txt"
find packages -name "*auth*" -name "*.ts" | grep -v node_modules | grep -v "__tests__" | tee -a "$OUTPUT_DIR/security-files.txt"
echo ""

echo "🔍 Phase 6: Performance-related duplicates..."
echo "Performance-related files:" | tee "$OUTPUT_DIR/performance-files.txt"
find packages -name "*performance*" -name "*.ts" | grep -v node_modules | tee -a "$OUTPUT_DIR/performance-files.txt"
find packages -name "*monitor*" -name "*.ts" | grep -v node_modules | tee -a "$OUTPUT_DIR/performance-files.txt"
echo ""

echo "🔍 Phase 7: Module-specific analysis..."
echo "Analyzing duplicates by module ownership..."

# Analyze which modules have the most duplicates
echo "Module with most potential consolidation targets:" | tee "$OUTPUT_DIR/module-analysis.txt"
echo "Core module files (should be imported by others):" | tee -a "$OUTPUT_DIR/module-analysis.txt"
find packages/core -name "*.ts" | grep -v node_modules | grep -E "(service|util|base)" | tee -a "$OUTPUT_DIR/module-analysis.txt"
echo ""

echo "Files that might belong in core:" | tee -a "$OUTPUT_DIR/module-analysis.txt"
grep -E "(base-service|service-registry|cache\.service|validation\.service|logger)" "$OUTPUT_DIR/all-files.txt" | tee -a "$OUTPUT_DIR/module-analysis.txt"
echo ""

echo "========================================"
echo "Analysis Complete!"
echo "========================================"
echo "Results saved to: $OUTPUT_DIR/"
echo ""
echo "Key files created:"
echo "- $OUTPUT_DIR/duplicates-summary.txt - High-level duplicate count"
echo "- $OUTPUT_DIR/detailed-duplicates.txt - Full paths for all duplicates"
echo "- $OUTPUT_DIR/critical-services.txt - Critical infrastructure duplicates"
echo "- $OUTPUT_DIR/security-files.txt - Security-related files"
echo "- $OUTPUT_DIR/performance-files.txt - Performance-related files"
echo "- $OUTPUT_DIR/module-analysis.txt - Module ownership analysis"
echo ""

# Summary statistics
TOTAL_DUPLICATES=$(awk '$1 > 1 { count++ } END { print count+0 }' "$OUTPUT_DIR/filename-counts.txt")
CRITICAL_DUPLICATES=$(grep -c "\.service\.ts" "$OUTPUT_DIR/critical-services.txt" || echo "0")

echo "📊 Summary Statistics:"
echo "- Total files analyzed: $TOTAL_FILES"
echo "- Files with duplicates: $TOTAL_DUPLICATES"
echo "- Critical service duplicates: $CRITICAL_DUPLICATES"
echo ""

echo "🚨 Next Steps:"
echo "1. Review critical-services.txt for immediate consolidation targets"
echo "2. Start with rate-limit-guard.service.ts (security critical)"
echo "3. Follow with base-service.ts (architectural foundation)"
echo "4. Consolidate cache services (performance impact)"
echo ""

echo "⚠️  IMPORTANT: Always get user approval before deleting any files!"