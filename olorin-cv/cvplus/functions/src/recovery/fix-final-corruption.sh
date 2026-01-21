#!/bin/bash

# Fix Final TypeScript Comment Corruption Issues
# Addresses unterminated comment blocks and remaining patterns
#
# Author: Gil Klainert
# Version: 1.0.0

set -e

PACKAGES_DIR="../packages"
TOTAL_FILES=0
FIXED_FILES=0

echo "🔧 Fixing final TypeScript comment corruption issues..."
echo "📁 Scanning packages directory: $PACKAGES_DIR"
echo ""

# Create backup directory
BACKUP_DIR="./backups/final_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Function to fix unterminated comment blocks
fix_unterminated_comments() {
    local file="$1"
    local temp_file="${file}.tmp"

    # Fix patterns like '/**/' at end of line to '*/'
    # Fix patterns like '/*' without closing '*/'
    if sed '
        s|/\*\*/|*/|g
        s|/\*\s*\*/\s*$|*/|g
        /\/\*[^*]*$/{
            N
            s|/\*\([^*]*\)\n|/* \1\n */\n|
        }
    ' "$file" > "$temp_file"; then
        if ! cmp -s "$file" "$temp_file"; then
            cp "$file" "$BACKUP_DIR/$(basename "$file").comments.backup"
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

    # Check if file contains patterns that might need fixing
    if grep -q "/\*\*/" "$file" 2>/dev/null ||
       grep -q "/\*[^*]*$" "$file" 2>/dev/null; then

        if fix_unterminated_comments "$file"; then
            file_fixed=true
        fi
    fi

    if $file_fixed; then
        ((FIXED_FILES++))
        echo "✅ Fixed: $(basename "$file")"
    fi
}

# Find TypeScript files in specific problematic locations
echo "🔍 Finding files with comment issues..."

# Process all TypeScript files
while IFS= read -r -d '' file; do
    # Skip node_modules, dist, build directories
    if [[ "$file" == *"/node_modules/"* ]] ||
       [[ "$file" == *"/dist/"* ]] ||
       [[ "$file" == *"/build/"* ]] ||
       [[ "$file" == *"/.git/"* ]]; then
        continue
    fi

    process_file "$file"

    # Progress indicator every 100 files
    if ((TOTAL_FILES % 100 == 0)) && ((TOTAL_FILES > 0)); then
        echo "📊 Progress: $TOTAL_FILES files checked, $FIXED_FILES fixed"
    fi

done < <(find "$PACKAGES_DIR" -name "*.ts" -type f -print0 2>/dev/null)

# Also check the functions directory
while IFS= read -r -d '' file; do
    if [[ "$file" == *"/node_modules/"* ]] ||
       [[ "$file" == *"/dist/"* ]] ||
       [[ "$file" == *"/build/"* ]] ||
       [[ "$file" == *"/.git/"* ]]; then
        continue
    fi

    process_file "$file"

done < <(find "src" -name "*.ts" -type f -print0 2>/dev/null)

# Print final statistics
echo ""
echo "=========================================="
echo "📊 FINAL CORRUPTION FIX STATISTICS"
echo "=========================================="
echo "📁 Total files checked: $TOTAL_FILES"
echo "✅ Total files fixed: $FIXED_FILES"
echo "💾 Backups stored in: $BACKUP_DIR"

if ((FIXED_FILES > 0)); then
    echo ""
    echo "🎉 Final corruption issues fixed!"
    echo "💡 Original files backed up"
else
    echo ""
    echo "✨ No additional comment corruption found!"
fi

echo ""
echo "🔧 Final corruption fix completed."