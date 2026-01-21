#!/bin/bash

# CVPlus Strategic Refactoring Starter Script
# This script executes the refactoring plan for critical files

echo "🚀 Starting CVPlus Strategic Refactoring Initiative"
echo "=================================================="
echo ""

# Check if we're in the right directory
if [ ! -f "frontend/package.json" ] || [ ! -f "functions/package.json" ]; then
    echo "❌ Error: Please run this script from the CVPlus root directory"
    exit 1
fi

# Make scripts executable
chmod +x scripts/refactoring/*.js
chmod +x scripts/refactoring/*.sh

echo "📊 Step 1: Analyzing current file compliance..."
node scripts/refactoring/analyze-large-files.js > refactoring-analysis.log
echo "   Analysis saved to refactoring-analysis.log"
echo ""

echo "🎯 Step 2: Starting Phase 1 - Critical Component Refactoring"
echo ""

# Ask user which refactoring to start with
echo "Select the refactoring to execute:"
echo "1. CVPreview.tsx (1,880 lines → 12 files)"
echo "2. cvGenerator.ts (3,548 lines → 18 files)" 
echo "3. ML Pipeline Service (1,206 lines → 8 files)"
echo "4. ATS Optimization Service (1,138 lines → 7 files)"
echo "5. ResultsPage.tsx (1,090 lines → 6 files)"
echo "6. All critical files (will create file structure)"
echo "7. Just show compliance report"
echo ""

read -p "Enter your choice (1-7): " choice

case $choice in
    1)
        echo "🔧 Refactoring CVPreview.tsx..."
        node scripts/refactoring/refactor-executor.js cv-preview --dry-run
        read -p "Execute the refactoring? (y/n): " confirm
        if [ "$confirm" = "y" ]; then
            node scripts/refactoring/refactor-executor.js cv-preview
        fi
        ;;
    2)
        echo "🔧 Refactoring cvGenerator.ts..."
        node scripts/refactoring/refactor-executor.js cv-generator --dry-run
        read -p "Execute the refactoring? (y/n): " confirm
        if [ "$confirm" = "y" ]; then
            node scripts/refactoring/refactor-executor.js cv-generator
        fi
        ;;
    3)
        echo "🔧 Refactoring ML Pipeline Service..."
        node scripts/refactoring/refactor-executor.js ml-pipeline --dry-run
        read -p "Execute the refactoring? (y/n): " confirm
        if [ "$confirm" = "y" ]; then
            node scripts/refactoring/refactor-executor.js ml-pipeline
        fi
        ;;
    4)
        echo "⚠️  ATS Optimization refactoring not yet implemented in executor"
        echo "   Please use the manual refactoring guide in docs/refactoring/"
        ;;
    5)
        echo "⚠️  ResultsPage refactoring not yet implemented in executor"
        echo "   Please use the manual refactoring guide in docs/refactoring/"
        ;;
    6)
        echo "🔧 Creating directory structure for all critical files..."
        node scripts/refactoring/refactor-executor.js all --dry-run
        read -p "Execute all refactoring? (y/n): " confirm
        if [ "$confirm" = "y" ]; then
            node scripts/refactoring/refactor-executor.js all
        fi
        ;;
    7)
        echo "📊 Generating compliance report..."
        node scripts/refactoring/refactor-executor.js compliance
        ;;
    *)
        echo "❌ Invalid choice. Exiting."
        exit 1
        ;;
esac

echo ""
echo "✅ Refactoring operation completed!"
echo ""
echo "📋 Next Steps:"
echo "1. Review the created file structure"
echo "2. Extract code from original files into new modules"
echo "3. Update imports and dependencies"
echo "4. Run tests to ensure functionality is maintained"
echo "5. Update original files to use new modules"
echo ""
echo "📚 Documentation:"
echo "   - Strategic Plan: docs/refactoring/STRATEGIC_REFACTORING_PLAN.md"
echo "   - Implementation Guide: docs/refactoring/PHASE1_TECHNICAL_IMPLEMENTATION.md"
echo "   - Architecture Diagrams: docs/diagrams/"
echo ""
echo "🔗 Useful Commands:"
echo "   npm run type-check          # Check TypeScript types"
echo "   npm run build               # Build the project"  
echo "   npm test                    # Run tests"
echo "   git status                  # Check file changes"