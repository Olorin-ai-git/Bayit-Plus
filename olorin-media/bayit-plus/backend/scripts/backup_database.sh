#!/bin/bash
# MongoDB Backup Script for Bayit+
# Automatically backs up the database and rotates old backups

# Configuration
DB_NAME="bayit_plus"
BACKUP_DIR="/Users/olorin/Documents/olorin/backend/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="$BACKUP_DIR/$DATE"
LOG_FILE="$BACKUP_DIR/backup.log"
RETENTION_DAYS=30  # Keep backups for 30 days

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Start backup
echo "========================================" >> "$LOG_FILE"
echo "Backup started at: $(date)" >> "$LOG_FILE"
echo "Database: $DB_NAME" >> "$LOG_FILE"
echo "Backup path: $BACKUP_PATH" >> "$LOG_FILE"

# Run mongodump
if mongodump --db "$DB_NAME" --out "$BACKUP_PATH" >> "$LOG_FILE" 2>&1; then
    # Get backup size
    BACKUP_SIZE=$(du -sh "$BACKUP_PATH" | cut -f1)
    echo "✅ Backup completed successfully" >> "$LOG_FILE"
    echo "Backup size: $BACKUP_SIZE" >> "$LOG_FILE"

    # Compress the backup
    echo "Compressing backup..." >> "$LOG_FILE"
    tar -czf "$BACKUP_PATH.tar.gz" -C "$BACKUP_DIR" "$DATE" >> "$LOG_FILE" 2>&1

    if [ $? -eq 0 ]; then
        # Remove uncompressed backup
        rm -rf "$BACKUP_PATH"
        COMPRESSED_SIZE=$(du -sh "$BACKUP_PATH.tar.gz" | cut -f1)
        echo "✅ Compression completed: $COMPRESSED_SIZE" >> "$LOG_FILE"
    else
        echo "⚠️  Compression failed, keeping uncompressed backup" >> "$LOG_FILE"
    fi
else
    echo "❌ Backup failed!" >> "$LOG_FILE"
    exit 1
fi

# Rotate old backups (delete backups older than RETENTION_DAYS)
echo "Rotating old backups (keeping last $RETENTION_DAYS days)..." >> "$LOG_FILE"
find "$BACKUP_DIR" -name "*.tar.gz" -type f -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -maxdepth 1 -type d -mtime +$RETENTION_DAYS ! -name "." -exec rm -rf {} \;

# Count remaining backups
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "*.tar.gz" -type f | wc -l | tr -d ' ')
echo "Total backups: $BACKUP_COUNT" >> "$LOG_FILE"
echo "Backup completed at: $(date)" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

# Optional: Send notification (macOS)
osascript -e 'display notification "Database backup completed successfully" with title "Bayit+ Backup"' 2>/dev/null

exit 0
