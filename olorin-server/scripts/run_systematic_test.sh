#!/bin/bash
#
# Systematic 24-Hour Moving Window Test
#
# Runs the analyzer on consecutive 24-hour windows, investigating entities
# from each window until fraud is found.
#

set -e

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🚀 SYSTEMATIC 24-HOUR MOVING WINDOW TEST${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
echo ""

# Configuration
START_OFFSET_MONTHS=6  # Start 6 months ago
NUM_WINDOWS=${1:-10}   # Number of windows (default: 10)
ENTITIES_PER_WINDOW=${2:-20}  # Entities per window (default: 20)

echo -e "${YELLOW}Configuration:${NC}"
echo "  Start Offset:      ${START_OFFSET_MONTHS} months ago"
echo "  Windows to Test:   ${NUM_WINDOWS}"
echo "  Entities/Window:   ${ENTITIES_PER_WINDOW}"
echo "  Filter:            MODEL_SCORE > 0.4"
echo "  Ranking:           Volume (COUNT DESC)"
echo ""

# Results directory
RESULTS_DIR="artifacts/systematic_test_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$RESULTS_DIR"

echo -e "${BLUE}Results Directory: ${RESULTS_DIR}${NC}"
echo ""

# Backup current .env
cp .env .env.backup.systematic 2>/dev/null || cp env .env.backup.systematic 2>/dev/null || true

# Initialize summary
TOTAL_ENTITIES=0
FRAUD_FOUND=0
WINDOWS_TESTED=0

# Test each window
for ((window=0; window<NUM_WINDOWS; window++)); do
    # Calculate offset for this window (going backwards day by day)
    CURRENT_OFFSET_MONTHS=$((START_OFFSET_MONTHS + window / 30))
    WINDOW_DATE=$(date -v-${CURRENT_OFFSET_MONTHS}M +%Y-%m-%d 2>/dev/null || date -d "${CURRENT_OFFSET_MONTHS} months ago" +%Y-%m-%d)
    
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}📅 WINDOW $((window+1))/${NUM_WINDOWS}: ${WINDOW_DATE}${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
    echo ""
    
    # Update .env for this window
    cat > .env.systematic <<EOF
# Systematic Test Window $((window+1))
ANALYZER_END_OFFSET_MONTHS=${CURRENT_OFFSET_MONTHS}
ANALYZER_TIME_WINDOW_HOURS=24
STARTUP_ANALYSIS_TOP_N_ENTITIES=${ENTITIES_PER_WINDOW}
STARTUP_ANALYSIS_TIMEOUT_SECONDS=3600
EOF
    
    # Use the systematic config
    cp .env.systematic .env 2>/dev/null || cp .env.systematic env
    
    # Start server for this window
    echo -e "${YELLOW}[*] Starting server for window $((window+1))...${NC}"
    
    LOG_FILE="${RESULTS_DIR}/window_$((window+1))_${WINDOW_DATE}.log"
    
    ./scripts/start_server.sh > "$LOG_FILE" 2>&1 &
    SERVER_PID=$!
    
    echo "    Server PID: $SERVER_PID"
    echo "    Log: $LOG_FILE"
    
    # Wait for server to start
    sleep 15
    
    # Wait for startup analysis to complete (or timeout)
    MAX_WAIT=1800  # 30 minutes
    WAITED=0
    
    echo -e "${YELLOW}[*] Waiting for analysis to complete...${NC}"
    
    while [ $WAITED -lt $MAX_WAIT ]; do
        # Check if analysis completed
        if grep -q "Startup analysis completed\|Failed to run startup analysis" "$LOG_FILE"; then
            echo -e "${GREEN}✅ Analysis completed${NC}"
            break
        fi
        
        # Check if server crashed
        if ! ps -p $SERVER_PID > /dev/null; then
            echo -e "${RED}❌ Server crashed${NC}"
            break
        fi
        
        sleep 10
        WAITED=$((WAITED + 10))
        
        if [ $((WAITED % 60)) -eq 0 ]; then
            echo "    Waited ${WAITED}s..."
        fi
    done
    
    # Stop server
    echo -e "${YELLOW}[*] Stopping server...${NC}"
    kill -9 $SERVER_PID 2>/dev/null || true
    lsof -ti:8090 | xargs kill -9 2>/dev/null || true
    sleep 2
    
    # Analyze results
    echo ""
    echo -e "${BLUE}📊 Analyzing window results...${NC}"
    
    # Count entities investigated
    ENTITIES_THIS_WINDOW=$(grep -c "Auto-Comparison [0-9]/[0-9]" "$LOG_FILE" 2>/dev/null || echo "0")
    
    # Check for fraud
    FRAUD_THIS_WINDOW=$(grep -c "TP=[1-9]" "$LOG_FILE" 2>/dev/null || echo "0")
    if grep -q "TP=0" "$LOG_FILE" 2>/dev/null; then
        # Subtract false positives (TP=0 followed by other metrics)
        FRAUD_THIS_WINDOW=0
    fi
    
    # Check confusion matrices
    if ls artifacts/comparisons/*/confusion_table_*.html 2>/dev/null | xargs grep -l "TP=[1-9]" > /dev/null 2>&1; then
        FRAUD_THIS_WINDOW=1
    fi
    
    TOTAL_ENTITIES=$((TOTAL_ENTITIES + ENTITIES_THIS_WINDOW))
    FRAUD_FOUND=$((FRAUD_FOUND + FRAUD_THIS_WINDOW))
    WINDOWS_TESTED=$((WINDOWS_TESTED + 1))
    
    echo "  Entities Investigated: $ENTITIES_THIS_WINDOW"
    echo "  Fraud Detected:        $FRAUD_THIS_WINDOW"
    echo ""
    
    # Save window summary
    cat > "${RESULTS_DIR}/window_$((window+1))_summary.txt" <<EOF
Window: $((window+1))/${NUM_WINDOWS}
Date: ${WINDOW_DATE}
Offset: ${CURRENT_OFFSET_MONTHS} months
Entities: $ENTITIES_THIS_WINDOW
Fraud: $FRAUD_THIS_WINDOW
EOF
    
    # If fraud found, we can stop
    if [ $FRAUD_THIS_WINDOW -gt 0 ]; then
        echo -e "${GREEN}✅ FRAUD FOUND IN WINDOW $((window+1))!${NC}"
        echo ""
        echo -e "${YELLOW}[!] Stopping test (fraud detected)${NC}"
        break
    fi
done

# Final summary
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}📊 FINAL SUMMARY${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
echo ""
echo "  Windows Tested:        $WINDOWS_TESTED"
echo "  Total Entities:        $TOTAL_ENTITIES"
echo "  Fraud Found:           $FRAUD_FOUND"

if [ $TOTAL_ENTITIES -gt 0 ]; then
    PRECISION=$(awk "BEGIN {printf \"%.1f\", ($FRAUD_FOUND / $TOTAL_ENTITIES) * 100}")
    echo "  Precision:             ${PRECISION}%"
fi

echo ""
echo -e "${BLUE}Results saved to: ${RESULTS_DIR}${NC}"
echo ""

# Save final summary
cat > "${RESULTS_DIR}/final_summary.txt" <<EOF
Systematic 24-Hour Moving Window Test
======================================

Configuration:
- Start Offset: ${START_OFFSET_MONTHS} months
- Windows Tested: ${WINDOWS_TESTED}
- Entities/Window: ${ENTITIES_PER_WINDOW}

Results:
- Total Entities: ${TOTAL_ENTITIES}
- Fraud Found: ${FRAUD_FOUND}
- Precision: ${PRECISION}%

Date: $(date)
EOF

# Restore original .env
cp .env.backup.systematic .env 2>/dev/null || cp .env.backup.systematic env 2>/dev/null || true
rm -f .env.systematic .env.backup.systematic

if [ $FRAUD_FOUND -gt 0 ]; then
    echo -e "${GREEN}✅ SUCCESS! Found fraud in the data${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  No fraud found. Try more windows or different offset${NC}"
    exit 1
fi

