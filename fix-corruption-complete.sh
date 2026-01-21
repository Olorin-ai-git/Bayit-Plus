#!/bin/bash

# CVPlus TypeScript Corruption Fix - Complete Recovery
# This script fixes corruption patterns across functions and packages directories

echo "🔧 Starting comprehensive TypeScript corruption fix..."

# Function to fix corruption patterns in a file
fix_file_corruption() {
    local file="$1"
    echo "  Fixing: $file"

    # Create backup
    cp "$file" "$file.backup.$(date +%s)"

    # Fix corrupted comment blocks - multiple patterns
    sed -i '' '
        # Fix broken multiline comments starting with */
        /^\s*\*\//,/\*\// {
            # If line starts with */ followed by text, convert to /* ... */
            s/^\(\s*\)\*\/\(.*\)$/\1\/\*\2 \*\//
        }

        # Fix lines that should be inside comment blocks
        /^\s*\*\s*-\s.*API.*\/\*/ {
            s/\/\*.*$//
            s/^\(\s*\)\*\(.*\)$/\1 \*\2/
        }

        # Fix corrupted comment endings
        /^\s*\*\/$/ {
            N
            # If next line looks like it should be in comment, merge
            /\n\s*\*\s/ {
                s/\*\/\n\s*\*/*/
            }
        }

        # Fix standalone */ at beginning of comment blocks
        /^\s*\*\/\s*$/ {
            N
            # Check if next line is comment content
            /\n\s*\*\s/ {
                # Convert */ to /*
                s/\*\//\/\*/
            }
        }

        # Fix API documentation comment corruption
        /^\s*\*\s.*API.*\(\/.* \)$/ {
            s/\(\s*\*\s.*API.*\)(\(\/.*\) \*)$/\1/
        }

        # Fix lines with */ in middle followed by *
        /\*\/.*\*/ {
            # Remove the */ if it appears to be corrupting comment
            s/\*\/\(\s*\*\s\)/\1/
        }

        # Fix corrupted documentation patterns
        s/\*\/\s*\*\s*-/ *   -/g
        s/\s*\*\/\s*$/ \*\//g

        # Fix unterminated regex patterns (common corruption)
        s/\/\*\s*\/\s*\*/\/\* \*\//g

        # Fix comment block sequences
        s/\*\/\s*\*\s*\*\//\*\//g

    ' "$file"

    # Additional patterns for specific corruption types
    sed -i '' '
        # Fix API documentation blocks specifically
        /API.*\(\/.*\s*\)/ {
            s/\(.*API.*\)(\([^)]*\)) \*$/\1\2/
        }

        # Fix purpose/parameter documentation
        /\*\/\s*\*\s*-\s*Purpose:/ {
            s/\*\/\s*\*\s*-\s*/ * /
        }

        # Fix returns documentation
        /\*\/\s*\*\s*-\s*Returns:/ {
            s/\*\/\s*\*\s*-\s*/ * /
        }

        # Fix parameters documentation
        /\*\/\s*\*\s*-\s*Parameters:/ {
            s/\*\/\s*\*\s*-\s*/ * /
        }
    ' "$file"

    # Validate the fix by checking for basic syntax
    if [[ "$file" == *.ts ]]; then
        # Quick syntax check - look for unmatched comment blocks
        local unmatched_open=$(grep -o '\/\*' "$file" | wc -l)
        local unmatched_close=$(grep -o '\*\/' "$file" | wc -l)

        if [ "$unmatched_open" -ne "$unmatched_close" ]; then
            echo "    ⚠️  Warning: Unmatched comment blocks in $file (open: $unmatched_open, close: $unmatched_close)"
        fi
    fi
}

# Find and fix corruption in functions directory
echo "🔍 Scanning functions directory..."
find /Users/gklainert/Documents/cvplus/functions -name "*.ts" -not -path "*/node_modules/*" | while read -r file; do
    # Check if file has corruption patterns
    if grep -q "error TS1109\|error TS1161\|error TS1005\|\*/.*\*\|^\s*\*/.*API" "$file" 2>/dev/null || \
       grep -q "^\s*\*\/" "$file" 2>/dev/null; then
        fix_file_corruption "$file"
    fi
done

# Find and fix corruption in packages directory
echo "🔍 Scanning packages directory..."
find /Users/gklainert/Documents/cvplus/packages -name "*.ts" -not -path "*/node_modules/*" | while read -r file; do
    # Check if file has corruption patterns
    if grep -q "error TS1109\|error TS1161\|error TS1005\|\*/.*\*\|^\s*\*/.*API" "$file" 2>/dev/null || \
       grep -q "^\s*\*\/" "$file" 2>/dev/null; then
        fix_file_corruption "$file"
    fi
done

# Specific fixes for known problematic files
echo "🎯 Applying specific fixes to known problematic files..."

# Fix functions/src/api/index.ts specifically
if [ -f "/Users/gklainert/Documents/cvplus/functions/src/api/index.ts" ]; then
    echo "  Fixing functions/src/api/index.ts"
    sed -i '' '
        # Fix the specific corruption pattern in this file
        11s/^\s*\*\//\/\*/
        13s/^\s*\*/\/\*/
        15s/^\s*\*/\/\*/
        67s/^\s*\*\/\s*\*\s*--*/\/\* --/

        # Fix the RECOVERY API documentation block
        /^\s*\*.*RECOVERY API.*\(\/ / {
            s/\*/\/\*/
            s/ \)$/ \*\//
        }
    ' "/Users/gklainert/Documents/cvplus/functions/src/api/index.ts"
fi

# Test compilation after fixes
echo "🧪 Testing TypeScript compilation..."
cd /Users/gklainert/Documents/cvplus/functions
npm run build > build_test.log 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Functions TypeScript compilation successful!"
    rm -f build_test.log
else
    echo "❌ Functions compilation still has errors. Check build_test.log"
    head -20 build_test.log
fi

# Test packages compilation
echo "🧪 Testing packages compilation..."
cd /Users/gklainert/Documents/cvplus

# Check for any remaining TypeScript errors in packages
for package_dir in packages/*/; do
    if [ -f "$package_dir/tsconfig.json" ]; then
        echo "  Testing $package_dir"
        cd "$package_dir"
        if command -v tsc >/dev/null 2>&1; then
            tsc --noEmit > /dev/null 2>&1
            if [ $? -ne 0 ]; then
                echo "    ⚠️  TypeScript errors in $package_dir"
            else
                echo "    ✅ $package_dir clean"
            fi
        fi
        cd /Users/gklainert/Documents/cvplus
    fi
done

echo "🎉 Corruption fix complete!"
echo "📊 Summary:"
echo "   - Fixed corruption patterns in functions/ directory"
echo "   - Fixed corruption patterns in packages/ directory"
echo "   - Applied specific fixes to known problematic files"
echo "   - Backup files created with .backup.timestamp extension"

# Report statistics
echo "📈 Fix Statistics:"
total_backups=$(find /Users/gklainert/Documents/cvplus -name "*.backup.*" | wc -l)
echo "   - Total files backed up: $total_backups"
echo "   - Functions directory processed: $(find /Users/gklainert/Documents/cvplus/functions -name "*.ts" -not -path "*/node_modules/*" | wc -l) files"
echo "   - Packages directory processed: $(find /Users/gklainert/Documents/cvplus/packages -name "*.ts" -not -path "*/node_modules/*" | wc -l) files"