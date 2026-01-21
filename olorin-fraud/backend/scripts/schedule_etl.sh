#!/bin/bash
# ETL Pipeline Scheduling Script
# Precision Detection Enhancement - Daily Incremental Updates

set -e

# Load configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

# Environment setup
export PYTHONPATH="${PYTHONPATH}:$(pwd)"
export PATH="${PATH}:$(poetry env info --path)/bin"

# Logging
LOG_DIR="${LOG_DIR:-logs/etl}"
mkdir -p "$LOG_DIR"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="$LOG_DIR/etl_${TIMESTAMP}.log"

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Error handling
error_exit() {
    log "ERROR: $1"
    exit 1
}

# Run ETL pipeline
log "Starting ETL pipeline..."
python scripts/etl_precision_detection.py >> "$LOG_FILE" 2>&1 || error_exit "ETL pipeline failed"

log "ETL pipeline completed successfully"

# Run enrichment pipeline (if enabled)
if [ "${ENABLE_ENRICHMENT:-true}" = "true" ]; then
    log "Starting enrichment pipeline..."
    python scripts/enrichment/enrichment_pipeline.py --limit 10000 >> "$LOG_FILE" 2>&1 || error_exit "Enrichment pipeline failed"
    log "Enrichment pipeline completed successfully"
fi

log "All pipelines completed successfully"

