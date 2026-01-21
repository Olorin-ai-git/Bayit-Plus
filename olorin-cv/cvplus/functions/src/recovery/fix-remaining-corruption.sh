#!/bin/bash

# Fix Remaining TypeScript File Corruption
# Addresses merged @ts-ignore and JSDoc comment patterns
#
# Author: Gil Klainert
# Version: 1.0.0

set -e

PACKAGES_DIR="../packages"
TOTAL_FILES=0
FIXED_FILES=0

echo "🔧 Fixing remaining TypeScript corruption patterns..."
echo "📁 Scanning packages directory: $PACKAGES_DIR"
echo ""

# Create backup directory
BACKUP_DIR="./backups/remaining_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Function to fix merged @ts-ignore and JSDoc corruption
fix_merged_comments() {
    local file="$1"
    local temp_file="${file}.tmp"

    # Fix pattern: "// @ts-ignore - Export conflicts/**" to proper separation
    if sed '
        s|^// @ts-ignore - Export conflicts/\*\*|// @ts-ignore - Export conflicts\n/**|g
        s|^// @ts-ignore[^/]*/\*\*|// @ts-ignore\n/**|g
    ' "$file" > "$temp_file"; then
        if ! cmp -s "$file" "$temp_file"; then
            cp "$file" "$BACKUP_DIR/$(basename "$file").merged.backup"
            mv "$temp_file" "$file"
            return 0
        else
            rm "$temp_file"
            return 1
        fi
    else
        rm -f "$temp_file"
        return 1
    fi
}

# Function to process a single file
process_file() {
    local file="$1"
    local file_fixed=false

    ((TOTAL_FILES++))

    # Skip if file doesn't exist
    if [[ ! -f "$file" ]]; then
        echo "⚠️  File not found: $file"
        return
    fi

    # Fix merged comment corruption
    if fix_merged_comments "$file"; then
        file_fixed=true
    fi

    if $file_fixed; then
        ((FIXED_FILES++))
        echo "✅ Fixed: $(basename "$file")"
    fi
}

# Find and process TypeScript files that still have corruption
echo "🔍 Finding files with merged comment corruption..."

# Look for specific corruption pattern
while IFS= read -r -d '' file; do
    # Skip node_modules, dist, build directories
    if [[ "$file" == *"/node_modules/"* ]] ||
       [[ "$file" == *"/dist/"* ]] ||
       [[ "$file" == *"/build/"* ]] ||
       [[ "$file" == *"/.git/"* ]]; then
        continue
    fi

    # Check if file contains the specific corruption pattern
    if grep -q "^// @ts-ignore.*/*\*" "$file" 2>/dev/null; then
        process_file "$file"
    fi

    # Progress indicator every 100 files
    if ((TOTAL_FILES % 100 == 0)) && ((TOTAL_FILES > 0)); then
        echo "📊 Progress: $TOTAL_FILES files checked, $FIXED_FILES fixed"
    fi

done < <(find "$PACKAGES_DIR" -name "*.ts" -type f -print0 2>/dev/null)

# Print final statistics
echo ""
echo "=========================================="
echo "📊 REMAINING CORRUPTION FIX STATISTICS"
echo "=========================================="
echo "📁 Total files checked: $TOTAL_FILES"
echo "✅ Total files fixed: $FIXED_FILES"
echo "💾 Backups stored in: $BACKUP_DIR"

if ((FIXED_FILES > 0)); then
    echo ""
    echo "🎉 Remaining corruption fixed successfully!"
    echo "💡 Original files backed up"
else
    echo ""
    echo "✨ No additional corruption found!"
fi

echo ""
echo "🧪 Testing TypeScript compilation..."

# Test compilation
if npm run build > /dev/null 2>&1; then
    echo "✅ TypeScript compilation successful!"
else
    echo "⚠️  Some compilation errors remain - checking details..."
    # Show first few errors for diagnosis
    npm run build 2>&1 | head -30
fi

echo ""
echo "🔧 Remaining corruption fix completed."