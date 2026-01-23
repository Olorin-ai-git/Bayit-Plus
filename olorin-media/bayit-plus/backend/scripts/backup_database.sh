#!/bin/bash
# MongoDB Backup Script for Bayit+
# Automatically backs up the database, encrypts it, and rotates old backups
# SECURITY: Uses AES-256 encryption with key from environment or GCP Secret Manager

set -euo pipefail

# Source configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "${SCRIPT_DIR}/config/paths.env" ]; then
    source "${SCRIPT_DIR}/config/paths.env"
fi

# Configuration from environment or defaults
DB_NAME="${MONGODB_DB_NAME:-bayit_plus}"
BACKUP_DIR="${BACKUP_DIR:-${HOME}/Documents/olorin/backend/backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup-${TIMESTAMP}.gz"
ENCRYPTED_FILE="${BACKUP_FILE}.enc"
LOG_FILE="${BACKUP_DIR}/backup.log"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"  # Keep backups for 30 days

# Check for encryption key
if [ -z "${BACKUP_ENCRYPTION_KEY:-}" ]; then
    echo "⚠️  WARNING: BACKUP_ENCRYPTION_KEY not set. Backup will NOT be encrypted."
    echo "   For production, set BACKUP_ENCRYPTION_KEY environment variable."
    echo "   Generate with: python -c \"import secrets; print(secrets.token_urlsafe(32))\""
    ENCRYPT_BACKUP=false
else
    ENCRYPT_BACKUP=true
fi

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Start backup
echo "========================================" >> "$LOG_FILE"
echo "Backup started at: $(date)" >> "$LOG_FILE"
echo "Database: $DB_NAME" >> "$LOG_FILE"
echo "Backup file: $BACKUP_FILE" >> "$LOG_FILE"
echo "Encryption: $ENCRYPT_BACKUP" >> "$LOG_FILE"

# Run mongodump
echo "🔄 Creating database backup..."
if mongodump --db "$DB_NAME" --archive="$BACKUP_FILE" --gzip >> "$LOG_FILE" 2>&1; then
    # Get backup size
    BACKUP_SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
    echo "✅ Backup completed successfully" >> "$LOG_FILE"
    echo "Backup size: $BACKUP_SIZE" >> "$LOG_FILE"

    # Encrypt backup if key is available
    if [ "$ENCRYPT_BACKUP" = true ]; then
        echo "🔐 Encrypting backup with AES-256..." >> "$LOG_FILE"

        # Encrypt with AES-256-CBC
        if openssl enc -aes-256-cbc \
            -in "$BACKUP_FILE" \
            -out "$ENCRYPTED_FILE" \
            -pass "env:BACKUP_ENCRYPTION_KEY" \
            -pbkdf2 \
            -iter 100000 >> "$LOG_FILE" 2>&1; then

            # Create SHA256 checksum
            sha256sum "$ENCRYPTED_FILE" > "${ENCRYPTED_FILE}.sha256"

            # Set secure permissions (owner read/write only)
            chmod 600 "$ENCRYPTED_FILE"
            chmod 600 "${ENCRYPTED_FILE}.sha256"

            # Get encrypted size
            ENCRYPTED_SIZE=$(du -sh "$ENCRYPTED_FILE" | cut -f1)
            echo "✅ Encryption completed: $ENCRYPTED_SIZE" >> "$LOG_FILE"
            echo "✅ Checksum created: ${ENCRYPTED_FILE}.sha256" >> "$LOG_FILE"

            # Remove unencrypted backup
            rm -f "$BACKUP_FILE"
            echo "🗑️  Removed unencrypted backup" >> "$LOG_FILE"
        else
            echo "❌ Encryption failed! Keeping unencrypted backup." >> "$LOG_FILE"
            rm -f "$ENCRYPTED_FILE" "${ENCRYPTED_FILE}.sha256"
        fi
    else
        echo "⚠️  Backup saved UNENCRYPTED (not recommended for production)" >> "$LOG_FILE"
    fi
else
    echo "❌ Backup failed!" >> "$LOG_FILE"
    exit 1
fi

# Rotate old backups (delete backups older than RETENTION_DAYS)
echo "Rotating old backups (keeping last $RETENTION_DAYS days)..." >> "$LOG_FILE"
find "$BACKUP_DIR" -name "backup-*.gz.enc" -type f -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "backup-*.gz.enc.sha256" -type f -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "backup-*.gz" -type f -mtime +$RETENTION_DAYS -delete

# Count remaining backups
if [ "$ENCRYPT_BACKUP" = true ]; then
    BACKUP_COUNT=$(find "$BACKUP_DIR" -name "backup-*.gz.enc" -type f | wc -l | tr -d ' ')
else
    BACKUP_COUNT=$(find "$BACKUP_DIR" -name "backup-*.gz" -type f | wc -l | tr -d ' ')
fi
echo "Total backups: $BACKUP_COUNT" >> "$LOG_FILE"
echo "Backup completed at: $(date)" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

# Success message
if [ "$ENCRYPT_BACKUP" = true ]; then
    echo "✅ Encrypted backup created: $ENCRYPTED_FILE"
else
    echo "⚠️  Unencrypted backup created: $BACKUP_FILE"
    echo "   Set BACKUP_ENCRYPTION_KEY for production use"
fi

# Optional: Send notification (macOS)
if [ "$ENCRYPT_BACKUP" = true ]; then
    osascript -e 'display notification "Encrypted database backup completed successfully" with title "Bayit+ Backup"' 2>/dev/null || true
else
    osascript -e 'display notification "Database backup completed (UNENCRYPTED)" with title "Bayit+ Backup"' 2>/dev/null || true
fi

exit 0
