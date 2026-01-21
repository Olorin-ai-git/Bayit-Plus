#!/bin/bash
# Unified Logging Environment Variables Example
# Configure unified logging via environment variables
# 
# Author: Gil Klainert  
# Date: 2025-01-04
# Plan: /docs/plans/2025-01-04-unified-logging-system-plan.md

# Basic logging configuration
export OLORIN_LOG_LEVEL="INFO"              # DEBUG, INFO, WARNING, ERROR, CRITICAL
export OLORIN_LOG_FORMAT="human"            # human, json, structured  
export OLORIN_LOG_OUTPUT="console,file"     # comma-separated: console, file, json_file, structured_file

# Performance settings
export OLORIN_LOG_ASYNC="false"             # true/false - Enable async logging
export OLORIN_LOG_BUFFER_SIZE="1000"        # Buffer size for async logging
export OLORIN_LOG_LAZY_INIT="true"          # true/false - Lazy logger initialization
export OLORIN_LOG_SUPPRESS_NOISY="true"     # true/false - Suppress third-party loggers
export OLORIN_LOG_PERFORMANCE="true"        # true/false - Performance monitoring

# File configuration
export OLORIN_LOG_FILE_PATH="logs/olorin_server.log"
export OLORIN_LOG_JSON_FILE_PATH="logs/olorin_server.json"  
export OLORIN_LOG_STRUCTURED_FILE_PATH="logs/olorin_structured.log"
export OLORIN_LOG_MAX_FILE_SIZE="10485760"  # 10MB in bytes
export OLORIN_LOG_BACKUP_COUNT="5"          # Number of backup files

# Advanced settings
export OLORIN_LOG_FLUSH_INTERVAL="1.0"      # Flush interval in seconds
export OLORIN_LOG_CONTEXT_TRACKING="true"   # Enable context tracking
export OLORIN_LOG_STRUCTURED_METADATA="true" # Include metadata in structured logs

# Environment-specific examples:

# Development environment
# export OLORIN_LOG_LEVEL="DEBUG"
# export OLORIN_LOG_FORMAT="structured"
# export OLORIN_LOG_OUTPUT="console,structured_file"
# export OLORIN_LOG_PERFORMANCE="true"

# QAL/E2E environment  
# export OLORIN_LOG_LEVEL="INFO"
# export OLORIN_LOG_FORMAT="json"
# export OLORIN_LOG_OUTPUT="console,json_file"
# export OLORIN_LOG_ASYNC="true"
# export OLORIN_LOG_BUFFER_SIZE="2000"

# Production environment
# export OLORIN_LOG_LEVEL="WARNING"
# export OLORIN_LOG_FORMAT="json"  
# export OLORIN_LOG_OUTPUT="console,json_file"
# export OLORIN_LOG_ASYNC="true"
# export OLORIN_LOG_BUFFER_SIZE="3000"
# export OLORIN_LOG_SUPPRESS_NOISY="true"

# Usage examples:
# 1. Source this file: source config/unified_logging_env_example.sh
# 2. Set individual variables: export OLORIN_LOG_LEVEL="DEBUG"  
# 3. Use in Docker: docker run -e OLORIN_LOG_LEVEL=INFO ...
# 4. Use with systemd: Environment="OLORIN_LOG_LEVEL=INFO"

echo "Unified logging environment variables configured:"
echo "  Log Level: $OLORIN_LOG_LEVEL"
echo "  Log Format: $OLORIN_LOG_FORMAT" 
echo "  Log Outputs: $OLORIN_LOG_OUTPUT"
echo "  Async Logging: $OLORIN_LOG_ASYNC"
echo "  Performance Monitoring: $OLORIN_LOG_PERFORMANCE"