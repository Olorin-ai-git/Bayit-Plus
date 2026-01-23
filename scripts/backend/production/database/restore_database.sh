#!/bin/bash
# MongoDB Database Restore Script for Bayit+
# SECURITY: Supports encrypted backups, verifies checksums, creates safety backup

set -euo pipefail

# Source configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "${SCRIPT_DIR}/config/paths.env" ]; then
    source "${SCRIPT_DIR}/config/paths.env"
fi

# Configuration from environment or defaults
DB_NAME="${MONGODB_DB_NAME:-bayit_plus}"
BACKUP_DIR="${BACKUP_DIR:-${HOME}/Documents/olorin/backend/backups}"

echo "📦 Bayit+ Database Restore Utility"
echo "=================================="
echo ""

# CRITICAL SAFETY: Create safety backup before restoring
echo "🔒 SAFETY FIRST: Creating pre-restore backup..."
if ! "${SCRIPT_DIR}/backup_database.sh"; then
    echo "❌ Failed to create safety backup. Restore cancelled."
    echo "   Fix backup script issues before attempting restore."
    exit 1
fi
echo "✅ Safety backup created"
echo ""

# List available backups (both encrypted and unencrypted)
echo "Available backups:"
echo ""

# Find both encrypted and unencrypted backups
enc_backups=($(find "$BACKUP_DIR" -name "backup-*.gz.enc" -type f 2>/dev/null | sort -r))
plain_backups=($(find "$BACKUP_DIR" -name "backup-*.gz" -type f 2>/dev/null | sort -r))

# Combine and sort all backups
all_backups=("${enc_backups[@]}" "${plain_backups[@]}")

if [ ${#all_backups[@]} -eq 0 ]; then
    echo "❌ No backups found in $BACKUP_DIR"
    exit 1
fi

# Display backups with numbers
for i in "${!all_backups[@]}"; do
    backup_file="${all_backups[$i]}"
    backup_name=$(basename "$backup_file")
    backup_size=$(du -sh "$backup_file" | cut -f1)

    # Check if encrypted
    if [[ "$backup_file" == *.enc ]]; then
        is_encrypted="🔐"
        # Check for checksum file
        if [ -f "${backup_file}.sha256" ]; then
            is_encrypted="$is_encrypted ✓"
        else
            is_encrypted="$is_encrypted ⚠️"
        fi
    else
        is_encrypted="🔓"
    fi

    # Extract date from filename
    if [[ "$backup_name" =~ backup-([0-9]{8}_[0-9]{6}) ]]; then
        date_str="${BASH_REMATCH[1]}"
        # Format: YYYYMMDD_HHMMSS → YYYY-MM-DD HH:MM:SS
        backup_date=$(echo "$date_str" | sed 's/\([0-9]\{4\}\)\([0-9]\{2\}\)\([0-9]\{2\}\)_\([0-9]\{2\}\)\([0-9]\{2\}\)\([0-9]\{2\}\)/\1-\2-\3 \4:\5:\6/')
    else
        backup_date="Unknown date"
    fi

    echo "  $((i+1)). $backup_date ($backup_size) $is_encrypted"
done

echo ""
echo "Legend: 🔐=Encrypted ✓=Checksum 🔓=Unencrypted ⚠️=No checksum"
echo ""
echo -n "Select backup to restore (1-${#all_backups[@]}), or 'q' to quit: "
read selection

if [ "$selection" = "q" ] || [ "$selection" = "Q" ]; then
    echo "Cancelled."
    exit 0
fi

# Validate selection
if ! [[ "$selection" =~ ^[0-9]+$ ]] || [ "$selection" -lt 1 ] || [ "$selection" -gt ${#all_backups[@]} ]; then
    echo "❌ Invalid selection"
    exit 1
fi

selected_backup="${all_backups[$((selection-1))]}"
backup_name=$(basename "$selected_backup")

echo ""
echo "⚠️  WARNING: This will REPLACE the current '$DB_NAME' database!"
echo "Selected backup: $backup_name"
echo ""
echo -n "Type 'RESTORE' to confirm: "
read confirmation

if [ "$confirmation" != "RESTORE" ]; then
    echo "✗ Restore cancelled"
    exit 0
fi

echo ""
echo "🔄 Restoring database..."

# Create temp directory
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

RESTORE_FILE="$TEMP_DIR/restore.gz"

# Check if backup is encrypted
if [[ "$selected_backup" == *.enc ]]; then
    echo "🔐 Backup is encrypted"

    # Check for encryption key
    if [ -z "${BACKUP_ENCRYPTION_KEY:-}" ]; then
        echo "❌ Cannot restore encrypted backup: BACKUP_ENCRYPTION_KEY not set"
        echo "   Set the encryption key that was used to create this backup"
        exit 1
    fi

    # Verify checksum if available
    if [ -f "${selected_backup}.sha256" ]; then
        echo "🔍 Verifying backup integrity..."
        if ! (cd "$(dirname "$selected_backup")" && sha256sum -c "$(basename "${selected_backup}.sha256")" 2>/dev/null); then
            echo "❌ Backup integrity check FAILED!"
            echo "   The backup file may be corrupted or tampered with."
            exit 1
        fi
        echo "✅ Integrity verified"
    else
        echo "⚠️  No checksum file found - skipping integrity check"
    fi

    # Decrypt backup
    echo "🔓 Decrypting backup..."
    if ! openssl enc -aes-256-cbc -d \
        -in "$selected_backup" \
        -out "$RESTORE_FILE" \
        -pass "env:BACKUP_ENCRYPTION_KEY" \
        -pbkdf2 \
        -iter 100000; then
        echo "❌ Decryption failed!"
        echo "   Check that BACKUP_ENCRYPTION_KEY is correct"
        exit 1
    fi
    echo "✅ Decryption successful"
else
    echo "🔓 Backup is unencrypted"
    cp "$selected_backup" "$RESTORE_FILE"
fi

# Restore database
echo "🔄 Restoring to MongoDB..."
if mongorestore --db "$DB_NAME" --archive="$RESTORE_FILE" --gzip --drop; then
    echo ""
    echo "✅ Database restored successfully!"
    echo ""
    echo "📊 Database Status:"
    if command -v mongosh &> /dev/null; then
        mongosh "$DB_NAME" --quiet --eval "
            printjson({
                'Content Items': db.content.countDocuments({}),
                'Categories': db.categories.countDocuments({}),
                'Live Channels': db.live_channels.countDocuments({}),
                'Radio Stations': db.radio_stations.countDocuments({}),
                'Podcasts': db.podcasts.countDocuments({})
            })
        " || echo "⚠️  Could not retrieve database stats"
    else
        echo "⚠️  mongosh not found - cannot display database stats"
    fi
else
    echo ""
    echo "❌ Restore failed!"
    echo "   Your database was NOT modified (restore uses --drop)"
    echo "   The safety backup created earlier is still available"
    exit 1
fi

# Clean up decrypted file
rm -f "$RESTORE_FILE"

echo ""
echo "✅ Restore complete!"
echo "   Safety backup from before restore is in: $BACKUP_DIR"
