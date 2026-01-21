#!/bin/bash
# Migration prerequisites check
# Task: T001 - Initialize migration validation environment and prerequisites check

set -e

echo "🔍 CVPlus Migration Prerequisites Check"
echo "======================================="

ERRORS=0
WARNINGS=0

# Function to check and log results
check_requirement() {
    local name="$1"
    local command="$2"
    local critical="$3"
    local fix_command="$4"

    if eval "$command" &>/dev/null; then
        echo "✅ $name"
    else
        if [ "$critical" = "true" ]; then
            echo "❌ $name (CRITICAL)"
            ((ERRORS++))
            if [ -n "$fix_command" ]; then
                echo "   Attempting fix: $fix_command"
                eval "$fix_command" || echo "   Fix failed"
                # Re-check after fix
                if eval "$command" &>/dev/null; then
                    echo "✅ $name (FIXED)"
                    ((ERRORS--))
                fi
            fi
        else
            echo "⚠️  $name (WARNING)"
            ((WARNINGS++))
        fi
    fi
}

# Node.js version check
check_requirement "Node.js version >= 20" \
    "node -v | grep -E 'v(2[0-9]|[3-9][0-9])'" \
    "true"

# TypeScript compiler
check_requirement "TypeScript compiler available" \
    "npx tsc --version" \
    "true" \
    "npm install typescript -g"

# Firebase CLI
check_requirement "Firebase CLI available" \
    "firebase --version" \
    "true" \
    "npm install firebase-tools -g"

# Git repository
check_requirement "Git repository is valid" \
    "git rev-parse --git-dir" \
    "true"

# Migration branch
check_requirement "Current branch is migration branch" \
    "git branch --show-current | grep -q '005-migration-plan-migrate'" \
    "false"

# Functions directory
check_requirement "Functions directory exists" \
    "[ -d 'functions' ]" \
    "true"

# Functions index file
check_requirement "Functions src/index.ts exists" \
    "[ -f 'functions/src/index.ts' ]" \
    "true"

# Packages directory (submodules)
check_requirement "Packages directory exists" \
    "[ -d 'packages' ]" \
    "true"

# Submodules initialized
check_requirement "Submodules initialized (18+)" \
    "git submodule status | wc -l | awk '{print (\$1 >= 18)}' | grep -q 1" \
    "true" \
    "git submodule update --init --recursive"

# Functions dependencies
check_requirement "Functions dependencies installed" \
    "[ -d 'functions/node_modules' ]" \
    "true" \
    "cd functions && npm install"

# Frontend dependencies
check_requirement "Frontend dependencies installed" \
    "[ -d 'frontend/node_modules' ]" \
    "false" \
    "cd frontend && npm install"

# Check for migration source files
echo ""
echo "📁 Checking migration source files:"
FILES_TO_MIGRATE=(
    "functions/src/services/ai-analysis.service.ts"
    "functions/src/services/cv-processor.service.ts"
    "functions/src/services/multimedia.service.ts"
    "functions/src/services/profile-manager.service.ts"
    "functions/src/models/analytics.service.ts"
    "functions/src/models/generated-content.service.ts"
    "functions/src/models/public-profile.service.ts"
)

FOUND_FILES=0
for file in "${FILES_TO_MIGRATE[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ Found: $file"
        ((FOUND_FILES++))
    else
        echo "❌ Missing: $file"
    fi
done

if [ $FOUND_FILES -gt 0 ]; then
    echo "✅ Migration source files: $FOUND_FILES of ${#FILES_TO_MIGRATE[@]} found"
else
    echo "⚠️  Migration source files: None found (may already be migrated)"
    ((WARNINGS++))
fi

# Summary
echo ""
echo "📊 Prerequisites Check Summary:"
echo "==============================="
if [ $ERRORS -eq 0 ]; then
    echo "✅ All critical requirements passed"
    if [ $WARNINGS -eq 0 ]; then
        echo "✅ No warnings - Ready for migration!"
        exit 0
    else
        echo "⚠️  $WARNINGS warnings (non-critical)"
        echo "✅ Migration can proceed"
        exit 0
    fi
else
    echo "❌ $ERRORS critical failures"
    echo "❌ Migration cannot proceed until critical issues are resolved"
    exit 1
fi