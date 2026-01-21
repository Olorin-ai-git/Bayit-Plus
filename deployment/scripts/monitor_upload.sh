#!/bin/bash
# Monitor movie upload progress

LOG_FILE="/tmp/movie_upload_all.log"

echo "=== Movie Upload Monitor ==="
echo "Started: $(date)"
echo "Log file: $LOG_FILE"
echo ""

while true; do
    clear
    echo "=== Movie Upload Progress Monitor ==="
    echo "Time: $(date)"
    echo "Log file: $LOG_FILE"
    echo ""

    # Check if process is running
    if ps aux | grep -q "[u]pload_real_movies.py"; then
        echo "✅ Upload process: RUNNING"
    else
        echo "❌ Upload process: NOT RUNNING"
    fi
    echo ""

    # Show last 20 lines of log
    if [ -f "$LOG_FILE" ]; then
        echo "--- Last 20 Log Lines ---"
        tail -20 "$LOG_FILE"
        echo ""

        # Extract stats
        echo "--- Statistics ---"
        grep "Processed:" "$LOG_FILE" | tail -1
        grep "Skipped:" "$LOG_FILE" | tail -1
        grep "Failed:" "$LOG_FILE" | tail -1

        # Count successful uploads
        UPLOADED=$(grep -c "Uploaded successfully:" "$LOG_FILE")
        echo "Total uploaded: $UPLOADED"
    else
        echo "Log file not found yet..."
    fi

    sleep 10
done
