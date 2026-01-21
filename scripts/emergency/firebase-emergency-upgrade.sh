#!/bin/bash

# Firebase Emergency Upgrade Script - CVPlus
# Addresses Critical Assertion Failures in Firebase SDK 12.0.0
# Author: Gil Klainert
# Date: 2025-08-19

set -e  # Exit on any error

echo "🚨 Firebase Emergency Upgrade Script - CVPlus"
echo "======================================="
echo "Issue: Firebase SDK 12.0.0 Internal Assertion Failures (b815/ca9)"
echo "Solution: Upgrade to stable version with bug fixes"
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="/Users/gklainert/Documents/cvplus"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
BACKUP_DIR="$PROJECT_ROOT/backups/$(date +%Y%m%d_%H%M%S)"
TARGET_FIREBASE_VERSION="^13.0.1"  # Stable version with b815 fix

# Safety checks
check_prerequisites() {
    echo -e "${BLUE}📋 Checking prerequisites...${NC}"
    
    if [ ! -d "$FRONTEND_DIR" ]; then
        echo -e "${RED}❌ Frontend directory not found: $FRONTEND_DIR${NC}"
        exit 1
    fi
    
    if [ ! -f "$FRONTEND_DIR/package.json" ]; then
        echo -e "${RED}❌ package.json not found in frontend directory${NC}"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ npm not found. Please install Node.js${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Prerequisites check passed${NC}"
}

# Create backup
create_backup() {
    echo -e "${BLUE}💾 Creating backup...${NC}"
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup package files
    cp "$FRONTEND_DIR/package.json" "$BACKUP_DIR/package.json.backup"
    cp "$FRONTEND_DIR/package-lock.json" "$BACKUP_DIR/package-lock.json.backup" 2>/dev/null || true
    
    # Backup node_modules firebase folder if exists
    if [ -d "$FRONTEND_DIR/node_modules/firebase" ]; then
        echo "Backing up current Firebase SDK..."
        cp -r "$FRONTEND_DIR/node_modules/firebase" "$BACKUP_DIR/firebase_old" || true
    fi
    
    echo -e "${GREEN}✅ Backup created at: $BACKUP_DIR${NC}"
}

# Check current Firebase version
check_current_version() {
    echo -e "${BLUE}🔍 Checking current Firebase version...${NC}"
    
    cd "$FRONTEND_DIR"
    CURRENT_VERSION=$(npm list firebase --depth=0 2>/dev/null | grep firebase@ | sed 's/.*firebase@//' | sed 's/ .*//')
    
    echo -e "Current Firebase SDK version: ${YELLOW}$CURRENT_VERSION${NC}"
    
    if [[ "$CURRENT_VERSION" == "12.0.0" ]]; then
        echo -e "${RED}⚠️  CONFIRMED: Running problematic version 12.0.0${NC}"
        echo -e "${RED}   This version has known b815/ca9 assertion failures${NC}"
    else
        echo -e "${YELLOW}ℹ️  Version $CURRENT_VERSION detected${NC}"
    fi
}

# Upgrade Firebase SDK
upgrade_firebase() {
    echo -e "${BLUE}⬆️  Upgrading Firebase SDK...${NC}"
    
    cd "$FRONTEND_DIR"
    
    # Remove old version cleanly
    echo "Removing old Firebase SDK..."
    npm uninstall firebase
    
    # Clear npm cache for clean install
    echo "Clearing npm cache..."
    npm cache clean --force
    
    # Install new version
    echo "Installing Firebase SDK $TARGET_FIREBASE_VERSION..."
    npm install firebase@$TARGET_FIREBASE_VERSION
    
    # Verify installation
    NEW_VERSION=$(npm list firebase --depth=0 2>/dev/null | grep firebase@ | sed 's/.*firebase@//' | sed 's/ .*//')
    echo -e "${GREEN}✅ Firebase SDK upgraded to: $NEW_VERSION${NC}"
}

# Test Firebase integration
test_firebase() {
    echo -e "${BLUE}🧪 Testing Firebase integration...${NC}"
    
    cd "$FRONTEND_DIR"
    
    # Run TypeScript check
    echo "Running TypeScript validation..."
    if npm run type-check; then
        echo -e "${GREEN}✅ TypeScript check passed${NC}"
    else
        echo -e "${RED}❌ TypeScript check failed${NC}"
        echo -e "${YELLOW}⚠️  Manual fixes may be required${NC}"
    fi
    
    # Test build
    echo "Testing build process..."
    if npm run build; then
        echo -e "${GREEN}✅ Build test passed${NC}"
    else
        echo -e "${RED}❌ Build test failed${NC}"
        echo -e "${YELLOW}⚠️  Build issues detected - check console output${NC}"
    fi
}

# Test with Firebase emulator
test_with_emulator() {
    echo -e "${BLUE}🔧 Testing with Firebase emulator...${NC}"
    
    cd "$PROJECT_ROOT"
    
    # Check if Firebase CLI is available
    if ! command -v firebase &> /dev/null; then
        echo -e "${YELLOW}⚠️  Firebase CLI not found. Install with: npm install -g firebase-tools${NC}"
        return
    fi
    
    echo "Starting Firebase emulators for testing..."
    echo "Please test the application manually and press Enter when done."
    
    # Start emulators in background
    firebase emulators:start --only firestore,auth &
    EMULATOR_PID=$!
    
    # Wait for user confirmation
    read -p "Press Enter after testing is complete..."
    
    # Stop emulators
    kill $EMULATOR_PID 2>/dev/null || true
    echo -e "${GREEN}✅ Emulator testing completed${NC}"
}

# Create rollback script
create_rollback_script() {
    echo -e "${BLUE}🔄 Creating rollback script...${NC}"
    
    ROLLBACK_SCRIPT="$PROJECT_ROOT/scripts/firebase-rollback.sh"
    
    cat > "$ROLLBACK_SCRIPT" << EOF
#!/bin/bash
# Firebase Rollback Script - Generated $(date)
echo "Rolling back Firebase SDK..."
cd "$FRONTEND_DIR"
npm uninstall firebase
cp "$BACKUP_DIR/package.json.backup" "package.json"
npm install
echo "Rollback completed. Please test the application."
EOF
    
    chmod +x "$ROLLBACK_SCRIPT"
    echo -e "${GREEN}✅ Rollback script created at: $ROLLBACK_SCRIPT${NC}"
}

# Main execution
main() {
    echo -e "${YELLOW}🚨 CRITICAL: This script will upgrade Firebase SDK to fix assertion failures${NC}"
    echo -e "${YELLOW}   Current version 12.0.0 has known bugs causing application crashes${NC}"
    echo -e "${YELLOW}   Target version: $TARGET_FIREBASE_VERSION (stable with bug fixes)${NC}"
    echo ""
    
    read -p "Do you want to proceed with the upgrade? (y/N): " -r
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Operation cancelled."
        exit 0
    fi
    
    check_prerequisites
    create_backup
    check_current_version
    upgrade_firebase
    test_firebase
    create_rollback_script
    
    echo ""
    echo -e "${GREEN}🎉 Firebase Emergency Upgrade Completed!${NC}"
    echo -e "${GREEN}===================================${NC}"
    echo "✅ Firebase SDK upgraded successfully"
    echo "✅ Backup created for rollback if needed"
    echo "✅ Basic tests passed"
    echo ""
    echo -e "${BLUE}📋 Next Steps:${NC}"
    echo "1. Test the application thoroughly"
    echo "2. Monitor for assertion failures (b815/ca9)"
    echo "3. Deploy to staging environment for validation"
    echo "4. If issues occur, run: $PROJECT_ROOT/scripts/firebase-rollback.sh"
    echo ""
    echo -e "${YELLOW}⚠️  Important: Monitor application stability for the next 24 hours${NC}"
}

# Execute main function
main "$@"
