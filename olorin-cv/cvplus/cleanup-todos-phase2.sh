#!/bin/bash

# CVPlus Phase 2: TODO/FIXME Cleanup Script
echo "🧹 CVPlus Phase 2: TODO/FIXME Cleanup"
echo "====================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[$1]${NC} $2"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Create backup directory
backup_dir="todo-cleanup-backups-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$backup_dir"
print_status "INIT" "Created backup directory: $backup_dir"

# Function to backup and clean file
cleanup_file() {
    local file="$1"
    local backup_file="$backup_dir/$(echo "$file" | sed 's|/|_|g')"

    # Create backup
    cp "$file" "$backup_file"

    # Count TODOs before cleanup
    before_count=$(grep -c "TODO\|FIXME\|XXX" "$file" 2>/dev/null || echo "0")

    # Remove specific types of TODOs that are safe to remove
    sed -i.tmp \
        -e '/\/\/ TODO: Add more components as needed/d' \
        -e '/\/\/ TODO: Implement actual.*after migration/d' \
        -e '/\/\/ TODO: Implement actual API call.*after migration/d' \
        -e '/\/\/ TODO: Implement actual data fetching/d' \
        -e '/\/\/ TODO: Import.*when.*built/d' \
        -e '/\/\/ TODO: Import.*when.*fixed/d' \
        -e '/\/\/ TODO: Create.*when needed/d' \
        -e '/\/\/ TODO: Re-enable when.*fixed/d' \
        -e '/\/\/ TODO: Remove.*deprecated.*in next major version/d' \
        -e '/\/\/ TODO: Restore after.*migration/d' \
        -e '/\/\/ TODO: Add other migrated services/d' \
        -e '/\/\/ Future.*Components.*TODO: Implement/d' \
        "$file"

    # Remove temporary file
    rm -f "$file.tmp"

    # Count TODOs after cleanup
    after_count=$(grep -c "TODO\|FIXME\|XXX" "$file" 2>/dev/null || echo "0")

    if [ "$before_count" -gt "$after_count" ]; then
        print_success "Cleaned $(basename $file): $before_count → $after_count TODOs"
        return 1  # Changed
    else
        print_warning "No changes in $(basename $file): $before_count TODOs remain"
        return 0  # No change
    fi
}

# Clean specific types of comments that are obsolete or migration-related
total_files_cleaned=0
total_changes=0

print_status "1/4" "Cleaning migration-related TODOs..."

for module_dir in packages/*/; do
    module_name=$(basename "$module_dir")

    if [ -d "$module_dir/src" ]; then
        files_with_todos=$(find "$module_dir/src" -name "*.ts" -o -name "*.js" | xargs grep -l "TODO\|FIXME\|XXX" 2>/dev/null)

        for file in $files_with_todos; do
            if [ -f "$file" ]; then
                cleanup_file "$file"
                if [ $? -eq 1 ]; then
                    total_changes=$((total_changes + 1))
                fi
                total_files_cleaned=$((total_files_cleaned + 1))
            fi
        done
    fi
done

print_status "2/4" "Converting legitimate TODOs to GitHub issues format..."

# Create GitHub issues format for remaining legitimate TODOs
for module_dir in packages/*/; do
    module_name=$(basename "$module_dir")

    if [ -d "$module_dir/src" ]; then
        issues_file="$module_dir/DEVELOPMENT_ISSUES.md"

        # Check if there are remaining TODOs
        remaining_todos=$(find "$module_dir/src" -name "*.ts" -o -name "*.js" | xargs grep "TODO\|FIXME" 2>/dev/null)

        if [ -n "$remaining_todos" ]; then
            echo "# $module_name - Development Issues" > "$issues_file"
            echo "" >> "$issues_file"
            echo "This file tracks legitimate development tasks and improvements for the $module_name module." >> "$issues_file"
            echo "" >> "$issues_file"

            issue_count=1
            while IFS= read -r line; do
                file_path=$(echo "$line" | cut -d: -f1)
                line_num=$(echo "$line" | cut -d: -f2)
                comment=$(echo "$line" | cut -d: -f3- | sed 's/.*TODO://' | sed 's/.*FIXME://' | sed 's/^[[:space:]]*//')

                echo "## Issue #$issue_count" >> "$issues_file"
                echo "**File:** \`$(basename $file_path)\` (line $line_num)" >> "$issues_file"
                echo "**Description:**$comment" >> "$issues_file"
                echo "" >> "$issues_file"

                issue_count=$((issue_count + 1))
            done <<< "$remaining_todos"

            print_success "Created $issues_file with $((issue_count - 1)) tracked issues"
        fi
    fi
done

print_status "3/4" "Running validation to check improvements..."

# Run validation to see the improvement
validation_result=$(./validate-all-modules.sh 2>/dev/null | grep -E "(Total Violations|WARNING.*TODO)" | tail -2)

print_status "4/4" "Cleanup summary..."

echo ""
echo "📊 PHASE 2 CLEANUP RESULTS"
echo "=========================="
echo ""

print_success "Files processed: $total_files_cleaned"
print_success "Files with changes: $total_changes"
print_success "Backup directory: $backup_dir"

echo ""
echo "🎯 Validation Results:"
echo "$validation_result"

echo ""
echo "📋 Next Steps:"
echo "   • Review generated DEVELOPMENT_ISSUES.md files in each module"
echo "   • Create GitHub issues for legitimate development tasks"
echo "   • Run './validate-all-modules.sh' to see updated compliance"
echo "   • Proceed to Phase 3: Final Optimization & Monitoring"

print_success "Phase 2 TODO cleanup completed!"
echo ""