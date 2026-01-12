#!/bin/bash

# Bayit+ Web App Deploy Script
# Auto-generates commit message, commits, pushes, and deploys web app to Firebase

set -e  # Exit on error

echo "🚀 Bayit+ Web App Deploy Script"
echo "================================"
echo ""

# Check if there are changes to commit
if [[ -z $(git status -s) ]]; then
    echo "✅ No changes to commit. Running deploy only..."

    # Build and deploy
    echo ""
    echo "📦 Building web app..."
    cd web
    npm run build

    echo ""
    echo "🚢 Deploying to Firebase..."
    cd ..
    firebase deploy --only hosting

    echo ""
    echo "✅ Deploy complete!"
    exit 0
fi

# Add all changes
echo "📝 Staging changes..."
git add .

# Get git diff for commit message generation
echo "🤖 Analyzing changes..."
DIFF=$(git diff --cached --stat | head -20)
FILES_CHANGED=$(git diff --cached --name-only)

echo ""
echo "Files changed:"
echo "$FILES_CHANGED"
echo ""

# Generate commit message using git diff summary
COMMIT_MSG="Update: "

# Analyze what changed
if echo "$FILES_CHANGED" | grep -q "web/src/components"; then
    COMMIT_MSG+="Update UI components"
elif echo "$FILES_CHANGED" | grep -q "web/src/pages"; then
    COMMIT_MSG+="Update pages"
elif echo "$FILES_CHANGED" | grep -q "web/src/services"; then
    COMMIT_MSG+="Update API services"
elif echo "$FILES_CHANGED" | grep -q "backend/app/api"; then
    COMMIT_MSG+="Update backend API"
elif echo "$FILES_CHANGED" | grep -q "backend/app/services"; then
    COMMIT_MSG+="Update backend services"
elif echo "$FILES_CHANGED" | grep -q "backend/app/models"; then
    COMMIT_MSG+="Update data models"
else
    COMMIT_MSG+="Update codebase"
fi

# Add file count
FILE_COUNT=$(echo "$FILES_CHANGED" | wc -l | xargs)
COMMIT_MSG+=" ($FILE_COUNT file(s))"

echo "Generated commit message:"
echo "  $COMMIT_MSG"
echo ""

# Ask for confirmation or custom message
read -p "Press Enter to use this message, or type a custom message: " CUSTOM_MSG

if [[ -n "$CUSTOM_MSG" ]]; then
    COMMIT_MSG="$CUSTOM_MSG"
fi

# Commit
echo ""
echo "💾 Committing changes..."
git commit -m "$COMMIT_MSG"

# Push
echo ""
echo "⬆️  Pushing to origin..."
git push origin main

# Build
echo ""
echo "📦 Building web app..."
cd web
npm run build

# Deploy to Firebase
echo ""
echo "🚢 Deploying to Firebase..."
cd ..
firebase deploy --only hosting

echo ""
echo "✅ Deploy complete!"
echo "🌐 Live at: https://bayit.tv"
