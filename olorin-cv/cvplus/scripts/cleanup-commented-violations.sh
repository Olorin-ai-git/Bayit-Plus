#!/bin/bash

# CVPlus Commented Violations Cleanup Script
# Author: Gil Klainert
# Purpose: Clean up commented CVPlus import violations across all modules

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧹 CVPlus Commented Violations Cleanup${NC}"
echo "======================================"

# Check if we're in the CVPlus root directory
if [ ! -f "package.json" ] || ! grep -q "cvplus" package.json; then
    echo -e "${RED}❌ Error: Please run this script from the CVPlus root directory${NC}"
    exit 1
fi

CLEANUP_MODE=${1:-"analyze"}  # analyze, fix, verify
VIOLATIONS_FOUND=0
VIOLATIONS_CLEANED=0

case $CLEANUP_MODE in
    "analyze")
        echo -e "${YELLOW}🔍 Analyzing commented violations...${NC}"
        
        # Find commented @cvplus imports
        echo -e "\n${BLUE}Scanning for commented @cvplus imports...${NC}"
        
        for module in core auth i18n cv-processing multimedia analytics premium recommendations public-profiles admin workflow payments; do
            if [ -d "packages/$module" ]; then
                echo -e "\n${YELLOW}Checking $module module:${NC}"
                
                FOUND=$(find "packages/$module/src" -name "*.ts" -o -name "*.tsx" 2>/dev/null | \
                       xargs grep -l "// .*@cvplus/" 2>/dev/null | \
                       head -10 || true)
                
                if [ -n "$FOUND" ]; then
                    echo "$FOUND" | while read file; do
                        echo "  📄 $file"
                        grep -n "// .*@cvplus/" "$file" | head -3 || true
                        VIOLATIONS_FOUND=$((VIOLATIONS_FOUND + 1))
                    done
                else
                    echo "  ✅ No commented violations found"
                fi
            fi
        done
        
        echo -e "\n${BLUE}Analysis Summary:${NC}"
        echo "Total violations found: $VIOLATIONS_FOUND"
        ;;
        
    "fix")
        echo -e "${YELLOW}🔧 Fixing commented violations...${NC}"
        
        # Create backup directory
        BACKUP_DIR="tmp/cleanup-backup-$(date +%Y%m%d-%H%M%S)"
        mkdir -p "$BACKUP_DIR"
        
        for module in core auth i18n cv-processing multimedia analytics premium recommendations public-profiles admin workflow payments; do
            if [ -d "packages/$module" ]; then
                echo -e "\n${YELLOW}Cleaning $module module:${NC}"
                
                # Find and process files with commented violations
                find "packages/$module/src" -name "*.ts" -o -name "*.tsx" 2>/dev/null | while read file; do
                    if grep -q "// .*@cvplus/" "$file" 2>/dev/null; then
                        echo "  🔧 Processing $file"
                        
                        # Create backup
                        BACKUP_FILE="$BACKUP_DIR/$(echo "$file" | sed 's|/|_|g')"
                        cp "$file" "$BACKUP_FILE"
                        
                        # Remove commented CVPlus imports and related comments
                        sed -i.tmp '
                            /\/\/ import.*@cvplus\//d
                            /\/\/ export.*@cvplus\//d
                            /\/\/ .*@cvplus\/.*backend\/functions/d
                            /\/\/ TEMPORARILY DISABLED.*@cvplus/d
                            /\/\/ TEMP_DISABLED.*@cvplus/d
                            /\/\/ VIOLATION:.*@cvplus/d
                        ' "$file"
                        
                        # Remove empty lines left behind
                        sed -i.tmp '/^[[:space:]]*$/N;/^\n$/d' "$file"
                        
                        # Clean up temp files
                        rm -f "${file}.tmp"
                        
                        VIOLATIONS_CLEANED=$((VIOLATIONS_CLEANED + 1))
                    fi
                done
            fi
        done
        
        echo -e "\n${GREEN}✅ Cleanup completed!${NC}"
        echo "Violations cleaned: $VIOLATIONS_CLEANED"
        echo "Backups stored in: $BACKUP_DIR"
        ;;
        
    "verify")
        echo -e "${YELLOW}✅ Verifying cleanup...${NC}"
        
        REMAINING_VIOLATIONS=0
        
        for module in core auth i18n cv-processing multimedia analytics premium recommendations public-profiles admin workflow payments; do
            if [ -d "packages/$module" ]; then
                FOUND=$(find "packages/$module/src" -name "*.ts" -o -name "*.tsx" 2>/dev/null | \
                       xargs grep -l "// .*@cvplus/" 2>/dev/null || true)
                
                if [ -n "$FOUND" ]; then
                    echo -e "${RED}❌ $module still has commented violations:${NC}"
                    echo "$FOUND"
                    REMAINING_VIOLATIONS=$((REMAINING_VIOLATIONS + 1))
                else
                    echo -e "${GREEN}✅ $module: Clean${NC}"
                fi
            fi
        done
        
        if [ $REMAINING_VIOLATIONS -eq 0 ]; then
            echo -e "\n${GREEN}🎉 All commented violations cleaned successfully!${NC}"
        else
            echo -e "\n${RED}❌ $REMAINING_VIOLATIONS modules still have violations${NC}"
            exit 1
        fi
        ;;
        
    "restore")
        echo -e "${YELLOW}🔄 Restoring from backup...${NC}"
        
        if [ -z "$2" ]; then
            echo -e "${RED}❌ Error: Please specify backup directory${NC}"
            echo "Usage: $0 restore tmp/cleanup-backup-YYYYMMDD-HHMMSS"
            exit 1
        fi
        
        BACKUP_DIR="$2"
        
        if [ ! -d "$BACKUP_DIR" ]; then
            echo -e "${RED}❌ Error: Backup directory not found: $BACKUP_DIR${NC}"
            exit 1
        fi
        
        for backup_file in "$BACKUP_DIR"/*; do
            if [ -f "$backup_file" ]; then
                original_file=$(basename "$backup_file" | sed 's|_|/|g')
                if [ -f "$original_file" ]; then
                    cp "$backup_file" "$original_file"
                    echo "  🔄 Restored $original_file"
                fi
            fi
        done
        
        echo -e "${GREEN}✅ Restore completed!${NC}"
        ;;
        
    *)
        echo -e "${RED}❌ Error: Invalid mode${NC}"
        echo "Usage: $0 [analyze|fix|verify|restore]"
        echo ""
        echo "Examples:"
        echo "  $0 analyze                              # Analyze commented violations"
        echo "  $0 fix                                 # Fix commented violations"
        echo "  $0 verify                              # Verify violations are cleaned"
        echo "  $0 restore tmp/cleanup-backup-*        # Restore from backup"
        exit 1
        ;;
esac

echo -e "\n${BLUE}💡 Next Steps:${NC}"
echo "1. Run 'analyze' to see all violations"
echo "2. Run 'fix' to clean up violations (creates backups)"
echo "3. Run 'verify' to confirm cleanup"
echo "4. Run dependency validation to ensure compliance"
echo "5. If issues, use 'restore' to rollback changes"