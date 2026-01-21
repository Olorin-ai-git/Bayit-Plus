#!/bin/bash

# TypeScript File Corruption Recovery Script
# Fixes systematic corruption patterns in CVPlus codebase
#
# Author: Gil Klainert
# Version: 1.0.0

set -e

PACKAGES_DIR="../packages"
TOTAL_FILES=0
FIXED_FILES=0
JSDOC_FIXES=0
TSIGNORE_FIXES=0

echo "🔧 Starting TypeScript file corruption recovery..."
echo "📁 Scanning packages directory: $PACKAGES_DIR"
echo ""

# Create backup directory
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Function to fix JSDoc corruption
fix_jsdoc_corruption() {
    local file="$1"
    local temp_file="${file}.tmp"

    # Fix /**/** at start of lines to /**
    if sed 's|^\([[:space:]]*\)/\*\*/\*\*|\1/**|g' "$file" > "$temp_file"; then
        if ! cmp -s "$file" "$temp_file"; then
            cp "$file" "$BACKUP_DIR/$(basename "$file").jsdoc.backup"
            mv "$temp_file" "$file"
            ((JSDOC_FIXES++))
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

# Function to fix @ts-ignore corruption
fix_tsignore_corruption() {
    local file="$1"
    local temp_file="${file}.tmp"

    # Remove duplicate @ts-ignore comments on the same line
    if sed 's|\(// @ts-ignore[^/]*\)\(// @ts-ignore[^/]*\)*|\1|g' "$file" > "$temp_file"; then
        if ! cmp -s "$file" "$temp_file"; then
            cp "$file" "$BACKUP_DIR/$(basename "$file").tsignore.backup"
            mv "$temp_file" "$file"
            ((TSIGNORE_FIXES++))
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

    # Fix JSDoc corruption
    if fix_jsdoc_corruption "$file"; then
        file_fixed=true
    fi

    # Fix @ts-ignore corruption
    if fix_tsignore_corruption "$file"; then
        file_fixed=true
    fi

    if $file_fixed; then
        ((FIXED_FILES++))
        echo "✅ Fixed: $(basename "$file")"
    fi
}

# Find and process all TypeScript files
echo "🔍 Finding TypeScript files..."

# Use find to locate all .ts files in packages directory
while IFS= read -r -d '' file; do
    # Skip node_modules, dist, build directories
    if [[ "$file" == *"/node_modules/"* ]] ||
       [[ "$file" == *"/dist/"* ]] ||
       [[ "$file" == *"/build/"* ]] ||
       [[ "$file" == *"/.git/"* ]]; then
        continue
    fi

    process_file "$file"

    # Progress indicator every 50 files
    if ((TOTAL_FILES % 50 == 0)); then
        echo "📊 Progress: $TOTAL_FILES files processed, $FIXED_FILES fixed"
    fi

done < <(find "$PACKAGES_DIR" -name "*.ts" -type f -print0 2>/dev/null)

# Print final statistics
echo ""
echo "=========================================="
echo "📊 CORRUPTION RECOVERY STATISTICS"
echo "=========================================="
echo "📁 Total files scanned: $TOTAL_FILES"
echo "✅ Total files fixed: $FIXED_FILES"
echo "📝 JSDoc corruptions fixed: $JSDOC_FIXES"
echo "🔧 @ts-ignore corruptions fixed: $TSIGNORE_FIXES"
echo "💾 Backups stored in: $BACKUP_DIR"

if ((FIXED_FILES > 0)); then
    echo ""
    echo "🎉 Corruption recovery completed successfully!"
    echo "💡 Original files backed up with timestamps"
else
    echo ""
    echo "✨ No corruption detected - all files are clean!"
fi

echo ""
echo "🧪 Testing TypeScript compilation..."

# Test compilation
if npm run build > /dev/null 2>&1; then
    echo "✅ TypeScript compilation successful!"
else
    echo "⚠️  Some compilation errors remain - running diagnostic..."
    echo "   First 20 errors:"
    npm run build 2>&1 | head -20
fi

echo ""
echo "🔧 File corruption recovery completed."