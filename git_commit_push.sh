#!/bin/bash

# Script to add all files, commit with AI-generated message, push, and deploy Docker
# Usage: ./git_commit_push.sh [optional_custom_message] [--skip-docker] [--docker-only]

set -e

# Parse command line arguments
SKIP_DOCKER=false
DOCKER_ONLY=false
CUSTOM_MESSAGE=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-docker|--no-docker)
            SKIP_DOCKER=true
            shift
            ;;
        --docker-only)
            DOCKER_ONLY=true
            shift
            ;;
        --help|-h)
            echo "Git Commit, Push & Docker Deploy Script"
            echo ""
            echo "Usage: $0 [MESSAGE] [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  MESSAGE           Custom commit message (optional)"
            echo "  --skip-docker     Skip Docker build and deployment"
            echo "  --no-docker       Skip Docker build and deployment (alias for --skip-docker)"
            echo "  --docker-only     Skip git operations, only build and deploy Docker"
            echo "  --help, -h        Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                          # Git commit + push + Docker deploy"
            echo "  $0 \"Fix bug in auth\"       # Custom commit message"
            echo "  $0 --skip-docker           # Only git operations"
            echo "  $0 --no-docker             # Only git operations (same as --skip-docker)"
            echo "  $0 --docker-only           # Only Docker operations"
            exit 0
            ;;
        *)
            CUSTOM_MESSAGE="$1"
            shift
            ;;
    esac
done

echo "🚀 Starting Git commit, push, and Docker deployment workflow..."

# Skip git operations if docker-only flag is set
if [ "$DOCKER_ONLY" = true ]; then
    echo "🐳 Docker-only mode enabled. Skipping git operations..."
    SKIP_DOCKER=false
    # Set dummy values for Docker build
    CURRENT_BRANCH="main"
    COMMIT_MESSAGE="Docker deployment"
else
    # Check if we're in a git repository
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        echo "❌ Error: Not in a git repository"
        exit 1
    fi
fi

# Function to generate AI-like commit message based on git status
generate_commit_message() {
    if [ -n "$CUSTOM_MESSAGE" ]; then
        echo "$CUSTOM_MESSAGE"
        return
    fi
    
    # Get git status info
    local added_files=$(git status --porcelain | grep -c "^A " || echo "0")
    local modified_files=$(git status --porcelain | grep -c "^M " || echo "0")
    local deleted_files=$(git status --porcelain | grep -c "^D " || echo "0")
    local untracked_files=$(git status --porcelain | grep -c "^?? " || echo "0")
    
    # Check for specific patterns to create meaningful commit messages
    if git status --porcelain | grep -q "\.py$"; then
        if git status --porcelain | grep -q "test_.*\.py$"; then
            echo "feat: Update Python codebase and test files"
        else
            echo "feat: Update Python application code"
        fi
    elif git status --porcelain | grep -q "requirements\.txt\|pyproject\.toml\|poetry\.lock"; then
        echo "deps: Update project dependencies and configuration"
    elif git status --porcelain | grep -q "\.md$"; then
        echo "docs: Update documentation files"
    elif git status --porcelain | grep -q "config\|\.yaml$\|\.yml$"; then
        echo "config: Update configuration files"
    else
        # Generic message based on file counts
        local message="chore: Update project files"
        if [ "$added_files" -gt "0" ]; then
            message="$message - $added_files new files"
        fi
        if [ "$modified_files" -gt "0" ]; then
            message="$message - $modified_files modified"
        fi
        if [ "$deleted_files" -gt "0" ]; then
            message="$message - $deleted_files deleted"
        fi
        if [ "$untracked_files" -gt "0" ]; then
            message="$message - $untracked_files untracked"
        fi
        echo "$message"
    fi
}

# Git operations (skip if docker-only mode)
if [ "$DOCKER_ONLY" = false ]; then
    # Get current branch first
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    echo "📡 Current branch: $CURRENT_BRANCH"
    
    # Pull latest changes with rebase
    echo "🔄 Pulling latest changes with rebase..."
    if git remote get-url origin > /dev/null 2>&1; then
        if git pull --rebase origin "$CURRENT_BRANCH"; then
            echo "✅ Successfully pulled and rebased latest changes"
        else
            echo "❌ Failed to pull changes. Please resolve conflicts manually."
            echo "   Run 'git rebase --abort' to cancel the rebase"
            echo "   or resolve conflicts and run 'git rebase --continue'"
            exit 1
        fi
    else
        echo "⚠️  No remote 'origin' configured. Skipping pull."
    fi
    
    # Show current status
    echo ""
    echo "📊 Current git status:"
    git status --short | head -20
    if [ $(git status --porcelain | wc -l) -gt 20 ]; then
        echo "... and $(( $(git status --porcelain | wc -l) - 20 )) more files"
    fi

    # Generate commit message
    echo ""
    echo "🤖 Generating AI commit message..."
    COMMIT_MESSAGE=$(generate_commit_message)
    echo "Generated message: $COMMIT_MESSAGE"
    echo "📝 Proceeding with commit..."

    # Add all files
    echo "📝 Adding all files to staging..."
    git add .

    # Check if there are staged changes
    if git diff --cached --quiet; then
        echo "⚠️  No changes to commit"
        if [ "$SKIP_DOCKER" = true ]; then
            exit 0
        fi
    else
        # Commit with generated message
        echo "💾 Committing changes..."
        git commit -m "$COMMIT_MESSAGE"
    fi

    # Check if remote exists
    if git remote get-url origin > /dev/null 2>&1; then
        echo "🚀 Pushing to remote origin/$CURRENT_BRANCH..."
        git push origin "$CURRENT_BRANCH"
        echo "✅ Successfully pushed to remote repository!"
    else
        echo "⚠️  No remote 'origin' configured. Commit completed locally."
        echo "   To push later, run: git push origin $CURRENT_BRANCH"
    fi
fi

# Docker build and deployment
if [ "$SKIP_DOCKER" = false ]; then
    echo ""
    echo "🐳 Starting Docker build and deployment..."
    
    # Check if Docker is available
    if ! command -v docker &> /dev/null; then
        echo "⚠️  Docker not found. Skipping Docker deployment."
        echo "   To install Docker: https://docs.docker.com/get-docker/"
    else
        # Generate Docker image name based on git info
        REPO_NAME=$(basename "$(git rev-parse --show-toplevel)")
        GIT_HASH=$(git rev-parse --short HEAD)
        DOCKER_TAG="${REPO_NAME}:${GIT_HASH}"
        DOCKER_TAG_LATEST="${REPO_NAME}:latest"
        
        echo "🏗️  Building Docker image: $DOCKER_TAG"
        
        # Build Docker image with build args
        if docker build \
            --build-arg GIT_COMMIT="$GIT_HASH" \
            --build-arg GIT_BRANCH="$CURRENT_BRANCH" \
            --build-arg BUILD_DATE="$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
            -t "$DOCKER_TAG" \
            -t "$DOCKER_TAG_LATEST" \
            .; then
            echo "✅ Docker image built successfully!"
            
            # Stop existing container if running
            if docker ps -q -f name="${REPO_NAME}-container" | grep -q .; then
                echo "🛑 Stopping existing container..."
                docker stop "${REPO_NAME}-container" || true
                docker rm "${REPO_NAME}-container" || true
            fi
            
            # Run the new container
            echo "🚀 Starting new container..."
            if docker run -d \
                --name "${REPO_NAME}-container" \
                -p 3000:80 \
                --restart unless-stopped \
                "$DOCKER_TAG"; then
                echo "✅ Container started successfully!"
                echo "🌐 Application is available at: http://localhost:3000"
                
                # Wait for health check
                echo "⏳ Waiting for application to be healthy..."
                for i in {1..30}; do
                    if docker exec "${REPO_NAME}-container" curl -f http://localhost/health > /dev/null 2>&1; then
                        echo "✅ Application is healthy and ready!"
                        break
                    fi
                    if [ $i -eq 30 ]; then
                        echo "⚠️  Health check timeout. Container may still be starting..."
                        docker logs "${REPO_NAME}-container" --tail 20
                    fi
                    sleep 2
                done
                
                # Show container info
                echo ""
                echo "📦 Container Information:"
                echo "   • Container: ${REPO_NAME}-container"
                echo "   • Image: $DOCKER_TAG"
                echo "   • Port: 3000 → 80"
                echo "   • Status: $(docker ps --format 'table {{.Status}}' -f name="${REPO_NAME}-container" | tail -1)"
                
            else
                echo "❌ Failed to start container"
                exit 1
            fi
        else
            echo "❌ Docker build failed"
            exit 1
        fi
    fi
fi

echo ""
echo "🎉 Deployment completed successfully!"
echo "📊 Summary:"
echo "   • Branch: $CURRENT_BRANCH"
echo "   • Commit: $COMMIT_MESSAGE"
echo "   • Status: $(git log -1 --pretty=format:'%h - %s (%cr)' HEAD)"
if [ "$SKIP_DOCKER" = false ] && command -v docker &> /dev/null; then
    echo "   • Docker: $DOCKER_TAG (running on http://localhost:3000)"
fi 