#!/bin/bash
# Olorin Security Checklist Script
# Quick security validation for development and deployment
# Author: Gil Klainert
# Date: 2025-08-25

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASS=0
FAIL=0
WARN=0

echo -e "${BLUE}🔒 Olorin Security Checklist${NC}"
echo "=================================="
echo

# Function to report results
check_result() {
    local status=$1
    local message=$2
    local details=$3
    
    case $status in
        "PASS")
            echo -e "✅ ${GREEN}PASS${NC}: $message"
            ((PASS++))
            ;;
        "FAIL")
            echo -e "❌ ${RED}FAIL${NC}: $message"
            if [ -n "$details" ]; then
                echo -e "   ${RED}Details: $details${NC}"
            fi
            ((FAIL++))
            ;;
        "WARN")
            echo -e "⚠️  ${YELLOW}WARN${NC}: $message"
            if [ -n "$details" ]; then
                echo -e "   ${YELLOW}Details: $details${NC}"
            fi
            ((WARN++))
            ;;
    esac
}

# 1. Check for Python cache files in git
echo -e "${BLUE}1. Checking Git Hygiene...${NC}"
if git ls-files 2>/dev/null | grep -E "(__pycache__|\.pyc$)" > /dev/null; then
    cache_files=$(git ls-files | grep -E "(__pycache__|\.pyc$)" | wc -l | xargs)
    check_result "FAIL" "Python cache files tracked in git" "$cache_files files found"
else
    check_result "PASS" "No Python cache files tracked in git"
fi

# 2. Check for sensitive files
echo -e "${BLUE}2. Checking for Sensitive Files...${NC}"
sensitive_patterns=("*.key" "*.pem" "*credential*" "*secret*" "ADMIN_CREDENTIALS*" ".env.secure")
found_sensitive=false

for pattern in "${sensitive_patterns[@]}"; do
    if find . -name "$pattern" -not -path "./node_modules/*" -not -path "./Gaia/*" -not -path "./.git/*" 2>/dev/null | grep -v "\.example$" | head -1 > /dev/null; then
        files=$(find . -name "$pattern" -not -path "./node_modules/*" -not -path "./Gaia/*" -not -path "./.git/*" 2>/dev/null | grep -v "\.example$" | head -3 | xargs)
        check_result "FAIL" "Sensitive files found: $pattern" "$files"
        found_sensitive=true
    fi
done

if [ "$found_sensitive" = false ]; then
    check_result "PASS" "No sensitive files found in codebase"
fi

# 3. Check .gitignore coverage
echo -e "${BLUE}3. Checking .gitignore Security Coverage...${NC}"
if [ ! -f ".gitignore" ]; then
    check_result "FAIL" "No .gitignore file found"
else
    required_patterns=("*.env" "*.key" "*.pem" "__pycache__/" "*.pyc" "*credential*" "*secret*")
    missing_patterns=()
    
    for pattern in "${required_patterns[@]}"; do
        if ! grep -q "$pattern" .gitignore; then
            missing_patterns+=("$pattern")
        fi
    done
    
    if [ ${#missing_patterns[@]} -eq 0 ]; then
        check_result "PASS" ".gitignore has comprehensive security patterns"
    else
        check_result "WARN" "Some security patterns missing from .gitignore" "${missing_patterns[*]}"
    fi
fi

# 4. Check environment files
echo -e "${BLUE}4. Checking Environment Files...${NC}"
env_files=$(find . -name ".env*" -not -path "./node_modules/*" -not -path "./Gaia/*" 2>/dev/null)
if [ -n "$env_files" ]; then
    while IFS= read -r file; do
        if [[ "$file" =~ \.example$ ]]; then
            check_result "PASS" "Template file found: $file"
        else
            # Check if file is tracked in git
            if git ls-files --error-unmatch "$file" 2>/dev/null; then
                check_result "WARN" "Environment file tracked in git: $file" "Verify no secrets present"
            else
                check_result "PASS" "Environment file properly ignored: $file"
            fi
        fi
    done <<< "$env_files"
else
    check_result "PASS" "No environment files found"
fi

# 5. Check for hardcoded credentials in common files
echo -e "${BLUE}5. Checking for Hardcoded Credentials...${NC}"
credential_patterns=("password\s*=" "api[_-]?key\s*=" "secret\s*=" "token\s*=")
found_credentials=false

for pattern in "${credential_patterns[@]}"; do
    if grep -r -i "$pattern" --include="*.py" --include="*.js" --include="*.ts" --include="*.json" \
       --exclude-dir="node_modules" --exclude-dir="Gaia" --exclude-dir=".git" \
       --exclude="*.example*" --exclude="*template*" . 2>/dev/null | head -1 > /dev/null; then
        files=$(grep -r -i "$pattern" --include="*.py" --include="*.js" --include="*.ts" --include="*.json" \
               --exclude-dir="node_modules" --exclude-dir="Gaia" --exclude-dir=".git" \
               --exclude="*.example*" --exclude="*template*" . 2>/dev/null | head -3)
        check_result "WARN" "Potential credentials found with pattern: $pattern" "$files"
        found_credentials=true
    fi
done

if [ "$found_credentials" = false ]; then
    check_result "PASS" "No obvious hardcoded credentials found"
fi

# 6. Check file permissions
echo -e "${BLUE}6. Checking File Permissions...${NC}"
if find . -name "*.key" -o -name "*.pem" -o -name ".env" 2>/dev/null | head -1 > /dev/null; then
    insecure_files=$(find . \( -name "*.key" -o -name "*.pem" -o -name ".env" \) -perm +044 2>/dev/null)
    if [ -n "$insecure_files" ]; then
        check_result "WARN" "Files with insecure permissions found" "$insecure_files"
    else
        check_result "PASS" "File permissions appear secure"
    fi
else
    check_result "PASS" "No sensitive files to check permissions"
fi

# 7. Check for security tools
echo -e "${BLUE}7. Checking Security Tooling...${NC}"
if [ -f "scripts/security_audit.py" ]; then
    check_result "PASS" "Security audit script available"
else
    check_result "WARN" "No security audit script found" "Consider implementing automated security scanning"
fi

# Summary
echo
echo -e "${BLUE}Security Checklist Summary${NC}"
echo "=========================="
echo -e "✅ ${GREEN}Passed: $PASS${NC}"
echo -e "⚠️  ${YELLOW}Warnings: $WARN${NC}"
echo -e "❌ ${RED}Failed: $FAIL${NC}"
echo

# Exit with appropriate code
if [ $FAIL -gt 0 ]; then
    echo -e "${RED}🚨 Security issues found! Please address failures before deployment.${NC}"
    exit 1
elif [ $WARN -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Security warnings present. Review recommended before deployment.${NC}"
    exit 0
else
    echo -e "${GREEN}✅ All security checks passed!${NC}"
    exit 0
fi