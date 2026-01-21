#!/bin/bash

# CVPlus Dependency Violation Fix Script
# Author: Gil Klainert
# Purpose: Systematically fix dependency architecture violations

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 CVPlus Dependency Violation Fix${NC}"
echo "=================================="

# Check if we're in the CVPlus root directory
if [ ! -f "package.json" ] || ! grep -q "cvplus" package.json; then
    echo -e "${RED}❌ Error: Please run this script from the CVPlus root directory${NC}"
    exit 1
fi

# Parse command line arguments
FIX_MODE=${1:-"analyze"}  # analyze, fix, verify
TARGET_LAYER=${2:-"all"}

case $FIX_MODE in
    "analyze")
        echo -e "${YELLOW}🔍 Analysis Mode: Identifying violations${NC}"
        
        echo -e "\n${BLUE}Layer 0 (Core) Violations:${NC}"
        cd packages/core
        VIOLATIONS=$(grep -r "@cvplus/" src/ 2>/dev/null | grep -v "// Example:" | grep -v "// Higher layers import" | grep -v "export const.*@cvplus" | head -10 || echo "None found")
        echo "$VIOLATIONS"
        cd ../..
        
        echo -e "\n${BLUE}Layer 1 (Auth) Violations:${NC}"
        cd packages/auth
        VIOLATIONS=$(grep -r "@cvplus/" src/ 2>/dev/null | grep -v "@cvplus/core" | grep -v "// Example:" | grep -v "// Higher layers import" | grep -v "export const.*@cvplus" | head -10 || echo "None found")
        echo "$VIOLATIONS"
        cd ../..
        
        echo -e "\n${BLUE}Layer 1 (I18n) Violations:${NC}"
        cd packages/i18n
        VIOLATIONS=$(grep -r "@cvplus/" src/ 2>/dev/null | grep -v "@cvplus/core" | grep -v "// Example:" | grep -v "// Higher layers import" | grep -v "export const.*@cvplus" | head -10 || echo "None found")
        echo "$VIOLATIONS"
        cd ../..
        ;;
        
    "fix")
        echo -e "${YELLOW}🛠️  Fix Mode: Removing violations${NC}"
        
        # Fix Core module violations (remove all CVPlus imports)
        echo -e "\n${BLUE}Fixing Core module violations...${NC}"
        cd packages/core/src
        
        # Comment out problematic imports
        find . -name "*.ts" -type f -exec sed -i.bak 's/^import.*@cvplus\/.*$/\/\/ &  \/\/ VIOLATION: Core cannot import CVPlus modules/' {} \;
        find . -name "*.ts" -type f -exec sed -i.bak 's/^export.*from.*@cvplus\/.*$/\/\/ &  \/\/ VIOLATION: Core cannot export CVPlus modules/' {} \;
        
        echo "✅ Core module violations commented out"
        cd ../../..
        
        # Fix Auth module violations (keep only core imports)
        echo -e "\n${BLUE}Fixing Auth module violations...${NC}"
        cd packages/auth/src
        
        # Comment out non-core imports
        find . -name "*.ts" -type f -exec grep -l "@cvplus/" {} \; | while read file; do
            sed -i.bak '/import.*@cvplus\//s/^/\/\/ TEMP_DISABLED: /' "$file"
            sed -i.bak '/import.*@cvplus\/core/s/^\/\/ TEMP_DISABLED: //' "$file"
        done
        
        echo "✅ Auth module violations commented out (kept core imports)"
        cd ../../..
        
        # Fix I18n module violations (keep only core imports)  
        echo -e "\n${BLUE}Fixing I18n module violations...${NC}"
        cd packages/i18n/src
        
        find . -name "*.ts" -type f -exec grep -l "@cvplus/" {} \; | while read file; do
            sed -i.bak '/import.*@cvplus\//s/^/\/\/ TEMP_DISABLED: /' "$file"
            sed -i.bak '/import.*@cvplus\/core/s/^\/\/ TEMP_DISABLED: //' "$file"
        done
        
        echo "✅ I18n module violations commented out (kept core imports)"
        cd ../../..
        
        echo -e "\n${GREEN}🎉 Violations have been temporarily disabled${NC}"
        echo -e "${YELLOW}⚠️  Note: You'll need to refactor the code to properly use the layered architecture${NC}"
        ;;
        
    "verify")
        echo -e "${YELLOW}✅ Verify Mode: Checking if violations are fixed${NC}"
        ./scripts/validate-dependencies.sh
        ;;
        
    "cleanup")
        echo -e "${YELLOW}🧹 Cleanup Mode: Removing backup files${NC}"
        find packages/ -name "*.bak" -delete
        echo "✅ Backup files removed"
        ;;
        
    *)
        echo -e "${RED}❌ Error: Invalid mode${NC}"
        echo "Usage: $0 [analyze|fix|verify|cleanup]"
        echo ""
        echo "Examples:"
        echo "  $0 analyze        # Analyze violations"
        echo "  $0 fix           # Fix violations temporarily"
        echo "  $0 verify        # Verify violations are gone"
        echo "  $0 cleanup       # Remove backup files"
        exit 1
        ;;
esac

echo -e "\n${BLUE}💡 Recommended Next Steps:${NC}"
echo "1. Run analysis to understand violations"
echo "2. Use fix mode to temporarily disable violations"
echo "3. Refactor code to use proper layered architecture"
echo "4. Run verify to confirm compliance"
echo "5. Run cleanup to remove backup files"