#!/bin/bash

echo "Monitoring archive build progress..."
echo "Started at $(date)"
echo ""

LAST_SIZE=0
STALLED_COUNT=0

while true; do
    # Check if xcodebuild is still running
    if ! pgrep -f "xcodebuild archive" > /dev/null; then
        echo ""
        echo "Build process completed at $(date)"
        
        # Check if archive was successful
        if grep -q "ARCHIVE SUCCEEDED" archive.log; then
            echo "✅ ARCHIVE SUCCEEDED!"
            tail -20 upload-session.log
        elif grep -q "ARCHIVE FAILED" archive.log; then
            echo "❌ ARCHIVE FAILED"
            tail -50 archive.log | grep -i "error" -A 5
        fi
        break
    fi
    
    # Show progress
    CURRENT_SIZE=$(wc -c < archive.log)
    LINES=$(wc -l < archive.log)
    SIZE_MB=$(echo "scale=1; $CURRENT_SIZE / 1048576" | bc)
    
    echo "[$(date +%H:%M:%S)] Build in progress: ${SIZE_MB}MB, ${LINES} lines"
    
    # Check if build is stalled
    if [ "$CURRENT_SIZE" -eq "$LAST_SIZE" ]; then
        STALLED_COUNT=$((STALLED_COUNT + 1))
        if [ $STALLED_COUNT -gt 5 ]; then
            echo "⚠️  Warning: Build appears stalled (no progress for 10 minutes)"
        fi
    else
        STALLED_COUNT=0
    fi
    
    LAST_SIZE=$CURRENT_SIZE
    sleep 120  # Check every 2 minutes
done
