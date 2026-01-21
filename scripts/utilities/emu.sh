#!/bin/bash

# Firebase Emulator Manager Script
# Kill all running Firebase emulators and restart them fresh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
# Get the actual project root by finding firebase.json
if [ -f "firebase.json" ]; then
    PROJECT_ROOT="$(pwd)"
elif [ -f "$(dirname "$0")/../../firebase.json" ]; then
    PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
else
    # Try to find firebase.json in parent directories
    CURRENT_DIR="$(pwd)"
    while [ "$CURRENT_DIR" != "/" ]; do
        if [ -f "$CURRENT_DIR/firebase.json" ]; then
            PROJECT_ROOT="$CURRENT_DIR"
            break
        fi
        CURRENT_DIR="$(dirname "$CURRENT_DIR")"
    done
fi

EMULATOR_PORTS=(4000 5001 8080 8085 8090 9000 9099 9199 9299 5050 4400 4500)
EMULATOR_NAMES=("Functions" "Auth" "Firestore" "Database" "Hosting" "Storage" "Pubsub" "UI" "Logging")

# Verify PROJECT_ROOT was found
if [ -z "$PROJECT_ROOT" ] || [ ! -f "$PROJECT_ROOT/firebase.json" ]; then
    echo -e "${RED}❌ Error: Could not find firebase.json in current or parent directories${NC}"
    echo -e "${YELLOW}Please run this script from the CVPlus project directory${NC}"
    exit 1
fi

echo -e "${BLUE}🔧 Firebase Emulator Manager${NC}"
echo -e "${BLUE}================================${NC}"
echo -e "${GREEN}✅ Project root: $PROJECT_ROOT${NC}"

# Function to kill processes on specific ports
kill_emulators() {
    echo -e "\n${YELLOW}🛑 Stopping existing emulators...${NC}"
    
    # Kill Java processes (Firestore emulator)
    if pgrep -f "cloud-firestore-emulator" > /dev/null; then
        echo -e "${YELLOW}  Stopping Firestore emulator...${NC}"
        pkill -f "cloud-firestore-emulator" 2>/dev/null || true
    fi
    
    # Kill Node processes (Functions emulator)
    if pgrep -f "firebase-functions-emulator" > /dev/null; then
        echo -e "${YELLOW}  Stopping Functions emulator...${NC}"
        pkill -f "firebase-functions-emulator" 2>/dev/null || true
    fi
    
    # Kill any process with firebase in the name
    if pgrep -f "firebase" > /dev/null; then
        echo -e "${YELLOW}  Stopping other Firebase processes...${NC}"
        pkill -f "firebase emulators:start" 2>/dev/null || true
        pkill -f "firebase-tools" 2>/dev/null || true
    fi
    
    # Kill processes on emulator ports (try multiple times if needed)
    for port in "${EMULATOR_PORTS[@]}"; do
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            echo -e "${YELLOW}  Killing process on port $port...${NC}"
            # Try graceful kill first
            lsof -Pi :$port -sTCP:LISTEN -t | xargs kill 2>/dev/null || true
            sleep 1
            # Force kill if still running
            if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
                lsof -Pi :$port -sTCP:LISTEN -t | xargs kill -9 2>/dev/null || true
            fi
        fi
    done
    
    # Wait for processes to fully terminate
    sleep 2
    
    echo -e "${GREEN}✅ All emulators stopped${NC}"
}

# Function to check if emulators are running
check_emulator_status() {
    local running=false
    
    for port in "${EMULATOR_PORTS[@]}"; do
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            running=true
            break
        fi
    done
    
    if [ "$running" = true ]; then
        echo -e "${YELLOW}⚠️  Emulators are currently running${NC}"
        return 0
    else
        echo -e "${GREEN}✅ No emulators currently running${NC}"
        return 1
    fi
}

# Function to start emulators
start_emulators() {
    echo -e "\n${GREEN}🚀 Starting Firebase emulators...${NC}"
    
    # Check if we're in the project directory
    if [ ! -f "$PROJECT_ROOT/firebase.json" ]; then
        echo -e "${RED}❌ Error: firebase.json not found. Are you in the CVPlus project?${NC}"
        exit 1
    fi
    
    # Change to project root
    cd "$PROJECT_ROOT"
    
    # Export environment variables for emulators
    export FIRESTORE_EMULATOR_HOST="localhost:8090"
    export FIREBASE_AUTH_EMULATOR_HOST="localhost:9099"
    export FIREBASE_STORAGE_EMULATOR_HOST="localhost:9199"
    export FUNCTIONS_EMULATOR="true"
    
    echo -e "${BLUE}📂 Working directory: $PROJECT_ROOT${NC}"
    echo -e "${BLUE}🌍 Environment variables set:${NC}"
    echo "  FIRESTORE_EMULATOR_HOST=$FIRESTORE_EMULATOR_HOST"
    echo "  FIREBASE_AUTH_EMULATOR_HOST=$FIREBASE_AUTH_EMULATOR_HOST"
    echo "  FIREBASE_STORAGE_EMULATOR_HOST=$FIREBASE_STORAGE_EMULATOR_HOST"
    echo "  FUNCTIONS_EMULATOR=$FUNCTIONS_EMULATOR"
    
    # Start emulators
    echo -e "\n${GREEN}🎬 Starting emulators...${NC}"
    echo -e "${YELLOW}Press Ctrl+C to stop the emulators${NC}\n"
    
    # Start with import/export support
    firebase emulators:start \
        --import=./emulator-data \
        --export-on-exit=./emulator-data
}

# Main execution
main() {
    echo -e "${BLUE}Current status:${NC}"
    
    # Check current status
    if check_emulator_status; then
        # Emulators are running, kill them
        kill_emulators
    fi
    
    # Start fresh emulators
    start_emulators
}

# Handle script arguments
case "${1:-}" in
    stop)
        echo -e "${YELLOW}Stopping emulators only...${NC}"
        check_emulator_status
        kill_emulators
        echo -e "${GREEN}✨ Done!${NC}"
        ;;
    status)
        check_emulator_status
        echo -e "\n${BLUE}Port status:${NC}"
        for port in "${EMULATOR_PORTS[@]}"; do
            if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
                echo -e "  Port $port: ${GREEN}IN USE${NC}"
            else
                echo -e "  Port $port: ${YELLOW}FREE${NC}"
            fi
        done
        ;;
    *)
        main
        ;;
esac