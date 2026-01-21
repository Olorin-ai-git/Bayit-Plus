#!/bin/bash

# CVPlus Phase 2: TODO/FIXME Analysis Script
echo "📋 CVPlus Phase 2: TODO/FIXME Analysis"
echo "====================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

total_files=0
total_todos=0

for module_dir in packages/*/; do
    module_name=$(basename "$module_dir")

    if [ -d "$module_dir/src" ]; then
        files_with_todos=$(find "$module_dir/src" -name "*.ts" -o -name "*.js" | xargs grep -l "TODO\|FIXME\|XXX" 2>/dev/null | wc -l)

        if [ $files_with_todos -gt 0 ]; then
            echo ""
            echo -e "${BLUE}📦 $module_name ($files_with_todos files)${NC}"
            echo "----------------------------------------"

            # Count critical items
            critical_count=$(find "$module_dir/src" -name "*.ts" -o -name "*.js" | xargs grep -c "FIXME\|XXX" 2>/dev/null | awk '{sum+=$1} END {print sum+0}')
            todo_count=$(find "$module_dir/src" -name "*.ts" -o -name "*.js" | xargs grep -c "TODO" 2>/dev/null | awk '{sum+=$1} END {print sum+0}')

            echo -e "${RED}🔴 CRITICAL (FIXME/XXX): $critical_count items${NC}"
            find "$module_dir/src" -name "*.ts" -o -name "*.js" | xargs grep -n "FIXME\|XXX" 2>/dev/null | head -3

            echo -e "${YELLOW}🟡 FEATURES (TODO): $todo_count items${NC}"
            find "$module_dir/src" -name "*.ts" -o -name "*.js" | xargs grep -n "TODO" 2>/dev/null | head -3

            total_files=$((total_files + files_with_todos))
            total_todos=$((total_todos + critical_count + todo_count))
        fi
    fi
done

echo ""
echo -e "${GREEN}📊 SUMMARY: $total_files files with $total_todos development comments${NC}"
echo ""
echo "🎯 Phase 2 Target: Reduce from 13 modules to ≤5 modules with TODOs"
echo "🧹 Next: Create cleanup strategy for obsolete and development comments"