#!/bin/bash

# Git Add, Commit, Push and Release Script for Olorin.ai
# This script automates the entire git workflow with AI-generated commit messages

echo "🚀 Automated Git Workflow with Release Creation - Olorin.ai"
echo "=========================================================="

# Function to generate AI-style commit message based on git diff
generate_commit_message() {
    echo "🤖 Generating commit message..."
    
    # Get list of changed files
    CHANGED_FILES=$(git diff --cached --name-only)
    MODIFIED_FILES=$(git diff --cached --name-status | grep "^M" | wc -l)
    ADDED_FILES=$(git diff --cached --name-status | grep "^A" | wc -l)
    DELETED_FILES=$(git diff --cached --name-status | grep "^D" | wc -l)
    
    # Check for specific types of changes for Olorin.ai project
    if echo "$CHANGED_FILES" | grep -q "package.json\|package-lock.json"; then
        echo "📦 Update dependencies and package configuration"
    elif echo "$CHANGED_FILES" | grep -q "src/i18n/locales/"; then
        echo "🌐 Update translations and language support"
    elif echo "$CHANGED_FILES" | grep -q "src/pages/"; then
        echo "✨ Update page components and user interface"
    elif echo "$CHANGED_FILES" | grep -q "src/components/"; then
        echo "🔧 Update React components and functionality"
    elif echo "$CHANGED_FILES" | grep -q "tailwind.config.js\|postcss.config.js"; then
        echo "🎨 Update Tailwind CSS and styling configuration"
    elif echo "$CHANGED_FILES" | grep -q "public/"; then
        echo "🖼️ Update public assets and static files"
    elif echo "$CHANGED_FILES" | grep -q "\.css\|\.scss"; then
        echo "💄 Update styles and visual design"
    elif echo "$CHANGED_FILES" | grep -q "\.md$"; then
        echo "📚 Update documentation and guides"
    elif echo "$CHANGED_FILES" | grep -q "scripts/\|\.sh$"; then
        echo "🔨 Update build and deployment scripts"
    elif echo "$CHANGED_FILES" | grep -q "\.htaccess"; then
        echo "⚙️ Update GoDaddy-compatible Apache configuration"
    elif [ $ADDED_FILES -gt 0 ] && [ $MODIFIED_FILES -eq 0 ]; then
        echo "✨ Add new features and functionality"
    elif [ $DELETED_FILES -gt 0 ]; then
        echo "🗑️ Remove unused files and clean up codebase"
    elif [ $MODIFIED_FILES -gt 5 ]; then
        echo "🚀 Major updates and improvements across multiple files"
    else
        echo "🔄 Update and improve existing functionality"
    fi
}

# Check if there are any changes to commit
if git diff --quiet && git diff --cached --quiet; then
    echo "📝 No changes detected. Checking if we should push existing commits..."
    
    # Check if there are unpushed commits
    UNPUSHED=$(git log @{u}..HEAD --oneline 2>/dev/null | wc -l)
    if [ $UNPUSHED -gt 0 ]; then
        echo "📤 Found $UNPUSHED unpushed commit(s). Proceeding with push and release..."
    else
        echo "✅ Repository is up to date. Nothing to commit or push."
        echo "🤔 Would you like to create a release anyway? (y/n)"
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            echo "👋 Exiting without creating release."
            exit 0
        fi
    fi
else
    echo "📝 Changes detected. Starting git workflow..."
    
    # Add all changes
    echo "📁 Adding all changes to staging..."
    git add .
    
    # Check if there are staged changes
    if git diff --cached --quiet; then
        echo "⚠️ No changes staged for commit."
        exit 1
    fi
    
    # Generate commit message
    COMMIT_MESSAGE=$(generate_commit_message)
    echo "💬 Generated commit message: $COMMIT_MESSAGE"
    
    # Commit changes
    echo "💾 Committing changes..."
    git commit -m "$COMMIT_MESSAGE"
    
    if [ $? -ne 0 ]; then
        echo "❌ Commit failed. Please check for errors."
        exit 1
    fi
    
    echo "✅ Changes committed successfully!"
fi

# Store the arguments passed to the script (branch, remote, etc.)
PUSH_ARGS="$@"

# Default to 'origin main' if no arguments provided
if [ -z "$PUSH_ARGS" ]; then
    PUSH_ARGS="origin main"
    echo "📌 No arguments provided, defaulting to: git push origin main"
fi

echo "🔄 Pushing to remote repository..."
git push $PUSH_ARGS

# Check if push was successful
if [ $? -eq 0 ]; then
    echo "✅ Push successful!"
    echo ""
    echo "🏗️  Starting automatic release creation for Olorin.ai..."
    
    # Configuration for Olorin.ai project
    PROJECT_NAME="olorin-web-portal"
    BUILD_DIR="build"
    RELEASE_DIR="release"
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    PACKAGE_NAME="${PROJECT_NAME}_${TIMESTAMP}.tar.gz"
    
    # Build the project
    echo "🔨 Building Olorin.ai web portal..."
    npm run build
    
    if [ $? -ne 0 ]; then
        echo "❌ Build failed. Please check for errors."
        exit 1
    fi
    
    # Create release directory
    echo "📁 Preparing release package..."
    rm -rf $RELEASE_DIR
    mkdir -p $RELEASE_DIR
    
    # Copy build files to release directory
    cp -r $BUILD_DIR/* $RELEASE_DIR/
    echo "✅ Build files copied to release directory"
    
    # Copy GoDaddy-compatible .htaccess files for deployment
    if [ -f "public/.htaccess" ]; then
        cp public/.htaccess $RELEASE_DIR/
        echo "✅ GoDaddy-compatible .htaccess file included"
    fi
    
    # Include backup .htaccess options for troubleshooting
    if [ -f "public/.htaccess-simple" ]; then
        cp public/.htaccess-simple $RELEASE_DIR/
        echo "✅ Backup .htaccess-simple included"
    fi
    
    if [ -f "public/.htaccess-minimal" ]; then
        cp public/.htaccess-minimal $RELEASE_DIR/
        echo "✅ Ultra-minimal .htaccess-minimal included"
    fi
    
    # Include troubleshooting guide
    if [ -f "troubleshoot-godaddy.md" ]; then
        cp troubleshoot-godaddy.md $RELEASE_DIR/
        echo "✅ GoDaddy troubleshooting guide included"
    fi
    
    # Create deployment info file
    cat > $RELEASE_DIR/deployment-info.txt << EOF
Olorin.ai Web Portal Deployment Package
========================================
Build Date: $(date)
Git Branch: $(git branch --show-current)
Git Commit: $(git rev-parse HEAD)
Git Commit Message: $(git log -1 --pretty=%B)
Node Version: $(node --version)
NPM Version: $(npm --version)

Deployment Instructions:
1. Upload this package to your GoDaddy cPanel File Manager
2. Extract contents to public_html directory
3. The .htaccess file is already GoDaddy-compatible
4. If you get 500 errors, try these backup options:
   - Rename .htaccess-simple to .htaccess
   - Or rename .htaccess-minimal to .htaccess
5. See troubleshoot-godaddy.md for detailed troubleshooting
6. Your Olorin.ai web portal is now live!

Features Included:
- Multi-language support (English, French, Spanish, Italian, Chinese)
- Purple theme matching Olorin wizard branding
- Responsive design for all devices
- SEO optimized with proper meta tags
- GoDaddy-compatible .htaccess for React SPA routing
- Multiple .htaccess backup options for troubleshooting
- Comprehensive troubleshooting guide

Support: For issues, check the git repository or contact the development team.
EOF
    
    echo "✅ Deployment info file created"
    
    # Create the tar.gz package
    echo "📦 Creating deployment package..."
    cd $RELEASE_DIR
    tar -czf ../$PACKAGE_NAME .
    cd ..
    
    # Calculate package size
    PACKAGE_SIZE=$(du -h $PACKAGE_NAME | cut -f1)
    
    # Clean up release directory
    rm -rf $RELEASE_DIR
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "🎉 Complete workflow finished successfully!"
        echo "📂 Deployment package created: $PACKAGE_NAME"
        echo "📏 Package size: $PACKAGE_SIZE"
        echo ""
        echo "📊 Summary:"
        echo "  ✅ Changes committed with AI-generated message"
        echo "  ✅ Code pushed to remote repository"
        echo "  ✅ Olorin.ai web portal built successfully"
        echo "  ✅ Deployment package created"
        echo ""
        echo "🚀 Next steps:"
        echo "  1. Go to your GoDaddy cPanel File Manager"
        echo "  2. Upload $PACKAGE_NAME"
        echo "  3. Extract it to public_html"
        echo "  4. The GoDaddy-compatible .htaccess is already included"
        echo "  5. If you get 500 errors, see troubleshoot-godaddy.md"
        echo "  6. Your Olorin.ai web portal is now updated!"
        echo ""
        echo "🌟 Your multilingual, purple-themed Olorin.ai portal is ready for GoDaddy deployment!"
        echo "🛠️  Package includes multiple .htaccess options and troubleshooting guide"
    else
        echo "❌ Release creation failed. Please check the errors above."
        exit 1
    fi
else
    echo "❌ Push failed. Release creation cancelled."
    exit 1
fi 