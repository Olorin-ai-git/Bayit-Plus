#!/bin/bash
# MongoDB Database Restore Script for Bayit+

DB_NAME="bayit_plus"
BACKUP_DIR="/Users/olorin/Documents/olorin/backend/backups"

echo "📦 Bayit+ Database Restore Utility"
echo "=================================="
echo ""

# List available backups
echo "Available backups:"
echo ""

backups=($(find "$BACKUP_DIR" -name "*.tar.gz" -type f | sort -r))

if [ ${#backups[@]} -eq 0 ]; then
    echo "❌ No backups found in $BACKUP_DIR"
    exit 1
fi

# Display backups with numbers
for i in "${!backups[@]}"; do
    backup_file="${backups[$i]}"
    backup_name=$(basename "$backup_file" .tar.gz)
    backup_size=$(du -sh "$backup_file" | cut -f1)
    backup_date=$(echo "$backup_name" | sed 's/_/ /' | sed 's/\([0-9]\{4\}\)\([0-9]\{2\}\)\([0-9]\{2\}\) \([0-9]\{2\}\)\([0-9]\{2\}\)\([0-9]\{2\}\)/\1-\2-\3 \4:\5:\6/')
    echo "  $((i+1)). $backup_date ($backup_size)"
done

echo ""
echo -n "Select backup to restore (1-${#backups[@]}), or 'q' to quit: "
read selection

if [ "$selection" = "q" ] || [ "$selection" = "Q" ]; then
    echo "Cancelled."
    exit 0
fi

# Validate selection
if ! [[ "$selection" =~ ^[0-9]+$ ]] || [ "$selection" -lt 1 ] || [ "$selection" -gt ${#backups[@]} ]; then
    echo "❌ Invalid selection"
    exit 1
fi

selected_backup="${backups[$((selection-1))]}"
backup_name=$(basename "$selected_backup" .tar.gz)

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

# Extract backup
echo "📦 Extracting backup..."
if ! tar -xzf "$selected_backup" -C "$TEMP_DIR"; then
    echo "❌ Failed to extract backup"
    exit 1
fi

# Find the backup directory
RESTORE_PATH=$(find "$TEMP_DIR" -type d -name "$DB_NAME" | head -1)

if [ -z "$RESTORE_PATH" ]; then
    echo "❌ Backup structure invalid - database directory not found"
    exit 1
fi

# Restore database
echo "🔄 Restoring to MongoDB..."
if mongorestore --db "$DB_NAME" --drop "$RESTORE_PATH"; then
    echo ""
    echo "✅ Database restored successfully!"
    echo ""
    echo "📊 Database Status:"
    mongosh "$DB_NAME" --quiet --eval "
        printjson({
            'Content Items': db.content.countDocuments({}),
            'Categories': db.categories.countDocuments({}),
            'Live Channels': db.live_channels.countDocuments({}),
            'Radio Stations': db.radio_stations.countDocuments({}),
            'Podcasts': db.podcasts.countDocuments({})
        })
    "
else
    echo ""
    echo "❌ Restore failed!"
    exit 1
fi
